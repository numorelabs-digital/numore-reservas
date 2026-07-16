"use client";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Se renderiza en el body (portal) para que el `fixed` sea relativo a la
  // pantalla completa y no quede cortado dentro de un contenedor con transform.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}>
      <div
        className="card w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[88dvh] rounded-t-2xl rounded-b-none sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Estilos base reutilizables para inputs.
export const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition";
export const labelCls = "text-xs font-medium text-[var(--muted)] mb-1 block";
