// Genera .env.local a partir de secrets/service-account.json sin imprimir la clave.
// Uso: node scripts/env-from-key.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const key = JSON.parse(readFileSync("secrets/service-account.json", "utf8"));
const current = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const sheetId = current.match(/^GOOGLE_SHEET_ID=(.*)$/m)?.[1] ?? "";

const escapedKey = key.private_key.split("\n").join(String.raw`\n`);

const lines = [
  `GOOGLE_SHEET_ID=${sheetId}`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL=${key.client_email}`,
  `GOOGLE_PRIVATE_KEY="${escapedKey}"`,
  "",
];
writeFileSync(".env.local", lines.join("\n"));
console.log(
  `.env.local generado para ${key.client_email} (clave ${key.private_key_id.slice(0, 8)}…)`,
);
