function classifyError(status, data) {
  const message = (data && data.error && data.error.message) || "";
  const type = (data && data.error && data.error.type) || "";

  if (status === 400 && /credit balance/i.test(message)) {
    return {
      code: "insufficient_credits",
      message: "Out of API credits — add more at console.anthropic.com/settings/billing",
    };
  }
  if (status === 401 || type === "authentication_error") {
    return {
      code: "invalid_key",
      message: "The API key isn't valid. Check ANTHROPIC_API_KEY in your Vercel project settings.",
    };
  }
  if (status === 429 || type === "rate_limit_error") {
    return {
      code: "rate_limited",
      message: "Too many requests right now — wait a few seconds and try again.",
    };
  }
  if (status === 529 || type === "overloaded_error") {
    return {
      code: "overloaded",
      message: "Claude is overloaded right now. Try again in a moment.",
    };
  }
  if (status >= 500) {
    return {
      code: "server_error",
      message: "Claude's servers are having trouble right now. Try again shortly.",
    };
  }
  return {
    code: "unknown",
    message: message || "That request didn't go through. Try again.",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed", code: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Add it in your Vercel project's Environment Variables, then redeploy.",
      code: "missing_key",
    });
    return;
  }

  const { system, prompt, maxTokens } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt", code: "bad_request" });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: maxTokens || 1000,
        system: system || undefined,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicRes.json().catch(() => ({}));

    if (!anthropicRes.ok) {
      const classified = classifyError(anthropicRes.status, data);
      res.status(anthropicRes.status).json({ error: classified.message, code: classified.code });
      return;
    }

    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    res.status(200).json({ text });
  } catch (err) {
    res.status(502).json({
      error: "Couldn't reach Claude's servers. Try again shortly.",
      code: "upstream_unreachable",
    });
  }
}
