"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "./Topbar";
import { useKanbanStore } from "@/lib/store/kanbanStore";

interface TopbarWrapperProps {
  workspace: string;
}

const VIEW_LABELS: Record<string, string> = {
  kanban:   "Kanban",
  board:    "Board",
  list:     "Lista",
  calendar: "Calendario",
};

export function TopbarWrapper({ workspace }: TopbarWrapperProps) {
  const pathname    = usePathname();
  const projectName = useKanbanStore((s) => s.projectName);
  const listName    = useKanbanStore((s) => s.listName);

  /* ── Bandeja de entrada ── */
  if (pathname.includes("/inbox")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[{ label: "Bandeja de entrada" }]}
      />
    );
  }

  /* ── Dashboard ── */
  if (pathname.includes("/dashboard")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[{ label: "Inicio" }]}
      />
    );
  }

  /* ── Mensajes ── */
  if (pathname.includes("/messages/")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[
          { label: "Mensajes", href: `/${workspace}/messages` },
          { label: "Chat" },
        ]}
      />
    );
  }

  /* ── Editor de doc ── */
  if (pathname.includes("/docs/")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[
          { label: "Documentos", href: `/${workspace}/docs` },
          { label: "Editor" },
        ]}
      />
    );
  }

  /* ── Configuración ── */
  if (pathname.includes("/settings")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[{ label: "Configuración" }]}
      />
    );
  }

  /* ── Docs index ── */
  if (pathname.endsWith("/docs")) {
    return (
      <Topbar
        workspace={workspace}
        breadcrumbs={[{ label: "Documentos" }]}
      />
    );
  }

  /* ── Project views: /[workspace]/projects/[projectId]/[view] ── */
  const projectMatch = pathname.match(/\/projects\/([^/]+)(?:\/([^/]+))?/);
  if (projectMatch) {
    const projectId   = projectMatch[1];
    const view        = projectMatch[2] ?? "kanban";
    const viewLabel   = VIEW_LABELS[view] ?? view;
    const displayName = projectName || "Proyecto";

    const crumbs = [
      { label: "Proyectos", href: `/${workspace}/dashboard` },
      { label: displayName, href: `/${workspace}/dashboard` },
      ...(listName ? [{ label: listName, href: `/${workspace}/projects/${projectId}/kanban` }] : []),
      { label: viewLabel },
    ];

    return <Topbar workspace={workspace} breadcrumbs={crumbs} />;
  }

  return <Topbar workspace={workspace} />;
}
