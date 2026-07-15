import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/config/site";
// 🔤 TIPOGRAFÍA: para cambiar la fuente, reemplazá "Inter" por otra de
// next/font/google (ej: Poppins, Montserrat) — es la única línea a tocar.
import { Inter } from "next/font/google";

const appFont = Inter({ subsets: ["latin"], variable: "--font-app", display: "swap" });
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { SwrProvider } from "@/components/swr-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: `${site.name} · Clases y Reservas`,
  description: site.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: site.shortName },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={appFont.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SwrProvider>{children}</SwrProvider>
          <PwaRegister />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
