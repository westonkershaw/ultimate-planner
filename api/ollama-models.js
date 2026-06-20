// GET /api/ollama-models — probe the configured Ollama URL and return available models
// Used by the Settings UI to validate the connection and show model choices.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ollamaUrl =
    process.env.OLLAMA_URL ||
    req.headers["x-ollama-url"] ||
    "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      return res.status(200).json({
        connected: false,
        error: `Ollama returned ${response.status}`,
        models: [],
        url: ollamaUrl,
      });
    }

    const data = await response.json();
    const models = (data.models || []).map((m) => m.name).sort();

    return res.status(200).json({
      connected: true,
      models,
      url: ollamaUrl,
      hasLlava: models.some((m) => m.startsWith("llava")),
      hasTextModel: models.some((m) =>
        ["llama3", "llama3.2", "llama3.1", "llama2", "mistral", "phi3", "gemma", "qwen", "deepseek"].some((k) =>
          m.startsWith(k)
        )
      ),
    });
  } catch (err) {
    const isTimeout = err.name === "TimeoutError";
    const isRefused = err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed");
    return res.status(200).json({
      connected: false,
      error: isTimeout
        ? "Connection timed out — Ollama may not be running or unreachable from the server"
        : isRefused
        ? "Connection refused — Ollama is not running at " + ollamaUrl
        : "Could not reach Ollama: " + err.message,
      models: [],
      url: ollamaUrl,
    });
  }
}
