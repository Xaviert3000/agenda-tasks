"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Code2, Minus,
  Trash2, Check, Clock, Tag, MessageSquare, X, Send, CheckCheck,
} from "lucide-react";
import { useDocsStore } from "@/lib/store/docsStore";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   SLASH COMMANDS
══════════════════════════════════════════════ */
interface SlashCmd {
  id: string;
  group: string;
  label: string;
  keywords: string[];
  iconLabel: string;
  iconColor?: string;
  iconBg?: string;
  execCmd?: string;
  execVal?: string;
  insertHtml?: string;
  special?: "image" | "file";
}

const SLASH_CMDS: SlashCmd[] = [
  // ── TEXTO ──
  { id:"p",      group:"TEXTO", label:"Texto normal",      keywords:["texto","normal","párrafo"],      iconLabel:"T",    execCmd:"formatBlock", execVal:"p" },
  { id:"h1",     group:"TEXTO", label:"Título 1",           keywords:["título","h1","heading"],          iconLabel:"H₁",   execCmd:"formatBlock", execVal:"h1" },
  { id:"h2",     group:"TEXTO", label:"Título 2",           keywords:["título","h2"],                    iconLabel:"H₂",   execCmd:"formatBlock", execVal:"h2" },
  { id:"h3",     group:"TEXTO", label:"Título 3",           keywords:["título","h3"],                    iconLabel:"H₃",   execCmd:"formatBlock", execVal:"h3" },
  { id:"h4",     group:"TEXTO", label:"Título 4",           keywords:["título","h4"],                    iconLabel:"H₄",   execCmd:"formatBlock", execVal:"h4" },
  { id:"ul",     group:"TEXTO", label:"Lista con viñetas",  keywords:["lista","viñetas","bullet"],       iconLabel:"•≡",   execCmd:"insertUnorderedList" },
  { id:"ol",     group:"TEXTO", label:"Lista numerada",     keywords:["lista","numerada","ordered"],     iconLabel:"1≡",   execCmd:"insertOrderedList" },
  { id:"bq",     group:"TEXTO", label:"Bloquear cita",      keywords:["cita","quote","bloquear"],        iconLabel:"❝",    execCmd:"formatBlock", execVal:"blockquote" },
  { id:"pre",    group:"TEXTO", label:"Bloque de código",   keywords:["código","code","pre"],            iconLabel:"</>",  execCmd:"formatBlock", execVal:"pre" },
  { id:"hr",     group:"TEXTO", label:"Divisor",            keywords:["divisor","línea","separador"],    iconLabel:"—",    execCmd:"insertHorizontalRule" },
  {
    id:"banner", group:"TEXTO", label:"Banners",            keywords:["banner","alerta","info"],         iconLabel:"🔖",
    insertHtml:`<div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:12px 16px;border-radius:6px;margin:12px 0;color:#1E40AF"><strong>💡 Nota</strong><br>Escribe aquí tu mensaje.</div><p><br></p>`,
  },
  // ── BLOQUES AVANZADOS ──
  {
    id:"table",  group:"BLOQUES AVANZADOS", label:"Tabla",  keywords:["tabla","table"],                 iconLabel:"⊞",
    insertHtml:`<table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><th style="border:1px solid #e5e7eb;padding:8px 12px;background:#f9fafb;text-align:left;font-size:13px">Columna 1</th><th style="border:1px solid #e5e7eb;padding:8px 12px;background:#f9fafb;text-align:left;font-size:13px">Columna 2</th><th style="border:1px solid #e5e7eb;padding:8px 12px;background:#f9fafb;text-align:left;font-size:13px">Columna 3</th></tr><tr><td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px">·</td><td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px">·</td><td style="border:1px solid #e5e7eb;padding:8px 12px;font-size:13px">·</td></tr></table><p><br></p>`,
  },
  {
    id:"cols",   group:"BLOQUES AVANZADOS", label:"Columnas", keywords:["columnas","columns","layout"],  iconLabel:"⊟",
    insertHtml:`<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0"><div style="border:1px dashed #e5e7eb;padding:12px;border-radius:6px;min-height:60px">Columna izquierda</div><div style="border:1px dashed #e5e7eb;padding:12px;border-radius:6px;min-height:60px">Columna derecha</div></div><p><br></p>`,
  },
  {
    id:"btn",    group:"BLOQUES AVANZADOS", label:"Botón",    keywords:["botón","button"],               iconLabel:"▶",
    insertHtml:`<p><a href="#" style="display:inline-block;background:#2F3988;color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Texto del botón</a></p><p><br></p>`,
  },
  // ── INSERTADO ──
  {
    id:"@p",     group:"INSERTADO", label:"Mencionar persona", keywords:["mencionar","persona","@"],    iconLabel:"@",
    insertHtml:`<span style="background:#EFF6FF;color:#2F3988;padding:2px 7px;border-radius:4px;font-size:13px;font-weight:500">@Usuario</span>&nbsp;`,
  },
  {
    id:"@t",     group:"INSERTADO", label:"Menciona una tarea", keywords:["tarea","task","mencionar"],  iconLabel:"☑",
    insertHtml:`<span style="background:#F0FDF4;color:#15803D;padding:2px 7px;border-radius:4px;font-size:13px;font-weight:500;border:1px solid #86EFAC">📋 Tarea</span>&nbsp;`,
  },
  // ── ARCHIVOS ──
  {
    id:"img",    group:"ARCHIVOS", label:"Insertar imagen",    keywords:["imagen","foto","photo","image","picture"],  iconLabel:"🖼",
    special:"image",
  },
  {
    id:"file",   group:"ARCHIVOS", label:"Adjuntar archivo",   keywords:["archivo","file","adjuntar","attach","pdf"], iconLabel:"📎",
    special:"file",
  },
  // ── FORMATO ──
  { id:"bold",   group:"FORMATO", label:"Negrita",          keywords:["negrita","bold"],                iconLabel:"B",    execCmd:"bold" },
  { id:"italic", group:"FORMATO", label:"Cursiva",          keywords:["cursiva","italic"],              iconLabel:"I",    execCmd:"italic" },
  { id:"under",  group:"FORMATO", label:"Subrayado",        keywords:["subrayado","underline"],         iconLabel:"U_",   execCmd:"underline" },
  { id:"strike", group:"FORMATO", label:"Tachado",          keywords:["tachado","strike"],              iconLabel:"S̶",    execCmd:"strikeThrough" },
  { id:"clear",  group:"FORMATO", label:"Borrar formato",   keywords:["borrar","limpiar","formato"],    iconLabel:"⊘",    execCmd:"removeFormat" },
  // ── COLORES DEL TEXTO ──
  { id:"c-dflt", group:"COLORES DEL TEXTO", label:"Predeterminado", keywords:["color","predeterminado","default"], iconLabel:"A", iconColor:"#111827", execCmd:"foreColor", execVal:"#111827" },
  { id:"c-red",  group:"COLORES DEL TEXTO", label:"Rojo",    keywords:["color","rojo"],                 iconLabel:"A", iconColor:"#EF4444", execCmd:"foreColor", execVal:"#EF4444" },
  { id:"c-org",  group:"COLORES DEL TEXTO", label:"Naranja", keywords:["color","naranja"],              iconLabel:"A", iconColor:"#F97316", execCmd:"foreColor", execVal:"#F97316" },
  { id:"c-yel",  group:"COLORES DEL TEXTO", label:"Amarillo",keywords:["color","amarillo"],             iconLabel:"A", iconColor:"#EAB308", execCmd:"foreColor", execVal:"#EAB308" },
  { id:"c-blu",  group:"COLORES DEL TEXTO", label:"Azul",    keywords:["color","azul"],                 iconLabel:"A", iconColor:"#3B82F6", execCmd:"foreColor", execVal:"#3B82F6" },
  { id:"c-vio",  group:"COLORES DEL TEXTO", label:"Violeta", keywords:["color","violeta"],              iconLabel:"A", iconColor:"#8B5CF6", execCmd:"foreColor", execVal:"#8B5CF6" },
  { id:"c-pnk",  group:"COLORES DEL TEXTO", label:"Rosa",    keywords:["color","rosa"],                 iconLabel:"A", iconColor:"#EC4899", execCmd:"foreColor", execVal:"#EC4899" },
  { id:"c-grn",  group:"COLORES DEL TEXTO", label:"Verde",   keywords:["color","verde"],                iconLabel:"A", iconColor:"#22C55E", execCmd:"foreColor", execVal:"#22C55E" },
  { id:"c-gry",  group:"COLORES DEL TEXTO", label:"Gris",    keywords:["color","gris"],                 iconLabel:"A", iconColor:"#6B7280", execCmd:"foreColor", execVal:"#6B7280" },
  // ── ASPECTOS DESTACADOS ──
  { id:"h-rm",   group:"ASPECTOS DESTACADOS", label:"Quitar resaltado",      keywords:["quitar","resaltado","highlight"], iconLabel:"A", execCmd:"hiliteColor", execVal:"transparent" },
  { id:"h-red",  group:"ASPECTOS DESTACADOS", label:"Resaltado en rojo",     keywords:["resaltado","rojo"],              iconLabel:"A", iconColor:"#EF4444", iconBg:"#FEE2E2", execCmd:"hiliteColor", execVal:"#FEE2E2" },
  { id:"h-org",  group:"ASPECTOS DESTACADOS", label:"Resaltado en naranja",  keywords:["resaltado","naranja"],           iconLabel:"A", iconColor:"#F97316", iconBg:"#FFEDD5", execCmd:"hiliteColor", execVal:"#FFEDD5" },
  { id:"h-yel",  group:"ASPECTOS DESTACADOS", label:"Resaltado en amarillo", keywords:["resaltado","amarillo"],          iconLabel:"A", iconColor:"#EAB308", iconBg:"#FEF9C3", execCmd:"hiliteColor", execVal:"#FEF9C3" },
  { id:"h-blu",  group:"ASPECTOS DESTACADOS", label:"Resaltado en azul",     keywords:["resaltado","azul"],              iconLabel:"A", iconColor:"#3B82F6", iconBg:"#DBEAFE", execCmd:"hiliteColor", execVal:"#DBEAFE" },
  { id:"h-vio",  group:"ASPECTOS DESTACADOS", label:"Resaltado en violeta",  keywords:["resaltado","violeta"],           iconLabel:"A", iconColor:"#8B5CF6", iconBg:"#EDE9FE", execCmd:"hiliteColor", execVal:"#EDE9FE" },
  { id:"h-pnk",  group:"ASPECTOS DESTACADOS", label:"Resaltado en rosa",     keywords:["resaltado","rosa"],              iconLabel:"A", iconColor:"#EC4899", iconBg:"#FCE7F3", execCmd:"hiliteColor", execVal:"#FCE7F3" },
  { id:"h-grn",  group:"ASPECTOS DESTACADOS", label:"Resaltado en verde",    keywords:["resaltado","verde"],             iconLabel:"A", iconColor:"#22C55E", iconBg:"#DCFCE7", execCmd:"hiliteColor", execVal:"#DCFCE7" },
  { id:"h-gry",  group:"ASPECTOS DESTACADOS", label:"Resaltado en gris",     keywords:["resaltado","gris"],              iconLabel:"A", iconColor:"#6B7280", iconBg:"#F3F4F6", execCmd:"hiliteColor", execVal:"#F3F4F6" },
];

