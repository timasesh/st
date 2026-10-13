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

create table if not exists public.homework_attachments (
  student_id uuid not null references public.accounts(id) on delete cascade,
  entry_id uuid not null,
  filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  updated_at timestamptz not null default now(),
  primary key (student_id, entry_id)
);

alter table public.homework_attachments enable row level security;
revoke all on public.homework_attachments from anon, authenticated;
grant all on public.homework_attachments to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-attachments', 'homework-attachments', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Sky Quest stars are an independent game balance, separate from accounts.progress stars.
create table if not exists public.skyquest_progress (
  student_id uuid primary key references public.accounts(id) on delete cascade,
  stars integer not null default 0 check (stars >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  daily_awards integer not null default 0 check (daily_awards >= 0),
  daily_award_date date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table public.skyquest_progress add column if not exists best_score integer not null default 0 check (best_score >= 0);
alter table public.skyquest_progress add column if not exists daily_awards integer not null default 0 check (daily_awards >= 0);
alter table public.skyquest_progress add column if not exists daily_award_date date not null default current_date;

alter table public.skyquest_progress enable row level security;
revoke all on public.skyquest_progress from anon, authenticated;
grant all on public.skyquest_progress to service_role;

create or replace function public.change_skyquest_stars(student_uuid uuid, star_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stars integer;
  current_awards integer;
  award_date date;
  next_stars integer;
begin
  if star_delta not in (-5, 1) then return -1; end if;
  insert into public.skyquest_progress (student_id, stars, updated_at)
  values (student_uuid, 0, now()) on conflict (student_id) do nothing;
  select stars, daily_awards, daily_award_date into current_stars, current_awards, award_date
  from public.skyquest_progress where student_id = student_uuid for update;
  if award_date <> current_date then current_awards := 0; end if;
  if star_delta = 1 and current_awards >= 20 then return -1; end if;
  next_stars := greatest(0, current_stars + star_delta);
  update public.skyquest_progress set
    stars = next_stars,
    daily_awards = current_awards + case when star_delta = 1 then 1 else 0 end,
    daily_award_date = current_date,
    updated_at = now()
  where student_id = student_uuid;
  return next_stars;
end;
$$;

revoke all on function public.change_skyquest_stars(uuid, integer) from public, anon, authenticated;
grant execute on function public.change_skyquest_stars(uuid, integer) to service_role;

create or replace function public.record_skyquest_score(student_uuid uuid, new_score integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.skyquest_progress (student_id, best_score, updated_at)
  values (student_uuid, greatest(0, new_score), now())
  on conflict (student_id) do update
    set best_score = greatest(skyquest_progress.best_score, new_score), updated_at = now()
  returning best_score;
$$;

revoke all on function public.record_skyquest_score(uuid, integer) from public, anon, authenticated;
grant execute on function public.record_skyquest_score(uuid, integer) to service_role;
