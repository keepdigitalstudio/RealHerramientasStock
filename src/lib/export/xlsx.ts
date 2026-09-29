import ExcelJS from "exceljs";
import { CANAL_LABEL, ESTADO_LABEL, MOTIVO_LABEL, type Canal } from "@/lib/stock/constants";
import type { Movement } from "@/lib/stock/movements";
import type { ProductWithEstado } from "@/lib/stock/products";
import { formatFecha } from "@/lib/time";

type Column = { header: string; width: number; numeric?: boolean };

function sheet(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: (string | number)[][]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D5B3A" } }; // Verde Real
  header.alignment = { vertical: "middle" };
  header.height = 20;
  ws.addRows(rows);
  columns.forEach((c, i) => {
    if (c.numeric) ws.getColumn(i + 1).numFmt = "#,##0";
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function stockWorkbook(products: ProductWithEstado[], generado: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Real Herramientas Stock";
  const rows = [...products]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((p) => [
      p.sku,
      p.productoBase,
      p.variante,
      p.marca,
      p.descripcion,
      p.stockActual,
      p.stockMinimo,
      ESTADO_LABEL[p.estado],
      p.ubicaciones,
      p.mlItemId,
      p.webId,
      p.activo ? "Sí" : "No (de baja)",
      formatFecha(p.actualizadoEn),
    ]);
  sheet(
    wb,
    "Stock",
    [
      { header: "SKU", width: 16 },
      { header: "Producto base", width: 24 },
      { header: "Variante", width: 12 },
      { header: "Marca", width: 14 },
      { header: "Descripción", width: 40 },
      { header: "Stock", width: 10, numeric: true },
      { header: "Mínimo", width: 10, numeric: true },
      { header: "Estado", width: 11 },
      { header: "Ubicaciones", width: 24 },
      { header: "ID Mercado Libre", width: 18 },
      { header: "ID web", width: 14 },
      { header: "Activo", width: 13 },
      { header: "Última actualización", width: 20 },
    ],
    rows,
  );
  const total = products.filter((p) => p.activo).reduce((s, p) => s + Math.max(p.stockActual, 0), 0);
  const info = wb.addWorksheet("Info");
  info.addRows([
    ["Stock exportado", formatFecha(generado)],
    ["Productos activos", products.filter((p) => p.activo).length],
    ["Unidades en stock", total],
  ]);
  info.getColumn(1).width = 22;
  info.getColumn(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function movementsWorkbook(
  movements: Movement[],
  descripcion: (sku: string) => string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Real Herramientas Stock";
  const anulados = new Set(movements.map((m) => m.anulaA).filter(Boolean));
  const rows = [...movements]
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    .map((m) => [
      formatFecha(m.fechaHora),
      m.usuario,
      m.sku,
      descripcion(m.sku),
      m.tipo === "ingreso" ? "Ingreso" : "Egreso",
      MOTIVO_LABEL[m.motivo] ?? m.motivo,
      m.canal ? CANAL_LABEL[m.canal as Canal] : "",
      m.tipo === "ingreso" ? m.cantidad : -m.cantidad,
      m.stockAnterior,
      m.stockResultante,
      m.nota,
      anulados.has(m.id) ? "Sí" : "",
    ]);
  sheet(
    wb,
    "Movimientos",
    [
      { header: "Fecha y hora", width: 17 },
      { header: "Usuario", width: 14 },
      { header: "SKU", width: 16 },
      { header: "Producto", width: 36 },
      { header: "Tipo", width: 9 },
      { header: "Motivo", width: 13 },
      { header: "Canal", width: 15 },
      { header: "Cantidad", width: 10, numeric: true },
      { header: "Stock anterior", width: 14, numeric: true },
      { header: "Stock resultante", width: 15, numeric: true },
      { header: "Nota", width: 36 },
      { header: "Anulado", width: 9 },
    ],
    rows,
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}
