# PROMPT — **BACKEND** — Devengo de aportes, vigencias de contrato y flag contable

> **Eres el agente de BACKEND** del repositorio `saaBE`. Trabajas en paralelo con un agente de
> FRONTEND que toca `saaFE`. **No edites nada fuera de `saaBE`.**
>
> **Documentos obligatorios antes de escribir código** (léelos completos, en este orden):
> 1. `docs/logica-negocio/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md` — decisiones cerradas, fases y el
>    **contrato de API congelado (§4)**.
> 2. `docs/logica-negocio/petro/REGLAS-CARGA-PETRO.md` — el proceso que vas a modificar.
> 3. `CLAUDE.md` — capas, convenciones y trampas del repositorio.
>
> Las decisiones de negocio **ya están tomadas** (§1 del plan). No las re-abras ni propongas
> alternativas: impleméntalas.
>
> **No compilas ni despliegues.** `mvn` no está en el PATH; el usuario compila en Eclipse. No
> intentes verificar con `javac`/`mvn`; entrega el código y dilo explícitamente.
>
> El DDL **ya fue ejecutado por el usuario** (`sql/DDL-APORTES-DEVENGO-CONTRATOS.sql`). No lo
> ejecutes ni lo modifiques. Si necesitas una columna que no está, **repórtalo y detente**.
>
> Reporta al terminar **cada fase** con el formato exacto de §5 del plan. No esperes a terminar
> todo para reportar.

---

## Contexto mínimo

`CRD.APRT` guarda los aportes. Hasta hoy la carga Petro escribía `valor = esperado` más
`valorPagado`/`saldo` y un FIFO. El sistema migró a que el saldo del partícipe sea `SUM(APRTVLRR)`,
así que ese modelo está roto: infla los saldos y **infla el "registrado" de la contabilidad**.
Además `APRTFCTR` está respondiendo dos preguntas a la vez (cuándo entró la plata / a qué mes
pertenece), y se rompen los reportes cuando alguien paga meses atrasados.

### Rubros creados por el DDL de esta ola

| Alterno | `PRBRCDGO` | Constante en `com.saa.rubros.Rubros` | Detalles (`PDTRALTR`) |
|---|---|---|---|
| **235** | 235 | `CRD_TIPO_MOVIMIENTO_APORTE` | 1 APORTE_MENSUAL, 2 AJUSTE_MANUAL, 3 DEVOLUCION, 4 PAGO_PRESTAMO, 5 REVERSO, 6 MIGRADO |
| **236** | 236 | `CRD_MODO_VIGENCIA_CONTRATO` | 1 CALCULADO, 2 FIJO |
| **237** | 237 | `CRD_PARAMETROS_CONTABILIDAD` | 1 CONTABILIDAD_ACTIVA (valor en `PDTRVLRN`: 0/1) |

Los tres van con **`PRBRCDGO` = `PRBRALTR`** a propósito. La aplicación resuelve siempre por
**alterno** (`selectValorNumericoByRubAltDetAlt`), nunca por PK.

> **Ojo con la numeración, y no es un detalle:** la primera versión usaba 231/232/233 y **232 y 233
> ya estaban ocupados** por rubros de TSR (caja chica). Se detectó al ejecutar el DDL y se renumeró.
> **`Rubros.java` no es fuente confiable de qué alternos están libres** — esos rubros de TSR no
> tienen constante ahí. Si necesitas un rubro nuevo, verifícalo contra `SCP.PRBR` en la base y
> repórtalo; no lo deduzcas del archivo de constantes.

---

## FASE 1 — Flag contable y `valor = lo recibido` · **URGENTE, va primero y sola**

### 1.1 Barrido previo (reporta antes de tocar nada)

Busca **todos** los lectores de `APRTVLPG` / `APRTSLDO` / `getValorPagado()` / `getSaldo()` en el
proyecto, incluidos los KPIs de `AporteRest`. Reporta la lista y qué hace cada uno. Si alguno
calcula algo que se rompería al poner `saldo = 0`, dilo y **espera** antes de seguir.

