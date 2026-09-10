# Propuesta DevSecOps para MLSuite

Fecha: 2026-09-09. Alcance: auditoría de configuración y propuesta; sin implementar ni desplegar cambios.

Recomiendo mantener Docker Compose, alojar dev y producción en hosts distintos y promover exactamente las mismas imágenes entre ambos. Antes de automatizar producción hay que corregir publicación mutable, protección de GitHub, secretos, migraciones y comprobaciones de disponibilidad.

## Evidencia y límites

- Checkout auditado: `e5cbaf7c8dae94da5a100ad13b84795a8cc094a6`. Graphify declara el mismo commit. No existe `graphify-out/wiki/index.md`.
- GitHub consultado con `gh api`: repositorio público, `main.protected=false`, cero rulesets y cero Environments. Actions permite todas las acciones y no exige SHA. Permisos predeterminados del token: lectura; no puede aprobar PR.
- `main` remoto consultado: `9bd56bfc40588e42c23494f786702ac2950bb124`. No es el mismo commit local. Los hallazgos de código se refieren al checkout; los de configuración remota, a las respuestas de GitHub.
- Seis ejecuciones recientes devueltas por GitHub terminaron en éxito. La más reciente devuelta es del 16 de julio. Son publicaciones de imágenes; no constituyen evidencia de tests o despliegues correctos.
- `.env` está versionado localmente y existe en el `main` público remoto. Se inspeccionaron nombres y categorías de valores locales sin reproducir credenciales. No se ha demostrado que los valores sean credenciales activas de un servidor.
- Pasan `docker compose -f docker-compose.prod.yml config --quiet` y `docker compose -f docker-compose.dev.yml config --quiet`. Esto comprueba resolución de configuración, no arranque ni seguridad de red.
- No se ejecutaron suites, builds, escáneres de vulnerabilidades, restauraciones ni pruebas visuales. No se inspeccionaron servidores, firewall, TLS efectivo ni configuración completa de GitHub Code Security.

## Hallazgos prioritarios

| ID | Prioridad | Evidencia | Consecuencia y corrección |
|---|---|---|---|
| D01 | Antes de publicar un entorno | `.env` versionado; `.gitignore` no excluye `.env` general | Si se reutilizó algún valor, rotarlo. Retirar secretos activos del seguimiento, conservar `.env.example` saneado y revisar historial. Borrar el archivo del último commit no revoca credenciales. |
| D02 | Antes de CD | `.github/workflows/publish-ghcr.yml:4`, `:72`; `api/Dockerfile:7` | Solo publicación en main/tags/manual; sin CI de PR ni suites. API omite tests. Añadir gates obligatorios antes de publicar/promover. |
| D03 | Antes de CD | `.github/workflows/publish-ghcr.yml:64`, `:80` | Todos los eventos escriben `latest`, incluso tags históricos y manuales. Matrix puede publicar un conjunto parcial. Usar digests y manifiesto completo por release. |
| D04 | Antes de producción | `docker-compose.prod.yml:35`, `:68`; `application.properties:95` | PostgreSQL/MinIO mutables y Hibernate `update` impiden controlar upgrades y vuelta atrás. Fijar versiones/digests y migraciones explícitas. |
| D05 | Antes de producción | `docker-compose.prod.yml:29`; `ops-agent/src/mlsuite_ops_agent/config.py:21` | Docker socket implica privilegios sobre el host si se compromete el agente. Separar hosts, exigir secreto propio y restringir operación administrativa. |
| D06 | Antes de CD | `StartupReadinessController.java:20`; `StartupReadinessService.java:32` | HTTP 200 con `ready=false`, omite MinIO y depende de ops-agent. Un `curl -f` puede aceptar un despliegue roto. Corregir contrato y añadir prueba funcional. |
| D07 | Antes de producción | `ModelStorageBackfillRunner.java:48`, `:76` | Backfill vuelve a seleccionar filas fallidas/sin bytes sin progreso. Si está habilitado, puede mantener el arranque ocupado indefinidamente. Migración reanudable y acotada. No reproducido en ejecución. |
| D08 | Antes de exposición pública | `SecurityConfig.java:47`; `application.properties:131` | Sesión con CSRF desactivado y cookie Secure desactivada. Configurar HTTPS, proxy confiable y protección CSRF coherente con SPA. No se ha demostrado explotación. |
| D09 | Antes de producción | `docker-compose.prod.yml:72`, `:96` | La API recibe las mismas credenciales usadas como root de MinIO. Crear identidad limitada al bucket. |
| D10 | Según confianza de usuarios | `backend/src/mlsuite_backend/utils/uploads.py:25` | `joblib.load` puede ejecutar código del modelo. Restringir cargas a autores confiables; si se aceptan modelos no confiables, diseñar aislamiento de ejecución antes de habilitarlos. |

