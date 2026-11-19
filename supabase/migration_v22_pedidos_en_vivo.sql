-- UNIKO-RD · v22 — Avisos de pedidos nuevos en vivo (sustituye al aviso por WhatsApp,
-- que sin plantillas aprobadas no llega). Realtime respeta RLS: cada vendedor solo recibe
-- los pedidos de sus tiendas (store_ids) y el admin todos.
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'purchase_requests') then
    alter publication supabase_realtime add table public.purchase_requests;
  end if;
end $$;
