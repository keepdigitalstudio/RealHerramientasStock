import { requirePageAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readProducts } from "@/lib/stock/products";
import { ProductForm } from "../../product-form";

export const dynamic = "force-dynamic";

export default async function EditarProductoPage({ params }: PageProps<"/stock/[sku]/editar">) {
  await requirePageAdmin();
  const sku = decodeURIComponent((await params).sku);
  const products = await readProducts();
  const p = products.find((x) => x.sku === sku);
  if (!p) notFound();
  const marcas = [...new Set(products.map((x) => x.marca).filter(Boolean))].sort();

  return (
    <section className="space-y-4">
      <Link href={`/stock/${encodeURIComponent(sku)}`} className="text-sm text-neutral-600 hover:underline">
        ← {sku}
      </Link>
      <h1 className="page-title">Editar producto</h1>
      <ProductForm
        mode="edit"
        marcas={marcas}
        sku={p.sku}
        stockActual={p.stockActual}
        initial={{
          productoBase: p.productoBase,
          variante: p.variante,
          marca: p.marca,
          descripcion: p.descripcion,
          stockMinimo: p.stockMinimo,
          ubicaciones: p.ubicaciones,
          mlItemId: p.mlItemId,
          webId: p.webId,
          activo: p.activo,
        }}
      />
    </section>
  );
}
