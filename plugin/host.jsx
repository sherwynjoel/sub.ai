// ExtendScript (ES3) side of the Vasanam panel. Runs inside Premiere Pro or After Effects.
// Functions return strings: "OK|..." on success, "ERR|message" on failure.

// ---------- Premiere Pro ----------

// Finds the media to subtitle: a selected clip on the active sequence, else the Project panel selection.
// Returns "OK|<path>|<offsetSeconds>|<inSeconds>|<outSeconds>|<name>"; offset maps source time -> sequence time.
function vs_pproPickMedia() {
  try {
    var seq = app.project.activeSequence;
    if (seq) {
      var sel = seq.getSelection();
      for (var i = 0; sel && i < sel.length; i++) {
        var c = sel[i];
        if (c.projectItem && c.projectItem.getMediaPath()) {
          return "OK|" + c.projectItem.getMediaPath() + "|" + (c.start.seconds - c.inPoint.seconds) + "|" +
            c.inPoint.seconds + "|" + c.outPoint.seconds + "|" + c.projectItem.name;
        }
      }
    }
    var view = app.getCurrentProjectViewSelection ? app.getCurrentProjectViewSelection() : null;
    if (view && view.length && view[0].getMediaPath()) {
      var at = seq ? seq.getPlayerPosition().seconds : 0;
      return "OK|" + view[0].getMediaPath() + "|" + at + "|0|999999|" + view[0].name;
    }
    return "ERR|Select a clip on the timeline or in the Project panel.";
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// Where a media file sits on the active sequence now: "OK|offset|in|out" (a selected copy first, else the first
// one on the timeline), or "NONE". Read again when placing, so a clip moved or trimmed after it was picked still lines up.
function vs_pproFindClip(mediaPath) {
  try {
    var seq = app.project.activeSequence, found = null;
    if (!seq) return "NONE";
    var groups = [seq.videoTracks, seq.audioTracks];
    var chosen = false;
    for (var g = 0; g < 2 && !chosen; g++) for (var t = 0; t < groups[g].numTracks && !chosen; t++) {
      var clips = groups[g][t].clips;
      for (var k = 0; k < clips.numItems; k++) {
        var c = clips[k];
        if (!c.projectItem || c.projectItem.getMediaPath() !== mediaPath) continue;
        if (c.isSelected()) { found = c; chosen = true; break; }
        if (!found) found = c;
      }
    }
    if (!found) return "NONE";
    return "OK|" + (found.start.seconds - found.inPoint.seconds) + "|" + found.inPoint.seconds + "|" + found.outPoint.seconds;
  } catch (e) {
    return "NONE";
  }
}

// Imports an SRT and places it as a caption track on the active sequence.
// Premiere's scripting API can't style captions; the user styles the track in Essential Graphics.
function vs_pproImportSrt(srtPath) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return "ERR|Open a sequence first.";
    var before = app.project.rootItem.children.numItems;
    if (!app.project.importFiles([srtPath], true, app.project.rootItem, false)) return "ERR|Premiere could not import the subtitle file.";
    var item = null;
    var kids = app.project.rootItem.children;
    var file = new File(srtPath);
    for (var i = kids.numItems - 1; i >= 0 && !item; i--) {
      if (kids[i].name === file.name || i >= before) item = kids[i];
    }
    if (!item) return "ERR|Imported file not found in the Project panel.";
    if (!seq.createCaptionTrack) return "OK|Imported " + file.name + " to the Project panel. Drag it onto your sequence.";
    seq.createCaptionTrack(item, 0, Sequence.CAPTION_FORMAT_SUBTITLE);
    return "OK|Added a caption track to " + seq.name + ".";
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// cues: [{start, end, text}] in sequence seconds; look: {size, color, customColor, position, offset, x, y, lines};
// lines > 0 = the user chose that many lines per caption (the text already holds the breaks).
// tpl: {path, text, color, w, h, layout} = a Motion Graphics Template, the names of its text and colour controls,
// its frame size and where its text sits in that frame (templates.json).
// One graphic per cue on the track above the clip (mediaPath); graphics from an earlier run are replaced.
// Reports which controls it could set, so a new template can be checked from the panel message.
// Remove template sound (an .aegraphic audio clip) that starts where one of our removed captions started.
function vs_dropTemplateAudio(seq, starts) {
  for (var t = 0; t < seq.audioTracks.numTracks; t++) {
    var cs = seq.audioTracks[t].clips;
    for (var k = cs.numItems - 1; k >= 0; k--) {
      var c = cs[k];
      try {
        if (starts[Math.round(c.start.seconds * 100)] && /\.aegraphic$/i.test(c.projectItem.getMediaPath())) c.remove(false, false);
      } catch (e) {}
    }
  }
}

function vs_pproAddGraphics(cues, look, tpl, mediaPath) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return "ERR|Open a sequence first.";
    look = look || {};
    var offset = look.offset || 0.09, z = look.safe || { top: 0, right: 0.07, bottom: 0, left: 0.07 };
    // Where the graphic's centre goes, as a fraction of the frame: inside the safe zone.
    // No chained a ? b : c ? d : e here: ExtendScript groups it as (a ? b : c) ? d : e, which put "top" in the middle.
    var yf = 1 - offset - 0.04; // bottom
    if (look.y != null) yf = look.y;
    else if (look.position === "top") yf = offset + 0.04;
    else if (look.position === "middle") yf = (z.top + 1 - z.bottom) / 2;
    var xf = look.x != null ? look.x : (z.left + 1 - z.right) / 2;
    var W = seq.frameSizeHorizontal || 1920, H = seq.frameSizeVertical || 1080;
    // Clear our earlier graphics and find the clip's track.
    var clipTrack = -1, t, k, ours = {};
    for (t = 0; t < seq.videoTracks.numTracks; t++) {
      var tr = seq.videoTracks[t];
      for (k = tr.clips.numItems - 1; k >= 0; k--) {
        var cl = tr.clips[k];
        if (/^Vasanam \d+$/.test(cl.name)) { ours[Math.round(cl.start.seconds * 100)] = 1; try { cl.remove(false, false); } catch (e) {} }
        else if (mediaPath && cl.projectItem && cl.projectItem.getMediaPath && cl.projectItem.getMediaPath() === mediaPath) clipTrack = t;
      }
    }
    var first = cues.length ? cues[0].start : 0, last = cues.length ? cues[cues.length - 1].end : 0;
    var target = -1;
    for (t = Math.max(0, clipTrack + 1); t < seq.videoTracks.numTracks && target < 0; t++) {
      var busy = false, cs = seq.videoTracks[t].clips;
      for (k = 0; k < cs.numItems; k++) if (cs[k].start.seconds < last && cs[k].end.seconds > first) busy = true;
      if (!busy) target = t;
    }
    if (target < 0) {
      try { app.enableQE(); qe.project.getActiveSequence().addTracks(1, seq.videoTracks.numTracks, 0, 0, 0, 0); target = seq.videoTracks.numTracks - 1; }
      catch (e) { return "ERR|Add an empty video track above the clip, then place again."; }
    }
    vs_dropTemplateAudio(seq, ours); // sound an earlier placement left (they start where our captions started)
    // Templates with sound (Text Break) bring an audio clip with each caption. importMGT puts it on the audio track
    // it's given and overwrites what's there, so give it an empty track (never the clip's own audio), then remove it.
    var aTarget = -1;
    for (t = 0; t < seq.audioTracks.numTracks && aTarget < 0; t++) {
      var aBusy = false, acs = seq.audioTracks[t].clips;
      for (k = 0; k < acs.numItems; k++) if (acs[k].start.seconds < last + 60 && acs[k].end.seconds > first) aBusy = true;
      if (!aBusy) aTarget = t;
    }
    if (aTarget < 0) {
      try { app.enableQE(); qe.project.getActiveSequence().addTracks(0, 0, 1, 1, seq.audioTracks.numTracks, 0, 0); aTarget = seq.audioTracks.numTracks - 1; } catch (e) {}
      if (aTarget < 0 || seq.audioTracks[aTarget].clips.numItems) return "ERR|Add an empty audio track, then place again (so the captions don't replace your audio).";
    }
    var set = {}, names = [], n = 0, most = 0; // most: the fewest lines a caption had to drop to
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.end <= c.start) continue;
      var at = new Time(); at.seconds = c.start;
      var item;
      try { item = seq.importMGT(tpl.path, at.ticks, target, aTarget); }
      catch (e) { return "ERR|This Premiere Pro (" + app.version + ") can't load the caption template. It may need a newer Premiere Pro; pick another style."; }
      if (!item) return "ERR|Premiere could not import the caption template.";
      item.name = "Vasanam " + (i + 1);
      var parts = c.parts || (tpl.parts ? vs_splitParts(String(c.text)) : null);
      var fit = parts ? { place: vs_partsPlace(parts, tpl, W, H, z, look.size, xf, yf) } : vs_templateFit(String(c.text), tpl, W, H, z, look.size, xf, yf, look.lines > 0), place = fit.place;
      if (fit.fewer) most = most ? Math.min(most, fit.fewer) : fit.fewer;
      try { var end = new Time(); end.seconds = c.end; item.end = end; set.duration = 1; } catch (e) {
        try { var out = new Time(); out.seconds = c.end - c.start; item.outPoint = out; set.duration = 1; } catch (e2) {}
      }
      // A caption shorter than the template's intro (plus a moment to read) would end mid-animation: start the
      // template that much into its intro, so the words have settled before the caption ends.
      var intro = tpl.layout && tpl.layout.intro, skip = intro ? Math.min(intro, intro + 0.5 - (c.end - c.start)) : 0;
      if (skip > 0.05) { try { var ip = new Time(); ip.seconds = skip; item.inPoint = ip; set.intro = 1; } catch (e) {} }
      var comp = item.getMGTComponent();
      var props = comp ? comp.properties : null;
      for (var p = 0; props && p < props.numItems; p++) {
        var prm = props[p], name = prm.displayName;
        if (i === 0) names.push(name);
        try {
          var part = -1;
          for (var pj = 0; parts && pj < tpl.parts.length; pj++) if (name === tpl.parts[pj]) part = pj;
          if (part >= 0) {
            var base = place.shrink[part] < 1 ? vs_fontSize(prm) : 0;
            vs_setText(prm, parts[part] || " ", base ? Math.floor(base * place.shrink[part] * 10) / 10 : 0);
            set.text = 1;
          }
          else if (!parts && (name === tpl.text || (!tpl.text && name === "Source Text"))) {
            set.text = 1;
            if (vs_setText(prm, fit.text, place.font)) set.font = 1;
          }
          else if (name === tpl.color && look.customColor && prm.setColorValue) { vs_setColor(prm, look.customColor); set.color = 1; }
        } catch (e) {}
      }
      // Place and scale the whole graphic through the clip's Motion effect (values are frame fractions in older versions, pixels in newer).
      try {
        for (var m = 0; m < item.components.numItems; m++) {
          var mc = item.components[m];
          if (mc.displayName !== "Motion") continue;
          for (var q = 0; q < mc.properties.numItems; q++) {
            var mp = mc.properties[q];
            if (mp.displayName === "Position" && isFinite(place.x) && isFinite(place.y)) { // never off screen
              var cur = mp.getValue(), frac = cur[0] <= 1 && cur[1] <= 1;
              mp.setValue(frac ? [place.x / W, place.y / H] : [place.x, place.y], true);
              set.position = 1;
            } else if (mp.displayName === "Scale" && isFinite(place.scale)) { mp.setValue(place.scale, true); set.scale = 1; }
          }
        }
      } catch (e) {}
      n++;
    }
    var mine = seq.audioTracks[aTarget].clips; // our templates' sound on the track picked for it
    for (k = mine.numItems - 1; k >= 0; k--) { try { if (/\.aegraphic$/i.test(mine[k].projectItem.getMediaPath())) mine[k].remove(false, false); } catch (e) {} }
    var done = [];
    for (var s in set) done.push(s);
    // "OK|message|details": the panel shows the message; the details (for checking a new template) go in its tooltip.
    return "OK|Added " + n + " styled captions on V" + (target + 1) + "." + (most ? " This template fits at most " + most + (most === 1 ? " line" : " lines") + ", so longer captions use " + most + "." : "") +
      "|Set: " + (done.join(", ") || "nothing") + ". Template controls: " + names.join(", ");
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// Width of one line in template pixels at the template's own font size. Tamil characters are counted at their own
// (wider) width: one average width for both let a short word of wide letters (அண்ணா) overflow the frame.
function vs_textWidth(line, L) {
  var w = L.pad || 0, ta = L.charWTa || L.charW;
  for (var i = 0; i < line.length; i++) { var c = line.charCodeAt(i); w += c >= 0x0B80 && c <= 0x0BFF ? ta : L.charW; }
  return w;
}

