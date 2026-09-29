"use client";

import { useRef, useState, useTransition } from "react";
import {
  confirmImport,
  previewImport,
  type ConfirmResult,
  type PreviewResult,
} from "./actions";

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [warningsChecked, setWarningsChecked] = useState(false);
  const [pending, startTransition] = useTransition();

  function formData() {
    const fd = new FormData();
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("archivo", file);
    return fd;
  }

  function onPreview() {
    setResult(null);
    setWarningsChecked(false);
    startTransition(async () => setPreview(await previewImport(formData())));
  }

  function onConfirm() {
    startTransition(async () => setResult(await confirmImport(formData())));
  }

  if (result?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <p className="font-medium text-emerald-900">Importación completa</p>
        <p className="mt-1 text-emerald-800">
          Se cargaron {result.productos} productos con {result.unidades.toLocaleString("es-AR")}{" "}
          unidades en total.
        </p>
      </div>
    );
  }

  const errors = preview?.ok ? preview.issues.filter((i) => i.level === "error") : [];
  const warnings = preview?.ok ? preview.issues.filter((i) => i.level === "warning") : [];
  const canConfirm =
    preview?.ok &&
    !preview.yaImportado &&
    errors.length === 0 &&
    preview.productos.length > 0 &&
    (warnings.length === 0 || warningsChecked);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          onChange={() => setPreview(null)}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm"
        />
        <button
          type="button"
          onClick={onPreview}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 sm:ml-auto"
        >
          {pending && !preview ? "Revisando…" : "Revisar archivo"}
        </button>
      </div>

      {preview && !preview.ok && <Alert tone="error">{preview.error}</Alert>}
      {result && !result.ok && <Alert tone="error">{result.error}</Alert>}

      {preview?.ok && (
        <>
          {preview.yaImportado && (
            <Alert tone="error">
              Ya hay productos cargados en el sistema. La importación inicial se hace una sola vez;
              los cambios posteriores se registran como movimientos.
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Filas leídas" value={preview.filas} />
            <Stat label="SKUs" value={preview.productos.length} />
            <Stat label="Unidades" value={preview.totalUnidades} />
            <Stat
              label="Errores / advertencias"
              value={`${errors.length} / ${warnings.length}`}
            />
          </div>
          <p className="text-xs text-neutral-500">
            {preview.fileName} ·{" "}
            {preview.hojas.map((h) => `${h.nombre}: ${h.filas} filas`).join(" · ")}
          </p>

          {errors.length > 0 && (
            <IssueList
              title="Errores (hay que corregirlos en el Excel y volver a subirlo)"
              tone="error"
              issues={errors}
            />
          )}
          {warnings.length > 0 && (
            <IssueList title="Advertencias (revisalas antes de confirmar)" tone="warning" issues={warnings} />
          )}

          {preview.productos.length > 0 && <ProductTable productos={preview.productos} />}

          {!preview.yaImportado && errors.length === 0 && preview.productos.length > 0 && (
            <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:flex-row sm:items-center">
              {warnings.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={warningsChecked}
                    onChange={(e) => setWarningsChecked(e.target.checked)}
                  />
                  Revisé las {warnings.length} advertencias
                </label>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={!canConfirm || pending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 sm:ml-auto"
              >
                {pending ? "Importando…" : `Confirmar importación de ${preview.productos.length} productos`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </p>
    </div>
  );
}

function Alert({ tone, children }: { tone: "error"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : ""
      }`}
    >
      {children}
    </div>
  );
}

function IssueList({
  title,
  tone,
  issues,
}: {
  title: string;
  tone: "error" | "warning";
  issues: { message: string; hoja?: string; fila?: number; sku?: string }[];
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <section className={`rounded-lg border p-3 ${styles}`}>
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {issues.map((i, n) => (
          <li key={n}>
            <span className="font-mono text-xs opacity-70">
              {[i.hoja, i.fila && `fila ${i.fila}`, i.sku].filter(Boolean).join(" · ")}
            </span>
            {(i.hoja || i.sku) && " — "}
            {i.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductTable({
  productos,
}: {
  productos: { sku: string; marca: string; descripcion: string; stock: number; ubicaciones: string[] }[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">Stock consolidado por SKU</h2>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-xs text-neutral-600">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Producto</th>
              <th className="hidden px-3 py-2 sm:table-cell">Ubicaciones</th>
              <th className="px-3 py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {productos.map((p) => (
              <tr key={p.sku}>
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{p.sku}</td>
                <td className="px-3 py-2">
                  {p.descripcion}
                  <span className="block text-xs text-neutral-500">{p.marca}</span>
                </td>
                <td className="hidden px-3 py-2 text-xs text-neutral-600 sm:table-cell">
                  {p.ubicaciones.join(", ")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{p.stock.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
