import { requireAdmin } from "@/lib/auth";
import { ScannerClient } from "./scanner-client";

export default async function ScannerPage() {
  await requireAdmin();
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-1">Scanner de presença</h1>
      <p className="text-sm text-[var(--muted)] mb-4">
        Apuntá la cámara al QR del aluno. Se registra la asistencia y se suma 1 punto.
      </p>
      <ScannerClient />
    </div>
  );
}
