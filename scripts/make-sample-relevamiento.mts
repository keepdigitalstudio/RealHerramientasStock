// Genera dos Excel de ejemplo con la misma estructura que la plantilla del relevamiento,
// para probar la importación sin usar datos reales:
//   samples/relevamiento-ok.xlsx          → se importa sin errores
//   samples/relevamiento-con-errores.xlsx → muestra cada validación
// Uso: npm run sample-relevamiento
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";

const HEADERS = [
  "Fecha", "Zona", "Módulo", "Nivel", "Marca", "SKU", "Descripción",
  "Cajas cerradas", "Unid./caja", "Unid. sueltas", "Total", "Ubicación", "Control", "Observaciones",
];

type Row = [zona: string, modulo: string, nivel: string, marca: string, sku: string,
  descripcion: string, cajas: number | string | null, unidPorCaja: number | string | null,
  sueltas: number | string | null, total?: number];

function addCountSheet(wb: ExcelJS.Workbook, persona: string, rows: Row[]) {
  const ws = wb.addWorksheet(`Conteo_${persona}`);
  ws.getCell("A1").value = `CARGA DE CONTEO – ${persona.toUpperCase()}`;
  ws.getCell("A3").value = "Responsable:";
  ws.getCell("B3").value = persona;
  ws.getCell("A5").value = "AMARILLO = carga manual | AZUL = cálculo automático";
  ws.getRow(6).values = HEADERS;
  rows.forEach(([zona, modulo, nivel, marca, sku, descripcion, cajas, upc, sueltas, total], i) => {
    const r = 7 + i;
    const computed = Number(cajas ?? 0) * Number(upc ?? 0) + Number(sueltas ?? 0);
    ws.getRow(r).values = [
      new Date("2026-10-03"), zona, modulo, nivel, marca, sku, descripcion, cajas, upc, sueltas,
      { formula: `H${r}*I${r}+J${r}`, result: total ?? computed },
      `${zona} - ${modulo} - ${nivel}`, "OK", null,
    ];
  });
  // Como en la plantilla: filas vacías con fórmulas precargadas.
  for (let r = 7 + rows.length; r < 7 + rows.length + 5; r++) {
    ws.getCell(`K${r}`).value = { formula: `IF(F${r}="","",H${r}*I${r}+J${r})`, result: "" };
  }
}

function addRecuentos(wb: ExcelJS.Workbook, rows: [sku: string, inicial: number, segundo: number][]) {
  const ws = wb.addWorksheet("Recuentos");
  ws.getCell("A1").value = "RECUENTOS / VERIFICACIONES";
  ws.getRow(5).values = [
    "Fecha", "Persona", "Zona", "Módulo", "Nivel", "Marca", "SKU",
    "Conteo inicial", "Segundo conteo", "Diferencia", "Resultado", "Observaciones",
  ];
  rows.forEach(([sku, inicial, segundo], i) => {
    ws.getRow(6 + i).values = [null, "Topa", "A", "A01", "1", "Bellota", sku, inicial, segundo, segundo - inicial];
  });
}

mkdirSync("samples", { recursive: true });

const ok = new ExcelJS.Workbook();
ok.addWorksheet("LEEME").getCell("A1").value = "Relevamiento de ejemplo (datos ficticios)";
addCountSheet(ok, "Topa", [
  ["A", "A01", "1", "Bellota", "BEL-MEC-06", "Mecha acero rápido 6 mm", 2, 10, 3],
  ["A", "A01", "2", "Bellota", "BEL-MEC-08", "Mecha acero rápido 8 mm", 1, 10, 0],
  ["A", "A02", "1", "Mota", "MOT-DIS-115", "Disco de corte 115 mm", null, null, 25],
]);
addCountSheet(ok, "Brofe", [
  ["B", "B01", "3", "Bellota", "BEL-MEC-06", "Mecha acero rápido 6 mm", null, null, 4],
  ["PISO", "P01", "Piso", "Total", "TOT-AMO-01", "Amoladora angular 115 mm", 3, 4, 1],
]);
addRecuentos(ok, []);
await ok.xlsx.writeFile("samples/relevamiento-ok.xlsx");

const bad = new ExcelJS.Workbook();
addCountSheet(bad, "Topa", [
  ["A", "A01", "1", "Bellota", "BEL-MEC-06", "Mecha acero rápido 6 mm", 2, 10, 3],
  ["A", "A01", "1", "Bellota", "bel-mec-06 ", "Mecha 6mm", null, null, 5], // mismo lugar + otra descripción
  ["A", "A01", "2", "Bellota", "", "Fila sin SKU", null, null, 2],
  ["A", "A02", "1", "Mota", "MOT-DIS-115", "Disco de corte 115 mm", "dos", 10, 0], // cantidad inválida
  ["A", "A02", "2", "Mota", "MOT-DIS-180", "Disco de corte 180 mm", 3, null, 0], // cajas sin unid./caja
  ["A", "A03", "1", "Mota", "MOT-LIJ-80", "Lija grano 80", null, null, -2], // negativo
  ["A", "A03", "2", "Mota", "MOT-LIJ-120", "Lija grano 120", 1, 10, 0, 12], // total no coincide
]);
addCountSheet(bad, "Brofe", [
  ["B", "B01", "1", "Total", "BEL-MEC-06", "Mecha acero rápido 6 mm", null, null, 1], // otra marca
  ["B", "B01", "2", "Total", "TOT-AMO-01", "Amoladora angular 115 mm", null, null, 0], // total 0
]);
addRecuentos(bad, [["MOT-LIJ-120", 10, 9]]);
await bad.xlsx.writeFile("samples/relevamiento-con-errores.xlsx");

console.log("✔ samples/relevamiento-ok.xlsx");
console.log("✔ samples/relevamiento-con-errores.xlsx");
