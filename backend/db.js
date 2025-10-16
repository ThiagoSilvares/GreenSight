require('dotenv').config();
const { Pool } = require('pg');

const ssl =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432), 
  password: process.env.DATABASE_PASSWORD,
  ssl,
  max: 8,           
  idleTimeoutMillis: 10000, 
  connectionTimeoutMillis: 5000, 
});

(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conectado ao Supabase com sucesso em', result.rows[0].now);
  } catch (err) {
    console.error('❌ Erro ao conectar ao Supabase:', err.code || err.message);
  }
})();

pool.on('error', (err) => {
  console.error('[pg] erro no pool de conexões:', err.code || err.message);
});

module.exports = pool;
