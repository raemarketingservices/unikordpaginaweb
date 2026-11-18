-- UNIKO-RD · Datos DEMO para «Propiedades» (v19) y «Vehículos» (v20).
-- Van a nombre de la cuenta admin. Ids con prefijo `demo-`: se puede volver a correr
-- (on conflict do nothing) y se quitan todos con:
--   delete from public.properties where id like 'demo-%';
--   delete from public.vehicles   where id like 'demo-%';
--   delete from public.property_agents where nombre like '%(demo)';
--   delete from public.vehicle_providers where nombre like '%(demo)';
-- Fotos: Unsplash (licencia libre). Teléfono 809-555-0100: número ficticio.
begin;

create temp table demo_admin on commit drop as
  select id from public.profiles where role = 'admin' order by created_at limit 1;

insert into public.property_agents (id, tipo, nombre, telefono, whatsapp, descripcion, provincia)
select id, 'inmobiliaria', 'Uniko Bienes Raíces (demo)', '809-555-0100', '809-555-0100',
       'Propiedades de demostración del módulo inmobiliario de UNIKO-RD.', 'Distrito Nacional'
from demo_admin on conflict (id) do nothing;

insert into public.vehicle_providers (id, tipo, nombre, telefono, whatsapp, descripcion, provincia)
select id, 'rentacar', 'Uniko Rent-A-Car (demo)', '809-555-0100', '809-555-0100',
       'Vehículos de demostración. Requisitos: licencia vigente, mayor de 23 años y tarjeta de crédito.',
       'Distrito Nacional'
from demo_admin on conflict (id) do nothing;

-- u(x): URL de Unsplash a 1600 px.
create temp table u on commit drop as select 'https://images.unsplash.com/photo-' as pre, '?w=1600&q=75&auto=format&fit=crop' as suf;

insert into public.properties
  (id, agent_id, titulo, operacion, tipo, precio, moneda, periodo, habitaciones, banos, parqueos, metros,
   provincia, sector, descripcion, fotos, amenidades, lat, lng)
select v.id, a.id, v.titulo, v.operacion, v.tipo, v.precio, v.moneda, v.periodo, v.hab, v.banos, v.parq, v.m2,
       v.prov, v.sector, v.descr,
       array(select u.pre || t.f || u.suf from u, unnest(v.fotos) with ordinality t(f, n) order by t.n), v.amen, v.lat, v.lng
