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

const INITIAL_DOCS: Doc[] = [
  {
    id: "doc-1",
    title: "Guía de Diseño del Proyecto",
    icon: "🎨",
    folderId: "folder-1",
    createdAt: "20 may 2026",
    updatedAt: "25 may 2026",
    tags: ["Diseño", "Guía", "UI/UX"],
    comments: [
      {
        id: "c-1", author: "Sofía Carter",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophia&backgroundColor=ffd5dc",
        text: "El sistema de colores está muy bien documentado. ¿Agregamos también los tokens de sombra?",
        createdAt: "25 may 2026", resolved: false,
      },
      {
        id: "c-2", author: "Michael Anderson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=b6e3f4",
        text: "Aprobado ✅ Listo para compartir con el equipo.",
        createdAt: "26 may 2026", resolved: true,
      },
    ],
    content: `<h1>Guía de Diseño del Proyecto</h1>
<p>Este documento establece los lineamientos visuales y de componentes para el proyecto <strong>E-Commerce Website</strong>.</p>
<h2>🎨 Paleta de colores</h2>
<p>El sistema de diseño utiliza los siguientes colores base:</p>
<ul>
<li><strong>Brand Navy</strong> — #2F3988 · Color principal de la marca</li>
<li><strong>Brand Cyan</strong> — #9ACCEC · Acento y barras de progreso</li>
<li><strong>Brand Violet</strong> — #7177B4 · Color secundario</li>
<li><strong>Success</strong> — #22C55E · Confirmaciones y estados completados</li>
<li><strong>Warning</strong> — #F59E0B · Alertas y vencimientos próximos</li>
<li><strong>Danger</strong> — #EF4444 · Errores y elementos vencidos</li>
</ul>
<h2>✏️ Tipografía</h2>
<p>Utilizamos <strong>Plus Jakarta Sans</strong> para títulos y <strong>Inter</strong> para texto del cuerpo. Los fragmentos de código usan <code>JetBrains Mono</code>.</p>
<h2>📐 Espaciado y grid</h2>
<p>Seguimos un sistema de 4px base. Los componentes usan esquinas redondeadas con <code>border-radius: 8px</code> (md) y <code>12px</code> (xl) para tarjetas.</p>
<blockquote>💡 Siempre priorizar la consistencia sobre la creatividad individual en componentes compartidos.</blockquote>`,
  },
  {
    id: "doc-2",
    title: "Especificaciones Técnicas",
    icon: "⚙️",
    folderId: "folder-1",
    createdAt: "18 may 2026",
    updatedAt: "24 may 2026",
    tags: ["Backend", "Stack", "Referencia"],
    comments: [],
    content: `<h1>Especificaciones Técnicas</h1>
<p>Referencia técnica del stack y arquitectura del proyecto.</p>
<h2>🚀 Stack tecnológico</h2>
<ul>
<li><strong>Framework:</strong> Next.js 16 (App Router)</li>
<li><strong>Lenguaje:</strong> TypeScript 5.x</li>
<li><strong>Estilos:</strong> Tailwind CSS v4</li>
<li><strong>Estado:</strong> Zustand + TanStack Query</li>
<li><strong>DnD:</strong> @dnd-kit/core + @dnd-kit/sortable</li>
</ul>
<h2>📁 Estructura de carpetas</h2>
<ul>
<li><code>app/</code> — Rutas y layouts</li>
<li><code>components/</code> — Componentes reutilizables</li>
<li><code>lib/</code> — Utilidades, stores y datos</li>
<li><code>types/</code> — Definiciones de TypeScript</li>
</ul>`,
  },
  {
    id: "doc-3",
    title: "Roadmap Q2 2026",
    icon: "🗺️",
    folderId: "folder-2",
    createdAt: "1 may 2026",
    updatedAt: "22 may 2026",
    tags: ["Planificación", "Q2", "Roadmap"],
    comments: [
      {
        id: "c-3", author: "Emma Wilson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=c0aede",
        text: "Necesitamos revisar el timeline de julio. Las pruebas de carga podrían tomar más tiempo.",
        createdAt: "22 may 2026", resolved: false,
      },
    ],
    content: `<h1>Roadmap Q2 2026</h1>
<p>Plan de trabajo para el segundo trimestre del año.</p>
<h2>📅 Mayo — Fundamentos</h2>
<ul>
<li>✅ Setup inicial del proyecto y CI/CD</li>
<li>✅ Sistema de autenticación con Google OAuth</li>
<li>🔄 Integración con Stripe (en progreso)</li>
</ul>
<h2>📅 Junio — Catálogo y checkout</h2>
<ul>
<li>⬜ Sistema de filtros avanzados</li>
<li>⬜ Carrito de compras y checkout</li>
</ul>
<blockquote>🎯 Meta: 1,000 pedidos en el primer mes post-lanzamiento.</blockquote>`,
  },
  {
    id: "doc-4",
    title: "Sprint Review — May 23",
    icon: "📝",
    folderId: "folder-2",
    createdAt: "23 may 2026",
    updatedAt: "23 may 2026",
    tags: ["Sprint", "Review"],
    comments: [],
    content: `<h1>Sprint Review — 23 de Mayo</h1>
<p><strong>Duración:</strong> 23 – 30 Mayo 2026</p>
<h2>✅ Completado</h2>
<ul>
<li>Setup de CI/CD con GitHub Actions</li>
<li>Autenticación OAuth</li>
<li>Diseño base de tarjetas de producto</li>
</ul>
<h2>🔄 En progreso</h2>
<ul>
<li>Integración con Stripe — Michael (80%)</li>
<li>Filtros avanzados del catálogo — Daniel (65%)</li>
</ul>`,
  },
  {
    id: "doc-5",
    title: "API Reference — Stripe",
    icon: "🔌",
    createdAt: "15 may 2026",
    updatedAt: "21 may 2026",
    tags: ["API", "Stripe", "Backend"],
    comments: [],
    content: `<h1>API Reference — Stripe Integration</h1>
<p>Documentación de los endpoints y webhooks utilizados en la integración con Stripe.</p>
<h2>🔐 Autenticación</h2>
<p>Todas las llamadas requieren el header <code>Authorization: Bearer sk_live_...</code>.</p>
<h2>📡 Webhooks configurados</h2>
<ul>
<li><code>payment_intent.succeeded</code> — Confirma el pedido</li>
<li><code>payment_intent.payment_failed</code> — Notifica al usuario del fallo</li>
<li><code>charge.refunded</code> — Procesa devolución</li>
</ul>
<blockquote>⚠️ Nunca exponer <code>STRIPE_SECRET_KEY</code> en el frontend.</blockquote>`,
  },
];

const INITIAL_FOLDERS: DocFolder[] = [
  { id: "folder-1", name: "Diseño & Técnico", icon: "📂" },
  { id: "folder-2", name: "Sprints & Planning", icon: "📂" },
];

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
