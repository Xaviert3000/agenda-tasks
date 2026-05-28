"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bell, CheckCheck, Filter, Archive, ExternalLink,
  UserPlus, MessageSquare, Clock, CheckCircle2, GitPullRequest,
  AlertTriangle, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKanbanStore } from "@/lib/store/kanbanStore";

/* ── Types ── */
type NotifType = "assignment" | "mention" | "comment" | "due" | "status" | "review" | "overdue";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  preview: string;
  body: string;
  time: string;
  isRead: boolean;
  isArchived?: boolean;
  avatar?: string;
  project: string;
  projectId: string;   // route param for the kanban page
  taskId: string;      // task ID in the Zustand store
  taskTitle: string;
  taskPriority?: "urgent" | "high" | "med" | "low";
  detail?: string;
}

/* ── Mock data ── */
const INITIAL_NOTIFS: Notification[] = [
  {
    id: "n1", type: "assignment",
    title: "Te asignaron una tarea",
    preview: "Michael Anderson te asignó «Sistema de filtros…»",
    body: "Michael Anderson te asignó la tarea «Sistema de filtros avanzados para catálogo» en el proyecto E-Commerce Website.",
    time: "Hace 5 min", isRead: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t4",
    taskTitle: "Sistema de filtros avanzados para catálogo", taskPriority: "high",
  },
  {
    id: "n2", type: "mention",
    title: "Te mencionaron en un comentario",
    preview: "Sofía Carter te mencionó en «Integración Stripe»",
    body: "Sofía Carter te mencionó en un comentario de «Integración con pasarela de pagos Stripe».",
    detail: "«@Tú ¿puedes revisar el webhook de eventos `payment_intent.succeeded`? Creo que hay un edge case cuando el monto es 0.»",
    time: "Hace 23 min", isRead: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t2",
    taskTitle: "Integración con pasarela de pagos Stripe", taskPriority: "urgent",
  },
  {
    id: "n3", type: "due",
    title: "Tarea próxima a vencer",
    preview: "«Componentes de tarjeta responsive» vence mañana",
    body: "La tarea «Componentes de tarjeta de producto responsive» vence mañana. Asegúrate de terminarla a tiempo.",
    time: "Hace 1h", isRead: false,
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t5",
    taskTitle: "Componentes de tarjeta de producto responsive",
    taskPriority: "med",
  },
  {
    id: "n4", type: "comment",
    title: "Nuevo comentario",
    preview: "Emma Wilson comentó en «Bug en descuentos»",
    body: "Emma Wilson agregó un comentario en «Corrección de bug en cálculo de descuentos».",
    detail: "«Acabo de reproducir el bug. Ocurre cuando se aplica un cupón del 100% sobre un producto con envío gratis. La función `applyDiscount()` retorna -0.00 en lugar de 0.»",
    time: "Hace 2h", isRead: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffdfbf",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t7",
    taskTitle: "Corrección de bug en cálculo de descuentos", taskPriority: "urgent",
  },
  {
    id: "n5", type: "status",
    title: "Tarea completada",
    preview: "Carlos Ramírez completó «Bug en descuentos»",
    body: "Carlos Ramírez marcó como completada la tarea «Corrección de bug en cálculo de descuentos».",
    time: "Hace 3h", isRead: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos&backgroundColor=d1d4f9",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t7",
    taskTitle: "Corrección de bug en cálculo de descuentos",
  },
  {
    id: "n6", type: "review",
    title: "Solicitud de revisión",
    preview: "Daniel Johnson solicita tu revisión del PR #42",
    body: "Daniel Johnson solicita que revises el Pull Request #42 «feat: advanced catalog filters».",
    detail: "«Implementé los filtros de precio con debounce de 300ms. También agregué tests unitarios para los casos edge. Necesito tu aprobación antes del viernes.»",
    time: "Hace 4h", isRead: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel&backgroundColor=c0aede",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t4",
    taskTitle: "Sistema de filtros avanzados para catálogo", taskPriority: "high",
  },
  {
    id: "n7", type: "overdue",
    title: "Tarea vencida",
    preview: "«Integración con Stripe» venció ayer",
    body: "La tarea «Integración con pasarela de pagos Stripe» venció ayer y aún está en progreso.",
    time: "Hace 5h", isRead: true,
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t2",
    taskTitle: "Integración con pasarela de pagos Stripe", taskPriority: "urgent",
  },
  {
    id: "n8", type: "assignment",
    title: "Nueva tarea en tu proyecto",
    preview: "Se creó «Optimización de imágenes WebP»",
    body: "Se creó una nueva tarea «Pruebas de rendimiento y optimización de imágenes» y fue asignada a tu proyecto.",
    time: "Ayer", isRead: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc",
    project: "E-Commerce Website", projectId: "ecommerce-website", taskId: "t9",
    taskTitle: "Pruebas de rendimiento y optimización de imágenes", taskPriority: "high",
  },
];

