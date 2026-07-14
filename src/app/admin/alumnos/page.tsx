import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  await requireAdmin();
  const { q = "", estado = "activos" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_active, created_at")
    .eq("role", "student")
    .order("full_name");

  if (estado === "activos") query = query.eq("is_active", true);
  if (estado === "inactivos") query = query.eq("is_active", false);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: students } = await query.limit(100);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Alumnos</h1>

      {/* Búsqueda + filtro */}
      <form className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 card px-3">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            name="q" defaultValue={q} placeholder="Buscar por nombre o email…"
            className="flex-1 bg-transparent py-2.5 outline-none text-sm"
          />
        </div>
        <select name="estado" defaultValue={estado}
          className="card px-3 text-sm bg-[var(--surface)]">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button className="rounded-xl bg-brand-500 text-white px-4 text-sm font-medium">Buscar</button>
      </form>

      <div className="card divide-y divide-[var(--border)]">
        {(students ?? []).length === 0 && (
          <p className="p-4 text-sm text-[var(--muted)]">Sin resultados.</p>
        )}
        {(students ?? []).map((s: any) => (
          <Link key={s.id} href={`/admin/alumnos/${s.id}`}
            className="flex items-center justify-between p-3.5 hover:bg-[var(--bg)] transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-brand-500 grid place-items-center text-white text-sm font-semibold shrink-0">
                {(s.full_name ?? "?")[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.full_name ?? "Sin nombre"}</p>
                <p className="text-xs text-[var(--muted)] truncate">{s.email}</p>
              </div>
            </div>
            <span className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${
              s.is_active ? "text-green-600 bg-green-50 dark:bg-green-500/10" : "text-[var(--muted)] bg-[var(--bg)]"
            }`}>
              {s.is_active ? "Activo" : "Inactivo"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
