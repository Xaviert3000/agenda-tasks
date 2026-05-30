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
  FolderPlus,
  Users,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ workspace: string }>;
}

function EmptyDashboard({ workspace }: { workspace: string }) {
  const steps = [
    {
      icon: FolderPlus,
      title: "Crea tu primer proyecto",
      description: "Organiza tu trabajo en proyectos con listas, tareas y fechas límite.",
      href: `/${workspace}/dashboard?newProject=1`,
      cta: "Nuevo proyecto",
      color: "#2F3988",
      bg: "#EEF0FB",
    },
    {
      icon: Users,
      title: "Invita a tu equipo",
      description: "Colabora en tiempo real con los miembros de tu equipo.",
      href: `/${workspace}/settings`,
      cta: "Invitar miembros",
      color: "#22C55E",
      bg: "#DCFCE7",
    },
    {
      icon: Sparkles,
      title: "Explora las funciones",
      description: "Kanban, calendario, documentos y mensajes integrados.",
      href: `/${workspace}/docs`,
      cta: "Ver guía",
      color: "#8B5CF6",
      bg: "#EDE9FE",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="px-8 pt-8 pb-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido 👋</h1>
        <p className="text-sm text-gray-500">
          Tu espacio <span className="font-medium text-gray-700">{workspace}</span> está listo. Empieza por aquí.
        </p>
      </div>

      <div className="flex-1 px-8 py-10 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 mb-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#EEF0FB" }}>
              <Sparkles className="w-10 h-10" style={{ color: "#2F3988" }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tu espacio está vacío</h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Aún no tienes proyectos ni tareas. Sigue los pasos a continuación para comenzar a usar agenda.ME.
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: step.bg }}>
                    <Icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Paso {i + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                  <Link
                    href={step.href}
                    className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    style={{ background: step.bg, color: step.color }}
                  >
                    {step.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({ params }: Props) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch workspace by slug
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) return <EmptyDashboard workspace={workspaceSlug} />;

  // Fetch projects for this workspace
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, icon")
    .eq("workspace_id", workspace.id)
    .order("created_at");

  if (!projects || projects.length === 0) return <EmptyDashboard workspace={workspaceSlug} />;

  const projectIds = projects.map((p) => p.id);

  // Fetch kanban lists for all projects
  const { data: lists } = await supabase
    .from("kanban_lists")
    .select("id, name, color, project_id")
    .in("project_id", projectIds);

  const listIds = (lists ?? []).map((l) => l.id);

  // Fetch tasks
  const { data: tasks } = listIds.length
    ? await supabase
        .from("tasks")
        .select("id, title, list_id, is_completed, due_date, attachment_count, comment_count")
        .in("list_id", listIds)
    : { data: [] };

  const allTasks = tasks ?? [];
  const today = new Date().toISOString().split("T")[0];

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.is_completed).length;
  const overdueTasks = allTasks.filter(
    (t) => !t.is_completed && t.due_date && t.due_date < today
  ).length;
  const inProgressTasks = totalTasks - completedTasks - overdueTasks;

  // My tasks (assigned to current user)
  let myTaskIds: string[] = [];
  if (user && allTasks.length > 0) {
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", user.id)
      .in("task_id", allTasks.map((t) => t.id));
    myTaskIds = (assignees ?? []).map((a) => a.task_id);
  }

  const myTasks = allTasks.filter((t) => myTaskIds.includes(t.id));
  const dueSoonTasks = myTasks.filter(
    (t) => t.due_date && t.due_date >= today && t.due_date <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
  );

  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workspace members
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profiles(id, name, avatar_url)")
    .eq("workspace_id", workspace.id)
    .limit(5);

  const STATS = [
    { label: "Total de tareas", value: totalTasks, icon: TrendingUp, color: "#2F3988", bg: "#EEF0FB" },
    { label: "Completadas", value: completedTasks, icon: CheckCircle2, color: "#22C55E", bg: "#DCFCE7" },
    { label: "En progreso", value: inProgressTasks, icon: Clock, color: "#3B82F6", bg: "#DBEAFE" },
    { label: "Vencidas", value: overdueTasks, icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2" },
  ];

  const listMap = Object.fromEntries((lists ?? []).map((l) => [l.id, l]));

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Buenos días 👋</h1>
        <p className="text-sm text-gray-500">
          Aquí está el resumen de{" "}
          <span className="font-medium text-gray-700">{workspace.name}</span> de hoy.
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Progreso general */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Progreso general del workspace</h2>
              <p className="text-xs text-gray-500 mt-0.5">{projects.length} proyecto{projects.length !== 1 ? "s" : ""} activo{projects.length !== 1 ? "s" : ""}</p>
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
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {completedTasks} completadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              {inProgressTasks} en progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
              {overdueTasks} vencidas
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
            </div>
            <div className="divide-y divide-gray-50">
              {myTasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-gray-400">
                  Sin tareas asignadas 🎉
                </div>
              ) : (
                myTasks.slice(0, 5).map((task) => {
                  const list = listMap[task.list_id];
                  const isOverdue = !task.is_completed && task.due_date && task.due_date < today;
                  const isDueSoon = !isOverdue && task.due_date && task.due_date <= new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                  return (
                    <div key={task.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: list?.color ?? "#6B7280" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                          {isOverdue && <span className="text-red-500">Vencida</span>}
                          {isDueSoon && !isOverdue && <span className="text-amber-500">Vence pronto</span>}
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />{task.attachment_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />{task.comment_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Proyectos activos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Proyectos activos</h2>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                {projects.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {projects.slice(0, 5).map((project) => {
                const projectLists = (lists ?? []).filter((l) => l.project_id === project.id);
                const projectTasks = allTasks.filter((t) =>
                  projectLists.some((l) => l.id === t.list_id)
                );
                const projectCompleted = projectTasks.filter((t) => t.is_completed).length;
                const projectPct = projectTasks.length > 0
                  ? Math.round((projectCompleted / projectTasks.length) * 100)
                  : 0;
                const firstList = projectLists[0];
                return (
                  <Link
                    key={project.id}
                    href={firstList ? `/${workspaceSlug}/projects/${firstList.id}/kanban` : `/${workspaceSlug}/dashboard`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xl flex-shrink-0">{project.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{project.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${projectPct}%`, background: "linear-gradient(90deg, #2F3988, #9ACCEC)" }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{projectPct}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Miembros del workspace */}
        {members && members.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Miembros del equipo</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {members.map((m) => {
                const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                if (!profile) return null;
                return (
                  <div key={m.user_id} className="flex items-center gap-2">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {profile.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-600 font-medium">{profile.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
