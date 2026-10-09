-- Las columnas de carteles se crearon NOT NULL, pero la web ya trata
-- imagen_url/fecha_inicio/fecha_fin como opcionales. Alinear el esquema.
alter table public.carteles alter column imagen_url   drop not null;
alter table public.carteles alter column fecha_inicio drop not null;
alter table public.carteles alter column fecha_fin    drop not null;
