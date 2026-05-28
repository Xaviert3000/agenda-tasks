-- fix-workspace-select.sql
-- Permite que el creador de un workspace siempre pueda verlo,
-- independientemente del estado de workspace_members.
-- Ejecutar en Supabase Dashboard > SQL Editor

drop policy if exists "Members can view workspaces" on workspaces;

create policy "Members can view workspaces"
  on workspaces for select using (
    created_by = auth.uid()
    or is_workspace_member(id)
  );
