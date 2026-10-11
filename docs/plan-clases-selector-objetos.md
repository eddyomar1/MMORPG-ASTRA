# Plan: clases, selección de personaje y nuevos objetos

Estado: implementación incorporada. Incluye clases, selector, catálogo, inventario, tienda, migración y pruebas automatizadas. La medición en teléfonos físicos y el ajuste fino del equilibrio quedan pendientes de sesiones de juego reales.

## Objetivo y punto de partida

Incorporar caballero, mago y arquero con diferencias jugables, mejorar la visibilidad de su selección y después ampliar los objetos que se pueden conseguir y utilizar. Mantener el juego web, el servidor temporal en una red local y los controles de móvil y PC.

Antes de esta entrega, `shared/content.ts` definía Viajero, Guardián y Mago como apariencias cosméticas. Todos compartían estadísticas, ataques y una espada. Existían cuatro objetos: poción de vida, cristal del valle, espada de hierro y filo astral. El selector mostraba botones pequeños con el nombre de la apariencia; la clase guardada en el servidor prevalecía sobre la seleccionada al entrar.

Esta entrega conservará el alcance actual de una sala de hasta ocho jugadores y el estilo 3D de geometría sencilla. Los valores de combate que siguen son iniciales y deberán ajustarse mediante pruebas.

## 1. Tres clases jugables

| Clase | Función y apariencia | Ataque básico | Habilidad 1 | Habilidad 2 |
| --- | --- | --- | --- | --- |
| Caballero | Combate cercano y resistencia; armadura, espada y escudo | Espadazo a un objetivo | Barrido que golpea a varios enemigos cercanos | Guardia: reducción temporal del daño recibido |
| Mago | Daño a distancia y en área; túnica y bastón | Proyectil arcano | Explosión alrededor del enemigo seleccionado | Barrera que absorbe una cantidad limitada de daño |
| Arquero | Daño preciso y movilidad; arco, capucha y carcaj | Flecha a un objetivo | Disparo potente con mayor tiempo de recarga | Evasión corta en la dirección de movimiento |

- Vida inicial propuesta: caballero 150, mago 100 y arquero 115. La progresión por nivel y las bonificaciones del equipo se calcularán desde definiciones compartidas.
- Alcance inicial del ataque básico: caballero 3,5 unidades, mago 9 y arquero 11. Recalibrar daño y recargas para que cada clase pueda completar las misiones individuales y aportar al grupo.
- Mantener cuatro acciones visibles: ataque, dos habilidades y consumible. Reutilizar las teclas configurables y los botones táctiles actuales; actualizar sus nombres, iconos, descripciones y recargas según la clase.
- No añadir un recurso de maná o munición en esta entrega. El mago y el arquero se equilibrarán mediante recargas, alcance y resistencia.
- La evasión respetará obstáculos y límites del mapa. Sin dirección de movimiento, usará la orientación del personaje. No atravesará paredes ni concederá invulnerabilidad inicialmente.
- Todos los ataques, impactos, defensas y consumos serán resueltos por el servidor. El cliente solicitará una acción y representará su resultado.
- Los proyectiles tendrán origen, destino, duración e identificador definidos por el servidor. Resolver su impacto una sola vez, validando objetivo vivo, alcance y obstáculos; cancelar si el objetivo deja de ser válido. En esta primera versión serán dirigidos al objetivo, sin apuntado balístico manual.
- Revisar la persecución y el regreso de los enemigos para que reaccionen al daño a distancia y no puedan atacarse indefinidamente desde fuera de su zona de respuesta.

La apariencia deberá distinguirse por la silueta, el arma y la animación, además del color. Los demás jugadores verán correctamente la clase, el equipo y sus efectos. El escudo del caballero formará parte de la clase; no requerirá otra ranura de equipo por ahora.

## 2. Selector de personajes más visible

Convertir la elección de clase en el contenido principal de la pantalla de entrada, antes del botón para jugar.

- Encabezado visible: **Elige tu clase**, con una explicación breve de que cambia las habilidades y el estilo de combate.
- Tres tarjetas con nombre, ilustración vectorial de arma o silueta, función, dificultad y resumen de habilidades. Mostrar resistencia, alcance y movilidad con texto comprensible.
- Caballero con acentos dorados, mago con violetas y arquero con verdes. La selección tendrá borde destacado, marca de verificación y texto «Seleccionado».
- Mostrar una vista previa 3D del personaje seleccionado y un resumen de sus dos habilidades. Reutilizar el motor existente y activar una única vista previa, pausándola al entrar al mundo.
- Botón principal: **Entrar como caballero**, **Entrar como mago** o **Entrar como arquero**. Separar claramente los estados de selección, conexión y error.
- Mantener el nombre y la elección de color junto al resumen del personaje, con menor peso visual que las clases.

