import type { CellValue, Workbook, Worksheet } from "exceljs";
import { normalizeSku } from "@/lib/stock/constants";

// Lee el Excel del relevamiento (plantilla "RELEVAMIENTO DE STOCK – DEPÓSITO")
// y consolida el stock por SKU. No escribe nada: solo arma la vista previa.

export type IssueLevel = "error" | "warning";

export type ImportIssue = {
  level: IssueLevel;
  message: string;
  hoja?: string;
  fila?: number;
  sku?: string;
};

export type CountRow = {
  hoja: string;
  fila: number;
  fecha: string;
  zona: string;
  modulo: string;
  nivel: string;
  marca: string;
  sku: string;
  descripcion: string;
  cajas: number;
  unidPorCaja: number;
  sueltas: number;
  total: number;
  observaciones: string;
};

export type ImportedProduct = {
  sku: string;
  marca: string;
  descripcion: string;
  stock: number;
  ubicaciones: string[];
  registros: number;
};

export type ImportPreview = {
  hojas: { nombre: string; filas: number }[];
  rows: CountRow[];
  productos: ImportedProduct[];
  issues: ImportIssue[];
  totalUnidades: number;
};

const COUNT_COLUMNS = {
  fecha: "fecha",
  zona: "zona",
  modulo: "modulo",
  nivel: "nivel",
  marca: "marca",
  sku: "sku",
  descripcion: "descripcion",
  cajas: "cajascerradas",
  unidPorCaja: "unidcaja",
  sueltas: "unidsueltas",
  total: "total",
  observaciones: "observaciones",
} as const;

type CountColumn = keyof typeof COUNT_COLUMNS;

// Columnas que carga una persona. Total, Ubicación y Control son fórmulas de la
// plantilla y están en todas las filas, así que no indican que la fila tenga datos.
const MANUAL_COLUMNS: CountColumn[] = [
  "zona",
  "modulo",
  "nivel",
  "marca",
  "sku",
  "descripcion",
  "cajas",
  "unidPorCaja",
  "sueltas",
  "observaciones",
];

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cellValue(value: CellValue): string | number | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return String(value);
  if (value instanceof Date) return value;
  if ("result" in value) {
    const r = value.result;
    if (typeof r === "string" || typeof r === "number" || r instanceof Date) return r;
    return null;
  }
  if ("richText" in value) return value.richText.map((t) => t.text).join("");
  if ("text" in value) return String(value.text);
  // Fórmula sin resultado guardado o celda con error.
  return null;
}

