# Rediseño de la pantalla de pago a jubilados

**Fecha:** 2026-09-03 · **Equipo:** `lap-saa-1` (laptop) · **Árbitro:** `lap-saa-1-arb`

**Pedido del usuario:** *«analiza súper bien la función de pago de jubilados y se reestructure la
pantalla para que sea más intuitiva, amigable y moderna»*, más tres requerimientos previos del mismo
día: anular el pago de un jubilado, dos vistos de cuenta bancaria y certificado, y conectar el
proceso real.

**División de trabajo acordada con `omen-saa-1-arb` (equipo `eqB`) el 2026-09-03:**
**el `saaBE` de este frente es de `eqB`; el `saaFE` es de `lap-saa-1`.** Todo lo que este documento
marca como backend nuevo se le pide a ellos, no se escribe acá.

---

## 1. Qué hace hoy la pantalla, medido contra el código

`crd/forms/entidad-participe/jubilados/proceso-pago-jubilados/` — ruta `/menucreditos/jubilados`.
486 líneas de TS y 387 de HTML, con **cuatro secciones apiladas en un solo scroll**:

| # | Sección | Qué hace | Backend que usa |
|---|---|---|---|
| 1 | Buscar jubilado | Filtra partícipes por cédula/nombre y muestra su saldo de pensión | `/rest/entd`, `/rest/aprt` |
| 2 | Asignar valor de pago | Alta y edición de la parametrización del jubilado | `/rest/vppc` |
| 3 | Resumen de pagos asignados | Lista las `VPPC` activas | `/rest/vppc/getAll` |
| 4 | Procesar pago del mes | **Era un `setInterval` de 5 segundos con un cartel de éxito falso** | ninguno (hoy en corrección) |

## 2. Los seis problemas, en orden de gravedad

**① Mezcla dos trabajos con ritmos distintos.** Las secciones 1 a 3 son **mantenimiento del
padrón**: se tocan cuando alguien se jubila o cambia su valor, o sea rara vez. La sección 4 es la
**corrida mensual**, que mueve plata, genera asientos contables y crea órdenes en tesorería. El
operador que entra a pagar atraviesa tres secciones que no le importan para llegar a la única que sí.

**② El botón que mueve plata parece un botón más.** «Procesar pago del mes» está al final de un
scroll largo, con el mismo peso visual que «Guardar asignación». Sin confirmación y sin
previsualización: se aprieta y corre.

**③ No hay prevuelo, y el proceso no es transaccional por lote.** Cada jubilado corre en su propia
transacción: un fallo se cuenta como error y **lo ya generado queda generado**. Hoy los motivos de
fallo —sin cuenta bancaria, saldo insuficiente del aporte 23, sin `VPPC` activa— se descubren
**después** de correr, mezclados con los éxitos. El operador no puede corregir antes; sólo puede
mirar el resultado después.

**④ El período está enterrado.** De qué mes estamos hablando es el eje de todo el trabajo, y hoy es
un campo al final de la cuarta sección.

**⑤ No hay seguimiento.** La pantalla no puede responder *«¿cómo va el pago de agosto?»*. El
resultado de la corrida vive sólo en memoria: si el operador recarga la página, lo pierde. No hay
estado de los pagos, ni reconciliación, ni anulación.

**⑥ Dos tablas para la misma población.** La sección 1 lista partícipes y la 3 lista asignaciones,
con columnas distintas, y el operador las cruza mentalmente.

## 3. Estructura propuesta

**Encabezado fijo con el período** (mes/año) y tarjetas de KPI de ese período, más **tres pestañas**:

### Pestaña A — «Padrón» (absorbe las secciones 1, 2 y 3)

Una sola tabla del padrón de jubilados, con búsqueda y edición por diálogo, en lugar de tres
bloques. Columnas: cédula, nombre, valor pensión, seguro, cuotas, tiene préstamo, saldo del aporte
23, **✔ cuenta bancaria**, **✔ certificado**, acciones.

### Pestaña B — «Corrida del mes»

