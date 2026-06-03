"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, ChevronDown, Paperclip, MessageSquare, CheckSquare,
  Square, Calendar, User, Tag, Clock, MoreHorizontal, Send,
  Plus, Check, Trash2, Download, FileText, FileImage,
  Film, Music, Archive, Upload, ExternalLink,
} from "lucide-react";
import type { Task, Priority, Assignee } from "@/types/domain";
import { cn, PRIORITY_CONFIG } from "@/lib/utils";
import { updateTaskField, setTaskAssignees, addTaskLabel, removeTaskLabel, createSubtask, toggleSubtask, deleteSubtask, getTaskComments, addTaskComment, deleteTaskComment, getTaskAttachments, uploadTaskAttachment, deleteTaskAttachment } from "@/app/actions/tasks";
import { createClient } from "@/lib/supabase/client";
import { useKanbanStore } from "@/lib/store/kanbanStore";

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  onStatusChange?: (taskId: string, newListId: string) => void;
  projectName?: string;
  projectIcon?: string;
  projectMembers?: Assignee[];
}

const STATUS_OPTIONS = [
  { id: "todo", label: "Por Hacer", color: "#EF4444" },
  { id: "in-progress", label: "En Progreso", color: "#3B82F6" },
  { id: "review", label: "En Revisión", color: "#F59E0B" },
  { id: "done", label: "Completado", color: "#22C55E" },
];

const ALL_LABELS = [
  { id: "ux", name: "UX", light: "#DBEAFE", solid: "#3B82F6" },
  { id: "dev", name: "Desarrollo", light: "#E0E7FF", solid: "#6366F1" },
  { id: "design", name: "Diseño", light: "#EDE9FE", solid: "#8B5CF6" },
  { id: "content", name: "Contenido", light: "#DCFCE7", solid: "#22C55E" },
  { id: "bug", name: "Bug", light: "#FEE2E2", solid: "#EF4444" },
  { id: "seo", name: "SEO", light: "#FEF3C7", solid: "#F59E0B" },
  { id: "mobile", name: "Mobile", light: "#CFFAFE", solid: "#06B6D4" },
  { id: "api", name: "API", light: "#D1FAE5", solid: "#10B981" },
];

const MOCK_COMMENTS = [
  {
    id: "c1",
    author: { name: "Michael Anderson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc" },
    body: "He revisado los wireframes y me parece que falta el flujo de error cuando el pago falla. ¿Lo podemos agregar?",
    time: "Hace 2h",
  },
  {
    id: "c2",
    author: { name: "Sofía Carter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4" },
    body: "Buen punto @Michael Anderson, lo agrego al scope. Actualizo los criterios de aceptación.",
    time: "Hace 1h",
  },
];

/* ─── Small popover wrapper ─── */
function Popover({ trigger, children, open, onToggle }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 min-w-[200px]">
          {children}
        </div>
      )}
    </div>
  );
}

