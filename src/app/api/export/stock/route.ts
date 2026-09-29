import { getSession } from "@/lib/auth/session";
import { stockWorkbook } from "@/lib/export/xlsx";
import { readProducts, withEstado } from "@/lib/stock/products";
import { nowAr } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSession())) return Response.json({ error: "Sesión vencida" }, { status: 401 });

  const ahora = nowAr();
  const products = (await readProducts()).map(withEstado);
  const file = await stockWorkbook(products, ahora);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stock-${ahora.slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
