// ingest-jsonl.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const p of [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function num(v) {
  return typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
}

function extractLatLon(o) {
  let lat = num(o.lat ?? o.latitude ?? o.y ?? o.localizacao_lat);
  let lon = num(o.lon ?? o.longitude ?? o.lng ?? o.x ?? o.localizacao_lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const c = o?.geometry?.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      lon = num(c[0]);
      lat = num(c[1]);
    }
  }
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function extractTs(o) {
  const cand = o.ts_utc ?? o.timestamp ?? o.detected_at ?? o.date ?? o.data_monitoramento ?? o.created_at ?? o.updated_at;
  const d = cand ? new Date(cand) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : null;
}

if (!process.argv[2]) {
  console.error('Uso: node ingest-jsonl.mjs /detections_jetson-nano-01_2025-10-04T15.jsonl');
  process.exit(1);
}

const ssl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl })
  : new Pool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 6543),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl,
    });

const USE_DEDUP = String(process.env.DETECCOES_USE_DEDUP || '').toLowerCase() === 'true';

const SQL_INSERT = USE_DEDUP
  ? `
    insert into public.deteccoes (id, device_id, ts_utc, lat, lon, conf, fix)
    values ($1,$2,$3,$4,$5,$6,$7)
    on conflict ( (coalesce(device_id,'')), ts_utc, lat, lon )
    do update set
      conf = greatest(coalesce(excluded.conf, -1), coalesce(deteccoes.conf, -1)),
      fix  = coalesce(excluded.fix, deteccoes.fix),
      device_id = coalesce(nullif(deteccoes.device_id, ''), excluded.device_id, '')
  `
  : `
    insert into public.deteccoes (id, device_id, ts_utc, lat, lon, conf, fix)
    values ($1,$2,$3,$4,$5,$6,$7)
    on conflict do nothing
  `;

(async () => {
  let ok = 0,
    skip = 0,
    fail = 0;

  const content = fs.readFileSync(process.argv[2], 'utf8').trim();
  const records = content.startsWith('[')
    ? JSON.parse(content)
    : content.split(/\r?\n/).filter(Boolean).map((L) => JSON.parse(L));

  for (const o of records) {
    try {
      const pos = extractLatLon(o);
      const ts = extractTs(o) || new Date().toISOString();
      if (!pos) {
        skip++;
        continue;
      }

      await pool.query(SQL_INSERT, [
        o.id ?? randomUUID(),
        o.device_id ?? null,
        ts,
        pos.lat,
        pos.lon,
        o.conf ?? null,
        o.fix ?? null,
      ]);

      ok++;
    } catch {
      fail++;
    }
  }

  await pool.end();
  console.log(`Inseridos/atualizados: ${ok} | pulados: ${skip} | erros: ${fail}`);
})();
