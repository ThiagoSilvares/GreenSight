require('dotenv').config();
const { Pool } = require('pg');

const ssl =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),  
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl,
  max: 10,                
  idleTimeoutMillis: 30000,   
  connectionTimeoutMillis: 10000, 
});

(async () => {
  try {
    console.log('✅ Conectado ao Supabase');
  } catch (err) {
    console.error('❌ Erro ao conectar ao Supabase:', err.message);
  }
})();

module.exports = pool;
