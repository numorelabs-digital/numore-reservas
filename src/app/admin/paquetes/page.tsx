"use client";
import { usePackages } from "@/lib/hooks";
import { PackagesManager } from "./packages-manager";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function PaquetesPage() {
  const { data, mutate } = usePackages();
  if (!data) return <PageSkeleton />;
  return <PackagesManager packages={data} onChanged={() => mutate()} />;
}
