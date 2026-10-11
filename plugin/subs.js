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
  exports.stamp = stamp;
  exports.toSrt = toSrt;
})(typeof module !== "undefined" && module.exports && typeof window === "undefined" ? module.exports : (window.Subs = {}));
