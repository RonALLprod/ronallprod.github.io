-- 00 · BASE (reconstrucción): acceso al catálogo privado, estadísticas y funciones del panel de usuarios.
-- Ejecútalo PRIMERO en Supabase > SQL Editor > New query > Run. Luego 01_ventas.sql y 02_analitica.sql.
-- Se puede ejecutar varias veces sin romper nada (no borra datos ni cambia la clave de cifrado si ya existe).
create extension if not exists pgcrypto;

-- Clave del panel (hash). Se define al final de este archivo.
create table if not exists public.ron_admin_cfg(id int primary key default 1 check(id=1), pass_hash text not null);
alter table public.ron_admin_cfg enable row level security;
create or replace function public.ron_admin_ok(p text) returns boolean language sql security definer set search_path=public,extensions as
$$ select exists(select 1 from public.ron_admin_cfg c where c.pass_hash = crypt(coalesce(p,''), c.pass_hash)) $$;
revoke all on function public.ron_admin_ok(text) from public,anon,authenticated;

-- Clave AES-256 (base64) con la que están cifrados los audios .bin del catálogo privado.
create table if not exists public.ron_secret(id int primary key default 1 check(id=1), aes_key_b64 text not null);
alter table public.ron_secret enable row level security;
-- Si NO tienes la clave anterior, se genera una nueva (entonces hay que volver a cifrar los audios: ver instrucciones).
insert into public.ron_secret(id,aes_key_b64) values(1, encode(extensions.gen_random_bytes(32),'base64')) on conflict(id) do nothing;

-- Usuarios que piden acceso (uno por navegador/token).
create table if not exists public.accesos(
 id bigserial primary key, token text unique not null, username text not null,
 status text not null default 'pending' check(status in('pending','approved','denied')),
 ip text, created_at timestamptz not null default now(), last_seen timestamptz not null default now());
alter table public.accesos enable row level security;
create index if not exists accesos_ip on public.accesos(ip);

-- Reglas por IP (aceptar / bloquear a todos los de una IP).
create table if not exists public.ips(ip text primary key, status text not null check(status in('approved','denied')), updated_at timestamptz not null default now());
alter table public.ips enable row level security;

-- Estadísticas globales por pista del catálogo privado (legibles públicamente, no contienen datos personales).
create table if not exists public.beat_stats(
 slug text primary key, plays bigint not null default 0, likes bigint not null default 0, shares bigint not null default 0,
 searches bigint not null default 0, listen_secs bigint not null default 0, skips bigint not null default 0, completes bigint not null default 0);
alter table public.beat_stats enable row level security;
drop policy if exists beat_stats_lectura on public.beat_stats;
create policy beat_stats_lectura on public.beat_stats for select to anon using(true);
grant select on public.beat_stats to anon;

-- IP del visitante (la pone el proxy de Supabase en la cabecera x-forwarded-for).
create or replace function public.ron_ip() returns text language plpgsql stable set search_path=public as $$
declare h json; v text;
begin
 begin h:=current_setting('request.headers',true)::json; exception when others then h:=null; end;
 v:=coalesce(h->>'cf-connecting-ip',split_part(coalesce(h->>'x-forwarded-for',''),',',1),'');
 return nullif(trim(v),'');
end $$;
revoke all on function public.ron_ip() from public,anon,authenticated;

