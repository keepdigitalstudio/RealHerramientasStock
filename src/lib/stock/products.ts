import { readRows, type Cell } from "@/lib/sheets/client";
import { TABS } from "@/lib/sheets/schema";
import { estadoDe, type Estado } from "./constants";

export type Product = {
  sku: string;
  productoBase: string;
  variante: string;
  marca: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  ubicaciones: string;
  mlItemId: string;
  webId: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
};

export type ProductWithEstado = Product & { estado: Estado };

// Fila de la hoja donde está el producto (la 1 es el encabezado).
export type StoredProduct = Product & { sheetRow: number };

const num = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function fromRow(r: string[], sheetRow: number): StoredProduct {
  return {
    sku: r[0] ?? "",
    productoBase: r[1] ?? "",
    variante: r[2] ?? "",
    marca: r[3] ?? "",
    descripcion: r[4] ?? "",
    stockActual: num(r[5]),
    stockMinimo: num(r[6]),
    ubicaciones: r[7] ?? "",
    mlItemId: r[8] ?? "",
    webId: r[9] ?? "",
    activo: (r[10] ?? "").toLowerCase() !== "false",
    creadoEn: r[11] ?? "",
    actualizadoEn: r[12] ?? "",
    sheetRow,
  };
}

export function toRow(p: Product): Cell[] {
  return [
    p.sku,
    p.productoBase,
    p.variante,
    p.marca,
    p.descripcion,
    p.stockActual,
    p.stockMinimo,
    p.ubicaciones,
    p.mlItemId,
    p.webId,
    p.activo,
    p.creadoEn,
    p.actualizadoEn,
  ];
}

export async function readProducts(): Promise<StoredProduct[]> {
  const rows = await readRows(TABS.productos.name);
  return rows
    .map((r, i) => fromRow(r, i + 2))
    .filter((p) => p.sku.trim() !== "");
}

export function withEstado<T extends Product>(p: T): T & { estado: Estado } {
  return { ...p, estado: estadoDe(p.stockActual, p.stockMinimo) };
}

export async function findProduct(sku: string): Promise<StoredProduct | undefined> {
  return (await readProducts()).find((p) => p.sku === sku);
}
