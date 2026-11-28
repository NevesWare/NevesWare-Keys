-- RS Stock W — migração 002: lojas compartilhadas (equipe), rondas semanais, perdas
-- Não apaga dados. Pode ser aplicada pelo assistente (com sua aprovação) ou colada no
-- SQL Editor do Supabase (Database › SQL Editor › New query › Run).

-- ============ Custos e dados estruturados das movimentações (relatório de perdas) ============
alter table public.products add column if not exists cost numeric default 0;
alter table public.movements add column if not exists qty numeric;
alter table public.movements add column if not exists reason text;
alter table public.movements add column if not exists unit_cost numeric;

-- ============ Lojas compartilhadas (equipe) ============
alter table public.stores add column if not exists invite_code text unique;

create table if not exists public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  nick text default '',
  joined_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index if not exists store_members_user on public.store_members (user_id);

create or replace function public.add_store_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.store_members (store_id, user_id, role, nick)
  values (new.id, new.user_id, 'owner', coalesce((select nick from public.profiles where id = new.user_id), ''))
  on conflict (store_id, user_id) do nothing;
  return new;
end; $$;
revoke execute on function public.add_store_owner() from public, anon, authenticated;
drop trigger if exists stores_add_owner on public.stores;
create trigger stores_add_owner after insert on public.stores for each row execute function public.add_store_owner();
insert into public.store_members (store_id, user_id, role, nick)
select s.id, s.user_id, 'owner', coalesce(p.nick, '') from public.stores s left join public.profiles p on p.id = s.user_id
on conflict do nothing;

create or replace function public.store_role(p_store uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.store_members where store_id = p_store and user_id = auth.uid();
$$;
create or replace function public.is_store_member(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_members where store_id = p_store and user_id = auth.uid());
$$;
revoke execute on function public.store_role(uuid) from public, anon;
revoke execute on function public.is_store_member(uuid) from public, anon;
grant execute on function public.store_role(uuid) to authenticated;
grant execute on function public.is_store_member(uuid) to authenticated;

-- ============ Rondas semanais ============
create table if not exists public.rounds (
  id uuid primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  week text not null,
  author text default '',
  checked jsonb not null default '{}',
  total int default 0,
  done_count int default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists rounds_store_week on public.rounds (store_id, week);
alter table public.rounds enable row level security;
alter table public.store_members enable row level security;

-- ============ Regras (RLS): acesso por participação na loja ============
drop policy if exists stores_all on public.stores;
drop policy if exists products_all on public.products;
drop policy if exists movements_all on public.movements;
drop policy if exists stores_select on public.stores;
drop policy if exists stores_insert on public.stores;
drop policy if exists stores_update on public.stores;
drop policy if exists stores_delete on public.stores;
drop policy if exists products_select on public.products;
drop policy if exists products_write on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;
drop policy if exists movements_select on public.movements;
drop policy if exists movements_insert on public.movements;
drop policy if exists movements_delete on public.movements;
drop policy if exists members_select on public.store_members;
drop policy if exists members_delete on public.store_members;
drop policy if exists members_update on public.store_members;
drop policy if exists rounds_select on public.rounds;
drop policy if exists rounds_insert on public.rounds;
drop policy if exists rounds_update on public.rounds;
drop policy if exists rounds_delete on public.rounds;

create policy stores_select on public.stores for select to authenticated using ((select public.is_store_member(id)) or (select public.is_admin()));
create policy stores_insert on public.stores for insert to authenticated with check (user_id = (select auth.uid()));
create policy stores_update on public.stores for update to authenticated
  using ((select public.store_role(id)) in ('owner', 'editor') or (select public.is_admin()))
  with check ((select public.store_role(id)) in ('owner', 'editor') or (select public.is_admin()));
create policy stores_delete on public.stores for delete to authenticated using ((select public.store_role(id)) = 'owner' or (select public.is_admin()));

create policy products_select on public.products for select to authenticated using ((select public.is_store_member(store_id)) or (select public.is_admin()));
create policy products_write on public.products for insert to authenticated with check ((select public.store_role(store_id)) in ('owner', 'editor') or (select public.is_admin()));
create policy products_update on public.products for update to authenticated
  using ((select public.store_role(store_id)) in ('owner', 'editor') or (select public.is_admin()))
  with check ((select public.store_role(store_id)) in ('owner', 'editor') or (select public.is_admin()));
create policy products_delete on public.products for delete to authenticated using ((select public.store_role(store_id)) in ('owner', 'editor') or (select public.is_admin()));

create policy movements_select on public.movements for select to authenticated
  using (user_id = (select auth.uid()) or (store_id is not null and (select public.is_store_member(store_id))) or (select public.is_admin()));
create policy movements_insert on public.movements for insert to authenticated with check (user_id = (select auth.uid()));
create policy movements_delete on public.movements for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy members_select on public.store_members for select to authenticated using ((select public.is_store_member(store_id)) or (select public.is_admin()));
create policy members_delete on public.store_members for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.store_role(store_id)) = 'owner' or (select public.is_admin()));
create policy members_update on public.store_members for update to authenticated
  using ((select public.store_role(store_id)) = 'owner' or (select public.is_admin()))
  with check ((select public.store_role(store_id)) = 'owner' or (select public.is_admin()));

