# Resumen maestro — Extractos Bancarios y Conciliación Contable (ASOPREP FCPC)

**Última actualización:** Julio 27, 2026
**Propósito de este documento:** consolidar en un solo lugar todo lo construido
en esta iniciativa (carga de extractos → tablero de cumplimiento → conciliación
contable → cierre de mes), desde la Fase 1 hasta hoy, para que una sesión futura
no tenga que reconstruir el contexto leyendo el historial de conversación
completo. Los documentos de fase individuales (listados en cada sección) tienen
el detalle fila-por-fila; este documento es el mapa de alto nivel + el diseño
completo de Conciliación Contable y Cierre de Mes, que **no estaba documentado
en ningún otro archivo todavía**.

---

## 0. Mapa de fases

| Fase | Qué | Estado | Doc detallado |
|---|---|---|---|
| 1 | Modelo de datos base: `TSR.EXBC`/`DEXB`/`CTEB`, entidades JPA, DAO/Service/REST CRUD | Completo | (mencionado en Fase 2) |
| 2 | 11 parsers de banco + import (validar/confirmar) + 4 pantallas Angular | Completo, verificado contra archivos reales | `PLAN-PANTALLAS-EXTRACTOS-BANCARIOS-2026-07-25.md` |
| 2b | Período contable (`PRDOCDGO`) en `EXBC`/`DEXB` + reglas de validación | Completo | mismo doc, §10 |
| 2c | Validación de encabezado (rechazo de archivo de banco equivocado) | Completo, verificado con 10 combinaciones cruzadas | mismo doc, §11 |
| 3 | Tablero de Cumplimiento — legibilidad + drill-down por cuenta | Completo | este doc, §2 |
| 4 | Conciliación Contable — rediseño completo (extracto vs. asientos CNT) | Completo (backend + frontend), pendiente probar en vivo | este doc, §3 |
| 5 | Cierre de Mes (bloqueo de ediciones tras conciliar todo) | Completo, **exclusivo de TSR** (no toca CNT) | este doc, §4 |
| — | Optimización DTO liviano para `/exbc/getAll` (payload 18KB/6 filas) | **Pendiente, no implementado** — diseño listo | `PLAN-DTO-CONSULTA-EXTRACTOS-2026-07-25.md` |

---

## 1. Fases 1-2: Carga de extractos (parsers + período + validación de encabezado)

Ver `PLAN-PANTALLAS-EXTRACTOS-BANCARIOS-2026-07-25.md` para el detalle
completo (tabla de los 11 bancos con fila de encabezado, formato de fecha,
formato de monto, notas propias; los 2 bugs reales encontrados al correr los
parsers contra archivos reales — Manabí orden descendente, JEP filas fantasma
por celdas `BLANK` de Apache POI; la validación de encabezado por posición
exacta de columna para distinguir bancos con vocabulario casi idéntico como
Guayaquil/Manabí).

Puntos clave para no perder de vista:
- El parser se resuelve automáticamente por el nombre del banco de la cuenta
  elegida (`BankStatementParserFactory`, coincidencia por palabra clave
  normalizada), nunca lo elige el usuario ni se adivina por contenido.
- Flujo en dos fases: `validar` (previsualiza, no persiste) → `confirmar`
  (persiste `ExtractoBancario` + `DetalleExtractoBancario`).
- Período contable (`CNT.PRDO`) se elige explícitamente por el usuario al
  cargar, no se infiere de las fechas del archivo. Reglas de validación (no
  confundir):
  - Período `CERRADO` → **bloqueo duro**, sin excepción, en `validar` y
    `confirmar`. (Nota: ver §4 — "cerrado" hoy significa el cierre de TSR
    vía `ControlExtractoBancario`, no `Periodo.estado`; ver historial de
    cambio en §4.4.)
  - Fecha de transacción fuera de `primerDia`/`ultimoDia` del período elegido
    → **advertencia, nunca bloqueante** (caso esperado de corte de fin de
    mes).
- Detección de formato de archivo por firma de bytes (`PK\x03\x04`=XLSX,
  `D0 CF 11 E0`=XLS legado), nunca por extensión — Banco Amazonas entrega un
  `.xls` que en realidad es XLSX.

---

## 2. Tablero de Cumplimiento — legibilidad y drill-down

Pantalla `forms/generales/tablero-cumplimiento-extractos/` (`saaFE`), respaldada
por `ControlExtractoBancarioService`/`ControlExtractoBancarioDaoService` (`saaBE`,
tabla `TSR.CTEB`).

