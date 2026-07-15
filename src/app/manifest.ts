import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Manifest de la PWA generado desde la config de marca.
// Se sirve en /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} · Agende seu horário`,
    short_name: site.shortName,
    description: site.tagline,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
