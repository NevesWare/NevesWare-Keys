-- RS Stock W — migração 003: catálogo de produtos por código de barras
-- Cada código lido uma vez (Open Food Facts, Cosmos ou digitado por alguém) fica guardado
-- aqui e passa a ser preenchido na hora para todos os usuários. Não apaga dados.

create table if not exists public.catalog (
  barcode text primary key check (barcode ~ '^[0-9]{6,14}$'),
  name text not null check (char_length(name) between 1 and 160),
  brand text default '',
  size text default '',          -- gramatura/volume como na embalagem: "1 L", "500 g"
  size_value numeric,            -- 1, 500…
  size_unit text default '',     -- L, ml, kg, g, un
  category text default '',
  image_url text default '',
  source text not null default 'user' check (source in ('off', 'cosmos', 'user')),
  created_by uuid references auth.users (id) on delete set null,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalog enable row level security;

drop policy if exists catalog_read on public.catalog;
create policy catalog_read on public.catalog for select to anon, authenticated using (true);
-- escrita só pela função do servidor (chave de serviço) ou pela RPC abaixo

-- Contribuição de quem está logado: cadastra um código novo ou corrige um que veio de usuário.
-- Nunca sobrescreve dados oficiais (Open Food Facts / Cosmos).
create or replace function public.catalog_contribute(p_barcode text, p_name text, p_brand text default '', p_size text default '', p_category text default '')
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if p_barcode !~ '^[0-9]{6,14}$' or coalesce(trim(p_name), '') = '' then return false; end if;
  insert into public.catalog (barcode, name, brand, size, category, source, created_by)
  values (p_barcode, left(trim(p_name), 160), left(coalesce(p_brand, ''), 80), left(coalesce(p_size, ''), 30), left(coalesce(p_category, ''), 40), 'user', auth.uid())
  on conflict (barcode) do update
    set name = excluded.name, brand = excluded.brand, size = excluded.size, category = excluded.category, updated_at = now()
    where public.catalog.source = 'user';
  return true;
end; $$;
revoke execute on function public.catalog_contribute(text, text, text, text, text) from public, anon;
grant execute on function public.catalog_contribute(text, text, text, text, text) to authenticated;
