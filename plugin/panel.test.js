// Drives the real panel code (main.js) in Node with a fake panel DOM and a fake Premiere, against a live server.
// Covers everything except Premiere's own ExtendScript: template list, connect, pick, upload, poll, place, edit.
// Run:  VASANAM_SERVER=https://host VASANAM_LOGIN=email:password VASANAM_CLIP=/path/reel.mp4 node --test plugin/panel.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SERVER = process.env.VASANAM_SERVER, LOGIN = process.env.VASANAM_LOGIN, CLIP = process.env.VASANAM_CLIP;
const skip = !(SERVER && LOGIN && CLIP) && "set VASANAM_SERVER, VASANAM_LOGIN and VASANAM_CLIP to run the live panel test";

// ---------- fake DOM ----------
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
function element(tag, id) {
  const e = { tag, id, _value: "", textContent: "", hidden: false, disabled: false, checked: false, className: "", title: "", style: {}, options: [], children: [], selectedIndex: -1 };
  e.appendChild = (c) => { e.children.push(c); if (c.tag === "option") { e.options.push(c); if (e.selectedIndex < 0) e.selectedIndex = 0; } return c; };
  Object.defineProperty(e, "innerHTML", { get: () => "", set: () => { e.children = []; e.options = []; e.selectedIndex = -1; } });
  Object.defineProperty(e, "value", {
    get: () => (e.tag === "select" ? e.options[e.selectedIndex]?.value ?? "" : e._value),
    set: (v) => { if (e.tag === "select") e.selectedIndex = e.options.findIndex((o) => o.value === String(v)); else e._value = String(v); },
  });
  return e;
}
const els = {};
for (const m of html.matchAll(/<(select|input|button|p|span|div|section)\b[^>]*\bid="([^"]+)"[^>]*>/g)) els[m[2]] = element(m[1], m[2]);
for (const m of html.matchAll(/<select id="([^"]+)">([\s\S]*?)<\/select>/g)) {
  for (const o of m[2].matchAll(/<option value="([^"]*)">([^<]*)/g)) els[m[1]].appendChild(Object.assign(element("option"), { value: o[1], textContent: o[2] }));
}
for (const id of ["english"]) els[id].checked = html.includes(`id="${id}" checked`);
const document = { getElementById: (id) => els[id] ?? (els[id] = element("div", id)), createElement: (tag) => element(tag) };
const storage = new Map();
const localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) };

