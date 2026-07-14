import { Construction } from "lucide-react";

export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">{title}</h1>
      <div className="card p-8 text-center">
        <Construction size={32} className="mx-auto mb-3 text-brand-500" />
        <p className="font-medium">En construcción — Fase 4</p>
        <p className="text-sm text-[var(--muted)] mt-1 max-w-sm mx-auto">{desc}</p>
      </div>
    </div>
  );
}
