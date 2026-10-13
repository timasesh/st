-- Apply once in Supabase SQL Editor before deploying this application update.
-- This migration is idempotent and can be rerun if the editor disconnects.

alter table public.accounts add column if not exists lesson_link text;
alter table public.accounts add column if not exists lesson_description text;

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

alter table public.skyquest_progress add column if not exists daily_awards integer not null default 0 check (daily_awards >= 0);
alter table public.skyquest_progress add column if not exists daily_award_date date not null default current_date;

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
