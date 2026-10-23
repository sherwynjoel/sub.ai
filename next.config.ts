import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app page is per-user; classic dynamic rendering is simpler than Cache Components here.
  reactCompiler: true,
  serverExternalPackages: ["postgres"],
  // Which build this is, in the pages and on the server: open tabs compare the two to offer a refresh (UpdateBanner).
  env: { APP_BUILD: new Date().toISOString() },
  // LAN testing: dev assets are blocked for non-localhost origins otherwise
  allowedDevOrigins: ["192.168.1.2", "*.trycloudflare.com"], // LAN Mac and a Cloudflare quick tunnel for off-site testing
};

export default nextConfig;
