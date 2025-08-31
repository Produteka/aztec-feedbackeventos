// /api/feedback.js
// Función serverless CommonJS (Vercel/Node)

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
    const automationIdeas = String(body.automationIdeas || '').trim();
    const utm = body.utm || {};

    // Validaciones servidor (antibypass del front)
    const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    if (!emailOk) return res.status(400).json({ error: 'Invalid email' });

    // Normalización básica E.164-like (permitimos + y dígitos, longitud total 8-15)
    let whatsapp = whatsappRaw.replace(/[^\d+]/g, '');
    if (!whatsapp.startsWith('+')) whatsapp = '+' + whatsapp;
    const onlyDigits = whatsapp.replace(/\D/g, '');
    if (onlyDigits.length < 8 || onlyDigits.length > 15) {
      return res.status(400).json({ error: 'Invalid WhatsApp number' });
    }

    // Por si no vino utm_source, forzamos "website"
    if (!utm.utm_source) utm.utm_source = 'website';

    const payload = {
      email,
      whatsapp,
      automationIdeas,
      utm,
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
