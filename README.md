# Astra — Crónicas del valle

RPG 3D para navegador con cooperación contra criaturas y PvP entre estandartes, en un mundo compartido para **1–8 jugadores**. Tu PC ejecuta el servidor y sirve todos los recursos del juego por red local o mediante un túnel temporal de Internet. Incluye una aventura inicial de tres capítulos; es la base jugable de un MMORPG, limitada a ocho personajes simultáneos.

## Ejecutar desde cero

Estos pasos se realizan en el **PC que hará de servidor**. Los amigos que se conecten desde otro PC, teléfono o tableta solo necesitan un navegador y estar en la misma red local.

### 1. Instalar y comprobar los requisitos

El repositorio incluye un preparador automático para **Windows 10/11** y para **Debian, Ubuntu, Linux Mint y distribuciones derivadas de Debian**. Revisa e instala o actualiza Git, Node.js 24 con npm y Cloudflare Tunnel; después ejecuta `npm ci`, compila el proyecto y configura los hooks locales de Git. Puedes repetirlo cuando actualices el repositorio. No inicia el servidor ni modifica `data/`.

En Windows, abre PowerShell o Símbolo del sistema dentro de la carpeta y ejecuta:

```bat
setup-windows.cmd
```

El script usa **WinGet**, incluido normalmente mediante App Installer en Windows moderno. Puede mostrar la ventana de permisos de administrador de un instalador. Si todavía no tienes Git, descarga el repositorio como ZIP, descomprímelo y ejecuta el preparador desde esa carpeta; después podrás clonar normalmente.

En Debian o una distribución compatible, abre una terminal dentro de la carpeta y ejecuta:

```sh
bash setup-debian.sh
```

El instalador usa `apt` y pedirá la contraseña de `sudo` cuando corresponda. Node.js 24 se obtiene mediante el repositorio de NodeSource y Cloudflare Tunnel se guarda en `.local/bin/`, solo para este proyecto.

Para comprobar los requisitos sin instalar, actualizar, descargar ni compilar:

```sh
# Debian y derivados
bash setup-debian.sh --check

# Windows (PowerShell o CMD)
setup-windows.cmd -CheckOnly
```

