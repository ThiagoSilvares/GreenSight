import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const DIR = process.argv[2] || path.resolve(process.cwd(), 'thumbs_teste_rota');
const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!fs.existsSync(DIR)) {
  console.error('Pasta não encontrada:', DIR);
  process.exit(1);
}

async function uploadOne(fullPath) {
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) return { skip: true, reason: 'not a file' };

  const ext = path.extname(fullPath).toLowerCase();
  if (!exts.has(ext)) return { skip: true, reason: 'ext not allowed' };

  const filename = path.basename(fullPath);
  const form = new FormData();
  form.append('imagem', fs.createReadStream(fullPath), filename);

  const url = `${API_BASE}/bueiros/upload-imagem`;
  const headers = form.getHeaders();

  try {
    const { data } = await axios.post(url, form, { headers, maxBodyLength: Infinity });
    return { ok: true, res: data };
  } catch (err) {
    return { ok: false, error: err.response?.data || err.message };
  }
}

(async () => {
  const files = fs.readdirSync(DIR).map(f => path.join(DIR, f));
  console.log(`Encontrados ${files.length} itens em: ${DIR}`);

  let ok = 0, skip = 0, fail = 0;

  const chunk = 4;
  for (let i = 0; i < files.length; i += chunk) {
    const batch = files.slice(i, i + chunk).map(uploadOne);
    const results = await Promise.all(batch);
    results.forEach((r, idx) => {
      const name = path.basename(files[i + idx]);
      if (r.ok) { ok++; console.log(`✅ ${name} ->`, r.res?.url || 'ok'); }
      else if (r.skip) { skip++; console.log(`↷ ${name} (pulado: ${r.reason})`); }
      else { fail++; console.warn(`❌ ${name} ->`, r.error); }
    });
  }

  console.log(`\nResumo: enviados ${ok} | pulados ${skip} | erros ${fail}`);
})();
