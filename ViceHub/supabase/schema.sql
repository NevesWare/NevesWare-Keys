-- ViceHub — esquema do banco no Supabase.
-- Como usar: crie um projeto em supabase.com, abra SQL Editor, cole este arquivo e rode.
-- Depois copie a URL do projeto e a chave "anon" para app/src/main/assets/www/config.js.

-- ---------- perfis (um por conta) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  vh_id       text unique not null,                 -- ID público, ex.: VH-7K2Q9D
  nick        text unique not null check (char_length(nick) between 3 and 16),
  avatar_cor  text default '#ff3d8b',
  bio         text default '' check (char_length(bio) <= 140),
  criado_em   timestamptz default now()
);

-- cria o perfil automaticamente quando alguém se cadastra (nick vem do metadata do cadastro)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, vh_id, nick)
  values (
    new.id,
    'VH-' || upper(substr(md5(random()::text || new.id::text), 1, 6)),
    coalesce(new.raw_user_meta_data->>'nick', 'jogador_' || substr(new.id::text, 1, 6))
  );
  insert into public.user_data (user_id) values (new.id);
  return new;
end $$;

-- ---------- dados de cada conta (o app baixa ao entrar e envia quando muda) ----------
create table if not exists public.user_data (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  ajustes     jsonb default '{}'::jsonb,
  visitados   jsonb default '{}'::jsonb,
  salvos      jsonb default '{}'::jsonb,
  cartas      jsonb default '{}'::jsonb,
  garagem     jsonb default '{}'::jsonb,
  armas_fav   jsonb default '{}'::jsonb,
  atualizado  timestamptz default now()
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- marcadores próprios (carros lendários, cartas douradas...) ----------
create table if not exists public.markers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  cat         text not null,
  x           real not null,
  y           real not null,
  nota        text default '',
  foto_url    text default '',
  publico     boolean default false,               -- no futuro: compartilhar com a comunidade
  criado_em   timestamptz default now()
);

-- ---------- desenhos no mapa (traços, textos e ícones) ----------
create table if not exists public.drawings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  itens       jsonb not null default '[]'::jsonb,  -- a lista inteira de desenhos da pessoa
  atualizado  timestamptz default now()
);
create unique index if not exists drawings_user on public.drawings(user_id);

-- ---------- chat ----------
create table if not exists public.chat_rooms (
  id          text primary key,
  nome        text not null,
  descricao   text default ''
);
insert into public.chat_rooms (id, nome, descricao) values
  ('global', 'Chat global', 'Todo mundo do ViceHub'),
  ('vice', 'Vice City', 'Rolês, encontros e eventos na cidade'),
  ('ajuda', 'Ajuda e dicas', 'Dúvidas sobre missões, mapa e colecionáveis'),
  ('carros', 'Carros e garagens', 'Carros raros, customização e trocas'),
  ('glitches', 'Glitches', 'Bugs e truques que a galera achou')
on conflict (id) do nothing;

create table if not exists public.chat_messages (
  id          bigserial primary key,
  room_id     text not null references public.chat_rooms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  nick        text not null,
  vh_id       text not null,
  cor         text default '#2de2e6',
  texto       text not null check (char_length(texto) between 1 and 500),
  resposta_a  bigint references public.chat_messages(id) on delete set null,
  resposta_texto text,                               -- {"nick","t"} da mensagem respondida
  criado_em   timestamptz default now()
);
create index if not exists chat_room_time on public.chat_messages(room_id, criado_em desc);

-- ---------- segurança (RLS): cada um só mexe no que é seu ----------
alter table public.profiles      enable row level security;
alter table public.user_data     enable row level security;
alter table public.markers       enable row level security;
alter table public.drawings      enable row level security;
alter table public.chat_rooms    enable row level security;
alter table public.chat_messages enable row level security;

create policy "perfis visíveis para todos"   on public.profiles for select using (true);
create policy "edita o próprio perfil"        on public.profiles for update using (auth.uid() = id);

create policy "lê os próprios dados"          on public.user_data for select using (auth.uid() = user_id);
create policy "grava os próprios dados"       on public.user_data for insert with check (auth.uid() = user_id);
create policy "atualiza os próprios dados"    on public.user_data for update using (auth.uid() = user_id);

create policy "marcadores: dono ou públicos"  on public.markers for select using (auth.uid() = user_id or publico);
create policy "marcadores: cria os seus"      on public.markers for insert with check (auth.uid() = user_id);
create policy "marcadores: edita os seus"     on public.markers for update using (auth.uid() = user_id);
create policy "marcadores: apaga os seus"     on public.markers for delete using (auth.uid() = user_id);

create policy "desenhos: lê os seus"          on public.drawings for select using (auth.uid() = user_id);
create policy "desenhos: cria os seus"        on public.drawings for insert with check (auth.uid() = user_id);
create policy "desenhos: atualiza os seus"    on public.drawings for update using (auth.uid() = user_id);

create policy "salas visíveis"                on public.chat_rooms for select using (true);
create policy "mensagens visíveis logado"     on public.chat_messages for select using (auth.role() = 'authenticated');
create policy "envia como você mesmo"         on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "apaga as próprias mensagens"   on public.chat_messages for delete using (auth.uid() = user_id);

-- tempo real para o chat
alter publication supabase_realtime add table public.chat_messages;
