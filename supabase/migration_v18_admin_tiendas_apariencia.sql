-- UNIKO-RD · v18 — El admin crea tiendas · Apariencia editable desde el panel
begin;

-- 1. El admin puede dar de alta tiendas sin dueño (antes solo owner_id = auth.uid()).
drop policy if exists "stores_insert" on public.stores;
create policy "stores_insert" on public.stores
  for insert to authenticated
  with check (owner_id = auth.uid() or coalesce(public.is_admin(), false));

-- 2. Apariencia global: tipografía y reglas «texto original → texto nuevo».
create table if not exists public.site_appearance (
  id text primary key default 'global' check (id = 'global'),
  font_family text not null default 'Montserrat',
  base_size integer not null default 16 check (base_size between 12 and 22),
  heading_weight integer not null default 700 check (heading_weight in (400, 500, 600, 700, 800, 900)),
  body_weight integer not null default 400 check (body_weight in (300, 400, 500, 600)),
  headings_uppercase boolean not null default false,
  replacements jsonb not null default '[]'::jsonb check (jsonb_typeof(replacements) = 'array'),
  updated_at timestamptz not null default now()
);
insert into public.site_appearance (id) values ('global') on conflict do nothing;

alter table public.site_appearance enable row level security;
drop policy if exists "site_appearance_select" on public.site_appearance;
create policy "site_appearance_select" on public.site_appearance
  for select to anon, authenticated using (true);
drop policy if exists "site_appearance_update" on public.site_appearance;
create policy "site_appearance_update" on public.site_appearance
  for update to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));
grant select on public.site_appearance to anon, authenticated;
grant update on public.site_appearance to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'site_appearance') then
    alter publication supabase_realtime add table public.site_appearance;
  end if;
end $$;

commit;
