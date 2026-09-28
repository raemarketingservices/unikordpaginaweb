export type Categoria = {
  slug: string;
  nombre: string;
  icono: string;
  tipo: "producto" | "servicio" | "ambos";
};

export const categorias: Categoria[] = [
  { slug: "tecnologia", nombre: "Tecnología", icono: "Smartphone", tipo: "producto" },
  { slug: "hogar", nombre: "Hogar", icono: "Home", tipo: "ambos" },
  { slug: "bienestar", nombre: "Bienestar", icono: "HeartPulse", tipo: "ambos" },
  { slug: "moda", nombre: "Moda", icono: "Shirt", tipo: "producto" },
  { slug: "autos", nombre: "Autos", icono: "Car", tipo: "ambos" },
  { slug: "belleza", nombre: "Belleza", icono: "Sparkles", tipo: "ambos" },
  { slug: "supermercado", nombre: "Supermercado", icono: "ShoppingBasket", tipo: "producto" },
  { slug: "servicios", nombre: "Servicios", icono: "Wrench", tipo: "servicio" },
  { slug: "deportes", nombre: "Deportes", icono: "Dumbbell", tipo: "producto" },
  {
    slug: "electrodomesticos",
    nombre: "Electrodomésticos",
    icono: "WashingMachine",
    tipo: "producto",
  },
  { slug: "mascotas", nombre: "Mascotas", icono: "PawPrint", tipo: "ambos" },
  { slug: "construccion", nombre: "Construcción", icono: "HardHat", tipo: "ambos" },
  {
    slug: "restaurantes",
    nombre: "Restaurantes / Comida",
    icono: "UtensilsCrossed",
    tipo: "ambos",
  },
  { slug: "profesionales", nombre: "Profesionales", icono: "Briefcase", tipo: "servicio" },
  { slug: "educacion", nombre: "Educación", icono: "GraduationCap", tipo: "servicio" },
  { slug: "eventos", nombre: "Eventos", icono: "PartyPopper", tipo: "servicio" },
  { slug: "otros", nombre: "Otros", icono: "MoreHorizontal", tipo: "ambos" },
];

export const provincias = [
  "Distrito Nacional",
  "Santo Domingo",
  "Santiago",
  "La Vega",
  "Puerto Plata",
  "San Cristóbal",
  "La Romana",
  "San Pedro de Macorís",
  "Duarte",
  "Espaillat",
  "La Altagracia",
  "Azua",
  "Barahona",
  "Monseñor Nouel",
  "Peravia",
  "Sánchez Ramírez",
  "Valverde",
  "María Trinidad Sánchez",
  "Samaná",
  "Hermanas Mirabal",
];

export type Producto = {
  id: string;
  titulo: string;
  categoria: string;
  precio: number;
  precioAnterior?: number;
  tienda: string;
  tiendaId?: string;
  sku?: string;
  descripcion?: string;
  galeria?: string[];
  videos?: string[];
  verificado: boolean;
  rating: number;
  resenas: number;
  ubicacion: string;
  envioNacional: boolean;
  imagen: string;
  destacado?: boolean;
  masVendido?: boolean;
  nuevo?: boolean;
};

const img = (q: string) => `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=70`;

