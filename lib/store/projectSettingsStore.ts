import { create } from "zustand";

/**
 * Tracks public/private visibility and member list per project.
 * Keys are either static list IDs (from mockData) or dynamic proj-xxx IDs.
 */
const DEFAULT_VISIBILITY: Record<string, boolean> = {
  "ecommerce-website": true,
  "company-web":       false,
  "landing":           true,
  "brand":             true,
  "logo":              false,
  "ios":               false,
  "android":           false,
  "illustrations":     true,
};

interface ProjectSettingsState {
  visibility:  Record<string, boolean>;
  memberIds:   Record<string, string[]>; // projectId → memberIds

  setProjectPublic:  (projectId: string, isPublic: boolean) => void;
  isProjectPublic:   (projectId: string) => boolean;

  setProjectMembers: (projectId: string, members: string[]) => void;
  getProjectMembers: (projectId: string) => string[];
}

export const useProjectSettingsStore = create<ProjectSettingsState>((set, get) => ({
  visibility: DEFAULT_VISIBILITY,
  memberIds:  {},

  setProjectPublic: (projectId, isPublic) =>
    set((s) => ({ visibility: { ...s.visibility, [projectId]: isPublic } })),

  isProjectPublic: (projectId) =>
    get().visibility[projectId] ?? true,

  setProjectMembers: (projectId, members) =>
    set((s) => ({ memberIds: { ...s.memberIds, [projectId]: members } })),

  getProjectMembers: (projectId) =>
    get().memberIds[projectId] ?? [],
}));
