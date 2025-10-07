'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const CITY_NAME = process.env.CITY_NAME || 'São Caetano do Sul';
const RADIUS_M = Number(process.env.BUEIRO_RADIUS_M || 8);

const IMG_DIR = process.env.BUEIROS_IMG_DIR || path.resolve(__dirname, '../uploads/bueiros');
fs.mkdirSync(IMG_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const imageUrl = (id) => `/api/bueiros/${id}/imagem`;

router.get('/bueiros', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        COALESCE(ts_utc, data_monitoramento) AS data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude,
        conf
      FROM public.bueiros
      WHERE localizacao IS NOT NULL
      ORDER BY data_monitoramento DESC, id DESC;
      `
    );
    const rows = result.rows.map((r) => ({ ...r, image_url: imageUrl(r.id) }));
    return res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar bueiros:', err.message);
    return res.status(500).json([]);
  }
});

router.get('/bueiros/por-zona', async (req, res) => {
  const lat0 = Number.parseFloat(req.query.lat0) || -23.64601;
  const lon0 = Number.parseFloat(req.query.lon0) || -46.5759;

  try {
    const meta = await pool.query(`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='zonas' AND column_name='geom'
        ) AS has_zonas,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='municipios' AND column_name='geom'
        ) AS has_municipios;
    `);

    const hasZonas = !!meta.rows[0]?.has_zonas;
    const hasMunicipios = !!meta.rows[0]?.has_municipios;

    let hasCidade = false;
    if (hasMunicipios) {
      const rCidade = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM public.municipios WHERE nome ILIKE $1) AS ok`,
        [CITY_NAME]
      );
      hasCidade = !!rCidade.rows[0]?.ok;
    }

    if (hasZonas && hasCidade) {
      const r = await pool.query(
        `
        WITH cidade AS (
          SELECT geom, ST_SRID(geom) AS srid
          FROM public.municipios
          WHERE nome ILIKE $1
          LIMIT 1
        ),
        b_in AS (  -- bueiros dentro do município
          SELECT b.id, b.localizacao
          FROM public.bueiros b, cidade c
          WHERE ST_Within(ST_Transform(b.localizacao, c.srid), c.geom)
        ),
        contagem AS (
          SELECT z.nome AS zona, COUNT(b.id)::int AS total
          FROM public.zonas z
          LEFT JOIN b_in b
            ON ST_Within(
                 ST_Transform(b.localizacao, ST_SRID(z.geom)),
                 z.geom
               )
          GROUP BY z.nome
        ),
        sem_zona AS (
          SELECT 'Sem Zona'::text AS zona, COUNT(*)::int AS total
          FROM b_in b
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.zonas z
            WHERE ST_Within(
                    ST_Transform(b.localizacao, ST_SRID(z.geom)),
                    z.geom
                  )
          )
        )
        SELECT * FROM contagem
        UNION ALL
        SELECT * FROM sem_zona
        ORDER BY zona;
        `,
        [CITY_NAME]
      );
      return res.json(r.rows);
    }

    if (hasZonas) {
      const r = await pool.query(
        `
        WITH b_all AS (SELECT id, localizacao FROM public.bueiros),
        contagem AS (
          SELECT z.nome AS zona, COUNT(b.id)::int AS total
          FROM public.zonas z
          LEFT JOIN b_all b
            ON ST_Within(
                 ST_Transform(b.localizacao, ST_SRID(z.geom)),
                 z.geom
               )
          GROUP BY z.nome
        ),
        sem_zona AS (
          SELECT 'Sem Zona'::text AS zona, COUNT(*)::int AS total
          FROM b_all b
          WHERE NOT EXISTS (
            SELECT 1
            FROM public.zonas z
            WHERE ST_Within(
                    ST_Transform(b.localizacao, ST_SRID(z.geom)),
                    z.geom
                  )
          )
        )
        SELECT * FROM contagem
        UNION ALL
        SELECT * FROM sem_zona
        ORDER BY zona;
        `
      );
      return res.json(r.rows);
    }

    const r = await pool.query(
      `
      SELECT
        CASE
          WHEN ST_Y(localizacao) >= $1 AND ST_X(localizacao) >= $2 THEN 'Zona Norte'
          WHEN ST_Y(localizacao)  < $1 AND ST_X(localizacao) >= $2 THEN 'Zona Leste'
          WHEN ST_Y(localizacao)  < $1 AND ST_X(localizacao)  < $2 THEN 'Zona Sul'
          ELSE 'Zona Oeste'
        END AS zona,
        COUNT(*)::int AS total
      FROM public.bueiros
      GROUP BY zona
      ORDER BY zona;
      `,
      [lat0, lon0]
    );
    return res.json(r.rows);
  } catch (err) {
    console.error('❌ Erro em /bueiros/por-zona:', err);
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
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude
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
          RETURNING id, data_monitoramento, ST_Y(localizacao) AS latitude, ST_X(localizacao) AS longitude, conf;
          `,
          [lon, lat, conf, best.id]
        );
        await saveImageFor(upd.rows[0].id, file);
        return res.status(200).json({ sucesso: true, bueiro: upd.rows[0], updated: true });
      }
      await saveImageFor(best.id, file);
      return res.status(200).json({ sucesso: true, bueiro: best, updated: false });
    }

    const ins = await pool.query(
      `
      INSERT INTO public.bueiros (localizacao, data_monitoramento, conf)
      VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), NOW(), $3)
      RETURNING id, data_monitoramento, ST_Y(localizacao) AS latitude, ST_X(localizacao) AS longitude, conf;
      `,
      [lon, lat, Number.isFinite(conf) ? conf : null]
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

    return res.status(201).json({ sucesso: true, bueiro_id: bueiroId, filename_base: String(bueiroId), url: imageUrl(bueiroId) });
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
          res.type(mime);
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    const b = await pool.query(`SELECT imagem FROM public.bueiros WHERE id::text = $1`, [idText]);
    if (b.rows.length && b.rows[0].imagem) {
      res.type('image/jpeg');
      return res.end(b.rows[0].imagem, 'binary');
    }

    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const filePath = path.join(IMG_DIR, `${idText}.${ext}`);
      if (fs.existsSync(filePath)) {
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
