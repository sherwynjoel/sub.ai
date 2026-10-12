/** navigator.clipboard exists only on HTTPS or localhost; plain-HTTP LAN testing needs the old execCommand path. */
export async function copyText(text: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("Copy failed. Select the text and copy it by hand.");
}
