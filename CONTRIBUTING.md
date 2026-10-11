# Contribuir a Astra

Empieza por la [guía de clonación e instalación del README](README.md#ejecutar-desde-cero). En Windows puedes ejecutar `setup-windows.cmd`; en Debian o una derivada, `bash setup-debian.sh`. Ambos preparan las herramientas, dependencias, compilación y hooks de Git. Después, ejecuta `npm run dev` para trabajar en el código y abre la dirección que muestre la terminal. Detén antes cualquier otra instancia que utilice el mismo puerto.

Antes de compartir cambios:

```sh
npm test
npm run build
```

Si modificas controles, interfaz o conexión, ejecuta también `npm run test:browser`. Consulta en el README cómo configurar Chromium. Las pruebas usan bases de datos temporales.

Mantén las reglas de combate, recompensas y movimientos en el servidor. Acompaña los cambios funcionales con pruebas de comportamiento. Las modificaciones de interfaz deben contemplar teclado/ratón y controles táctiles.

No incluyas guardados, claves, archivos `.env`, exportaciones de acceso de personajes ni capturas que revelen datos personales.

## Mensajes automáticos de commit

Activa los hooks explícitamente en cada clon:

```sh
npm run git:setup
```

Después, `git commit -m "."` genera un mensaje como:

```text
version 1.0 2026-09-06 12:34:56 -0400
```

El siguiente será `version 1.1`, después `version 1.2`, etc. Después de `1.9` viene `1.10`. El número se calcula a partir del último mensaje de versión en la historia del primer padre de la rama actual; un commit cancelado no consume versiones. Las ramas pueden tener la misma versión: este mensaje no es un identificador global de una publicación.

Los mensajes escritos normalmente se conservan. Los commits anteriores con mensaje `.` no se modifican. La fecha corresponde al momento de ejecución del hook, con la fecha y zona de Git para el committer; también respeta `GIT_COMMITTER_DATE` cuando se define. Si el hook atraviesa un cambio de segundo, la marca del mensaje puede diferir un segundo de la fecha que Git termine registrando.

La numeración es del mensaje: no modifica `package.json` ni crea etiquetas. `--amend -m "."` calcula la versión siguiente respecto al HEAD anterior; no reutiliza automáticamente su número. `--no-verify` omite el hook.

Git no activa los hooks versionados al clonar; cada persona debe ejecutar `npm run git:setup`. La configuración es local a este repositorio y no modifica la configuración global de Git.