from demo_admin a, (values
  ('demo-villa-punta-cana', 'Villa con piscina a 5 minutos de la playa', 'venta', 'villa', 850000, 'USD', null, 4, 4.5, 3, 420,
   'La Altagracia', 'Punta Cana', 'Villa tropical totalmente amueblada, piscina privada, terraza techada y área de BBQ. Ideal para vivir o renta vacacional.',
   array['1564013799919-ab600027ffc6','1512917774080-9991f1c4c750','1505693416388-ac5ce068fe85'],
   array['Piscina','Aire acondicionado','Amueblado','Terraza','Seguridad 24/7','Planta eléctrica'], 18.5601, -68.3725),
  ('demo-casa-cerros-gurabo', 'Casa moderna con piscina en Cerros de Gurabo', 'venta', 'casa', 24500000, 'DOP', null, 3, 3.5, 2, 310,
   'Santiago', 'Cerros de Gurabo', 'Diseño contemporáneo, doble altura, cocina abierta y piscina. Residencial cerrado con seguridad.',
   array['1580587771525-78b9dba3b914','1560448204-e02f11c3d0e2'],
   array['Piscina','Patio','Seguridad 24/7','Aire acondicionado'], 19.4790, -70.6650),
  ('demo-villa-juan-dolio', 'Villa frente al mar en Juan Dolio', 'alquiler_temporal', 'villa', 280, 'USD', 'noche', 5, 5, 4, 500,
   'San Pedro de Macorís', 'Juan Dolio', 'Villa de lujo para vacaciones: piscina infinita, vista al mar y personal de limpieza incluido.',
   array['1600596542815-ffad4c1539a9','1613490493576-7fde63acd811','1505693416388-ac5ce068fe85'],
   array['Piscina','Vista al mar','Wi-Fi','Aire acondicionado','Amueblado'], 18.4290, -69.4250),
  ('demo-cabana-jarabacoa', 'Cabaña de montaña en Jarabacoa', 'alquiler_temporal', 'casa', 6500, 'DOP', 'noche', 2, 2, 2, 140,
   'La Vega', 'Jarabacoa', 'Cabaña de madera rodeada de pinos, chimenea y vista a las montañas. A 10 minutos del centro.',
   array['1568605114967-8130f3a36994','1502672260266-1c1ef2d93688'],
   array['Wi-Fi','Terraza','Admite mascotas','Amueblado'], 19.1170, -70.6360),
  ('demo-apto-piantini', 'Apartamento amueblado en Piantini', 'alquiler', 'apartamento', 1800, 'USD', 'mes', 2, 2, 2, 120,
   'Distrito Nacional', 'Piantini', 'Apartamento en torre con gimnasio y ascensor, cerca de Blue Mall y Ágora. Listo para mudarse.',
   array['1522708323590-d24dbb6b0267','1505693416388-ac5ce068fe85'],
   array['Amueblado','Aire acondicionado','Ascensor','Gimnasio','Planta eléctrica','Seguridad 24/7'], 18.4710, -69.9390),
  ('demo-apto-naco', 'Apartamento de 3 habitaciones en Naco', 'venta', 'apartamento', 9800000, 'DOP', null, 3, 2.5, 2, 165,
   'Distrito Nacional', 'Naco', 'Amplio, luminoso, con balcón y cuarto de servicio. Edificio con planta full y ascensor.',
   array['1560448204-e02f11c3d0e2','1493809842364-78817add7ffb'],
   array['Ascensor','Planta eléctrica','Terraza'], 18.4790, -69.9230),
  ('demo-estudio-zona-colonial', 'Estudio colonial para estadías cortas', 'alquiler_temporal', 'apartamento', 3500, 'DOP', 'noche', 1, 1, 0, 55,
   'Distrito Nacional', 'Zona Colonial', 'Estudio acogedor a pasos de la Calle El Conde, ideal para turistas. Check-in flexible.',
   array['1502672260266-1c1ef2d93688','1505693416388-ac5ce068fe85'],
   array['Wi-Fi','Aire acondicionado','Amueblado'], 18.4740, -69.8840)
) as v(id, titulo, operacion, tipo, precio, moneda, periodo, hab, banos, parq, m2, prov, sector, descr, fotos, amen, lat, lng)
on conflict (id) do nothing;

insert into public.vehicles
  (id, provider_id, marca, modelo, anio, color, tipo, transmision, combustible, pasajeros, puertas, kilometraje,
   tarifa_dia, moneda, deposito, provincia, descripcion, fotos, extras, lat, lng)
select v.id, a.id, v.marca, v.modelo, v.anio, v.color, v.tipo, v.trans, v.comb, v.pas, v.puertas, v.km,
       v.tarifa, v.moneda, v.dep, v.prov, v.descr,
       array(select u.pre || t.f || u.suf from u, unnest(v.fotos) with ordinality t(f, n) order by t.n), v.extras, v.lat, v.lng