1. **Prevuelo** — antes de ejecutar, y todo calculable en el cliente: cuántos jubilados, cuánto
   suma, cuántos **listos** y cuántos **bloqueados con el motivo en la propia fila** (sin cuenta
   bancaria · sin certificado · saldo insuficiente · ya pagado este período).
2. **Ejecutar** — botón destacado, con **diálogo de confirmación que nombra la consecuencia**:
   *«Se van a generar N pagos por $X, de los cuales $Y salen al banco y $Z se cruzan contra
   préstamos. Esta acción genera asientos contables y órdenes en tesorería.»*
3. **Resultado** — resumen, lista de errores y tabla de detalle.

#### ⛔ CORREGIDO — el certificado ya NO bloquea todo (frontend, 2026-09-05)

Este punto 1 quedó desactualizado por dos decisiones del usuario posteriores a este diseño
(§6/§4ter/§6-2026-09-05 del contrato):

- **Sin certificado ya no es un bloqueo total.** El certificado gobierna únicamente si la
  **pensión** sale al banco del jubilado. Sin él, el jubilado sigue participando parcialmente
  («Parcial», antes «Solo cruce»): el cruce contra préstamo y el traspaso del seguro médico se
  procesan igual, solo la porción de pensión queda retenida.
- **El seguro médico nunca dependió del certificado**, y desde el 2026-09-05 el usuario lo dejó
  explícito: el seguro nunca fue plata del jubilado — siempre se descuenta y siempre sale, en una
  orden aparte a un proveedor, tenga o no certificado el jubilado.
- **Solo se bloquea del todo** a quien no tiene préstamo, ni certificado, ni seguro médico: ahí no
  queda nada que hacer con esa pensión ese mes.
- El punto 2 (diálogo de confirmación) también quedó corto: hoy son **tres** montos, no dos —
  «a préstamos», «a dinero» (al banco del jubilado) y «seguro médico (a proveedor)» — y el diálogo
  y las tarjetas de la pantalla real ya muestran los tres.

Implementado en `corrida-mes-pago-jubilados.component.ts`/`.html` — ver el campo `participacion`
(`COMPLETA` | `SOLO_CRUCE` = «Parcial» | `BLOQUEADO` | `AL_DIA`) en
`docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md` §6, que es la fuente de verdad vigente.

### Pestaña C — «Seguimiento» ⛔ bloqueada por backend

Pagos del período con su estado (`REGISTRADA` · `EN_PAGO` · `PAGADA` · `RECHAZADA` · `ANULADA`), con
**reconciliar** y **anular**. Se construye cuando `eqB` entregue los endpoints del §5.

## 3bis. ⭐ El patrón ya existe en la casa: `cierre-cartera`

Relevado el 2026-09-03 por el agente de frontend leyendo los archivos, no suponiéndolos. **No se
inventa una estructura nueva: se copia la que el repositorio ya tiene.**

**`crd/forms/cierre-cartera` es el patrón más cercano y el más elaborado**, y resuelve casi punto por
punto lo que necesita esta pantalla:

| Necesidad | Cómo lo resuelve `cierre-cartera` |
|---|---|
| Selector de período | Año como `input number` y mes como `mat-select`, con `[(ngModel)]` — no reactive forms |
| Prevuelo | **Ya tiene un botón `Previsualizar` separado del de `Ejecutar`** — el prevuelo del §3 es esta misma idea |
| Carga por acción | Cada botón alterna su ícono por un `<mat-spinner diameter="18">`; **un flag por acción, no uno global** |
| Proceso largo | Banner aparte `.proceso-largo` con spinner grande y «puede tardar varios segundos» |
| Estados | `<span class="badge" [ngClass]="claseEstado(...)">` — clase e ícono, no color de fondo de fila |
| **Lo que no es error** | Tiene un bloque de **«Desviaciones» con su propia explicación de que no son errores**, separado del de «Advertencias» |

Esa última fila es el hallazgo que más vale: **el caso «cruzado íntegro a préstamo, sin orden de
pago» es exactamente una desviación, no un error**, y la pantalla de cierre ya tiene resuelto cómo
mostrar esa categoría sin que el operador la lea como fallo.

