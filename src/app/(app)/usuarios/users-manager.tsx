"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field, input } from "@/components/movement-dialog";
import { createUserAction, updateUserAction, type UserActionResult } from "./actions";

type UserRow = { login: string; nombre: string; rol: "admin" | "operador"; activo: boolean };

export function UsersManager({ users, me }: { users: UserRow[]; me: string }) {
  return (
    <div className="space-y-6">
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {users.map((u) => (
          <UserItem key={u.login} user={u} isMe={u.login === me} />
        ))}
      </ul>
      <NewUser />
    </div>
  );
}

function useSubmit() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<UserActionResult>, okText: string, onOk?: () => void) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: okText });
      onOk?.();
      router.refresh();
    });
  };
  return { pending, msg, run };
}

function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`rounded-md p-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
      {msg.text}
    </p>
  );
}

function UserItem({ user, isMe }: { user: UserRow; isMe: boolean }) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const { pending, msg, run } = useSubmit();
  const btn = "rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 disabled:opacity-40";

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={user.activo ? "" : "text-neutral-400"}>
          <p className="font-medium">
            {user.nombre} {isMe && <span className="text-xs font-normal text-neutral-500">(vos)</span>}
          </p>
          <p className="text-sm text-neutral-600">
            {user.login} · {user.rol}
            {!user.activo && " · inactivo"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((v) => !v)} className={btn}>
            Cambiar contraseña
          </button>
          {!isMe && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => updateUserAction({ login: user.login, activo: !user.activo }),
                  user.activo ? "Usuario desactivado." : "Usuario activado.",
                )
              }
              className={btn}
            >
              {user.activo ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => updateUserAction({ login: user.login, password }),
              "Contraseña actualizada.",
              () => {
                setPassword("");
                setEditing(false);
              },
            );
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <Field label="Nueva contraseña (mínimo 8 caracteres)">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className={`${input} sm:w-72`}
            />
          </Field>
          <button
            type="submit"
            disabled={pending || password.length < 8}
            className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}
      <Message msg={msg} />
    </li>
  );
}

function NewUser() {
  const [f, setF] = useState({ login: "", nombre: "", rol: "operador" as UserRow["rol"], password: "" });
  const { pending, msg, run } = useSubmit();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createUserAction(f), `Usuario ${f.login} creado.`, () =>
          setF({ login: "", nombre: "", rol: "operador", password: "" }),
        );
      }}
      className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="font-medium">Nuevo usuario</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Usuario o email">
          <input
            value={f.login}
            onChange={(e) => setF({ ...f, login: e.target.value })}
            autoCapitalize="none"
            required
            className={input}
          />
        </Field>
        <Field label="Nombre (figura en los movimientos)">
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required className={input} />
        </Field>
        <Field label="Rol">
          <select
            value={f.rol}
            onChange={(e) => setF({ ...f, rol: e.target.value as UserRow["rol"] })}
            className={input}
          >
            <option value="operador">Operador</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Contraseña (mínimo 8 caracteres)">
          <input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            className={input}
          />
        </Field>
      </div>
      <Message msg={msg} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {pending ? "Creando…" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
