"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckSquare, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTask } from "@/app/actions/tasks";
import { cn } from "@/lib/utils";

interface ConvertNoteModalProps {
  workspace: string;
  noteTitle: string;
  noteBody: string;
  mode: "task" | "doc";
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

interface Project { id: string; name: string; icon: string | null }
interface KanbanList { id: string; name: string }
interface KanbanColumn { id: string; name: string; color: string | null }

export function ConvertNoteModal({
  workspace,
  noteTitle,
  noteBody,
  mode,
  onClose,
  onSuccess,
}: ConvertNoteModalProps) {
  const supabase = createClient();

  const [title, setTitle] = useState(noteTitle);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lists, setLists] = useState<KanbanList[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load projects for this workspace
  useEffect(() => {
    async function load() {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspace)
        .single();
      if (!ws) { setLoading(false); return; }

      const { data: projs } = await supabase
        .from("projects")
        .select("id, name, icon")
        .eq("workspace_id", ws.id)
        .order("name");

      setProjects(projs ?? []);
      if (projs && projs.length > 0) setSelectedProject(projs[0].id);
      setLoading(false);
    }
    load();
  }, [workspace]);

  // Load lists when project changes
  useEffect(() => {
    if (!selectedProject) return;
    setSelectedList("");
    setColumns([]);
    setSelectedColumn("");
    supabase
      .from("kanban_lists")
      .select("id, name")
      .eq("project_id", selectedProject)
      .order("position")
      .then(({ data }) => {
        setLists(data ?? []);
        if (data && data.length > 0) setSelectedList(data[0].id);
      });
  }, [selectedProject]);

  // Load columns when list changes
  useEffect(() => {
    if (!selectedList) return;
    setSelectedColumn("");
    supabase
      .from("kanban_columns")
      .select("id, name, color")
      .eq("list_id", selectedList)
      .order("position")
      .then(({ data }) => {
        setColumns(data ?? []);
        if (data && data.length > 0) setSelectedColumn(data[0].id);
      });
  }, [selectedList]);

  async function handleSubmit() {
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    setError("");

    if (mode === "task") {
      if (!selectedColumn) { setError("Selecciona una columna"); setSaving(false); return; }
      const result = await createTask(selectedColumn, title.trim());
      if (!result || "error" in result) {
        setError((result as any)?.error ?? "Error al crear la tarea");
        setSaving(false);
        return;
      }
      onSuccess?.(result.id);
      onClose();
    } else {
      // Create document
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspace)
        .single();
      if (!ws) { setError("Workspace no encontrado"); setSaving(false); return; }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setError("No autenticado"); setSaving(false); return; }
      const { data, error: dbErr } = await supabase
        .from("documents")
        .insert({
          workspace_id: ws.id,
          title: title.trim(),
          content: `<p>${noteBody.replace(/\n/g, "</p><p>")}</p>`,
          icon: "📄",
          folder_id: null,
          tags: [],
          created_by: authUser.id,
        })
        .select("id")
        .single();

      if (dbErr || !data) { setError(dbErr?.message ?? "Error al crear el documento"); setSaving(false); return; }
      onSuccess?.(data.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            mode === "task" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
          )}>
            {mode === "task" ? <CheckSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 text-sm">
              {mode === "task" ? "Convertir en tarea" : "Convertir en documento"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {mode === "task" ? "Elige dónde crear la tarea" : "Se creará un nuevo documento"}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Título
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2F3988] focus:ring-1 focus:ring-[#2F3988]/20 transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proyecto</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2F3988] bg-white"
                >
                  {projects.length === 0 && <option value="">Sin proyectos</option>}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ""}{p.name}</option>
                  ))}
                </select>
              </div>

              {/* List — only for tasks */}
              {mode === "task" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lista</label>
                    <select
                      value={selectedList}
                      onChange={(e) => setSelectedList(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2F3988] bg-white"
                    >
                      {lists.length === 0 && <option value="">Sin listas</option>}
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Columna</label>
                    <select
                      value={selectedColumn}
                      onChange={(e) => setSelectedColumn(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2F3988] bg-white"
                    >
                      {columns.length === 0 && <option value="">Sin columnas</option>}
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2F3988] hover:bg-[#252d6b] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "task" ? "Crear tarea" : "Crear documento"}
          </button>
        </div>
      </div>
    </div>
  );
}