export function TaskDrawer({ task, onClose, onStatusChange, projectName, projectIcon, projectMembers = [] }: TaskDrawerProps) {
  /* ── local state ── */
  const [status, setStatus] = useState(
    STATUS_OPTIONS.find((s) => s.id === task?.listId) ?? STATUS_OPTIONS[0]
  );
  const [assignees, setAssignees] = useState(task?.assignees ?? []);
  const [labels, setLabels] = useState(task?.labels ?? []);
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.split("T")[0] : ""
  );
  const [estimation, setEstimation] = useState("");
  const [comment, setComment] = useState("");
  type SubtaskAssignee = { id: string; name: string; avatar: string };
  type Subtask = { id: string; title: string; done: boolean; assignee?: SubtaskAssignee | null };

  type Comment = { id: string; userId?: string; body: string; createdAt?: string; time: string; author: { name: string; avatar: string } };

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskPop, setSubtaskPop] = useState<string | null>(null);

  /* attachments */
  type AttachFile = { id: string; name: string; size: string; type: string; url: string | null; storagePath?: string; uploading?: boolean };
  const [files, setFiles] = useState<AttachFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskPriority, setTaskPriority] = useState<Priority>(task?.priority ?? "med");
  const [allLabels, setAllLabels] = useState(ALL_LABELS);
  const [newLabelName, setNewLabelName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);

  const LABEL_COLORS = [
    { light: "#DBEAFE", solid: "#3B82F6" },
    { light: "#E0E7FF", solid: "#6366F1" },
    { light: "#EDE9FE", solid: "#8B5CF6" },
    { light: "#DCFCE7", solid: "#22C55E" },
    { light: "#FEE2E2", solid: "#EF4444" },
    { light: "#FEF3C7", solid: "#F59E0B" },
    { light: "#CFFAFE", solid: "#06B6D4" },
    { light: "#D1FAE5", solid: "#10B981" },
  ];

  const createLabel = () => {
    if (!newLabelName.trim()) return;
    const color = LABEL_COLORS[allLabels.length % LABEL_COLORS.length];
    const tempLabel = { id: `custom-${Date.now()}`, name: newLabelName.trim(), ...color };
    setAllLabels((p) => [...p, tempLabel]);
    setLabels((p) => {
      const next = [...p, tempLabel];
      addTaskLabel(task?.id ?? "", { name: tempLabel.name, light: tempLabel.light, solid: tempLabel.solid })
        .then((res) => {
          if (!res) return;
          setLabels((cur) => cur.map((l) => l.id === tempLabel.id ? { ...l, id: res.labelId } : l));
          setAllLabels((cur) => cur.map((l) => l.id === tempLabel.id ? { ...l, id: res.labelId } : l));
        });
      return next;
    });
    setNewLabelName("");
    setCreatingLabel(false);
  };

  /* ── persist helpers ── */
  const taskId = task?.id ?? "";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateTaskInStore = useKanbanStore((s) => s.updateTask);

  const saveField = useCallback((fields: Parameters<typeof updateTaskField>[1]) => {
    if (!taskId || taskId.startsWith("temp-")) return;
    updateTaskField(taskId, fields);
    // Sync store so drawer shows fresh data on reopen
    const storeChanges: Partial<Task> = {};
    if (fields.title !== undefined) storeChanges.title = fields.title;
    if (fields.description !== undefined) storeChanges.description = fields.description;
    if (fields.priority !== undefined) storeChanges.priority = fields.priority;
    if (fields.due_date !== undefined) storeChanges.dueDate = fields.due_date ?? undefined;
    if (fields.list_id !== undefined) storeChanges.listId = fields.list_id;
    if (Object.keys(storeChanges).length > 0) updateTaskInStore(taskId, storeChanges);
  }, [taskId, updateTaskInStore]);

  const saveDebounced = useCallback((fields: Parameters<typeof updateTaskField>[1], ms = 600) => {
    if (!taskId || taskId.startsWith("temp-")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateTaskField(taskId, fields);
      const storeChanges: Partial<Task> = {};
      if (fields.title !== undefined) storeChanges.title = fields.title;
      if (fields.description !== undefined) storeChanges.description = fields.description;
      if (Object.keys(storeChanges).length > 0) updateTaskInStore(taskId, storeChanges);
    }, ms);
  }, [taskId, updateTaskInStore]);

  /* popovers */
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [openPop, setOpenPop] = useState<"status" | "assign" | "label" | "date" | "estimate" | "priority" | null>(null);
  const toggle = (pop: typeof openPop) => setOpenPop((p) => (p === pop ? null : pop));

  /* sync when task changes */
  useEffect(() => {
    setStatus(STATUS_OPTIONS.find((s) => s.id === task?.listId) ?? STATUS_OPTIONS[0]);
    setAssignees(task?.assignees ?? []);
    setLabels(task?.labels ?? []);
    setDueDate(task?.dueDate ? task.dueDate.split("T")[0] : "");
    setTaskPriority(task?.priority ?? "med");
    setEstimation((task as (typeof task & { estimation?: string | null }))?.estimation ?? "");
    setOpenPop(null);
    setFiles([]);
    setSubtasks([]);
    setComments([]);
    setNewSubtask("");
    setAddingSubtask(false);
    setSubtaskPop(null);
    setCreatingLabel(false);
    setNewLabelName("");
  }, [task?.id]);

  /* Load subtasks + labels + comments + attachments + estimation from Supabase when task opens */
  useEffect(() => {
    if (!task?.id || task.id.startsWith("temp-")) return;
    const supabase = createClient();
    (async () => {
      const [{ data: subs }, { data: taskLbls }, { data: taskRow }, commentsData, attachmentsData] = await Promise.all([
        supabase
          .from("subtasks")
          .select("id, title, is_completed")
          .eq("task_id", task.id)
          .order("position"),
        supabase
          .from("task_labels")
          .select("label_id, labels(id, name, light_color, solid_color)")
          .eq("task_id", task.id),
        supabase
          .from("tasks")
          .select("estimation")
          .eq("id", task.id)
          .single(),
        getTaskComments(task.id),
        getTaskAttachments(task.id),
      ]);

      if (subs) {
        setSubtasks(subs.map((s) => ({ id: s.id, title: s.title, done: s.is_completed, assignee: null })));
      }
      if (taskLbls) {
        const mapped = taskLbls
          .map((tl) => {
            const l = Array.isArray(tl.labels) ? tl.labels[0] : tl.labels;
            return l ? { id: tl.label_id, name: l.name, light: l.light_color, solid: l.solid_color } : null;
          })
          .filter((l): l is { id: string; name: string; light: string; solid: string } => l !== null);
        setLabels(mapped);
        setAllLabels((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          const newOnes = mapped.filter((l) => !ids.has(l.id));
          return [...prev, ...newOnes];
        });
      }
      if (taskRow?.estimation) {
        setEstimation(taskRow.estimation);
      }
      setComments(commentsData.map((c) => ({
        id: c.id,
        userId: c.userId,
        body: c.body,
        createdAt: c.createdAt,
        time: new Date(c.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        author: c.author,
      })));
      setFiles(attachmentsData.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.sizeBytes < 1024 * 1024
          ? `${(a.sizeBytes / 1024).toFixed(0)} KB`
          : `${(a.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        type: a.mimeType,
        url: a.url,
        storagePath: a.storagePath,
      })));
    })();
  }, [task?.id]);

  /* Escape key */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  /* file helpers */
  const addRawFiles = (rawFiles: FileList | null) => {
    if (!rawFiles) return;
    Array.from(rawFiles).forEach((f) => {
      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      const preview: typeof files[0] = {
        id: tempId,
        name: f.name,
        size: f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(0)} KB`
          : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.type || "application/octet-stream",
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        uploading: true,
      };
      setFiles((p) => [...p, preview]);
      uploadTaskAttachment(taskId, f).then((res) => {
        if (!res) {
          setFiles((p) => p.filter((x) => x.id !== tempId));
          return;
        }
        setFiles((p) =>
          p.map((x) =>
            x.id === tempId
              ? { ...x, id: res.id, url: res.url ?? x.url, uploading: false }
              : x
          )
        );
      });
    });
  };

  const fileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage className="w-5 h-5 text-blue-400" />;
    if (type === "pdf") return <FileText className="w-5 h-5 text-red-400" />;
    if (type.startsWith("video/")) return <Film className="w-5 h-5 text-purple-400" />;
    if (type.startsWith("audio/")) return <Music className="w-5 h-5 text-green-400" />;
    if (type === "figma") return <span className="text-base leading-none">🎨</span>;
    if (type.includes("zip") || type.includes("rar")) return <Archive className="w-5 h-5 text-yellow-500" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const completedCount = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const toggleAssignee = (member: typeof projectMembers[0]) => {
    setAssignees((prev) => {
      const next = prev.find((a) => a.id === member.id)
        ? prev.filter((a) => a.id !== member.id)
        : [...prev, { id: member.id, name: member.name, avatar: member.avatar }];
      setTaskAssignees(taskId, next.map((a) => a.id));
      updateTaskInStore(taskId, { assignees: next });
      return next;
    });
  };

  const toggleLabel = (label: typeof ALL_LABELS[0]) => {
    const isActive = labels.some((l) => l.id === label.id);
    if (isActive) {
      setLabels((prev) => prev.filter((l) => l.id !== label.id));
      removeTaskLabel(taskId, label.id);
    } else {
      // Optimistic add with temp/local id; server action returns real UUID
      setLabels((prev) => [...prev, label]);
      addTaskLabel(taskId, { name: label.name, light: label.light, solid: label.solid }).then((res) => {
        if (!res) return;
        setLabels((cur) => cur.map((l) => l.id === label.id ? { ...l, id: res.labelId } : l));
        setAllLabels((cur) => cur.map((l) => l.id === label.id ? { ...l, id: res.labelId } : l));
      });
    }
  };

  const submitSubtask = () => {
    if (!newSubtask.trim()) return;
    const tempId = `temp-s${Date.now()}`;
    setSubtasks((prev) => [...prev, { id: tempId, title: newSubtask.trim(), done: false, assignee: null }]);
    setNewSubtask("");
    setAddingSubtask(false);
    // Persist and replace temp ID
    createSubtask(taskId, newSubtask.trim()).then((res) => {
      if (!res) return;
      setSubtasks((prev) => prev.map((s) => s.id === tempId ? { ...s, id: res.id } : s));
    });
  };

  const submitComment = () => {
    if (!comment.trim()) return;
    const body = comment.trim();
    const tempId = `temp-c${Date.now()}`;
    setComments((prev) => [
      ...prev,
      {
        id: tempId,
        body,
        time: "Ahora",
        author: { name: "Tú", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4" },
      },
    ]);
    setComment("");
    addTaskComment(taskId, body).then((res) => {
      if (!res) return;
      setComments((prev) => prev.map((c) => c.id === tempId ? { ...c, id: res.id, createdAt: res.createdAt } : c));
    });
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return null;
    return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de tarea"
        className="fixed top-0 right-0 h-full w-[720px] bg-white z-40 flex flex-col"
        style={{ boxShadow: "-4px 0 32px rgba(0,0,0,0.14)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <Popover
              open={openPop === "status"}
              onToggle={() => toggle("status")}
              trigger={
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                  style={{ borderColor: status.color + "40", background: status.color + "15", color: status.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                  {status.label}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              }
            >
              <div className="py-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setStatus(s);
                      setOpenPop(null);
                      if (task) onStatusChange?.(task.id, s.id);
                      saveField({ list_id: s.id });
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-gray-700">{s.label}</span>
                    {status.id === s.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: s.color }} />}
                  </button>
                ))}
              </div>
            </Popover>

            {/* Priority */}
            {(() => {
              const p = PRIORITY_CONFIG[taskPriority];
              return (
                <Popover
                  open={openPop === "priority"}
                  onToggle={() => toggle("priority")}
                  trigger={
                    <button
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                      style={{ background: p.bg, color: p.text, borderColor: p.text + "30" }}
                    >
                      {p.label}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                  }
                >
                  <div className="py-1">
                    {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => { setTaskPriority(key); setOpenPop(null); saveField({ priority: key }); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      >
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.text }}
                        >
                          {cfg.label}
                        </span>
                        {taskPriority === key && <Check className="w-3.5 h-3.5 ml-auto text-gray-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </Popover>
              );
            })()}
          </div>

          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Main */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Title */}
            <h2
              className="text-xl font-bold text-gray-900 leading-snug outline-none rounded px-1 -mx-1 hover:bg-gray-50 cursor-text transition-colors"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.textContent?.trim() ?? "";
                if (val) saveDebounced({ title: val }, 0);
              }}
            >
              {task?.title}
            </h2>

            {/* Description */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Descripción</p>
              <div
                className="text-sm text-gray-600 leading-relaxed outline-none min-h-[52px] rounded-lg p-3 border border-transparent hover:bg-gray-50 hover:border-gray-200 focus:bg-white focus:border-brand-cyan cursor-text transition-colors"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => saveDebounced({ description: e.currentTarget.textContent?.trim() ?? "" }, 0)}
              >
                {task?.description ?? "Agregar descripción..."}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Subtareas
                  <span className="font-normal normal-case tracking-normal ml-1">{completedCount}/{subtasks.length}</span>
                </p>
                <span className="text-xs font-medium text-gray-400">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#9ACCEC" }}
                />
              </div>
              <div className="space-y-0.5">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
                    <button onClick={() => {
                      const newDone = !sub.done;
                      setSubtasks((p) => p.map((s) => s.id === sub.id ? { ...s, done: newDone } : s));
                      toggleSubtask(sub.id, newDone);
                    }}>
                      {sub.done
                        ? <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: "#22C55E" }} />
                        : <Square className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-400" />}
                    </button>
                    <span className={cn("text-sm flex-1", sub.done ? "line-through text-gray-400" : "text-gray-700")}>
                      {sub.title}
                    </span>

                    {/* Assignee picker */}
                    <Popover
                      open={subtaskPop === sub.id}
                      onToggle={() => setSubtaskPop((p) => (p === sub.id ? null : sub.id))}
                      trigger={
                        sub.assignee ? (
                          <button title={sub.assignee.name} className="flex-shrink-0">
                            <img
                              src={sub.assignee.avatar}
                              alt={sub.assignee.name}
                              className="w-5 h-5 rounded-full border border-white ring-1 ring-gray-200 hover:ring-brand-cyan transition-all"
                            />
                          </button>
                        ) : (
                          <button
                            title="Asignar usuario"
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-brand-cyan hover:text-brand-cyan transition-all flex-shrink-0"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        )
                      }
                    >
                      <div className="py-1 min-w-[180px]">
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Asignar a</p>
                        {projectMembers.map((m) => {
                          const isAssigned = sub.assignee?.id === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSubtasks((p) =>
                                  p.map((s) =>
                                    s.id === sub.id
                                      ? { ...s, assignee: isAssigned ? null : { id: m.id, name: m.name, avatar: m.avatar } }
                                      : s
                                  )
                                );
                                setSubtaskPop(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                            >
                              <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                              <span className="text-sm text-gray-700 flex-1 text-left truncate">{m.name}</span>
                              {isAssigned && <Check className="w-3.5 h-3.5 text-brand-navy flex-shrink-0" />}
                            </button>
                          );
                        })}
                        {sub.assignee && (
                          <>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => {
                                setSubtasks((p) =>
                                  p.map((s) => (s.id === sub.id ? { ...s, assignee: null } : s))
                                );
                                setSubtaskPop(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
                            >
                              Quitar asignación
                            </button>
                          </>
                        )}
                      </div>
                    </Popover>

                    <button
                      onClick={() => {
                        setSubtasks((p) => p.filter((s) => s.id !== sub.id));
                        deleteSubtask(sub.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {addingSubtask ? (
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitSubtask();
                        if (e.key === "Escape") { setAddingSubtask(false); setNewSubtask(""); }
                      }}
                      onBlur={() => { if (!newSubtask.trim()) setAddingSubtask(false); }}
                      placeholder="Nueva subtarea..."
                      className="flex-1 text-sm outline-none border-b border-brand-cyan bg-transparent pb-0.5 text-gray-700 placeholder:text-gray-400"
                    />
                    <button
                      onClick={submitSubtask}
                      className="text-xs px-2 py-1 rounded font-medium text-white transition-colors"
                      style={{ background: "#2F3988" }}
                    >
                      Añadir
                    </button>
                    <button
                      onClick={() => { setAddingSubtask(false); setNewSubtask(""); }}
                      className="text-xs px-2 py-1 rounded font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full rounded-lg hover:bg-gray-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar subtarea
                  </button>
                )}
              </div>
            </div>

            {/* Comments */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <MessageSquare className="w-3.5 h-3.5" />
                Comentarios
                <span className="font-normal normal-case tracking-normal">{comments.length}</span>
              </p>
              <div className="space-y-4 mb-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.author.avatar} alt={c.author.name} className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{c.author.name}</span>
                        <span className="text-[11px] text-gray-400">{c.time}</span>
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4" alt="Tú" className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-brand-cyan focus-within:bg-white transition-colors">
                  <input
                    type="text"
                    placeholder="Escribe un comentario..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                    className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                  />
                  {comment && (
                    <button
                      onClick={submitComment}
                      className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ background: "#2F3988" }}
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Adjuntos
                  {files.length > 0 && (
                    <span className="font-normal normal-case tracking-normal">{files.length}</span>
                  )}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "#2F3988" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adjuntar
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addRawFiles(e.target.files)}
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white transition-colors group"
                    >
                      {/* Thumbnail or icon — click to open */}
                      <button
                        onClick={() => file.url && window.open(file.url, "_blank")}
                        className="flex-shrink-0 focus:outline-none"
                        title="Ver archivo"
                        disabled={!file.url}
                      >
                        {file.url ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-12 h-10 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                            {fileIcon(file.type)}
                          </div>
                        )}
                      </button>

                      {/* Info — click to open */}
                      <button
                        onClick={() => file.url && window.open(file.url, "_blank")}
                        className="flex-1 min-w-0 text-left"
                        disabled={!file.url}
                      >
                        <p className="text-xs font-medium text-gray-800 truncate hover:text-[#2F3988] transition-colors">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{file.uploading ? "Subiendo…" : file.size}</p>
                      </button>

                      {/* Actions — visible on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => file.url && window.open(file.url, "_blank")}
                          title="Abrir"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (file.url) {
                              const a = document.createElement("a");
                              a.href = file.url;
                              a.download = file.name;
                              a.click();
                            }
                          }}
                          title="Descargar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setFiles((p) => p.filter((f) => f.id !== file.id));
                            if (file.storagePath && !file.id.startsWith("uploading-")) {
                              deleteTaskAttachment(file.id, file.storagePath);
                            }
                          }}
                          title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addRawFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-brand-cyan bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <Upload className={cn("w-5 h-5 mx-auto mb-1.5", dragOver ? "text-brand-cyan" : "text-gray-300")} />
                <p className="text-xs font-medium text-gray-500">
                  {dragOver ? "Suelta para adjuntar" : "Arrastra archivos aquí"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">o <span className="underline">selecciona desde tu equipo</span></p>
                <p className="text-[11px] text-gray-300 mt-1.5">Máx. 25 MB · PNG, JPG, PDF, Figma…</p>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-56 border-l border-gray-100 overflow-y-auto px-4 py-5 space-y-5 flex-shrink-0">

            {/* Asignados */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Asignados
              </p>
              <div className="space-y-2 mb-2">
                {assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 group">
                    <img src={a.avatar} alt={a.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{a.name}</span>
                    <button
                      onClick={() => setAssignees((p) => {
                        const next = p.filter((x) => x.id !== a.id);
                        setTaskAssignees(taskId, next.map((x) => x.id));
                        return next;
                      })}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              <Popover
                open={openPop === "assign"}
                onToggle={() => toggle("assign")}
                trigger={
                  <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </div>
                    Asignar
                  </button>
                }
              >
                <div className="py-1">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Miembros</p>
                  {projectMembers.map((m) => {
                    const isAssigned = assignees.some((a) => a.id === m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleAssignee(m)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 text-left truncate">{m.name}</span>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-brand-navy flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Popover>
            </div>

            <div className="border-t border-gray-100" />

            {/* Fecha de vencimiento */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Fecha de vencimiento
              </p>
              <input
                ref={dateInputRef}
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  saveField({ due_date: e.target.value || null });
                }}
                className="sr-only"
              />
              <button
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                className={cn(
                  "text-xs font-medium px-2.5 py-1.5 rounded-lg w-full text-left transition-colors border",
                  dueDate
                    ? "bg-blue-50 text-brand-navy border-blue-100 hover:bg-blue-100"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  {dueDate ? formatDisplayDate(dueDate) : "Sin fecha"}
                </span>
              </button>
              {dueDate && (
                <button
                  onClick={() => { setDueDate(""); saveField({ due_date: null }); }}
                  className="text-[11px] text-gray-400 hover:text-danger transition-colors mt-1 ml-1"
                >
                  Quitar fecha
                </button>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Etiquetas */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Etiquetas
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => { setLabels((p) => p.filter((l) => l.id !== label.id)); removeTaskLabel(taskId, label.id); }}
                    className="text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 group"
                    style={{ background: label.light, color: label.solid }}
                    title="Clic para quitar"
                  >
                    {label.name}
                    <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              <Popover
                open={openPop === "label"}
                onToggle={() => toggle("label")}
                trigger={
                  <button className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Agregar etiqueta
                  </button>
                }
              >
                <div className="py-1">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Etiquetas</p>
                  {allLabels.map((label) => {
                    const active = labels.some((l) => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                          style={{ background: label.light, color: label.solid }}
                        >
                          {label.name}
                        </span>
                        {active && <Check className="w-3.5 h-3.5 ml-auto text-gray-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                  <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-2">
                    {creatingLabel ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          autoFocus
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") createLabel();
                            if (e.key === "Escape") { setCreatingLabel(false); setNewLabelName(""); }
                          }}
                          placeholder="Nombre de etiqueta"
                          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-brand-cyan min-w-0"
                        />
                        <button onClick={createLabel} className="text-xs px-2 py-1 rounded font-medium text-white flex-shrink-0" style={{ background: "#2F3988" }}>OK</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCreatingLabel(true)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Nueva etiqueta
                      </button>
                    )}
                  </div>
                </div>
              </Popover>
            </div>

            <div className="border-t border-gray-100" />

            {/* Estimación */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Estimación
              </p>
              <Popover
                open={openPop === "estimate"}
                onToggle={() => toggle("estimate")}
                trigger={
                  <button className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg w-full text-left border transition-colors",
                    estimation
                      ? "bg-violet-50 text-brand-violet border-violet-100 font-medium"
                      : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                  )}>
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      {estimation ? estimation : "Sin estimación"}
                    </span>
                  </button>
                }
              >
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Tiempo estimado</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {["30m", "1h", "2h", "4h", "8h", "1d", "3d"].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setEstimation(t); setOpenPop(null); saveField({ estimation: t }); }}
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                          estimation === t
                            ? "border-brand-navy text-brand-navy bg-blue-50"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej: 3h 30m"
                      value={estimation}
                      onChange={(e) => setEstimation(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-cyan"
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenPop(null); }}
                    />
                    <button
                      onClick={() => { setOpenPop(null); saveField({ estimation: estimation || null }); }}
                      className="px-2.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                      style={{ background: "#2F3988" }}
                    >
                      OK
                    </button>
                  </div>
                  {estimation && (
                    <button onClick={() => { setEstimation(""); setOpenPop(null); saveField({ estimation: null }); }} className="text-[11px] text-gray-400 hover:text-danger mt-2 transition-colors">
                      Quitar estimación
                    </button>
                  )}
                </div>
              </Popover>
            </div>

            <div className="border-t border-gray-100" />

            {/* Proyecto */}
            {(projectName || projectIcon) && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Proyecto</p>
                <div className="flex items-center gap-2">
                  {projectIcon && <span className="text-base">{projectIcon}</span>}
                  <span className="text-xs text-gray-700 font-medium">{projectName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