En PC, distribuir las tarjetas en tres columnas y colocar el detalle junto a ellas o debajo según el ancho. En móvil, apilarlas de forma compacta y permitir desplazamiento vertical; las tres clases deben poder descubrirse sin depender de un carrusel. El botón de entrada permanecerá accesible sin tapar contenido ni el teclado virtual.

Usar selección exclusiva mediante controles de radio accesibles, navegación por teclado, foco visible, áreas táctiles de al menos 48 px y descripciones que no dependan de pasar el cursor. Respetar las preferencias actuales de tamaño de interfaz y movimiento reducido.

Para personajes existentes, mostrar la clase confirmada por el servidor. La interfaz no prometerá un cambio que el servidor vaya a ignorar. Durante la conexión se comprobará si corresponde la elección inicial o la migración descrita más adelante, antes de habilitar el combate.

## 3. Ampliar los objetos después de completar clases y selector

Añadir doce objetos a los cuatro actuales: dieciséis tipos en total, sin contar el arma básica gratuita de cada clase.

| Categoría | Nuevos objetos | Utilidad |
| --- | --- | --- |
| Bastones | Bastón de roble, bastón del umbral | Dos niveles de mejora para el mago, equivalentes a los niveles de las espadas actuales |
| Arcos | Arco de cazador, arco del umbral | Dos niveles de mejora para el arquero |
| Armaduras | Coraza de hierro, túnica rúnica, armadura de cuero | Protección específica para caballero, mago y arquero respectivamente |
| Accesorios | Amuleto de vitalidad, anillo de poder | Elegir entre vida adicional y daño adicional |
| Consumibles | Poción de vida mayor, vendaje | Curación superior; recuperación gradual fuera de combate que se interrumpe al recibir o infligir daño |
| Material | Fragmento del umbral | Recurso para intercambios de equipo con Elara |

### Inventario y equipo

- Tres ranuras de equipo: arma, armadura y accesorio. El equipo equipado seguirá perteneciendo al inventario; equipar y desequipar no duplicará objetos.
- Ampliar la capacidad de 12 a 24 casillas y organizarla en una cuadrícula adaptable. Mostrar ocupación, cantidades y avisos de inventario lleno.
- Definir por objeto su categoría, rareza, clases compatibles, bonificaciones, límite de apilado y precio o coste de intercambio. Evitar bonificaciones dispersas en condiciones específicas del cliente y del servidor.
- Armas y equipo sin atributos aleatorios en esta entrega; consumibles y materiales apilables. Las copias de equipo ocuparán casillas independientes.
- Añadir filtros por categoría, detalle legible, comparación con el equipo actual y botones explícitos para equipar o usar. Mostrar por qué una clase no puede equipar una pieza.
- Permitir elegir el consumible del cuarto botón de acción. Las pociones compartirán recarga para evitar alternarlas y eludirla; el vendaje tendrá sus restricciones visibles.
- Mantener el arma básica disponible por clase aunque el inventario esté lleno. No ocupa una casilla ni puede venderse.

### Obtención y economía

- Brotes: pociones, vendajes y cristales. Jabalíes: equipo inicial y materiales. Ecos: accesorios y fragmentos. Guardián del umbral: arma avanzada correspondiente a la clase de cada participante con derecho a recompensa.
- Crear tablas de botín configurables con cantidades y probabilidades explícitas; ajustar su frecuencia junto con los precios para que las mejoras acompañen los niveles 1–5.
- Ampliar la tienda de Elara con artículos y precios visibles, incluyendo intercambios de fragmentos. Mantener el intercambio actual de tres cristales por una poción.
- Validar coste, capacidad y requisitos antes de descontar monedas o materiales. La entrega y el cobro deberán ocurrir como una única operación del servidor.
- Si una recompensa personal de misión o jefe no cabe, registrarla como pendiente y permitir reclamarla con Elara. Guardar esa condición para evitar pérdidas o duplicaciones al reconectar.
- Mantener la recogida compartida del botín ordinario: solo el primer jugador cuya recogida válida confirme el servidor obtiene el objeto.

## 4. Compatibilidad con partidas guardadas

La actualización debe conservar nombre, nivel, experiencia, oro, misiones y objetos existentes.

