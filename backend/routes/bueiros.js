const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/bueiros', async (req, res) => {
  const { latitude, longitude, status, imagem_url } = req.body;

  console.log("📥 Dados recebidos no backend:");
  console.log({
    latitude,
    longitude,
    status,
    imagem_url,
    latitudeType: typeof latitude,
    longitudeType: typeof longitude
  });

  try {
    if (!latitude || !longitude || !status || !imagem_url) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
    }

    const result = await pool.query(
      `
      INSERT INTO bueiros (status, percentual_obstrucao, imagem_url, localizacao)
      VALUES ($1, NULL, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
      RETURNING *
      `,
      [
        status,
        imagem_url,
        parseFloat(longitude),
        parseFloat(latitude)
      ]
    );

    console.log('✅ Bueiro cadastrado com sucesso:', result.rows[0]);
    res.status(201).json({ sucesso: true, bueiro: result.rows[0] });
  } catch (err) {
    console.error('❌ Erro ao cadastrar bueiro:', err.message);
    res.status(500).json({
      erro: 'Erro ao cadastrar bueiro.',
      detalhe: err.message
    });
  }
});

module.exports = router;