De **`crd/forms/devolucion-aportes`** se toman dos cosas:
- El **chip de estado** `[class]="claseEstado(...)"` con `<mat-icon>` + texto, reusado por fila.
- El **diálogo de confirmación con el desglose completo** antes de una operación que saca dinero.
  Es el precedente directo del diálogo del §3-B2.

**Entorno, verificado:** Angular Material **20.2.10**. **No hay tema Material propio** — los
componentes usan variables SCSS de `src/styles/abstracts/_colors.scss` (`$saa-primary`, `$saa-accent`,
`$success`, `$info`). Usar esas variables, no colores literales.

**Disponible en `shared/`:** `ConfirmDialogComponent` (`shared/basics/confirm-dialog/`),
`ExportService` (CSV y PDF), `LoadingService` (global, **no** por botón — `cierre-cartera` no lo usa
y prefiere signals locales por acción; hacer lo mismo). `shared/basics/table/` es un CRUD genérico de
catálogos: **no aplica** a un resultado de proceso por lotes.

**El menú ya tiene la entrada** «Pago Jubilados» → `/menucreditos/jubilados`
(`menucreditos.component.ts:92-105`). No hay que tocarlo.

### ⚠️ Esta pantalla no tiene ningún control de permisos

Sólo hereda el `authGuard` del padre `menucreditos`, que verifica que haya sesión iniciada. Existe un
`usuarioUnoGuard` (`shared/guard/usuario-uno.guard.ts`), pero es una restricción ad-hoc por nombre de
usuario, documentada como temporal, y hoy se aplica **sólo a `bandas-de-cartera` y a
`cierre-de-cartera`** — es decir, justamente a los otros dos procesos pesados del módulo.

**Este pantalla va a tener un botón que mueve dinero, genera asientos y crea órdenes en tesorería, y
cualquiera con sesión va a poder apretarlo.** Es una decisión del usuario, no del equipo, y está
anotada en los pendientes.

## 4. ⭐ Los dos vistos NO necesitan backend nuevo

Hallazgo del 2026-09-03. El certificado bancario **no** es una columna de `CRD.CNBP`: es un PDF en
`CRD.ADJN` (`Adjunto`), vinculado por `ADJNIDRF` = código de la cuenta, con `TipoAdjunto`
**'CERTIFICADO BANCARIO'** del catálogo `CRD.TPDJ`.

Y **los tres endpoints masivos ya existen**, así que se resuelve con tres llamadas y un cruce en el
cliente, sin pedirle nada a `eqB`:

| Paso | Endpoint | Trae |
|---|---|---|
| 1 | `POST /rest/tpdj/selectByCriteria` | el `TPDJCDGO` de `'CERTIFICADO BANCARIO'` |
| 2 | `POST /rest/cnbp/selectByCriteria` | las cuentas bancarias activas de los jubilados |
| 3 | `POST /rest/adjn/selectByCriteria` | los adjuntos de esas cuentas con ese tipo |

- **✔ cuenta bancaria** = existe exactamente **una** cuenta activa. El backend
  (`unicaCuentaActiva`) falla si hay cero **o más de una**: el visto tiene que reflejar esa misma
  regla, no «tiene al menos una».
- **✔ certificado** = esa cuenta tiene un `Adjunto` del tipo del paso 1.

⛔ **Trampa, y es silenciosa.** Si `CRD.TPDJ` no tiene la fila `'CERTIFICADO BANCARIO'`, el paso 1
devuelve vacío y **todos los certificados se pintarían como faltantes** — una respuesta equivocada
que se ve exactamente igual que una correcta. En ese caso la pantalla **no muestra vistos vacíos**:
muestra un aviso explícito de que no se puede verificar y por qué. La fila se carga con
`crd/sql/CARGA-TIPO-ADJUNTO-CERTIFICADO-BANCARIO.sql`, y es **por ambiente**.

⚠️ Cuidado con el tamaño de la lista de ids: el registro de reservas §12 tiene anotada la deuda del
`in :ids` sin techo. Partir en tandas de 500.

## 5. Lo que hay que pedirle a `eqB` (backend)