Qué se mejoró sobre la versión inicial (que solo mostraba un % agregado por
período):
- **Drill-down por cuenta**: `detalleCuentas(idEmpresa, idPeriodo)` devuelve una
  fila por cuenta bancaria activa (`DetalleCumplimientoCuenta`), indicando si
  cargó extracto (`cargada`) y si ya está conciliada (`conciliada`) — el usuario
  ve exactamente qué cuentas faltan, no solo un porcentaje.
- **Badges de estado** por cuenta en vez de solo una barra de progreso genérica.
- `contarCuentasConciliadas`/`selectCuentasConciliadas`
  (`ControlExtractoBancarioDaoServiceImpl`) fueron migrados para leer de
  `ConciliacionContable.estadoRevision = VERIFICADO` (el mecanismo real, ver §3)
  en vez del viejo `Conciliacion`/`rubroEstadoH`, que se confirmó **huérfano**
  (ningún llamador real en todo el código) durante la auditoría de esta sesión.

Endpoints REST (`ControlExtractoBancarioRest.java`, `@Path("cteb")`):
`/generar/{idEmpresa}/{idPeriodo}` (POST, idempotente — genera si no existe),
`/recalcular/{idEmpresa}/{idPeriodo}` (POST), `/detalleCuentas/{idEmpresa}/{idPeriodo}`
(GET), más CRUD estándar (`getAll`, `getId`, `PUT`, `selectByCriteria`, `DELETE`).

---

## 3. Conciliación Contable — rediseño completo

### 3.1 Qué reemplaza

La pantalla `conciliacion.component.ts` que existía antes era un **mock
hardcodeado** (datos de ejemplo fijos, sin llamada a backend). Este trabajo la
reemplaza por completo con una pantalla real: `forms/generales/
conciliacion-contable/` en `saaFE`, respaldada por un modelo de datos y
servicios nuevos en `saaBE`.

### 3.2 Modelo de datos (`saaBE`, paquete `com.saa.model.tsr`)

- **`ConciliacionContable`** — cabecera por (cuenta bancaria, período). Campos
  clave: `estadoRevision` (rubro `EstadoConciliacionContable`: `PENDIENTE`,
  `VERIFICADO`, `CON_DIFERENCIAS`), `totalGrupos`, `totalPendientesExtracto`,
  `totalPendientesAsiento`, `usuarioVerifica`, `fechaVerificacion`.
- **`GrupoConciliacionContable`** — un grupo de conciliación (match), capaz de
  ser N:M entre líneas de extracto y líneas de asiento contable (no solo 1:1).
- **`GrupoConciliacionExtracto`** / **`GrupoConciliacionAsiento`** — tablas de
  enlace (join tables) entre un grupo y sus líneas de `DetalleExtractoBancario`
  / `DetalleAsiento` respectivamente. **Sin constraint único a nivel de BD**
  porque los grupos "deshechos" (ver `deshacerGrupo`) se mantienen soft-kept
  para historial en vez de borrarse — una línea puede pasar por varios
  grupos a lo largo del tiempo (crear → deshacer → volver a conciliar).

### 3.3 Lógica de negocio (`ConciliacionContableMatchServiceImpl`)

- **`conciliarGrupo(idCuentaBancaria, idPeriodo, idsDetalleExtracto,
  idsDetalleAsiento, usuario)`**: valida (a) ninguna línea ya está en otro
  grupo activo, (b) el período no está cerrado (ver §4), (c) la suma de ambos
  lados coincide en monto (tolerancia `TOLERANCIA_MONETARIA = 0.01`, solo para
  redondeo de punto flotante, no una regla de negocio), (d) todas las fechas
  de ambos lados caen dentro de la tolerancia de días configurable (ver 3.4).
  Monto Y fecha son ambas obligatorias, ninguna es suficiente por sí sola.
- **`deshacerGrupo(idGrupo, usuario)`**: vuelve las líneas al pool de
  pendientes (soft — marca el grupo `INACTIVO`, no borra), bloqueado si el
  período está cerrado.
- **`sugerirCoincidencias(idCuentaBancaria, idPeriodo)`**: auto-match en dos
  pasadas — (1) exacto 1:1 primero, (2) luego N:1/1:N por búsqueda de
  subconjunto (subset-sum) acotada a `MAX_CANDIDATOS_SUBCONJUNTO = 8`
  candidatos (sobre ese tope, 2^n deja de ser trivial y se prefiere dejar el
  caso para conciliación manual antes que arriesgar una pasada lenta). Las
  sugerencias **no se persisten** — el usuario las confirma una por una (o
  todas con "Confirmar Todas") llamando a `conciliarGrupo` con los mismos ids.