// A template caption's text and placement. Lines the caption already has (one per language, or the Lines setting)
// are kept; a single long line that would need a much smaller font is split into two balanced lines instead.
// chosen: the user picked the number of lines (Lines = 1, 2 or 3), so the lines are only ever sized, never re-split.
// Templates with three text boxes (Trending Text Animation: small line, big word, small line). One line is split
// around its middle word, which goes in the big box; two lines (native + English) put the native line in the big box
// and the English under it.
function vs_splitParts(text) {
  var lines = text.split(String.fromCharCode(13));
  if (lines.length > 1) return ["", lines[0], lines.slice(1).join(" ")];
  var w = text.split(/\s+/), out = [];
  for (var i = 0; i < w.length; i++) if (w[i]) out.push(w[i]);
  if (out.length < 2) return ["", out.join(" "), ""];
  var c = Math.floor((out.length - 1) / 2) + (out.length === 2 ? 1 : 0);
  return [out.slice(0, c).join(" "), out[c], out.slice(c + 1).join(" ")];
}

// Where a three-box template goes: each box is centred on its own point and grows by a measured width per letter
// (layout.parts, template pixels); the whole graphic is scaled to fit the safe area.
function vs_partsPlace(texts, tpl, W, H, z, size, xf, yf) {
  var tw = tpl.w || 1920, th = tpl.h || 1080, P = tpl.layout.parts, L = 1e9, R = -1e9, top = 1e9, bottom = -1e9, shrink = [];
  var m = tw * 0.02; // the template crops anything outside its own frame: a box too wide for it gets a smaller font
  for (var j = 0; j < P.length; j++) {
    var t = texts[j] || "", n = 0;
    shrink[j] = 1;
    if (!/\S/.test(t)) continue;
    for (var i = 0; i < t.length; i++) { var c = t.charCodeAt(i); n += c >= 0x0B80 && c <= 0x0BFF ? 1.3 : 1; } // Tamil letters run wider than the Latin sample measured
    var w = P[j].r0 - P[j].l0 + (P[j].dr - P[j].dl) * n, cx = (P[j].l0 + P[j].r0 + (P[j].dl + P[j].dr) * n) / 2;
    var room = 2 * Math.min(cx - m, tw - m - cx);
    if (w > room) { shrink[j] = room / w; w = room; }
    L = Math.min(L, cx - w / 2); R = Math.max(R, cx + w / 2);
    top = Math.min(top, P[j].top); bottom = Math.max(bottom, P[j].bottom);
  }
  if (R < L) { L = R = tw / 2; top = bottom = th / 2; }
  var s = Math.min(W, H) * 0.075 * (size || 1) / (tpl.layout.size || 200);
  var safe = W * 2 * Math.min(xf - z.left, 1 - z.right - xf), lo = H * z.top, hi = H * (1 - z.bottom);
  if ((R - L) * s > safe) s = safe / (R - L);
  if ((bottom - top) * s > hi - lo) s = (hi - lo) / (bottom - top);
  s = Math.floor(s * 1000) / 1000;
  var x = xf * W - ((L + R) / 2 - tw / 2) * s, y = yf * H - ((top + bottom) / 2 - th / 2) * s;
  var yTop = y + (top - th / 2) * s, yBottom = y + (bottom - th / 2) * s;
  if (yBottom > hi) y -= yBottom - hi;
  if (yTop < lo) y += lo - yTop;
  return { scale: s * 100, x: Math.round(x), y: Math.round(y), shrink: shrink };
}

