import type { NextConfig } from "next";

const defaultApiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://voice-rag-production-ebca.up.railway.app"
    : "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || defaultApiBaseUrl,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" }
      ]
    }
  ]
};

export default nextConfig;
