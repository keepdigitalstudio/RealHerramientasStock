"use client";

import Link from "next/link";
import { useState } from "react";
import { MovementDialog, type MovementTarget } from "@/components/movement-dialog";
import type { Tipo } from "@/lib/stock/constants";

export function ProductActions({
  target,
  activo,
}: {
  target: Omit<MovementTarget, "tipo">;
  activo: boolean;
}) {
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const btn = "rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100";

  return (
    <div className="flex flex-wrap gap-2">
      {activo && (
        <>
          <button type="button" onClick={() => setTipo("ingreso")} className={btn}>
            + Ingreso
          </button>
          <button type="button" onClick={() => setTipo("egreso")} className={btn}>
            − Egreso
          </button>
        </>
      )}
      <Link href={`/stock/${encodeURIComponent(target.sku)}/editar`} className={btn}>
        Editar producto
      </Link>
      <MovementDialog target={tipo ? { ...target, tipo } : null} onClose={() => setTipo(null)} />
    </div>
  );
}
