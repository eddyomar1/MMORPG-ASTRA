# Verificación de estandartes, PvP y comercios

Implementación de [la planificación actualizada](plan-estandartes-pvp-aldea.md).

## Comprobaciones del servidor

`npm run build` y `npm test` completados correctamente: 45 pruebas.

- Los cinco estandartes usan colores canónicos; el color enviado por el cliente no cambia el bando.
- Migraciones desde perfiles cosméticos y versión 2 a versión 3. La elección única conserva progreso, equipo y recompensas, bloquea acciones hasta confirmar y persiste al reconectar.
- Ataques básicos y especiales de las tres clases: rivales válidos reciben daño, aliados y el propio atacante no. Guardia, barrera y equipo intervienen en el daño.
- Borde `z = 5`, consumibles y defensas en la aldea, áreas con jugadores protegidos y criaturas fuera del recinto.
- Proyectiles cancelados por entrada del atacante o del objetivo en la aldea, desconexión, retirada del jugador, muerte, distancia y obstáculos.
- Ninguna recompensa por derrotar jugadores; las tres campañas y el reparto cooperativo contra criaturas siguen pasando.
- Cinco casas accesibles desde el santuario. Solo el puesto propio permite comprar, vender y canjear, con validación en cada operación. Se conservan transacciones atómicas e inventarios completos.
- Ocho clientes WebSocket con las tres clases y cinco bandos, sincronización de colores y daño PvP, capacidad y reconexión durante un proyectil en vuelo.

## Navegador

`npm run test:browser` completado correctamente: **7 pruebas**, con Chromium y renderizado por software.

Comprobaciones realizadas:

- Selector de las tres clases, una vista previa 3D, recuperación de personaje y migración de clase seguida de estandarte desde móvil.
- Selección de los cinco estandartes, traje canónico sincronizado y combate con un rival elegido desde la interfaz.
- Comercio rechazado fuera de la casa propia y compra aceptada junto a su puesto; la vida del menú permanece visible durante los avisos.
- Avisos encima del tutorial, avisos con el tutorial cerrado y traslado al encabezado de los menús.
- Interfaz al 150 % en 360 × 640, 390 × 844, 844 × 390 y 1366 × 768, con comprobación de desbordamiento y separación entre consejos y controles.
- Movimiento, ataque simultáneo, giro y zoom táctil, cancelaciones, preferencias persistentes y uso de consumibles desde el inventario.

Se corrigió un solapamiento de «Hablar/Comerciar» con «Cambiar objetivo» en horizontal. Los letreros de las casas se sitúan sobre sus techos y tienen una marca del color del bando.

Las capturas y trazas se generan en `test-results/`, excluido de Git.

## Acceso público

Comprobado un Quick Tunnel temporal de Cloudflare contra un servidor aislado en el puerto 3111, con SQLite en memoria. La página compilada y `/api/health` respondieron por HTTPS. Dos clientes WSS entraron en la misma sala y recibieron los estandartes y colores canónicos del otro jugador. Se cerraron ambos procesos de prueba al terminar; no se usaron los guardados reales ni se conserva ese enlace como dirección de juego.

## Límites de la comprobación

Las pruebas táctiles usan emulación y eventos de Chromium. Quedan pendientes Safari/iOS, teléfonos Android físicos, teclado virtual y mediciones sostenidas de temperatura, batería y rendimiento. Los ocho clientes comprueban la capacidad de la sala y las reglas sincronizadas; no son ocho dispositivos físicos.

El multiplicador de daño PvP está separado en `shared/banners.ts` y comienza en `1`. Se han comprobado las reglas, pero el equilibrio competitivo requiere partidas reales.
