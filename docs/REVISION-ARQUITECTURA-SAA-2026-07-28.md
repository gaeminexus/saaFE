# Revisión de Arquitectura y Código — Sistema SAA

**Preparado para:** Equipo de desarrollo de GAEMI NEXUS S.A.S.
**Sistema del cliente:** SAA (Sistema de Administración/Ahorro) — ASOPREP-FCPC
**Fecha:** 28 de julio de 2026
**Alcance:** `saaBE` (backend, `C:\work\saaBE\saaBE`) y `saaFE` (frontend, `C:\work\saaFE\v1\saaFE`)
**Metodología:** Inspección directa de código (no solo documentación) en ambos repositorios — cada hallazgo cita archivo y línea para poder verificarse de forma independiente. Se distingue explícitamente entre "confirmado leyendo el código" e "inferido solo de la documentación" donde corresponde.

---

## 1. Resumen Ejecutivo

SAA es un sistema empresarial full-stack maduro: un backend en Jakarta EE 10 (336 entidades JPA, 330 endpoints REST en 8 módulos) y un frontend en Angular 20 (196 componentes de pantalla en 9 módulos), que cubre contabilidad, tesorería, créditos/aportes de partícipes, cuentas por cobrar, cuentas por pagar, nómina y cumplimiento de facturación electrónica SRI para una institución financiera ecuatoriana.

La arquitectura es **consistente y disciplinada a nivel estructural**: ambos repositorios reflejan los mismos límites de módulo, ambos usan un patrón de capas uniforme, y una convención estricta de nomenclatura de 4 letras en la base de datos se mantiene sin excepción a lo largo de 336 entidades y 8 esquemas. El equipo claramente ha entregado una gran cantidad de funcionalidad operativa en poco tiempo — las cifras de avance por módulo del documento `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` fueron verificadas de forma independiente contra el conteo real de componentes y son exactas, no infladas.

Sin embargo, ese mismo patrón de "una entidad → un cuarteto REST/Service/DAO/servicio-Angular hecho a mano, repetido ~330 veces" es también la causa raíz de la mayoría de las debilidades descritas más abajo. **Corrección (verificada 2026-07-28 tras revisión directa del código, señalada por el equipo):** esto no es cierto de manera uniforme en las cuatro capas. La capa **DAO** sí tiene una clase base genérica real y compartida (`EntityDao<T>`/`EntityDaoImpl<T>`, ver H14) que implementa toda la lógica de consulta/CRUD una sola vez — una corrección ahí se propaga automáticamente a las ~330 entidades. Las capas **Service** (solo comparte una *interfaz* genérica, `EntityService<T>`, sin implementación compartida), **REST** y los **servicios Angular del frontend** sí carecen de cualquier abstracción compartida, y en esas tres capas **cada corrección de manejo de errores, logging o seguridad debe aplicarse a cientos de archivos individualmente**. Sumado a **cero pruebas automatizadas en ambos repositorios** y **ninguna canalización de CI**, el sistema hoy no cuenta con una red de seguridad que detecte regresiones al aplicar esas correcciones.

**El hallazgo más urgente es de seguridad, no de estilo:** el endpoint REST de manejo de archivos del backend (`FileRest.java` / `FileServiceImpl.java`) acepta rutas de archivo crudas, sin autenticación, provistas por el cliente, para descarga, borrado y listado de directorios, sin ninguna validación de contención de ruta — esto es una vulnerabilidad explotable de lectura/borrado arbitrario de archivos, alcanzable por cualquiera que pueda llegar a la API, independientemente de lo que haga la aplicación Angular. Se suma a un hallazgo más amplio: **el backend no aplica autenticación de forma independiente en ninguno de sus ~330 endpoints** — el login nunca emite una credencial real, y la "sesión" del propio frontend es literalmente una cadena de texto que jamás se reenvía en peticiones posteriores. Esta combinación debería tratarse como un bloqueante antes de mayor exposición en producción, no como un ítem de backlog.

La sección 5 convierte estos hallazgos en un plan de acción incremental y priorizado que respeta lo ya construido y ya comprometido con el cliente (según la nota de alcance que el propio equipo ya envió en `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` §7), en lugar de proponer una reescritura.

---

## 2. Visión General del Sistema

### 2.1 Dos repositorios, un solo sistema

