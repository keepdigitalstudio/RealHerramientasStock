import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-brand px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-white">
        <Image src="/brand/isotipo-blanco.png" alt="" width={72} height={70} priority />
        <p className="mt-3 font-display text-5xl leading-none tracking-wide">REAL</p>
        <p className="text-xs font-semibold tracking-[0.35em]">HERRAMIENTAS</p>
        <p className="mt-2 font-display text-xl tracking-widest text-white/70">STOCK</p>
      </div>
      <LoginForm next={typeof next === "string" ? next : ""} />
    </main>
  );
}