1. Introducir una versión del perfil y una migración comprobable e idempotente. Documentar una copia de seguridad de SQLite con el servidor detenido antes de actualizar.
2. Como las clases antiguas eran cosméticas, ofrecer a todos los perfiles anteriores una elección gratuita de clase al volver a entrar. Sugerir caballero para Guardián, mago para Mago y presentar las tres opciones para Viajero.
3. Conservar el perfil anterior hasta que el servidor confirme la elección; después guardar la clase definitiva y marcar la elección como completada. Reconectar o reenviar la solicitud no concederá elecciones adicionales.
4. Conservar las espadas existentes. Si son incompatibles con la clase elegida, equipar el arma básica de esa clase y ofrecer con Elara un intercambio gratuito de espada por arco o bastón del mismo nivel. Consumir la pieza original y entregar su equivalente de forma atómica.
5. Normalizar los campos nuevos de equipo y las recompensas pendientes sin modificar el progreso anterior. Una versión de perfil desconocida deberá producir un error claro, sin sobrescribir el guardado.

Los personajes nuevos elegirán su clase al crearse. El cambio repetido de clase y los múltiples personajes por cuenta quedan fuera de esta entrega.

## 5. Orden de implementación y archivos principales

| Fase | Trabajo | Resultado verificable |
| --- | --- | --- |
| 1. Base de datos de juego y compatibilidad | Definiciones de clases, habilidades y equipo; versión de perfil y migración | Perfiles nuevos y antiguos cargan conservando progreso |
| 2. Clases completas | Combate autoritativo, defensas, proyectiles, siluetas, armas básicas y barra de acciones | Caballero, mago y arquero pueden jugar juntos con habilidades diferentes |
| 3. Selección de personaje | Tarjetas, vista previa, accesibilidad, adaptación móvil y confirmación de clase persistida | La elección es visible y coincide con el personaje que entra al mundo |
| 4. Nuevos objetos | Catálogo, ranuras, inventario, tienda, botín y recompensas pendientes | Los doce objetos nuevos se obtienen y producen su efecto real |
| 5. Ajustes y validación | Equilibrio, regresiones, pruebas de red y rendimiento móvil | Misiones, persistencia y controles siguen funcionando con las tres clases |

- `shared/content.ts`: catálogo de clases y objetos, fórmulas, límites y configuración de botín. Separar catálogos en módulos si el tamaño dificulta mantenerlos.
- `shared/schema.ts`: clase y equipo visible, estados temporales de combate y datos necesarios para representar proyectiles.
- `server/world.ts`: habilidades, daño, defensas, requisitos de equipo, compras y recompensas.
- `server/database.ts`: versión y migración de perfiles, elección pendiente y recompensas persistentes.
- `server/app.ts`: validación de selección de clase y mensajes de acciones, equipo e intercambios.
- `client/scene.ts`: personajes y armas diferenciados, animaciones, vista previa y efectos con reutilización de recursos.
- `client/ui.ts`, `client/main.ts` y estilos: selector, detalles de habilidades, inventario y tienda. Evitar recrear controles completos si eso pierde el foco o la selección.
- `client/input.ts`, `client/touch-controls.ts` y `client/preferences.ts`: conservar el contrato de cuatro acciones, la configuración y los gestos actuales.
- `tests/` y `README.md`: pruebas de comportamiento e instrucciones actualizadas de clases, controles y objetos.

## 6. Criterios de aceptación

- Cada clase dispone de apariencia reconocible, ataque y dos habilidades diferentes, visibles también para otros jugadores.
- El servidor rechaza ataques fuera de alcance, a través de obstáculos, durante recarga o con objetivos inválidos. Ningún proyectil genera impactos duplicados.
- Guardia y barrera expiran correctamente; la evasión no atraviesa obstáculos; el vendaje se interrumpe en combate.
- El selector funciona con teclado y pantalla táctil, conserva el foco y comunica la selección sin depender del color.
- Revisar pantallas de 360 × 640, 390 × 844, 844 × 390, 768 × 1024 y 1366 × 768, incluyendo escala de interfaz del 150 % y teclado virtual abierto.
- Los dieciséis tipos de objeto tienen una forma comprobable de obtención, una descripción y un uso o intercambio. Las restricciones y bonificaciones coinciden entre interfaz y servidor.
- Probar inventario lleno, falta de oro, doble clic de compra, recogida simultánea, cambio de equipo y reconexión para comprobar que no se pierden ni duplican objetos o recompensas.
- Probar migraciones de Viajero, Guardián y Mago, con cada espada antigua, y ejecutarlas dos veces para verificar que mantienen el mismo resultado.
- Ejecutar pruebas multijugador con las tres clases y una sesión de ocho jugadores; completar las misiones existentes y reiniciar el servidor para comprobar persistencia.
- Medir rendimiento en un móvil físico y en PC. Objetivo inicial de al menos 30 FPS estables en calidad baja en el móvil de prueba, registrando modelo y navegador; limitar proyectiles, partículas y recursos de la vista previa según los resultados.

La planificación no incorpora nuevas zonas, enemigos, PvP, fabricación, subastas ni infraestructura de MMO masivo. Esas ampliaciones podrán apoyarse posteriormente en los catálogos y sistemas de equipo de esta entrega.
