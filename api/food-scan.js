const NUTRIENT = {
  calories: 1008,
  protein:  1003,
  carbs:    1005,
  fat:      1004,
  fiber:    1079,
};

function extractNutrient(nutrients, id) {
  const found = nutrients.find(n => n.nutrientId === id);
  return found ? Math.round(found.value) : '';
}

async function usdaLookup(query, usdaKey) {
  // Search all food types — no dataType filter so we get the best match regardless of source
  const res = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&sortBy=score&api_key=${usdaKey}`
  );
  const data = await res.json();
  const foods = data?.foods || [];

  // Pick the first food that actually has calorie data
  const withCals = foods.filter(f => {
    const nuts = f.foodNutrients || [];
    return nuts.some(n => n.nutrientId === NUTRIENT.calories && n.value > 0);
  });
  const ranked = withCals.length ? withCals : foods;

  return ranked.slice(0, 3).map(food => {
    const nutrients = food.foodNutrients || [];
    const calories = extractNutrient(nutrients, NUTRIENT.calories);
    return {
      fdcId:    food.fdcId,
      name:     food.description,
      serving:  food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
      calories,
      protein:  extractNutrient(nutrients, NUTRIENT.protein),
      carbs:    extractNutrient(nutrients, NUTRIENT.carbs),
      fat:      extractNutrient(nutrients, NUTRIENT.fat),
      fiber:    extractNutrient(nutrients, NUTRIENT.fiber),
    };
  });
}

// Use Gemini Flash to identify food from image — free, reliable vision
async function identifyWithGemini(imageBase64, geminiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            { text: 'What food is shown in this image? Reply with only the food name (1-4 words, no punctuation, no explanation). Examples: kiwi fruit, grilled chicken breast, bowl of oatmeal.' },
          ],
        }],
        generationConfig: { maxOutputTokens: 32, temperature: 0.1 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini vision failed');
  const name = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  return name || null;
}

// Fallback: Clarifai food model
async function identifyWithClarifai(imageBase64, clarifaiKey) {
  const res = await fetch(
    'https://api.clarifai.com/v2/users/clarifai/apps/main/models/food-item-recognition/versions/dde27cf6d67048f3b8ad62672c282c0c/outputs',
    {
      method: 'POST',
      headers: { 'Authorization': `Key ${clarifaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: [{ data: { image: { base64: imageBase64 } } }] }),
    }
  );
  const data = await res.json();
  const concepts = data?.outputs?.[0]?.data?.concepts || [];
  return concepts.slice(0, 3).map(c => c.name);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, foodName } = req.body || {};
  const usdaKey     = process.env.USDA_API_KEY;
  const geminiKey   = process.env.GEMINI_API_KEY;
  const clarifaiKey = process.env.CLARIFAI_PAT;

  if (!usdaKey) return res.status(500).json({ error: 'USDA_API_KEY not configured' });

  // --- Direct text search (no image) ---
  if (foodName && !imageBase64) {
    try {
      const results = await usdaLookup(foodName, usdaKey);
      if (!results.length) return res.status(200).json({ foodNames: [foodName], alternatives: [], ...emptyMacros(foodName) });
      const [top, ...rest] = results;
      return res.status(200).json({ foodNames: [top.name], alternatives: rest, ...top });
    } catch (err) {
      return res.status(502).json({ error: 'USDA lookup failed', detail: err.message });
    }
  }

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 or foodName required' });

  // --- Image scan ---
  let detectedName = null;
  let foodNames = [];

  // Primary: Gemini Flash vision (free, excellent accuracy)
  if (geminiKey) {
    try {
      detectedName = await identifyWithGemini(imageBase64, geminiKey);
      if (detectedName) foodNames = [detectedName];
    } catch (err) {
      console.error('Gemini vision error:', err.message);
    }
  }

  // Fallback: Clarifai (if Claude unavailable or failed)
  if (!foodNames.length && clarifaiKey) {
    try {
      foodNames = await identifyWithClarifai(imageBase64, clarifaiKey);
      detectedName = foodNames[0] || null;
    } catch (err) {
      console.error('Clarifai error:', err.message);
    }
  }

  if (!detectedName || !foodNames.length) {
    return res.status(200).json({ foodNames: [], notRecognized: true, alternatives: [], ...emptyMacros('') });
  }

  // USDA lookup for top result + alternatives from other detected names
  try {
    const allResults = await Promise.all(
      foodNames.slice(0, 3).map(name => usdaLookup(name, usdaKey))
    );

    const primary = allResults[0];
    if (!primary?.length) {
      return res.status(200).json({ foodNames, alternatives: [], ...emptyMacros(detectedName) });
    }

    const [top, ...primaryRest] = primary;
    const alternatives = [
      ...primaryRest,
      ...allResults.slice(1).map(r => r[0]).filter(Boolean),
    ].slice(0, 4);

    return res.status(200).json({ foodNames, alternatives, ...top });
  } catch {
    return res.status(200).json({ foodNames, alternatives: [], ...emptyMacros(detectedName) });
  }
}

function emptyMacros(name) {
  return { name: name || '', serving: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' };
}
