**Astra: plan de comodidad y controles para móvil y PC**

Estado: implementación en el cliente, con pruebas automatizadas de controles y navegador. La matriz siguiente conserva los objetivos de aceptación. La comprobación física en Android/iOS, las sesiones de 15 minutos y la evaluación con dos personas siguen pendientes; las capturas y la emulación no certifican esos puntos.

El objetivo es que una persona pueda entrar, desplazarse, combatir, conversar, gestionar objetos y completar las misiones desde un teléfono o un PC sin depender de instrucciones de teclado en una pantalla táctil. Se conservará la identidad visual de Astra, con paneles verdes y acentos dorados, mejorando legibilidad y espacio disponible para ver el mundo.

**Punto de partida**

- `client/main.ts` concentra controles, red y paneles. El movimiento se envía cada 50 ms; el servidor ya acepta vectores de movimiento, correr, detenerse, acciones e interacción.
- `client/scene.ts` configura la cámara para botón derecho y rueda. La selección utiliza una única posición de inicio del puntero, insuficiente para arbitrar varios dedos y distinguir sus funciones.
- `client/style.css` adapta tamaños a 800 y 540 px, pero llega a textos de 6–9 px y controles de navegación de 29 px. En móvil desaparece el seguimiento de misión y el chat permanece sobre el mundo.
- Abrir un diálogo activa `view.suspended`: la imagen deja de actualizarse aunque el servidor continúa simulando enemigos y daño.
- Ya existen controles de calidad alta/baja y reducción de movimiento en CSS. Faltan ajustes táctiles y validación de rendimiento en teléfonos físicos.
- La prueba de navegador actual verifica dos clientes de escritorio. No comprueba gestos simultáneos ni teclado virtual.

**Decisiones de diseño iniciales**

1. Móvil horizontal será la disposición principal para combate con ambos pulgares. Vertical permitirá completar las mismas acciones con paneles más compactos; no se impondrá un bloqueo de orientación.
2. La distribución dependerá del espacio disponible y los controles del dispositivo usado. Un portátil táctil o una tableta con teclado podrá combinar métodos de entrada. Habrá una preferencia «Automático / Táctil / Teclado y ratón».
3. La información permanente será vida, objetivo seleccionado, siguiente objetivo de misión y acciones. Grupo, chat, mapa completo e inventario podrán expandirse cuando hagan falta.
4. La mecánica y la validación seguirán en el servidor. Un gesto táctil ejecutará la misma acción que su equivalente en PC.
5. Las dimensiones siguientes son valores iniciales para prototipar y probar, no medidas verificadas en dispositivos reales.

**Experiencia de juego propuesta**

| Acción | Móvil y tableta táctil | PC |
| --- | --- | --- |
| Moverse | Joystick fijo abajo a la izquierda, con zona muerta y desplazamiento gradual | WASD/flechas y clic en el suelo |
| Correr | Botón con estado visible junto al joystick | Shift; opción de alternar en lugar de mantener |
| Cámara | Arrastrar sobre una zona libre del mundo; botón para centrar | Arrastrar con botón derecho; centrar desde controles |
| Zoom | Pellizco con dos dedos iniciados en el mundo; botones +/− como alternativa | Rueda y botones +/− |
| Seleccionar enemigo | Tocar enemigo y botón para cambiar entre objetivos cercanos | Clic; Tab cuando el mundo tiene el foco |
| Atacar | Botón principal grande; mantener repite ataques al ritmo permitido | Espacio/1 y botón de ataque; conservar mantener Espacio |
| Habilidades | Tres botones para onda, curación y poción, con enfriamiento visible | Q/F/R y barra con atajos visibles |
| Hablar o recoger | Botón contextual próximo al bloque de acciones | E y el mismo botón contextual |
| Inventario, misiones, mapa | Menú compacto con nombres e iconos | Accesos visibles I/J/M y menú |
| Chat | Botón con contador de mensajes; panel al tocar | Panel plegable; Enter para escribir |

El joystick tendrá una base inicial de 120–144 px CSS. El ataque tendrá 64–72 px; el resto de objetivos táctiles, al menos 48 × 48 px y unos 8 px de separación. La elección de 48 px es un objetivo del proyecto; la referencia de tamaño mejorado de WCAG es 44 × 44 px CSS y contempla excepciones. [W3C: tamaño de objetivo mejorado](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced).

