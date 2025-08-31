// /api/feedback.js
// En Vercel Functions (Node.js) con CommonJS
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'Missing FEEDBACK_WEBHOOK_URL' });
    }

    const body = req.body || {};
    const email = String(body.email || '').trim();
    const whatsappRaw = String(body.whatsapp || '').trim();

    // Validaciones servidor (por si alguien se salta el front)
    const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    if (!emailOk) return res.status(400).json({ error: 'Invalid email' });

    // Normalización básica E.164-like
    // Esperamos que venga con código (p.ej. +57), pero igual limpiamos
    let whatsapp = whatsappRaw.replace(/[^\d+]/g, ''); // deja + y dígitos
    if (!whatsapp.startsWith('+')) whatsapp = '+' + whatsapp;
    const onlyDigits = whatsapp.replace(/\D/g, '');
    if (onlyDigits.length < 8 || onlyDigits.length > 15) {
      return res.status(400).json({ error: 'Invalid WhatsApp number' });
    }

    const payload = {
      email,
      whatsapp,
      utm: body.utm || {},          // { utm_source, utm_medium, ... }
      timestamp: body.timestamp || new Date().toISOString(),
      event: body.event || null,
      userAgent: req.headers['user-agent'] || '',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    };

    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ error: 'Upstream error', detail: text });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
};
