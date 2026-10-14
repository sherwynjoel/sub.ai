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
function vs_pproAddGraphics(cues, look, tpl, mediaPath) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return "ERR|Open a sequence first.";
    look = look || {};
    var offset = look.offset || 0.09, z = look.safe || { top: 0, right: 0.07, bottom: 0, left: 0.07 };
    // Where the graphic's centre goes, as a fraction of the frame: inside the safe zone.
    var yf = look.y != null ? look.y : look.position === "top" ? offset + 0.04 : look.position === "middle" ? (z.top + 1 - z.bottom) / 2 : 1 - offset - 0.04;
    var xf = look.x != null ? look.x : (z.left + 1 - z.right) / 2;
    var W = seq.frameSizeHorizontal || 1920, H = seq.frameSizeVertical || 1080;
    // Clear our earlier graphics and find the clip's track.
    var clipTrack = -1, t, k;
    for (t = 0; t < seq.videoTracks.numTracks; t++) {
      var tr = seq.videoTracks[t];
      for (k = tr.clips.numItems - 1; k >= 0; k--) {
        var cl = tr.clips[k];
        if (/^Vasanam \d+$/.test(cl.name)) { try { cl.remove(false, false); } catch (e) {} }
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
    var set = {}, names = [], n = 0, most = 0; // most: the fewest lines a caption had to drop to
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.end <= c.start) continue;
      var at = new Time(); at.seconds = c.start;
      var item;
      try { item = seq.importMGT(tpl.path, at.ticks, target, 0); }
      catch (e) { return "ERR|This Premiere Pro (" + app.version + ") can't load the caption template. It may need a newer Premiere Pro; pick another style."; }
      if (!item) return "ERR|Premiere could not import the caption template.";
      item.name = "Vasanam " + (i + 1);
      var fit = vs_templateFit(String(c.text), tpl, W, H, z, look.size, xf, yf, look.lines > 0), place = fit.place;
      if (fit.fewer) most = most ? Math.min(most, fit.fewer) : fit.fewer;
      try { var end = new Time(); end.seconds = c.end; item.end = end; set.duration = 1; } catch (e) {
        try { var out = new Time(); out.seconds = c.end - c.start; item.outPoint = out; set.duration = 1; } catch (e2) {}
      }
      var comp = item.getMGTComponent();
      var props = comp ? comp.properties : null;
      for (var p = 0; props && p < props.numItems; p++) {
        var prm = props[p], name = prm.displayName;
        if (i === 0) names.push(name);
        try {
          if (name === tpl.text || (!tpl.text && name === "Source Text")) {
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
            if (mp.displayName === "Position") {
              var cur = mp.getValue(), frac = cur[0] <= 1 && cur[1] <= 1;
              mp.setValue(frac ? [place.x / W, place.y / H] : [place.x, place.y], true);
              set.position = 1;
            } else if (mp.displayName === "Scale") { mp.setValue(place.scale, true); set.scale = 1; }
          }
        }
      } catch (e) {}
      n++;
    }
    var done = [];
    for (var s in set) done.push(s);
    // "OK|message|details": the panel shows the message; the details (for checking a new template) go in its tooltip.
    return "OK|Added " + n + " styled captions on V" + (target + 1) + "." + (most ? " This template fits at most " + most + (most === 1 ? " line" : " lines") + ", so longer captions use " + most + "." : "") +
      "|Set: " + (done.join(", ") || "nothing") + ". Template controls: " + names.join(", ");
  } catch (e) {
    return "ERR|" + e.toString();
  }
}

// A template caption's text and placement. Lines the caption already has (one per language, or the Lines setting)
// are kept; a single long line that would need a much smaller font is split into two balanced lines instead.
// chosen: the user picked the number of lines (Lines = 1, 2 or 3), so the lines are only ever sized, never re-split.
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
// charW (average character width) and size (font size), all in template pixels; fixedLeading = the line spacing
// stays the same when the font shrinks; maxLines = the most lines the template shows.
// lines: the caption's lines; W, H: sequence frame; z: safe zone margins; xf, yf: where the caption's centre goes.
// Returns {scale: Motion scale %, font: font size for the text, x, y: Motion position in frame pixels,
// fits: every line is inside the template's frame top to bottom}.
function vs_templatePlace(lines, tpl, W, H, z, size, xf, yf) {
  var tw = tpl.w || 1920, th = tpl.h || 1080;
  var L = tpl.layout || { align: "center", x: tw / 2, top: th * 0.44, bottom: th * 0.56, pitch: th * 0.14, charW: th * 0.072, size: th * 0.12 };
  var n = 1;
  for (var i = 0; i < lines.length; i++) n = Math.max(n, String(lines[i]).length);
  var wide = n * L.charW; // longest line at the template's own font size
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
  return {
    scale: Math.round(s * 1000) / 10,
    font: font,
    x: Math.round(xf * W - (tx - tw / 2) * s),
    y: Math.round(yf * H - (ty - th / 2) * s),
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
    var y = look.y != null ? comp.height * look.y + fontSize / 2 // dragged on the website
      : look.position === "top" ? comp.height * offset + fontSize
      : look.position === "middle" ? comp.height * (z.top + 1 - z.bottom) / 2 + fontSize / 2
      : comp.height * (1 - offset);
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