- **`resumenPorPeriodo(idEmpresa, idPeriodo)`**: una fila por cuenta bancaria
  activa con su estado real si ya se abrió, o `null` si esa cuenta/período
  nunca se ha tocado — de solo lectura, nunca crea la cabecera
  `ConciliacionContable` de una cuenta que el usuario no ha abierto
  explícitamente (eso solo pasa al conciliar de verdad, vía `obtenerOCrear`).

### 3.4 Tolerancia de días configurable

Rubro `Rubros.ASP_TOLERANCIA_DIAS_CONCILIACION_CONTABLE` (id fijo `179`,
`codigoAlterno=1`, detalle id fijo `758`, valor en `valorNumerico`, actualmente
178 días). Leído vía `DetalleRubroService.selectValorNumericoByRubAltDetAlt`.
Los ids son fijos (no autogenerados) porque el cliente los especificó
explícitamente al pedir el SQL de inserción — si se necesita re-insertar, usar
esos mismos ids.

### 3.5 UX (rediseño pedido explícitamente, iterativo)

Flujo final: **período primero** → lista de todas las cuentas del sistema
mostrando cuáles ya están conciliadas / pendientes / con diferencias
(`resumenPorPeriodo`) → click en una cuenta entra al detalle de dos paneles
(pendientes de extracto | pendientes de asiento) con selección checkbox de
ambos lados, suma/diferencia en vivo, botón "Conciliar Seleccionados".

Mejoras de legibilidad pedidas y ya implementadas: tarjetas de sugerencia más
legibles, mostrar número de asiento contable en cada sugerencia, botón
"Confirmar Todas" (corre `sugerirCoincidencias` y llama `conciliarGrupo` para
cada sugerencia en secuencia), esquema de colores igual al de "bandeja
electrónica" (consistencia visual con otra pantalla ya existente del módulo).

### 3.6 Optimización de rendimiento: búsqueda de "grupos conciliados"

La búsqueda era lenta. Se corrigió reescribiéndola para usar el mecanismo
genérico **`selectByCriteria`** que ya usan todas las tablas del proyecto
(`DatosBusqueda`/`TipoDatosBusqueda`/`TipoComandosBusqueda`,
`EntityDaoImpl.selectByCriteria()` arma JPQL dinámicamente) — documentado en
`docs/transversal/guia-selectByCriteria.md`. Ese documento es la referencia a seguir cada
vez que se necesite un filtro dinámico nuevo en cualquier módulo, no solo TSR.

### 3.7 Bug de manejo de errores corregido en el camino

`GrupoConciliacionExtractoService`/`GrupoConciliacionAsientoService`
(Angular) tenían `catchError` que devolvía `of([])` en vez de propagar el
error — esto **enmascaraba un 404 real** (endpoint todavía no redesplegado)
como si fuera "resultado vacío", ocultando el problema real. Se corrigió a
`throwError(() => error.error || error)`, el mismo patrón que usa el resto del
código, más snackbars de error explícitos en el componente. Lección para
futuras revisiones: cualquier `catchError` que devuelva un valor por defecto
en silencio es sospechoso — verificar que no esté enmascarando errores reales
del backend (endpoint no desplegado, 500, etc.).

---

## 4. Cierre de Mes — bloqueo de ediciones, **exclusivo de TSR**

### 4.1 Objetivo

Una vez que todas las cuentas bancarias de una empresa están **verificadas**
para un período (`ConciliacionContable.estadoRevision = VERIFICADO` en todas),
permitir "cerrar el mes" para conciliación bancaria: bloquea cargar nuevos
extractos, conciliar, deshacer conciliaciones, y verificar cuentas para ese
período — con reversa ("Reabrir Mes") disponible.

### 4.2 Diseño abandonado (importante para no repetir el error)

La primera implementación usó el campo `Periodo.estado` de **CNT**
(`CNT.PRDO`), agregando un valor `EstadoPeriodos.CERRADO = 4` que **ya existía
en el rubro pero nunca se seteaba en ningún lado del código** (confirmado por
auditoría exhaustiva: solo se *leía* en un lugar,
`AsientoServiceImpl.validacionAsiento`, código huérfano de facto). Se agregaron
columnas de auditoría (`usuarioCierre`/`fechaCierre`) a `Periodo` y métodos
`cerrarPeriodo`/`reabrirPeriodo` a `PeriodoService`.

