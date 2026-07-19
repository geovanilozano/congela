import type { MetadataRoute } from "next";

// Manifiesto PWA: permite instalar Congela en el celular como una app (ícono en la
// pantalla de inicio, pantalla completa, sin barra del navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Congela — Control del negocio de hielo",
    short_name: "Congela",
    description: "Ventas, fiado, caja, energía solar y finanzas de tu negocio de hielo.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0ea5e9",
    lang: "es-CO",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
