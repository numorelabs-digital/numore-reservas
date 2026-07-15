"use client";
import { useMe, useRewards } from "@/lib/hooks";
import { RewardCard } from "./reward-card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

export default function RecompensasPage() {
  const { data: profile } = useMe();
  const { data, mutate } = useRewards(profile?.id);

  if (!data) return <PageSkeleton />;
  const { balance, rewards } = data;

  return (
    <div className="space-y-5">
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
            <RewardCard key={r.id} reward={r} balance={balance} onRedeemed={() => mutate()} />
          ))}
        </div>
      </div>
    </div>
  );
}
