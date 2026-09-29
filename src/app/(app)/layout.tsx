import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { logout } from "@/app/login/actions";
import { requirePageSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();

  return (
    <>
      <header className="sticky top-0 z-10 bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Real Herramientas Stock">
              <Image src="/brand/isotipo-blanco.png" alt="" width={34} height={33} priority />
              <span className="leading-none">
                <span className="block font-display text-2xl tracking-wide">REAL</span>
                <span className="block text-[9px] font-semibold tracking-[0.3em]">HERRAMIENTAS</span>
              </span>
              <span className="ml-1 border-l border-white/30 pl-2.5 font-display text-xl tracking-wide text-white/80">
                STOCK
              </span>
            </Link>
            <UserMenu nombre={session.nombre} rol={session.rol} className="flex sm:hidden" />
          </div>
          <div className="flex items-center gap-3">
            <Nav isAdmin={session.rol === "admin"} />
            <UserMenu nombre={session.nombre} rol={session.rol} className="hidden sm:flex" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}

function UserMenu({ nombre, rol, className }: { nombre: string; rol: string; className: string }) {
  return (
    <form action={logout} className={`items-center gap-2 text-xs ${className}`}>
      <span className="text-right leading-tight text-white/85">
        {nombre}
        <span className="block text-[10px] uppercase tracking-wider text-white/60">{rol}</span>
      </span>
      <button
        type="submit"
        className="rounded-md border border-white/30 px-2 py-1 text-white/90 hover:bg-white/10"
      >
        Salir
      </button>
    </form>
  );
}
