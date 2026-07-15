"use server";
import { createClient } from "@/lib/supabase/server";

const QR_ERRORS: Record<string, string> = {
  FORBIDDEN: "Você não tem permissão.",
  QR_INVALID: "QR inválido.",
  QR_ALREADY_USED: "Este QR já foi utilizado.",
  QR_EXPIRED: "O QR expirou.",
  QR_NOT_YET_VALID: "Ainda não é horário desta aula.",
};

export async function checkinQr(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkin_qr", { p_token: token });
  if (error) {
    const code = Object.keys(QR_ERRORS).find((c) => error.message.includes(c));
    return { ok: false as const, error: code ? QR_ERRORS[code] : "Error al validar." };
  }
  // Traer nombre del aluno para mostrar confirmación
  const { data: profile } = await supabase
    .from("profiles").select("full_name, avatar_url")
    .eq("id", (data as any).profile_id).maybeSingle();

  return {
    ok: true as const,
    name: profile?.full_name ?? "Aluno",
    avatar: profile?.avatar_url ?? null,
    points: (data as any).points_added ?? 1,
  };
}
