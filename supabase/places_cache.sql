-- Execute no SQL Editor do Supabase (Dashboard) uma vez.
create table if not exists public.places_cache (
  id text primary key,
  results jsonb not null,
  timestamp bigint not null
);

alter table public.places_cache enable row level security;

drop policy if exists "places_cache_all_anon" on public.places_cache;

-- Cache público só nesta tabela (chave anon no Node). Com SUPABASE_SERVICE_ROLE_KEY no .env, o RLS é ignorado.
create policy "places_cache_all_anon"
  on public.places_cache
  for all
  to anon
  using (true)
  with check (true);
