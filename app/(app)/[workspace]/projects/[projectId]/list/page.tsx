"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown, ChevronRight, Paperclip, MessageSquare,
  AlertCircle, Clock, Plus, MoreHorizontal,
} from "lucide-react";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { useFilteredLists } from "@/lib/hooks/useFilteredLists";
import { getProjectById } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";
import type { Task, KanbanList } from "@/types/domain";

/* ── Priority config ─────────────────────────────── */
const PRIORITY_CFG: Record<string, { label: string; dot: string; pill: string; text: string }> = {
  urgent: { label: "Urgente", dot: "bg-red-500",    pill: "bg-red-50",    text: "text-red-600"   },
  high:   { label: "Alta",    dot: "bg-orange-400", pill: "bg-orange-50", text: "text-orange-600" },
  med:    { label: "Media",   dot: "bg-blue-400",   pill: "bg-blue-50",   text: "text-blue-600"  },
  low:    { label: "Baja",    dot: "bg-gray-300",   pill: "bg-gray-50",   text: "text-gray-500"  },
};

/* ── Task Row ────────────────────────────────────── */
function TaskRow({ task, isLast }: { task: Task; isLast: boolean }) {
  const p = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.med;

  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : null;

  const subtaskPct = task.subtasks.total > 0
    ? Math.round((task.subtasks.completed / task.subtasks.total) * 100)
    : 0;

  return (
    <tr
      className={cn(
        "group transition-colors duration-100 cursor-pointer",
        !isLast && "border-b border-gray-100",
        "hover:bg-[#F5F7FF]"
      )}
    >
      {/* ── Task title ── */}
      <td className="py-3 pl-10 pr-4">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className={cn(
            "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors",
            task.isCompleted
              ? "bg-[#2F3988] border-[#2F3988]"
              : "border-gray-300 group-hover:border-[#9ACCEC]"
          )}>
            {task.isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          {/* Title */}
          <span className={cn(
            "text-[13px] leading-snug font-medium transition-colors",
            task.isCompleted ? "line-through text-gray-400" : "text-gray-800 group-hover:text-[#2F3988]"
          )}>
            {task.title}
          </span>

          {/* "YO" badge */}
          {task.isAssignedToMe && (
            <span className="text-[9px] font-bold tracking-wide text-[#2F3988] bg-blue-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
              YO
            </span>
          )}
        </div>
      </td>

      {/* ── Priority ── */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold",
          p.pill, p.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", p.dot)} />
          {p.label}
        </span>
      </td>

      {/* ── Assignees ── */}
      <td className="py-3 px-4">
        {task.assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((a) => (
              <img
                key={a.id}
                src={a.avatar}
                alt={a.name}
                title={a.name}
                className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-gray-100"
              />
            ))}
            {task.assignees.length > 3 && (
              <span className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white ring-1 ring-gray-100 text-[9px] flex items-center justify-center font-bold text-gray-500">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* ── Labels ── */}
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((l) => (
            <span
              key={l.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: l.light, color: l.solid }}
            >
              {l.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100">
              +{task.labels.length - 2}
            </span>
          )}
          {task.labels.length === 0 && <span className="text-gray-300 text-xs">—</span>}
        </div>
      </td>

      {/* ── Due date ── */}
      <td className="py-3 px-4 whitespace-nowrap">
        {dueDateStr ? (
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md",
            task.isOverdue
              ? "bg-red-50 text-red-600"
              : task.isDueSoon
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-50 text-gray-600"
          )}>
            {task.isOverdue
              ? <AlertCircle className="w-3 h-3" />
              : task.isDueSoon
              ? <Clock className="w-3 h-3" />
              : null}
            {dueDateStr}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* ── Subtasks ── */}
      <td className="py-3 px-4 whitespace-nowrap">
        {task.subtasks.total > 0 ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", subtaskPct === 100 ? "bg-emerald-400" : "bg-[#9ACCEC]")}
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
            <span className={cn(
              "text-[11px] font-medium tabular-nums",
              subtaskPct === 100 ? "text-emerald-500" : "text-gray-400"
            )}>
              {task.subtasks.completed}/{task.subtasks.total}
            </span>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* ── Actions (hover) ── */}
      <td className="py-3 pl-2 pr-5">
        <div className="flex items-center gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium">
              <Paperclip className="w-3 h-3" />{task.attachmentCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium">
              <MessageSquare className="w-3 h-3" />{task.commentCount}
            </span>
          )}
          <button className="ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── List Group ──────────────────────────────────── */
function ListGroup({ list }: { list: KanbanList }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      {/* Group header */}
      <tr
        className="group/header cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td colSpan={7} className="pt-5 pb-1.5 pl-4 pr-5">
          <div className="flex items-center gap-2.5">
            {/* Collapse icon */}
            <span className="text-gray-400 transition-colors group-hover/header:text-gray-600">
              {open
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </span>

            {/* Status dot */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: list.color }}
            />

            {/* Status name */}
            <span className="text-xs font-bold text-gray-700 tracking-wide">
              {list.name}
            </span>

            {/* Count badge */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                color: list.color,
                borderColor: `${list.color}40`,
                background: `${list.color}10`,
              }}
            >
              {list.tasks.length}
            </span>

            {/* Add task hint */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="ml-1 opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#2F3988] font-medium"
            >
              <Plus className="w-3 h-3" />
              Añadir tarea
            </button>
          </div>
        </td>
      </tr>

      {/* Separator line */}
      <tr>
        <td colSpan={7} className="pb-1">
          <div className="mx-4 h-px bg-gray-100" />
        </td>
      </tr>

      {/* Task rows */}
      {open && list.tasks.map((task, i) => (
        <TaskRow key={task.id} task={task} isLast={i === list.tasks.length - 1} />
      ))}

      {/* Empty state */}
      {open && list.tasks.length === 0 && (
        <tr>
          <td colSpan={7} className="py-4 pl-10 pr-5">
            <span className="text-xs text-gray-400 italic">Sin tareas en este estado</span>
          </td>
        </tr>
      )}

      {/* Bottom spacing */}
      <tr><td colSpan={7} className="h-2" /></tr>
    </>
  );
}

/* ── Page ────────────────────────────────────────── */
export default function ListPage() {
  const params    = useParams();
  const projectId = params.projectId as string;

  const project = getProjectById(projectId);
  const lists   = useFilteredLists(project.lists);

  return (
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[820px] border-collapse">

        {/* Sticky column headers */}
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 pl-10 pr-4 w-[38%] border-b border-gray-100">
              Tarea
            </th>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 w-28 border-b border-gray-100">
              Prioridad
            </th>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 w-28 border-b border-gray-100">
              Asignados
            </th>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 border-b border-gray-100">
              Etiquetas
            </th>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 w-32 border-b border-gray-100">
              Fecha
            </th>
            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest py-3 px-4 w-36 border-b border-gray-100">
              Subtareas
            </th>
            <th className="py-3 pl-2 pr-5 w-24 border-b border-gray-100" />
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
