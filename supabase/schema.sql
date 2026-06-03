-- ============================================================
-- AGENDA-TASKS — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Extensiones ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────
create type priority       as enum ('low', 'med', 'high', 'urgent');
create type workspace_role as enum ('owner', 'admin', 'member');
create type project_role   as enum ('owner', 'admin', 'member');

-- ── profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text        not null default '',
  avatar_url text,
  is_online  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-crear perfil al registrar usuario
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── workspaces ──────────────────────────────────────────────
create table if not exists workspaces (
  id                     uuid primary key default uuid_generate_v4(),
  name                   text        not null,
  slug                   text        not null unique,
  plan                   text        not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text        not null default 'inactive'
                           check (subscription_status in ('active','inactive','past_due','cancelled')),
  created_by             uuid        not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ── workspace_members ───────────────────────────────────────
create table if not exists workspace_members (
  workspace_id uuid           not null references workspaces(id) on delete cascade,
  user_id      uuid           not null references auth.users(id)  on delete cascade,
  role         workspace_role not null default 'member',
  joined_at    timestamptz    not null default now(),
  primary key (workspace_id, user_id)
);

-- ── projects ────────────────────────────────────────────────
create table if not exists projects (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  name         text        not null,
  icon         text        not null default '📁',
  created_by   uuid        not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── project_members ─────────────────────────────────────────
create table if not exists project_members (
  project_id uuid         not null references projects(id) on delete cascade,
  user_id    uuid         not null references auth.users(id) on delete cascade,
  role       project_role not null default 'member',
  joined_at  timestamptz  not null default now(),
  primary key (project_id, user_id)
);

-- ── labels ──────────────────────────────────────────────────
create table if not exists labels (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  name         text        not null,
  light_color  text        not null default '#EEF2FF',
  solid_color  text        not null default '#4F46E5',
  created_at   timestamptz not null default now()
);

-- ── folders (kanban) ────────────────────────────────────────
create table if not exists folders (
  id         uuid primary key default uuid_generate_v4(),
  project_id uuid        not null references projects(id) on delete cascade,
  name       text        not null,
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);

-- ── kanban_lists ────────────────────────────────────────────
create table if not exists kanban_lists (
  id         uuid primary key default uuid_generate_v4(),
  project_id uuid        not null references projects(id) on delete cascade,
  folder_id  uuid        references folders(id) on delete set null,
  name       text        not null,
  color      text        not null default '#6366F1',
  wip_limit  integer,
  position   integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── kanban_columns ──────────────────────────────────────────
create table if not exists kanban_columns (
  id         uuid primary key default uuid_generate_v4(),
  list_id    uuid        not null references kanban_lists(id) on delete cascade,
  name       text        not null,
  color      text        not null default '#E0E7FF',
  wip_limit  integer,
  position   integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── tasks ───────────────────────────────────────────────────
create table if not exists tasks (
  id               uuid primary key default uuid_generate_v4(),
  list_id          uuid        not null references kanban_lists(id) on delete cascade,
  title            text        not null,
  description      text,
  priority         priority    not null default 'med',
  due_date         date,
  is_completed     boolean     not null default false,
  attachment_count integer     not null default 0,
  comment_count    integer     not null default 0,
  estimation       text,
  position         integer     not null default 0,
  created_by       uuid        not null references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── task_assignees ──────────────────────────────────────────
create table if not exists task_assignees (
  task_id     uuid        not null references tasks(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

-- ── task_labels ─────────────────────────────────────────────
create table if not exists task_labels (
  task_id  uuid not null references tasks(id)   on delete cascade,
  label_id uuid not null references labels(id)  on delete cascade,
  primary key (task_id, label_id)
);

-- ── subtasks ────────────────────────────────────────────────
create table if not exists subtasks (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid        not null references tasks(id) on delete cascade,
  title        text        not null,
  is_completed boolean     not null default false,
  position     integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- ── task_comments ───────────────────────────────────────────
create table if not exists task_comments (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid        not null references tasks(id)        on delete cascade,
  user_id    uuid        not null references auth.users(id)   on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── task_attachments ────────────────────────────────────────
create table if not exists task_attachments (
  id           uuid primary key default uuid_generate_v4(),
  task_id      uuid        not null references tasks(id)      on delete cascade,
  created_by   uuid        not null references auth.users(id),
  name         text        not null,
  size_bytes   bigint      not null default 0,
  mime_type    text        not null default 'application/octet-stream',
  storage_path text        not null,
  created_at   timestamptz not null default now()
);

-- ── document_folders ────────────────────────────────────────
create table if not exists document_folders (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id) on delete cascade,
  name         text        not null,
  icon         text        not null default '📁',
  created_at   timestamptz not null default now()
);

-- ── documents ───────────────────────────────────────────────
create table if not exists documents (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id)         on delete cascade,
  project_id   uuid        references projects(id)                    on delete set null,
  folder_id    uuid        references document_folders(id)            on delete set null,
  title        text        not null default 'Sin título',
  content      text        default '<p>Empieza a escribir aquí...</p>',
  icon         text        not null default '📄',
  tags         text[]      not null default '{}',
  created_by   uuid        not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── document_comments ───────────────────────────────────────
create table if not exists document_comments (
  id          uuid primary key default uuid_generate_v4(),
  document_id uuid        not null references documents(id)   on delete cascade,
  author_id   uuid        not null references auth.users(id)  on delete cascade,
  text        text        not null,
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ── messages ────────────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid        not null references workspaces(id)  on delete cascade,
  sender_id    uuid        not null references auth.users(id)  on delete cascade,
  recipient_id uuid        not null references auth.users(id)  on delete cascade,
  content      text        not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('doc-images', 'doc-images', true)
on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles           enable row level security;
alter table workspaces         enable row level security;
alter table workspace_members  enable row level security;
alter table projects           enable row level security;
alter table project_members    enable row level security;
alter table labels             enable row level security;
alter table folders            enable row level security;
alter table kanban_lists       enable row level security;
alter table kanban_columns     enable row level security;
alter table tasks              enable row level security;
alter table task_assignees     enable row level security;
alter table task_labels        enable row level security;
alter table subtasks           enable row level security;
alter table task_comments      enable row level security;
alter table task_attachments   enable row level security;
alter table document_folders   enable row level security;
alter table documents          enable row level security;
alter table document_comments  enable row level security;
alter table messages           enable row level security;

-- Helper: ¿es el usuario miembro del workspace?
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- profiles
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- workspaces
create policy "workspaces_select" on workspaces for select using (is_workspace_member(id));
create policy "workspaces_insert" on workspaces for insert with check (created_by = auth.uid());
create policy "workspaces_update" on workspaces for update using (
  exists (select 1 from workspace_members where workspace_id = id and user_id = auth.uid() and role in ('owner','admin'))
);

-- workspace_members
create policy "wm_select" on workspace_members for select using (is_workspace_member(workspace_id));
create policy "wm_insert" on workspace_members for insert with check (
  exists (select 1 from workspace_members wm2 where wm2.workspace_id = workspace_id and wm2.user_id = auth.uid() and wm2.role in ('owner','admin'))
  or (user_id = auth.uid()) -- auto-join al crear workspace
);
create policy "wm_delete" on workspace_members for delete using (
  user_id = auth.uid() or
  exists (select 1 from workspace_members wm2 where wm2.workspace_id = workspace_id and wm2.user_id = auth.uid() and wm2.role in ('owner','admin'))
);

-- projects
create policy "projects_all" on projects for all using (is_workspace_member(workspace_id));

-- project_members
create policy "pm_all" on project_members for all using (
  exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id))
);

-- labels
create policy "labels_all" on labels for all using (is_workspace_member(workspace_id));

-- folders (kanban)
create policy "folders_all" on folders for all using (
  exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id))
);

-- kanban_lists
create policy "kanban_lists_all" on kanban_lists for all using (
  exists (select 1 from projects p where p.id = project_id and is_workspace_member(p.workspace_id))
);

-- kanban_columns
create policy "kanban_columns_all" on kanban_columns for all using (
  exists (
    select 1 from kanban_lists kl join projects p on p.id = kl.project_id
    where kl.id = list_id and is_workspace_member(p.workspace_id)
  )
);

-- tasks
create policy "tasks_all" on tasks for all using (
  exists (
    select 1 from kanban_lists kl join projects p on p.id = kl.project_id
    where kl.id = list_id and is_workspace_member(p.workspace_id)
  )
);

-- task_assignees
create policy "task_assignees_all" on task_assignees for all using (
  exists (
    select 1 from tasks t join kanban_lists kl on kl.id = t.list_id join projects p on p.id = kl.project_id
    where t.id = task_id and is_workspace_member(p.workspace_id)
  )
);

-- task_labels
create policy "task_labels_all" on task_labels for all using (
  exists (
    select 1 from tasks t join kanban_lists kl on kl.id = t.list_id join projects p on p.id = kl.project_id
    where t.id = task_id and is_workspace_member(p.workspace_id)
  )
);

-- subtasks
create policy "subtasks_all" on subtasks for all using (
  exists (
    select 1 from tasks t join kanban_lists kl on kl.id = t.list_id join projects p on p.id = kl.project_id
    where t.id = task_id and is_workspace_member(p.workspace_id)
  )
);

-- task_comments
create policy "task_comments_all" on task_comments for all using (
  exists (
    select 1 from tasks t join kanban_lists kl on kl.id = t.list_id join projects p on p.id = kl.project_id
    where t.id = task_id and is_workspace_member(p.workspace_id)
  )
);

-- task_attachments
create policy "task_attachments_all" on task_attachments for all using (
  exists (
    select 1 from tasks t join kanban_lists kl on kl.id = t.list_id join projects p on p.id = kl.project_id
    where t.id = task_id and is_workspace_member(p.workspace_id)
  )
);

-- document_folders
create policy "document_folders_all" on document_folders for all using (is_workspace_member(workspace_id));

-- documents
create policy "documents_all" on documents for all using (is_workspace_member(workspace_id));

-- document_comments
create policy "document_comments_all" on document_comments for all using (
  exists (select 1 from documents d where d.id = document_id and is_workspace_member(d.workspace_id))
);

-- messages
create policy "messages_select" on messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages_insert" on messages for insert with check (sender_id = auth.uid());

-- Storage: doc-images
create policy "doc_images_select" on storage.objects for select using (bucket_id = 'doc-images');
create policy "doc_images_insert" on storage.objects for insert with check (bucket_id = 'doc-images' and auth.role() = 'authenticated');
create policy "doc_images_delete" on storage.objects for delete using (bucket_id = 'doc-images' and owner = auth.uid());

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_workspace_members_user     on workspace_members(user_id);
create index if not exists idx_workspace_members_ws       on workspace_members(workspace_id);
create index if not exists idx_documents_workspace        on documents(workspace_id);
create index if not exists idx_documents_folder           on documents(folder_id);
create index if not exists idx_document_comments_document on document_comments(document_id);
create index if not exists idx_tasks_list                 on tasks(list_id);
create index if not exists idx_messages_workspace         on messages(workspace_id);
create index if not exists idx_messages_sender            on messages(sender_id);
create index if not exists idx_messages_recipient         on messages(recipient_id);
