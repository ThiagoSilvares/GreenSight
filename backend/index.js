const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'greensight_db',
  password: '1234',
  port: 5432,
});

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

const bueirosRoutes = require('./routes/bueiros');
app.use('/api', bueirosRoutes);

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length > 0) {
      res.json({ sucesso: true, usuario: result.rows[0] });
    } else {
      res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
});

app.get('/api/resumo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resumo_bueiros');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    res.status(500).send('Erro ao buscar resumo');
  }
});

app.get('/api/bueiros', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        status,
        imagem_url,
        percentual_obstrucao,
        data_monitoramento,
        ST_Y(localizacao) AS latitude,
        ST_X(localizacao) AS longitude
      FROM bueiros
      WHERE localizacao IS NOT NULL
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar bueiros:', err);
    res.status(500).send('Erro ao buscar bueiros');
  }
});

app.listen(3001, () => {
  console.log('🚀 Servidor rodando em http://localhost:3001');
});