| # | Qué | Para qué | Estado |
|---|---|---|---|
| B1 | `POST /rest/pgpc/anular/{id}` con `{usuario, motivo}` | Pestaña C | decisiones ya tomadas, §6 |
| B2 | `GET /rest/pgpc/porPeriodo?anio=&mes=` | Pestaña C y el prevuelo («ya pagado este período») | sin pedir |
| B3 | Reversa del asiento de devengo al anular **y al rechazar** | Hoy un rechazo deja el pasivo vivo en `2.3.01.10.03` | reportado a `eqB` |
| B4 | Persistir el monto cruzado (`PGPCVLCR`) | Sin él no se puede saber si un pago tuvo cruce | ver §6 |

## 6. Decisiones del usuario — 2026-09-03, no re-preguntar

1. **Un pago se anula sólo en `REGISTRADA` y `EN_PAGO`.** Un `PAGADA` ya sacó el dinero: eso es una
   reversa de tesorería, otro circuito.
2. **No se permite anular un pago que tuvo cruce contra préstamo.**
3. **La anulación reversa el asiento de devengo.**
4. **Dos vistos separados**, cuenta y certificado, no uno combinado: con uno solo el operador ve que
   falta algo pero no qué.
5. **La pantalla llama al proceso real.**

⛔ **La decisión 2 no es implementable hoy, y por eso existe B4:** `montoCruzado` es una variable
local de `generarPagoIndividual` que va a un `println` y al DTO de la respuesta, y muere ahí. Las 18
columnas de `CRD.PGPC` no guardan ninguna. **Hoy el backend no puede saber si un pago tuvo cruce.**
Guardarlo arregla además que el historial pueda mostrar cuánto fue a deuda y cuánto al banco, que el
contrato de `eqB` promete y el código no puede cumplir.

## 6bis. ⭐ Cómo se implementa anular un pago CON cruce

**Decisión del usuario del 2026-09-03, que REEMPLAZA a la decisión 2 del §6:** un pago con cruce
contra préstamo **sí** se anula. Hay que deshacer cuotas ya liquidadas.

**Y la buena noticia es que no hay que inventar nada: el sistema entero ya sabe hacerlo.** Verificado
contra el código, no deducido.

### Las piezas que ya existen

| Pieza | Dónde | Qué hace |
|---|---|---|
| `pagarConAportes` devuelve el evento | `ResultadoAplicacionPago.idEvento` | El cruce **ya sabe** qué `EventoPrestamo` creó — hoy lo descarta |
| `anularOperacion(SolicitudAnulacion)` | `ProcesoPagoPrestamoService:267` | Reversa un `EventoPrestamo` completo, para los 4 tipos de operación |
| Reversa de aportes | `anularOperacion` paso 4, `revertirAportes(...)` | **Devuelve el aporte que el cruce consumió.** No hay que hacerlo aparte |
| `EVPR` soporta anulación | `CRD.EVPR` | Ya tiene `estado`, `usuarioAnulacion`, `fechaAnulacion`, `motivoAnulacion` |
| Anular la orden en tesorería | `pagoProgramadoService.anularPago(idPago, motivo, idUsuario)` | Y **CRD ya lo llama**, desde `DevolucionAporteServiceImpl:858` |
| **El precedente completo** | `DevolucionAporteServiceImpl.anularDevolucion` (`:796`) | Mismo circuito, mismo módulo, ya desplegado |

> **`anularPagoPension` es `anularDevolucion` más un bucle que reversa los eventos de préstamo.**
> Ese es todo el trabajo de diseño.

### Lo único que falta en el modelo: `CRD.PGCE`

El cruce recorre **todos** los préstamos vigentes del jubilado y llama a `pagarConAportes` **una vez
por préstamo** (`cruzarContraPrestamos`, el `for` con `break` cuando se agota lo disponible). O sea
**N eventos por pago**, no uno. Por eso no alcanza una columna en `PGPC`: va tabla hija.

**Tabla `CRD.PGCE`** — verificada libre contra `src/main/java/com/saa/model/` y contra las 100 tablas
`CRD` ya mapeadas. **Confirmar contra `ALL_TABLES` antes de crearla.**

