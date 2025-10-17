'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const CITY_NAME = process.env.CITY_NAME || 'São Caetano do Sul';
const RADIUS_M = Number(process.env.BUEIRO_RADIUS_M || 8);

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';

const IMG_DIR =
  process.env.BUEIROS_IMG_DIR || path.resolve(__dirname, '../uploads/bueiros');
fs.mkdirSync(IMG_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const imageUrl = (id) => `${PUBLIC_BASE_URL}/api/bueiros/${id}/imagem`;

const MUNICIPIOS_ALVO = [
  'São Caetano do Sul',
  'São Bernardo do Campo',
  'Santo André',
  'Diadema',
];

const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

async function contarPorMunicipio(client) {
  const sql = `
    WITH b_norm AS (
      SELECT
        id,
        COALESCE(ts_utc, data_monitoramento) AS ts,
        CASE
          WHEN ST_SRID(localizacao::geometry)=0 THEN ST_SetSRID(localizacao::geometry,4326)
          WHEN ST_SRID(localizacao::geometry)<>4326 THEN ST_Transform(localizacao::geometry,4326)
          ELSE localizacao::geometry
        END AS geom
      FROM public.bueiros
      WHERE localizacao IS NOT NULL
    ),
    m_norm AS (
      SELECT
        nome,
        CASE
          WHEN ST_SRID(geom)=0 THEN ST_SetSRID(geom,4326)
          WHEN ST_SRID(geom)<>4326 THEN ST_Transform(geom,4326)
          ELSE geom
        END AS geom
      FROM public.municipios
    )
    SELECT
      m.nome,
      COUNT(b.id)::int AS total,
      COUNT(b.id) FILTER (WHERE b.ts >= NOW() - INTERVAL '30 days')::int AS novos_30d
    FROM m_norm m
    LEFT JOIN b_norm b
      ON ST_Within(b.geom, m.geom)
    GROUP BY m.nome
    ORDER BY m.nome;
  `;

  const { rows } = await client.query(sql);

  const index = new Map();
  for (const r of rows) {
    index.set(normalize(r.nome), {
      municipio: r.nome,
      total: Number(r.total) || 0,
      novos_30d: Number(r.novos_30d) || 0
    });
  }

  const out = [];
  for (const alvo of MUNICIPIOS_ALVO) {
    const key = normalize(alvo);
    if (index.has(key)) {
      const v = index.get(key);
      out.push({ municipio: alvo, total: v.total, novos_30d: v.novos_30d });
      continue;
    }
    let found = null;
    for (const [k, v] of index.entries()) {
      if (k === key) { found = v; break; }
      if (key.startsWith('sao bernardo') && k.startsWith('sao bernardo')) { found = v; break; }
      if (key.startsWith('santo andre') && k.startsWith('santo andre')) { found = v; break; }
    }
    if (found) {
      out.push({ municipio: alvo, total: found.total, novos_30d: found.novos_30d });
    } else {
      out.push({ municipio: alvo, total: 0, novos_30d: 0 });
    }
  }

  return out;
}

router.get('/bueiros', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        COALESCE(ts_utc, data_monitoramento) AS data_monitoramento,
        ST_Y(localizacao::geometry) AS latitude,
        ST_X(localizacao::geometry) AS longitude,
        conf
      FROM public.bueiros
      WHERE localizacao IS NOT NULL
      ORDER BY COALESCE(ts_utc, data_monitoramento) DESC, id DESC;
    `);
    const rows = result.rows.map((r) => ({ ...r, image_url: imageUrl(r.id) }));
    return res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar bueiros:', err.message);
    return res.status(500).json([]);
  }
});

router.get('/resumo', async (_req, res) => {
  try {
    const q = await pool.query(`
      SELECT
        COUNT(*)::int AS total_mapeados,
        COUNT(*) FILTER (
          WHERE COALESCE(ts_utc, data_monitoramento) >= NOW() - INTERVAL '30 days'
        )::int AS novos_30d
      FROM public.bueiros
      WHERE localizacao IS NOT NULL;
    `);

    return res.json(q.rows[0] ?? { total_mapeados: 0, novos_30d: 0 });
  } catch (err) {
    console.error('❌ Erro em /resumo:', err);
    return res.status(500).json({ total_mapeados: 0, novos_30d: 0 });
  }
});

router.get('/bueiros/por-municipio', async (_req, res) => {
  try {
    const rows = await contarPorMunicipio(pool);
    return res.json(rows); 
  } catch (err) {
    console.error('❌ Erro em /bueiros/por-municipio:', err);
    return res.status(500).json([]);
  }
});

router.post('/bueiros', upload.single('imagem'), async (req, res) => {
  const { latitude, longitude, conf: confRaw } = req.body;
  const file = req.file || null;

  try {
    const lat = parseFloat(String(latitude).replace(',', '.'));
    const lon = parseFloat(String(longitude).replace(',', '.'));
    const conf = confRaw !== undefined && confRaw !== null ? Number(confRaw) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res
        .status(400)
        .json({ erro: 'Latitude e longitude são obrigatórias e devem ser numéricas.' });
    }

    const saveImageFor = async (bueiroId, incomingFile) => {
      if (!incomingFile) return;
      const ext = EXT_BY_MIME[incomingFile.mimetype] || 'jpg';
      const filenameDisk = `${bueiroId}.${ext}`;
      fs.writeFileSync(path.join(IMG_DIR, filenameDisk), incomingFile.buffer);

      await pool.query(
        `
        INSERT INTO public.bueiro_imagens (bueiro_id, filename_base, mime, bytes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (bueiro_id) DO UPDATE
          SET filename_base = EXCLUDED.filename_base,
              mime          = EXCLUDED.mime,
              bytes         = EXCLUDED.bytes,
              created_at    = NOW();
        `,
        [bueiroId, String(bueiroId), incomingFile.mimetype, incomingFile.size]
      );
    };

    const near = await pool.query(
      `
      SELECT 
        id, conf,
        data_monitoramento,
        ST_Y(localizacao::geometry) AS latitude,
        ST_X(localizacao::geometry) AS longitude
      FROM public.bueiros
      WHERE ST_DWithin(
        localizacao::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY conf DESC NULLS LAST, id ASC
      LIMIT 1;
      `,
      [lon, lat, RADIUS_M]
    );

    if (near.rows.length) {
      const best = near.rows[0];
      if (Number.isFinite(conf) && (!Number.isFinite(best.conf) || conf > Number(best.conf))) {
        const upd = await pool.query(
          `
          UPDATE public.bueiros
          SET localizacao = ST_SetSRID(ST_MakePoint($1, $2), 4326),
              data_monitoramento = NOW(),
              conf = $3
          WHERE id = $4
          RETURNING id, data_monitoramento,
                    ST_Y(localizacao::geometry) AS latitude,
                    ST_X(localizacao::geometry) AS longitude,
                    conf;
          `,
          [lon, lat, conf, best.id]
        );
        await saveImageFor(upd.rows[0].id, file);
        return res.status(200).json({ sucesso: true, bueiro: upd.rows[0], updated: true });
      }
      await saveImageFor(best.id, file);
      return res.status(200).json({ sucesso: true, bueiro: best, updated: false });
    }

    const newId = randomUUID();
    const ins = await pool.query(
      `
      INSERT INTO public.bueiros (id, localizacao, data_monitoramento, conf)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), $4)
      RETURNING id, data_monitoramento,
                ST_Y(localizacao::geometry) AS latitude,
                ST_X(localizacao::geometry) AS longitude,
                conf;
      `,
      [newId, lon, lat, Number.isFinite(conf) ? conf : null]
    );
    await saveImageFor(ins.rows[0].id, file);
    return res.status(201).json({ sucesso: true, bueiro: ins.rows[0], created: true });
  } catch (err) {
    console.error('❌ Erro ao cadastrar bueiro:', err.message);
    return res.status(500).json({
      erro: 'Erro ao cadastrar bueiro.',
      detalhe: err.message
    });
  }
});

router.post('/bueiros/upload-imagem', upload.single('imagem'), async (req, res) => {
  try {
    if (!req.file?.originalname) {
      return res.status(400).json({ erro: 'Arquivo é obrigatório (campo "imagem").' });
    }

    const base = path.parse(req.file.originalname).name.trim();

    const r = await pool.query(
      `
      SELECT id
      FROM public.bueiros
      WHERE id::text = $1
      LIMIT 1;
      `,
      [base]
    );

    if (!r.rows.length) {
      return res.status(404).json({ erro: 'Bueiro não encontrado para este nome de arquivo.', base });
    }

    const bueiroId = r.rows[0].id;

    const guessedExt = EXT_BY_MIME[req.file.mimetype];
    const originalExt = path.parse(req.file.originalname).ext.replace('.', '').toLowerCase();
    const ext = guessedExt || originalExt || 'jpg';

    const filenameDisk = `${bueiroId}.${ext}`;
    fs.writeFileSync(path.join(IMG_DIR, filenameDisk), req.file.buffer);

    await pool.query(
      `
      INSERT INTO public.bueiro_imagens (bueiro_id, filename_base, mime, bytes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (bueiro_id) DO UPDATE
        SET filename_base = EXCLUDED.filename_base,
            mime          = EXCLUDED.mime,
            bytes         = EXCLUDED.bytes,
            created_at    = NOW();
      `,
      [bueiroId, String(bueiroId), req.file.mimetype, req.file.size]
    );

    return res
      .status(201)
      .json({ sucesso: true, bueiro_id: bueiroId, filename_base: String(bueiroId), url: imageUrl(bueiroId) });
  } catch (err) {
    console.error('❌ Erro no upload-imagem:', err.message);
    return res.status(500).json({ erro: 'Falha no upload da imagem.', detalhe: err.message });
  }
});

router.get('/bueiros/:id/imagem', async (req, res) => {
  const idText = String(req.params.id || '').trim();
  if (!idText) return res.status(400).send('id inválido');

  try {
    const r = await pool.query(
      `SELECT mime FROM public.bueiro_imagens WHERE bueiro_id::text = $1`,
      [idText]
    );
    if (r.rows.length) {
      const mime = r.rows[0].mime || 'image/jpeg';
      const tryExt = EXT_BY_MIME[mime] ? [EXT_BY_MIME[mime]] : [];
      for (const ext of [...tryExt, 'jpg', 'jpeg', 'png', 'webp']) {
        const filePath = path.join(IMG_DIR, `${idText}.${ext}`);
        if (fs.existsSync(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.type(mime);
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    const b = await pool.query(`SELECT imagem FROM public.bueiros WHERE id::text = $1`, [idText]);
    if (b.rows.length && b.rows[0].imagem) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.type('image/jpeg');
      return res.end(b.rows[0].imagem, 'binary');
    }

    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const filePath = path.join(IMG_DIR, `${idText}.${ext}`);
      if (fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.type(ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    return res.status(404).send('Imagem não encontrada.');
  } catch (err) {
    console.error('❌ Erro ao buscar imagem:', err.message);
    return res.status(500).send('Erro ao buscar imagem.');
  }
});

module.exports = router;
