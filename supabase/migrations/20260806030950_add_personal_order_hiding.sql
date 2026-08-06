create table public.order_hidden_by_users (
  order_id bigint not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

create index order_hidden_by_users_user_id_idx
  on public.order_hidden_by_users (user_id, hidden_at desc);

alter table public.order_hidden_by_users enable row level security;

grant select, insert, delete on table public.order_hidden_by_users to authenticated;

create policy "Users can view their own hidden orders"
  on public.order_hidden_by_users
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can hide cancelled orders from their branch"
  on public.order_hidden_by_users
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.orders o
      join public.profiles p on p.user_id = (select auth.uid())
      where o.id = order_id
        and o.status = 'CANCELLED'
        and o.branch_id = p.branch_id
    )
  );

create policy "Users can restore their own hidden orders"
  on public.order_hidden_by_users
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
