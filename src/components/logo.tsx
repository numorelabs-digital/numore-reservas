import { site } from "@/config/site";
import { cn } from "@/lib/utils";

// Logo do negócio.
// - withName (cabeçalho): mostra o nome em texto, limpo e legível.
// - sem withName: mostra a marca/emoji.
// Troque a marca em src/config/site.ts
export function Logo({ withName = false, className }: {
  size?: number; withName?: boolean; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {site.logoUrl
        ? <img src={site.logoUrl} alt={site.name} className="h-7 w-7 rounded-lg object-contain shrink-0" />
        : <span style={{ fontSize: 20 }}>{site.logoEmoji}</span>}
      {withName && <span className="font-semibold tracking-tight">{site.name}</span>}
    </span>
  );
}
