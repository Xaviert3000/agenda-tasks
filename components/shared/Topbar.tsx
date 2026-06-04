"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  MessageSquare,
  ChevronRight,
  Search,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "./SearchModal";
import { NotepadPanel } from "./NotepadPanel";

const NOTIF_UNREAD  = 0;
const MSGS_UNREAD   = 0;

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  workspace: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function Topbar({ workspace, breadcrumbs = [] }: TopbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const pathname = usePathname();
  const isInbox    = pathname.includes("/inbox");
  const isMessages = pathname.includes("/messages");

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const items: BreadcrumbItem[] = [
    { label: workspace === "agenda-me" ? "agenda.ME" : workspace, href: `/${workspace}/dashboard` },
    ...breadcrumbs,
  ];

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 flex-shrink-0 sticky top-0 z-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 flex-1 min-w-0 text-sm" aria-label="Breadcrumb">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-gray-900 transition-colors font-medium truncate flex-shrink-0 hover:underline underline-offset-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate flex-shrink-0",
                      isLast
                        ? "text-gray-900 font-semibold"
                        : "text-gray-500 font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>

        {/* Search button */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 h-8 px-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs"
          aria-label="Buscar (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Buscar...</span>
          <kbd className="hidden sm:block text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 font-mono text-gray-400">⌘K</kbd>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Link
            href={`/${workspace}/inbox`}
            className={cn(
              "relative w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              isInbox
                ? "bg-[#2F3988]/10 text-[#2F3988]"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
            aria-label="Notificaciones"
            title="Bandeja de entrada"
          >
            <Bell className="w-4 h-4" />
            {NOTIF_UNREAD > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-danger border border-white text-white text-[9px] font-bold leading-none px-0.5">
                {NOTIF_UNREAD}
              </span>
            )}
          </Link>

          {/* Notepad */}
          <button
            onClick={() => setShowNotepad((v) => !v)}
            className={cn(
              "relative w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              showNotepad
                ? "bg-[#2F3988]/10 text-[#2F3988]"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
            aria-label="Bloc de notas"
            title="Bloc de notas"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Messages */}
          <Link
            href={`/${workspace}/messages`}
            className={cn(
              "relative w-8 h-8 flex items-center justify-center rounded-md transition-colors",
              isMessages
                ? "bg-[#2F3988]/10 text-[#2F3988]"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
            aria-label="Mensajes"
            title="Mensajes"
          >
            <MessageSquare className="w-4 h-4" />
            {MSGS_UNREAD > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#2F3988] border border-white text-white text-[9px] font-bold leading-none px-0.5">
                {MSGS_UNREAD}
              </span>
            )}
          </Link>

          <div className="ml-1 pl-3 border-l border-gray-200">
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4"
                alt="Mi perfil"
                className="w-7 h-7 rounded-full border border-gray-200"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Search modal */}
      {showSearch && (
        <SearchModal workspace={workspace} onClose={() => setShowSearch(false)} />
      )}

      {/* Notepad panel */}
      {showNotepad && (
        <NotepadPanel onClose={() => setShowNotepad(false)} />
      )}
    </>
  );
}
