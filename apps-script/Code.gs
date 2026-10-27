/**
 * RSVP backend for the wedding invitation.
 *
 * Setup (once):
 *   1. Open your Google Sheet → Extensions → Apps Script, paste this file.
 *   2. Select `setup` in the toolbar and press Run (authorize when asked).
 *   3. Deploy → New deployment → type "Web app",
 *      Execute as: Me, Who has access: Anyone → Deploy.
 *   4. Copy the Web app URL (ends with /exec) into js/config.js.
 *
 * Each guest's browser sends a random id, so "Change my answer" updates the
 * existing row instead of adding a duplicate.
 */

var DEADLINE = new Date("2026-12-27T23:59:59+05:00");
var SHEET_RSVP = "RSVP";
var SHEET_SUMMARY = "Summary";
var MAX_COMPANIONS = 10;
var HEADERS = ["Timestamp", "Language", "Name", "Attending", "Party", "Companions", "Total guests", "ID"];
var ID_COL = 8;

function doPost(e) {
  if (new Date() > DEADLINE) return json_({ ok: false, error: "closed" });

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad_json" });
  }

  var name = clean_(data.name);
  var attending = data.attending === "yes" ? "yes" : data.attending === "no" ? "no" : "";
  if (!name || !attending) return json_({ ok: false, error: "invalid" });

  var party = attending === "yes" && data.party === "with" ? "with" : attending === "yes" ? "alone" : "";
  var companions = party === "with" && Array.isArray(data.companions)
    ? data.companions.map(clean_).filter(String).slice(0, MAX_COMPANIONS)
    : [];
  var id = /^[a-f0-9]{8,64}$/i.test(String(data.id || "")) ? String(data.id) : Utilities.getUuid();
  var lang = data.lang === "en" ? "en" : "kk";

  var row = [
    new Date(),
    lang,
    name,
    attending === "yes" ? "Yes" : "No",
    party === "with" ? "With others" : party === "alone" ? "Alone" : "",
    companions.join(", "),
    attending === "yes" ? 1 + companions.length : 0,
    id
  ];

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = rsvpSheet_();
    var existing = findRowById_(sheet, id);
    if (existing) {
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

function doGet() {
  return json_({ ok: true, open: new Date() <= DEADLINE });
}

/** Run once from the editor to create the sheets and summary formulas. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = rsvpSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("dd.mm.yyyy hh:mm");

  var summary = ss.getSheetByName(SHEET_SUMMARY) || ss.insertSheet(SHEET_SUMMARY);
  summary.clear();
  summary.getRange("A1:B4").setValues([
    ["Келеді (жауап) / Coming (replies)", '=COUNTIF(RSVP!D2:D,"Yes")'],
    ["Келмейді / Not coming", '=COUNTIF(RSVP!D2:D,"No")'],
    ["Барлық қонақ / Total guests", '=SUMIF(RSVP!D2:D,"Yes",RSVP!G2:G)'],
    ["Барлық жауап / All replies", "=COUNTA(RSVP!C2:C)"]
  ]);
  summary.getRange("A1:A4").setFontWeight("bold");

  summary.getRange("A6:C6").setValues([["Келетіндер / Coming", "Бірге келетіндер / Companions", "Саны / Guests"]]);
  summary.getRange("A7").setFormula('=IFERROR(FILTER({RSVP!C2:C,RSVP!F2:F,RSVP!G2:G},RSVP!D2:D="Yes"),"—")');
  summary.getRange("E6").setValue("Келмейтіндер / Not coming");
  summary.getRange("E7").setFormula('=IFERROR(FILTER(RSVP!C2:C,RSVP!D2:D="No"),"—")');
  summary.getRange("A6:E6").setFontWeight("bold");
  summary.setColumnWidths(1, 5, 220);
  summary.setFrozenRows(6);

  ss.setActiveSheet(summary);
}

function rsvpSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_RSVP) || ss.insertSheet(SHEET_RSVP, 0);
}

function findRowById_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, ID_COL, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return 0;
}

// Trim, cap length and neutralise spreadsheet formula prefixes.
function clean_(value) {
  return String(value == null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .replace(/^[=+\-@]+/, "")
    .trim()
    .slice(0, 100);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
