// =============================================================================
// Tipos de la base de datos.
// NOTA: en cuanto tengas Supabase corriendo, REGENERAR con:
//   npx supabase gen types typescript --linked > src/lib/types/database.ts
// Esta es una versión manual mínima para arrancar con tipado.
// =============================================================================

export type UserRole = "student" | "admin";
export type PackageModality = "flexible" | "fixed_days";
export type SessionStatus = "open" | "blocked" | "cancelled";
export type BookingStatus = "booked" | "attended" | "cancelled" | "no_show";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ClassSession {
  id: string;
  class_type_id: string;
  session_date: string;   // YYYY-MM-DD
  start_time: string;     // HH:MM:SS
  end_time: string;
  capacity: number;
  status: SessionStatus;
}

export interface SessionAvailability {
  session_id: string;
  capacity: number;
  taken: number;
  available: number;
  is_full: boolean;
}

export interface Booking {
  id: string;
  profile_id: string;
  session_id: string;
  purchase_id: string;
  status: BookingStatus;
  created_at: string;
}

// Placeholder para satisfacer los clientes tipados hasta regenerar.
export type Database = any;
