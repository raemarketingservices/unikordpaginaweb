import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Key,
  Lock,
  Home,
  Settings,
  LayoutGrid,
  Store,
  ShoppingBag,
  Users,
  Tag,
  Image,
  Link as LinkIcon,
  ShieldCheck,
  Truck,
  Briefcase,
  Heart,
  Star,
  Zap,
  Package,
  Sparkles,
  MapPin,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fetchTodosBloques, fetchCategorias, slugUnico } from "@/lib/queries";
import { GestionUsuarios } from "@/components/admin/GestionUsuarios";
import { GestionTiendas } from "@/components/admin/GestionTiendas";
import { GestionProductos } from "@/components/admin/GestionProductos";
import { ConfigChatbot } from "@/components/admin/ConfigChatbot";
import { NOMBRES_TIPO } from "@/lib/types";
import type {
  PageBlockRow,
  TipoBloque,
  HeroCfg,
  TrustCfg,
  SeccionCfg,
  CategoriasCfg,
  CtaCfg,
  BannerCfg,
} from "@/lib/types";

const ICONOS_DISPONIBLES: LucideIcon[] = [
  ShieldCheck,
  Store,
  Lock,
  Truck,
  Briefcase,
  Heart,
  Star,
  Zap,
  Package,
  Users,
  Sparkles,
  MapPin,
  Settings,
  Image,
  Tag,
  LinkIcon,
  LayoutGrid,
  Home,
  ShoppingBag,
];

function iconoNombre(icon: LucideIcon): string {
  return icon.displayName ?? icon.name ?? "";
}