| Columna | Tipo | Qué |
|---|---|---|
| `PGCECDGO` | `NUMBER` PK | secuencia `CRD.SQ_PGCECDGO` |
| `PGPCCDGO` | `NUMBER` FK | el pago de pensión que originó el cruce |
| `EVPRCDGO` | `NUMBER` FK | el evento de préstamo a reversar |
| `PRSTCDGO` | `NUMBER` FK | el préstamo, para consultar sin joins |
| `PGCEVLOR` | `NUMBER(18,2)` | valor aplicado a **ese** préstamo |
| `PGCEESTD` | `NUMBER` | vigente / reversado |
| `PGCEFCRG` / `PGCEUSRG` | `TIMESTAMP` / `VARCHAR2(50)` | auditoría |

**Esto reemplaza al `PGPCVLCR` que proponía el §5-B4.** Una sola fuente de verdad: el total cruzado
es `SUM(PGCEVLOR)`, y así el historial puede mostrar además **contra qué préstamo** fue cada peso,
que es más de lo que el contrato prometía.

### Orden de operaciones de `POST /rest/pgpc/anular/{id}` — el orden importa

1. **Validar estado** ∈ {`REGISTRADA`, `EN_PAGO`}. Otro estado → 422.
2. **Si `EN_PAGO`, anular la orden en CXP** con `anularPago`. ⚠️ Mismo criterio que
   `anularDevolucion:850`: **si el archivo bancario ya se generó, se rechaza** y hay que esperar la
   respuesta del banco. No se anula algo que ya puede estar en camino.
3. **Reversar los eventos de cruce, del más nuevo al más viejo** (`anularOperacion` por cada fila de
   `PGCE`). Eso restaura cuotas, `saldoOtros`, el estado del préstamo **y devuelve los aportes
   consumidos** por el cruce.
4. **Contra-movimiento positivo del aporte del REMANENTE**, con el `generarContraMovimiento` que ya
   existe para `RECHAZADA`. ⛔ **Sólo del remanente**: el tramo cruzado ya lo devolvió el paso 3.
   Hacerlo de nuevo subiría el saldo del jubilado dos veces por la misma plata.
5. **Asiento de reversa del devengo** (decisión 3 del usuario).
6. `estado = ANULADA` y escribir `PGPCUSAN` / `PGPCFCAN` / `PGPCMTAN` — las tres columnas que hoy
   existen y nunca se escriben.

### ⛔ El límite honesto: LIFO. No se puede anular cualquier mes

`anularOperacion` **rechaza el reverso si hay operaciones posteriores vigentes sobre el mismo
préstamo** (`ProcesoPagoPrestamoServiceImpl:1237`). No es un defecto: reversar un pago viejo dejando
vivos los que vinieron después corrompería la cartera.

**Consecuencia operativa, y hay que decirla en la pantalla con palabras:**

- Si el jubilado pagó una cuota después del cruce, o si **la pensión del mes siguiente volvió a
  cruzar contra el mismo préstamo**, la anulación del mes viejo **va a fallar**.
- En la práctica: **se anula el último mes, no uno cualquiera del pasado.**

La pantalla no puede mostrar eso como un error crudo. Tiene que decir qué operación posterior lo
impide y qué habría que anular primero — el mensaje del motor ya nombra el evento que estorba.

## 7. Qué significa «moderna» acá, y qué no

**Sí:** tarjetas de KPI en vez de números sueltos en texto · estados como chip con **ícono y texto**,
nunca sólo color · el motivo del bloqueo en la propia fila · estados vacíos con mensaje y acción ·
confirmación que nombra la consecuencia antes de toda acción que mueve plata · foco visible.

**No:** animaciones, librerías nuevas, ni cambiar el tema de Angular Material del proyecto. La
pantalla tiene que seguir pareciéndose al resto del sistema.

⚠️ **Trampa de tabla ya conocida en este repositorio:** con `loading` arrancando en `true` la tabla
queda oculta en el primer render y el `ViewChild` del paginador o del sort queda `undefined` — el
listado se trunca en silencio y el paginador dice «0 of 0». Pasó en **siete** pantallas de `cnt`.
Asignar `paginator` y `sort` de forma idempotente cuando el contenedor ya es visible.
