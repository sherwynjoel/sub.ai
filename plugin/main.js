/* Vasanam panel — CEP (Chromium + Node.js) side. Talks to the Vasanam API and to host.jsx. */
(function () {
  var req = typeof require === "function" ? require : window.cep_node.require;
  var fs = req("fs"), path = req("path"), os = req("os"), http = req("http"), https = req("https");
  // CEF's window.URL is not Node's URL class, so http.request would misread it as the options object.
  var NodeURL = req("url").URL, Buffer = req("buffer").Buffer;

  var DEFAULT_SERVER = "http://localhost:3000"; // set to your live domain before packaging
  var cep = window.__adobe_cep__;
  var HOST = JSON.parse(cep.getHostEnvironment()).appName; // "PPRO" or "AEFT"
  var $ = function (id) { return document.getElementById(id); };
  var picked = null, lastJob = null;
  var editing = null; // { job, cues, dirty, styleId, custom } once a job has subtitles
  // PostScript names After Effects uses for the bundled caption fonts (website -> Plugin -> caption fonts zip).
  var PS_FONTS = { "Instrument Sans": "InstrumentSans-Regular", "Archivo Black": "ArchivoBlack-Regular", "Bebas Neue": "BebasNeue-Regular", "Anton": "Anton-Regular", "Bangers": "Bangers-Regular", "DM Serif Display": "DMSerifDisplay-Regular", "Fraunces": "Fraunces-Regular", "Caveat": "Caveat-Regular", "Permanent Marker": "PermanentMarker-Regular", "Special Elite": "SpecialElite-Regular", "Press Start 2P": "PressStart2P-Regular" };
  function rgb(hex) { hex = (hex || "#ffffff").slice(1, 7); return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; }); }

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) { return ""; } }
  function server() { return (store("vs_server") || DEFAULT_SERVER).replace(/\/+$/, ""); }
  var evalHost = function (script) { return new Promise(function (r) { cep.evalScript(script, r); }); };
  function show(id) { ["connect", "main"].forEach(function (s) { $(s).hidden = s !== id; }); $("settingsBtn").hidden = $("account").hidden = id !== "main"; }
  // details: technical text for the tooltip (which template controls were set), not for the message itself.
  function say(text, cls, details) { $("msg").textContent = text; $("msg").className = cls || ""; $("msg").title = details || ""; }
  // Host replies are "OK|message|details" or "ERR|message".
  function reply(res) { var p = String(res).split("|"); return { ok: p[0] === "OK", text: p[1] || String(res), details: p.slice(2).join(" ") }; }
  var minutesLeft = null; // from /api/me; 0 = nothing left to generate with
  function updateGo() {
    $("goBtn").disabled = !picked || minutesLeft === 0;
    $("goBtn").title = minutesLeft === 0 ? "No minutes left on your plan" : !picked ? "Select a clip first" : "";
  }

  // Generate | Edit subtitles: one screen at a time, the action bar follows.
  function view(name) {
    ["setup", "editor"].forEach(function (v) { $(v).hidden = v !== name; });
    Array.prototype.forEach.call(document.querySelectorAll ? document.querySelectorAll("#tabs button, .dock .actions") : [], function (el) {
      var v = el.getAttribute("data-view") || el.getAttribute("data-for");
      if (el.tagName === "BUTTON") el.className = v === name ? "on" : ""; else el.hidden = v !== name;
    });
    if (typeof scrollTo === "function") scrollTo(0, 0);
  }
  if (document.querySelectorAll) Array.prototype.forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.onclick = function () { view(b.getAttribute("data-view")); }; });

  /** Minimal HTTP client on Node. body may be a string or a file path ({file}). */
  function api(method, p, body, onProgress) {
    return new Promise(function (resolve, reject) {
      var url = new NodeURL(server() + p);
      var lib = url.protocol === "https:" ? https : http;
      var headers = { authorization: "Bearer " + store("vs_key") };
      var size = 0;
      if (body && body.file) { size = fs.statSync(body.file).size; headers["content-length"] = size; headers["content-type"] = "application/octet-stream"; }
      var json = body && body.json ? Buffer.from(JSON.stringify(body.json)) : null;
      if (json) { headers["content-type"] = "application/json"; headers["content-length"] = json.length; }
      var r = lib.request(url, { method: method, headers: headers }, function (res) {
        var chunks = [];
        res.on("data", function (c) { chunks.push(c); });
        res.on("end", function () {
          var data = {};
          try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) {}
          resolve({ status: res.statusCode, data: data });
        });
      });
      r.on("error", function (e) { reject(new Error("Can't reach " + url.host + ": " + e.message)); });
      r.setTimeout(body && body.file ? 30 * 60e3 : 30e3, function () { r.destroy(new Error("no answer in time")); }); // a wrong address otherwise hangs silently
      if (body && body.file) {
        var sent = 0;
        fs.createReadStream(body.file)
          .on("data", function (c) { sent += c.length; if (onProgress) onProgress(sent / size); })
          .on("error", reject)
          .pipe(r);
      } else r.end(json || undefined);
    });
  }

  // ---------- account ----------
  function refreshAccount() {
    return api("GET", "/api/me").then(function (r) {
      if (r.status !== 200) { show("connect"); return false; }
      minutesLeft = Math.floor(r.data.secondsLeft / 60);
      $("account").textContent = minutesLeft + " min left";
      $("account").title = r.data.name + " · " + r.data.planName + " plan · " + minutesLeft + " min left";
      $("account").className = "chip" + (minutesLeft === 0 ? " warn" : "");
      show("main");
      updateGo();
      if (minutesLeft === 0 && !$("msg").textContent) say("No minutes left on your " + r.data.planName + " plan. Upgrade on the website to generate more.", "error");
      return true;
    });
  }

  $("connectBtn").onclick = function () {
    // An empty box keeps the saved key (Account → Connect used to sign people out).
    if ($("key").value.trim()) store("vs_key", $("key").value.trim());
    if ($("server").value.trim()) store("vs_server", $("server").value.trim());
    $("connectMsg").textContent = "";
    $("connectMsg").textContent = "Connecting to " + server() + "…";
    refreshAccount().then(function (ok) { if (!ok) $("connectMsg").textContent = "That key was not accepted by " + server() + ". Check the website address matches the site where you created the key."; })
      .catch(function (e) { $("connectMsg").textContent = e.message; });
  };
  // Premiere can keep Cmd/Ctrl+V for its own Edit menu and panels have no right-click menu, so the key box has a
  // Paste button that reads the system clipboard directly.
  function readClipboard() {
    var cp = req("child_process");
    return os.platform() === "win32"
      ? cp.execSync("powershell -NoProfile -Command Get-Clipboard", { encoding: "utf8", timeout: 5000, windowsHide: true })
      : cp.execSync("pbpaste", { encoding: "utf8", timeout: 5000 });
  }
  $("pasteKeyBtn").onclick = function () {
    var text = "";
    try { text = String(readClipboard()).replace(/\s+/g, ""); } catch (e) { $("connectMsg").textContent = "Couldn't read the clipboard. Type the key instead."; return; }
    if (!text) { $("connectMsg").textContent = "The clipboard is empty. Copy the key on the website first."; return; }
    $("key").value = text;
    $("connectMsg").textContent = /^vsn_/.test(text) ? "" : "That doesn't look like a Vasanam key (they start with vsn_). Copy it again from the website's Plugin page.";
  };
  $("settingsBtn").onclick = function () {
    $("server").value = server();
    $("key").value = "";
    $("key").placeholder = store("vs_key") ? "Leave empty to keep your current key" : "vsn_…";
    $("connectMsg").textContent = "";
    $("backBtn").hidden = !store("vs_key");
    show("connect");
  };
  $("backBtn").onclick = function () { show("main"); };

  // ---------- pick media ----------
  $("pickBtn").onclick = function () {
    evalHost(HOST === "PPRO" ? "vs_pproPickMedia()" : "vs_aePickMedia()").then(function (res) {
      var parts = String(res).split("|");
      if (parts[0] !== "OK") { picked = null; updateGo(); $("clip").textContent = "Nothing selected"; return say(parts[1] || String(res), "error"); }
      picked = { file: parts[1], offset: +parts[2], inS: +parts[3], outS: +parts[4], name: parts.slice(5).join("|") };
      $("clip").textContent = picked.name;
      $("clip").title = picked.file;
      updateGo();
      say("");
    });
  };

  // ---------- generate ----------
  function progress(pct, text) {
    $("progress").hidden = false;
    $("bar").style.width = Math.round(pct) + "%";
    $("status").textContent = text;
  }

  function wait(id) {
    return new Promise(function (resolve, reject) {
      (function poll() {
        api("GET", "/api/jobs/" + id).then(function (r) {
          var j = r.data;
          if (r.status !== 200) return reject(new Error(j.error || "Lost track of the job."));
          if (j.status === "done") return resolve(j);
          if (j.status === "failed") return reject(new Error(j.error || "Subtitling failed."));
          progress(40 + j.progress * 0.55, j.status === "queued" ? "Waiting in line…" : "Writing subtitles… " + j.progress + "%");
          setTimeout(poll, 3000);
        }, reject);
      })();
    });
  }

  // Motion Graphics Templates shipped with the panel (templates.json lists each one's text and colour control).
  // CEP gives the folder as a file:// URL with %20 escapes; Node needs a plain path (and no leading slash before a Windows drive letter).
  var EXT = decodeURI(cep.getSystemPath("extension")).replace(/^file:\/\//, "").replace(/^\/([A-Za-z]:)/, "$1");
  var TEMPLATES = [];
  try { TEMPLATES = JSON.parse(fs.readFileSync(path.join(EXT, "templates.json"), "utf8")); } catch (e) {}
  function template() { var id = $("styleMain").value; for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i]; return null; }

  function placeOnTimeline(job, lang) {
    // The user's line count: the editor's Lines once a project is open, else the main screen's (empty = Auto).
    var lines = editing ? editing.custom.lines : (+$("linesMain").value || undefined);
    var cues = window.Subs.placeCues(job.cues, picked.offset, picked.inS, picked.outS);
    if (!cues.length) return Promise.resolve("OK|No speech was found in this clip.");
    var tpl = HOST === "PPRO" ? template() : null;
    if (tpl) {
      return loadLook(job.id).then(function (d) {
        var l = d.look;
        l.customColor = d.custom && d.custom.color; // only a colour the user picked overrides the template's own
        l.lines = lines || 0; // a chosen line count is kept exactly; 0 lets the template split long lines
        var items = cues.map(function (c) {
          var text = window.Subs.textOf(c, lang, "\r", lines);
          return { start: c.start, end: c.end, text: l.caps ? text.toUpperCase() : l.lower ? text.toLowerCase() : text };
        });
        var arg = JSON.stringify(items).split("\u2028").join("\\u2028").split("\u2029").join("\\u2029");
        var t = { path: path.join(EXT, "templates", tpl.file), text: tpl.text, color: tpl.color, w: tpl.w, h: tpl.h, layout: tpl.layout };
        return evalHost("vs_pproAddGraphics(" + arg + ", " + JSON.stringify(l) + ", " + JSON.stringify(t) + ", " + JSON.stringify(picked.file) + ")");
      });
    }
    if (HOST === "PPRO") {
      var dir = path.join(os.tmpdir(), "vasanam");
      fs.mkdirSync(dir, { recursive: true });
      var file = path.join(dir, picked.name.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") + "." + lang + "." + Date.now() + ".srt");
      fs.writeFileSync(file, "\uFEFF" + window.Subs.toSrt(cues, lang, lines), "utf8");
      return evalHost("vs_pproImportSrt(" + JSON.stringify(file) + ")");
    }
    var layers = cues.map(function (c) { return { start: c.start, end: c.end, text: window.Subs.textOf(c, lang, "\r", lines) }; });
    // U+2028/2029 are line breaks inside ExtendScript string literals; escape them.
    var arg = JSON.stringify(layers).split("\u2028").join("\\u2028").split("\u2029").join("\\u2029");
    return loadLook(job.id).then(function (d) { return evalHost("vs_aeAddTextLayers(" + arg + ", " + JSON.stringify(aeLook(d.look)) + ")"); });
  }

  $("goBtn").onclick = function () {
    if (!picked) return;
    var lang = $("lang").value, jobData = null;
    $("goBtn").disabled = true;
    $("openBtn").hidden = true;
    $("tabs").hidden = true;
    view("setup");
    editing = null;
    say("");
    progress(0, "Uploading " + picked.name + "…");
    store("vs_style", $("styleMain").value);
    store("vs_safe", $("safeMain").value);
    store("vs_lines", $("linesMain").value);
    api("POST", "/api/upload?name=" + encodeURIComponent(picked.name) + "&lang=" + $("language").value + "&script=" + $("script").value + "&english=" + ($("english").checked ? 1 : 0) + (HOST === "PPRO" ? "" : "&style=" + $("styleMain").value) + "&safe=" + $("safeMain").value, { file: picked.file }, function (f) { progress(f * 40, "Uploading… " + Math.round(f * 100) + "%"); })
      .then(function (r) {
        if (r.status !== 201) throw new Error(r.data.error || "Upload failed (" + r.status + ").");
        lastJob = r.data.id;
        // Save a chosen line count with the project so the web editor and exports use it too.
        var n = +$("linesMain").value, safe = $("safeMain").value;
        var saved = n ? api("PATCH", "/api/jobs/" + r.data.id, { json: { captionCustom: Object.assign(safe !== "none" ? { safe: safe } : {}, { lines: n }) } }) : Promise.resolve();
        return saved.then(function () { return wait(r.data.id); });
      })
      .then(function (job) { jobData = job; progress(97, "Placing subtitles…"); return placeOnTimeline(job, lang); })
      .then(function (res) {
        var r = reply(res);
        $("progress").hidden = true;
        say(r.ok ? r.text : "Subtitles are ready, but " + r.text, r.ok ? "ok" : "error", r.details);
        if (jobData) return openEditor(jobData);
      })
      .catch(function (e) { $("progress").hidden = true; say(e.message, "error"); })
      .then(function () { $("openBtn").hidden = !lastJob; return refreshAccount(); })
      .catch(function () {})
      .then(updateGo);
  };

  $("openBtn").onclick = function () { window.cep.util.openURLInDefaultBrowser(server() + "/app/jobs/" + lastJob); };

  // ---------- edit text and look ----------
  function loadLook(id) {
    var portrait = HOST === "AEFT" ? evalHost("vs_aeIsPortrait()").then(function (r) { return String(r).split("|")[1] === "1"; }) : Promise.resolve(false);
    return portrait.then(function (p) { return api("GET", "/api/jobs/" + id + "/look" + (p ? "?portrait=1" : "")); })
      .then(function (r) { if (r.status !== 200) throw new Error(r.data.error || "Couldn't load the caption look."); return r.data; });
  }
  function aeLook(l) {
    return { font: PS_FONTS[l.font] || l.font, size: l.size, color: rgb(l.color), stroke: l.outline ? rgb(l.outline[0]) : null, strokeWidth: l.outline ? l.outline[1] : 0, position: l.position, offset: l.offset, x: l.x, y: l.y, safe: l.safe };
  }
  function fill(sel, items, value) {
    sel.innerHTML = "";
    items.forEach(function (it) { var o = document.createElement("option"); o.value = it[0]; o.textContent = it[1]; sel.appendChild(o); });
    sel.value = value;
    if (sel.selectedIndex < 0) sel.selectedIndex = 0; // a remembered choice that no longer exists must not leave the list blank
  }
  function showLook(d) {
    editing.styleId = d.styleId;
    editing.custom = d.custom || {};
    fill($("style"), d.styles.map(function (x) { return [x.id, x.name + " · " + x.group]; }), d.styleId);
    fill($("font"), d.fonts.map(function (f) { return [f, f]; }), d.look.font);
    $("size").value = d.look.size;
    $("color").value = d.look.color.slice(0, 7);
    $("accent").value = (d.look.accent || "#ffe14d").slice(0, 7);
    $("position").value = d.look.position;
    fill($("safe"), (d.safeZones || []).map(function (z) { return [z.id, z.name]; }), d.look.safeId || "none");
    $("lines").value = d.look.lines || "";
    showSize();
    lookControls();
  }
  function showSize() { $("sizeVal").textContent = Math.round(+$("size").value * 100) + "%"; }
  // Only the controls that change what lands on the timeline: all of them for After Effects text layers; size,
  // colour, position, lines and safe zone for Premiere templates; lines for the plain caption track.
  function lookControls() {
    var ae = HOST !== "PPRO", tpl = !ae && !!template();
    var on = ae ? ["lkStyle", "lkFont", "lkSize", "lkColors", "lkColor", "lkAccent", "lkPosition", "lkLines", "lkSafe"]
      : tpl ? ["lkSize", "lkColors", "lkColor", "lkPosition", "lkLines", "lkSafe"] : ["lkLines"];
    ["lkStyle", "lkFont", "lkSize", "lkColors", "lkColor", "lkAccent", "lkPosition", "lkLines", "lkSafe"].forEach(function (id) { $(id).hidden = on.indexOf(id) < 0; });
    $("lookNote").textContent = ae
      ? "Text layers get this font, size, colours and position. Install the caption fonts (website → Plugin) to see the exact font."
      : tpl ? "Changes apply when you place on the timeline again. The rest of the look comes from the template."
        : "Font, colour and position of the caption track are set in Premiere's Essential Graphics panel.";
  }
  // Edits wait for "Update timeline"; say so, so nobody wonders why the timeline didn't change.
  var pending = false;
  function changed() { pending = true; say("Not on the timeline yet — click Update timeline.", ""); }
  function grow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; } // whole line visible, any panel width
  function openEditor(job) {
    editing = { job: job, cues: job.cues.map(function (c) { return { start: c.start, end: c.end, ta: c.ta, en: c.en }; }), dirty: false, styleId: "", custom: {} };
    pending = false;
    var box = $("cues"), hasEnglish = editing.cues.some(function (c) { return c.en; });
    box.innerHTML = "";
    editing.cues.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "cue";
      var t = document.createElement("button");
      t.type = "button";
      t.className = "time";
      t.title = "Jump to this line in " + (HOST === "PPRO" ? "Premiere" : "After Effects");
      t.textContent = window.Subs.stamp(c.start).slice(0, 8) + " → " + window.Subs.stamp(c.end).slice(0, 8);
      t.onclick = function () { if (picked) evalHost("vs_seek(" + Math.max(0, c.start + picked.offset) + ")"); };
      row.appendChild(t);
      (hasEnglish ? ["ta", "en"] : ["ta"]).forEach(function (k) {
        var inp = document.createElement("textarea");
        inp.rows = 1;
        inp.value = c[k];
        inp.setAttribute("aria-label", k === "en" ? "English" : "Subtitle");
        inp.oninput = function () { c[k] = inp.value.replace(/\n/g, " "); editing.dirty = true; grow(inp); changed(); };
        row.appendChild(inp);
      });
      box.appendChild(row);
    });
    setTimeout(function () { Array.prototype.forEach.call(box.querySelectorAll ? box.querySelectorAll("textarea") : [], grow); }, 0);
    return loadLook(job.id).then(function (d) { showLook(d); $("tabs").hidden = false; view("editor"); });
  }
  function tweak(patch) {
    for (var k in patch) { if (patch[k] === undefined || patch[k] === "") delete editing.custom[k]; else editing.custom[k] = patch[k]; }
    changed();
  }
  function saveLook() { return api("PATCH", "/api/jobs/" + editing.job.id, { json: { captionStyle: editing.styleId, captionCustom: editing.custom } }); }
  function saveCues() {
    if (!editing.dirty) return Promise.resolve({ status: 200, data: {} });
    return api("PATCH", "/api/jobs/" + editing.job.id, { json: { cues: editing.cues } }).then(function (r) {
      if (r.status === 200) { editing.dirty = false; editing.job.cues = editing.cues; }
      return r;
    });
  }
  // A new style starts clean (same as the website); it is saved at once so the look below reflects it.
  $("style").onchange = function () {
    editing.styleId = $("style").value;
    editing.custom = {};
    saveLook().then(function () { return loadLook(editing.job.id); }).then(showLook).catch(function (e) { say(e.message, "error"); });
  };
  $("font").onchange = function () { tweak({ font: $("font").value }); };
  $("size").oninput = function () { tweak({ size: +$("size").value }); showSize(); };
  $("color").oninput = function () { tweak({ color: $("color").value }); };
  $("accent").oninput = function () { tweak({ accent: $("accent").value }); };
  $("position").onchange = function () { tweak({ position: $("position").value }); };
  $("safe").onchange = function () { tweak({ safe: $("safe").value === "none" ? undefined : $("safe").value }); };
  $("lines").onchange = function () {
    tweak({ lines: $("lines").value ? +$("lines").value : undefined });
    $("linesMain").value = $("lines").value; // the next project starts with the same choice
    store("vs_lines", $("lines").value);
  };
  $("saveBtn").onclick = function () {
    say("");
    Promise.all([saveCues(), saveLook()]).then(function (rs) {
      var bad = rs.filter(function (r) { return r.status !== 200; })[0];
      say(bad ? (bad.data.error || "Couldn't save.") : pending ? "Saved. Click Update timeline to put the changes on your timeline." : "Saved.", bad ? "error" : "ok");
    }).catch(function (e) { say(e.message, "error"); });
  };
  $("placeBtn").onclick = function () {
    say("");
    $("placeBtn").disabled = true;
    Promise.all([saveCues(), saveLook()])
      .then(function () { return placeOnTimeline(editing.job, $("lang").value); })
      .then(function (res) {
        var r = reply(res);
        if (r.ok) pending = false;
        // Template graphics replace the earlier ones; a caption track is added alongside the old one.
        say(r.text + (r.ok && HOST === "PPRO" && !template() ? " Delete the older caption track if you placed one before." : ""), r.ok ? "ok" : "error", r.details);
      })
      .catch(function (e) { say(e.message, "error"); })
      .then(function () { $("placeBtn").disabled = false; });
  };

  // Without an English line, only "That language" can go on the timeline.
  $("english").onchange = function () {
    var on = $("english").checked;
    Array.prototype.forEach.call($("lang").options, function (o) { o.disabled = !on && o.value !== "ta"; });
    if (!on) $("lang").value = "ta";
    $("lang").onchange();
  };
  // Lines count per language: with both stacked, the caption has twice as many.
  $("lang").onchange = function () { $("linesHint").hidden = $("lang").value !== "both"; };

  // ---------- style previews (Premiere) ----------
  // A template's picture: templates/previews/<id>.png (cropped to the text, shipped with the templates), else the
  // thumbnail inside the .mogrt itself (a zip), unpacked once into a temp folder.
  function preview(t) {
    var own = path.join(EXT, "templates", "previews", t.id + ".png");
    if (fs.existsSync(own)) return own;
    var file = path.join(EXT, "templates", t.file), dir = path.join(os.tmpdir(), "vasanam-thumbs"), out = path.join(dir, t.id + ".png");
    try {
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) return out;
      var zip = fs.readFileSync(file), end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); // end of central directory
      for (var i = 0, n = zip.readUInt16LE(end + 10), p = zip.readUInt32LE(end + 16); i < n; i++) {
        var nameLen = zip.readUInt16LE(p + 28), name = zip.toString("utf8", p + 46, p + 46 + nameLen);
        if (name === "thumb.png") {
          var at = zip.readUInt32LE(p + 42), start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
          var data = zip.slice(start, start + zip.readUInt32LE(p + 20));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(out, zip.readUInt16LE(p + 10) === 8 ? req("zlib").inflateRawSync(data) : data);
          return out;
        }
        p += 46 + nameLen + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
      }
    } catch (e) {}
    return null;
  }
  function fileUrl(p) { p = p.replace(/\\/g, "/"); return "file://" + (p.charAt(0) === "/" ? "" : "/") + encodeURI(p); }

  // The Style setting as pictures: the chosen style with a Change button; Change opens every style as a grid in the
  // page (no box scrolling inside the panel) and picking one closes it. The hidden <select> keeps the value.
  function styleTile(o, i, sel) {
    var t = TEMPLATES.filter(function (x) { return x.id === o.value; })[0];
    var tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile" + (i === sel.selectedIndex ? " on" : "");
    tile.title = o.textContent;
    var pic = document.createElement("span"), src = t ? preview(t) : null;
    pic.className = "pic" + (src ? "" : " plain");
    if (src) { var img = document.createElement("img"); img.src = fileUrl(src); img.alt = ""; pic.appendChild(img); }
    else pic.textContent = t ? t.name : "Caption track";
    var label = document.createElement("span");
    label.className = "name";
    label.textContent = t ? t.name : "Plain captions";
    tile.appendChild(pic);
    tile.appendChild(label);
    return tile;
  }
  function renderCurrent() {
    var c = $("styleCurrent"), sel = $("styleMain"), open = !$("styleGallery").hidden;
    c.innerHTML = "";
    var tile = styleTile(sel.options[sel.selectedIndex], sel.selectedIndex, sel);
    tile.tabIndex = -1;
    tile.onclick = function () { toggleGallery(true); };
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost small";
    btn.textContent = open ? "Done" : "Change";
    btn.onclick = function () { toggleGallery(!open); };
    c.appendChild(tile);
    c.appendChild(btn);
  }
  function toggleGallery(open) {
    $("styleGallery").hidden = !open;
    if (open) renderGallery();
    renderCurrent();
  }
  function renderGallery() {
    var g = $("styleGallery"), sel = $("styleMain");
    g.innerHTML = "";
    Array.prototype.forEach.call(sel.options, function (o, i) {
      var tile = styleTile(o, i, sel), t = TEMPLATES.filter(function (x) { return x.id === o.value; })[0];
      tile.disabled = o.disabled;
      tile.setAttribute("role", "option");
      tile.setAttribute("aria-selected", i === sel.selectedIndex ? "true" : "false");
      if (o.disabled) { var badge = document.createElement("span"); badge.className = "badge"; badge.textContent = "Premiere " + (2000 + t.minPremiere); tile.appendChild(badge); }
      tile.onclick = function () {
        if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); }
        toggleGallery(false);
      };
      g.appendChild(tile);
    });
  }

  // Style list for the main screen: Premiere picks a shipped template (or a plain caption track), After Effects the website looks. The last choice is remembered.
  if (HOST === "PPRO") {
    // Templates exported from a newer After Effects (minPremiere in templates.json) don't import into an older Premiere:
    // they stay in the list, greyed out, at the end.
    var major = parseInt(JSON.parse(cep.getHostEnvironment()).appVersion, 10) || 0;
    var fits = TEMPLATES.filter(function (t) { return !(t.minPremiere > major); }), newer = TEMPLATES.filter(function (t) { return t.minPremiere > major; });
    var remembered = newer.some(function (t) { return t.id === store("vs_style"); }) ? "" : store("vs_style");
    fill($("styleMain"), [["", "Plain captions (Premiere caption track)"]].concat(fits.concat(newer).map(function (t) {
      return [t.id, t.name + (t.minPremiere > major ? " · needs Premiere " + (2000 + t.minPremiere) : "")];
    })), remembered); // plain captions until the user picks a template
    Array.prototype.forEach.call($("styleMain").options, function (o) { o.disabled = newer.some(function (t) { return t.id === o.value; }); });
    if (typeof document.addEventListener === "function") { // not in the Node test's fake DOM
      $("styleSelectRow").hidden = true;
      $("styleCurrent").hidden = false;
      $("styleMain").addEventListener("change", function () { renderCurrent(); if (editing) lookControls(); });
      renderCurrent();
    }
  } else {
    api("GET", "/api/styles").then(function (r) {
      if (r.status === 200) fill($("styleMain"), r.data.styles.map(function (x) { return [x.id, x.name + " · " + x.group]; }), store("vs_style") || r.data.defaultStyle);
    }).catch(function () {});
  }

  // Premiere swallows Cmd/Ctrl+V/C/X/A inside panels unless the panel claims them (Mac virtual key codes, then Windows ones).
  try {
    cep.registerKeyEventsInterest(JSON.stringify([
      { keyCode: 9, metaKey: true }, { keyCode: 8, metaKey: true }, { keyCode: 7, metaKey: true }, { keyCode: 0, metaKey: true },
      { keyCode: 86, ctrlKey: true }, { keyCode: 67, ctrlKey: true }, { keyCode: 88, ctrlKey: true }, { keyCode: 65, ctrlKey: true },
    ]));
  } catch (e) {}

  // ---------- dropdowns ----------
  // Premiere 2025's panel browser (CEP 12, Chromium 99) on macOS gets the click on a <select> but never shows its
  // menu. Every select opens this list instead; the <select> keeps the value, so .value and onchange work as before.
  (function () {
    if (typeof document.addEventListener !== "function") return; // the Node test's fake DOM
    var open = null;
    function close() { if (open && open.parentNode) open.parentNode.removeChild(open); open = null; } // also if already gone
    function show(sel) {
      var list = document.createElement("div");
      list.className = "picker";
      list.setAttribute("role", "listbox");
      Array.prototype.forEach.call(sel.options, function (o, i) {
        var item = document.createElement("div");
        item.className = "pick" + (i === sel.selectedIndex ? " on" : "") + (o.disabled ? " off" : "");
        item.setAttribute("role", "option");
        item.textContent = o.textContent;
        if (!o.disabled) item.addEventListener("mousedown", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          close();
          if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); }
        });
        list.appendChild(item);
      });
      // Open below the field, or above it when there is more room there.
      var r = sel.getBoundingClientRect(), below = innerHeight - r.bottom - 8, above = r.top - 8;
      list.style.left = r.left + "px";
      list.style.width = r.width + "px";
      if (below >= 160 || below >= above) { list.style.top = r.bottom + 2 + "px"; list.style.maxHeight = below + "px"; }
      else { list.style.bottom = innerHeight - r.top + 2 + "px"; list.style.maxHeight = above + "px"; }
      document.body.appendChild(list);
      open = list;
      var on = list.querySelector(".on");
      if (on) on.scrollIntoView({ block: "nearest" });
    }
    document.addEventListener("mousedown", function (ev) {
      if (open && open.contains(ev.target)) return;
      var sel = ev.target && ev.target.closest && ev.target.closest("select"), was = open;
      close();
      if (!sel || sel.disabled || !sel.offsetParent) return; // hidden selects can't be clicked
      ev.preventDefault();
      // Without preventScroll, focusing a select half under the action bar scrolls the page, and the scroll closes the list.
      sel.focus({ preventScroll: true });
      if (!was || was.dataset.for !== sel.id) { show(sel); open.dataset.for = sel.id; } // a second click closes it
    }, true);
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); }, true);
    document.addEventListener("scroll", function (ev) { if (open && !open.contains(ev.target)) close(); }, true);
    addEventListener("blur", close);
    addEventListener("resize", close);
  })();

  // Safe zone for new projects, chosen before generating (list in index.html, same ids as lib/captionStyles.ts); the last choice is remembered.
  if (store("vs_safe")) $("safeMain").value = store("vs_safe");
  $("linesMain").value = store("vs_lines"); // lines per caption, Auto until the user picks
  $("english").onchange(); // also sets the Lines hint

  // ---------- developer test mode ----------
  // Only when <tmp>/vasanam-dev/ exists (never on customer machines): the panel runs commands written to
  // cmd.json there and appends what happened, including every Premiere call and its answer, to log.txt.
  var DEV = path.join(os.tmpdir(), "vasanam-dev");
  if (fs.existsSync(DEV)) {
    var log = function (line) { fs.appendFileSync(path.join(DEV, "log.txt"), new Date().toISOString().slice(11, 19) + " " + line + "\n"); };
    var host = evalHost;
    evalHost = function (script) { return host(script).then(function (r) { log("host " + script.slice(0, 60).replace(/\s+/g, " ") + " -> " + String(r).slice(0, 600)); return r; }); };
    var watch = new MutationObserver(function () { if ($("msg").textContent) log("msg " + $("msg").textContent); });
    watch.observe($("msg"), { childList: true, characterData: true, subtree: true });
    log("dev mode on, " + HOST + ", v" + (document.querySelector(".logo small") || {}).textContent);
    setInterval(function () {
      var f = path.join(DEV, "cmd.json");
      if (!fs.existsSync(f)) return;
      var c; try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return; }
      fs.unlinkSync(f);
      log("cmd " + JSON.stringify(c));
      if (c.server) store("vs_server", c.server);
      if (c.key) store("vs_key", c.key);
      if (c.connect) refreshAccount().then(function (ok) { log("connected " + ok + " " + $("account").textContent); });
      Object.keys(c.set || {}).forEach(function (id) { var el = $(id); if (el.type === "checkbox") el.checked = !!c.set[id]; else el.value = c.set[id]; if (el.onchange) el.onchange(); });
      ["pick", "go", "place"].forEach(function (a) { if (c[a]) $(a === "pick" ? "pickBtn" : a === "go" ? "goBtn" : "placeBtn").onclick(); });
    }, 1500);
  }

  // ---------- start ----------
  $("server").value = server();
  if (!store("vs_key")) show("connect");
  else refreshAccount().catch(function (e) { show("connect"); $("connectMsg").textContent = e.message; });
})();