| | Backend — `saaBE` | Frontend — `saaFE` |
|---|---|---|
| Ruta | `C:\work\saaBE\saaBE` | `C:\work\saaFE\v1\saaFE` |
| Stack | Java 21, Jakarta EE 10, WildFly, EJB 4.0, JPA, JAX-RS | Angular 20 (componentes standalone), Angular Material 20, TypeScript 5.9 (estricto) |
| Empaquetado | Maven → WAR | Angular CLI → bundle estático |
| Base de Datos | Oracle (dev local: Oracle 23ai vía `docker-compose.yml`) | — (consume REST) |
| Reportes | JasperReports 7.0.3 + Apache POI | jsPDF (exportación en cliente) |
| Tamaño | 336 entidades JPA, 330 clases REST, ~688 EJBs `@Stateless` | 219 componentes, 340 servicios, 196 pantallas ruteadas |
| Pruebas automatizadas | **Ninguna** (`src/test` no existe) | **Solo esqueleto** — 286 archivos spec, 82.5% son stubs por defecto `toBeTruthy()` |
| CI/CD | No se encontró | No se encontró |

Ambos repositorios organizan el código de forma independiente según los mismos dominios de negocio, lo cual es una fortaleza real para la incorporación de nuevos desarrolladores y la comunicación entre equipos:

`CRD` (créditos y aportes de partícipes) · `CNT` (contabilidad) · `CXC` (cuentas por cobrar) · `CXP` (cuentas por pagar) · `TSR` (tesorería) · `RHH`/`RRH` (recursos humanos — nótese la inconsistencia de nombre: el backend usa `rhh`, el frontend usa `rrh`) · `SCP`/`BASICO` (núcleo: empresa, usuarios, catálogos) · `ASOPREP` (integración con el sistema de nómina/aportes de Petrocomercial, solo en backend — el módulo del frontend no tiene componentes de UI, solo servicios compartidos).

### 2.2 Capas

Ambos lados siguen un flujo de capas limpio y consistente:

```
Componente Angular → Servicio Angular (HTTP) → Endpoint REST (JAX-RS) → Servicio EJB → DAO EJB → Entidad JPA → Oracle
```

Esto está documentado con precisión tanto en `ALCANCE-SISTEMA.md` (frontend) como en `docs/general/ARQUITECTURA_SISTEMA.md` (backend), y coincide con lo confirmado por inspección directa de código en esta revisión.

### 2.3 Nota sobre calidad de la documentación

Ambos repositorios están inusualmente bien documentados para un proyecto de este tamaño — `saaFE/docs/` y `saaBE/docs/` en conjunto contienen decenas de documentos fechados de planificación, estándares y estado, lo cual vale la pena reconocer como práctica del equipo. Dicho esto, algunos de estos documentos se han desactualizado respecto al código actual y conviene refrescarlos (ver §4.4 "Desactualización de documentación").

---

## 3. Fortalezas

Estos son puntos positivos genuinos, verificados en código — no elogios genéricos:

1. **Convención de nomenclatura de BD disciplinada y uniforme.** Cada una de las 336 entidades en 8 esquemas (`CRD`, `CNT`, `CBR`, `PGS`, `TSR`, `RHH`, `RPR`, `SCP`) sigue el estándar de códigos de 4 letras para tablas/columnas sin excepción. Este nivel de consistencia a esta escala es poco común y facilita el trabajo de depuración y consultas SQL entre módulos.
2. **Uso correcto y disciplinado de transacciones administradas por contenedor.** De ~688 EJBs `@Stateless`, solo 8 sobrescriben explícitamente el atributo de transacción por defecto, y cada sobrescritura está en el lugar correcto: la generación/limpieza de reportes y el procesamiento de firmas usan `REQUIRES_NEW` para que sus fallos no reviertan la transacción de quien los llama; el motor de conciliación bancaria de TSR y el pipeline de importación ASOPREP-Petro — los dos procesos batch genuinamente complejos del sistema — usan agrupación explícita con `REQUIRED`. Es el instinto correcto, aplicado exactamente donde se necesita.
3. **Existe y se usa un tipo de excepción de dominio real.** `IncomeException` (337 usos) separa con claridad las violaciones de reglas de negocio de las excepciones técnicas en la capa de servicio — el modelado es sólido, aunque la capa REST actualmente descarta esa distinción (§4.3).
4. **El módulo de reportes muestra cómo se ve "hacerlo bien" en el resto del sistema.** `ReporteServiceImpl.java` es la única parte del backend que usa un framework de logging real (`java.util.logging`) con niveles de severidad apropiados, y una refactorización reciente del flujo de importación ASOPREP reemplazó explícitamente `selectAll()` seguido de filtrado en memoria por consultas dirigidas, con un comentario que documenta el razonamiento de rendimiento. Esto demuestra que el equipo es capaz del patrón más disciplinado cuando se aplica — la brecha es de consistencia, no de conocimiento.
5. **Migración casi completa y disciplinada a componentes standalone de Angular 20.** 216 de 219 componentes usan `standalone: true`; solo quedan 2 archivos `@NgModule` heredados en todo el árbol.
6. **`FuncionesDatosService.convertirFechaDesdeBackend()`** es una utilidad compartida genuinamente bien construida que normaliza correctamente tres serializaciones distintas de `LocalDateTime` de Java (arreglo, cadena, `Date` nativo), incluyendo conversión de nanosegundos y ajuste de mes base-0 — exactamente el tipo de abstracción compartida que el resto del código se beneficiaría de tener con más frecuencia.
7. **La funcionalidad entregada es real y coincide con lo declarado.** Contar de forma independiente los archivos de componentes contra las cifras por módulo de `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` (CNT 26, CRD 46, CXC 17, CXP 13, TSR 49, RHH 38 = 196 total) produjo una **coincidencia exacta**. El avance de módulos declarado desde el informe de enero de 2026 no es discurso comercial — es verificable en el código.
8. **La vinculación de valores en procedimientos almacenados y JPQL está bien hecha** en todos los lugares muestreados (login, validación de contraseña, verificación de permisos) — no se encontró inyección SQL real por *valores* sin parametrizar en ninguna parte del código revisado.

---

## 4. Debilidades

Ordenadas por severidad/urgencia, no por módulo.

### 4.1 Crítico — Seguridad (se recomienda atender antes de mayor exposición en producción)

**H1. Lectura, borrado y listado de directorios de archivos arbitrarios sin autenticación.**
`saaBE/src/main/java/com/saa/ws/rest/files/FileRest.java` (`downloadFile` línea 130, `deleteFile` línea 172, `listFiles` línea 208, `getFileInfo` línea 235, `uploadFileCustomPath` línea 83) aceptan una ruta de archivo cruda, provista por el cliente, sin ninguna verificación de autenticación. La implementación, `FileServiceImpl.java` (líneas 58-163), llama a `Paths.get(filePath)` directamente sin canonicalización ni verificación de que la ruta quede contenida dentro de un directorio base. **Impacto concreto:** cualquiera que pueda llegar a la API —sin necesidad de iniciar sesión— puede leer archivos arbitrarios accesibles al proceso del servidor de aplicaciones, enumerar directorios y borrar archivos arbitrarios. Es el hallazgo de mayor severidad y más concretamente explotable de toda esta revisión.

**H2. No existe autenticación/autorización del lado del servidor en ningún endpoint.**
`saaBE` no usa `@RolesAllowed`, `@PermitAll` ni ningún `ContainerRequestFilter` en ninguna de las 330 clases REST; no existe `web.xml`; `beans.xml` está vacío. El login (`UsuarioRest.java:83-103`) es una verificación de credenciales de un solo paso que retorna una simple cadena de éxito/error — no se emite sesión ni token. En el frontend, esa respuesta se guarda literalmente como `token` en `sessionStorage`/`localStorage` (`login.component.ts:154-155`), lo que significa que **`token` es literalmente la cadena `"OK"` para todos los usuarios**. Ese valor nunca se adjunta a ninguna petición HTTP posterior (confirmado mediante búsqueda en todo el repositorio de `Authorization`/`Bearer`/`withCredentials` — cero coincidencias). **Efecto neto: cada uno de los ~330 endpoints del backend en todos los módulos —pagos, nómina, asientos contables— es alcanzable por cualquiera que pueda enrutar una petición al servidor de aplicaciones, sin importar lo que muestre la pantalla de login de Angular.**

**H3. El login envía la contraseña en la URL vía GET, no en el cuerpo de un POST.**
`saaFE/src/app/shared/services/usuario.service.ts:90-94` construye `GET /rest/usro/validaUsuario/{idUsuario}/{clave}`. Las contraseñas en texto plano dentro de una URL quedan registradas en logs de acceso del servidor, en el historial del navegador y en cualquier log de proxy/CDN intermedio.

