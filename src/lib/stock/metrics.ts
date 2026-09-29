import { CANAL_LABEL, type Canal, type Estado } from "./constants";
import type { Movement } from "./movements";
import type { ProductWithEstado } from "./products";

// Cálculos del dashboard. Función pura: recibe productos y movimientos y devuelve todo lo
// que se muestra, así se puede probar sin el Sheet.
//
// Criterios:
// - Los movimientos anulados y sus anulaciones no cuentan en ninguna métrica.
// - Ventas = egresos con motivo "venta" (unidades, sin restar devoluciones).
// - El gráfico de ingresos/egresos no incluye el stock inicial (sería un pico enorme el día
//   de la importación).
// - Cobertura: stock ÷ ventas por día de los últimos 30 días (o de los días de historial,
//   si hay menos).
// - Inmovilizado: con stock y sin egresos en 90 días. Solo se calcula con 90 días de historial.

export const PERIODOS = [7, 30, 90, 365] as const;
export type Periodo = (typeof PERIODOS)[number];
export type Bucket = "dia" | "semana" | "mes";

const VENTANA_COBERTURA = 30;
const VENTANA_INMOVILIZADO = 90;
const COBERTURA_ALERTA = 30; // se listan los que se agotan en 30 días o menos

export type DashboardData = {
  periodo: { dias: Periodo; desde: string; hasta: string; bucket: Bucket };
  resumen: {
    productos: number;
    unidades: number;
    bajo: number;
    sinStock: number;
    sinMinimo: number;
  };
  ventas: { total: number; anterior: number; porCanal: Record<Canal, number> };
  serieVentas: ({ label: string } & Record<Canal, number>)[];
  serieMovimientos: { label: string; ingresos: number; egresos: number }[];
  masVendidos: ({ sku: string; descripcion: string; total: number; estado: Estado } & Record<Canal, number>)[];
  cobertura: {
    diasHistorial: number;
    items: { sku: string; descripcion: string; stock: number; ventasDia: number; dias: number; estado: Estado }[];
  };
  inmovilizado:
    | { disponible: false; desde: string }
    | {
        disponible: true;
        productos: number;
        unidades: number;
        items: { sku: string; descripcion: string; stock: number; ultimoEgreso: string | null }[];
      };
  porMarca: { marca: string; unidades: number }[];
  ultimos: (Movement & { descripcion: string })[];
  insights: string[];
};

// --- Fechas como "YYYY-MM-DD" (hora de Argentina ya aplicada en el Sheet) ---

const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const toYmd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (ymd: string, n: number) => toYmd(new Date(toDate(ymd).getTime() + n * 86_400_000));
const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
const day = (m: Movement) => m.fechaHora.slice(0, 10);
const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS_SEMANA = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

function bucketStart(ymd: string, bucket: Bucket): string {
  if (bucket === "dia") return ymd;
  if (bucket === "mes") return `${ymd.slice(0, 8)}01`;
  const dow = (toDate(ymd).getUTCDay() + 6) % 7; // lunes = 0
  return addDays(ymd, -dow);
}

function bucketLabel(start: string, bucket: Bucket): string {
  if (bucket === "mes") return `${MESES[Number(start.slice(5, 7)) - 1]} ${start.slice(2, 4)}`;
  return ddmm(start);
}

function buckets(desde: string, hasta: string, bucket: Bucket): string[] {
  const out: string[] = [];
  let cur = bucketStart(desde, bucket);
  while (cur <= hasta) {
    out.push(cur);
    if (bucket === "dia") cur = addDays(cur, 1);
    else if (bucket === "semana") cur = addDays(cur, 7);
    else {
      const d = toDate(cur);
      d.setUTCMonth(d.getUTCMonth() + 1);
      cur = toYmd(d);
    }
  }
  return out;
}

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const fmt = (n: number) => n.toLocaleString("es-AR");
const lista = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;

