import { site } from "@/config/site";
import { cn } from "@/lib/utils";

// Logo do negócio.
// - withName (cabeçalho): mostra o nome em texto, limpo e legível.
// - sem withName: mostra a marca/emoji.
// Troque a marca em src/config/site.ts
export function Logo({ withName = false, className }: {
  size?: number; withName?: boolean; className?: string;
}) {
  if (withName) {
    return <span className={cn("font-semibold tracking-tight text-lg", className)}>{site.name}</span>;
  }
  return (
    <span className={cn("inline-flex items-center", className)}>
      {site.logoUrl
        ? <img src={site.logoUrl} alt={site.name} className="h-8 w-8 rounded-lg object-contain" />
        : <span style={{ fontSize: 22 }}>{site.logoEmoji}</span>}
    </span>
  );
}
