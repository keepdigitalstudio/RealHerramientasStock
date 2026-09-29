"use server";

import ExcelJS from "exceljs";
import { commitImport, productosCargados } from "@/lib/import/commit";
import { parseRelevamiento, type ImportIssue, type ImportedProduct } from "@/lib/import/parse";

const MAX_BYTES = 4 * 1024 * 1024;

export type PreviewResult =
  | {
      ok: true;
      fileName: string;
      hojas: { nombre: string; filas: number }[];
      filas: number;
      productos: ImportedProduct[];
      issues: ImportIssue[];
      totalUnidades: number;
      yaImportado: boolean;
    }
  | { ok: false; error: string };

export type ConfirmResult =
  | { ok: true; productos: number; unidades: number }
  | { ok: false; error: string };

async function readUpload(formData: FormData) {
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí un archivo .xlsx.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error(
      "El archivo tiene que ser .xlsx. Desde Google Sheets: Archivo → Descargar → Microsoft Excel (.xlsx).",
    );
  }
  if (file.size > MAX_BYTES) throw new Error("El archivo supera los 4 MB.");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("No se pudo leer el archivo. ¿Es un Excel válido?");
  }
  return { fileName: file.name, preview: parseRelevamiento(wb) };
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Error inesperado.";
}

export async function previewImport(formData: FormData): Promise<PreviewResult> {
  try {
    const { fileName, preview } = await readUpload(formData);
    return {
      ok: true,
      fileName,
      hojas: preview.hojas,
      filas: preview.rows.length,
      productos: preview.productos,
      issues: preview.issues,
      totalUnidades: preview.totalUnidades,
      yaImportado: (await productosCargados()) > 0,
    };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

// Vuelve a leer el archivo en vez de confiar en la vista previa que tiene el navegador.
export async function confirmImport(formData: FormData): Promise<ConfirmResult> {
  try {
    const { preview } = await readUpload(formData);
    const res = await commitImport(preview, "sistema"); // TODO etapa 5: usuario logueado
    return { ok: true, productos: res.productos, unidades: res.unidades };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
