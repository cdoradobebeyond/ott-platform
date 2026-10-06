# Cliente iOS, Android, tvOS y Android TV

App React Native con navegación común, portada deportiva, carruseles, foco visible para mando a distancia, Supabase Auth/Postgres y VdoCipher React Native SDK. El reproductor pide su OTP a la función de Supabase antes de mostrar `VdoPlayerView`; los clientes no contienen claves VdoCipher.

## Preparar los proyectos nativos

El repositorio conserva el código común y genera las carpetas Xcode/Gradle desde templates fijados a versiones concretas. Con Node 22 y acceso a npm:

```sh
npm run prepare:android
npm run prepare:android-tv
npm run prepare:ios
npm run prepare:tvos
```

Cada comando crea el proyecto en `generated/<target>/`; esos directorios son artefactos generados e ignorados por Git. Para compilar Android hacen falta Java 17 y Android SDK. Para compilar iOS/tvOS hacen falta macOS, Xcode y CocoaPods. GitHub Actions usa el mismo generador en un directorio temporal y publica APKs Android y apps de simulador Apple como artefactos.

## Configuración

- El generador instala las dependencias compartidas y agrega el repositorio Maven de VdoCipher al proyecto Android generado.
- Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` al preparar localmente. En GitHub, añade las variables de repositorio `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; son valores públicos del cliente, nunca uses la service-role key aquí.
- iOS: ejecuta CocoaPods desde `ios/` tras instalar dependencias.

Una vez generado el proyecto, puedes ejecutar `npm run android`/`npm run ios` para móvil y los comandos de TV del template en Android TV/Apple TV.

La UI común incluye OAuth, catálogo, autorización de reproducción, el SDK VdoCipher, identificador de instalación en Keychain/Keystore y heartbeat cada 30 s. Verifica el bridge VdoCipher con cada target de TV y modelo antes de distribuir: sus guías públicas documentan explícitamente Android/iOS y el soporte exacto de tvOS/Android TV depende de la variante nativa del SDK y del plan de VdoCipher.
