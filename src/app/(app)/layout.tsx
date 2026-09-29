import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
          <Nav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
