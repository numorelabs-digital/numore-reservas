"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = theme === "dark";
  return (
    <button
      aria-label="Mudar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
