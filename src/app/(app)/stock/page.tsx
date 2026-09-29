import Link from "next/link";
import type { Estado } from "@/lib/stock/constants";
import { readProducts, withEstado } from "@/lib/stock/products";
import { StockTable } from "./stock-table";

export const dynamic = "force-dynamic";

const ESTADOS: Estado[] = ["ok", "bajo", "sin_stock"];

export default async function StockPage({ searchParams }: PageProps<"/stock">) {
  const estadoParam = (await searchParams).estado;
  const estado = ESTADOS.find((e) => e === estadoParam) ?? "";
  const products = (await readProducts()).map(withEstado);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Stock</h1>
        <Link
          href="/stock/nuevo"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white"
        >
          Nuevo producto
        </Link>
      </div>
      <StockTable products={products} initialEstado={estado} />
    </section>
  );
}
