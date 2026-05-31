import { KanbanBoardWrapper } from "@/components/kanban/KanbanBoardWrapper";
import { createClient } from "@/lib/supabase/server";
import type { KanbanList, Task } from "@/types/domain";

interface KanbanPageProps {
  params: Promise<{ workspace: string; projectId: string }>;
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Current user
  const { data: { user } } = await supabase.auth.getUser();

  // Project metadata
  const { data: proj } = await supabase
    .from("projects")
    .select("name, icon, workspace_id")
    .eq("id", projectId)
    .single();

  // Kanban lists for this project
  const { data: rawLists } = await supabase
    .from("kanban_lists")
    .select("id, name, color, wip_limit, position")
    .eq("project_id", projectId)
    .order("position");

  // Tasks for all lists
  const listIds = (rawLists ?? []).map((l) => l.id);
  const { data: rawTasks } = listIds.length
    ? await supabase
        .from("tasks")
        .select("id, list_id, title, description, priority, due_date, is_completed, attachment_count, comment_count, position")
        .in("list_id", listIds)
        .order("position")
    : { data: [] };

  // Build domain KanbanList[]
  const lists: KanbanList[] = (rawLists ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    wipLimit: l.wip_limit ?? undefined,
    tasks: (rawTasks ?? [])
      .filter((t) => t.list_id === l.id)
      .map((t): Task => ({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        labels: [],
        priority: (t.priority as Task["priority"]) ?? "med",
        assignees: [],
        subtasks: { total: 0, completed: 0 },
        attachmentCount: t.attachment_count ?? 0,
        commentCount: t.comment_count ?? 0,
        dueDate: t.due_date ?? undefined,
        isCompleted: t.is_completed,
        listId: l.id,
      })),
  }));

  // If no lists exist yet, create the 4 default ones in Supabase
  if (lists.length === 0 && projectId) {
    const defaults = [
      { name: "Por Hacer",  color: "#EF4444", position: 0 },
      { name: "En Progreso", color: "#3B82F6", position: 1 },
      { name: "En Revisión", color: "#F59E0B", position: 2 },
      { name: "Completado",  color: "#22C55E", position: 3 },
    ];
    const { data: created } = await supabase
      .from("kanban_lists")
      .insert(defaults.map((d) => ({ ...d, project_id: projectId })))
      .select("id, name, color, position");

    if (created) {
      lists.push(...created.map((l) => ({ id: l.id, name: l.name, color: l.color, tasks: [] })));
    }
  }

  const initialLists: KanbanList[] = lists.length > 0 ? lists : [
    { id: "todo",        name: "Por Hacer",   color: "#EF4444", tasks: [] },
    { id: "in-progress", name: "En Progreso",  color: "#3B82F6", tasks: [] },
    { id: "review",      name: "En Revisión",  color: "#F59E0B", tasks: [] },
    { id: "done",        name: "Completado",   color: "#22C55E", tasks: [] },
  ];

  // Workspace members as assignee options
  let projectMembers: { id: string; name: string; avatar: string }[] = [];
  if (proj?.workspace_id) {
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id, profiles(id, name, avatar_url)")
      .eq("workspace_id", proj.workspace_id);

    const mapped = (members ?? [])
      .map((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return p
          ? { id: p.id, name: p.name, avatar: p.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}` }
          : null;
      })
      .filter((m): m is { id: string; name: string; avatar: string } => m !== null);

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
