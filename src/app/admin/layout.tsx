import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PushToggle } from "@/components/push-toggle";
import { LayoutDashboard, ScanLine, CalendarCog, Package, Users, Gift } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/scanner", label: "Escáner", icon: ScanLine },
  { href: "/admin/horarios", label: "Horarios", icon: CalendarCog },
  { href: "/admin/paquetes", label: "Paquetes", icon: Package },
  { href: "/admin/alumnos", label: "Alumnos", icon: Users },
  { href: "/admin/recompensas", label: "Recompensas", icon: Gift },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-60 border-r border-[var(--border)] p-4 sticky top-0 h-dvh">
        <div className="flex items-center gap-2 font-semibold mb-6 px-2">
          <span className="text-lg">🥊</span> Admin
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg)] transition">
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="text-xs text-[var(--muted)] px-3 py-2 hover:underline">
          ← Volver a vista alumno
        </Link>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 h-14">
            <span className="font-medium truncate">{admin.full_name}</span>
            <div className="flex items-center gap-2">
              <PushToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        {/* Nav inferior (mobile) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-lg grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2 text-[10px] text-[var(--muted)]">
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