function vs_templateFit(text, tpl, W, H, z, size, xf, yf, chosen) {
  var CR = String.fromCharCode(13), lines = text.split(CR), asked = lines.length;
  // Some templates only ever show one line (Santhosham's reveal covers the first line): everything goes on it.
  var most = tpl.layout && tpl.layout.maxLines;
  if (most && lines.length > most) {
    var joined = vs_layout(lines.join("  ·  "), Math.ceil(lines.join("  ·  ").length / most), most).text;
    var pm = vs_templatePlace(joined.split(CR), tpl, W, H, z, size, xf, yf);
    return { text: joined, place: pm, fewer: chosen ? most : 0 };
  }
  var place = vs_templatePlace(lines, tpl, W, H, z, size, xf, yf), own = tpl.layout ? tpl.layout.size : 0;
  if (chosen) {
    // A fixed line spacing can be too wide for the template's frame (Cracked fits one line): as many lines as fit.
    var k = lines.length;
    while (!place.fits && k > 1) {
      k--;
      var flat = lines.join(" ");
      lines = vs_layout(flat, Math.ceil(flat.length / k), k).text.split(CR);
      place = vs_templatePlace(lines, tpl, W, H, z, size, xf, yf);
    }
    return { text: lines.join(CR), place: place, fewer: k < text.split(CR).length ? k : 0 };
  }
  // Not on templates with a fixed line spacing: their second line would sit far below the first.
  if (lines.length === 1 && own && place.font < own * 0.7 && !tpl.layout.fixedLeading) {
    var two = vs_layout(text, Math.ceil(text.length / 2), 2).text.split(CR);
    var p2 = vs_templatePlace(two, tpl, W, H, z, size, xf, yf);
    if (two.length === 2 && p2.font > place.font) return { text: two.join(CR), place: p2 };
  }
  // Lines a fixed line spacing pushes out of the template's frame (Cracked: 455 px apart) go on one line instead.
  if (lines.length > 1 && !place.fits) {
    var one = lines.join("  ·  ");
    return { text: one, place: vs_templatePlace([one], tpl, W, H, z, size, xf, yf) };
  }
  return { text: text, place: place };
}

