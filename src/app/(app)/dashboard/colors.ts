// Paleta validada con el script de la guía de visualización (daltonismo y contraste).
// El color sigue a la entidad: Mercado Libre siempre azul, web siempre naranja.
// Archivo aparte (sin "use client") para poder usarlo desde páginas de servidor.
export const COLORS = {
  mercadolibre: "#2a78d6",
  web: "#eb6834",
  ingresos: "#4a3aa7",
  egresos: "#1baf7a",
  neutral: "#737373",
  grid: "#e5e5e5",
  axis: "#8a8a8a",
  surface: "#ffffff",
} as const;
