# Sistema de Clases y Reservas — Arquitectura Técnica

Plataforma de reservas para gimnasio de artes marciales (Muay Thai, MMA, Boxeo).
Dos roles: **alumno** y **administrador**. Diseño premium, mobile-first, tiempo real.

---

## 1. Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4 + tokens propios (dark/light) |
| Backend | Supabase: PostgreSQL + Auth + Realtime + Storage |
| Auth | Google OAuth (único método) vía Supabase Auth |
| Tiempo real | Supabase Realtime (cupos, calendario) |
| Notificaciones | `NotificationService` → WhatsApp (Meta Cloud API / Twilio) |
| QR | `qrcode` (generación) + `html5-qrcode` (escaneo admin) + validación server (RPC) |
| PWA | manifest + service worker (instalable, offline básico) |
| Deploy | Vercel (app) + Supabase (datos) |

**Por qué Supabase y no Firebase:** el dominio es fuertemente relacional (paquetes ↔ compras ↔ reservas ↔ sesiones) y necesita **transacciones con bloqueo de fila** para evitar sobrecupo. Postgres + RPC `SECURITY DEFINER` lo resuelve de forma sólida; Firestore no da ese control transaccional con la misma naturalidad.

---

## 2. Modelo de datos (resumen)

Ver `supabase/migrations/`. Tablas núcleo:

- **profiles** — 1:1 con `auth.users`, incluye `role`.
- **class_types** — Muay Thai / MMA / Boxeo.
- **schedules** — plantilla recurrente (día de semana + hora + capacidad).
- **class_sessions** — instancia concreta por fecha (lo que se reserva). Cupo por sesión.
- **packages** — catálogo (2–24 clases, modalidad flexible/días fijos).
- **package_purchases** — asignación manual a un alumno (vence, días permitidos).
- **bookings** — reserva; consume 1 crédito mientras esté activa.
- **qr_tokens** — 1 por reserva, un solo uso, ventana de validez.
- **attendances** — asistencia registrada al escanear QR.
- **points_ledger** — libro mayor de puntos (balance = suma).
- **rewards / redemptions** — recompensas y canjes.
- **promotions**, **notifications**, **settings**, **audit_logs**.

Vistas: `session_availability` (cupos en vivo), `points_balance`, `purchase_remaining`.

### Reglas de negocio críticas (en la base, no solo en el front)
- **Anti-doble-reserva:** `book_session()` hace `SELECT … FOR UPDATE` sobre la sesión + índice único parcial `(session_id, profile_id)`.
- **Antelación 24 h:** validada en `book_session()` contra `settings.booking_min_hours_ahead`.
- **Vencimiento 30 días (flexible):** `expires_at` en la compra.
- **Días fijos:** `allowed_weekdays` valida el día de la sesión.
- **QR un solo uso:** `UPDATE … WHERE status='valid'` atómico en `checkin_qr()`.
- **Cambio de horario atómico:** `reschedule_booking()` cancela + reserva en la misma transacción.

---

## 3. Flujos de usuario

### Alumno
1. Login con Google → se crea `profile` (trigger) → notificación `new_user`.
2. Dashboard: perfil, clases restantes, vencimiento, próxima clase, puntos, recompensas, historiales.
3. Calendario → elige sesión con cupo → `book_session()` → QR generado.
4. Cambio de horario → `reschedule_booking()` → WhatsApp al admin.
5. Día de la clase → muestra QR → admin escanea → asistencia + 1 punto.
6. Canje de puntos → `redeem_reward()`.

### Admin
- Login con Google (rol `admin` asignado en `profiles`).
- Escáner QR (cámara) → `checkin_qr(token)`.
- CRUD de horarios, paquetes, recompensas, promociones.
- Carga manual de paquetes a alumnos.
- Reservas, asistencias, estadísticas, alumnos activos/inactivos, búsqueda, edición de perfiles.

---

## 4. Estructura de carpetas

```
src/
  app/
    (auth)/login/            # Google OAuth
    (student)/               # dashboard, calendario, reservas, puntos, recompensas
    (admin)/                 # panel: horarios, paquetes, alumnos, escáner, stats
    api/
      notifications/worker/  # procesa cola WhatsApp (cron)
    auth/callback/           # OAuth callback
  components/                # UI premium (shadcn-style)
  lib/
    supabase/                # client, server, admin
    notifications/           # NotificationService (abstracción WhatsApp)
    types/                   # tipos DB (regenerar con supabase gen types)
    utils.ts
  middleware.ts              # refresh de sesión + guard de rutas
supabase/migrations/         # 0001 schema, 0002 funciones, 0003 RLS
docs/
```

---

## 5. Seguridad
- **Google OAuth** único método (Supabase Auth).
- **RLS en todas las tablas**: alumno solo ve lo suyo; admin todo (`is_admin()`).
- **Escrituras sensibles solo por RPC** `SECURITY DEFINER` (no INSERT directo a bookings).
- **Anti-sobrecupo** y **QR un solo uso** garantizados en la capa de datos.
- **Rate limiting** en route handlers (middleware) para RPC y worker.
- **Auditoría** en `audit_logs`; **validación** con Zod en el borde.
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side.

---

## 6. Plan de desarrollo por fases

| Fase | Entregable | Estado |
|---|---|---|
| **0. Fundación** | Esquema BD + RPC + RLS + scaffold + docs | ✅ Hecho |
| **1. Auth & shell** | Google OAuth, middleware, layout, dark/light, PWA | ⬜ Siguiente |
| **2. Alumno** | Dashboard + calendario en tiempo real + reservar/cancelar/cambiar | ⬜ |
| **3. QR & puntos** | Generación QR, escáner admin, check-in, puntos, recompensas | ⬜ |
| **4. Admin** | CRUD horarios/paquetes/recompensas, alumnos, estadísticas | ⬜ |
| **5. Notificaciones** | Worker WhatsApp + proveedor elegido | ⬜ |
| **6. Pulido** | Animaciones, accesibilidad, tests, seed data | ⬜ |

---

## 7. Despliegue

1. Crear proyecto en **Supabase**; correr migraciones (`supabase db push`).
2. Activar **Google** en Auth → Providers; configurar OAuth en Google Cloud Console; añadir `.../auth/v1/callback` como redirect URI.
3. Asignar `role='admin'` a tu profile manualmente (SQL) una vez registrado.
4. **Vercel:** conectar el repo, cargar variables de `.env.example`.
5. Configurar **cron de Vercel** para `/api/notifications/worker` (cada 1 min).
6. Storage de Supabase para fotos de recompensas/promos.

---

## 8. Mejoras propuestas (automatizaciones)
- **Generación automática de sesiones** desde `schedules` (cron diario a 60 días vista) → el admin no crea sesiones a mano.
- **Recordatorio al alumno** por WhatsApp/push 2 h antes de la clase → menos ausencias.
- **Lista de espera**: si un cupo se libera, se ofrece automáticamente al primero en espera.
- **Auto-expiración** de paquetes vencidos (cron) → marca `status='expired'`.
- **Racha (streak)** de asistencia → gamificación extra sobre el sistema de puntos.
```
```
