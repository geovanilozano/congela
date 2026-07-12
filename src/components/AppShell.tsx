"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; icon: string };
type Grupo = { titulo: string | null; items: Item[] };

const grupos: Grupo[] = [
  {
    titulo: null,
    items: [
      { href: "/", label: "Tablero", icon: "📊" },
      { href: "/reportes", label: "Reportes", icon: "📈" },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/inversion", label: "Inversión", icon: "🏗️" },
      { href: "/credito", label: "Crédito", icon: "💳" },
      { href: "/fondos", label: "Fondos", icon: "🪙" },
      { href: "/ventas", label: "Ventas", icon: "🧾" },
      { href: "/caja", label: "Caja", icon: "🔒" },
      { href: "/compras", label: "Gastos", icon: "💸" },
    ],
  },
  {
    titulo: "Operación",
    items: [
      { href: "/produccion", label: "Producción", icon: "🏭" },
      { href: "/inventario", label: "Inventario", icon: "📦" },
      { href: "/activos", label: "Activos", icon: "🧰" },
      { href: "/personal", label: "Personal", icon: "👷" },
      { href: "/mantenimiento", label: "Mantenimiento", icon: "🛠️" },
    ],
  },
  {
    titulo: "Energía",
    items: [
      { href: "/energia", label: "Energía", icon: "⚡" },
      { href: "/servicios", label: "Servicios", icon: "🔌" },
    ],
  },
  {
    titulo: "Sistema",
    items: [{ href: "/ajustes", label: "Ajustes", icon: "⚙️" }],
  },
];

function esActivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Cerrar el menú móvil al cambiar de página.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {/* Fondo del panel derecho */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-sky-50/50 to-slate-100" />

      {/* Backdrop móvil */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "linear-gradient(180deg,#0d1a2b 0%,#0a1320 100%)" }}
      >
        {/* Resplandor frío superior */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle,#22d3ee66,transparent 70%)" }}
        />

        {/* Marca */}
        <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-xl shadow-inner">🧊</span>
          <div>
            <div className="font-display text-lg font-bold leading-none text-white">Congela</div>
            <div className="mt-1 text-[11px] tracking-wide text-slate-400">Control del negocio</div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {grupos.map((g, gi) => (
            <div key={gi}>
              {g.titulo && (
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {g.titulo}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const activo = esActivo(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        activo
                          ? "bg-white/10 font-medium text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {activo && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" />
                      )}
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg text-base transition ${
                          activo ? "bg-cyan-400/20" : "bg-white/5 group-hover:bg-white/10"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Pie */}
        <div className="relative border-t border-white/10 px-5 py-4 text-[11px] text-slate-500">
          Negocio de producción y venta de hielo
        </div>
      </aside>

      {/* Contenido */}
      <div className="lg:pl-64">
        {/* Barra superior móvil */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-slate-800">
            <span>🧊</span> Congela
          </Link>
          <button
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