**Por qué se revirtió:** el usuario señaló correctamente que CNT **ya tiene su
propio proceso independiente de cierre de mes** (mayorización:
`ProcesosMayorizacion` con estados `MAYORIZACION`/`MAYORIZACION_CIERRE`/
`DESMAYORIZACION`/`DESMAYORIZACION_CIERRE`, `MayorizacionServiceImpl`) — pedirle
prestado el campo `estado` de `Periodo` para un concepto completamente distinto
(cierre de conciliación **bancaria**, no de mayorización contable) mezclaría
dos ciclos de vida independientes en la misma columna, con riesgo real de que
un cambio futuro en el flujo de mayorización de CNT rompa silenciosamente el
cierre de TSR (o viceversa). Instrucción explícita del usuario: *"CNT already
has its own process for closing a month, what we're working on should only
stay within TSR"*.

Se revirtió por completo: `Periodo.java`, `PeriodoService.java`,
`PeriodoServiceImpl.java` volvieron a su estado original (sin
`usuarioCierre`/`fechaCierre`/`cerrarPeriodo`/`reabrirPeriodo`). **No ejecutar**
ningún SQL de `ALTER TABLE CNT.PRDO ADD PRDOUSCR/PRDOFCCR` de una sesión previa
— quedó obsoleto.

### 4.3 Diseño final: `ControlExtractoBancario` (`TSR.CTEB`)

Se reutiliza la entidad `ControlExtractoBancario` (ya existía para el tablero
de cumplimiento, §2) como dueña del estado de cierre — decisión explícita del
usuario ("resue controlextractobancario") en vez de crear una tabla nueva.
Campos nuevos:

```java
@Column(name = "CTEBCRRE") private Long cerrado;       // 1 = cerrado, 0/null = abierto
@Column(name = "CTEBUSCR") private String usuarioCierre; // auditoria
@Column(name = "CTEBFCCR") private LocalDateTime fechaCierre;
```

SQL pendiente de ejecutar (el usuario lo corre manualmente, nunca yo):

```sql
ALTER TABLE TSR.CTEB ADD CTEBCRRE NUMBER(1);
ALTER TABLE TSR.CTEB ADD CTEBUSCR VARCHAR2(50);
ALTER TABLE TSR.CTEB ADD CTEBFCCR TIMESTAMP;
```

`ControlExtractoBancarioService` (interfaz + impl) gana 4 métodos:
- `estaCerrado(idEmpresa, idPeriodo)` — lectura pura, nunca crea el registro;
  ausencia de registro (nunca se generó ni se cerró) se interpreta como
  **abierto**.
- `cerrarPeriodo(idEmpresa, idPeriodo, usuario)` — reusa `generarPeriodo`
  (idempotente) para asegurar que exista la fila, luego marca cerrado +
  auditoría. No repite la validación de "todas verificadas" — eso es
  responsabilidad del llamador (`ConciliacionContableMatchService.cerrarMes`).
- `reabrirPeriodo(idEmpresa, idPeriodo)` — sin validaciones adicionales,
  siempre posible mientras esté cerrado.
- `selectPeriodosCerrados(idEmpresa)` — lista de ids de período cerrados, para
  pantallas que necesitan deshabilitar varios períodos a la vez (selector de
  período en carga de extractos) sin una llamada por período.

### 4.4 Los 4 puntos de bloqueo (todos migrados de `Periodo.estado` a
`ControlExtractoBancarioService.estaCerrado`)

1. `ConciliacionContableMatchServiceImpl.conciliarGrupo` — no permite crear
   grupos nuevos en período cerrado.
2. `ConciliacionContableMatchServiceImpl.deshacerGrupo` — no permite deshacer
   en período cerrado.
3. `ConciliacionContableServiceImpl.verificar` — no permite verificar una
   cuenta en período cerrado.
4. `ImportacionExtractoBancarioServiceImpl.obtenerPeriodoAbierto` — no permite
   cargar un extracto nuevo en período cerrado (bloqueo duro mencionado en
   §1, ahora respaldado por este mecanismo en vez de `Periodo.estado`).

Todos reciben `idEmpresa` derivándolo de `periodo.getEmpresa().getCodigo()`
(el objeto `Periodo` sigue siendo necesario para fechas/nombre/empresa — solo
se dejó de usar su campo `estado` para esta decisión).

### 4.5 `cerrarMes` / `reabrirMes`

