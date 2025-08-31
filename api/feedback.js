// api/feedback.js (CommonJS)
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

    // --- Validaciones mínimas ---
    const email = String(body.email || '').trim();
    const whatsappRaw = String(body.whatsapp || '').trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!whatsappRaw) return res.status(400).json({ error: 'WhatsApp is required' });

    // Normalización básica a E.164 (si no incluye +, puedes setear por defecto +57)
    const defaultCountryCode = '+57'; // cambia si quieres otro por defecto
    let whatsapp = whatsappRaw.replace(/[^\d+]/g, ''); // deja solo dígitos y '+'
    if (!whatsapp.startsWith('+')) whatsapp = defaultCountryCode + whatsapp;

    // Construimos payload final hacia el webhook
    const payload = {
      email,
      whatsapp,
      utm: body.utm || {},
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
