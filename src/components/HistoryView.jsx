import { useState } from "react";
import { Search, History as HistoryIcon } from "lucide-react";
import { colors } from "../lib/colors.js";
import { EmptyState } from "./ui.jsx";
import { QueryCard } from "./QueriesView.jsx";

export default function HistoryView({ queries, selectedQueryId, onSelectQuery }) {
  const [search, setSearch] = useState("");

  const filtered = queries.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.message.toLowerCase().includes(s) ||
      (q.category || "").toLowerCase().includes(s) ||
      (q.context || "").toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <h2 className="text-base font-semibold mb-4" style={{ color: "#000" }}>History</h2>

      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4" style={{ color: colors.gray }} />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search every query…"
          className="w-full rounded-full pl-11 pr-4 py-3 text-sm rsv-input"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title={queries.length === 0 ? "No queries yet" : "No matches"}
          description={queries.length === 0 ? "Cases you start will show up here." : "Try a different search term."}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((q) => (
            <QueryCard key={q.id} query={q} selected={q.id === selectedQueryId} onClick={() => onSelectQuery(q.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
