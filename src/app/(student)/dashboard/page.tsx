import { requireUser } from "@/lib/auth";
import { getStudentOverview } from "@/lib/queries";
import { StatCard } from "@/components/ui/stat-card";
import { Ticket, CalendarClock, Star, Gift, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const profile = await requireUser();
  const o = await getStudentOverview(profile.id);
  const firstName = profile.full_name?.split(" ")[0] ?? "Atleta";

  return (
    <div className="space-y-5">
      {/* Encabezado de perfil */}
      <div className="flex items-center gap-3 animate-fade-up">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={48} height={48} className="rounded-full" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-brand-500 grid place-items-center text-white font-semibold">
            {firstName[0]}
          </div>
        )}
        <div>
          <p className="text-sm text-[var(--muted)]">Hola de nuevo,</p>
          <h1 className="text-lg font-semibold leading-tight">{firstName} 👋</h1>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/tienda">
          <StatCard
            label="Clases restantes" value={o.remaining} accent
            icon={<Ticket size={18} className="text-white/80" />}
            sub={o.remaining > 0 ? "Tocá para comprar más" : "Tocá para comprar"}
          />
        </Link>
        <StatCard
          label="Puntos" value={o.points}
          icon={<Star size={18} className="text-brand-500" />}
          sub="Canjeables por productos"
        />
        <StatCard
          label="Vencimiento"
          value={o.nextExpiry ? format(parseISO(o.nextExpiry), "d MMM", { locale: es }) : "—"}
          icon={<CalendarClock size={18} className="text-brand-500" />}
          sub={o.nextExpiry ? "de tu paquete" : "Sin paquete activo"}
        />
        <Link href="/recompensas">
          <StatCard
            label="Recompensas" value={<span className="text-base">Ver tienda</span>}
            icon={<Gift size={18} className="text-brand-500" />}
            sub="Canjeá tus puntos"
          />
        </Link>
      </div>

      {/* Próxima clase */}
      <section className="animate-fade-up">
        <h2 className="text-sm font-semibold mb-2">Próxima clase</h2>
        {o.nextBooking ? (
          <NextClassCard booking={o.nextBooking} />
        ) : (
          <Link href="/calendario" className="card p-5 flex items-center justify-between hover:border-brand-500 transition">
            <div>
              <p className="font-medium">No tenés reservas próximas</p>
              <p className="text-sm text-[var(--muted)]">Reservá tu próxima clase</p>
            </div>
            <ArrowRight size={18} className="text-brand-500" />
          </Link>
        )}
      </section>

      {/* Historial */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Historial reciente</h2>
        <div className="card divide-y divide-[var(--border)]">
          {o.history.length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">Todavía no hay actividad.</p>
          )}
          {o.history.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-medium">{b.class_sessions?.class_types?.name ?? "Clase"}</p>
                <p className="text-xs text-[var(--muted)]">
                  {b.class_sessions?.session_date
                    ? format(parseISO(b.class_sessions.session_date), "EEE d MMM", { locale: es })
                    : ""}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function NextClassCard({ booking }: { booking: any }) {
  const s = booking.class_sessions;
  return (
    <Link href="/calendario" className="card p-5 flex items-center justify-between hover:border-brand-500 transition">
      <div>
        <p className="text-xs text-brand-500 font-medium">{s?.class_types?.name}</p>
        <p className="font-semibold mt-0.5">
          {format(parseISO(s.session_date), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <p className="text-sm text-[var(--muted)]">{s.start_time?.slice(0, 5)} hs</p>
      </div>
      <div className="text-right">
        <span className="text-xs rounded-full bg-brand-50 text-brand-600 px-2.5 py-1 font-medium dark:bg-brand-500/10">
          Confirmada
        </span>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    booked: ["Reservada", "text-blue-600 bg-blue-50 dark:bg-blue-500/10"],
    attended: ["Asististe", "text-green-600 bg-green-50 dark:bg-green-500/10"],
    cancelled: ["Cancelada", "text-[var(--muted)] bg-[var(--bg)]"],
    no_show: ["Ausente", "text-orange-600 bg-orange-50 dark:bg-orange-500/10"],
  };
  const [label, cls] = map[status] ?? [status, ""];
  return <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${cls}`}>{label}</span>;
}
