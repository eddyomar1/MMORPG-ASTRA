# Astra — Crónicas del valle

RPG 3D cooperativo para navegador, con un mundo compartido para **1–8 jugadores** en una red local. Tu PC ejecuta el servidor y sirve todos los recursos del juego. Incluye una aventura inicial de tres capítulos; es la base jugable de un MMORPG, con capacidad local limitada a ocho personajes simultáneos.

## Inicio rápido

Necesitas **Node.js 24 o posterior**, npm y un navegador con WebGL y aceleración gráfica; el servidor se ejecuta en el PC. Los demás jugadores solo necesitan su navegador.

```sh
npm ci
npm run play
```

`play` comprueba TypeScript, compila el cliente y el servidor y arranca el juego. La primera instalación requiere Internet; una vez instaladas las dependencias, la partida y sus recursos funcionan en la LAN sin servicios externos, fuentes remotas ni CDN.

La terminal muestra las direcciones disponibles, por ejemplo:

```text
En este PC: http://localhost:3000
Red local:  http://192.168.1.26:3000
```

1. Abre la dirección local en tu PC y elige un nombre.
2. Conecta el otro PC, teléfono o tableta al mismo Wi-Fi o red Ethernet.
3. En el segundo equipo, abre la **dirección IP que muestra la terminal**, no `localhost`.
4. También puedes copiarla desde **Invitar amigos** dentro del juego.
5. Mantén abierta la terminal. **Ctrl+C** guarda y cierra el servidor.

Después de compilar, puedes iniciar de nuevo con `npm start`. Si cambias código, usa `npm run play` para recompilar.

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
PORT=4000 npm start
```

PowerShell:

```powershell
$env:PORT = "4000"
npm start
```

## Desarrollo y pruebas

```sh
npm run dev          # Servidor y Vite en el mismo puerto; recarga manual
npm run check        # Comprobación de tipos
npm test             # Controles, reglas, persistencia y clientes WebSocket reales
npm run build        # Compilación de producción
npm run test:browser # Escritorio, móvil y gestos; servidores aislados
```

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
