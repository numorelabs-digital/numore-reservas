import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "./calendar-client";
import { addDays, format } from "date-fns";

export default async function CalendarioPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const today = format(new Date(), "yyyy-MM-dd");
  const until = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const [sessionsRes, availRes, purchasesRes, bookingsRes] = await Promise.all([
    supabase
      .from("class_sessions")
      .select("id, session_date, start_time, end_time, capacity, status, class_types(name, color)")
      .gte("session_date", today)
      .lte("session_date", until)
      .eq("status", "open")
      .order("session_date")
      .order("start_time"),
    supabase.from("session_availability").select("*"),
    supabase.from("purchase_remaining").select("*").eq("profile_id", profile.id),
    supabase
      .from("bookings")
      .select("id, session_id")
      .eq("profile_id", profile.id)
      .eq("status", "booked"),
  ]);

  // Créditos totales disponibles + primer paquete válido para reservar
  const purchases = (purchasesRes.data ?? []).filter((p: any) => p.remaining > 0);
  const activePurchase = purchases[0] ?? null;
  const totalRemaining = purchases.reduce((a: number, p: any) => a + p.remaining, 0);

  const availMap = Object.fromEntries(
    (availRes.data ?? []).map((a: any) => [a.session_id, a])
  );
  const bookedSet = new Set((bookingsRes.data ?? []).map((b: any) => b.session_id));

  const sessions = (sessionsRes.data ?? []).map((s: any) => ({
    ...s,
    className: s.class_types?.name,
    color: s.class_types?.color,
    available: availMap[s.id]?.available ?? s.capacity,
    is_full: availMap[s.id]?.is_full ?? false,
    booked: bookedSet.has(s.id),
  }));

  return (
    <CalendarClient
      sessions={sessions}
      purchaseId={activePurchase?.purchase_id ?? null}
      totalRemaining={totalRemaining}
    />
  );
}
