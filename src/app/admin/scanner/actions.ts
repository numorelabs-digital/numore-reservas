"use server";
import { createClient } from "@/lib/supabase/server";

const QR_ERRORS: Record<string, string> = {
  FORBIDDEN: "No tenés permisos.",
  QR_INVALID: "QR no válido.",
  QR_ALREADY_USED: "Este QR ya fue utilizado.",
  QR_EXPIRED: "El QR expiró.",
  QR_NOT_YET_VALID: "Todavía no es horario de esta clase.",
};

export async function checkinQr(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkin_qr", { p_token: token });
  if (error) {
    const code = Object.keys(QR_ERRORS).find((c) => error.message.includes(c));
    return { ok: false as const, error: code ? QR_ERRORS[code] : "Error al validar." };
  }
  // Traer nombre del alumno para mostrar confirmación
  const { data: profile } = await supabase
    .from("profiles").select("full_name, avatar_url")
    .eq("id", (data as any).profile_id).maybeSingle();

  return {
    ok: true as const,
    name: profile?.full_name ?? "Alumno",
    avatar: profile?.avatar_url ?? null,
    points: (data as any).points_added ?? 1,
  };
}
