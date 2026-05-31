import { KanbanBoardWrapper } from "@/components/kanban/KanbanBoardWrapper";
import { getProjectById } from "@/lib/data/mockData";
import { createClient } from "@/lib/supabase/server";

interface KanbanPageProps {
  params: Promise<{ workspace: string; projectId: string }>;
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params;

  // Try to fetch real project data from Supabase
  let projectName: string | undefined;
  let projectIcon: string | undefined;
  let projectMembers: { id: string; name: string; avatar: string }[] = [];

  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch project name and icon
    const { data: proj } = await supabase
      .from("projects")
      .select("name, icon")
      .eq("id", projectId)
      .single();

    if (proj) {
      projectName = proj.name;
      projectIcon = proj.icon;
    }

    // Fetch workspace members (including current user) as available assignees
    if (user) {
      // Get workspace members via project → workspace
      const { data: projRow } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", projectId)
        .single();

      if (projRow) {
        const { data: members } = await supabase
          .from("workspace_members")
          .select("user_id, profiles(id, name, avatar_url)")
          .eq("workspace_id", projRow.workspace_id);

        // Build members list — put current user first
        const mapped = (members ?? [])
          .map((m) => {
            const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return p ? { id: p.id, name: p.name, avatar: p.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}` } : null;
          })
          .filter((m): m is { id: string; name: string; avatar: string } => m !== null);

        // Put current user first in the list
        const me = mapped.find((m) => m.id === user.id);
        const others = mapped.filter((m) => m.id !== user.id);
        projectMembers = me ? [me, ...others] : others;
      }
    }
  } catch {
    // Supabase unavailable — fall back to mock data
  }

  // Fallback to mock data if Supabase didn't return project info
  if (!projectName) {
    const mock = getProjectById(projectId);
    projectName = mock.name;
    projectIcon = mock.icon;
    if (projectMembers.length === 0) {
      projectMembers = mock.members;
    }
  }

  const mock = getProjectById(projectId);

  return (
    <div className="h-full overflow-hidden px-6 pt-5">
      <KanbanBoardWrapper
        initialLists={mock.lists}
        projectName={projectName}
        projectIcon={projectIcon}
        projectMembers={projectMembers}
      />
    </div>
  );
}
