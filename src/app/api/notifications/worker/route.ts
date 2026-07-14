import { NextResponse } from "next/server";
import { processNotifications } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

// Vacía la cola de notificaciones. Lo llama el cron de Vercel (con CRON_SECRET)
// como respaldo para eventos generados por triggers de la BD (ej. nuevo usuario).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processNotifications();
  return NextResponse.json(result);
}