create policy rounds_select on public.rounds for select to authenticated using ((select public.is_store_member(store_id)) or (select public.is_admin()));
create policy rounds_insert on public.rounds for insert to authenticated with check ((select public.is_store_member(store_id)) and user_id = (select auth.uid()));
create policy rounds_update on public.rounds for update to authenticated using ((select public.is_store_member(store_id))) with check ((select public.is_store_member(store_id)));
create policy rounds_delete on public.rounds for delete to authenticated using (user_id = (select auth.uid()) or (select public.store_role(store_id)) = 'owner');

-- ============ Convites ============
create or replace function public.create_invite(p_store uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_code text;
begin
  if coalesce(public.store_role(p_store), '') not in ('owner', 'editor') then raise exception 'Sem permissão para convidar'; end if;
  select invite_code into v_code from public.stores where id = p_store;
  if v_code is null then
    loop
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.stores where invite_code = v_code);
    end loop;
    update public.stores set invite_code = v_code where id = p_store;
  end if;
  return v_code;
end; $$;

create or replace function public.reset_invite(p_store uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.store_role(p_store), '') <> 'owner' then raise exception 'Só o dono pode trocar o código'; end if;
  update public.stores set invite_code = null where id = p_store;
  return public.create_invite(p_store);
end; $$;

create or replace function public.join_store(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare s public.stores;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para participar de uma loja'; end if;
  select * into s from public.stores where invite_code = upper(trim(p_code));
  if s.id is null then raise exception 'Código inválido'; end if;
  insert into public.store_members (store_id, user_id, role, nick)
  values (s.id, auth.uid(), 'editor', coalesce((select nick from public.profiles where id = auth.uid()), ''))
  on conflict (store_id, user_id) do nothing;
  return json_build_object('id', s.id, 'name', s.name);
end; $$;

create or replace function public.leave_store(p_store uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if public.store_role(p_store) = 'owner' then raise exception 'O dono não pode sair; exclua a loja'; end if;
  delete from public.store_members where store_id = p_store and user_id = auth.uid();
  return true;
end; $$;

revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.reset_invite(uuid) from public, anon;
revoke execute on function public.join_store(text) from public, anon;
revoke execute on function public.leave_store(uuid) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.reset_invite(uuid) to authenticated;
grant execute on function public.join_store(text) to authenticated;
grant execute on function public.leave_store(uuid) to authenticated;

-- ============ Tempo real ============
do $$
begin
  begin alter publication supabase_realtime add table public.products; exception when others then null; end;
  begin alter publication supabase_realtime add table public.stores; exception when others then null; end;
  begin alter publication supabase_realtime add table public.store_members; exception when others then null; end;
  begin alter publication supabase_realtime add table public.rounds; exception when others then null; end;
  begin alter publication supabase_realtime add table public.movements; exception when others then null; end;
end $$;
