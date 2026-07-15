"use client";
import { useAdminOverview } from "@/lib/hooks";
import { StatCard } from "@/components/ui/stat-card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, UserCheck, Star } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminHome() {
  const { data } = useAdminOverview();
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-semibold">Resumen</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Alumnos activos" value={data.students} icon={<Users size={18} className="text-brand-500" />} />
        <StatCard label="Reservas hoy" value={data.bookings} icon={<CalendarCheck size={18} className="text-brand-500" />} />
        <StatCard label="Asistencias hoy" value={data.attendances} icon={<UserCheck size={18} className="text-brand-500" />} />
        <Link href="/admin/scanner">
          <StatCard label="Escanear QR" value={<span className="text-base">Abrir →</span>} accent icon={<Star size={18} className="text-white/80" />} />
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-2">Próximas reservas</h2>
        <div className="card divide-y divide-[var(--border)]">
          {data.upcoming.length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">Sin reservas próximas.</p>
          )}
          {data.upcoming.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-medium">{b.profiles?.full_name}</p>
                <p className="text-xs text-[var(--muted)]">{b.class_sessions?.class_types?.name}</p>
              </div>
              <p className="text-xs text-[var(--muted)] text-right">
                {format(parseISO(b.class_sessions.session_date), "d MMM", { locale: es })}<br />
                {b.class_sessions.start_time.slice(0, 5)} hs
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
