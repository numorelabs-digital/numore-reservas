import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Intercambia el código OAuth de Google por una sesión y vuelve a la app.
// Usa el host reenviado (x-forwarded-host) para funcionar bien detrás del
// dominio/proxy de Vercel (evita que se pierda la sesión y vuelva al login).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Base pública correcta (dominio real del usuario)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${base}/login?error=sem_codigo`);
}
