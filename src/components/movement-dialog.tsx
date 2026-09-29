"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { registerMovementAction } from "@/app/(app)/stock/actions";
import {
  CANALES,
  CANAL_LABEL,
  MOTIVOS_MANUALES,
  MOTIVO_LABEL,
  type Canal,
  type Tipo,
} from "@/lib/stock/constants";
import type { MovementCheck } from "@/lib/stock/movements";

export type MovementTarget = {
  sku: string;
  descripcion: string;
  stockActual: number;
  tipo: Tipo;
};

export function MovementDialog({
  target,
  onClose,
}: {
  target: MovementTarget | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    if (!target && dialog.open) dialog.close();
  }, [target]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/40"
    >
      {/* key: formulario nuevo (y id de movimiento nuevo) cada vez que se abre */}
      {target && <MovementForm key={`${target.sku}-${target.tipo}`} target={target} onDone={onClose} />}
    </dialog>
  );
}

function MovementForm({ target, onDone }: { target: MovementTarget; onDone: () => void }) {
  const router = useRouter();
  const [id] = useState(() => crypto.randomUUID());
  const [tipo, setTipo] = useState<Tipo>(target.tipo);
  const [motivo, setMotivo] = useState<string>(target.tipo === "egreso" ? "venta" : "compra");
  const [canal, setCanal] = useState<Canal | "">(target.tipo === "egreso" ? "mercadolibre" : "");
  const [cantidad, setCantidad] = useState("1");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<{ check: MovementCheck; stockActual: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const usaCanal = motivo === "venta" || motivo === "devolucion";
  const n = Number(cantidad);
  const valido = Number.isInteger(n) && n > 0 && (motivo !== "venta" || canal !== "");
  const stockBase = check?.stockActual ?? target.stockActual;
  const resultante = valido ? stockBase + (tipo === "ingreso" ? n : -n) : null;

  function changeTipo(t: Tipo) {
    setTipo(t);
    setMotivo(t === "egreso" ? "venta" : "compra");
    setCanal(t === "egreso" ? "mercadolibre" : "");
    setCheck(null);
  }

  function changeMotivo(m: string) {
    setMotivo(m);
    if (m === "venta" && canal === "") setCanal("mercadolibre");
    if (m !== "venta" && m !== "devolucion") setCanal("");
    setCheck(null);
  }

  function submit(confirmado: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await registerMovementAction({
        id,
        sku: target.sku,
        tipo,
        motivo,
        canal: usaCanal ? canal : "",
        cantidad: n,
        nota: nota.trim(),
        stockVisto: target.stockActual,
        confirmado,
      });
      if (!res.ok) return setError(res.error);
      if (res.data.status === "confirmar") {
        return setCheck({ check: res.data.check, stockActual: res.data.stockActual });
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form
      method="dialog"
      onSubmit={(e) => {
        e.preventDefault();
        submit(check !== null);
      }}
      className="space-y-4 p-5"
    >
      <div>
        <p className="font-mono text-xs text-neutral-500">{target.sku}</p>
        <h2 className="font-semibold">{target.descripcion || target.sku}</h2>
        <p className="text-sm text-neutral-600">Stock actual: {target.stockActual}</p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
        {(["ingreso", "egreso"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeTipo(t)}
            className={`rounded-md py-1.5 ${tipo === t ? "bg-white shadow-sm font-medium" : "text-neutral-600"}`}
          >
            {t === "ingreso" ? "Ingreso" : "Egreso"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Motivo">
          <select value={motivo} onChange={(e) => changeMotivo(e.target.value)} className={input}>
            {MOTIVOS_MANUALES[tipo].map((m) => (
              <option key={m} value={m}>
                {MOTIVO_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              setCheck(null);
            }}
            className={`${input} tabular-nums`}
            autoFocus
          />
        </Field>
      </div>

      {usaCanal && (
        <Field label={motivo === "venta" ? "Canal" : "Canal (opcional)"}>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as Canal | "")}
            className={input}
          >
            {motivo === "devolucion" && <option value="">Sin canal</option>}
            {CANALES.map((c) => (
              <option key={c} value={c}>
                {CANAL_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Nota (opcional)">
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} className={input} />
      </Field>

      {resultante !== null && (
        <p className="text-sm text-neutral-600">
          Stock después: <b className={resultante < 0 ? "text-red-700" : ""}>{resultante}</b>
        </p>
      )}

      {check && (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {check.check.stockCambio && (
            <p>
              El stock cambió mientras tenías esto abierto: era {check.check.stockCambio.visto} y ahora
              es {check.check.stockCambio.actual}.
            </p>
          )}
          {check.check.negativo && (
            <p>Este egreso deja el stock en {check.check.negativo.resultante} (negativo).</p>
          )}
          <p className="font-medium">¿Confirmás igual?</p>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!valido || pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {pending ? "Guardando…" : check ? "Confirmar" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export const input =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
