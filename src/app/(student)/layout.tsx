import { requireUser } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-lg">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">🥊</span> Gimnasio
          </Link>
          <div className="flex items-center gap-2">
            {profile.role === "admin" && (
              <Link href="/admin" className="text-xs font-medium rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--bg)]">
                Panel admin
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
