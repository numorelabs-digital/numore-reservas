"use client";
import { useMe, useOverview } from "@/lib/hooks";
import { StatCard } from "@/components/ui/stat-card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Ticket, CalendarClock, Star, Gift, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPage() {
  const { data: profile } = useMe();
  const { data: o } = useOverview(profile?.id);

  // Sin datos aún (primer render sin caché): esqueleto.
  if (!profile || !o) return <PageSkeleton />;

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
          <p className="text-sm text-[var(--muted)]">Olá de novo,</p>
          <h1 className="text-lg font-semibold leading-tight">{firstName} 👋</h1>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/tienda">
          <StatCard
            label="Aulas restantes" value={o.remaining} accent
            icon={<Ticket size={18} className="text-white/80" />}
            sub={o.remaining > 0 ? "Toque para comprar mais" : "Toque para comprar"}
          />
        </Link>
        <StatCard
          label="Pontos" value={o.points}
          icon={<Star size={18} className="text-brand-500" />}
          sub="Resgatáveis por produtos"
        />
        <StatCard
          label="Vencimento"
          value={o.nextExpiry ? format(parseISO(o.nextExpiry), "d MMM", { locale: ptBR }) : "—"}
          icon={<CalendarClock size={18} className="text-brand-500" />}
          sub={o.nextExpiry ? "do seu pacote" : "Sem pacote ativo"}
        />
        <Link href="/recompensas">
          <StatCard
            label="Recompensas" value={<span className="text-base">Ver loja</span>}
            icon={<Gift size={18} className="text-brand-500" />}
            sub="Troque seus pontos"
          />
        </Link>
      </div>

      {/* Próxima aula */}
      <section className="animate-fade-up">
        <h2 className="text-sm font-semibold mb-2">Próxima aula</h2>
        {o.nextBooking ? (
          <NextClassCard booking={o.nextBooking} />
        ) : (
          <Link href="/calendario" className="card p-5 flex items-center justify-between hover:border-brand-500 transition">
            <div>
              <p className="font-medium">Você não tem reservas próximas</p>
              <p className="text-sm text-[var(--muted)]">Reserve sua próxima aula</p>
            </div>
            <ArrowRight size={18} className="text-brand-500" />
          </Link>
        )}
      </section>

      {/* Historial */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Histórico recente</h2>
        <div className="card divide-y divide-[var(--border)]">
          {o.history.length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">Ainda não há atividade.</p>
          )}
          {o.history.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-medium">{b.class_sessions?.class_types?.name ?? "Aula"}</p>
                <p className="text-xs text-[var(--muted)]">
                  {b.class_sessions?.session_date
                    ? format(parseISO(b.class_sessions.session_date), "EEE d MMM", { locale: ptBR })
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
          {format(parseISO(s.session_date), "EEEE d 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="text-sm text-[var(--muted)]">{s.start_time?.slice(0, 5)} hs</p>
      </div>
      <span className="text-xs rounded-full bg-brand-50 text-brand-600 px-2.5 py-1 font-medium dark:bg-brand-500/10">
        Confirmada
      </span>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    booked: ["Reservada", "text-blue-600 bg-blue-50 dark:bg-blue-500/10"],
    attended: ["Presente", "text-green-600 bg-green-50 dark:bg-green-500/10"],
    cancelled: ["Cancelada", "text-[var(--muted)] bg-[var(--bg)]"],
    no_show: ["Ausente", "text-orange-600 bg-orange-50 dark:bg-orange-500/10"],
  };
  const [label, cls] = map[status] ?? [status, ""];
  return <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${cls}`}>{label}</span>;
}
