"use client";
import { useState } from "react";
import { useStudents } from "@/lib/hooks";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function AlunosPage() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("activos");
  const { data: students, isLoading } = useStudents(q, estado);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Alunos</h1>

      {/* Búsqueda + filtro (instantáneo) */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 card px-3">
          <Search size={16} className="text-[var(--muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, usuário ou e-mail…"
            className="flex-1 bg-transparent py-2.5 outline-none text-sm" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}
          className="card px-3 text-sm bg-[var(--surface)]">
          <option value="activos">Ativos</option>
          <option value="inactivos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {!students && isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {(students ?? []).length === 0 && (
            <p className="p-4 text-sm text-[var(--muted)]">Sem resultados.</p>
          )}
          {(students ?? []).map((s: any) => (
            <Link key={s.id} href={`/admin/alumnos/${s.id}`}
              className="flex items-center justify-between p-3.5 hover:bg-[var(--bg)] transition">
              <div className="flex items-center gap-3 min-w-0">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-brand-500 grid place-items-center text-white text-sm font-semibold shrink-0">
                    {(s.full_name ?? "?")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.username || s.full_name || "Sem nome"}</p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {s.location ? `📍 ${s.location}` : s.email}
                  </p>
                </div>
              </div>
              <span className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${
                s.is_active ? "text-green-600 bg-green-50 dark:bg-green-500/10" : "text-[var(--muted)] bg-[var(--bg)]"
              }`}>
                {s.is_active ? "Ativo" : "Inativo"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
