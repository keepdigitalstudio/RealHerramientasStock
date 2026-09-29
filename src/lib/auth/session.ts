import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  signSession,
  verifySessionToken,
  type SessionPayload,
} from "./token";
import { findUser } from "./users";

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Lectura de páginas: alcanza con el token firmado.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
});

export async function requirePageSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePageAdmin(): Promise<SessionPayload> {
  const session = await requirePageSession();
  if (session.rol !== "admin") redirect("/dashboard");
  return session;
}

export class AuthError extends Error {}

// Escrituras: además del token, se confirma contra el Sheet que el usuario siga activo y
// con el mismo rol (así una baja o un cambio de rol se aplican enseguida).
export async function requireUser(opts: { admin?: boolean } = {}): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Tu sesión venció. Volvé a ingresar.");
  const user = await findUser(session.login);
  if (!user || !user.activo) throw new AuthError("Tu usuario no está activo.");
  if (opts.admin && user.rol !== "admin") throw new AuthError("Esta acción es solo para administradores.");
  return { login: user.login, nombre: user.nombre, rol: user.rol };
}
