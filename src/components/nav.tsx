"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", admin: false },
  { href: "/stock", label: "Stock", admin: false },
  { href: "/importar", label: "Importar", admin: true },
  { href: "/usuarios", label: "Usuarios", admin: true },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links
        .filter((link) => isAdmin || !link.admin)
        .map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
                active
                  ? "bg-white font-medium text-brand"
                  : "text-white/85 hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
