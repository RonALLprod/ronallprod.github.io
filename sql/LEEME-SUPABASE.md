# Despliegue Supabase de RONALL PROD

El sitio utiliza **dos proyectos** y el código los separa deliberadamente. No pegues todos los SQL en el mismo proyecto.

## 1. Proyecto privado (`privateSupabase` en `config/site-config.js`)

Este proyecto conserva el catálogo por invitación, la clave AES que abre los archivos `.bin`, el control de usuarios y las métricas internas de cada beat. Ejecuta aquí:

- `00_base_acceso.sql`
- Si vas a revisar permisos, `00_auditoria_rls.sql` también se ejecuta aquí.

En el paso final de `00_base_acceso.sql`, configura la clave de administrador que ya utilizas en el panel. **No generes ni reemplaces la clave AES de `ron_secret`** si tus `.bin` existentes ya están cifrados: la fila existente se conserva por `ON CONFLICT DO NOTHING`.

## 2. Proyecto público/tienda (`supabase` en `config/site-config.js`)

Este proyecto registra visitas, presencia en línea, reproducciones de previews públicos y pedidos. Ejecuta aquí, en este orden:

- `01_ventas.sql`
- `02_analitica.sql`

En el paso final de `01_ventas.sql`, configura **la misma clave de administrador** que utilizaste en el proyecto privado. `02_analitica.sql` reutiliza esa configuración.

## 3. Panel

El panel enruta automáticamente las llamadas: `admin_listar/admin_set/admin_ip` y `beat_stats` van al proyecto privado; ventas y `admin_analitica` van al proyecto público. La clave de administrador se comprueba en ambos proyectos, por eso debe coincidir.

Para comprobar las estadísticas públicas, abre el catálogo publicado desde otro dispositivo o una ventana privada. El navegador utilizado como panel se excluye por defecto y no se contará como visitante hasta que se habilite manualmente. La presencia se considera activa durante 90 segundos y se renueva con un heartbeat cada 20 segundos.

Si el panel muestra que no encuentra `admin_analitica`, vuelve a ejecutar `02_analitica.sql` en el proyecto público y espera a que PostgREST recargue el esquema. Si el catálogo privado no reproduce `.bin`, comprueba que `privateSupabase` sigue apuntando al proyecto que contiene su `ron_secret.aes_key_b64`; no sustituyas esa clave por una nueva.
