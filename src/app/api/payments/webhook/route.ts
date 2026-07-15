import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPayment } from "@/lib/mercadopago";
import { sendPushToAdmins } from "@/lib/notifications/push";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

// Mercado Pago llama a esta ruta cuando cambia el estado de un pago.
// Si el pago fue aprobado, acredita el paquete (tickets) al alumno.
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let mpId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
    if (!mpId) {
      const body = await request.json().catch(() => ({}));
      mpId = body?.data?.id ? String(body.data.id) : "";
    }
    if (!mpId) return NextResponse.json({ ignored: true });

    // Estado real del pago según Mercado Pago
    const mp = await getPayment(mpId);
    if (mp.status !== "approved") return NextResponse.json({ ok: true, status: mp.status });

    const admin = createAdminClient();

    // Ubicar nuestra fila de pago (por referencia externa o por mp_payment_id)
    const ref = mp.external_reference;
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .or(`id.eq.${ref},mp_payment_id.eq.${mpId}`)
      .maybeSingle();
    if (!payment) return NextResponse.json({ ok: true, note: "payment row no encontrada" });

    // Idempotencia: si ya se acreditó, no repetir
    if (payment.status === "approved" && payment.purchase_id) {
      return NextResponse.json({ ok: true, already: true });
    }

    const { data: pkg } = await admin
      .from("packages").select("*").eq("id", payment.package_id).single();
    if (!pkg) return NextResponse.json({ ok: false });

    // Crear la compra (acreditar tickets)
    const expires = addDays(new Date(), pkg.validity_days ?? 30).toISOString();
    const { data: purchase } = await admin.from("package_purchases").insert({
      profile_id: payment.profile_id,
      package_id: pkg.id,
      modality: pkg.modality,
      classes_total: pkg.classes_count,
      allowed_weekdays: pkg.modality === "fixed_days" ? [] : null,
      expires_at: expires,
    }).select("id").single();

    await admin.from("payments").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      purchase_id: purchase?.id ?? null,
      mp_payment_id: String(mpId),
    }).eq("id", payment.id);

    // Avisar al admin (push)
    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", payment.profile_id).maybeSingle();
    await sendPushToAdmins(
      "💰 Nueva compra",
      `${profile?.full_name ?? "Alumno"} compró ${pkg.name} ($${pkg.price})`,
      "/admin"
    );

    return NextResponse.json({ ok: true, credited: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 200 });
  }
}

// Mercado Pago a veces valida el endpoint con GET.
export async function GET() {
  return NextResponse.json({ ok: true });
}
