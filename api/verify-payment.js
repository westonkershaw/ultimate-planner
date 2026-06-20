export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body || {};
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || !sessionId) return res.status(400).json({ error: 'Missing params' });

  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const session = await r.json();
    if (!r.ok) return res.status(400).json({ error: 'Session not found' });

    const paid = session.payment_status === 'paid';
    const email = session.customer_email || session.metadata?.email || '';
    return res.status(200).json({ paid, email, sessionId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
