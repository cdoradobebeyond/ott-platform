# Umbral OTT

Starter multi-cliente para Umbral OTT: portada editorial inspirada en apps de eventos en directo como OneToro, clientes web/Smart TV, cliente nativo compartido y panel editorial. La portada, búsqueda, acceso OAuth, carruseles y reproductor VdoCipher están implementados; las fichas marcadas como muestra y las métricas del panel siguen siendo datos demo. Las funciones Supabase contienen credenciales de subida, alta de títulos, OTP, heartbeats y control atómico de dispositivos.

## Arranque local

1. Instala Node.js 20+ y la CLI de Supabase.
2. Ejecuta `npm install` y copia `.env.example` a `.env.local`.
3. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`.
4. Ejecuta `npm run dev`.

La app abre en la experiencia cliente. El panel se abre desde el enlace **Panel editorial**. Para subir de verdad, inicia sesión con un usuario que tenga `app_metadata.role = "admin"`, configura los secrets y aplica la migración. El selector de vista del panel permite revisar su UI; no concede permisos al usuario.

Para empaquetar las apps TV web, ejecuta `npm run build:webos` o `npm run build:tizen`. El resultado se escribe en `clients/<target>/dist/`. Los proyectos Xcode/Gradle se generan desde `clients/native/`; consulta su README para prepararlos y ejecutarlos en dispositivos/emuladores compatibles.

## GitHub y compilaciones automáticas

El workflow `.github/workflows/build-clients.yml` compila la web, webOS y Tizen, además de Android, Android TV, iOS Simulator y tvOS Simulator en cada pull request y en pushes a `main`/`master`. También se puede lanzar manualmente desde Actions. Los APK y paquetes de simulador se descargan desde los artefactos de cada ejecución; los builds Apple no están firmados para App Store y los APK no están firmados para publicación.

En **Settings → Secrets and variables → Actions → Variables**, configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para que los clientes apunten al proyecto correcto. Son valores públicos. No guardes `VODOCIPHER_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, keystores ni certificados dentro del repositorio. Para distribuir en tiendas habrá que añadir por separado la firma y credenciales de publicación como GitHub Secrets.

Para subir este directorio como repositorio nuevo, crea un repositorio vacío en GitHub y ejecuta desde `ott-platform/`:

```sh
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git add .
git commit -m "Prepare OTT client builds"
git push -u origin main
```

La carpeta todavía no tiene remoto configurado: reemplaza la URL con la de tu repositorio antes de subir.

## Configurar Supabase

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set VODOCIPHER_API_SECRET=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... APP_ORIGIN=https://ott.example.com
supabase functions deploy upload-credentials
supabase functions deploy register-content
supabase functions deploy playback
supabase functions deploy release-playback
supabase functions deploy heartbeat-playback
```

Activa Google OAuth en Supabase Auth y define los redirect URLs para desarrollo y producción. Asigna `role: admin` en `app_metadata` solo a editores. Para cada usuario, los claims de servidor deben contener `customerType` (`particular` o `hosteleria`; se normalizará `hostelería`) y `deviceLimit` (entero positivo). Estos atributos deben escribirse en `app_metadata` desde un entorno confiable; nunca se aceptan desde `user_metadata` ni desde el navegador.

La clave API de VdoCipher y la service role key solo se configuran como secrets de Supabase. La función `upload-credentials` crea el recurso VdoCipher y firma la carga; el navegador transmite el archivo al `uploadLink` de S3 con los campos efímeros y después registra el ID. VdoCipher documenta un máximo de 5 GB para esta subida directa. Los vídeos permanecen `processing` hasta recibir/consultar su estado de transcodificación; un webhook de estado debe publicar contenido solo tras la confirmación `ready`.

## Política de sesiones

`playback` valida el access token mediante `auth.getUser()`, lee los claims firmados de `app_metadata`, verifica que el título está publicado, reclama atómicamente un dispositivo en Postgres y entonces solicita OTP de VdoCipher. La función SQL serializa las reclamaciones por usuario y expira heartbeats sin actividad tras 90 segundos. Los clientes deben renovar su heartbeat aproximadamente cada 30 segundos y llamar a `release-playback` al cerrar el player. En caso de cierre abrupto, el TTL recupera el cupo automáticamente. Usa un identificador de instalación estable, aleatorio y específico por app/dispositivo; no uses un ID publicitario.

La semántica aquí adoptada para `deviceLimit` es número de reproducciones concurrentes por cuenta. `customerType` se conserva en la sesión para reglas comerciales, auditoría y futuras políticas de hostelería; cualquier excepción para concurrencia por establecimiento debe modelarse explícitamente antes de lanzamiento.

## Clientes

El catálogo, colecciones, orden y visibilidad por plataforma viven en Supabase. `content.visibility` contempla `web`, `lg_webos`, `samsung_tizen`, `ios`, `tvos`, `androidtv` y `android`. El frontend web comparte el esquema de tokens y las APIs Edge Function con los clientes; el reproductor y almacenamiento seguro de device ID son adaptadores nativos por plataforma.

| Cliente | Implementación | Carpeta |
|---|---|---|
| Web | React, catálogo/colecciones, OAuth, Player web OTP | `src/` |
| LG webOS | Build del cliente web con navegación por flechas y Enter; manifiesto webOS | `clients/lg-webos/` |
| Samsung Tizen | Build del cliente web con navegación D-pad; manifiesto Tizen TV | `clients/tizen/` |
| iOS | React Native, OAuth PKCE, catálogo y VdoCipher RN Player | `clients/native/` |
| tvOS | Mismo cliente RN TV con focus nativo | `clients/native/` |
| Android | React Native, OAuth PKCE, catálogo y VdoCipher RN Player | `clients/native/` |
| Android TV | Mismo cliente RN TV con D-pad y foco | `clients/native/` |

Los targets smart TV se empaquetan desde el frontend web. Los móviles y TV nativos comparten UI y autorización en React Native TV. El código cliente y sus dependencias están preparados; la carpeta no incluye los proyectos nativos generados. La compilación final requiere generarlos con sus CLI y requiere Xcode, Android SDK y certificados de cada tienda. Verifica VdoCipher Player/DRM y OAuth en modelos/dispositivos concretos antes de distribución, según SDK y plan contratados.

## Trabajo para producción

- Completar gestión de colecciones, publicación y permisos de editores en el panel.
- Añadir webhook autenticado de procesamiento VdoCipher y actualización de estado.
- Generar proyectos nativos Xcode/Gradle y configurar deep links OAuth para los bundle IDs y firmas definitivos.
- Validar el player web y DRM en generaciones concretas de LG webOS y Samsung Tizen; validar player nativo en Apple TV y Android TV.
- Añadir carga reanudable/multipart para ficheros grandes si la cuenta/API lo permite.
- Configurar dominios autorizados y reglas de embed de VdoCipher, límites CORS y protección de funciones.

## Referencias de integración

- [VdoCipher: API de servidor](https://www.vdocipher.com/docs/server/)
- [VdoCipher: credenciales de subida](https://www.vdocipher.com/docs/server/upload/credentials/)
- [VdoCipher: subida desde web](https://www.vdocipher.com/docs/server/upload/browser/)
- [VdoCipher: OTP de reproducción](https://www.vdocipher.com/docs/server/playbackauth/otp/)
- [Supabase: autenticación de Edge Functions](https://supabase.com/docs/guides/functions/auth)