La cámara mantendrá su ángulo mientras se mueve el personaje, con sensibilidad ajustable. El joystick se interpretará respecto a la cámara, como el teclado actual. No habrá giro automático que cambie inesperadamente la dirección de avance.

En modo joystick, tocar terreno vacío no iniciará un desplazamiento. «Tocar para moverse» será una alternativa configurable. Tocar un enemigo seleccionará sin atacar; el botón de ataque ejecutará la acción. Habrá un indicador claro del objetivo y de cuándo está fuera de alcance. La selección asistida opcional elegirá candidatos visibles y cercanos y estará disponible en ambos dispositivos, respetando la validación de alcance y obstáculos del servidor.

**Distribución de la interfaz**

| Zona | Móvil horizontal | Móvil vertical | PC |
| --- | --- | --- | --- |
| Arriba izquierda | Vida y nivel compactos; grupo plegado | Vida, nivel y acceso al grupo | Personaje y grupo; grupo plegable |
| Arriba centro | Objetivo enemigo solo al seleccionarlo | Objetivo bajo la franja superior | Objetivo seleccionado |
| Arriba derecha | Minimapa compacto y menú | Botón de mapa y menú | Minimapa y misión plegable |
| Seguimiento de misión | Resumen de una o dos líneas, desplegable | Siguiente objetivo en una línea, desplegable | Objetivo, progreso y acceso al diario |
| Abajo izquierda | Joystick y correr | Joystick | Chat plegable |
| Abajo derecha | Ataque, habilidades, interacción y cambiar objetivo | Mismo conjunto compacto | Navegación secundaria |
| Abajo centro | Acceso a chat, fuera del área de gestos | Acceso a chat y menús | Barra de habilidades con atajos |

Durante la partida, la cabecera de marca se reducirá para liberar altura. Invitar amigos, sonido y ajustes seguirán disponibles en el menú. Oro, experiencia detallada, FPS y latencia estarán en paneles secundarios; las alertas de conexión serán visibles cuando haya un problema.

El centro del mundo quedará libre de paneles permanentes. Los avisos se agruparán para no tapar el combate. Las etiquetas de personajes tendrán prioridad por selección y proximidad, evitando mostrar todos los nombres superpuestos.

En PC se ofrecerá escala de interfaz entre 100 % y 150 %, modo compacto y paneles plegables. En pantallas pequeñas, aumentar la escala cambiará la distribución en vez de recortar controles. Texto habitual de 14–16 px y formularios móviles de 16 px como punto de partida. El contraste se comprobará sobre fondos claros y oscuros del mundo.

**Menús, chat y accesibilidad**

- Inventario: tocar o hacer clic selecciona un objeto; descripción legible y botón explícito para equipar o usar. La compra mostrará su coste junto a la acción. No depender de arrastrar objetos ni de pasar el ratón.
- Misiones: objetivo actual primero, progreso visible y recompensas después. Tutorial breve según el método de entrada, que se complete al realizar cada acción y pueda reabrirse.
- Paneles: laterales o centrados en PC; amplios y desplazables en móvil, con encabezado y cierre siempre accesibles. Solo un panel principal abierto. Conservar foco, selección y desplazamiento cuando llegue una actualización del personaje.
- Multijugador: abrir un panel detendrá las órdenes locales de movimiento y ataque, mantendrá el mundo visible y mostrará la vida y las alertas de daño. Texto breve «El mundo sigue activo» donde corresponda. Cerrar el panel no reanudará una pulsación anterior.
- Chat: enviar y cerrar fácilmente, conservar un borrador al interrumpirse la sesión y distinguir mensajes nuevos. Al escribir, se neutralizan controles de juego y atajos. El teclado virtual no deberá cubrir el campo ni el botón de enviar.
- Teclado: Escape cierra primero el panel activo y devuelve el foco; en el mundo, cancela la selección. Tab conserva su navegación normal dentro de formularios y menús. Atajos reasignables, con detección de duplicados y restauración de valores iniciales.
- Accesibilidad: nombres accesibles, foco visible, estado además de color, enfriamientos con números y movimiento reducido también en cámara y efectos 3D. Evitar anunciar continuamente cada actualización de vida a tecnologías de asistencia.
- Preferencias: guardar tamaño de controles, sensibilidad, escala, distribución para zurdos y calidad en el navegador. Ofrecer restablecer. Cambiar de modo no borrará estas preferencias.

