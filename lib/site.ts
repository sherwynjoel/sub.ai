/** The site's public address (APP_URL on the server), for links search engines and link previews read. */
export const SITE_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Public pages, for the sitemap. */
export const PUBLIC_PAGES = [
  "/", "/signup", "/login", "/forgot",
  "/tamil-subtitle-generator", "/tanglish-captions", "/premiere-pro-subtitle-plugin",
  "/contact", "/terms", "/privacy", "/refunds", "/shipping",
];
