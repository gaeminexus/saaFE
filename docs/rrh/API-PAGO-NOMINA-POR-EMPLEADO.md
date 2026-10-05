# Pago de la nómina por empleado, desde Tesorería — diseño y contrato

**Equipo:** `omen-saa-3` · **Escrito:** 2026-09-30 · **Módulos:** `rhh` (backend y pantalla) + un origen nuevo en `cxp` (aditivo)
**Espejo en el frontend:** `saaFE/docs/rrh/API-PAGO-NOMINA-POR-EMPLEADO.md` (idéntico)

## 1. Qué se pidió

> *«El pago debe funcionar como funcionan los pagos a jubilados en crd. En RRHH, al pagar los sueldos
> debe salir el detalle de cada empleado para aprobar (la generación del archivo debe ser desde tsr, no
> desde rrhh), y en los filtros de búsqueda debe existir el modo de filtrar sólo los pagos de sueldo
> para aprobar todos de una sola vez.»* — usuario, 2026-09-30

### Decisiones del usuario (2026-09-30), no re-litigar

| # | Pregunta | Decisión |
|---|---|---|
| N1 | ¿Un pago consolidado o uno por empleado? | **Uno por empleado** en la bandeja de Tesorería, como los jubilados |
| N2 | ¿Quién genera el archivo del banco? | **Tesorería**, con sus formateadores (Internacional, Pacífico). RRHH deja de generarlo |
| N3 | ¿Quién genera el asiento del pago? | **Tesorería, uno por empleado**, al confirmar cada pago. Así la conciliación bancaria ve cada transferencia |
| N4 | ¿Qué pasa si el banco rechaza a un empleado? | **Se contabiliza lo pagado, y el rechazado se corrige y se reenvía** desde RRHH, sólo ese pago |

## 2. Lo que ya existe y NO se toca

Verificado en el código el 2026-09-30:

- **La bandeja ya filtra por origen y permite seleccionar todos.** `porAprobar(idEmpresa, origenes, …)`
  (`PagoProgramadoServiceImpl:1314`) y el multiselect del frontend (`aprobacion-pagos.component.ts:92`,
  `toggleTodos` :260). Basta con que el origen nuevo tenga su etiqueta.
- **`aprobar` exige cuenta de destino por transferencia** (`tieneCuentaDestino` :1352, de `omen-saa-2`,
  `ad8b56ce`). La acepta con el beneficiario ocasional completo (banco, tipo, número), y así viajan estos pagos.
- **`generarLote` arma un solo archivo con N pagos** (:1815). Exige la misma cuenta de origen para todos.
- **Los formateadores** toman banco, tipo y número del beneficiario ocasional y el código BCE de
  `BEXTTRJT` (`CodigoBancoBeneficiarioResolver`). Deducen el tipo de identificación por la longitud:
  10 dígitos es cédula.
- **La respuesta del banco confirma o rechaza cada pago por su id** (`procesarRespuestaBanco` :1989).
  Al confirmar, contabiliza con el desglose.
- El tipo de cuenta del empleado (`CBEMTPCT`, rubro 199) y el de Tesorería (rubro 23) numeran igual:
  1 ahorro, 2 corriente (unificado por `e2-24`).

**Consecuencia: en Tesorería no hay que programar nada.** Solo se agrega el origen nuevo a los tres
mapas de `PagoProgramadoServiceImpl` (resolutor, ruta y etiqueta), un cambio aditivo en territorio común
con `omen-saa-2`, y su etiqueta en el frontend de cxp.

## 3. El circuito nuevo

```
RRHH  Generar orden ──> RDPG + un DRPG por cuenta ──> un PagoProgramado por DRPG (POR_APROBAR)
TSR   Aprobación de pagos: filtro «Sueldos», seleccionar todos, aprobar ──> Generación de archivo (Internacional)
TSR   Respuesta del banco ──> cada pago CONFIRMADO (asiento propio) o RECHAZADO (motivo)
RRHH  Actualizar pagos ──> DRPG PAGADO / RECHAZADO ──> orden CONFIRMADA o RECHAZADA_PARCIAL
RRHH  Reenviar (sólo un DRPG rechazado, con la cuenta corregida) ──> pago nuevo a la bandeja
```

### 3.1 Generar la orden

`GeneracionOrdenPagoServiceImpl.generar` sigue creando `RDPG` y los `DRPG` como hoy, incluido el reparto
del neto entre varias cuentas del empleado y el ajuste de valores no pagados. Lo que cambia es
`registraPagoEnBandeja` (:302-331):

