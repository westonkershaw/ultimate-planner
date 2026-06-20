// Vercel serverless function — proxies fueleconomy.gov REST API + route calculation
// No API key needed. Caches at edge for 1 hour.
// Endpoints:
//   ?action=years
//   ?action=makes&year=YYYY
//   ?action=models&year=YYYY&make=XXXX
//   ?action=options&year=YYYY&make=XXXX&model=ZZZZ
//   ?action=vehicle&id=12345
//   ?action=prices
//   ?action=route&from=City,ST&to=City,ST

const BASE = 'https://www.fueleconomy.gov/ws/rest';

const ACTIONS = {
  years:   () => `${BASE}/vehicle/menu/year`,
  makes:   (q) => `${BASE}/vehicle/menu/make?year=${enc(q.year)}`,
  models:  (q) => `${BASE}/vehicle/menu/model?year=${enc(q.year)}&make=${enc(q.make)}`,
  options: (q) => `${BASE}/vehicle/menu/options?year=${enc(q.year)}&make=${enc(q.make)}&model=${enc(q.model)}`,
  vehicle: (q) => `${BASE}/vehicle/${enc(q.id)}`,
  prices:  () => `${BASE}/fuelprices`,
};

function enc(val) {
  return encodeURIComponent(val || '');
}

function parseMenuXml(xml) {
  const items = [];
  const re = /<menuItem>\s*<text>([^<]*)<\/text>\s*<value>([^<]*)<\/value>\s*<\/menuItem>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    items.push({ text: m[1].trim(), value: m[2].trim() });
  }
  return items;
}

function parseVehicleXml(xml) {
  const tag = (name) => {
    const r = new RegExp(`<${name}>([^<]*)</${name}>`);
    const match = r.exec(xml);
    return match ? match[1].trim() : '';
  };
  const num = (name) => parseFloat(tag(name)) || 0;

  return {
    id: tag('id'),
    year: tag('year'),
    make: tag('make'),
    model: tag('model'),
    cityMpg: num('city08'),
    highwayMpg: num('highway08'),
    combinedMpg: num('comb08'),
    fuelType: tag('fuelType1') || tag('fuelType'),
    cylinders: num('cylinders'),
    displacement: num('displ'),
    transmission: tag('trany'),
    drive: tag('drive'),
    vehicleClass: tag('VClass'),
    annualFuelCost: num('fuelCost08'),
    co2Gpm: num('co2TailpipeGpm'),
  };
}

function parsePricesXml(xml) {
  const num = (name) => {
    const r = new RegExp(`<${name}>([^<]*)</${name}>`);
    const m = r.exec(xml);
    return m ? parseFloat(m[1]) || 0 : 0;
  };
  return {
    regular: num('regular'),
    midgrade: num('midgrade'),
    premium: num('premium'),
    diesel: num('diesel'),
    e85: num('e85'),
    electric: num('electric'),
  };
}

// ── Route calculation (Nominatim + OSRM) ──────────────────────────────────

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const GEO_HEADERS = { 'User-Agent': 'UltimatePlanner/1.0', Accept: 'application/json' };

async function geocode(query) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const r = await fetch(url, { headers: GEO_HEADERS });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name };
}

async function calcRoute(from, to) {
  const url = `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const r = await fetch(url, { headers: GEO_HEADERS });
  if (!r.ok) return null;
  const data = await r.json();
  if (data.code !== 'Ok' || !data.routes?.length) return null;
  return { distanceMeters: data.routes[0].distance, durationSeconds: data.routes[0].duration };
}

async function handleRoute(req, res) {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Both "from" and "to" are required' });

  const [fromGeo, toGeo] = await Promise.all([geocode(from), geocode(to)]);
  if (!fromGeo) return res.status(404).json({ error: `Could not find: ${from}` });
  if (!toGeo) return res.status(404).json({ error: `Could not find: ${to}` });

  const route = await calcRoute(fromGeo, toGeo);
  if (!route) return res.status(404).json({ error: 'Could not calculate driving route' });

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({
    from: fromGeo, to: toGeo,
    distanceMiles: Math.round((route.distanceMeters / 1609.344) * 10) / 10,
    durationHours: Math.round((route.durationSeconds / 3600) * 10) / 10,
  });
}

// ── Main handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { action } = req.query;

  if (action === 'route') return handleRoute(req, res);

  if (!action || !ACTIONS[action]) {
    return res.status(400).json({ error: `Invalid action. Valid: ${[...Object.keys(ACTIONS), 'route'].join(', ')}` });
  }

  // Validate required params
  if (action === 'makes' && !req.query.year) {
    return res.status(400).json({ error: 'year is required' });
  }
  if (action === 'models' && (!req.query.year || !req.query.make)) {
    return res.status(400).json({ error: 'year and make are required' });
  }
  if (action === 'options' && (!req.query.year || !req.query.make || !req.query.model)) {
    return res.status(400).json({ error: 'year, make, and model are required' });
  }
  if (action === 'vehicle' && !req.query.id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const url = ACTIONS[action](req.query);

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/xml' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error' });
    }

    const xml = await upstream.text();

    let data;
    if (action === 'vehicle') {
      data = parseVehicleXml(xml);
    } else if (action === 'prices') {
      data = parsePricesXml(xml);
    } else {
      data = parseMenuXml(xml);
    }

    // Cache at edge for 1 hour, stale-while-revalidate for 1 day
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
