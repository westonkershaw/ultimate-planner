export default async function handler(req, res) {
  const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const PLAID_SECRET = process.env.PLAID_SECRET;
  const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
  const BASE = `https://${PLAID_ENV}.plaid.com`;

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return res.status(500).json({ error: 'Plaid credentials not configured' });
  }

  const { action } = req.body || {};

  if (action === 'create_link_token') {
    const r = await fetch(`${BASE}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        client_name: 'Ultimate Planner',
        country_codes: ['US'],
        language: 'en',
        user: { client_user_id: req.body.userId || 'user-default' },
        products: ['transactions'],
      }),
    });
    const json = await r.json();
    return res.status(r.ok ? 200 : 502).json(json);
  }

  if (action === 'exchange_token') {
    const r = await fetch(`${BASE}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: req.body.publicToken,
      }),
    });
    const json = await r.json();
    return res.status(r.ok ? 200 : 502).json(json);
  }

  if (action === 'get_transactions') {
    const today = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const r = await fetch(`${BASE}/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: req.body.accessToken,
        start_date: start,
        end_date: today,
        options: { count: 100 },
      }),
    });
    const json = await r.json();
    if (!r.ok) return res.status(502).json(json);
    // Map Plaid transactions to our format
    const txs = (json.transactions || []).map(t => ({
      id: t.transaction_id,
      date: t.date,
      name: t.merchant_name || t.name,
      amount: Math.abs(t.amount),
      category: mapPlaidCategory(t.personal_finance_category?.primary || t.category?.[0] || 'other'),
      type: t.amount > 0 ? 'expense' : 'income',
      source: 'plaid',
    }));
    return res.status(200).json({ transactions: txs, accounts: json.accounts || [] });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

function mapPlaidCategory(cat) {
  const map = {
    FOOD_AND_DRINK: 'food', FOOD: 'food',
    TRANSPORTATION: 'transport', TRAVEL: 'transport',
    SHOPS: 'shopping', SHOPPING: 'shopping',
    ENTERTAINMENT: 'entertainment',
    HEALTHCARE: 'health',
    RENT_AND_UTILITIES: 'utilities', UTILITIES: 'utilities',
    INCOME: 'income', TRANSFER_IN: 'income',
  };
  return map[cat?.toUpperCase()] || 'other';
}
