import { requirePageAdmin } from "@/lib/auth/session";
import { readUsers } from "@/lib/auth/users";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await requirePageAdmin();
  const users = (await readUsers()).map(({ login, nombre, rol, activo }) => ({ login, nombre, rol, activo }));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="page-title">Usuarios</h1>
        <p className="mt-1 text-sm text-neutral-600">
          <b>Admin</b>: todo, incluido importar, dar de alta y editar productos, gestionar usuarios y
          dejar stock negativo. <b>Operador</b>: registrar y anular movimientos, ver y exportar.
        </p>
      </div>
      <UsersManager users={users} me={session.login} />
    </section>
  );
}
