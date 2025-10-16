require('dotenv').config();
const dns = require('dns');
const { Pool } = require('pg');

try {
  dns.setDefaultResultOrder('ipv4first');
  console.log('[dns] Preferência IPv4 aplicada');
} catch {
  console.warn('[dns] Não foi possível aplicar setDefaultResultOrder, continuando...');
}

const ssl =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false;

function createPoolResolved(hostV4) {
  return new Pool({
    host: hostV4 || process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl,
    max: 8, 
    idleTimeoutMillis: 10000, 
    connectionTimeoutMillis: 5000, 
    keepAlive: true,
  });
}

let poolPromise = new Promise((resolve) => {
  dns.lookup(process.env.DATABASE_HOST, { family: 4 }, (err, addr) => {
    if (err) {
      console.warn('[dns] Falha ao resolver IPv4:', err.message, '→ usando hostname');
      resolve(createPoolResolved());
    } else {
      console.log('[dns] IPv4 do banco resolvido:', addr);
      resolve(createPoolResolved(addr));
    }
  });
});

(async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conectado ao Supabase com sucesso em', result.rows[0].now);
  } catch (err) {
    console.error('❌ Erro ao conectar ao Supabase:', err.code || err.message);
  }
})();

(async () => {
  const pool = await poolPromise;
  pool.on('error', (err) => {
    console.error('[pg] Erro no pool de conexões:', err.code || err.message);
  });
})();

module.exports = {
  query: async (...args) => (await poolPromise).query(...args),
  connect: async () => (await poolPromise).connect(),
  end: async () => (await poolPromise).end(),
  get _pool() {
    return poolPromise;
  },
};
