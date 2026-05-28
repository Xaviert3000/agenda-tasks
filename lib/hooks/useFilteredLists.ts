"use client";

import { useMemo } from "react";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import type { KanbanList } from "@/types/domain";

/**
 * Returns store lists (falling back to `fallback`) with search + filter applied.
 * Each view passes its own project.lists as the fallback.
 */
export function useFilteredLists(fallback: KanbanList[]): KanbanList[] {
  const storeLists  = useKanbanStore((s) => s.lists);
  const searchQuery = useKanbanStore((s) => s.searchQuery);
  const filters     = useKanbanStore((s) => s.taskFilters);

  const lists = storeLists.length > 0 ? storeLists : fallback;

  return useMemo(() => {
    const q         = searchQuery.trim().toLowerCase();
    const noSearch  = q.length === 0;
    const noFilters =
      filters.priorities.length  === 0 &&
      filters.assigneeIds.length === 0 &&
      !filters.overdue &&
      !filters.dueSoon &&
      !filters.assignedToMe;

    if (noSearch && noFilters) return lists;

    return lists.map((list) => ({
      ...list,
      tasks: list.tasks.filter((task) => {
        if (!noSearch && !task.title.toLowerCase().includes(q)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
        if (filters.assigneeIds.length > 0 && !task.assignees.some((a) => filters.assigneeIds.includes(a.id))) return false;
        if (filters.overdue      && !task.isOverdue)       return false;
        if (filters.dueSoon      && !task.isDueSoon)       return false;
        if (filters.assignedToMe && !task.isAssignedToMe)  return false;
        return true;
      }),
    }));
  }, [lists, searchQuery, filters]);
}
