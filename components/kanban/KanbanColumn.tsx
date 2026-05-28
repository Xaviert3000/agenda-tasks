"use client";

import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import type { KanbanList, Task } from "@/types/domain";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  list: KanbanList;
  onTaskClick: (task: Task) => void;
  onAddTask: (listId: string, title: string) => void;
}

export function KanbanColumn({ list, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id });
  const taskIds = list.tasks.map((t) => t.id);
  const isWipExceeded = list.wipLimit !== undefined && list.tasks.length > list.wipLimit;

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const openForm = () => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submitTask = () => {
    if (!newTitle.trim()) return;
    onAddTask(list.id, newTitle.trim());
    setNewTitle("");
    // Keep form open to add more tasks quickly
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setNewTitle("");
  };

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] h-full">
      {/* Column header */}
      <header className={cn("flex items-center justify-between mb-3 px-1 flex-shrink-0", isWipExceeded && "text-warning")}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: list.color }} />
          <h2 className={cn("font-semibold text-sm", isWipExceeded ? "text-warning" : "text-gray-800")}>
            {list.name}
          </h2>
          <span className={cn(
            "text-xs rounded-full px-2 py-0.5 font-medium leading-tight",
            isWipExceeded ? "bg-orange-100 text-warning" : "bg-gray-100 text-gray-500"
          )}>
            {isWipExceeded ? `${list.tasks.length}/${list.wipLimit}` : list.tasks.length}
          </span>
        </div>
        <button
          onClick={openForm}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={`Agregar tarea a ${list.name}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Droppable task list — scrolls vertically */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto rounded-xl p-3 space-y-3 min-h-[120px] transition-colors duration-150",
          isOver ? "bg-blue-50 ring-2 ring-brand-cyan ring-dashed" : "bg-gray-100/60"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {list.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {list.tasks.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center h-20">
            <p className="text-xs text-gray-400">Sin tareas</p>
          </div>
        )}

        {/* Inline add-task form */}
        {isAdding && (
          <div className="bg-white rounded-xl border border-brand-cyan/40 shadow-sm p-3 space-y-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitTask(); }
                if (e.key === "Escape") cancelForm();
              }}
              placeholder="Nombre de la tarea..."
              className="w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none bg-transparent leading-snug"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={submitTask}
                disabled={!newTitle.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#2F3988" }}
              >
                Agregar
              </button>
              <button
                onClick={cancelForm}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer button — always visible below the scroll area */}
      {!isAdding && (
        <button
          onClick={openForm}
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors w-full flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar tarea</span>
        </button>
      )}
    </div>
  );
}
