import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Mapea códigos de error de las RPC a mensajes legibles (es-AR).
export const BOOKING_ERRORS: Record<string, string> = {
  SESSION_FULL: "Ese horario ya está completo.",
  SESSION_NOT_OPEN: "El horario no está disponible.",
  TOO_LATE_TO_BOOK: "Debés reservar con al menos 24 h de anticipación.",
  NO_CLASSES_LEFT: "No te quedan clases en tu paquete.",
  PURCHASE_EXPIRED: "Tu paquete venció.",
  DAY_NOT_ALLOWED: "Ese día no está incluido en tu paquete de días fijos.",
  QR_ALREADY_USED: "Este QR ya fue utilizado.",
  QR_EXPIRED: "Este QR expiró.",
  NOT_ENOUGH_POINTS: "No tenés puntos suficientes.",
};

export function humanBookingError(msg: string): string {
  const code = Object.keys(BOOKING_ERRORS).find((c) => msg.includes(c));
  return code ? BOOKING_ERRORS[code] : "Ocurrió un error. Intentá de nuevo.";
}
