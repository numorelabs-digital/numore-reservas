"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().optional(),
  image_url: z.string().url("URL de imagen inválida.").optional().or(z.literal("")),
  points_cost: z.coerce.number().int().positive("Los puntos deben ser mayores a 0."),
  stock: z.coerce.number().int().min(0).optional(),
});

export async function saveReward(id: string | null, form: FormData) {
  const raw = Object.fromEntries(form);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const d = parsed.data;
  const payload = {
    name: d.name,
    description: d.description || null,
    image_url: d.image_url || null,
    points_cost: d.points_cost,
    stock: raw.stock === "" ? null : d.stock, // vacío = ilimitado
  };
  const { error } = id
    ? await supabase.from("rewards").update(payload).eq("id", id)
    : await supabase.from("rewards").insert(payload);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/recompensas");
  revalidatePath("/recompensas");
  return { ok: true as const };
}

export async function toggleReward(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("rewards").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/recompensas");
  revalidatePath("/recompensas");
  return { ok: true as const };
}

export async function deleteReward(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("rewards").delete().eq("id", id);
  if (error) {
    await supabase.from("rewards").update({ is_active: false }).eq("id", id);
    return { ok: true as const, softDeleted: true };
  }
  revalidatePath("/admin/recompensas");
  revalidatePath("/recompensas");
  return { ok: true as const };
}
