# Un cheque para varios pagos — diseño

**Equipo:** `lap-saa-1` · **2026-09-01** · Módulos `tsr` · `pagos` · `cxp`
**Estado: implementado, sin compilar ni desplegar.** Las decisiones de negocio están tomadas (§2) y no se
re-preguntan.

---

## 1. El requerimiento y por qué hoy no se puede

Tesorería necesita **girar un solo cheque que cubra varios pagos** del mismo beneficiario. Hoy el
sistema fuerza un cheque por pago.

**El modelo ya lo admite.** La FK vive del lado del pago (`PGS.PGTR.PGTRDTCH` → `TSR.DTCH`), así que
N pagos pueden apuntar al mismo cheque sin cambiar una sola tabla.

**Lo que lo prohíbe es un índice**, y se creó a propósito:

```sql
-- tsr/sql/01-cheques-pago-programado.sql:42
CREATE UNIQUE INDEX PGS.UQ_PGTR_DTCH ON PGS.PGTR(PGTRDTCH);
```

Es la **red final contra la condición de carrera** de dos usuarios tomando el mismo cheque a la vez
(la primera línea de defensa es `em.refresh(cheque, PESSIMISTIC_WRITE)` en
`ChequeServiceImpl.tomarSiguienteConLock`).

> ⛔ **Quitar el índice sin más reintroduce esa carrera.** El §5 dice con qué se reemplaza. Este es
> el punto que hace que esto **no** sea un cambio de una línea.

---

## 2. Decisiones del usuario — 2026-09-01, tomadas, no re-preguntar

| # | Decisión | Elegido |
|---|---|---|
| **D1** | Cómo se agrupa | **Lo elige tesorería marcando en la bandeja.** Nada se agrupa solo |
| **D2** | Reverso de un pago del grupo | **Bloquear: se reversa el grupo entero** y se anula el cheque |
| **D3** | Asientos contables | **Uno por pago, como hoy.** No se fusiona la contabilización |

**D1 implica una validación, no solo una casilla:** un cheque físico se gira a **un** beneficiario,
así que el sistema tiene que **rechazar** un grupo con beneficiarios distintos. No es una
restricción del sistema, es lo que es un cheque.

**D3 es la decisión de menor riesgo** y conviene entender por qué: la contabilización está
construida y probada en cinco caminos distintos (`contabilizarPagoEgreso`, factura, anticipo, caja
chica, devolución). Fusionarlos en un asiento por cheque obligaría a reescribir los cinco **y sus
reversos**. Se mantienen N asientos, los N referencian el mismo número de cheque en su observación.

---

## 3. Los seis lugares que asumen 1 cheque = 1 pago

Barrido del agente de backend, verificado por el árbitro en los puntos que deciden el diseño.
**Ninguno rompe ruidoso: todos dan un número equivocado en silencio.**

| # | Dónde | Qué pasa si se comparte el cheque |
|---|---|---|
| **A** | `ChequeServiceImpl.asignarAPago:474-478` | **El peor.** `setValor` / `setTitular` / `setBeneficiario` **pisan** lo anterior en cada llamada. Llamándolo en loop, el cheque queda con el valor y el beneficiario **del último pago**, no la suma |
| **B** | `PagoProgramadoServiceImpl:1786-1788` + `ChequeServiceImpl.anularPorReverso:521-532` | Reversar un pago **anula el cheque incondicionalmente**. Los otros pagos quedan «pagados» con un cheque `ANULADO`, sin aviso |
| **C** | `PagoProgramadoServiceImpl`, los 5 `contabilizarPagoXXX` | Cada uno crea **un `MovimientoBanco`** con el valor de *su* pago. N pagos → N movimientos contra **una** línea real del extracto |
| **D** | `ChequeDaoServiceImpl.selectListado:154-167` | `left join PagoProgramado p on p.cheque = c` sin agrupar → devuelve **N filas del mismo cheque** |
| **E** | `ChequeServiceImpl.listar:591-649` | No agrupa por cheque → la pantalla muestra el cheque N veces, **cada fila con el valor total**. Si el frontend suma la columna, queda inflada ×N |
| **F** | `ChequeDaoServiceImpl.selectIdPagoByCheque:136-140` | Devuelve **un** id sin `ORDER BY`. Sigue bloqueando `anularChequeSuelto` (correcto), pero el mensaje nombra **un pago arbitrario** de los N |

