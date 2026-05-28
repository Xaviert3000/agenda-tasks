-- Ejecutar en Supabase Dashboard > SQL Editor
alter table workspaces
  add column if not exists plan                   text not null default 'free'
    check (plan in ('free', 'pro')),
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text not null default 'inactive'
    check (subscription_status in ('active', 'inactive', 'past_due', 'cancelled'));

create index if not exists workspaces_stripe_customer_id_idx on workspaces (stripe_customer_id);
create index if not exists workspaces_stripe_subscription_id_idx on workspaces (stripe_subscription_id);
