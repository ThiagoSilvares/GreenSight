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
      return res.status(400).json({
        erro: 'Todos os campos são obrigatórios, inclusive a imagem.'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO bueiros (
        status,
        percentual_obstrucao,
        imagem,
        localizacao,
        data_monitoramento
      )
      VALUES (
        $1,
        NULL,
        $2,
        ST_SetSRID(ST_MakePoint($3, $4), 4326),
        NOW()
      )
      RETURNING 
        id,
        status,
        percentual_obstrucao,
        data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude
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

router.put('/bueiros/atualizar-status', async (req, res) => {
  const { latitude, longitude, status } = req.body;

  try {
    if (!latitude || !longitude || !status) {
      return res.status(400).json({ erro: 'Latitude, longitude e novo status são obrigatórios.' });
    }

    const result = await pool.query(
      `
      UPDATE bueiros
      SET status = $1
      WHERE ST_Y(localizacao) = $2 AND ST_X(localizacao) = $3
      RETURNING 
        id,
        status,
        percentual_obstrucao,
        data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude
      `,
      [status, parseFloat(latitude), parseFloat(longitude)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: 'Bueiro não encontrado para atualização.' });
    }

    console.log('🔄 Status atualizado com sucesso:', result.rows[0]);
    res.json({ sucesso: true, bueiro: result.rows[0] });

  } catch (err) {
    console.error('❌ Erro ao atualizar status do bueiro:', err.message);
    res.status(500).json({
      erro: 'Erro ao atualizar status.',
      detalhe: err.message
    });
  }
});

module.exports = router;
