// Vercel serverless function — proxies USDA FoodData Central search
// Free API key: https://fdc.nal.usda.gov/api-key-signup.html
// Falls back to DEMO_KEY (30 req/hr/IP) if no env var set

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=10&api_key=${apiKey}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }
    const data = await upstream.json();

    const foods = (data.foods || []).map((f) => {
      const nuts = {};
      (f.foodNutrients || []).forEach((n) => { nuts[n.nutrientName] = n.value; });
      return {
        name: f.description + (f.brandOwner ? ` (${f.brandOwner})` : ''),
        calories: Math.round(nuts['Energy'] || 0),
        protein: Math.round((nuts['Protein'] || 0) * 10) / 10,
        carbs: Math.round((nuts['Carbohydrate, by difference'] || 0) * 10) / 10,
        fat: Math.round((nuts['Total lipid (fat)'] || 0) * 10) / 10,
        per100g: true,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300'); // cache 5 min at edge
    return res.status(200).json({ foods });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
