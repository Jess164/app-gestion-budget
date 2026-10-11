/**
 * PasD'Tal' : script Google qui garde les données des deux sœurs.
 *
 * Il vit dans une feuille Google Sheets de ton Drive (une ligne par enregistrement).
 * L'appli lui envoie les changements de chaque téléphone et récupère ceux de l'autre.
 * Le code secret est créé par l'appli à la première configuration et gardé dans les propriétés du script.
 *
 * Installation : voir le README du dépôt, partie « Installer le script Google ».
 *
 * @OnlyCurrentDoc
 */

var SHEET_NAME = 'donnees';
var HEADERS = ['id', 'type', 'rev', 'updatedAt', 'json'];

function doGet() {
  var props = PropertiesService.getScriptProperties();
  return json_({ ok: true, app: "PasD'Tal'", initialized: !!props.getProperty('CODE') });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  var props = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var code = props.getProperty('CODE');
    if (req.action === 'init') {
      if (code) return json_({ ok: false, error: 'already_initialized' });
      if (typeof req.code !== 'string' || req.code.length < 20) return json_({ ok: false, error: 'bad_code' });
      props.setProperty('CODE', req.code);
      return json_(sync_(props, req.changes || [], 0));
    }
    if (!code || req.code !== code) return json_({ ok: false, error: 'bad_code' });
    if (req.action === 'sync') return json_(sync_(props, req.changes || [], Number(req.since) || 0));
    return json_({ ok: false, error: 'unknown_action' });
  } finally {
    lock.releaseLock();
  }
}

/** Applique les changements reçus, puis renvoie tout ce qui a changé depuis la révision « since ». */
function sync_(props, changes, since) {
  var sheet = sheet_();
  var rows = readRows_(sheet);
  var rev = Number(props.getProperty('REV')) || 0;
  var result = mergeRows_(rows, changes, rev);
  writeRows_(sheet, result.updates, result.appends, rows.length);
  if (result.rev !== rev) props.setProperty('REV', String(result.rev));
  var all = rows.concat(result.appends);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (Number(all[i][2]) > since) {
      var rec = JSON.parse(all[i][4]);
      rec.rev = Number(all[i][2]);
      out.push(rec);
    }
  }
  return { ok: true, rev: result.rev, records: out };
}

/**
 * Fusion enregistrement par enregistrement : le plus récent (updatedAt) gagne,
 * et à égalité, l'appareil dont l'identifiant est le plus grand (by).
 * rows : tableau de [id, type, rev, updatedAt, json]. Modifie les lignes existantes sur place.
 */
function mergeRows_(rows, changes, rev) {
  var index = {};
  for (var i = 0; i < rows.length; i++) index[rows[i][0]] = i;
  var updates = [];
  var appends = [];
  var appendIndex = {};
  for (var c = 0; c < changes.length; c++) {
    var ch = changes[c];
    if (!ch || typeof ch.id !== 'string' || typeof ch.updatedAt !== 'number' || typeof ch.type !== 'string') continue;
    var copy = {};
    for (var k in ch) if (k !== 'rev') copy[k] = ch[k];
    var row;
    var where = index[ch.id];
    var current = where !== undefined ? rows[where] : appendIndex[ch.id] !== undefined ? appends[appendIndex[ch.id]] : null;
    if (current) {
      var cur = JSON.parse(current[4]);
      var newer = ch.updatedAt > cur.updatedAt || (ch.updatedAt === cur.updatedAt && String(ch.by) > String(cur.by));
      if (!newer) continue;
    }
    rev++;
    row = [ch.id, ch.type, rev, ch.updatedAt, JSON.stringify(copy)];
    if (where !== undefined) {
      rows[where] = row;
      updates.push(where);
    } else if (appendIndex[ch.id] !== undefined) {
      appends[appendIndex[ch.id]] = row;
    } else {
      appendIndex[ch.id] = appends.length;
      appends.push(row);
    }
  }
  var unique = [];
  var seen = {};
  for (var u = 0; u < updates.length; u++) if (!seen[updates[u]]) { seen[updates[u]] = true; unique.push({ index: updates[u], row: rows[updates[u]] }); }
  return { rev: rev, updates: unique, appends: appends };
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function writeRows_(sheet, updates, appends, existingCount) {
  for (var i = 0; i < updates.length; i++) {
    sheet.getRange(updates[i].index + 2, 1, 1, HEADERS.length).setValues([updates[i].row]);
  }
  if (appends.length) {
    sheet.getRange(existingCount + 2, 1, appends.length, HEADERS.length).setValues(appends);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** À lancer à la main depuis l'éditeur seulement pour tout recommencer : efface le code secret (les données restent). */
function oublierLeCodeSecret() {
  PropertiesService.getScriptProperties().deleteProperty('CODE');
}
