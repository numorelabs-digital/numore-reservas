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

// Resumen del dashboard del aluno.
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

// Calendario: sesiones + vagas + reservas próprias + tickets.
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

// Pontos + recompensas.
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

// ===================== ADMIN =====================

export function useAdminOverview() {
  return useSWR("admin-overview", async () => {
    const supabase = createClient();
    const t = today();
    const [students, bookings, attend, upcoming] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
      supabase.from("bookings").select("id, class_sessions!inner(session_date)", { count: "exact", head: true })
        .eq("class_sessions.session_date", t).eq("status", "booked"),
      supabase.from("attendances").select("id", { count: "exact", head: true }).gte("checked_in_at", t + "T00:00:00"),
      supabase.from("bookings")
        .select("id, status, profiles(full_name), class_sessions!inner(session_date, start_time, class_types(name))")
        .gte("class_sessions.session_date", t).eq("status", "booked")
        .order("session_date", { referencedTable: "class_sessions", ascending: true }).limit(8),
    ]);
    return {
      students: students.count ?? 0, bookings: bookings.count ?? 0,
      attendances: attend.count ?? 0, upcoming: upcoming.data ?? [],
    };
  });
}

export function usePackages() {
  return useSWR("admin-packages", async () => {
    const supabase = createClient();
    const { data } = await supabase.from("packages").select("*").order("classes_count");
    return data ?? [];
  });
}

export function useRewardsAdmin() {
  return useSWR("admin-rewards", async () => {
    const supabase = createClient();
    const { data } = await supabase.from("rewards").select("*").order("points_cost");
    return data ?? [];
  });
}

export function useHorários() {
  return useSWR("admin-horarios", async () => {
    const supabase = createClient();
    const t = today();
    const [types, schedules, sessions, avail] = await Promise.all([
      supabase.from("class_types").select("*").order("name"),
      supabase.from("schedules").select("*, class_types(name, color)").order("weekday").order("start_time"),
      supabase.from("class_sessions")
        .select("id, session_date, start_time, end_time, capacity, status, class_types(name, color)")
        .gte("session_date", t).order("session_date").order("start_time").limit(60),
      supabase.from("session_availability").select("session_id, taken"),
    ]);
    const takenMap = Object.fromEntries((avail.data ?? []).map((a: any) => [a.session_id, a.taken]));
    return {
      classTypes: types.data ?? [],
      schedules: schedules.data ?? [],
      sessions: (sessions.data ?? []).map((s: any) => ({ ...s, taken: takenMap[s.id] ?? 0 })),
    };
  });
}

export function useStudents(q: string, estado: string) {
  return useSWR(["admin-students", q, estado], async () => {
    const supabase = createClient();
    let query = supabase.from("profiles")
      .select("id, full_name, username, location, email, avatar_url, is_active, created_at")
      .eq("role", "student").order("full_name");
    if (estado === "activos") query = query.eq("is_active", true);
    if (estado === "inactivos") query = query.eq("is_active", false);
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`);
    const { data } = await query.limit(100);
    return data ?? [];
  });
}

// Tienda: pacotes flexibles + tickets disponíveis.
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
