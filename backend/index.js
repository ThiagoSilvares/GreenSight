// index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();          // carrega .env
const pool = require('./db');        // usa o pool do db.js

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Arquivos estáticos (imagens salvas em disco, se usar)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Deixa o pool disponível em todas as rotas (req.pool)
app.use((req, _res, next) => {
  req.pool = pool;
  next();
});

// Rotas principais
const bueirosRoutes = require('./routes/bueiros');
app.use('/api', bueirosRoutes);

const relatosRoutes = require('./routes/relatos');
app.use('/api', relatosRoutes);

// Login demo (ajuste conforme sua tabela de usuários)
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

// Resumo de bueiros (ajuste a view resumo_bueiros no Supabase)
app.get('/api/resumo', async (_req, res) => {
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

// Rota de saúde do banco (debug da conexão Supabase)
app.get('/api/health/db', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, now: r.rows[0].now, host: process.env.DATABASE_HOST });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({
      ok: false,
      code: e.code,
      message: e.message,
      host: process.env.DATABASE_HOST,
    });
  }
});

// Rota inicial simples
app.get('/', (_req, res) => {
  res.send('🌱 Green Sight API ativa e conectada ao Supabase!');
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
