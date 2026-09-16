import { useState } from "react";
import { Search, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { colors, SHADOW } from "../lib/colors.js";
import { truncate } from "../lib/kb.js";
import { Card, EmptyState, IconButton, PrimaryButton, GhostButton } from "./ui.jsx";

function KbEntryForm({ initialTitle, initialContent, onSave, onCancel, saveLabel = "Save entry" }) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(initialContent || "");
  const canSave = title.trim() && content.trim();

  return (
    <Card className="p-6 sm:p-8" style={{ border: `1px solid ${colors.blueTint}` }}>
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
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton onClick={() => canSave && onSave({ title: title.trim(), content: content.trim() })} disabled={!canSave}>
          {saveLabel}
        </PrimaryButton>
      </div>
    </Card>
  );
}

export default function KnowledgeBaseView({ kb, onUpdateKb, onResetAll }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const editingEntry = editingId ? kb.find((e) => e.id === editingId) : null;
  const filtered = kb.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
  });

  function openNew() {
    setEditingId(null);
    setFormOpen(true);
  }
  function startEdit(id) {
    setEditingId(id);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }
  function handleSave(data) {
    if (editingId) {
      onUpdateKb(kb.map((e) => (e.id === editingId ? { ...e, ...data } : e)));
    } else {
      onUpdateKb([{ id: `kb-${Date.now()}`, ...data, createdAt: new Date().toISOString() }, ...kb]);
    }
    closeForm();
  }
  function handleDelete(id) {
    onUpdateKb(kb.filter((e) => e.id !== id));
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-4" style={{ color: "#000" }}>Knowledge base</h2>

      {formOpen ? (
        <KbEntryForm
          initialTitle={editingEntry ? editingEntry.title : ""}
          initialContent={editingEntry ? editingEntry.content : ""}
          onCancel={closeForm}
          onSave={handleSave}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="w-full rounded-full pl-11 pr-4 py-3 text-sm rsv-input"
              />
            </div>
            <PrimaryButton onClick={openNew} className="whitespace-nowrap">
              <Plus className="w-4 h-4" /> New entry
            </PrimaryButton>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={kb.length === 0 ? "No entries yet" : "No matches"}
              description={kb.length === 0 ? "Add your first FAQ or policy so drafts can reference it." : "Try a different search term."}
              action={kb.length === 0 ? { label: "Add entry", onClick: openNew } : null}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <Card key={entry.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold" style={{ color: "#000" }}>{entry.title}</h3>
                      <p className="text-sm mt-1" style={{ color: colors.gray }}>{truncate(entry.content, 140)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton onClick={() => startEdit(entry.id)}>
                        <Pencil className="w-4 h-4" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(entry.id)} danger>
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            {!resetConfirm ? (
              <button onClick={() => setResetConfirm(true)} className="text-xs" style={{ color: colors.gray }}>
                Reset all data (knowledge base + queries)
              </button>
            ) : (
              <span className="text-xs" style={{ color: colors.gray }}>
                Clear everything?{" "}
                <button onClick={() => { onResetAll(); setResetConfirm(false); }} className="font-semibold" style={{ color: colors.red }}>
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
  );
}
