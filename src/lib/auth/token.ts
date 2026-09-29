import { jwtVerify, SignJWT } from "jose";

// Token de sesión firmado (HS256). Sin dependencias de Next para poder usarlo en el proxy.

export type Rol = "admin" | "operador";

export type SessionPayload = {
  login: string; // email o usuario (columna "email" de Usuarios)
  nombre: string;
  rol: Rol;
};

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 30;

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  // Sin secreto no hay login posible: mejor fallar que firmar con una clave vacía.
  if (!secret || secret.length < 32) throw new Error("Falta AUTH_SECRET (mínimo 32 caracteres).");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const { login, nombre, rol } = payload as Partial<SessionPayload>;
    if (typeof login !== "string" || typeof nombre !== "string") return null;
    if (rol !== "admin" && rol !== "operador") return null;
    return { login, nombre, rol };
  } catch {
    return null;
  }
}
