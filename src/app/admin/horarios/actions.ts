"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, format } from "date-fns";

// ---- Tipos de aula --------------------------------------------------------
export async function saveClassType(id: string | null, name: string, color: string) {
  if (!name.trim()) return { ok: false as const, error: "El nombre es obligatorio." };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("class_types").update({ name, color }).eq("id", id)
    : await supabase.from("class_types").insert({ name, color });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/horarios");
  return { ok: true as const };
}

// ---- Horários recurrentes --------------------------------------------------
const scheduleSchema = z.object({
  class_type_id: z.string().uuid("Escolha um tipo de aula."),
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: z.string().min(4),
  end_time: z.string().min(4),
  capacity: z.coerce.number().int().min(1, "Capacidade mínima 1.").max(200),
});

export async function saveSchedule(id: string | null, form: FormData) {
  const parsed = scheduleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  if (parsed.data.end_time <= parsed.data.start_time)
    return { ok: false as const, error: "La hora de fin debe ser mayor a la de inicio." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("schedules").update(parsed.data).eq("id", id)
    : await supabase.from("schedules").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/horarios");
  return { ok: true as const };
}

export async function toggleSchedule(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("schedules").update({ is_active: active }).eq("id", id);
  revalidatePath("/admin/horarios");
  return { ok: true as const };
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  await supabase.from("schedules").delete().eq("id", id);
  revalidatePath("/admin/horarios");
  return { ok: true as const };
}

// ---- Gerar sessões concretas desde los horários activos -----------------
export async function generateSessions(days = 21) {
  const supabase = await createClient();
  const { data: schedules } = await supabase
    .from("schedules").select("*").eq("is_active", true);
  if (!schedules?.length) return { ok: false as const, error: "Não há horários ativos." };

  const rows: any[] = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(new Date(), i);
    const dow = d.getDay(); // 0=domingo
    for (const s of schedules) {
      if (s.weekday === dow) {
        rows.push({
          schedule_id: s.id,
          class_type_id: s.class_type_id,
          session_date: format(d, "yyyy-MM-dd"),
          start_time: s.start_time,
          end_time: s.end_time,
          capacity: s.capacity,
        });
      }
    }
  }
  // Ignora duplicados (schedule_id + session_date es único)
  const { error } = await supabase
    .from("class_sessions")
    .upsert(rows, { onConflict: "schedule_id,session_date", ignoreDuplicates: true });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/horarios");
  return { ok: true as const, count: rows.length };
}

// ---- Sessões puntuales: bloquear / habilitar / cambiar capacidad ----------
export async function updateSession(id: string, patch: { status?: string; capacity?: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/horarios");
  return { ok: true as const };
}
