'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const CITY_NAME = process.env.CITY_NAME || 'São Caetano do Sul';

router.get('/bueiros', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude
      FROM public.bueiros
      WHERE localizacao IS NOT NULL
      ORDER BY id DESC;
      `
    );
    return res.json(result.rows);
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
        -- bueiros dentro do município (SRID normalizado para o SRID do polígono municipal)
        b_in AS (
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
  const { latitude, longitude } = req.body;
  const imagem = req.file?.buffer ?? null;

  try {
    const lat = parseFloat(String(latitude).replace(',', '.'));
    const lon = parseFloat(String(longitude).replace(',', '.'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res
        .status(400)
        .json({ erro: 'Latitude e longitude são obrigatórias e devem ser numéricas.' });
    }

    const result = await pool.query(
      `
      INSERT INTO public.bueiros (
        imagem,
        localizacao,
        data_monitoramento
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326),
        NOW()
      )
      RETURNING 
        id,
        data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude;
      `,
      [imagem, lon, lat]
    );

    console.log('✅ Bueiro cadastrado:', result.rows[0]);
    return res.status(201).json({ sucesso: true, bueiro: result.rows[0] });
  } catch (err) {
    console.error('❌ Erro ao cadastrar bueiro:', err.message);
    return res.status(500).json({
      erro: 'Erro ao cadastrar bueiro.',
      detalhe: err.message
    });
  }
});

module.exports = router;
