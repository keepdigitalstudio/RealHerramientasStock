"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EstadoBadge } from "@/components/estado-badge";
import { MovementDialog, input, type MovementTarget } from "@/components/movement-dialog";
import { ESTADO_LABEL, type Estado, type Tipo } from "@/lib/stock/constants";
import type { ProductWithEstado } from "@/lib/stock/products";

type SortKey = "sku" | "descripcion" | "stockActual" | "stockMinimo" | "estado";
const ESTADO_ORDEN: Record<Estado, number> = { sin_stock: 0, bajo: 1, ok: 2 };

type Group = { key: string; titulo: string | null; items: ProductWithEstado[] };
type Sort = { key: SortKey; dir: 1 | -1 };
type OnMove = (p: ProductWithEstado, t: Tipo) => void;

export function StockTable({
  products,
  initialEstado = "",
}: {
  products: ProductWithEstado[];
  initialEstado?: Estado | "";
}) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado | "">(initialEstado);
  const [marca, setMarca] = useState("");
  const [inactivos, setInactivos] = useState(false);
  const [agrupar, setAgrupar] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: "sku", dir: 1 });
  const [target, setTarget] = useState<MovementTarget | null>(null);

  const marcas = useMemo(
    () => [...new Set(products.map((p) => p.marca).filter(Boolean))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      if (!inactivos && !p.activo) return false;
      if (estado && p.estado !== estado) return false;
      if (marca && p.marca !== marca) return false;
      const hay =
        `${p.sku} ${p.descripcion} ${p.productoBase} ${p.variante} ${p.marca} ${p.ubicaciones}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    const value = (p: ProductWithEstado) =>
      sort.key === "estado" ? ESTADO_ORDEN[p.estado] : p[sort.key];
    return list.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es");
      return cmp * sort.dir || a.sku.localeCompare(b.sku);
    });
  }, [products, q, estado, marca, inactivos, sort]);

  const groups = useMemo<Group[]>(() => {
    if (!agrupar) return [{ key: "", titulo: null, items: filtered }];
    const map = new Map<string, Group>();
    for (const p of filtered) {
      const key = p.productoBase ? `base:${p.productoBase}` : `sku:${p.sku}`;
      const g = map.get(key) ?? { key, titulo: p.productoBase || null, items: [] };
      g.items.push(p);
      map.set(key, g);
    }
    return [...map.values()];
  }, [filtered, agrupar]);

  const open: OnMove = (p, tipo) =>
    setTarget({ sku: p.sku, descripcion: p.descripcion, stockActual: p.stockActual, tipo });

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600">
        Todavía no hay productos. Importá el relevamiento desde{" "}
        <Link href="/importar" className="underline">
          Importar
        </Link>{" "}
        o creá uno con{" "}
        <Link href="/stock/nuevo" className="underline">
          Nuevo producto
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Buscar SKU, producto, ubicación…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${input} col-span-2 sm:w-72`}
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as Estado | "")}
          className={`${input} sm:w-40`}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_LABEL) as Estado[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
        <select
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          className={`${input} sm:w-40`}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
          Agrupar variantes
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={inactivos}
            onChange={(e) => setInactivos(e.target.checked)}
          />
          Ver dados de baja
        </label>
      </div>

      <p className="text-xs text-neutral-500">
        {filtered.length} de {products.length} productos
      </p>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-xs text-neutral-600">
            <tr>
              <Th label="SKU" k="sku" sort={sort} onSort={toggleSort} />
              <Th label="Producto" k="descripcion" sort={sort} onSort={toggleSort} />
              <Th label="Stock" k="stockActual" sort={sort} onSort={toggleSort} right />
              <Th label="Mínimo" k="stockMinimo" sort={sort} onSort={toggleSort} right />
              <Th label="Estado" k="estado" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {groups.map((g) => (
              <GroupRows key={g.key} group={g} onMove={open} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Celular: tarjetas */}
      <div className="space-y-2 sm:hidden">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            {g.titulo && (
              <p className="pt-2 text-xs font-medium text-neutral-500">
                {g.titulo} · {sum(g.items)} u.
              </p>
            )}
            {g.items.map((p) => (
              <Card key={p.sku} p={p} onMove={open} />
            ))}
          </div>
        ))}
      </div>

      <MovementDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

const sum = (items: ProductWithEstado[]) => items.reduce((s, p) => s + p.stockActual, 0);

function Th({
  label,
  k,
  sort,
  onSort,
  right,
}: {
  label: string;
  k: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = sort.key === k;
  return (
    <th className={`px-3 py-2 font-medium ${right ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 hover:text-neutral-900"
      >
        {label}
        <span className={active ? "" : "opacity-0"}>{sort.dir === 1 ? "↑" : "↓"}</span>
      </button>
    </th>
  );
}

function GroupRows({ group, onMove }: { group: Group; onMove: OnMove }) {
  return (
    <>
      {group.titulo && (
        <tr className="bg-neutral-50">
          <td />
          <td className="px-3 py-1.5 text-xs font-medium text-neutral-600">
            {group.titulo}{" "}
            <span className="font-normal">
              · {group.items.length} {group.items.length === 1 ? "variante" : "variantes"}
            </span>
          </td>
          <td className="px-3 py-1.5 text-right text-xs font-medium tabular-nums text-neutral-600">
            {sum(group.items)}
          </td>
          <td colSpan={3} />
        </tr>
      )}
      {group.items.map((p) => (
        <tr key={p.sku} className={p.activo ? "" : "text-neutral-400"}>
          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
            <Link href={`/stock/${encodeURIComponent(p.sku)}`} className="hover:underline">
              {p.sku}
            </Link>
          </td>
          <td className={`px-3 py-2 ${group.titulo ? "pl-6" : ""}`}>
            {group.titulo && p.variante ? p.variante : p.descripcion}
            {!p.activo && <span className="ml-2 text-xs">(de baja)</span>}
            {p.marca && <span className="block text-xs text-neutral-500">{p.marca}</span>}
          </td>
          <td className="px-3 py-2 text-right font-medium tabular-nums">{p.stockActual}</td>
          <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
            {p.stockMinimo || "–"}
          </td>
          <td className="px-3 py-2">
            <EstadoBadge estado={p.estado} />
          </td>
          <td className="px-3 py-2">
            <RowActions p={p} onMove={onMove} />
          </td>
        </tr>
      ))}
    </>
  );
}

function Card({ p, onMove }: { p: ProductWithEstado; onMove: OnMove }) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white p-3 ${p.activo ? "" : "opacity-60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/stock/${encodeURIComponent(p.sku)}`} className="min-w-0">
          <p className="font-mono text-xs text-neutral-500">{p.sku}</p>
          <p className="text-sm">{p.descripcion}</p>
          {p.marca && <p className="text-xs text-neutral-500">{p.marca}</p>}
        </Link>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">{p.stockActual}</p>
          <p className="text-xs text-neutral-500">mín. {p.stockMinimo || "–"}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <EstadoBadge estado={p.estado} />
        <RowActions p={p} onMove={onMove} />
      </div>
    </div>
  );
}

function RowActions({ p, onMove }: { p: ProductWithEstado; onMove: OnMove }) {
  if (!p.activo) return null;
  const btn = "rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100";
  return (
    <div className="flex justify-end gap-1.5">
      <button type="button" onClick={() => onMove(p, "ingreso")} className={btn}>
        + Ingreso
      </button>
      <button type="button" onClick={() => onMove(p, "egreso")} className={btn}>
        − Egreso
      </button>
    </div>
  );
}
