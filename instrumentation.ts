/** Runs once when the website starts: in Node, the every-5-minutes check that emails the admins when something breaks. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && !process.env.NO_ALERTS) {
    await import("./instrumentation-node");
  }
}