export const productos: Producto[] = [
  {
    id: "iphone-16-pro-max",
    titulo: "iPhone 16 Pro Max 256GB",
    categoria: "tecnologia",
    precio: 74900,
    precioAnterior: 82000,
    tienda: "Tech Store RD",
    verificado: true,
    rating: 4.9,
    resenas: 128,
    ubicacion: "Santiago",
    envioNacional: true,
    imagen: img("photo-1592750475338-74b7b21085ab"),
    destacado: true,
    masVendido: true,
  },
  {
    id: "laptop-gamer",
    titulo: 'Laptop Gamer 16" RTX 4060 · 16GB RAM',
    categoria: "tecnologia",
    precio: 68500,
    precioAnterior: 75900,
    tienda: "Compu Center SD",
    verificado: true,
    rating: 4.7,
    resenas: 64,
    ubicacion: "Distrito Nacional",
    envioNacional: true,
    imagen: img("photo-1496181133206-80ce9b88a853"),
    destacado: true,
  },
  {
    id: "aire-inverter",
    titulo: "Aire acondicionado Inverter 12,000 BTU",
    categoria: "electrodomesticos",
    precio: 27500,
    precioAnterior: 32000,
    tienda: "Hogar Total RD",
    verificado: true,
    rating: 4.6,
    resenas: 92,
    ubicacion: "Santo Domingo Este",
    envioNacional: true,
    imagen: img("photo-1631545806609-cf39e3d06cd3"),
    destacado: true,
  },
  {
    id: "tenis-running",
    titulo: "Tenis deportivos para correr",
    categoria: "moda",
    precio: 4900,
    precioAnterior: 6500,
    tienda: "Urban Style RD",
    verificado: false,
    rating: 4.5,
    resenas: 41,
    ubicacion: "La Vega",
    envioNacional: true,
    imagen: img("photo-1542291026-7eec264c27ff"),
    masVendido: true,
  },
  {
    id: "set-cocina",
    titulo: "Set de ollas antiadherentes 10 piezas",
    categoria: "hogar",
    precio: 8900,
    tienda: "Casa Bella RD",
    verificado: true,
    rating: 4.8,
    resenas: 57,
    ubicacion: "Puerto Plata",
    envioNacional: true,
    imagen: img("photo-1584990347449-a2d4c2c9ba0b"),
    nuevo: true,
  },
  {
    id: "smart-tv",
    titulo: 'Smart TV 55" 4K UHD',
    categoria: "tecnologia",
    precio: 24900,
    precioAnterior: 29900,
    tienda: "Tech Store RD",
    verificado: true,
    rating: 4.7,
    resenas: 210,
    ubicacion: "Santiago",
    envioNacional: true,
    imagen: img("photo-1593359677879-a4bb92f829d1"),
    masVendido: true,
  },
  {
    id: "kit-belleza",
    titulo: "Kit de cuidado facial natural",
    categoria: "belleza",
    precio: 3200,
    tienda: "Bella Natural RD",
    verificado: true,
    rating: 4.9,
    resenas: 76,
    ubicacion: "Distrito Nacional",
    envioNacional: true,
    imagen: img("photo-1596755094514-f87e34085b2c"),
    nuevo: true,
  },
  {
    id: "bicicleta-mtb",
    titulo: 'Bicicleta MTB 29" aluminio',
    categoria: "deportes",
    precio: 19900,
    precioAnterior: 23500,
    tienda: "Deportes RD",
    verificado: false,
    rating: 4.4,
    resenas: 33,
    ubicacion: "San Cristóbal",
    envioNacional: false,
    imagen: img("photo-1485965120184-e220f721d03e"),
  },
];

export type Servicio = {
  id: string;
  titulo: string;
  categoria: string;
  desde: number;
  proveedor: string;
  verificado: boolean;
  rating: number;
  resenas: number;
  ubicacion: string;
  cobertura: string;
  imagen: string;
  recomendado?: boolean;
};