const DOC_ICONS = [
  "📄","📝","📋","🎨","⚙️","🗺️","💡","🔌","📊","🚀",
  "💼","🔖","📑","🗒️","📌","📐","🔍","🧩","🎯","🛠️",
];

const TAG_COLORS = [
  { bg:"#EFF6FF", text:"#2563EB" },
  { bg:"#F0FDF4", text:"#16A34A" },
  { bg:"#FDF4FF", text:"#9333EA" },
  { bg:"#FFF7ED", text:"#EA580C" },
  { bg:"#FFF1F2", text:"#E11D48" },
  { bg:"#F0FDFA", text:"#0D9488" },
];

function tagColor(tag: string) {
  const idx = tag.charCodeAt(0) % TAG_COLORS.length;
  return TAG_COLORS[idx];
}

type TeamMember = { id: string; name: string; role: string; avatar: string };

/* ── Render @mentions with highlight ── */
function renderMentionText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match @FirstName LastName (two capitalized words)
  const mentionRe = /@([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+ [A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(text)) !== null) {
    if (m.index > lastIdx) nodes.push(text.slice(lastIdx, m.index));
    nodes.push(
      <span
        key={m.index}
        className="inline-flex items-center bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md text-[11px] font-semibold"
      >
        {m[0]}
      </span>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes;
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function DocEditorPage() {
  const params    = useParams();
  const router    = useRouter();
  const workspace = params.workspace as string;
  const docId     = params.docId as string;

  const { docs, updateDoc, updateDocTags, deleteDoc, addComment, resolveComment, deleteComment } = useDocsStore();
  const doc = docs.find((d) => d.id === docId);

  // ── Editor local state ──
  const [title,          setTitle]          = useState(doc?.title ?? "Sin título");
  const [icon,           setIcon]           = useState(doc?.icon  ?? "📄");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saved,          setSaved]          = useState(true);

  // ── Panels ──
  const [showComments,   setShowComments]   = useState(false);
  const [showTags,       setShowTags]       = useState(false);
  const [newTag,         setNewTag]         = useState("");
  const [newComment,     setNewComment]     = useState("");
  const [showResolved,   setShowResolved]   = useState(false);

  // ── Image toolbar (resize) ──
  const [imgToolbar, setImgToolbar] = useState<{
    img: HTMLImageElement;
    top: number; left: number; width: number;
  } | null>(null);
  const imgToolbarRef = useRef<HTMLDivElement>(null);

  // ── Current user ──
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentUser({
        id: user.id,
        name: profile?.name ?? "Usuario",
        avatar: profile?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}&backgroundColor=b6e3f4`,
      });
    })();
  }, []);

  // ── Workspace members for @@ mentions ──
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", workspace).single();
      if (!ws) return;
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", ws.id);
      if (!members || members.length === 0) return;
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const mapped: TeamMember[] = members.map((m) => {
        const p = profileMap.get(m.user_id);
        return {
          id: p?.id ?? m.user_id,
          name: p?.name ?? "Usuario",
          role: "",
          avatar: p?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
        };
      });
      setTeamMembers(mapped);
    })();
  }, [workspace]);

  // ── @@ mention menu state (comment textarea) ──
  interface MentionState { query: string; atPos: number; }
  const [mentionMenu, setMentionMenu] = useState<MentionState | null>(null);
  const [mentionIdx,  setMentionIdx]  = useState(0);

  // ── Slash menu state ──
  interface SlashState {
    query: string;
    x: number; y: number;
    node: Text; nodeOffset: number; // position of '/' in text node
  }
  const [slashMenu, setSlashMenu]   = useState<SlashState | null>(null);
  const [slashIdx,  setSlashIdx]    = useState(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // ── Refs ──
  const titleRef      = useRef(title);
  const iconRef       = useRef(icon);
  const editorRef     = useRef<HTMLDivElement>(null);
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const tagInputRef   = useRef<HTMLInputElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const commentRef     = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { iconRef.current  = icon;  }, [icon]);

  // ── Image click → show resize toolbar ──
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.dataset.docImg) {
        const img = target as HTMLImageElement;
        const editorRect = editor.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        setImgToolbar({
          img,
          top: imgRect.top - editorRect.top - 44,
          left: imgRect.left - editorRect.left,
          width: img.offsetWidth,
        });
        e.stopPropagation();
      } else if (!imgToolbarRef.current?.contains(target)) {
        setImgToolbar(null);
      }
    };
    editor.addEventListener("click", handleClick);
    return () => editor.removeEventListener("click", handleClick);
  }, []);

  const setImageWidth = useCallback((pct: number) => {
    if (!imgToolbar) return;
    imgToolbar.img.style.width = `${pct}%`;
    imgToolbar.img.style.maxWidth = "100%";
    setImgToolbar((t) => t ? { ...t, width: imgToolbar.img.offsetWidth } : null);
    if (editorRef.current) {
      editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [imgToolbar]);

  // Re-init when navigating between docs
  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
    setIcon(doc.icon);
    titleRef.current = doc.title;
    iconRef.current  = doc.icon;
    if (editorRef.current) editorRef.current.innerHTML = doc.content;
    setSaved(true);
    setSlashMenu(null);
  }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close icon picker on outside click
  useEffect(() => {
    if (!showIconPicker) return;
    const h = (e: MouseEvent) => {
      if (!iconPickerRef.current?.contains(e.target as Node)) setShowIconPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showIconPicker]);

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return;
    const h = (e: MouseEvent) => {
      if (!slashMenuRef.current?.contains(e.target as Node) &&
          !editorRef.current?.contains(e.target as Node)) {
        setSlashMenu(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [slashMenu]);

  // Close mention menu on outside click
  useEffect(() => {
    if (!mentionMenu) return;
    const h = (e: MouseEvent) => {
      if (!mentionMenuRef.current?.contains(e.target as Node) &&
          !commentRef.current?.contains(e.target as Node)) {
        setMentionMenu(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [mentionMenu]);

  /* ── Save ── */
  const triggerSave = useCallback(() => {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const content = editorRef.current?.innerHTML ?? "";
      try {
        await updateDoc(docId, { title: titleRef.current, content, icon: iconRef.current });
        setSaved(true);
      } catch {
        // leave setSaved(false) so the user sees it's not saved
      }
    }, 700);
  }, [docId, updateDoc]);

  /* ── Format (execCommand) ── */
  const fmt = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    triggerSave();
  }, [triggerSave]);

  /* ── Insert raw HTML at cursor ── */
  const insertHtmlAtCursor = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    triggerSave();
  }, [triggerSave]);

  /* Compress image via canvas before uploading (max 1920px, 0.82 quality) */
  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1920;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob ?? file), "image/webp", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

  /* ── File / image insert handlers ── */
  const handleImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Show local preview immediately — no waiting for upload
    const localUrl = URL.createObjectURL(file);
    const imgId = `doc-img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    insertHtmlAtCursor(
      `<figure style="margin:16px 0;display:block;"><img id="${imgId}" src="${localUrl}" alt="${file.name}" style="width:100%;max-width:100%;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.08);display:block;cursor:pointer;opacity:0.6;" data-doc-img="true" /><p><br></p></figure>`
    );

    // Upload compressed version in background
    const supabase = createClient();
    const path = `${docId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const compressed = await compressImage(file);
    const { error, data: uploadData } = await supabase.storage.from("doc-images").upload(path, compressed, { contentType: "image/webp" });

    URL.revokeObjectURL(localUrl);
    const imgEl = document.getElementById(imgId) as HTMLImageElement | null;

    if (error || !imgEl) {
      imgEl?.closest("figure")?.remove();
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("doc-images").getPublicUrl(path);
    imgEl.src = publicUrl;
    imgEl.style.opacity = "1";
    imgEl.removeAttribute("id");

    // Save with the permanent URL
    triggerSave();
  }, [docId, insertHtmlAtCursor, triggerSave]);

  const handleAttachFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb   = Math.round(file.size / 1024);
    const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    const ext  = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
    const iconMap: Record<string, string> = {
      PDF:"📄", DOC:"📝", DOCX:"📝", XLS:"📊", XLSX:"📊",
      PPT:"📊", PPTX:"📊", ZIP:"🗜", RAR:"🗜", TXT:"📃",
    };
    const fileIcon = iconMap[ext] ?? "📎";
    insertHtmlAtCursor(
      `<div style="display:inline-flex;align-items:center;gap:10px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:13px;cursor:default">
        <span style="font-size:20px">${fileIcon}</span>
        <div><div style="font-weight:600;color:#111827">${file.name}</div><div style="font-size:11px;color:#9CA3AF;margin-top:2px">${ext} · ${size}</div></div>
      </div><p><br></p>`
    );
    e.target.value = "";
  }, [insertHtmlAtCursor]);

  /* ── Slash command helpers ── */
  const filteredCmds = slashMenu
    ? SLASH_CMDS.filter((c) => {
        const q = slashMenu.query.toLowerCase();
        if (!q) return true;
        return c.label.toLowerCase().includes(q) ||
               c.keywords.some((k) => k.includes(q));
      })
    : [];

  // Group filtered commands
  const groupedCmds = filteredCmds.reduce<Record<string, SlashCmd[]>>((acc, cmd) => {
    acc[cmd.group] = acc[cmd.group] ? [...acc[cmd.group], cmd] : [cmd];
    return acc;
  }, {});

  const applySlashCmd = useCallback((cmd: SlashCmd) => {
    if (!slashMenu) return;

    // Delete "/query" text from the text node
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      const endOff = Math.min(
        slashMenu.nodeOffset + 1 + slashMenu.query.length,
        (slashMenu.node.textContent ?? "").length
      );
      range.setStart(slashMenu.node, slashMenu.nodeOffset);
      range.setEnd(slashMenu.node, endOff);
      range.deleteContents();
      sel.collapse(slashMenu.node, slashMenu.nodeOffset);
    }

    // For file/image commands: open the picker after clearing the slash text
    if (cmd.special === "image") {
      setSlashMenu(null);
      setTimeout(() => imageInputRef.current?.click(), 50);
      return;
    }
    if (cmd.special === "file") {
      setSlashMenu(null);
      setTimeout(() => fileInputRef.current?.click(), 50);
      return;
    }

    editorRef.current?.focus();

    if (cmd.insertHtml) {
      document.execCommand("insertHTML", false, cmd.insertHtml);
    } else if (cmd.execCmd) {
      document.execCommand(cmd.execCmd, false, cmd.execVal ?? undefined);
    }

    setSlashMenu(null);
    triggerSave();
  }, [slashMenu, triggerSave]);

  /* ── Editor input — detect "/" ── */
  const handleEditorInput = useCallback(() => {
    triggerSave();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setSlashMenu(null); return; }

    const range = sel.getRangeAt(0);
    const node  = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setSlashMenu(null); return; }

    const text   = (node as Text).textContent ?? "";
    const cursor = range.startOffset;
    const before = text.slice(0, cursor);
    const slashI = before.lastIndexOf("/");

    if (slashI === -1) { setSlashMenu(null); return; }

    const query = before.slice(slashI + 1);
    if (query.includes(" ")) { setSlashMenu(null); return; }

    const rect      = range.getBoundingClientRect();
    const edRect    = editorRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };

    setSlashMenu({
      query,
      x: rect.left - edRect.left,
      y: rect.bottom - edRect.top + 6,
      node: node as Text,
      nodeOffset: slashI,
    });
    setSlashIdx(0);
  }, [triggerSave]);

  /* ── Keyboard in editor ── */
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Formatting shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); fmt("bold"); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); fmt("italic"); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "u") { e.preventDefault(); fmt("underline"); return; }

    // Slash menu navigation
    if (!slashMenu) return;
    if (e.key === "Escape") { setSlashMenu(null); return; }

    const flat = filteredCmds;
    if (flat.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashIdx((i) => (i + 1) % flat.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashIdx((i) => (i - 1 + flat.length) % flat.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applySlashCmd(flat[slashIdx]);
      return;
    }
  }, [slashMenu, filteredCmds, slashIdx, applySlashCmd, fmt]);

  /* ── Tags ── */
  const handleAddTag = () => {
    const tag = newTag.trim();
    if (!tag || !doc) return;
    if (!doc.tags.includes(tag)) updateDocTags(docId, [...doc.tags, tag]);
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!doc) return;
    updateDocTags(docId, doc.tags.filter((t) => t !== tag));
  };

  /* ── Comments ── */
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const authorId = currentUser?.id ?? "anonymous";
    const authorName = currentUser?.name ?? "Usuario";
    const authorAvatar = currentUser?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4`;
    addComment(docId, newComment.trim(), authorId, authorName, authorAvatar);
    setNewComment("");
    setMentionMenu(null);
  };

  /* @@ mention detection in comment textarea */
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val    = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const lastAt = before.lastIndexOf("@@");
    if (lastAt !== -1) {
      const query = before.slice(lastAt + 2);
      // Allow only name-like characters (letters, accents, spaces)
      if (/^[A-Za-záéíóúñÑüÜ\s]*$/.test(query) && query.length <= 40) {
        const q = query.toLowerCase().trim();
        const matches = teamMembers.filter((m) =>
          !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
        );
        if (matches.length > 0) {
          setMentionMenu({ query, atPos: lastAt });
          setMentionIdx(0);
          return;
        }
      }
    }
    setMentionMenu(null);
  };

  /* Apply selected mention: replaces @@query with @Name */
  const applyMention = useCallback((member: TeamMember) => {
    if (!mentionMenu) return;
    const before = newComment.slice(0, mentionMenu.atPos);
    const after  = newComment.slice(mentionMenu.atPos + 2 + mentionMenu.query.length);
    const newVal = `${before}@${member.name} ${after}`;
    setNewComment(newVal);
    setMentionMenu(null);
    setTimeout(() => {
      if (commentRef.current) {
        const pos = mentionMenu.atPos + 1 + member.name.length + 1;
        commentRef.current.setSelectionRange(pos, pos);
        commentRef.current.focus();
      }
    }, 0);
  }, [mentionMenu, newComment]);

  /* Filtered members based on current mention query */
  const filteredMembers = mentionMenu
    ? teamMembers.filter((m) => {
        const q = mentionMenu.query.toLowerCase().trim();
        return !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
      })
    : [];

  const handleDelete = () => {
    clearTimeout(saveTimer.current);
    deleteDoc(docId);
    router.push(`/${workspace}/docs`);
  };

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Documento no encontrado
      </div>
    );
  }

  const openComments = doc.comments.filter((c) => !c.resolved);
  const resolvedComments = doc.comments.filter((c) => c.resolved);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ── Toolbar ── */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-0.5 flex-shrink-0 flex-wrap">
        <ToolBtn onMouseDown={() => fmt("bold")}      title="Negrita (⌘B)"><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("italic")}    title="Cursiva (⌘I)"><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("underline")} title="Subrayado (⌘U)"><Underline className="w-3.5 h-3.5" /></ToolBtn>
        <Sep />
        <ToolBtn onMouseDown={() => fmt("formatBlock","h1")} title="Título 1"><span className="text-[10px] font-black">H1</span></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("formatBlock","h2")} title="Título 2"><span className="text-[10px] font-black">H2</span></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("formatBlock","h3")} title="Título 3"><span className="text-[10px] font-black">H3</span></ToolBtn>
        <Sep />
        <ToolBtn onMouseDown={() => fmt("insertUnorderedList")} title="Lista con viñetas"><List className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("insertOrderedList")}   title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
        <Sep />
        <ToolBtn onMouseDown={() => fmt("formatBlock","blockquote")} title="Cita"><Quote className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("formatBlock","pre")}         title="Código"><Code2 className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onMouseDown={() => fmt("insertHorizontalRule")}      title="Separador"><Minus className="w-3.5 h-3.5" /></ToolBtn>

        <div className="flex-1" />

        {/* Save */}
        <span className={cn("text-[11px] flex items-center gap-1 transition-colors mr-2",
          saved ? "text-green-500" : "text-gray-400")}>
          {saved
            ? <><Check className="w-3 h-3" />Guardado</>
            : <><Clock className="w-3 h-3 animate-spin" />Guardando...</>}
        </span>

        {/* Etiquetas toggle */}
        <button
          onClick={() => setShowTags((p) => !p)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors mr-1",
            showTags
              ? "bg-[#2F3988]/10 text-[#2F3988]"
              : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <Tag className="w-3.5 h-3.5" />
          Etiquetas
          {doc.tags.length > 0 && (
            <span className="bg-[#2F3988] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {doc.tags.length}
            </span>
          )}
        </button>

        {/* Comentarios toggle */}
        <button
          onClick={() => setShowComments((p) => !p)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors mr-1",
            showComments
              ? "bg-[#2F3988]/10 text-[#2F3988]"
              : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Comentarios
          {openComments.length > 0 && (
            <span className="bg-amber-400 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {openComments.length}
            </span>
          )}
        </button>

        {/* Delete */}
        <button onClick={handleDelete} title="Eliminar"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Body: editor + optional comments panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Editor column ── */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-[740px] mx-auto px-12 py-10">

            {/* Icon */}
            <div ref={iconPickerRef} className="relative inline-block mb-4">
              <button onClick={() => setShowIconPicker((p) => !p)}
                className="text-5xl hover:scale-110 transition-transform leading-none select-none" title="Cambiar ícono">
                {icon}
              </button>
              {showIconPicker && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3">
                  <div className="grid grid-cols-5 gap-1.5">
                    {DOC_ICONS.map((e) => (
                      <button key={e}
                        onClick={() => { iconRef.current = e; setIcon(e); setShowIconPicker(false); triggerSave(); }}
                        className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-xl hover:bg-gray-100 transition-colors",
                          icon === e && "bg-blue-50 ring-1 ring-[#9ACCEC]")}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <input type="text" value={title}
              onChange={(e) => { titleRef.current = e.target.value; setTitle(e.target.value); triggerSave(); }}
              placeholder="Sin título"
              className="block w-full text-[2.4rem] font-bold text-gray-900 outline-none bg-transparent border-none placeholder:text-gray-200 mb-2 leading-tight"
              style={{ fontFamily: "var(--font-jakarta,'Plus Jakarta Sans',sans-serif)" }}
            />

            {/* Metadata */}
            <div className="flex items-center gap-5 text-xs text-gray-400 mb-4">
              <span>📅 Creado {doc.createdAt}</span>
              <span>✏️ Actualizado {doc.updatedAt}</span>
            </div>

            {/* ── Tags section ── */}
            {showTags && (
              <div className="mb-5 p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {doc.tags.map((tag) => {
                    const c = tagColor(tag);
                    return (
                      <span key={tag}
                        style={{ background: c.bg, color: c.text }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}
                          className="hover:opacity-70 transition-opacity ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })}
                  {doc.tags.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Sin etiquetas</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                    placeholder="+ Nueva etiqueta..."
                    className="flex-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#9ACCEC] transition-colors"
                  />
                  <button onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2F3988] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
                    Agregar
                  </button>
                </div>
              </div>
            )}

            <div className="border-b border-gray-100 mb-8" />

            {/* ── Rich-text editor ── */}
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                data-placeholder="Empieza a escribir o usa / para comandos..."
                className={cn(
                  "doc-editor outline-none focus:outline-none focus-visible:outline-none border-none focus:border-none focus:ring-0 min-h-[380px] text-[15px] leading-relaxed text-gray-700",
                  "[&_h1]:text-[2rem] [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-7 [&_h1]:mb-3 [&_h1]:leading-tight",
                  "[&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-6 [&_h2]:mb-2",
                  "[&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-5 [&_h3]:mb-2",
                  "[&_p]:mb-3 [&_p]:leading-relaxed",
                  "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ul]:space-y-1",
                  "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_ol]:space-y-1",
                  "[&_li]:text-gray-700 [&_li]:leading-relaxed",
                  "[&_blockquote]:border-l-[3px] [&_blockquote]:border-[#9ACCEC] [&_blockquote]:pl-5 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:py-1",
                  "[&_pre]:bg-gray-900 [&_pre]:text-emerald-300 [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:my-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:overflow-x-auto",
                  "[&_code]:bg-blue-50 [&_code]:text-[#2F3988] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[13px]",
                  "[&_strong]:font-bold [&_strong]:text-gray-900",
                  "[&_em]:italic [&_em]:text-gray-600",
                  "[&_a]:text-[#2F3988] [&_a]:underline [&_a]:underline-offset-2",
                  "[&_hr]:border-0 [&_hr]:border-t [&_hr]:border-gray-200 [&_hr]:my-8",
                  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
                  "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm",
                  "[&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:bg-gray-50 [&_th]:font-semibold",
                )}
              />

              {/* ── Image resize toolbar ── */}
              {imgToolbar && (
                <div
                  ref={imgToolbarRef}
                  style={{ top: imgToolbar.top, left: imgToolbar.left }}
                  className="absolute z-40 flex items-center gap-1 bg-gray-900 text-white rounded-xl px-2 py-1.5 shadow-xl text-xs"
                >
                  <span className="text-gray-400 mr-1 text-[11px]">Tamaño:</span>
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onMouseDown={(e) => { e.preventDefault(); setImageWidth(pct); }}
                      className="px-2 py-0.5 rounded-lg hover:bg-white/20 transition-colors font-medium"
                    >
                      {pct}%
                    </button>
                  ))}
                  <div className="w-px h-4 bg-white/20 mx-1" />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      imgToolbar.img.parentElement?.remove();
                      setImgToolbar(null);
                      if (editorRef.current) editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
                    }}
                    className="px-2 py-0.5 rounded-lg hover:bg-red-500/60 transition-colors text-red-300 hover:text-white"
                    title="Eliminar imagen"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* ── Slash command menu ── */}
              {slashMenu && filteredCmds.length > 0 && (
                <div
                  ref={slashMenuRef}
                  style={{ top: slashMenu.y, left: Math.min(slashMenu.x, 400) }}
                  className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-72 max-h-80 overflow-y-auto py-1"
                >
                  {/* Query hint */}
                  {slashMenu.query && (
                    <div className="px-3 pt-1.5 pb-1">
                      <span className="text-[10px] text-gray-400 font-medium">
                        Buscando: <span className="text-[#2F3988] font-bold">/{slashMenu.query}</span>
                      </span>
                    </div>
                  )}
                  {Object.entries(groupedCmds).map(([group, cmds]) => {
                    const groupFlat = filteredCmds;
                    return (
                      <div key={group}>
                        <div className="px-3 py-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group}</span>
                        </div>
                        {cmds.map((cmd) => {
                          const globalIdx = groupFlat.findIndex((c) => c.id === cmd.id);
                          const isSelected = globalIdx === slashIdx;
                          return (
                            <button
                              key={cmd.id}
                              onMouseDown={(e) => { e.preventDefault(); applySlashCmd(cmd); }}
                              onMouseEnter={() => setSlashIdx(globalIdx)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                              )}
                            >
                              {/* Icon box */}
                              <div
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                style={{
                                  background: cmd.iconBg ?? "#f9fafb",
                                  color: cmd.iconColor ?? "#374151",
                                }}
                              >
                                {cmd.iconLabel}
                              </div>
                              <span className={cn(
                                "text-xs font-medium",
                                isSelected ? "text-[#2F3988]" : "text-gray-700"
                              )}>
                                {cmd.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  {/* Keyboard hint */}
                  <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
                    <span>↑↓ navegar</span>
                    <span>↵ seleccionar</span>
                    <span>Esc cerrar</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Hidden file inputs ── */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleAttachFile}
        />

        {/* ── Comments panel ── */}
        {showComments && (
          <aside className="w-72 border-l border-gray-200 flex flex-col bg-white flex-shrink-0 overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#2F3988]" />
                <span className="text-sm font-bold text-gray-800">Comentarios</span>
                {openComments.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                    {openComments.length}
                  </span>
                )}
              </div>
              <button onClick={() => setShowComments(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 px-3">
              {openComments.length === 0 && resolvedComments.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">Sin comentarios aún</p>
                  <p className="text-[11px] text-gray-300 mt-1">Sé el primero en comentar</p>
                </div>
              )}

              {/* Open comments */}
              {openComments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onResolve={() => resolveComment(docId, c.id)}
                  onDelete={() => deleteComment(docId, c.id)}
                />
              ))}

              {/* Resolved toggle */}
              {resolvedComments.length > 0 && (
                <>
                  <button
                    onClick={() => setShowResolved((p) => !p)}
                    className="w-full flex items-center gap-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {showResolved ? "Ocultar" : "Ver"} {resolvedComments.length} resuelto{resolvedComments.length !== 1 ? "s" : ""}
                  </button>
                  {showResolved && resolvedComments.map((c) => (
                    <CommentCard
                      key={c.id}
                      comment={c}
                      onResolve={() => resolveComment(docId, c.id)}
                      onDelete={() => deleteComment(docId, c.id)}
                      resolved
                    />
                  ))}
                </>
              )}
            </div>

            {/* New comment input */}
            <div className="border-t border-gray-100 p-3 flex-shrink-0">
              <div className="flex items-start gap-2">
                <img
                  src={currentUser?.avatar ?? "https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4"}
                  alt={currentUser?.name ?? "Tú"} className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 relative">

                  {/* @@ Mention dropdown */}
                  {mentionMenu && filteredMembers.length > 0 && (
                    <div
                      ref={mentionMenuRef}
                      className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/70">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asignar a</span>
                        {mentionMenu.query.trim() && (
                          <span className="text-[10px] text-[#2F3988] font-bold">
                            &ldquo;{mentionMenu.query.trim()}&rdquo;
                          </span>
                        )}
                      </div>
                      {filteredMembers.map((member, idx) => (
                        <button
                          key={member.id}
                          onMouseDown={(e) => { e.preventDefault(); applyMention(member); }}
                          onMouseEnter={() => setMentionIdx(idx)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                            idx === mentionIdx ? "bg-blue-50" : "hover:bg-gray-50"
                          )}
                        >
                          <img src={member.avatar} alt={member.name}
                            className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-xs font-semibold truncate",
                              idx === mentionIdx ? "text-[#2F3988]" : "text-gray-800"
                            )}>{member.name}</div>
                            <div className="text-[10px] text-gray-400">{member.role}</div>
                          </div>
                          {idx === mentionIdx && (
                            <span className="text-[9px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">↵</span>
                          )}
                        </button>
                      ))}
                      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 text-[10px] text-gray-400">
                        <span>↑↓ navegar</span>
                        <span>↵ seleccionar</span>
                        <span>Esc cerrar</span>
                      </div>
                    </div>
                  )}

                  <textarea
                    ref={commentRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      // Mention menu navigation
                      if (mentionMenu && filteredMembers.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setMentionIdx((i) => (i + 1) % filteredMembers.length);
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setMentionIdx((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
                          return;
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyMention(filteredMembers[mentionIdx]);
                          return;
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setMentionMenu(null);
                          return;
                        }
                      }
                      // Send shortcut
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                    }}
                    placeholder="Escribe un comentario... usa @@ para mencionar (⌘↵ enviar)"
                    rows={2}
                    className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#9ACCEC] focus:bg-white resize-none transition-colors"
                  />

                  {/* Mention hint */}
                  <p className="text-[10px] text-gray-400 mt-1 mb-1 flex items-center gap-1">
                    <span className="font-mono bg-gray-100 px-1 rounded text-gray-500">@@</span>
                    para mencionar a alguien
                  </p>

                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2F3988] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Send className="w-3 h-3" />
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ── Comment card ── */
function CommentCard({
  comment, onResolve, onDelete, resolved = false,
}: {
  comment: import("@/lib/store/docsStore").DocComment;
  onResolve: () => void;
  onDelete: () => void;
  resolved?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-2 transition-colors",
      resolved
        ? "border-gray-100 bg-gray-50/60 opacity-60"
        : "border-gray-200 bg-white shadow-sm"
    )}>
      <div className="flex items-start gap-2">
        <img src={comment.avatar} alt={comment.author}
          className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-gray-800 truncate">{comment.author}</span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{comment.createdAt}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {renderMentionText(comment.text)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 pt-0.5">
        <button
          onClick={onResolve}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
            resolved
              ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          )}
        >
          <CheckCheck className="w-3 h-3" />
          {resolved ? "Reabrir" : "Resolver"}
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <X className="w-3 h-3" />
          Eliminar
        </button>
      </div>
    </div>
  );
}

/* ── Toolbar helpers ── */
function ToolBtn({ onMouseDown, title, children }: {
  onMouseDown: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-gray-200 mx-1.5 flex-shrink-0" />;
}
