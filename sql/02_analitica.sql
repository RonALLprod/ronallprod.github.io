-- 02 · ANALÍTICA PÚBLICA (visitas, presencia y actividad por beat).
-- Ejecutar en el proyecto público S.supabase de config/site-config.js; no en privateSupabase.
-- Privacidad: NO se guarda IP, nombre ni correo. Solo un id aleatorio por navegador, dispositivo,
-- zona horaria (para estimar el país), idioma y de qué sitio llegó la visita.
create extension if not exists pgcrypto;

create table if not exists public.ron_admin_cfg(id int primary key default 1 check(id=1), pass_hash text not null);
alter table public.ron_admin_cfg enable row level security;
create or replace function public.ron_admin_ok(p text) returns boolean language sql security definer set search_path=public,extensions as
$$ select exists(select 1 from public.ron_admin_cfg c where c.pass_hash = crypt(coalesce(p,''), c.pass_hash)) $$;
revoke all on function public.ron_admin_ok(text) from public,anon,authenticated;

create table if not exists public.ron_eventos(
 id bigserial primary key,
 created_at timestamptz not null default now(),
 sid text not null, sess text not null,
 ev text not null check(ev in('view','beat','play','cart','buy','share','wa')),
 beat_id text, lic text, path text, ref text, dev text, tz text, lang text);
alter table public.ron_eventos enable row level security;
create index if not exists ron_eventos_t on public.ron_eventos(created_at desc);
create index if not exists ron_eventos_b on public.ron_eventos(beat_id,ev,created_at desc);
create index if not exists ron_eventos_s on public.ron_eventos(sid,created_at);

create table if not exists public.ron_presencia(
 sess text primary key, sid text not null,
 first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
 path text, beat_id text, dev text, tz text);
alter table public.ron_presencia enable row level security;
create index if not exists ron_presencia_t on public.ron_presencia(last_seen desc);

