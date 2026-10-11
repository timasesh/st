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
  lesson_link text,
  lesson_description text,
  teacher_id uuid references public.accounts(id) on delete set null,
  children uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  progress jsonb
);

alter table public.accounts add column if not exists lesson_link text;
alter table public.accounts add column if not exists lesson_description text;

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

-- Sky Quest stars are an independent game balance, separate from accounts.progress stars.
create table if not exists public.skyquest_progress (
  student_id uuid primary key references public.accounts(id) on delete cascade,
  stars integer not null default 0 check (stars >= 0),
  updated_at timestamptz not null default now()
);

alter table public.skyquest_progress enable row level security;
revoke all on public.skyquest_progress from anon, authenticated;
grant all on public.skyquest_progress to service_role;

create or replace function public.change_skyquest_stars(student_uuid uuid, star_delta integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.skyquest_progress (student_id, stars, updated_at)
  values (student_uuid, greatest(0, star_delta), now())
  on conflict (student_id) do update
    set stars = greatest(0, skyquest_progress.stars + star_delta), updated_at = now()
  returning stars;
$$;

revoke all on function public.change_skyquest_stars(uuid, integer) from public, anon, authenticated;
grant execute on function public.change_skyquest_stars(uuid, integer) to service_role;
