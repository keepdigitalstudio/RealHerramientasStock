import bcrypt from "bcryptjs";
import { readRows, writeAtomic } from "@/lib/sheets/client";
import { TABS } from "@/lib/sheets/schema";
import { nowAr } from "@/lib/time";
import type { Rol } from "./token";

// Usuarios en la pestaña Usuarios del Sheet: email (o nombre de usuario), nombre, rol,
// password_hash (bcrypt), activo, creado_en. Sin "server-only" para usarlo desde scripts/.

export type User = {
  login: string;
  nombre: string;
  rol: Rol;
  passwordHash: string;
  activo: boolean;
  creadoEn: string;
  sheetRow: number;
};

export class UserError extends Error {}

export const normalizeLogin = (v: string) => v.trim().toLowerCase();

export async function readUsers(): Promise<User[]> {
  const rows = await readRows(TABS.usuarios.name);
  return rows
    .map((r, i) => ({
      login: normalizeLogin(r[0] ?? ""),
      nombre: r[1] ?? "",
      rol: (r[2] === "admin" ? "admin" : "operador") as Rol,
      passwordHash: r[3] ?? "",
      activo: (r[4] ?? "").toLowerCase() !== "false",
      creadoEn: r[5] ?? "",
      sheetRow: i + 2,
    }))
    .filter((u) => u.login);
}

export async function findUser(login: string): Promise<User | undefined> {
  const l = normalizeLogin(login);
  return (await readUsers()).find((u) => u.login === l);
}

// Mismo tiempo de respuesta exista o no el usuario, para no revelar cuáles existen.
const DUMMY_HASH = bcrypt.hashSync("usuario-inexistente", 10);

export async function checkCredentials(login: string, password: string): Promise<User | null> {
  const user = await findUser(login);
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  return user && user.activo && ok ? user : null;
}

export function validatePassword(password: string) {
  if (password.length < 8) throw new UserError("La contraseña tiene que tener al menos 8 caracteres.");
  if (password.length > 72) throw new UserError("La contraseña puede tener hasta 72 caracteres.");
}

const toRow = (u: Omit<User, "sheetRow">) => [u.login, u.nombre, u.rol, u.passwordHash, u.activo, u.creadoEn];

export async function createUser(input: { login: string; nombre: string; rol: Rol; password: string }) {
  const login = normalizeLogin(input.login);
  if (!login) throw new UserError("El usuario o email es obligatorio.");
  if (!input.nombre.trim()) throw new UserError("El nombre es obligatorio.");
  validatePassword(input.password);
  if (await findUser(login)) throw new UserError(`Ya existe el usuario ${login}.`);

  const user = {
    login,
    nombre: input.nombre.trim(),
    rol: input.rol,
    passwordHash: await bcrypt.hash(input.password, 10),
    activo: true,
    creadoEn: nowAr(),
  };
  await writeAtomic([{ type: "append", tab: TABS.usuarios.name, rows: [toRow(user)] }]);
}

export async function updateUser(
  login: string,
  changes: { password?: string; activo?: boolean; nombre?: string; rol?: Rol },
) {
  const users = await readUsers();
  const user = users.find((u) => u.login === normalizeLogin(login));
  if (!user) throw new UserError("No existe ese usuario.");

  const updated = { ...user };
  if (changes.password !== undefined) {
    validatePassword(changes.password);
    updated.passwordHash = await bcrypt.hash(changes.password, 10);
  }
  if (changes.nombre !== undefined) updated.nombre = changes.nombre.trim() || user.nombre;
  if (changes.rol !== undefined) updated.rol = changes.rol;
  if (changes.activo !== undefined) updated.activo = changes.activo;

  // Nunca dejar el sistema sin un admin activo.
  const quedanAdmins = users.some((u) =>
    u.login === user.login ? updated.rol === "admin" && updated.activo : u.rol === "admin" && u.activo,
  );
  if (!quedanAdmins) throw new UserError("Tiene que quedar al menos un admin activo.");

  await writeAtomic([
    { type: "update", tab: TABS.usuarios.name, sheetRow: user.sheetRow, values: toRow(updated) },
  ]);
}