// How to place a template caption so every line stays inside the template's own frame (Premiere clips anything
// outside it) and inside the safe zone. tpl.layout is where the template's text sits in that frame, measured in
// After Effects: align (left | center), x (left edge or centre), top/bottom of one line, pitch (line to line),
// charW / charWTa (width of a Latin / Tamil character), pad (fixed extra on any line) and size (font size), all in
// template pixels; fixedLeading = the line spacing
// stays the same when the font shrinks; maxLines = the most lines the template shows.
// lines: the caption's lines; W, H: sequence frame; z: safe zone margins; xf, yf: where the caption's centre goes.
// Returns {scale: Motion scale %, font: font size for the text, x, y: Motion position in frame pixels,
// fits: every line is inside the template's frame top to bottom}.
function vs_templatePlace(lines, tpl, W, H, z, size, xf, yf) {
  var tw = tpl.w || 1920, th = tpl.h || 1080;
  var L = tpl.layout || { align: "center", x: tw / 2, top: th * 0.44, bottom: th * 0.56, pitch: th * 0.14, charW: th * 0.072, size: th * 0.12 };
  var wide = 1;
  for (var i = 0; i < lines.length; i++) wide = Math.max(wide, vs_textWidth(lines[i], L)); // longest line, template font size
  var m = tw * 0.03; // keep clear of the template frame's edge
  var room = L.align === "left" ? tw - m - L.x : 2 * Math.min(L.x - m, tw - m - L.x);
  // Same caption size as the burned-in MP4 (7.5% of the short side); a dragged caption gets the room around its point.
  var s = Math.min(W, H) * 0.075 * (size || 1) / L.size;
  var safe = W * 2 * Math.min(xf - z.left, 1 - z.right - xf);
  var f = Math.min(1, room / wide, safe / (wide * s)); // font shrink so the longest line fits both
  var font = Math.floor(L.size * f * 10) / 10; // rounded down (never wider than what fits); placed from this size
  f = font / L.size;
  // Text grows right from a left-aligned x, both ways from a centred one; a smaller font keeps its baseline (≈ bottom).
  var tx = L.align === "left" ? L.x + wide * f / 2 : L.x;
  var top = L.bottom - (L.bottom - L.top) * f, bottom = L.bottom + (lines.length - 1) * L.pitch * (L.fixedLeading ? 1 : f);
  var ty = (top + bottom) / 2;
  // Top to bottom: lines taller than the safe area shrink the graphic; then the block is moved inside the frame
  // (wide line spacing at a big size pushed a second line off the bottom).
  var lo = H * z.top, hi = H * (1 - z.bottom);
  if ((bottom - top) * s > hi - lo) s = (hi - lo) / (bottom - top);
  var y = yf * H - (ty - th / 2) * s, yTop = y + (top - th / 2) * s, yBottom = y + (bottom - th / 2) * s;
  if (yBottom > hi) y -= yBottom - hi;
  if (yTop < lo) y += lo - yTop;
  return {
    scale: Math.floor(s * 1000) / 10,
    font: font,
    x: Math.round(xf * W - (tx - tw / 2) * Math.floor(s * 1000) / 1000),
    y: Math.round(y),
    fits: top >= 0 && bottom <= th
  };
}

