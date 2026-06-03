-- ============================================================
-- Migration: kanban_columns table
-- Each sidebar list now has its own independent kanban columns.
-- tasks.list_id now references kanban_columns(id).
-- ============================================================

-- 1. Create kanban_columns table
create table if not exists kanban_columns (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references kanban_lists(id) on delete cascade,
  name       text not null,
  color      text not null default '#6366f1',
  wip_limit  integer,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kanban_columns_list_id_idx on kanban_columns(list_id);

-- 2. Enable RLS
alter table kanban_columns enable row level security;

create policy "project members can manage columns"
  on kanban_columns for all
  using (
    exists (
      select 1 from kanban_lists kl
      where kl.id = kanban_columns.list_id
        and is_project_member(kl.project_id)
    )
  );

-- 3. Re-point tasks.list_id → kanban_columns instead of kanban_lists
--    (safe because there are no tasks yet; if tasks exist, migrate first)
alter table tasks drop constraint if exists tasks_list_id_fkey;
alter table tasks
  add constraint tasks_list_id_fkey
  foreign key (list_id) references kanban_columns(id) on delete cascade;

-- 4. Remove stale task RLS policies that referenced kanban_lists and recreate
drop policy if exists "project members can view tasks"   on tasks;
drop policy if exists "project members can create tasks" on tasks;
drop policy if exists "project members can update tasks" on tasks;
drop policy if exists "project members can delete tasks" on tasks;

create policy "project members can view tasks"
  on tasks for select
  using (
    exists (
      select 1 from kanban_columns kc
      join kanban_lists kl on kl.id = kc.list_id
      where kc.id = tasks.list_id
        and is_project_member(kl.project_id)
    )
  );

create policy "project members can create tasks"
  on tasks for insert
  with check (
    exists (
      select 1 from kanban_columns kc
      join kanban_lists kl on kl.id = kc.list_id
      where kc.id = list_id
        and is_project_member(kl.project_id)
    )
  );

create policy "project members can update tasks"
  on tasks for update
  using (
    exists (
      select 1 from kanban_columns kc
      join kanban_lists kl on kl.id = kc.list_id
      where kc.id = tasks.list_id
        and is_project_member(kl.project_id)
    )
  );

create policy "project members can delete tasks"
  on tasks for delete
  using (
    exists (
      select 1 from kanban_columns kc
      join kanban_lists kl on kl.id = kc.list_id
      where kc.id = tasks.list_id
        and is_project_member(kl.project_id)
    )
  );

-- 5. Clean up old column-type rows from kanban_lists
--    (the 4 defaults created per project: Por Hacer, En Progreso, etc.)
--    They no longer belong there; sidebar lists are user-created only.
--    WARNING: only run if no tasks exist referencing these as kanban_columns yet.
delete from kanban_lists
where name in ('Por Hacer', 'En Progreso', 'En Revisión', 'Completado')
  and folder_id is null;

-- 6. Trigger to auto-update updated_at on kanban_columns
create trigger set_updated_at
  before update on kanban_columns
  for each row execute function set_updated_at();
