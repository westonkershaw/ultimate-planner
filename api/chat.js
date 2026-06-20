// ── Gemini helpers ─────────────────────────────────────────────────────────────

function toGeminiBody(body) {
  const rawMessages = body.messages || [];

  // Build contents: filter out empty parts and ensure valid alternation
  const contents = [];
  for (const msg of rawMessages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    let parts = [];

    if (typeof msg.content === 'string') {
      if (msg.content.trim()) parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'text' && c.text?.trim()) {
          parts.push({ text: c.text });
        } else if (c.type === 'image' && c.source?.data) {
          parts.push({
            inlineData: {
              mimeType: c.source.media_type || 'image/jpeg',
              data: c.source.data,
            },
          });
        }
      }
    }

    if (parts.length === 0) continue;

    // Gemini requires strict user/model alternation — merge consecutive same-role messages
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }

  // Gemini requires contents to start with 'user' and end with 'user'
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(start)' }] });
  }
  if (contents[contents.length - 1].role !== 'user') {
    contents.push({ role: 'user', parts: [{ text: '(continue)' }] });
  }

  const geminiBody = {
    contents,
    generationConfig: {
      maxOutputTokens: body.max_tokens || 1024,
      temperature: 0.7,
    },
  };

  if (body.system) {
    geminiBody.systemInstruction = { parts: [{ text: body.system }] };
  }

  return geminiBody;
}

function fromGeminiResponse(data, model) {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    id: 'gemini-' + Date.now(),
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: model || 'gemini-2.0-flash',
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

async function callGemini(geminiKey, geminiBody, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });
  const data = await response.json();
  return { response, data };
}

// ── Ollama helpers ─────────────────────────────────────────────────────────────

function toOllamaBody(body, overrideModel) {
  const messages = [];
  if (body.system) messages.push({ role: 'system', content: body.system });

  let hasImages = false;
  for (const msg of body.messages || []) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const textParts = msg.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      const imageParts = msg.content.filter((c) => c.type === 'image').map((c) => c.source?.data).filter(Boolean);
      if (imageParts.length) hasImages = true;
      messages.push({ role: msg.role, content: textParts, images: imageParts.length ? imageParts : undefined });
    }
  }

  const preferredTextModel = overrideModel || 'llama3';
  const ollamaModel = hasImages ? 'llava' : preferredTextModel;
  return { model: ollamaModel, messages, stream: false, options: { num_predict: body.max_tokens || 1024 } };
}

function fromOllamaResponse(data) {
  const text = data.message?.content || data.response || '';
  return {
    id: 'ollama-' + Date.now(),
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: data.model || 'ollama',
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

// ── Groq helpers ───────────────────────────────────────────────────────────────

async function callGroq(groqKey, body) {
  const messages = [];
  if (body.system) messages.push({ role: 'system', content: body.system });
  for (const msg of body.messages || []) {
    const content = typeof msg.content === 'string' ? msg.content :
      (msg.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    if (content.trim()) messages.push({ role: msg.role, content });
  }
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: body.max_tokens || 1024,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  return { response, data };
}

function fromGroqResponse(data) {
  const text = data.choices?.[0]?.message?.content || '';
  return {
    id: 'groq-' + Date.now(),
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'llama-3.3-70b-versatile',
    stop_reason: 'end_turn',
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY || req.headers['x-user-api-key'];
  const groqKey      = process.env.GROQ_API_KEY;
  const geminiKey    = process.env.GEMINI_API_KEY;
  const ollamaUrl    = process.env.OLLAMA_URL || req.headers['x-ollama-url'] || 'http://localhost:11434';
  const ollamaModel  = req.headers['x-ollama-model'] || null;
  const useOllama    = process.env.USE_OLLAMA === 'true' || req.headers['x-use-ollama'] === 'true';

  // ── 1. Anthropic (highest priority when key present) ──────────────────────
  if (anthropicKey && !useOllama) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': anthropicKey,
        },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    } catch (err) {
      console.error('Anthropic proxy error:', err);
      return res.status(500).json({ error: 'Proxy request failed' });
    }
  }

  // ── 2. Groq (free, fast Llama 3) ─────────────────────────────────────────
  if (groqKey && !useOllama) {
    try {
      const { response, data } = await callGroq(groqKey, req.body);
      if (!response.ok) {
        const msg = data.error?.message || response.statusText;
        return res.status(response.status).json({ error: `Groq error: ${msg}` });
      }
      return res.status(200).json(fromGroqResponse(data));
    } catch (err) {
      console.error('Groq error:', err);
      return res.status(502).json({ error: 'Groq request failed: ' + err.message });
    }
  }

  // ── 3. Gemini (free tier — tries 2.0-flash first, falls back to 1.5-flash) ──
  if (geminiKey && !useOllama) {
    const geminiBody = toGeminiBody(req.body);
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const { response, data } = await callGemini(geminiKey, geminiBody, model);
        if (!response.ok) {
          const msg = data.error?.message || response.statusText;
          lastError = `${model}: [${response.status}] ${msg}`;
          console.warn(`Gemini model ${model} failed: ${lastError}`);
          // Always try next model on any error
          continue;
        }
        return res.status(200).json(fromGeminiResponse(data, model));
      } catch (err) {
        lastError = `${model}: ${err.message}`;
        console.error(`Gemini ${model} error:`, err);
      }
    }

    return res.status(502).json({ error: `AI unavailable: ${lastError || 'All Gemini models failed'}` });
  }

  // ── 3. Ollama (local dev / explicit opt-in) ───────────────────────────────
  if (useOllama) {
    try {
      const ollamaBody = toOllamaBody(req.body, ollamaModel);
      const hasImages = (req.body.messages || []).some((m) =>
        Array.isArray(m.content) && m.content.some((c) => c.type === 'image')
      );
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaBody),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if (response.status === 404 || errText.includes('model') || errText.includes('not found')) {
          if (hasImages) {
            return res.status(400).json({ error: 'Ollama vision model not installed. Run: ollama pull llava' });
          }
          return res.status(400).json({ error: 'Ollama model not found. Run: ollama pull llama3' });
        }
        return res.status(response.status).json({ error: `Ollama error: ${errText || response.statusText}` });
      }
      const data = await response.json();
      return res.status(200).json(fromOllamaResponse(data));
    } catch (err) {
      console.error('Ollama proxy error:', err);
      return res.status(502).json({ error: 'Could not reach Ollama. Make sure it is running at ' + ollamaUrl });
    }
  }

  // ── No AI provider configured ─────────────────────────────────────────────
  return res.status(401).json({
    error: 'No AI provider configured. Add ANTHROPIC_API_KEY or GEMINI_API_KEY to your environment variables.',
  });
}
