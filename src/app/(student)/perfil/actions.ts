"use server";
import { createClient } from "@/lib/supabase/server";
import { uploadPublicFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

// Actualiza el perfil del aluno: nombre de usuario, ubicación, CEP y foto.
export async function updateProfile(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado." };

  const patch: Record<string, any> = {
    username: (form.get("username") as string)?.trim() || null,
    location: (form.get("location") as string)?.trim() || null,
    cep: (form.get("cep") as string)?.trim() || null,
  };

  // Foto de perfil (opcional)
  const avatar = form.get("avatar") as File | null;
  if (avatar && avatar.size > 0) {
    const up = await uploadPublicFile("avatars", avatar, user.id);
    if (!up.ok) return { ok: false as const, error: up.error };
    patch.avatar_url = up.url;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/perfil");
  return { ok: true as const };
}
