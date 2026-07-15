"use client";
import { SWRConfig } from "swr";

// Caché persistente en localStorage: al volver a una pantalla (o recargar),
// se muestran los datos guardados al instante y se revalidan en segundo plano.
function localStorageProvider() {
  if (typeof window === "undefined") return new Map();
  let map: Map<string, any>;
  try {
    map = new Map(JSON.parse(localStorage.getItem("numore-cache") || "[]"));
  } catch {
    map = new Map();
  }
  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem("numore-cache", JSON.stringify(Array.from(map.entries())));
    } catch {}
  });
  return map;
}

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: localStorageProvider,
        revalidateOnFocus: true,
        keepPreviousData: true,     // muestra lo anterior mientras carga lo nuevo
        dedupingInterval: 4000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