// Characters that fit on one line inside the safe zone (caption font ≈ 7.5% of the short side, glyph ≈ 0.6 em).
function vs_charBudget(w, h, z, size) {
  return Math.max(8, Math.floor((1 - z.left - z.right) * (w / Math.min(w, h)) / (0.075 * 0.6 * (size || 1))));
}

// Lays text out on at most maxLines balanced lines (an existing line break counts toward it).
// fit = how much to shrink so the longest line fits the budget (1 when it already fits).
function vs_layout(text, budget, maxLines) {
  var CR = String.fromCharCode(13);
  var parts = String(text).split(CR), out = [], longest = 0;
  var per = parts.length > 1 ? Math.max(1, Math.floor(maxLines / parts.length)) : maxLines;
  for (var p = 0; p < parts.length; p++) {
    var words = parts[p].split(" "), total = parts[p].length;
    var n = Math.min(per, Math.max(1, Math.ceil(total / budget)), words.length), target = total / n, cur = "", made = 1;
    for (var k = 0; k < words.length; k++) {
      var next = cur ? cur + " " + words[k] : words[k];
      if (cur && made < n && next.length > target && (next.length - target) > (target - cur.length)) { out.push(cur); cur = words[k]; made++; }
      else cur = next;
    }
    out.push(cur);
  }
  for (var i = 0; i < out.length; i++) longest = Math.max(longest, out[i].length);
  return { text: out.join(CR), lines: out.length, fit: longest > budget ? budget / longest : 1 };
}

