const RC_BASE = "https://api.revenuecat.com/v1";

export default async function handler(req, res) {
  const apiKey = process.env.REVENUECAT_SECRET_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RevenueCat secret key not configured" });
  }

  const { method, query, body } = req;

  // GET /api/revenuecat?userId=xxx — fetch customer info & check entitlements
  if (method === "GET") {
    const { userId } = query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    try {
      const r = await fetch(`${RC_BASE}/subscribers/${encodeURIComponent(userId)}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Platform": "web",
        },
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);

      const entitlements = data.subscriber?.entitlements || {};
      const isPro = Object.values(entitlements).some(
        (e) => e.expires_date === null || new Date(e.expires_date) > new Date()
      );
      return res.status(200).json({ isPro, entitlements, subscriber: data.subscriber });
    } catch {
      return res.status(502).json({ error: "Failed to reach RevenueCat" });
    }
  }

  // POST /api/revenuecat — grant entitlement after successful web purchase
  // RevenueCat's web SDK handles purchase + webhook, this just verifies
  if (method === "POST") {
    const { userId, action } = body || {};
    if (!userId) return res.status(400).json({ error: "userId required" });

    if (action === "verify") {
      try {
        const r = await fetch(`${RC_BASE}/subscribers/${encodeURIComponent(userId)}`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Platform": "web",
          },
        });
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);

        const entitlements = data.subscriber?.entitlements || {};
        const isPro = Object.values(entitlements).some(
          (e) => e.expires_date === null || new Date(e.expires_date) > new Date()
        );
        return res.status(200).json({ isPro, subscriber: data.subscriber });
      } catch {
        return res.status(502).json({ error: "Failed to reach RevenueCat" });
      }
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
