"use client";

import dynamic from "next/dynamic";
import type { KanbanList, Assignee } from "@/types/domain";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-5 h-full pb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-w-[300px] max-w-[300px]">
            <div className="h-6 bg-gray-200 rounded-full mb-3 w-32 animate-pulse" />
            <div className="bg-gray-100/60 rounded-xl p-3 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="bg-white rounded-xl p-3 space-y-2 animate-pulse">
                  <div className="flex gap-1">
                    <div className="h-4 w-12 bg-gray-100 rounded" />
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-1 bg-gray-100 rounded-full" />
                  <div className="flex justify-between">
                    <div className="flex -space-x-1">
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                    </div>
                    <div className="h-3 w-12 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

interface KanbanBoardWrapperProps {
  initialLists: KanbanList[];
  projectName?: string;
  projectIcon?: string;
  projectMembers?: Assignee[];
}

export function KanbanBoardWrapper({ initialLists, projectName, projectIcon, projectMembers }: KanbanBoardWrapperProps) {
  return <KanbanBoard initialLists={initialLists} projectName={projectName} projectIcon={projectIcon} projectMembers={projectMembers} />;
}
