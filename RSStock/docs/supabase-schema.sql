-- RS Stock — esquema sugerido para o Supabase (ativar quando as contas forem lançadas)
-- Os campos espelham o modelo VS.Product em app/src/main/assets/www/js/services/storage.js

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text unique not null check (char_length(nick) between 3 and 24),
  name text default '',
  store text default '',
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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
create index if not exists products_user_expiry on public.products (user_id, expiry);

alter table public.profiles enable row level security;
alter table public.products enable row level security;

create policy "perfil próprio" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "produtos próprios" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Login por nick: buscar o e-mail a partir do nick (função segura)
create or replace function public.email_for_nick(p_nick text) returns text
language sql security definer set search_path = public as $$
  select u.email from auth.users u join public.profiles p on p.id = u.id where lower(p.nick) = lower(p_nick) limit 1;
$$;