create or replace function public.ron_track(
 p_sess text, p_sid text, p_ev text, p_beat text default null, p_lic text default null,
 p_path text default null, p_ref text default null, p_dev text default null, p_tz text default null, p_lang text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_dev text; v_lic text; v_new boolean;
begin
 if p_sess is null or p_sid is null or length(p_sess) not between 8 and 40 or length(p_sid) not between 8 and 40 then return; end if;
 if p_ev is null or p_ev not in('hb','view','beat','play','cart','buy','share','wa') then return; end if;
 if (select count(*) from ron_eventos where sess=p_sess and created_at>now()-interval '1 minute')>=90 then return; end if;
 if (select count(*) from ron_eventos where created_at>now()-interval '1 minute')>=3000 then return; end if;
 v_dev:=case when p_dev in('movil','tablet','pc') then p_dev else null end;
 v_lic:=case when p_lic in('basic','premium','unlimited','exclusive') then p_lic else null end;
 v_new:=not exists(select 1 from ron_presencia where sess=p_sess);
 if v_new and (select count(*) from ron_presencia where last_seen>now()-interval '1 day')>=20000 then return; end if;
 insert into ron_presencia(sess,sid,path,beat_id,dev,tz)
 values(p_sess,p_sid,left(p_path,120),left(p_beat,80),v_dev,left(p_tz,60))
 on conflict(sess) do update set last_seen=now(),path=coalesce(excluded.path,ron_presencia.path),beat_id=excluded.beat_id,dev=coalesce(excluded.dev,ron_presencia.dev);
 if p_ev<>'hb' then
  insert into ron_eventos(sid,sess,ev,beat_id,lic,path,ref,dev,tz,lang)
  values(p_sid,p_sess,p_ev,left(p_beat,80),v_lic,left(p_path,120),left(lower(p_ref),80),v_dev,left(p_tz,60),left(p_lang,12));
 end if;
 if random()<0.01 then
  delete from ron_presencia where last_seen<now()-interval '1 day';
  delete from ron_eventos where created_at<now()-interval '400 days';
 end if;
end $$;
revoke all on function public.ron_track(text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.ron_track(text,text,text,text,text,text,text,text,text,text) to anon;

create or replace function public.ron_kpi(p_desde timestamptz) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object(
 'visitantes',count(distinct sid), 'sesiones',count(distinct sess),
 'vistas',count(*) filter(where ev='view'),
 'escuchas',count(distinct sid) filter(where ev='play'), 'plays',count(*) filter(where ev='play'),
 'carrito',count(*) filter(where ev='cart'),
 'compras',count(*) filter(where ev='buy'), 'compradores',count(distinct sid) filter(where ev='buy'),
 'whatsapp',count(*) filter(where ev='wa'), 'compartidos',count(*) filter(where ev='share'))
 from ron_eventos where created_at>=p_desde $$;
revoke all on function public.ron_kpi(timestamptz) from public,anon,authenticated;

create or replace function public.admin_analitica(p_pass text, p_dias int default 30) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d int; tzn constant text:='America/Bogota'; desde timestamptz; hoy timestamptz; sem timestamptz; r jsonb;
begin
 if not ron_admin_ok(p_pass) then raise exception 'no'; end if;
 d:=least(greatest(coalesce(p_dias,30),1),365);
 hoy:=date_trunc('day',now() at time zone tzn) at time zone tzn;
 desde:=(date_trunc('day',now() at time zone tzn)-make_interval(days=>d-1)) at time zone tzn;
 sem:=(date_trunc('day',now() at time zone tzn)-make_interval(days=>6)) at time zone tzn;
 r:=jsonb_build_object(
 'generado',now(), 'dias',d,
 'en_linea',(select count(*) from ron_presencia where last_seen>now()-interval '90 seconds'),
 'online',(select coalesce(jsonb_agg(jsonb_build_object('path',path,'beat',beat_id,'dev',dev,'tz',tz,'desde',first_seen,'ultimo',last_seen) order by last_seen desc),'[]'::jsonb)
           from (select * from ron_presencia where last_seen>now()-interval '90 seconds' order by last_seen desc limit 100) x),
 'hoy',ron_kpi(hoy), 'semana',ron_kpi(sem), 'rango',ron_kpi(desde),
 'nuevos_recurrentes',(select jsonb_build_object('nuevos',count(*) filter(where s.pri>=desde),'recurrentes',count(*) filter(where s.pri<desde))
    from (select distinct sid from ron_eventos where created_at>=desde) r2 join (select sid,min(created_at) pri from ron_eventos group by sid) s using(sid)),
 'por_beat',(select coalesce(jsonb_agg(x order by (x->>'compras')::int desc,(x->>'plays')::int desc,(x->>'vistas')::int desc),'[]'::jsonb) from (
    select jsonb_build_object('beat',beat_id,'vistas',count(*) filter(where ev='beat'),'visitantes',count(distinct sid) filter(where ev in('beat','play')),
      'plays',count(*) filter(where ev='play'),'oyentes',count(distinct sid) filter(where ev='play'),'carrito',count(*) filter(where ev='cart'),
      'compras',count(*) filter(where ev='buy'),'compartidos',count(*) filter(where ev='share'),'ultimo',max(created_at)) x
    from ron_eventos where created_at>=desde and beat_id is not null group by beat_id) t),
 'serie',(select coalesce(jsonb_agg(jsonb_build_object('dia',to_char(g.dia,'YYYY-MM-DD'),'visitantes',coalesce(e.v,0),'plays',coalesce(e.p,0),'compras',coalesce(e.c,0)) order by g.dia),'[]'::jsonb)
    from (select generate_series((desde at time zone tzn)::date,(now() at time zone tzn)::date,interval '1 day')::date dia) g
    left join (select (created_at at time zone tzn)::date dia,count(distinct sid) v,count(*) filter(where ev='play') p,count(*) filter(where ev='buy') c
               from ron_eventos where created_at>=desde group by 1) e on e.dia=g.dia),
 'horas',(select coalesce(jsonb_agg(coalesce(e.c,0) order by h.hora),'[]'::jsonb) from generate_series(0,23) as h(hora)
    left join (select extract(hour from created_at at time zone tzn)::int hh,count(*) c from ron_eventos where ev='view' and created_at>=desde group by 1) e on e.hh=h.hora),
 'origen',(select coalesce(jsonb_agg(jsonb_build_object('ref',ref,'n',n) order by n desc),'[]'::jsonb) from (
    select coalesce(nullif(ref,''),'directo') ref,count(distinct sess) n from ron_eventos where ev='view' and created_at>=desde group by 1 order by n desc limit 10) t),
 'dispositivos',(select coalesce(jsonb_agg(jsonb_build_object('dev',dev,'n',n) order by n desc),'[]'::jsonb) from (
    select coalesce(dev,'otro') dev,count(distinct sess) n from ron_eventos where ev='view' and created_at>=desde group by 1) t),
 'zonas',(select coalesce(jsonb_agg(jsonb_build_object('tz',tz,'n',n) order by n desc),'[]'::jsonb) from (
    select coalesce(nullif(tz,''),'desconocida') tz,count(distinct sid) n from ron_eventos where ev='view' and created_at>=desde group by 1 order by n desc limit 12) t),
 'licencias',(select coalesce(jsonb_agg(jsonb_build_object('lic',lic,'carrito',c,'compras',b) order by b desc,c desc),'[]'::jsonb) from (
    select lic,count(*) filter(where ev='cart') c,count(*) filter(where ev='buy') b from ron_eventos where created_at>=desde and lic is not null group by lic) t),
 'recientes',(select coalesce(jsonb_agg(jsonb_build_object('t',created_at,'ev',ev,'beat',beat_id,'lic',lic,'dev',dev,'tz',tz) order by created_at desc),'[]'::jsonb)
    from (select * from ron_eventos order by created_at desc limit 40) x),
 'total_eventos',(select count(*) from ron_eventos),
 'primer_evento',(select min(created_at) from ron_eventos));
 return r;
end $$;
revoke all on function public.admin_analitica(text,int) from public;
grant execute on function public.admin_analitica(text,int) to anon;

-- PASO FINAL (solo si aún no lo hiciste con 01_ventas.sql): define tu clave de administrador, una sola vez.
-- insert into public.ron_admin_cfg(id,pass_hash) values(1, extensions.crypt('TU_CLAVE', extensions.gen_salt('bf'))) on conflict(id) do update set pass_hash=excluded.pass_hash;


-- Refresca el caché de funciones de PostgREST para que el panel vea la RPC recién instalada.
notify pgrst, 'reload schema';
