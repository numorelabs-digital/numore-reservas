"use server";
import { createClient } from "@/lib/supabase/server";
import { humanBookingError } from "@/lib/utils";
import { processNotifications } from "@/lib/notifications/push";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

// Envía las notificaciones encoladas sin bloquear la respuesta ante fallos.
async function flushNotifications() {
  try { await processNotifications(); } catch { /* el cron reintenta */ }
}

export async function bookSession(sessionId: string, purchaseId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_session", {
    p_session_id: sessionId,
    p_purchase_id: purchaseId,
  });
  if (error) return { ok: false, error: humanBookingError(error.message) };
  await flushNotifications();
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) return { ok: false, error: humanBookingError(error.message) };
  await flushNotifications();
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function rescheduleBooking(bookingId: string, newSessionId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_new_session_id: newSessionId,
  });
  if (error) return { ok: false, error: humanBookingError(error.message) };
  await flushNotifications();
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  return { ok: true };
}
