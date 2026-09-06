# Astra — Crónicas del valle

RPG 3D cooperativo para navegador, con un mundo compartido para **1–8 jugadores** en una red local. Tu PC ejecuta el servidor y sirve todos los recursos del juego. Incluye una aventura inicial de tres capítulos; es la base jugable de un MMORPG, con capacidad local limitada a ocho personajes simultáneos.

## Ejecutar desde cero

Estos pasos se realizan en el **PC que hará de servidor**. Los amigos que se conecten desde otro PC, teléfono o tableta solo necesitan un navegador y estar en la misma red local.

### 1. Instalar y comprobar los requisitos

- Instala **Node.js 24**, con npm, desde la [página oficial de Node.js](https://nodejs.org/en/download). Es la versión de referencia del proyecto, indicada también en `.nvmrc`.
- Instala [Git para tu sistema operativo](https://git-scm.com/install/) para clonar el repositorio.
- Usa un navegador con WebGL y aceleración gráfica habilitada.

Abre una terminal: PowerShell o Símbolo del sistema en Windows, Terminal en macOS o tu terminal habitual en Linux. Si acabas de instalar Node.js o Git, abre una terminal nueva. Comprueba:

```sh
node --version
npm --version
git --version
```

`node --version` debe mostrar `v24.x.x` para seguir esta guía con la versión de referencia; los otros dos comandos deben mostrar sus versiones sin errores. Si ya usas nvm en Linux/macOS, después de entrar en la carpeta del proyecto puedes ejecutar `nvm install` y `nvm use` para utilizar `.nvmrc`.

### 2. Clonar e instalar

Copia la URL HTTPS de este repositorio desde tu proveedor de Git (por ejemplo, desde el botón Code en GitHub). **Sustituye `URL_DEL_REPOSITORIO` por esa URL real** antes de ejecutar:

```sh
git clone URL_DEL_REPOSITORIO astra
cd astra
npm ci
```

El último argumento de `git clone` fija el nombre de la carpeta en `astra`. Si ya clonaste el repositorio, omite la clonación y abre la terminal dentro de su carpeta: debes ver allí `package.json` y `package-lock.json`.

`npm ci` instala las versiones fijadas en el archivo de dependencias. La primera instalación necesita Internet. SQLite viene integrado en Node.js y el juego crea su base de datos al arrancar. La configuración predeterminada permite jugar directamente; los hooks de Git y las pruebas son pasos opcionales para quienes contribuyan al código.

### 3. Arrancar y abrir el juego

Desde esa misma carpeta, ejecuta:

```sh
npm run play
```

Este comando comprueba TypeScript, compila el cliente y el servidor y arranca el juego. Espera a que la terminal muestre algo parecido a:

```text
✧ ASTRA · Crónicas del valle

En este PC: http://localhost:3000
Comparte una dirección de tu red local:
  http://192.168.1.26:3000
```

Abre **http://localhost:3000** en el navegador del PC servidor, escribe un nombre de personaje y pulsa **Entrar al valle**. Si ves el mundo y los controles, el arranque se completó.

La terminal permanece ocupada mientras el servidor está funcionando; eso es normal. El juego debe abrirse desde esa dirección HTTP: abrir `index.html` directamente o mediante una extensión de servidor estático no ejecuta el servidor multijugador.

### 4. Conectar a otra persona

1. Conecta el otro dispositivo al mismo Wi-Fi o a la misma red mediante Ethernet.
2. En su navegador, abre la **dirección de red que muestra tu terminal**, por ejemplo `http://192.168.1.26:3000`. Esa IP es solo un ejemplo: utiliza la de tu PC.
3. El otro dispositivo debe usar esa IP, no `localhost`, porque `localhost` se refiere al dispositivo donde se abre el navegador.
4. También puedes copiar la dirección desde **Invitar amigos** o **Menú → Invitar** en móvil.
5. El PC servidor debe permanecer encendido, conectado y sin suspenderse. Consulta [Red local y configuración](#red-local-y-configuración) si no pueden conectar.

También puedes probar dos personajes en un único PC con navegadores diferentes o una ventana privada. Cada uno debe entrar con su propio acceso; el mismo personaje no puede abrirse dos veces.

### 5. Detener, volver a arrancar y actualizar

Para terminar la partida, vuelve a la terminal del servidor y pulsa **Ctrl+C**. Esto guarda el progreso y cierra el servidor. Cerrar solo la pestaña del navegador no detiene el servidor.

Para jugar otro día, abre una terminal en la carpeta `astra` y ejecuta:

```sh
npm start
```

`npm start` utiliza la compilación existente. En una instalación nueva o después de cambiar código, utiliza `npm run play` para compilar antes de arrancar.

Para descargar una actualización del repositorio, detén primero el servidor. Si tu copia no tiene modificaciones locales pendientes, ejecuta:

```sh
git pull
npm ci
npm run play
```

Si Git informa de cambios locales o conflictos, resuélvelos antes de continuar. Los guardados están en `data/`, fuera del código versionado; consulta [Guardados y personajes](#guardados-y-personajes) para hacer una copia.

Una vez instaladas las dependencias, la partida y todos sus recursos funcionan en la LAN sin servicios externos, fuentes remotas ni CDN.

## Solución de problemas de arranque

| Problema | Qué comprobar |
| --- | --- |
| `node`, `npm` o `git` no se reconoce | Instala la herramienta correspondiente y abre una terminal nueva. Repite la comprobación de versiones. |
| PowerShell bloquea `npm.ps1` | Usa `npm.cmd ci` y `npm.cmd run play` en PowerShell, o ejecuta los comandos originales desde Símbolo del sistema. |
| Error `ENOENT` relacionado con `package.json` | Entra con `cd` en la carpeta clonada, donde están `package.json` y `package-lock.json`. |
| Error relacionado con `node:sqlite` o versión de Node | Comprueba `node --version`, activa Node.js 24 y vuelve a ejecutar `npm ci`. |
| No se encuentra `dist/server/server/index.js` | Todavía falta compilar: ejecuta `npm run play`. |
| `tsc` o `vite` no se encuentra | Ejecuta `npm ci`. Si instalaste omitiendo dependencias de desarrollo, usa `npm ci --include=dev`, porque la compilación las necesita. |
| `EADDRINUSE` o puerto 3000 ocupado | Detén la instancia anterior desde su terminal o elige otro puerto con los ejemplos de la sección siguiente. |
| La instalación falla al descargar paquetes | Comprueba la conexión a Internet y vuelve a ejecutar `npm ci`; conserva `package-lock.json`. |
| El navegador no puede abrir el juego | Comprueba que la terminal siga ejecutando el servidor y utiliza la dirección y el puerto que muestra. |
| Hay un error de WebGL o la imagen no aparece | Habilita la aceleración gráfica del navegador. Si puedes entrar pero va lento, selecciona calidad Baja en Ajustes. |

Para comprobar únicamente que el servidor responde, abre `http://localhost:3000/api/health` en el PC servidor: debe mostrar `{"ok":true}`. Si cambiaste de puerto, usa ese puerto también en esta dirección. Esta comprobación no verifica los gráficos ni la conexión desde otro dispositivo.

## Cómo jugar

| Control | Acción |
| --- | --- |
| WASD / flechas | Moverse según la cámara |
| Clic en suelo | Caminar hasta un punto; se detiene ante obstáculos |
| Shift | Correr |
| Botón derecho + arrastrar | Girar cámara |
| Rueda | Acercar / alejar |
| Clic en enemigo / Tab | Seleccionar objetivo |
| 1 / Espacio | Ataque básico; mantén Espacio para atacar repetidamente |
| Q | Onda astral: daño de área, 6 s de recarga |
| F | Luz vital: recupera 40 de vida, 12 s de recarga |
| R | Poción: recupera 65 de vida, consume una poción |
| E | Hablar con Elara, entregar misión o recoger botín cercano |
| I / J / M | Inventario / diario / mapa |
| Enter | Escribir y enviar chat |
| C | Centrar cámara |
| Escape | Cerrar ventana, salir del chat o quitar selección |

Al entrar, camina hasta **Elara**, junto al cristal del santuario, y pulsa **E** para aceptar la primera misión. Sigue el camino al norte para encontrar criaturas. Recoge sus objetos con **E**. Regresa a Elara para entregar cada misión y pulsa **E** otra vez para aceptar la siguiente.

La aldea restaura la vida. Si mueres, reapareces en el santuario a los cinco segundos sin perder objetos. Los compañeros vivos que hayan participado recientemente y estén cerca de una baja reciben experiencia, oro y progreso de misión. El botín del suelo es compartido: lo recoge una sola persona. Cada participante del jefe recibe su propia espada astral.

El inventario permite equipar las espadas encontradas. Estando junto a Elara, puedes comprar pociones desde el inventario por 3 cristales o, si no tienes suficientes, 15 de oro. El sonido se activa con el botón del altavoz. En Ajustes puedes cambiar calidad, tamaño de interfaz y controles, sensibilidad, distribución para zurdos y atajos. Las preferencias se conservan en el navegador. Tab cambia de objetivo cuando el mundo tiene el foco; dentro de menús conserva la navegación normal.

### Móvil y tableta

Abre la dirección LAN del PC en el navegador del teléfono. Puedes jugar en horizontal o vertical; el modo táctil se detecta automáticamente y se puede fijar desde **Menú → Ajustes**.

- **Joystick izquierdo:** movimiento gradual según la cámara. **Correr** alterna la carrera.
- **Ataque:** mantén el botón para repetir ataques. Puedes mover el joystick y atacar simultáneamente.
- **Onda astral, Luz vital y Poción:** botones junto al ataque; muestran el tiempo de recarga.
- **Cámara:** arrastra una zona libre del mundo. Pellizca para acercar o alejar; los botones **+ / ◎ / −** permiten zoom y centrado sin gestos.
- **Objetivo:** toca un enemigo o usa **Cambiar objetivo**. El desplazamiento al tocar terreno se activa opcionalmente en Ajustes.
- **Hablar / recoger:** usa el botón contextual al acercarte a Elara o a un botín.
- **Menú:** inventario, misiones, mapa, ajustes, invitación y sonido. **Grupo** abre la lista de compañeros.
- **Conversar:** abre el chat. El borrador se conserva si cierras el panel o pierdes la conexión.

Los controles se detienen al abrir un panel, escribir, girar la pantalla, ocultar la página, morir o perder la conexión. **Los menús no pausan el mundo multijugador**: la imagen y la vida siguen actualizándose; puedes recibir daño mientras revisas el inventario.

La calidad **Automática** ajusta el detalle tras medir el coste de renderizado. Baja y Ahorro limitan la imagen a un máximo aproximado de 30 FPS, reducen resolución y desactivan sombras/resplandor. Media y Alta permiten hasta la frecuencia del navegador. Ningún perfil garantiza ese rendimiento en cualquier dispositivo; el objetivo móvil debe comprobarse en teléfonos físicos. El tamaño del joystick se adapta al espacio disponible para evitar solapamientos al ampliar los botones.

## Contenido

- Aldea segura, bosque y ruinas; escenario low-poly original generado con geometría local.
- Cámara orbital en tercera persona; personajes y criaturas con animación procedural.
- Apariencias Viajero, Guardián y Mago y color de estandarte. Son opciones visuales; comparten las mismas reglas de combate en esta entrega.
- Brotes silvestres, jabalíes, ecos y el Guardián del umbral.
- Combate cooperativo, dos habilidades, pociones, muerte y reaparición.
- Experiencia, niveles 1–5, oro, botín, inventario y armas equipables.
- Tres misiones encadenadas y combate final de élite.
- Chat local, grupo visible, minimapa, mapa completo y ayuda de controles.
- Guardado SQLite, identificación privada, exportación/importación de acceso y reconexión breve.

## Guardados y personajes

La base de datos se crea en **`data/astra.sqlite`** en el PC servidor. Guarda nombre, color, nivel, experiencia, oro, inventario, arma y progreso de misiones. Se actualiza al cambiar el progreso, periódicamente, al salir y al cerrar normalmente el servidor. Tras reiniciar, los personajes entran en la aldea con vida completa; enemigos, botín temporal y posiciones se recrean.

El navegador conserva un token aleatorio de 256 bits. **El nombre no es una contraseña** y dos personas con el mismo nombre tienen personajes distintos. El token nunca se sincroniza con otros jugadores; la base de datos almacena su hash.

- Usa siempre el mismo navegador y dirección para conservar el acceso automático. `localhost` y la IP son orígenes diferentes.
- En **Ajustes → Guardar acceso**, descarga `astra-acceso.json`. En otro navegador, usa **Recuperar un personaje** en la pantalla de entrada.
- El archivo de acceso identifica al personaje; el progreso sigue estando en el servidor. No compartas ese archivo con otros jugadores.
- Un personaje no puede estar conectado dos veces. Para probar dos jugadores en el mismo PC, usa perfiles distintos, navegadores distintos o una ventana privada.
- Las interrupciones breves reservan el personaje durante 20 segundos. Si el servidor se reinicia o la reserva expira, usa **Volver a conectar**.
- Para una copia de seguridad consistente, detén el servidor con Ctrl+C y copia la carpeta `data/` completa.

## Red local y configuración

El servidor escucha en `0.0.0.0` y usa **un solo puerto TCP** para HTTP y WebSocket. El cliente obtiene la dirección WebSocket del mismo host que sirve la página.

Si otro dispositivo no conecta:

1. Verifica que ambos equipos estén en la misma red, sin aislamiento de clientes ni Wi-Fi de invitados.
2. Usa la IP actual que imprime el servidor, no una IP de VPN o adaptador virtual.
3. Permite Node.js o el puerto TCP 3000 en el firewall de la **red privada** del PC servidor.
4. Evita la suspensión del PC mientras juegan. No hace falta abrir puertos del router para jugar en la LAN.

Variables opcionales:

| Variable | Predeterminado | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP y WebSocket |
| `ASTRA_DB` | `data/astra.sqlite` | Ubicación del guardado |

Linux/macOS:

```sh
PORT=4000 npm run play
```

PowerShell:

```powershell
$env:PORT = "4000"
npm run play
```

En los ejemplos anteriores, abre `http://localhost:4000` y comparte la IP del PC con `:4000`. En PowerShell, `$env:PORT` permanece configurado en esa terminal; puedes eliminarlo con `Remove-Item Env:PORT` para volver al puerto predeterminado.

Las variables se leen del entorno de la terminal; la aplicación no carga automáticamente un archivo `.env`.

## Desarrollo y pruebas (opcional)

```sh
npm run dev          # Servidor y Vite en el mismo puerto; recarga manual
npm run check        # Comprobación de tipos
npm test             # Controles, reglas, persistencia y clientes WebSocket reales
npm run build        # Compilación de producción
npm run test:browser # Escritorio, móvil y gestos; servidores aislados
```

Estos comandos son para trabajar en el código; no son necesarios para jugar. Para las pruebas de navegador, ejecuta primero `npm run build`.

En desarrollo, reinicia `npm run dev` después de cambiar el servidor. La recarga automática de Vite está desactivada para compartir el puerto sin otra conexión HMR.

Las pruebas de navegador usan Chromium en `/usr/bin/chromium`; configura `CHROMIUM_PATH` con la ruta de tu instalación si es distinta. No usan la base de datos de tus partidas. Las capturas y trazas se guardan en `test-results/`.

Las pruebas cubren velocidad y colisiones, alcance y recargas, recogida simultánea de botín, economía, recompensas cooperativas, reaparición, la campaña completa, guardado tras reabrir SQLite, sincronización, chat, ocho conexiones y reconexión. Las pruebas de navegador comprueban la entrada de dos jugadores, chat, misión, inventario, mapa y recuperación del personaje, además de movimiento y combate multitáctiles enviados por Chromium, cancelación, paneles con vida actualizada, distintos tamaños de pantalla y preferencias. Las pruebas táctiles usan CDP en Chromium; no sustituyen una comprobación en Safari/iOS ni del teclado virtual, temperatura o batería de un dispositivo físico.

## Organización

```text
client/             Escenario Babylon.js, controles, interfaz, audio
server/app.ts       HTTP, Colyseus, sala única y conexiones
server/world.ts     Simulación y reglas del juego
server/database.ts Guardado SQLite
shared/content.ts  Mapa, colisiones, criaturas, objetos y misiones
shared/schema.ts   Estado sincronizado de Colyseus
tests/              Pruebas de reglas, red y navegador
```

El servidor simula a 20 Hz y envía cambios de estado a 20 Hz. Valida movimientos, colisiones, distancias, recargas, compras y recogidas; los clientes envían intenciones y suavizan las posiciones recibidas. Ningún cliente decide daño, experiencia ni recompensas.

## Alcance de esta entrega

La interfaz incluye teclado/ratón y controles táctiles en vertical y horizontal. La compatibilidad física y el rendimiento sostenido en Android/iOS quedan pendientes de comprobación con teléfonos reales; no se ha medido todavía la meta de 30 FPS durante 15 minutos. La navegación por clic avanza en línea recta con colisiones, sin búsqueda automática de rutas. El rendimiento depende de la GPU, el navegador y el PC anfitrión; ocho conexiones verifican la capacidad configurada, no equivalen a una prueba en ocho dispositivos físicos.

Es una aventura LAN de un mapa. El alojamiento público masivo, cuentas con contraseña, TLS, comercio entre jugadores, mazmorras instanciadas y múltiples zonas son ampliaciones posteriores. La comunicación HTTP/WS actual está destinada a una red local de confianza.

Tecnologías: [Babylon.js](https://www.babylonjs.com/), [Colyseus](https://docs.colyseus.io/), [Vite](https://vite.dev/), TypeScript y SQLite integrado en Node.js. Las versiones exactas están fijadas en `package-lock.json`.

## Compartir el código y crear commits

Consulta la [guía para publicar el repositorio](docs/publicar-repositorio.md) y las [instrucciones para contribuir](CONTRIBUTING.md). Los guardados y las claves de acceso de personajes no forman parte del código que se publica.

Para activar los mensajes automáticos en un clon nuevo:

```sh
npm run git:setup
git add .
git commit -m "."
```

El mensaje `.` se convierte en `version 1.0 AAAA-MM-DD HH:mm:ss -0400`, usando la fecha y zona horaria de Git. Los siguientes commits generan `1.1`, `1.2`, etc. Los mensajes descriptivos se conservan. La instalación del hook es local y explícita en cada clon; no requiere modificar la configuración global de Git.
