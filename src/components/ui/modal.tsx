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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}>
      <div
        className="card w-full sm:max-w-md flex flex-col max-h-[92dvh] sm:max-h-[88dvh] rounded-t-2xl rounded-b-none sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        {/* Encabezado fijo */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>
        {/* Contenido con scroll propio + espacio para la barra del celular */}
        <div className="p-4 overflow-y-auto flex-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Estilos base reutilizables para inputs.
export const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition";
export const labelCls = "text-xs font-medium text-[var(--muted)] mb-1 block";
