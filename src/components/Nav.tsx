import Link from "next/link";

const links = [
  { href: "/", label: "Tablero", icon: "📊" },
  { href: "/inversion", label: "Inversión", icon: "🏗️" },
  { href: "/credito", label: "Crédito", icon: "💳" },
  { href: "/fondos", label: "Fondos", icon: "🪙" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
  { href: "/caja", label: "Cierre de caja", icon: "🔒" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2">
        <Link href="/" className="mr-3 flex items-center gap-2 font-bold text-sky-700">
          <span className="text-xl">🧊</span> Congela
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="mr-1">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
