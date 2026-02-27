/*******************************************************
 * StaySharp Web App Backend
 * - Read: History, Database
 * - Write: History
 * - Token auth
 * - Header aliases (RU/EN)
 * - Last edit wins by UpdatedAt
 * - Idempotent delete
 * - Auto ID/Date/UpdatedAt on manual sheet edits
 *******************************************************/

// ====== CONFIG ======
var TOKEN_PROP_KEY = 'API_TOKEN';
var FALLBACK_TOKEN = 'StaySharp_Secure_Token_2026';

var SHEET_HISTORY = 'History';
var SHEET_DATABASE = 'Database';

var ALLOWED_READ_SHEETS = [SHEET_HISTORY, SHEET_DATABASE];
var ALLOWED_WRITE_SHEETS = [SHEET_HISTORY];
var CACHE_KEY_PREFIX = 'sheet_json_v1:';
var CACHE_MAX_PAYLOAD_CHARS = 90000;
var CACHE_TTL_HISTORY_SEC = 12;
var CACHE_TTL_DATABASE_SEC = 45;

// Canonical fields -> acceptable header/key aliases
var FIELD_ALIASES = {
  id: ['ID', 'id', 'ид', '№'],
  date: ['Date', 'date', 'дата'],
  updatedAt: ['UpdatedAt', 'updatedAt', 'Updated At', 'updated_at', 'времяобновления'],
  brand: ['Brand', 'brand', 'бренд'],
  series: ['Series', 'series', 'серия'],
  steel: ['Steel', 'steel', 'сталь'],
  carbon: ['C, %', 'c,%', 'carbon', 'c'],
  crmov: ['CrMoV, %', 'crmov,%', 'crmov'],
  length: ['Length', 'length', 'длина'],
  width: ['Width', 'width', 'ширина'],
  angle: ['Sharp. angle (double)', 'sharp angle double', 'Angle', 'angle', 'угол'],
  honingAdd: ['Honing add', 'honingadd', 'honing_add', 'honing', 'доводка'],
  bess: ['BESS g', 'bessg', 'bess', 'BESS'],
  comments: ['Comments', 'comments', 'comment', 'комментарии']
};

