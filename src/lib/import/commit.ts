import { randomUUID } from "node:crypto";
import { appendRowsAtomic, readRows, type Cell } from "@/lib/sheets/client";
import { TABS } from "@/lib/sheets/schema";
import { nowAr } from "@/lib/time";
import type { ImportPreview } from "./parse";

export async function productosCargados(): Promise<number> {
  const rows = await readRows(TABS.productos.name);
  return rows.filter((r) => r[0]?.trim()).length;
}

// Carga inicial: Stock_inicial (copia del relevamiento), Productos (stock consolidado)
// y un movimiento de ingreso "inicial" por SKU, para que el stock se pueda recalcular
// siempre desde Movimientos. Solo se permite con Productos vacío.
export async function commitImport(preview: ImportPreview, usuario: string) {
  if (preview.issues.some((i) => i.level === "error")) {
    throw new Error("El archivo tiene errores: corregilos antes de importar.");
  }
  if ((await productosCargados()) > 0) {
    throw new Error("Ya hay productos cargados. La importación inicial se hace una sola vez.");
  }

  const importacionId = randomUUID();
  const ahora = nowAr();

  const stockInicial: Cell[][] = preview.rows.map((r) => [
    importacionId,
    ahora,
    usuario,
    r.hoja,
    r.fila,
    r.fecha,
    r.zona,
    r.modulo,
    r.nivel,
    r.marca,
    r.sku,
    r.descripcion,
    r.cajas,
    r.unidPorCaja,
    r.sueltas,
    r.total,
    r.observaciones,
  ]);

  const productos: Cell[][] = preview.productos.map((p) => [
    p.sku,
    "", // producto_base: se completa después desde la app
    "", // variante
    p.marca,
    p.descripcion,
    p.stock,
    0, // stock_minimo
    p.ubicaciones.join(", "),
    "", // ml_item_id
    "", // web_id
    true,
    ahora,
    ahora,
  ]);

  const movimientos: Cell[][] = preview.productos.map((p) => [
    randomUUID(),
    ahora,
    usuario,
    p.sku,
    "ingreso",
    "inicial",
    "",
    p.stock,
    0,
    p.stock,
    `Importación del relevamiento ${importacionId}`,
    false,
    "",
  ]);

  await appendRowsAtomic({
    [TABS.stockInicial.name]: stockInicial,
    [TABS.productos.name]: productos,
    [TABS.movimientos.name]: movimientos,
  });

  return { importacionId, productos: productos.length, unidades: preview.totalUnidades };
}
