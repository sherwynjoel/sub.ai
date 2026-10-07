import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app page is per-user; classic dynamic rendering is simpler than Cache Components here.
  reactCompiler: true,
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
