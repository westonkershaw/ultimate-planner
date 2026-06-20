/**
 * OFX Direct Connect Proxy
 *
 * Stateless proxy that forwards OFX requests to bank servers.
 * Required because bank OFX endpoints don't support CORS.
 * Credentials pass through in-memory only — never logged or stored.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bankUrl, ofxBody } = req.body || {};

  if (!bankUrl || !ofxBody) {
    return res.status(400).json({ error: 'bankUrl and ofxBody are required' });
  }

  // SSRF protection: only allow HTTPS bank URLs
  if (!bankUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Bank URL must use HTTPS' });
  }

  try {
    const bankRes = await fetch(bankUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ofx',
        'Accept': 'application/ofx',
      },
      body: ofxBody,
    });

    const ofxData = await bankRes.text();

    if (!bankRes.ok) {
      return res.status(502).json({
        error: `Bank returned status ${bankRes.status}`,
      });
    }

    return res.status(200).json({ ofxData });
  } catch (err) {
    console.error('OFX proxy error:', err.message);
    return res.status(502).json({
      error: 'Failed to connect to bank. The bank may not support OFX Direct Connect or may be temporarily unavailable.',
    });
  }
}
