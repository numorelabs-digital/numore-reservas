import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

// Refresca la sesión en cada request y aplica guardas de ruta.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  // Si falta configuración, no crashea el middleware: deja pasar y que la
  // página muestre el estado real (evita 500 MIDDLEWARE_INVOCATION_FAILED).
  if (!supabaseUrl || !supabaseKey) return NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: any }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() lee la sesión local (rápido) y refresca el token si hace falta.
  // Solo se usa para decidir el redirect (UX). La seguridad de los datos la
  // garantizan RLS + requireUser()/requireAdmin() dentro de cada página.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login" || path.startsWith("/auth");
  const isPublic =
    path === "/" ||
    isAuthRoute ||
    path.startsWith("/manifest") ||
    path.startsWith("/api"); // las rutas de API manejan su propia autorización

  // Sin sesión y ruta protegida → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión y en login → al dashboard
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // El rol admin lo valida el layout de /admin (requireAdmin), evitando
  // una consulta extra en cada navegación aquí.

  return response;
}
