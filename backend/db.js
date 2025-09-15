// db.js
require('dotenv').config();
const { Pool } = require('pg');

// Configuração SSL dinâmica
const ssl =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false;

// Pool de conexões
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 6543),  // default pooler port
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl,
  max: 10,                 // conexões simultâneas no pool
  idleTimeoutMillis: 10_000,   // 10s idle
  connectionTimeoutMillis: 10_000, // 10s timeout
});

// Teste inicial de conexão (log no console)
(async () => {
  try {
    const res = await pool.query('SELECT NOW() AS now');
    console.log('✅ Conectado ao Supabase. Hora atual do DB:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Erro ao conectar ao Supabase:', err.message);
  }
})();

module.exports = pool;
