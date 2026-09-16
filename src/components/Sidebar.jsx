import { Inbox, History, BookOpen, X } from "lucide-react";
import { colors } from "../lib/colors.js";

const NAV_ITEMS = [
  { key: "queries", label: "Queries", icon: Inbox },
  { key: "history", label: "History", icon: History },
  { key: "kb", label: "Knowledge base", icon: BookOpen },
];

function NavList({ view, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = view === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition"
            style={{
              backgroundColor: active ? colors.blueTint : "transparent",
              color: active ? "#171717" : colors.gray,
              borderLeft: active ? `3px solid ${colors.blue}` : "3px solid transparent",
            }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color: active ? colors.blue : colors.gray }} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ view, onNavigate, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop: always-visible column */}
      <aside
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 py-6"
        style={{ backgroundColor: "#fff", borderRight: `1px solid ${colors.border}` }}
      >
        <div className="px-6 pb-6">
          <h1 className="text-lg font-bold" style={{ color: "#000" }}>Resolve</h1>
          <p className="text-xs mt-0.5" style={{ color: colors.gray }}>CS advisor assistant</p>
        </div>
        <NavList view={view} onNavigate={onNavigate} />
      </aside>

      {/* Mobile: drawer + backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] flex flex-col py-6"
            style={{ backgroundColor: "#fff" }}
          >
            <div className="flex items-start justify-between px-6 pb-6">
              <div>
                <h1 className="text-lg font-bold" style={{ color: "#000" }}>Resolve</h1>
                <p className="text-xs mt-0.5" style={{ color: colors.gray }}>CS advisor assistant</p>
              </div>
              <button onClick={onCloseMobile} className="p-1 rounded-full rsv-icon-btn" style={{ color: colors.gray }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList
              view={view}
              onNavigate={(key) => {
                onNavigate(key);
                onCloseMobile();
              }}
            />
          </aside>
        </div>
      )}
    </>
  );
}
