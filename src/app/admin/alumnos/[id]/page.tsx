import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AssignPackageForm } from "./assign-form";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function AlunoDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [profileRes, purchasesRes, pointsRes, packagesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("purchase_remaining").select("*").eq("profile_id", id),
    supabase.from("points_balance").select("balance").eq("profile_id", id).maybeSingle(),
    supabase.from("packages").select("*").eq("is_active", true).order("classes_count"),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-500 grid place-items-center text-white font-semibold">
          {(profile.full_name ?? "?")[0]}
        </div>
        <div>
          <h1 className="text-lg font-semibold">{profile.full_name}</h1>
          <p className="text-sm text-[var(--muted)]">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Aulas restantes</p>
          <p className="text-2xl font-semibold">
            {(purchasesRes.data ?? []).reduce((a: number, p: any) => a + p.remaining, 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--muted)]">Pontos</p>
          <p className="text-2xl font-semibold">{pointsRes.data?.balance ?? 0}</p>
        </div>
      </div>

      {/* Pacotes ativos */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Pacotes ativos</h2>
        <div className="card divide-y divide-[var(--border)]">
          {(purchasesRes.data ?? []).length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">Sem pacotes ativos.</p>
          )}
          {(purchasesRes.data ?? []).map((p: any) => (
            <div key={p.purchase_id} className="flex items-center justify-between p-3.5 text-sm">
              <span>{p.remaining} / {p.classes_total} clases</span>
              <span className="text-xs text-[var(--muted)]">
                vence {format(parseISO(p.expires_at), "d MMM", { locale: ptBR })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Atribuir pacote */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Atribuir pacote (pago manual)</h2>
        <AssignPackageForm profileId={id} packages={packagesRes.data ?? []} />
      </section>
    </div>
  );
}
