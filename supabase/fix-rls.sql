-- ============================================================
-- fix-rls.sql — Corrige recursión infinita en políticas RLS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Helper: obtener el rol del usuario en un workspace (security definer para evitar recursión)
create or replace function get_workspace_role(ws_id uuid)
returns workspace_role language sql security definer set search_path = public as $$
  select role from workspace_members
  where workspace_id = ws_id and user_id = auth.uid()
  limit 1;
$$;

-- Helper: comprobar si dos usuarios comparten al menos un workspace
create or replace function shares_workspace(other_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members wm1
    join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = auth.uid() and wm2.user_id = other_user_id
  );
$$;

-- ── Workspace members ──────────────────────────────────────
-- La política original consultaba workspace_members desde sí misma → recursión
drop policy if exists "Owners can manage workspace members" on workspace_members;

create policy "Owners can manage workspace members"
  on workspace_members for all using (
    get_workspace_role(workspace_id) = 'owner'
  );

-- ── Profiles ───────────────────────────────────────────────
-- El JOIN doble sobre workspace_members (con RLS activo) también recursaba
drop policy if exists "Users can view profiles in their workspaces" on profiles;

create policy "Users can view profiles in their workspaces"
  on profiles for select using (
    id = auth.uid() or shares_workspace(id)
  );

-- ── Workspaces: actualizar política de update con la nueva función ──
drop policy if exists "Owners and admins can update workspaces" on workspaces;

create policy "Owners and admins can update workspaces"
  on workspaces for update using (
    get_workspace_role(id) in ('owner', 'admin')
  );
