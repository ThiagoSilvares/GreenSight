import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const p of [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
]) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

const num = (v) => (typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v));

function extractLatLon(o) {
  let lat = num(o.lat ?? o.latitude ?? o.y);
  let lon = num(o.lon ?? o.longitude ?? o.lng ?? o.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const c = o?.geometry?.coordinates;
    if (Array.isArray(c) && c.length >= 2) { lon = num(c[0]); lat = num(c[1]); }
  }
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function extractConfRaw(o) {
  const cand =
    o.conf ?? o.confidence ?? o.score ?? o.prob ??
    o?.properties?.conf ?? o?.properties?.confidence ?? null;
  if (cand === null || cand === undefined) return null;
  const v = typeof cand === 'string' ? parseFloat(cand.replace(',', '.')) : Number(cand);
  return Number.isFinite(v) ? v : null;
}
function normalizeConf(v) {
  if (!Number.isFinite(v)) return null;
  const keep = String(process.env.CONF_KEEP_SCALE || '').toLowerCase() === 'true';
  if (!keep && v > 1 && v <= 100) return v / 100;
  return v;
}

function distMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

if (!process.argv[2]) {
  console.error('Uso: node ingest-jsonl.mjs /detections_jetson-nano-01_2025-10-04T15.jsonl');
  process.exit(1);
}

const ssl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
  ? { rejectUnauthorized: false }
  : false;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl })
  : new Pool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 5432),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl,
    });

const RADIUS_M = Number(process.env.BUEIRO_RADIUS_M || 8);

const SQL_UPSERT = `
  INSERT INTO public.bueiros (id, localizacao, data_monitoramento, ts_utc, conf, fix)
  VALUES ($1::uuid, ST_SetSRID(ST_MakePoint($2, $3), 4326), NOW(), $4::timestamptz, $5, $6)
  ON CONFLICT (id) DO UPDATE
    SET localizacao        = EXCLUDED.localizacao,
        data_monitoramento = NOW(),
        ts_utc             = COALESCE(EXCLUDED.ts_utc, public.bueiros.ts_utc),
        conf               = GREATEST(COALESCE(public.bueiros.conf, -1), COALESCE(EXCLUDED.conf, -1)),
        fix                = COALESCE(EXCLUDED.fix, public.bueiros.fix);
`;

(async () => {
  const content = fs.readFileSync(process.argv[2], 'utf8').trim();
  const records = content.startsWith('[')
    ? JSON.parse(content)
    : content.split(/\r?\n/).filter(Boolean).map((L) => JSON.parse(L));

  const dets = [];
  for (const o of records) {
    const pos = extractLatLon(o);
    if (!pos || !o.id) continue; 
    const conf = normalizeConf(extractConfRaw(o));
    const ts   = o.ts_utc ? new Date(o.ts_utc) : null;
    dets.push({
      id: String(o.id),
      lat: pos.lat,
      lon: pos.lon,
      ts_utc: ts && !isNaN(ts) ? ts.toISOString() : null,
      conf: Number.isFinite(conf) ? conf : null,
      fix: Number.isFinite(Number(o.fix)) ? Number(o.fix) : null,
    });
  }

  dets.sort((a, b) => ((b.conf ?? -Infinity) - (a.conf ?? -Infinity)));
  const winners = [];
  for (const d of dets) {
    if (!winners.some((w) => distMeters(w, d) < RADIUS_M)) winners.push(d);
  }

  let ok = 0, fail = 0;
  for (const w of winners) {
    try {
      await pool.query(SQL_UPSERT, [
        w.id,
        w.lon,
        w.lat,
        w.ts_utc,
        w.conf,
        w.fix,
      ]);
      ok++;
    } catch (e) {
      fail++;
      console.error('Falha ao inserir/atualizar', w.id, e.message);
    }
  }

  await pool.end();
  console.log(`Inseridos/atualizados: ${ok} | erros: ${fail}`);
})();
