// routes/contact.js
'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

const limiter = rateLimit({ windowMs: 60_000, max: 8, standardHeaders: true });

function isEmail(v='') { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

router.post('/contact', limiter, async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Preencha nome, e-mail e mensagem.' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, error: 'E-mail inválido.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.MAIL_TO || 'greensight2025@gmail.com';
    const from = process.env.MAIL_FROM || 'Green Sight <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Contato via site: ${name}`,
      html: `
        <div style="font-family:sans-serif">
          <p><b>Nome:</b> ${name}</p>
          <p><b>E-mail:</b> ${email}</p>
          <p><b>Mensagem:</b><br>${String(message).replace(/\n/g,'<br>')}</p>
        </div>
      `,
    });

    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('Erro /api/contact:', e);
    return res.status(500).json({ ok: false, error: 'Falha ao enviar. Tente novamente.' });
  }
});

module.exports = router;
