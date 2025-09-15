const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../db');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
    const base = path.basename(file.originalname || 'img', ext).replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file) return cb(null, true);
    if (file.mimetype?.startsWith('image/')) return cb(null, true);
    return cb(new Error('Envie apenas imagens'));
  },
});

router.get('/relatos', async (_req, res) => {
  try {
    const { rows } = await pool.query( 
      `SELECT id, author, latitude, longitude, image_path, created_at
         FROM public.relatos
        ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar relatos:', err);
    return res.status(500).json({ message: 'Erro ao listar relatos' });
  }
});

function toNum(v) {
  if (v == null) return NaN;
  return parseFloat(String(v).trim().replace(',', '.'));
}

router.post('/relatos', upload.single('image'), async (req, res) => {
  try {
    const { author, latitude, longitude } = req.body;
    const lat = toNum(latitude);
    const lon = toNum(longitude);

    if (!author?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ message: 'Coordenadas inválidas.' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query( 
      `INSERT INTO public.relatos (author, latitude, longitude, image_path)
       VALUES ($1, $2, $3, $4)
       RETURNING id, author, latitude, longitude, image_path, created_at`,
      [author.trim(), lat, lon, imagePath]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar relato:', err);
    if (err.name === 'MulterError') {
      return res.status(400).json({ message: err.message || 'Falha no upload.' });
    }
    return res.status(500).json({ message: 'Erro ao salvar relato' });
  }
});

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
