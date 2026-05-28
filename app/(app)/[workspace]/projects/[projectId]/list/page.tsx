"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Paperclip, MessageSquare, AlertCircle } from "lucide-react";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { useFilteredLists } from "@/lib/hooks/useFilteredLists";
import { getProjectById } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";
import type { Task, KanbanList } from "@/types/domain";

const PRIORITY_CFG: Record<string, { label: string; dot: string }> = {
  urgent: { label: "Urgente", dot: "bg-red-500"    },
  high:   { label: "Alta",    dot: "bg-orange-400" },
  med:    { label: "Media",   dot: "bg-blue-400"   },
  low:    { label: "Baja",    dot: "bg-gray-300"   },
};

function TaskRow({ task }: { task: Task }) {
  const p = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.med;

  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : null;

  return (
    <tr className="group border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer">
      {/* Title */}
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2.5">
          <input type="checkbox" readOnly checked={task.isCompleted}
            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#2F3988] flex-shrink-0" />
          <span className={cn("text-sm text-gray-800 line-clamp-1", task.isCompleted && "line-through text-gray-400")}>
            {task.title}
          </span>
          {task.isAssignedToMe && (
            <span className="text-[9px] font-semibold text-[#2F3988] bg-blue-100 px-1 rounded flex-shrink-0">YO</span>
          )}
        </div>
      </td>

      {/* Priority */}
      <td className="py-2.5 px-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", p.dot)} />
          <span className="text-xs text-gray-500">{p.label}</span>
        </div>
      </td>

      {/* Assignees */}
      <td className="py-2.5 px-3">
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <img key={a.id} src={a.avatar} alt={a.name} title={a.name}
              className="w-6 h-6 rounded-full border-2 border-white" />
          ))}
          {task.assignees.length > 3 && (
            <span className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white text-[9px] flex items-center justify-center font-semibold text-gray-600">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </td>

      {/* Labels */}
      <td className="py-2.5 px-3">
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((l) => (
            <span key={l.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: l.light, color: l.solid }}>
              {l.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-gray-400">+{task.labels.length - 2}</span>
          )}
        </div>
      </td>

      {/* Due date */}
      <td className="py-2.5 px-3 whitespace-nowrap">
        {dueDateStr ? (
          <span className={cn("text-xs font-medium flex items-center gap-1",
            task.isOverdue ? "text-red-500" : task.isDueSoon ? "text-amber-500" : "text-gray-500"
          )}>
            {task.isOverdue && <AlertCircle className="w-3 h-3" />}
            {dueDateStr}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Subtasks */}
      <td className="py-2.5 px-3 whitespace-nowrap">
        {task.subtasks.total > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#9ACCEC]"
                style={{ width: `${Math.round((task.subtasks.completed / task.subtasks.total) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">
              {task.subtasks.completed}/{task.subtasks.total}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Extras */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Paperclip className="w-3 h-3" />{task.attachmentCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="w-3 h-3" />{task.commentCount}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ListGroup({ list }: { list: KanbanList }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      {/* Group header row */}
      <tr
        className="bg-gray-50 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td colSpan={7} className="py-2 px-4">
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            }
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: list.color }} />
            <span className="text-xs font-bold text-gray-600">{list.name}</span>
            <span className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 font-medium">
              {list.tasks.length}
            </span>
          </div>
        </td>
      </tr>

      {/* Task rows */}
      {open && list.tasks.map((task) => <TaskRow key={task.id} task={task} />)}

      {/* Empty state */}
      {open && list.tasks.length === 0 && (
        <tr>
          <td colSpan={7} className="py-3 px-10 text-xs text-gray-400">
            Sin tareas en este estado
          </td>
        </tr>
      )}
    </>
  );
}

export default function ListPage() {
  const params    = useParams();
  const projectId = params.projectId as string;

  const project     = getProjectById(projectId);
  const lists        = useFilteredLists(project.lists);

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[760px] border-collapse">
        {/* Sticky header */}
        <thead className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <tr>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4 w-[40%]">
              Tarea
            </th>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-3 w-24">
              Prioridad
            </th>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-3 w-28">
              Asignados
            </th>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-3">
              Etiquetas
            </th>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-3 w-28">
              Fecha
            </th>
            <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-3 w-36">
              Subtareas
            </th>
            <th className="py-2.5 px-3 w-20" />
          </tr>
        </thead>

        <tbody>
          {lists.map((list) => (
            <ListGroup key={list.id} list={list} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
