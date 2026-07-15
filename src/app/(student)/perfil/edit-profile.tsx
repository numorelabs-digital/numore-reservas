"use client";
import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputCls, labelCls } from "@/components/ui/modal";
import { updateProfile } from "./actions";
import { toast } from "sonner";
import { Pencil, Loader2, Camera } from "lucide-react";

export function EditProfile({ profile }: { profile: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(profile.avatar_url ?? null);
  const [cep, setCep] = useState(profile.cep ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPreview(URL.createObjectURL(f));
  }

  // Autocompleta ciudad/estado desde el CEP (ViaCEP, gratis).
  async function lookupCep(value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) setLocation(`${d.localidade}, ${d.uf}`);
    } catch { /* silencio */ }
  }

  function submit(formData: FormData) {
    start(async () => {
      const res = await updateProfile(formData);
      if (res.ok) { toast.success("Perfil actualizado"); setOpen(false); router.refresh(); }
      else toast.error(res.error);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs font-medium rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--bg)] flex items-center gap-1.5">
        <Pencil size={13} /> Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar perfil">
        <form action={submit} className="space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative h-20 w-20 rounded-full overflow-hidden border border-[var(--border)] group">
              {preview ? (
                <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[var(--bg)]">
                  <Camera size={22} className="text-[var(--muted)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center transition">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            <span className="text-xs text-[var(--muted)]">Toque para mudar a foto</span>
            <input ref={fileRef} name="avatar" type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </div>

          <div>
            <label className={labelCls}>Nome de usuário</label>
            <input name="username" defaultValue={profile.username ?? ""} className={inputCls} placeholder="tu_apodo" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>CEP</label>
              <input name="cep" value={cep} onChange={(e) => { setCep(e.target.value); lookupCep(e.target.value); }}
                className={inputCls} placeholder="00000-000" inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls}>Localização</label>
              <input name="location" value={location} onChange={(e) => setLocation(e.target.value)}
                className={inputCls} placeholder="Ciudad, UF" />
            </div>
          </div>

          <button disabled={pending}
            className="w-full rounded-xl bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={16} className="animate-spin" />} Salvar
          </button>
        </form>
      </Modal>
    </>
  );
}
