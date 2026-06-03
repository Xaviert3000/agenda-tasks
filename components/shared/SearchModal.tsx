"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, FolderOpen, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "task" | "document" | "project";
  title: string;
  subtitle?: string;
  href: string;
}

interface SearchModalProps {
  workspace: string;
  onClose: () => void;
}

export function SearchModal({ workspace, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const supabase = createClient();

    // Get workspace id
    const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", workspace).single();
    if (!ws) { setLoading(false); return; }

    const like = `%${q}%`;

    const [
      { data: tasks },
      { data: docs },
      { data: projects },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, list_id")
        .ilike("title", like)
        .limit(5),
      supabase
        .from("documents")
        .select("id, title, folder_id")
        .eq("workspace_id", ws.id)
        .ilike("title", like)
        .limit(5),
      supabase
        .from("projects")
        .select("id, name, icon")
        .eq("workspace_id", ws.id)
        .ilike("name", like)
        .limit(3),
    ]);

    // For tasks we need the kanban_list_id to build the URL
    const taskListIds = [...new Set((tasks ?? []).map((t) => t.list_id))];
    const { data: kanbanCols } = taskListIds.length
      ? await supabase.from("kanban_columns").select("id, list_id").in("id", taskListIds)
      : { data: [] };
    const colToList = Object.fromEntries((kanbanCols ?? []).map((c) => [c.id, c.list_id]));

    const out: SearchResult[] = [
      ...(tasks ?? []).map((t) => ({
        id: t.id,
        type: "task" as const,
        title: t.title,
        subtitle: "Tarea",
        href: colToList[t.list_id]
          ? `/${workspace}/projects/${colToList[t.list_id]}/kanban?task=${t.id}`
          : `/${workspace}/dashboard`,
      })),
      ...(docs ?? []).map((d) => ({
        id: d.id,
        type: "document" as const,
        title: d.title,
        subtitle: "Documento",
        href: `/${workspace}/docs/${d.id}`,
      })),
      ...(projects ?? []).map((p) => ({
        id: p.id,
        type: "project" as const,
        title: `${p.icon} ${p.name}`,
        subtitle: "Proyecto",
        href: `/${workspace}/projects/${p.id}/kanban`,
      })),
    ];

    setResults(out);
    setSelected(0);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
    if (e.key === "Escape") onClose();
  };

  const icon = (type: SearchResult["type"]) => {
    if (type === "task")     return <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    if (type === "document") return <FileText    className="w-4 h-4 text-purple-500 flex-shrink-0" />;
    return                          <FolderOpen  className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar tareas, documentos, proyectos..."
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#2F3988]/30 border-t-[#2F3988] rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate(r.href)}
                    onMouseEnter={() => setSelected(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected === i ? "bg-[#2F3988]/5" : "hover:bg-gray-50"
                    )}
                  >
                    {icon(r.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{r.title}</p>
                      <p className="text-[11px] text-gray-400">{r.subtitle}</p>
                    </div>
                    {selected === i && <ArrowRight className="w-3.5 h-3.5 text-[#2F3988]" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!query && (
            <div className="py-6 text-center text-sm text-gray-400">
              Escribe para buscar en tu workspace
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 rounded px-1 font-mono">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 rounded px-1 font-mono">↵</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 rounded px-1 font-mono">esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
