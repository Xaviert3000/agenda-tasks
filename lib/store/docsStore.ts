import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export interface DocComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface Doc {
  id: string;
  title: string;
  content: string;   // HTML
  icon: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  comments: DocComment[];
}

export interface DocFolder {
  id: string;
  name: string;
  icon: string;
}

export const GETTING_STARTED_DOC_ID = "getting-started";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const GUIDE_CONTENT = `<h1>🚀 Bienvenido a agenda.ME</h1>
<p>Esta guía te ayudará a sacar el máximo provecho de tu espacio de trabajo en pocos minutos.</p>

<h2>1. Crea tu primer proyecto</h2>
<p>Los proyectos son el contenedor principal de tu trabajo. Para crear uno:</p>
<ul>
<li>Haz clic en el <strong>botón + junto a PROYECTOS</strong> en la barra lateral izquierda.</li>
<li>Elige un nombre, un emoji y la visibilidad (público o privado).</li>
<li>Se crean automáticamente 4 listas: <strong>Por Hacer, En Progreso, En Revisión y Completado</strong>.</li>
</ul>

<h2>2. Gestiona tareas con el tablero Kanban</h2>
<p>Dentro de cada proyecto encontrarás un tablero Kanban donde puedes:</p>
<ul>
<li>Crear tareas haciendo clic en <strong>+ Añadir tarea</strong> en cualquier columna.</li>
<li>Arrastrar y soltar tarjetas entre columnas para cambiar su estado.</li>
<li>Asignar responsables, fechas límite y etiquetas a cada tarea.</li>
</ul>

<h2>3. Invita a tu equipo</h2>
<p>Colabora con otros miembros de tu organización:</p>
<ul>
<li>Ve a <strong>Configuración → Miembros</strong> para invitar personas por correo.</li>
<li>Asigna roles: <strong>Admin, Moderador o Miembro</strong>.</li>
<li>Los miembros verán solo los proyectos públicos o aquellos a los que tengan acceso.</li>
</ul>

<h2>4. Usa los mensajes para comunicarte</h2>
<p>La sección <strong>Mensajes</strong> permite enviar mensajes directos a cualquier miembro del equipo sin salir de la plataforma. También puedes referenciar tareas directamente en la conversación.</p>

<h2>5. Documenta tu trabajo</h2>
<p>La sección <strong>Documentos</strong> (donde estás ahora) es un editor de texto completo. Puedes:</p>
<ul>
<li>Crear documentos de requisitos, guías o notas de sprint.</li>
<li>Organizarlos en carpetas.</li>
<li>Agregar comentarios y menciones.</li>
</ul>

<blockquote>💡 <strong>Consejo:</strong> Empieza creando un proyecto, añade algunas tareas e invita a un compañero. En menos de 10 minutos tendrás tu equipo organizado.</blockquote>`;

interface DocsState {
  docs: Doc[];
  folders: DocFolder[];
  workspaceId: string | undefined;
  workspaceSlug: string | undefined;
  loadDocs: (workspaceSlug: string) => Promise<void>;
  addDoc: (folderId?: string) => Promise<string>;
  addFolder: (name: string) => Promise<string>;
  updateDoc: (id: string, updates: Partial<Pick<Doc, "title" | "content" | "icon">>) => Promise<void>;
  updateDocTags: (id: string, tags: string[]) => Promise<void>;
  moveDoc: (id: string, folderId: string | undefined) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  addComment: (docId: string, text: string, authorId: string, authorName: string, authorAvatar: string) => Promise<void>;
  resolveComment: (docId: string, commentId: string) => Promise<void>;
  deleteComment: (docId: string, commentId: string) => Promise<void>;
}

