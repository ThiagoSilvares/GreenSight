// backend/index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'greensight_db',
  password: '1234',
  port: 5432,
});

// Rota de resumo dos bueiros
app.get('/api/resumo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resumo_bueiros');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    res.status(500).send('Erro ao buscar resumo');
  }
});

// Rota de login de usuário
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

// Inicializa o servidor
app.listen(3001, () => {
  console.log('Servidor rodando em http://localhost:3001');
});
