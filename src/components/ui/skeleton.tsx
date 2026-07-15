import { cn } from "@/lib/utils";

// Bloque gris con pulso, para estados de carga.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[var(--border)]", className)} />;
}

// Esqueleto genérico de una pantalla (tarjetas). Da feedback instantáneo al navegar.
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
    </div>
  );
}
