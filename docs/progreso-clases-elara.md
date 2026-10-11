# Progreso por clase y Elara itinerante

Cada acceso del navegador conserva tres historias independientes: caballero, mago y arquero. La primera vez que se activa una clase comienza en nivel 1. Los niveles, experiencia, oro, misiones, inventario, equipo y recompensas se guardan por separado. Nombre y estandarte son comunes al acceso. Importar un acceso en otro navegador recupera sus tres historias; no se identifica físicamente al dispositivo.

El cambio se realiza desde el inventario o la casa, junto al puesto del estandarte propio. El servidor valida posición, vida, conexión y clase. Guarda la historia saliente antes de activar la entrante; limpia estados de combate y contribuciones de la clase anterior. El guardado SQLite mantiene el perfil activo y añade `class_profiles` con clave compuesta por acceso y clase, sin borrar el progreso anterior. Ambas escrituras se realizan en una transacción.

Elara recorre las cinco casas a 0,85 unidades por segundo, por caminos transitables de la aldea. Posición, orientación y animación se sincronizan en el estado de la sala. Abrir una conversación cerca de ella detiene su marcha; el diálogo mantiene esa conversación mediante mensajes periódicos. La última despedida, salida de alcance o desconexión inicia una espera aleatoria de 3 a 10 segundos. Una conversación cuyo cliente desaparece sin avisar vence en 2,5 segundos para no dejar a Elara detenida indefinidamente.

Las armas y armaduras del botín se adaptan a la clase que las recoge conservando su grado. Los consumibles, materiales y accesorios universales siguen siendo comunes. Las tiendas filtran el equipo por clase y el servidor rechaza adquisiciones incompatibles. Los objetos antiguos ya guardados no se eliminan. Las recompensas pendientes se adaptan al reclamarlas.

Los estandartes se presentan como Brasa, Sol, Bosque, Ámbar y Hoja. Hoja sustituye la apariencia del antiguo estandarte gris y mantiene su identificador interno para conservar alianzas y guardados. El juego utiliza nombres y emblemas de elementos para identificarlos.

## Verificación

- Compilación de producción y comprobación de tipos.
- 51 pruebas de lógica, persistencia, combate y red: separación entre clases y accesos, reinicio de SQLite, restricciones de cambio, afinidad de objetos, visitas a las cinco casas, velocidad y colisiones, conversaciones simultáneas y tiempo de espera.
- Prueba de navegador en móvil: cambio mago–arquero–mago con niveles e inventario independientes, catálogo adecuado y conversación con Elara desde dos clientes sincronizados.
- Las pruebas de interfaz usan Chromium con emulación táctil; las comprobaciones físicas en Android y Safari/iOS siguen pendientes.