// Source Text arrives as an object, a JSON string or a plain string depending on the Premiere version.
// size (optional) also sets the font size; returns true when it could.
// The style is stored per text run, and a template's runs only cover its default text ("Santhosham" = 10 characters):
// the last run is stretched over the new text so the whole caption gets the size, not just its first characters.
// A text control's font size, or 0 if it can't be read.
function vs_fontSize(prm) {
  var val = prm.getValue();
  if (val && typeof val === "object") { var v = val.fontSizeEditValue; return +(v instanceof Array ? v[0] : v) || 0; }
  if (typeof val !== "string") return 0;
  var mt = val.match(/"fontSizeEditValue"\s*:\s*\[?\s*([\d.]+)/);
  return mt ? +mt[1] : 0;
}

function vs_setText(prm, text, size) {
  var val = prm.getValue(), sized = false;
  if (val && typeof val === "object") {
    val.textEditValue = text;
    if (val.fontTextRunLength instanceof Array) val.fontTextRunLength = vs_runLengths(val.fontTextRunLength, text.length);
    if (size && val.fontSizeEditValue !== undefined) { val.fontSizeEditValue = val.fontSizeEditValue instanceof Array ? vs_fill(val.fontSizeEditValue, size) : size; sized = true; }
    prm.setValue(val, true);
    return sized;
  }
  if (typeof val === "string" && /"textEditValue"/.test(val)) {
    var esc = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    val = val.replace(/"textEditValue"\s*:\s*"(?:[^"\\]|\\.)*"/, '"textEditValue":"' + esc + '"');
    val = val.replace(/("fontTextRunLength"\s*:\s*)\[([^\]]*)\]/, function (all, key, v) {
      var runs = v.split(","), n = [];
      for (var i = 0; i < runs.length; i++) n.push(parseInt(runs[i], 10) || 0);
      return key + "[" + vs_runLengths(n, text.length).join(",") + "]";
    });
    // One value per text run: every run gets the new size.
    if (size && /"fontSizeEditValue"/.test(val)) {
      val = val.replace(/("fontSizeEditValue"\s*:\s*)(\[[^\]]*\]|[\d.]+)/, function (all, key, v) { return key + v.replace(/[\d.]+/g, String(size)); });
      sized = true;
    }
    prm.setValue(val, true);
    return sized;
  }
  prm.setValue(text, true);
  return false;
}

// Run lengths with the last run stretched to the end of a `len`-character text. Runs are never dropped: every other
// per-run value (font, caps, ...) keeps one entry per run. A text shorter than the earlier runs is left as it was.
function vs_runLengths(runs, len) {
  var out = [], before = 0;
  for (var i = 0; i < runs.length - 1; i++) { out.push(runs[i]); before += runs[i]; }
  out.push(len > before ? len - before : runs[runs.length - 1]);
  return out;
}

