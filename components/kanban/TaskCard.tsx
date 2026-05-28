"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Paperclip, MessageSquare } from "lucide-react";
import type { Task } from "@/types/domain";
import { cn, formatDate, PRIORITY_CONFIG } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  overlay?: boolean;
  onClick?: (task: Task) => void;
}

function AvatarStack({ assignees, max = 3 }: { assignees: Task["assignees"]; max?: number }) {
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - max;
  return (
    <div className="flex -space-x-2">
      {visible.map((u) => (
        <img
          key={u.id}
          src={u.avatar}
          alt={u.name}
          title={u.name}
          className="w-6 h-6 rounded-full border-2 border-white"
        />
      ))}
      {overflow > 0 && (
        <span className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white text-[10px] flex items-center justify-center font-semibold text-gray-600">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function TaskCard({ task, overlay, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pct =
    task.subtasks.total > 0
      ? Math.round((task.subtasks.completed / task.subtasks.total) * 100)
      : 0;

  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onClick?.(task); }}
      className={cn(
        "bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing select-none",
        "border border-gray-100",
        "transition-all duration-150 ease-out",
        "hover:shadow-md hover:-translate-y-px",
        task.isAssignedToMe && !task.isOverdue && "border-l-2 border-l-brand-cyan",
        task.isOverdue && "border-l-2 border-l-danger",
        task.isCompleted && "opacity-60",
        isDragging && "opacity-40 shadow-lg",
        overlay && "shadow-lg rotate-1 scale-[1.02]"
      )}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight"
              style={{ backgroundColor: label.light, color: label.solid }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-400 bg-gray-100">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title + Priority */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className={cn(
            "font-medium text-sm text-gray-900 line-clamp-2 leading-snug flex-1",
            task.isCompleted && "line-through text-gray-400"
          )}
        >
          {task.title}
        </h3>
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold flex-shrink-0"
          style={{ backgroundColor: priority.bg, color: priority.text }}
        >
          {priority.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-3">{task.description}</p>
      )}

      {/* Due date */}
      {task.dueDate && (
        <div className="mb-2">
          <span
            className={cn(
              "text-[11px] font-medium",
              task.isOverdue ? "text-danger" : task.isDueSoon ? "text-warning" : "text-gray-400"
            )}
          >
            {formatDate(task.dueDate)}
          </span>
        </div>
      )}

      {/* Progress */}
      {task.subtasks.total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Subtareas</span>
            <span>{task.subtasks.completed}/{task.subtasks.total}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#22C55E" : "#9ACCEC",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-between mt-2">
        <AvatarStack assignees={task.assignees} />
        <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachmentCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.commentCount}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