**H4. CORS está configurado con origen comodín *y* credenciales habilitadas simultáneamente.**
`saaBE/config/standalone-cors.cli/standalone-cors.cli:7,10` — `Access-Control-Allow-Origin: *` junto con `Access-Control-Allow-Credentials: true`. El propio comentario del archivo reconoce que esto debe cambiar en producción, pero se distribuye como configuración de referencia tal cual.

**H5. Credenciales de despliegue comprometidas en texto plano en el repositorio.**
`saaBE/pom.xml:218-220` tiene hardcodeadas las credenciales de la consola de administración de WildFly (`gaemi`/`nexus`) para el plugin de despliegue de Maven. Deberían externalizarse a credenciales de servidor en `settings.xml` o a un secreto de CI.

*(H1–H5 se agravan entre sí: como H2 implica que nada está autenticado, los endpoints de archivos de H1, y cada endpoint de escritura financiera, quedan abiertos a cualquiera que pueda alcanzar la ruta de red hacia el servidor de aplicaciones. Corregir H2 con un token de sesión real y aplicado reduciría sustancialmente el radio de impacto de H1 incluso antes de corregir H1 en sí.)*

### 4.2 Alto — Integridad de datos y correctitud

**H6. Cinco bugs de fallo silencioso confirmados y aún presentes en el módulo CRD (créditos/aportes)**, re-verificados de forma independiente en esta revisión en las líneas exactas reportadas en `docs/CRD-CODE-REVIEW-2026-07-24.md`:
- `cruce-valores.component.ts:769-782` — la llamada de persistencia del pago está comentada; el mensaje de éxito se dispara igual.
- `proceso-pago-jubilados.component.ts:386-410` — "procesar pago" es un temporizador de cuenta regresiva de 5 segundos puramente de UI, sin llamada al backend, que termina en un mensaje de éxito falso.
- `detalle-consulta-carga.component.ts:1991-1993` — el guardado batch de afectación financiera siempre escribe `capitalAfectar: 0, interesAfectar: 0, desgravamenAfectar: 0` sin importar los montos reales.
- `novedad-carga.service.ts:69-94` — la reconciliación de coincidencia de partícipes retorna datos simulados hardcodeados (`// Por ahora retornar mock data hasta que backend implemente`).
- `pago-cuotas.component.ts:583-599` — el mismo patrón inconcluso, con `TODO: Enviar datos al backend para procesar el pago` todavía vigente.

Los cinco están en la ruta de pago de préstamos/aportes — el módulo que el informe de enero de 2026 llamó explícitamente "prioridad crítica del proyecto". Fallan silenciosamente (sin error, sin caída visible), por lo que solo saldrán a la luz durante una conciliación, momento en el que la brecha de datos ya se habrá propagado.

**H7. Los errores de base de datos se capturan y reinterpretan deliberadamente como "registro no encontrado" en el pipeline de importación financiera.**
Documentado intencionalmente en `saaBE/docs/general/CORRECCION_MANEJO_EXCEPCIONES_DAO.md` y confirmado en código vivo en `ProductoDaoServiceImpl.java:43-49`: un bloque catch de DAO que antes relanzaba la excepción ahora hace `System.err.println(...); e.printStackTrace(); return null;` con el comentario "NO lanzar excepción - retornar null para no detener el proceso". Un error transitorio de BD (p. ej. un timeout de bloqueo) durante la importación de préstamos/aportes de ASOPREP se vuelve indistinguible de "este partícipe genuinamente no existe", lo cual luego se registra como una "novedad" a nivel de negocio — un riesgo real de correctitud en un pipeline de datos financieros, no solo una cuestión de estilo.

**H8. Nombres de campo controlados por el cliente en la ruta compartida `selectByCriteria`.**
`saaBE/src/main/java/com/saa/basico/utilImpl/EntityDaoImpl.java:125-286` construye JPQL por concatenación de cadenas usando el *nombre de campo* provisto por el cliente en el payload de búsqueda `DatosBusqueda` (`strQuery + " (b." + aBuscar.getCampo()`). Los *valores* enlazados sí se parametrizan correctamente, pero el nombre de campo no — y como cada uno de los ~330 endpoints `selectByCriteria` pasa por este único método, es una sola ubicación de corrección, no 330.

