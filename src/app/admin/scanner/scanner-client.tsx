"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkinQr } from "./actions";
import { CheckCircle2, XCircle, Camera } from "lucide-react";

type Feedback = { type: "ok" | "err"; msg: string; name?: string } | null;

export function ScannerClient() {
  const containerId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastToken = useRef<string>("");
  const lock = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function start() {
    setFeedback(null);
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScan,
        () => {}
      );
      setScanning(true);
    } catch {
      setFeedback({ type: "err", msg: "No se pudo acceder a la cámara." });
    }
  }

  async function stop() {
    try { await scannerRef.current?.stop(); } catch {}
    setScanning(false);
  }

  async function onScan(decoded: string) {
    if (lock.current) return;
    // Evita re-procesar el mismo token en ráfaga
    if (decoded === lastToken.current) return;
    lock.current = true;
    lastToken.current = decoded;

    const res = await checkinQr(decoded.trim());
    if (res.ok) {
      setFeedback({ type: "ok", msg: `+${res.points} punto`, name: res.name });
      navigator.vibrate?.(200);
    } else {
      setFeedback({ type: "err", msg: res.error });
      navigator.vibrate?.([100, 50, 100]);
    }
    setTimeout(() => { lock.current = false; lastToken.current = ""; setFeedback(null); }, 3000);
  }

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="space-y-4">
      <div className="relative card overflow-hidden aspect-square bg-black">
        <div id={containerId} className="w-full h-full [&_video]:object-cover" />
        {!scanning && (
          <button onClick={start}
            className="absolute inset-0 grid place-items-center bg-black/60 text-white">
            <span className="flex flex-col items-center gap-2">
              <Camera size={32} /> Iniciar cámara
            </span>
          </button>
        )}

        {/* Overlay de resultado */}
        {feedback && (
          <div className={`absolute inset-0 grid place-items-center backdrop-blur-sm ${
            feedback.type === "ok" ? "bg-green-600/85" : "bg-red-600/85"
          } text-white`}>
            <div className="text-center px-6">
              {feedback.type === "ok"
                ? <CheckCircle2 size={56} className="mx-auto mb-3" />
                : <XCircle size={56} className="mx-auto mb-3" />}
              {feedback.name && <p className="text-xl font-bold">{feedback.name}</p>}
              <p className="text-lg">{feedback.msg}</p>
            </div>
          </div>
        )}
      </div>

      {scanning && (
        <button onClick={stop}
          className="w-full card p-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--bg)]">
          Detener cámara
        </button>
      )}
    </div>
  );
}
