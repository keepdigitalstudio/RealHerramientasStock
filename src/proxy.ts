import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

// Control rápido en cada pedido (solo lee la cookie firmada). La verificación real de
// permisos se repite en cada página y acción que toca datos.

const PUBLIC = ["/login"];
const ADMIN_ONLY = [/^\/importar/, /^\/usuarios/, /^\/stock\/nuevo$/, /^\/stock\/[^/]+\/editar$/];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC.includes(pathname)) {
    return session ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (session.rol !== "admin" && ADMIN_ONLY.some((r) => r.test(pathname))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|apple-icon.png|brand/).*)"],
};
