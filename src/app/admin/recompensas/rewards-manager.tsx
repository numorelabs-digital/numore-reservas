"use client";
import { useState, useTransition } from "react";
import { Modal, inputCls, labelCls } from "@/components/ui/modal";
import { saveReward, toggleReward, deleteReward } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Reward = {
  id: string; name: string; description: string | null; image_url: string | null;
  points_cost: number; stock: number | null; is_active: boolean;
};

export function RewardsManager({ rewards }: { rewards: Reward[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(form: FormData) {
    start(async () => {
      const res = await saveReward(editing?.id ?? null, form);
      if (res.ok) { toast.success("Recompensa guardada"); setOpen(false); router.refresh(); }
      else toast.error(res.error);
    });
  }
  function remove(r: Reward) {
    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    start(async () => {
      const res = await deleteReward(r.id);
      if (res.ok) { toast.success((res as any).softDeleted ? "Tenía canjes: se desactivó." : "Eliminada"); router.refresh(); }
    });
  }
  function toggle(r: Reward) {
    start(async () => { await toggleReward(r.id, !r.is_active); router.refresh(); });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Recompensas</h1>
        <button onClick={() => { setEditing(null); setOpen(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 text-white px-3 py-2 text-sm font-medium">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rewards.map((r) => (
          <div key={r.id} className="card overflow-hidden">
            <div className="aspect-square bg-[var(--bg)] relative">
              {r.image_url
                ? <Image src={r.image_url} alt={r.name} fill className="object-cover" />
                : <div className="w-full h-full grid place-items-center text-3xl">🎁</div>}
            </div>
            <div className="p-3">
              <p className="font-medium text-sm truncate">{r.name}</p>
              <p className="text-xs text-brand-500 font-semibold">{r.points_cost} pts</p>
              <p className="text-[11px] text-[var(--muted)]">
                Stock: {r.stock === null ? "∞" : r.stock}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => toggle(r)}
                  className={`text-[11px] rounded px-1.5 py-0.5 font-medium ${
                    r.is_active ? "text-green-600 bg-green-50 dark:bg-green-500/10" : "text-[var(--muted)] bg-[var(--bg)]"
                  }`}>{r.is_active ? "Activa" : "Off"}</button>
                <div className="flex-1" />
                <button onClick={() => { setEditing(r); setOpen(true); }} className="text-[var(--muted)] hover:text-[var(--text)]"><Pencil size={14} /></button>
                <button onClick={() => remove(r)} className="text-[var(--muted)] hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar recompensa" : "Nueva recompensa"}>
        <form action={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Nombre</label>
            <input name="name" defaultValue={editing?.name} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <input name="description" defaultValue={editing?.description ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>URL de imagen</label>
            <input name="image_url" defaultValue={editing?.image_url ?? ""} className={inputCls} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Puntos</label>
              <input name="points_cost" type="number" min={1} defaultValue={editing?.points_cost ?? 10} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Stock (vacío = ∞)</label>
              <input name="stock" type="number" min={0} defaultValue={editing?.stock ?? ""} className={inputCls} />
            </div>
          </div>
          <button disabled={pending}
            className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={16} className="animate-spin" />} Guardar
          </button>
        </form>
      </Modal>
    </div>
  );
}
