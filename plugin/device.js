// The panel's video work, on this computer: ffmpeg in WebAssembly (the same engine as the website, lib/deviceExport.ts).
// It takes the sound out of a clip, so the clip itself is never uploaded, and carries out the server's plan for styled captions.
(function () {
  var fs = require("fs"), nodeUrl = require("url");
  // Threads need shared memory, which manifest.xml switches on; ffmpeg's own filter threads hang on looks with many layers.
  var shared = (function () { try { new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }); return true; } catch (e) { return false; } })();
  var THREADS = shared ? ["-filter_threads", "1", "-filter_complex_threads", "1", "-threads", "4"] : [];
  function here(p) { return new URL(p, location.href).href; }

  // The clip as a Blob: the browser reads it from disk as needed, so a long clip doesn't fill the memory.
  function blobOf(file) {
    return new Promise(function (ok, no) {
      var x = new XMLHttpRequest();
      x.open("GET", nodeUrl.pathToFileURL(file).href);
      x.responseType = "blob";
      x.onload = function () { ok(x.response); };
      x.onerror = function () { no(new Error("Couldn't read " + file)); };
      x.send();
    });
  }

  // The engine with the clip in it at /in/video, and what ffmpeg says about the clip in `said`.
  function open(file) {
    return Promise.all([new Function("u", "return import(u)")(here("ffmpeg/index.js")), blobOf(file)]).then(function (a) {
      var ff = new a[0].FFmpeg(), core = here("ffmpeg/" + (shared ? "mt" : "st") + "/ffmpeg-core"), lines = [];
      var o = { classWorkerURL: here("ffmpeg/worker.js"), coreURL: core + ".js", wasmURL: core + ".wasm" };
      if (shared) o.workerURL = core + ".worker.js";
      var listen = function (e) { lines.push(e.message); };
      return ff.load(o).then(function () { return ff.createDir("/in"); })
        .then(function () { return ff.mount("WORKERFS", { blobs: [{ name: "video", data: a[1] }] }, "/in"); })
        .then(function () { ff.on("log", listen); return ff.exec(["-hide_banner", "-i", "/in/video"]); })
        .then(function () { ff.off("log", listen); return { ff: ff, said: lines.join("\n") }; });
    });
  }

  function timeOf(message) {
    var m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null;
  }

  function save(ff, name, file) {
    return ff.readFile(name).then(function (d) { fs.writeFileSync(file, Buffer.from(d)); });
  }

  // The clip's sound into `out` (AAC for api/upload?audio=1). False when it has none.
  function sound(file, out) {
    return open(file).then(function (e) {
      if (!/Stream .*Audio:/.test(e.said)) { e.ff.terminate(); return false; }
      var codec = /Audio: aac/.test(e.said) ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "128k"];
      return e.ff.exec(["-y"].concat(THREADS, ["-i", "/in/video", "-map", "0:a:0"], codec, ["-f", "adts", "s.aac"]))
        .then(function (code) { if (code) throw new Error("ffmpeg exited " + code); return save(e.ff, "s.aac", out); })
        .then(function () { e.ff.terminate(); return true; }, function (err) { e.ff.terminate(); throw err; });
    });
  }

  // Carries out the plan `get(said)` returns (null: nothing to do), writing the video to the file it names.
  // o: { dir: where the fonts are, logo: its file, onPct }
  function overlay(file, get, o) {
    return open(file).then(function (e) {
      var ff = e.ff;
      return get(e.said).then(function (job) {
        if (!job) return null;
        var plan = job.plan;
        return job.fonts.reduce(function (p, f) {
          return p.then(function () { return ff.writeFile("fonts/" + f, new Uint8Array(fs.readFileSync(o.dir() + "/" + f))); });
        }, ff.createDir("fonts")).then(function () {
          return Promise.all(Object.keys(plan.files).map(function (n) { return ff.writeFile(n, plan.files[n]); }));
        }).then(function () {
          return job.logo ? ff.writeFile("logo", new Uint8Array(fs.readFileSync(job.logo))) : null;
        }).then(function () {
          ff.on("log", function (l) { var t = timeOf(l.message); if (t !== null) o.onPct(Math.min(99, Math.floor((t / Math.max(1, job.seconds)) * 100))); });
          var args = plan.args.map(function (a) { return a === "<video>" ? "/in/video" : a === "<logo>" ? "logo" : a === "<out>" ? "out.mov" : a; });
          return ff.exec(["-y"].concat(THREADS, args));
        }).then(function (code) {
          if (code) throw new Error("ffmpeg exited " + code);
          return save(ff, "out.mov", job.out);
        }).then(function () { return job.out; });
      }).then(function (r) { ff.terminate(); return r; }, function (err) { ff.terminate(); throw err; });
    });
  }

  window.Device = { sound: sound, overlay: overlay };
})();
