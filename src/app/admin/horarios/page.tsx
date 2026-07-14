import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HorariosManager } from "./horarios-manager";
import { format } from "date-fns";

export default async function HorariosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [typesRes, schedulesRes, sessionsRes, availRes] = await Promise.all([
    supabase.from("class_types").select("*").order("name"),
    supabase.from("schedules").select("*, class_types(name, color)").order("weekday").order("start_time"),
    supabase.from("class_sessions")
      .select("id, session_date, start_time, end_time, capacity, status, class_types(name, color)")
      .gte("session_date", today).order("session_date").order("start_time").limit(60),
    supabase.from("session_availability").select("session_id, taken"),
  ]);

  const takenMap = Object.fromEntries((availRes.data ?? []).map((a: any) => [a.session_id, a.taken]));
  const sessions = (sessionsRes.data ?? []).map((s: any) => ({ ...s, taken: takenMap[s.id] ?? 0 }));

  return (
    <HorariosManager
      classTypes={typesRes.data ?? []}
      schedules={schedulesRes.data ?? []}
      sessions={sessions}
    />
  );
}
