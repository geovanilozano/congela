import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getSesion } from "@/lib/auth/session";
import { puedeAcceder } from "@/lib/auth/permisos";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Onest({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Congela — Control de negocio de hielo",
  description: "Inversión, crédito, fondos, ventas y finanzas del negocio de hielo.",
  // Hace que en iOS (Añadir a inicio) la app se vea a pantalla completa con su nombre.
  appleWebApp: { capable: true, title: "Congela", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff", // igual que el encabezado real (blanco), para que la barra del sistema se integre
  // Ocupar toda la pantalla en modo app (detrás del notch/barra de gestos); el contenido
  // reserva su espacio con las "safe areas" (ver globals.css y AppShell).
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion = await getSesion();

  // Autorización REAL de lectura: el proxy solo comprueba la firma del token (optimista).
  // Aquí, para las rutas protegidas (las que traen la cabecera x-pathname que pone el proxy),
  // se re-valida contra la BD con `getSesion()` (rol/estado vivos): un usuario desactivado o
  // degradado pierde el acceso a las páginas al instante, no solo a las escrituras.
  const ruta = (await headers()).get("x-pathname");
  if (ruta) {
    if (!sesion) redirect("/login");
    if (!puedeAcceder(sesion.rol, ruta)) redirect("/");
  }

  return (
    <html lang="es" className={`h-full antialiased ${display.variable} ${body.variable}`}>
      <body className="min-h-full">
        {sesion ? (
          <AppShell rol={sesion.rol} nombre={sesion.nombre}>
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
