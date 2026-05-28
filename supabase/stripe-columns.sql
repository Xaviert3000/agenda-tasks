-- Ejecutar en Supabase Dashboard > SQL Editor
alter table workspaces
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text not null default 'inactive'
    check (subscription_status in ('active', 'inactive', 'past_due', 'cancelled'));

create index if not exists on workspaces (stripe_customer_id);
create index if not exists on workspaces (stripe_subscription_id);
