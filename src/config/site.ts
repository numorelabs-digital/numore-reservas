// =============================================================================
// 🎨 CONFIGURACIÓN DE MARCA — EDITÁ ACÁ para cambiar textos y datos del negocio.
// Todo lo visual de "qué dice" la app sale de este archivo.
// (Colores y tipografía se cambian en globals.css — ver PERSONALIZACION.md)
// =============================================================================

export const site = {
  // Nombre del gimnasio (aparece en el encabezado y el login)
  name: "Gimnasio",
  // Nombre corto (para la app instalada / PWA)
  shortName: "Reservas",

  // Frase de bienvenida en el login
  tagline: "Reservá tus clases de Muay Thai, MMA y Boxeo",

  // Logo: si dejás logoUrl vacío, se muestra el emoji.
  // Para usar tu logo, poné la imagen en /public (ej: "/logo.png") y su ruta acá.
  logoEmoji: "🥊",
  logoUrl: "" as string,

  // Disciplinas que se dictan (solo texto/marketing)
  disciplines: ["Muay Thai", "MMA", "Boxeo"],

  // Datos de contacto (se usan en pie de página / futuros formularios)
  contact: {
    whatsapp: "",   // ej: "+54 9 351 123 4567"
    instagram: "",  // ej: "@tugimnasio"
    address: "",    // ej: "Av. Siempre Viva 123"
    email: "",
  },
} as const;

export type Site = typeof site;
