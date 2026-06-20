const RC_BASE = "https://api.anthropic.com/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { data, userName } = req.body || {};
  if (!data) return res.status(400).json({ error: "data required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  // Build summary stats from data
  const WDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const totalTasks = WDAYS.reduce((a, d) => a + (data.weekDays?.[d]?.tasks?.length || 0), 0);
  const doneTasks = WDAYS.reduce((a, d) => a + (data.weekDays?.[d]?.tasks?.filter(t => t.done).length || 0), 0);
  const kis = data.kis || [];
  const totalKILogs = kis.reduce((a, k) => a + Object.values(k.dailyLogs || {}).filter(v => v > 0).length, 0);
  const goals = data.yearlyGoals || [];
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;

  const prompt = `You are a supportive life coach. Generate a brief, warm, personalized weekly insights summary (3-4 sentences max) for ${userName || "the user"}.

Stats this week:
- Tasks: ${doneTasks}/${totalTasks} completed
- Habit logs: ${totalKILogs} across ${kis.length} Key Indicators
- Goals: ${goals.length} active goals, avg ${avgGoalProgress}% complete
- Goals list: ${goals.slice(0,3).map(g => g.title).join(", ")}

Write an encouraging, specific summary. Mention what went well, one area to focus on, and a motivating close. Keep it under 80 words. Friendly, not corporate.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = await r.json();
    const text = json.content?.[0]?.text || "Great week! Keep building momentum.";
    return res.status(200).json({ insight: text });
  } catch {
    return res.status(502).json({ error: "Failed to generate insights" });
  }
}
