# LG webOS TV

Este target empaqueta el mismo cliente OTT web, con layout 10-foot, botones navegables mediante flechas del mando y tecla Enter para seleccionar. La portada y reproducción usan el player web VdoCipher.

```sh
npm run build:webos
```

Usa `appinfo.json` con webOS CLI (`ares-package dist`) y prueba con webOS TV Simulator y televisores reales. Añade los iconos requeridos por LG Apps antes de enviar la app a certificación. Configura OAuth redirect/deep-link y verifica soporte de player/DRM para los modelos y versiones webOS que vayas a publicar.
