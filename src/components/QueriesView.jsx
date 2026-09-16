import { useState } from "react";
import { Plus, BookOpen, MessageSquarePlus, MessagesSquare, ChevronRight, Loader2 } from "lucide-react";
import { colors } from "../lib/colors.js";
import { truncate } from "../lib/kb.js";
import { Card, StatusPill, Tag, PrimaryButton, GhostButton, ErrorBanner } from "./ui.jsx";
import { URGENCY_STYLES, SENTIMENT_STYLES, STATUS_STYLES } from "../lib/colors.js";

const USE_CASES = [
  {
    icon: MessageSquarePlus,
    title: "Paste a query, get a draft",
    description: "Paste what a customer wrote and get a draft reply grounded in your policies in seconds.",
  },
  {
    icon: BookOpen,
    title: "Build your knowledge base",
    description: "Add your FAQs and policies once, and every draft after that stays accurate.",
  },
  {
    icon: MessagesSquare,
    title: "Chat to refine",
    description: "Ask the assistant to adjust tone, double-check a policy, or explain its reasoning.",
  },
];

function UseCaseCards({ onGoToKb }) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-1" style={{ color: "#000" }}>Get started</h2>
      <p className="text-sm mb-5" style={{ color: colors.gray }}>A few ways to use Resolve.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {USE_CASES.map((uc) => (
          <Card key={uc.title} className="p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: colors.blueTint }}>
              <uc.icon className="w-5 h-5" style={{ color: colors.blue }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: "#000" }}>{uc.title}</h3>
            <p className="text-sm mt-1" style={{ color: colors.gray }}>{uc.description}</p>
          </Card>
        ))}
      </div>
      <button onClick={onGoToKb} className="text-sm font-medium underline mt-5" style={{ color: colors.blue }}>
        Start with your knowledge base →
      </button>
    </div>
  );
}

function NewQueryForm({ onCreate, kbCount, onGoToKb }) {
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreate(message.trim(), context.trim());
      setMessage("");
      setContext("");
    } catch (err) {
      setError(err.message || "Couldn't start that case. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <label className="block text-sm font-medium mb-2" style={{ color: "#000" }}>New query</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Paste what the customer wrote…"
        className="w-full rounded-xl p-3 text-sm resize-none rsv-input"
      />
      <input
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Extra context (optional) — order number, account type…"
        className="w-full rounded-xl p-3 text-sm rsv-input mt-3"
      />
      {error && <ErrorBanner message={error} className="mt-3" />}
      {kbCount === 0 && (
        <p className="text-xs mt-3" style={{ color: colors.gray }}>
          Tip: add a few entries to your{" "}
          <button onClick={onGoToKb} className="underline font-medium" style={{ color: colors.gray }}>
            knowledge base
          </button>{" "}
          so replies can reference your policies.
        </p>
      )}
      <div className="flex justify-end mt-4">
        <PrimaryButton onClick={handleSubmit} disabled={!message.trim() || submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Starting…
            </>
          ) : (
            <>Start case →</>
          )}
        </PrimaryButton>
      </div>
    </Card>
  );
}

export function QueryCard({ query, selected, onClick }) {
  const statusStyle = STATUS_STYLES[query.status] || STATUS_STYLES.Open;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 rsv-history-item"
      style={{
        backgroundColor: "#fff",
        border: selected ? `1px solid ${colors.blue}` : "1px solid transparent",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-sm font-medium" style={{ color: "#171717" }}>
          {truncate(query.message, 72)}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colors.gray }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
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
    </button>
  );
}

export default function QueriesView({ queries, selectedQueryId, onSelectQuery, onCreateQuery, kbCount, onGoToKb, onGoToHistory }) {
  const recent = queries.slice(0, 12);
  const hasMore = queries.length > recent.length;

  return (
    <div className="flex flex-col gap-6">
      {queries.length === 0 && <UseCaseCards onGoToKb={onGoToKb} />}

      <NewQueryForm onCreate={onCreateQuery} kbCount={kbCount} onGoToKb={onGoToKb} />

      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: colors.gray }}>Queries</p>
            {hasMore && (
              <GhostButton onClick={onGoToHistory}>View all in history</GhostButton>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((q) => (
              <QueryCard key={q.id} query={q} selected={q.id === selectedQueryId} onClick={() => onSelectQuery(q.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
