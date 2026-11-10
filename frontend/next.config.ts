import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Samodzielny build pod przyszły obraz Dockera (.next/standalone)
  output: "standalone",
  // Tryb dev: Next domyślnie wpuszcza tylko "localhost". Bez tego wejście przez
  // 127.0.0.1 lub adres sieciowy renderuje stronę, ale React się nie hydratuje
  // (przyciski i drag & drop nie działają). Nie wpływa na build produkcyjny.
  allowedDevOrigins: ["127.0.0.1", "192.168.80.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
