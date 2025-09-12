// routes/bueiros.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

// Upload em memória (imagem opcional)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Nome da cidade alvo (pode virar .env depois)
const CITY_NAME = 'São Caetano do Sul';

/**
 * GET /bueiros
 * Retorna array simples para o mapa: id, data, latitude, longitude.
 * (Mantido como estava: lista todos os bueiros com coordenadas)
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
    return res.json(result.rows);
  } catch (err) {
    console.error('❌ Erro ao listar bueiros:', err.message);
    return res
      .status(500)
      .json({ erro: 'Erro ao listar bueiros.', detalhe: err.message });
  }
});

/**
 * GET /bueiros/por-zona?lat0=<lat>&lon0=<lon>
 * Conta bueiros por zona, priorizando:
 *   1) zonas + municipios (conta apenas dentro da cidade)
 *   2) zonas (sem filtro de cidade)
 *   3) municipios (quadrantes dentro da cidade usando lat0/lon0)
 *   4) fallback geral (quadrantes em lat0/lon0 sem filtro)
 *
 * Observações importantes:
 * - Usamos ST_Intersects no join com zonas para não perder pontos na borda.
 * - Quando houver municipio, filtramos com ST_Within(b.localizacao, cidade.geom).
 */
router.get('/bueiros/por-zona', async (req, res) => {
  const lat0 = Number.parseFloat(req.query.lat0) || -23.64601;
  const lon0 = Number.parseFloat(req.query.lon0) || -46.5759;

  try {
    // Verificações de existência
    const meta = await pool.query(
      `
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'zonas' AND column_name = 'geom'
        ) AS has_zonas,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'municipios' AND column_name = 'geom'
        ) AS has_municipios;
      `
    );
    const hasZonas = !!meta.rows[0]?.has_zonas;
    const hasMunicipios = !!meta.rows[0]?.has_municipios;

    // Caso 1: ZONAS + MUNICIPIOS -> zonas recortadas + filtro cidade
    if (hasZonas && hasMunicipios) {
      const r = await pool.query(
        `
        WITH cidade AS (
          SELECT geom
          FROM public.municipios
          WHERE nome ILIKE $1
          LIMIT 1
        )
        SELECT z.nome AS zona, COALESCE(COUNT(b.id),0)::int AS total
        FROM public.zonas z
        LEFT JOIN public.bueiros b
          ON ST_Intersects(b.localizacao, z.geom)
         AND ST_Within(b.localizacao, (SELECT geom FROM cidade))
        GROUP BY z.nome
        ORDER BY z.nome;
        `,
        [CITY_NAME]
      );
      return res.json(r.rows);
    }

    // Caso 2: apenas ZONAS -> conta por zonas (sem filtro de cidade)
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

    // Caso 3: apenas MUNICIPIOS -> quadrantes exclusivos dentro da cidade
    if (hasMunicipios) {
      const r = await pool.query(
        `
        WITH cidade AS (
          SELECT geom
          FROM public.municipios
          WHERE nome ILIKE $1
          LIMIT 1
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
        WHERE ST_Within(b.localizacao, (SELECT geom FROM cidade))
        GROUP BY zona
        ORDER BY zona;
        `,
        [CITY_NAME, lat0, lon0]
      );
      return res.json(r.rows);
    }

    // Caso 4: fallback geral -> quadrantes exclusivos pelo centro
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
    console.error('❌ Erro em /bueiros/por-zona:', err.message);
    return res
      .status(500)
      .json({ erro: 'Erro ao calcular bueiros por zona.', detalhe: err.message });
  }
});

/**
 * POST /bueiros
 * Cadastra bueiro (imagem opcional).
 * Campos: latitude (num), longitude (num), imagem (file "imagem" - opcional)
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
