# 🥊 Sistema de Clases y Reservas

Web app de reservas para gimnasio de artes marciales (Muay Thai · MMA · Boxeo).
Next.js 15 + Supabase (PostgreSQL) + Tailwind. Mobile-first, PWA, tiempo real.

Ver arquitectura completa en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Puesta en marcha

### 1. Supabase
1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Instalá la CLI y linkeá:
   ```bash
   npx supabase login
   npx supabase link --project-ref TU_REF
   npx supabase db push          # aplica migraciones de supabase/migrations
   ```
   (o en desarrollo local: `npx supabase start && npx supabase db reset`)
3. **Auth → Providers → Google:** activalo. En Google Cloud Console creá credenciales
   OAuth y agregá como redirect URI: `https://TU_REF.supabase.co/auth/v1/callback`.

### 2. Variables de entorno
```bash
cp .env.example .env.local   # completá con tus claves de Supabase
```

### 3. Correr
```bash
npm install
npm run dev
```

### 4. Notificaciones push (opcional, gratis)
```bash
npm run gen:vapid           # generá las claves y pegalas en .env.local
```
Luego, en el panel admin (desde tu celular, con la PWA instalada), tocá la 🔔 para
activar las notificaciones. Recibirás un aviso ante cada reserva, cambio, cancelación,
nuevo alumno o solicitud de contacto — tocás la notificación y entrás directo al panel.
En Vercel, agregá `CRON_SECRET` (respaldo del cron cada minuto para eventos de la BD).

### 5. Convertirte en admin
Registrate con Google en la app, luego en el SQL editor de Supabase:
```sql
update profiles set role='admin' where email='TU_EMAIL@gmail.com';
```

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Base de datos, RPC, RLS, arquitectura | ✅ |
| 1 | Auth Google, shell, PWA, dark/light | ✅ |
| 2 | Dashboard alumno, calendario tiempo real, reservar/cancelar/cambiar | ✅ |
| 3 | QR (mostrar + escanear), asistencia, puntos, canjes | ✅ |
| 4 | CRUD admin: horarios, paquetes, recompensas, generar sesiones, bloquear/cupos | ✅ |
| 5 | Notificaciones push (PWA) al admin — gratis, sin terceros | ✅ |

El circuito completo funciona de punta a punta: el admin crea tipos/horarios → genera
sesiones → carga paquetes y recompensas; el alumno reserva → muestra QR → el admin escanea
→ asistencia + punto → canje. Las fotos de recompensas se cargan por URL (subida a Supabase
Storage queda como mejora opcional).
