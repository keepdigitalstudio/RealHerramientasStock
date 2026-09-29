// Fecha y hora de Argentina (UTC-3, sin horario de verano) en ISO 8601,
// por ejemplo "2026-10-03T14:22:05-03:00". Se guarda así en el Sheet.
export function nowAr(date = new Date()): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19) + "-03:00";
}
