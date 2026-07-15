import { CalendarClient } from "./calendar-client";

// La data se carga en el cliente (SWR con caché) para que sea instantáneo.
export default function CalendarioPage() {
  return <CalendarClient />;
}