- En lugar de **un** pago `RHH_NOMINA`, registra **un pago por cada fila DRPG** con el origen nuevo
  **`OrigenPagoExterno.RHH_NOMINA_EMPLEADO = "RHH_NOMINA_EMPLEADO"`** (19 caracteres).
  - `idOrigen` = `DRPGCDGO`. La guarda antiduplicados es por la pareja (origen, idOrigen).
  - `valor` = `DRPGVLOR`.
  - `BeneficiarioOcasional` desde el snapshot del DRPG: nombre, identificación, y el banco (el
    `BEXTCDGO` de la cuenta CBEM del DRPG), el tipo y el número.
  - `desglose` = una `LineaContablePago` con el producto de pago de código **`NOMINA`**, buscado por
    código y empresa como lo hace `PlanillaIessServiceImpl` (:542-560). Si no existe, error claro.
  - `observacion` = `Nómina <mes>/<año> - <apellidos nombres>`; `referencia` = número de la orden.
- **Idempotente:** un DRPG que ya tiene pago vigente no se vuelve a registrar.
- Los periodos **HISTÓRICOS** siguen sin pasar por la bandeja (:266-273), sin cambios.
- **Todo o nada:** la orden y sus N pagos nacen en la misma transacción. Si un pago no se puede
  registrar, no nace ninguno y el error dice qué empleado falló.

> ⛔ **Requisito de configuración (lo hace el contador, sin programar):** el grupo del producto de pago
> `NOMINA` apunta hoy a la cuenta **marcadora 9678** (`rhh/sql/15_INSERT_PRODUCTO_PAGO_NOMINA.sql`).
> Con N3 ese grupo decide el DEBE del asiento de cada pago: **tiene que apuntar a Sueldos por pagar**,
> la misma cuenta de la línea 50 de la plantilla de pago de nómina (`CFNMPLPG`). Se cambia en
> *CxP → Parametrización → Grupos de productos*. Hasta que se cambie, los asientos salen contra la 9678.

### 3.2 Estados

**DRPG (`DRPGESTD`)** — hoy sólo existe el 1 (ACTIVO), sin CHECK en la base (`rhh/sql/04`, línea 141).
Pasa a significar:

| Valor | Estado | Cuándo |
|---|---|---|
| 1 | PENDIENTE | Su pago está en Tesorería (el valor por defecto de hoy, compatible) |
| 2 | PAGADO | Su pago está CONFIRMADO |
| 3 | RECHAZADO | Su pago está RECHAZADO o ANULADO. `DRPGRCHZ = 'S'` y `DRPGMTRC` = el motivo |

Van como constantes nuevas en `com.saa.rubros.RhhEstadoDetalleOrdenPago`, sin catálogo (precedente
`USAP`). `DRPGRCHZ`/`DRPGMTRC` ya existen y hoy no las escribe nadie.

**RDPG (`RDPGESTD`, `RhhEstadoOrdenPago`)** — los valores ya existen:
- `GENERADA (1)`: con algún DRPG pendiente.
- `CONFIRMADA (3)`: todos los DRPG pagados.
- `RECHAZADA_PARCIAL (4)`: ninguno pendiente, pero alguno rechazado.
- Un reenvío pagado lleva la orden de `RECHAZADA_PARCIAL` a `CONFIRMADA`.

### 3.3 Actualizar pagos — `POST /rdpg/sincronizarPagos/{idOrden}`

No hay aviso de cxp a rhh: RRHH **consulta**, como `sincronizarPagos` de jubilados
(`PagoPensionComplementariaServiceImpl:2955`). Por cada DRPG PENDIENTE busca su último pago
(origen, idOrigen):

- CONFIRMADO → DRPG PAGADO, y **los efectos del empleado**: su valor no pagado recuperado pasa a PAGADO.
- RECHAZADO o ANULADO → DRPG RECHAZADO con el motivo del pago.
- Después recalcula el estado de la orden (§3.2). **La primera vez** que la orden queda sin pendientes,
  aplica **los efectos de la orden** que hoy hace `contabilizarPago`: periodo en PAGADO y descuento de
  cuotas y anticipos. **Salvo el asiento consolidado, que ya no se genera** (N3).
- Cada DRPG se sincroniza en su propia transacción. Un error en uno no frena al resto: se reporta.
- La lista de órdenes sincroniza las GENERADA y las RECHAZADA_PARCIAL antes de devolver, sin timer.

> **El agente de backend tiene que confirmar tres puntos del código antes de implementar, y
> reportarlos:**
> (a) Si `cierraValoresNoPagadosRecuperados` y `descuentaCuotasDelPeriodo` se pueden separar por
> empleado sin cambiar su resultado para quien sí cobró.
> (b) Si el **Egreso consolidado** con producto NOMINA (`GeneracionOrdenPagoServiceImpl:1189`) duplica el
> movimiento bancario que Tesorería ya crea por cada pago. Si lo duplica, deja de crearse para las
> órdenes nuevas.
> (c) Si el periodo puede quedar PAGADO con empleados rechazados pendientes de reenvío. Hoy la regla
> «no se cierra un periodo sin pagarlo» (`f6f0826f`) lo miraría. Si no se puede, dilo y no lo fuerces.

### 3.4 Reenviar un rechazado — `POST /drpg/reenviar/{idDetalle}` `{idUsuario}`