function vs_fill(arr, v) {
  var out = [];
  for (var i = 0; i < arr.length; i++) out.push(v);
  return out;
}

function vs_setColor(prm, hex) {
  hex = String(hex || "#ffffff").slice(1, 7);
  prm.setColorValue(255, parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16), true);
}

// Moves the playhead (Premiere) or the comp's current time (After Effects) to `seconds`, to find a caption.
function vs_seek(seconds) {
  try {
    var seq = app.project.activeSequence;
    if (seq) { var t = new Time(); t.seconds = seconds; seq.setPlayerPosition(t.ticks); return "OK|"; }
    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) { comp.time = seconds; return "OK|"; }
    return "ERR|Open a sequence first.";
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// ---------- After Effects ----------

// Returns "OK|<path>|<offsetSeconds>|<inSeconds>|<outSeconds>|<name>" for the selected footage layer.
function vs_aePickMedia() {
  try {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return "ERR|Open a composition and select a footage layer.";
    var layers = comp.selectedLayers;
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i];
      if (l.source && l.source.file) {
        return "OK|" + l.source.file.fsName + "|" + l.startTime + "|" + (l.inPoint - l.startTime) + "|" + (l.outPoint - l.startTime) + "|" + l.name;
      }
    }
    return "ERR|Select a video or audio layer in the active comp.";
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// "OK|1" when the active comp is taller than wide (the default caption offset depends on it).
function vs_aeIsPortrait() {
  try {
    var comp = app.project.activeItem;
    return "OK|" + (comp instanceof CompItem && comp.height > comp.width ? "1" : "0");
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// cues: [{start, end, text}] already in comp time; look: {font, size, color, stroke, strokeWidth, position, offset}.
// One text layer per cue, styled like the website preview. Layers from an earlier run are replaced.
function vs_aeAddTextLayers(cues, look) {
  try {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return "ERR|Open a composition first.";
    look = look || {};
    app.beginUndoGroup("Vasanam subtitles");
    for (var r = comp.numLayers; r >= 1; r--) {
      if (/^Vasanam \d+$/.test(comp.layer(r).name)) comp.layer(r).remove();
    }
    var fontSize = Math.round(Math.min(comp.width, comp.height) * 0.075 * (look.size || 1));
    var offset = look.offset || 0.09;
    var z = look.safe || { top: 0, right: 0.07, bottom: 0, left: 0.07 };
    var budget = vs_charBudget(comp.width, comp.height, z, look.size);
    var x = look.x != null ? comp.width * look.x : comp.width * (z.left + 1 - z.right) / 2;
    // if/else, not a ternary chain: ExtendScript groups a ? b : c ? d : e as (a ? b : c) ? d : e.
    var y = comp.height * (1 - offset); // bottom
    if (look.y != null) y = comp.height * look.y + fontSize / 2; // dragged on the website
    else if (look.position === "top") y = comp.height * offset + fontSize;
    else if (look.position === "middle") y = comp.height * (z.top + 1 - z.bottom) / 2 + fontSize / 2;
    for (var i = cues.length - 1; i >= 0; i--) {
      var c = cues[i];
      if (c.end <= 0 || c.start >= comp.duration) continue;
      var lay = vs_layout(c.text, budget, 3);
      var layer = comp.layers.addText(lay.text);
      layer.name = "Vasanam " + (i + 1);
      var prop = layer.property("Source Text");
      var doc = prop.value;
      if (look.font) { try { doc.font = look.font; } catch (e) {} } // keeps the default when the font isn't installed
      doc.fontSize = Math.round(fontSize * lay.fit);
      doc.fillColor = look.color || [1, 1, 1];
      doc.applyStroke = !!look.stroke;
      if (look.stroke) {
        doc.strokeColor = look.stroke;
        doc.strokeWidth = Math.max(1, Math.round(fontSize * (look.strokeWidth || 0.06) * 2));
        doc.strokeOverFill = false;
      }
      doc.justification = ParagraphJustification.CENTER_JUSTIFY;
      prop.setValue(doc);
      layer.property("Position").setValue([x, y]);
      layer.inPoint = Math.max(0, c.start);
      layer.outPoint = Math.min(comp.duration, c.end);
    }
    app.endUndoGroup();
    return "OK|Added " + cues.length + " subtitle layers.";
  } catch (e) {
    app.endUndoGroup();
    return "ERR|" + e.toString();
  }
}
