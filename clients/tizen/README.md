# Samsung Tizen TV

Este target empaqueta el cliente OTT web usando el mismo diseño y la navegación por mando. El manifiesto Tizen declara app TV landscape y acceso a red.

```sh
npm run build:tizen
```

El build coloca `config.xml` dentro de `dist/`; empaqueta ese directorio como `.wgt` con Tizen Studio CLI y un certificado Samsung. Prueba navegación D-pad, memoria y VdoCipher DRM en los modelos/años de TV concretos antes de publicar; el Web Player puede tener capacidades distintas según el motor del televisor.
