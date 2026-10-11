# Plan: estandartes, combate entre jugadores y casas comerciales

Estado: implementación realizada. El catálogo compartido está en `shared/banners.ts`; las reglas de combate y comercio se validan en el servidor. Los resultados de comprobación y las limitaciones se registran en `docs/verificacion-estandartes.md`.

## Ideas organizadas

| Área | Petición organizada | Resultado esperado |
| --- | --- | --- |
| Identidad visual | Cinco estandartes y traje del mismo color | Reconocer el bando de cada personaje en el selector y en el mundo |
| Información del personaje | Parámetros más destacados | Comparar clases y entender las estadísticas actuales con facilidad |
| Combate entre jugadores | Poder atacar personajes de otro estandarte | Rivales por bando fuera de la aldea; aliados del mismo estandarte |
| Consejos y avisos | Trasladar mensajes del centro al panel de consejos | Recibir información sin tapar el combate |
| Casas | Un techo de cada color de estandarte | Cinco comercios reconocibles, también en el mapa |
| Comercio | Comprar y vender en la casa del propio estandarte | El servidor exige cercanía a la casa correcta |
| Zona segura | Prohibir ataques en el lobby | Aldea protegida frente a ataques de jugadores y criaturas |

## Alcance y decisiones propuestas

Se interpreta «lobby» como la aldea inicial dentro del mundo, incluyendo el santuario, Elara, las cinco casas y sus accesos. La pantalla previa a entrar tampoco habilita acciones de combate.

La clase y el estandarte serán decisiones independientes. Caballero, mago y arquero conservarán sus habilidades; el estandarte definirá el color del traje, los aliados y el comercio disponible. Los cinco bandos tendrán las mismas condiciones económicas y no concederán bonificaciones de combate.

La zona segura se definirá una sola vez en los datos compartidos: inicialmente `z >= 5`. El resto del mapa será zona de combate. Actualmente hay comprobaciones independientes con `z > 5` y `z < 5`; se sustituirán por la misma función para evitar inconsistencias en el borde.

## 1. Estandartes y vestimenta

| Identificador estable | Nombre visible | Color base propuesto |
| --- | --- | --- |
| `crimson` | Rojo oscuro | `#8B2635` |
| `sun` | Amarillo | `#E3BE45` |
| `forest` | Verde oscuro | `#245C40` |
| `ember` | Naranja | `#D97732` |
| `ash` | Gris | `#90969C` |

- Sustituir los cuatro colores actuales por estos cinco botones, con nombre accesible, etiqueta visible y marca de selección. No depender solo del color para distinguir bandos.
- Aplicar el color base a las partes principales del traje: tela, capa, capucha, falda de túnica y paneles de armadura. Mantener piel, metal, cuero y armas legibles con materiales propios; la ropa será claramente del color elegido.
- Conservar la silueta de cada clase: espada y escudo, sombrero y bastón, arco y carcaj. Usar contornos claros para el rojo y el verde oscuros.
- Actualizar inmediatamente la vista previa al seleccionar un estandarte. Sincronizar la misma apariencia para el jugador y sus compañeros al entrar.
- Mostrar nombre o emblema de estandarte junto al nombre del jugador, en el panel del objetivo y en el grupo. Identificar «Aliado» o «Rival» mediante texto e iconos, además del color.
- Guardar un `bannerId` estable; obtener el color desde el catálogo del servidor. Cambiar un hexadecimal enviado por el cliente nunca cambiará las reglas del bando.

### Personajes existentes

Introducir una migración de perfil a versión 3, posterior a la migración de clases ya existente. Como el estandarte antes era cosmético, ofrecer a los personajes anteriores una elección gratuita y explícita de su nuevo bando, conservando clase, nivel, equipo, inventario, oro y misiones.

La elección se confirmará y guardará en el servidor antes de habilitar el juego. Reiniciar, reconectar o enviar dos veces la confirmación no volverá a concederla. Los perfiles nuevos elegirán clase y estandarte al crearse. Al recuperar un personaje se mostrarán sus elecciones guardadas.

