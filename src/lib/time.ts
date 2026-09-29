// Fecha y hora de Argentina (UTC-3, sin horario de verano) en ISO 8601,
// por ejemplo "2026-10-03T14:22:05-03:00". Se guarda así en el Sheet.
export function nowAr(date = new Date()): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19) + "-03:00";
}

// "2026-10-03T14:22:05-03:00" → "03/10/2026 14:22". Se usa el texto tal cual (ya está en
// hora de Argentina), sin pasar por Date, para que no dependa de la zona del navegador.
export function formatFecha(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso;
}
