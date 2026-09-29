"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelMovementAction } from "../actions";
import { CANAL_LABEL, MOTIVO_LABEL, type Canal } from "@/lib/stock/constants";
import type { Movement } from "@/lib/stock/movements";
import { formatFecha } from "@/lib/time";

const NO_ANULABLES = new Set(["inicial", "anulacion"]);

export function History({ movements, stockActual }: { movements: Movement[]; stockActual: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const anulados = new Set(movements.map((m) => m.anulaA).filter(Boolean));

  function anular(m: Movement) {
    const signo = m.tipo === "ingreso" ? "+" : "−";
    if (!confirm(`¿Anular ${MOTIVO_LABEL[m.motivo].toLowerCase()} ${signo}${m.cantidad}? Se registra el movimiento inverso.`)) return;
    setError(null);
    setBusy(m.id);
    startTransition(async () => {
      const send = (confirmado: boolean) =>
        cancelMovementAction({ movementId: m.id, sku: m.sku, stockVisto: stockActual, confirmado });
      let res = await send(false);
      if (res.ok && res.data.status === "confirmar") {
        const c = res.data.check;
        const msg = [
          c.stockCambio && `El stock cambió (ahora es ${c.stockCambio.actual}).`,
          c.negativo && `La anulación deja el stock en ${c.negativo.resultante}.`,
          "¿Confirmás?",
        ].filter(Boolean).join(" ");
        if (!confirm(msg)) return setBusy(null);
        res = await send(true);
      }
      setBusy(null);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  if (movements.length === 0) {
    return <p className="text-sm text-neutral-500">Sin movimientos.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {movements.map((m) => {
          const anulado = anulados.has(m.id);
          return (
            <li key={m.id} className={`flex items-start gap-3 px-3 py-2.5 text-sm ${anulado ? "text-neutral-400" : ""}`}>
              <span
                className={`w-14 shrink-0 text-right font-medium tabular-nums ${
                  anulado ? "line-through" : m.tipo === "ingreso" ? "text-emerald-700" : "text-neutral-900"
                }`}
              >
                {m.tipo === "ingreso" ? "+" : "−"}
                {m.cantidad}
              </span>
              <div className="min-w-0 flex-1">
                <p>
                  {MOTIVO_LABEL[m.motivo] ?? m.motivo}
                  {m.canal && ` · ${CANAL_LABEL[m.canal as Canal] ?? m.canal}`}
                  {anulado && " · anulado"}
                  {m.forzadoNegativo && <span className="text-red-700"> · quedó negativo</span>}
                </p>
                {m.nota && <p className="text-xs text-neutral-500">{m.nota}</p>}
                <p className="text-xs text-neutral-500">
                  {formatFecha(m.fechaHora)} · {m.usuario} · stock {m.stockAnterior} → {m.stockResultante}
                </p>
              </div>
              {!anulado && !NO_ANULABLES.has(m.motivo) && (
                <button
                  type="button"
                  onClick={() => anular(m)}
                  disabled={pending}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  {busy === m.id ? "Anulando…" : "Anular"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
