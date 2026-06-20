export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured' });

  const { billing, email } = req.body || {};

  // Price in cents — matches PricingModal displayed prices
  const amounts = {
    monthly: 499,   // $4.99/mo
    yearly: 4999,   // $49.99/yr
    lifetime: 7900, // $79 one-time
  };

  const amount = amounts[billing] || amounts.monthly;
  const isRecurring = billing !== 'lifetime';

  const origin = req.headers.origin || 'https://ultimate-planner-alpha.vercel.app';

  try {
    const body = {
      // Omitting payment_method_types lets Stripe auto-select all available methods
      // (card, Apple Pay, Google Pay, Link, etc.) based on the customer's browser/device
      mode: isRecurring ? 'subscription' : 'payment',
      customer_email: email || undefined,
      success_url: `${origin}/?pro=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?pro=cancelled`,
      metadata: { email: email || '' },
    };

    if (isRecurring) {
      body.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Ultimate Planner Pro', description: 'All Pro features unlocked' },
          unit_amount: amount,
          recurring: { interval: billing === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      }];
    } else {
      body.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Ultimate Planner Pro — Lifetime', description: 'Pay once, own forever' },
          unit_amount: amount,
        },
        quantity: 1,
      }];
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(flattenForStripe(body)).toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) return res.status(400).json({ error: session.error?.message || 'Stripe error' });
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function flattenForStripe(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenForStripe(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenForStripe(item, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = String(item);
        }
      });
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}
