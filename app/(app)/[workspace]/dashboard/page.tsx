import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Paperclip,
  MessageSquare,
  ChevronRight,
  Flame,
} from "lucide-react";
import { MOCK_LISTS, WORKSPACE_MEMBERS, SIDEBAR_PROJECTS } from "@/lib/data/mockData";

interface Props {
  params: Promise<{ workspace: string }>;
}

const ACTIVITY = [
  {
    id: "a1",
    user: { name: "Michael Anderson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc" },
    action: "completó",
    target: "Corrección de bug en cálculo de descuentos",
    time: "Hace 5 min",
    icon: "✅",
  },
  {
    id: "a2",
    user: { name: "Sofía Carter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4" },
    action: "comentó en",
    target: "Integración con pasarela de pagos Stripe",
    time: "Hace 23 min",
    icon: "💬",
  },
  {
    id: "a3",
    user: { name: "Daniel Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel&backgroundColor=c0aede" },
    action: "movió a En Revisión",
    target: "Pruebas de rendimiento y optimización de imágenes",
    time: "Hace 1h",
    icon: "↗️",
  },
  {
    id: "a4",
    user: { name: "Emma Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffdfbf" },
    action: "adjuntó archivo en",
    target: "Página de confirmación de pedido",
    time: "Hace 2h",
    icon: "📎",
  },
  {
    id: "a5",
    user: { name: "Carlos Ramírez", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos&backgroundColor=d1d4f9" },
    action: "creó",
    target: "Panel de administración de inventario",
    time: "Hace 3h",
    icon: "➕",
  },
];

export default async function DashboardPage({ params }: Props) {
  const { workspace } = await params;

  const allTasks = MOCK_LISTS.flatMap((l) => l.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = MOCK_LISTS.find((l) => l.id === "done")?.tasks.length ?? 0;
  const inProgressTasks = MOCK_LISTS.find((l) => l.id === "in-progress")?.tasks.length ?? 0;
  const overdueTasks = allTasks.filter((t) => t.isOverdue).length;
  const myTasks = allTasks.filter((t) => t.isAssignedToMe);
  const dueSoonTasks = allTasks.filter((t) => t.isDueSoon);

  const progressPct = Math.round((completedTasks / totalTasks) * 100);

  const STATS = [
    {
      label: "Total de tareas",
      value: totalTasks,
      icon: TrendingUp,
      color: "#2F3988",
      bg: "#EEF0FB",
    },
    {
      label: "Completadas",
      value: completedTasks,
      icon: CheckCircle2,
      color: "#22C55E",
      bg: "#DCFCE7",
    },
    {
      label: "En progreso",
      value: inProgressTasks,
      icon: Clock,
      color: "#3B82F6",
      bg: "#DBEAFE",
    },
    {
      label: "Vencidas",
      value: overdueTasks,
      icon: AlertCircle,
      color: "#EF4444",
      bg: "#FEE2E2",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Buenos días 👋
        </h1>
        <p className="text-sm text-gray-500">
          Aquí está el resumen de <span className="font-medium text-gray-700">agenda.ME</span> de hoy.
        </p>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: stat.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress general */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Progreso general del proyecto</h2>
              <p className="text-xs text-gray-500 mt-0.5">E-Commerce Website</p>
            </div>
            <span className="text-2xl font-bold" style={{ color: "#2F3988" }}>{progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #2F3988, #9ACCEC)" }}
            />
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              {completedTasks} completadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-info inline-block" />
              {inProgressTasks} en progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
              {totalTasks - completedTasks - inProgressTasks} pendientes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Mis tareas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: "#2F3988" }} />
                <h2 className="text-sm font-semibold text-gray-800">Mis tareas</h2>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                  {myTasks.length}
                </span>
              </div>
              <Link
                href={`/${workspace}/projects/ecommerce-website/kanban`}
                className="text-xs font-medium flex items-center gap-0.5 transition-colors"
                style={{ color: "#2F3988" }}
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {myTasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-gray-400">
                  Sin tareas asignadas 🎉
                </div>
              ) : (
                myTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background:
                          task.listId === "done"
                            ? "#22C55E"
                            : task.listId === "in-progress"
                            ? "#3B82F6"
                            : task.listId === "review"
                            ? "#F59E0B"
                            : "#EF4444",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                        {task.dueDate && (
                          <span className={task.isOverdue ? "text-danger" : task.isDueSoon ? "text-warning" : ""}>
                            {task.isDueSoon ? "Vence pronto" : task.isOverdue ? "Vencida" : ""}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />{task.attachmentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />{task.commentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Actividad reciente</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <img
                    src={item.user.avatar}
                    alt={item.user.name}
                    className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-medium">{item.user.name}</span>{" "}
                      <span className="text-gray-500">{item.action}</span>{" "}
                      <span className="font-medium text-gray-800">«{item.target}»</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Proyectos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Proyectos activos</h2>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {SIDEBAR_PROJECTS.map((project) => (
              <Link
                key={project.id}
                href={
                  project.lists?.[0]?.id
                    ? `/${workspace}/projects/${project.lists[0].id}/kanban`
                    : `/${workspace}/dashboard`
                }
                className="flex flex-col gap-2 p-5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{project.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{project.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(project.lists?.length ?? 0) + (project.folders?.length ?? 0)} listas
                  </p>
                </div>
                <div className="mt-1 flex -space-x-1.5">
                  {WORKSPACE_MEMBERS.slice(0, 3).map((m) => (
                    <img
                      key={m.id}
                      src={m.avatar}
                      alt={m.name}
                      className="w-5 h-5 rounded-full border border-white"
                    />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
