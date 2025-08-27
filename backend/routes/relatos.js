const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

async function isAdmin(req, res, next) {
  try {
    const userEmail = (req.headers['x-user-email'] || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Não autenticado.' });

    try {
      const q = await req.pool.query(
        'SELECT is_admin, email FROM public.usuarios WHERE LOWER(email) = $1 LIMIT 1',
        [userEmail]
      );
      const row = q.rows[0];
      const adminByDb = !!row?.is_admin;

      const adminByDomain = /@admgreensight\.com$/i.test(userEmail);

      if (adminByDb || adminByDomain) return next();
    } catch (_) {
      if (/@admgreensight\.com$/i.test(userEmail)) return next();
    }

    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  } catch (e) {
    console.error('Erro em isAdmin:', e);
    return res.status(500).json({ message: 'Falha ao validar permissão.' });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path
      .basename(file.originalname || 'img', ext)
      .replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Envie apenas imagens'));
  },
});

router.get('/relatos', async (req, res) => {
  try {
    const { rows } = await req.pool.query(
      `SELECT id, author, comment, address, image_path, created_at
         FROM public.relatos
        ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar relatos:', err);
    res.status(500).json({ message: 'Erro ao listar relatos' });
  }
});

router.post('/relatos', upload.single('image'), async (req, res) => {
  const { author, comment, address } = req.body;
  try {
    if (!author?.trim() || !comment?.trim() || !address?.trim() || !req.file) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
    }
    const imagePath = `/uploads/${req.file.filename}`;

    const { rows } = await req.pool.query(
      `INSERT INTO public.relatos (author, comment, address, image_path)
       VALUES ($1, $2, $3, $4)
       RETURNING id, author, comment, address, image_path, created_at`,
      [author.trim(), comment.trim(), address.trim(), imagePath]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar relato:', err);
    res.status(500).json({ message: 'Erro ao salvar relato' });
  }
});

router.delete('/relatos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const del = await req.pool.query(
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

    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir relato:', err);
    return res.status(500).json({ message: 'Erro ao excluir relato.' });
  }
});

module.exports = router;
