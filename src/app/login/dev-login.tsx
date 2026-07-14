"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Login de desarrollo (email/contraseña). Solo se renderiza fuera de producción.
// Permite probar la app localmente sin configurar Google OAuth.
export function DevLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("test1234");
  const [loading, setLoading] = useState(false);

  async function submit(mode: "in" | "up") {
    setLoading(true);
    const supabase = createClient();
    const fn = mode === "in"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({
          email, password,
          options: { data: { full_name: email.split("@")[0] } },
        });
    const { error } = await fn;
    setLoading(false);
    if (error) return toast.error(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-dashed border-[var(--border)] pt-4">
      <p className="text-[11px] text-center text-[var(--muted)] mb-2 uppercase tracking-wide">
        Solo desarrollo local
      </p>
      <div className="space-y-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="contraseña"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none" />
        <div className="flex gap-2">
          <button onClick={() => submit("up")} disabled={loading}
            className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-60">
            Crear cuenta
          </button>
          <button onClick={() => submit("in")} disabled={loading}
            className="flex-1 rounded-lg bg-brand-500 text-white py-2 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5">
            {loading && <Loader2 size={14} className="animate-spin" />} Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
