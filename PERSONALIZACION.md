# 🎨 Guía de personalización

Todo lo visual se cambia desde **pocos archivos**. No hace falta tocar el resto del proyecto.

---

## 1. Nombre, textos y datos del negocio
📄 **`src/config/site.ts`**

| Querés cambiar… | Campo |
|---|---|
| Nombre del gimnasio | `name` |
| Nombre corto (app instalada) | `shortName` |
| Frase del login | `tagline` |
| Logo (emoji o imagen) | `logoEmoji` / `logoUrl` |
| Disciplinas | `disciplines` |
| WhatsApp / Instagram / dirección / email | `contact` |

Se actualiza en toda la app automáticamente (encabezados, login, notificaciones, PWA).

---

## 2. Colores y paleta
📄 **`src/app/globals.css`** (bloque de arriba, marcado con 🎨)

| Querés cambiar… | Variable |
|---|---|
| **Color principal de la marca** | `--color-brand-500` (y `-600` hover, `-700` activo) |
| Fondo general | `--bg` (claro) / `.dark --bg` (oscuro) |
| Color de tarjetas | `--surface` |
| Texto principal / secundario | `--text` / `--muted` |
| Bordes | `--border` |
| Redondeo de las tarjetas | `--radius` |

Hay dos bloques: `:root` (modo claro) y `.dark` (modo oscuro). Cambiá ambos si querés.

**Tip:** para una paleta nueva, buscá tu color en [uicolors.app](https://uicolors.app), copiá los tonos 500/600/700 y pegalos en `--color-brand-*`.

---

## 3. Tipografía (fuente)
📄 **`src/app/layout.tsx`** (línea del `import`)

```ts
import { Inter } from "next/font/google";
const appFont = Inter({ subsets: ["latin"], variable: "--font-app", display: "swap" });
```

Cambiá `Inter` por cualquier fuente de Google Fonts (ej: `Poppins`, `Montserrat`, `Roboto`)
en **las dos** apariciones de esa línea. Es lo único que hay que tocar.

---

## 4. Logo e ícono de la app
- **Logo en la interfaz:** poné tu imagen en `public/` (ej. `public/logo.png`) y cargá la
  ruta en `site.logoUrl`. Si lo dejás vacío, se usa el emoji de `logoEmoji`.
- **Ícono de la PWA (pantalla de inicio):** reemplazá los archivos
  `public/icons/icon-192.png` y `public/icons/icon-512.png` por tu logo (mismos nombres y tamaños).
  El `public/icons/icon.svg` es la versión vectorial.

---

## 5. Fotos de productos y clases (desde el panel, sin código)
- **Recompensas:** Panel admin → Recompensas → foto por URL.
- **Tipos de clase (color en el calendario):** Panel admin → Horarios → Tipos de clase → color.
- **Fotos de perfil de alumnos:** vienen automáticamente de su cuenta de Google.

> Para subir imágenes propias (en vez de pegar URLs), se puede activar **Supabase Storage**
> más adelante — queda como mejora opcional.

---

## 6. Componentes visuales reutilizables
Si querés ajustar el estilo de un elemento en toda la app, están centralizados en:

| Elemento | Archivo |
|---|---|
| Tarjetas de métricas (dashboard) | `src/components/ui/stat-card.tsx` |
| Ventanas emergentes (formularios admin) | `src/components/ui/modal.tsx` |
| Logo | `src/components/logo.tsx` |
| Barra inferior de navegación (alumno) | `src/components/bottom-nav.tsx` |
| Clase `.card` (borde/fondo/redondeo) | `src/app/globals.css` |
