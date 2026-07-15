import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QrCode } from "@/components/ui/qr-code";
import { EditProfile } from "./edit-profile";
import { LogOut, QrCode as QrIcon, MapPin } from "lucide-react";

export default async function PerfilPage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Próximas reservas com QR válido
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, class_sessions!inner(session_date, start_time, class_types(name)), qr_tokens(token, status)")
    .eq("profile_id", profile.id)
    .eq("status", "booked")
    .gte("class_sessions.session_date", today)
    .order("session_date", { referencedTable: "class_sessions", ascending: true });

  return (
    <div className="space-y-5">
      {/* Perfil */}
      <div className="card p-5 flex items-center gap-4 animate-fade-up">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-brand-500 grid place-items-center text-white text-xl font-semibold">
            {(profile.full_name ?? "A")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{(profile as any).username || profile.full_name}</p>
          <p className="text-sm text-[var(--muted)] truncate">{profile.email}</p>
          {(profile as any).location && (
            <p className="text-xs text-[var(--muted)] truncate flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {(profile as any).location}
            </p>
          )}
        </div>
        <EditProfile profile={profile} />
      </div>

      {/* QR de asistencia */}
      <section>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <QrIcon size={16} /> Meu QR de presença
        </h2>
        <p className="text-xs text-[var(--muted)] mb-3">
          Mostre este código ao chegar. O professor escaneia para registrar sua presença.
        </p>
        <div className="space-y-3">
          {(!bookings || bookings.length === 0) && (
            <div className="card p-6 text-center text-sm text-[var(--muted)]">
              Você não tem aulas reservadas.
            </div>
          )}
          {bookings?.map((b: any) => {
            const s = b.class_sessions;
            const token = b.qr_tokens?.[0]?.token;
            return (
              <div key={b.id} className="card p-5 flex flex-col items-center animate-fade-up">
                <p className="font-semibold">{s?.class_types?.name}</p>
                <p className="text-sm text-[var(--muted)] mb-4">
                  {format(parseISO(s.session_date), "EEEE d 'de' MMMM", { locale: ptBR })} · {s.start_time.slice(0, 5)} hs
                </p>
                {token
                  ? <QrCode value={token} />
                  : <p className="text-xs text-[var(--muted)]">QR indisponível</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sair */}
      <form action="/auth/signout" method="post">
        <button className="w-full card p-3.5 flex items-center justify-center gap-2 text-red-500 font-medium hover:bg-[var(--bg)] transition">
          <LogOut size={16} /> Sair
        </button>
      </form>
    </div>
  );
}
