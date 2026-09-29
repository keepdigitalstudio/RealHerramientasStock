import { readRows, writeAtomic, type Cell } from "@/lib/sheets/client";
import { TABS } from "@/lib/sheets/schema";
import { formatFecha, nowAr } from "@/lib/time";
import type { Canal, Motivo, Tipo } from "./constants";
import { readProducts, toRow, type StoredProduct } from "./products";

export type Movement = {
  id: string;
  fechaHora: string;
  usuario: string;
  sku: string;
  tipo: Tipo;
  motivo: Motivo;
  canal: Canal | "";
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  nota: string;
  forzadoNegativo: boolean;
  anulaA: string;
};

function fromRow(r: string[]): Movement {
  return {
    id: r[0] ?? "",
    fechaHora: r[1] ?? "",
    usuario: r[2] ?? "",
    sku: r[3] ?? "",
    tipo: (r[4] as Tipo) ?? "ingreso",
    motivo: (r[5] as Motivo) ?? "ajuste",
    canal: (r[6] as Canal | "") ?? "",
    cantidad: Number(r[7]) || 0,
    stockAnterior: Number(r[8]) || 0,
    stockResultante: Number(r[9]) || 0,
    nota: r[10] ?? "",
    forzadoNegativo: (r[11] ?? "").toLowerCase() === "true",
    anulaA: r[12] ?? "",
  };
}

function toRowCells(m: Movement): Cell[] {
  return [
    m.id,
    m.fechaHora,
    m.usuario,
    m.sku,
    m.tipo,
    m.motivo,
    m.canal,
    m.cantidad,
    m.stockAnterior,
    m.stockResultante,
    m.nota,
    m.forzadoNegativo,
    m.anulaA,
  ];
}

// Más nuevos primero.
export async function readMovements(sku?: string): Promise<Movement[]> {
  const all = (await readRows(TABS.movimientos.name)).map(fromRow).filter((m) => m.id);
  const filtered = sku ? all.filter((m) => m.sku === sku) : all;
  return filtered.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

export type MovementInput = {
  id: string; // lo genera el formulario al abrirse: si llega dos veces, se guarda una
  sku: string;
  tipo: Tipo;
  motivo: Motivo;
  canal: Canal | "";
  cantidad: number;
  nota: string;
  anulaA?: string;
};

export type MovementCheck = {
  // El stock cambió desde que se abrió el formulario (otra pestaña, otro dispositivo).
  stockCambio?: { visto: number; actual: number };
  // El movimiento deja el stock por debajo de 0.
  negativo?: { resultante: number };
};

export type MovementResult =
  | { status: "ok"; stockResultante: number }
  | { status: "duplicado"; stockResultante: number }
  | { status: "confirmar"; check: MovementCheck; stockActual: number };

export class StockError extends Error {}

export type MovementOpts = {
  usuario: string;
  stockVisto: number;
  confirmado: boolean;
  permitirNegativo: boolean; // solo admin
};

// Relee el stock del Sheet justo antes de guardar y calcula sobre ese valor. Si cambió
// desde que se abrió el formulario, o si el resultado queda negativo, pide confirmación.
// El movimiento y el nuevo stock del producto se escriben en una sola operación atómica.
export async function registerMovement(
  input: MovementInput,
  opts: MovementOpts,
): Promise<MovementResult> {
  const [products, movements] = await Promise.all([
    readProducts(),
    readRows(TABS.movimientos.name),
  ]);

  const product = products.find((p) => p.sku === input.sku);
  if (!product) throw new StockError(`No existe el producto ${input.sku}.`);
  if (!product.activo) throw new StockError(`El producto ${input.sku} está dado de baja.`);

  if (movements.some((r) => r[0] === input.id)) {
    return { status: "duplicado", stockResultante: product.stockActual };
  }

  const anterior = product.stockActual;
  const resultante = input.tipo === "ingreso" ? anterior + input.cantidad : anterior - input.cantidad;

  if (resultante < 0 && !opts.permitirNegativo) {
    throw new StockError(
      `Este movimiento deja el stock en ${resultante}. Solo un admin puede dejar el stock en negativo.`,
    );
  }

  const check: MovementCheck = {};
  if (opts.stockVisto !== anterior) check.stockCambio = { visto: opts.stockVisto, actual: anterior };
  if (resultante < 0) check.negativo = { resultante };
  if (Object.keys(check).length > 0 && !opts.confirmado) {
    return { status: "confirmar", check, stockActual: anterior };
  }

  const ahora = nowAr();
  const movement: Movement = {
    ...input,
    anulaA: input.anulaA ?? "",
    fechaHora: ahora,
    usuario: opts.usuario,
    stockAnterior: anterior,
    stockResultante: resultante,
    forzadoNegativo: resultante < 0,
  };
  const updated: StoredProduct = { ...product, stockActual: resultante, actualizadoEn: ahora };

  await writeAtomic([
    { type: "append", tab: TABS.movimientos.name, rows: [toRowCells(movement)] },
    { type: "update", tab: TABS.productos.name, sheetRow: product.sheetRow, values: toRow(updated) },
  ]);

  return { status: "ok", stockResultante: resultante };
}

// Anular = registrar el movimiento inverso. El original queda en el log.
export async function cancelMovement(
  movementId: string,
  opts: MovementOpts,
): Promise<MovementResult> {
  const all = await readMovements();
  const original = all.find((m) => m.id === movementId);
  if (!original) throw new StockError("No se encontró el movimiento.");
  if (original.motivo === "anulacion") throw new StockError("Una anulación no se puede anular.");
  if (original.motivo === "inicial") {
    throw new StockError("El stock inicial no se anula: registrá un ajuste si hace falta corregirlo.");
  }
  if (all.some((m) => m.anulaA === movementId)) {
    throw new StockError("Este movimiento ya fue anulado.");
  }

  return registerMovement(
    {
      // Determinístico: si el pedido llega dos veces, se detecta como duplicado.
      id: `anula-${movementId}`,
      sku: original.sku,
      tipo: original.tipo === "ingreso" ? "egreso" : "ingreso",
      motivo: "anulacion",
      canal: original.canal,
      cantidad: original.cantidad,
      nota: `Anula el movimiento del ${formatFecha(original.fechaHora)}`,
      anulaA: movementId,
    },
    opts,
  );
}