En esta entrega no se permitirá cambiar de bando durante una partida ni mediante un mensaje arbitrario de color. El cambio libre o pagado de bando quedará fuera del alcance inicial.

## 2. Parámetros de personaje más claros

En el selector, mostrar un bloque destacado por clase con valores grandes y unidades:

- Vida inicial: caballero 150, mago 100 y arquero 115.
- Daño base y recarga del ataque básico; mostrar ambos para que un golpe más fuerte no parezca necesariamente más rápido.
- Alcance en unidades del mundo.
- Habilidades ofensiva y defensiva, con efecto, duración y recarga.
- Función de la clase y dificultad como información secundaria.

En el inventario o ficha del personaje, mostrar los valores reales al nivel actual: vida máxima, daño del ataque, alcance, protección y bonificaciones del equipo. Separar el valor base del aumento por equipo y mantener la comparación al seleccionar un objeto.

Los números vendrán de las mismas definiciones y fórmulas usadas por el servidor. Usar tipografía de alto contraste, etiquetas completas y una cuadrícula adaptable; comprobar escala de interfaz del 150 %. Los colores del estandarte no alterarán estos valores.

## 3. Zona segura antes de incorporar PvP

Aplicar la protección en el servidor, incluyendo:

1. Rechazar ataques básicos y habilidades ofensivas si el atacante está en la aldea.
2. Rechazar daño a cualquier jugador situado en la aldea, tanto de criaturas como de otros jugadores.
3. Comprobar nuevamente la zona al resolver un proyectil: entrar en la aldea antes del impacto anulará el daño. También se cancelará si el atacante entra en la zona segura antes del impacto.
4. Filtrar individualmente a los afectados por barridos y explosiones; un área no podrá dañar a alguien protegido por el borde de la aldea.
5. Mantener criaturas y persecuciones fuera de la zona segura. Si un enemigo queda dentro por un estado inválido, no podrá atacar allí y deberá regresar a su zona.
6. Permitir consumibles y habilidades defensivas, respetando sus recargas. Una acción ofensiva rechazada no consumirá su recarga ni generará proyectiles.

Mostrar «Aldea · Zona segura» o «Territorio de combate · PvP entre estandartes» al cambiar de zona. Señalizar la salida hacia el bosque mediante marcas en el suelo y minimapa, sin crear una barrera que impida moverse.

## 4. Combate entre estandartes

### Reglas

- Mismo estandarte: aliados, sin daño entre ellos, incluso por ataques en área.
- Estandartes diferentes: rivales atacables fuera de la zona segura.
- Atacante y objetivo deben estar conectados, vivos, con su elección de bando completada y fuera de la aldea.
- Validar distancia, obstáculos, objetivo y recarga en el servidor. Aplicar también armadura, guardia y barrera al daño PvP.
- Las tres clases usarán sus ataques actuales: espada, barrido, proyectiles, explosión y disparo certero. La evasión seguirá respetando obstáculos.
- Separar el cálculo PvP mediante un multiplicador configurable, inicialmente `1.0`, para permitir ajustes posteriores sin alterar el combate contra criaturas. No afirmar equilibrio competitivo hasta probar enfrentamientos reales.
- No conceder oro, experiencia, progreso de misiones ni botín por derrotar jugadores en esta primera entrega. La derrota usará la reaparición actual en el santuario, sin pérdida de objetos.
- Un jugador rival no recibirá recompensa cooperativa por participar en una baja contra otro jugador. Mantener las recompensas contra criaturas como están, incluso si participaron bandos diferentes.

### Selección y representación

Ampliar el objetivo actual, que solo reconoce criaturas, a una referencia explícita `{ type: 'enemy' | 'player', id }`. Aplicar el mismo formato en mensajes, estado de proyectiles, panel de objetivo y resolución de impactos para evitar confundir identificadores.

