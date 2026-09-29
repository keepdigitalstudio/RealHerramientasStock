"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth/session";
import { createUser, updateUser, UserError } from "@/lib/auth/users";

export type UserActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): UserActionResult {
  if (e instanceof UserError || e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Datos inválidos." };
  console.error(e);
  return { ok: false, error: "No se pudo guardar. Probá de nuevo en unos segundos." };
}

const rol = z.enum(["admin", "operador"]);

const createSchema = z.object({
  login: z.string().trim().min(1, "El usuario o email es obligatorio.").max(100),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(60),
  rol,
  password: z.string(),
});

export async function createUserAction(raw: z.input<typeof createSchema>): Promise<UserActionResult> {
  try {
    await requireUser({ admin: true });
    await createUser(createSchema.parse(raw));
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const updateSchema = z.object({
  login: z.string().min(1),
  password: z.string().optional(),
  activo: z.boolean().optional(),
  rol: rol.optional(),
});

export async function updateUserAction(raw: z.input<typeof updateSchema>): Promise<UserActionResult> {
  try {
    await requireUser({ admin: true });
    const { login, ...changes } = updateSchema.parse(raw);
    await updateUser(login, changes);
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