Rutas Java abreviadas en tabla: `api/src/main/java/dev/ulloasp/mlsuite/`, subdirectorios `startup/`, `storage/`, `security/`. `application.properties` está en `api/src/main/resources/`.

## Flujo de entrega

```mermaid
flowchart LR
  PR[Pull request] --> CI[Checks y tests]
  CI --> DEVELOP[Merge protegido a develop]
  DEVELOP --> BUILD[Validar commit y construir imágenes]
  BUILD --> RELEASE[Escaneo y manifiesto de digests]
  RELEASE --> DEV[Desplegar dev]
  DEV --> SMOKE[Pruebas funcionales]
  SMOKE --> APPROVAL[PR de develop a main y aprobar release concreta]
  APPROVAL --> PROD[Promover mismos digests a producción]
  PROD --> VERIFY[Verificar servicio]
  VERIFY --> RECOVERY[Rollback compatible si falla]
```

Flujo confirmado por el usuario: actualizar referencias y ramas, crear rama de feature desde develop, PR hacia develop y, tras integrar y validar, PR de develop hacia main. El dev alojado sirve también como validación previa a producción; debe ejecutar imágenes de release, no un servidor de desarrollo ni código montado. No saltar develop ni fusionar automáticamente una PR pendiente de revisión.

Cada release registra commit, cuatro digests, referencia de Compose/configuración no secreta, versión de migración y enlaces a resultados CI/dev. El manifiesto aparece solo cuando las cuatro imágenes y sus gates están completos. Imágenes huérfanas de una matrix fallida no son releases desplegables.

Producción selecciona una release ya probada; un tag o ejecución manual no debe aceptar cualquier commit o digest aportado por el usuario del workflow. Si dev avanza de A a B, aprobar A sigue significando desplegar A. Conservar resultados asociados a A y revalidarla cuando cambien condiciones relevantes.

## CI que añadiría primero

| Directorio | Comandos propuestos, no ejecutados en esta auditoría | Qué aportan |
|---|---|---|
| `frontend/` | `vp install --frozen-lockfile`; `vp check`; `vp test --run`; `vp run build` | Comprobaciones estáticas, suites y build TypeScript/Vite+. |
| `api/` | `mvn -B -ntp verify` con Java 25 | Tests y empaquetado; añadir integración real PostgreSQL. |
| `backend/` | `uv sync --locked --extra dev`; `uv run --locked --extra dev pytest tests` | Dependencias coherentes y suite runtime. |
| `ops-agent/` | Mismos comandos Python | Suite API/terminal. Los mocks Docker no sustituyen pruebas del host Linux. |

Hay 55 archivos de tests frontend, 35 Java, cuatro `test_*.py` en backend y dos en ops-agent. Son inventarios, no resultados de ejecución. No encontré uso de SpringBootTest/DataJpaTest/Testcontainers en tests Java. El perfil test combina un driver escrito `org.PostgreSQL.Driver` con URL `jdbc:tc:`; hay que corregir y verificar esa configuración al introducir integración.

Cuatro jobs paralelos, permisos de lectura, límites de tiempo, dependencias cacheadas y reportes conservados incluso al fallar. Validar Actions con un linter y Compose con variables de prueba; jamás renderizar secretos reales en logs. Hacer build de contenedores sin push en PR cuando cambien Dockerfiles, lockfiles o empaquetado.