`ConciliacionContableMatchService.cerrarMes(idEmpresa, idPeriodo, usuario)`:
gate real — llama `resumenPorPeriodo`, rechaza si **cualquier** cuenta no está
`VERIFICADO`, listando cuáles faltan en el mensaje de error; si todas están
verificadas, llama `controlExtractoBancarioService.cerrarPeriodo`.

`reabrirMes(idEmpresa, idPeriodo)` — nótese que la firma **cambió** de
`reabrirMes(idPeriodo)` a incluir `idEmpresa` durante el pivote (necesario
porque `ControlExtractoBancarioService` indexa por empresa+período, no solo
período) — propagado por los 5 niveles: interfaz → impl → REST → servicio
Angular → componente.

### 4.6 REST (`ConciliacionContableRest.java`, `@Path("cnct")`)

```
POST /cnct/cerrarMes/{idEmpresa}/{idPeriodo}     (body: { usuario })
POST /cnct/reabrirMes/{idEmpresa}/{idPeriodo}
GET  /cnct/periodosCerrados/{idEmpresa}          → List<Long> (ids de período)
```

Nota de diseño: se evaluó agregar también un `GET /cnct/estaCerrado/{idEmpresa}/
{idPeriodo}` de solo booleano, pero se descartó porque el endpoint **ya
existente** `POST /cteb/generar/{idEmpresa}/{idPeriodo}` (`ControlExtractoBancarioRest`,
método `generarPeriodo`, idempotente) devuelve el objeto completo — incluyendo
`cerrado`/`usuarioCierre`/`fechaCierre` a la vez — así que el frontend lo reusa
en vez de tener dos endpoints redundantes.

### 4.7 Frontend

- `conciliacion-contable.component.ts`: campo nuevo `controlPeriodoActual:
  ControlExtractoBancario | null`, poblado en `cargarControlPeriodo()` (llama
  `ControlExtractoBancarioService.generarPeriodo`) cada vez que cambia el
  período seleccionado y después de cerrar/reabrir. El getter
  `periodoActualCerrado` ahora lee `controlPeriodoActual?.cerrado === 1` en
  vez de `Periodo.estado`. El template muestra "Mes cerrado · por {usuario} el
  {fecha}" leyendo de `controlPeriodoActual`, no de `periodoActual` (Periodo).
- `cargar-extracto-bancario.component.ts`: en vez de leer
  `Periodo.estado === EstadoPeriodo.CERRADO` por período, ahora carga
  `ConciliacionContableService.periodosCerrados(idEmpresa)` una vez al
  iniciar (`cargarPeriodosCerrados()`, antes de `cargarPeriodos()` para que la
  selección automática del período por defecto ya sepa cuáles están cerrados)
  y guarda un `Set<number>` — `isPeriodoCerrado(periodo)` ahora consulta ese
  set.
- `cnt/model/periodo.ts`: se eliminaron los campos `usuarioCierre`/
  `fechaCierre` que se habían agregado para el diseño abandonado (§4.2) — ya
  no existen en el backend. El enum `EstadoPeriodo.CERRADO = 4` se dejó tal
  cual (es un valor de CNT, usado en otros switch de `periodo.service.ts` para
  mostrar texto/color genérico de estado — tocarlo está fuera del alcance de
  "TSR no debe tocar CNT").
- `tsr/model/control-extracto-bancario.ts`: se agregaron los 3 campos nuevos
  (`cerrado?`, `usuarioCierre?`, `fechaCierre?`).

### 4.8 Verificación hecha en esta última ronda

- `tsc --noEmit` sobre todo el frontend: sin errores.
- `ng build --configuration production`: build completo exitoso (solo
  warnings preexistentes de Sass deprecado y de presupuesto de bundle, no
  relacionados).
- Backend: **no se pudo correr `mvn`/`javac` completo** en este entorno (Maven
  no está instalable en el shell de esta sesión) — se verificó manualmente
  cruzando cada firma de método a través de los 5 niveles (interfaz → impl →
  REST → Angular service → componente) y se confirmó con `grep` que no quedan
  referencias sueltas a `periodoService.cerrarPeriodo`/`reabrirPeriodo` ni a
  `EstadoPeriodos.CERRADO` en ningún archivo de TSR tocado. **Pendiente: correr
  un build real de Maven o dejar que Eclipse compile al hacer refresh, antes
  de redesplegar.**

---

## 5. Pendientes / próximos pasos (al 2026-07-27)

