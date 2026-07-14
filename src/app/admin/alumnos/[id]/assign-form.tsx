"use client";
import { useState, useTransition } from "react";
import { assignPackage } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { WEEKDAYS_ES } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function AssignPackageForm({ profileId, packages }: { profileId: string; packages: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pkgId, setPkgId] = useState(packages[0]?.id ?? "");
  const [days, setDays] = useState<number[]>([]);

  const selected = packages.find((p) => p.id === pkgId);
  const isFixed = selected?.modality === "fixed_days";

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  function submit() {
    start(async () => {
      const res = await assignPackage({ profileId, packageId: pkgId, allowedWeekdays: days });
      if (res.ok) { toast.success("Paquete asignado"); setDays([]); router.refresh(); }
      else toast.error(res.error);
    });
  }

  if (packages.length === 0)
    return <div className="card p-4 text-sm text-[var(--muted)]">No hay paquetes cargados. Creá uno en Paquetes.</div>;

  return (
    <div className="card p-4 space-y-3">
      <select value={pkgId} onChange={(e) => { setPkgId(e.target.value); setDays([]); }}
        className="w-full card px-3 py-2.5 text-sm bg-[var(--bg)]">
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.classes_count} clases ({p.modality === "flexible" ? "flexible" : "días fijos"}) · ${p.price}
          </option>
        ))}
      </select>

      {isFixed && (
        <div>
          <p className="text-xs text-[var(--muted)] mb-1.5">Días de entrenamiento:</p>
          <div className="flex gap-1.5">
            {WEEKDAYS_ES.map((label, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`h-9 w-9 rounded-lg text-xs font-medium border transition ${
                  days.includes(i) ? "bg-brand-500 text-white border-transparent" : "border-[var(--border)]"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={submit} disabled={pending}
        className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
        {pending && <Loader2 size={16} className="animate-spin" />}
        Asignar paquete
      </button>
    </div>
  );
}