Primero obtener una línea base honesta. Arreglar fallos antes de declarar un check obligatorio; no esconderlos con `continue-on-error`. Si se añaden filtros de rutas, mantener un check agregado estable que falle ante errores y no quede pendiente por jobs omitidos. No es necesario complicar los filtros al inicio.

La integración efímera debe arrancar proxy/frontend, API, PostgreSQL, MinIO y runtime usando imágenes candidatas. Cubrir login, carga de modelo fiable, firma/esquema, predicción persistida, feedback y plugin. Casos negativos mínimos: sesión ausente, permisos de otro tenant, modelo/entrada inválidos y dependencia caída. Un archivo por feature, conforme a AGENTS.md.

## GitHub y cadena de suministro

- Proteger `main` con PR, checks requeridos, bloqueo de force-push/borrado y revisión según capacidad real del equipo. Añadir CODEOWNERS para Actions, despliegue, Dockerfiles y migraciones. Configurar excepciones de emergencia explícitas y auditadas.
- Crear Environments `dev` y `production`, secretos separados y restricciones de ramas/tags. Producción requiere aprobación de la release concreta. Impedir autoaprobación cuando haya otro mantenedor disponible; no crear un bloqueo imposible para un único mantenedor.
- Mantener `contents: read` por defecto. `packages: write` solo en publicación. Permisos de identidad/atestación solo en jobs que los necesitan. Fijar Actions por SHA completo y actualizarlo de forma controlada.
- Las PR, especialmente de forks, nunca reciben secretos de producción ni ejecutan código en el host productivo. No usar `pull_request_target` para ejecutar código no confiable. Preferir runners hospedados para CI; no instalar el runner general en producción.
- Usar OIDC con identidad restringida al repo/workflow/entorno cuando el destino lo soporte. Para VPS por SSH, credenciales por entorno, clave de host verificada y procedimiento de despliegue limitado; no asumir que OIDC resuelve SSH por sí solo.
- CI puede cancelar ejecuciones superadas. Despliegue debe tener exclusión mutua por entorno, no cancelar una migración o actualización en curso, y rechazar una release obsoleta inesperada. No asumir que `concurrency` ofrece una cola FIFO.
- Añadir scope de caché por servicio en BuildKit. Fijar imágenes base y `uv`; actualizar con revisión y tests. Alinear herramientas entre local/CI/Docker y comprobar soporte de versiones antes de cambiarlas.
- Un escáner de secretos y un escáner de dependencias/imágenes; CodeQL para Java, Python y JS/TS. Escanear imágenes candidatas antes de promover y releases desplegadas periódicamente. Excepciones con motivo, responsable y caducidad; errores del escáner no equivalen a resultado limpio.
- Generar SBOM y procedencia, y verificar procedencia/digest al desplegar. Una atestación prueba origen, no que el programa sea seguro.
- Automatizar actualizaciones sin multiplicar bots. Verificar compatibilidad con pnpm 11 del repo: la tabla de Dependabot consultada solo enumera pnpm hasta v10. No prometer actualización del lockfile sin probarla.
- Excluir `.env*` privados de contextos Docker; el frontend hace `COPY . .` y su `.dockerignore` no los excluye. `VITE_*` es configuración pública del navegador, nunca almacén de secretos.