// ====== PUBLIC ENDPOINTS ======
function doGet(e) {
  try {
    var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
    if (!isAuthorized_(token)) {
      return jsonOut_({ error: 'Unauthorized: Invalid or missing token' });
    }

    var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : '';
    if (ALLOWED_READ_SHEETS.indexOf(sheetName) === -1) {
      return jsonOut_({ error: 'Forbidden: Not allowed to read this sheet' });
    }

    var cachedPayload = getCachedSheetPayload_(sheetName);
    if (cachedPayload) {
      return jsonTextOut_(cachedPayload);
    }

    var sheet = getSheet_(sheetName);
    if (!sheet) {
      return jsonOut_({ error: 'Sheet not found: ' + sheetName });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      putCachedSheetPayload_(sheetName, '[]');
      return jsonOut_([]);
    }

    var headers = values[0].map(function (h) { return String(h); });
    var out = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var hasData = row.some(isFilled_);
      if (!hasData) continue;

      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      out.push(obj);
    }

    var payload = JSON.stringify(out);
    putCachedSheetPayload_(sheetName, payload);
    return jsonTextOut_(payload);
  } catch (err) {
    return jsonOut_({ error: err.message || String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(25000);

    var requestData = parseRequestData_(e);
    if (!requestData) {
      return textOut_('Error: Empty or invalid request body');
    }

    if (!isAuthorized_(requestData.token)) {
      return textOut_('Error: Unauthorized');
    }

    var sheetName = String(requestData.sheet || '');
    if (ALLOWED_WRITE_SHEETS.indexOf(sheetName) === -1) {
      return textOut_('Error: Forbidden sheet');
    }

    var sheet = getSheet_(sheetName);
    if (!sheet) {
      return textOut_('Error: Sheet not found');
    }

    var action = String(requestData.action || '').toLowerCase();
    var record = normalizeRecord_(requestData.record || {});

    if (!record.id) record.id = generateId_();
    if (!record.date) record.date = displayDateNow_();
    if (!record.updatedAt) record.updatedAt = nowIso_();

    var values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) {
      return textOut_('Error: Header row is missing');
    }

    var headers = values[0].map(function (h) { return String(h); });
    var meta = buildHeaderMeta_(headers);
    var idColIndex = meta.colIndexByCanonical.id;
    var updatedAtColIndex = meta.colIndexByCanonical.updatedAt;

    if (action === 'add' || action === 'update') {
      var rowData = headers.map(function (_h, colIndex) {
        var canonical = meta.canonicalByCol[colIndex];
        var v = canonical ? valueByCanonical_(record, canonical) : '';
        return sanitizeInput_(v);
      });

      var hasMappedData = rowData.some(isFilled_);
      if (!hasMappedData) {
        return textOut_('Error: Empty mapped row');
      }

      var targetRow = -1;
      if (idColIndex !== -1) {
        targetRow = findRowById_(values, idColIndex, record.id);
      }

      if (targetRow > 0 && updatedAtColIndex !== -1) {
        var existingUpdatedAt = values[targetRow - 1][updatedAtColIndex];
        var existingTs = parseTs_(existingUpdatedAt);
        var incomingTs = parseTs_(record.updatedAt);

        // Last edit wins: older update is ignored but treated as success.
        if (existingTs > 0 && incomingTs > 0 && incomingTs < existingTs) {
          return textOut_('Success: Ignored older update');
        }
      }

      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        invalidateSheetCache_(sheetName);
        return textOut_('Success: Updated');
      } else {
        sheet.appendRow(rowData);
        invalidateSheetCache_(sheetName);
        return textOut_('Success: Added');
      }
    }

    if (action === 'delete') {
      if (!record.id) {
        return textOut_('Error: Record ID required for deletion');
      }

      if (idColIndex === -1) {
        return textOut_('Error: ID column not found');
      }

      var rowToDelete = findRowById_(values, idColIndex, record.id);
      if (rowToDelete > 0) {
        sheet.deleteRow(rowToDelete);
        invalidateSheetCache_(sheetName);
        return textOut_('Success: Deleted');
      }

      // Idempotent delete: already deleted should not cause client retries.
      return textOut_('Success: Already deleted');
    }

    return textOut_('Error: Unknown action');
  } catch (err) {
    return textOut_('Error: ' + (err.message || String(err)));
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ====== MANUAL ENTRY HELPER ======
// Trigger: installable onEdit (recommended) or simple onEdit.
function onEdit(e) {
  try {
    if (!e || !e.range) return;

    var sh = e.range.getSheet();
    if (!sh) return;

    var sheetName = sh.getName();
    if (sheetName !== SHEET_HISTORY && sheetName !== SHEET_DATABASE) return;

    invalidateSheetCache_(sheetName);

    if (sheetName !== SHEET_HISTORY) return;

    var row = e.range.getRow();
    if (row < 2) return; // skip header

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h); });
    var meta = buildHeaderMeta_(headers);

    var idCol = meta.colIndexByCanonical.id;
    var dateCol = meta.colIndexByCanonical.date;
    var updatedAtCol = meta.colIndexByCanonical.updatedAt;
    if (idCol === -1 || dateCol === -1 || updatedAtCol === -1) return;

    // Check if row has business data (excluding technical fields)
    var rowValues = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    var hasBusinessData = false;
    for (var c = 0; c < rowValues.length; c++) {
      var canon = meta.canonicalByCol[c];
      if (canon === 'id' || canon === 'date' || canon === 'updatedAt') continue;
      if (isFilled_(rowValues[c])) {
        hasBusinessData = true;
        break;
      }
    }
    if (!hasBusinessData) return;

    if (!isFilled_(rowValues[idCol])) {
      sh.getRange(row, idCol + 1).setValue(generateId_());
    }

    if (!isFilled_(rowValues[dateCol])) {
      var dateCell = sh.getRange(row, dateCol + 1);
      dateCell.setValue(new Date());
      dateCell.setNumberFormat('dd.MM.yyyy HH:mm:ss');
    }

    sh.getRange(row, updatedAtCol + 1).setValue(nowIso_());
  } catch (_) {}
}

// ====== HELPERS ======
function isAuthorized_(token) {
  var propToken = PropertiesService.getScriptProperties().getProperty(TOKEN_PROP_KEY);
  var effective = propToken || FALLBACK_TOKEN;
  return String(token || '') === String(effective || '');
}

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getSheetCacheTtl_(sheetName) {
  return sheetName === SHEET_DATABASE ? CACHE_TTL_DATABASE_SEC : CACHE_TTL_HISTORY_SEC;
}

function cacheKeyForSheet_(sheetName) {
  return CACHE_KEY_PREFIX + String(sheetName || '');
}

function getCachedSheetPayload_(sheetName) {
  try {
    return CacheService.getScriptCache().get(cacheKeyForSheet_(sheetName));
  } catch (_) {
    return null;
  }
}

function putCachedSheetPayload_(sheetName, payload) {
  var text = String(payload || '');
  if (!text || text.length > CACHE_MAX_PAYLOAD_CHARS) return;

  try {
    CacheService.getScriptCache().put(cacheKeyForSheet_(sheetName), text, getSheetCacheTtl_(sheetName));
  } catch (_) {}
}

function invalidateSheetCache_(sheetName) {
  try {
    CacheService.getScriptCache().remove(cacheKeyForSheet_(sheetName));
  } catch (_) {}
}

