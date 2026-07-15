"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Autenticação por e-mail e senha.
export function EmailAuth() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(mode: "in" | "up") {
    if (!email || !password) return toast.error("Preencha e-mail e senha.");
    setLoading(true);
    const supabase = createClient();
    const fn = mode === "in"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({
          email, password,
          options: { data: { full_name: email.split("@")[0] } },
        });
    const { data, error } = await fn;
    setLoading(false);
    if (error) return toast.error(error.message);
    // Cadastro com confirmação de e-mail ativa: ainda não há sessão.
    if (mode === "up" && !data.session) {
      return toast.success("Enviamos um e-mail de confirmação. Confirme para entrar.");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
      <div className="flex gap-2 pt-1">
        <button onClick={() => submit("up")} disabled={loading}
          className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-60">
          Criar conta
        </button>
        <button onClick={() => submit("in")} disabled={loading}
          className="flex-1 rounded-lg bg-brand-500 text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5">
          {loading && <Loader2 size={14} className="animate-spin" />} Entrar
        </button>
      </div>
    </div>
  );
}
