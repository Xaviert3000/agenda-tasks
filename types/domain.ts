export type Priority = "low" | "med" | "high" | "urgent";

export interface Label {
  id: string;
  name: string;
  light: string;
  solid: string;
}

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  labels: Label[];
  priority: Priority;
  assignees: Assignee[];
  subtasks: { total: number; completed: number };
  attachmentCount: number;
  commentCount: number;
  dueDate?: string;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  isAssignedToMe?: boolean;
  isCompleted?: boolean;
  listId: string;
}

export interface KanbanList {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
  wipLimit?: number;
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  members: Assignee[];
  lists: KanbanList[];
}

export interface WorkspaceMember {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface SidebarList {
  id: string;
  name: string;
}

export interface SidebarFolder {
  id: string;
  name: string;
  lists: SidebarList[];
}

export interface SidebarProject {
  id: string;
  name: string;
  icon: string;
  lists?: SidebarList[];
  folders?: SidebarFolder[];
}

export interface SidebarCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}