from demo_admin a, (values
  ('demo-hyundai-accent-2022', 'Hyundai', 'Accent', 2022, 'Negro', 'sedan', 'automatica', 'gasolina', 5, 4, 38000, 2800, 'DOP', 15000,
   'Distrito Nacional', 'Económico y cómodo para la ciudad. Se entrega con el tanque lleno y se devuelve igual.',
   array['1619767886558-efdc259cde1a'], array['Aire acondicionado','Bluetooth','Cámara de reversa','Seguro incluido'], 18.4720, -69.9300),
  ('demo-vw-polo-2021', 'Volkswagen', 'Polo', 2021, 'Azul', 'compacto', 'manual', 'gasolina', 5, 4, 52000, 2500, 'DOP', 12000,
   'Santiago', 'Compacto ideal para moverse por Santiago. Consumo muy bajo.',
   array['1541899481282-d53bffe3c35d'], array['Aire acondicionado','Bluetooth','Kilometraje ilimitado'], 19.4510, -70.6970),
  ('demo-fiat-500-2020', 'Fiat', '500', 2020, 'Azul cielo', 'compacto', 'automatica', 'gasolina', 4, 2, 41000, 2200, 'DOP', 10000,
   'Distrito Nacional', 'Pequeño y fácil de parquear en la Zona Colonial.',
   array['1549317661-bd32c8ce0db2'], array['Aire acondicionado','Bluetooth'], 18.4740, -69.8840),
  ('demo-nissan-juke-2021', 'Nissan', 'Juke', 2021, 'Gris', 'jeepeta', 'automatica', 'gasolina', 5, 4, 33000, 3200, 'DOP', 15000,
   'La Vega', 'Jeepeta compacta perfecta para subir a Jarabacoa y Constanza.',
   array['1609521263047-f8f205293f24'], array['Aire acondicionado','Bluetooth','Apple CarPlay / Android Auto','Cámara de reversa'], 19.2220, -70.5290),
  ('demo-ford-expedition-2021', 'Ford', 'Expedition', 2021, 'Blanco', 'jeepeta', 'automatica', 'gasolina', 7, 4, 46000, 110, 'USD', 500,
   'La Altagracia', 'Jeepeta de 7 pasajeros, ideal para familias. Recogida y entrega en el aeropuerto de Punta Cana.',
   array['1533473359331-0135ef1b58bf'], array['Aire acondicionado','GPS','Recogida en aeropuerto','Silla para niños','Seguro incluido'], 18.5670, -68.3630),
  ('demo-mercedes-glc-2022', 'Mercedes-Benz', 'GLC 300', 2022, 'Blanco', 'jeepeta', 'automatica', 'gasolina', 5, 4, 21000, 140, 'USD', 800,
   'Distrito Nacional', 'Jeepeta de lujo para ejecutivos y eventos. Chofer disponible bajo pedido.',
   array['1590362891991-f776e747a588'], array['Aire acondicionado','GPS','Apple CarPlay / Android Auto','Entrega a domicilio','Seguro incluido'], 18.4710, -69.9390),
  ('demo-audi-a6-2020', 'Audi', 'A6 Avant', 2020, 'Negro', 'sedan', 'automatica', 'diesel', 5, 4, 58000, 120, 'USD', 700,
   'Santiago', 'Sedán familiar premium, amplio baúl para viajes largos.',
   array['1606664515524-ed2f786a0bd6'], array['Aire acondicionado','GPS','Bluetooth','Kilometraje ilimitado'], 19.4790, -70.6650),
  ('demo-ford-mustang-2020', 'Ford', 'Mustang GT', 2020, 'Negro', 'deportivo', 'automatica', 'gasolina', 4, 2, 27000, 150, 'USD', 1000,
   'Puerto Plata', 'Para un fin de semana inolvidable por la costa norte. Edad mínima 25 años.',
   array['1494976388531-d1058494cdd8'], array['Aire acondicionado','Bluetooth','Seguro incluido'], 19.7934, -70.6884),
  ('demo-harley-sportster-2019', 'Harley-Davidson', 'Sportster', 2019, 'Negro', 'motor', 'manual', 'gasolina', 2, 0, 15000, 4500, 'DOP', 20000,
   'Puerto Plata', 'Motor de paseo con casco incluido. Requiere licencia de motor.',
   array['1558981806-ec527fa84c39'], array['Kilometraje ilimitado'], 19.7900, -70.6900)
) as v(id, marca, modelo, anio, color, tipo, trans, comb, pas, puertas, km, tarifa, moneda, dep, prov, descr, fotos, extras, lat, lng)
on conflict (id) do nothing;

commit;
