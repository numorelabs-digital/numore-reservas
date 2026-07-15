import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StoreClient } from "./store-client";

export default async function TiendaPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [packagesRes, purchasesRes] = await Promise.all([
    // Solo paquetes flexibles se venden online (los de días fijos los asigna el admin)
    supabase.from("packages").select("*")
      .eq("is_active", true).eq("modality", "flexible")
      .order("classes_count"),
    supabase.from("purchase_remaining").select("remaining").eq("profile_id", profile.id),
  ]);

  const remaining = (purchasesRes.data ?? []).reduce((a: number, p: any) => a + (p.remaining ?? 0), 0);

  return <StoreClient packages={packagesRes.data ?? []} remaining={remaining} />;
}
