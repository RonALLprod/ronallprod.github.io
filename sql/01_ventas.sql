-- 01 · VENTAS Y PEDIDOS (nuevo). No toca admin_listar / admin_set / admin_ip ni pedir_acceso.
-- Despliegue: Supabase > SQL Editor > pegar todo > Run. Después ejecuta el PASO FINAL (clave del panel).
create extension if not exists pgcrypto;

-- Clave del panel para las funciones NUEVAS (no pude ver cómo validan tus funciones admin_* actuales,
-- por eso estas usan su propio hash; usa la misma clave que ya usas en el panel).
create table if not exists public.ron_admin_cfg(id int primary key default 1 check(id=1), pass_hash text not null);
alter table public.ron_admin_cfg enable row level security;   -- sin políticas = nadie accede directo
create or replace function public.ron_admin_ok(p text) returns boolean language sql security definer set search_path=public,extensions as
$$ select exists(select 1 from public.ron_admin_cfg c where c.pass_hash = crypt(coalesce(p,''), c.pass_hash)) $$;
revoke all on function public.ron_admin_ok(text) from public,anon,authenticated;

create table if not exists public.ventas(
 id bigserial primary key, code text not null, purchase_id text unique not null,
 buyer_name text not null, buyer_email text not null,
 beat_id text not null, beat_name text not null, beat_slug text not null,
 license text not null check(license in('basic','premium','unlimited','exclusive')),
 price numeric(10,2) not null check(price>=0), currency text not null default 'USD',
 terms jsonb not null,                       -- copia EXACTA de los términos aceptados
 status text not null default 'pendiente' check(status in('pendiente','pagado','entregado','cancelado')),
 pdf_at timestamptz, history jsonb not null default '[]'::jsonb, created_at timestamptz not null default now());
alter table public.ventas enable row level security;   -- sin políticas: solo vía funciones security definer
create index if not exists ventas_beat on public.ventas(beat_id,license,status);

-- Público: crear pedido PENDIENTE (nunca pagado)
create or replace function public.crear_pedido(p_nombre text,p_email text,p_items jsonb,p_moneda text default 'USD')
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare it jsonb; v_code text; n int:=0; v_id text;
begin
 if length(trim(coalesce(p_nombre,'')))<2 or length(p_nombre)>120 then raise exception 'nombre'; end if;
 if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email)>200 then raise exception 'email'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'items'; end if;
 if (select count(*) from ventas where lower(buyer_email)=lower(p_email) and status='pendiente' and created_at>now()-interval '1 day')>20 then raise exception 'limite'; end if;
 v_code:='RP-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(3),'hex'),1,5));
 for it in select * from jsonb_array_elements(p_items) loop
  n:=n+1; v_id:=v_code||'-'||n;
  if (it->>'license') not in('basic','premium','unlimited','exclusive') then raise exception 'licencia'; end if;
  if (it->>'license')='exclusive' and exists(select 1 from ventas where beat_id=it->>'beat_id' and license='exclusive' and status in('pagado','entregado')) then raise exception 'exclusive_vendido'; end if;
  insert into ventas(code,purchase_id,buyer_name,buyer_email,beat_id,beat_name,beat_slug,license,price,currency,terms,history)
  values(v_code,v_id,trim(p_nombre),trim(p_email),left(it->>'beat_id',80),left(it->>'beat_name',160),left(it->>'beat_slug',80),it->>'license',(it->>'price')::numeric,left(p_moneda,3),coalesce(it->'terms','{}'::jsonb),
   jsonb_build_array(jsonb_build_object('status','pendiente','at',now())));
 end loop;
 return jsonb_build_object('code',v_code);
end $$;
grant execute on function public.crear_pedido(text,text,jsonb,text) to anon;

-- Público: IDs de beats con EXCLUSIVE ya vendido (para bloquear nuevas ventas en la web)
create or replace function public.exclusivos_vendidos() returns jsonb language sql security definer set search_path=public as
$$ select coalesce(jsonb_agg(distinct beat_id),'[]'::jsonb) from ventas where license='exclusive' and status in('pagado','entregado') $$;
grant execute on function public.exclusivos_vendidos() to anon;

-- Admin
create or replace function public.admin_ventas_listar(p_pass text) returns setof public.ventas language plpgsql security definer set search_path=public as
$$ begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if; return query select * from ventas order by created_at desc limit 500; end $$;
create or replace function public.admin_venta_set(p_pass text,p_id bigint,p_status text) returns void language plpgsql security definer set search_path=public as
$$ begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if;
 if p_status not in('pendiente','pagado','entregado','cancelado') then raise exception 'estado'; end if;
 update ventas set status=p_status, history=history||jsonb_build_object('status',p_status,'at',now()) where id=p_id; end $$;
create or replace function public.admin_venta_pdf(p_pass text,p_id bigint) returns void language plpgsql security definer set search_path=public as
$$ begin if not ron_admin_ok(p_pass) then raise exception 'no'; end if; update ventas set pdf_at=now() where id=p_id; end $$;
grant execute on function public.admin_ventas_listar(text),public.admin_venta_set(text,bigint,text),public.admin_venta_pdf(text,bigint) to anon;

-- PASO FINAL (ejecutar UNA vez, cambiando TU_CLAVE por tu clave de administrador):
-- insert into public.ron_admin_cfg(id,pass_hash) values(1, crypt('TU_CLAVE', gen_salt('bf'))) on conflict(id) do update set pass_hash=excluded.pass_hash;
