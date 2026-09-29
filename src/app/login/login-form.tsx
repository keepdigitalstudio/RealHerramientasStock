"use client";

import { useActionState } from "react";
import { Field, input } from "@/components/movement-dialog";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
      <input type="hidden" name="next" value={next} />
      <Field label="Usuario o email">
        <input
          name="login"
          defaultValue={state?.login}
          autoComplete="username"
          autoCapitalize="none"
          required
          autoFocus
          className={input}
        />
      </Field>
      <Field label="Contraseña">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
