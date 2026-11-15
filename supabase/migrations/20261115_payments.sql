-- Оплаты учеников (раздел «Оплаты» в админке)
create table if not exists public.payments (
  id uuid primary key,
  student_id uuid not null references public.accounts(id) on delete cascade,
  lessons integer not null check (lessons between 1 and 1000),
  amount numeric(12,2) not null check (amount > 0),
  per_lesson numeric(12,2) not null check (per_lesson > 0),
  paid_at date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_student_idx on public.payments (student_id, paid_at desc);
create index if not exists payments_paid_at_idx on public.payments (paid_at desc);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant all on public.payments to service_role;
