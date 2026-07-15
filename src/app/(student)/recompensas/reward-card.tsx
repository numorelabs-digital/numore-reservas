"use client";
import Image from "next/image";
import { useTransition } from "react";
import { redeemReward } from "./actions";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export function RewardCard({ reward, balance, onRedeemed }: { reward: any; balance: number; onRedeemed?: () => void }) {
  const [pending, start] = useTransition();
  const affordable = balance >= reward.points_cost;
  const missing = reward.points_cost - balance;
  const soldOut = reward.stock !== null && reward.stock <= 0;

  function redeem() {
    if (!confirm(`¿Canjear "${reward.name}" por ${reward.points_cost} puntos?`)) return;
    start(async () => {
      const res = await redeemReward(reward.id);
      if (res.ok) { toast.success("¡Canjeado! Retiralo en recepción."); onRedeemed?.(); }
      else toast.error(res.error);
    });
  }

  return (
    <div className="card overflow-hidden animate-fade-up flex flex-col">
      <div className="aspect-square bg-[var(--bg)] relative">
        {reward.image_url ? (
          <Image src={reward.image_url} alt={reward.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-3xl">🎁</div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-medium text-sm leading-tight">{reward.name}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2 flex-1">{reward.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-brand-500">{reward.points_cost} pts</span>
          <button
            onClick={redeem}
            disabled={!affordable || soldOut || pending}
            className="text-xs font-medium rounded-lg bg-brand-500 text-white px-3 py-1.5 disabled:bg-[var(--border)] disabled:text-[var(--muted)] flex items-center gap-1"
          >
            {pending ? <Loader2 size={12} className="animate-spin" />
              : soldOut ? "Agotado"
              : !affordable ? <><Lock size={11} /> -{missing}</>
              : "Canjear"}
          </button>
        </div>
      </div>
    </div>
  );
}
