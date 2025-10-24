const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../db');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const norm = (v) => (v ?? '').toString().trim();
const makeAddress = ({ address, rua, numero, bairro }) => {
  const a = norm(address);
  if (a) return a;
  const r = norm(rua);
  const n = norm(numero);
  const b = norm(bairro);
  if (r && n && b) return `${r}, ${n} - ${b}`;
  if (r && b && !n) return `${r} - ${b}`;
  if (r && n && !b) return `${r}, ${n}`;
  if (r) return r;
  return '';
};

async function isAdmin(req, res, next) {
  try {
    const userEmail = (req.headers['x-user-email'] || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Não autenticado.' });

    try {
      const q = await pool.query(
        'SELECT is_admin FROM public.usuarios WHERE LOWER(email) = $1 LIMIT 1',
        [userEmail]
      );
      const adminByDb = !!q.rows[0]?.is_admin;
      const adminByDomain = /@admgreensight\.com$/i.test(userEmail);
      if (adminByDb || adminByDomain) return next();
    } catch {
      if (/@admgreensight\.com$/i.test(userEmail)) return next();
    }
    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  } catch (e) {
    console.error('Erro em isAdmin:', e);
    return res.status(500).json({ message: 'Falha ao validar permissão.' });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path
      .basename(file.originalname || 'img', ext)
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file) return cb(null, true);
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Envie apenas imagens'), false);
  },
});

router.get('/relatos', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, author, address, content, latitude, longitude, image_path, created_at
         FROM public.relatos
        ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar relatos:', err);
    return res.status(500).json({ message: 'Erro ao listar relatos' });
  }
});

// router.post('/relatos', upload.single('image'), async (req, res) => {
//   try {
//     console.log('[relatos:create] fields:', req.body);
//     console.log('[relatos:create] file:', req.file?.fieldname);

//     const author = norm(req.body.author);
//     const address = makeAddress({
//       address: req.body.address,
//       rua: req.body.rua,
//       numero: req.body.numero,
//       bairro: req.body.bairro,
//     });
//     const content = norm(req.body.content) || null;

//     if (!author) {
//       return res.status(400).json({ message: 'Informe o autor do relato.' });
//     }
//     if (!address) {
//       return res.status(400).json({
//         message: 'Informe o endereço (rua, número e bairro).',
//         debug: { received: req.body },
//       });
//     }

//     let imagePath = null;
//     if (req.file) {
//       imagePath = `/uploads/${path.basename(req.file.path)}`;
//     }

//     const { rows } = await pool.query(
//       `INSERT INTO public.relatos (author, address, content, image_path)
//        VALUES ($1, $2, $3, $4)
//        RETURNING id, author, address, content, image_path, created_at`,
//       [author, address, content, imagePath]
//     );

//     return res.status(201).json(rows[0]);
//   } catch (err) {
//     console.error('Erro ao criar relato:', err);
//     if (err.name === 'MulterError') {
//       return res.status(400).json({ message: err.message || 'Falha no upload.' });
//     }
//     return res.status(500).json({ message: 'Erro ao salvar relato' });
//   }
// });

router.delete('/relatos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query(
      `DELETE FROM public.relatos
        WHERE id = $1
      RETURNING image_path`,
      [id]
    );

    if (del.rowCount === 0) {
      return res.status(404).json({ message: 'Relato não encontrado.' });
    }

    const relPath = del.rows[0].image_path;
    if (relPath) {
      const fileOnDisk = path.join(process.cwd(), relPath.replace(/^\//, ''));
      fs.unlink(fileOnDisk, () => {});
    }

    return res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao excluir relato:', err);
    return res.status(500).json({ message: 'Erro ao excluir relato.' });
  }
});

module.exports = router;
