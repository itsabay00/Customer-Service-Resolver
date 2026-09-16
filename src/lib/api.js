export async function callClaude({ system, messages, maxTokens }) {
  let response;
  try {
    response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, maxTokens: maxTokens || 1000 }),
    });
  } catch (networkErr) {
    const err = new Error("Can't reach the server — check your internet connection and try again.");
    err.code = "network";
    throw err;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status}). Try again.`);
    err.code = data.code || "unknown";
    throw err;
  }
  if (!data.text) {
    const err = new Error("Got an empty response. Try again.");
    err.code = "empty";
    throw err;
  }
  return data.text;
}

export function buildCaseSystemPrompt(message, extraContext, relevantKb) {
  const kbBlock = relevantKb.length
    ? relevantKb.map((e) => `Title: ${e.title}\nAnswer: ${e.content}`).join("\n\n---\n\n")
    : "(the advisor hasn't added any knowledge-base entries yet)";
  return `You are the assistant inside "Resolve," embedded in a customer service tool. You're helping an advisor work one specific customer case, in an ongoing chat.

The case:
Customer's message: ${message}
Extra context from the advisor: ${extraContext && extraContext.trim() ? extraContext : "(none provided)"}

Knowledge-base entries that may be relevant:
${kbBlock}

Ground any reply you draft in these knowledge-base entries when relevant. Never invent policies, refund amounts, timelines, or commitments the knowledge base or the customer's message doesn't support — say so plainly if nothing applies. When asked to draft or redraft a reply, write a complete, ready-to-send reply in a warm, professional customer-service voice. When asked a question, answer it directly and concisely. This is a working tool inside a live chat, not a companion — keep responses focused and useful, not chatty.`;
}

export function buildOpeningUserMessage() {
  return `A new case just came in. Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"category": "a short 2-4 word issue category", "urgency": "Low, Medium, or High", "sentiment": "Positive, Neutral, Frustrated, or Angry", "message": "a natural reply to show the advisor in chat: briefly note the category/urgency/sentiment in a sentence, then give a complete draft reply, warm and professional, roughly 80-160 words"}`;
}

export function parseOpening(raw) {
  const text = (raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const jsonStr = start !== -1 && end !== -1 && end > start ? text.slice(start, end + 1) : text;
  try {
    const obj = JSON.parse(jsonStr);
    return {
      category: typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : "General inquiry",
      urgency: ["Low", "Medium", "High"].includes(obj.urgency) ? obj.urgency : "Medium",
      sentiment: ["Positive", "Neutral", "Frustrated", "Angry"].includes(obj.sentiment) ? obj.sentiment : "Neutral",
      message: typeof obj.message === "string" && obj.message.trim() ? obj.message.trim() : text,
    };
  } catch (err) {
    return { category: "General inquiry", urgency: "Medium", sentiment: "Neutral", message: text };
  }
}
