import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WEEKDAYS_ES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Mapeia códigos de erro das RPC para mensagens legíveis (pt-BR).
export const BOOKING_ERRORS: Record<string, string> = {
  SESSION_FULL: "Esse horário já está lotado.",
  SESSION_NOT_OPEN: "O horário não está disponível.",
  TOO_LATE_TO_BOOK: "Você precisa reservar com pelo menos 24 h de antecedência.",
  NO_CLASSES_LEFT: "Você não tem mais aulas no seu pacote.",
  PURCHASE_EXPIRED: "Seu pacote venceu.",
  DAY_NOT_ALLOWED: "Esse dia não está incluído no seu pacote de dias fixos.",
  QR_ALREADY_USED: "Este QR já foi utilizado.",
  QR_EXPIRED: "Este QR expirou.",
  NOT_ENOUGH_POINTS: "Você não tem pontos suficientes.",
};

export function humanBookingError(msg: string): string {
  const code = Object.keys(BOOKING_ERRORS).find((c) => msg.includes(c));
  return code ? BOOKING_ERRORS[code] : "Ocorreu um erro. Tente de novo.";
}
