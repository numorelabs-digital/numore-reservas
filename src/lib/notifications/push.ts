import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { site } from "@/config/site";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Configura VAPID (claves generadas con `npm run gen:vapid`).
function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@gimnasio.com",
    pub, priv
  );
  return true;
}

type Notif = { id: string; event: string; payload: any };

// Envía una notificación push a todos los admins (uso directo, sin cola).
// La usa el webhook de pagos para avisar al instante que entró una compra.
export async function sendPushToAdmins(title: string, body: string, url = "/admin") {
  if (!configure()) return;
  const supabase = createAdminClient();
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  const adminIds = (admins ?? []).map((a: any) => a.id);
  if (!adminIds.length) return;
  const { data: subs } = await supabase
    .from("push_subscriptions").select("*").in("profile_id", adminIds);
  const msg = JSON.stringify({ title, body, url });
  await Promise.all((subs ?? []).map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }));
}

// Construye título + cuerpo legible a partir del evento y su payload enriquecido.
function render(event: string, p: any): { title: string; body: string } {
  const when = p.session_date
    ? `${format(parseISO(p.session_date), "EEE d MMM", { locale: es })} ${p.start_time?.slice(0, 5) ?? ""}`
    : "";
  const who = p.name || p.email || "Alumno";
  switch (event) {
    case "new_booking":   return { title: "🥊 Nueva reserva", body: `${who} — ${p.class ?? ""} ${when}` };
    case "reschedule":    return { title: "🔁 Cambio de horario", body: `${who} — nuevo: ${p.class ?? ""} ${when}` };
    case "cancellation":  return { title: "❌ Cancelación", body: `${who} canceló ${p.class ?? ""} ${when}` };
    case "new_user":      return { title: "👤 Nuevo alumno", body: `Se registró ${p.email ?? who}` };
    case "contact_request": return { title: "📩 Contacto", body: `${who}: ${p.message ?? ""}` };
    default:              return { title: site.name, body: "Tenés una novedad" };
  }
}

// Enrique el payload (ids → nombres/horarios) para un mensaje humano.
async function enrich(supabase: any, event: string, payload: any) {
  const out = { ...payload };
  if (payload.profile_id) {
    const { data } = await supabase.from("profiles")
      .select("full_name, email").eq("id", payload.profile_id).maybeSingle();
    out.name = data?.full_name; out.email = data?.email;
  }
  const sessionId = payload.session_id || payload.new_session;
  if (sessionId) {
    const { data } = await supabase.from("class_sessions")
      .select("session_date, start_time, class_types(name)").eq("id", sessionId).maybeSingle();
    if (data) { out.session_date = data.session_date; out.start_time = data.start_time; out.class = data.class_types?.name; }
  }
  return out;
}

// Drena la cola `notifications` (pending) y envía Web Push a los admins.
// Usa service-role (proceso server confiable).
export async function processNotifications(): Promise<{ processed: number }> {
  if (!configure()) return { processed: 0 };
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("notifications").select("id, event, payload").eq("status", "pending").limit(50);
  if (!pending?.length) return { processed: 0 };

  // Suscripciones de todos los admins
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  const adminIds = (admins ?? []).map((a: any) => a.id);
  const { data: subs } = await supabase
    .from("push_subscriptions").select("*").in("profile_id", adminIds);

  for (const n of pending as Notif[]) {
    try {
      const payload = await enrich(supabase, n.event, n.payload);
      const { title, body } = render(n.event, payload);
      const msg = JSON.stringify({ title, body, url: "/admin", tag: n.event });

      await Promise.all((subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            msg
          );
        } catch (err: any) {
          // Suscripción expirada/inválida → eliminar
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      }));

      await supabase.from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", n.id);
    } catch (err: any) {
      await supabase.from("notifications")
        .update({ status: "failed", error: String(err?.message ?? err) }).eq("id", n.id);
    }
  }
  return { processed: pending.length };
}
