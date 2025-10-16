require('dotenv').config();
const dns = require('dns');
const { Pool } = require('pg');

try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const ssl =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : false;

const TRANSIENT_NET_ERRORS = new Set([
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function resolveIPv4(host) {
  try {
    const addrs = await new Promise((res, rej) =>
      dns.resolve4(host, (e, a) => (e ? rej(e) : res(a)))
    );
    if (addrs?.length) {
      console.log('[dns] IPv4 (resolve4):', addrs[0]);
      return addrs[0];
    }
  } catch (e) {
    console.warn('[dns] resolve4 falhou:', e.message);
  }
  try {
    const addr = await new Promise((res, rej) =>
      dns.lookup(host, { family: 4 }, (e, a) => (e ? rej(e) : res(a)))
    );
    console.log('[dns] IPv4 (lookup):', addr);
    return addr;
  } catch (e) {
    console.warn('[dns] lookup v4 falhou:', e.message, '→ usando hostname direto');
    return host; 
  }
}

function makePool(host) {
  return new Pool({
    host,
    port: Number(process.env.DATABASE_PORT || 6543),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl,
    max: Number(process.env.DB_MAX || 8),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
    application_name: 'greensight-api',
  });
}

let currentPool = null;
let initInFlight = null;

async function initPool({ reason = 'boot' } = {}) {
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    const host = process.env.DATABASE_HOST;
    const hostResolved = await resolveIPv4(host);
    const pool = makePool(hostResolved);

    pool.on('error', (err) => {
      console.error('[pg] erro no pool:', err.code || err.message);
    });

    try {
      const r = await pool.query('SELECT NOW()');
      console.log(`✅ DB OK (${reason}) em`, r.rows[0].now, 'host=', hostResolved);
    } catch (e) {
      console.error(`❌ DB falhou no init (${reason}):`, e.code || e.message);
      if (TRANSIENT_NET_ERRORS.has(e.code)) {
        await sleep(1500);
        return initPool({ reason: `retry-${e.code}` });
      }
    }

    currentPool = pool;
    initInFlight = null;
    return currentPool;
  })();

  return initInFlight;
}

initPool({ reason: 'boot' }).catch((e) =>
  console.error('initPool error:', e.code || e.message)
);

async function getPool() {
  if (currentPool) return currentPool;
  return initPool({ reason: 'lazy' });
}

async function query(...args) {
  const pool = await getPool();
  try {
    return await pool.query(...args);
  } catch (e) {
    if (TRANSIENT_NET_ERRORS.has(e.code)) {
      console.warn('[pg] erro de rede:', e.code, '→ re-resolvendo & recriando pool');
      await initPool({ reason: `recover-${e.code}` });
      const p2 = await getPool();
      return await p2.query(...args);
    }
    throw e;
  }
}

async function connect() {
  const pool = await getPool();
  return pool.connect();
}

async function end() {
  const pool = currentPool;
  if (pool) await pool.end();
  currentPool = null;
}

module.exports = { query, connect, end, get _pool() { return getPool(); } };
