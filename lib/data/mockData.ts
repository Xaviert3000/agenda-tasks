import type {
  KanbanList,
  Project,
  WorkspaceMember,
  SidebarProject,
  SidebarCategory,
  Label,
  Assignee,
} from "@/types/domain";

export const DEMO_WORKSPACE_SLUG = "demo";

const LABELS: Record<string, Label> = {
  ux: { id: "ux", name: "UX", light: "#DBEAFE", solid: "#3B82F6" },
  dev: { id: "dev", name: "Desarrollo", light: "#E0E7FF", solid: "#6366F1" },
  design: { id: "design", name: "Diseño", light: "#EDE9FE", solid: "#8B5CF6" },
  content: { id: "content", name: "Contenido", light: "#DCFCE7", solid: "#22C55E" },
  bug: { id: "bug", name: "Bug", light: "#FEE2E2", solid: "#EF4444" },
  seo: { id: "seo", name: "SEO", light: "#FEF3C7", solid: "#F59E0B" },
  mobile: { id: "mobile", name: "Mobile", light: "#CFFAFE", solid: "#06B6D4" },
  api: { id: "api", name: "API", light: "#D1FAE5", solid: "#10B981" },
};

const ASSIGNEES: Record<string, Assignee> = {
  sofia: {
    id: "sofia",
    name: "Sofía Carter",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4",
  },
  michael: {
    id: "michael",
    name: "Michael Anderson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc",
  },
  daniel: {
    id: "daniel",
    name: "Daniel Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel&backgroundColor=c0aede",
  },
  emma: {
    id: "emma",
    name: "Emma Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffdfbf",
  },
  carlos: {
    id: "carlos",
    name: "Carlos Ramírez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos&backgroundColor=d1d4f9",
  },
};

export const MOCK_PROJECT: Project = {
  id: "ecommerce-website",
  name: "E-Commerce Website",
  icon: "🛍️",
  members: Object.values(ASSIGNEES),
  lists: [],
};

export const MOCK_LISTS: KanbanList[] = [
  {
    id: "todo",
    name: "Por Hacer",
    color: "#EF4444",
    tasks: [
      {
        id: "t1",
        title: "Diseño de página principal del carrito de compras",
        description: "Wireframes y prototipo interactivo para el flujo de checkout",
        labels: [LABELS.ux, LABELS.design],
        priority: "high",
        assignees: [ASSIGNEES.sofia, ASSIGNEES.emma],
        subtasks: { total: 5, completed: 1 },
        attachmentCount: 3,
        commentCount: 7,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isDueSoon: true,
        isAssignedToMe: true,
        listId: "todo",
      },
      {
        id: "t2",
        title: "Integración con pasarela de pagos Stripe",
        description: "Implementar webhooks y manejo de estados de pago",
        labels: [LABELS.dev, LABELS.api],
        priority: "urgent",
        assignees: [ASSIGNEES.michael, ASSIGNEES.daniel, ASSIGNEES.carlos],
        subtasks: { total: 8, completed: 0 },
        attachmentCount: 1,
        commentCount: 12,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isOverdue: true,
        listId: "todo",
      },
      {
        id: "t3",
        title: "Optimización SEO para categorías de productos",
        description: "Meta tags, structured data y sitemap dinámico",
        labels: [LABELS.seo, LABELS.content],
        priority: "med",
        assignees: [ASSIGNEES.emma],
        subtasks: { total: 4, completed: 2 },
        attachmentCount: 0,
        commentCount: 3,
        listId: "todo",
      },
    ],
  },
  {
    id: "in-progress",
    name: "En Progreso",
    color: "#3B82F6",
    wipLimit: 3,
    tasks: [
      {
        id: "t4",
        title: "Sistema de filtros avanzados para catálogo",
        description: "Filtrado por precio, categoría, marca y valoración",
        labels: [LABELS.dev, LABELS.ux],
        priority: "high",
        assignees: [ASSIGNEES.daniel, ASSIGNEES.michael],
        subtasks: { total: 6, completed: 4 },
        attachmentCount: 2,
        commentCount: 9,
        isAssignedToMe: true,
        listId: "in-progress",
      },
      {
        id: "t5",
        title: "Componentes de tarjeta de producto responsive",
        description: "Grid adaptable para mobile, tablet y desktop",
        labels: [LABELS.design, LABELS.mobile],
        priority: "med",
        assignees: [ASSIGNEES.sofia, ASSIGNEES.carlos],
        subtasks: { total: 3, completed: 2 },
        attachmentCount: 5,
        commentCount: 4,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        isDueSoon: true,
        listId: "in-progress",
      },
      {
        id: "t6",
        title: "Panel de administración de inventario",
        description: "CRUD completo con importación masiva via CSV",
        labels: [LABELS.dev],
        priority: "high",
        assignees: [ASSIGNEES.michael, ASSIGNEES.daniel, ASSIGNEES.emma],
        subtasks: { total: 10, completed: 6 },
        attachmentCount: 0,
        commentCount: 15,
        listId: "in-progress",
      },
    ],
  },
  {
    id: "review",
    name: "En Revisión",
    color: "#F59E0B",
    tasks: [
      {
        id: "t7",
        title: "Corrección de bug en cálculo de descuentos",
        description: "Los cupones no aplican correctamente con envío gratis",
        labels: [LABELS.bug],
        priority: "urgent",
        assignees: [ASSIGNEES.carlos],
        subtasks: { total: 2, completed: 2 },
        attachmentCount: 1,
        commentCount: 20,
        listId: "review",
      },
      {
        id: "t8",
        title: "Página de confirmación de pedido",
        description: "Email transaccional + resumen de orden con PDF descargable",
        labels: [LABELS.design, LABELS.content],
        priority: "med",
        assignees: [ASSIGNEES.sofia, ASSIGNEES.emma],
        subtasks: { total: 4, completed: 3 },
        attachmentCount: 6,
        commentCount: 8,
        listId: "review",
      },
      {
        id: "t9",
        title: "Pruebas de rendimiento y optimización de imágenes",
        description: "Lighthouse score > 90, WebP conversion y lazy loading",
        labels: [LABELS.dev, LABELS.mobile],
        priority: "high",
        assignees: [ASSIGNEES.michael, ASSIGNEES.daniel],
        subtasks: { total: 5, completed: 4 },
        attachmentCount: 3,
        commentCount: 6,
        listId: "review",
      },
    ],
  },
  {
    id: "done",
    name: "Completado",
    color: "#22C55E",
    tasks: [
      {
        id: "t10",
        title: "Setup inicial del proyecto y arquitectura base",
        description: "Next.js 14, Supabase, TailwindCSS y CI/CD configurados",
        labels: [LABELS.dev],
        priority: "high",
        assignees: [ASSIGNEES.michael, ASSIGNEES.daniel],
        subtasks: { total: 8, completed: 8 },
        attachmentCount: 2,
        commentCount: 5,
        isCompleted: true,
        listId: "done",
      },
      {
        id: "t11",
        title: "Sistema de autenticación con Google OAuth",
        description: "Login, signup, recuperación de contraseña y 2FA básico",
        labels: [LABELS.dev, LABELS.api],
        priority: "urgent",
        assignees: [ASSIGNEES.sofia, ASSIGNEES.carlos, ASSIGNEES.emma],
        subtasks: { total: 6, completed: 6 },
        attachmentCount: 0,
        commentCount: 11,
        isCompleted: true,
        listId: "done",
      },
    ],
  },
];

