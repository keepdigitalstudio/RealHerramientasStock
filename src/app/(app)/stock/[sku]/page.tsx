import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoBadge } from "@/components/estado-badge";
import { readMovements } from "@/lib/stock/movements";
import { findProduct, withEstado } from "@/lib/stock/products";
import { History } from "./history";
import { ProductActions } from "./product-actions";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: PageProps<"/stock/[sku]">) {
  const sku = decodeURIComponent((await params).sku);
  const [found, movements] = await Promise.all([findProduct(sku), readMovements(sku)]);
  if (!found) notFound();
  const p = withEstado(found);

  const datos: [string, string][] = [
    ["Producto base", p.productoBase],
    ["Variante", p.variante],
    ["Marca", p.marca],
    ["Ubicaciones", p.ubicaciones],
    ["ID Mercado Libre", p.mlItemId],
    ["ID web", p.webId],
  ];

  return (
    <section className="space-y-6">
      <Link href="/stock" className="text-sm text-neutral-600 hover:underline">
        ← Stock
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-neutral-500">{p.sku}</p>
          <h1 className="text-xl font-semibold">{p.descripcion}</h1>
          {!p.activo && <p className="text-sm text-red-700">Dado de baja</p>}
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-xs text-neutral-500">Stock</p>
            <p className="text-3xl font-semibold tabular-nums">{p.stockActual}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Mínimo</p>
            <p className="text-lg tabular-nums text-neutral-600">{p.stockMinimo || "–"}</p>
          </div>
          <EstadoBadge estado={p.estado} />
        </div>
      </div>

      <ProductActions
        target={{ sku: p.sku, descripcion: p.descripcion, stockActual: p.stockActual }}
        activo={p.activo}
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-3">
        {datos.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="break-words">{value || "–"}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h2 className="mb-2 font-medium">Historial</h2>
        <History movements={movements} stockActual={p.stockActual} />
      </div>
    </section>
  );
}
