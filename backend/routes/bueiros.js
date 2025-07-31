const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/bueiros', upload.single('imagem'), async (req, res) => {
  const { latitude, longitude, status } = req.body;
  const imagem = req.file?.buffer;

  try {
    if (!latitude || !longitude || !status || !imagem) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios, inclusive a imagem.' });
    }

    const result = await pool.query(
      `
      INSERT INTO bueiros (status, percentual_obstrucao, imagem, localizacao)
      VALUES ($1, NULL, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
      RETURNING *
      `,
      [
        status,
        imagem,
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