// ---------- fake Premiere ----------
const calls = [];
const cep = {
  getHostEnvironment: () => JSON.stringify({ appName: "PPRO", appVersion: "25.6.6" }),
  getSystemPath: () => "file:///" + encodeURI(path.resolve(__dirname).replace(/\\/g, "/")), // the file:// form CEP really returns
  registerKeyEventsInterest: () => {},
  evalScript: (script, cb) => {
    calls.push(script);
    if (/^vs_pproPickMedia/.test(script)) return cb(`OK|${CLIP}|0|0|37.6|reel.mp4`);
    if (/^vs_pproAddGraphics\(/.test(script)) {
      const args = new Function("vs_pproAddGraphics", "return " + script)((cues, look, tpl, media) => ({ cues, look, tpl, media }));
      calls.graphics = args;
      return cb(`OK|Added ${args.cues.length} styled captions on V2. Set: text, duration, position. Template controls: ${args.tpl.text}`);
    }
    if (/^vs_pproImportSrt/.test(script)) { calls.srt = script; return cb("OK|Added a caption track to Test."); }
    cb("ERR|unknown host call " + script.slice(0, 40));
  },
};
const window = { __adobe_cep__: cep, Subs: require("./subs.js"), cep: { util: { openURLInDefaultBrowser: () => {} } } };

const until = async (fn, ms, every = 250) => { for (const t0 = Date.now(); Date.now() - t0 < ms; ) { if (fn()) return true; await new Promise((r) => setTimeout(r, every)); } return false; };

test("panel: templates list, connect, pick, generate, place, edit against the live server", { skip, timeout: 15 * 60e3 }, async () => {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "main.js"), "utf8"), { require, document, window, localStorage, setTimeout, clearTimeout, console, Buffer }, { filename: "main.js" });

  // Template list: plain captions first, then every shipped template, nothing blank.
  const templates = JSON.parse(fs.readFileSync(path.join(__dirname, "templates.json"), "utf8"));
  assert.equal(els.styleMain.options.length, templates.length + 1, "style list = plain + templates");
  assert.equal(els.styleMain.options[0].value, "");
  assert.equal(els.styleMain.selectedIndex, 0, "nothing saved yet → first entry selected");
  // Premiere 25 can't import templates exported from After Effects 2026: listed last, greyed out.
  const newer = templates.filter((t) => t.minPremiere > 25).map((t) => t.id);
  assert.ok(newer.length > 0);
  assert.deepEqual(els.styleMain.options.filter((o) => o.disabled).map((o) => o.value).sort(), [...newer].sort());
  assert.ok(els.styleMain.options.slice(-newer.length).every((o) => o.disabled && /needs Premiere 2026/.test(o.textContent)));
  assert.ok(els.connect.hidden === false, "connect screen shown without a key");

  // Mint a key through the website API, as a user would from the Plugin page.
  const [email, password] = LOGIN.split(":");
  const login = await fetch(SERVER + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(login.status, 200, "login");
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const { key } = await (await fetch(SERVER + "/api/keys", { method: "POST", headers: { cookie } })).json();
  assert.match(key, /^vsn_/);

  // Connect.
  els.key.value = key; els.server.value = SERVER; els.connectBtn.onclick();
  assert.ok(await until(() => !els.main.hidden || /not accepted|Can't reach|no answer/.test(els.connectMsg.textContent), 40e3), "connect finished: " + els.connectMsg.textContent);
  assert.ok(!els.main.hidden, "main screen after connect: " + els.connectMsg.textContent);
  assert.match(els.account.textContent, /min left/);

  // Pick the clip (fake Premiere returns the selected clip).
  els.pickBtn.onclick();
  assert.ok(await until(() => els.clip.textContent === "reel.mp4", 5e3));
  assert.equal(els.goBtn.disabled, false);

  // Generate: Tamil, Roman letters, no English, Typewriter 01 template.
  els.language.value = "ta-IN"; els.script.value = "roman"; els.english.checked = false; els.lang.value = "ta"; els.styleMain.value = "typewriter-01";
  assert.ok(await until(() => els.safeMain.options.length > 2, 10e3), "safe zone list on the main screen");
  els.safeMain.value = "reels";
  assert.equal(els.styleMain.value, "typewriter-01", "template selectable");
  els.goBtn.onclick();
  assert.ok(await until(() => /Added|No speech/.test(els.msg.textContent) || els.msg.className === "error", 12 * 60e3, 2000), "generate finished: " + els.msg.textContent);
  assert.match(els.msg.textContent, /Added \d+ styled captions/, "placed as graphics: " + els.msg.textContent);
  const g = calls.graphics;
  assert.equal(g.look.safe.bottom, 0.22, "Reels zone chosen before generating reached Premiere");
  assert.ok(g, "graphics call reached Premiere");
  assert.ok(g.tpl.path.endsWith(path.join("templates", "typewriter-01.mogrt")) && fs.existsSync(g.tpl.path), "template file resolves: " + g.tpl.path);
  assert.equal(g.tpl.text, "Text 01");
  assert.ok(g.cues.length >= 10, "cues: " + g.cues.length);
  assert.ok(g.cues.every((c) => c.end > c.start && c.text), "every cue timed with text");
  assert.match(g.cues[0].text, /^[A-Za-z]/, "Roman letters: " + g.cues[0].text);
  assert.ok(!/[஀-௿]/.test(g.cues[0].text), "no Tamil script when Roman was asked");
  assert.equal(g.media, CLIP);
  assert.ok(["top", "middle", "bottom"].includes(g.look.position));
  assert.equal(els.openBtn.hidden, false);

  // Editor opened with the project's cues and the website styles.
  assert.equal(els.editor.hidden, false);
  assert.ok(els.cues.children.length >= 10, "editor rows");
  assert.ok(els.style.options.length >= 20, "website styles listed in Look");

  // Safe zone: pick TikTok in Look, place again; Premiere gets the zone.
  assert.ok(els.safe.options.some((o) => o.value === "tiktok"), "safe zone list");
  els.safe.value = "tiktok"; els.safe.onchange();
  const before = calls.length;
  els.placeBtn.onclick();
  assert.ok(await until(() => calls.length > before && /Added \d+ styled captions/.test(els.msg.textContent), 30e3), "place again: " + els.msg.textContent);
  assert.equal(calls.graphics.look.safe.bottom, 0.25, "TikTok zone reached Premiere");
  assert.ok(calls.graphics.look.offset >= 0.25, "caption above the bottom band");
  console.log(`cues ${g.cues.length}, first: ${g.cues[0].start.toFixed(1)}-${g.cues[0].end.toFixed(1)} "${g.cues[0].text}", template ${path.basename(g.tpl.path)}`);
});

test("host: captions wrap to fit the safe zone width", () => {
  const CR = String.fromCharCode(13);
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "host.jsx"), "utf8"), ctx);
  const none = { top: 0, right: 0.07, bottom: 0, left: 0.07 }, tiktok = { top: 0.1, right: 0.16, bottom: 0.25, left: 0.04 };
  const wide = ctx.vs_charBudget(1080, 1920, none, 1), narrow = ctx.vs_charBudget(1080, 1920, tiktok, 1);
  assert.ok(narrow < wide, `zone narrows the line: ${narrow} < ${wide}`);
  assert.ok(ctx.vs_charBudget(1920, 1080, none, 1) > wide, "landscape fits more per line");
  const text = "Naan eppavume cotton materials thaan prefer pannuven appadinnu solluvanga";
  const lay = ctx.vs_layout(text, narrow, 3), lines = lay.text.split(CR);
  assert.ok(lines.length > 1 && lines.length <= 3, JSON.stringify(lines));
  assert.equal(lines.join(" "), text, "no words lost");
  // Balanced: no line far longer than the others.
  assert.ok(Math.max(...lines.map((l) => l.length)) - Math.min(...lines.map((l) => l.length)) <= 12, JSON.stringify(lines));
  // Too long for 3 lines: still 3 lines, shrunk to fit.
  const long = ctx.vs_layout(text + " " + text, 20, 3);
  assert.equal(long.lines, 3); assert.ok(long.fit < 1 && long.fit > 0.3, "fit " + long.fit);
  // Short text untouched; Tamil + English keeps its split and gets at most 3 lines in total.
  assert.deepEqual([ctx.vs_layout("hi there", 30, 3).text, ctx.vs_layout("hi there", 30, 3).fit], ["hi there", 1]);
  assert.ok(ctx.vs_layout("ஒன்று இரண்டு மூன்று நான்கு ஐந்து" + CR + "one two three four five six", 12, 3).lines <= 3);
});