1. Ejecutar el SQL de §4.3 (`ALTER TABLE TSR.CTEB ADD CTEBCRRE/CTEBUSCR/CTEBFCCR`).
   **No ejecutar** el SQL antiguo de `CNT.PRDO` de una sesión previa.
2. Redeploy completo de WildFly (Eclipse: Refresh F5 → Build → Servers →
   remove-and-readd el módulo, no solo Publish — patrón que ya se necesitó
   varias veces en esta iniciativa porque agregar métodos nuevos a una clase
   REST/EJB existente no siempre lo toma un publish incremental).
3. Probar en navegador real el flujo completo: conciliar cuentas → verificar
   todas → Cerrar Mes → confirmar que efectivamente bloquea (cargar extracto,
   conciliar, deshacer, verificar) → Reabrir Mes → confirmar que desbloquea.
4. Confirmar que el selector de período en "Cargar Extracto" deshabilita
   correctamente los períodos que están en `periodosCerrados`.
5. (Pendiente de otra rama de trabajo, no bloqueante) DTO liviano para
   `/exbc/getAll` — ver `PLAN-DTO-CONSULTA-EXTRACTOS-2026-07-25.md`.
6. Preguntas abiertas de datos de muestra de banco (Pichincha, Alianza,
   Pacífico) — ver `PLAN-PANTALLAS-EXTRACTOS-BANCARIOS-2026-07-25.md` §8, sin
   resolver todavía, no bloquean código.

---

## 6. Archivos clave (referencia rápida)

**Backend** (`c:\work\saaBE\saaBE\src\main\java\com\saa\`):
- `model/tsr/ConciliacionContable.java`, `GrupoConciliacionContable.java`,
  `GrupoConciliacionExtracto.java`, `GrupoConciliacionAsiento.java`,
  `ResumenConciliacionCuenta.java`, `SugerenciaConciliacionContable.java`,
  `SolicitudConciliarGrupo.java`, `SolicitudUsuario.java`.
- `model/tsr/ControlExtractoBancario.java` (campos de cierre agregados en §4.3).
- `ejb/tsr/service(Impl)/ConciliacionContableService.java`,
  `ConciliacionContableMatchService.java` (lógica de negocio principal, ver §3.3/§4.5).
- `ejb/tsr/service(Impl)/ControlExtractoBancarioService.java` (métodos de
  cierre agregados en §4.3).
- `ejb/tsr/dao(Impl)/ControlExtractoBancarioDaoService.java`,
  `ConciliacionContableDaoService.java`, `GrupoConciliacionExtractoDaoService.java`,
  `GrupoConciliacionAsientoDaoService.java`.
- `ejb/tsr/serviceImpl/ImportacionExtractoBancarioServiceImpl.java` (checkpoint
  de bloqueo en `obtenerPeriodoAbierto`).
- `ws/rest/tsr/ConciliacionContableRest.java` (`@Path("cnct")`),
  `ControlExtractoBancarioRest.java` (`@Path("cteb")`).
- `rubros/EstadoConciliacionContable.java`, `rubros/Rubros.java` (constante
  `ASP_TOLERANCIA_DIAS_CONCILIACION_CONTABLE`).

**Frontend** (`c:\work\saaFE\v1\saaFE\src\app\modules\tsr\`):
- `model/conciliacion-contable.ts`, `grupo-conciliacion-contable.ts`,
  `grupo-conciliacion-extracto.ts`, `grupo-conciliacion-asiento.ts`,
  `resumen-conciliacion-cuenta.ts`, `sugerencia-conciliacion-contable.ts`,
  `control-extracto-bancario.ts`.
- `service/conciliacion-contable.service.ts`,
  `service/grupo-conciliacion-extracto.service.ts`,
  `service/grupo-conciliacion-asiento.service.ts`,
  `service/control-extracto-bancario.service.ts`.
- `forms/generales/conciliacion-contable/` (pantalla principal, rediseño
  completo — período primero, resumen de cuentas, detalle de dos paneles,
  sugerencias, Cerrar/Reabrir Mes).
- `forms/generales/tablero-cumplimiento-extractos/` (drill-down, badges).
- `forms/generales/cargar-extracto-bancario/` (selector de período deshabilita
  cerrados vía `periodosCerrados`).
- `cnt/model/periodo.ts` (campos de cierre agregados y luego removidos, ver §4.7).

**Documento de referencia transversal:** `docs/transversal/guia-selectByCriteria.md` — usar
siempre que se necesite un filtro dinámico nuevo en cualquier módulo (§3.6).