export const Route = createFileRoute("/admin")({
  loader: async () => ({
    bloques: await fetchTodosBloques(),
    categorias: await fetchCategorias(),
  }),
  head: () => ({
    meta: [{ title: "Panel de administración · UNIKO-RD" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

type BloqueLocal = {
  id: string | null;
  type: TipoBloque;
  title: string;
  subtitle: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

function defaultConfig(type: TipoBloque): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        eyebrow: "Marketplace Dominicano",
        image: "",
        buttons: [
          { label: "Explorar productos", to: "/productos", style: "brand" },
          { label: "Explorar servicios", to: "/servicios", style: "primary" },
          { label: "Empieza a vender", to: "/vender", style: "outline" },
        ],
        stats: [
          { k: "+12,000", v: "Productos publicados" },
          { k: "+2,500", v: "Servicios y profesionales" },
          { k: "32", v: "Provincias con cobertura" },
        ],
      };
    case "trust_bar":
      return {
        items: [
          { icon: "ShieldCheck", text: "Compras seguras" },
          { icon: "Store", text: "Vendedores confiables" },
          { icon: "Lock", text: "Pagos protegidos" },
          { icon: "Truck", text: "Envíos a todo el país" },
        ],
      };
    case "categories":
      return { limit: 12, link: { to: "/categorias", label: "Ver todas" } };
    case "product_section":
      return {
        filter: "all",
        limit: 4,
        fondo: false,
        link: { to: "/productos", label: "Ver productos" },
      };
    case "service_section":
      return {
        filter: "all",
        limit: 4,
        fondo: false,
        link: { to: "/servicios", label: "Ver servicios" },
      };
    case "store_section":
      return {
        filter: "featured",
        limit: 4,
        fondo: true,
        link: { to: "/tiendas", label: "Ver tiendas" },
      };
    case "cta_banners":
      return {
        banners: [
          {
            icon: "Store",
            title: "¿Tienes un negocio?",
            text: "Abre tu tienda en UNIKO-RD y llega a clientes de todo el país.",
            button_label: "Crear mi tienda",
            to: "/vender",
            color: "primary",
          },
          {
            icon: "Briefcase",
            title: "¿Ofreces un servicio?",
            text: "Convierte tus habilidades en oportunidades.",
            button_label: "Publicar mi servicio",
            to: "/vender",
            color: "brand",
          },
        ],
      };
    default:
      return {};
  }
}

function mergeConfig(type: TipoBloque, db: Record<string, unknown>): Record<string, unknown> {
  const base = defaultConfig(type);
  const out: Record<string, unknown> = { ...base, ...db };
  if (base["link"] && db["link"]) {
    out["link"] = { ...(base["link"] as object), ...(db["link"] as object) };
  }
  return out;
}

type SeccionAdmin = "home" | "usuarios" | "tiendas" | "productos" | "chatbot";

const SECCIONES: { id: SeccionAdmin; etiqueta: string; icono: LucideIcon }[] = [
  { id: "home", etiqueta: "Home", icono: Home },
  { id: "usuarios", etiqueta: "Usuarios", icono: Users },
  { id: "tiendas", etiqueta: "Tiendas", icono: Store },
  { id: "productos", etiqueta: "Artículos", icono: ShoppingBag },
  { id: "chatbot", etiqueta: "Chatbot", icono: Bot },
];

function Admin() {
  const router = useRouter();
  const { session, profile, loading, isAdmin, salir } = useAuth();
  const userId = session?.user.id ?? null;
  const { bloques: loaderBloques } = Route.useLoaderData();
  const [bloques, setBloques] = useState<BloqueLocal[]>([]);
  const [eliminados, setEliminados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [cambiandoPw, setCambiandoPw] = useState(false);
  const [seccion, setSeccion] = useState<SeccionAdmin>("home");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!userId || !isAdmin) return;
      setBloques(
        (loaderBloques as PageBlockRow[]).map((b) => ({
          id: b.id,
          type: b.type as TipoBloque,
          title: b.title ?? "",
          subtitle: b.subtitle ?? "",
          enabled: b.enabled,
          config: mergeConfig(b.type as TipoBloque, b.config ?? {}),
        })),
      );
    }
  }, [loading, userId, isAdmin, loaderBloques]);

  const actualizar = useCallback((idx: number, patch: Partial<BloqueLocal>) => {
    setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }, []);

  const actualizarConfig = useCallback(
    (idx: number, fn: (cfg: Record<string, unknown>) => Record<string, unknown>) => {
      setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, config: fn(b.config) } : b)));
    },
    [],
  );

  const toggleExpand = (id: string | null) => setExpandido((e) => (e === id ? null : id));

  const reordenar = (from: number, to: number) => {
    setBloques((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      if (!item) return prev;
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const agregarBloque = (tipo: TipoBloque) => {
    const nuevo: BloqueLocal = {
      id: null,
      type: tipo,
      title: "",
      subtitle: "",
      enabled: true,
      config: defaultConfig(tipo),
    };
    const idx = bloques.length;
    setBloques((prev) => [...prev, nuevo]);
    setExpandido(`nuevo-${idx}`);
  };

  const eliminarBloque = (idx: number) => {
    const id = bloques[idx]?.id;
    if (id) setEliminados((e) => [...e, id]);
    setBloques((prev) => prev.filter((_, i) => i !== idx));
    setExpandido(null);
  };

  const idxExpandido = expandido
    ? bloques.findIndex((b, i) => expandido === (b.id ?? `nuevo-${i}`))
    : -1;
  const bloqueExpandido = idxExpandido >= 0 ? bloques[idxExpandido] : undefined;

  const guardar = async () => {
    if (!session) return;
    setGuardando(true);
    try {
      const filas = bloques.map((b, i) => ({
        id: b.id ?? crypto.randomUUID(),
        page: "home",
        type: b.type,
        title: b.title || null,
        subtitle: b.subtitle || null,
        position: i,
        enabled: b.enabled,
        config: b.config,
      }));
      const { error: upsertError } = await supabase.from("page_blocks").upsert(filas, {
        onConflict: "id",
      });
      if (upsertError) throw upsertError;
      if (eliminados.length) {
        const { error: delError } = await supabase
          .from("page_blocks")
          .delete()
          .in("id", eliminados);
        if (delError) throw delError;
      }
      setEliminados([]);
      toast.success("Cambios guardados. La home se actualizará.");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    if (!pw1 || pw1 !== pw2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (pw1.length < 8) {
      toast.error("Mínimo 8 caracteres.");
      return;
    }
    setCambiandoPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) toast.error(error.message);
    else {
      toast.success("Contraseña actualizada.");
      setPw1("");
      setPw2("");
      setCambiandoPw(false);
    }
    setCambiandoPw(false);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    setArrastrando(idx);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (arrastrando !== null && arrastrando !== idx) reordenar(arrastrando, idx);
    setArrastrando(null);
  };
  const handleDragEnd = () => setArrastrando(null);

  // renderers por tipo
  const renderConfig = (idx: number, b: BloqueLocal) => {
    const cfg = b.config;
    switch (b.type) {
      case "hero": {
        const h = cfg as HeroCfg;
        return (
          <div className="grid gap-4">
            <Campo label="Eyebrow (línea superior)">
              <input
                value={(h.eyebrow ?? "") as string}
                onChange={(e) => actualizarConfig(idx, (c) => ({ ...c, eyebrow: e.target.value }))}
                className="input-uniko"
                placeholder="Marketplace Dominicano"
              />
            </Campo>
            <Campo label="Imagen (URL, vacío = hero por defecto)">
              <input
                value={(h.image ?? "") as string}
                onChange={(e) => actualizarConfig(idx, (c) => ({ ...c, image: e.target.value }))}
                className="input-uniko"
                placeholder="https://..."
              />
            </Campo>
            <Campo label="Botones (máx 3)">
              {((h.buttons ?? []) as { label: string; to: string; style: string }[]).map(
                (btn, bi) => (
                  <div key={bi} className="flex gap-2">
                    <input
                      value={btn.label}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["buttons"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], label: e.target.value };
                          return { ...c, buttons: bs };
                        })
                      }
                      className="input-uniko"
                      placeholder="Texto"
                    />
                    <input
                      value={btn.to}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["buttons"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], to: e.target.value };
                          return { ...c, buttons: bs };
                        })
                      }
                      className="input-uniko w-32"
                      placeholder="/productos"
                    />
                    <select
                      value={btn.style}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["buttons"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], style: e.target.value };
                          return { ...c, buttons: bs };
                        })
                      }
                      className="select-uniko w-24"
                    >
                      <option value="brand">brand</option>
                      <option value="primary">primary</option>
                      <option value="outline">outline</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["buttons"] ?? []) as any[])];
                          bs.splice(bi, 1);
                          return { ...c, buttons: bs };
                        })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              )}
              <button
                type="button"
                onClick={() =>
                  actualizarConfig(idx, (c) => ({
                    ...c,
                    buttons: [
                      ...((c["buttons"] ?? []) as any[]),
                      { label: "Nuevo botón", to: "/", style: "brand" },
                    ],
                  }))
                }
                className="btn-base btn-outline btn-sm"
              >
                <Plus className="h-4 w-4" /> Añadir botón
              </button>
            </Campo>
            <Campo label="Estadísticas (3 pares k/v)">
              {((h.stats ?? []) as { k: string; v: string }[]).map((st, si) => (
                <div key={si} className="flex gap-2">
                  <input
                    value={st.k}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const ss = [...((c["stats"] ?? []) as any[])];
                        ss[si] = { ...ss[si], k: e.target.value };
                        return { ...c, stats: ss };
                      })
                    }
                    className="input-uniko w-24"
                    placeholder="+12,000"
                  />
                  <input
                    value={st.v}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const ss = [...((c["stats"] ?? []) as any[])];
                        ss[si] = { ...ss[si], v: e.target.value };
                        return { ...c, stats: ss };
                      })
                    }
                    className="input-uniko flex-1"
                    placeholder="Productos publicados"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      actualizarConfig(idx, (c) => {
                        const ss = [...((c["stats"] ?? []) as any[])];
                        ss.splice(si, 1);
                        return { ...c, stats: ss };
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  actualizarConfig(idx, (c) => ({
                    ...c,
                    stats: [...((c["stats"] ?? []) as any[]), { k: "", v: "" }],
                  }))
                }
                className="btn-base btn-outline btn-sm"
              >
                <Plus className="h-4 w-4" /> Añadir stat
              </button>
            </Campo>
          </div>
        );
      }
      case "trust_bar": {
        const t = cfg as TrustCfg;
        return (
          <div className="grid gap-4">
            <Campo label="Items (4 iconos + texto)">
              {((t.items ?? []) as { icon: string; text: string }[]).map((it, ii) => (
                <div key={ii} className="flex gap-2">
                  <select
                    value={it.icon}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const is = [...((c["items"] ?? []) as any[])];
                        is[ii] = { ...is[ii], icon: e.target.value };
                        return { ...c, items: is };
                      })
                    }
                    className="select-uniko w-36"
                  >
                    {ICONOS_DISPONIBLES.map((Ic) => (
                      <option key={Ic.displayName} value={Ic.displayName}>
                        {Ic.displayName}
                      </option>
                    ))}
                  </select>
                  <input
                    value={it.text}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const is = [...((c["items"] ?? []) as any[])];
                        is[ii] = { ...is[ii], text: e.target.value };
                        return { ...c, items: is };
                      })
                    }
                    className="input-uniko flex-1"
                    placeholder="Texto"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      actualizarConfig(idx, (c) => {
                        const is = [...((c["items"] ?? []) as any[])];
                        is.splice(ii, 1);
                        return { ...c, items: is };
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  actualizarConfig(idx, (c) => ({
                    ...c,
                    items: [
                      ...((c["items"] ?? []) as any[]),
                      { icon: "ShieldCheck", text: "Nuevo" },
                    ],
                  }))
                }
                className="btn-base btn-outline btn-sm"
              >
                <Plus className="h-4 w-4" /> Añadir item
              </button>
            </Campo>
          </div>
        );
      }
      case "categories": {
        const c = cfg as CategoriasCfg;
        return (
          <div className="grid gap-4">
            <Campo label="Límite">
              <input
                type="number"
                min="1"
                max="50"
                value={(c.limit ?? 12) as number}
                onChange={(e) =>
                  actualizarConfig(idx, (c2) => ({ ...c2, limit: Number(e.target.value) }))
                }
                className="input-uniko w-24"
              />
            </Campo>
            <Campo label="Enlace «Ver todas»">
              <div className="flex gap-2">
                <input
                  value={(c["link"]?.to ?? "/categorias") as string}
                  onChange={(e) =>
                    actualizarConfig(idx, (c2) => ({
                      ...c2,
                      link: { ...(c2["link"] ?? {}), to: e.target.value },
                    }))
                  }
                  className="input-uniko w-40"
                  placeholder="/categorias"
                />
                <input
                  value={(c["link"]?.label ?? "Ver todas") as string}
                  onChange={(e) =>
                    actualizarConfig(idx, (c2) => ({
                      ...c2,
                      link: { ...(c2["link"] ?? {}), label: e.target.value },
                    }))
                  }
                  className="input-uniko"
                  placeholder="Ver todas"
                />
              </div>
            </Campo>
          </div>
        );
      }
      case "product_section":
      case "service_section":
      case "store_section": {
        const s = cfg as SeccionCfg;
        const filtros =
          b.type === "product_section"
            ? (["all", "offers", "best_seller", "is_new", "featured"] as const)
            : b.type === "service_section"
              ? (["all", "recommended"] as const)
              : (["all", "featured"] as const);
        return (
          <div className="grid gap-4">
            <Campo label="Filtro">
              <select
                value={s.filter ?? "all"}
                onChange={(e) => actualizarConfig(idx, (c) => ({ ...c, filter: e.target.value }))}
                className="select-uniko w-48"
              >
                {filtros.map((f) => (
                  <option key={f} value={f}>
                    f
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Límite">
              <input
                type="number"
                min="1"
                max="20"
                value={(s.limit ?? 4) as number}
                onChange={(e) =>
                  actualizarConfig(idx, (c) => ({ ...c, limit: Number(e.target.value) }))
                }
                className="input-uniko w-24"
              />
            </Campo>
            <Campo>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={(s.fondo ?? false) as boolean}
                  onChange={(e) =>
                    actualizarConfig(idx, (c) => ({ ...c, fondo: e.target.checked }))
                  }
                  className="rounded border-border accent-brand"
                />
                Fondo alternado
              </label>
            </Campo>
            <Campo label="Enlace «Ver más»">
              <div className="flex gap-2">
                <input
                  value={(s.link?.to ?? "/") as string}
                  onChange={(e) =>
                    actualizarConfig(idx, (c) => ({
                      ...c,
                      link: { ...(c["link"] ?? {}), to: e.target.value },
                    }))
                  }
                  className="input-uniko w-40"
                  placeholder="/productos"
                />
                <input
                  value={(s.link?.label ?? "Ver más") as string}
                  onChange={(e) =>
                    actualizarConfig(idx, (c) => ({
                      ...c,
                      link: { ...(c["link"] ?? {}), label: e.target.value },
                    }))
                  }
                  className="input-uniko"
                  placeholder="Ver más"
                />
              </div>
            </Campo>
          </div>
        );
      }
      case "cta_banners": {
        const ct = cfg as CtaCfg;
        return (
          <div className="grid gap-4">
            <Campo label="Banners (máx 2)">
              {((ct.banners ?? []) as BannerCfg[]).map((bn, bi) => (
                <div key={bi} className="grid gap-2 border border-border rounded-xl p-3">
                  <div className="flex gap-2">
                    <select
                      value={bn.icon}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["banners"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], icon: e.target.value };
                          return { ...c, banners: bs };
                        })
                      }
                      className="select-uniko w-32"
                    >
                      {ICONOS_DISPONIBLES.map((Ic) => (
                        <option key={Ic.displayName} value={Ic.displayName}>
                          {Ic.displayName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={(bn.color ?? "primary") as string}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["banners"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], color: e.target.value };
                          return { ...c, banners: bs };
                        })
                      }
                      className="select-uniko w-24"
                    >
                      <option value="primary">primary</option>
                      <option value="brand">brand</option>
                    </select>
                  </div>
                  <input
                    value={(bn.title ?? "") as string}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const bs = [...((c["banners"] ?? []) as any[])];
                        bs[bi] = { ...bs[bi], title: e.target.value };
                        return { ...c, banners: bs };
                      })
                    }
                    className="input-uniko"
                    placeholder="Título"
                  />
                  <textarea
                    value={(bn.text ?? "") as string}
                    onChange={(e) =>
                      actualizarConfig(idx, (c) => {
                        const bs = [...((c["banners"] ?? []) as any[])];
                        bs[bi] = { ...bs[bi], text: e.target.value };
                        return { ...c, banners: bs };
                      })
                    }
                    className="input-uniko min-h-[60px] resize-y"
                    placeholder="Texto descriptivo"
                  />
                  <div className="flex gap-2">
                    <input
                      value={(bn.button_label ?? "") as string}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["banners"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], button_label: e.target.value };
                          return { ...c, banners: bs };
                        })
                      }
                      className="input-uniko flex-1"
                      placeholder="Texto botón"
                    />
                    <input
                      value={(bn.to ?? "/") as string}
                      onChange={(e) =>
                        actualizarConfig(idx, (c) => {
                          const bs = [...((c["banners"] ?? []) as any[])];
                          bs[bi] = { ...bs[bi], to: e.target.value };
                          return { ...c, banners: bs };
                        })
                      }
                      className="input-uniko w-32"
                      placeholder="/vender"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      actualizarConfig(idx, (c) => {
                        const bs = [...((c["banners"] ?? []) as any[])];
                        bs.splice(bi, 1);
                        return { ...c, banners: bs };
                      })
                    }
                    className="text-muted-foreground hover:text-foreground self-end"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar este banner
                  </button>
                </div>
              ))}
              {(ct.banners ?? []).length < 2 && (
                <button
                  type="button"
                  onClick={() =>
                    actualizarConfig(idx, (c) => ({
                      ...c,
                      banners: [
                        ...((c["banners"] ?? []) as any[]),
                        {
                          icon: "Store",
                          title: "",
                          text: "",
                          button_label: "",
                          to: "/",
                          color: "primary",
                        },
                      ],
                    }))
                  }
                  className="btn-base btn-outline btn-sm"
                >
                  <Plus className="h-4 w-4" /> Añadir banner
                </button>
              )}
            </Campo>
          </div>
        );
      }
      default:
        return (
          <p className="text-sm text-muted-foreground">Sin editor específico para este tipo.</p>
        );
    }
  };

  // vista login / no admin
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Verificando acceso…</p>
      </div>
    );
  }
  if (!session) {
    return <AdminLogin />;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="card-uniko p-8">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Acceso denegado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área es solo para administradores.
          </p>
          <button onClick={salir} className="btn-base btn-outline mt-4">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // panel admin
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 text-brand" />
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <span className="btn-base btn-outline btn-sm text-xs">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.history.push("/")} className="btn-base btn-ghost">
            <Eye className="h-4 w-4" /> Ver sitio
          </button>
          <button onClick={salir} className="btn-base btn-outline">
            Salir
          </button>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {SECCIONES.map((s) => {
          const Icono = s.icono;
          const activa = seccion === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeccion(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                activa
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <Icono className="h-4 w-4" /> {s.etiqueta}
            </button>
          );
        })}
      </nav>

      {seccion === "home" && (
        <>
          <div className="card-uniko overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-semibold">Editor de bloques de la Home</h2>
              <div className="flex gap-2">
                <button onClick={guardar} disabled={guardando} className="btn-base btn-brand">
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-border">
              <select
                onChange={(e) => agregarBloque(e.target.value as TipoBloque)}
                className="select-uniko max-w-[260px]"
                defaultValue=""
              >
                <option value="" disabled>
                  + Añadir bloque…
                </option>
                {(
                  [
                    "hero",
                    "trust_bar",
                    "categories",
                    "product_section",
                    "service_section",
                    "store_section",
                    "cta_banners",
                  ] as TipoBloque[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {NOMBRES_TIPO[t]}
                  </option>
                ))}
              </select>
            </div>

            <ul className="divide-y divide-border" role="list">
              {bloques.length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground">
                  Sin bloques. Añade uno arriba.
                </li>
              )}
              {bloques.map((b, i) => (
                <li
                  key={b.id ?? `nuevo-${i}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-4 transition ${arrastrando === i ? "bg-accent" : ""}`}
                >
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-grab"
                    aria-label="Reordenar"
                  >
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {NOMBRES_TIPO[b.type]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {b.id ? b.id.slice(0, 8) : "nuevo"}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.enabled}
                          onChange={(e) => actualizar(i, { enabled: e.target.checked })}
                          className="rounded border-border accent-brand"
                        />
                        Activo
                      </label>
                    </div>
                    <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                      {b.title && <span className="truncate max-w-[20rem]">{b.title}</span>}
                      {b.subtitle && <span className="truncate max-w-[18rem]">{b.subtitle}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(b.id ?? `nuevo-${i}`)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {expandido === (b.id ?? `nuevo-${i}`) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarBloque(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>

            {bloqueExpandido && (
              <div className="border-t border-border p-4 bg-muted/30 animate-in slide-in-from-top-2 duration-200">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Editar bloque</h3>
                  <button
                    onClick={() => setExpandido(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div className="grid gap-4">
                    <Campo label="Título">
                      <input
                        value={bloqueExpandido.title}
                        onChange={(e) => actualizar(idxExpandido, { title: e.target.value })}
                        className="input-uniko"
                        placeholder="Título opcional"
                      />
                    </Campo>
                    <Campo label="Subtítulo">
                      <input
                        value={bloqueExpandido.subtitle}
                        onChange={(e) => actualizar(idxExpandido, { subtitle: e.target.value })}
                        className="input-uniko"
                        placeholder="Subtítulo opcional"
                      />
                    </Campo>
                    {renderConfig(idxExpandido, bloqueExpandido)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cambiar contraseña */}
          <div className="mt-8 card-uniko p-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Key className="h-5 w-5" /> Cambiar contraseña de admin
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La contraseña actual es {profile?.email}. Cambiarla afecta al inicio de sesión en
              /admin.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 max-w-md">
              <Campo label="Nueva contraseña">
                <input
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-uniko"
                  autoComplete="new-password"
                />
              </Campo>
              <Campo label="Confirmar contraseña">
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="input-uniko"
                  autoComplete="new-password"
                />
              </Campo>
            </div>
            <button
              onClick={cambiarPassword}
              disabled={cambiandoPw}
              className="btn-base btn-primary mt-3"
            >
              {cambiandoPw ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </div>
        </>
      )}

      {seccion === "usuarios" && (
        <div className="card-uniko overflow-hidden">
          <GestionUsuarios />
        </div>
      )}

      {seccion === "tiendas" && (
        <div className="card-uniko overflow-hidden">
          <GestionTiendas />
        </div>
      )}

      {seccion === "productos" && (
        <div className="card-uniko overflow-hidden">
          <GestionProductos />
        </div>
      )}

      {seccion === "chatbot" && (
        <div className="card-uniko overflow-hidden">
          <ConfigChatbot />
        </div>
      )}
    </div>
  );
}

function AdminLogin() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login") ? "Credenciales incorrectas." : error.message,
      );
      return;
    }
    router.history.push("/admin");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-uniko p-6 sm:p-8">
        <div className="text-center mb-6">
          <Lock className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-3 text-xl font-bold">Área de administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicia sesión con tu cuenta de administrador.
          </p>
        </div>
        <form onSubmit={entrar} className="grid gap-4">
          <Campo label="Correo electrónico">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@unikord.do"
              className="input-uniko"
              autoComplete="email"
            />
          </Campo>
          <Campo label="Contraseña">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-uniko"
              autoComplete="current-password"
            />
          </Campo>
          <button type="submit" disabled={enviando} className="btn-base btn-brand">
            <Lock className="h-4 w-4" />
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Contraseña por defecto: <code className="bg-muted px-1 rounded">unikoadmin</code>
        </p>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-primary">{label}</span>
      {children}
    </label>
  );
}
