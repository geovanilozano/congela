import type { Metadata } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full antialiased ${display.variable} ${body.variable}`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
