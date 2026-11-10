-- Study Task board: сохранённые доски преподавателя
create table if not exists public.teacher_boards (
  id text primary key,
  teacher_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  pages jsonb not null default '[[]]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_boards_teacher_idx on public.teacher_boards (teacher_id, updated_at desc);

alter table public.teacher_boards enable row level security;
revoke all on public.teacher_boards from anon, authenticated;
grant all on public.teacher_boards to service_role;
