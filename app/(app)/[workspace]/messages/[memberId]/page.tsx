"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Send, Phone, Video, MoreHorizontal, Check, CheckCheck,
  Plus, Search, X, ExternalLink, ArrowLeft,
  ClipboardList, FileText,
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  BellOff, Archive, Trash2, UserSearch,
} from "lucide-react";
import { WORKSPACE_MEMBERS, MOCK_LISTS } from "@/lib/data/mockData";
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
  // task
  listName?: string;
  listColor?: string;
  priority?: string;
  // doc
  icon?: string;
  folderName?: string;
}

interface ChatMessage {
  from: "me" | "them";
  text: string;
  time: string;
  read?: boolean;
  reference?: Reference;
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

/* Projects available for task creation */
const FORM_PROJECTS = [
  { id: "ecommerce-website", name: "E-Commerce Website", icon: "🛍️" },
  { id: "company-web",       name: "Web Corporativo",     icon: "🌐" },
  { id: "graphic-design",    name: "Diseño Gráfico",      icon: "🎨" },
  { id: "mobile-app",        name: "App Móvil",           icon: "📱" },
  { id: "landing",           name: "Landing Page",        icon: "🚀" },
];

/* Default columns (used for all projects; ecommerce uses MOCK_LISTS names too) */
const DEFAULT_COLUMNS = [
  { id: "todo",        name: "Por Hacer",   color: "#EF4444" },
  { id: "in-progress", name: "En Progreso", color: "#3B82F6" },
  { id: "review",      name: "En Revisión", color: "#F59E0B" },
  { id: "done",        name: "Completado",  color: "#22C55E" },
];

/* Return the columns for a given project (ecommerce uses real lists, others use defaults) */
function getProjectColumns(projectId: string) {
  if (projectId === "ecommerce-website") {
    return MOCK_LISTS.map((l) => ({ id: l.id, name: l.name, color: l.color }));
  }
  return DEFAULT_COLUMNS;
}

const EMOJI_GROUPS = [
  { label: "Frecuentes", emojis: ["😀","😂","❤️","👍","🙌","🔥","✅","🎉","😊","🙏","💪","🚀"] },
  { label: "Caras",   emojis: ["😀","😃","😄","😁","😅","🤣","😊","😇","🥰","😍","🤩","😘","😗","☺️","🙂","🤔","😐","😶","😏","😒","😞","😟","😕","☹️","😣","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","😈","😴"] },
  { label: "Gestos",  emojis: ["👍","👎","👏","🙌","🤝","🙏","✌️","🤞","🤟","🤘","🤙","👋","🖐️","✋","💪","👊","✊","🫶","❤️","🧡","💛","💚","💙","💜"] },
  { label: "Objetos", emojis: ["🔥","✅","❌","⭐","🎉","🎊","🚀","💡","📌","📎","🔧","💻","📱","⚡","🎯","📊","📈","📝","🔍","📧","🔔","⏰","🗓️","💬"] },
];

const AUTO_REPLIES = [
  "Entendido, gracias por la info.",
  "Perfecto, lo reviso.",
  "Genial! Te confirmo más tarde.",
  "Ok, dame un momento.",
  "Claro, sin problema 👍",
  "Anotado ✅",
  "Dale, ahora lo veo 🔍",
];

/* ══════════════════════════════════════════════
   MOCK CONVERSATIONS (some with references)
══════════════════════════════════════════════ */
const MOCK_CONVERSATIONS: Record<string, ChatMessage[]> = {
  michael: [
    { from: "them", text: "Hola! ¿Cómo va el avance con la integración de Stripe?", time: "09:14" },
    { from: "me",   text: "Bien, ya terminé los webhooks. Me falta el manejo de errores.", time: "09:17", read: true },
    { from: "them", text: "Perfecto. ¿Crees que lo tengas listo para el viernes?", time: "09:18" },
    { from: "me",   text: "Sí, sin problema. También voy a incluir los tests.", time: "09:20", read: true },
    { from: "them", text: "Excelente 👍 Avísame si necesitas ayuda con algo.", time: "09:21" },
    { from: "me",   text: "Claro, gracias Michael.", time: "09:22", read: true },
    { from: "them", text: "Una cosa más — ¿puedes revisar el PR que subí ayer?", time: "10:45" },
    { from: "me",   text: "Lo reviso ahorita y te dejo comentarios.", time: "10:47", read: true },
    { from: "them", text: "¡Genial! Es para hoy en la tarde. Aquí la tarea de referencia:",  time: "10:48",
      reference: { type: "task", id: "t6", title: "Panel de administración de inventario",
        listName: "En Progreso", listColor: "#3B82F6", priority: "high" } },
  ],
  sofia: [
    { from: "them", text: "Hola! Subí los nuevos wireframes del carrito al Figma. ¿Los puedes revisar?", time: "08:30" },
    { from: "me",   text: "Claro, los veo ahora mismo.", time: "08:45", read: true },
    { from: "them", text: "Hay dos propuestas. La opción B tiene el flujo simplificado que discutimos.", time: "08:46" },
    { from: "me",   text: "Me gusta más la opción B, el checkout de 2 pasos se ve mucho más limpio.", time: "09:00", read: true },
    { from: "them", text: "Genial! Entonces procedo con esa. Empiezo los high-fidelity hoy.", time: "09:02" },
    { from: "me",   text: "Perfecto. ¿Cuándo tienes el prototipo listo para testear?", time: "09:05", read: true },
    { from: "them", text: "El jueves a más tardar. También te comparto el doc de diseño:", time: "09:07",
      reference: { type: "doc", id: "doc-1", title: "Guía de Diseño del Proyecto", icon: "🎨", folderName: "Diseño & Técnico" } },
  ],
  daniel: [
    { from: "me",   text: "Daniel, necesito que revises el sistema de filtros antes de hacer merge.", time: "11:00", read: true },
    { from: "them", text: "Claro, ¿qué branch es?", time: "11:30" },
    { from: "me",   text: "feature/advanced-filters. El PR está en GitHub.", time: "11:32", read: true },
    { from: "them", text: "Lo veo. Hay un issue con el filtro de precio cuando el rango mínimo es 0.", time: "13:15" },
    { from: "me",   text: "Tienes razón, lo corrijo ya.", time: "13:20", read: true },
    { from: "them", text: "También hay un bug menor con el sorting al combinar múltiples filtros.", time: "13:22" },
    { from: "me",   text: "Anotado. ¿Puedes abrir un issue con los pasos para reproducirlo?", time: "13:25", read: true },
    { from: "them", text: "Ya lo abrí, issue #47.", time: "13:27" },
  ],
  emma: [
    { from: "them", text: "Hola! ¿Cómo va la optimización SEO?", time: "10:00" },
    { from: "me",   text: "Ya tenemos las meta tags y el structured data implementado.", time: "10:05", read: true },
    { from: "them", text: "Wow, rápido! ¿Y el sitemap dinámico?", time: "10:07" },
    { from: "me",   text: "Lo termino hoy. Generamos uno por categoría de producto.", time: "10:10", read: true },
    { from: "them", text: "Perfecto. El cliente estaba preguntando por eso específicamente.", time: "10:12" },
    { from: "me",   text: "Ya sé 😅 Lo subo al staging para revisión mañana.", time: "10:15", read: true },
    { from: "them", text: "Genial. ¿Puedes preparar un reporte con métricas de Lighthouse?", time: "10:18" },
    { from: "me",   text: "Sí, lo incluyo en el documento de la semana.", time: "10:20", read: true },
    { from: "them", text: "¡Gracias! Eres lo mejor 🙌", time: "10:21" },
  ],
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MessagesPage() {
  const params    = useParams();
  const memberId  = params.memberId  as string;
  const workspace = params.workspace as string;

  const member       = WORKSPACE_MEMBERS.find((m) => m.id === memberId);
  const conversation = MOCK_CONVERSATIONS[memberId] ?? [];

  /* ── Store ── */
  const { docs, folders, addDoc, updateDoc } = useDocsStore();
  const addTask = useKanbanStore((s) => s.addTask);

  /* ── Chat state ── */
  const [messages,        setMessages]        = useState<ChatMessage[]>(conversation);
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

  /* ── Effects ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const h = (e: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmojiPicker]);

  // Close ref panel on outside click
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

  // Focus search when panel opens; focus create input when mode changes
  useEffect(() => {
    if (showRefPanel && !createMode) setTimeout(() => refQueryRef.current?.focus(), 50);
  }, [showRefPanel, createMode]);
  useEffect(() => {
    if (createMode === "task") setTimeout(() => newTaskRef.current?.focus(), 50);
    if (createMode === "doc")  setTimeout(() => newDocRef.current?.focus(),  50);
  }, [createMode]);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const h = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMoreMenu]);

  // Auto-answer call after 2.5s
  useEffect(() => {
    if (!callType) { setCallPhase("calling"); setCallSecs(0); return; }
    const id = setTimeout(() => setCallPhase("connected"), 2500);
    return () => clearTimeout(id);
  }, [callType]);

  // Call duration timer
  useEffect(() => {
    if (callType === null || callPhase !== "connected") return;
    const id = setInterval(() => setCallSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callType, callPhase]);

  // Re-init on member change
  useEffect(() => {
    setMessages(MOCK_CONVERSATIONS[memberId] ?? []);
    setInput("");
    setPendingRef(null);
    setShowRefPanel(false);
    setCreateMode(null);
    setNewTaskProjectId("ecommerce-website");
    setNewTaskListId("todo");
    setNewDocFolderId("none");
  }, [memberId]);

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
  const sendMessage = () => {
    const text = input.trim();
    if (!text && !pendingRef) return;
    if (!member) return;

    const now  = new Date();
    const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { from: "me", text: text || "Aquí la referencia:", time, read: false, reference: pendingRef ?? undefined },
    ]);
    setInput("");
    setPendingRef(null);
    setShowEmojiPicker(false);
    inputRef.current?.focus();

    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const t2    = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [...prev, { from: "them", text: reply, time: t2 }]);
    }, 1200 + Math.random() * 800);
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
    // Add to kanban store (affects current loaded project)
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

  const handleCreateDoc = () => {
    if (!newDocTitle.trim()) return;
    const folderId = newDocFolderId === "none" ? undefined : newDocFolderId;
    const id = addDoc(folderId);
    updateDoc(id, { title: newDocTitle.trim() });
    const selectedFolder = folders.find((f) => f.id === folderId);
    handleSelectRef({
      type: "doc",
      id,
      title: newDocTitle.trim(),
      icon: "📄",
      folderName: selectedFolder?.name,
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

  /* ── Guard ── */
  if (!member) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Miembro no encontrado.</div>;
  }

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-white relative">

      {/* ══ Call modal overlay ══ */}
      {callType && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-gray-900 py-10 px-8">

          {/* Top: type label */}
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

          {/* Center: avatar with pulse */}
          <div className="relative flex items-center justify-center">
            {callPhase === "calling" && (
              <>
                <span className="absolute w-44 h-44 rounded-full bg-white/5 animate-ping" />
                <span className="absolute w-36 h-36 rounded-full bg-white/8 animate-pulse" />
              </>
            )}
            {callType === "video" && callPhase === "connected" ? (
              /* Simulated video area */
              <div className="w-48 h-48 rounded-3xl bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-white/10">
                <img src={member.avatar} alt={member.name} className="w-32 h-32 rounded-full opacity-90" />
              </div>
            ) : (
              <img src={member.avatar} alt={member.name}
                className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl relative z-10" />
            )}
          </div>

          {/* Bottom: controls */}
          <div className="flex items-center gap-5">
            {/* Mute */}
            <button
              onClick={() => setIsMuted((v) => !v)}
              className={cn(
                "w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all",
                isMuted ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25"
              )}
              title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[9px] font-medium">{isMuted ? "Activar" : "Silenciar"}</span>
            </button>

            {/* Hang up */}
            <button
              onClick={hangUp}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-red-500/30 transition-all active:scale-95"
              title="Colgar"
            >
              <PhoneOff className="w-6 h-6" />
              <span className="text-[9px] font-medium">Colgar</span>
            </button>

            {/* Speaker */}
            <button
              onClick={() => setIsSpeaker((v) => !v)}
              className={cn(
                "w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all",
                !isSpeaker ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25"
              )}
              title={isSpeaker ? "Desactivar altavoz" : "Activar altavoz"}
            >
              {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-[9px] font-medium">{isSpeaker ? "Altavoz" : "Auricular"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Chat header ── */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full" />
            <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
              member.isOnline ? "bg-green-500" : "bg-gray-300")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{member.name}</p>
            <p className="text-xs leading-tight" style={{ color: member.isOnline ? "#22C55E" : "#9CA3AF" }}>
              {member.isOnline ? "En línea" : "Desconectado"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Voice call */}
          <button
            onClick={() => { setCallType("voice"); setIsMuted(false); setIsSpeaker(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#2F3988] transition-colors"
            title="Llamada de voz"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video call */}
          <button
            onClick={() => { setCallType("video"); setIsMuted(false); setIsSpeaker(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#2F3988] transition-colors"
            title="Videollamada"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* More options */}
          <div ref={moreMenuRef} className="relative">
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                showMoreMenu ? "bg-gray-100 text-gray-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              )}
              title="Más opciones"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52">
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <UserSearch className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Ver perfil
                </button>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Buscar en conversación
                </button>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <BellOff className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Silenciar notificaciones
                </button>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <Archive className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  Archivar conversación
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors text-left"
                >
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

        {messages.map((msg, i) => {
          const isMe     = msg.from === "me";
          const prevSame = i > 0 && messages[i - 1].from === msg.from;
          const nextSame = i < messages.length - 1 && messages[i + 1].from === msg.from;

          return (
            <div key={i} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row", prevSame ? "mt-0.5" : "mt-4")}>
              {/* Avatar */}
              {!isMe && (
                <div className="w-7 flex-shrink-0 self-end">
                  {!nextSame && <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-full" />}
                </div>
              )}

              {/* Bubble + reference card + timestamp */}
              <div className={cn("max-w-[65%] group flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                {/* Text bubble */}
                {msg.text && (
                  <div className={cn("px-3.5 py-2 text-sm leading-relaxed",
                    isMe
                      ? "bg-[#2F3988] text-white rounded-2xl rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                  )}>
                    {msg.text}
                  </div>
                )}

                {/* ── Reference card (always white, separate from bubble) ── */}
                {msg.reference && (
                  <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm min-w-[230px] max-w-[280px]">
                    {msg.reference.type === "task" ? (
                      <TaskRefCard ref_={msg.reference} workspace={workspace} />
                    ) : (
                      <DocRefCard ref_={msg.reference} workspace={workspace} />
                    )}
                  </div>
                )}

                {/* Timestamp */}
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
        })}
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
                /* ── Create task form ── */
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <button onClick={() => setCreateMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <ClipboardList className="w-3.5 h-3.5 text-[#2F3988]" />
                    <span className="text-xs font-bold text-gray-700">Nueva tarea</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Título</label>
                      <input
                        ref={newTaskRef}
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                        placeholder="Nombre de la tarea..."
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors"
                      />
                    </div>

                    {/* Project selector */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Proyecto</label>
                      <div className="relative">
                        <select
                          value={newTaskProjectId}
                          onChange={(e) => {
                            setNewTaskProjectId(e.target.value);
                            // Reset to first column of new project
                            const cols = getProjectColumns(e.target.value);
                            setNewTaskListId(cols[0]?.id ?? "todo");
                          }}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8"
                        >
                          {FORM_PROJECTS.map((p) => (
                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                          ))}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                    </div>

                    {/* Column — updates based on project */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Columna</label>
                      <div className="relative">
                        <select
                          value={newTaskListId}
                          onChange={(e) => setNewTaskListId(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8"
                        >
                          {getProjectColumns(newTaskProjectId).map((col) => (
                            <option key={col.id} value={col.id}>{col.name}</option>
                          ))}
                        </select>
                        {/* Color dot for selected column */}
                        <span
                          className="absolute right-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                          style={{ background: getProjectColumns(newTaskProjectId).find((c) => c.id === newTaskListId)?.color ?? "#9CA3AF" }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Prioridad</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(["low","med","high","urgent"] as Priority[]).map((p) => {
                          const cfg = PRIORITY_CFG[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewTaskPriority(p)}
                              className={cn(
                                "py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                newTaskPriority === p
                                  ? "border-transparent shadow-sm"
                                  : "border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50"
                              )}
                              style={newTaskPriority === p ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color + "40" } : {}}
                            >
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
                      <button
                        onClick={handleCreateTask}
                        disabled={!newTaskTitle.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#2F3988] rounded-lg disabled:opacity-30 hover:bg-[#252f6e] transition-colors"
                      >
                        Crear y referenciar
                      </button>
                    </div>
                  </div>
                </>
              ) : createMode === "doc" ? (
                /* ── Create doc form ── */
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <button onClick={() => setCreateMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <FileText className="w-3.5 h-3.5 text-[#2F3988]" />
                    <span className="text-xs font-bold text-gray-700">Nuevo documento</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Título</label>
                      <input
                        ref={newDocRef}
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateDoc()}
                        placeholder="Nombre del documento..."
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors"
                      />
                    </div>

                    {/* Folder selector */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                        Carpeta
                      </label>
                      <div className="relative">
                        <select
                          value={newDocFolderId}
                          onChange={(e) => setNewDocFolderId(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] bg-gray-50 focus:bg-white transition-colors appearance-none pr-8"
                        >
                          <option value="none">📁 Sin carpeta</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                          ))}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                      </div>
                      {folders.length === 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          No hay carpetas creadas. Puedes crearlas en la sección de Documentos.
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      El documento se creará en{" "}
                      <span className="font-medium text-gray-600">
                        {newDocFolderId === "none"
                          ? "la raíz de Documentos"
                          : folders.find((f) => f.id === newDocFolderId)?.name ?? "la carpeta seleccionada"}
                      </span>{" "}
                      y podrás editarlo después.
                    </p>

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setCreateMode(null)}
                        className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateDoc}
                        disabled={!newDocTitle.trim()}
                        className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#2F3988] rounded-lg disabled:opacity-30 hover:bg-[#252f6e] transition-colors"
                      >
                        Crear y referenciar
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Search + results ── */
                <>
                  {/* Panel header */}
                  <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                      <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <input
                        ref={refQueryRef}
                        type="text"
                        value={refQuery}
                        onChange={(e) => setRefQuery(e.target.value)}
                        placeholder="Buscar tareas o documentos..."
                        className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                      />
                      {refQuery && (
                        <button onClick={() => setRefQuery("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
                    <button
                      onClick={() => setRefTab("tasks")}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                        refTab === "tasks" ? "bg-[#2F3988] text-white" : "text-gray-500 hover:bg-gray-100")}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Tareas
                      <span className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-bold",
                        refTab === "tasks" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                        {filteredTasks.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setRefTab("docs")}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                        refTab === "docs" ? "bg-[#2F3988] text-white" : "text-gray-500 hover:bg-gray-100")}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Documentos
                      <span className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-bold",
                        refTab === "docs" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                        {filteredDocs.length}
                      </span>
                    </button>
                  </div>

                  {/* Results list */}
                  <div className="max-h-[220px] overflow-y-auto">
                    {refTab === "tasks" ? (
                      filteredTasks.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No hay tareas que coincidan</p>
                      ) : (
                        filteredTasks.map((task) => {
                          const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.med;
                          return (
                            <button
                              key={task.id}
                              onClick={() => handleSelectRef({
                                type: "task", id: task.id, title: task.title,
                                listName: task.listName, listColor: task.listColor,
                                priority: task.priority,
                              })}
                              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50/60 transition-colors text-left border-b border-gray-50 last:border-0"
                            >
                              <ClipboardList className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate leading-snug">{task.title}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.listColor }} />
                                  <span className="text-[10px] text-gray-400">{task.listName}</span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: pc.bg, color: pc.color }}>
                                    {pc.label}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )
                    ) : (
                      filteredDocs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No hay documentos que coincidan</p>
                      ) : (
                        filteredDocs.map((doc) => {
                          const folderName = getFolderName(doc.folderId);
                          return (
                            <button
                              key={doc.id}
                              onClick={() => handleSelectRef({
                                type: "doc", id: doc.id, title: doc.title,
                                icon: doc.icon, folderName,
                              })}
                              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50/60 transition-colors text-left border-b border-gray-50 last:border-0"
                            >
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
                      )
                    )}
                  </div>

                  {/* Create shortcuts */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => setCreateMode("task")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-md bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3 h-3 text-[#2F3988]" />
                      </div>
                      <span>Crear nueva tarea</span>
                    </button>
                    <button
                      onClick={() => setCreateMode("doc")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
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
              <button
                onClick={() => setPendingRef(null)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Input box ── */}
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-[#9ACCEC] transition-colors">

            {/* + Reference button */}
            <button
              onClick={() => { setShowRefPanel((v) => !v); setShowEmojiPicker(false); }}
              title="Referenciar tarea o documento"
              className={cn(
                "mb-1 w-6 h-6 flex items-center justify-center rounded-lg transition-colors flex-shrink-0",
                showRefPanel ? "bg-[#2F3988] text-white" : "text-gray-400 hover:text-[#2F3988] hover:bg-blue-50"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={`Mensaje a ${member.name.split(" ")[0]}...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none resize-none placeholder:text-gray-400 py-1 max-h-32"
              style={{ lineHeight: "1.5" }}
            />

            {/* Emoji button */}
            <button
              onClick={() => { setShowEmojiPicker((v) => !v); setShowRefPanel(false); }}
              className={cn("mb-1 transition-colors flex-shrink-0",
                showEmojiPicker ? "text-[#2F3988]" : "text-gray-400 hover:text-gray-600")}
              title="Insertar emoji"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor"
                strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2.5} />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2.5} />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !pendingRef}
              className={cn("mb-0.5 w-8 h-8 flex items-center justify-center rounded-xl transition-all flex-shrink-0",
                (input.trim() || pendingRef)
                  ? "bg-[#2F3988] text-white hover:bg-[#252f6e] shadow-sm active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed")}
              title="Enviar mensaje"
            >
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
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: pc.bg, color: pc.color }}>
            {pc.label}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-snug mb-1.5">{ref_.title}</p>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ref_.listColor ?? "#9CA3AF" }} />
        <span className="text-[11px] text-gray-500">{ref_.listName}</span>
      </div>
      <Link
        href={`/${workspace}/projects/ecommerce-website/kanban`}
        className="inline-flex items-center gap-1 text-[11px] text-[#2F3988] font-semibold hover:underline underline-offset-2"
      >
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
      <Link
        href={`/${workspace}/docs/${ref_.id}`}
        className="inline-flex items-center gap-1 text-[11px] text-[#2F3988] font-semibold hover:underline underline-offset-2"
      >
        <ExternalLink className="w-3 h-3" />
        Ver documento
      </Link>
    </div>
  );
}