Permitir seleccionar rivales mediante clic, toque o «Cambiar objetivo». Conservar selección manual de criaturas. El asistente buscará primero criaturas; si no hay ninguna válida, podrá seleccionar al rival más cercano. Nunca seleccionará aliados ni objetivos protegidos para atacar. Indicar claramente nombre, clase, estandarte y vida cuando el objetivo sea otro jugador.

Revisar la validez al disparar y al impactar. Un objetivo que muera, se desconecte o reaparezca no debe recibir un impacto pendiente de su vida anterior. Una explosión podrá alcanzar criaturas y rivales válidos cercanos; cada entidad recibirá como máximo un impacto por acción.

## 5. Cinco casas, cinco comercios

Actualmente existen cuatro casas decorativas. Crear un catálogo compartido de cinco casas con identificador, estandarte, posición, dimensiones y punto de interacción.

Distribución inicial propuesta, sujeta a comprobar colisiones:

| Casa | Posición aproximada `(x, z)` |
| --- | --- |
| Rojo oscuro | `(-12, 18)` |
| Amarillo | `(12, 14)` |
| Verde oscuro | `(-14, 10)` |
| Naranja | `(12, 26)` |
| Gris | `(-12, 27)` |

Mover la casa cercana al límite norte hacia el interior de la aldea y añadir la quinta al noroeste del conjunto residencial. Comprobar que edificios, puntos de venta y caminos queden completamente dentro de la zona segura, sin bloquear el santuario, las rutas de entrada o los límites del mapa.

- Pintar cada techo con el color canónico de su estandarte. Añadir una bandera o escudo y un letrero; nombre y emblema distinguirán las casas también en calidad gráfica baja.
- Marcar las cinco casas en mapa y minimapa, destacando «Tu casa» y la distancia a su entrada.
- Usar un puesto o comerciante frente a la puerta, con acceso desde el exterior. No crear interiores en esta entrega.
- Mantener el mismo catálogo, precios y condiciones para todos los bandos.

### Compra y venta

El botón contextual mostrará «Comerciar · Casa [estandarte]» al acercarse a la entrada propia. En una casa ajena, mostrará a qué bando pertenece y dónde encontrar la propia.

El servidor comprobará la casa correspondiente al `bannerId`, cercanía al punto de venta —radio inicial de 3 unidades—, vida, conexión, inventario y pago. La validación se repetirá en cada operación: alejarse con la tienda abierta impedirá comprar o vender.

Mover a la casa propia todas las compras, ventas e intercambios comerciales, incluidos cristales por pociones, fragmentos por armas y canjes de armas antiguas. Conservar las operaciones atómicas y las restricciones de equipo existentes.

Elara seguirá entregando misiones y sus recompensas. Las recompensas personales pendientes por falta de espacio seguirán reclamándose con Elara: son entregas de progreso, no compras ni ventas. La interfaz diferenciará estas dos funciones para no enviar al jugador al lugar equivocado.

## 6. Avisos dentro del panel de consejos

Convertir el panel «Bienvenido a Auralia» en un espacio superior estable para consejos y mensajes de juego. Los avisos como «Elige un enemigo dentro de alcance», «Inventario lleno», «Zona segura» o «Acércate a tu casa» aparecerán encima del consejo de tutorial, dentro del mismo panel.

