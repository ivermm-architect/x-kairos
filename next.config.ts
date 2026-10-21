import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: no Node server. Required for Firebase Hosting (Spark plan).
  output: "export",
  // Next's <Image> optimizer needs a running server; disable it so images are
  // served as-is in the static export (otherwise the build fails).
  images: {
    unoptimized: true,
  },
  // Allow opening the dev server from another device on the LAN (e.g. a tablet
  // for real mobile testing). Replace with this machine's LAN IP.
  allowedDevOrigins: ["192.168.1.5", "100.75.236.69"],
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