**Trabajo técnico propuesto**

| Archivo o módulo | Responsabilidad |
| --- | --- |
| `client/input.ts` (nuevo) | Acciones comunes, estado de entrada, prioridad de métodos y neutralización |
| `client/touch-controls.ts` (nuevo) | Joystick, botones mantenidos, captura de punteros y distribución para zurdos |
| `client/preferences.ts` (nuevo) | Preferencias validadas y compatibilidad con ajustes guardados actuales |
| `client/main.ts` | Conectar acciones con mensajes existentes y coordinar conexión/paneles |
| `client/scene.ts` | Gestos de cámara, selección, renderizado durante menús y calidad |
| `client/ui.ts` y `client/style.css` | HUD adaptable, paneles, tutorial, foco y estados visibles |
| `index.html` | Ajustes del área visible para pantallas con recortes |
| `server/world.ts` | Revisar mensajes de ayuda que hoy exigen pulsar E; mantener reglas y validación |
| `tests/` y `playwright.config.ts` | Pruebas de entrada, perfiles de pantalla y regresión multijugador |

Se mantendrán Babylon.js, TypeScript, HTML/CSS y Colyseus. La adaptación no requiere otro motor ni un framework de interfaz nuevo. Los módulos nuevos separarán responsabilidades que hoy están concentradas en `main.ts`.

La gestión táctil usará Pointer Events y una función asignada a cada `pointerId`. Un dedo capturado por el joystick o un botón no participará en los gestos de cámara. Solo un controlador interpretará la cámara táctil para evitar que Babylon y los manejadores propios apliquen el mismo movimiento dos veces. `pointerup`, `pointercancel` y `lostpointercapture` liberarán la acción. [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).

También se neutralizará toda entrada al abrir paneles, cambiar de orientación o método de control, perder el foco, ocultarse la página, morir, desconectarse o salir. Al reconectar se requerirá una nueva pulsación. Cuando exista conexión se enviará `stop` para cancelar tanto el movimiento continuo como un destino pendiente; no basta con enviar un vector cero. El estado táctil se enviará mediante el intervalo existente, evitando un mensaje de red por cada evento del dedo.

`touch-action: none` se limitará al mundo y los controles que interpreten gestos. Los paneles conservarán desplazamiento y los formularios sus gestos normales. Se evitará desactivar globalmente el zoom del navegador. Se usarán dimensiones dinámicas del área visible y `env(safe-area-inset-*)` para separar controles de recortes y bordes del sistema. [MDN: variables de entorno CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/env).