### 1.2 Flag global de contabilidad de CRD

- Constante nueva en `com.saa.rubros.Rubros`: `CRD_PARAMETROS_CONTABILIDAD = 237`, con JavaDoc.
- Interfaz `com.saa.rubros.CrdParametroContabilidad` con `int CONTABILIDAD_ACTIVA = 1`.
- Servicio `com.saa.ejb.crd.service.ConfiguracionContabilidadService` (`@Local`) + `...ServiceImpl`
  (`@Stateless`): `boolean contabilidadActiva()` y
  `boolean actualizar(boolean activa, String usuario, String motivo)`.
  Lee con `detalleRubroService.selectValorNumericoByRubAltDetAlt(Rubros.CRD_PARAMETROS_CONTABILIDAD, CrdParametroContabilidad.CONTABILIDAD_ACTIVA)`.
  **Si la lectura falla o devuelve null, `contabilidadActiva()` retorna `false`** — apagado es el
  lado seguro.
- REST `com.saa.ws.rest.crd.ConfiguracionRest` (`@Path("cnfg")`) con los dos endpoints de §4.3 del plan.
- **Engancha el flag en todo punto de CRD que genere asientos**, empezando por el cierre de cartera.
  Cuando está apagado: el proceso corre y calcula igual, **pero no crea el asiento**, y lo deja
  dicho en el resultado y en el log. No lances excepción.

### 1.3 La carga escribe lo recibido

En `CargaArchivoPetroServiceImpl`:

- `crearNuevoAporte` deja de recibir `valorEsperado`: recibe **el monto que se le va a aplicar**, y
  graba `valor = monto`, `valorPagado = monto`, `saldo = 0`, `estado = 4 (PAGADA)`.
- `aplicarPagoAAporte` desaparece como concepto de "abonar a un aporte": ya no se abona nada, se
  crea la fila por lo recibido.
- Elimina el FIFO: `buscarAporteConSaldoPendiente` y las llamadas a
  `AporteDaoService.selectMinAporteConSaldo`. Deja el método del DAO marcado `@Deprecated` con la
  razón, no lo borres todavía.
- Elimina el código muerto ya marcado `@SuppressWarnings("unused")`: `crearAportesMesSiguiente`,
  `crearAporteExcedenteMesSiguiente`, `procesarAporteIndividual`.
- **La prelación nueva se implementa en la Fase 2**, no aquí. En esta fase, `procesarAporteUnicoTipo`
  y `procesarAportesAlternados` conservan su reparto actual, sólo cambia cómo se graba la fila.

### 1.4 Cerrar el reproceso de una carga

