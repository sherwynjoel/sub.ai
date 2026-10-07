// Pure subtitle helpers shared by the panel (browser global) and its test (Node require).
(function (exports) {
  // Keep cues that overlap the used part of the clip [inS, outS], clamp them, and move them to timeline time.
  function placeCues(cues, offset, inS, outS) {
    return cues
      .filter(function (c) { return c.end > inS && c.start < outS; })
      .map(function (c) {
        return { start: Math.max(c.start, inS) + offset, end: Math.min(c.end, outS) + offset, ta: c.ta, en: c.en };
      })
      .filter(function (c) { return c.end > 0; })
      .map(function (c) { return { start: Math.max(0, c.start), end: c.end, ta: c.ta, en: c.en }; });
  }

  function textOf(c, lang, newline) {
    return (lang === "both" ? c.ta + newline + c.en : c[lang]).trim();
  }

  function stamp(sec) {
    var ms = Math.round(Math.max(0, sec) * 1000);
    function p(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }
    return p(Math.floor(ms / 3600000)) + ":" + p(Math.floor(ms / 60000) % 60) + ":" + p(Math.floor(ms / 1000) % 60) + "," + p(ms % 1000, 3);
  }

  function toSrt(cues, lang) {
    return cues.map(function (c, i) {
      return (i + 1) + "\n" + stamp(c.start) + " --> " + stamp(c.end) + "\n" + textOf(c, lang, "\n") + "\n";
    }).join("\n");
  }

  exports.placeCues = placeCues;
  exports.textOf = textOf;
  exports.toSrt = toSrt;
})(typeof module !== "undefined" && module.exports && typeof window === "undefined" ? module.exports : (window.Subs = {}));
