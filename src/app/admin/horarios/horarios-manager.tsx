"use client";
import { useState, useTransition } from "react";
import { Modal, inputCls, labelCls } from "@/components/ui/modal";
import {
  saveSchedule, toggleSchedule, deleteSchedule, saveClassType,
  generateSessions, updateSession,
} from "./actions";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Pencil, Trash2, Loader2, Ban, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function HoráriosManager({ classTypes, schedules, sessions, onChanged }: any) {
  const [tab, setTab] = useState<"rec" | "ses">("rec");
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Horários</h1>
      <div className="flex gap-1 mb-4 p-1 card w-fit">
        {[["rec", "Recurrentes"], ["ses", "Sessões"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition",
              tab === k ? "bg-brand-500 text-white" : "text-[var(--muted)]")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "rec"
        ? <Recurrentes classTypes={classTypes} schedules={schedules} onChanged={onChanged} />
        : <Sessões sessions={sessions} onChanged={onChanged} />}
    </div>
  );
}

// ---------------------------------------------------------------- Recurrentes
function Recurrentes({ classTypes, schedules, onChanged }: any) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [typeOpen, setTypeOpen] = useState(false);

  function submit(form: FormData) {
    start(async () => {
      const res = await saveSchedule(editing?.id ?? null, form);
      if (res.ok) { toast.success("Horário salvo"); setOpen(false); onChanged?.(); }
      else toast.error(res.error);
    });
  }
  function submitType(form: FormData) {
    start(async () => {
      const res = await saveClassType(null, String(form.get("name")), String(form.get("color")));
      if (res.ok) { toast.success("Tipo creado"); setTypeOpen(false); onChanged?.(); }
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Tipos de aula */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Tipos de aula</h2>
          <button onClick={() => setTypeOpen(true)} className="text-xs text-brand-500 font-medium flex items-center gap-1">
            <Plus size={14} /> Tipo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {classTypes.map((t: any) => (
            <span key={t.id} className="text-xs rounded-full px-3 py-1 font-medium text-white" style={{ background: t.color }}>
              {t.name}
            </span>
          ))}
          {classTypes.length === 0 && <p className="text-xs text-[var(--muted)]">Crie um tipo de aula primeiro.</p>}
        </div>
      </section>

      {/* Horários */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Horários semanais</h2>
          <button onClick={() => { setEditing(null); setOpen(true); }} disabled={classTypes.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
            <Plus size={16} /> Novo
          </button>
        </div>
        <div className="card divide-y divide-[var(--border)]">
          {schedules.length === 0 && <p className="p-4 text-sm text-[var(--muted)]">Sem horários.</p>}
          {schedules.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 p-3.5">
              <div className="w-1.5 h-8 rounded-full" style={{ background: s.class_types?.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.class_types?.name} · {DIAS[s.weekday]}</p>
                <p className="text-xs text-[var(--muted)]">
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · vaga {s.capacity}
                </p>
              </div>
              <button onClick={() => start(async () => { await toggleSchedule(s.id, !s.is_active); onChanged?.(); })}
                className={cn("text-xs rounded-lg px-2 py-1 font-medium",
                  s.is_active ? "text-green-600 bg-green-50 dark:bg-green-500/10" : "text-[var(--muted)] bg-[var(--bg)]")}>
                {s.is_active ? "Ativo" : "Off"}
              </button>
              <button onClick={() => { setEditing(s); setOpen(true); }} className="text-[var(--muted)] hover:text-[var(--text)]"><Pencil size={15} /></button>
              <button onClick={() => { if (confirm("Excluir horário?")) start(async () => { await deleteSchedule(s.id); onChanged?.(); }); }}
                className="text-[var(--muted)] hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Modal horário */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar horário" : "Nuevo horário"}>
        <form action={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Tipo de aula</label>
            <select name="class_type_id" defaultValue={editing?.class_type_id} className={inputCls} required>
              {classTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Día</label>
            <select name="weekday" defaultValue={editing?.weekday ?? 1} className={inputCls}>
              {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Início</label>
              <input name="start_time" type="time" defaultValue={editing?.start_time?.slice(0, 5) ?? "19:00"} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Fin</label>
              <input name="end_time" type="time" defaultValue={editing?.end_time?.slice(0, 5) ?? "20:00"} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Cupo</label>
              <input name="capacity" type="number" min={1} max={200} defaultValue={editing?.capacity ?? 12} className={inputCls} required />
            </div>
          </div>
          <button disabled={pending} className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </form>
      </Modal>

      {/* Modal tipo */}
      <Modal open={typeOpen} onClose={() => setTypeOpen(false)} title="Nuevo tipo de aula">
        <form action={submitType} className="space-y-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" className={inputCls} placeholder="Muay Thai" required />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input name="color" type="color" defaultValue="#ef4444" className="h-10 w-full rounded-xl border border-[var(--border)]" />
          </div>
          <button disabled={pending} className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60">
            Crear
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------- Sessões
function Sessões({ sessions, onChanged }: any) {
  const [pending, start] = useTransition();

  function generar() {
    start(async () => {
      const res = await generateSessions(21);
      if (res.ok) { toast.success("Sessões geradas para 21 dias"); onChanged?.(); }
      else toast.error(res.error);
    });
  }
  function toggleBlock(s: any) {
    const next = s.status === "open" ? "blocked" : "open";
    start(async () => { await updateSession(s.id, { status: next }); onChanged?.(); });
  }
  function editCap(s: any) {
    const v = prompt("Nova capacidade:", String(s.capacity));
    if (!v) return;
    const cap = parseInt(v);
    if (isNaN(cap) || cap < 1) return toast.error("Capacidade inválida.");
    if (cap < s.taken) return toast.error(`Já há ${s.taken} reservas.`);
    start(async () => { await updateSession(s.id, { capacity: cap }); onChanged?.(); });
  }

  return (
    <div className="space-y-3">
      <button onClick={generar} disabled={pending}
        className="flex items-center gap-2 rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        Gerar sessões (21 dias)
      </button>

      <div className="card divide-y divide-[var(--border)]">
        {sessions.length === 0 && <p className="p-4 text-sm text-[var(--muted)]">Sin sesiones. Generalas desde los horários.</p>}
        {sessions.map((s: any) => (
          <div key={s.id} className={cn("flex items-center gap-3 p-3.5", s.status !== "open" && "opacity-60")}>
            <div className="w-1.5 h-8 rounded-full" style={{ background: s.class_types?.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.class_types?.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {format(parseISO(s.session_date), "EEE d MMM", { locale: ptBR })} · {s.start_time.slice(0, 5)} · {s.taken}/{s.capacity}
              </p>
            </div>
            <button onClick={() => editCap(s)} className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline">vaga</button>
            <button onClick={() => toggleBlock(s)}
              className={cn("flex items-center gap-1 text-xs rounded-lg px-2 py-1 font-medium",
                s.status === "open" ? "text-[var(--muted)] bg-[var(--bg)]" : "text-orange-600 bg-orange-50 dark:bg-orange-500/10")}>
              {s.status === "open" ? <><Ban size={13} /> Bloquear</> : <><CheckCircle2 size={13} /> Habilitar</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
