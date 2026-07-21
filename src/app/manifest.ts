import type { MetadataRoute } from "next";

// Manifiesto PWA: permite instalar Congela en el celular como una app (ícono en la
// pantalla de inicio, pantalla completa, sin barra del navegador, accesos directos).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Congela — Control del negocio de hielo",
    short_name: "Congela",
    description: "Ventas, fiado, caja, energía solar y finanzas de tu negocio de hielo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#ffffff",
    lang: "es-CO",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable con "zona segura" (cubo dentro del 80% central) para Android adaptativo.
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Accesos directos: mantener pulsado el ícono en la pantalla de inicio (Android).
    shortcuts: [
      { name: "Nueva venta", short_name: "Venta", url: "/ventas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Cerrar caja", short_name: "Caja", url: "/caja", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Medidores", short_name: "Medidores", url: "/medidores", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
