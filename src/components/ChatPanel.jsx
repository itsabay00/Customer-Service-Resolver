import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Loader2, CheckCircle2, MessagesSquare, Copy, Check } from "lucide-react";
import { colors } from "../lib/colors.js";
import { URGENCY_STYLES, SENTIMENT_STYLES, STATUS_STYLES } from "../lib/colors.js";
import { StatusPill, Tag, GhostButton, ErrorBanner, EmptyState } from "./ui.jsx";

const QUICK_PROMPTS = ["More empathetic", "More concise", "More formal", "What policy applies here?"];

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
        style={
          isUser
            ? { backgroundColor: "#000", color: "#fff" }
            : { backgroundColor: "#FAFAFA", color: "#171717", border: `1px solid ${colors.border}` }
        }
      >
        {content}
      </div>
    </div>
  );
}

export default function ChatPanel({ query, onSendMessage, onMarkResolved, onBack }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setInput("");
    setError(null);
  }, [query?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [query?.chat?.length, sending]);

  if (!query) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center h-screen">
        <EmptyState
          icon={MessagesSquare}
          title="No query selected"
          description="Pick a query from the list, or start a new one."
        />
      </div>
    );
  }

  async function handleSend(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSendMessage(query.id, value);
      setInput("");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyLast() {
    const lastAssistant = [...query.chat].reverse().find((m) => m.role === "assistant" && !m.hidden);
    if (!lastAssistant) return;
    try {
      await navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // clipboard not available — nothing more we can do silently
    }
  }

  const visibleMessages = (query.chat || []).filter((m) => !m.hidden);
  const statusStyle = STATUS_STYLES[query.status] || STATUS_STYLES.Open;

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header / pinned case context */}
      <div className="shrink-0 border-b px-4 sm:px-6 py-4" style={{ borderColor: colors.border, backgroundColor: "#fff" }}>
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded-full rsv-icon-btn shrink-0 mt-0.5" style={{ color: colors.gray }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#171717" }}>{query.message}</p>
            {query.context && (
              <p className="text-xs mt-1" style={{ color: colors.gray }}>Context: {query.context}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <StatusPill label={query.status} tint={statusStyle.tint} dot={statusStyle.dot} />
              {query.category && <Tag label={query.category} />}
              {query.urgency && (
                <StatusPill
                  label={query.urgency}
                  tint={(URGENCY_STYLES[query.urgency] || {}).tint || "#EDEDED"}
                  dot={(URGENCY_STYLES[query.urgency] || {}).dot || colors.gray}
                />
              )}
              {query.sentiment && (
                <StatusPill
                  label={query.sentiment}
                  tint={(SENTIMENT_STYLES[query.sentiment] || {}).tint || "#EDEDED"}
                  dot={(SENTIMENT_STYLES[query.sentiment] || {}).dot || colors.gray}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <GhostButton onClick={handleCopyLast}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy last reply"}
          </GhostButton>
          {query.status !== "Resolved" && (
            <GhostButton onClick={() => onMarkResolved(query.id)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
            </GhostButton>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-3" style={{ backgroundColor: colors.bg }}>
        {visibleMessages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2" style={{ backgroundColor: "#FAFAFA", border: `1px solid ${colors.border}`, color: colors.gray }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        {error && <ErrorBanner message={error} onRetry={() => handleSend(input || undefined)} />}
      </div>

      {/* Quick prompts + input */}
      <div className="shrink-0 border-t px-4 sm:px-6 py-4" style={{ borderColor: colors.border, backgroundColor: "#fff" }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_PROMPTS.map((p) => (
            <GhostButton key={p} onClick={() => handleSend(p)} disabled={sending}>
              {p}
            </GhostButton>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Ask anything about this case…"
            className="flex-1 rounded-2xl px-4 py-3 text-sm resize-none rsv-input"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="rsv-btn-primary rounded-full p-3 shrink-0 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
