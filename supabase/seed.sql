-- =============================================================================
-- SEED — datos de ejemplo para desarrollo.
-- Correr con: supabase db reset  (aplica migraciones + seed)
-- =============================================================================

-- Tipos de clase
insert into class_types (id, name, color) values
  ('11111111-1111-1111-1111-111111111111', 'Muay Thai', '#ef4444'),
  ('22222222-2222-2222-2222-222222222222', 'MMA',       '#3b82f6'),
  ('33333333-3333-3333-3333-333333333333', 'Boxeo',     '#f59e0b');

-- Horarios recurrentes (weekday: 0=dom … 6=sáb)
insert into schedules (class_type_id, weekday, start_time, end_time, capacity) values
  ('11111111-1111-1111-1111-111111111111', 1, '19:00', '20:00', 12), -- Lun Muay Thai
  ('11111111-1111-1111-1111-111111111111', 3, '19:00', '20:00', 12), -- Mié Muay Thai
  ('22222222-2222-2222-2222-222222222222', 2, '20:00', '21:00', 10), -- Mar MMA
  ('22222222-2222-2222-2222-222222222222', 4, '20:00', '21:00', 10), -- Jue MMA
  ('33333333-3333-3333-3333-333333333333', 5, '18:00', '19:00', 15), -- Vie Boxeo
  ('33333333-3333-3333-3333-333333333333', 6, '10:00', '11:00', 15); -- Sáb Boxeo

-- Genera sesiones concretas para los próximos 21 días a partir de los horarios
insert into class_sessions (schedule_id, class_type_id, session_date, start_time, end_time, capacity)
select s.id, s.class_type_id, d::date, s.start_time, s.end_time, s.capacity
from schedules s
cross join generate_series(current_date, current_date + 21, interval '1 day') as d
where extract(dow from d) = s.weekday
on conflict (schedule_id, session_date) do nothing;

-- Paquetes (2–24 clases)
insert into packages (name, modality, classes_count, price, validity_days) values
  ('Flex 10',        'flexible',   10, 25000, 30),
  ('Flex 15',        'flexible',   15, 33000, 30),
  ('Flex 20',        'flexible',   20, 40000, 30),
  ('Flex 24',        'flexible',   24, 45000, 30),
  ('Fijo 2 días',    'fixed_days',  8, 20000, 30),
  ('Fijo 3 días',    'fixed_days', 12, 28000, 30);

-- Recompensas
insert into rewards (name, description, points_cost, stock) values
  ('Botella Gimnasio', 'Botella deportiva 750ml',        8, 20),
  ('Remera',           'Remera de algodón con logo',    15, 15),
  ('Guantes',          'Guantes de boxeo 12oz',         40, 5),
  ('Toalla',           'Toalla de microfibra',          10, 25),
  ('Shorts',           'Shorts de Muay Thai',           35, 8),
  ('Protector bucal',  'Protector bucal moldeable',      6, 30);

-- NOTA: para probar como admin, registrate con Google y luego ejecutá:
--   update profiles set role='admin' where email='TU_EMAIL@gmail.com';
