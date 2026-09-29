import { auth, sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";

// Sin "server-only" para poder usarlo también desde scripts/ con tsx.
// Nunca importar desde un componente de cliente: usa la clave privada.

let cached: sheets_v4.Sheets | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export function getSheetId(): string {
  return requireEnv("GOOGLE_SHEET_ID");
}

export function getSheets(): sheets_v4.Sheets {
  if (cached) return cached;
  const client = new auth.JWT({
    email: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    // En .env y en Vercel la clave va en una línea con los saltos escapados.
    key: requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  cached = sheetsApi({ version: "v4", auth: client });
  return cached;
}

export type Cell = string | number | boolean;

export async function readRows(tab: string): Promise<string[][]> {
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${tab}!A2:ZZ`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map((v) => String(v ?? "")));
}

function toCellData(value: Cell): sheets_v4.Schema$CellData {
  if (typeof value === "number") return { userEnteredValue: { numberValue: value } };
  if (typeof value === "boolean") return { userEnteredValue: { boolValue: value } };
  return { userEnteredValue: { stringValue: value } };
}

// Agrega filas en varias pestañas en una sola operación: Google aplica todo o nada.
export async function appendRowsAtomic(rowsByTab: Record<string, Cell[][]>): Promise<void> {
  const spreadsheetId = getSheetId();
  const meta = await getSheets().spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const ids = new Map(
    (meta.data.sheets ?? []).map((s) => [s.properties!.title!, s.properties!.sheetId!]),
  );

  const requests = Object.entries(rowsByTab)
    .filter(([, rows]) => rows.length > 0)
    .map(([tab, rows]) => {
      const sheetId = ids.get(tab);
      if (sheetId === undefined) throw new Error(`No existe la pestaña ${tab} en el Sheet`);
      return {
        appendCells: {
          sheetId,
          rows: rows.map((row) => ({ values: row.map(toCellData) })),
          fields: "userEnteredValue",
        },
      };
    });

  if (requests.length === 0) return;
  await getSheets().spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

export async function appendRows(tab: string, rows: Cell[][]): Promise<void> {
  if (rows.length === 0) return;
  await getSheets().spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}
