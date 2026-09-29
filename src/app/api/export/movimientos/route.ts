import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { movementsWorkbook } from "@/lib/export/xlsx";
import { readMovements } from "@/lib/stock/movements";
import { readProducts } from "@/lib/stock/products";
import { nowAr } from "@/lib/time";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/export/movimientos?desde=2026-10-01&hasta=2026-10-31 (ambas fechas incluidas)
export async function GET(request: NextRequest) {
  if (!(await getSession())) return Response.json({ error: "Sesión vencida" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const hoy = nowAr().slice(0, 10);
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") || hoy;
  if (!YMD.test(desde) || !YMD.test(hasta) || desde > hasta) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const [movements, products] = await Promise.all([readMovements(), readProducts()]);
  const bySku = new Map(products.map((p) => [p.sku, p.descripcion]));
  const enRango = movements.filter((m) => {
    const dia = m.fechaHora.slice(0, 10);
    return dia >= desde && dia <= hasta;
  });
  const file = await movementsWorkbook(enRango, (sku) => bySku.get(sku) ?? "");

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="movimientos-${desde}-a-${hasta}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
