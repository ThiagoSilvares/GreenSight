const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// arquivos estáticos (imagens salvas em disco, se usar)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- PostgreSQL ---
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'greensight_db',
  password: '1234',
  port: 5432,
});

// deixa o pool disponível nas rotas (se quiser usar req.pool)
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// --- Rotas modularizadas ---
const bueirosRoutes = require('./routes/bueiros');  // já sem status
app.use('/api', bueirosRoutes);

const relatosRoutes = require('./routes/relatos');
app.use('/api', relatosRoutes);

// --- Login simples (demo) ---
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length > 0) {
      return res.json({ sucesso: true, usuario: result.rows[0] });
    } else {
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
});

// --- Resumo (nova view SEM status) ---
app.get('/api/resumo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.resumo_bueiros;');
    return res.json(result.rows[0] || {
      total_mapeados: 0,
      novos_hoje: 0,
      novos_7d: 0,
      novos_30d: 0,
    });
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    return res.status(500).send('Erro ao buscar resumo');
  }
});

// --- Healthcheck opcional ---
app.get('/', (_req, res) => {
  res.send('Green Sight API ativa');
});

// 🔊 Start
app.listen(3001, () => {
  console.log('🚀 Servidor rodando em http://localhost:3001');
});