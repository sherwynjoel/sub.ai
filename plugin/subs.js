// Pure subtitle helpers shared by the panel (browser global) and its test (Node require).
(function (exports) {
  // Keep cues that overlap the used part of the clip [inS, outS], clamp them, and move them to timeline time.
  function placeCues(cues, offset, inS, outS) {
    return cues
      .filter(function (c) { return c.end > inS && c.start < outS; })
      .map(function (c) {
        var shift = function (t) { return t && t.map(function (x) { return x + offset; }); };
        return { start: Math.max(c.start, inS) + offset, end: Math.min(c.end, outS) + offset, ta: c.ta, en: c.en, w: shift(c.w), we: shift(c.we) };
      })
      .filter(function (c) { return c.end > 0; })
      .map(function (c) { return { start: Math.max(0, c.start), end: c.end, ta: c.ta, en: c.en, w: c.w, we: c.we }; });
  }

  // Word indexes after which a line break goes, splitting words into up to n lines of similar length (same rule as the server).
  function lineBreaks(words, n) {
    var breaks = {};
    var lines = Math.min(Math.max(1, Math.round(n || 1)), words.length);
    if (lines <= 1) return breaks;
    var total = 0;
    for (var k = 0; k < words.length; k++) total += words[k].length + 1;
    var target = total / lines, len = 0, line = 1;
    for (var i = 0; i < words.length - 1 && line < lines; i++) {
      len += words[i].length + 1;
      if (len + (words[i + 1].length + 1) / 2 >= target * line || words.length - 1 - i === lines - line) { breaks[i] = true; line++; }
    }
    return breaks;
  }

  // text laid out on up to n lines; no n leaves it as is.
  function breakLines(text, n, newline) {
    if (!n) return text;
    var words = text.split(/\s+/).filter(Boolean);
    var brk = lineBreaks(words, n), out = "";
    for (var i = 0; i < words.length; i++) out += words[i] + (brk[i] ? newline : " ");
    return out.replace(/\s+$/, "");
  }

  function textOf(c, lang, newline, lines) {
    return (lang === "both" ? breakLines(c.ta, lines, newline) + newline + breakLines(c.en, lines, newline) : breakLines(c[lang], lines, newline)).trim();
  }

  // Split n items into k runs of near-equal size.
  function runs(list, k) {
    var out = [], from = 0;
    for (var i = 0; i < k; i++) { var to = Math.round((list.length * (i + 1)) / k); out.push(list.slice(from, to)); from = to; }
    return out;
  }

  // Three-box templates (small line, big word, small line) are made for a few words at a time: the cue is cut into
  // pieces of up to 3 words (2 with English, which takes the bottom box), timed by length across the cue. A piece
  // lasts at least minDur seconds (the template's intro plus a moment to read), so short cues get fewer, longer pieces.
  function partsChunks(c, lang, minDur) {
    var native = lang === "en" || !c.ta ? "en" : "ta";
    var words = String(c[native] || "").split(/\s+/).filter(Boolean);
    var en = lang === "both" ? String(c.en || "").split(/\s+/).filter(Boolean) : [];
    if (!words.length) return [];
    // When each word starts: measured from the audio by the server (w / we), else shared by length.
    var wt = native === "ta" ? c.w : c.we;
    if (!(wt && wt.length === words.length)) {
      var total = 0, sofar = 0;
      words.forEach(function (w) { total += w.length + 1; });
      wt = words.map(function (w) { var s = c.start + ((c.end - c.start) * sofar) / total; sofar += w.length + 1; return s; });
    }
    var size = en.length ? 2 : 3, k = Math.ceil(words.length / size);
    if (minDur > 0) k = Math.max(1, Math.min(k, Math.floor((c.end - c.start) / minDur)));
    var groups = runs(words, k), ens = runs(en, k), first = [], n = 0;
    groups.forEach(function (g) { first.push(n); n += g.length; });
    return groups.map(function (g, i) {
      var f = first[i], start = i ? wt[f] : c.start, end = i + 1 < groups.length ? wt[first[i + 1]] : c.end;
      var said = Math.max(start, Math.min(wt[f], end)); // the first word may come after a pause at the cue's start
      var mid = g.length === 2 ? 1 : Math.floor((g.length - 1) / 2), parts, at;
      // Each box starts with its first word, in reading order (top, big, bottom); English comes in after the big word.
      if (en.length) {
        parts = [g.slice(0, -1).join(" "), g[g.length - 1], ens[i].join(" ")];
        var big = g.length > 1 ? wt[f + g.length - 1] : said;
        at = [said, big, Math.min(end, big + 0.3)];
      } else if (g.length === 1) {
        parts = ["", g[0], ""]; at = [said, said, said];
      } else {
        parts = [g.slice(0, mid).join(" "), g[mid], g.slice(mid + 1).join(" ")];
        at = [said, wt[f + mid], mid + 1 < g.length ? wt[f + mid + 1] : end];
      }
      return { start: start, end: end, parts: parts, at: at };
    });
  }

  var CLAUSE = /^(and|but|so|because|that|which|who|when|where|if|or|then|while|though|although)$/i;

  // English captions in whole sentences, for English placed on its own (same rule as lib/subtitles.ts englishCues):
  // the English line is shared across the Tamil captions word by word, so alone it reads in fragments.
  function englishCues(cues, max) {
    max = max || 84;
    var out = [];
    for (var i = 0; i < cues.length; ) {
      var j = i;
      while (j + 1 < cues.length && cues[j + 1].start - cues[j].end < 0.3) j++;
      var words = [];
      for (var k = i; k <= j; k++) {
        var c = cues[k], ws = String(c.en || "").split(/\s+/).filter(Boolean), total = 0, so = 0;
        ws.forEach(function (w) { total += w.length + 1; });
        var st = c.we && c.we.length === ws.length ? c.we : ws.map(function (w) { var t = c.start + ((c.end - c.start) * so) / (total || 1); so += w.length + 1; return t; });
        for (var n = 0; n < ws.length; n++) words.push({ w: ws[n], s: st[n], c: c });
      }
      var runEnd = cues[j].end;
      i = j + 1;
      if (!words.length) continue;
      var pieces = [], cur = [];
      var len = function (ws) { var n = -1; ws.forEach(function (x) { n += x.w.length + 1; }); return n; };
      words.forEach(function (x) {
        if (cur.length && len(cur.concat([x])) > max) {
          var at = cur.length;
          for (var b = cur.length - 1; b >= Math.ceil(cur.length / 2); b--) {
            if (cur[b - 1] && /[,;:]$/.test(cur[b - 1].w)) { at = b; break; }
            if (CLAUSE.test(cur[b].w.replace(/^[("']+/, ""))) { at = b; break; }
          }
          pieces.push(cur.slice(0, at));
          cur = cur.slice(at);
        }
        cur.push(x);
        if (/[.?!]["')]*$/.test(x.w) && !/^(Mr|Mrs|Ms|Dr|St|vs|etc)\.$/i.test(x.w)) { pieces.push(cur); cur = []; }
      });
      if (cur.length) pieces.push(cur);
      pieces.forEach(function (p, q) {
        var start = q ? p[0].s : Math.min(p[0].s, words[0].c.start), end = q + 1 < pieces.length ? pieces[q + 1][0].s : runEnd;
        if (end - start < 0.05) return;
        out.push({ start: start, end: end, ta: "", en: p.map(function (x) { return x.w; }).join(" "), we: p.map(function (x) { return Math.max(start, x.s); }) });
      });
    }
    return out;
  }

  function stamp(sec) {
    var ms = Math.round(Math.max(0, sec) * 1000);
    function p(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }
    return p(Math.floor(ms / 3600000)) + ":" + p(Math.floor(ms / 60000) % 60) + ":" + p(Math.floor(ms / 1000) % 60) + "," + p(ms % 1000, 3);
  }

  function toSrt(cues, lang, lines) {
    return cues.map(function (c, i) {
      return (i + 1) + "\n" + stamp(c.start) + " --> " + stamp(c.end) + "\n" + textOf(c, lang, "\n", lines) + "\n";
    }).join("\n");
  }

  exports.placeCues = placeCues;
  exports.breakLines = breakLines;
  exports.textOf = textOf;
  exports.partsChunks = partsChunks;
  exports.englishCues = englishCues;
  exports.stamp = stamp;
  exports.toSrt = toSrt;
})(typeof module !== "undefined" && module.exports && typeof window === "undefined" ? module.exports : (window.Subs = {}));