**Indiferentes, verificados:** impresión y entrega de cheques (`marcarImpresos`/`marcarEntregados`
solo cambian estado), los `.jrxml` de `rep/tsr` y `rep/cxp` (ninguno cruza cheque↔pago), y el resto
de `ChequeRest`.

---

## 4. La conciliación bancaria — más leve de lo que parecía, y hay que decirlo

El barrido calificó el punto **C** como grave por los N `MovimientoBanco`. **Se rebaja, por dos
hechos verificados:**

1. **La conciliación no ancla en `MovimientoBanco`.** Desde el 2026-08-27 ancla en `DetalleAsiento`
   (`ConciliacionContableMatchServiceImpl:309,486`). `MovimientoBanco` cubre **1-5%** del movimiento
   real — es lo que ya obligó a que `validaDisponibilidad` usara saldo contable y no esa tabla.
2. Los N movimientos **no duplican el total**: cada uno lleva el valor de su pago y **suman** el
   valor del cheque. No hay inflación, hay fragmentación.

**Pero queda una limitación real, y se declara en vez de esconderla.** Un cheque agrupado deja de
ser un match 1:1 contra el extracto y pasa a depender de la búsqueda por subconjunto, que tiene un
tope duro:

```java
// ConciliacionContableMatchServiceImpl:83
private static final int MAX_CANDIDATOS_SUBCONJUNTO = 8;
```

⚠️ **Y el tope no cuenta los pagos del grupo: cuenta los candidatos de la ventana.** Si en la ventana
de monto y fecha hay más de 8 movimientos, `:561` **saltea la búsqueda por completo** — así que un
grupo de 3 pagos puede quedar sin auto-match por tráfico que no tiene nada que ver con él.

> **Consecuencia aceptada: un cheque agrupado puede requerir conciliación manual.** No es un
> defecto nuevo —el auto-match ya se comporta así con cualquier caso N:1— pero agrupar lo vuelve
> más frecuente. **Va en el aviso de la pantalla**, para que tesorería lo sepa al marcar.

**Aun así se emite UN solo `MovimientoBanco` por cheque** (§5, cambio 3): es barato, y conserva la
correspondencia natural con la única línea del extracto para la parte que sí usa esa tabla.

---

## 5. Los cambios

### 5.1 DDL — va ANTES del WAR

Reemplazar el índice único por uno normal. **El índice se sigue necesitando** (se consulta
`PGTRDTCH` para saber qué pagos respalda un cheque); lo que se retira es la unicidad.

Script: `tsr/sql/lap1-03-cheque-multiples-pagos.sql`, con bloques de control antes y después y el
reverso comentado.

### 5.2 La carrera del cheque, que es lo que protegía la unicidad

Al caer `UQ_PGTR_DTCH`, el lock pesimista de `tomarSiguienteConLock` queda como **única** defensa.
No alcanza: protege *tomar* el cheque, no *asignarlo*.

**La defensa se recupera sin base de datos, cambiando quién toma el cheque.** Se agrega
`asignarAGrupo(idCuenta, valorTotal, titular, beneficiario, idUsuario)`, que **toma UN cheque una
sola vez** para todo el grupo, en la misma transacción y con el mismo lock pesimista que hoy usa
`tomarSiguienteConLock`.

La clave está en el conteo: hoy la carrera existe porque el cheque se toma **N veces** (una por
pago) y el índice único atrapaba el choque al final. Tomándolo **una sola vez por grupo**, el lock
pesimista vuelve a ser suficiente — que era su función primaria; la unicidad de base era la red de
atrás, y es justamente la que estorba.

> **Descartado, y se anota para que no se reproponga:** una columna de grupo (`PGTRGRCH`) con un
> índice único compuesto `(PGTRDTCH, PGTRGRCH)`. **No protege nada**: no impide que dos grupos
> distintos tomen el mismo cheque, que es exactamente la carrera que hay que evitar. Parece una
> solución de base de datos y no lo es.

