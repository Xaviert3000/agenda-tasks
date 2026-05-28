-- ============================================================
-- agenda-tasks — Schema completo
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Enums
create type priority as enum ('low', 'med', 'high', 'urgent');
create type workspace_role as enum ('owner', 'admin', 'member');
create type project_role as enum ('owner', 'admin', 'member');

-- ============================================================
-- Profiles (extiende auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  is_online   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-crear perfil al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Workspaces
-- ============================================================
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table workspace_members (
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          workspace_role not null default 'member',
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Auto-añadir creador como owner
create or replace function handle_new_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on workspaces
  for each row execute procedure handle_new_workspace();

-- ============================================================
-- Projects
-- ============================================================
create table projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  icon          text not null default '📋',
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        project_role not null default 'member',
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Auto-añadir creador como owner
create or replace function handle_new_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row execute procedure handle_new_project();

-- ============================================================
-- Labels (nivel workspace)
-- ============================================================
create table labels (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  light_color   text not null,
  solid_color   text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Folders y Kanban Lists
-- ============================================================
create table folders (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table kanban_lists (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  folder_id   uuid references folders(id) on delete set null,
  name        text not null,
  color       text not null default '#6366f1',
  wip_limit   integer,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- Tasks
-- ============================================================
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  list_id          uuid not null references kanban_lists(id) on delete cascade,
  title            text not null,
  description      text,
  priority         priority not null default 'med',
  due_date         date,
  is_completed     boolean not null default false,
  attachment_count integer not null default 0,
  comment_count    integer not null default 0,
  position         integer not null default 0,
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table task_assignees (
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table task_labels (
  task_id   uuid not null references tasks(id) on delete cascade,
  label_id  uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  title        text not null,
  is_completed boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Documents
-- ============================================================
create table documents (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  project_id    uuid references projects(id) on delete set null,
  title         text not null default 'Untitled',
  content       jsonb,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- Messages (DMs entre miembros del workspace)
-- ============================================================
create table messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  sender_id     uuid not null references auth.users(id),
  recipient_id  uuid not null references auth.users(id),
  content       text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Índices
-- ============================================================
create index on workspace_members (user_id);
create index on project_members (user_id);
create index on projects (workspace_id);
create index on kanban_lists (project_id);
create index on tasks (list_id);
create index on tasks (created_by);
create index on task_assignees (user_id);
create index on subtasks (task_id);
create index on documents (workspace_id);
create index on messages (workspace_id, sender_id, recipient_id);
create index on messages (workspace_id, recipient_id) where read_at is null;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table profiles          enable row level security;
alter table workspaces        enable row level security;
alter table workspace_members enable row level security;
alter table projects          enable row level security;
alter table project_members   enable row level security;
alter table labels            enable row level security;
alter table folders           enable row level security;
alter table kanban_lists      enable row level security;
alter table tasks             enable row level security;
alter table task_assignees    enable row level security;
alter table task_labels       enable row level security;
alter table subtasks          enable row level security;
alter table documents         enable row level security;
alter table messages          enable row level security;

-- Helper: ¿es el usuario miembro del workspace?
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Helper: ¿es el usuario miembro del proyecto?
create or replace function is_project_member(proj_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from project_members
    where project_id = proj_id and user_id = auth.uid()
  );
$$;

-- Profiles
create policy "Users can view profiles in their workspaces"
  on profiles for select using (
    exists (
      select 1 from workspace_members wm1
      join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = profiles.id
    )
  );
create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

-- Workspaces
create policy "Members can view workspaces"
  on workspaces for select using (is_workspace_member(id));
create policy "Authenticated users can create workspaces"
  on workspaces for insert with check (created_by = auth.uid());
create policy "Owners and admins can update workspaces"
  on workspaces for update using (
    exists (
      select 1 from workspace_members
      where workspace_id = id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Workspace members
create policy "Members can view workspace members"
  on workspace_members for select using (is_workspace_member(workspace_id));
create policy "Owners can manage workspace members"
  on workspace_members for all using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspace_members.workspace_id
        and user_id = auth.uid() and role = 'owner'
    )
  );

-- Projects
create policy "Workspace members can view projects"
  on projects for select using (is_workspace_member(workspace_id));
create policy "Workspace members can create projects"
  on projects for insert with check (is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "Project owners and admins can update projects"
  on projects for update using (is_project_member(id));
create policy "Project owners can delete projects"
  on projects for delete using (
    exists (
      select 1 from project_members
      where project_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- Project members
create policy "Project members can view project members"
  on project_members for select using (is_project_member(project_id));
create policy "Project owners can manage project members"
  on project_members for all using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid() and pm.role = 'owner'
    )
  );

-- Labels
create policy "Workspace members can manage labels"
  on labels for all using (is_workspace_member(workspace_id));

-- Folders
create policy "Project members can manage folders"
  on folders for all using (is_project_member(project_id));

-- Kanban lists
create policy "Project members can manage kanban lists"
  on kanban_lists for all using (is_project_member(project_id));

-- Tasks
create policy "Project members can view tasks"
  on tasks for select using (
    exists (
      select 1 from kanban_lists kl
      where kl.id = tasks.list_id and is_project_member(kl.project_id)
    )
  );
create policy "Project members can create tasks"
  on tasks for insert with check (
    exists (
      select 1 from kanban_lists kl
      where kl.id = list_id and is_project_member(kl.project_id)
    ) and created_by = auth.uid()
  );
create policy "Project members can update tasks"
  on tasks for update using (
    exists (
      select 1 from kanban_lists kl
      where kl.id = tasks.list_id and is_project_member(kl.project_id)
    )
  );
create policy "Task creator or project owner can delete tasks"
  on tasks for delete using (created_by = auth.uid());

-- Task assignees
create policy "Project members can manage task assignees"
  on task_assignees for all using (
    exists (
      select 1 from tasks t
      join kanban_lists kl on kl.id = t.list_id
      where t.id = task_assignees.task_id and is_project_member(kl.project_id)
    )
  );

-- Task labels
create policy "Project members can manage task labels"
  on task_labels for all using (
    exists (
      select 1 from tasks t
      join kanban_lists kl on kl.id = t.list_id
      where t.id = task_labels.task_id and is_project_member(kl.project_id)
    )
  );

-- Subtasks
create policy "Project members can manage subtasks"
  on subtasks for all using (
    exists (
      select 1 from tasks t
      join kanban_lists kl on kl.id = t.list_id
      where t.id = subtasks.task_id and is_project_member(kl.project_id)
    )
  );

-- Documents
create policy "Workspace members can manage documents"
  on documents for all using (is_workspace_member(workspace_id));

-- Messages
create policy "Users can view their own messages"
  on messages for select using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );
create policy "Users can send messages in their workspaces"
  on messages for insert with check (
    sender_id = auth.uid() and is_workspace_member(workspace_id)
  );
create policy "Recipients can mark messages as read"
  on messages for update using (recipient_id = auth.uid());

-- ============================================================
-- updated_at automático
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on profiles
  for each row execute procedure set_updated_at();
create trigger set_updated_at before update on workspaces
  for each row execute procedure set_updated_at();
create trigger set_updated_at before update on projects
  for each row execute procedure set_updated_at();
create trigger set_updated_at before update on kanban_lists
  for each row execute procedure set_updated_at();
create trigger set_updated_at before update on tasks
  for each row execute procedure set_updated_at();
create trigger set_updated_at before update on documents
  for each row execute procedure set_updated_at();
