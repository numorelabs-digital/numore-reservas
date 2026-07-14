"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

// Renderiza un QR a partir de un token. El admin lo escanea → checkin_qr(token).
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, {
        width: size, margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [value, size]);
  return <canvas ref={ref} className="rounded-xl" />;
}