/* ── Icon + color per type ── */
const TYPE_CFG: Record<NotifType, { Icon: React.ElementType; color: string; bg: string; label: string }> = {
  assignment: { Icon: UserPlus,       color: "#3B82F6", bg: "#EFF6FF", label: "Asignación"  },
  mention:    { Icon: MessageSquare,  color: "#8B5CF6", bg: "#F5F3FF", label: "Mención"     },
  comment:    { Icon: MessageSquare,  color: "#6B7280", bg: "#F9FAFB", label: "Comentario"  },
  due:        { Icon: Clock,          color: "#F59E0B", bg: "#FFFBEB", label: "Vencimiento" },
  status:     { Icon: CheckCircle2,   color: "#22C55E", bg: "#F0FDF4", label: "Estado"      },
  review:     { Icon: GitPullRequest, color: "#EC4899", bg: "#FDF2F8", label: "Revisión"    },
  overdue:    { Icon: AlertTriangle,  color: "#EF4444", bg: "#FEF2F2", label: "Vencida"     },
};

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  urgent: { label: "Urgente", cls: "bg-red-100 text-red-600"    },
  high:   { label: "Alta",    cls: "bg-orange-100 text-orange-600" },
  med:    { label: "Media",   cls: "bg-blue-100 text-blue-600"  },
  low:    { label: "Baja",    cls: "bg-gray-100 text-gray-500"  },
};

type FilterType = "all" | "unread" | "assignment" | "mention" | "comment" | "due" | "review";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",        label: "Todo"        },
  { id: "unread",     label: "No leídas"   },
  { id: "assignment", label: "Asignaciones"},
  { id: "mention",    label: "Menciones"   },
  { id: "comment",    label: "Comentarios" },
  { id: "review",     label: "Revisiones"  },
];

/* ── Filter panel options ── */
interface FilterOptions {
  readStatus: "all" | "unread" | "read";
  types: NotifType[];
  projects: string[];
}
const DEFAULT_FILTER_OPTIONS: FilterOptions = { readStatus: "all", types: [], projects: [] };
const ALL_PROJECTS = ["E-Commerce Website", "Diseño Gráfico", "App Móvil", "Landing Page"];