export const useDocsStore = create<DocsState>((set, get) => ({
  docs: [],
  folders: [],
  workspaceId: undefined,
  workspaceSlug: undefined,

  loadDocs: async (workspaceSlug: string) => {
    const supabase = createClient();

    // Get workspace id from slug
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .single();

    if (!ws) return;
    const workspaceId = ws.id;

    set({ workspaceId, workspaceSlug });

    // Load folders
    const { data: rawFolders } = await supabase
      .from("document_folders")
      .select("id, name, icon")
      .eq("workspace_id", workspaceId)
      .order("created_at");

    const folders: DocFolder[] = (rawFolders ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
    }));

    // Load docs (without nested profile join — no FK declared between comments and profiles)
    const { data: rawDocs, error: docsError } = await supabase
      .from("documents")
      .select("id, title, content, icon, folder_id, tags, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at");

    if (docsError) console.error("[loadDocs] documents error:", docsError);

    // Load comments separately
    const docIds = (rawDocs ?? []).map((d) => d.id);
    const { data: rawComments } = docIds.length > 0
      ? await supabase
          .from("document_comments")
          .select("id, document_id, author_id, text, resolved, created_at")
          .in("document_id", docIds)
      : { data: [] };

    // Load commenter profiles
    const commenterIds = [...new Set((rawComments ?? []).map((c) => c.author_id))];
    const { data: commenterProfiles } = commenterIds.length > 0
      ? await supabase.from("profiles").select("id, name, avatar_url").in("id", commenterIds)
      : { data: [] };
    const profileMap = new Map((commenterProfiles ?? []).map((p) => [p.id, p]));

    const docs: Doc[] = (rawDocs ?? []).map((d) => {
      const comments: DocComment[] = ((rawComments ?? []) as Array<{
        id: string; document_id: string; author_id: string; text: string; resolved: boolean; created_at: string;
      }>)
        .filter((c) => c.document_id === d.id)
        .map((c) => {
          const p = profileMap.get(c.author_id);
          return {
            id: c.id,
            author: p?.name ?? "Usuario",
            avatar: p?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author_id}`,
            text: c.text,
            createdAt: fmtDate(c.created_at),
            resolved: c.resolved,
          };
        });

      return {
        id: d.id,
        title: d.title,
        content: (d.content as string) ?? "",
        icon: d.icon ?? "📄",
        folderId: d.folder_id ?? undefined,
        tags: (d.tags as string[]) ?? [],
        createdAt: fmtDate(d.created_at),
        updatedAt: fmtDate(d.updated_at),
        comments,
      };
    });

    // If no docs exist, seed with the getting-started guide
    if (docs.length === 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: newDoc } = await supabase
          .from("documents")
          .insert({
            workspace_id: workspaceId,
            title: "Guía de inicio rápido",
            content: GUIDE_CONTENT,
            icon: "🚀",
            tags: ["Guía", "Inicio"],
            created_by: user.id,
          })
          .select("id, title, content, icon, folder_id, tags, created_at, updated_at")
          .single();

        if (newDoc) {
          docs.push({
            id: newDoc.id,
            title: newDoc.title,
            content: (newDoc.content as string) ?? "",
            icon: newDoc.icon ?? "🚀",
            folderId: undefined,
            tags: (newDoc.tags as string[]) ?? [],
            createdAt: fmtDate(newDoc.created_at),
            updatedAt: fmtDate(newDoc.updated_at),
            comments: [],
          });
        }
      }
    }

    set({ docs, folders });
  },

  addDoc: async (folderId) => {
    const supabase = createClient();
    let { workspaceId, workspaceSlug } = get();
    const { data: { user } } = await supabase.auth.getUser();

    // If workspaceId isn't loaded yet, resolve it from Supabase using the stored slug
    if (!workspaceId && workspaceSlug) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();
      if (ws) {
        workspaceId = ws.id;
        set({ workspaceId });
      }
    }

    if (!workspaceId || !user) {
      throw new Error("Workspace no disponible. Intenta recargar la página.");
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspaceId,
        title: "Sin título",
        content: "<p>Empieza a escribir aquí...</p>",
        icon: "📄",
        folder_id: folderId ?? null,
        tags: [],
        created_by: user.id,
      })
      .select("id, title, content, icon, folder_id, tags, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Error creating document");
    }

    const newDoc: Doc = {
      id: data.id,
      title: data.title,
      content: (data.content as string) ?? "",
      icon: data.icon ?? "📄",
      folderId: data.folder_id ?? undefined,
      tags: (data.tags as string[]) ?? [],
      createdAt: fmtDate(data.created_at),
      updatedAt: fmtDate(data.updated_at),
      comments: [],
    };

    set((s) => ({ docs: [...s.docs, newDoc] }));
    return data.id;
  },

  addFolder: async (name) => {
    const supabase = createClient();
    const { workspaceId } = get();

    if (!workspaceId) {
      const id = `folder-${Date.now()}`;
      set((s) => ({ folders: [...s.folders, { id, name, icon: "📂" }] }));
      return id;
    }

    const { data, error } = await supabase
      .from("document_folders")
      .insert({ workspace_id: workspaceId, name, icon: "📂" })
      .select("id, name, icon")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Error creating folder");
    }

    set((s) => ({ folders: [...s.folders, { id: data.id, name: data.name, icon: data.icon }] }));
    return data.id;
  },

  updateDoc: async (id, updates) => {
    const supabase = createClient();

    // Update local state immediately (optimistic)
    const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== id ? d : { ...d, ...updates, updatedAt: today }
      ),
    }));

    const { error } = await supabase
      .from("documents")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[updateDoc] Supabase error:", error);
      throw error;
    }
  },

  updateDocTags: async (id, tags) => {
    const supabase = createClient();
    const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    set((s) => ({
      docs: s.docs.map((d) => (d.id !== id ? d : { ...d, tags, updatedAt: today })),
    }));

    await supabase
      .from("documents")
      .update({ tags, updated_at: new Date().toISOString() })
      .eq("id", id);
  },

  moveDoc: async (id, folderId) => {
    const supabase = createClient();
    const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== id ? d : { ...d, folderId, updatedAt: today }
      ),
    }));

    await supabase
      .from("documents")
      .update({ folder_id: folderId ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);
  },

  deleteDoc: async (id) => {
    const supabase = createClient();
    set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
    await supabase.from("documents").delete().eq("id", id);
  },

  deleteFolder: async (id) => {
    const supabase = createClient();
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      docs: s.docs.map((d) => (d.folderId === id ? { ...d, folderId: undefined } : d)),
    }));
    await supabase.from("document_folders").delete().eq("id", id);
  },

  addComment: async (docId, text, authorId, authorName, authorAvatar) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("document_comments")
      .insert({ document_id: docId, author_id: authorId, text, resolved: false })
      .select("id, created_at")
      .single();

    if (error || !data) {
      // Fallback: local only
      const comment: DocComment = {
        id: `comment-${Date.now()}`,
        author: authorName,
        avatar: authorAvatar,
        text,
        createdAt: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
        resolved: false,
      };
      set((s) => ({
        docs: s.docs.map((d) =>
          d.id !== docId ? d : { ...d, comments: [...d.comments, comment] }
        ),
      }));
      return;
    }

    const comment: DocComment = {
      id: data.id,
      author: authorName,
      avatar: authorAvatar,
      text,
      createdAt: fmtDate(data.created_at),
      resolved: false,
    };

    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId ? d : { ...d, comments: [...d.comments, comment] }
      ),
    }));
  },

  resolveComment: async (docId, commentId) => {
    const supabase = createClient();
    const { docs } = get();
    const doc = docs.find((d) => d.id === docId);
    const comment = doc?.comments.find((c) => c.id === commentId);
    if (!comment) return;

    const newResolved = !comment.resolved;

    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId
          ? d
          : {
              ...d,
              comments: d.comments.map((c) =>
                c.id !== commentId ? c : { ...c, resolved: newResolved }
              ),
            }
      ),
    }));

    await supabase
      .from("document_comments")
      .update({ resolved: newResolved })
      .eq("id", commentId);
  },

  deleteComment: async (docId, commentId) => {
    const supabase = createClient();

    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId
          ? d
          : { ...d, comments: d.comments.filter((c) => c.id !== commentId) }
      ),
    }));

    await supabase.from("document_comments").delete().eq("id", commentId);
  },
}));
