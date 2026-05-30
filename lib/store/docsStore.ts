import { create } from "zustand";

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

const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

export const GETTING_STARTED_DOC_ID = "getting-started";

const GUIDE_DOC: Doc = {
  id: GETTING_STARTED_DOC_ID,
  title: "Guía de inicio rápido",
  icon: "🚀",
  createdAt: today,
  updatedAt: today,
  tags: ["Guía", "Inicio"],
  comments: [],
  content: `<h1>🚀 Bienvenido a agenda.ME</h1>
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

<blockquote>💡 <strong>Consejo:</strong> Empieza creando un proyecto, añade algunas tareas e invita a un compañero. En menos de 10 minutos tendrás tu equipo organizado.</blockquote>`,
};

const INITIAL_DOCS: Doc[] = [GUIDE_DOC];
const INITIAL_FOLDERS: DocFolder[] = [];

interface DocsState {
  docs: Doc[];
  folders: DocFolder[];
  addDoc: (folderId?: string) => string;
  addFolder: (name: string) => string;
  updateDoc: (id: string, updates: Partial<Pick<Doc, "title" | "content" | "icon">>) => void;
  updateDocTags: (id: string, tags: string[]) => void;
  moveDoc: (id: string, folderId: string | undefined) => void;
  deleteDoc: (id: string) => void;
  deleteFolder: (id: string) => void;
  addComment: (docId: string, text: string) => void;
  resolveComment: (docId: string, commentId: string) => void;
  deleteComment: (docId: string, commentId: string) => void;
}

export const useDocsStore = create<DocsState>((set, get) => ({
  docs: INITIAL_DOCS,
  folders: INITIAL_FOLDERS,

  addDoc: (folderId) => {
    const id = `doc-${Date.now()}`;
    const newDoc: Doc = {
      id,
      title: "Sin título",
      content: "<p>Empieza a escribir aquí...</p>",
      icon: "📄",
      folderId,
      createdAt: today,
      updatedAt: today,
      tags: [],
      comments: [],
    };
    set((s) => ({ docs: [...s.docs, newDoc] }));
    return id;
  },

  addFolder: (name) => {
    const id = `folder-${Date.now()}`;
    set((s) => ({
      folders: [...s.folders, { id, name, icon: "📂" }],
    }));
    return id;
  },

  updateDoc: (id, updates) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== id ? d : { ...d, ...updates, updatedAt: today }
      ),
    })),

  updateDocTags: (id, tags) =>
    set((s) => ({
      docs: s.docs.map((d) => (d.id !== id ? d : { ...d, tags, updatedAt: today })),
    })),

  moveDoc: (id, folderId) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== id ? d : { ...d, folderId, updatedAt: today }
      ),
    })),

  deleteDoc: (id) =>
    set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),

  deleteFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      docs: s.docs.map((d) => (d.folderId === id ? { ...d, folderId: undefined } : d)),
    })),

  addComment: (docId, text) => {
    const comment: DocComment = {
      id: `comment-${Date.now()}`,
      author: "Tú",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=me&backgroundColor=b6e3f4",
      text,
      createdAt: today,
      resolved: false,
    };
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId ? d : { ...d, comments: [...d.comments, comment] }
      ),
    }));
  },

  resolveComment: (docId, commentId) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId
          ? d
          : {
              ...d,
              comments: d.comments.map((c) =>
                c.id !== commentId ? c : { ...c, resolved: !c.resolved }
              ),
            }
      ),
    })),

  deleteComment: (docId, commentId) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id !== docId
          ? d
          : { ...d, comments: d.comments.filter((c) => c.id !== commentId) }
      ),
    })),
}));
