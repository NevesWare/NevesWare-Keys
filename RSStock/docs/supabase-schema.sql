-- RS Stock — esquema para o Supabase (multi-loja)
-- Espelha os modelos de js/services/storage.js: RS.Store, RS.Product e o histórico (movements).
-- Cada conta (auth.users) tem suas lojas; cada loja tem seu estoque; tudo que é feito vira uma movimentação.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text unique not null check (char_length(nick) between 3 and 24),
  name text default '',
  created_at timestamptz default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text default '',
  color text default '#7c5cff',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  barcode text default '',
  category text default '',
  quantity numeric default 1,
  unit text default 'un',
  expiry date not null,
  batch text default '',
  location text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists products_store_expiry on public.products (store_id, expiry);

-- Histórico / log: cadastro, edição, baixa, entrada, remoção e ações de loja
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  store_name text default '',
  product_name text not null,
  type text not null check (type in ('add','edit','remove','in','out','store-add','store-edit','store-remove')),
  detail text default '',
  author text default '',
  created_at timestamptz default now()
);
create index if not exists movements_store_time on public.movements (store_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;

create policy "perfil próprio" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "lojas próprias" on public.stores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "produtos próprios" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "movimentações próprias" on public.movements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Login por nick: devolve o e-mail ligado ao nick
create or replace function public.email_for_nick(p_nick text) returns text
language sql security definer set search_path = public as $$
  select u.email from auth.users u join public.profiles p on p.id = u.id where lower(p.nick) = lower(p_nick) limit 1;
$$;
