"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { WORKSPACE_MEMBERS } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";

const LAST_MESSAGES: Record<string, { text: string; time: string; unread?: number }> = {
  michael: { text: "¿Puedes revisar el PR que subí ayer?", time: "10:48", unread: 2 },
  sofia:   { text: "El jueves a más tardar. ¿Puedes coordinar?", time: "09:07" },
  daniel:  { text: "Ya lo abrí, issue #47.", time: "13:27", unread: 1 },
  emma:    { text: "¡Gracias! Eres lo mejor 🙌", time: "10:21" },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspace    = params.workspace  as string;
  const activeMember = params.memberId   as string | undefined;

  const [search,      setSearch]      = useState("");
  const [compose,     setCompose]     = useState(false);
  const [composeSearch, setComposeSearch] = useState("");

  const filtered = WORKSPACE_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );
  const composeFiltered = WORKSPACE_MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(composeSearch.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Conversation list panel ── */}
      <div className="w-[280px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="h-[57px] flex items-center justify-between px-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Mensajes</h2>
          <button
            onClick={() => { setCompose(true); setComposeSearch(""); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#2F3988] transition-colors"
            title="Nueva conversación"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-6 px-4">Sin resultados</p>
          ) : (
            filtered.map((member) => {
              const lastMsg  = LAST_MESSAGES[member.id];
              const isActive = activeMember === member.id;
              return (
                <Link
                  key={member.id}
                  href={`/${workspace}/messages/${member.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50",
                    isActive && "bg-blue-50 border-l-2 border-l-[#2F3988]"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        member.isOnline ? "bg-green-500" : "bg-gray-300"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm truncate",
                          isActive ? "font-semibold text-[#2F3988]" : lastMsg?.unread ? "font-semibold text-gray-900" : "font-medium text-gray-800"
                        )}
                      >
                        {member.name}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{lastMsg.time}</span>
                      )}
                    </div>
                    {lastMsg && (
                      <p
                        className={cn(
                          "text-xs truncate mt-0.5",
                          lastMsg.unread ? "text-gray-700 font-medium" : "text-gray-400"
                        )}
                      >
                        {lastMsg.text}
                      </p>
                    )}
                  </div>
                  {lastMsg?.unread ? (
                    <span className="w-5 h-5 rounded-full bg-[#2F3988] text-white text-[10px] flex items-center justify-center flex-shrink-0 font-semibold">
                      {lastMsg.unread}
                    </span>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>

      {/* ── Nueva conversación modal ── */}
      {compose && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
          onClick={() => setCompose(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[400px] flex flex-col overflow-hidden"
            style={{ maxHeight: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Nueva conversación</h3>
                <p className="text-xs text-gray-400 mt-0.5">Selecciona un miembro del equipo</p>
              </div>
              <button
                onClick={() => setCompose(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={composeSearch}
                  onChange={(e) => setComposeSearch(e.target.value)}
                  placeholder="Buscar personas..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Member list */}
            <div className="overflow-y-auto flex-1 py-1">
              {composeFiltered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin resultados</p>
              ) : (
                composeFiltered.map((member) => (
                  <Link
                    key={member.id}
                    href={`/${workspace}/messages/${member.id}`}
                    onClick={() => setCompose(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-11 h-11 rounded-full"
                      />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                          member.isOnline ? "bg-green-500" : "bg-gray-300"
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className={cn("text-xs mt-0.5", member.isOnline ? "text-green-500" : "text-gray-400")}>
                        {member.isOnline ? "● En línea" : "● Desconectado"}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
