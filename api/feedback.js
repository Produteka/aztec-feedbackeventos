module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      // No rompe el deploy; solo te avisa en runtime si falta la env var
      return res.status(500).json({ error: 'Missing FEEDBACK_WEBHOOK_URL' });
    }

    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
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
