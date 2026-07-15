"use client";
import { useState, useTransition } from "react";
import { Modal, inputCls, labelCls } from "@/components/ui/modal";
import { savePackage, togglePackage, deletePackage } from "./actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Pkg = {
  id: string; name: string; modality: "flexible" | "fixed_days";
  classes_count: number; price: number; validity_days: number; is_active: boolean;
};

export function PackagesManager({ packages, onChanged }: { packages: Pkg[]; onChanged?: () => void }) {
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: Pkg) { setEditing(p); setOpen(true); }

  function submit(form: FormData) {
    start(async () => {
      const res = await savePackage(editing?.id ?? null, form);
      if (res.ok) { toast.success("Pacote salvo"); setOpen(false); onChanged?.(); }
      else toast.error(res.error);
    });
  }

  function remove(p: Pkg) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    start(async () => {
      const res = await deletePackage(p.id);
      if (res.ok) {
        toast.success((res as any).softDeleted ? "Tinha compras: foi desativado." : "Excluído");
        onChanged?.();
      }
    });
  }

  function toggle(p: Pkg) {
    start(async () => { await togglePackage(p.id, !p.is_active); onChanged?.(); });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Pacotes</h1>
        <button onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 text-white px-3 py-2 text-sm font-medium">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {packages.length === 0 && (
          <p className="card p-6 text-sm text-[var(--muted)] sm:col-span-2">Sem pacotes. Crie o primeiro.</p>
        )}
        {packages.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {p.classes_count} aulas · {p.modality === "flexible" ? "Flexível" : "Dias fixos"} · vence em {p.validity_days}d
                </p>
              </div>
              <span className="text-sm font-semibold text-brand-500">${p.price}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => toggle(p)}
                className={`text-xs rounded-lg px-2.5 py-1 font-medium ${
                  p.is_active ? "text-green-600 bg-green-50 dark:bg-green-500/10" : "text-[var(--muted)] bg-[var(--bg)]"
                }`}>
                {p.is_active ? "Ativo" : "Inativo"}
              </button>
              <div className="flex-1" />
              <button onClick={() => openEdit(p)} className="text-[var(--muted)] hover:text-[var(--text)]"><Pencil size={16} /></button>
              <button onClick={() => remove(p)} className="text-[var(--muted)] hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar pacote" : "Nuevo pacote"}>
        <form action={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" defaultValue={editing?.name} className={inputCls} placeholder="Flex 10" required />
          </div>
          <div>
            <label className={labelCls}>Modalidade</label>
            <select name="modality" defaultValue={editing?.modality ?? "flexible"} className={inputCls}>
              <option value="flexible">Flexível (qualquer horário)</option>
              <option value="fixed_days">Dias fixos</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Aulas (2–24)</label>
              <input name="classes_count" type="number" min={1} max={24} defaultValue={editing?.classes_count ?? 10} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Preço</label>
              <input name="price" type="number" min={0} step="0.01" defaultValue={editing?.price ?? 0} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Vence (dias)</label>
              <input name="validity_days" type="number" min={1} defaultValue={editing?.validity_days ?? 30} className={inputCls} required />
            </div>
          </div>
          <button disabled={pending}
            className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
