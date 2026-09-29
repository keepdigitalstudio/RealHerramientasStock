"use client";

import { useRef, useState } from "react";
import { Field, input } from "@/components/movement-dialog";
import { nowAr } from "@/lib/time";

// Por defecto: últimos 30 días en hora de Argentina (igual en servidor y navegador).
function defaultRange() {
  const hoy = new Date();
  return {
    hasta: nowAr(hoy).slice(0, 10),
    desde: nowAr(new Date(hoy.getTime() - 29 * 86_400_000)).slice(0, 10),
  };
}

// "Exportar": stock actual en un clic, o movimientos de un rango de fechas.
export function ExportMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const [desde, setDesde] = useState(() => defaultRange().desde);
  const [hasta, setHasta] = useState(() => defaultRange().hasta);

  const valido = desde !== "" && hasta !== "" && desde <= hasta;
  const close = () => ref.current?.removeAttribute("open");

  return (
    <details ref={ref} className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100">
        Exportar
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg">
        <a
          href="/api/export/stock"
          onClick={close}
          className="block rounded-md bg-brand px-3 py-2 text-center text-sm text-white hover:bg-brand-dark"
        >
          Stock actual (.xlsx)
        </a>
        <div className="space-y-2 border-t border-neutral-200 pt-3">
          <p className="text-sm font-medium">Movimientos</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde">
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} />
            </Field>
          </div>
          <a
            href={valido ? `/api/export/movimientos?desde=${desde}&hasta=${hasta}` : undefined}
            onClick={close}
            aria-disabled={!valido}
            className={`block rounded-md border border-neutral-300 px-3 py-2 text-center text-sm hover:bg-neutral-100 ${valido ? "" : "pointer-events-none opacity-40"}`}
          >
            Movimientos del rango (.xlsx)
          </a>
        </div>
      </div>
    </details>
  );
}