### 5.3 Cambios de código

| # | Dónde | Qué |
|---|---|---|
| 1 | `ChequeServiceImpl` | **Nuevo `asignarAGrupo(...)`**: toma un cheque con el lock actual, `setValor(SUMA)`, beneficiario del titular común. `asignarAPago` **queda como está** — el caso 1:1 no cambia |
| 2 | `PagoProgramadoServiceImpl.aprobar:1187-1205` | Si viene `agruparEnUnCheque=true`: **validar un solo beneficiario**, sumar, llamar `asignarAGrupo` **una vez**, y asignar ese mismo cheque a los N pagos. El loop de contabilización **no cambia** (D3) |
| 3 | los 5 `contabilizarPagoXXX` **+ `AplicacionPagoCxpServiceImpl.aplicarPagoTransferencia`** | Emitir el `MovimientoBanco` **una sola vez por cheque**, por el total. Los asientos siguen siendo N |

> ### ⛔ Corrección del 2026-09-01: eran SEIS lugares, no cinco
>
> El §3 de este documento y la primera versión de esta tabla decían «los 5 `contabilizarPagoXXX`».
> **Faltaba el más importante:** el pago de **factura** no pasa por ninguno de los cinco — pasa por
> `AplicacionPagoCxpServiceImpl.aplicarPagoTransferencia:568-641`, que tiene el mismo patrón y crea
> su propio `MovimientoBanco` por pago.
>
> **Y es probablemente el caso más frecuente de agrupación**: varias facturas del mismo proveedor
> pagadas con un cheque. Sin ese sexto lugar, el diseño habría dejado abierto exactamente el defecto
> que venía a cerrar, justo en el escenario que motivó el requerimiento.
>
> Lo encontró el agente de backend al implementar. **El barrido de impacto —el suyo y mi revisión—
> buscó dentro de `PagoProgramadoServiceImpl` y no salió de ahí**, porque los cinco caminos
> conocidos vivían todos en esa clase. La contabilización del pago de factura vive en otra, y ni la
> búsqueda ni la revisión la alcanzaron. *Un barrido acotado a la clase donde están los casos que uno
> ya conoce no encuentra el que está afuera.*
| 4 | reverso (`:1786-1788`, `anularPorReverso`) | **D2:** si el cheque respalda más de un pago, **rechazar** el reverso individual con un mensaje que liste los pagos del grupo, y ofrecer el reverso del grupo completo |
| 5 | `ChequeDaoServiceImpl.selectListado` + `ChequeServiceImpl.listar` | **Agrupar por cheque, de forma ADITIVA** — ver §5.4. Una fila por cheque, conservando los campos que ya existen |
| 6 | `selectIdPagoByCheque` | Pasa a `selectIdsPagoByCheque` devolviendo **lista**, con `ORDER BY`. Ajustar sus llamadores |

---

### 5.4 `GET /dtch/listar` — el cambio es ADITIVO, y esto corrige una contradicción de este documento

**Contradicción propia, detectada por el agente de backend al implementar:** el §6 decía «el único
endpoint que cambia es la aprobación», y el §5.3 punto 5 pedía agrupar el listado de cheques — que
es otro endpoint. **Las dos cosas no podían ser ciertas.**

Al ir a mirar quién consume `GET /dtch/listar` aparece por qué importaba: **cuatro pantallas**, no
una.

```
tsr/forms/pagos/consultas/cheques/consultas-cheques.component.ts
tsr/forms/pagos/procesos/generados/cheques-generados.component.ts
tsr/forms/pagos/procesos/impresos/cheques-impresos-proc.component.ts
tsr/forms/pagos/procesos/entregados/cheques-entregados-proc.component.ts
```

Y su DTO (`tsr/model/cheque-listado.ts`) tiene **seis campos en singular** por pago: `idPago`,
`tipoPago`, `referenciaPago`, `idDocumento`, `origenExterno`, `idOrigen`. `idDocumento` es además
el que usa el botón «Ver pago» para navegar.

**Decisión: el cambio es aditivo, no rompe.**

