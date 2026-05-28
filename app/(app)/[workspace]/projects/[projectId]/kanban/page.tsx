import { KanbanBoardWrapper } from "@/components/kanban/KanbanBoardWrapper";
import { getProjectById } from "@/lib/data/mockData";

interface KanbanPageProps {
  params: Promise<{ workspace: string; projectId: string }>;
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  const { projectId } = await params;
  const project = getProjectById(projectId);

  return (
    <div className="h-full overflow-hidden px-6 pt-5">
      <KanbanBoardWrapper initialLists={project.lists} />
    </div>
  );
}
