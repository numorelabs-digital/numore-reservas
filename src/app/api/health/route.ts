import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Endpoint liviano para "keep-warm": un pinger externo gratuito (UptimeRobot,
// cron-job.org) le pega cada 5 min y mantiene la app despierta → sin cold start.
// No toca la base de datos, responde al instante.
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
