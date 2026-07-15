"use client";
import { useHorários } from "@/lib/hooks";
import { HoráriosManager } from "./horarios-manager";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function HoráriosPage() {
  const { data, mutate } = useHorários();
  if (!data) return <PageSkeleton />;
  return (
    <HoráriosManager
      classTypes={data.classTypes}
      schedules={data.schedules}
      sessions={data.sessions}
      onChanged={() => mutate()}
    />
  );
}
