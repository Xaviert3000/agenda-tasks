"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Plus, X, Check,
  PanelLeftClose, PanelLeft, Settings, Inbox,
  LayoutDashboard, Folder, FileText, BookOpen, Lock, Globe,
} from "lucide-react";
import { useProjectSettingsStore } from "@/lib/store/projectSettingsStore";
import { createClient } from "@/lib/supabase/client";
import type { SidebarProject, SidebarFolder, SidebarList } from "@/types/domain";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["📋", "🎨", "📱", "🌐", "✏️", "🚀", "💡", "🔧", "📊", "🎯", "🛍️", "💼"];

interface SidebarProps {
  workspace: string;
}

type CreatingItem =
  | { type: "project" }
  | { type: "folder"; projectId: string }
  | { type: "list"; projectId: string; folderId?: string }
  | null;

export function Sidebar({ workspace }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeListId = pathname.match(/\/projects\/([^/]+)/)?.[1] ?? "";

  const [collapsed, setCollapsed] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Projects loaded from Supabase
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Members loaded from Supabase
  const [members, setMembers] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", workspace).single();
      if (!ws) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("workspace_members")
        .select("user_id, profiles(id, name, avatar_url)")
        .eq("workspace_id", ws.id);
      const list = (data ?? [])
        .map((m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return p ? { id: p.id, name: p.name, avatar_url: p.avatar_url } : null;
        })
        .filter((m): m is { id: string; name: string; avatar_url: string | null } =>
          m !== null && m.id !== user?.id
        );
      setMembers(list);
    })();
  }, [workspace]);

  // Load real projects from Supabase
  const loadProjects = useCallback(async () => {
    const supabase = createClient();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", workspace)
      .single();
    if (!ws) { setLoadingProjects(false); return; }

    const { data: projs } = await supabase
      .from("projects")
      .select("id, name, icon")
      .eq("workspace_id", ws.id)
      .order("created_at");

    if (!projs) { setLoadingProjects(false); return; }

    const projectIds = projs.map((p) => p.id);
    const { data: lists } = projectIds.length
      ? await supabase.from("kanban_lists").select("id, name, project_id, folder_id").in("project_id", projectIds).order("position")
      : { data: [] };
    const { data: folders } = projectIds.length
      ? await supabase.from("folders").select("id, name, project_id").in("project_id", projectIds).order("position")
      : { data: [] };

    const sidebarProjects: SidebarProject[] = projs.map((p) => {
      const projectFolders: SidebarFolder[] = (folders ?? [])
        .filter((f) => f.project_id === p.id)
        .map((f) => ({
          id: f.id,
          name: f.name,
          lists: (lists ?? [])
            .filter((l) => l.folder_id === f.id)
            .map((l) => ({ id: l.id, name: l.name })),
        }));
      return {
        id: p.id,
        name: p.name,
        icon: p.icon ?? "📋",
        lists: (lists ?? []).filter((l) => l.project_id === p.id && !l.folder_id).map((l) => ({ id: l.id, name: l.name })),
        folders: projectFolders,
      };
    });

    setProjects(sidebarProjects);
    setLoadingProjects(false);
  }, [workspace]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Auto-open project creation when ?newProject=1
  useEffect(() => {
    if (searchParams.get("newProject") === "1") {
      startCreating({ type: "project" });
      router.replace(`/${workspace}/dashboard`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Inline creation state
  const [creating, setCreating] = useState<CreatingItem>(null);
  const [creatingName, setCreatingName] = useState("");
  const [creatingIcon, setCreatingIcon] = useState("📋");
  const [showEmoji, setShowEmoji] = useState(false);

  // Which project's "+" dropdown is open
  const [projectMenu, setProjectMenu] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const isProjectPublic   = useProjectSettingsStore((s) => s.isProjectPublic);
  const setProjectPublic  = useProjectSettingsStore((s) => s.setProjectPublic);
  const setProjectMembers = useProjectSettingsStore((s) => s.setProjectMembers);

  // Project creation: visibility + members
  const [creatingIsPublic,   setCreatingIsPublic]   = useState(true);
  const [creatingMemberIds,  setCreatingMemberIds]  = useState<Set<string>>(new Set());

  // Close project dropdown on outside mousedown
  useEffect(() => {
    if (!projectMenu) return;
    const handler = (e: MouseEvent) => {
      if (!menuContainerRef.current?.contains(e.target as Node)) {
        setProjectMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectMenu]);

  // Auto-focus inline form input
  useEffect(() => {
    if (creating) setTimeout(() => nameInputRef.current?.focus(), 60);
  }, [creating]);

  /* ── Helpers ── */
  const toggleProject = (id: string) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const startCreating = (item: CreatingItem, autoExpandProjectId?: string) => {
    setProjectMenu(null);
    setCreating(item);
    setCreatingName("");
    setCreatingIcon("📋");
    setShowEmoji(false);
    // Reset project-specific fields
    if (item?.type === "project") {
      setCreatingIsPublic(true);
      setCreatingMemberIds(new Set());
    }
    if (autoExpandProjectId) {
      setExpandedProjects((p) => new Set([...p, autoExpandProjectId]));
    }
  };

  const cancelCreating = () => {
    setCreating(null);
    setCreatingName("");
  };

  const submitCreating = async () => {
    if (!creatingName.trim() || !creating) return;
    const name = creatingName.trim();
    const supabase = createClient();

    if (creating.type === "project") {
      const { data: wsData } = await supabase
        .from("workspaces").select("id").eq("slug", workspace).single();
      const { data: user } = await supabase.auth.getUser();
      if (!wsData || !user.user) return;

      const { data: newProject } = await supabase
        .from("projects")
        .insert({ workspace_id: wsData.id, name, icon: creatingIcon, created_by: user.user.id })
        .select("id")
        .single();
      if (!newProject) return;

      // Create default kanban lists
      await supabase.from("kanban_lists").insert([
        { project_id: newProject.id, name: "Por Hacer",   color: "#EF4444", position: 0 },
        { project_id: newProject.id, name: "En Progreso", color: "#3B82F6", position: 1 },
        { project_id: newProject.id, name: "En Revisión", color: "#F59E0B", position: 2 },
        { project_id: newProject.id, name: "Completado",  color: "#22C55E", position: 3 },
      ]);

      // Add creator as project member
      await supabase.from("project_members").insert({
        project_id: newProject.id, user_id: user.user.id, role: "owner",
      });

      setProjectPublic(newProject.id, creatingIsPublic);
      if (!creatingIsPublic) {
        setProjectMembers(newProject.id, Array.from(creatingMemberIds));
      }

      await loadProjects();
      setExpandedProjects((p) => new Set([...p, newProject.id]));

    } else if (creating.type === "folder") {
      const { data: newFolder } = await supabase
        .from("folders")
        .insert({ project_id: creating.projectId, name, position: 0 })
        .select("id")
        .single();
      if (!newFolder) return;
      await loadProjects();
      setExpandedFolders((p) => new Set([...p, newFolder.id]));

    } else if (creating.type === "list") {
      const { data: newList } = await supabase
        .from("kanban_lists")
        .insert({
          project_id: creating.projectId,
          folder_id: creating.folderId ?? null,
          name,
          color: "#6B7280",
          position: 99,
        })
        .select("id")
        .single();
      if (newList) await loadProjects();
    }

    setCreating(null);
    setCreatingName("");
  };

  /* ── Reusable inline form (called as a plain function, not a component) ── */
  const renderInlineForm = (placeholder: string) => (
    <div className="py-1 pr-1">
      <div className="flex items-center gap-1.5 border border-brand-cyan/60 rounded-lg px-2 py-1.5 bg-blue-50/50">
        <input
          ref={nameInputRef}
          type="text"
          value={creatingName}
          onChange={(e) => setCreatingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitCreating();
            if (e.key === "Escape") cancelCreating();
          }}
          placeholder={placeholder}
          className="flex-1 text-xs text-gray-800 outline-none bg-transparent placeholder:text-gray-400 min-w-0"
        />
        <button
          onClick={submitCreating}
          disabled={!creatingName.trim()}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded text-white transition-colors flex-shrink-0",
            creatingName.trim() ? "bg-[#2F3988]" : "bg-gray-200"
          )}
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={cancelCreating}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  /* ── Renders a single list link ── */
  const renderList = (list: SidebarList, projectIcon: string = "📋") => {
    const isActive  = list.id === activeListId;
    const isPrivate = !isProjectPublic(list.id);
    const href = `/${workspace}/projects/${list.id}/kanban?name=${encodeURIComponent(list.name)}&icon=${encodeURIComponent(projectIcon)}`;

    return (
      <div key={list.id} className="group/listitem relative flex items-center">
        <Link
          href={href}
          className={cn(
            "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors min-w-0 pr-6",
            isActive
              ? "bg-blue-50 text-brand-navy font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="flex-1 truncate">{list.name}</span>
          {/* Persistent lock badge for private projects */}
          {isPrivate && (
            <Lock className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
          )}
        </Link>

        {/* Visibility toggle — appears on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setProjectPublic(list.id, isPrivate); // flip
          }}
          className={cn(
            "absolute right-1 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-all",
            "opacity-0 group-hover/listitem:opacity-100",
            isPrivate
              ? "text-[#2F3988] hover:bg-blue-100"
              : "text-gray-400 hover:bg-gray-200"
          )}
          title={isPrivate ? "Cambiar a Público" : "Cambiar a Privado"}
        >
          {isPrivate
            ? <Globe className="w-3 h-3" />
            : <Lock className="w-3 h-3" />}
        </button>
      </div>
    );
  };

  /* ── Renders a folder row + its contents ── */
  const renderFolder = (folder: SidebarFolder, projectId: string, projectIcon: string = "📋") => {
    const isFolderExpanded = expandedFolders.has(folder.id);
    const isCreatingListHere =
      creating?.type === "list" && creating.folderId === folder.id;

    return (
      <div key={folder.id}>
        {/* Folder row */}
        <div className="group/folder flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex-1 flex items-center gap-1.5 text-xs text-gray-600 min-w-0"
          >
            {isFolderExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 opacity-0 group-hover/folder:opacity-100" />
            )}
            <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{folder.name}</span>
          </button>
          {/* Add list to folder */}
          <button
            onClick={() =>
              startCreating(
                { type: "list", projectId, folderId: folder.id },
                projectId
              )
            }
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 opacity-0 group-hover/folder:opacity-100 transition-all flex-shrink-0"
            title="Nueva lista"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Folder contents */}
        {isFolderExpanded && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
            {/* Inline list creation inside folder */}
            {isCreatingListHere && renderInlineForm("Nombre de la lista")}

            {/* Lists */}
            {folder.lists.map((list) => renderList(list, projectIcon))}

            {/* Empty hint */}
            {folder.lists.length === 0 && !isCreatingListHere && (
              <button
                onClick={() =>
                  startCreating(
                    { type: "list", projectId, folderId: folder.id },
                    projectId
                  )
                }
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar lista</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════════
     Collapsed sidebar
  ══════════════════════════════════════════════ */
  if (collapsed) {
    return (
      <aside className="w-16 h-full bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Expandir barra lateral"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "#2F3988" }}
        >
          A
        </div>
        <div className="flex-1" />
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
          <Settings className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  /* ══════════════════════════════════════════════
     Full sidebar
  ══════════════════════════════════════════════ */
  return (
    <aside className="w-[260px] h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2F3988, #7177B4)" }}
          >
            A
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              agenda.ME
            </div>
            <div className="text-[10px] text-gray-400 leading-tight">Plan Pro</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
          aria-label="Colapsar barra lateral"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Quick nav */}
        <div className="px-3 mb-1">
          <Link
            href={`/${workspace}/dashboard`}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname.endsWith("/dashboard")
                ? "bg-blue-50 text-brand-navy font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <LayoutDashboard className="w-4 h-4 text-gray-400" />
            <span>Inicio</span>
          </Link>
          <Link
            href={`/${workspace}/inbox`}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname.endsWith("/inbox")
                ? "bg-blue-50 text-brand-navy font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Inbox className="w-4 h-4 text-gray-400" />
            <span>Bandeja de entrada</span>
          </Link>
          <Link
            href={`/${workspace}/docs`}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
              pathname.includes("/docs")
                ? "bg-blue-50 text-brand-navy font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span>Documentos</span>
          </Link>
        </div>

        {/* Projects section header */}
        <div className="px-3 mt-4 mb-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Proyectos
            </span>
            <button
              onClick={() => startCreating({ type: "project" })}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Nuevo proyecto"
              title="Nuevo proyecto"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── New-project form (expanded) ── */}
        {creating?.type === "project" && (
          <div className="px-3 mb-2">
            <div className="border border-[#9ACCEC]/60 rounded-xl p-3 bg-blue-50/20 space-y-3">

              {/* Name + emoji */}
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowEmoji((p) => !p)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-base hover:border-gray-300 transition-colors"
                  >
                    {creatingIcon}
                  </button>
                  {showEmoji && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-[160px]">
                      {EMOJI_OPTIONS.map((e) => (
                        <button key={e} onClick={() => { setCreatingIcon(e); setShowEmoji(false); }}
                          className={cn("w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-gray-100 transition-colors",
                            creatingIcon === e && "bg-blue-100")}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={creatingName}
                  onChange={(e) => setCreatingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitCreating();
                    if (e.key === "Escape") cancelCreating();
                  }}
                  placeholder="Nombre del proyecto"
                  className="flex-1 text-sm text-gray-800 outline-none bg-transparent border-b border-gray-300 focus:border-[#9ACCEC] pb-0.5 placeholder:text-gray-400"
                />
              </div>

              {/* Visibility */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Visibilidad
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setCreatingIsPublic(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all",
                      creatingIsPublic
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    Público
                    {creatingIsPublic && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                  <button
                    onClick={() => setCreatingIsPublic(false)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all",
                      !creatingIsPublic
                        ? "bg-blue-50 border-[#2F3988]/30 text-[#2F3988]"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    Privado
                    {!creatingIsPublic && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                </div>
              </div>

              {/* Members — only shown when Private */}
              {!creatingIsPublic && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Miembros con acceso
                  </p>
                  <div className="space-y-1">
                    {members.length === 0 ? (
                      <p className="text-xs text-gray-400 px-1 py-2">No hay otros miembros en el workspace.</p>
                    ) : members.map((m) => {
                      const sel = creatingMemberIds.has(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() =>
                            setCreatingMemberIds((prev) => {
                              const next = new Set(prev);
                              sel ? next.delete(m.id) : next.add(m.id);
                              return next;
                            })
                          }
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-left",
                            sel ? "bg-blue-50 border-[#2F3988]/20" : "bg-white border-gray-100 hover:border-gray-200"
                          )}
                        >
                          <div className="flex-shrink-0">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt={m.name} className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                {m.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="flex-1 text-xs text-gray-700 font-medium truncate">{m.name}</span>
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all",
                            sel ? "bg-[#2F3988]" : "border-2 border-gray-300"
                          )}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {!creatingIsPublic && creatingMemberIds.size === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1.5 px-1">
                      ⚠ Selecciona al menos un miembro
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={submitCreating}
                  disabled={!creatingName.trim() || (!creatingIsPublic && creatingMemberIds.size === 0)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#2F3988" }}
                >
                  <Check className="w-3 h-3" />
                  Crear proyecto
                </button>
                <button
                  onClick={cancelCreating}
                  className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Projects tree ── */}
        <div className="px-3 space-y-0.5">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const lists = project.lists ?? [];
            const folders = project.folders ?? [];
            const hasChildren = lists.length > 0 || folders.length > 0;

            const isCreatingFolderHere =
              creating?.type === "folder" && creating.projectId === project.id;
            const isCreatingDirectListHere =
              creating?.type === "list" &&
              creating.projectId === project.id &&
              !creating.folderId;

            return (
              <div key={project.id}>
                {/* Project row */}
                <div className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                  {/* Name + expand toggle */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex-1 flex items-center gap-2 text-sm text-gray-700 min-w-0"
                  >
                    <span className="text-base leading-none flex-shrink-0">
                      {project.icon}
                    </span>
                    <span className="flex-1 text-left font-medium text-gray-700 truncate">
                      {project.name}
                    </span>
                    {hasChildren || isCreatingFolderHere || isCreatingDirectListHere ? (
                      isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      )
                    ) : null}
                  </button>

                  {/* "+" dropdown for carpeta / lista */}
                  <div
                    ref={(el) => {
                      if (projectMenu === project.id && el) {
                        menuContainerRef.current = el;
                      }
                    }}
                    className="relative flex-shrink-0"
                  >
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() =>
                        setProjectMenu(
                          projectMenu === project.id ? null : project.id
                        )
                      }
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all"
                      title="Agregar a proyecto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {projectMenu === project.id && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 w-44">
                        <button
                          onClick={() =>
                            startCreating(
                              { type: "folder", projectId: project.id },
                              project.id
                            )
                          }
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Folder className="w-3.5 h-3.5 text-[#2F3988]" />
                          <span>Nueva carpeta</span>
                        </button>
                        <button
                          onClick={() =>
                            startCreating(
                              { type: "list", projectId: project.id },
                              project.id
                            )
                          }
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#9ACCEC]" />
                          <span>Nueva lista</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded project contents */}
                {isExpanded && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
                    {/* Inline folder creation */}
                    {isCreatingFolderHere &&
                      renderInlineForm("Nombre de la carpeta")}

                    {/* Inline direct-list creation */}
                    {isCreatingDirectListHere &&
                      renderInlineForm("Nombre de la lista")}

                    {/* Folders */}
                    {folders.map((folder) =>
                      renderFolder(folder, project.id, project.icon)
                    )}

                    {/* Direct lists */}
                    {lists.map((list) => renderList(list, project.icon))}

                    {/* Empty project prompt */}
                    {folders.length === 0 &&
                      lists.length === 0 &&
                      !isCreatingFolderHere &&
                      !isCreatingDirectListHere && (
                        <button
                          onClick={() =>
                            startCreating(
                              { type: "list", projectId: project.id },
                              project.id
                            )
                          }
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agregar lista</span>
                        </button>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Messages */}
        <div className="px-3 mt-5 mb-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Mensajes
            </span>
            <Link
              href={`/${workspace}/messages`}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
              title="Nueva conversación"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div className="px-3 space-y-0.5">
          {members.length === 0 ? (
            <p className="px-2 py-2 text-xs text-gray-400">Sin miembros aún</p>
          ) : (
            members.map((member) => {
              const isActive = pathname.includes(`/messages/${member.id}`);
              return (
                <Link
                  key={member.id}
                  href={`/${workspace}/messages/${member.id}`}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-brand-navy font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="flex-1 truncate">{member.name}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="h-12 border-t border-gray-100 flex items-center px-4 gap-2">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4"
          alt="Mi perfil"
          className="w-7 h-7 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-700 truncate">Tú</div>
          <div className="text-[10px] text-gray-400 truncate">Admin</div>
        </div>
        <Link href={`/${workspace}/settings`}>
          <Settings className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </Link>
      </div>
    </aside>
  );
}
