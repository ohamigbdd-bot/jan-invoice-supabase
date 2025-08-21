
-- Run in Supabase SQL editor

create table if not exists public.payments (
  id bigserial primary key,
  payment_no text not null,
  jan text not null,
  team_key text not null,
  created_at timestamp with time zone default now(),
  created_by uuid default auth.uid()
);

create table if not exists public.sales (
  id bigserial primary key,
  jan text not null,
  sales_no text not null,
  partner text,
  amount numeric default 0,
  team_key text not null,
  created_at timestamp with time zone default now(),
  created_by uuid default auth.uid()
);

create index if not exists idx_payments_payment_no on public.payments (payment_no);
create index if not exists idx_payments_jan on public.payments (jan);
create index if not exists idx_payments_team on public.payments (team_key);

create index if not exists idx_sales_jan on public.sales (jan);
create index if not exists idx_sales_sales_no on public.sales (sales_no);
create index if not exists idx_sales_team on public.sales (team_key);

-- Enable RLS
alter table public.payments enable row level security;
alter table public.sales enable row level security;

-- Policies: authenticated users can only access rows for team_key values they know.
-- (Simple shared key model: anyone authenticated can read/write any team_key;
--  UI ensures users only use their team's key. For stricter isolation, create a mapping table.)
create policy "payments_select" on public.payments for select
  to authenticated using (true);

create policy "payments_insert" on public.payments for insert
  to authenticated with check (true);

create policy "payments_delete" on public.payments for delete
  to authenticated using (true);

create policy "sales_select" on public.sales for select
  to authenticated using (true);

create policy "sales_insert" on public.sales for insert
  to authenticated with check (true);

create policy "sales_delete" on public.sales for delete
  to authenticated using (true);
