"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Send, Phone, Video, MoreHorizontal, Check, CheckCheck,
  Plus, Search, X, ExternalLink, ArrowLeft,
  ClipboardList, FileText,
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  BellOff, Archive, Trash2, UserSearch,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MOCK_LISTS } from "@/lib/data/mockData";
import { useDocsStore } from "@/lib/store/docsStore";
import { useKanbanStore } from "@/lib/store/kanbanStore";
import type { Priority } from "@/types/domain";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
interface Reference {
  type: "task" | "doc";
  id: string;
  title: string;
  listName?: string;
  listColor?: string;
  priority?: string;
  icon?: string;
  folderName?: string;
}

interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  read: boolean;
  reference?: Reference;
}

interface MemberProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_online: boolean;
}

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgente", color: "#EF4444", bg: "#FEF2F2" },
  high:   { label: "Alta",    color: "#F97316", bg: "#FFF7ED" },
  med:    { label: "Media",   color: "#3B82F6", bg: "#EFF6FF" },
  low:    { label: "Baja",    color: "#9CA3AF", bg: "#F9FAFB" },
};

const FORM_PROJECTS = [
  { id: "ecommerce-website", name: "E-Commerce Website", icon: "🛍️" },
  { id: "company-web",       name: "Web Corporativo",     icon: "🌐" },
  { id: "graphic-design",    name: "Diseño Gráfico",      icon: "🎨" },
  { id: "mobile-app",        name: "App Móvil",           icon: "📱" },
  { id: "landing",           name: "Landing Page",        icon: "🚀" },
];

const DEFAULT_COLUMNS = [
  { id: "todo",        name: "Por Hacer",   color: "#EF4444" },
  { id: "in-progress", name: "En Progreso", color: "#3B82F6" },
  { id: "review",      name: "En Revisión", color: "#F59E0B" },
  { id: "done",        name: "Completado",  color: "#22C55E" },
];

const EMOJI_GROUPS = [
  { label: "Frecuentes", emojis: ["😀","😂","❤️","👍","🙌","🔥","✅","🎉","😊","🙏","💪","🚀"] },
  { label: "Caras",   emojis: ["😀","😃","😄","😁","😅","🤣","😊","😇","🥰","😍","🤩","😘","😗","☺️","🙂","🤔","😐","😶","😏","😒","😞","😟","😕","☹️","😣","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","😈","😴"] },
  { label: "Gestos",  emojis: ["👍","👎","👏","🙌","🤝","🙏","✌️","🤞","🤟","🤘","🤙","👋","🖐️","✋","💪","👊","✊","🫶","❤️","🧡","💛","💚","💙","💜"] },
  { label: "Objetos", emojis: ["🔥","✅","❌","⭐","🎉","🎊","🚀","💡","📌","📎","🔧","💻","📱","⚡","🎯","📊","📈","📝","🔍","📧","🔔","⏰","🗓️","💬"] },
];

