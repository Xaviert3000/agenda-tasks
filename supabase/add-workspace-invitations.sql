-- workspace_invitations: tracks pending member invitations
create table if not exists workspace_invitations (
  id            uuid            primary key default gen_random_uuid(),
  workspace_id  uuid            not null references workspaces(id) on delete cascade,
  email         text            not null,
  role          workspace_role  not null default 'member',
  invited_by    uuid            not null references auth.users(id) on delete cascade,
  sent_at       timestamptz     not null default now(),
  unique (workspace_id, email)
);

alter table workspace_invitations enable row level security;

-- workspace members can see invitations
create policy "members can view invitations"
  on workspace_invitations for select
  using (is_workspace_member(workspace_id));

-- only admins/owners can insert/update/delete
create policy "admins can manage invitations"
  on workspace_invitations for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspace_invitations.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- enable realtime
alter publication supabase_realtime add table workspace_invitations;
