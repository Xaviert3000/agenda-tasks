-- ── notes (bloc de notas) ───────────────────────────────────
create table if not exists notes (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  title      text        not null default '',
  body       text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para listar notas del usuario ordenadas por fecha
create index if not exists notes_user_id_updated_at_idx on notes(user_id, updated_at desc);

-- RLS
alter table notes enable row level security;

create policy "notes: select own"
  on notes for select
  using (auth.uid() = user_id);

create policy "notes: insert own"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "notes: update own"
  on notes for update
  using (auth.uid() = user_id);

create policy "notes: delete own"
  on notes for delete
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table notes;
