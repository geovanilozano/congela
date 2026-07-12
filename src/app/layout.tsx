import type { Metadata } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getSesion } from "@/lib/auth/session";

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion = await getSesion();

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
