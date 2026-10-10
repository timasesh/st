-- Run once in Supabase Dashboard → SQL Editor → New query.
-- The browser must never use the service-role key. Only the Render server uses it.

create table if not exists public.admin_credentials (
  username text primary key,
  password_salt text not null,
  password_hash text not null,
  must_change_password boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key,
  role text not null check (role in ('student', 'parent', 'teacher')),
  phone text not null unique,
  first_name text not null,
  last_name text not null,
  student_class text,
  teacher_id uuid references public.accounts(id) on delete set null,
  children uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  progress jsonb
);

create index if not exists accounts_role_status_idx on public.accounts (role, status);
create index if not exists accounts_teacher_id_idx on public.accounts (teacher_id);

alter table public.admin_credentials enable row level security;
alter table public.app_settings enable row level security;
alter table public.accounts enable row level security;

revoke all on public.admin_credentials from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.accounts from anon, authenticated;
grant all on public.admin_credentials to service_role;
grant all on public.app_settings to service_role;
grant all on public.accounts to service_role;