-- Público: pedir acceso / consultar estado. Devuelve {status, key}. key solo si está aprobado y su IP no está bloqueada.
create or replace function public.pedir_acceso(p_token text, p_user text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_ip text:=ron_ip(); v_user text:=left(trim(coalesce(p_user,'')),24); a public.accesos; r text; v_key text;
begin
 if p_token is null or length(p_token) not between 16 and 64 then return jsonb_build_object('status','invalid'); end if;
 select * into a from accesos where token=p_token;
 if not found then
  if length(v_user)<2 or v_user ~ '[<>"''&]' then return jsonb_build_object('status','invalid'); end if;
  if v_ip is not null and (select count(*) from accesos where ip=v_ip and created_at>now()-interval '1 hour')>=10 then return jsonb_build_object('status','blocked'); end if;
  if (select count(*) from accesos where created_at>now()-interval '1 minute')>=60 then return jsonb_build_object('status','blocked'); end if;
  select status into r from ips where ip=v_ip;
  insert into accesos(token,username,status,ip) values(p_token,v_user,coalesce(r,'pending'),v_ip) returning * into a;
 else
  update accesos set last_seen=now(), ip=coalesce(v_ip,ip) where id=a.id returning * into a;
 end if;
 select status into r from ips where ip=a.ip;
 if r='denied' or a.status='denied' then return jsonb_build_object('status','denied'); end if;
 if a.status='approved' then
  select aes_key_b64 into v_key from ron_secret where id=1;
  return jsonb_build_object('status','approved','key',v_key);
 end if;
 return jsonb_build_object('status','pending');
end $$;
revoke all on function public.pedir_acceso(text,text) from public;
grant execute on function public.pedir_acceso(text,text) to anon;

-- Público: eventos de uso del catálogo privado (s=pista, v=reproducción, t=segundos, k=salto, c=completadas, l=like±1, sh=compartir, sr=abrió desde búsqueda).
create or replace function public.track(events jsonb) returns void language plpgsql security definer set search_path=public as $$
declare e jsonb; s text; t int; n int:=0;
begin
 if events is null or jsonb_typeof(events)<>'array' then return; end if;
 for e in select * from jsonb_array_elements(events) loop
  n:=n+1; exit when n>50;
  s:=left(e->>'s',80); continue when s is null or length(s)<1;
  insert into beat_stats(slug) values(s) on conflict do nothing;
  if (e->>'v')='1' then
   t:=least(greatest(coalesce((e->>'t')::int,0),0),600);
   update beat_stats set plays=plays+1, listen_secs=listen_secs+t,
     skips=skips+case when (e->>'k')='1' then 1 else 0 end,
     completes=completes+least(greatest(coalesce((e->>'c')::int,0),0),3) where slug=s;
  end if;
  if (e->>'l') in('1','-1') then update beat_stats set likes=greatest(0,likes+(e->>'l')::int) where slug=s; end if;
  if (e->>'sh')='1' then update beat_stats set shares=shares+1 where slug=s; end if;
  if (e->>'sr')='1' then update beat_stats set searches=searches+1 where slug=s; end if;
 end loop;
exception when others then return;
end $$;
revoke all on function public.track(jsonb) from public;
grant execute on function public.track(jsonb) to anon;

-- Admin (panel): listar, aprobar/rechazar/borrar, y reglas por IP. Todas validan la clave dentro de la función.
create or replace function public.admin_listar(p_pass text) returns setof public.accesos language plpgsql security definer set search_path=public as $$
begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if;
 return query select * from accesos order by (status='pending') desc, created_at desc limit 500; end $$;
create or replace function public.admin_set(p_pass text,p_id bigint,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if;
 if p_status='delete' then delete from accesos where id=p_id;
 elsif p_status in('pending','approved','denied') then update accesos set status=p_status where id=p_id;
 else raise exception 'estado'; end if; end $$;
create or replace function public.admin_ip(p_pass text,p_ip text,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if;
 if p_status not in('approved','denied') or coalesce(p_ip,'')='' then raise exception 'datos'; end if;
 insert into ips(ip,status) values(p_ip,p_status) on conflict(ip) do update set status=excluded.status,updated_at=now();
 update accesos set status=p_status where ip=p_ip; end $$;
revoke all on function public.admin_listar(text),public.admin_set(text,bigint,text),public.admin_ip(text,text,text) from public;
grant execute on function public.admin_listar(text),public.admin_set(text,bigint,text),public.admin_ip(text,text,text) to anon;

-- PASO FINAL 1: tu clave de administrador (cámbiala por la tuya; sin espacios raros). Ejecuta SOLO esta línea después.
-- insert into public.ron_admin_cfg(id,pass_hash) values(1, extensions.crypt('TU_CLAVE', extensions.gen_salt('bf'))) on conflict(id) do update set pass_hash=excluded.pass_hash;
-- PASO FINAL 2 (solo si tienes la clave AES anterior): pon aquí la antigua en base64 en vez de la nueva.
-- update public.ron_secret set aes_key_b64='AQUI_TU_CLAVE_ANTIGUA_BASE64' where id=1;
-- Ver la clave actual (para re-cifrar audios si hiciera falta):
-- select aes_key_b64 from public.ron_secret;
