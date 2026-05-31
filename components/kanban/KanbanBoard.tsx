"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { KanbanList, Task, Assignee } from "@/types/domain";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import { useFilteredLists } from "@/lib/hooks/useFilteredLists";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskDrawer } from "./TaskDrawer";

interface KanbanBoardProps {
  initialLists: KanbanList[];
  projectName?: string;
  projectIcon?: string;
  projectMembers?: Assignee[];
}

/* Read current lists without creating a reactive dependency */
const getLists = () => useKanbanStore.getState().lists;

export function KanbanBoard({ initialLists, projectName, projectIcon, projectMembers }: KanbanBoardProps) {
  const { setLists, addTask, moveTask } = useKanbanStore();
  const displayLists = useFilteredLists(initialLists);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = selectedTaskId
    ? displayLists.flatMap((l) => l.tasks).find((t) => t.id === selectedTaskId) ?? null
    : null;

  useEffect(() => {
    setLists(initialLists);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /* ── Helpers that read from store directly (no reactive dep) ── */
  const findTask = useCallback((id: string): { task: Task; listId: string } | null => {
    for (const list of getLists()) {
      const task = list.tasks.find((t) => t.id === id);
      if (task) return { task, listId: list.id };
    }
    return null;
  }, []);

  /* ── Drag start ── */
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    for (const list of getLists()) {
      const task = list.tasks.find((t) => t.id === String(active.id));
      if (task) { setActiveTask(task); return; }
    }
  }, []);

  /* ── Drag over: cross-column move ── */
  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId   = String(over.id);
    if (activeId === overId) return;

    const currentLists = getLists();
    const activeInfo   = (() => {
      for (const list of currentLists) {
        const task = list.tasks.find((t) => t.id === activeId);
        if (task) return { task, listId: list.id };
      }
      return null;
    })();
    if (!activeInfo) return;

    const overList     = currentLists.find((l) => l.id === overId);
    const overTaskInfo = (() => {
      for (const list of currentLists) {
        const task = list.tasks.find((t) => t.id === overId);
        if (task) return { task, listId: list.id };
      }
      return null;
    })();

    const targetListId = overList?.id ?? overTaskInfo?.listId;
    if (!targetListId || targetListId === activeInfo.listId) return;

    setLists((prev) =>
      prev.map((list) => {
        if (list.id === activeInfo.listId) {
          return { ...list, tasks: list.tasks.filter((t) => t.id !== activeId) };
        }
        if (list.id === targetListId) {
          const movedTask = { ...activeInfo.task, listId: targetListId };
          const overIdx   = list.tasks.findIndex((t) => t.id === overId);
          const newTasks  = [...list.tasks];
          if (overIdx >= 0) newTasks.splice(overIdx, 0, movedTask);
          else newTasks.push(movedTask);
          return { ...list, tasks: newTasks };
        }
        return list;
      })
    );

    setActiveTask((prev) => (prev ? { ...prev, listId: targetListId } : prev));
  }, [setLists]);

  /* ── Drag end: same-column reorder ── */
  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId   = String(over.id);
    if (activeId === overId) return;

    const currentLists  = getLists();
    const activeInfo    = (() => {
      for (const list of currentLists) {
        const task = list.tasks.find((t) => t.id === activeId);
        if (task) return { task, listId: list.id };
      }
      return null;
    })();
    const overTaskInfo  = (() => {
      for (const list of currentLists) {
        const task = list.tasks.find((t) => t.id === overId);
        if (task) return { task, listId: list.id };
      }
      return null;
    })();

    if (activeInfo && overTaskInfo && activeInfo.listId === overTaskInfo.listId) {
      setLists((prev) =>
        prev.map((list) => {
          if (list.id !== activeInfo.listId) return list;
          const oldIdx = list.tasks.findIndex((t) => t.id === activeId);
          const newIdx = list.tasks.findIndex((t) => t.id === overId);
          return { ...list, tasks: arrayMove(list.tasks, oldIdx, newIdx) };
        })
      );
    }
  }, [setLists]);

  const handleTaskClick    = useCallback((task: Task) => setSelectedTaskId(task.id), []);
  const handleCloseDrawer  = useCallback(() => setSelectedTaskId(null), []);
  const handleStatusChange = useCallback((taskId: string, newListId: string) => {
    moveTask(taskId, newListId);
  }, [moveTask]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-5 h-full pb-6 overflow-x-auto"
          role="region"
          aria-roledescription="tablero kanban"
          aria-label="Tablero de tareas"
        >
          {displayLists.map((list) => (
            <KanbanColumn
              key={list.id}
              list={list}
              onTaskClick={handleTaskClick}
              onAddTask={addTask}
            />
          ))}

          <div className="min-w-[280px] flex-shrink-0">
            <button className="w-full h-10 flex items-center gap-2 px-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-brand-cyan hover:text-brand-navy transition-colors">
              <span className="text-lg">+</span>
              <span>Nueva lista</span>
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activeTask ? <TaskCard task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={handleCloseDrawer}
          onStatusChange={handleStatusChange}
          projectName={projectName}
          projectIcon={projectIcon}
          projectMembers={projectMembers}
        />
      )}
    </>
  );
}
