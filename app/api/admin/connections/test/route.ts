import { json } from "@/lib/auth";
import { adminOrNull } from "@/lib/admin";
import { openaiApi } from "@/lib/ai";
import { PAID, PLANS } from "@/lib/plans";
import { razorpayPlanId, rzp } from "@/lib/razorpay";
import { getSecret } from "@/lib/secrets";

type Result = { ok: boolean; message: string };

async function check(url: string, headers: Record<string, string>): Promise<Result> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15e3) }).catch((e) => e as Error);
  if (res instanceof Error) return { ok: false, message: `Couldn't reach the server: ${res.message}` };
  if (res.status === 401 || res.status === 403 || res.status === 400) return { ok: false, message: "The key was rejected. Check it and save again." };
  if (!res.ok) return { ok: false, message: `The service answered ${res.status}. Try again in a minute.` };
  return { ok: true, message: "Connected." };
}

async function testRazorpay(): Promise<Result> {
  const plans: { items: { id: string; item: { name: string; amount: number } }[] } = await rzp("/plans?count=100");
  const notes = [];
  let ok = true;
  for (const p of PAID) {
    const id = await razorpayPlanId(p);
    const found = plans.items.find((x) => x.id === id);
    if (!id) { ok = false; notes.push(`${PLANS[p].name}: no plan ID saved`); }
    else if (!found) { ok = false; notes.push(`${PLANS[p].name}: ${id} not found in this Razorpay account`); }
    else {
      const rupees = found.item.amount / 100;
      notes.push(`${PLANS[p].name}: ${found.item.name}, ₹${rupees.toLocaleString("en-IN")}${rupees !== PLANS[p].priceInr ? ` (site shows ₹${PLANS[p].priceInr})` : ""}`);
    }
  }
  if (!(await getSecret("RAZORPAY_WEBHOOK_SECRET"))) { ok = false; notes.push("Webhook secret not saved"); }
  return { ok, message: `Keys work. ${notes.join(" · ")}` };
}

/** Checks a saved connection with a harmless read-only call. */
export async function POST(req: Request) {
  if (!(await adminOrNull())) return json({ error: "Admins only." }, 403);
  const { service } = await req.json().catch(() => ({}));
  try {
    if (service === "gemini") {
      const key = await getSecret("GEMINI_API_KEY");
      if (!key) return json({ ok: false, message: "No Gemini key saved yet." });
      return json(await check("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { "x-goog-api-key": key }));
    }
    if (service === "openai" || service === "groq" || service === "custom") {
      const api = await openaiApi(service);
      if (!api.apiKey || !api.baseUrl) return json({ ok: false, message: "Key or URL not saved yet." });
      return json(await check(`${api.baseUrl}/models`, { authorization: `Bearer ${api.apiKey}` }));
    }
    if (service === "razorpay") return json(await testRazorpay());
    return json({ error: "Unknown service." }, 400);
  } catch (e) {
    return json({ ok: false, message: (e as Error).message });
  }
}
