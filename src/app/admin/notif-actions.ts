"use server";
import { createClient } from "@/lib/supabase/server";

// Guarda (o actualiza) la suscripción Web Push del admin actual.
export async function savePushSubscription(sub: {
  endpoint: string; p256dh: string; auth: string; userAgent?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "No autenticado." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true as const };
}
