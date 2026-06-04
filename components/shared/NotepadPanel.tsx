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
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { ConvertNoteModal } from "./ConvertNoteModal";

type Note = Tables<"notes">;

function formatDate(date: Date) {
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

function notePreview(body: string) {
  return body.replace(/\n/g, " ").slice(0, 60) || "Sin contenido";
}

interface NotepadPanelProps {
  workspace: string;
  onClose: () => void;
}

export function NotepadPanel({ workspace, onClose }: NotepadPanelProps) {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertMode, setConvertMode] = useState<"task" | "doc" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return undefined; }

      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      setNotes(data ?? []);
      setLoading(false);

      const channel = supabase
        .channel("notes-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === "INSERT") {
            setNotes((prev) => prev.some((n) => n.id === (payload.new as Note).id) ? prev : [payload.new as Note, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotes((prev) => prev.map((n) => n.id === (payload.new as Note).id ? (payload.new as Note) : n));
          } else if (payload.eventType === "DELETE") {
            setNotes((prev) => prev.filter((n) => n.id !== (payload.old as Note).id));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }

    const cleanup = init();
    return () => { cleanup.then((fn) => fn?.()); };
  }, []);

  const saveNote = useCallback(async (note: Note) => {
    setSaving(true);
    await supabase.from("notes").update({ body: note.body, title: note.title, updated_at: new Date().toISOString() }).eq("id", note.id);
    setSaving(false);
  }, []);

  function handleBodyChange(body: string) {
    if (!activeNoteId) return;
    setNotes((prev) => prev.map((n) => n.id === activeNoteId ? { ...n, body, updated_at: new Date().toISOString() } : n));
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setNotes((prev) => {
        const note = prev.find((n) => n.id === activeNoteId);
        if (note) saveNote({ ...note, body });
        return prev;
      });
    }, 800);
  }

  function handleTitleChange(title: string) {
    if (!activeNoteId) return;
    setNotes((prev) => prev.map((n) => n.id === activeNoteId ? { ...n, title, updated_at: new Date().toISOString() } : n));
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setNotes((prev) => {
        const note = prev.find((n) => n.id === activeNoteId);
        if (note) saveNote({ ...note, title });
        return prev;
      });
    }, 800);
  }

  async function createNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: formatDate(new Date()), body: "", created_at: now, updated_at: now })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setActiveNoteId(data.id);
      setTimeout(() => titleRef.current?.focus(), 50);
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
    win.document.write(`<html><head><title>${note.title}</title></head><body><h2>${note.title}</h2><pre style="white-space:pre-wrap;font-family:inherit">${note.body}</pre></body></html>`);
    win.document.close();
    win.print();
  }

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  const filteredNotes = searchQuery
    ? notes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  return (
    <>
      <div
        className="fixed right-4 top-14 z-50 w-[380px] rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        {activeNote ? (
          <>
            {/* Header editor */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#FFF8DC] border-b border-yellow-200 flex-shrink-0">
              <button
                onClick={() => setActiveNoteId(null)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                ref={titleRef}
                value={activeNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título de la nota"
                className="flex-1 font-semibold text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
              />
              {saving && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 overflow-y-auto">
              <textarea
                ref={textareaRef}
                value={activeNote.body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder={'Escribe algo o "/" para ingresar comandos y ver acciones de IA'}
                className="w-full h-full min-h-[320px] resize-none p-4 text-sm text-gray-700 placeholder-gray-400 outline-none bg-white"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={handlePrint} title="Imprimir" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors">
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConvertMode("task")} title="Convertir en tarea" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors">
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConvertMode("doc")} title="Convertir en documento" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-500 transition-colors">
                  <FileOutput className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header list */}
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
                <button onClick={() => setShowSearch(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              )}
              <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-yellow-200/60 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
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
                  <button key={note.id} onClick={() => setActiveNoteId(note.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <p className="font-semibold text-sm text-gray-800 truncate">{note.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{notePreview(note.body)}</p>
                  </button>
                ))
              )}
            </div>

            {/* New note */}
            <div className="border-t border-gray-100 flex-shrink-0">
              <button onClick={createNote} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <Plus className="w-4 h-4" />
                Nueva nota
              </button>
            </div>
          </>
        )}
      </div>

      {convertMode && activeNote && (
        <ConvertNoteModal
          workspace={workspace}
          noteTitle={activeNote.title}
          noteBody={activeNote.body}
          mode={convertMode}
          onClose={() => setConvertMode(null)}
        />
      )}
    </>
  );
}