**H9. La fragmentación del estado en el cliente arriesga desincronización silenciosa.**
`AppStateService` se usa en solo 19 de ~340 archivos del frontend; más de 80 archivos leen `localStorage` directamente en su lugar. El propio servicio escribe el mismo valor de "empresa actual" bajo **seis nombres de clave distintos**, en `sessionStorage` y `localStorage` a la vez (12 escrituras para un solo valor lógico — `app-state.service.ts:41-61`, comentado explícitamente como "compatibilidad módulos legacy"). Cualquier ruta de código que actualice el estado por una vía pero no por la otra desincronizará silenciosamente el resto de la aplicación.

**H10. Sin estrategia explícita de carga JPA en 578 relaciones `@ManyToOne`**, lo que significa que la carga de entidades usa por defecto el comportamiento `EAGER` de JPA con un `SELECT` por relación (riesgo N+1), y el `EntityDao.selectAll()`/`selectByCriteria()` genérico, usado por prácticamente todo el backend, **no tiene ningún parámetro de paginación del lado del servidor** (`setMaxResults`/`setFirstResult` aparecen en solo 18 de 2,224 archivos). Hoy la paginación es, en la práctica, un asunto exclusivo del frontend.

### 4.3 Medio — Mantenibilidad y calidad

**H11. No hay pruebas automatizadas en el backend; las del frontend son mayormente esqueleto, y el único pipeline de CI que existe no puede ejecutarse.** Backend: `src/test` no existe, cero dependencias de JUnit/Mockito, no se encontró configuración de CI. Frontend: existen 286 archivos spec, pero el 82.5% son stubs sin modificar del Angular CLI (solo `expect(component).toBeTruthy()`) — el spec más extenso y genuino del repositorio tiene 134 líneas, y no existe suite e2e. `saaFE/.github/workflows/ci-cd.yml` **sí existe** (corrigiendo un pase anterior de esta revisión, que no lo detectó) y es un pipeline bastante elaborado de 7 jobs (lint, test, matriz de build, e2e, auditoría de seguridad, despliegue a staging, notas de release) — pero no está realmente conectado a este repositorio: invoca `npm run lint`, `npm run format:check`, `npm run test:ci`, `npm run analyze` y `npm run e2e`, ninguno de los cuales existe en `package.json` (confirmado — solo están definidos `ng`, `start`, `build`, `build:prod`, `watch`, `test`), no hay configuración de ESLint ni de Cypress en ningún lugar del repositorio, y su job de despliegue apunta a una URL de Heroku que no coincide con el proceso real de despliegue WildFly/WAR (`build-production.ps1`). **Este workflow fallaría en su primer paso (`npm run lint`) si se ejecutara hoy** — es, en la práctica, una plantilla que nunca se terminó de conectar, lo cual es arguiblemente peor que no tener ningún archivo de CI, ya que su sola presencia puede generar una falsa confianza de que existen controles de calidad automatizados. Junto con H12–H13, hoy no existe ninguna red de seguridad automatizada *funcional* para ningún cambio a este sistema.

**H12. `catch (Throwable e)` universal, sin manejo centralizado, en ambos lados.** Backend: 1,985 ocurrencias en 322 de 330 archivos REST; las respuestas de error comúnmente filtran `e.getMessage()` directo al cuerpo HTTP (1,702 ocurrencias), y el único tipo de excepción de dominio real (`IncomeException`) nunca se distingue de una caída genuina — ambos vuelven como 500 genéricos (algunos endpoints incluso mapean caídas reales a 400). No existe ningún `ExceptionMapper`, por lo que esto solo puede corregirse 330 veces, archivo por archivo, a menos que se introduzca un manejador compartido. Frontend: 217 de 340 servicios comparten un bloque `handleError` idéntico byte a byte que contiene lógica aparentemente muerta (`if (+error.status === 200) { return of(null) }` dentro de un `catchError`, que en teoría nunca debería dispararse ante una respuesta exitosa real) — probablemente copiado y pegado sin entender del todo cuándo se activa.

**H13. Ningún framework de logging estructurado en ninguno de los dos lados.** Backend: `SLF4J` no se usa en ninguna parte; el diagnóstico depende de 5,119 llamadas a `System.out.println` y 169 a `e.printStackTrace()` en todo el proyecto (el módulo de reportes es la única excepción, ver §3). Frontend: 592 llamadas a `console.log/error/warn/debug` en código de producción, incluyendo un volcado completo del payload de pago dejado en `cruce-valores.component.ts:759-767`. En producción, esto significa que diagnosticar un incidente depende por completo de quien tenga acceso a la consola/stdout en ese momento, no de logs buscables y filtrables por nivel.

