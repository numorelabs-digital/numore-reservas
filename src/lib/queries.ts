import { createClient } from "@/lib/supabase/server";

// Datos agregados para el dashboard del alumno.
export async function getStudentOverview(profileId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [purchases, points, nextBooking, recentBookings] = await Promise.all([
    // Compras activas + clases restantes
    supabase
      .from("purchase_remaining")
      .select("*")
      .eq("profile_id", profileId),
    // Balance de puntos
    supabase
      .from("points_balance")
      .select("balance")
      .eq("profile_id", profileId)
      .maybeSingle(),
    // Próxima clase reservada
    supabase
      .from("bookings")
      .select("id, status, class_sessions!inner(session_date, start_time, end_time, class_types(name, color))")
      .eq("profile_id", profileId)
      .eq("status", "booked")
      .gte("class_sessions.session_date", today)
      .order("session_date", { referencedTable: "class_sessions", ascending: true })
      .limit(1)
      .maybeSingle(),
    // Historial reciente
    supabase
      .from("bookings")
      .select("id, status, created_at, class_sessions(session_date, start_time, class_types(name))")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const remaining = (purchases.data ?? []).reduce(
    (acc, p: any) => acc + (p.remaining ?? 0), 0
  );
  const nextExpiry = (purchases.data ?? [])
    .map((p: any) => p.expires_at)
    .sort()[0] ?? null;

  return {
    remaining,
    nextExpiry,
    points: points.data?.balance ?? 0,
    nextBooking: nextBooking.data,
    history: recentBookings.data ?? [],
  };
}
