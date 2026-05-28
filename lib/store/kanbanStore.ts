import { create } from "zustand";
import type { KanbanList, Task, Priority } from "@/types/domain";

type Updater<T> = T | ((prev: T) => T);

export interface TaskFilters {
  priorities: string[];   // [] = all
  assigneeIds: string[];  // [] = all
  overdue: boolean;
  dueSoon: boolean;
  assignedToMe: boolean;
}

const DEFAULT_FILTERS: TaskFilters = {
  priorities: [],
  assigneeIds: [],
  overdue: false,
  dueSoon: false,
  assignedToMe: false,
};

type KanbanState = {
  lists: KanbanList[];
  projectName: string;
  projectIcon: string;
  searchQuery: string;
  taskFilters: TaskFilters;
  setProjectMeta: (name: string, icon: string) => void;
  setLists: (updater: Updater<KanbanList[]>) => void;
  addTask: (listId: string, title: string, priority?: Priority) => void;
  moveTask: (taskId: string, newListId: string) => void;
  setSearchQuery: (q: string) => void;
  setTaskFilters: (f: TaskFilters) => void;
  clearFilters: () => void;
};

export const useKanbanStore = create<KanbanState>((set) => ({
  lists: [],
  projectName: "",
  projectIcon: "📋",
  searchQuery: "",
  taskFilters: DEFAULT_FILTERS,
  setProjectMeta: (name, icon) => set({ projectName: name, projectIcon: icon }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setTaskFilters: (f) => set({ taskFilters: f }),
  clearFilters: () => set({ searchQuery: "", taskFilters: DEFAULT_FILTERS }),

  setLists: (updater) =>
    set((s) => ({ lists: typeof updater === "function" ? updater(s.lists) : updater })),

  addTask: (listId, title, priority = "med") =>
    set((s) => ({
      lists: s.lists.map((list) =>
        list.id !== listId
          ? list
          : {
              ...list,
              tasks: [
                ...list.tasks,
                {
                  id: `t${Date.now()}`,
                  title,
                  description: "",
                  labels: [],
                  priority,
                  assignees: [],
                  subtasks: { total: 0, completed: 0 },
                  attachmentCount: 0,
                  commentCount: 0,
                  listId,
                } satisfies Task,
              ],
            }
      ),
    })),

  moveTask: (taskId, newListId) =>
    set((s) => {
      let moved: Task | null = null;
      const without = s.lists.map((list) => {
        const t = list.tasks.find((t) => t.id === taskId);
        if (!t) return list;
        moved = { ...t, listId: newListId };
        return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
      });
      if (!moved) return s;
      return {
        lists: without.map((list) =>
          list.id === newListId ? { ...list, tasks: [...list.tasks, moved!] } : list
        ),
      };
    }),
}));
