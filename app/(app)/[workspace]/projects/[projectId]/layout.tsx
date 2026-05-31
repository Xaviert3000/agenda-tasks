"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, List, Calendar, Columns3,
  Search, SlidersHorizontal, Users, X, UserPlus, Check,
  AlertCircle, Clock, Globe, Lock, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import type { TaskFilters } from "@/lib/store/kanbanStore";
import { useProjectSettingsStore } from "@/lib/store/projectSettingsStore";
import { NewTaskButton } from "@/components/kanban/NewTaskButton";
import { cn } from "@/lib/utils";
import type { Assignee } from "@/types/domain";

const PRIORITY_OPTIONS = [
  { id: "urgent", label: "Urgente", color: "#EF4444" },
  { id: "high",   label: "Alta",    color: "#F97316" },
  { id: "med",    label: "Media",   color: "#3B82F6" },
  { id: "low",    label: "Baja",    color: "#9CA3AF" },
];

const VIEWS = [
  { id: "kanban",   label: "Kanban",     icon: Columns3   },
  { id: "board",    label: "Board",      icon: LayoutGrid },
  { id: "list",     label: "Lista",      icon: List       },
  { id: "calendar", label: "Calendario", icon: Calendar   },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams();
  const pathname = usePathname();

  const workspace = params.workspace as string;
  const listId    = params.projectId as string; // route param is actually the list ID

  const setLists       = useKanbanStore((s) => s.setLists);
  const setProjectMeta = useKanbanStore((s) => s.setProjectMeta);
  const searchQuery    = useKanbanStore((s) => s.searchQuery);
  const taskFilters    = useKanbanStore((s) => s.taskFilters);
  const setSearchQuery = useKanbanStore((s) => s.setSearchQuery);
  const setTaskFilters = useKanbanStore((s) => s.setTaskFilters);
  const clearFilters   = useKanbanStore((s) => s.clearFilters);

  // Real project data from Supabase
  const [projectName, setProjectName] = useState("Proyecto");
  const [projectIcon, setProjectIcon] = useState("📋");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // Get project via the list ID
      const { data: list } = await supabase
        .from("kanban_lists")
        .select("project_id")
        .eq("id", listId)
        .single();
      if (!list) return;
      const { data: proj } = await supabase
        .from("projects")
        .select("name, icon")
        .eq("id", list.project_id)
        .single();
      if (proj) {
        setProjectName(proj.name);
        setProjectIcon(proj.icon ?? "📋");
        setProjectMeta(proj.name, proj.icon ?? "📋");
      }
    })();
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real workspace members from Supabase
  const [workspaceMembers, setWorkspaceMembers] = useState<{ id: string; name: string; avatar: string; isOnline: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: ws } = await supabase
        .from("workspaces").select("id").eq("slug", workspace).single();
      if (!ws) return;
      const { data } = await supabase
        .from("workspace_members")
        .select("user_id, profiles(id, name, avatar_url)")
        .eq("workspace_id", ws.id);
      if (!data) return;
      setWorkspaceMembers(
        data.map((m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            id: p?.id ?? m.user_id,
            name: p?.name ?? "Usuario",
            avatar: p?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p?.name ?? "U"}`,
            isOnline: false,
          };
        })
      );
    })();
  }, [workspace]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentView = pathname.split("/").pop();

  /* ── Visibility ── */
  const isProjectPublic  = useProjectSettingsStore((s) => s.isProjectPublic);
  const setProjectPublic = useProjectSettingsStore((s) => s.setProjectPublic);
  const isPublic         = isProjectPublic(listId);
  const [showVisibility, setShowVisibility] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVisibility) return;
    const handler = (e: MouseEvent) => {
      if (!visibilityRef.current?.contains(e.target as Node)) setShowVisibility(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showVisibility]);

  /* ── Members (invite) ── */
  const [members, setMembers]           = useState<Assignee[]>([]);
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [justAdded, setJustAdded]       = useState<Set<string>>(new Set());
  const inviteModalRef  = useRef<HTMLDivElement>(null);
  const inviteSearchRef = useRef<HTMLInputElement>(null);

  /* ── Search bar ── */
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Filter panel ── */
  const [showFilter, setShowFilter] = useState(false);
  const [draft, setDraft]           = useState<TaskFilters>(taskFilters);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  /* Active filter count (excludes text search) */
  const activeFilterCount =
    taskFilters.priorities.length +
    taskFilters.assigneeIds.length +
    (taskFilters.overdue ? 1 : 0) +
    (taskFilters.dueSoon ? 1 : 0) +
    (taskFilters.assignedToMe ? 1 : 0);

  /* ── Reset on list change ── */
  useEffect(() => {
    setJustAdded(new Set());
    clearFilters();
    setShowSearch(false);
    setShowFilter(false);
  }, [listId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Search auto-focus ── */
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 60);
  }, [showSearch]);

  /* ── Sync draft when filter panel opens ── */
  useEffect(() => {
    if (showFilter) setDraft(taskFilters);
  }, [showFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Close filter panel on outside click ── */
  useEffect(() => {
    if (!showFilter) return;
    const handler = (e: MouseEvent) => {
      if (!filterPanelRef.current?.contains(e.target as Node)) {
        setTaskFilters(draft);
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilter, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Invite modal: outside click + ESC ── */
  useEffect(() => {
    if (!showInvite) return;
    const clickHandler = (e: MouseEvent) => {
      if (!inviteModalRef.current?.contains(e.target as Node)) setShowInvite(false);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowInvite(false); };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown",   keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown",   keyHandler);
    };
  }, [showInvite]);

  /* ── Focus invite search ── */
  useEffect(() => {
    if (showInvite) {
      setInviteSearch("");
      setTimeout(() => inviteSearchRef.current?.focus(), 80);
    }
  }, [showInvite]);

  /* ── Helpers ── */
  const togglePriority = (id: string) =>
    setDraft((d) => ({
      ...d,
      priorities: d.priorities.includes(id)
        ? d.priorities.filter((p) => p !== id)
        : [...d.priorities, id],
    }));

  const toggleAssignee = (id: string) =>
    setDraft((d) => ({
      ...d,
      assigneeIds: d.assigneeIds.includes(id)
        ? d.assigneeIds.filter((a) => a !== id)
        : [...d.assigneeIds, id],
    }));

  const clearDraft = (): TaskFilters => ({
    priorities: [], assigneeIds: [],
    overdue: false, dueSoon: false, assignedToMe: false,
  });

  const memberIds = new Set(members.map((m) => m.id));
  const filteredCandidates = workspaceMembers.filter((wm) =>
    wm.name.toLowerCase().includes(inviteSearch.toLowerCase())
  );

  const handleToggleMember = (wm: { id: string; name: string; avatar: string }) => {
    if (memberIds.has(wm.id)) {
      setMembers((prev) => prev.filter((m) => m.id !== wm.id));
      setJustAdded((prev) => { const n = new Set(prev); n.delete(wm.id); return n; });
    } else {
      const newMember: Assignee = { id: wm.id, name: wm.name, avatar: wm.avatar };
      setMembers((prev) => [...prev, newMember]);
      setJustAdded((prev) => new Set([...prev, wm.id]));
    }
  };

  /* ══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full">

      {/* ── Project header ── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{projectIcon}</span>
          <h1 className="text-lg font-bold text-gray-900">{projectName}</h1>

          {/* ── Visibility badge ── */}
          <div ref={visibilityRef} className="relative">
            <button
              onClick={() => setShowVisibility((p) => !p)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all",
                isPublic
                  ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                  : "border-[#2F3988]/20 text-[#2F3988] bg-blue-50 hover:bg-blue-100"
              )}
            >
              {isPublic
                ? <Globe className="w-3 h-3" />
                : <Lock className="w-3 h-3" />}
              {isPublic ? "Público" : "Privado"}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showVisibility && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-64 p-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1.5">
                  Visibilidad
                </p>

                {/* Public option */}
                <button
                  onClick={() => { setProjectPublic(listId, true); setShowVisibility(false); }}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                    isPublic ? "bg-green-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Público</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                      Cualquier persona con el enlace puede ver este proyecto
                    </p>
                  </div>
                  {isPublic && <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />}
                </button>

                {/* Private option */}
                <button
                  onClick={() => { setProjectPublic(listId, false); setShowVisibility(false); }}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                    !isPublic ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5 text-[#2F3988]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Privado</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                      Solo los miembros invitados pueden acceder a este proyecto
                    </p>
                  </div>
                  {!isPublic && <Check className="w-4 h-4 text-[#2F3988] flex-shrink-0 mt-1" />}
                </button>
              </div>
            )}
          </div>

          {/* Avatar stack */}
          <div className="flex -space-x-2 ml-2">
            {members.slice(0, 5).map((member) => (
              <img key={member.id} src={member.avatar} alt={member.name} title={member.name}
                className="w-7 h-7 rounded-full border-2 border-white" />
            ))}
            {members.length > 5 && (
              <span className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white text-xs flex items-center justify-center font-semibold text-gray-600">
                +{members.length - 5}
              </span>
            )}
          </div>

          {/* Invite button + modal */}
          <div className="relative">
            <button
              onClick={() => setShowInvite((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:text-[#2F3988] hover:bg-blue-50 border border-gray-200 hover:border-[#2F3988]/30 transition-all ml-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invitar</span>
            </button>

            {showInvite && (
              <div ref={inviteModalRef}
                className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-[320px]">
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2F3988]" />
                    <span className="text-sm font-bold text-gray-800">Miembros del proyecto</span>
                  </div>
                  <button onClick={() => setShowInvite(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input ref={inviteSearchRef} type="text" placeholder="Buscar miembro..."
                      value={inviteSearch} onChange={(e) => setInviteSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#9ACCEC] focus:bg-white transition-colors" />
                  </div>
                </div>
                <div className="px-2 pb-2 max-h-56 overflow-y-auto space-y-0.5">
                  {filteredCandidates.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">
                        {workspaceMembers.length === 0 ? "Sin miembros en el workspace aún" : "Sin resultados"}
                      </p>
                    : filteredCandidates.map((wm) => {
                        const isIn = memberIds.has(wm.id);
                        return (
                          <button key={wm.id} onClick={() => handleToggleMember(wm)}
                            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                              isIn ? "bg-blue-50/60 hover:bg-blue-100/60" : "hover:bg-gray-50")}>
                            <div className="relative flex-shrink-0">
                              <img src={wm.avatar} alt={wm.name} className="w-8 h-8 rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{wm.name}</p>
                            </div>
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                              isIn ? "bg-[#2F3988] text-white" : "border-2 border-gray-300")}>
                              {isIn && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">{members.length} miembro{members.length !== 1 ? "s" : ""}</p>
                  <button onClick={() => setShowInvite(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "#2F3988" }}>
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <NewTaskButton />
      </div>

      {/* ── View tabs + search / filter ── */}
      <div className="flex items-center justify-between px-6 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center">
          {VIEWS.map((view) => {
            const Icon     = view.icon;
            const isActive = currentView === view.id;
            return (
              <Link key={view.id}
                href={`/${workspace}/projects/${listId}/${view.id}`}
                className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive ? "border-[#2F3988] text-[#2F3988]" : "border-transparent text-gray-500 hover:text-gray-700")}>
                <Icon className="w-4 h-4" />
                {view.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 py-2">
          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-[#9ACCEC] rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearchQuery(""); setShowSearch(false); }
                }}
                placeholder="Buscar tareas..."
                className="text-xs text-gray-800 outline-none bg-transparent w-44 placeholder:text-gray-400"
              />
              <button onClick={() => { setSearchQuery(""); setShowSearch(false); }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                searchQuery ? "bg-[#2F3988]/10 text-[#2F3988] font-medium" : "text-gray-600 bg-gray-100 hover:bg-gray-200")}>
              <Search className="w-3.5 h-3.5" />
              Buscar
              {searchQuery && (
                <span className="ml-1 text-[10px] bg-[#2F3988] text-white rounded-full px-1 py-0.5 leading-none">1</span>
              )}
            </button>
          )}

          {/* Filter */}
          <div ref={filterPanelRef} className="relative">
            <button
              onClick={() => setShowFilter((p) => !p)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                activeFilterCount > 0 ? "bg-[#2F3988]/10 text-[#2F3988] font-medium" : "text-gray-600 bg-gray-100 hover:bg-gray-200")}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="ml-1 text-[10px] bg-[#2F3988] text-white rounded-full px-1.5 py-0.5 leading-none font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-72">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-800">Filtrar tareas</span>
                  {(draft.priorities.length > 0 || draft.assigneeIds.length > 0 || draft.overdue || draft.dueSoon || draft.assignedToMe) && (
                    <button onClick={() => setDraft(clearDraft())}
                      className="text-[11px] text-red-500 hover:underline font-medium">
                      Limpiar todo
                    </button>
                  )}
                </div>

                {/* Priority */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prioridad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITY_OPTIONS.map((p) => {
                      const active = draft.priorities.includes(p.id);
                      return (
                        <button key={p.id} onClick={() => togglePriority(p.id)}
                          className={cn("px-2.5 py-1 rounded-full text-xs font-semibold transition-all border",
                            active ? "text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300")}
                          style={active ? { background: p.color, borderColor: p.color } : {}}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assignees */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Asignado a</p>
                  <div className="space-y-1">
                    {workspaceMembers.length === 0
                      ? <p className="text-xs text-gray-400 px-2 py-1">Sin miembros aún</p>
                      : workspaceMembers.map((m) => {
                          const active = draft.assigneeIds.includes(m.id);
                          return (
                            <button key={m.id} onClick={() => toggleAssignee(m.id)}
                              className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all",
                                active ? "bg-blue-50 text-[#2F3988]" : "hover:bg-gray-50 text-gray-700")}>
                              <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                              <span className="text-xs flex-1 text-left font-medium">{m.name}</span>
                              {active && <Check className="w-3.5 h-3.5 text-[#2F3988]" />}
                            </button>
                          );
                        })
                    }
                  </div>
                </div>

                {/* Date / status */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Estado / Fecha</p>
                  <div className="space-y-1.5">
                    {([
                      { key: "overdue"      as const, label: "Vencidas",       icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" /> },
                      { key: "dueSoon"      as const, label: "Vence pronto",   icon: <Clock className="w-3.5 h-3.5 text-amber-400" /> },
                      { key: "assignedToMe" as const, label: "Asignadas a mí", icon: <Users className="w-3.5 h-3.5 text-[#2F3988]" /> },
                    ] as const).map(({ key, label, icon }) => (
                      <button key={key} onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
                        className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all",
                          draft[key] ? "bg-blue-50" : "hover:bg-gray-50")}>
                        {icon}
                        <span className={cn("text-xs flex-1 text-left font-medium", draft[key] ? "text-[#2F3988]" : "text-gray-700")}>
                          {label}
                        </span>
                        <div className={cn("w-4 h-4 rounded flex items-center justify-center transition-all",
                          draft[key] ? "bg-[#2F3988]" : "border-2 border-gray-300")}>
                          {draft[key] && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => { setTaskFilters(draft); setShowFilter(false); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#2F3988" }}>
                    Aplicar filtros
                  </button>
                  <button
                    onClick={() => { clearFilters(); setDraft(clearDraft()); setShowFilter(false); }}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                    Limpiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
