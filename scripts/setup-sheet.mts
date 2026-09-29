// Crea las pestañas y encabezados del Sheet de datos. Se puede correr varias veces:
// no borra datos, solo crea lo que falta y avisa si un encabezado no coincide.
// Uso: npm run setup-sheet
import { getSheetId, getSheets } from "../src/lib/sheets/client";
import { TABS } from "../src/lib/sheets/schema";

const sheets = getSheets();
const spreadsheetId = getSheetId();

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const existing = new Map(
  (meta.data.sheets ?? []).map((s) => [s.properties!.title!, s.properties!.sheetId!]),
);

const tabs = Object.values(TABS);
const missing = tabs.filter((t) => !existing.has(t.name));

if (missing.length > 0) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((t) => ({
        addSheet: { properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } },
      })),
    },
  });
  for (const reply of res.data.replies ?? []) {
    const p = reply.addSheet!.properties!;
    existing.set(p.title!, p.sheetId!);
  }
}

for (const tab of tabs) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab.name}!1:1`,
  });
  const current = res.data.values?.[0] ?? [];

  if (current.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab.name}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...tab.headers]] },
    });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: existing.get(tab.name), startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
        ],
      },
    });
    console.log(`✔ ${tab.name}: encabezados creados`);
  } else if (tab.headers.every((h, i) => current[i] === h)) {
    console.log(`✔ ${tab.name}: ya estaba bien`);
  } else {
    console.warn(`⚠ ${tab.name}: los encabezados no coinciden, revisar a mano`);
    console.warn(`   esperado: ${tab.headers.join(", ")}`);
    console.warn(`   actual:   ${current.join(", ")}`);
  }
}

// Borra la pestaña por defecto ("Hoja 1" / "Sheet1") solo si está vacía.
for (const name of ["Hoja 1", "Sheet1"]) {
  const sheetId = existing.get(name);
  if (sheetId === undefined) continue;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A1:Z20` });
  if ((res.data.values ?? []).length > 0) continue;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ deleteSheet: { sheetId } }] },
  });
  console.log(`✔ "${name}" vacía, eliminada`);
}
