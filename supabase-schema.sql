-- Run this once in Supabase: SQL Editor -> New query -> Run.
-- Every policy below limits a record to its authenticated owner.
create table if not exists public.budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text not null check (char_length(description) between 1 and 80),
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  notes text not null default '' check (char_length(notes) <= 250),
  created_at timestamptz not null default now()
);

alter table public.budgets enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

create policy "Users manage their budget" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their expenses" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