**H14. La duplicación masiva y sin abstraer eleva el costo de cada corrección anterior — pero solo en tres de las cuatro capas, no en las cuatro.** Backend, capa DAO: `EntityDao<Tipo>` (`com.saa.basico.util.EntityDao`) + `EntityDaoImpl<Tipo>` (`com.saa.basico.utilImpl.EntityDaoImpl`) es una clase base genérica real que implementa `save`, `find`, `remove`, `selectAll`, `selectById` y un constructor de consultas JPQL dinámico para `selectByCriteria` — una sola vez. Las ~330 clases DAO por entidad son subclases delgadas (p. ej. `JerarquiaDaoServiceImpl extends EntityDaoImpl<Jerarquia>`, que en la práctica solo sobreescribe `obtieneCampos()`, ~15 líneas en total). Una corrección aquí se propaga automáticamente a las 330 entidades.

Backend, capa Service: existe `EntityService<Tipo>` (`com.saa.basico.util.EntityService`), pero es **solo una interfaz** — no existe ningún `EntityServiceImpl<Tipo>` genérico. Cada una de las ~330 clases `XxxServiceImpl` (p. ej. `ProvinciaServiceImpl.java`, ~90 líneas) implementa a mano los mismos seis métodos (`save`, `saveSingle`, `selectAll`, `selectById`, `selectByCriteria`, `remove`), casi siempre como una delegación delgada hacia el DAO correspondiente más alguna regla puntual (p. ej. `provincia.setEstado(Estado.ACTIVO)` en `saveSingle` cuando el registro es nuevo). La interfaz garantiza una forma consistente, pero no reduce cuántas veces hay que tocar código para una corrección — sigue siendo ~330 archivos.

Backend, capa REST: sin ninguna abstracción compartida, ni interfaz ni clase base — confirmado en `ProvinciaRest.java`, una clase independiente con métodos `@GET`/`@POST`/`@PUT`/`@DELETE` escritos a mano, repetidos con el mismo patrón try/catch-y-construir-Response en las ~330 clases REST.

Frontend: tampoco existe un `BaseHttpService<T>` genérico — confirmado en `canton.service.ts`; los 340 servicios repiten a mano la misma forma `getAll/getById/add/update/selectByCriteria/delete` más un `handleError` casi idéntico (ver H12).

Esto es precisamente lo que hace costosas las correcciones de H12 y H13 hoy en las capas Service, REST y frontend — introducir clases base compartidas ahí permitiría que una sola corrección se propague a todo el sistema, y debería tratarse como el cambio habilitante para el resto de las mejoras de calidad, no como algo deseable pero separado. La capa DAO ya tiene ese patrón resuelto; es el modelo a replicar en las otras tres capas, no un problema pendiente en sí misma.

**H15. El bundle del frontend es único, grande y mayormente de carga inmediata (eager).** El `dist/saaFE/browser/main-*.js` de producción pesa 4.6MB. La carga diferida por ruta (`loadComponent`) se usa en solo 19 de ~176 entradas de ruta; `loadChildren` nunca se usa. Los presupuestos de tamaño en `angular.json` ya fueron elevados muy por encima de los valores por defecto del Angular CLI (4MB/7MB frente a los 500kB/1MB de fábrica) — una señal clara de que el equipo chocó con el límite y amplió la barrera en lugar de atacar el tamaño del bundle.

**H16. Se han acumulado algunos componentes "dios" (god-components).** `participe-dash.component.ts` (CRD) tiene 3,672 líneas; otros cuatro componentes superan las 1,500 líneas. Estos concentran riesgo (más difíciles de revisar, más difíciles de probar, más conflictos de merge) y, no por casualidad, `participe-dash.component.ts` es también donde se encontró un bug de reinicio de estado en la revisión previa del CRD — los componentes grandes y los bugs de correctitud están apareciendo juntos.

### 4.4 Bajo — Desactualización de documentación y detalles menores

