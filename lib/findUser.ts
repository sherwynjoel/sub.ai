import "server-only";
import { asc, sql } from "drizzle-orm";
import { db, users } from "@/db";
import { EMAIL_KEY_SQL, emailKey } from "@/lib/trial";

/**
 * The account an email typed at sign-in or "forgot password" belongs to. Capitals never matter; for Gmail, dots and a
 * +tag don't either (Google sign-ups keep the address as Google gives it, which may differ from what the user types).
 * The exact address wins; otherwise the same inbox, if only one account has it.
 */
export async function userByEmail(typed: string) {
  const mail = typed.trim().toLowerCase();
  const [exact] = await db.select().from(users).where(sql`lower(${users.email}) = ${mail}`).orderBy(asc(users.createdAt)).limit(1);
  if (exact) return exact;
  const same = await db.select().from(users).where(sql`${sql.raw(EMAIL_KEY_SQL)} = ${emailKey(mail)}`).limit(2);
  return same.length === 1 ? same[0] : undefined;
}
