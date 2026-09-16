import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Copy,
  Check,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Design tokens (ABAY's house design language)                            */
/* ---------------------------------------------------------------------- */

const colors = {
  bg: "#F5F5F5",
  black: "#000000",
  ink: "#171717",
  gray: "#818181",
  redTint: "#FEECEB",
  red: "#FF4745",
  yellowTint: "#FFF9E7",
  yellow: "#FEC008",
  greenTint: "#E4F9EE",
  green: "#00BE52",
  blueTint: "#E8F6FF",
  blue: "#1897FF",
};

const SHADOW = "0 4px 20px rgba(0, 0, 0, 0.06)";

const KB_KEY = "resolve-kb-entries";
const HISTORY_KEY = "resolve-case-history";

const URGENCY_STYLES = {
  Low: { tint: colors.greenTint, dot: colors.green },
  Medium: { tint: colors.yellowTint, dot: colors.yellow },
  High: { tint: colors.redTint, dot: colors.red },
};

const SENTIMENT_STYLES = {
  Positive: { tint: colors.greenTint, dot: colors.green },
  Neutral: { tint: "#EDEDED", dot: colors.gray },
  Frustrated: { tint: colors.yellowTint, dot: colors.yellow },
  Angry: { tint: colors.redTint, dot: colors.red },
};

/* ---------------------------------------------------------------------- */
/* Local persistence (per-browser)                                         */
/* ---------------------------------------------------------------------- */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Failed to save", key, err);
  }
}

/* ---------------------------------------------------------------------- */
/* Knowledge-base relevance matching (lightweight, local, no dependency)   */
/* ---------------------------------------------------------------------- */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",
  "was", "were", "i", "you", "my", "your", "it", "this", "that", "with",
  "have", "has", "not", "be", "as", "at", "from", "but", "if", "so", "we",
  "us", "our", "me", "he", "she", "they", "them", "will", "would", "can",
  "could", "do", "does", "did", "been", "being", "there", "what", "when",
  "where", "how", "just", "about",
]);