Para el teclado virtual se observará `VisualViewport` cuando esté disponible, con una alternativa basada en redimensionamiento y paneles desplazables. El tamaño del canvas y sus coordenadas de selección se actualizarán juntos al rotar o cambiar el área visible. [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

**Rendimiento y sesiones móviles**

La meta inicial será sostener 30 FPS en los teléfonos de referencia durante una sesión de al menos 15 minutos; 60 FPS será una opción para equipos capaces. Es una meta pendiente de medición, no una promesa para cualquier móvil.

Se ofrecerán calidad automática, baja, media y alta, además de un perfil de ahorro. Tras medir la base, ajustar resolución 3D, sombras, resplandor, partículas y frecuencia de actualizaciones del minimapa. La interfaz HTML deberá seguir nítida al reducir la resolución del mundo. La calidad automática usará mediciones sostenidas y márgenes antes de cambiar, para evitar oscilaciones; una elección manual tendrá prioridad.

No se clasificará la potencia de un dispositivo solo por el ancho de pantalla. Se medirán tiempos de fotograma, memoria disponible mediante herramientas del navegador y estabilidad tras sesiones prolongadas. Se comprobarán audio tras interacción, retorno desde otra aplicación, reconexión y recuperación ante pérdida del contexto gráfico. Estas pruebas utilizarán dispositivos físicos además de emulación.

**Fases y entregables**

| Orden | Trabajo | Criterio de salida |
| --- | --- | --- |
| 1. Base y medidas | Registrar comportamiento actual, definir tamaños/estados, separar entrada y preferencias | Teclado y ratón conservan su funcionamiento; cualquier cancelación deja entradas neutras |
| 2. Control táctil | Joystick, cámara, zoom, selección, acciones y controles para zurdos | Moverse y atacar simultáneamente con dos dedos; girar cámara mientras se avanza; sin movimiento accidental al tocar menús |
| 3. Interfaz compartida | Distribuciones móvil/PC, paneles, inventario, chat, tutorial y accesibilidad | Recorrido completo de misión en ambas orientaciones y PC; sin controles esenciales tapados |
| 4. Rendimiento y recuperación | Perfiles gráficos, área visible, segundo plano y reconexión | Cumplir la meta en los dispositivos de referencia o documentar y corregir las limitaciones observadas |
| 5. Validación y cierre | Pruebas automatizadas y sesiones PC + móvil; documentación de controles | Criterios funcionales y de comodidad verificados, con dispositivos y resultados registrados |

Las pruebas acompañarán cada fase. La fase 5 reúne la comprobación completa; no aplaza todos los fallos hasta el final. La primera entrega revisable será una partida con movimiento, cámara y combate táctiles junto a los controles actuales de PC.

**Matriz de aceptación**

- Pantallas iniciales en píxeles CSS: 360 × 640 y 390 × 844 en vertical; 640 × 360 y 844 × 390 en horizontal; tableta 768 × 1024; PC 1024 × 600, 1366 × 768 y 1920 × 1080. Repetir con escala de interfaz mayor, nombres largos, ocho jugadores y paneles abiertos.
- Navegadores: Chrome en Android, Safari en iOS y Chrome/Firefox en PC, registrando versiones y modelos usados. No se definirá compatibilidad mínima definitiva antes de las pruebas físicas.
- Recorrido completo: entrar, moverse, correr, orientar cámara, seleccionar y derrotar un enemigo, usar habilidades y poción, recoger botín, aceptar/entregar misión, equipar y comprar, conversar, salir y recuperar personaje.
- Multitáctil: joystick + ataque, joystick + cámara y pellizco separado de los controles. Un arrastre o pellizco no debe acabar convertido en una selección o una orden de desplazamiento.
- Interrupciones: soltar fuera del botón, cancelar el puntero, rotar, abrir chat/panel, ocultar la página, perder conexión y volver. En todos los casos, sin movimiento ni ataques retenidos.
- Visibilidad: ninguna acción esencial se superpone con otra ni queda bajo teclado virtual, recorte de pantalla o borde de gestos del sistema. Los menús admiten desplazamiento y cierre; el daño sigue siendo visible.
- Comodidad: dos personas completan la primera misión sin ayuda verbal, una con móvil y otra con PC. Registrar los errores y dudas para ajustar tamaños, etiquetas y tutorial.
- Rendimiento: registrar una sesión de 15 minutos con recorrido por las tres zonas y combate, y otra con carga de ocho jugadores. Medir mediana y percentil 95 de tiempo de fotograma, además de estabilidad; acordar los dispositivos de referencia al comenzar las mediciones.

Las pruebas unitarias cubrirán comportamiento significativo: normalización y zona muerta, transformación respecto a cámara, cancelación de acciones, prioridad de controles y conflictos de atajos. Playwright comprobará recorridos, foco, paneles y tamaños táctiles. Los eventos sintéticos no demostrarán por sí solos que funciona un gesto real: multitáctil, teclado del sistema, batería y comportamiento de Safari necesitarán comprobaciones físicas. Se conservarán las pruebas existentes del servidor y de dos clientes, adaptando únicamente los recorridos cuyo diseño cambie.

**Mejoras posteriores**

Tras completar esta adaptación se podrán valorar instalación como PWA, mando físico, joystick flotante y edición libre de la posición de botones. No forman parte de la primera entrega de comodidad. La publicación en Internet y el aumento de capacidad del servidor siguen siendo trabajos separados.
