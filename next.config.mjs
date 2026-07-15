/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatares Google
    ],
  },
  // Caché del router en el cliente: al volver a una pantalla ya visitada,
  // se muestra al instante (sin re-pedir datos) durante estos segundos.
  experimental: {
    staleTimes: {
      dynamic: 30,   // páginas con datos (dashboard, calendario, etc.)
      static: 300,
    },
  },
};

export default nextConfig;
