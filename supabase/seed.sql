-- ============================================================
-- UNIKO-RD · Seed de datos (categorías, tiendas, productos,
-- servicios y bloques de la home)
-- Ejecutar DESPUÉS de schema.sql:
--   docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f - < seed.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Categorías (desde src/data/marketplace.ts)
-- ------------------------------------------------------------
insert into public.categories (id, name, icon, tipo, position) values
  ('tecnologia', 'Tecnología', 'Smartphone', 'producto', 1),
  ('hogar', 'Hogar', 'Home', 'ambos', 2),
  ('bienestar', 'Bienestar', 'HeartPulse', 'ambos', 3),
  ('moda', 'Moda', 'Shirt', 'producto', 4),
  ('autos', 'Autos', 'Car', 'ambos', 5),
  ('belleza', 'Belleza', 'Sparkles', 'ambos', 6),
  ('supermercado', 'Supermercado', 'ShoppingBasket', 'producto', 7),
  ('servicios', 'Servicios', 'Wrench', 'servicio', 8),
  ('deportes', 'Deportes', 'Dumbbell', 'producto', 9),
  ('electrodomesticos', 'Electrodomésticos', 'WashingMachine', 'producto', 10),
  ('mascotas', 'Mascotas', 'PawPrint', 'ambos', 11),
  ('construccion', 'Construcción', 'HardHat', 'ambos', 12),
  ('restaurantes', 'Restaurantes / Comida', 'UtensilsCrossed', 'ambos', 13),
  ('profesionales', 'Profesionales', 'Briefcase', 'servicio', 14),
  ('educacion', 'Educación', 'GraduationCap', 'servicio', 15),
  ('eventos', 'Eventos', 'PartyPopper', 'servicio', 16),
  ('otros', 'Otros', 'MoreHorizontal', 'ambos', 17)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Tiendas (las 4 destacadas + tiendas dueñas de productos seed)
-- ------------------------------------------------------------
insert into public.stores
  (id, owner_id, name, category, location, verified, featured, rating, reviews, followers, products_count, logo, cover)