test("host: a template's text size covers the whole caption, not just its default word's length", () => {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "host.jsx"), "utf8"), ctx);
  // What Premiere 2026 returns for Santhosham's Source Text (its default word is 10 characters long).
  const premiere = '{"capPropFontEdit":true,"capPropFontFauxStyleEdit":true,"capPropFontSizeEdit":true,"capPropTextRunCount":1,"fontEditValue":["Coolvetica-Regular"],"fontFSAllCapsValue":[false],"fontFSBoldValue":[false],"fontFSItalicValue":[false],"fontFSSmallCapsValue":[false],"fontSizeEditValue":[91],"fontTextRunLength":[10],"textEditValue":"Santhosham"}';
  let saved;
  const prm = { getValue: () => premiere, setValue: (v) => { saved = v; } };
  const text = "Hi I am Saranya from\rSri Cotton Boutique";
  assert.equal(ctx.vs_setText(prm, text, 59.2), true);
  const v = JSON.parse(saved);
  assert.deepEqual([v.textEditValue, v.fontSizeEditValue, v.fontTextRunLength], [text, [59.2], [text.length]]);
  assert.equal(v.fontEditValue[0], "Coolvetica-Regular", "the rest of the style is untouched");
  // Several runs: earlier runs kept, the last one stretched; never fewer runs than per-run values.
  assert.deepEqual([...ctx.vs_runLengths([3, 7], 40)], [3, 37]);
  assert.deepEqual([...ctx.vs_runLengths([10], 4)], [4]);
  assert.deepEqual([...ctx.vs_runLengths([3, 7], 2)], [3, 7]);
});

