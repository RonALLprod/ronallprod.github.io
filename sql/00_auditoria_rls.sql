-- 00 · AUDITORÍA (solo lectura). Ejecútalo en Supabase > SQL Editor y revisa los resultados.
-- No se asumió acceso a tu esquema: esto te muestra el estado real antes de tocar nada.
-- 1) ¿Qué tablas del esquema public tienen RLS activo?
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by 1;
-- 2) Políticas existentes. Ninguna política debe permitir SELECT público sobre tablas con usuarios, IPs o claves.
select schemaname, tablename, policyname, roles, cmd, qual from pg_policies where schemaname='public' order by 2,3;
-- 3) Funciones RPC expuestas al rol anónimo (aquí deben estar pedir_acceso, track, admin_*...)
select p.proname, p.prosecdef as security_definer, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
-- 4) Tablas legibles por anon (debería ser solo beat_stats, si acaso)
select table_name, privilege_type from information_schema.role_table_grants where grantee='anon' and table_schema='public' order by 1;
-- QUÉ BUSCAR: (a) la clave de descifrado del catálogo privado NO debe estar en ninguna tabla legible por anon;
-- solo debe salir de pedir_acceso() cuando el usuario está 'approved' y su IP no está bloqueada.
-- (b) admin_listar/admin_set/admin_ip deben validar p_pass dentro de la función.
