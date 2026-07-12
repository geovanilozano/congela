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
  const [abierto, setAbierto] = useState(false); // menú móvil (drawer)
  const [colapsado, setColapsado] = useState(false); // sidebar oculto en escritorio

  // Recordar la preferencia de sidebar cerrado/abierto.
  useEffect(() => {
    setColapsado(localStorage.getItem("sidebar-colapsado") === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("sidebar-colapsado", colapsado ? "1" : "0");
  }, [colapsado]);

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
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar (blanco) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        } ${colapsado ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
      >
        {/* Marca */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-xl ring-1 ring-sky-100">
            🧊
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold leading-none text-slate-800">Congela</div>
            <div className="mt-1 truncate text-[11px] text-slate-400">Control del negocio</div>
          </div>
          {/* Botón cerrar sidebar */}
          <button
            onClick={() => {
              setAbierto(false);
              setColapsado(true);
            }}
            aria-label="Cerrar menú"
            title="Cerrar menú"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {grupos.map((g, gi) => (
            <div key={gi}>
              {g.titulo && (
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                          ? "bg-sky-50 font-medium text-sky-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {activo && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sky-500" />
                      )}
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg text-base transition ${
                          activo ? "bg-sky-100" : "bg-slate-100 group-hover:bg-slate-200"
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
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
          Negocio de producción y venta de hielo
        </div>
      </aside>

      {/* Contenido */}
      <div className={`transition-[padding] duration-300 ${colapsado ? "lg:pl-0" : "lg:pl-64"}`}>
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

        {/* Botón para volver a abrir el sidebar en escritorio (solo cuando está cerrado) */}
        {colapsado && (
          <button
            onClick={() => setColapsado(false)}
            className="fixed left-4 top-4 z-30 hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 lg:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Menú
          </button>
        )}

        <main className={`mx-auto max-w-6xl px-4 py-6 lg:px-10 lg:py-10 ${colapsado ? "lg:pt-16" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
