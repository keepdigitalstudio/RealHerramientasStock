// Valores y etiquetas compartidos entre servidor y pantallas (sin dependencias de servidor).

export type Tipo = "ingreso" | "egreso";

// Motivos que la persona elige al registrar un movimiento.
export const MOTIVOS_MANUALES = {
  ingreso: ["compra", "reposicion", "devolucion", "ajuste"],
  egreso: ["venta", "rotura", "perdida", "ajuste"],
} as const satisfies Record<Tipo, readonly string[]>;

// "inicial" lo genera la importación o el alta de un producto; "anulacion", el botón Anular.
export type Motivo =
  | (typeof MOTIVOS_MANUALES)[Tipo][number]
  | "inicial"
  | "anulacion";

export const MOTIVO_LABEL: Record<Motivo, string> = {
  inicial: "Stock inicial",
  compra: "Compra",
  reposicion: "Reposición",
  devolucion: "Devolución",
  ajuste: "Ajuste",
  venta: "Venta",
  rotura: "Rotura",
  perdida: "Pérdida",
  anulacion: "Anulación",
};

export const CANALES = ["mercadolibre", "web"] as const;
export type Canal = (typeof CANALES)[number];

export const CANAL_LABEL: Record<Canal, string> = {
  mercadolibre: "Mercado Libre",
  web: "Web",
};

export type Estado = "ok" | "bajo" | "sin_stock";

export const ESTADO_LABEL: Record<Estado, string> = {
  ok: "OK",
  bajo: "Bajo",
  sin_stock: "Sin stock",
};

// Sin stock: 0 o menos. Bajo: hay mínimo cargado y el stock llegó a ese mínimo o menos.
export function estadoDe(stock: number, minimo: number): Estado {
  if (stock <= 0) return "sin_stock";
  if (minimo > 0 && stock <= minimo) return "bajo";
  return "ok";
}

// Los SKU se guardan en mayúsculas y sin espacios de más, para que "bel-mec-06 " y
// "BEL-MEC-06" sean el mismo producto.
export function normalizeSku(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}
