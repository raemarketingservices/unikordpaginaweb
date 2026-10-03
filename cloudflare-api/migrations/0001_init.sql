-- UNIKO-RD Schema para D1 (SQLite)
-- Simplificado: sin RLS, sin Supabase Auth (usaremos Cloudflare Auth)

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  cedula TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  tipo TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('producto', 'servicio', 'ambos')),
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES profiles(id),
  owner_name TEXT,
  name TEXT NOT NULL,
  rnc TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  verified BOOLEAN NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  products_count INTEGER NOT NULL DEFAULT 0,
  logo TEXT,
  cover TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  title TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT REFERENCES categories(id),
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_at_price INTEGER,
  verified BOOLEAN NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  shipping BOOLEAN NOT NULL DEFAULT 1,
  image TEXT,
  gallery TEXT DEFAULT '[]',
  videos TEXT DEFAULT '[]',
  featured BOOLEAN NOT NULL DEFAULT 0,
  best_seller BOOLEAN NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES profiles(id),
  store_id TEXT REFERENCES stores(id),
  title TEXT NOT NULL,
  category TEXT REFERENCES categories(id),
  price_from INTEGER NOT NULL CHECK (price_from >= 0),
  provider TEXT,
  verified BOOLEAN NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  coverage TEXT,
  image TEXT,
  recommended BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_blocks (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL DEFAULT 'home',
  type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  config TEXT DEFAULT '{}',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_ratings (
  store_id TEXT NOT NULL REFERENCES stores(id),
  user_id TEXT NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, user_id)
);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cedula TEXT,
  note TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  total REAL,
  source TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'pendiente',
  store_ids TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  greeting TEXT NOT NULL DEFAULT '',
  allowed_stores TEXT NOT NULL DEFAULT '["*"]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO chatbot_settings (id, greeting) VALUES
('default', '¡Hola! Soy UNIKO, el asistente de UNIKO-RD. Pregúntame por productos, precios, ofertas o tiendas.')
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page ON page_blocks(page, position);
