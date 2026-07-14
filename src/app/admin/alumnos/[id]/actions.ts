"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";

// Asigna manualmente un paquete a un alumno (pago fuera de la app).
export async function assignPackage(input: {
  profileId: string;
  packageId: string;
  allowedWeekdays?: number[]; // solo fixed_days
}) {
  const supabase = await createClient();

  const { data: pkg, error: pErr } = await supabase
    .from("packages").select("*").eq("id", input.packageId).single();
  if (pErr || !pkg) return { ok: false as const, error: "Paquete no encontrado." };

  if (pkg.modality === "fixed_days" && (!input.allowedWeekdays || input.allowedWeekdays.length === 0)) {
    return { ok: false as const, error: "Elegí los días para el paquete de días fijos." };
  }

  const expires = addDays(new Date(), pkg.validity_days ?? 30).toISOString();

  const { error } = await supabase.from("package_purchases").insert({
    profile_id: input.profileId,
    package_id: pkg.id,
    modality: pkg.modality,
    classes_total: pkg.classes_count,
    allowed_weekdays: pkg.modality === "fixed_days" ? input.allowedWeekdays : null,
    expires_at: expires,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/alumnos/${input.profileId}`);
  return { ok: true as const };
}

export async function toggleStudentActive(profileId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", profileId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/alumnos/${profileId}`);
  return { ok: true as const };
}
