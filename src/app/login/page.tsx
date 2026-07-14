"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { DevLogin } from "./dev-login";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  return (
    <main className="min-h-dvh grid place-items-center px-6 bg-[var(--bg)]">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl grid place-items-center text-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            🥊
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenido</h1>
          <p className="text-[var(--muted)] mt-1 text-sm">
            Reservá tus clases de Muay Thai, MMA y Boxeo
          </p>
        </div>

        <div className="card p-6">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 font-medium hover:bg-[var(--bg)] transition disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "Conectando…" : "Continuar con Google"}
          </button>
          <p className="text-xs text-center text-[var(--muted)] mt-4">
            El acceso es solo con tu cuenta de Google.
          </p>
          {process.env.NODE_ENV !== "production" && <DevLogin />}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 16 3 9.1 7.6 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 40.4 16 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.6 36.2 45 30.6 45 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
