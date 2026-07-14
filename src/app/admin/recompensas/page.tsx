import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RewardsManager } from "./rewards-manager";

export default async function AdminRecompensasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: rewards } = await supabase.from("rewards").select("*").order("points_cost");
  return <RewardsManager rewards={rewards ?? []} />;
}
