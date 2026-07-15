"use client";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { addDays, format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

// Perfil del usuario actual (id, nombre, foto, rol…).
export function useMe() {
  return useSWR("me", async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return data;
  });
}

// Resumen del dashboard del alumno.
export function useOverview(profileId?: string) {
  return useSWR(profileId ? ["overview", profileId] : null, async () => {
    const supabase = createClient();
    const [purchases, points, nextBooking, recent] = await Promise.all([
      supabase.from("purchase_remaining").select("*").eq("profile_id", profileId),
      supabase.from("points_balance").select("balance").eq("profile_id", profileId).maybeSingle(),
      supabase.from("bookings")
        .select("id, status, class_sessions!inner(session_date, start_time, end_time, class_types(name, color))")
        .eq("profile_id", profileId).eq("status", "booked")
        .gte("class_sessions.session_date", today())
        .order("session_date", { referencedTable: "class_sessions", ascending: true }).limit(1).maybeSingle(),
      supabase.from("bookings")
        .select("id, status, created_at, class_sessions(session_date, start_time, class_types(name))")
        .eq("profile_id", profileId).order("created_at", { ascending: false }).limit(10),
    ]);
    const remaining = (purchases.data ?? []).reduce((a: number, p: any) => a + (p.remaining ?? 0), 0);
    const nextExpiry = (purchases.data ?? []).map((p: any) => p.expires_at).sort()[0] ?? null;
    return {
      remaining, nextExpiry,
      points: points.data?.balance ?? 0,
      nextBooking: nextBooking.data,
      history: recent.data ?? [],
    };
  });
}

// Calendario: sesiones + cupos + reservas propias + tickets.
export function useCalendar(profileId?: string) {
  return useSWR(profileId ? ["calendar", profileId] : null, async () => {
    const supabase = createClient();
    const from = today();
    const until = format(addDays(new Date(), 14), "yyyy-MM-dd");
    const [sessionsRes, availRes, purchasesRes, bookingsRes] = await Promise.all([
      supabase.from("class_sessions")
        .select("id, session_date, start_time, end_time, capacity, status, class_types(name, color)")
        .gte("session_date", from).lte("session_date", until).eq("status", "open")
        .order("session_date").order("start_time"),
      supabase.from("session_availability").select("*"),
      supabase.from("purchase_remaining").select("*").eq("profile_id", profileId),
      supabase.from("bookings").select("id, session_id").eq("profile_id", profileId).eq("status", "booked"),
    ]);
    const purchases = (purchasesRes.data ?? []).filter((p: any) => p.remaining > 0);
    const availMap = Object.fromEntries((availRes.data ?? []).map((a: any) => [a.session_id, a]));
    const bookedSet = new Set((bookingsRes.data ?? []).map((b: any) => b.session_id));
    const sessions = (sessionsRes.data ?? []).map((s: any) => ({
      ...s, className: s.class_types?.name, color: s.class_types?.color,
      available: availMap[s.id]?.available ?? s.capacity,
      is_full: availMap[s.id]?.is_full ?? false,
      booked: bookedSet.has(s.id),
    }));
    return {
      sessions,
      purchaseId: purchases[0]?.purchase_id ?? null,
      totalRemaining: purchases.reduce((a: number, p: any) => a + p.remaining, 0),
    };
  });
}

// Puntos + recompensas.
export function useRewards(profileId?: string) {
  return useSWR(profileId ? ["rewards", profileId] : null, async () => {
    const supabase = createClient();
    const [pointsRes, rewardsRes] = await Promise.all([
      supabase.from("points_balance").select("balance").eq("profile_id", profileId).maybeSingle(),
      supabase.from("rewards").select("*").eq("is_active", true).order("points_cost"),
    ]);
    return { balance: pointsRes.data?.balance ?? 0, rewards: rewardsRes.data ?? [] };
  });
}

// Tienda: paquetes flexibles + tickets disponibles.
export function useStore(profileId?: string) {
  return useSWR(profileId ? ["store", profileId] : null, async () => {
    const supabase = createClient();
    const [packagesRes, purchasesRes] = await Promise.all([
      supabase.from("packages").select("*").eq("is_active", true).eq("modality", "flexible").order("classes_count"),
      supabase.from("purchase_remaining").select("remaining").eq("profile_id", profileId),
    ]);
    const remaining = (purchasesRes.data ?? []).reduce((a: number, p: any) => a + (p.remaining ?? 0), 0);
    return { packages: packagesRes.data ?? [], remaining };
  });
}