function getProjectColumns(projectId: string) {
  if (projectId === "ecommerce-website") {
    return MOCK_LISTS.map((l) => ({ id: l.id, name: l.name, color: l.color }));
  }
  return DEFAULT_COLUMNS;
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MessagesPage() {
  const params    = useParams();
  const memberId  = params.memberId  as string;
  const workspace = params.workspace as string;

  const supabase = createClient();

  /* ── Auth & workspace state ── */
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null);
  const [workspaceId,    setWorkspaceId]    = useState<string | null>(null);
  const [member,         setMember]         = useState<MemberProfile | null>(null);
  const [loadingMsgs,    setLoadingMsgs]    = useState(true);

  /* ── Store ── */
  const { docs, folders, addDoc, updateDoc } = useDocsStore();
  const addTask = useKanbanStore((s) => s.addTask);

  /* ── Chat state ── */
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0);

  /* ── Call state ── */
  const [callType,  setCallType]  = useState<"voice" | "video" | null>(null);
  const [callPhase, setCallPhase] = useState<"calling" | "connected">("calling");
  const [callSecs,  setCallSecs]  = useState(0);
  const [isMuted,   setIsMuted]   = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  /* ── More menu state ── */
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  /* ── Reference panel state ── */
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [refQuery,     setRefQuery]     = useState("");
  const [refTab,       setRefTab]       = useState<"tasks" | "docs">("tasks");
  const [pendingRef,   setPendingRef]   = useState<Reference | null>(null);

  /* ── Inline create state ── */
  const [createMode,        setCreateMode]        = useState<"task" | "doc" | null>(null);
  const [newTaskTitle,      setNewTaskTitle]       = useState("");
  const [newTaskProjectId,  setNewTaskProjectId]   = useState("ecommerce-website");
  const [newTaskListId,     setNewTaskListId]      = useState("todo");
  const [newTaskPriority,   setNewTaskPriority]    = useState<Priority>("med");
  const [newDocTitle,       setNewDocTitle]        = useState("");
  const [newDocFolderId,    setNewDocFolderId]      = useState<string>("none");

  /* ── Refs ── */
  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const refPanelRef    = useRef<HTMLDivElement>(null);
  const refQueryRef    = useRef<HTMLInputElement>(null);
  const newTaskRef     = useRef<HTMLInputElement>(null);
  const newDocRef      = useRef<HTMLInputElement>(null);
  const moreMenuRef    = useRef<HTMLDivElement>(null);

  /* ── Computed data ── */
  const allTasks = MOCK_LISTS.flatMap((list) =>
    list.tasks.map((task) => ({ ...task, listName: list.name, listColor: list.color }))
  );
  const filteredTasks = allTasks.filter((t) => {
    if (!refQuery.trim()) return true;
    return t.title.toLowerCase().includes(refQuery.toLowerCase());
  });
  const filteredDocs = docs.filter((d) => {
    if (!refQuery.trim()) return true;
    const q = refQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.tags.some((tg) => tg.toLowerCase().includes(q));
  });
  const getFolderName = (folderId?: string) =>
    folderId ? folders.find((f) => f.id === folderId)?.name : undefined;

  /* ── Helper: convert DB row to ChatMessage ── */
  const rowToMsg = useCallback(
    (row: any, uid: string): ChatMessage => {
      const d = new Date(row.created_at);
      const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      return {
        id:   row.id,
        from: row.sender_id === uid ? "me" : "them",
        text: row.content,
        time,
        read: !!row.read_at,
      };
    },
    []
  );

  /* ── Bootstrap: auth + workspace + member profile ── */
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspace)
        .single();
      if (!ws) return;
      setWorkspaceId(ws.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, is_online")
        .eq("id", memberId)
        .single();
      setMember(profile ?? null);
    }
    init();
  }, [workspace, memberId]);

  /* ── Load messages when we have auth + workspace ── */
  useEffect(() => {
    if (!currentUserId || !workspaceId) return;

    async function loadMessages() {
      setLoadingMsgs(true);
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, read_at, created_at")
        .eq("workspace_id", workspaceId!)
        .or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${memberId}),and(sender_id.eq.${memberId},recipient_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });

      setMessages((data ?? []).map((r) => rowToMsg(r, currentUserId!)));
      setLoadingMsgs(false);

      // Mark incoming messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", memberId)
        .eq("recipient_id", currentUserId!)
        .is("read_at", null);
    }

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${workspaceId}:${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as any;
          const isRelevant =
            (row.sender_id === currentUserId && row.recipient_id === memberId) ||
            (row.sender_id === memberId && row.recipient_id === currentUserId);
          if (!isRelevant) return;

          const msg = rowToMsg(row, currentUserId!);
          setMessages((prev) => {
            // Avoid duplicates (optimistic insert already added it)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Auto-mark as read if it's incoming
          if (row.sender_id === memberId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, workspaceId, memberId, rowToMsg]);

  /* ── Reset UI on member change ── */
  useEffect(() => {
    setMessages([]);
    setInput("");
    setPendingRef(null);
    setShowRefPanel(false);
    setCreateMode(null);
    setNewTaskProjectId("ecommerce-website");
    setNewTaskListId("todo");
    setNewDocFolderId("none");
  }, [memberId]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Close emoji picker on outside click ── */
  useEffect(() => {
    if (!showEmojiPicker) return;
    const h = (e: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmojiPicker]);

  /* ── Close ref panel on outside click ── */
  useEffect(() => {
    if (!showRefPanel) return;
    const h = (e: MouseEvent) => {
      if (!refPanelRef.current?.contains(e.target as Node)) {
        setShowRefPanel(false);
        setCreateMode(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showRefPanel]);

  useEffect(() => {
    if (showRefPanel && !createMode) setTimeout(() => refQueryRef.current?.focus(), 50);
  }, [showRefPanel, createMode]);
  useEffect(() => {
    if (createMode === "task") setTimeout(() => newTaskRef.current?.focus(), 50);
    if (createMode === "doc")  setTimeout(() => newDocRef.current?.focus(),  50);
  }, [createMode]);

  /* ── Close more menu on outside click ── */
  useEffect(() => {
    if (!showMoreMenu) return;
    const h = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMoreMenu]);

  /* ── Call timers ── */
  useEffect(() => {
    if (!callType) { setCallPhase("calling"); setCallSecs(0); return; }
    const id = setTimeout(() => setCallPhase("connected"), 2500);
    return () => clearTimeout(id);
  }, [callType]);
  useEffect(() => {
    if (callType === null || callPhase !== "connected") return;
    const id = setInterval(() => setCallSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callType, callPhase]);

  /* ── Emoji ── */
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) { setInput((v) => v + emoji); return; }
    const start = el.selectionStart ?? input.length;
    const end   = el.selectionEnd   ?? input.length;
    const next  = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  /* ── Send message ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text && !pendingRef) return;
    if (!member || !currentUserId || !workspaceId) return;

    const now  = new Date();
    const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const tempId = `temp-${Date.now()}`;

    // Optimistic insert
    setMessages((prev) => [
      ...prev,
      { id: tempId, from: "me", text: text || "Aquí la referencia:", time, read: false, reference: pendingRef ?? undefined },
    ]);
    setInput("");
    setPendingRef(null);
    setShowEmojiPicker(false);
    inputRef.current?.focus();

    const { data, error } = await supabase.from("messages").insert({
      workspace_id:  workspaceId,
      sender_id:     currentUserId,
      recipient_id:  memberId,
      content:       text || "Aquí la referencia:",
    }).select("id").single();

    if (!error && data) {
      // Replace temp id with real id
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, id: data.id } : m)
      );
    }
  };

  /* ── Reference helpers ── */
  const handleSelectRef = (ref: Reference) => {
    setPendingRef(ref);
    setShowRefPanel(false);
    setCreateMode(null);
    setRefQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const columns = getProjectColumns(newTaskProjectId);
    const col     = columns.find((c) => c.id === newTaskListId) ?? columns[0];
    const project = FORM_PROJECTS.find((p) => p.id === newTaskProjectId);
    addTask(col.id, newTaskTitle.trim(), newTaskPriority);
    handleSelectRef({
      type: "task",
      id: `t${Date.now()}`,
      title:     newTaskTitle.trim(),
      listName:  `${project?.icon ?? ""} ${project?.name ?? "Proyecto"} · ${col.name}`,
      listColor: col.color,
      priority:  newTaskPriority,
    });
    setNewTaskTitle(""); setNewTaskProjectId("ecommerce-website");
    setNewTaskListId("todo"); setNewTaskPriority("med");
  };

  const handleCreateDoc = async () => {
    if (!newDocTitle.trim()) return;
    const folderId = newDocFolderId === "none" ? undefined : newDocFolderId;
    const id = await addDoc(folderId);
    await updateDoc(id, { title: newDocTitle.trim() });
    const selectedFolder = folders.find((f) => f.id === folderId);
    handleSelectRef({
      type: "doc", id, title: newDocTitle.trim(),
      icon: "📄", folderName: selectedFolder?.name,
    });
    setNewDocTitle("");
    setNewDocFolderId("none");
  };

  /* ── Call helpers ── */
  const hangUp = () => {
    setCallType(null); setCallPhase("calling"); setCallSecs(0); setIsMuted(false); setIsSpeaker(true);
  };
  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const avatarUrl = member?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`;

  /* ── Guard ── */
  if (!member && !loadingMsgs) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Miembro no encontrado.</div>;
  }

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-white relative">

      {/* ══ Call modal overlay ══ */}
      {callType && member && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-gray-900 py-10 px-8">
          <div className="flex flex-col items-center gap-1 pt-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {callType === "voice" ? "Llamada de voz" : "Videollamada"}
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">{member.name}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {callPhase === "calling"
                ? <span className="animate-pulse">Llamando...</span>
                : formatDuration(callSecs)}
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            {callPhase === "calling" && (
              <>
                <span className="absolute w-44 h-44 rounded-full bg-white/5 animate-ping" />
                <span className="absolute w-36 h-36 rounded-full bg-white/8 animate-pulse" />
              </>
            )}
            {callType === "video" && callPhase === "connected" ? (
              <div className="w-48 h-48 rounded-3xl bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-white/10">
                <img src={avatarUrl} alt={member.name} className="w-32 h-32 rounded-full opacity-90" />
              </div>
            ) : (
              <img src={avatarUrl} alt={member.name}
                className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl relative z-10" />
            )}
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => setIsMuted((v) => !v)}
              className={cn("w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all",
                isMuted ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25")}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[9px] font-medium">{isMuted ? "Activar" : "Silenciar"}</span>
            </button>
            <button onClick={hangUp}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-red-500/30 transition-all active:scale-95">
              <PhoneOff className="w-6 h-6" />
              <span className="text-[9px] font-medium">Colgar</span>
            </button>
            <button onClick={() => setIsSpeaker((v) => !v)}
              className={cn("w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all",
                !isSpeaker ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25")}>
              {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-[9px] font-medium">{isSpeaker ? "Altavoz" : "Auricular"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Chat header ── */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
        {member ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={avatarUrl} alt={member.name} className="w-9 h-9 rounded-full" />
              <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                member.is_online ? "bg-green-500" : "bg-gray-300")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{member.name}</p>
              <p className="text-xs leading-tight" style={{ color: member.is_online ? "#22C55E" : "#9CA3AF" }}>
                {member.is_online ? "En línea" : "Desconectado"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="space-y-1">
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-2.5 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => { setCallType("voice"); setIsMuted(false); setIsSpeaker(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#2F3988] transition-colors" title="Llamada de voz">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => { setCallType("video"); setIsMuted(false); setIsSpeaker(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#2F3988] transition-colors" title="Videollamada">
            <Video className="w-4 h-4" />
          </button>
          <div ref={moreMenuRef} className="relative">
            <button onClick={() => setShowMoreMenu((v) => !v)}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                showMoreMenu ? "bg-gray-100 text-gray-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600")} title="Más opciones">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52">
                {[
                  { icon: UserSearch, label: "Ver perfil" },
                  { icon: Search,     label: "Buscar en conversación" },
                  { icon: BellOff,    label: "Silenciar notificaciones" },
                  { icon: Archive,    label: "Archivar conversación" },
                ].map(({ icon: Icon, label }) => (
                  <button key={label} onClick={() => setShowMoreMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left">
                    <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors text-left">
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Eliminar conversación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[11px] text-gray-400 font-medium">Hoy</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {loadingMsgs ? (
          <div className="space-y-4 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex items-end gap-2", i % 2 === 0 ? "flex-row" : "flex-row-reverse")}>
                <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />
                <div className={cn("h-9 rounded-2xl bg-gray-100 animate-pulse", i % 2 === 0 ? "w-48" : "w-36")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm text-gray-400">
              {member ? `Inicia una conversación con ${member.name.split(" ")[0]}` : "Sin mensajes aún"}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe     = msg.from === "me";
            const prevSame = i > 0 && messages[i - 1].from === msg.from;
            const nextSame = i < messages.length - 1 && messages[i + 1].from === msg.from;

            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row", prevSame ? "mt-0.5" : "mt-4")}>
                {!isMe && (
                  <div className="w-7 flex-shrink-0 self-end">
                    {!nextSame && member && <img src={avatarUrl} alt={member.name} className="w-7 h-7 rounded-full" />}
                  </div>
                )}

                <div className={cn("max-w-[65%] group flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                  {msg.text && (
                    <div className={cn("px-3.5 py-2 text-sm leading-relaxed",
                      isMe
                        ? "bg-[#2F3988] text-white rounded-2xl rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                    )}>
                      {msg.text}
                    </div>
                  )}

                  {msg.reference && (
                    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm min-w-[230px] max-w-[280px]">
                      {msg.reference.type === "task" ? (
                        <TaskRefCard ref_={msg.reference} workspace={workspace} />
                      ) : (
                        <DocRefCard ref_={msg.reference} workspace={workspace} />
                      )}
                    </div>
                  )}

                  <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isMe ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[10px] text-gray-400">{msg.time}</span>
                    {isMe && (msg.read
                      ? <CheckCheck className="w-3 h-3 text-[#9ACCEC]" />
                      : <Check className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-gray-100">
        <div className="relative">

          {/* ── Emoji Picker ── */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef}
              className="absolute bottom-full right-0 mb-2 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="flex border-b border-gray-100">
                {EMOJI_GROUPS.map((group, idx) => (
                  <button key={group.label} onClick={() => setActiveEmojiGroup(idx)}
                    className={cn("flex-1 py-2 text-[10px] font-semibold transition-colors",
                      activeEmojiGroup === idx ? "text-[#2F3988] border-b-2 border-[#2F3988] -mb-px" : "text-gray-400 hover:text-gray-600")}>
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="p-3 grid grid-cols-8 gap-0.5 max-h-[200px] overflow-y-auto">
                {EMOJI_GROUPS[activeEmojiGroup].emojis.map((emoji) => (
                  <button key={emoji} onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-gray-100 transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ Reference Panel ══ */}
          {showRefPanel && (
            <div ref={refPanelRef}
              className="absolute bottom-full left-0 mb-2 w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50">

              {createMode === "task" ? (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <button onClick={() => setCreateMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <ClipboardList className="w-3.5 h-3.5 text-[#2F3988]" />
                    <span className="text-xs font-bold text-gray-700">Nueva tarea</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Título</label>
                      <input ref={newTaskRef} type="text" value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                        placeholder="Nombre de la tarea..."
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Proyecto</label>
                      <div className="relative">
                        <select value={newTaskProjectId}
                          onChange={(e) => { setNewTaskProjectId(e.target.value); setNewTaskListId(getProjectColumns(e.target.value)[0]?.id ?? "todo"); }}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8">
                          {FORM_PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Columna</label>
                      <div className="relative">
                        <select value={newTaskListId} onChange={(e) => setNewTaskListId(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8">
                          {getProjectColumns(newTaskProjectId).map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                        </select>
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                          style={{ background: getProjectColumns(newTaskProjectId).find((c) => c.id === newTaskListId)?.color ?? "#9CA3AF" }} />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Prioridad</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(["low","med","high","urgent"] as Priority[]).map((p) => {
                          const cfg = PRIORITY_CFG[p];
                          return (
                            <button key={p} type="button" onClick={() => setNewTaskPriority(p)}
                              className={cn("py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                newTaskPriority === p ? "border-transparent shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50")}
                              style={newTaskPriority === p ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color + "40" } : {}}>
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setCreateMode(null)}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#2F3988] rounded-lg disabled:opacity-30 hover:bg-[#252f6e] transition-colors">
                        Crear y referenciar
                      </button>
                    </div>
                  </div>
                </>
              ) : createMode === "doc" ? (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <button onClick={() => setCreateMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <FileText className="w-3.5 h-3.5 text-[#2F3988]" />
                    <span className="text-xs font-bold text-gray-700">Nuevo documento</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Título</label>
                      <input ref={newDocRef} type="text" value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateDoc()}
                        placeholder="Nombre del documento..."
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Carpeta</label>
                      <div className="relative">
                        <select value={newDocFolderId} onChange={(e) => setNewDocFolderId(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8">
                          <option value="none">📁 Sin carpeta</option>
                          {folders.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                      {folders.length === 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">No hay carpetas creadas. Puedes crearlas en la sección de Documentos.</p>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      El documento se creará en{" "}
                      <span className="font-medium text-gray-600">
                        {newDocFolderId === "none" ? "la raíz de Documentos" : folders.find((f) => f.id === newDocFolderId)?.name ?? "la carpeta seleccionada"}
                      </span>{" "}y podrás editarlo después.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setCreateMode(null)}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleCreateDoc} disabled={!newDocTitle.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#2F3988] rounded-lg disabled:opacity-30 hover:bg-[#252f6e] transition-colors">
                        Crear y referenciar
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                      <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <input ref={refQueryRef} type="text" value={refQuery}
                        onChange={(e) => setRefQuery(e.target.value)}
                        placeholder="Buscar tareas o documentos..."
                        className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400" />
                      {refQuery && (
                        <button onClick={() => setRefQuery("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
                    {(["tasks", "docs"] as const).map((tab) => (
                      <button key={tab} onClick={() => setRefTab(tab)}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                          refTab === tab ? "bg-[#2F3988] text-white" : "text-gray-500 hover:bg-gray-100")}>
                        {tab === "tasks" ? <ClipboardList className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {tab === "tasks" ? "Tareas" : "Documentos"}
                        <span className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-bold",
                          refTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                          {tab === "tasks" ? filteredTasks.length : filteredDocs.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[220px] overflow-y-auto">
                    {refTab === "tasks" ? (
                      filteredTasks.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No hay tareas que coincidan</p>
                      ) : filteredTasks.map((task) => {
                        const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.med;
                        return (
                          <button key={task.id}
                            onClick={() => handleSelectRef({ type: "task", id: task.id, title: task.title, listName: task.listName, listColor: task.listColor, priority: task.priority })}
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50/60 transition-colors text-left border-b border-gray-50 last:border-0">
                            <ClipboardList className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate leading-snug">{task.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.listColor }} />
                                <span className="text-[10px] text-gray-400">{task.listName}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      filteredDocs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No hay documentos que coincidan</p>
                      ) : filteredDocs.map((doc) => {
                        const folderName = getFolderName(doc.folderId);
                        return (
                          <button key={doc.id}
                            onClick={() => handleSelectRef({ type: "doc", id: doc.id, title: doc.title, icon: doc.icon, folderName })}
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50/60 transition-colors text-left border-b border-gray-50 last:border-0">
                            <span className="text-lg leading-none flex-shrink-0 mt-0.5">{doc.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate leading-snug">{doc.title}</p>
                              {folderName && <p className="text-[10px] text-gray-400 mt-0.5">{folderName}</p>}
                              {doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {doc.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button onClick={() => setCreateMode("task")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 rounded-md bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3 h-3 text-[#2F3988]" />
                      </div>
                      <span>Crear nueva tarea</span>
                    </button>
                    <button onClick={() => setCreateMode("doc")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <div className="w-5 h-5 rounded-md bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3 h-3 text-green-600" />
                      </div>
                      <span>Crear nuevo documento</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Pending reference chip ── */}
          {pendingRef && (
            <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              {pendingRef.type === "task" ? (
                <ClipboardList className="w-3.5 h-3.5 text-[#2F3988] flex-shrink-0" />
              ) : (
                <span className="text-sm leading-none flex-shrink-0">{pendingRef.icon ?? "📄"}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#2F3988] truncate">{pendingRef.title}</p>
                <p className="text-[10px] text-gray-400">{pendingRef.type === "task" ? pendingRef.listName : pendingRef.folderName ?? "Documento"}</p>
              </div>
              <button onClick={() => setPendingRef(null)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Input box ── */}
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-[#9ACCEC] transition-colors">
            <button onClick={() => { setShowRefPanel((v) => !v); setShowEmojiPicker(false); }}
              title="Referenciar tarea o documento"
              className={cn("mb-1 w-6 h-6 flex items-center justify-center rounded-lg transition-colors flex-shrink-0",
                showRefPanel ? "bg-[#2F3988] text-white" : "text-gray-400 hover:text-[#2F3988] hover:bg-blue-50")}>
              <Plus className="w-4 h-4" />
            </button>

            <textarea ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={member ? `Mensaje a ${member.name.split(" ")[0]}...` : "Escribe un mensaje..."}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none resize-none placeholder:text-gray-400 py-1 max-h-32"
              style={{ lineHeight: "1.5" }} />

            <button onClick={() => { setShowEmojiPicker((v) => !v); setShowRefPanel(false); }}
              className={cn("mb-1 transition-colors flex-shrink-0", showEmojiPicker ? "text-[#2F3988]" : "text-gray-400 hover:text-gray-600")}
              title="Insertar emoji">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5} />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5} />
              </svg>
            </button>

            <button onClick={sendMessage} disabled={!input.trim() && !pendingRef}
              className={cn("mb-0.5 w-8 h-8 flex items-center justify-center rounded-xl transition-all flex-shrink-0",
                (input.trim() || pendingRef)
                  ? "bg-[#2F3988] text-white hover:bg-[#252f6e] shadow-sm active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed")}
              title="Enviar mensaje">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
          Enter para enviar · Shift+Enter para nueva línea ·{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-gray-500">
            <Plus className="w-2.5 h-2.5" /> para referenciar tareas o documentos
          </span>
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   REFERENCE CARD COMPONENTS
══════════════════════════════════════════════ */
function TaskRefCard({ ref_, workspace }: { ref_: Reference; workspace: string }) {
  const pc = ref_.priority ? PRIORITY_CFG[ref_.priority] : null;
  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <ClipboardList className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tarea</span>
        {pc && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-snug mb-1.5">{ref_.title}</p>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ref_.listColor ?? "#9CA3AF" }} />
        <span className="text-[11px] text-gray-500">{ref_.listName}</span>
      </div>
      <Link href={`/${workspace}/projects/ecommerce-website/kanban`}
        className="inline-flex items-center gap-1 text-[11px] text-[#2F3988] font-semibold hover:underline underline-offset-2">
        <ExternalLink className="w-3 h-3" />
        Ver tarea
      </Link>
    </div>
  );
}

function DocRefCard({ ref_, workspace }: { ref_: Reference; workspace: string }) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Documento</span>
      </div>
      <div className="flex items-start gap-2 mb-2.5">
        <span className="text-xl leading-none flex-shrink-0">{ref_.icon ?? "📄"}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-snug">{ref_.title}</p>
          {ref_.folderName && <p className="text-[10px] text-gray-400 mt-0.5">{ref_.folderName}</p>}
        </div>
      </div>
      <Link href={`/${workspace}/docs/${ref_.id}`}
        className="inline-flex items-center gap-1 text-[11px] text-[#2F3988] font-semibold hover:underline underline-offset-2">
        <ExternalLink className="w-3 h-3" />
        Ver documento
      </Link>
    </div>
  );
}
