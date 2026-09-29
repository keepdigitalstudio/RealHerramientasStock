import Link from "next/link";
import { EstadoBadge } from "@/components/estado-badge";
import { CANAL_LABEL, MOTIVO_LABEL, type Canal } from "@/lib/stock/constants";
import { computeDashboard, PERIODOS, type Periodo } from "@/lib/stock/metrics";
import { readMovements } from "@/lib/stock/movements";
import { readProducts, withEstado } from "@/lib/stock/products";
import { formatFecha, nowAr } from "@/lib/time";
import { HorizontalBars, Legend, Lines, StackedColumns } from "./charts";
import { COLORS } from "./colors";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("es-AR");
const ddmmyyyy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

const CANALES_SERIES = [
  { key: "mercadolibre", label: CANAL_LABEL.mercadolibre, color: COLORS.mercadolibre },
  { key: "web", label: CANAL_LABEL.web, color: COLORS.web },
];
const MOV_SERIES = [
  { key: "ingresos", label: "Ingresos", color: COLORS.ingresos },
  { key: "egresos", label: "Egresos", color: COLORS.egresos },
];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const param = Number((await searchParams).dias);
  const dias: Periodo = (PERIODOS as readonly number[]).includes(param) ? (param as Periodo) : 30;

  const [products, movements] = await Promise.all([readProducts(), readMovements()]);
  const d = computeDashboard(products.map(withEstado), movements, {
    hoy: nowAr().slice(0, 10),
    dias,
  });
  const ventanaCobertura = Math.min(30, Math.max(1, d.cobertura.diasHistorial));
  const agrupado = d.periodo.bucket === "dia" ? "por día" : d.periodo.bucket === "semana" ? "por semana" : "por mes";

  if (products.length === 0) {
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-600">
          Todavía no hay datos. Empezá por <Link href="/importar" className="underline">importar el relevamiento</Link>.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Stock de hoy: no depende del período */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600">Stock hoy</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Productos activos" value={fmt(d.resumen.productos)} />
          <Tile label="Unidades en stock" value={fmt(d.resumen.unidades)} />
          <Tile
            label="Bajo el mínimo"
            value={fmt(d.resumen.bajo)}
            badge={<EstadoBadge estado="bajo" />}
            href="/stock?estado=bajo"
          />
          <Tile
            label="Sin stock"
            value={fmt(d.resumen.sinStock)}
            badge={<EstadoBadge estado="sin_stock" />}
            href="/stock?estado=sin_stock"
          />
        </div>
      </div>

      {/* Filtro de período: aplica a todo lo que sigue */}
      <div className="sticky top-[57px] z-[5] -mx-4 flex flex-wrap items-center gap-2 border-y border-neutral-200 bg-neutral-50/95 px-4 py-2 backdrop-blur sm:top-[61px]">
        <span className="text-sm text-neutral-600">Período</span>
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/dashboard?dias=${p}`}
            scroll={false}
            className={`rounded-md px-3 py-1 text-sm ${p === dias ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200"}`}
          >
            {p === 365 ? "1 año" : `${p} días`}
          </Link>
        ))}
        <span className="ml-auto text-xs text-neutral-500">
          {ddmmyyyy(d.periodo.desde)} – {ddmmyyyy(d.periodo.hasta)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label="Unidades vendidas"
          value={fmt(d.ventas.total)}
          sub={<Delta actual={d.ventas.total} anterior={d.ventas.anterior} dias={dias} />}
          large
        />
        {(Object.keys(d.ventas.porCanal) as Canal[]).map((c) => (
          <Tile
            key={c}
            label={CANAL_LABEL[c]}
            value={fmt(d.ventas.porCanal[c])}
            dot={COLORS[c]}
            sub={
              d.ventas.total > 0 ? (
                <span className="text-neutral-500">
                  {Math.round((d.ventas.porCanal[c] / d.ventas.total) * 100)}% de las ventas
                </span>
              ) : null
            }
          />
        ))}
      </div>

      {d.insights.length > 0 && (
        <Card title="Insights">
          <ul className="space-y-2 text-sm">
            {d.insights.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Ventas por canal" subtitle={`Unidades ${agrupado}`}>
          <Legend series={CANALES_SERIES} totals={d.ventas.porCanal} />
          <StackedColumns data={d.serieVentas} series={CANALES_SERIES} />
          <DataTable
            headers={["Período", "Mercado Libre", "Web"]}
            rows={d.serieVentas.map((r) => [r.label, r.mercadolibre, r.web])}
          />
        </Card>

        <Card title="Ingresos y egresos" subtitle={`Unidades ${agrupado}, sin el stock inicial`}>
          <Legend
            series={MOV_SERIES}
            totals={{
              ingresos: d.serieMovimientos.reduce((s, r) => s + r.ingresos, 0),
              egresos: d.serieMovimientos.reduce((s, r) => s + r.egresos, 0),
            }}
          />
          <Lines data={d.serieMovimientos} series={MOV_SERIES} />
          <DataTable
            headers={["Período", "Ingresos", "Egresos"]}
            rows={d.serieMovimientos.map((r) => [r.label, r.ingresos, r.egresos])}
          />
        </Card>

        <Card title="Más vendidos" subtitle="Top 10 del período, en unidades">
          {d.masVendidos.length === 0 ? (
            <Empty>Sin ventas en el período.</Empty>
          ) : (
            <>
              <Legend series={CANALES_SERIES} />
              <HorizontalBars data={d.masVendidos} series={CANALES_SERIES} labelKey="sku" totalKey="total" />
              <DataTable
                headers={["SKU", "Producto", "Mercado Libre", "Web", "Total"]}
                rows={d.masVendidos.map((v) => [v.sku, v.descripcion, v.mercadolibre, v.web, v.total])}
              />
            </>
          )}
        </Card>

        <Card title="Stock por marca" subtitle="Unidades en stock hoy">
          <HorizontalBars
            data={d.porMarca}
            series={[{ key: "unidades", label: "Unidades", color: COLORS.neutral }]}
            labelKey="marca"
            totalKey="unidades"
          />
          <DataTable headers={["Marca", "Unidades"]} rows={d.porMarca.map((m) => [m.marca, m.unidades])} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Se agotan pronto"
          subtitle={`Días de cobertura al ritmo de venta ${ventanaCobertura === 1 ? "del último día" : `de los últimos ${ventanaCobertura} días`}`}
        >
          {d.cobertura.diasHistorial < 7 && (
            <p className="mb-2 text-xs text-amber-800">
              Hay {d.cobertura.diasHistorial} {d.cobertura.diasHistorial === 1 ? "día" : "días"} de historial: la estimación
              se vuelve confiable con algunas semanas de ventas.
            </p>
          )}
          {d.cobertura.items.length === 0 ? (
            <Empty>Ningún producto se agota en los próximos 30 días al ritmo actual.</Empty>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-1 font-normal">Producto</th>
                  <th className="py-1 text-right font-normal">Stock</th>
                  <th className="py-1 text-right font-normal">Venta/día</th>
                  <th className="py-1 text-right font-normal">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {d.cobertura.items.map((c) => (
                  <tr key={c.sku}>
                    <td className="py-1.5">
                      <ProductLink sku={c.sku} descripcion={c.descripcion} />
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{c.stock}</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-600">{c.ventasDia.toLocaleString("es-AR")}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{c.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Stock inmovilizado" subtitle="Con stock y sin egresos en los últimos 90 días">
          {!d.inmovilizado.disponible ? (
            <Empty>
              Se calcula cuando haya 90 días de historial: disponible desde el {ddmmyyyy(d.inmovilizado.desde)}.
            </Empty>
          ) : d.inmovilizado.productos === 0 ? (
            <Empty>Todos los productos con stock tuvieron movimiento en los últimos 90 días.</Empty>
          ) : (
            <>
              <p className="mb-3 text-sm">
                <b className="text-lg font-semibold">{fmt(d.inmovilizado.productos)}</b> productos ·{" "}
                <b className="font-semibold">{fmt(d.inmovilizado.unidades)}</b> unidades paradas
              </p>
              <ul className="divide-y divide-neutral-100 text-sm">
                {d.inmovilizado.items.map((i) => (
                  <li key={i.sku} className="flex items-center justify-between gap-3 py-1.5">
                    <ProductLink sku={i.sku} descripcion={i.descripcion} />
                    <span className="shrink-0 text-right text-xs text-neutral-500">
                      <b className="text-sm font-medium text-neutral-900 tabular-nums">{i.stock}</b> u. ·{" "}
                      {i.ultimoEgreso ? `último egreso ${ddmmyyyy(i.ultimoEgreso)}` : "nunca tuvo egresos"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title="Últimos movimientos">
        <ul className="divide-y divide-neutral-100 text-sm">
          {d.ultimos.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-2">
              <span className={`w-12 shrink-0 text-right font-medium tabular-nums ${m.tipo === "ingreso" ? "text-emerald-700" : ""}`}>
                {m.tipo === "ingreso" ? "+" : "−"}
                {m.cantidad}
              </span>
              <div className="min-w-0 flex-1">
                <ProductLink sku={m.sku} descripcion={m.descripcion} />
                <p className="text-xs text-neutral-500">
                  {MOTIVO_LABEL[m.motivo] ?? m.motivo}
                  {m.canal && ` · ${CANAL_LABEL[m.canal]}`} · {formatFecha(m.fechaHora)} · {m.usuario}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  badge,
  dot,
  href,
  large,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
  dot?: string;
  href?: string;
  large?: boolean;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        {dot && <span className="size-2.5 rounded-sm" style={{ background: dot }} aria-hidden />}
        {label}
      </p>
      <p className={`mt-1 font-semibold ${large ? "text-3xl" : "text-2xl"}`}>{value}</p>
      {badge && <div className="mt-1">{badge}</div>}
      {sub && <p className="mt-1 text-xs">{sub}</p>}
    </>
  );
  const cls = "block rounded-lg border border-neutral-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${cls} hover:border-neutral-400`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Delta({ actual, anterior, dias }: { actual: number; anterior: number; dias: number }) {
  if (anterior === 0) return <span className="text-neutral-500">Sin datos de los {dias} días anteriores</span>;
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  const color = cambio > 0 ? "text-[#006300]" : cambio < 0 ? "text-red-700" : "text-neutral-500";
  return (
    <span className={color}>
      {cambio > 0 ? "▲" : cambio < 0 ? "▼" : "="} {Math.abs(cambio)}%{" "}
      <span className="text-neutral-500">vs {dias} días anteriores ({fmt(anterior)})</span>
    </span>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-neutral-500">{children}</p>;
}

function ProductLink({ sku, descripcion }: { sku: string; descripcion: string }) {
  return (
    <Link href={`/stock/${encodeURIComponent(sku)}`} className="block min-w-0 hover:underline">
      <span className="block truncate">{descripcion}</span>
      <span className="font-mono text-xs text-neutral-500">{sku}</span>
    </Link>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800">Ver tabla</summary>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white text-left text-neutral-500">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className={`py-1 font-normal ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={`py-1 ${typeof c === "number" ? "text-right tabular-nums" : ""}`}>
                    {typeof c === "number" ? fmt(c) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
