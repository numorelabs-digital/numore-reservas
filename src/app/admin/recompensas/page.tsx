"use client";
import { useRewardsAdmin } from "@/lib/hooks";
import { RewardsManager } from "./rewards-manager";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function AdminRecompensasPage() {
  const { data, mutate } = useRewardsAdmin();
  if (!data) return <PageSkeleton />;
  return <RewardsManager rewards={data} onChanged={() => mutate()} />;
}