[GitHub: uso seguro](https://docs.github.com/en/actions/reference/security/secure-use), [Environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [OIDC](https://docs.github.com/en/actions/reference/security/oidc), [atestaciones](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations), [CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning), [ecosistemas Dependabot](https://docs.github.com/es/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories).

## Dos entornos operables

Recomiendo un host Linux para dev y otro para producción. Con socket Docker, dos proyectos Compose en el mismo daemon no son aislamiento de seguridad. Dev necesita menor capacidad, pero misma topología, versiones, protocolo HTTPS y procedimiento de despliegue. Usar datos sintéticos y modelos de prueba fiables; no copiar datos reales por comodidad.

Separar dominios, proyectos Compose, volúmenes, DB, buckets, usuarios, secretos y backups. Quitar `container_name`: sus nombres fijos colisionan en el mismo host aunque se use `-p`. Mantener constantes los nombres DNS internos de servicios. Cerrar publicación PostgreSQL salvo necesidad explícita; publicar únicamente entrada web y acceso administrativo restringido. El firewall efectivo no se auditó.

Un manifiesto común para ambos entornos y overrides mínimos. Mantener desarrollo local separado. No duplicar dos despliegues que diverjan con el tiempo. Configuración obligatoria debe fallar al faltar; documentar `.env.example`, dominios, puertos y secretos, sin valores activos. Compose secrets requiere adaptar consumidores y permisos del host; no es un gestor de secretos cifrado por sí solo.

El frontend ya permite mismo origen: `frontend/src/shared/config/runtime.ts:6` y `frontend/nginx.conf:18`. Mantener `/api` relativo permite promover la misma imagen. En Nginx el upstream fija `spring-app:8080`, aunque Spring admite puerto configurable: fijar contrato de puerto interno o parametrizar ambos de forma coherente. Revisar resolución DNS tras recrear API, WebSockets y tiempos de inferencia a través del proxy.

Configurar usuario no root cuando sea viable, límites CPU/RAM/PIDs, filesystem de solo lectura donde sea compatible y temporales con espacio acotado. El runtime carga uploads en memoria y admite ficheros grandes: establecer límites según capacidad y concurrencia. No activar restricciones a ciegas que impidan temporales ML, logs o persistencia.

El ops-agent mantiene una lista de servicios permitidos y la API exige SUPERADMIN para administrar infraestructura. Eso es una protección real, pero no limita el alcance del daemon si se compromete el agente. Separar su red de la del runtime ML, exigir secreto fuerte, restringir acceso administrativo y proponer terminales deshabilitados en producción. Si se conservan, auditar acciones y limitar recursos.

CD debe ser la fuente de verdad de versión/configuración. `ops-agent/compose.py:38` usa su propio archivo/proyecto y `START` puede ejecutar `up -d`; no debe reconciliar con tags o variables distintos de los aprobados. Compartir configuración efectiva o limitar panel a operaciones que no cambien release.

[Docker: producción](https://docs.docker.com/compose/how-tos/production/), [seguridad del daemon](https://docs.docker.com/engine/security/), [secrets](https://docs.docker.com/reference/compose-file/secrets/).

## Datos, autenticación y recuperación

Introducir una herramienta de migraciones versionadas, por ejemplo Flyway. Es una dependencia con razón explícita: controlar evolución persistente. Inventariar esquema existente y establecer baseline verificado; después cambiar Hibernate a `validate`. Probar instalación vacía y upgrade desde versión anterior. Incluir índices creados actualmente por `SearchIndexInitializer` y separar credenciales de migración de las de runtime.

Usar cambios compatibles con release anterior. Añadir estructura primero, migrar datos y retirar estructura antigua en una entrega posterior. Backfills fuera del arranque normal, reanudables, con progreso y reintentos limitados. No ejecutar downgrade destructivo automáticamente tras un healthcheck fallido.

Backups cifrados fuera del host, con retención definida, PostgreSQL y objetos MinIO recuperables conjuntamente. Registrar versión de esquema, release y secretos necesarios para descifrar/verificar datos, guardados de forma segura. Probar restauración en entorno aislado y completar una predicción con los datos restaurados. Un volumen persistente o backup en el mismo disco no cubre pérdida del host.

Definir pérdida máxima aceptable de datos y tiempo de recuperación antes de escoger frecuencia/tecnología de backup. No declarar objetivos cumplidos sin simulacro. Separar rollback de aplicación, reparación de datos y restauración por desastre.

Configurar HTTPS en ambos entornos, cookies Secure sobre HTTPS, HttpOnly y alcance host adecuado. Revisar forwarding confiable: Nginx actualmente sobrescribe `X-Forwarded-Proto` con su propio `$scheme`, que puede ser HTTP tras un terminador TLS. Activar protección CSRF integrada con la SPA y probar login/logout, subida y WebSocket. Comprobar rotación de sesión al autenticar. CORS y SameSite no sustituyen toda la protección CSRF.

No prometer despliegues sin corte con Compose actual y sesiones locales. Para primera versión, puede aceptarse corte breve documentado y nueva autenticación. Blue/green, sesiones compartidas y drenaje de peticiones largas se añaden si el objetivo de disponibilidad los exige.

`joblib` requiere confiar en el modelo que se deserializa. Un escáner de imágenes no convierte una carga arbitraria en segura. Si el producto admite autores no confiables, aislar ejecución sin credenciales ni acceso a redes administrativas, con límites y una frontera de seguridad acorde al riesgo. Preservar compatibilidad de modelos con dependencias ML y probar fixtures de versiones soportadas al actualizar runtime.

[Spring: CSRF](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html), [scikit-learn: persistencia de modelos](https://scikit-learn.org/stable/model_persistence.html).

## Salud y observabilidad

Separar liveness del proceso y readiness para atender usuarios. Conservar o evolucionar explícitamente el contrato existente, actualizando consumidores y tests si pasa a devolver 503. Mientras exista el contrato actual, comprobar también `ready` en JSON. Añadir almacenamiento cuando esté habilitado; estado administrativo separado de disponibilidad del producto. No exponer detalles internos de errores en endpoint público.

`depends_on: service_started` no demuestra disponibilidad. Añadir healthchecks útiles y esperas con timeout. Después de cada despliegue, verificar a través del dominio público: login de cuenta sintética limitada, modelo conocido, predicción esperada y persistencia. Dev ejecuta suite amplia, producción smoke acotado con datos propios y limpieza segura. Las pruebas deben registrar la release que realmente respondió.

Centralizar logs de servicios con entorno, release y request ID, evitando contraseñas, tokens, enlaces de revisión y contenidos sensibles de modelos/inputs. Vigilar errores, latencia, inferencias fallidas, memoria/OOM, disco, conexiones DB, almacenamiento y caducidad de certificados. Alertas de disponibilidad y backups deben funcionar aunque API y ops-agent estén caídos. Su dashboard en memoria no es monitorización durable.

Retener manifiesto anterior y sus imágenes, resultados de despliegue y logs. Si falla una actualización compatible, restaurar digests anteriores y verificar otra vez. La ejecución queda marcada como fallida aunque la recuperación tenga éxito. Probar el procedimiento también cuando el nuevo servicio nunca alcanza readiness.

[Docker: orden y readiness](https://docs.docker.com/compose/how-tos/startup-order/).

## Orden de implementación y aceptación

| Entrega | Trabajo | Criterio observable |
|---|---|---|
| 1 | Secretos, CI base y protección main | Una PR con test roto no puede fusionarse; secretos reutilizados rotados; .env de ejemplo saneado. |
| 2 | Releases inmutables y seguridad de publicación | Un fallo parcial nunca produce release promovible; cuatro digests y resultados verificables por commit. |
| 3 | Configuración común y aislamiento | Dev/prod independientes; dev no posee credenciales ni acceso administrativo de producción. |
| 4 | Migraciones, salud y backup/restore | Upgrade desde release previa, MinIO caído detectado y restauración funcional demostrada. |
| 5 | CD automático dev | Un merge validado a develop despliega release identificada y completa flujo de predicción/feedback/plugin. |
| 6 | Promoción prod y recuperación | Solo release validada; aprobación concreta; exclusión mutua; rollback compatible ensayado. |
| 7 | Operación continua | Alertas externas, revisión de vulnerabilidades, actualizaciones y simulacros periódicos con responsables. |

Estructura inicial posible: `ci.yml`, flujo de release/dev y `promote-production.yml`, con un procedimiento de despliegue compartido. Escaneo programado separado si resulta necesario. Evitar un framework de workflows reutilizables sin repetición real.

Decisiones pendientes para implementar: proveedor/hosts y arquitectura CPU, dominios y acceso dev, quién aprueba producción, tolerancia a cortes, pérdida máxima de datos, tiempo de recuperación y confianza de autores de modelos. No hacen falta Kubernetes ni despliegues canary para empezar.
