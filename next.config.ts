import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app page is per-user; classic dynamic rendering is simpler than Cache Components here.
  reactCompiler: true,
  serverExternalPackages: ["postgres"],
  // LAN testing: dev assets are blocked for non-localhost origins otherwise
  allowedDevOrigins: ["192.168.1.2"],
};

export default nextConfig;