/* ══════════════════════════════════════════════ */
export default function InboxPage() {
  const params    = useParams();
  const workspace = params.workspace as string;

  const moveTask = useKanbanStore((s) => s.moveTask);

  const [notifs,   setNotifs]   = useState<Notification[]>(INITIAL_NOTIFS);
  const [selected, setSelected] = useState<Notification | null>(notifs[0]);
  const [filter,   setFilter]   = useState<FilterType>("all");
  // Track tasks marked as done from this panel
  const [doneTaskIds, setDoneTaskIds] = useState<Set<string>>(new Set());

  /* ── Filter panel ── */
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterOpts, setFilterOpts] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node) &&
        filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)
      ) setShowFilterPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleType = (t: NotifType) =>
    setFilterOpts((prev) => ({
      ...prev,
      types: prev.types.includes(t) ? prev.types.filter((x) => x !== t) : [...prev.types, t],
    }));

  const toggleProject = (p: string) =>
    setFilterOpts((prev) => ({
      ...prev,
      projects: prev.projects.includes(p) ? prev.projects.filter((x) => x !== p) : [...prev.projects, p],
    }));

  const resetFilters = () => setFilterOpts(DEFAULT_FILTER_OPTIONS);
  const activeFilterCount =
    (filterOpts.readStatus !== "all" ? 1 : 0) +
    filterOpts.types.length +
    filterOpts.projects.length;

  const visible = notifs.filter((n) => {
    if (n.isArchived) return false;
    // Tab filter
    if (filter === "unread" && n.isRead) return false;
    if (filter !== "all" && filter !== "unread") {
      if (!(n.type === filter || (filter === "due" && (n.type === "due" || n.type === "overdue")))) return false;
    }
    // Panel filter: read status
    if (filterOpts.readStatus === "unread" && n.isRead)  return false;
    if (filterOpts.readStatus === "read"   && !n.isRead) return false;
    // Panel filter: types
    if (filterOpts.types.length > 0 && !filterOpts.types.includes(n.type)) return false;
    // Panel filter: projects
    if (filterOpts.projects.length > 0 && !filterOpts.projects.includes(n.project)) return false;
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.isRead && !n.isArchived).length;

  const markRead = (id: string) =>
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const archive = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n)));
    if (selected?.id === id) setSelected(null);
  };

  const markTaskDone = (taskId: string) => {
    moveTask(taskId, "done");
    setDoneTaskIds((prev) => new Set([...prev, taskId]));
  };

  const selectNotif = (notif: Notification) => {
    setSelected(notif);
    if (!notif.isRead) markRead(notif.id);
  };

  /* ── Detail panel ── */
  const renderDetail = () => {
    if (!selected) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Bell className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">Selecciona una notificación</p>
          <p className="text-xs text-gray-400">Haz click en cualquier elemento de la lista para ver los detalles</p>
        </div>
      );
    }

    const cfg  = TYPE_CFG[selected.type];
    const Icon = cfg.Icon;
    const pCfg = selected.taskPriority ? PRIORITY_LABEL[selected.taskPriority] : null;

    return (
      <div className="flex flex-col h-full">
        {/* Detail header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
              <Icon className="w-4.5 h-4.5" style={{ color: cfg.color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{selected.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{selected.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!selected.isRead && (
              <button
                onClick={() => markRead(selected.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                title="Marcar como leída"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Leída</span>
              </button>
            )}
            <button
              onClick={() => archive(selected.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archivar</span>
            </button>
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detail body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Avatar + body */}
          <div className="flex gap-3">
            {selected.avatar ? (
              <img src={selected.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">{selected.body}</p>
              {selected.detail && (
                <blockquote className="mt-3 border-l-2 border-gray-200 pl-3 text-xs text-gray-500 italic leading-relaxed">
                  {selected.detail}
                </blockquote>
              )}
            </div>
          </div>

          {/* Task card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{selected.project}</p>
              {pCfg && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", pCfg.cls)}>
                  {pCfg.label}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-snug">{selected.taskTitle}</p>

            <div className="flex items-center gap-2 mt-3">
              {/* Ir a la tarea → navigates to the kanban board */}
              <Link
                href={`/${workspace}/projects/${selected.projectId}/kanban?name=${encodeURIComponent(selected.taskTitle)}&icon=🛍️`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90 active:scale-95"
                style={{ background: "#2F3988" }}
              >
                <ExternalLink className="w-3 h-3" />
                Ir a la tarea
              </Link>

              {/* Marcar como hecha → moves task to "done" in Zustand store */}
              {doneTaskIds.has(selected.taskId) ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-3 h-3" />
                  ¡Marcada como hecha!
                </span>
              ) : (
                <button
                  onClick={() => markTaskDone(selected.taskId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-green-300 hover:text-green-600 transition-colors active:scale-95"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Marcar como hecha
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-700" />
          <h1 className="text-base font-bold text-gray-900">Bandeja de entrada</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-white rounded-full px-2 py-0.5" style={{ background: "#2F3988" }}>
              {unreadCount} nuevas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* ── Filtrar button + dropdown ── */}
          <div className="relative">
            <button
              ref={filterBtnRef}
              onClick={() => setShowFilterPanel((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                showFilterPanel || activeFilterCount > 0
                  ? "bg-[#2F3988]/5 border-[#2F3988]/30 text-[#2F3988]"
                  : "text-gray-600 hover:bg-gray-100 border-gray-200"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-[#2F3988] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilterPanel && (
              <div
                ref={filterPanelRef}
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-4 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-800">Filtros</p>
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-[11px] text-[#2F3988] hover:underline font-medium">
                      Limpiar todo
                    </button>
                  )}
                </div>

                {/* Read status */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Estado</p>
                  <div className="space-y-1">
                    {(["all", "unread", "read"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterOpts((p) => ({ ...p, readStatus: s }))}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                          filterOpts.readStatus === s ? "bg-[#2F3988]/8 text-[#2F3988] font-semibold" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <span>{s === "all" ? "Todas" : s === "unread" ? "No leídas" : "Leídas"}</span>
                        {filterOpts.readStatus === s && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Types */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo</p>
                  <div className="space-y-1">
                    {(Object.entries(TYPE_CFG) as [NotifType, typeof TYPE_CFG[NotifType]][]).map(([type, cfg]) => {
                      const Icon = cfg.Icon;
                      const active = filterOpts.types.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                            active ? "bg-[#2F3988]/8 text-[#2F3988] font-semibold" : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? "#2F3988" : cfg.color }} />
                          <span className="flex-1 text-left">{cfg.label}</span>
                          {active && <Check className="w-3 h-3 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Proyecto</p>
                  <div className="space-y-1">
                    {ALL_PROJECTS.map((p) => {
                      const active = filterOpts.projects.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => toggleProject(p)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                            active ? "bg-[#2F3988]/8 text-[#2F3988] font-semibold" : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <span className="truncate text-left">{p}</span>
                          {active && <Check className="w-3 h-3 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Apply */}
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="w-full py-2 bg-[#2F3988] hover:bg-[#3d4aa8] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Aplicar filtros
                </button>
              </div>
            )}
          </div>

          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: notification list ── */}
        <div className="w-[360px] flex-shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto flex-shrink-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                  filter === f.id
                    ? "bg-[#2F3988] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <CheckCircle2 className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-sm font-medium text-gray-400">Todo al día 🎉</p>
                <p className="text-xs text-gray-300 mt-1">No hay notificaciones en esta categoría</p>
              </div>
            ) : (
              visible.map((notif) => {
                const cfg  = TYPE_CFG[notif.type];
                const Icon = cfg.Icon;
                const isSelected = selected?.id === notif.id;

                return (
                  <button
                    key={notif.id}
                    onClick={() => selectNotif(notif)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50",
                      !notif.isRead && !isSelected && "bg-white"
                    )}
                  >
                    {/* Avatar / icon */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {notif.avatar ? (
                        <img src={notif.avatar} alt="" className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: cfg.bg }}>
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                      )}
                      {/* Type badge */}
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white"
                        style={{ background: cfg.color }}
                      >
                        <Icon className="w-2 h-2 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span className={cn("text-xs leading-snug line-clamp-1",
                          notif.isRead ? "font-medium text-gray-600" : "font-bold text-gray-900"
                        )}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">{notif.preview}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">{notif.project}</p>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: "#2F3988" }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: detail panel ── */}
        <div className="flex-1 overflow-hidden bg-white">
          {renderDetail()}
        </div>
      </div>
    </div>
  );
}
