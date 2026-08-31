# Plan — cerrar la contabilidad de TODOS los procesos de crédito

**Fecha:** 2026-08-31 · **Módulo:** CRD · Escrito por el árbitro `saabe-4b`
**Decisión del usuario (2026-08-31):** *"Debemos cerrar todo con asientos. Ningún proceso puede
quedar sin asientos."*

---

## 0. Por qué esto es un proyecto y no dos parches

Veníamos cerrando agujeros de a uno, según aparecían. El usuario lo convirtió en un objetivo
explícito: **ningún proceso sin asiento.** Eso cambia el método — hace falta un **inventario
cerrado**, no una lista de pendientes que crece cuando alguien tropieza con algo.

**Y hay una fecha límite implícita: el día que se encienda el flag** de contabilidad de CRD
(rubro 237, hoy en 0). Todo lo que quede fuera para entonces empieza a producir contabilidad
incompleta en silencio.

---

## 1. Inventario — verificado en código el 2026-08-31

### ✅ Ya contabilizan

| Proceso | Dónde |
|---|---|
| Cierre / apertura de cartera | `CierreCarteraServiceImpl` — plantillas 1, 17, 33 |
| Cobro Petro (transitorio, reparto, aplicación) | `CobroPetroContableServiceImpl` — plantillas 19, 20, 21 |
| Cobros por el circuito CBCR (`ASN1` + `ASN2`) | `CobroCreditoServiceImpl` |
| Condonación (lo condonado y lo pagado, con y sin depósito) | `AcuerdoCondonacionServiceImpl` |
| *(helper compartido de líneas)* | `ContabilizacionIndividualCreditoServiceImpl` |

### ❌ NO contabilizan — lo que hay que cerrar

| # | Proceso | Servicio | Uso real | Asiento levantado |
|---|---|---|---|---|
| **1** | **Cruce de valores / pago con aportes** | `ProcesoPagoPrestamoServiceImpl.pagarConAportes` | **diario** | §3.5 |
| **2** | **Devolución de aportes** | `DevolucionAporteServiceImpl` | frecuente, **sale dinero** | §3.7 + plantillas 27/28, cuenta `2.3.01.15.04` |
| **3** | Precancelación 100% aportes (endpoint directo) | `ProcesoPagoPrestamoServiceImpl.precancelar` | poco | §3.5 (es un cruce) |
| **4** | Re-bandeo tras abono a capital | `AbonoCapitalPrestamoServiceImpl` | con cada abono | §3.6 asiento 2 |
| **5** | Cobro en exceso → devolución al partícipe | carga Petro / novedades | ocasional | §3.7 opción ① |

> ## ⛔ CORRECCIÓN 2026-08-31 — «los cinco tienen su asiento levantado» es FALSO para el #2
>
> Lo encontró el agente de backend leyendo `DevolucionAporteServiceImpl` completo, y lo verifiqué:
>
> **§3.7 del levantamiento se titula «Cobro en exceso».** Es el proceso **#5**, no el #2. La cuenta
> `2.3.01.15.04` (`230104` en la pizarra) se llama literalmente *"DEVOLUCION POR COBRO EN EXCESO
> PARTICIPES"*, y las plantillas 27/28 aparecen ahí como *"plantillas actuales relacionadas"* al
> cobro en exceso. **Las dos filas de la tabla de arriba apuntaban a la misma sección para dos
> procesos distintos.**
>
> **El §3 del levantamiento tiene ocho subsecciones y ninguna es la devolución de aportes**
> (jubilación, cartera, Petro, pagos manuales, cruce, abono, cobro en exceso, otorgamiento). Las
> pizarras nunca la cubrieron. **El asiento del #2 NO está levantado: hay que diseñarlo, y eso es
> una decisión del usuario, no una implementación.**
>
> Lo que sí está levantado y no cambia: #1, #3, #4 y #5.

