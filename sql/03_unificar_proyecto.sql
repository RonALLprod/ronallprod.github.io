-- ============================================================
-- UNIFICAR: catálogo privado en el proyecto de la tienda (kwmofbiiwvpojtkvlmxz)
-- Ejecuta en: Supabase → SQL Editor, en ESE proyecto. Hazlo ANTES de subir site-config.js a GitHub.
-- ============================================================

-- PASO 0 (solo lectura): comprueba que existen las funciones del catálogo privado.
-- Deben salir 5 filas: admin_ip, admin_listar, admin_set, pedir_acceso, track.
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('pedir_acceso','track','admin_listar','admin_set','admin_ip')
order by 1;
-- Si salen menos de 5, ejecuta antes sql/00_base_acceso.sql completo (NO toca ron_secret si ya existe).

-- PASO 1: pon la clave AES VIEJA (la que cifró tus .bin) en lugar de la nueva.
-- Reemplaza PEGA_AQUI_LA_CLAVE_VIEJA por la clave (sin comillas extra, sin espacios, sin saltos de línea).
-- Antes confirma con tools/verificar-clave.py que esa clave abre tus .bin.
update public.ron_secret
set aes_key_b64 = 'PEGA_AQUI_LA_CLAVE_VIEJA'
where id = 1;

-- PASO 2 (solo lectura): comprueba el tamaño. Debe decir 32 (bytes).
select octet_length(decode(aes_key_b64,'base64')) as bytes_de_la_clave from public.ron_secret where id=1;

-- PASO 3: clave de administrador del panel. Solo si aún no la pusiste en este proyecto
-- (revisa: select count(*) from public.ron_admin_cfg;  → 1 = ya está). Usa LA MISMA que usas en el panel.
-- insert into public.ron_admin_cfg(id,pass_hash) values(1, extensions.crypt('TU_CLAVE', extensions.gen_salt('bf')))
--   on conflict(id) do update set pass_hash=excluded.pass_hash;