- Reemplazar las notificaciones flotantes del centro por una franja de aviso con icono, texto y severidad. Mantener los números de daño junto a las entidades: no son avisos del sistema.
- Mostrar un aviso durante unos 4 segundos; una cola de hasta tres mensajes priorizará errores de acción sobre confirmaciones. Agrupar avisos idénticos repetidos al mantener pulsado Ataque.
- Mantener estado de tutorial y avisos por separado. Cerrar o completar el tutorial no ocultará los avisos futuros; estos mostrarán temporalmente la franja y después se retirarán.
- No sobrescribir la vida del encabezado de un menú con mensajes de compra o error. Cuando haya un diálogo abierto, usar una franja equivalente dentro de su encabezado para que el mensaje no quede oculto detrás.
- Antes de entrar al juego, mostrar los avisos junto al formulario o en el diálogo activo. Conservar las pantallas necesarias para reconectar y reaparecer.
- En móvil vertical, situarlo debajo del estado del jugador, reorganizando misión y objetivo para evitar solapamientos. En horizontal y pantallas bajas, usar una franja compacta superior. Nunca tapar joystick, habilidades ni controles del menú.
- Usar `aria-live` para los avisos, sin mover el foco. Reservar los anuncios urgentes para errores relevantes y respetar movimiento reducido.

## 7. Orden de implementación

| Fase | Cambios | Verificación antes de avanzar |
| --- | --- | --- |
| 1. Datos e identidad | Catálogo de estandartes, migración de perfiles y vestimenta | Selección, guardado y apariencia coinciden en dos clientes |
| 2. Protección de la aldea | Función compartida de zona segura y validación de daño | No se puede atacar desde ella ni dañar a quienes están dentro |
| 3. PvP | Objetivos de jugador, ataques y proyectiles, filtrado de aliados | Rivales reciben daño válido; aliados y protegidos no |
| 4. Casas y economía | Quinta casa, techos, puestos y comercio por bando | Cada bando compra y vende exclusivamente en su casa |
| 5. Interfaz | Parámetros destacados y avisos en consejos | Información clara sin tapar el mundo o los controles |
| 6. Regresión y documentación | Pruebas multijugador, campañas y README | Guardados, misiones, comercio, móvil y conexión pública siguen funcionando |

Archivos principales: `shared/content.ts` o nuevos catálogos compartidos; `shared/schema.ts`; `server/database.ts`, `server/world.ts` y `server/app.ts`; `client/scene.ts`, `client/main.ts`, `client/ui.ts` y estilos; pruebas en `tests/` y documentación en `README.md`.

## 8. Criterios de aceptación

- Existen exactamente los cinco estandartes solicitados; todos pueden combinarse con las tres clases. El traje coincide en vista previa, mundo y otros clientes.
- Los parámetros visibles corresponden al nivel y equipo real, y pueden leerse en móvil y PC al 100 % y al 150 %.
- Probar aliados y rivales con ataques básicos, barridos, explosiones, proyectiles, guardia, barrera y evasión; incluir mensajes manipulados enviados directamente al servidor.
- Probar el borde `z = 5`, ambos sentidos de cruce con un proyectil en vuelo, explosiones junto al borde y ataques de criaturas. No hay daño en la aldea.
- Probar desconexión, muerte y reaparición durante el vuelo de un proyectil. No hay impactos duplicados ni daño a una vida nueva.
- Las cinco casas y sus accesos son transitables y seguros; techo, mapa, letrero y estandarte coinciden.
- Comprar o vender desde lejos, con la tienda abierta fuera de alcance o en una casa ajena no modifica oro, materiales ni inventario. Las operaciones válidas conservan sus garantías contra duplicaciones y pérdidas.
- Elara sigue permitiendo completar las tres misiones y reclamar recompensas pendientes. Los canjes comerciales requieren la casa propia.
- Los avisos se ven aunque el tutorial esté cerrado o terminado y aunque haya un diálogo abierto; no tapan el combate ni sobrescriben la vida.
- Probar migración desde perfiles cosméticos y desde versión 2, repitiéndola y reiniciando el servidor sin perder progreso ni permitir cambios de bando no autorizados.
- Verificar clientes de varios bandos en una sala de ocho conexiones, reconexión y acceso por el túnel público. Revisar pantallas 360 × 640, 390 × 844, 844 × 390 y 1366 × 768; registrar aparte las pruebas en teléfonos físicos.

No se incluyen conquista de casas, guerras con puntuaciones, clanes, comercio entre jugadores ni recompensas PvP en esta entrega.
