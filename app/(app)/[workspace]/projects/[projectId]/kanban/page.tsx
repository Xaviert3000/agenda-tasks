import { KanbanBoardWrapper } from "@/components/kanban/KanbanBoardWrapper";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { KanbanList, Task } from "@/types/domain";

interface KanbanPageProps {
  params: Promise<{ workspace: string; projectId: string }>;
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params;
  const authClient = await createClient();

  // Current user (auth via the RLS-bound client)
  const { data: { user } } = await authClient.auth.getUser();

  // Data reads via the service client to bypass RLS (auth already verified above)
  const supabase = createServiceClient();

  // projectId param is the sidebar list ID — look up the project through kanban_lists
  const { data: listRow } = await supabase
    .from("kanban_lists")
    .select("project_id")
    .eq("id", projectId)
    .single();

  const { data: proj } = listRow
    ? await supabase
        .from("projects")
        .select("name, icon, workspace_id")
        .eq("id", listRow.project_id)
        .single()
    : { data: null };

  // Kanban columns for this list (projectId param is actually the sidebar list ID)
  const { data: rawColumns } = await supabase
    .from("kanban_columns")
    .select("id, name, color, wip_limit, position")
    .eq("list_id", projectId)
    .order("position");

  // If no columns yet, create the 4 defaults for this list
  let columns = rawColumns ?? [];
  if (columns.length === 0 && projectId) {
    const defaults = [
      { name: "Por Hacer",   color: "#EF4444", position: 0 },
      { name: "En Progreso", color: "#3B82F6", position: 1 },
      { name: "En Revisión", color: "#F59E0B", position: 2 },
      { name: "Completado",  color: "#22C55E", position: 3 },
    ];
    const { data: created } = await supabase
      .from("kanban_columns")
      .insert(defaults.map((d) => ({ ...d, list_id: projectId })))
      .select("id, name, color, wip_limit, position");
    columns = created ?? [];
  }

  // Tasks for all columns
  const columnIds = columns.map((c) => c.id);
  const { data: rawTasks } = columnIds.length
    ? await supabase
        .from("tasks")
        .select("id, list_id, title, description, priority, due_date, is_completed, attachment_count, comment_count, position")
        .in("list_id", columnIds)
        .order("position")
    : { data: [] };

  // Assignees for all tasks (two queries — no FK declared between task_assignees and profiles)
  const taskIds = (rawTasks ?? []).map((t) => t.id);
  const { data: rawAssignees } = taskIds.length
    ? await supabase.from("task_assignees").select("task_id, user_id").in("task_id", taskIds)
    : { data: [] };

  const assigneeUserIds = [...new Set((rawAssignees ?? []).map((a) => a.user_id))];
  const { data: assigneeProfiles } = assigneeUserIds.length
    ? await supabase.from("profiles").select("id, name, avatar_url").in("id", assigneeUserIds)
    : { data: [] };
  const assigneeProfileMap = new Map((assigneeProfiles ?? []).map((p) => [p.id, p]));

  // Build assignee map: task_id → Assignee[]
  const assigneeMap: Record<string, { id: string; name: string; avatar: string }[]> = {};
  for (const a of rawAssignees ?? []) {
    const p = assigneeProfileMap.get(a.user_id);
    if (!p) continue;
    if (!assigneeMap[a.task_id]) assigneeMap[a.task_id] = [];
    assigneeMap[a.task_id].push({
      id: p.id,
      name: p.name,
      avatar: p.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
    });
  }

  // Build domain KanbanList[]
  const lists: KanbanList[] = columns.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    wipLimit: c.wip_limit ?? undefined,
    tasks: (rawTasks ?? [])
      .filter((t) => t.list_id === c.id)
      .map((t): Task => ({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        labels: [],
        priority: (t.priority as Task["priority"]) ?? "med",
        assignees: assigneeMap[t.id] ?? [],
        subtasks: { total: 0, completed: 0 },
        attachmentCount: t.attachment_count ?? 0,
        commentCount: t.comment_count ?? 0,
        dueDate: t.due_date ?? undefined,
        isCompleted: t.is_completed,
        listId: c.id,
      })),
  }));

  const initialLists: KanbanList[] = lists;

  // Workspace members as assignee options (always include current user)
  let projectMembers: { id: string; name: string; avatar: string }[] = [];
  if (proj?.workspace_id) {
    const [{ data: members }, { data: myProfile }] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("user_id, profiles(id, name, avatar_url)")
        .eq("workspace_id", proj.workspace_id),
      user
        ? supabase.from("profiles").select("id, name, avatar_url").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
    ]);

    const mapped = (members ?? [])
      .map((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return p
          ? { id: p.id, name: p.name, avatar: p.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}` }
          : null;
      })
      .filter((m): m is { id: string; name: string; avatar: string } => m !== null);

    // Ensure current user is always present (workspace creator may not be in workspace_members)
    const meInList = mapped.find((m) => m.id === user?.id);
    if (!meInList && myProfile && user) {
      mapped.unshift({
        id: user.id,
        name: myProfile.name,
        avatar: myProfile.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      });
    }

    const me = mapped.find((m) => m.id === user?.id);
    const others = mapped.filter((m) => m.id !== user?.id);
    projectMembers = me ? [me, ...others] : others;
  }

  return (
    <div className="h-full overflow-hidden px-6 pt-5">
      <KanbanBoardWrapper
        initialLists={initialLists}
        projectName={proj?.name}
        projectIcon={proj?.icon}
        projectMembers={projectMembers}
      />
    </div>
  );
}