test("host: template captions stay inside the template frame and the safe zone", () => {
  const CR = String.fromCharCode(13);
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "host.jsx"), "utf8"), ctx);
  const templates = JSON.parse(fs.readFileSync(path.join(__dirname, "templates.json"), "utf8"));
  assert.ok(templates.every((t) => t.w > 0 && t.h > 0 && t.layout && t.layout.charW > 0), "every template has its frame size and measured layout");
  const zones = { none: { top: 0, right: 0.07, bottom: 0, left: 0.07 }, tiktok: { top: 0.1, right: 0.16, bottom: 0.25, left: 0.04 } };
  const frames = [[1080, 1920], [1920, 1080]];
  const captions = ["Hi", "Hi I am Saranya from Sri Cotton Boutique, single saree", "நான் எப்பவுமே cotton materials தான் prefer" + CR + "They would say that I always prefer cotton"];
  for (const t of templates) for (const [W, H] of frames) for (const [zn, z] of Object.entries(zones)) for (const text of captions) {
    const xf = (z.left + 1 - z.right) / 2, yf = 0.8;
    const fit = ctx.vs_templateFit(text, t, W, H, z, 1, xf, yf), p = fit.place, lines = fit.text.split(CR);
    const L = t.layout, s = p.scale / 100, f = p.font / L.size;
    const w = Math.max(...lines.map((l) => l.length)) * L.charW * f; // longest line, template pixels
    const left = L.align === "left" ? L.x : L.x - w / 2, right = left + w;
    const at = `${t.id} ${W}x${H} ${zn} "${lines[0].slice(0, 12)}"`;
    assert.ok(left >= 0 && right <= t.w, `${at}: inside the template frame (${Math.round(left)}..${Math.round(right)} of ${t.w})`);
    const sl = p.x + (left - t.w / 2) * s, sr = p.x + (right - t.w / 2) * s; // on screen
    assert.ok(sl >= z.left * W - 1 && sr <= (1 - z.right) * W + 1, `${at}: inside the safe zone (${Math.round(sl)}..${Math.round(sr)} of ${W})`);
    assert.ok(Math.abs((sl + sr) / 2 - xf * W) <= 2, `${at}: centred on the safe zone`);
    assert.ok(p.font <= L.size && p.font > 0, `${at}: font only ever shrinks (${p.font})`);
    assert.equal(lines.join(" ").replace(/  ·  /g, " ").replace(/\s+/g, " "), text.split(CR).join(" ").replace(/\s+/g, " "), `${at}: no words lost`);
    const top = L.bottom - (L.bottom - L.top) * f, bottom = L.bottom + (lines.length - 1) * L.pitch * (L.fixedLeading ? 1 : f);
    const st = p.y + (top - t.h / 2) * s, sb = p.y + (bottom - t.h / 2) * s;
    assert.ok(top >= 0 && bottom <= t.h && st >= 0 && sb <= H, `${at}: inside the frame top to bottom`);
  }
  // Short captions keep the template's own font size; long ones shrink.
  const tw = templates.find((t) => t.id === "typewriter-01");
  assert.equal(ctx.vs_templatePlace(["Hi"], tw, 1080, 1920, zones.none, 1, 0.5, 0.8).font, 100);
  assert.ok(ctx.vs_templatePlace([captions[1]], tw, 1080, 1920, zones.none, 1, 0.5, 0.8).font < 100);
  // A long single line becomes two lines rather than tiny type; a caption with its own lines keeps them.
  assert.equal(ctx.vs_templateFit(captions[1], tw, 1080, 1920, zones.none, 1, 0.5, 0.8).text.split(CR).length, 2);
  assert.equal(ctx.vs_templateFit(captions[2], tw, 1080, 1920, zones.none, 1, 0.5, 0.8).text, captions[2]);
  // A chosen line count is kept exactly, except where a fixed line spacing leaves room for fewer (Cracked: one).
  const three = "Hi I am Saranya" + CR + "from Sri Cotton" + CR + "Boutique, single saree";
  assert.equal(ctx.vs_templateFit(three, tw, 1080, 1920, zones.none, 1, 0.5, 0.8, true).text, three);
  assert.equal(ctx.vs_templateFit("Hi I am Saranya from Sri Cotton Boutique, single saree", tw, 1080, 1920, zones.none, 1, 0.5, 0.8, true).text.split(CR).length, 1, "1 line stays 1 line");
  const crackedThree = ctx.vs_templateFit(three, templates.find((t) => t.id === "cracked"), 1080, 1920, zones.none, 1, 0.5, 0.8, true);
  assert.equal(crackedThree.fewer, 1); assert.ok(crackedThree.place.fits);
  // Fixed line spacing (Butter Up): a long line stays one line.
  const butter = templates.find((t) => t.id === "butter-up");
  assert.ok(butter.layout.fixedLeading);
  assert.equal(ctx.vs_templateFit(captions[1], butter, 1080, 1920, zones.none, 1, 0.5, 0.8).text, captions[1]);
  // Two languages that a fixed line spacing would push out of the frame (Cracked) share one line.
  const cracked = templates.find((t) => t.id === "cracked");
  assert.equal(ctx.vs_templateFit(captions[2], cracked, 1080, 1920, zones.none, 1, 0.5, 0.8).text, captions[2].replace(CR, "  ·  "));
});