`aplicarPagosArchivoPetro` **no verifica que la carga ya esté procesada**, y `validarOrdenProcesamiento`
(`:2951`) **excluye explícitamente a la propia carga** de la comparación (`:2958-2960`, *"No validar
contra sí misma"*): por eso la última carga procesada se puede volver a correr, duplicando aportes y
pagos. Agrega al inicio: si `cargaArchivo.getEstado() == 3` → `IncomeException` con mensaje claro.
Documenta el cambio en `REGLAS-CARGA-PETRO.md` §3.1 en el mismo commit.

### 1.5 El crédito sin cuotas en mora vuelve a VIGENTE (pedido 10)

Hoy un préstamo marcado `EN_MORA (11)` sólo vuelve a `VIGENTE (2)` cuando corre el proceso diario de
las 02:00. Si el partícipe se pone al día con un cruce o un abono, el crédito **se queda en mora
hasta el día siguiente**.

**La lógica ya existe y está probada** en `ProcesoMoraPrestamoServiceImpl:303-308` (sin cuotas
vencidas y estado `EN_MORA` → `VIGENTE`). **Extráela a un método reutilizable** — no la copies — e
invócala desde:

- `CargaArchivoPetroServiceImpl.verificarYActualizarEstadoPrestamo` (hoy sólo contempla pasar a
  `CANCELADO (3)` cuando no quedan cuotas pendientes), y
- el equivalente del motor de pagos, para los pagos manuales, abonos y cruces con aportes.

Reglas que **no** puedes romper: se escribe en `PRSTIDST`, nunca en `ESPSCDGO`; **nunca reabrir
automáticamente los estados 3, 4 ni 5**; y "cuota vencida" se decide con el mismo criterio del
proceso diario, no con uno nuevo.

### 1.6 Corrección de datos — **como documento, no como endpoint**

Entrega `docs/logica-negocio/crd/sql/62_CORRECCION_VALOR_APORTES_CARGA.sql`, SQL puro (sin
`SET`/`DEFINE`/`WHENEVER`; el usuario lo corre en un plugin JDBC de VS Code), con esta estructura:

1. SELECT de control: cuántas filas y cuánto monto cambia, por periodo.
2. `CREATE TABLE CRD.BKP_APRT_VALOR_<fecha> AS SELECT ...` de las filas afectadas.
3. El `UPDATE`: `valor = valorPagado`, `saldo = 0`, `estado = 4`, **sólo** en filas de la carga
   (`APRTUSRG = 'SAA_AH'` o glosa `'Aporte %CargaArchivo: %'`) con `valor > 0` y `valor <> valorPagado`.
4. SELECT de verificación posterior.
5. **Recálculo del "registrado" contable** antes/después por mes, con la misma consulta que usa
   `selectAportesRegistrados`, para cuantificar el efecto en el cierre de cartera.
6. UPDATE de reverso desde el respaldo.

**No ejecutas nada.** El usuario lo revisa y lo corre.

---

## FASE 2 — Devengo

### 2.1 Entidad

`com.saa.model.crd.Aporte`: agrega `LocalDate periodoDevengo` (`APRTPRDV`) y
`Long tipoMovimiento` (`APRTTPMV`), con getters/setters a mano (sin Lombok) y JavaDoc que diga que
`APRTFCTR` es la fecha de caja y `APRTPRDV` el mes al que pertenece.

Constante `CRD_TIPO_MOVIMIENTO_APORTE = 235` en `Rubros` + interfaz
`com.saa.rubros.CrdTipoMovimientoAporte` con `APORTE_MENSUAL=1, AJUSTE_MANUAL=2, DEVOLUCION=3,
PAGO_PRESTAMO=4, REVERSO=5, MIGRADO=6`.

### 2.2 Todos los escritores de `APRT` llenan las dos columnas

| Escritor | `periodoDevengo` | `tipoMovimiento` |
|---|---|---|
| `CargaArchivoPetroServiceImpl` | el mes que cubre esa fila (§2.3) | `APORTE_MENSUAL` |
| `AporteServiceImpl.registrarAporte` | el que mande el usuario; si no manda, `TRUNC(fecha,'MM')` | `AJUSTE_MANUAL` |
| `DevolucionAporteServiceImpl` fila negativa | según la regla D5 (§2.4) | `DEVOLUCION` |
| `DevolucionAporteServiceImpl` reverso | el mismo de la fila que reversa | `REVERSO` |
| `ProcesoPagoPrestamoServiceImpl` fila negativa | **`NULL`** | `PAGO_PRESTAMO` |

`SolicitudRegistroAporte` gana un campo `periodoDevengo` opcional (`yyyy-MM-dd`, primer día del mes).

### 2.3 La prelación nueva — reemplaza al FIFO

Sin `saldo`, la prelación deja de ser "busca la fila con saldo" y pasa a ser **"busca el mes
incompleto más antiguo"**:

```
disponible = monto descontado del archivo
para cada mes m, del más antiguo al mes de la carga:
    para tipo en (JUBILACION 9, CESANTIA 11):        // jubilación primero, siempre
        faltante = esperado(m, tipo) − aportado(m, tipo)
        if faltante > 0 y disponible > 0:
            aplicar = min(disponible, faltante)
            crear fila: valor = aplicar, devengo = m, tipo, APORTE_MENSUAL
            disponible -= aplicar
si queda disponible:                                  // D4: se anticipa
    repetir el mismo reparto sobre m+1, m+2, ... hasta agotar
```

- `esperado(m, tipo)` sale de la vigencia de `CRD.VGCN` en vigor **al cierre del mes m** (Fase 3).
  **Mientras la Fase 3 no esté**, usa el `HistorialSueldo` estado 99 y deja el punto de extensión
  aislado en un solo método privado, para cambiarlo en una línea.
- `aportado(m, tipo)` = `SUM(valor)` de los aportes de esa entidad y tipo con devengo = m.
- Todo el reparto es de una carga: no se “abona” a filas anteriores, se **crean filas nuevas** con el
  devengo del mes que cubren. Varias filas del mismo mes son normales y correctas.
- El bucle hacia atrás arranca en el primer mes incompleto posterior al último mes completo; pon un
  tope de seguridad (p. ej. 60 meses) y loguéalo si se alcanza.

Métodos nuevos en `AporteDaoService`, con JavaDoc, sin `selectAll()`:
`sumValorPorEntidadTipoYDevengo(idEntidad, idTipo, LocalDate periodo)` y
`sumValorPorEntidadTipoYRangoDevengo(...)` devolviendo `Object[]{periodo, tipo, suma}`.

### 2.4 Devoluciones (regla D5)

En `DevolucionAporteServiceImpl`, antes de insertar la fila negativa de un tipo: busca los periodos
de devengo **futuros respecto del mes en curso** de esa entidad y tipo con `SUM(valor) > 0`, ordenados
del **más futuro al más cercano**, y consume contra ellos hasta agotar el valor a devolver.

- Si el valor cabe en un solo periodo anticipado → una fila negativa con ese devengo.
- Si abarca varios → **una fila negativa por periodo**, cada una con su devengo.
- El remanente que no corresponda a ningún anticipo → fila negativa con `periodoDevengo = NULL`.

**Nunca marques devengo de un mes ya vencido.** Si lo hicieras, ese mes volvería a verse impago, el
partícipe volvería a mora y la generación se lo cobraría de nuevo.

### 2.5 Backfill — **documento revisable, no lo ejecutas**

`docs/logica-negocio/crd/sql/63_BACKFILL_DEVENGO_APORTES.sql`, SQL puro, con:

- **Alcance:** filas con `APRTFCTR >= 2025-06-01`. Lo anterior se queda en `NULL` a propósito.
- **Regla 1 (directa):** filas de carga donde la entidad tiene una sola fila por tipo en ese mes de
  caja → `devengo = TRUNC(APRTFCTR,'MM')`.
- **Regla 2 (reconstrucción):** cuando hay varias filas del mismo tipo en el mismo mes de caja
  (cobro de atrasos), se asignan **hacia atrás**, a los meses consecutivos anteriores sin aporte de
  ese tipo, empezando por el más antiguo. **Esto es una reconstrucción por regla, no un dato
  recuperado** — dilo en el encabezado con esas palabras. La glosa de todas las filas dice el mes de
  la carga y `CXPG` guarda el monto ya multiplicado: no hay fuente que enumere los meses cobrados.
- **Regla 3:** `tipoMovimiento` por glosa + signo + usuario, según la tabla de §2.2; lo que no encaje
  → `MIGRADO`.
- SELECT de control **antes** (cuántas filas por regla, cuántas quedan ambiguas), respaldo, updates,
  y verificación después.

---

## FASE 3 — Contratos y vigencias

### 3.1 Entidades y capas

`com.saa.model.crd.VigenciaContrato` → `CRD.VGCN`, con `@SequenceGenerator(sequenceName = "CRD.SQ_VGCNCDGO", allocationSize = 1)`,
`NombreEntidadesCredito` con la constante nueva, y las cinco capas del estándar
(`docs/estandar/ESTANDAR_MAPEO_CAPAS.md`): DAO `@Local` + `@Stateless`, Service `@Local` + `@Stateless`,
REST `@Path("vgcn")`. Copia una entidad existente del módulo; no inventes la estructura.

`Contrato` gana `Double montoAporteJubilacion` (`CNTRMNAJ`) y `Double montoAporteCesantia` (`CNTRMNAC`).

**Cambios de tipo Java — sin DDL detrás, y son obligatorios.** Verificado en la base el 2026-08-27:
`CNTRPRAI`, `CNTRPRAJ` y `PRTCRMUN` son `NUMBER` **sin precisión**, o sea que Oracle **ya guarda
decimales**; el `MODIFY` ni siquiera se pudo ejecutar (`ORA-01440`). Quien pierde los centavos es el
mapeo Java: mientras esos campos sigan siendo `Long`, el backend **trunca al leer y al escribir**
aunque la columna los admita.

- `Contrato.porcentajeAporteIndividual` (cesantía) y `Contrato.porcentajeAporteJubilacion`: `Long` → `Double`.
- `Participe.remuneracionUnificada`: `Long` → `Double`.
- **Busca todos los usos de esos getters/setters antes de cambiar el tipo** y ajústalos. Presta
  atención a comparaciones (`==`, `equals`) y a aritmética entera: un `Long` que se vuelve `Double`
  cambia el resultado de una división silenciosamente.
- Si alguno se serializa hacia el frontend, avisa en el reporte: el JSON pasa de entero a decimal.

> `CNTRPRAI` es el porcentaje de **CESANTÍA** ("aporte individual") y `CNTRPRAJ` el de **JUBILACIÓN**.
> Confirmado con el usuario; el nombre del campo no lo dice.

### 3.2 Reglas de la vigencia

- Como máximo una vigencia abierta (`VGCNFCFN IS NULL`) por contrato y tipo — la base ya lo garantiza
  con `UK_VGCN_ABIERTA`; el servicio debe dar un error claro antes de chocarse con el índice.
- Crear una vigencia **cierra la anterior** con `fechaFin = fechaInicio − 1 día`, en la misma transacción.
- Tras crear o cerrar, **actualiza el espejo** `CNTR.CNTRMNAJ`/`CNTRMNAC`/`CNTRPRAI`/`CNTRPRAJ`.
  El espejo nunca se escribe desde otro lado.
- `esperado(entidad, tipo, mes)`: la vigencia con `VGCNIDST = 1` cuyo rango cubre el **último día del
  mes**. Si no hay ninguna → `0` (no lanza).

### 3.3 Migración desde `HSTR` — documento revisable

`docs/logica-negocio/crd/sql/64_MIGRACION_CONTRATOS_VIGENCIAS.sql`:

Para cada entidad en estado `ACTIVO (1)` o `ACTIVO_EN_MORA (8)` con `HSTR` estado 99 (el más reciente
por `HSTRFCIN DESC, HSTRCDGO DESC`):

1. Si tiene contrato → ponerlo activo. Si no → **crearlo**, activo.
2. Una vigencia por tipo con monto > 0: tipo 9 con `HSTRMNAJ`, tipo 11 con `HSTRMNAC`.
   `VGCNFCIN` = fecha de inicio del contrato o `2025-06-01`, la que sea mayor. `VGCNIDHS` = el `HSTRCDGO` de origen.
3. `modo`: si `PRTCRMUN` tiene valor y `ROUND(PRTCRMUN * porcentaje / 100, 2)` coincide **al centavo**
   con el monto de `HSTR` para alguno de los porcentajes del catálogo, → `CALCULADO` guardando
   porcentaje y remuneración; en cualquier otro caso → `FIJO`. Si no hay `PRTCRMUN`, intenta
   `CRD.EXTR.EXTRSLTT` cruzando por `ENTD.ENTDNMID = EXTR.EXTRCDLA`. **Sin remuneración → FIJO y se
   cobra igual**: el monto de `HSTR` manda siempre.
4. **Inactivar** los contratos de entidades que no estén ACTIVO/ACTIVO_EN_MORA o que no tengan `HSTR` 99.

Controles obligatorios: total de `SUM(HSTRMNAJ + HSTRMNAC)` de la base contra
`SUM(VGCNMNTO)` de las vigencias creadas — **deben cuadrar al centavo**; entidades sin contrato creado;
entidades con contrato pero sin vigencia; reparto CALCULADO vs FIJO.

### 3.4 Marca de última actualización del partícipe (pedido 9)

**Esto NO necesita DDL.** `CRD.ENTD` **ya tiene** columnas de fecha y usuario de modificación
(verificado por el usuario en la base el 2026-08-27). El problema es que **la entidad JPA no mapea la
fecha**: `Entidad.java` sólo mapea `ENTDIPMD` (ip) y `ENTDUSMD` (usuario). La columna existe en Oracle
y ninguna línea de código la escribe — por eso la pantalla nunca la actualiza.

Es un caso del patrón "el dato no viene de donde parece": no falta el campo, falta el mapeo.

1. **Confirma el nombre exacto** de la columna de fecha de modificación en `CRD.ENTD` contra
   `ALL_TAB_COLUMNS` antes de escribir nada. No lo asumas.
2. Mapéala en `Entidad.java` como `LocalDateTime fechaModificacion`, junto a las que ya están.
   Ojo: `ENTDFCIN` está mapeada como `String` — no sigas ese ejemplo para la nueva.
3. **Una sola marca para toda la pantalla.** Todo guardado de las tablas de esa pantalla —`ENTD`,
   `PRTC`, direcciones, referencias, cónyuge, perfil económico, cuentas bancarias— debe sellar
   `fechaModificacion = now()` y `usuarioModificacion = usuario` **sobre `ENTD` y en la misma
   transacción**. Centralízalo en un método (p. ej. `EntidadService.sellarActualizacion(idEntidad, usuario)`)
   e invócalo desde cada service; no repitas el `set` en cada uno.
4. **No uses triggers**: un trigger no sabe qué usuario hizo el cambio y el campo de usuario quedaría
   vacío.
5. Devuelve `ultimaActualizacion` y `usuarioUltimaActualizacion` en el DTO que consume esa pantalla.
6. Barre primero qué services guardan tablas de esa pantalla y **reporta la lista** antes de tocarlos.
7. **No toques `ENTDFCIN` ni `PRTCFCIN`**: son fechas de *ingreso*. Si la pantalla está mostrando una
   de ellas como "última actualización", el arreglo es que muestre la de modificación, no reescribir
   la de ingreso.

### 3.5 Unificar la fuente del esperado contable

`CierreCarteraDaoServiceImpl.selectAporteMensualEsperado` hoy suma `HSTR` estado 99. Migrarla a `VGCN`.
**Si no se migra, el archivo de cobro y el esperado contable quedan leyendo fuentes distintas y
divergen en silencio.** Deja una consulta de control que compare ambas fuentes y repórtala.

---

## FASE 4 — Generación del archivo · **se entrega apagada**

En `GeneracionArchivoPetroServiceImpl.recopilarAportes`, reemplaza "monto de `HSTR` × meses
adeudados" por:

```
a cobrar = Σ, para cada mes m ≤ periodo generado:  max(0, esperado(m,tipo) − aportado(m,tipo))
```

sumando jubilación y cesantía por separado para las columnas AJ/AC de ARCH y los `CXPG`.
`calcularMesesACobrarMorosos` y `selectUltimaFechaAportePorEntidad` **desaparecen**: el cálculo por
faltante ya cubre morosos, anticipos y devoluciones sin casos especiales.

Deja el camino nuevo detrás de una bandera de configuración, apagado por defecto, y el camino viejo
intacto hasta que el usuario lo valide. Documenta el cambio en `REGLAS-GENERACION-PETRO.md`.

**Pedido 4 — nombre de la filial en la consulta de generaciones.** El DTO que devuelve la consulta de
`GNAP` trae `FLLLCDGO` pero no el nombre. Agrégalo resolviendo `CRD.FLLL` en la misma consulta (un
`JOIN`, no un `select` por fila), y súmalo al DTO como `nombreFilial`. El frontend ya lo espera.

---

## FASE 5 — Consultas de cartera al devengo

**Todas** usan `NVL(a.APRTPRDV, TRUNC(a.APRTFCTR, 'MM'))`, nunca la columna sola: sin el `NVL`, todo
lo anterior a este cambio desaparece del reporte.

| Cambia | Dónde |
|---|---|
| Padrón: nº de aportes y último mes | `EntidadDaoServiceImpl.selectPadronParticipes:404-405` |
| Mora del partícipe en la carga | `AporteDaoServiceImpl.sumaAportesPositivosPorTipoYPeriodo:103-104` |
| Estado de cuenta por devengo (endpoint nuevo §4.2 del plan) | `AporteRest` |

**Mora vs deuda (D6):** la mora sigue siendo *"el mes cuenta si `SUM(valor) > 0"* — **no la cambies**
a "cubre lo esperado", o moverías gente a mora y afectarías voto y elegibilidad. Lo esperado sólo
define la **deuda**, que va en el estado de cuenta y en la generación.

**NO cambian** (siguen en `APRTFCTR`, son preguntas de caja): `selectAportesRegistrados` del cierre de
cartera, G42, G40, G44, CPRM, CJBM, G43 y `SaldoAporteService`.

**Decisión pendiente del usuario, no la tomes:** G44 "imposiciones acumuladas" cuenta filas
(`selectConteoAportesTipo9y11`); con anticipos y meses partidos, filas ≠ meses. Repórtalo y sigue.

### 5.1 "Sin aportes" no es un error (pedido 1)

La pantalla `participe-dash` muestra **"error al cargar"** cuando el partícipe no tiene aportes o no
tiene préstamos. La causa es de backend: el estilo de la casa hace que los `Service` lancen
`IncomeException` cuando una búsqueda no devuelve filas, el REST lo convierte en `500` y el frontend
no puede distinguirlo de una caída real.

En los endpoints **de consulta** que alimentan esa pantalla (aportes y préstamos por partícipe), una
lista vacía es un resultado válido: devuelve `200` con `[]`. **No cambies este comportamiento en
masa** — sólo en los endpoints de esa pantalla, y reporta cuáles tocaste. Otros consumidores pueden
depender de la excepción, y el padrón ya sigue esta regla (un padrón vacío no lanza).

---

## Reglas de la casa

- Español en código, comentarios y commits.
- Cinco capas por tabla; copia una entidad existente del módulo.
- Los métodos de service/REST empiezan con la línea de traza `System.out.println`.
- REST: `catch (Throwable e)` → `Response.status(INTERNAL_SERVER_ERROR).entity("Error ...: " + e.getMessage())`.
- Prohibido `selectAll()` en los procesos de carga y generación.
- Usa las interfaces de `com.saa.rubros`, nunca literales.
- Los DAO de carga absorben errores y devuelven listas vacías: preserva ese comportamiento.
- Los `.sql` **sólo viven en `saaBE`**; no los espejes a `saaFE`.
- Todo cambio en `CargaArchivoPetroServiceImpl` o `GeneracionArchivoPetroServiceImpl` **debe
  actualizar su documento en `docs/logica-negocio/petro/` en el mismo cambio**.