function tokenize(str) {
  const matches = (str || "").toLowerCase().match(/[a-z0-9']+/g);
  return (matches || []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function scoreEntry(queryTokens, entry) {
  const entryTokens = tokenize(`${entry.title} ${entry.content}`);
  let score = 0;
  for (const t of entryTokens) {
    if (queryTokens.has(t)) score += 1;
  }
  return score;
}

function getRelevantKb(message, extraContext, kbEntries, topN) {
  if (kbEntries.length <= topN) return kbEntries;
  const queryTokens = new Set(tokenize(`${message} ${extraContext || ""}`));
  return kbEntries
    .map((entry) => ({ entry, score: scoreEntry(queryTokens, entry) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((x) => x.entry);
}

/* ---------------------------------------------------------------------- */
/* Calls to our own /api/claude serverless function                       */
/* ---------------------------------------------------------------------- */

const ANALYZE_SYSTEM = `You are the assistant inside "Resolve," a tool customer service advisors use to handle customer messages. Given a customer's message, optional context from the advisor, and the advisor's own knowledge-base entries, help the advisor understand the issue and reply well.

Ground the reply in the provided knowledge-base entries whenever one applies. Do not invent policies, refund amounts, timelines, or commitments that aren't supported by the knowledge base or the message itself. If nothing in the knowledge base applies, write a reasonable, honest, general reply and leave matchedKbTitles empty.

Respond with ONLY a JSON object - no markdown code fences, no explanation before or after - in exactly this shape:
{"category": "a short 2-4 word issue category", "urgency": "Low, Medium, or High", "sentiment": "Positive, Neutral, Frustrated, or Angry", "summary": "one plain sentence describing what the customer actually needs", "matchedKbTitles": ["exact titles of knowledge-base entries you used, or an empty array"], "draftResponse": "a complete, ready-to-send reply in a warm, professional customer-service voice, roughly 80-160 words"}`;

const TONE_SYSTEM = `You help a customer service advisor revise a draft reply to a customer. Rewrite the draft in the requested style while keeping every fact, number, and commitment exactly the same. Reply with only the revised text - no quotation marks, no labels, no commentary.`;

function buildAnalyzeUserPrompt(message, extraContext, relevantKb) {
  const kbBlock = relevantKb.length
    ? relevantKb.map((e) => `Title: ${e.title}\nAnswer: ${e.content}`).join("\n\n---\n\n")
    : "(the advisor hasn't added any knowledge-base entries yet)";
  return [
    `Customer's message:\n${message}`,
    `Additional context from the advisor:\n${extraContext && extraContext.trim() ? extraContext : "(none provided)"}`,
    `Knowledge-base entries available:\n${kbBlock}`,
  ].join("\n\n");
}

async function callClaude({ system, prompt, maxTokens }) {
  let response;
  try {
    response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, prompt, maxTokens: maxTokens || 1000 }),
    });
  } catch (networkErr) {
    // The request never reached our server at all — this is the one case that
    // actually means "bad internet", so it's the only place we say that.
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

function parseAnalysis(raw) {
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
      summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
      matchedKbTitles: Array.isArray(obj.matchedKbTitles) ? obj.matchedKbTitles.filter((t) => typeof t === "string") : [],
      draftResponse: typeof obj.draftResponse === "string" && obj.draftResponse.trim() ? obj.draftResponse.trim() : text,
    };
  } catch (err) {
    return {
      category: "General inquiry",
      urgency: "Medium",
      sentiment: "Neutral",
      summary: "",
      matchedKbTitles: [],
      draftResponse: text,
    };
  }
}

async function fetchToneRevision(customerMessage, currentDraft, toneInstruction) {
  const prompt = `Customer's message:\n${customerMessage}\n\nCurrent draft reply:\n${currentDraft}\n\nRewrite the draft to be ${toneInstruction}, keeping every fact and commitment the same. Keep it a complete, ready-to-send reply. Reply with only the revised text.`;
  const raw = await callClaude({ system: TONE_SYSTEM, prompt, maxTokens: 1000 });
  return raw.trim().replace(/^["']+|["']+$/g, "");
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? `${str.slice(0, n).trim()}…` : str;
}

/* ---------------------------------------------------------------------- */
/* Small presentational components                                        */
/* ---------------------------------------------------------------------- */

function StatusPill({ label, tint, dot }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: tint, color: "#171717" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}

function Tag({ label }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.blueTint, color: "#171717" }}
    >
      {label}
    </span>
  );
}

function GhostButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rsv-btn-ghost inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function IconButton({ children, onClick, danger }) {
  return (
    <button onClick={onClick} className="p-2 rounded-full rsv-icon-btn" style={{ color: danger ? colors.red : colors.gray }}>
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: colors.blueTint }}>
        <Icon className="w-6 h-6" style={{ color: colors.blue }} />
      </div>
      <h3 className="text-sm font-semibold" style={{ color: "#000" }}>{title}</h3>
      <p className="text-sm mt-1 max-w-xs" style={{ color: colors.gray }}>{description}</p>
      {action && (
        <button onClick={action.onClick} className="rsv-btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
          <Plus className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-4 mt-4" style={{ backgroundColor: colors.redTint }}>
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.red }} />
      <div className="flex-1">
        <p className="text-sm" style={{ color: "#171717" }}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm font-semibold mt-1" style={{ color: colors.red }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function KbEntryForm({ initialTitle, initialContent, onSave, onCancel, saveLabel = "Save entry" }) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(initialContent || "");
  const canSave = title.trim() && content.trim();

  return (
    <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: "#fff", boxShadow: SHADOW, border: `1px solid ${colors.blueTint}` }}>
      <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Refund policy for digital goods"
        className="w-full rounded-xl p-3 text-sm rsv-input mb-4"
      />
      <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>Answer or policy</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="What should the advisor say or do?"
        className="w-full rounded-xl p-3 text-sm resize-none rsv-input"
      />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="rsv-btn-ghost px-4 py-2 rounded-full text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ title: title.trim(), content: content.trim() })}
          disabled={!canSave}
          className="rsv-btn-primary px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main app                                                                */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [tab, setTab] = useState("case");

  const [kb, setKb] = useState(() => loadJSON(KB_KEY, []));
  const [history, setHistory] = useState(() => loadJSON(HISTORY_KEY, []));

  const [customerMessage, setCustomerMessage] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [draftReply, setDraftReply] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [toneLoading, setToneLoading] = useState(null);
  const [toneError, setToneError] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedKbTitle, setExpandedKbTitle] = useState(null);
  const [showSaveKbForm, setShowSaveKbForm] = useState(false);

  const [kbSearch, setKbSearch] = useState("");
  const [kbFormOpen, setKbFormOpen] = useState(false);
  const [kbEditingId, setKbEditingId] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const draftRef = useRef(null);

  function updateKb(newKb) {
    setKb(newKb);
    saveJSON(KB_KEY, newKb);
  }

  function updateHistory(newHistory) {
    setHistory(newHistory);
    saveJSON(HISTORY_KEY, newHistory);
  }

  async function handleAnalyze() {
    if (!customerMessage.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    try {
      const relevant = getRelevantKb(customerMessage, extraContext, kb, 10);
      const prompt = buildAnalyzeUserPrompt(customerMessage, extraContext, relevant);
      const raw = await callClaude({ system: ANALYZE_SYSTEM, prompt, maxTokens: 1000 });
      const parsed = parseAnalysis(raw);
      setAnalysis(parsed);
      setDraftReply(parsed.draftResponse);
      setShowSaveKbForm(false);
      setExpandedKbTitle(null);

      const entry = {
        id: `case-${Date.now()}`,
        message: customerMessage,
        context: extraContext,
        ...parsed,
        createdAt: new Date().toISOString(),
      };
      updateHistory([entry, ...history].slice(0, 30));
    } catch (err) {
      console.error(err);
      setAnalyzeError(err.message || "Something went wrong. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runTone(label, instruction) {
    if (toneLoading) return;
    setToneLoading(label);
    setToneError("");
    try {
      const revised = await fetchToneRevision(customerMessage, draftReply, instruction);
      setDraftReply(revised);
    } catch (err) {
      console.error(err);
      setToneError(err.message || "Something went wrong. Try again.");
    } finally {
      setToneLoading(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draftReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (draftRef.current) {
        draftRef.current.focus();
        draftRef.current.select();
      }
    }
  }

  function handleSaveKbFromCase(data) {
    updateKb([{ id: `kb-${Date.now()}`, ...data, createdAt: new Date().toISOString() }, ...kb]);
    setShowSaveKbForm(false);
  }

  function loadFromHistory(h) {
    setCustomerMessage(h.message);
    setExtraContext(h.context || "");
    setAnalysis({
      category: h.category,
      urgency: h.urgency,
      sentiment: h.sentiment,
      summary: h.summary,
      matchedKbTitles: h.matchedKbTitles || [],
      draftResponse: h.draftResponse,
    });
    setDraftReply(h.draftResponse);
    setAnalyzeError("");
    setShowSaveKbForm(false);
    setExpandedKbTitle(null);
  }

  function openNewKbForm() {
    setKbEditingId(null);
    setKbFormOpen(true);
  }

  function startEditKb(id) {
    setKbEditingId(id);
    setKbFormOpen(true);
  }

  function closeKbForm() {
    setKbFormOpen(false);
    setKbEditingId(null);
  }

  function handleKbFormSave(data) {
    if (kbEditingId) {
      updateKb(kb.map((e) => (e.id === kbEditingId ? { ...e, ...data } : e)));
    } else {
      updateKb([{ id: `kb-${Date.now()}`, ...data, createdAt: new Date().toISOString() }, ...kb]);
    }
    closeKbForm();
  }

  function handleDeleteKb(id) {
    updateKb(kb.filter((e) => e.id !== id));
  }

  function handleReset() {
    updateKb([]);
    updateHistory([]);
    setCustomerMessage("");
    setExtraContext("");
    setAnalysis(null);
    setDraftReply("");
    setShowSaveKbForm(false);
    setResetConfirm(false);
  }

  const editingEntry = kbEditingId ? kb.find((e) => e.id === kbEditingId) : null;
  const filteredKb = kb.filter((e) => {
    if (!kbSearch.trim()) return true;
    const q = kbSearch.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: colors.bg }}>
      <style>{`
        .rsv-input {
          background: #FAFAFA;
          border: 1px solid #EDEDED;
          color: #171717;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .rsv-input::placeholder { color: #A3A3A3; }
        .rsv-input:focus {
          outline: none;
          border-color: #1897FF;
          box-shadow: 0 0 0 3px rgba(24,151,255,0.15);
          background: #fff;
        }
        .rsv-btn-primary {
          background: #000000;
          color: #ffffff;
          transition: opacity 0.15s ease, transform 0.1s ease;
        }
        .rsv-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .rsv-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .rsv-btn-ghost {
          background: transparent;
          color: #171717;
          border: 1px solid #EDEDED;
          transition: background 0.15s ease;
        }
        .rsv-btn-ghost:hover:not(:disabled) { background: #F5F5F5; }
        .rsv-icon-btn { transition: background 0.15s ease; }
        .rsv-icon-btn:hover { background: #F5F5F5; }
        .rsv-history-item { border: 1px solid #EDEDED; transition: border-color 0.15s ease; }
        .rsv-history-item:hover { border-color: #D4D4D4; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#000" }}>Resolve</h1>
            <p className="text-sm mt-1" style={{ color: colors.gray }}>
              Understand the issue, draft a grounded reply, move on.
            </p>
          </div>
          <div className="inline-flex p-1 rounded-full" style={{ backgroundColor: "#EDEDED" }}>
            <button
              onClick={() => setTab("case")}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition"
              style={tab === "case" ? { backgroundColor: "#000", color: "#fff" } : { color: colors.gray }}
            >
              New case
            </button>
            <button
              onClick={() => setTab("kb")}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition"
              style={tab === "kb" ? { backgroundColor: "#000", color: "#fff" } : { color: colors.gray }}
            >
              Knowledge base
            </button>
          </div>
        </header>

        {tab === "case" ? (
          <div>
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: "#fff", boxShadow: SHADOW }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>
                Customer's message
              </label>
              <textarea
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                rows={5}
                placeholder="Paste what the customer wrote, or describe the issue in your own words…"
                className="w-full rounded-xl p-4 text-sm resize-none rsv-input"
              />

              <label className="block text-sm font-medium mt-6 mb-2" style={{ color: "#000" }}>
                Extra context <span className="font-normal" style={{ color: colors.gray }}>(optional)</span>
              </label>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                rows={2}
                placeholder="Order number, account type, anything you already know…"
                className="w-full rounded-xl p-4 text-sm resize-none rsv-input"
              />

              {analyzeError && <ErrorBanner message={analyzeError} onRetry={handleAnalyze} />}

              {kb.length === 0 && (
                <p className="text-xs mt-4" style={{ color: colors.gray }}>
                  Tip: add a few entries to your{" "}
                  <button onClick={() => setTab("kb")} className="underline font-medium" style={{ color: colors.gray }}>
                    knowledge base
                  </button>{" "}
                  so replies can reference your policies.
                </p>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!customerMessage.trim() || isAnalyzing}
                  className="rsv-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Drafting…
                    </>
                  ) : (
                    <>
                      Draft a reply <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {analysis && (
              <div className="rounded-2xl p-6 sm:p-8 mt-6" style={{ backgroundColor: "#fff", boxShadow: SHADOW }}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag label={analysis.category} />
                  <StatusPill
                    label={`${analysis.urgency} urgency`}
                    tint={(URGENCY_STYLES[analysis.urgency] || {}).tint || "#EDEDED"}
                    dot={(URGENCY_STYLES[analysis.urgency] || {}).dot || colors.gray}
                  />
                  <StatusPill
                    label={analysis.sentiment}
                    tint={(SENTIMENT_STYLES[analysis.sentiment] || {}).tint || "#EDEDED"}
                    dot={(SENTIMENT_STYLES[analysis.sentiment] || {}).dot || colors.gray}
                  />
                </div>

                {analysis.summary && (
                  <p className="text-sm mb-6" style={{ color: colors.gray }}>{analysis.summary}</p>
                )}

                {analysis.matchedKbTitles && analysis.matchedKbTitles.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-medium mb-2" style={{ color: colors.gray }}>
                      Referenced from your knowledge base
                    </p>
                    <div className="flex flex-col gap-2">
                      {analysis.matchedKbTitles.map((title) => {
                        const entry = kb.find((k) => k.title === title);
                        const isOpen = expandedKbTitle === title;
                        return (
                          <div key={title} className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FAFAFA", border: "1px solid #EDEDED" }}>
                            <button
                              onClick={() => setExpandedKbTitle(isOpen ? null : title)}
                              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
                            >
                              <span className="text-xs font-medium truncate" style={{ color: "#171717" }}>{title}</span>
                              {entry && (isOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: colors.gray }} />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: colors.gray }} />
                              ))}
                            </button>
                            {isOpen && entry && (
                              <p className="px-4 pb-3 text-xs" style={{ color: colors.gray }}>{entry.content}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>
                  Suggested reply
                </label>
                <textarea
                  ref={draftRef}
                  value={draftReply}
                  onChange={(e) => setDraftReply(e.target.value)}
                  rows={7}
                  className="w-full rounded-xl p-4 text-sm resize-none rsv-input"
                />

                <div className="flex flex-wrap gap-2 mt-4">
                  <GhostButton onClick={() => runTone("empathetic", "warmer and more empathetic")} disabled={!!toneLoading}>
                    {toneLoading === "empathetic" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    More empathetic
                  </GhostButton>
                  <GhostButton onClick={() => runTone("concise", "more concise and to the point")} disabled={!!toneLoading}>
                    {toneLoading === "concise" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    More concise
                  </GhostButton>
                  <GhostButton onClick={() => runTone("formal", "more formal and professional")} disabled={!!toneLoading}>
                    {toneLoading === "formal" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    More formal
                  </GhostButton>
                </div>

                {toneError && <p className="text-xs mt-2" style={{ color: colors.red }}>{toneError}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-6" style={{ borderTop: "1px solid #EDEDED" }}>
                  <button onClick={handleCopy} className="rsv-btn-ghost inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied" : "Copy reply"}
                  </button>
                  <button onClick={() => setShowSaveKbForm(true)} className="rsv-btn-ghost inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium">
                    <BookOpen className="w-4 h-4" />
                    Save to knowledge base
                  </button>
                </div>

                {showSaveKbForm && (
                  <div className="mt-6">
                    <KbEntryForm
                      initialTitle={analysis.category || ""}
                      initialContent={draftReply}
                      onCancel={() => setShowSaveKbForm(false)}
                      onSave={handleSaveKbFromCase}
                      saveLabel="Add to knowledge base"
                    />
                  </div>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-medium mb-3" style={{ color: colors.gray }}>Recent cases</p>
                <div className="space-y-2">
                  {history.slice(0, 5).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => loadFromHistory(h)}
                      className="w-full text-left rounded-xl p-4 rsv-history-item"
                      style={{ backgroundColor: "#fff" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium truncate" style={{ color: "#171717" }}>
                          {h.summary || truncate(h.message, 60)}
                        </span>
                        <StatusPill
                          label={h.urgency}
                          tint={(URGENCY_STYLES[h.urgency] || {}).tint || "#EDEDED"}
                          dot={(URGENCY_STYLES[h.urgency] || {}).dot || colors.gray}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {kbFormOpen ? (
              <KbEntryForm
                initialTitle={editingEntry ? editingEntry.title : ""}
                initialContent={editingEntry ? editingEntry.content : ""}
                onCancel={closeKbForm}
                onSave={handleKbFormSave}
                saveLabel={editingEntry ? "Save changes" : "Add entry"}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="w-4 h-4" style={{ color: colors.gray }} />
                    </div>
                    <input
                      value={kbSearch}
                      onChange={(e) => setKbSearch(e.target.value)}
                      placeholder="Search entries…"
                      className="w-full rounded-full pl-11 pr-4 py-3 text-sm rsv-input"
                    />
                  </div>
                  <button
                    onClick={openNewKbForm}
                    className="rsv-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    New entry
                  </button>
                </div>

                {filteredKb.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title={kb.length === 0 ? "No entries yet" : "No matches"}
                    description={
                      kb.length === 0
                        ? "Add your first FAQ or policy so drafts can reference it."
                        : "Try a different search term."
                    }
                    action={kb.length === 0 ? { label: "Add entry", onClick: openNewKbForm } : null}
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredKb.map((entry) => (
                      <div key={entry.id} className="rounded-2xl p-5" style={{ backgroundColor: "#fff", boxShadow: SHADOW }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold" style={{ color: "#000" }}>{entry.title}</h3>
                            <p className="text-sm mt-1" style={{ color: colors.gray }}>{truncate(entry.content, 140)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <IconButton onClick={() => startEditKb(entry.id)}>
                              <Pencil className="w-4 h-4" />
                            </IconButton>
                            <IconButton onClick={() => handleDeleteKb(entry.id)} danger>
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-10 text-center">
                  {!resetConfirm ? (
                    <button onClick={() => setResetConfirm(true)} className="text-xs" style={{ color: colors.gray }}>
                      Reset all data
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: colors.gray }}>
                      Clear everything?{" "}
                      <button onClick={handleReset} className="font-semibold" style={{ color: colors.red }}>
                        Yes, reset
                      </button>
                      {" · "}
                      <button onClick={() => setResetConfirm(false)} className="font-semibold" style={{ color: "#171717" }}>
                        Cancel
                      </button>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
