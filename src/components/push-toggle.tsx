"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { savePushSubscription, deletePushSubscription } from "@/app/admin/notif-actions";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "off" | "on" | "loading";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return toast.error("Falta configurar las claves VAPID.");
    setState("loading");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("off"); return toast.error("Permiso denegado."); }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
        userAgent: navigator.userAgent,
      });
      if (res.ok) { setState("on"); toast.success("Notificaciones activadas en este dispositivo"); }
      else { setState("off"); toast.error(res.error); }
    } catch {
      setState("off");
      toast.error("No se pudo activar.");
    }
  }

  async function disable() {
    setState("loading");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await deletePushSubscription(sub.endpoint); await sub.unsubscribe(); }
    setState("off");
    toast.success("Notificaciones desactivadas");
  }

  if (state === "unsupported") return null;

  return (
    <button
      onClick={state === "on" ? disable : enable}
      disabled={state === "loading"}
      title={state === "on" ? "Notificaciones activadas" : "Activar notificaciones"}
      className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition disabled:opacity-50"
    >
      {state === "on" ? <BellRing size={18} className="text-brand-500" />
        : state === "off" ? <Bell size={18} />
        : <BellOff size={18} className="text-[var(--muted)]" />}
    </button>
  );
}
