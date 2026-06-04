"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Search,
  MoreHorizontal,
  ChevronLeft,
  Plus,
  Printer,
  CheckSquare,
  FileOutput,
  Maximize2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

type Note = Tables<"notes">;

function formatDate(date: Date) {
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function notePreview(body: string) {
  return body.replace(/\n/g, " ").slice(0, 60) || "Sin contenido";
}

interface NotepadPanelProps {
  onClose: () => void;
}

export function NotepadPanel({ onClose }: NotepadPanelProps) {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Load notes + subscribe realtime ──────────────────────────
  useEffect(() => {
    let userId: string;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      userId = user.id;

      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      setNotes(data ?? []);
      setLoading(false);

      // Realtime subscription
      const channel = supabase
        .channel("notes-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setNotes((prev) => {
                if (prev.some((n) => n.id === (payload.new as Note).id)) return prev;
                return [payload.new as Note, ...prev];
              });
            } else if (payload.eventType === "UPDATE") {
              setNotes((prev) =>
                prev.map((n) => n.id === (payload.new as Note).id ? payload.new as Note : n)
              );
            } else if (payload.eventType === "DELETE") {
              setNotes((prev) => prev.filter((n) => n.id !== (payload.old as Note).id));
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }

    const cleanup = init();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  // ── Auto-save with debounce ───────────────────────────────────
  const saveNote = useCallback(async (note: Note) => {
    setSaving(true);
    await supabase
      .from("notes")
      .update({ body: note.body, title: note.title, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    setSaving(false);
  }, []);

  function handleBodyChange(body: string) {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => n.id === activeNoteId ? { ...n, body, updated_at: new Date().toISOString() } : n)
    );
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const note = notes.find((n) => n.id === activeNoteId);
      if (note) saveNote({ ...note, body });
    }, 800);
  }

  async function createNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const title = formatDate(new Date());
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title, body: "", created_at: now, updated_at: now })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setActiveNoteId(data.id);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    if (activeNoteId === id) setActiveNoteId(null);
  }

  function handlePrint() {
    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>${note.title}</title></head><body><h2>${note.title}</h2><pre style="white-space:pre-wrap;font-family:inherit">${note.body}</pre></body></html>`
    );
    win.document.close();
    win.print();
  }

  function handleConvertToTask() {
    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) return;
    window.dispatchEvent(new CustomEvent("notepad:convert-to-task", { detail: { title: note.title, body: note.body } }));
    onClose();
  }

  function handleConvertToDoc() {
    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) return;
    window.dispatchEvent(new CustomEvent("notepad:convert-to-doc", { detail: { title: note.title, body: note.body } }));
    onClose();
  }

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  return (
    <div
      className="fixed right-4 top-14 z-50 w-[380px] rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
      style={{ maxHeight: "calc(100vh - 80px)" }}
    >
      {activeNote ? (
        /* ── Note editor ── */
        <>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8DC] border-b border-yellow-200 flex-shrink-0">
            <button
              onClick={() => setActiveNoteId(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex-1 font-semibold text-sm text-gray-800 truncate">
              {activeNote.title}
            </span>
            {saving && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={activeNote.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder={'Escribe algo o "/" para ingresar comandos y ver acciones de IA'}
              className="w-full h-full min-h-[320px] resize-none p-4 text-sm text-gray-700 placeholder-gray-400 outline-none bg-white"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <span className="text-[#2F3988] font-medium">1</span>
              <span className="text-red-400 font-medium">2</span>
              <span className="text-red-400 font-medium">3</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrint}
                title="Imprimir"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleConvertToTask}
                title="Convertir en tarea"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleConvertToDoc}
                title="Convertir en documento"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <FileOutput className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── Notes list ── */
        <>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8DC] border-b border-yellow-200 flex-shrink-0">
            <span className="flex-1 font-bold text-base text-gray-800">Bloc de notas</span>
            {showSearch ? (
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notas…"
                className="flex-1 text-sm bg-white/70 border border-yellow-300 rounded-md px-2 py-1 outline-none"
                onBlur={() => { if (!searchQuery) setShowSearch(false); }}
              />
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">
                {searchQuery ? "Sin resultados" : "No hay notas todavía"}
              </p>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-semibold text-sm text-gray-800 truncate">{note.title}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{notePreview(note.body)}</p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 flex-shrink-0">
            <button
              onClick={createNote}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva nota
            </button>
          </div>
        </>
      )}
    </div>
  );
}