- Sólo un DRPG en RECHAZADO.
- Vuelve a leer la cuenta activa **actual** del empleado (ya corregida en su ficha), actualiza el
  snapshot del DRPG (banco, tipo, número), limpia `DRPGRCHZ`/`DRPGMTRC` y registra un pago nuevo con
  el mismo `idOrigen`. La guarda lo permite porque el anterior está RECHAZADO o ANULADO. El DRPG pasa
  a PENDIENTE.
- Si el empleado tenía el neto repartido entre varias cuentas, reenvía sólo esa fila con su valor.
  No se re-reparte.

### 3.5 Órdenes que ya existen

Una orden con un pago **consolidado** `RHH_NOMINA` vigente (como `OP-202609`, aprobada por débito
automático el 2026-09-28) **sigue por el camino viejo**: `confirmar` + `contabilizarPago` como hoy. El
camino nuevo aplica a las órdenes que nacen sin ese pago. La orden se clasifica mirando si tiene un
pago `RHH_NOMINA` por (origen, idOrigen = RDPG).

### 3.6 Lo que se retira

- `generarArchivoBancario` y el botón «Descargar archivo» de RRHH, **sólo para las órdenes nuevas**.
  Las viejas lo conservan. El formato `RHH.FMBN` (`e3-04`) queda sin uso en el circuito nuevo.
- `confirmar(idOrden, fecha)` deja de aplicar a las órdenes nuevas. Para ellas responde un error claro:
  «Esta orden se paga por empleado: use Actualizar pagos».

## 4. Endpoints — URL real `/SaaBE/rest/...`

| Método y ruta | Cuerpo | Respuesta 200 | Notas |
|---|---|---|---|
| `GET /rdpg/getAll`, `POST /rdpg/selectByCriteria`, `GET /rdpg/getId/{id}` | sin cambios | `OrdenPagoNomina` con el **transitorio nuevo `pagoPorEmpleado` (boolean)** | **Agregado 2026-10-05: el frontend lo pidió porque el contrato no le daba cómo distinguir una orden nueva de una vieja.** `pagoPorEmpleado = true` si la orden **no** tiene un pago consolidado `RHH_NOMINA` (en cualquier estado) por `(origen, idOrigen = RDPG)`; `false` si lo tiene (camino viejo, §3.5). Con `true` la pantalla muestra «Actualizar pagos»; con `false`, «Descargar archivo» y «Confirmar» como hoy |
| `POST /rdpg/generar` | sin cambios | sin cambios | Ahora registra un pago por DRPG |
| `POST /rdpg/sincronizarPagos/{idOrden}` | — | `OrdenPagoNomina` | §3.3 |
| `GET /drpg/selectByOrden/{idOrden}` | — | `DetalleOrdenPagoNomina[]` con `estado`, `rechazado`, `motivoRechazo` y **`idPago`/`estadoPago` transitorios** (el último pago de ese DRPG) | Ver el nombre real del endpoint de detalle que ya usa `verDetalle` y reusarlo si existe |
| `POST /drpg/reenviar/{idDetalle}` | `{idUsuario}` | `DetalleOrdenPagoNomina` | §3.4 |

Errores: 500 con el texto del `IncomeException` (estilo de la casa, `mensajeDeError` en el frontend).

## 5. Pantalla de RRHH — Órdenes de pago

- Para las órdenes nuevas, en lugar de «Descargar archivo» y «Confirmar»: **«Actualizar pagos»**.
- El detalle muestra por empleado: estado del pago (Pendiente / Pagado / Rechazado), el motivo del
  rechazo y el botón **«Reenviar»** en los rechazados, con confirmación y el aviso de corregir primero
  la cuenta en la ficha.
- La pastilla de la orden: Generada / Confirmada / Pagada parcialmente (`RECHAZADA_PARCIAL`).
- Las órdenes viejas se ven y se operan igual que hoy.

**En Tesorería:** sólo la etiqueta `RHH_NOMINA_EMPLEADO: 'Sueldos'` en `ORIGEN_PAGO_LABELS`
(`cxp/model/pago-programado.ts:278`). Así aparece en el filtro de la bandeja y se aprueban todos juntos.

## 6. Riesgos conocidos

- **Aprobar es todo o nada** (`aprobar` es una sola transacción). Un empleado sin cuenta completa
  bloquea el lote por transferencia. Como `generar` exige la cuenta de cada empleado, no debería pasar.
- **La cuenta de origen del lote** la elige Tesorería al aprobar. La cuenta que se eligió al generar
  la orden (`RDPG.CTBNCDGO`) queda como referencia y ya no decide el asiento.
- **Un pasaporte de 10 caracteres saldría como cédula** en el archivo (el tipo se deduce por longitud).
  No hay casos conocidos en la nómina de ASOPREP.
- `PagoProgramadoServiceImpl` y `OrigenPagoExterno` tienen cambios sin commitear del frente de
  liquidaciones anteriores (esperan el DDL `e3-05`). Este frente se implementa **encima** de esos
  cambios y se commitea después o junto con ellos.
