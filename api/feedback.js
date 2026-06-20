export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, message, email, userAgent, timestamp } = req.body || {};

    // Validate type
    const validTypes = ['Bug', 'Idea', 'Other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type. Must be Bug, Idea, or Other.' });
    }

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message must be 2000 characters or fewer.' });
    }

    // Validate email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
    }

    const feedback = {
      type,
      message: message.trim(),
      email: (email && typeof email === 'string' && email.trim()) ? email.trim() : null,
      user_agent: userAgent || null,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Log to Vercel function logs regardless
    console.log('[feedback]', JSON.stringify(feedback));

    let emailSent = false;

    // Send email via Resend if configured
    const resendKey = process.env.RESEND_API_KEY;
    const feedbackEmail = process.env.FEEDBACK_EMAIL;

    if (resendKey && feedbackEmail) {
      try {
        const typeEmoji = feedback.type === 'Bug' ? '🐛' : feedback.type === 'Idea' ? '💡' : '💬';
        const replyTo = feedback.email || undefined;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Ultimate Planner <feedback@resend.dev>',
            to: [feedbackEmail],
            reply_to: replyTo,
            subject: `${typeEmoji} [${feedback.type}] New Feedback — Ultimate Planner`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <h2 style="margin:0 0 4px;color:#1e293b;">${typeEmoji} ${feedback.type} Feedback</h2>
                <p style="margin:0 0 20px;color:#64748b;font-size:13px;">${feedback.timestamp}</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                  <p style="margin:0;color:#334155;font-size:15px;line-height:1.65;white-space:pre-wrap;">${feedback.message}</p>
                </div>
                ${feedback.email ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;"><strong>Reply to:</strong> <a href="mailto:${feedback.email}">${feedback.email}</a></p>` : '<p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">No reply email provided</p>'}
                <p style="margin:0;font-size:11px;color:#94a3b8;">User-Agent: ${feedback.user_agent || 'Unknown'}</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error('[feedback] Resend email failed:', emailRes.status, errText);
        } else {
          emailSent = true;
          console.log('[feedback] Email sent via Resend');
        }
      } catch (emailErr) {
        console.error('[feedback] Resend error:', emailErr.message);
      }
    }

    // Try webhook if configured
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedback),
        });
      } catch (webhookErr) {
        console.error('[feedback] Webhook failed:', webhookErr.message);
      }
    }

    // Try Supabase if configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabaseRes = await fetch(`${supabaseUrl}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(feedback),
      });

      if (!supabaseRes.ok) {
        const text = await supabaseRes.text();
        console.error('[feedback] Supabase insert failed:', supabaseRes.status, text);
      }
    }

    return res.status(200).json({ ok: true, emailSent });
  } catch (err) {
    console.error('[feedback] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