export const servicios: Servicio[] = [
  {
    id: "diseno-web",
    titulo: "Diseño de páginas web",
    categoria: "profesionales",
    desde: 15000,
    proveedor: "RAE Marketing Services",
    verificado: true,
    rating: 4.9,
    resenas: 37,
    ubicacion: "Santiago",
    cobertura: "Disponible en toda RD",
    imagen: img("photo-1581291518857-4e27b48ff24e"),
    recomendado: true,
  },
  {
    id: "plomeria",
    titulo: "Plomería residencial y comercial",
    categoria: "construccion",
    desde: 2500,
    proveedor: "Plomería Peña",
    verificado: true,
    rating: 4.8,
    resenas: 122,
    ubicacion: "Distrito Nacional",
    cobertura: "Gran Santo Domingo",
    imagen: img("photo-1607472586893-edb57bdc0e39"),
    recomendado: true,
  },
  {
    id: "electricidad",
    titulo: "Instalaciones eléctricas certificadas",
    categoria: "construccion",
    desde: 3000,
    proveedor: "ElectroSoluciones RD",
    verificado: true,
    rating: 4.7,
    resenas: 88,
    ubicacion: "Santo Domingo Norte",
    cobertura: "Gran Santo Domingo y Este",
    imagen: img("photo-1621905251189-08b45d6a269e"),
  },
  {
    id: "barberia",
    titulo: "Barbería a domicilio",
    categoria: "belleza",
    desde: 800,
    proveedor: "Estilo Barber RD",
    verificado: false,
    rating: 4.9,
    resenas: 154,
    ubicacion: "Santiago",
    cobertura: "Santiago y Cibao",
    imagen: img("photo-1503951914875-452162b0f3f1"),
    recomendado: true,
  },
  {
    id: "fotografia",
    titulo: "Fotografía de eventos y bodas",
    categoria: "eventos",
    desde: 12000,
    proveedor: "Luz Caribe Studio",
    verificado: true,
    rating: 5,
    resenas: 46,
    ubicacion: "La Altagracia",
    cobertura: "Disponible en toda RD",
    imagen: img("photo-1519741497674-611481863552"),
  },
  {
    id: "reparacion-celulares",
    titulo: "Reparación de celulares y tablets",
    categoria: "tecnologia",
    desde: 1200,
    proveedor: "MovilFix RD",
    verificado: true,
    rating: 4.6,
    resenas: 201,
    ubicacion: "La Vega",
    cobertura: "La Vega y Cibao Central",
    imagen: img("photo-1588508065123-287b28e013da"),
  },
  {
    id: "mudanzas",
    titulo: "Mudanzas y transporte de carga",
    categoria: "otros",
    desde: 4500,
    proveedor: "Mudanzas Quisqueya",
    verificado: true,
    rating: 4.5,
    resenas: 67,
    ubicacion: "Santo Domingo",
    cobertura: "Nacional",
    imagen: img("photo-1600518464441-9154a4dea21b"),
  },
  {
    id: "tutorias",
    titulo: "Tutorías de matemáticas e inglés",
    categoria: "educacion",
    desde: 900,
    proveedor: "Academia Aprende+",
    verificado: false,
    rating: 4.8,
    resenas: 52,
    ubicacion: "Distrito Nacional",
    cobertura: "Presencial y virtual",
    imagen: img("photo-1503676260728-1c00da094a0b"),
  },
];

export type Tienda = {
  id: string;
  nombre: string;
  categoria: string;
  ubicacion: string;
  rnc?: string;
  descripcion?: string;
  propietario?: string;
  verificado: boolean;
  rating: number;
  resenas: number;
  seguidores: number;
  productos: number;
  logo: string;
  portada: string;
  destacado?: boolean;
};

export const tiendas: Tienda[] = [
  {
    id: "tech-store-rd",
    nombre: "Tech Store RD",
    categoria: "Tecnología",
    ubicacion: "Santiago",
    verificado: true,
    rating: 4.9,
    resenas: 512,
    seguidores: 3200,
    productos: 148,
    logo: img("photo-1516534775068-ba3e7458af70"),
    portada: img("photo-1517336714731-489689fd1ca8"),
  },
  {
    id: "casa-bella-rd",
    nombre: "Casa Bella RD",
    categoria: "Hogar",
    ubicacion: "Puerto Plata",
    verificado: true,
    rating: 4.8,
    resenas: 231,
    seguidores: 1450,
    productos: 96,
    logo: img("photo-1556228720-195a672e8a03"),
    portada: img("photo-1513694203232-719a280e022f"),
  },
  {
    id: "bella-natural-rd",
    nombre: "Bella Natural RD",
    categoria: "Belleza",
    ubicacion: "Distrito Nacional",
    verificado: true,
    rating: 4.9,
    resenas: 187,
    seguidores: 2100,
    productos: 74,
    logo: img("photo-1522335789203-aabd1fc54bc9"),
    portada: img("photo-1570172619644-dfd03ed5d881"),
  },
  {
    id: "supermercado-cibao",
    nombre: "Supermercado Cibao",
    categoria: "Supermercado",
    ubicacion: "La Vega",
    verificado: true,
    rating: 4.6,
    resenas: 402,
    seguidores: 5300,
    productos: 620,
    logo: img("photo-1542838132-92c53300491e"),
    portada: img("photo-1601599963565-b7ba29c8e2ff"),
  },
];

export const formatearRD = (valor: number) =>
  `RD$${valor.toLocaleString("es-DO", { maximumFractionDigits: 2 })}`;