- **`ALCANCE-SISTEMA.md`** (documento de arquitectura del frontend) afirma 4 veces que el backend es "Spring Boot" — confirmado incorrecto; es Jakarta EE/WildFly/EJB. Debería corregirse ya que es probablemente el primer documento que leerá cualquier nuevo integrante del equipo.
- **La documentación de nombres de esquema está desactualizada/imprecisa.** El propio `docs/general/ARQUITECTURA_SISTEMA.md` del backend se refiere al "esquema CXC" y "esquema CXP", pero las anotaciones reales `@Table(schema=...)` en el código resuelven a `CBR` y `PGS` respectivamente (confirmado en varias entidades). `docs/pendientes/PLAN_IMPLEMENTACION.md`, fechado dos días después, ya lo tiene correcto — los dos documentos se contradicen entre sí.
- **Los conteos de entidades/endpoints en el documento de arquitectura están desactualizados**: declara ~238 entidades / ~236 controladores REST; los conteos reales son 336 y 330.
- **Inconsistencia de nombre `rhh` (backend) vs. `rrh` (frontend)** — menor, pero vale la pena alinearlo para reducir fricción de incorporación.
- Una entidad, `AnioMotor` (`saaBE/src/main/java/com/saa/model/cnt/AnioMotor.java`), usa el esquema `AOT` en lugar de `CNT` — vale la pena confirmar con el equipo si es intencional.
- 190 comentarios TODO/FIXME/HACK en código del backend, 35 en el frontend — no alarmante por sí solo, pero el grupo del backend en `AsientoContableService.java:140-275` (mapeos de plantillas de asientos contables incompletos para tipos de transacción de CXC/CXP) vale la pena cruzarlo con el ítem de contabilidad de CRD ya listado como pendiente en `PLAN_IMPLEMENTACION.md` §8.

---

## 5. Cambios Sugeridos

El sistema está entregado y en uso activo por ASOPREP-FCPC; esto no es una propuesta de reescritura. La nota de alcance que el propio equipo ya envió al cliente (`ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` §7) —distinguiendo "ajustes menores dentro del alcance vigente" de "ampliaciones de alcance que ameritan una conversación aparte"— es el marco correcto, y todo lo siguiente encaja dentro de "ajustes menores/endurecimiento", no de alcance nuevo.

**Prioridad 0 — antes del próximo despliegue a producción (seguridad, H1–H5):**
1. Blindar `FileRest.java`/`FileServiceImpl.java`: resolver y canonicalizar cada ruta entrante contra un directorio base fijo y rechazar cualquier ruta que se salga de él; esto por sí solo cierra H1.
2. Introducir un mecanismo de sesión real, aplicado por el servidor (aunque sea un token firmado mínimo verificado por un único `ContainerRequestFilter`), y exigirlo en todos los endpoints excepto el login. Esta es la corrección de mayor apalancamiento de toda la revisión — cierra H2 y reduce drásticamente el radio de impacto de H1 incluso antes de corregirlo por separado.
3. Cambiar el login a `POST` con cuerpo de petición en lugar del `GET` con contraseña en la URL (H3), y que retorne el token de sesión real del punto 2 en lugar de la cadena literal `"OK"`.
4. Restringir CORS al/los origen(es) reales conocidos del frontend; si las credenciales deben permanecer habilitadas, el origen comodín no puede coexistir con ellas (H4).
5. Sacar del repositorio las credenciales de despliegue de WildFly en `pom.xml` (H5).

**Prioridad 1 — corto plazo, integridad de datos (H6–H8):**
6. Corregir los cinco bugs de la ruta de pago del CRD (H6) — son los ítems más críticos para el negocio de toda esta revisión, ya que afectan dinero que se cree ya registrado.
7. Revisar el patrón de captura de excepciones del DAO en `CORRECCION_MANEJO_EXCEPCIONES_DAO.md` (H7): distinguir "genuinamente no encontrado" de "ocurrió un error técnico" en el punto de captura, para que las importaciones financieras no clasifiquen erróneamente y en silencio fallos de infraestructura como novedades de negocio.
8. Corregir la concatenación de nombres de campo en `selectByCriteria` dentro de `EntityDaoImpl.java` (H8) — un solo método, compartido por los 330 endpoints, por lo que es una corrección contenida y de alto apalancamiento.

