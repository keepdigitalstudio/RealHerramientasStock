"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CANALES, MOTIVOS_MANUALES, type Motivo } from "@/lib/stock/constants";
import {
  cancelMovement,
  registerMovement,
  StockError,
  type MovementResult,
} from "@/lib/stock/movements";
import { createProduct, updateProduct, type ProductFields } from "@/lib/stock/product-mutations";

const USUARIO = "sistema"; // TODO etapa 5: usuario logueado

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof StockError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Datos inválidos." };
  console.error(e);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo en unos segundos." };
}

function refresh(sku: string) {
  revalidatePath("/stock");
  revalidatePath(`/stock/${encodeURIComponent(sku)}`);
  revalidatePath("/dashboard");
}

const cantidad = z
  .number({ error: "Ingresá una cantidad." })
  .int("La cantidad tiene que ser un número entero.")
  .min(1, "La cantidad tiene que ser 1 o más.")
  .max(1_000_000, "Cantidad demasiado grande.");

const movementSchema = z
  .object({
    id: z.uuid(),
    sku: z.string().min(1),
    tipo: z.enum(["ingreso", "egreso"]),
    motivo: z.string(),
    canal: z.enum([...CANALES, ""]),
    cantidad,
    nota: z.string().max(500).default(""),
    stockVisto: z.number().int(),
    confirmado: z.boolean(),
  })
  .refine((m) => (MOTIVOS_MANUALES[m.tipo] as readonly string[]).includes(m.motivo), {
    error: "Motivo inválido para este tipo de movimiento.",
  })
  .refine((m) => m.motivo !== "venta" || m.canal !== "", {
    error: "Elegí el canal de la venta.",
  })
  .refine((m) => m.canal === "" || m.motivo === "venta" || m.motivo === "devolucion", {
    error: "El canal solo se indica en ventas y devoluciones.",
  });

export async function registerMovementAction(
  raw: z.input<typeof movementSchema>,
): Promise<ActionResult<MovementResult>> {
  try {
    const { stockVisto, confirmado, ...m } = movementSchema.parse(raw);
    const result = await registerMovement(
      { ...m, motivo: m.motivo as Motivo }, // validado arriba contra MOTIVOS_MANUALES
      { usuario: USUARIO, stockVisto, confirmado },
    );
    if (result.status !== "confirmar") refresh(m.sku);
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

const cancelSchema = z.object({
  movementId: z.string().min(1),
  sku: z.string().min(1),
  stockVisto: z.number().int(),
  confirmado: z.boolean(),
});

export async function cancelMovementAction(
  raw: z.input<typeof cancelSchema>,
): Promise<ActionResult<MovementResult>> {
  try {
    const { movementId, sku, stockVisto, confirmado } = cancelSchema.parse(raw);
    const result = await cancelMovement(movementId, { usuario: USUARIO, stockVisto, confirmado });
    if (result.status !== "confirmar") refresh(sku);
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

const productSchema = z.object({
  productoBase: text(200),
  variante: text(100),
  marca: text(100),
  descripcion: text(300).min(1, "La descripción es obligatoria."),
  stockMinimo: z
    .number({ error: "El stock mínimo tiene que ser un número." })
    .int("El stock mínimo tiene que ser un número entero.")
    .min(0, "El stock mínimo no puede ser negativo."),
  ubicaciones: text(300),
  mlItemId: text(50),
  webId: text(50),
  activo: z.boolean(),
}) satisfies z.ZodType<ProductFields>;

const createSchema = z.object({
  sku: text(60).min(1, "El SKU es obligatorio."),
  fields: productSchema,
  stockInicial: z
    .number({ error: "El stock inicial tiene que ser un número." })
    .int("El stock inicial tiene que ser un número entero.")
    .min(0, "El stock inicial no puede ser negativo."),
});

export async function createProductAction(
  raw: z.input<typeof createSchema>,
): Promise<ActionResult<{ sku: string }>> {
  try {
    const { sku, fields, stockInicial } = createSchema.parse(raw);
    const created = await createProduct(sku, fields, stockInicial, USUARIO);
    refresh(created);
    return { ok: true, data: { sku: created } };
  } catch (e) {
    return fail(e);
  }
}

const updateSchema = z.object({ sku: z.string().min(1), fields: productSchema });

export async function updateProductAction(
  raw: z.input<typeof updateSchema>,
): Promise<ActionResult<{ sku: string }>> {
  try {
    const { sku, fields } = updateSchema.parse(raw);
    await updateProduct(sku, fields);
    refresh(sku);
    return { ok: true, data: { sku } };
  } catch (e) {
    return fail(e);
  }
}