| | |
|---|---|
| **Se corrige** | una fila **por cheque**, no por pago. Eso arregla el defecto real: hoy el `left join` devuelve N filas del mismo cheque, cada una con el valor total, y una suma de esa columna queda inflada ×N |
| **Se conserva** | los seis campos singulares, poblados con los del **primer** pago del cheque |
| **Se agrega** | `cantidadPagos: number` y `pagos: [...]` con el detalle por pago |

**Por qué aditivo y no la forma nueva a secas:** las cuatro pantallas siguen funcionando sin
tocarlas, así que el orden de despliegue deja de importar para ellas. La única mejora que necesitan
—mostrar «N pagos» cuando `cantidadPagos > 1` en vez de la referencia del primero— se puede hacer
después sin urgencia y sin romper nada mientras tanto.

**El §6 queda corregido:** cambian **dos** endpoints. `/pgtr/aprobar` de forma incompatible —y por
eso el frontend va coordinado—, y `/dtch/listar` de forma compatible.

---

## 6. Contrato de API

**Cambian dos endpoints.** `POST /rest/pgtr/aprobar` de forma **incompatible** (por eso el frontend va coordinado), y `GET /dtch/listar` de forma **compatible/aditiva** — ver §5.4. El resto de rutas no se toca.

### `POST /rest/pgtr/aprobar`

Se agrega **una** clave opcional al cuerpo:

```json
{
  "idsPago": [101, 102, 103],
  "idCuentaBancaria": 4,
  "formaPago": 3,
  "fechaPago": "2026-09-01",
  "idUsuario": 7,
  "agruparEnUnCheque": true
}
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `agruparEnUnCheque` | boolean | no | Por defecto **`false`** — sin él, el comportamiento es exactamente el de hoy |

**Sólo tiene efecto con `formaPago = 3` (CHEQUE).** Con cualquier otra forma se ignora.

### Respuestas

**Éxito (200)** — el bloque `cheques` pasa a traer **una entrada por cheque**, no por pago:

```json
{
  "cheques": [
    { "numeroCheque": "0001234", "valor": 350.00, "pagos": [101, 102, 103], "asientos": ["A-551","A-552","A-553"] }
  ]
}
```

⚠️ **Cambio de forma para el frontend:** hoy cada entrada trae `pago` (singular) y un `asiento`.
Pasa a `pagos` y `asientos`, **listas**, también en el caso de un solo pago. Es un cambio que rompe
al consumidor actual y por eso está acá y no en el código.

**Beneficiarios distintos (409 Conflict)**

```json
{ "mensaje": "Error al aprobar los pagos: No se puede girar un solo cheque para pagos de beneficiarios distintos: ..." }
```

> ⚠️ **Corregido el 2026-09-01 contra el código real: el 409 NO trae `exito`.** Este contrato decía
> `{"exito": false, "mensaje": ...}`; el endpoint devuelve un `String` y `MensajeErrorJsonFilter` lo
> envuelve como **`{"mensaje": ...}`**, sin `exito`. **Se corrige el contrato, no el código:** es el
> estilo de error de toda la clase —el 400 y el 500 del mismo método también son `String`— y
> devolver un mapa sólo acá lo volvería incoherente.
>
> **Leer `error.mensaje`**, que es lo único presente en los tres códigos, y contar con que el
> mensaje viene **prefijado** por el método (`Error al aprobar los pagos: …`). El frontend ya lo
> hace así.

**Reverso de un pago agrupado (409 Conflict)** — D2:

```json
{ "mensaje": "Error al reversar el pago: El pago 102 comparte el cheque N° 0001234 con los pagos [101, 103]. Reverse el grupo completo." }
```

---

## 7. Riesgos declarados

1. **Conciliación manual más frecuente** para cheques agrupados (§4). Aceptado y avisado en pantalla.
2. **La unicidad de base desaparece.** La protección pasa a depender enteramente del lock pesimista
   y de que el cheque se tome **una sola vez por grupo** (§5.2). Es el punto que más cuidado pide en
   la revisión.
3. **Cheque ya impreso o entregado.** D2 lo cubre bloqueando el reverso individual, pero **no**
   impide agrupar pagos y después necesitar cambiar el grupo. No se resuelve en esta fase: una vez
   girado el cheque, el grupo es inmutable salvo reverso completo.
