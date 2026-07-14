import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PackagesManager } from "./packages-manager";

export default async function PaquetesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from("packages").select("*").order("classes_count");
  return <PackagesManager packages={packages ?? []} />;
}
