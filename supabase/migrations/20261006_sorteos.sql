-- ─────────────────────────────────────────────────────────────────────────────
-- Sorteo semanal del premio (Lío Music Pub, El Bonillo)
-- Ejecutar UNA vez en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sorteos (
  id                 uuid primary key default gen_random_uuid(),
  -- Semana de concurso con el formato de la app: '2026-W41'.
  semana             text not null check (semana ~ '^\d{4}-W\d{2}$'),
  -- Si se borra la foto ganadora desde el admin, el registro del sorteo se
  -- conserva (con el hash como prueba) y este campo queda a null.
  foto_ganadora_id   uuid references public.fotos (id) on delete set null,
  -- Participaciones que entraron en el bombo (una por persona).
  participantes      integer not null check (participantes > 0),
  -- SHA-256 (hex) de los ids de foto participantes, ordenados y unidos por '\n':
  -- prueba de que la lista no se cambió después.
  participantes_hash text not null check (participantes_hash ~ '^[0-9a-f]{64}$'),
  realizado_at       timestamptz not null default now(),
  anulado            boolean not null default false,
  motivo_anulacion   text,
  anulado_at         timestamptz,
  -- Para anular hay que dar un motivo.
  constraint sorteos_motivo_si_anulado
    check (not anulado or length(btrim(coalesce(motivo_anulacion, ''))) > 0)
);

-- Un único sorteo VÁLIDO por semana. Es un índice único parcial (y no un
-- UNIQUE sobre `semana`) para que, tras anular uno, se pueda repetir esa semana
-- conservando el anulado como histórico. También impide que dos peticiones a
-- la vez creen dos sorteos válidos.
create unique index if not exists sorteos_semana_valido_uniq
  on public.sorteos (semana)
  where not anulado;

create index if not exists sorteos_semana_idx on public.sorteos (semana);

-- RLS: lectura pública (la web muestra cuántas personas participaron);
-- escritura solo con la service role (el endpoint /api/admin/sorteo).
alter table public.sorteos enable row level security;

drop policy if exists "sorteos: lectura publica" on public.sorteos;
create policy "sorteos: lectura publica"
  on public.sorteos for select
  to anon, authenticated
  using (true);
