import Link from "next/link";
import { requirePageSession } from "@/lib/auth/session";
import type { Estado } from "@/lib/stock/constants";
import { readProducts, withEstado } from "@/lib/stock/products";
import { ExportMenu } from "./export-menu";
import { StockTable } from "./stock-table";

export const dynamic = "force-dynamic";

const ESTADOS: Estado[] = ["ok", "bajo", "sin_stock"];

export default async function StockPage({ searchParams }: PageProps<"/stock">) {
  const estadoParam = (await searchParams).estado;
  const estado = ESTADOS.find((e) => e === estadoParam) ?? "";
  const [session, products] = await Promise.all([
    requirePageSession(),
    readProducts().then((ps) => ps.map(withEstado)),
  ]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Stock</h1>
        <div className="flex items-center gap-2">
          <ExportMenu />
          {session.rol === "admin" && (
            <Link
              href="/stock/nuevo"
              className="rounded-md bg-brand hover:bg-brand-dark px-3 py-1.5 text-sm text-white"
            >
              Nuevo producto
            </Link>
          )}
        </div>
      </div>
      <StockTable products={products} initialEstado={estado} />
    </section>
  );
}
