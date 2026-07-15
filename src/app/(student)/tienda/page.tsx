"use client";
import { useMe, useStore } from "@/lib/hooks";
import { StoreClient } from "./store-client";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function TiendaPage() {
  const { data: profile } = useMe();
  const { data, mutate } = useStore(profile?.id);

  if (!data) return <PageSkeleton />;
  return <StoreClient packages={data.packages} remaining={data.remaining} onPaid={() => mutate()} />;
}