export function computeDashboard(
  products: ProductWithEstado[],
  allMovements: Movement[],
  opts: { hoy: string; dias: Periodo },
): DashboardData {
  const { hoy, dias } = opts;
  const desde = addDays(hoy, -(dias - 1));
  const bucket: Bucket = dias <= 31 ? "dia" : dias <= 120 ? "semana" : "mes";

  const activos = products.filter((p) => p.activo);
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const desc = (sku: string) => bySku.get(sku)?.descripcion ?? sku;

  const anulados = new Set(allMovements.map((m) => m.anulaA).filter(Boolean));
  const validos = allMovements.filter((m) => !anulados.has(m.id) && m.motivo !== "anulacion");
  const enRango = (m: Movement, a: string, b: string) => day(m) >= a && day(m) <= b;
  const esVenta = (m: Movement) => m.tipo === "egreso" && m.motivo === "venta";

  // --- Resumen ---
  const resumen = {
    productos: activos.length,
    unidades: activos.reduce((s, p) => s + Math.max(p.stockActual, 0), 0),
    bajo: activos.filter((p) => p.estado === "bajo").length,
    sinStock: activos.filter((p) => p.estado === "sin_stock").length,
    sinMinimo: activos.filter((p) => p.stockMinimo === 0).length,
  };

  // --- Ventas del período y del período anterior ---
  const ventas = validos.filter((m) => esVenta(m) && enRango(m, desde, hoy));
  const anteriorDesde = addDays(desde, -dias);
  const anteriorHasta = addDays(desde, -1);
  const ventasAnterior = validos.filter((m) => esVenta(m) && enRango(m, anteriorDesde, anteriorHasta));
  const porCanal: Record<Canal, number> = { mercadolibre: 0, web: 0 };
  for (const m of ventas) if (m.canal) porCanal[m.canal] += m.cantidad;
  const totalVentas = ventas.reduce((s, m) => s + m.cantidad, 0);
  const totalAnterior = ventasAnterior.reduce((s, m) => s + m.cantidad, 0);

  // --- Series en el tiempo ---
  const keys = buckets(desde, hoy, bucket);
  const serieVentasMap = new Map(keys.map((k) => [k, { mercadolibre: 0, web: 0 }]));
  for (const m of ventas) {
    const b = serieVentasMap.get(bucketStart(day(m), bucket));
    if (b && m.canal) b[m.canal] += m.cantidad;
  }
  const serieMovMap = new Map(keys.map((k) => [k, { ingresos: 0, egresos: 0 }]));
  for (const m of validos) {
    if (m.motivo === "inicial" || !enRango(m, desde, hoy)) continue;
    const b = serieMovMap.get(bucketStart(day(m), bucket));
    if (!b) continue;
    if (m.tipo === "ingreso") b.ingresos += m.cantidad;
    else b.egresos += m.cantidad;
  }

  // --- Más vendidos ---
  const vendidos = new Map<string, Record<Canal, number>>();
  for (const m of ventas) {
    const v = vendidos.get(m.sku) ?? { mercadolibre: 0, web: 0 };
    if (m.canal) v[m.canal] += m.cantidad;
    vendidos.set(m.sku, v);
  }
  const masVendidos = [...vendidos.entries()]
    .map(([sku, v]) => ({
      sku,
      descripcion: desc(sku),
      ...v,
      total: v.mercadolibre + v.web,
      estado: bySku.get(sku)?.estado ?? ("ok" as Estado),
    }))
    .sort((a, b) => b.total - a.total || a.sku.localeCompare(b.sku))
    .slice(0, 10);

  // --- Historial disponible ---
  const primerDia = validos.reduce<string | null>((min, m) => (!min || day(m) < min ? day(m) : min), null);
  const diasHistorial = primerDia ? diffDays(primerDia, hoy) + 1 : 0;

  // --- Cobertura ---
  const ventanaCob = Math.max(1, Math.min(VENTANA_COBERTURA, diasHistorial));
  const cobDesde = addDays(hoy, -(ventanaCob - 1));
  const vendidoCob = new Map<string, number>();
  for (const m of validos) {
    if (esVenta(m) && enRango(m, cobDesde, hoy)) vendidoCob.set(m.sku, (vendidoCob.get(m.sku) ?? 0) + m.cantidad);
  }
  const coberturaItems = activos
    .filter((p) => p.stockActual > 0 && vendidoCob.has(p.sku))
    .map((p) => {
      const ventasDia = vendidoCob.get(p.sku)! / ventanaCob;
      return {
        sku: p.sku,
        descripcion: p.descripcion,
        stock: p.stockActual,
        ventasDia: Math.round(ventasDia * 10) / 10,
        dias: Math.max(0, Math.floor(p.stockActual / ventasDia)),
        estado: p.estado,
      };
    })
    .filter((c) => c.dias <= COBERTURA_ALERTA)
    .sort((a, b) => a.dias - b.dias || b.ventasDia - a.ventasDia);

  // --- Inmovilizado ---
  let inmovilizado: DashboardData["inmovilizado"];
  if (!primerDia || diasHistorial < VENTANA_INMOVILIZADO) {
    inmovilizado = { disponible: false, desde: addDays(primerDia ?? hoy, VENTANA_INMOVILIZADO) };
  } else {
    const limite = addDays(hoy, -(VENTANA_INMOVILIZADO - 1));
    const ultimoEgreso = new Map<string, string>();
    for (const m of validos) {
      if (m.tipo !== "egreso") continue;
      const prev = ultimoEgreso.get(m.sku);
      if (!prev || day(m) > prev) ultimoEgreso.set(m.sku, day(m));
    }
    const items = activos
      .filter((p) => p.stockActual > 0 && (ultimoEgreso.get(p.sku) ?? "") < limite)
      .map((p) => ({
        sku: p.sku,
        descripcion: p.descripcion,
        stock: p.stockActual,
        ultimoEgreso: ultimoEgreso.get(p.sku) ?? null,
      }))
      .sort((a, b) => b.stock - a.stock);
    inmovilizado = {
      disponible: true,
      productos: items.length,
      unidades: items.reduce((s, i) => s + i.stock, 0),
      items: items.slice(0, 10),
    };
  }

  // --- Stock por marca ---
  const marcas = new Map<string, number>();
  for (const p of activos) {
    const k = p.marca || "Sin marca";
    marcas.set(k, (marcas.get(k) ?? 0) + Math.max(p.stockActual, 0));
  }
  const porMarca = [...marcas.entries()]
    .map(([marca, unidades]) => ({ marca, unidades }))
    .sort((a, b) => b.unidades - a.unidades);

  // --- Últimos movimientos (incluye anulaciones: es un log) ---
  const ultimos = [...allMovements]
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    .slice(0, 10)
    .map((m) => ({ ...m, descripcion: desc(m.sku) }));

  // --- Insights: solo los que tienen datos que los respalden ---
  const insights: string[] = [];
  if (totalVentas > 0 && totalAnterior > 0) {
    const cambio = Math.round(((totalVentas - totalAnterior) / totalAnterior) * 100);
    if (Math.abs(cambio) >= 5) {
      insights.push(
        `Vendiste ${Math.abs(cambio)}% ${cambio > 0 ? "más" : "menos"} que en los ${dias} días anteriores (${fmt(totalVentas)} vs ${fmt(totalAnterior)} unidades).`,
      );
    } else {
      insights.push(`Las ventas se mantienen estables respecto de los ${dias} días anteriores.`);
    }
  }
  if (totalVentas >= 5) {
    const lider: Canal = porCanal.mercadolibre >= porCanal.web ? "mercadolibre" : "web";
    insights.push(`${CANAL_LABEL[lider]} concentra el ${pct(porCanal[lider], totalVentas)}% de las unidades vendidas del período.`);
  }
  const urgentes = coberturaItems.filter((c) => c.dias <= 7 && c.stock > 0);
  if (urgentes.length > 0) {
    insights.push(
      `${urgentes.length === 1 ? "1 producto se queda" : `${urgentes.length} productos se quedan`} sin stock en una semana o menos al ritmo actual: ${lista(urgentes.slice(0, 3).map((c) => c.sku))}${urgentes.length > 3 ? " y otros" : ""}.`,
    );
  }
  const topEnRiesgo = masVendidos.filter((v) => v.estado !== "ok");
  if (topEnRiesgo.length > 0) {
    insights.push(
      `${topEnRiesgo.length} de los ${masVendidos.length} más vendidos ${topEnRiesgo.length === 1 ? "está" : "están"} bajo el mínimo o sin stock: ${lista(topEnRiesgo.slice(0, 3).map((v) => v.sku))}.`,
    );
  }
  if (vendidos.size >= 10 && totalVentas > 0) {
    const top5 = masVendidos.slice(0, 5).reduce((s, v) => s + v.total, 0);
    insights.push(`Los 5 productos más vendidos explican el ${pct(top5, totalVentas)}% de las ventas del período.`);
  }
  if (dias >= 28 && totalVentas >= 20) {
    const porDow = [0, 0, 0, 0, 0, 0, 0];
    for (const m of ventas) porDow[toDate(day(m)).getUTCDay()] += m.cantidad;
    const max = porDow.indexOf(Math.max(...porDow));
    // Solo si se destaca: 30% por encima del promedio diario (1/7 del total).
    if (porDow[max] >= (totalVentas / 7) * 1.3) {
      insights.push(`Los ${DIAS_SEMANA[max]} son el día con más ventas (${pct(porDow[max], totalVentas)}% del período).`);
    }
  }
  if (inmovilizado.disponible && inmovilizado.productos > 0) {
    insights.push(
      `${inmovilizado.productos} productos (${fmt(inmovilizado.unidades)} unidades) no tienen egresos hace más de ${VENTANA_INMOVILIZADO} días.`,
    );
  }
  if (resumen.sinMinimo > 0 && resumen.productos > 0) {
    insights.push(
      `${resumen.sinMinimo} de ${resumen.productos} productos no tienen stock mínimo cargado: para ellos no se avisa cuando el stock está bajo.`,
    );
  }

  return {
    periodo: { dias, desde, hasta: hoy, bucket },
    resumen,
    ventas: { total: totalVentas, anterior: totalAnterior, porCanal },
    serieVentas: keys.map((k) => ({ label: bucketLabel(k, bucket), ...serieVentasMap.get(k)! })),
    serieMovimientos: keys.map((k) => ({ label: bucketLabel(k, bucket), ...serieMovMap.get(k)! })),
    masVendidos,
    cobertura: { diasHistorial, items: coberturaItems.slice(0, 10) },
    inmovilizado,
    porMarca,
    ultimos,
    insights,
  };
}
