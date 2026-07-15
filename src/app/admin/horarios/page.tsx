"use client";
import { useHorarios } from "@/lib/hooks";
import { HorariosManager } from "./horarios-manager";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function HorariosPage() {
  const { data, mutate } = useHorarios();
  if (!data) return <PageSkeleton />;
  return (
    <HorariosManager
      classTypes={data.classTypes}
      schedules={data.schedules}
      sessions={data.sessions}
      onChanged={() => mutate()}
    />
  );
}
