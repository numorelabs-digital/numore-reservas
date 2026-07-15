import { site } from "@/config/site";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Muestra el logo del negocio: imagen si hay `logoUrl`, si no el emoji.
// Cambiá el logo en src/config/site.ts
export function Logo({ size = 20, withName = false, className }: {
  size?: number; withName?: boolean; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      {site.logoUrl ? (
        <Image src={site.logoUrl} alt={site.name} width={size + 6} height={size + 6} className="rounded-md" />
      ) : (
        <span style={{ fontSize: size }}>{site.logoEmoji}</span>
      )}
      {withName && <span>{site.name}</span>}
    </span>
  );
}
