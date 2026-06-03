import { create } from "zustand";
import type { KanbanList, Task, Priority } from "@/types/domain";
import { createTask as createTaskAction, moveTask as moveTaskAction } from "@/app/actions/tasks";

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
  listName: string;
  searchQuery: string;
  taskFilters: TaskFilters;
  setProjectMeta: (name: string, icon: string) => void;
  setListName: (name: string) => void;
  setLists: (updater: Updater<KanbanList[]>) => void;
  addTask: (listId: string, title: string, priority?: Priority) => void;
  moveTask: (taskId: string, newListId: string) => void;
  updateTask: (taskId: string, changes: Partial<Task>) => void;
  setSearchQuery: (q: string) => void;
  setTaskFilters: (f: TaskFilters) => void;
  clearFilters: () => void;
};

export const useKanbanStore = create<KanbanState>((set, get) => ({
  lists: [],
  projectName: "",
  projectIcon: "📋",
  listName: "",
  searchQuery: "",
  taskFilters: DEFAULT_FILTERS,
  setProjectMeta: (name, icon) => set({ projectName: name, projectIcon: icon }),
  setListName: (name) => set({ listName: name }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setTaskFilters: (f) => set({ taskFilters: f }),
  clearFilters: () => set({ searchQuery: "", taskFilters: DEFAULT_FILTERS }),

  updateTask: (taskId, changes) =>
    set((s) => ({
      lists: s.lists.map((list) => ({
        ...list,
        tasks: list.tasks.map((t) => t.id === taskId ? { ...t, ...changes } : t),
      })),
    })),

  setLists: (updater) =>
    set((s) => ({ lists: typeof updater === "function" ? updater(s.lists) : updater })),

  addTask: (listId, title, priority = "med") => {
    // Optimistic local ID — replaced by Supabase ID on success
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      title,
      description: "",
      labels: [],
      priority,
      assignees: [],
      subtasks: { total: 0, completed: 0 },
      attachmentCount: 0,
      commentCount: 0,
      listId,
    };

    // Update UI immediately (optimistic)
    set((s) => ({
      lists: s.lists.map((list) =>
        list.id !== listId
          ? list
          : { ...list, tasks: [...list.tasks, newTask] }
      ),
    }));

    // Persist to Supabase and replace temp ID with real one
    createTaskAction(listId, title, priority).then((result) => {
      if (!result) return;
      if ("error" in result) {
        console.error("[kanban] createTask failed:", result.error, "listId:", listId);
        return;
      }
      set((s) => ({
        lists: s.lists.map((list) =>
          list.id !== listId
            ? list
            : {
                ...list,
                tasks: list.tasks.map((t) =>
                  t.id === tempId ? { ...t, id: result.id } : t
                ),
              }
        ),
      }));
    });
  },

  moveTask: (taskId, newListId) => {
    // Optimistic update
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
    });

    // Skip Supabase sync for optimistic/mock IDs (UUIDs contain hyphens)
    if (taskId.includes("-") && !taskId.startsWith("temp-")) {
      moveTaskAction(taskId, newListId);
    }
  },
}));
