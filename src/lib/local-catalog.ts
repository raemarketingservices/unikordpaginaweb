import { categorias, productos, servicios, tiendas, type Tienda } from "@/data/marketplace";

export const LOCAL_CATALOG = import.meta.env["VITE_LOCAL_CATALOG"] === "true";

const stores: Tienda[] = tiendas.map((store) => ({ ...store }));
const products = productos.map((product) => {
  let store = stores.find((item) => item.nombre === product.tienda);
  if (!store) {
    store = {
      id: product.tienda
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      nombre: product.tienda,
      categoria: categorias.find((item) => item.slug === product.categoria)?.nombre ?? "Otros",
      ubicacion: product.ubicacion,
      verificado: product.verificado,
      rating: 0,
      resenas: 0,
      seguidores: 0,
      productos: 0,
      logo: product.imagen,
      portada: product.imagen,
    };
    stores.push(store);
  }
  return { ...product, tiendaId: store.id };
});
for (const store of stores) {
  store.productos = products.filter((product) => product.tiendaId === store.id).length;
}

export const localCatalog = { categorias, productos: products, servicios, tiendas: stores };
