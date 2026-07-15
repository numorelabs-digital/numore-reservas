"use server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createPixPayment } from "@/lib/mercadopago";
import { headers } from "next/headers";

async function siteUrl() {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host");
  return `https://${host}`;
}

// Crea un pago PIX de Mercado Pago para el pacote elegido.
export async function createPayment(packageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles").select("email, full_name").eq("id", user.id).single();
  const { data: pkg } = await supabase
    .from("packages").select("*").eq("id", packageId).eq("is_active", true).single();
  if (!pkg) return { ok: false as const, error: "Pacote no disponible." };

  // 1) Fila de pago pendiente (RLS: el aluno puede insertar la suya)
  const { data: payment, error: insErr } = await supabase
    .from("payments")
    .insert({ profile_id: user.id, package_id: pkg.id, amount: pkg.price, status: "pending" })
    .select("id").single();
  if (insErr || !payment) return { ok: false as const, error: "Não foi possível iniciar o pagamento." };

  // 2) Crear el pago PIX en Mercado Pago
  try {
    const base = await siteUrl();
    const pix = await createPixPayment({
      amount: Number(pkg.price),
      description: `${pkg.name} — ${pkg.classes_count} clase(s)`,
      payerEmail: profile?.email ?? user.email ?? "sin-email@test.com",
      payerName: profile?.full_name ?? "Aluno",
      reference: payment.id,
      notificationUrl: `${base}/api/payments/webhook`,
    });

    // 3) Salvar datos del QR (service-role: actualiza sin restricción de RLS)
    const admin = createAdminClient();
    await admin.from("payments").update({
      mp_payment_id: String(pix.id),
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
    }).eq("id", payment.id);

    return {
      ok: true as const,
      paymentId: payment.id,
      qrCode: pix.qr_code,
      qrCodeBase64: pix.qr_code_base64,
      amount: Number(pkg.price),
    };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "Error al generar el pago." };
  }
}

// El aluno consulta si su pago ya fue acreditado (para actualizar la pantalla).
export async function getPaymentStatus(paymentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments").select("status").eq("id", paymentId).maybeSingle();
  return data?.status ?? "pending";
}
