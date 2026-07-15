// =============================================================================
// 🎨 CONFIGURAÇÃO DA MARCA — EDITE AQUI para mudar textos e dados do negócio.
// Pensado para reaproveitar como SaaS (academia, barbearia, estúdio, etc.):
// mudando estes valores, a app inteira se adapta.
// =============================================================================

export const site = {
  // Nome do negócio (aparece no cabeçalho e no login)
  name: "Reserva+",
  // Nome curto (para o app instalado / PWA)
  shortName: "Reserva+",

  // Frase de boas-vindas no login
  tagline: "Reserve seu serviço aqui",

  // Logo: se deixar logoUrl vazio, mostra o emoji.
  // Para usar seu logo, coloque a imagem em /public e a rota aqui.
  logoEmoji: "📅",
  logoUrl: "/icons/icon.png" as string,

  // Categorias/serviços oferecidos (apenas texto/marketing)
  disciplines: ["Muay Thai", "MMA", "Boxe"],

  // Dados de contato (rodapé / formulários futuros)
  contact: {
    whatsapp: "",   // ex: "+55 11 91234-5678"
    instagram: "",  // ex: "@seunegocio"
    address: "",
    email: "",
  },
} as const;

export type Site = typeof site;
