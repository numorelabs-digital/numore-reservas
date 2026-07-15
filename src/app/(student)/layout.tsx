import { requireUser } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  // El admin solo ve el panel admin, no la vista de alumno.
  if (profile.role === "admin") redirect("/admin");

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-lg">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
          <Link href="/dashboard">
            <Logo withName />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
