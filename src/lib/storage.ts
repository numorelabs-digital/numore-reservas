import { createAdminClient } from "@/lib/supabase/server";

// Sube un archivo a un bucket público y devuelve su URL. Usa service-role
// (proceso server confiable), así no hacen falta políticas de storage.
export async function uploadPublicFile(
  bucket: "avatars" | "rewards",
  file: File,
  folder: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Archivo vacío." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "La imagen supera los 5 MB." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "El archivo no es una imagen." };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