function parseRequestData_(e) {
  var raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '';
  var ctype = (e && e.postData && e.postData.type) ? String(e.postData.type) : '';

  if (!raw) return null;

  var obj = null;

  // Try JSON first
  if (ctype.indexOf('application/json') >= 0 || ctype.indexOf('text/plain') >= 0 || raw.charAt(0) === '{') {
    try { obj = JSON.parse(raw); } catch (_) {}
  }

  // Fallback: x-www-form-urlencoded
  if (!obj) {
    obj = parseFormEncoded_(raw);
    if (obj.record && typeof obj.record === 'string') {
      try { obj.record = JSON.parse(obj.record); } catch (_) {}
    }
  }

  if (!obj || typeof obj !== 'object') return null;

  // Fallback if record not provided
  if (!obj.record || typeof obj.record !== 'object') {
    obj.record = {
      id: obj.id || '',
      date: obj.date || '',
      updatedAt: obj.updatedAt || obj.updated_at || '',
      brand: obj.brand || '',
      series: obj.series || '',
      steel: obj.steel || '',
      carbon: obj.carbon || '',
      crmov: obj.crmov || '',
      length: obj.length || '',
      width: obj.width || '',
      angle: obj.angle || '',
      honingAdd: obj.honingAdd || obj.honing_add || '',
      bess: obj.bess || '',
      comments: obj.comments || ''
    };
  }

  return obj;
}

function parseFormEncoded_(raw) {
  var out = {};
  String(raw || '').split('&').forEach(function (part) {
    if (!part) return;
    var idx = part.indexOf('=');
    var k = idx >= 0 ? part.slice(0, idx) : part;
    var v = idx >= 0 ? part.slice(idx + 1) : '';
    var key = decodeURIComponent(k.replace(/\+/g, ' '));
    var val = decodeURIComponent(v.replace(/\+/g, ' '));
    out[key] = val;
  });
  return out;
}

function normalizeRecord_(r) {
  r = r || {};
  return {
    id: str_(r.id || r.ID),
    date: str_(r.date || r.Date),
    updatedAt: str_(r.updatedAt || r.UpdatedAt || r['Updated At'] || r.updated_at),
    brand: str_(r.brand || r.Brand),
    series: str_(r.series || r.Series),
    steel: str_(r.steel || r.Steel),
    carbon: str_(r.carbon || r['C, %']),
    crmov: str_(r.crmov || r['CrMoV, %']),
    length: str_(r.length || r.Length),
    width: str_(r.width || r.Width),
    angle: str_(r.angle || r['Sharp. angle (double)']),
    honingAdd: str_(r.honingAdd || r['Honing add']),
    bess: str_(r.bess || r['BESS g']),
    comments: str_(r.comments || r.Comments)
  };
}

function buildHeaderMeta_(headers) {
  var canonicalByCol = [];
  var colIndexByCanonical = {};

  for (var i = 0; i < headers.length; i++) {
    var canonical = canonicalFromHeader_(headers[i]);
    canonicalByCol.push(canonical);
    if (canonical && colIndexByCanonical[canonical] === undefined) {
      colIndexByCanonical[canonical] = i;
    }
  }

  if (colIndexByCanonical.id === undefined) colIndexByCanonical.id = -1;
  if (colIndexByCanonical.date === undefined) colIndexByCanonical.date = -1;
  if (colIndexByCanonical.updatedAt === undefined) colIndexByCanonical.updatedAt = -1;

  return {
    canonicalByCol: canonicalByCol,
    colIndexByCanonical: colIndexByCanonical
  };
}

function canonicalFromHeader_(header) {
  var h = keyNorm_(header);
  for (var canonical in FIELD_ALIASES) {
    var aliases = FIELD_ALIASES[canonical];
    for (var i = 0; i < aliases.length; i++) {
      if (keyNorm_(aliases[i]) === h) return canonical;
    }
  }
  return null;
}

function valueByCanonical_(record, canonical) {
  if (!record || !canonical) return '';
  return Object.prototype.hasOwnProperty.call(record, canonical) ? record[canonical] : '';
}

function keyNorm_(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.,;%()\-_/:'"\\]+/g, '');
}

function findRowById_(values, idColIndex, idValue) {
  if (idColIndex < 0 || !isFilled_(idValue)) return -1;
  var target = String(idValue);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idColIndex]) === target) return i + 1; // 1-based row
  }
  return -1;
}

function sanitizeInput_(v) {
  var val = v;
  if (typeof val === 'string') {
    val = val.trim();
    if (/^[=+\-@]/.test(val)) {
      val = "'" + val; // formula injection guard
    }
  }
  return val;
}

function isFilled_(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

function str_(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

function parseTs_(v) {
  if (!v) return 0;
  var t = Date.parse(String(v));
  return isNaN(t) ? 0 : t;
}

function nowIso_() {
  return new Date().toISOString();
}

function displayDateNow_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm:ss');
}

function generateId_() {
  // Timestamp-only ID by request
  return String(Date.now());
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonTextOut_(jsonText) {
  return ContentService
    .createTextOutput(String(jsonText || '[]'))
    .setMimeType(ContentService.MimeType.JSON);
}

function textOut_(s) {
  return ContentService
    .createTextOutput(String(s))
    .setMimeType(ContentService.MimeType.TEXT);
}
