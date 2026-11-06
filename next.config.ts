import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app page is per-user; classic dynamic rendering is simpler than Cache Components here.
  reactCompiler: true,
  serverExternalPackages: ["postgres"],
  // Which build this is, in the pages and on the server: open tabs compare the two to offer a refresh (UpdateBanner).
  env: { APP_BUILD: new Date().toISOString() },
  // LAN testing: dev assets are blocked for non-localhost origins otherwise
  // The editor is cross-origin isolated, which lets exports use the device's threads (lib/deviceExport.ts). This blocks
  // other sites' scripts on the page, so Billing reloads itself out of it (components/BillingActions.tsx).
  // The engine's workers must carry the same policy, or the browser never starts them.
  headers: async () => ["/app/jobs/:id", "/ffmpeg/:path*"].map((source) => ({ source, headers: [
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  ] })),
  allowedDevOrigins: ["192.168.1.2", "*.trycloudflare.com"], // LAN Mac and a Cloudflare quick tunnel for off-site testing
};

export default nextConfig;
