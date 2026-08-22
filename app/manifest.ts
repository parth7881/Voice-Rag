import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goa Voice — Multilingual RAG",
    short_name: "Goa Voice",
    description: "Voice-first multilingual RAG built for HH Goa 2026.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff9e9",
    theme_color: "#08663c",
    orientation: "portrait-primary",
    categories: ["productivity", "education", "utilities"],
    icons: [
      { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/app-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
