"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { PRIORITY_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

const STATUS_OPTIONS = [
  { id: "todo",        label: "Por Hacer",  color: "#EF4444" },
  { id: "in-progress", label: "En Progreso", color: "#3B82F6" },
  { id: "review",      label: "En Revisión", color: "#F59E0B" },
  { id: "done",        label: "Completado",  color: "#22C55E" },
];

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultListId?: string;
}

export function NewTaskModal({ open, onClose, defaultListId = "todo" }: NewTaskModalProps) {
  const { addTask } = useKanbanStore();
  const [title, setTitle]       = useState("");
  const [listId, setListId]     = useState(defaultListId);
  const [priority, setPriority] = useState<Priority>("med");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setListId(defaultListId);
      setPriority("med");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, defaultListId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    addTask(listId, title.trim(), priority);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nueva tarea"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl w-[520px] p-6 flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Nueva Tarea</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="mb-5">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Título <span className="text-danger">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="¿En qué hay que trabajar?"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-cyan placeholder:text-gray-400 transition-colors"
          />
        </div>

        {/* Column */}
        <div className="mb-5">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Columna
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = listId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setListId(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    active ? "shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                  )}
                  style={active ? {
                    borderColor: s.color + "50",
                    background: s.color + "12",
                    color: s.color,
                  } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div className="mb-6">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Prioridad
          </label>
          <div className="flex gap-2">
            {(Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(
              ([key, cfg]) => {
                const active = priority === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPriority(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      active ? "shadow-sm" : "opacity-45 hover:opacity-70"
                    )}
                    style={{
                      background: cfg.bg,
                      color: cfg.text,
                      borderColor: active ? cfg.text + "40" : "transparent",
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
            style={{ background: "#2F3988" }}
          >
            <Plus className="w-4 h-4" />
            Crear Tarea
          </button>
        </div>
      </div>
    </>
  );
}
