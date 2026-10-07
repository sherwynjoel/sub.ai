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

// cues: [{start, end, text}] already in comp time. Creates one text layer per cue.
function vs_aeAddTextLayers(cues) {
  try {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return "ERR|Open a composition first.";
    app.beginUndoGroup("Vasanam subtitles");
    for (var i = cues.length - 1; i >= 0; i--) {
      var c = cues[i];
      if (c.end <= 0 || c.start >= comp.duration) continue;
      var layer = comp.layers.addText(c.text);
      layer.name = "Sub " + (i + 1);
      var prop = layer.property("Source Text");
      var doc = prop.value;
      doc.fontSize = Math.round(comp.height / 22);
      doc.fillColor = [1, 1, 1];
      doc.applyStroke = true;
      doc.strokeColor = [0, 0, 0];
      doc.strokeWidth = Math.max(2, Math.round(comp.height / 300));
      doc.strokeOverFill = false;
      doc.justification = ParagraphJustification.CENTER_JUSTIFY;
      prop.setValue(doc);
      layer.property("Position").setValue([comp.width / 2, comp.height * 0.88]);
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
