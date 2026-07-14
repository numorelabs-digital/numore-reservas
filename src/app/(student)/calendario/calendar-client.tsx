"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bookSession, cancelBooking, rescheduleBooking } from "./actions";
import { addDays, format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Check, Loader2, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Session = {
  id: string; session_date: string; start_time: string; end_time: string;
  capacity: number; className: string; color: string;
  available: number; is_full: boolean; booked: boolean;
};

export function CalendarClient({
  sessions, purchaseId, totalRemaining,
}: {
  sessions: Session[]; purchaseId: string | null; totalRemaining: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Date());
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Modo "cambiar horario": guarda el bookingId que se está moviendo.
  const [rescheduling, setRescheduling] = useState<{ bookingId: string; sessionId: string } | null>(null);

  // Realtime: cualquier cambio en reservas refresca los cupos.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("bookings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)),
    []
  );

  const daySessions = sessions.filter((s) =>
    isSameDay(parseISO(s.session_date), selected)
  );

  async function resolveBookingId(sessionId: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings").select("id")
      .eq("session_id", sessionId).eq("status", "booked").maybeSingle();
    return data?.id ?? null;
  }

  function handleBook(s: Session) {
    // Si estamos cambiando de horario, este tap confirma el nuevo horario.
    if (rescheduling) {
      setBusyId(s.id);
      startTransition(async () => {
        const res = await rescheduleBooking(rescheduling.bookingId, s.id);
        setBusyId(null); setRescheduling(null);
        if (res.ok) { toast.success("¡Horario cambiado!"); router.refresh(); }
        else toast.error(res.error);
      });
      return;
    }
    if (!purchaseId) {
      toast.error("No tenés clases disponibles. Pedí un paquete en recepción.");
      return;
    }
    setBusyId(s.id);
    startTransition(async () => {
      const res = await bookSession(s.id, purchaseId);
      setBusyId(null);
      if (res.ok) { toast.success("¡Reserva confirmada!"); router.refresh(); }
      else toast.error(res.error);
    });
  }

  function handleCancel(s: Session) {
    setBusyId(s.id);
    startTransition(async () => {
      const id = await resolveBookingId(s.id);
      if (!id) { setBusyId(null); return; }
      const res = await cancelBooking(id);
      setBusyId(null);
      if (res.ok) { toast.success("Reserva cancelada"); router.refresh(); }
      else toast.error(res.error);
    });
  }

  function handleStartReschedule(s: Session) {
    setBusyId(s.id);
    startTransition(async () => {
      const id = await resolveBookingId(s.id);
      setBusyId(null);
      if (!id) { toast.error("No se encontró la reserva."); return; }
      setRescheduling({ bookingId: id, sessionId: s.id });
      toast.info("Elegí el nuevo horario disponible");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reservar clase</h1>
        <span className="text-xs rounded-full bg-brand-50 text-brand-600 px-2.5 py-1 font-medium dark:bg-brand-500/10">
          {totalRemaining} clases restantes
        </span>
      </div>

      {/* Banner modo cambio de horario */}
      {rescheduling && (
        <div className="card p-3 flex items-center justify-between bg-brand-50 border-brand-500/30 dark:bg-brand-500/10 animate-fade-up">
          <p className="text-sm text-brand-600 font-medium flex items-center gap-1.5">
            <Repeat size={15} /> Elegí el nuevo horario
          </p>
          <button onClick={() => setRescheduling(null)}
            className="text-xs text-[var(--muted)] flex items-center gap-1 hover:text-[var(--text)]">
            <X size={14} /> Cancelar
          </button>
        </div>
      )}

      {/* Selector de días */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {days.map((d) => {
          const active = isSameDay(d, selected);
          const count = sessions.filter((s) => isSameDay(parseISO(s.session_date), d)).length;
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelected(d)}
              className={cn(
                "shrink-0 w-14 rounded-xl border py-2 text-center transition",
                active
                  ? "bg-brand-500 text-white border-transparent"
                  : "border-[var(--border)] hover:bg-[var(--bg)]"
              )}
            >
              <div className="text-[10px] uppercase opacity-70">
                {format(d, "EEE", { locale: es })}
              </div>
              <div className="text-lg font-semibold leading-none mt-0.5">{format(d, "d")}</div>
              <div className={cn("text-[10px] mt-1", active ? "text-white/70" : "text-[var(--muted)]")}>
                {count > 0 ? `${count} clases` : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sesiones del día */}
      <div className="space-y-3">
        {daySessions.length === 0 && (
          <div className="card p-6 text-center text-sm text-[var(--muted)]">
            No hay clases este día.
          </div>
        )}
        {daySessions.map((s) => (
          <SessionRow
            key={s.id}
            s={s}
            busy={pending && busyId === s.id}
            rescheduleMode={!!rescheduling}
            isBeingMoved={rescheduling?.sessionId === s.id}
            onBook={() => handleBook(s)}
            onCancel={() => handleCancel(s)}
            onReschedule={() => handleStartReschedule(s)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  s, busy, rescheduleMode, isBeingMoved, onBook, onCancel, onReschedule,
}: {
  s: Session; busy: boolean; rescheduleMode: boolean; isBeingMoved: boolean;
  onBook: () => void; onCancel: () => void; onReschedule: () => void;
}) {
  return (
    <div className={cn("card p-4 flex items-center justify-between animate-fade-up",
      isBeingMoved && "opacity-50")}>
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-10 rounded-full" style={{ background: s.color }} />
        <div>
          <p className="font-semibold">{s.className}</p>
          <p className="text-sm text-[var(--muted)]">
            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} hs
          </p>
          <p className={cn(
            "text-xs mt-0.5 flex items-center gap-1",
            s.is_full ? "text-red-500" : "text-[var(--muted)]"
          )}>
            <Users size={12} />
            {s.is_full ? "Completo" : `${s.available} de ${s.capacity} cupos`}
          </p>
        </div>
      </div>

      {/* En modo cambio: las sesiones libres muestran "Mover acá"; la actual queda marcada */}
      {rescheduleMode ? (
        isBeingMoved ? (
          <span className="text-xs font-medium text-[var(--muted)] px-3 py-2">Actual</span>
        ) : s.is_full || s.booked ? (
          <span className="text-xs font-medium text-[var(--muted)] px-3 py-2">
            {s.booked ? "Reservada" : "Completo"}
          </span>
        ) : (
          <button onClick={onBook} disabled={busy}
            className="text-sm font-medium rounded-lg bg-brand-500 text-white px-4 py-2 hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5">
            {busy && <Loader2 size={14} className="animate-spin" />} Mover acá
          </button>
        )
      ) : s.booked ? (
        <div className="flex items-center gap-2">
          <button onClick={onReschedule} disabled={busy}
            className="text-xs font-medium rounded-lg border border-[var(--border)] px-2.5 py-2 hover:bg-[var(--bg)] disabled:opacity-50 flex items-center gap-1">
            <Repeat size={13} /> Cambiar
          </button>
          <button onClick={onCancel} disabled={busy}
            className="text-xs font-medium rounded-lg border border-[var(--border)] px-2.5 py-2 hover:bg-[var(--bg)] disabled:opacity-50 flex items-center gap-1">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="text-green-500" />}
            OK
          </button>
        </div>
      ) : s.is_full ? (
        <span className="text-xs font-medium text-[var(--muted)] px-3 py-2">Completo</span>
      ) : (
        <button onClick={onBook} disabled={busy}
          className="text-sm font-medium rounded-lg bg-brand-500 text-white px-4 py-2 hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5">
          {busy && <Loader2 size={14} className="animate-spin" />} Reservar
        </button>
      )}
    </div>
  );
}
