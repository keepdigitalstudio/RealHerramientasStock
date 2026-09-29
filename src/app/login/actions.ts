"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/auth/session";
import { checkCredentials } from "@/lib/auth/users";

export type LoginState = { error?: string; login?: string } | undefined;

// Solo rutas internas, para que "next" no se pueda usar para mandar a otro sitio.
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { error: "Completá usuario y contraseña.", login };

  let user;
  try {
    user = await checkCredentials(login, password);
  } catch (e) {
    console.error(e);
    return { error: "No se pudo verificar el usuario. Probá de nuevo en unos segundos.", login };
  }
  if (!user) return { error: "Usuario o contraseña incorrectos.", login };

  await createSession({ login: user.login, nombre: user.nombre, rol: user.rol });
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
