import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types/database";

// Devuelve el profile del usuario autenticado o redirige a /login.
export async function requireUser(): Promise<Profile> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).maybeSingle();

  // Auto-repara: si hay sesión válida pero falta el perfil, lo crea.
  // (Evita el bucle /dashboard ↔ /login cuando el trigger no corrió.)
  if (!profile) {
    const admin = createAdminClient();
    const { data: created } = await admin.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata as any)?.full_name ?? user.email?.split("@")[0] ?? null,
      avatar_url: (user.user_metadata as any)?.avatar_url ?? null,
    }, { onConflict: "id" }).select("*").single();
    profile = created ?? null;
  }

  if (!profile) redirect("/login");
  return profile as Profile;
}

// Exige rol admin.
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
