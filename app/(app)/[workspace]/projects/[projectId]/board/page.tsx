"use client";

import { useParams } from "next/navigation";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { useFilteredLists } from "@/lib/hooks/useFilteredLists";
import { getProjectById } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";
import type { Task, KanbanList } from "@/types/domain";

const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  urgent: { label: "Urgente", bg: "bg-red-100",    text: "text-red-600"    },
  high:   { label: "Alta",    bg: "bg-orange-100", text: "text-orange-600" },
  med:    { label: "Media",   bg: "bg-blue-100",   text: "text-blue-600"   },
  low:    { label: "Baja",    bg: "bg-gray-100",   text: "text-gray-500"   },
};

function BoardCard({ task, statusColor }: { task: Task; statusColor: string }) {
  const p = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.med;
  const pct = task.subtasks.total > 0
    ? Math.round((task.subtasks.completed / task.subtasks.total) * 100)
    : 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Status color bar */}
      <div className="h-1 w-full" style={{ background: statusColor }} />

      <div className="p-4">
        {/* Labels + priority */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: l.light, color: l.solid }}
            >
              {l.name}
            </span>
          ))}
          <span className={cn("ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full", p.bg, p.text)}>
            {p.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug mb-1 line-clamp-2">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{task.description}</p>
        )}

        {/* Due date */}
        {task.dueDate && (
          <p className={cn("text-xs font-medium mb-3", task.isOverdue ? "text-red-500" : task.isDueSoon ? "text-amber-500" : "text-gray-400")}>
            {task.isOverdue ? "Vencida" : "Vence"}{" "}
            {new Date(task.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </p>
        )}

        {/* Progress */}
        {task.subtasks.total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-400">Subtareas</span>
              <span className="text-[10px] text-gray-500 font-medium">
                {task.subtasks.completed}/{task.subtasks.total}
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "#9ACCEC" }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <img key={a.id} src={a.avatar} alt={a.name} title={a.name}
                className="w-6 h-6 rounded-full border-2 border-white" />
            ))}
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
            {task.attachmentCount > 0 && <span>📎 {task.attachmentCount}</span>}
            {task.commentCount > 0 && <span>💬 {task.commentCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const params    = useParams();
  const projectId = params.projectId as string;

  const project     = getProjectById(projectId);
  const lists        = useFilteredLists(project.lists);

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="space-y-8">
        {lists.map((list) => (
          <section key={list.id}>
            {/* Status group header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: list.color }} />
              <h2 className="text-sm font-bold text-gray-700">{list.name}</h2>
              <span className="text-xs text-gray-400 font-medium bg-gray-100 rounded-full px-2 py-0.5">
                {list.tasks.length}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {list.tasks.length === 0 ? (
              <p className="text-xs text-gray-400 ml-5">Sin tareas en este estado</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.tasks.map((task) => (
                  <BoardCard key={task.id} task={task} statusColor={list.color} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