**Cuatro de los cinco tienen su asiento levantado** (#1, #3, #4, #5): esos no se diseñan, se
implementan. **El #2 no** — ver el recuadro.

### ⚠️ La causa común de 1, 3 y 4

`ContabilidadPrestamoNoOpImpl` — **los cinco hooks del motor de pagos devuelven `null`**, sin
condición, desde el 2026-08-14. `contabilizarPagoCuota`, `contabilizarPagoConAportes`,
`contabilizarAbonoCapital`, `contabilizarPrecancelacion`, `contabilizarReverso`.

**La costura está bien puesta y nunca se llenó.**

---

## 2. ⛔ La trampa que hace peligroso el camino obvio

El camino obvio es implementar `ContabilidadPrestamoServiceImpl` y llenar los cinco hooks. **No lo
hagas sin resolver esto primero:**

Después del cutover, **todo cobro con dinero entrante pasa por `CBCR`**, y `procesarCobro` llama
por dentro a `pagarCuota()` / `precancelar()` / `abonarCapital()` — **que a su vez llaman a los
hooks**. Si los hooks generan asiento, cada cobro procesado por CBCR va a producir **dos asientos
por la misma operación**.

**Y los dos van a cuadrar**, así que no habría ningún error. Se descubriría conciliando.

**La regla:** el hook y `CBCRASN2` son **alternativas, no complementos**. Quien implemente los
hooks tiene que **excluir las operaciones que vengan de `procesarCobro`**. Ya está anotado en el
javadoc de los dos lados.

**Por eso el orden de abajo empieza por lo que NO pasa por CBCR.**

---

## 3. Orden de trabajo

### Fase 0 — `idEmpresa` en las solicitudes del motor · **prerrequisito de todo lo demás**

**Decisión del usuario, 2026-08-31**, contrato congelado en `API-EMPRESA-CONTABLE-CRD.md`
(espejado en `saaFE/docs/crd/`): el `idEmpresa` **viaja con la solicitud**, lo manda el frontend
desde la empresa de la sesión, y es **obligatorio** en los 7 DTOs que llegan al motor de pagos y
al registro de aportes.

Ninguna de las cuatro fases de abajo puede generar un asiento sin esto: todas necesitan
`resolverPlantillaAplicacion(idEmpresa)` y `lineaBandaCapital(..., idEmpresa, ...)`.

**La regla que no se rompe:** cuando la llamada nace dentro de `CobroCreditoServiceImpl`, la
empresa la pone **ese** servicio con la que ya derivó de la cuenta bancaria (`:1250`), **nunca la
que mandó el cliente**. Así el asiento transitorio, el definitivo y el del hook salen los tres de
la misma empresa, derivada una sola vez.

⚠️ **Backend y frontend salen juntos.** El campo es obligatorio desde el día uno, y el circuito
de cobros está vivo en producción: un WAR con la validación y sin las pantallas actualizadas rompe
los cobros manuales.

### Fase 1 — el cruce de valores (#1) · **el único sin riesgo de duplicar**

**#1 cruce de valores**, asiento del §3.5: **D cuentas de aporte del socio, diferenciadas por
tipo → H bandas de capital, intereses y seguros**.

**El método ya existe**: `ContabilizacionIndividualCreditoService.lineasCruceAportesConsumidos`,
escrito para `CBCRASN2` y **devolviendo líneas en vez de guardarlas**, justamente para poder
reusarse acá. **Es enchufar dos llamadas**, no escribir un asiento.

> **Verificado el 2026-08-31 — el plan original juntaba #1 y #3 en esta fase, y eso era un
> error.** `pagarConAportes` es el **único** de los cinco puntos de entrada del motor que
> `CobroCreditoServiceImpl` **nunca** llama por dentro (0 referencias). `precancelar`, en cambio,
> **sí** se llama desde `procesarCobro` (`:694`) — o sea que el **#3 tiene de lleno la trampa del
> §2** y no pertenece a esta fase.
>
> Consecuencia práctica: en la fase 1 se implementa `ContabilidadPrestamoServiceImpl` llenando
> **solamente** `contabilizarPagoConAportes`. Los otros cuatro hooks siguen devolviendo `null`,
> con un comentario que diga por qué. Es la única forma de encender un hook sin necesitar todavía
> el discriminador de origen.

### Fase 1bis — precancelación 100% aportes (#3) · **necesita el discriminador de origen**

Mismo asiento del §3.5, pero **`precancelar` se llama desde `procesarCobro`**. Antes de llenar
`contabilizarPrecancelacion` hay que resolver el §2: cómo distingue el hook una llamada directa
del endpoint de una que viene de CBCR, que ya genera `CBCRASN2` por la misma plata.

**Ese discriminador es una decisión de diseño del árbitro, no del agente**, y lo mismo vale para
`contabilizarPagoCuota`, `contabilizarAbonoCapital` y `contabilizarReverso`. **Nadie llena esos
cuatro hooks hasta que esté definido.**

> ## Decisión del árbitro (2026-08-31) — `EVPR.EVPRNMAS` guarda la **PK**, no el correlativo
>
> `EventoPrestamo.numeroAsiento` (`EVPRNMAS`) es un `Long` suelto, y el nombre sugiere el
> correlativo `ASNTNMRO`. **Guarda `ASNTCDGO`, la PK.** Verificado: `AsientoService.anulaAsiento`
> recibe el **id**, no el número, y toda la mecánica de reverso del sistema está construida sobre
> la PK. Guardar ahí el correlativo obligaría a resolver empresa + período para reversar, y el
> período de la reversión puede no ser el del asiento original.
>
> **No se migra la columna ni se renombra** — sería DDL más migración sobre una tabla con historia,
> por cero ganancia funcional. **Lo que sí se hace es dejarlo dicho en el javadoc**, para que el
> próximo que lo lea no construya un reverso sobre la acepción equivocada.
>
> Queda anotado, sin agendar: `CobroCredito` referencia el asiento como **entidad**
> (`asientoTransitorio`/`asientoDefinitivo`) mientras `EventoPrestamo` usa un `Long` suelto. Es una
> inconsistencia real de modelado, no un defecto.

### Fase 2 — devolución de aportes (#2) · ⛔ **BLOQUEADA, espera decisión del usuario**

Sale dinero y hoy no queda registro contable. Pero **no es "implementar un asiento levantado"**:
el asiento no existe en el levantamiento (ver el recuadro del §1), y además hay un mecanismo
contable **ya construido y hoy apagado** con el que colisiona.

#### El mecanismo que ya existe, y por qué colisiona

Verificado en código el 2026-08-31:

1. `registrarDevolucion` ya le manda a **CXP** un desglose contable (`List<LineaContablePago>`,
   con `idProductoPago` por tipo de aporte) vía `pagoProgramadoService.registrarPagoDeOrigenExterno`.
2. Ese envío está gobernado por **`boolean contabiliza = tiposSinProducto.isEmpty()`**
   (`DevolucionAporteServiceImpl:307`). Cuando el desglose está completo, **CXP arma su propio
   asiento** —D cuenta genérica del producto → H Banco— y `aplicarPagado:1003` lo copia a
   `DevolucionAporte.numeroAsiento` (`DVAPNMAS`).
3. Hoy está apagado porque `CRD.TPAP.TPAPPRDP` (tipo de aporte → producto de pago) **no está
   cargado** — se dejó opcional a propósito el 2026-08-24.

> ⚠️ **`TPAPPRDP` es parametrización pura: nadie necesita tocar código para encenderlo.** El día
> que alguien lo cargue, el asiento de CXP se enciende solo. Si para entonces CRD también acredita
> Banco por la misma transferencia, **Banco queda acreditado dos veces por un solo pago — y los dos
> asientos cuadran**, así que nada lo detecta.

#### Y `DVAPNMAS` ya está tomado

Un asiento propio de CRD no tiene dónde guardarse: `aplicarPagado` sobrescribe `DVAPNMAS` con el
asiento de CXP y la referencia se pierde, así que no se podría reversar nunca. **Hace falta una
columna nueva**, `CRD.DVAP.DVAPNMRC NUMBER` (asiento de reclasificación), separada de `DVAPNMAS`.

#### Lo que el usuario tiene que decidir

**Quién contabiliza la devolución de aportes: CXP, CRD, o cada uno una mitad.** Es una decisión de
negocio con consecuencias contables, no una elección técnica. Hasta que esté, no se escribe el
asiento — y el DDL de `DVAPNMRC` depende de cuál gane.

⚠️ Lo que **no** cambia: su reverso y su circuito de aprobación de tesorería ya existen. El punto
único de reverso es `generarContraMovimientos` (`:1022`), el único que llaman tanto
`anularDevolucion` como `sincronizarDevolucion`. El asiento se cuelga de ahí, no se rehace el flujo.

### Fase 3 — re-bandeo del abono (#4)

Diferido explícitamente al construir `CBCRASN2`, y anotado en su javadoc. Diferencias **netas por
banda**, no bruto contra bruto (§3.6, decisión C2).

**Su omisión es menos grave que las otras y conviene saber por qué:** el descuadre de bandas es
**transitorio** — lo corrige el cierre mensual. Las demás omisiones son permanentes.

### Fase 4 — cobro en exceso devuelto (#5)

§3.7 opción ①. Es hermano del excedente a aportes (opción ③) que ya está en construcción:
conviene hacerlo **después**, reusando lo que ese deje montado.

---

## 4. Reglas que aplican a las cuatro fases

1. **Ningún asiento se diseña: están todos levantados** en
   `LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md`, con las cuentas resueltas contra `CNT.PLNN`.
2. **Las cuentas salen de la plantilla 21** por su `aux1` semántico — es la única renumerada y
   probada. **Nunca escritas en el código.**
3. **Un solo lugar por cuenta.** Si dos procesos necesitan la misma línea, la resuelve el mismo
   helper. Se aplicó ya tres veces —transitoria, interés, empresa— y las tres veces evitó una
   divergencia futura.
4. **Gate de `contabilidadActiva()`** en todos. Apagado: el proceso corre igual, sin asiento, y lo
   informa.
5. **Si falta una línea en la plantilla, fallar con `IncomeException` clara.** Nunca un asiento
   incompleto.
6. **Verificar el cuadre contra el monto de la operación**, no solo que D=H. **Un asiento mal
   clasificado también cuadra** — es la lección de `CBCRASN2` §7.
7. **Cada asiento nuevo necesita su reverso.** Si el proceso se anula, el asiento se reversa.

---

## 5. Lo que hay que verificar antes de encender el flag

Cuando las cuatro fases estén, **antes de poner el rubro 237 en 1**:

1. **La cuenta transitoria queda en cero** por cada cobro: `ASN2` cierra exactamente lo que abrió
   `ASN1`.
2. **La línea de gasto de condonación existe** en la plantilla 25 (cuenta 9743, ya corrida).
3. **La plantilla 21 tiene todas las líneas** que necesitan los procesos nuevos, por empresa.
4. **Ningún proceso de la tabla §1 quedó fuera.**
5. **Encenderlo un día de baja actividad**, no un viernes: la primera corrida real con
   contabilidad activa es cuando aparecen los defectos que ninguna prueba encontró.