**Prioridad 2 — mediano plazo, estructural (H11–H15, habilitado al introducir clases base):**
9. Introducir un `ExceptionMapper` compartido en el backend (capa REST) y un `BaseHttpService<T>`/manejador de errores base compartido en el frontend. Adicionalmente, extraer un `EntityServiceImpl<Tipo>` genérico para la capa Service (hoy `EntityService<Tipo>` es solo una interfaz sin implementación compartida, ver H14) — replicando ahí el mismo patrón que ya existe y funciona en la capa DAO (`EntityDaoImpl<Tipo>`). Este es el cambio que hace barato, en lugar de un ejercicio de 330 o 340 archivos, corregir a futuro cualquier tema de logging, forma de error o autenticación — debería secuenciarse temprano respecto a los demás ítems de calidad, no al final.
10. Agregar SLF4J (backend) y canalizar el diagnóstico por consola a través de un único patrón compartido de logger/interceptor (frontend), empezando por los módulos financieramente críticos (TSR, CXP, rutas de pago de CRD).
11. Levantar una canalización de CI mínima (build + lint, aunque todavía sin cobertura de pruebas completa) como primera red de seguridad — hoy un build roto podría llegar a `dist/`/`target/` sin detectarse.
12. Agregar pruebas automatizadas enfocadas primero en las rutas financieramente críticas identificadas en H6 (pagos de préstamos, procesamiento de aportes, generación de asientos contables) en lugar de intentar cobertura amplia de inmediato — esto previene directamente regresiones del mismo tipo de bug encontrado en H6.
13. Agregar paginación del lado del servidor (`setMaxResults`/`setFirstResult`) al `selectAll`/`selectByCriteria` genérico del DAO, priorizando primero las tablas más grandes.
14. Consolidar `AppStateService` como única fuente de verdad para el estado compartido, retirando las claves duplicadas de `localStorage` heredadas módulo por módulo a medida que se toquen (H9) — no como una migración de una sola vez.
15. Ampliar la cobertura de carga diferida con `loadComponent` y considerar dividir los componentes "dios" más grandes (H15/H16) de forma oportunista, cuando esos archivos se modifiquen de todas formas por una razón funcional — no como un sprint de refactorización aparte.

**Prioridad 3 — orden y limpieza (H4.4, desactualización de documentación):**
16. Corregir la descripción del backend en `ALCANCE-SISTEMA.md` (Jakarta EE, no Spring Boot) y actualizar los conteos de entidades/endpoints en ambos documentos de arquitectura.
17. Conciliar la documentación de nombres de esquema de CXC/CXP (`CBR`/`PGS`, según el código) en ambos documentos de arquitectura.
18. Alinear la nomenclatura `rhh`/`rrh`, y confirmar si el esquema `AOT` de `AnioMotor` es intencional.

---

## Anexo — Archivos clave para revisar con el equipo

Si se presenta esta revisión en vivo, estos son los archivos de mayor señal para mostrar directamente:

- `saaBE/src/main/java/com/saa/ws/rest/files/FileRest.java` + `.../basico/ejbImpl/FileServiceImpl.java` — H1, el hallazgo concreto más severo.
- `saaFE/src/app/shared/services/usuario.service.ts:90-94` + `saaBE/src/main/java/com/saa/ws/rest/scp/UsuarioRest.java:83-103` + `saaFE/src/app/modules/dash/forms/login/login.component.ts:151-166` — H2/H3, la historia completa de autenticación de punta a punta.
- `saaBE/docs/general/CORRECCION_MANEJO_EXCEPCIONES_DAO.md` + `saaBE/src/main/java/com/saa/ejb/crd/daoImpl/ProductoDaoServiceImpl.java:43-49` — H7.
- `saaBE/src/main/java/com/saa/basico/utilImpl/EntityDaoImpl.java:125-286` — H8, y también la única abstracción DAO compartida referenciada en H14.
- Cualquier controlador REST, p. ej. `saaBE/src/main/java/com/saa/ws/rest/crd/AdjuntoRest.java`, junto a `.../ws/rest/cnt/CentroCostoRest.java` — muestra lado a lado el código repetido y el patrón `catch (Throwable)` (H12/H14).
- `saaFE/src/app/modules/crd/forms/cruce-valores/cruce-valores.component.ts:769-782`, `.../proceso-pago-jubilados.component.ts:386-410`, `.../detalle-consulta-carga.component.ts:1991-1993`, `saaFE/src/app/modules/crd/service/novedad-carga.service.ts:69-94` — H6, los cinco bugs de pago del CRD.
- `saaFE/src/app/shared/services/app-state.service.ts:41-61` — H9.
- `saaFE/src/app/modules/crd/forms/entidad-participe/participe-dash/participe-dash.component.ts` — H16, el componente más grande del código base.

*Este documento fue producido mediante inspección directa de código en ambos repositorios el 28 de julio de 2026. Existe una versión complementaria en inglés, `SAA-ARCHITECTURE-REVIEW-2026-07-28.md`, en la misma carpeta.*
