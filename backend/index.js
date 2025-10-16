'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const FRONT_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://green-sight.vercel.app';
const EXTRA_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([
  FRONT_ORIGIN,
  ...EXTRA_ORIGINS,
  'http://localhost:3000',
  'http://localhost:5173',
]);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); 
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
  res.status(200).json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

app.get('/api/ready', async (_req, res) => {
  const dbCheck = pool.query('SELECT NOW() AS now');
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('db_timeout')), 3000)
  );

  try {
    const r = await Promise.race([dbCheck, timeout]);
    res.status(200).json({
      ok: true,
      db: 'up',
      now: r.rows?.[0]?.now || null,
      host: process.env.DATABASE_HOST || null,
    });
  } catch (e) {
    console.error('[ready] DB indisponível:', e.code || e.message);
    res.status(503).json({
      ok: false,
      db: 'down',
      code: e.code || 'db_unavailable',
      host: process.env.DATABASE_HOST || null,
    });
  }
});

app.get('/', (_req, res) => {
  res.send(
    `API ativa!<br>DB host: ${process.env.DATABASE_HOST || 'env host not set'}`
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
  console.log(`🚀 API escutando em porta ${PORT} (env=${process.env.NODE_ENV || 'dev'})`);
  console.log(`🗄  DB host = ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || '5432'}`);
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando conexões do pool...');
  try { await pool.end(); } catch (_e) {}
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando conexões do pool...');
  try { await pool.end(); } catch (_e) {}
  process.exit(0);
});