values
  ('tech-store-rd', null, 'Tech Store RD', 'Tecnología', 'Santiago', true, true, 4.9, 512, 3200, 148,
   'https://images.unsplash.com/photo-1516534775068-ba3e7458af70?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=70'),
  ('casa-bella-rd', null, 'Casa Bella RD', 'Hogar', 'Puerto Plata', true, true, 4.8, 231, 1450, 96,
   'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=70'),
  ('bella-natural-rd', null, 'Bella Natural RD', 'Belleza', 'Distrito Nacional', true, true, 4.9, 187, 2100, 74,
   'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=70'),
  ('supermercado-cibao', null, 'Supermercado Cibao', 'Supermercado', 'La Vega', true, true, 4.6, 402, 5300, 620,
   'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1601599963565-b7ba29c8e2ff?auto=format&fit=crop&w=800&q=70'),
  ('compu-center-sd', null, 'Compu Center SD', 'Tecnología', 'Distrito Nacional', true, false, 4.7, 64, 890, 35,
   'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=70'),
  ('hogar-total-rd', null, 'Hogar Total RD', 'Electrodomésticos', 'Santo Domingo Este', true, false, 4.6, 92, 640, 58,
   'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=70'),
  ('urban-style-rd', null, 'Urban Style RD', 'Moda', 'La Vega', false, false, 4.5, 41, 510, 47,
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=70'),
  ('deportes-rd', null, 'Deportes RD', 'Deportes', 'San Cristóbal', false, false, 4.4, 33, 320, 29,
   'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=70',
   'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=70')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Productos
-- ------------------------------------------------------------
insert into public.products
  (id, store_id, title, category, price, compare_at_price, verified, rating, reviews, location, shipping, image, featured, best_seller, is_new)
values
  ('iphone-16-pro-max', 'tech-store-rd', 'iPhone 16 Pro Max 256GB', 'tecnologia', 74900, 82000, true, 4.9, 128, 'Santiago', true,
   'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=70', true, true, false),
  ('laptop-gamer', 'compu-center-sd', 'Laptop Gamer 16" RTX 4060 · 16GB RAM', 'tecnologia', 68500, 75900, true, 4.7, 64, 'Distrito Nacional', true,
   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=70', true, false, false),
  ('aire-inverter', 'hogar-total-rd', 'Aire acondicionado Inverter 12,000 BTU', 'electrodomesticos', 27500, 32000, true, 4.6, 92, 'Santo Domingo Este', true,
   'https://images.unsplash.com/photo-1631545806609-cf39e3d06cd3?auto=format&fit=crop&w=800&q=70', true, false, false),
  ('tenis-running', 'urban-style-rd', 'Tenis deportivos para correr', 'moda', 4900, 6500, false, 4.5, 41, 'La Vega', true,
   'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=70', false, true, false),
  ('set-cocina', 'casa-bella-rd', 'Set de ollas antiadherentes 10 piezas', 'hogar', 8900, null, true, 4.8, 57, 'Puerto Plata', true,
   'https://images.unsplash.com/photo-1584990347449-a2d4c2c9ba0b?auto=format&fit=crop&w=800&q=70', false, false, true),
  ('smart-tv', 'tech-store-rd', 'Smart TV 55" 4K UHD', 'tecnologia', 24900, 29900, true, 4.7, 210, 'Santiago', true,
   'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=70', false, true, false),
  ('kit-belleza', 'bella-natural-rd', 'Kit de cuidado facial natural', 'belleza', 3200, null, true, 4.9, 76, 'Distrito Nacional', true,
   'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=70', false, false, true),
  ('bicicleta-mtb', 'deportes-rd', 'Bicicleta MTB 29" aluminio', 'deportes', 19900, 23500, false, 4.4, 33, 'San Cristóbal', false,
   'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=70', false, false, false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Servicios
-- ------------------------------------------------------------
insert into public.services
  (id, owner_id, store_id, title, category, price_from, provider, verified, rating, reviews, location, coverage, image, recommended)
values
  ('diseno-web', null, null, 'Diseño de páginas web', 'profesionales', 15000, 'RAE Marketing Services', true, 4.9, 37, 'Santiago', 'Disponible en toda RD',
   'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=70', true),
  ('plomeria', null, null, 'Plomería residencial y comercial', 'construccion', 2500, 'Plomería Peña', true, 4.8, 122, 'Distrito Nacional', 'Gran Santo Domingo',
   'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=70', true),
  ('electricidad', null, null, 'Instalaciones eléctricas certificadas', 'construccion', 3000, 'ElectroSoluciones RD', true, 4.7, 88, 'Santo Domingo Norte', 'Gran Santo Domingo y Este',
   'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=70', false),
  ('barberia', null, null, 'Barbería a domicilio', 'belleza', 800, 'Estilo Barber RD', false, 4.9, 154, 'Santiago', 'Santiago y Cibao',
   'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=70', true),
  ('fotografia', null, null, 'Fotografía de eventos y bodas', 'eventos', 12000, 'Luz Caribe Studio', true, 5, 46, 'La Altagracia', 'Disponible en toda RD',
   'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=70', false),
  ('reparacion-celulares', null, null, 'Reparación de celulares y tablets', 'tecnologia', 1200, 'MovilFix RD', true, 4.6, 201, 'La Vega', 'La Vega y Cibao Central',
   'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=70', false),
  ('mudanzas', null, null, 'Mudanzas y transporte de carga', 'otros', 4500, 'Mudanzas Quisqueya', true, 4.5, 67, 'Santo Domingo', 'Nacional',
   'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=800&q=70', false),
  ('tutorias', null, null, 'Tutorías de matemáticas e inglés', 'educacion', 900, 'Academia Aprende+', false, 4.8, 52, 'Distrito Nacional', 'Presencial y virtual',
   'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=70', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Bloques de la home (orden = secciones actuales del index.tsx)
-- ------------------------------------------------------------
insert into public.page_blocks (page, type, title, subtitle, position, enabled, config) values
  ('home', 'hero',
   E'Todo lo que buscas.\nEn un solo lugar.',
   'Compra productos, descubre negocios dominicanos y encuentra profesionales para todo lo que necesitas.',
   1, true,
   '{
      "eyebrow": "Marketplace Dominicano",
      "image": "",
      "buttons": [
        {"label": "Explorar productos", "to": "/productos", "style": "brand"},
        {"label": "Explorar servicios", "to": "/servicios", "style": "primary"},
        {"label": "Empieza a vender", "to": "/vender", "style": "outline"}
      ],
      "stats": [
        {"k": "+12,000", "v": "Productos publicados"},
        {"k": "+2,500", "v": "Servicios y profesionales"},
        {"k": "32", "v": "Provincias con cobertura"}
      ]
    }'::jsonb),

  ('home', 'trust_bar', null, null, 2, true,
   '{
      "items": [
        {"icon": "ShieldCheck", "text": "Compras seguras"},
        {"icon": "Store", "text": "Vendedores confiables"},
        {"icon": "Lock", "text": "Pagos protegidos"},
        {"icon": "Truck", "text": "Envíos a todo el país"}
      ]
    }'::jsonb),

  ('home', 'categories',
   'Categorías populares',
   'Más productos. Más oportunidades. Un mismo lugar.',
   3, true,
   '{"limit": 12, "link": {"to": "/categorias", "label": "Ver todas"}}'::jsonb),

  ('home', 'product_section',
   'Ofertas destacadas',
   'Descuentos activos de tiendas verificadas',
   4, true,
   '{"filter": "offers", "limit": 4, "fondo": false, "link": {"to": "/ofertas", "label": "Ver ofertas"}}'::jsonb),

  ('home', 'service_section',
   'Servicios cerca de ti',
   'Profesionales y técnicos disponibles en tu provincia',
   5, true,
   '{"filter": "all", "limit": 4, "fondo": true, "link": {"to": "/servicios", "label": "Ver servicios"}}'::jsonb),

  ('home', 'product_section',
   'Productos para ti',
   'Seleccionados según lo más buscado en RD',
   6, true,
   '{"filter": "all", "limit": 4, "fondo": false, "link": {"to": "/productos", "label": "Ver productos"}}'::jsonb),

  ('home', 'store_section',
   'Tiendas destacadas',
   'Negocios dominicanos con buena reputación',
   7, true,
   '{"filter": "featured", "limit": 4, "fondo": true, "link": {"to": "/tiendas", "label": "Ver tiendas"}}'::jsonb),

  ('home', 'service_section',
   'Profesionales recomendados',
   'Proveedores con mejores calificaciones',
   8, true,
   '{"filter": "recommended", "limit": 4, "fondo": false, "link": {"to": "/servicios", "label": "Ver profesionales"}}'::jsonb),

  ('home', 'cta_banners', null, null, 9, true,
   '{
      "banners": [
        {
          "icon": "Store",
          "title": "¿Tienes un negocio?",
          "text": "Abre tu tienda en UNIKO-RD y llega a clientes de todo el país.",
          "button_label": "Crear mi tienda",
          "to": "/vender",
          "color": "primary"
        },
        {
          "icon": "Briefcase",
          "title": "¿Ofreces un servicio?",
          "text": "Convierte tus habilidades en oportunidades.",
          "button_label": "Publicar mi servicio",
          "to": "/vender",
          "color": "brand"
        }
      ]
    }'::jsonb),

  ('home', 'product_section',
   'Lo más vendido',
   'Los favoritos de los dominicanos',
   10, true,
   '{"filter": "best_seller", "limit": 4, "fondo": true, "link": {"to": "/productos", "label": "Ver productos"}}'::jsonb),

  ('home', 'product_section',
   'Nuevos en UNIKO-RD',
   'Recién publicados por nuestros vendedores',
   11, true,
   '{"filter": "is_new", "limit": 4, "fondo": false, "link": {"to": "/productos", "label": "Ver productos"}}'::jsonb);

commit;

notify pgrst, 'reload schema';

select
  (select count(*) from public.categories)  as categorias,
  (select count(*) from public.stores)      as tiendas,
  (select count(*) from public.products)    as productos,
  (select count(*) from public.services)    as servicios,
  (select count(*) from public.page_blocks) as bloques;
