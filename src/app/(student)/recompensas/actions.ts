"use server";
import { createClient } from "@/lib/supabase/server";
import { humanBookingError } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function redeemReward(rewardId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });
  if (error) return { ok: false as const, error: humanBookingError(error.message) };
  revalidatePath("/recompensas");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
