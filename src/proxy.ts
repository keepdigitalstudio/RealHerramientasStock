import { NextResponse, type NextRequest } from "next/server";

// Protección TEMPORAL con usuario y contraseña (Basic Auth) hasta que exista el login
// propio (etapa 5). En Vercel, si faltan las variables, el sitio queda bloqueado en vez
// de abierto. En local, sin variables, no pide nada.
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    if (process.env.VERCEL) {
      return new NextResponse("Falta configurar BASIC_AUTH_USER y BASIC_AUTH_PASSWORD.", {
        status: 503,
      });
    }
    return NextResponse.next();
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, ...rest] = atob(encoded).split(":");
    if (u === user && rest.join(":") === password) return NextResponse.next();
  }

  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Real Herramientas Stock", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
