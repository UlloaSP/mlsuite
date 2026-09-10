# Revisión visual y funcional previa al merge

Estado: cierre por indicación del usuario. Se terminan únicamente las correcciones ya iniciadas. No se ha mergeado la PR.

Pruebas realizadas el 9 de septiembre de 2026 sobre Docker local y Chromium real, con datos propios de QA. Se han usado escritorio, móvil de 390 px y tablet de 768 px, temas claros y oscuros, teclado y movimiento reducido.

## Cobertura

La [matriz de pruebas](../output/playwright/qa-feature-matrix.md) distingue lo probado, las funciones no ofrecidas por la interfaz y los casos pendientes. Los informes conservan reproducciones, IDs de los datos, capturas y resultados de las repeticiones.

- Autenticación, registro, cierre de sesión, retorno a rutas protegidas, perfil y notificaciones.
- Organizaciones, miembros, invitaciones, roles, plantillas, usuarios y restricciones de acceso.
- Carga e inspección de modelos y dataframes, composición de esquemas, edición JSON, conflictos, snapshots y bookmarks.
- Inferencia individual y masiva con CSV/XLSX, clasificación, regresión, one-hot y cuatro modelos simultáneos.
- Feedback, cuestionarios de varios pasos, revisiones, exportación y plugins de campos e informes.
- Ajustes, guía, navegación, responsive, transiciones e infraestructura.

## Correcciones comprobadas

| Problema observado | Cambio |
|---|---|
| Guardar varios modelos perdía un modelo con nombre vacío | Se conservan los elementos pendientes en el formulario |
| Preselección de modelo y nombre de inferencia se perdían | Se normalizan IDs numéricos y se conserva el nombre escrito |
| CSV one-hot rechazado y resumen de carga incompleto | Se conservan los destinos de columnas y se muestran filas omitidas/sin procesar |
| Búsqueda del historial rompía con IDs numéricos | Se normalizan los valores antes de filtrar |
| Búsqueda global enviaba inferencias a una ruta inexistente | Se enlaza al detalle actual de inferencias |
| Guardar feedback desmontaba el formulario durante el envío | Se mantiene el formulario hasta finalizar la operación |
| Campo opcional tratado como obligatorio | Se respeta la configuración en el formulario y en el cálculo de completado |
| Cuestionario mal configurado rompía la página | Validación en el editor y error explícito al abrir datos antiguos inválidos |
| Sin cuestionario aparecía feedback pendiente | Se muestra que no hay feedback configurado |
| Recursos inexistentes parecían páginas vacías válidas | Se muestra un estado de recurso no disponible con navegación de retorno |
| Controles o campos quedaban fuera de la vista móvil | Correcciones de sidebar, tipografía, modelos, previews y acciones de snapshots |
| Borrador publicado ofrecía guardar/editar | Se abre en modo de lectura |
| Rol con miembros ofrecía un borrado imposible | Se explica que deben reasignarse los miembros |
| Roles de lectura recibían 403 al abrir modelos/esquemas | Se usan los permisos de lectura del recurso y se mantiene el aislamiento por organización |
| Borrado de organización, usuario o esquema terminaba en 500 | Se corrigen las referencias y el orden de borrado; datos protegidos devuelven conflicto |
| Archivo joblib corrupto terminaba en 500 | Se rechaza con 400 y explicación clara |
| Infraestructura marcaba servicios desconocidos como sanos | Se separan estados de ejecución y salud |
| Stop/Restart se ejecutaban sin confirmación | Se solicita confirmación y se permite cancelar |
| Terminal prometía ser de solo lectura | El texto describe los permisos reales del shell |
| Acciones de alertas no hacían nada | Se eliminan los botones sin implementación |
| HTML antiguo mezclaba versiones tras desplegar | Cabecera no-cache y recuperación manual de errores de carga de módulos |

## Evidencia de resultados

- El CSV completo de 16 inferencias coincide con todos los inputs y resultados esperados. La selección explícita de una fila exporta únicamente esa fila y su feedback.
- La carga cancelada de 200 filas conservó 73 resultados y mostró 127 sin procesar. La petición que ya estaba en curso terminó antes de detener el bucle.
- La inferencia de cuatro modelos produjo los valores esperados, incluida regresión 100000 y probabilidades one-hot 98,4/1,6.
- El cuestionario de cinco pasos guardó 5/5 con el campo opcional vacío y conservó las respuestas al recargar.
- Borrar y volver a subir un plugin recupera el informe de una inferencia ya guardada.
- Reabrir una revisión conserva sus respuestas. Borrar la respuesta conserva la asignación, vacía los campos y vuelve a pendiente.

## Informes y límites

### Pendiente de comprobar al parar

- Repetición en Docker de los últimos cambios de interfaz: permisos de solo lectura, botón de recarga por módulo ausente y eliminación de acciones ficticias en alertas.
- Endpoint de fuentes de plugins con usuario de solo lectura y revisor, comprobando en el navegador el renderizado y la denegación del catálogo de gestión.
- Completar una revisión sin cuestionario y renderizar un informe custom dentro de la revisión, después de la última corrección. El bloqueo original sí se reprodujo.
- Ciclo real Stop/Start/Restart tras corregir el listado de contenedores detenidos, el alcance de Start y el timeout. Antes de corregirlo, Start devolvió 502 aunque arrancó; el servicio quedó funcionando.
- Repetición integral de los recorridos anteriores sobre una única imagen final con todos los cambios. Las comprobaciones de navegador realizadas corresponden a varias reconstrucciones sucesivas.
- Casos pendientes: invitaciones expiradas, revocadas, duplicadas o aceptadas con otra cuenta; acceso a la asignación de otro revisor; paginación con varias páginas, límites de fecha y resultados de inferencia parcialmente fallidos. La matriz y los informes detallan los casos realmente ejecutados.
- Safari, Firefox, móviles físicos, producción y CI remota de estas últimas correcciones.

[ML e inferencias](../output/playwright/ml-results.md), [visual y ajustes](../output/playwright/settings/settings-results.md), [administración](../output/playwright/admin-results.md), [historial y revisión](../output/playwright/history-inferences-results.md), [infraestructura](../output/playwright/infra-results.md).

La comprobación corresponde a Chromium y este entorno local. No equivale a certificar Safari/Firefox, producción, todos los datos posibles ni cada combinación de permisos. La matriz identifica casos sin datos suficientes, como paginación en catálogos pequeños y límites temporales. No se han inventado funcionalidades ausentes, como restaurar modelos archivados o editar/borrar bookmarks desde una interfaz que no ofrece esas acciones.

Se conservaron los datos existentes. Las pruebas emplearon cuentas y organizaciones QA; los fixtures principales permanecen para reproducir resultados. Los datos temporales creados para probar borrados se eliminaron. Las preferencias visuales de prueba se restauraron.

Las correcciones están en el checkout local de la rama de trabajo, sin commit ni merge. La CI remota anterior no valida estos cambios todavía.

Verificación técnica al cierre: API 273 tests, Python runtime 43 y ops-agent 16, todos correctos. La última suite completa de frontend pasó 270 tests antes de los cambios finales; después pasaron 23 tests específicos de permisos/recuperación y 13 de revisión/arquitectura, además de TypeScript. No se repitió la suite completa de frontend después de esos cambios. Graphify actualizado; mantiene avisos por archivos sin nodos y parser SQL ausente. Estas comprobaciones no sustituyen las pruebas de navegador pendientes.
