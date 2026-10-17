/**
 * The visitor's address. The proxy in front (Caddy, nginx) appends the address it saw to X-Forwarded-For, so the
 * LAST entry is the real one; earlier entries are whatever the client sent and can be faked.
 */
export function clientIp(req: Request) {
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) || req.headers.get("x-real-ip") || "local";
}
