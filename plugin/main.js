/* Vasanam panel — CEP (Chromium + Node.js) side. Talks to the Vasanam API and to host.jsx. */
(function () {
  var req = typeof require === "function" ? require : window.cep_node.require;
  var fs = req("fs"), path = req("path"), os = req("os"), http = req("http"), https = req("https");

  var DEFAULT_SERVER = "http://localhost:3000"; // set to your live domain before packaging
  var cep = window.__adobe_cep__;
  var HOST = JSON.parse(cep.getHostEnvironment()).appName; // "PPRO" or "AEFT"
  var $ = function (id) { return document.getElementById(id); };
  var picked = null, lastJob = null;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) { return ""; } }
  function server() { return (store("vs_server") || DEFAULT_SERVER).replace(/\/+$/, ""); }
  function evalHost(script) { return new Promise(function (r) { cep.evalScript(script, r); }); }
  function show(id) { ["connect", "main"].forEach(function (s) { $(s).hidden = s !== id; }); $("settingsBtn").hidden = id !== "main"; }
  function say(text, cls) { $("msg").textContent = text; $("msg").className = cls || ""; }

  /** Minimal HTTP client on Node. body may be a string or a file path ({file}). */
  function api(method, p, body, onProgress) {
    return new Promise(function (resolve, reject) {
      var url = new URL(server() + p);
      var lib = url.protocol === "https:" ? https : http;
      var headers = { authorization: "Bearer " + store("vs_key") };
      var size = 0;
      if (body && body.file) { size = fs.statSync(body.file).size; headers["content-length"] = size; headers["content-type"] = "application/octet-stream"; }
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
      } else r.end();
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
    var cues = window.Subs.placeCues(job.cues, picked.offset, picked.inS, picked.outS);
    if (!cues.length) return Promise.resolve("OK|No speech was found in this clip.");
    if (HOST === "PPRO") {
      var dir = path.join(os.tmpdir(), "vasanam");
      fs.mkdirSync(dir, { recursive: true });
      var file = path.join(dir, picked.name.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_") + "." + lang + "." + Date.now() + ".srt");
      fs.writeFileSync(file, "\uFEFF" + window.Subs.toSrt(cues, lang), "utf8");
      return evalHost("vs_pproImportSrt(" + JSON.stringify(file) + ")");
    }
    var layers = cues.map(function (c) { return { start: c.start, end: c.end, text: window.Subs.textOf(c, lang, "\r") }; });
    // U+2028/2029 are line breaks inside ExtendScript string literals; escape them.
    var arg = JSON.stringify(layers).split("\u2028").join("\\u2028").split("\u2029").join("\\u2029");
    return evalHost("vs_aeAddTextLayers(" + arg + ")");
  }

  $("goBtn").onclick = function () {
    if (!picked) return;
    var lang = $("lang").value;
    $("goBtn").disabled = true;
    $("openBtn").hidden = true;
    say("");
    progress(0, "Uploading " + picked.name + "…");
    api("POST", "/api/upload?name=" + encodeURIComponent(picked.name) + "&lang=" + $("language").value, { file: picked.file }, function (f) { progress(f * 40, "Uploading… " + Math.round(f * 100) + "%"); })
      .then(function (r) {
        if (r.status !== 201) throw new Error(r.data.error || "Upload failed (" + r.status + ").");
        lastJob = r.data.id;
        return wait(r.data.id);
      })
      .then(function (job) { progress(97, "Placing subtitles…"); return placeOnTimeline(job, lang); })
      .then(function (res) {
        var parts = String(res).split("|");
        $("progress").hidden = true;
        say(parts[0] === "OK" ? parts[1] : "Subtitles are ready, but " + (parts[1] || res), parts[0] === "OK" ? "ok" : "error");
      })
      .catch(function (e) { $("progress").hidden = true; say(e.message, "error"); })
      .then(function () { $("goBtn").disabled = false; $("openBtn").hidden = !lastJob; refreshAccount(); });
  };

  $("openBtn").onclick = function () { window.cep.util.openURLInDefaultBrowser(server() + "/app/jobs/" + lastJob); };

  // ---------- start ----------
  $("server").value = server();
  if (!store("vs_key")) show("connect");
  else refreshAccount().catch(function (e) { show("connect"); $("connectMsg").textContent = e.message; });
})();
