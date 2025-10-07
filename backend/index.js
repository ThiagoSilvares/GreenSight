'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1); 

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const FRONT_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://green-sight.vercel.app';
const EXTRA_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [FRONT_ORIGIN, ...EXTRA_ORIGINS];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return cb(null, true);
      return cb(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    credentials: false,
  })
);

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d', immutable: true }));

app.use((req, _res, next) => {
  req.pool = pool;
  next();
});

const bueirosRoutes = require('./routes/bueiros');
app.use('/api', bueirosRoutes);

const relatosRoutes = require('./routes/relatos');
app.use('/api', relatosRoutes);

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM public.usuarios WHERE email = $1 AND senha = $2',
      [email, senha]
    );
    if (result.rows.length > 0) {
      return res.json({ sucesso: true, usuario: result.rows[0] });
    }
    return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas' });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor' });
  }
});

app.get('/api/resumo', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.resumo_bueiros;');
    return res.json(
      result.rows[0] || {
        total_mapeados: 0,
        novos_hoje: 0,
        novos_7d: 0,
        novos_30d: 0,
      }
    );
  } catch (err) {
    console.error('Erro ao buscar resumo:', err);
    return res.status(500).send('Erro ao buscar resumo');
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    public_base_url: process.env.PUBLIC_BASE_URL || null,
    time: new Date().toISOString(),
  });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, now: r.rows[0].now, host: process.env.DATABASE_HOST || null });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({
      ok: false,
      code: e.code,
      message: e.message,
      host: process.env.DATABASE_HOST || null,
    });
  }
});

app.get('/', (_req, res) => {
  res.send(
    `API ativa!<br>DB: ${
      process.env.DATABASE_HOST || 'env host not set'
    }<br>PUBLIC_BASE_URL: ${process.env.PUBLIC_BASE_URL || '(não definido)'}`
  );
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error('Erro inesperado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  if (process.env.PUBLIC_BASE_URL) {
    console.log(`🌐 PUBLIC_BASE_URL = ${process.env.PUBLIC_BASE_URL}`);
  }
});
