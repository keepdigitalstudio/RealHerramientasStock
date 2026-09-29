// Estructura del Sheet de datos. El orden de las columnas es el orden en la hoja:
// agregar columnas nuevas siempre al final para no romper filas existentes.

export const TABS = {
  productos: {
    name: "Productos",
    headers: [
      "sku",
      "producto_base",
      "variante",
      "marca",
      "descripcion",
      "stock_actual",
      "stock_minimo",
      "ubicaciones",
      "ml_item_id",
      "web_id",
      "activo",
      "creado_en",
      "actualizado_en",
    ],
  },
  movimientos: {
    name: "Movimientos",
    headers: [
      "id",
      "fecha_hora",
      "usuario",
      "sku",
      "tipo",
      "motivo",
      "canal",
      "cantidad",
      "stock_anterior",
      "stock_resultante",
      "nota",
      "forzado_negativo",
      "anula_a",
    ],
  },
  stockInicial: {
    name: "Stock_inicial",
    headers: [
      "importacion_id",
      "importado_en",
      "importado_por",
      "hoja_origen",
      "fila_origen",
      "fecha",
      "zona",
      "modulo",
      "nivel",
      "marca",
      "sku",
      "descripcion",
      "cajas_cerradas",
      "unid_por_caja",
      "unid_sueltas",
      "total",
      "observaciones",
    ],
  },
  usuarios: {
    name: "Usuarios",
    headers: ["email", "nombre", "rol", "password_hash", "activo", "creado_en"],
  },
} as const;

export type TabKey = keyof typeof TABS;
