import { useState } from "react";
import { Menu } from "lucide-react";
import { colors } from "./lib/colors.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import { getRelevantKb } from "./lib/kb.js";
import { callClaude, buildCaseSystemPrompt, buildOpeningUserMessage, parseOpening } from "./lib/api.js";
import Sidebar from "./components/Sidebar.jsx";
import QueriesView from "./components/QueriesView.jsx";
import HistoryView from "./components/HistoryView.jsx";
import KnowledgeBaseView from "./components/KnowledgeBaseView.jsx";
import ChatPanel from "./components/ChatPanel.jsx";

const KB_KEY = "resolve-kb-entries";
const QUERIES_KEY = "resolve-queries";

export default function App() {
  const [view, setView] = useState("queries");
  const [kb, setKb] = useState(() => loadJSON(KB_KEY, []));
  const [queries, setQueries] = useState(() => loadJSON(QUERIES_KEY, []));
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  function updateKb(newKb) {
    setKb(newKb);
    saveJSON(KB_KEY, newKb);
  }

  function updateQueries(newQueries) {
    setQueries(newQueries);
    saveJSON(QUERIES_KEY, newQueries);
  }

  async function handleCreateQuery(message, context) {
    const relevant = getRelevantKb(message, context, kb, 10);
    const system = buildCaseSystemPrompt(message, context, relevant);
    const openingUserMessage = buildOpeningUserMessage();

    const raw = await callClaude({
      system,
      messages: [{ role: "user", content: openingUserMessage }],
      maxTokens: 1000,
    });
    const parsed = parseOpening(raw);

    const newQuery = {
      id: `q-${Date.now()}`,
      message,
      context,
      category: parsed.category,
      urgency: parsed.urgency,
      sentiment: parsed.sentiment,
      status: "Open",
      chat: [
        { role: "user", content: openingUserMessage, hidden: true },
        { role: "assistant", content: parsed.message },
      ],
      createdAt: new Date().toISOString(),
    };

    updateQueries([newQuery, ...queries]);
    setSelectedQueryId(newQuery.id);
  }

  async function handleSendMessage(queryId, userText) {
    const current = queries.find((q) => q.id === queryId);
    if (!current) return;

    const relevant = getRelevantKb(current.message, current.context, kb, 10);
    const system = buildCaseSystemPrompt(current.message, current.context, relevant);
    const newMessages = [...current.chat, { role: "user", content: userText }];

    const raw = await callClaude({ system, messages: newMessages, maxTokens: 1000 });

    const updated = {
      ...current,
      chat: [...newMessages, { role: "assistant", content: raw }],
    };
    updateQueries(queries.map((q) => (q.id === queryId ? updated : q)));
  }

  function handleMarkResolved(queryId) {
    updateQueries(queries.map((q) => (q.id === queryId ? { ...q, status: "Resolved" } : q)));
  }

  function handleResetAll() {
    updateKb([]);
    updateQueries([]);
    setSelectedQueryId(null);
    setView("queries");
  }

  function handleNavigate(key) {
    setView(key);
    setSelectedQueryId(null);
  }

  const selectedQuery = selectedQueryId ? queries.find((q) => q.id === selectedQueryId) : null;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: colors.bg }}>
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
        .rsv-history-item { transition: border-color 0.15s ease; }
        .rsv-history-item:hover { border-color: #D4D4D4 !important; }
      `}</style>

      <Sidebar view={view} onNavigate={handleNavigate} mobileOpen={sidebarMobileOpen} onCloseMobile={() => setSidebarMobileOpen(false)} />

      {/* Middle: list-type views */}
      <div
        className={`${selectedQueryId ? "hidden" : "flex"} md:flex flex-col w-full md:w-96 md:shrink-0 overflow-y-auto h-screen`}
        style={{ borderRight: `1px solid ${colors.border}` }}
      >
        <div className="md:hidden flex items-center gap-3 px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: "#fff" }}>
          <button onClick={() => setSidebarMobileOpen(true)} className="p-1 rounded-full rsv-icon-btn" style={{ color: colors.gray }}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold" style={{ color: "#000" }}>Resolve</h1>
        </div>
        <div className="p-4 sm:p-6 flex-1">
          {view === "queries" && (
            <QueriesView
              queries={queries}
              selectedQueryId={selectedQueryId}
              onSelectQuery={setSelectedQueryId}
              onCreateQuery={handleCreateQuery}
              kbCount={kb.length}
              onGoToKb={() => handleNavigate("kb")}
              onGoToHistory={() => handleNavigate("history")}
            />
          )}
          {view === "history" && (
            <HistoryView queries={queries} selectedQueryId={selectedQueryId} onSelectQuery={setSelectedQueryId} />
          )}
          {view === "kb" && <KnowledgeBaseView kb={kb} onUpdateKb={updateKb} onResetAll={handleResetAll} />}
        </div>
      </div>

      {/* Right: chat panel */}
      <div className={`${selectedQueryId ? "flex" : "hidden"} md:flex flex-1 min-w-0`} style={{ backgroundColor: "#fff" }}>
        <ChatPanel
          query={selectedQuery}
          onSendMessage={handleSendMessage}
          onMarkResolved={handleMarkResolved}
          onBack={() => setSelectedQueryId(null)}
        />
      </div>
    </div>
  );
}
