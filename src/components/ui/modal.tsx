"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}>
      <div
        className="card w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-b-none sm:rounded-b-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Estilos base reutilizables para inputs.
export const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition";
export const labelCls = "text-xs font-medium text-[var(--muted)] mb-1 block";
