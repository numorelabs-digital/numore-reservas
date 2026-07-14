import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RewardCard } from "./reward-card";
import { Star } from "lucide-react";

export default async function RecompensasPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [pointsRes, rewardsRes] = await Promise.all([
    supabase.from("points_balance").select("balance").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("rewards").select("*").eq("is_active", true).order("points_cost"),
  ]);

  const balance = pointsRes.data?.balance ?? 0;
  const rewards = rewardsRes.data ?? [];

  return (
    <div className="space-y-5">
      {/* Balance destacado */}
      <div className="card p-6 bg-brand-500 text-white border-transparent text-center animate-fade-up">
        <Star size={28} className="mx-auto mb-2" fill="currentColor" />
        <p className="text-4xl font-bold">{balance}</p>
        <p className="text-white/80 text-sm mt-1">puntos disponibles</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Tienda de recompensas</h2>
        <div className="grid grid-cols-2 gap-3">
          {rewards.length === 0 && (
            <p className="col-span-2 card p-6 text-center text-sm text-[var(--muted)]">
              Todavía no hay recompensas cargadas.
            </p>
          )}
          {rewards.map((r: any) => (
            <RewardCard key={r.id} reward={r} balance={balance} />
          ))}
        </div>
      </div>
    </div>
  );
}
