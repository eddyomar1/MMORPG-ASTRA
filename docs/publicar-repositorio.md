# Publicar el código de Astra

El repositorio contiene el código, los recursos locales, la documentación, las pruebas y el archivo de dependencias bloqueadas. Quien clone el repositorio puede seguir la [guía de ejecución local del README](../README.md#ejecutar-desde-cero), que incluye requisitos, clonación, instalación, arranque y conexión desde otro dispositivo.

Los directorios `node_modules/`, `dist/`, `data/`, los resultados de pruebas, variables de entorno y archivos de acceso de personajes están excluidos. `.gitignore` no retira archivos que ya estén en el historial: revisa cualquier archivo sensible antes de añadirlo.

## Primer envío

1. Crea un repositorio público vacío en tu proveedor de Git, sin generar otro README o un historial inicial.
2. Revisa `git status` y `git diff`, incluyendo los archivos nuevos que aún no están versionados: deben añadirse para que la instalación desde un clon tenga todo el código necesario. Define la licencia de distribución antes de anunciar el proyecto para reutilización.
3. Activa el hook y crea tu commit:

```sh
npm run git:setup
git add .
git commit -m "."
```

4. Añade la dirección real de tu repositorio y envía la rama actual:

```sh
git remote add origin URL_DEL_REPOSITORIO
git push -u origin HEAD
```

Sustituye `URL_DEL_REPOSITORIO` por la URL HTTPS o SSH que proporcione tu servicio. Si ya existe `origin`, comprueba `git remote -v` en lugar de añadirlo de nuevo. `HEAD` envía la rama actual, independientemente de si se llama `master` o `main`.

Esta preparación no crea commits, no modifica el historial existente, no configura un destino remoto y no publica datos. El primer futuro commit con mensaje `.` inicia la nueva numeración en `version 1.0` si no hay mensajes de versión anteriores.

Publicar el código no aloja el servidor multijugador. Para jugar por Internet sigue haciendo falta un servidor Node.js, WebSocket, HTTPS y almacenamiento persistente, tal como se explica en el README y en la planificación del proyecto.
