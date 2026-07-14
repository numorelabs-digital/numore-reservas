"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  modality: z.enum(["flexible", "fixed_days"]),
  classes_count: z.coerce.number().int().min(2, "Mínimo 2 clases.").max(24, "Máximo 24 clases."),
  price: z.coerce.number().min(0),
  validity_days: z.coerce.number().int().min(1).default(30),
});

export async function savePackage(id: string | null, form: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const payload = parsed.data;
  const { error } = id
    ? await supabase.from("packages").update(payload).eq("id", id)
    : await supabase.from("packages").insert(payload);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/paquetes");
  return { ok: true as const };
}

export async function togglePackage(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/paquetes");
  return { ok: true as const };
}

export async function deletePackage(id: string) {
  const supabase = await createClient();
  // Si tiene compras asociadas, se desactiva en vez de borrar (integridad).
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) {
    await supabase.from("packages").update({ is_active: false }).eq("id", id);
    return { ok: true as const, softDeleted: true };
  }
  revalidatePath("/admin/paquetes");
  return { ok: true as const };
}
