import { ESTADO_LABEL, type Estado } from "@/lib/stock/constants";

// Paleta de estado (fija): siempre acompañada del texto, nunca el color solo.
const DOT: Record<Estado, string> = {
  ok: "bg-[#0ca30c]",
  bajo: "bg-[#fab219]",
  sin_stock: "bg-[#d03b3b]",
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700 whitespace-nowrap">
      <span className={`size-2 rounded-full ${DOT[estado]}`} aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
