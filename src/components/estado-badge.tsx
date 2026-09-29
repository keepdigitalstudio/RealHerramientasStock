import { ESTADO_LABEL, type Estado } from "@/lib/stock/constants";

const DOT: Record<Estado, string> = {
  ok: "bg-emerald-500",
  bajo: "bg-amber-500",
  sin_stock: "bg-red-500",
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700 whitespace-nowrap">
      <span className={`size-2 rounded-full ${DOT[estado]}`} aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
