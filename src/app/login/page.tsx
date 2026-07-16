"use client";
import { EmailAuth } from "./dev-login";
import { site } from "@/config/site";

export default function LoginPage() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 bg-[var(--bg)]">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.name}
              className="mx-auto mb-4 h-14 w-14 rounded-2xl object-contain shadow-lg" />
          ) : (
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl grid place-items-center text-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              {site.logoEmoji}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo</h1>
          <p className="text-[var(--muted)] mt-1 text-sm">{site.tagline}</p>
        </div>

        <div className="card p-6">
          <EmailAuth />
          <p className="text-xs text-center text-[var(--muted)] mt-4">
            Entre com seu e-mail e senha, ou crie sua conta.
          </p>
        </div>
      </div>
    </main>
  );
}
