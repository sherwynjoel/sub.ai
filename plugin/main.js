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
  function evalHost(script) { return new Promise(function (r) { cep.evalScript(script, r); }); }
  function show(id) { ["connect", "main"].forEach(function (s) { $(s).hidden = s !== id; }); $("settingsBtn").hidden = id !== "main"; }
  function say(text, cls) { $("msg").textContent = text; $("msg").className = cls || ""; }

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
      if (r.status !== 200) { show("connect"); $("key").value = ""; return false; }
      $("account").textContent = r.data.name + " · " + r.data.planName + " plan · " + Math.floor(r.data.secondsLeft / 60) + " min left";
      show("main");
      return true;
    });
  }

  $("connectBtn").onclick = function () {
    store("vs_key", $("key").value.trim());
    if ($("server").value.trim()) store("vs_server", $("server").value.trim());
    $("connectMsg").textContent = "";
    refreshAccount().then(function (ok) { if (!ok) $("connectMsg").textContent = "That key didn't work. Create a new one on the website and paste it again."; })
      .catch(function (e) { $("connectMsg").textContent = e.message; });
  };
  $("settingsBtn").onclick = function () { $("server").value = server(); show("connect"); };

  // ---------- pick media ----------
  $("pickBtn").onclick = function () {
    evalHost(HOST === "PPRO" ? "vs_pproPickMedia()" : "vs_aePickMedia()").then(function (res) {
      var parts = String(res).split("|");
      if (parts[0] !== "OK") { picked = null; $("goBtn").disabled = true; $("clip").textContent = "Nothing selected"; return say(parts[1] || String(res), "error"); }
      picked = { file: parts[1], offset: +parts[2], inS: +parts[3], outS: +parts[4], name: parts.slice(5).join("|") };
      $("clip").textContent = picked.name;
      $("clip").title = picked.file;
      $("goBtn").disabled = false;
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

  function placeOnTimeline(job, lang) {
    var lines = editing ? editing.custom.lines : undefined;
    var cues = window.Subs.placeCues(job.cues, picked.offset, picked.inS, picked.outS);
    if (!cues.length) return Promise.resolve("OK|No speech was found in this clip.");
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
    $("editor").hidden = true;
    editing = null;
    say("");
    progress(0, "Uploading " + picked.name + "…");
    api("POST", "/api/upload?name=" + encodeURIComponent(picked.name) + "&lang=" + $("language").value, { file: picked.file }, function (f) { progress(f * 40, "Uploading… " + Math.round(f * 100) + "%"); })
      .then(function (r) {
        if (r.status !== 201) throw new Error(r.data.error || "Upload failed (" + r.status + ").");
        lastJob = r.data.id;
        return wait(r.data.id);
      })
      .then(function (job) { jobData = job; progress(97, "Placing subtitles…"); return placeOnTimeline(job, lang); })
      .then(function (res) {
        var parts = String(res).split("|");
        $("progress").hidden = true;
        say(parts[0] === "OK" ? parts[1] : "Subtitles are ready, but " + (parts[1] || res), parts[0] === "OK" ? "ok" : "error");
        if (jobData) return openEditor(jobData);
      })
      .catch(function (e) { $("progress").hidden = true; say(e.message, "error"); })
      .then(function () { $("goBtn").disabled = false; $("openBtn").hidden = !lastJob; refreshAccount(); });
  };

  $("openBtn").onclick = function () { window.cep.util.openURLInDefaultBrowser(server() + "/app/jobs/" + lastJob); };

  // ---------- edit text and look ----------
  function loadLook(id) {
    var portrait = HOST === "AEFT" ? evalHost("vs_aeIsPortrait()").then(function (r) { return String(r).split("|")[1] === "1"; }) : Promise.resolve(false);
    return portrait.then(function (p) { return api("GET", "/api/jobs/" + id + "/look" + (p ? "?portrait=1" : "")); })
      .then(function (r) { if (r.status !== 200) throw new Error(r.data.error || "Couldn't load the caption look."); return r.data; });
  }
  function aeLook(l) {
    return { font: PS_FONTS[l.font] || l.font, size: l.size, color: rgb(l.color), stroke: l.outline ? rgb(l.outline[0]) : null, strokeWidth: l.outline ? l.outline[1] : 0, position: l.position, offset: l.offset, x: l.x, y: l.y };
  }
  function fill(sel, items, value) {
    sel.innerHTML = "";
    items.forEach(function (it) { var o = document.createElement("option"); o.value = it[0]; o.textContent = it[1]; sel.appendChild(o); });
    sel.value = value;
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
    $("lines").value = d.look.lines || "";
    $("lookNote").textContent = HOST === "PPRO"
      ? "Text, timing and lines go onto the caption track. Font, colour and position for captions are set in Premiere's Essential Graphics panel."
      : "After Effects text layers get this font, size, colours, outline and position. Install the caption fonts (website → Plugin) to see the exact font.";
  }
  function openEditor(job) {
    editing = { job: job, cues: job.cues.map(function (c) { return { start: c.start, end: c.end, ta: c.ta, en: c.en }; }), dirty: false, styleId: "", custom: {} };
    var box = $("cues");
    box.innerHTML = "";
    editing.cues.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "cue";
      var t = document.createElement("span");
      t.className = "muted";
      t.textContent = window.Subs.stamp(c.start).slice(0, 8) + " → " + window.Subs.stamp(c.end).slice(0, 8);
      row.appendChild(t);
      ["ta", "en"].forEach(function (k) {
        var inp = document.createElement("input");
        inp.value = c[k];
        inp.oninput = function () { c[k] = inp.value; editing.dirty = true; };
        row.appendChild(inp);
      });
      box.appendChild(row);
    });
    return loadLook(job.id).then(function (d) { showLook(d); $("editor").hidden = false; });
  }
  function tweak(patch) {
    for (var k in patch) { if (patch[k] === undefined || patch[k] === "") delete editing.custom[k]; else editing.custom[k] = patch[k]; }
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
  $("size").oninput = function () { tweak({ size: +$("size").value }); };
  $("color").oninput = function () { tweak({ color: $("color").value }); };
  $("accent").oninput = function () { tweak({ accent: $("accent").value }); };
  $("position").onchange = function () { tweak({ position: $("position").value }); };
  $("lines").onchange = function () { tweak({ lines: $("lines").value ? +$("lines").value : undefined }); };
  $("saveBtn").onclick = function () {
    say("");
    Promise.all([saveCues(), saveLook()]).then(function (rs) {
      var bad = rs.filter(function (r) { return r.status !== 200; })[0];
      say(bad ? (bad.data.error || "Couldn't save.") : "Saved.", bad ? "error" : "ok");
    }).catch(function (e) { say(e.message, "error"); });
  };
  $("placeBtn").onclick = function () {
    say("");
    $("placeBtn").disabled = true;
    Promise.all([saveCues(), saveLook()])
      .then(function () { return placeOnTimeline(editing.job, $("lang").value); })
      .then(function (res) {
        var parts = String(res).split("|");
        say(parts[0] === "OK" ? parts[1] + (HOST === "PPRO" ? " Delete the older caption track if you placed one before." : "") : (parts[1] || res), parts[0] === "OK" ? "ok" : "error");
      })
      .catch(function (e) { say(e.message, "error"); })
      .then(function () { $("placeBtn").disabled = false; });
  };

  // ---------- start ----------
  $("server").value = server();
  if (!store("vs_key")) show("connect");
  else refreshAccount().catch(function (e) { show("connect"); $("connectMsg").textContent = e.message; });
})();
