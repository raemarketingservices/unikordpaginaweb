-- UNIKO-RD · v17 — Ubicación exacta en el mapa
-- Tiendas y servicios guardan su punto (lat/lng) para el mapa de la home y
-- «Tiendas cerca de mí». Un servicio sin punto propio usa el de su tienda.
-- Las políticas de update existentes ya dejan al dueño (y al admin) cambiarlo.
begin;

alter table public.stores
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

alter table public.services
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

commit;
