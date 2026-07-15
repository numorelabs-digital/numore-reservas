"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createPayment, getPaymentStatus } from "./actions";
import { toast } from "sonner";
import { Loader2, Copy, Check, Ticket, ShoppingCart } from "lucide-react";

type Pkg = { id: string; name: string; classes_count: number; price: number };
type Pix = { paymentId: string; qrCode: string; qrCodeBase64: string; amount: number };

export function StoreClient({ packages, remaining }: { packages: Pkg[]; remaining: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function buy(pkg: Pkg) {
    setBusyId(pkg.id);
    start(async () => {
      const res = await createPayment(pkg.id);
      setBusyId(null);
      if (!res.ok) { toast.error(res.error); return; }
      setPaid(false);
      setPix({ paymentId: res.paymentId, qrCode: res.qrCode, qrCodeBase64: res.qrCodeBase64, amount: res.amount });
    });
  }

  // Mientras el modal de pago está abierto, consulta si ya se acreditó.
  useEffect(() => {
    if (!pix || paid) return;
    pollRef.current = setInterval(async () => {
      const status = await getPaymentStatus(pix.paymentId);
      if (status === "approved") {
        setPaid(true);
        toast.success("¡Pago acreditado! Ya tenés tus clases.");
        router.refresh();
      }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pix, paid, router]);

  function copyCode() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeModal() {
    setPix(null); setPaid(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Comprar clases</h1>
        <span className="text-xs rounded-full bg-brand-50 text-brand-600 px-2.5 py-1 font-medium dark:bg-brand-500/10 flex items-center gap-1">
          <Ticket size={13} /> {remaining} disponibles
        </span>
      </div>
      <p className="text-sm text-[var(--muted)]">Pagá con PIX desde cualquier banco. Se acredita solo.</p>

      <div className="grid gap-3">
        {packages.length === 0 && (
          <div className="card p-6 text-center text-sm text-[var(--muted)]">
            No hay paquetes disponibles por ahora.
          </div>
        )}
        {packages.map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between animate-fade-up">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {p.classes_count} {p.classes_count === 1 ? "clase" : "clases"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-brand-500 mb-1">${p.price}</p>
              <button onClick={() => buy(p)} disabled={pending && busyId === p.id}
                className="text-sm font-medium rounded-lg bg-brand-500 text-white px-4 py-2 hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5">
                {pending && busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                Comprar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de pago PIX */}
      <Modal open={!!pix} onClose={closeModal} title={paid ? "¡Pago confirmado!" : "Pagá con PIX"}>
        {pix && !paid && (
          <div className="space-y-4 text-center">
            <p className="text-2xl font-bold">${pix.amount}</p>
            {pix.qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR PIX" className="mx-auto w-52 h-52 rounded-xl border border-[var(--border)]"
              />
            )}
            <div>
              <p className="text-xs text-[var(--muted)] mb-1">O copiá el código PIX (copia e cola):</p>
              <button onClick={copyCode}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm hover:bg-[var(--bg)]">
                {copied ? <><Check size={15} className="text-green-500" /> Copiado</> : <><Copy size={15} /> Copiar código</>}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <Loader2 size={15} className="animate-spin" /> Esperando tu pago…
            </div>
            <p className="text-xs text-[var(--muted)]">
              Escaneá el QR o pegá el código en tu banco. En cuanto pagues, se acredita solo.
            </p>
          </div>
        )}
        {paid && (
          <div className="text-center py-4 space-y-2">
            <Check size={48} className="mx-auto text-green-500" />
            <p className="font-semibold">¡Listo! Tus clases ya están acreditadas.</p>
            <button onClick={closeModal}
              className="mt-2 rounded-xl bg-brand-500 text-white px-6 py-2.5 text-sm font-medium">
              Ir a reservar
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