function cellText(value: CellValue): string {
  const v = cellValue(value);
  if (v === null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function parseQuantity(value: CellValue): number | null | "invalid" {
  const v = cellValue(value);
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : v instanceof Date ? NaN : Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "invalid";
  return n;
}

function findHeaderRow(
  ws: Worksheet,
  required: string[],
): { row: number; columns: Map<string, number> } | null {
  const limit = Math.min(ws.rowCount, 20);
  for (let r = 1; r <= limit; r++) {
    const columns = new Map<string, number>();
    ws.getRow(r).eachCell((cell, col) => {
      const key = normalizeHeader(cellText(cell.value));
      if (key && !columns.has(key)) columns.set(key, col);
    });
    if (required.every((h) => columns.has(h))) return { row: r, columns };
  }
  return null;
}

function parseCountSheet(ws: Worksheet, issues: ImportIssue[]): CountRow[] {
  const hoja = ws.name;
  const header = findHeaderRow(ws, Object.values(COUNT_COLUMNS));
  if (!header) {
    const found = findHeaderRow(ws, ["sku"]);
    const missing = found
      ? Object.values(COUNT_COLUMNS).filter((h) => !found.columns.has(h))
      : ["SKU"];
    issues.push({
      level: "error",
      hoja,
      message: `No se encontraron las columnas esperadas. Faltan: ${missing.join(", ")}`,
    });
    return [];
  }

  const col = (name: CountColumn) => header.columns.get(COUNT_COLUMNS[name])!;
  const rows: CountRow[] = [];

  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (name: CountColumn) => row.getCell(col(name)).value;
    if (MANUAL_COLUMNS.every((name) => cellText(get(name)) === "")) continue;

    const at = { hoja, fila: r };
    const sku = normalizeSku(cellText(get("sku")));
    if (!sku) {
      issues.push({ level: "error", ...at, message: "Fila con datos pero sin SKU" });
      continue;
    }

    const cajas = parseQuantity(get("cajas"));
    const unidPorCaja = parseQuantity(get("unidPorCaja"));
    const sueltas = parseQuantity(get("sueltas"));
    const invalid = (
      [
        ["Cajas cerradas", cajas],
        ["Unid./caja", unidPorCaja],
        ["Unid. sueltas", sueltas],
      ] as const
    ).filter(([, v]) => v === "invalid");
    if (invalid.length > 0) {
      issues.push({
        level: "error",
        ...at,
        sku,
        message: `Cantidad inválida en ${invalid.map(([n]) => n).join(", ")} (tiene que ser un número entero, 0 o más)`,
      });
      continue;
    }

    const c = (cajas as number | null) ?? 0;
    const u = (unidPorCaja as number | null) ?? 0;
    const s = (sueltas as number | null) ?? 0;
    if (c > 0 && u === 0) {
      issues.push({
        level: "error",
        ...at,
        sku,
        message: "Tiene cajas cerradas pero falta Unid./caja",
      });
      continue;
    }

    const total = c * u + s;
    const sheetTotal = parseQuantity(get("total"));
    if (typeof sheetTotal === "number" && sheetTotal !== total) {
      issues.push({
        level: "warning",
        ...at,
        sku,
        message: `El Total de la planilla (${sheetTotal}) no coincide con cajas × unid./caja + sueltas (${total}). Se usa ${total}.`,
      });
    }
    if (total === 0) {
      issues.push({ level: "warning", ...at, sku, message: "Fila con total 0" });
    }

    rows.push({
      hoja,
      fila: r,
      fecha: cellText(get("fecha")),
      zona: cellText(get("zona")),
      modulo: cellText(get("modulo")),
      nivel: cellText(get("nivel")),
      marca: cellText(get("marca")),
      sku,
      descripcion: cellText(get("descripcion")),
      cajas: c,
      unidPorCaja: u,
      sueltas: s,
      total,
      observaciones: cellText(get("observaciones")),
    });
  }
  return rows;
}

function ubicacion(row: CountRow): string {
  return [row.zona, row.modulo, row.nivel].filter(Boolean).join("-");
}

function mostFrequent(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function consolidate(rows: CountRow[], issues: ImportIssue[]): ImportedProduct[] {
  const bySku = new Map<string, CountRow[]>();
  for (const row of rows) bySku.set(row.sku, [...(bySku.get(row.sku) ?? []), row]);

  const productos: ImportedProduct[] = [];
  for (const [sku, group] of bySku) {
    const marcas = [...new Set(group.map((r) => r.marca).filter(Boolean))];
    if (marcas.length > 1) {
      issues.push({
        level: "error",
        sku,
        message: `El mismo SKU aparece con distintas marcas: ${marcas.join(", ")}`,
      });
    }

    const descripciones = group.map((r) => r.descripcion).filter(Boolean);
    const distintas = [...new Set(descripciones.map((d) => d.toLowerCase()))];
    if (distintas.length > 1) {
      issues.push({
        level: "warning",
        sku,
        message: `El mismo SKU tiene descripciones distintas. Se usa la más repetida: "${mostFrequent(descripciones)}"`,
      });
    }

    const porUbicacion = new Map<string, CountRow[]>();
    for (const r of group) {
      const key = ubicacion(r);
      porUbicacion.set(key, [...(porUbicacion.get(key) ?? []), r]);
    }
    for (const [ub, repetidas] of porUbicacion) {
      if (repetidas.length > 1) {
        issues.push({
          level: "warning",
          sku,
          message: `Cargado ${repetidas.length} veces en la misma ubicación (${ub || "sin ubicación"}): revisar que no sea doble conteo (${repetidas.map((r) => `${r.hoja} fila ${r.fila}`).join(", ")})`,
        });
      }
    }

    productos.push({
      sku,
      marca: marcas[0] ?? "",
      descripcion: mostFrequent(descripciones),
      stock: group.reduce((sum, r) => sum + r.total, 0),
      ubicaciones: [...porUbicacion.keys()].filter(Boolean).sort(),
      registros: group.length,
    });
  }
  return productos.sort((a, b) => a.sku.localeCompare(b.sku));
}

function checkRecounts(wb: Workbook, issues: ImportIssue[]) {
  const ws = wb.worksheets.find((w) => normalizeHeader(w.name) === "recuentos");
  if (!ws) return;
  const header = findHeaderRow(ws, ["sku", "conteoinicial", "segundoconteo"]);
  if (!header) return;
  const get = (row: number, name: string) =>
    ws.getRow(row).getCell(header.columns.get(name)!).value;

  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const sku = normalizeSku(cellText(get(r, "sku")));
    const inicial = parseQuantity(get(r, "conteoinicial"));
    const segundo = parseQuantity(get(r, "segundoconteo"));
    if (!sku || typeof inicial !== "number" || typeof segundo !== "number") continue;
    if (inicial !== segundo) {
      issues.push({
        level: "warning",
        hoja: ws.name,
        fila: r,
        sku,
        message: `Recuento con diferencia (${inicial} → ${segundo}). Se importa el conteo original; si el recuento es el correcto, registrá un ajuste después.`,
      });
    }
  }
}

export function parseRelevamiento(wb: Workbook): ImportPreview {
  const issues: ImportIssue[] = [];
  const countSheets = wb.worksheets.filter((ws) => /^conteo/i.test(ws.name));

  if (countSheets.length === 0) {
    issues.push({
      level: "error",
      message:
        'El archivo no tiene pestañas de conteo (se esperan hojas cuyo nombre empiece con "Conteo", como Conteo_Topa).',
    });
  }

  const hojas: ImportPreview["hojas"] = [];
  const rows: CountRow[] = [];
  for (const ws of countSheets) {
    const parsed = parseCountSheet(ws, issues);
    hojas.push({ nombre: ws.name, filas: parsed.length });
    rows.push(...parsed);
  }

  if (countSheets.length > 0 && rows.length === 0 && !issues.some((i) => i.level === "error")) {
    issues.push({ level: "error", message: "Las pestañas de conteo están vacías: no hay nada para importar." });
  }

  checkRecounts(wb, issues);
  const productos = consolidate(rows, issues);

  return {
    hojas,
    rows,
    productos,
    issues,
    totalUnidades: productos.reduce((sum, p) => sum + p.stock, 0),
  };
}
