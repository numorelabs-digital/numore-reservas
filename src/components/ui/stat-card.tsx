import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("card p-4 animate-fade-up", accent && "bg-brand-500 text-white border-transparent")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", accent ? "text-white/80" : "text-[var(--muted)]")}>
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className={cn("text-xs mt-0.5", accent ? "text-white/70" : "text-[var(--muted)]")}>{sub}</div>}
    </div>
  );
}
