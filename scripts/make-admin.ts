/**
 * Give (or take back) admin access from the server:  npm run make-admin -- you@example.com [--remove]
 * Sign-ups never create admins, so the first admin is made here by someone with access to the server.
 */
import { eq } from "drizzle-orm";
import { db, users } from "../db";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com [--remove]");
  process.exit(1);
}
const isAdmin = flag !== "--remove";
// In a function: tsx compiles this file as CommonJS, which has no top-level await.
(async () => {
  const rows = await db.update(users).set({ isAdmin }).where(eq(users.email, email.trim().toLowerCase())).returning({ email: users.email });
  if (!rows.length) {
    console.error(`No account with the email ${email}. Sign up on the website first, then run this again.`);
    process.exit(1);
  }
  console.log(`${rows[0].email} is ${isAdmin ? "now an admin" : "no longer an admin"}.`);
  process.exit(0);
})();
