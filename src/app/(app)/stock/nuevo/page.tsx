import Link from "next/link";
import { readProducts } from "@/lib/stock/products";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const marcas = [...new Set((await readProducts()).map((p) => p.marca).filter(Boolean))].sort();
  return (
    <section className="space-y-4">
      <Link href="/stock" className="text-sm text-neutral-600 hover:underline">
        ← Stock
      </Link>
      <h1 className="page-title">Nuevo producto</h1>
      <ProductForm mode="create" marcas={marcas} />
    </section>
  );
}
