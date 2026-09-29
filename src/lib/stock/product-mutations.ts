import { randomUUID } from "node:crypto";
import { writeAtomic, type WriteOp } from "@/lib/sheets/client";
import { TABS } from "@/lib/sheets/schema";
import { nowAr } from "@/lib/time";
import { normalizeSku } from "./constants";
import { StockError } from "./movements";
import { readProducts, toRow, type Product } from "./products";

// Campos que se editan desde la app. El stock no: solo cambia con movimientos.
export type ProductFields = Pick<
  Product,
  | "productoBase"
  | "variante"
  | "marca"
  | "descripcion"
  | "stockMinimo"
  | "ubicaciones"
  | "mlItemId"
  | "webId"
  | "activo"
>;

export async function createProduct(
  skuInput: string,
  fields: ProductFields,
  stockInicial: number,
  usuario: string,
): Promise<string> {
  const sku = normalizeSku(skuInput);
  if (!sku) throw new StockError("El SKU no puede estar vacío.");

  const products = await readProducts();
  if (products.some((p) => p.sku === sku)) {
    throw new StockError(`Ya existe un producto con el SKU ${sku}.`);
  }

  const ahora = nowAr();
  const product: Product = {
    ...fields,
    sku,
    stockActual: stockInicial,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const ops: WriteOp[] = [{ type: "append", tab: TABS.productos.name, rows: [toRow(product)] }];
  if (stockInicial > 0) {
    ops.push({
      type: "append",
      tab: TABS.movimientos.name,
      rows: [
        [randomUUID(), ahora, usuario, sku, "ingreso", "inicial", "", stockInicial, 0, stockInicial,
          "Stock inicial al dar de alta el producto", false, ""],
      ],
    });
  }
  await writeAtomic(ops);
  return sku;
}

export async function updateProduct(sku: string, fields: ProductFields): Promise<void> {
  const product = (await readProducts()).find((p) => p.sku === sku);
  if (!product) throw new StockError(`No existe el producto ${sku}.`);

  const updated: Product = { ...product, ...fields, actualizadoEn: nowAr() };
  await writeAtomic([
    { type: "update", tab: TABS.productos.name, sheetRow: product.sheetRow, values: toRow(updated) },
  ]);
}
