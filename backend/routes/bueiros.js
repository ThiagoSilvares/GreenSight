const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

// Upload em memória (imagem opcional)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Nome da cidade alvo (pode virar .env depois)
const CITY_NAME = process.env.CITY_NAME || 'São Caetano do Sul';

/**
 * GET /bueiros
 * Retorna array simples para o mapa: id, data, latitude, longitude.
 */
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
    return res.json(result.rows); // ARRAY puro
  } catch (err) {
    console.error('❌ Erro ao listar bueiros:', err.message);
    return res.status(500).json([]); // mantém contrato de array
  }
});

/**
 * GET /bueiros/por-zona?lat0=<lat>&lon0=<lon>
 * Conta bueiros por zona, priorizando:
 *   1) zonas + municipio válido
 *   2) apenas zonas
 *   3) apenas municipio (quadrantes pelo centro)
 *   4) fallback geral (quadrantes globais)
 */
router.get('/bueiros/por-zona', async (req, res) => {
  const lat0 = Number.parseFloat(req.query.lat0) || -23.64601;
  const lon0 = Number.parseFloat(req.query.lon0) || -46.5759;

  try {
    // Verifica se as tabelas existem
    const meta = await pool.query(
      `
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='zonas' AND column_name='geom'
        ) AS has_zonas,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='municipios' AND column_name='geom'
        ) AS has_municipios;
      `
    );
    const hasZonas = !!meta.rows[0]?.has_zonas;
    const hasMunicipios = !!meta.rows[0]?.has_municipios;

    // Verifica se existe o município alvo
    let hasCidade = false;
    if (hasMunicipios) {
      const rCidade = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM public.municipios WHERE nome ILIKE $1) AS ok`,
        [CITY_NAME]
      );
      hasCidade = !!rCidade.rows[0]?.ok;
    }

    // Caso 1: ZONAS + MUNICÍPIO válido
    if (hasZonas && hasCidade) {
      const r = await pool.query(
        `
        WITH cidade AS (
          SELECT geom FROM public.municipios WHERE nome ILIKE $1 LIMIT 1
        )
        SELECT z.nome AS zona, COALESCE(COUNT(b.id),0)::int AS total
        FROM public.zonas z
        LEFT JOIN public.bueiros b
          ON ST_Intersects(b.localizacao, z.geom)
         AND ST_Covers((SELECT geom FROM cidade), b.localizacao)
        GROUP BY z.nome
        ORDER BY z.nome;
        `,
        [CITY_NAME]
      );
      return res.json(r.rows);
    }

    // Caso 2: apenas ZONAS
    if (hasZonas) {
      const r = await pool.query(
        `
        SELECT z.nome AS zona, COALESCE(COUNT(b.id),0)::int AS total
        FROM public.zonas z
        LEFT JOIN public.bueiros b
          ON ST_Intersects(b.localizacao, z.geom)
        GROUP BY z.nome
        ORDER BY z.nome;
        `
      );
      return res.json(r.rows);
    }

    // Caso 3: apenas MUNICÍPIO (quadrantes pelo centro)
    if (hasCidade) {
      const r = await pool.query(
        `
        WITH cidade AS (
          SELECT geom FROM public.municipios WHERE nome ILIKE $1 LIMIT 1
        )
        SELECT
          CASE
            WHEN ST_Y(b.localizacao) >= $2 AND ST_X(b.localizacao) >= $3 THEN 'Zona Norte'
            WHEN ST_Y(b.localizacao)  < $2 AND ST_X(b.localizacao) >= $3 THEN 'Zona Leste'
            WHEN ST_Y(b.localizacao)  < $2 AND ST_X(b.localizacao)  < $3 THEN 'Zona Sul'
            ELSE 'Zona Oeste'
          END AS zona,
          COUNT(*)::int AS total
        FROM public.bueiros b
        WHERE ST_Covers((SELECT geom FROM cidade), b.localizacao)
        GROUP BY zona
        ORDER BY zona;
        `,
        [CITY_NAME, lat0, lon0]
      );
      return res.json(r.rows);
    }

    // Caso 4: fallback geral (quadrantes globais)
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
    return res.status(500).json([]); // mantém contrato de array
  }
});

/**
 * POST /bueiros
 * Cadastra bueiro (imagem opcional).
 * Campos: latitude, longitude, imagem (opcional)
 */
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