export const WORKSPACE_MEMBERS: WorkspaceMember[] = [
  { id: "michael", name: "Michael Anderson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael&backgroundColor=ffd5dc", isOnline: true },
  { id: "sofia", name: "Sofía Carter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia&backgroundColor=b6e3f4", isOnline: true },
  { id: "daniel", name: "Daniel Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=daniel&backgroundColor=c0aede", isOnline: false },
  { id: "emma", name: "Emma Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=ffdfbf", isOnline: true },
];

export const SIDEBAR_PROJECTS: SidebarProject[] = [
  {
    id: "graphic-design",
    name: "Diseño Gráfico",
    icon: "🎨",
    lists: [
      { id: "brand", name: "Identidad de Marca" },
      { id: "logo", name: "Rediseño de Logo" },
    ],
    folders: [],
  },
  {
    id: "mobile-app",
    name: "App Móvil",
    icon: "📱",
    lists: [
      { id: "ios", name: "App iOS" },
      { id: "android", name: "App Android" },
    ],
    folders: [],
  },
  {
    id: "website",
    name: "Sitio Web",
    icon: "🌐",
    lists: [
      { id: "company-web", name: "Web Corporativo" },
      { id: "ecommerce-website", name: "E-Commerce" },
      { id: "landing", name: "Landing Page" },
    ],
    folders: [],
  },
  {
    id: "illustration",
    name: "Ilustración",
    icon: "✏️",
    lists: [
      { id: "illustrations", name: "Pack de Íconos" },
    ],
    folders: [],
  },
];

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { id: "todo", name: "Por Hacer", color: "#EF4444", count: 3 },
  { id: "in-progress", name: "En Progreso", color: "#3B82F6", count: 3 },
  { id: "review", name: "En Revisión", color: "#F59E0B", count: 3 },
  { id: "done", name: "Completado", color: "#22C55E", count: 2 },
];

/* ── Helper: default empty lists for any project ── */
function makeDefaultLists(): KanbanList[] {
  return [
    { id: "todo",        name: "Por Hacer",   color: "#EF4444", tasks: [] },
    { id: "in-progress", name: "En Progreso",  color: "#3B82F6", tasks: [] },
    { id: "review",      name: "En Revisión",  color: "#F59E0B", tasks: [] },
    { id: "done",        name: "Completado",   color: "#22C55E", tasks: [] },
  ];
}

type ProjectData = { name: string; icon: string; lists: KanbanList[]; members: Assignee[] };

/* ── Flat map of every known project ID → ProjectData ── */
const PROJECT_LOOKUP: Record<string, ProjectData> = {
  "ecommerce-website": { name: "E-Commerce Website", icon: "🛍️", lists: MOCK_LISTS,        members: MOCK_PROJECT.members },
  "company-web":       { name: "Web Corporativo",     icon: "🌐", lists: makeDefaultLists(), members: [] },
  "landing":           { name: "Landing Page",         icon: "🌐", lists: makeDefaultLists(), members: [] },
  "brand":             { name: "Identidad de Marca",   icon: "🎨", lists: makeDefaultLists(), members: [] },
  "logo":              { name: "Rediseño de Logo",     icon: "🎨", lists: makeDefaultLists(), members: [] },
  "ios":               { name: "App iOS",              icon: "📱", lists: makeDefaultLists(), members: [] },
  "android":           { name: "App Android",          icon: "📱", lists: makeDefaultLists(), members: [] },
  "illustrations":     { name: "Pack de Íconos",       icon: "✏️", lists: makeDefaultLists(), members: [] },
};

export function getProjectById(projectId: string): ProjectData {
  return PROJECT_LOOKUP[projectId] ?? { name: projectId, icon: "📋", lists: makeDefaultLists(), members: [] };
}