Al terminar la preparación automática, pasa directamente al [paso 3](#3-arrancar-y-abrir-el-juego). Si prefieres hacerlo manualmente, instala **Node.js 24** con npm desde la [página oficial de Node.js](https://nodejs.org/en/download), instala [Git](https://git-scm.com/install/) y usa un navegador con WebGL y aceleración gráfica habilitada.

Abre una terminal: PowerShell o Símbolo del sistema en Windows, Terminal en macOS o tu terminal habitual en Linux. Si acabas de instalar Node.js o Git, abre una terminal nueva. Comprueba:

```sh
node --version
npm --version
git --version
```

`node --version` debe mostrar `v24.x.x` para seguir esta guía con la versión de referencia; los otros dos comandos deben mostrar sus versiones sin errores. Si ya usas nvm en Linux/macOS, después de entrar en la carpeta del proyecto puedes ejecutar `nvm install` y `nvm use` para utilizar `.nvmrc`.

### 2. Clonar e instalar manualmente

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

Abre **http://localhost:3000** en el navegador del PC servidor, escribe un nombre de personaje, elige clase y estandarte y pulsa **Entrar como caballero, mago o arquero**. Si ves el mundo y los controles, el arranque se completó.

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
| `winget` no se reconoce al ejecutar el preparador de Windows | Instala o actualiza **App Installer** desde Microsoft Store, abre una terminal nueva y repite `setup-windows.cmd`. |
| El preparador de Debian rechaza la distribución | El script automático admite Debian y derivadas con `apt`. Sigue la instalación manual en otra distribución. |
| El preparador de Debian no puede usar `sudo` | Ejecútalo con una cuenta que pueda administrar paquetes o pide al administrador que instale Git, Node.js 24 y `curl`. |
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
| Clic en criatura o rival / Tab | Seleccionar objetivo; los aliados y protegidos no son atacables |
| 1 / Espacio | Ataque básico; mantén Espacio para atacar repetidamente |
| Q | Habilidad ofensiva de tu clase; recarga de 6–7 s |
| F | Guardia, Barrera o Evasión, según tu clase |
| R | Usar el consumible elegido en el inventario |
| E | Hablar con Elara, entregar misión, comerciar en tu casa o recoger botín cercano |
| I / J / M | Inventario / diario / mapa |
| Enter | Escribir y enviar chat |
| C | Centrar cámara |
| Escape | Cerrar ventana, salir del chat o quitar selección |

Al entrar, busca a **Elara** en el mapa y pulsa **E** para aceptar la primera misión. Sigue el camino al norte para encontrar criaturas. Recoge sus objetos con **E**. Regresa a Elara para entregar cada misión y pulsa **E** otra vez para aceptar la siguiente.

La aldea restaura la vida y protege frente a todos los ataques. Si mueres, reapareces en el santuario a los cinco segundos sin perder objetos. Los jugadores vivos que hayan participado recientemente y estén cerca de la derrota de una criatura reciben experiencia, oro y progreso de misión, aunque sean de bandos distintos. Derrotar jugadores no concede recompensas. El botín del suelo es compartido: lo recoge una sola persona. Cada participante del jefe recibe su propia arma avanzada de clase: filo astral, bastón del umbral o arco del umbral. Si una recompensa personal no cabe, Elara la guarda para que puedas reclamarla desde el inventario estando junto a ella.

El inventario tiene 24 casillas y ranuras de arma, armadura y accesorio. Selecciona un objeto para comparar bonificaciones, equiparlo o asignar un consumible al botón rápido. El equipo permanece en la mochila al equiparlo; las pociones y materiales se apilan hasta 99 unidades por casilla. Puedes desequipar y vender equipo en la casa de tu estandarte para hacer espacio.

Acércate al puesto frente a **la casa de tu estandarte** y pulsa **Comerciar**, o abre la tienda desde el inventario. La poción básica cuesta 3 cristales o, si no tienes suficientes, 15 de oro; las armas avanzadas también se intercambian por 6 fragmentos. Cada operación exige estar a 3 unidades o menos de tu puesto: dejar la tienda abierta y alejarte impide comprar, vender o canjear. Las compras sin espacio no descuentan el pago. Elara mantiene las misiones y las entregas pendientes.

Los avisos aparecen encima del tutorial, en el panel superior de consejos. Siguen apareciendo al cerrar el tutorial; con un menú abierto se muestran en su encabezado, separados de la vida. En Ajustes puedes cambiar calidad, tamaño de interfaz y controles, sensibilidad, distribución para zurdos y atajos. Las preferencias se conservan en el navegador. Tab cambia de objetivo cuando el mundo tiene el foco; dentro de menús conserva la navegación normal.

### Estandartes y zona segura

Elige **Brasa, Sol, Bosque, Ámbar u Hoja**. El traje y la casa comparten la identidad visual de su estandarte. Cada bando se identifica mediante un nombre y un emblema; Hoja sustituye al antiguo estandarte gris y conserva sus personajes y su casa. En el mapa, un borde claro destaca **Tu casa**; el inventario y el mapa muestran la distancia a su puesto. Todos los bandos ofrecen las mismas condiciones y precios; cada clase ve sus propios suministros.

La clase y el estandarte se guardan con el personaje. Fuera de la aldea puedes seleccionar y atacar jugadores de otros estandartes; los del mismo son aliados y no reciben daño de tus ataques, incluso en área. El asistente de objetivo prioriza criaturas. No hay recompensas PvP ni cambios libres de bando.

La aldea completa, incluyendo santuario, Elara, casas y accesos, es zona segura (`z >= 5`). La salida está marcada en el suelo y el mapa. Entrar en ella cancela los proyectiles pendientes que lanzaste o que te tenían como objetivo. Las explosiones filtran a cada afectado: no dañan aliados ni protegidos. Los consumibles y habilidades defensivas siguen disponibles. El indicador superior anuncia si estás en zona segura o en territorio de combate.

### Clases y objetos

Elige una tarjeta en la pantalla de entrada para ver el personaje 3D y sus habilidades. En PC puedes recorrer las clases con las flechas del teclado. Al regresar, el selector muestra la última clase activa. Puedes cambiar entre caballero, mago y arquero desde **Inventario → Clases de tu aventura**, estando junto al puesto de tu casa. Al abrir la casa también encontrarás este selector.

| Clase | Vida inicial / alcance | Ataque | Q | F |
| --- | --- | --- | --- | --- |
| Caballero | 150 / 3,5 | Espadazo | Barrido cercano | Guardia: 60 % menos daño durante 4 s |
| Mago | 100 / 9 | Pulso arcano | Explosión sobre el objetivo | Barrera: absorbe 45 de daño, +5 por nivel adicional, durante 5 s |
| Arquero | 115 / 11 | Flecha | Disparo certero | Evasión de 3 unidades, sin atravesar obstáculos |

Los ataques a distancia son dirigidos al objetivo, con impactos resueltos por el servidor y cancelación por obstáculos, muerte o salida de alcance. No requieren maná ni munición. Los alcances se expresan en unidades del mundo; la vida aumenta 25 por nivel. El equipo puede añadir vida, daño o protección.

Hay **16 tipos de objeto**: poción de vida, cristal del valle, espada de hierro, filo astral, bastón de roble, bastón del umbral, arco de cazador, arco del umbral, coraza de hierro, túnica rúnica, armadura de cuero, amuleto de vitalidad, anillo de poder, poción de vida mayor, vendaje y fragmento del umbral. Las armas básicas de clase son gratuitas y no ocupan espacio.

Las pociones recuperan 65 o 110 de vida y comparten una recarga de 4 segundos. El vendaje recupera 50 de vida durante 5 segundos: exige haber pasado 5 segundos fuera de combate y se interrumpe al causar o recibir daño. Equipar un objeto que aumenta la vida máxima no cura.

### Móvil y tableta

Abre la dirección LAN del PC en el navegador del teléfono. Puedes jugar en horizontal o vertical; el modo táctil se detecta automáticamente y se puede fijar desde **Menú → Ajustes**.

- **Joystick izquierdo:** movimiento gradual según la cámara. **Correr** alterna la carrera.
- **Ataque:** mantén el botón para repetir ataques. Puedes mover el joystick y atacar simultáneamente.
- **Dos habilidades y consumible:** botones junto al ataque; cambian con tu clase y muestran el tiempo de recarga.
- **Cámara:** arrastra una zona libre del mundo. Pellizca para acercar o alejar; los botones **+ / ◎ / −** permiten zoom y centrado sin gestos.
- **Objetivo:** toca una criatura o un rival fuera de la aldea, o usa **Cambiar objetivo**. El desplazamiento al tocar terreno se activa opcionalmente en Ajustes.
- **Hablar / comerciar / recoger:** usa el botón contextual al acercarte a Elara, al puesto de tu casa o a un botín.
- **Menú:** inventario, misiones, mapa, ajustes, invitación y sonido. **Grupo** abre la lista de compañeros.
- **Conversar:** abre el chat. El borrador se conserva si cierras el panel o pierdes la conexión.

Los controles se detienen al abrir un panel, escribir, girar la pantalla, ocultar la página, morir o perder la conexión. **Los menús no pausan el mundo multijugador**: la imagen y la vida siguen actualizándose; puedes recibir daño mientras revisas el inventario.

La calidad **Automática** ajusta el detalle tras medir el coste de renderizado. Baja y Ahorro limitan la imagen a un máximo aproximado de 30 FPS, reducen resolución y desactivan sombras/resplandor. Media y Alta permiten hasta la frecuencia del navegador. Ningún perfil garantiza ese rendimiento en cualquier dispositivo; el objetivo móvil debe comprobarse en teléfonos físicos. El tamaño del joystick se adapta al espacio disponible para evitar solapamientos al ampliar los botones.

### Elara itinerante y afinidad de los objetos

Elara camina despacio entre las cinco casas por rutas que evitan obstáculos. Su posición y animación se sincronizan para todos y su marcador del mapa se mueve con ella. Acércate y usa **Hablar con Elara** para abrir la conversación. Mientras el diálogo esté abierto y permanezcas cerca, Elara esperará. Usa **Despedirme** o cierra el diálogo para terminar. Si varias personas conversan con ella, espera a la última; después se detiene otros **3–10 segundos**, elegidos al azar, antes de reanudar el recorrido. Alejarse o desconectarse también termina la conversación.

El botín de equipo se adapta a quien lo recoge: un arma del mismo grado será espada, bastón o arco según la clase activa; las armaduras serán coraza, túnica o cuero. Se conserva una sola recogida por objeto del suelo. Los consumibles, materiales y accesorios comunes sirven a todas las clases. La tienda solo permite adquirir equipo compatible con la clase activa. Los objetos antiguos ya guardados se conservan; las nuevas entregas pendientes se adaptan a la clase que las reclama.

El progreso se vincula al acceso guardado en ese navegador, no a una identificación física del equipo. Otro navegador comienza con otro acceso; importar tu archivo de acceso recupera las tres clases del mismo personaje y continúa su progreso.

Consulta los detalles de guardado y las comprobaciones en [Progreso por clase y Elara itinerante](docs/progreso-clases-elara.md).

## Contenido

- Aldea segura, bosque y ruinas; escenario low-poly original generado con geometría local.
- Cámara orbital en tercera persona; personajes y criaturas con animación procedural.
- Caballero, Mago y Arquero con siluetas, armas y habilidades distintas; selector accesible con tarjetas y una única vista previa 3D.
- Brotes silvestres, jabalíes, ecos y el Guardián del umbral.
- Combate cooperativo y PvP entre cinco estandartes, dos habilidades, pociones, muerte y reaparición.
- Experiencia, niveles 1–5, oro, tablas de botín, 16 objetos, 24 casillas, armas, armaduras, accesorios y cinco casas comerciales.
- Tres misiones encadenadas y combate final de élite.
- Chat local, grupo visible, minimapa, mapa completo y ayuda de controles.
- Guardado SQLite, identificación privada, exportación/importación de acceso y reconexión breve.

## Guardados y personajes

La base de datos se crea en **`data/astra.sqlite`** en el PC servidor. Cada acceso del navegador dispone de tres progresiones independientes: una por clase. El nivel, experiencia, oro, misiones, equipo, inventario y recompensas de un mago no se copian a su arquero ni a su caballero. El nombre y estandarte identifican el mismo acceso. La primera vez que usas otra clase comienza en nivel 1, con su equipo inicial; volver a una clase recupera exactamente su progreso. Guarda nombre, estandarte, color canónico, clase, nivel, experiencia, oro, inventario, equipo, consumible seleccionado, recompensas pendientes y progreso de misiones. Se actualiza al cambiar el progreso, periódicamente, al salir y al cerrar normalmente el servidor. Tras reiniciar, los personajes entran en la aldea con vida completa; enemigos, proyectiles, defensas temporales, botín del suelo y posiciones se recrean.

**Actualización de personajes existentes:** detén el servidor con Ctrl+C y copia la carpeta `data/` completa antes de ejecutar la versión nueva. La actualización conserva el progreso previo en su clase; las clases adicionales se crean al usarlas por primera vez. Se añade una tabla de progresos por clase en la misma base de datos. Los perfiles anteriores a la **versión 3** mantienen su migración y la elección gratuita y única de estandarte al conectar. Confirma la elección si aparece para habilitar el juego; reiniciar o reconectar no permite cambiar de bando.

Si vienes de las clases cosméticas (versión 1 o sin versión), primero confirmarás tu nueva clase y después el estandarte. Tus espadas permanecen en el inventario; si eliges mago o arquero, puedes canjear las espadas antiguas por armas equivalentes en **tu casa**. Las copias que excedan la capacidad quedan como recompensas pendientes con Elara. Una versión de perfil desconocida se rechaza sin sobrescribirla.

El navegador conserva un token aleatorio de 256 bits. **El nombre no es una contraseña** y dos personas con el mismo nombre tienen personajes distintos. El token nunca se sincroniza con otros jugadores; la base de datos almacena su hash.

- Usa siempre el mismo navegador y dirección para conservar el acceso automático. `localhost` y la IP son orígenes diferentes.
- En **Ajustes → Guardar acceso**, descarga `astra-acceso.json`. En otro navegador, usa **Recuperar un personaje** en la pantalla de entrada.
- El archivo de acceso identifica al personaje; el progreso sigue estando en el servidor. No compartas ese archivo con otros jugadores.
- Un personaje no puede estar conectado dos veces. Para probar dos jugadores en el mismo PC, usa perfiles distintos, navegadores distintos o una ventana privada.
- Las interrupciones breves reservan el personaje durante 20 segundos. Si el servidor se reinicia o la reserva expira, usa **Volver a conectar**.
- Para una copia de seguridad consistente, detén el servidor con Ctrl+C y copia la carpeta `data/` completa.

## Red local y configuración

### Acceso por Internet con un túnel temporal

Con el juego activo (`npm run play`), abre otra terminal en esta carpeta y ejecuta:

```sh
npm run tunnel
```

Comparte la dirección `https://…trycloudflare.com` que imprime Cloudflare. Mantén ambos procesos y el PC encendidos. `Ctrl+C` en la terminal del túnel cierra el acceso público; el servidor del juego se detiene por separado. El enlace cambia al crear otro túnel: exporta el acceso del personaje desde Ajustes para recuperarlo en el nuevo enlace.

El comando utiliza `.local/bin/cloudflared`, una instalación disponible en `PATH`, o la ruta indicada por `CLOUDFLARED_PATH`. La carpeta `.local/` está excluida de Git: quien clone el repositorio debe instalar [cloudflared desde su fuente oficial](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). No necesita cuenta ni dominio para un [Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/), destinado a pruebas y sin garantía de disponibilidad. El enlace permite entrar a cualquiera que lo conozca; los guardados permanecen en este PC.

### Configuración de la LAN

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

Las pruebas de clases y objetos verifican impactos diferidos y cancelación de proyectiles, explosiones, guardia, barrera, evasión, vendajes, restricciones de equipo, recargas compartidas, compras sin pérdida de pago, recompensas pendientes y migraciones repetibles. La campaña se comprueba con las tres clases. En el navegador se comprueban selección con teclado, vista previa única, tamaños de pantalla con interfaz al 150 %, recuperación de clase guardada y migración e intercambios desde una pantalla móvil.

Las pruebas de estandartes cubren aliados y rivales con las tres clases, daño en área, ausencia de recompensas PvP, protección exacta del límite de la aldea, invalidación de proyectiles al cruzar o reconectar, migración a versión 3 y acceso a los cinco comercios. Las ocho conexiones incluyen los cinco bandos. En navegador se verifican selección de estandarte, objetivos rivales, comercio por casa, avisos independientes del tutorial y distribución de consejos al 150 %. Consulta el [registro de verificación](docs/verificacion-estandartes.md) para conocer las comprobaciones realizadas y las pendientes en dispositivos físicos.

## Organización

```text
client/             Escenario Babylon.js, controles, interfaz, audio
server/app.ts       HTTP, Colyseus, sala única y conexiones
server/world.ts     Simulación y reglas del juego
server/database.ts Guardado SQLite
shared/content.ts  Mapa, colisiones, criaturas, objetos y misiones
shared/banners.ts  Estandartes, casas, zona segura y objetivos tipados
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
