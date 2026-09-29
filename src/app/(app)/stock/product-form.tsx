"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field, input } from "@/components/movement-dialog";
import type { ProductFields } from "@/lib/stock/product-mutations";
import { createProductAction, updateProductAction } from "./actions";

const EMPTY: ProductFields = {
  productoBase: "",
  variante: "",
  marca: "",
  descripcion: "",
  stockMinimo: 0,
  ubicaciones: "",
  mlItemId: "",
  webId: "",
  activo: true,
};

type Props =
  | { mode: "create"; marcas: string[] }
  | { mode: "edit"; marcas: string[]; sku: string; initial: ProductFields; stockActual: number };

export function ProductForm(props: Props) {
  const router = useRouter();
  const [f, setF] = useState<ProductFields>(props.mode === "edit" ? props.initial : EMPTY);
  const [sku, setSku] = useState("");
  const [stockInicial, setStockInicial] = useState("0");
  const [minimo, setMinimo] = useState(String(f.stockMinimo));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductFields>(k: K, v: ProductFields[K]) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fields = { ...f, stockMinimo: Number(minimo) };
    startTransition(async () => {
      const res =
        props.mode === "create"
          ? await createProductAction({ sku, fields, stockInicial: Number(stockInicial) })
          : await updateProductAction({ sku: props.sku, fields });
      if (!res.ok) return setError(res.error);
      router.push(`/stock/${encodeURIComponent(res.data.sku)}`);
      router.refresh();
    });
  }

  const text = (k: Exclude<keyof ProductFields, "stockMinimo" | "activo">, label: string, hint?: string) => (
    <Field label={label}>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} className={input} placeholder={hint} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {props.mode === "create" ? (
          <Field label="SKU">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={`${input} font-mono`}
              required
              autoFocus
            />
          </Field>
        ) : (
          <Field label="SKU (no se puede cambiar)">
            <input value={props.sku} disabled className={`${input} bg-neutral-50 font-mono text-neutral-500`} />
          </Field>
        )}
        <Field label="Marca">
          <input value={f.marca} onChange={(e) => set("marca", e.target.value)} className={input} list="marcas" />
          <datalist id="marcas">
            {props.marcas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <div className="sm:col-span-2">{text("descripcion", "Descripción", "Mecha acero rápido 6 mm")}</div>
        {text("productoBase", "Producto base (agrupa variantes)", "Mecha acero rápido")}
        {text("variante", "Variante", "6 mm")}
        <Field label="Stock mínimo">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            className={`${input} tabular-nums`}
          />
        </Field>
        {props.mode === "create" ? (
          <Field label="Stock inicial">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={stockInicial}
              onChange={(e) => setStockInicial(e.target.value)}
              className={`${input} tabular-nums`}
            />
          </Field>
        ) : (
          <Field label="Stock actual (cambia solo con movimientos)">
            <input value={props.stockActual} disabled className={`${input} bg-neutral-50 tabular-nums text-neutral-500`} />
          </Field>
        )}
        <div className="sm:col-span-2">{text("ubicaciones", "Ubicaciones", "A-A01-1, B-B01-3")}</div>
        {text("mlItemId", "ID de publicación en Mercado Libre", "MLA1234567890")}
        {text("webId", "ID en la web")}
      </div>

      {props.mode === "edit" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!f.activo} onChange={(e) => set("activo", !e.target.checked)} />
          Dar de baja (deja de aparecer en la tabla y no admite movimientos; el historial se conserva)
        </label>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="rounded-md bg-brand hover:bg-brand-dark px-4 py-2 text-sm text-white disabled:opacity-40">
          {pending ? "Guardando…" : props.mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
