# API — Los dos procesos mensuales de jubilados: seguro al inicio, pensiones al final

**Fecha:** 2026-09-07 · **Equipo:** `omen-saa-1` (`omen1`) · **Estado:** contrato cerrado, sin implementar.

Pedido del usuario: *«el seguro médico se paga a inicios de mes y al final del mes se pagan las
pensiones, cruzándolos con préstamos y generando el pago en el banco. El sistema debe permitir
realizar estos dos procesos dentro del mes y dar seguimiento a los mismos»*.

---

## 1. Lo que hay hoy, verificado contra el código

**Hoy es UN solo proceso.** `POST /rest/pgpc/generarPagosDelMes` →
`PagoPensionComplementariaServiceImpl.generarPagosDelMes:701`:

1. Cinco guards de precondición (cuentas, productos, plantillas).
2. Recorre el padrón de jubilados. Por cada uno calcula **pensión y seguro juntos**, cruza con
   préstamos, y genera **una orden individual de pensión** por el remanente.
3. Acumula `totalSeguroGeneral` y al final, **fuera del bucle**, genera **UNA sola orden agregada
   al proveedor** del seguro (`:858` → `generarOrdenPagoProveedorSeguro`).

**`CRD.PGPC` es una fila por jubilado y por período** — con `PGPCVLPN` (pensión), `PGPCVLSG`
(seguro), `PGPCESTD` y las FK a las órdenes. **No existe ninguna cabecera de corrida:** no hay
dónde decir «el seguro de agosto ya se corrió, las pensiones todavía no».

### ⛔ Lo que hace que esto NO sea partir un método en dos

Decisión del usuario del 2026-09-04, textual: *«el seguro médico es un valor que debe bajar también
de la pensión […] pero ese valor no debe ir incluido en el valor a pagar al partícipe, sino debe
salir como un pago aparte al TITULAR con un RUC»*.

O sea: **el seguro se descuenta de la pensión del jubilado, pero se le paga al proveedor.** Separar
los procesos en el tiempo **crea una dependencia**: la corrida de pensiones de fin de mes tiene que
saber qué seguro se pagó al inicio para descontarlo, y descontar **exactamente** eso.

---

## 2. Las cuatro decisiones del usuario (2026-09-07)

| # | Decisión | Consecuencia |
|---|---|---|
| **D1** | **El valor del seguro se fija al inicio** y la corrida de pensiones lo descuenta **tal cual, sin recalcular** | Es lo único que garantiza que lo descontado al jubilado y lo pagado al proveedor sean el **mismo número** |
| **D2** | Correr pensiones sin el seguro del mes **se bloquea** con un mensaje claro | Evita pagar una pensión sin descontar el seguro — plata que después no se recupera |
| **D3** | El seguimiento vive en una **cabecera de corrida por período**, tabla nueva | Es lo que permite bloquear (D2), reintentar y auditar quién corrió qué y cuándo |
| **D4** | **Cada proceso usa el padrón de su propia fecha** | Puede haber alguien con seguro pagado y sin pensión, o al revés. Es esperado, y hay que **mostrarlo**, no esconderlo |

---

## 3. La tabla nueva — `CRD.CRJB`

**Código reservado el 2026-09-07.** Verificado libre contra las más de 400 tablas del modelo y
contra el §3 del `REGISTRO-RESERVAS-EQUIPOS.md`. Una fila por **empresa + año + mes**.

| Columna | Tipo | Qué guarda |
|---|---|---|
| `CRJBCDGO` | `NUMBER` PK, IDENTITY | Código |
| `PJRQCDGO` | `NUMBER` | Empresa (jerarquía). FK a la que ya usan `ASNT` y `PLNN` |
| `CRJBANNO` / `CRJBMESS` | `NUMBER` | Período |
| `CRJBESSG` | `NUMBER` | Estado del proceso de **seguro**: 0 pendiente · 1 generado |
| `CRJBFCSG` | `TIMESTAMP` | Cuándo se generó el seguro |
| `CRJBUSSG` | `VARCHAR2(50)` | Quién |
| `CRJBVLSG` | `NUMBER(18,2)` | Total pagado al proveedor |
| `CRJBIDSG` | `NUMBER` | Id de la orden de pago al proveedor |
| `CRJBCTSG` | `NUMBER` | Cuántos jubilados entraron en el seguro |
| `CRJBESPN` | `NUMBER` | Estado del proceso de **pensiones**: 0 pendiente · 1 generado |
| `CRJBFCPN` / `CRJBUSPN` | `TIMESTAMP` / `VARCHAR2(50)` | Cuándo y quién |
| `CRJBVLPN` | `NUMBER(18,2)` | Total de órdenes de pensión generadas |
| `CRJBVLCR` | `NUMBER(18,2)` | Total cruzado a préstamos |
| `CRJBCTPN` | `NUMBER` | Cuántos jubilados entraron en la pensión |

**Índice único por `(PJRQCDGO, CRJBANNO, CRJBMESS)`** — un período, una corrida. Es lo que hace
que el proceso sea idempotente por construcción y no por convención.

> ⛔ **El DDL va ANTES del WAR.** Toda columna `@Column` entra en el `SELECT` que genera Hibernate:
> si la entidad sube sin la tabla, revienta cualquier lectura. Es el incidente de `CBCRASRP` del
> 2026-08-31.

---

## 4. Los dos endpoints

### 4.1 `POST /rest/pgpc/seguro/generar` — inicio de mes

Cuerpo: `{ idEmpresa, anio, mes, usuario, idUsuario }` (el mismo que hoy recibe `generarPagosDelMes`).

> ⚠️ **Nota 2026-09-22:** `PagoPensionComplementariaRest` declaraba `idEmpresa`/`anio`/`mes`/`usuario`
> como `@QueryParam` en los dos endpoints de este §4 (`/seguro/generar` y `/pensiones/generar`),
> contra este mismo contrato, que siempre pidió el cuerpo. Bloqueó en producción el primer día que
> alguien corrió el seguro médico de verdad («Debe indicar idEmpresa», `Periodo: null/null`).
> **Corregido:** los dos endpoints ahora reciben el cuerpo (forma canónica, la de arriba) **y**
> siguen aceptando los mismos cuatro valores por `@QueryParam`, por compatibilidad con quien ya
> los llamara así. **El cuerpo tiene precedencia** cuando llegan los dos. `generarPagosDelMes`
> (el endpoint viejo, deprecado) no se tocó: sigue siendo sólo `@QueryParam`.
>
> ⚠️ **Límite de esa compatibilidad, anotado por el árbitro y no medido contra el servidor:** los
> dos métodos llevan ahora `@Consumes(APPLICATION_JSON)`, que hace falta para que RESTEasy
> deserialice el cuerpo. Como contrapartida, **una llamada sin `Content-Type: application/json`
> puede responder 415** antes de mirar los query params. Es decir que el respaldo por query params
> sirve para un cliente que igual manda JSON, no para un `curl` pelado. Quien necesite disparar
> estos procesos a mano —por ejemplo mientras se espera un WAR— debe mandar **igualmente**
> `Content-Type: application/json` y un cuerpo, aunque sea `{}`. **No afecta al frontend**, que
> siempre manda JSON.
>
> ⭐ **Por qué este defecto vivió sin que nadie lo viera:** el frente figuraba terminado hacía
> días, «esperando WAR». Las dos puntas compilaban y ninguna se había ejecutado nunca contra la
> otra. **Compilar en los dos lados no prueba que se entiendan** — el mismo riesgo que sigue
> abierto en P22 (calificación de riesgo: código listo de las dos puntas, nunca probado).

1. Guards de precondición **del seguro solamente**: `verificarCuentaProductoPagoSeguroMedico`,
   el proveedor y su cuenta bancaria. **No** los de pensión.
2. Si `CRJB` de ese período ya tiene `CRJBESSG = 1` → `IncomeException`:
   `El seguro médico de {mes}/{anio} ya se generó el {fecha} por {usuario}. No se puede generar dos veces.`
3. Recorre el **padrón vigente a la fecha de ejecución** (D4). Por cada jubilado calcula su seguro
   y **crea o completa su fila de `CRD.PGPC`** del período escribiendo `PGPCVLSG`.
4. Genera **UNA orden agregada al proveedor** por el total — reusar
   `generarOrdenPagoProveedorSeguro` tal cual, **no reescribirla**.
5. Sella la cabecera: `CRJBESSG = 1`, fecha, usuario, total, id de la orden, conteo.

### 4.2 `POST /rest/pgpc/pensiones/generar` — fin de mes

Mismo cuerpo. Es el `generarPagosDelMes` de hoy **menos** el seguro, **más** la guarda.

1. **⛔ Guard D2, lo primero de todo:** si `CRJB` del período no existe o tiene `CRJBESSG = 0` →
   `IncomeException`:
   `No se puede generar las pensiones de {mes}/{anio}: el seguro médico de ese mes todavía no se ha generado. Ejecute primero el proceso de seguro médico.`
2. Si `CRJBESPN = 1` → `IncomeException` con el mismo formato que 4.1.
3. Los guards de precondición de pensión que ya existen, tal cual.
4. Recorre el **padrón vigente a fin de mes** (D4). Por cada jubilado:
   - **NO recalcula el seguro.** Lee `PGPCVLSG` de la fila del período (D1) y lo descuenta.
   - **Si el jubilado no tiene fila de seguro** (entró después del inicio de mes): su pensión se
     genera **sin descuento de seguro**, y entra en el resumen como
     `SIN_SEGURO_DEL_PERIODO` — **nunca se le inventa un seguro ni se le bloquea el pago**.
   - Cruza con préstamos y genera la orden individual, como hoy.
5. **NO genera ninguna orden al proveedor.** Eso ya lo hizo el proceso 4.1.
6. Sella la cabecera: `CRJBESPN = 1`, fecha, usuario, totales, conteo.

### 4.3 `GET /rest/pgpc/corrida/{anio}/{mes}?idEmpresa=` — seguimiento

Devuelve la cabecera del período, o los dos estados en `0` si no existe todavía. **200 con estados
en cero, nunca 404**: «este mes no se corrió nada» es una respuesta válida.

```json
{
  "anio": 2026, "mes": 9, "idEmpresa": 1236,
  "seguro":   { "estado": 1, "nombreEstado": "GENERADO", "fecha": "2026-09-01T08:12:04",
                "usuario": "mlopez", "total": 4820.00, "jubilados": 178, "idOrdenPago": 9931 },
  "pensiones":{ "estado": 0, "nombreEstado": "PENDIENTE", "fecha": null,
                "usuario": null, "total": null, "cruzadoAPrestamos": null, "jubilados": null },
  "puedeGenerarSeguro": false,
  "puedeGenerarPensiones": true,
  "conSeguroSinPension": 0,
  "conPensionSinSeguro": 0
}
```

- `nombreEstado` lo resuelve el **backend**. El frontend no traduce números.
- `puedeGenerarSeguro` / `puedeGenerarPensiones` los calcula el backend con **la misma regla** que
  aplican los endpoints. Si la pantalla la reimplementa, se van a desincronizar.
- `conSeguroSinPension` / `conPensionSinSeguro` son la consecuencia visible de D4. Son
  **información, no error**.

---

## 5. Lo que NO cambia

- **`generarOrdenPagoProveedorSeguro` no se toca.** El proceso de seguro la llama tal cual.
- **El cálculo de la pensión, el cruce con préstamos y la contabilidad no cambian.** Se mueve
  *cuándo* corre cada cosa, no *qué* calcula.
- **`/previsualizarCorrida` se mantiene**, y debería poder previsualizar cada proceso por separado.
- **`CRD.PGPC` no cambia de estructura**: `PGPCVLSG` ya existe. Lo que cambia es **quién la escribe
  primero** — antes la fila nacía completa en la corrida única, ahora nace en el proceso de seguro
  y se completa en el de pensiones.

---

## 6. ⛔ Lo que hay que mirar dos veces al implementar

1. **`generarPagosDelMes` no se borra todavía.** Los dos endpoints nuevos salen de él, pero el
   viejo se deja marcado como `@Deprecated` con un javadoc que diga cuál lo reemplaza. Borrarlo en
   el mismo cambio deja sin salida a cualquiera que lo esté llamando.
2. **El aislamiento por jubilado se conserva.** Hoy cada jubilado corre en su propia transacción
   (`REQUIRES_NEW`) y un error suyo no aborta el lote. Los dos procesos nuevos mantienen eso: es lo
   que evitó que una corrida entera se cayera por un dato malo.
3. **H46 sigue vivo.** El movimiento negativo de `CRD.APRT` sobrevive a cualquier reverso: si una
   corrida falla a mitad, el reintento informa «al día» y no le paga a nadie. **Respaldo antes de
   correr cada mes**, y ahora son dos corridas, no una.
4. **El `(PGPC n)` de la referencia bancaria** sigue como está (`API-PAGO-PENSION-COMPLEMENTARIA.md`).

---

## 7. Verificación de aceptación

1. Correr **solo** el seguro → `CRJBESSG = 1`, una orden al proveedor, `PGPCVLSG` escrito en cada
   jubilado, y `puedeGenerarPensiones = true`.
2. Correr el seguro **dos veces** → la segunda falla nombrando fecha y usuario de la primera.
3. Correr pensiones **sin** seguro → falla con el mensaje de D2, **sin generar ni una orden**.
4. Correr pensiones **después** del seguro → las órdenes descuentan **exactamente** el `PGPCVLSG`
   ya pagado, no un recálculo.
5. Un jubilado que entra **después** del proceso de seguro → cobra pensión sin descuento y aparece
   en `conPensionSinSeguro`.
6. Un jubilado que sale **antes** de fin de mes → tiene seguro pagado y no tiene pensión, y aparece
   en `conSeguroSinPension`.
7. `GET /corrida/{anio}/{mes}` de un mes sin correr → **200** con los dos estados en `0`.

---

## 8. ⛔ Compatibilidad con lo ya procesado — AGOSTO 2026 Y ANTERIORES

**Dato del usuario (2026-09-07): agosto 2026 YA se procesó y se contabilizó con el esquema
actual. El esquema nuevo rige desde SEPTIEMBRE.**

### El riesgo concreto, y no es teórico

`CRD.CRJB` nace vacía. Sin hacer nada más, la pantalla de seguimiento mostraría agosto con los dos
procesos en **PENDIENTE**, porque no hay fila. Y peor: la guarda de D2 protege las **pensiones**
(exige que el seguro esté generado), pero **no protege el seguro**.

⇒ **Alguien podría disparar el proceso de seguro médico de agosto y pagarle al proveedor por
segunda vez.** El dinero ya salió al banco en agosto y no hay anulación.

### La protección: sembrar la cabecera de los períodos ya corridos

`crd/sql/213_BACKFILL_CRJB_PERIODOS_ANTERIORES.sql` inserta **una fila de `CRJB` por cada período
que ya tenga filas en `CRD.PGPC`**, con los dos estados en **1 (GENERADO)** y los totales
reconstruidos de `PGPC`.

Con eso, sin una sola línea de código extra:

- La pantalla dice la verdad sobre agosto en vez de invitar a correrlo.
- Los dos endpoints nuevos **rechazan** agosto por la misma guarda de «ya se generó» que usan para
  cualquier período repetido. **No hace falta una regla de fecha mínima**: la protección sale del
  dato, que es más robusto que un `if (anio >= 2026 && mes >= 9)` que alguien tendría que mantener.

### Lo que el backfill NO puede reconstruir, y se deja explícito

- **`CRJBIDSG`** (la orden al proveedor) queda **NULL**: `PGPC` es por jubilado y no guarda el id
  de la orden agregada del período. Se puede completar a mano si hace falta.
- **`CRJBUSSG` / `CRJBUSPN`** se toman del `PGPCUSRG` de las filas del período. Es quien corrió el
  proceso único, y con el esquema viejo eso es exacto: **era un solo acto**.
- **`CRJBVLCR`** (cruzado a préstamos) queda **NULL**: no se puede derivar de `PGPC` sin recorrer
  los pagos, y no vale la pena para un histórico.
- ⚠️ **`PGPC` NO guarda la empresa** (tiene `ENTDCDGO` y `FLLLCDGO`, no `PJRQCDGO`). El script usa
  la empresa **1236** como literal, que es la única con corridas de jubilados hasta hoy, y su
  bloque 0 lista los períodos para que el usuario lo confirme **antes** de insertar. Si apareciera
  otra empresa, **parar**: el backfill tendría que decidir a cuál pertenece cada período.

### Y una marca para que se entienda dentro de seis meses

Las filas sembradas llevan `CRJBCTSG` y `CRJBCTPN` con el conteo real de jubilados, pero **el
lector tiene que poder distinguirlas de una corrida hecha con el esquema nuevo**. Por eso el
backfill las deja identificables: son las únicas con `CRJBIDSG IS NULL` y `CRJBVLCR IS NULL`
teniendo `CRJBESSG = 1`. Queda dicho acá y en el encabezado del script.

---

## 9. Forma de respuesta de los dos POST — faltaba, y es un error del §4

El §4 describía los pasos de los dos endpoints pero **no publicaba el cuerpo de respuesta**. El
frontend tuvo que inferirlo. Su inferencia era la correcta y se canoniza acá:

| Endpoint | Devuelve |
|---|---|
| `POST /pgpc/seguro/generar` | `{ jubilados, total, idOrdenPago, mensaje }` **+ el diagnóstico de abajo** |
| `POST /pgpc/pensiones/generar` | El **mismo `ResultadoGeneracionPagosPension`** que hoy devuelve `generarPagosDelMes`, más `totalSeguroRetroactivoNoPagado` y su conteo (§10) |

### ⚠️ Precisado el 2026-09-22 — la forma COMPLETA de `/seguro/generar`, y la asimetría entre los dos

**`/seguro/generar` devuelve el objeto DIRECTO** (`ResultadoGeneracionSeguroMedico`), sin sobre.
**`/pensiones/generar` devuelve un sobre** `{ exito, mensaje, resultado }` que el REST arma a mano.
⛔ **Los dos NO tienen la misma forma**, y tratarlos igual ya costó un defecto en producción: el
frontend tipaba los dos con sobre, `exito` venía `undefined`, y **una generación exitosa se mostraba
en rojo y no refrescaba la pantalla** (180 pagos y la orden 478 hechos, y la tarjeta diciendo
«todavía no se ha generado»).

**Los campos que `/seguro/generar` trae además de los cuatro de la tabla**, verificados contra
`ResultadoGeneracionSeguroMedico`:

| Campo | Tipo | Para qué |
|---|---|---|
| `evaluados` | `int` | cuántos jubilados recorrió |
| `yaGenerados` | `int` | cuántos ya tenían el seguro fijado |
| `conError` | `int` | ⭐ **cuántos fallaron** |
| `errores` | `List<String>` | ⭐ **el motivo de cada fallo**, uno por jubilado |
| `anio`, `mes` | `Integer` | el período |

⭐ **`conError` y `errores` son la diferencia entre una pantalla útil y una inútil.** El frontend NO
debe deducir si hubo errores parciales leyendo el texto de `mensaje` con una expresión regular: **hay
un contador**. Y `errores` trae el motivo por jubilado, así que **la pantalla puede decir quiénes
fallaron y por qué, sin que nadie tenga que ir al log del servidor** — que es exactamente lo que hubo
que hacer el 2026-09-22 para averiguar qué pasó con 2 de 182.

⭐ **Y el frontend hizo algo mejor que adivinar bien: se blindó de la duda.** Después de cada
generación vuelve a pedir `GET /corrida`, que **sí** tenía forma exacta, y repinta las dos tarjetas
con eso. Si el JSON de los POST hubiera diferido, el único lugar a tocar era el tipo, no la lógica
de la pantalla. **Ese es el patrón correcto cuando un contrato tiene un hueco: apoyarse en la parte
que sí está congelada.**

---

## 10. Meses retroactivos — medido, decidido, y NO resuelto a propósito

`generarMesesRetroactivos` recibe `valorSeguro` y lo aplica **mes a mes**: hoy cada mes retroactivo
genera su fila con su `PGPCVLSG`, y todo eso entra en la orden única al proveedor.

Con los dos procesos separados aparece un hueco: el proceso de inicio de mes paga **solo el mes
corriente**, así que un mes retroactivo con seguro quedaría **descontado al jubilado y nunca pagado
al proveedor**.

**Decisión del usuario (2026-09-07), textual:** *«No van a existir esos casos, para eso es la opción
de pagar seguro médico sin cuenta bancaria. Así que tranquilo, hasta el momento se han pagado los
seguros.»*

⇒ **No se genera ninguna orden adicional al proveedor.** El proceso de pensiones sigue sin emitir
órdenes al proveedor (§4.2 punto 5).

⚠️ **Pero no queda silencioso.** Que el caso «no vaya a existir» es una afirmación de negocio, y el
camino de código sigue abierto. La corrida de pensiones **suma aparte** el seguro de los meses
retroactivos que genere y lo devuelve en el resumen (`totalSeguroRetroactivoNoPagado` + conteo), sin
fallar y sin bloquear.

**Por qué así y no de otra forma:** si el caso nunca ocurre, el campo queda en cero y no molesta a
nadie. Si ocurre, aparece **en el resultado de la corrida** en vez de descubrirse tres meses después
conciliando con el proveedor. Es la diferencia entre un supuesto verificado y un supuesto olvidado.

---

## 11. ⛔⛔ H60 — el seguro se paga al proveedor sólo por lo que el jubilado TIENE (opción A, 2026-09-14)

**Decisión del usuario, 2026-09-14:** opción **A**. El seguro se fija ya topado por el saldo, y en la
corrida de pensiones se descuenta **PRIMERO**, porque su orden al proveedor ya salió. Regla madre del
usuario: *«el sistema no debe permitir devolver más dinero o cruzarlo con préstamos del que un
partícipe tenga»*.

**Por qué hacía falta.** El proceso 4.1 fijaba el seguro **nominal** del VPPC y pagaba al proveedor
por la suma, sin mirar nada. Después la corrida de pensiones lo descontaba topado por el saldo que
quedaba **tras el cruce**. Resultado: al proveedor se le pagaba más de lo que salía de la cuenta del
jubilado. Y un segundo agujero del mismo tipo: 4.1 fija seguro a **todo** `JUBILADO_COMPLEMENTARIO`,
pero la corrida de pensiones sale temprano como `SIN_ANCLA` o `AL_DIA` **sin descontar nada** → seguro
pagado al proveedor que no sale de la cuenta de nadie.

### 11.1 Proceso de seguro (`generarSeguroIndividual`)

```
seguroPendientePrevio = Σ PGPCVLSG de las filas del jubilado con PGPCVLPN nulo, de períodos
                        ANTERIORES al que se fija (stubs cuyo seguro ya se pagó y aún no se descontó)
saldoLibre            = max(0, saldo aporte 23 − seguroPendientePrevio)
seguroFijado          = min(nominal VPPC, saldoLibre)
```

Y además `seguroFijado = 0` cuando la corrida de pensiones **no lo descontaría**:
- **sin ancla** (`resolverAnclaRetroactivo == null`), o
- **al día** para ese período (`YearMonth(ancla) + 1 > período`).

La fila se graba **igual**, con el valor topado (puede ser `0.0`): así la corrida de pensiones la
reconoce como fijada y no la trata como `SIN_SEGURO_DEL_PERIODO`. El total de la orden al proveedor es
la suma de lo **fijado**, no de lo nominal. El `mensaje` del resumen dice cuántos quedaron topados y
cuánto seguro nominal no se cobró. **Sin cambios de forma** en la respuesta.

### 11.2 Corrida de pensiones (`generarMesesRetroactivos`) — orden SEGURO → CRUCE → PENSIÓN

1. **Reserva al empezar**, antes del bucle: `seguroReservado` = Σ `PGPCVLSG` de las filas stub
   (`PGPCVLPN` nulo) del jubilado en los meses `[desde, corrida]`. Si
   `saldo < seguroReservado − TOLERANCIA` → `IncomeException(ERR_SALDO_INSUFICIENTE)` con un mensaje que
   diga que ese seguro **ya se pagó al proveedor** y cuánto falta. Es una carrera (algo movió el saldo
   entre los dos procesos) y tiene que verse, no taparse.
   `saldoLibre = saldo − seguroReservado`.
2. **Por mes:**
   - `seguroMes` = el `PGPCVLSG` **exacto** del stub del mes si existe (ya reservado: no se vuelve a
     restar de `saldoLibre`); si el mes no tiene stub, `0` con `usarSeguroFijado`. Sin
     `usarSeguroFijado` (camino deprecado): `min(valorSeguro, saldoLibre)`, y ése sí se resta de
     `saldoLibre`.
   - `ollaTrasSeguro = valorTotal − seguroMes`.
   - **Cruce:** `disponibleMes = min(ollaTrasSeguro, deudaExigible si hay préstamo, saldoLibre)`.
   - **Pensión:** `remanenteMes = max(0, min(ollaTrasSeguro − cruce, saldoLibre − cruce))`.
   - `saldoLibre −= cruce + (remanenteMes si sale al banco)`.
3. **Con `saldoLibre <= TOLERANCIA`** (corregido 2026-09-14, la primera redacción era del árbitro y
   estaba mal):
   - si **este** mes tiene stub con seguro > 0 → se procesa: seguro exacto, cruce 0, pensión 0;
   - si este mes **no** tiene stub con seguro > 0 pero **alguno posterior sí** → `continue`: el mes
     **no se genera** (no hay nada que descontar ni pagar). Procesarlo daba un PGPC `PAGADA` por $0 y
     un asiento de devengo **sin líneas**;
   - si no queda ningún stub con seguro > 0 → `SALDO_AGOTADO`, `break`, como siempre.
   El mes salteado no se vuelve a pagar después (el movimiento del seguro posterior mueve el ancla),
   que es la misma semántica que `SALDO_AGOTADO`: sin saldo, no hay pensión.
4. Los cortes tempranos `SIN_ANCLA` y `AL_DIA` quedan como están: con 11.1, un jubilado en esos casos
   ya no tiene seguro fijado > 0 en el período.

### 11.3 Prevuelo (`previsualizarJubilado`) — mismo orden

```
montoSeguro   = min(seguroAcumulado, saldo)
montoACruzar  = min(pensionesAcumuladas − montoSeguro, deudaExigible, saldo − montoSeguro)
pension       = max(0, min(pensionesAcumuladas − montoSeguro − montoACruzar, saldo − montoSeguro − montoACruzar))
```

Sigue siendo una aproximación sobre el nominal (no lee los stubs), igual que antes.

### 11.4 Invariantes que la implementación tiene que cumplir

- Σ seguro fijado a un jubilado y aún no descontado **≤** su saldo del aporte 23.
- En la corrida: `seguro + cruce + pensión al banco ≤ saldo` al empezar, siempre.
- Orden al proveedor = Σ seguro fijado = Σ seguro que la corrida de pensiones descuenta (salvo los
  jubilados que fallen, que quedan en `errores` con su stub para el mes siguiente).
- `crearMovimientoNegativo` sigue revalidando el saldo (H60, despacho 1): es la red, no el control.

### 11.5 Lo ya pagado no se toca

Esto rige desde el próximo WAR. Agosto 2026 y anteriores se miden con `crd/sql/222` (bloque 4) y lo
que haya se decide aparte.

---

# 12. ⭐ El asiento del seguro médico — decisión del usuario, 2026-09-23

**Reportado por el usuario:** *«al procesar solo seguro médico no se está generando el asiento que da
de baja las cuentas individuales contra los seguros médicos por pagar»*.

## Lo que pasaba, medido

**El proceso de seguro (§4.1) NO generaba ningún asiento.** Verificado: su único acto contable es
`generarOrdenPagoProveedorSeguro`. El asiento del seguro existía, pero dentro del **devengo de
pensiones** (`generarAsientoDevengoPension`, líneas **aux1=3 y aux1=4** de la plantilla 35), que
corre a **fin de mes**.

⛔ **El desfase que eso produce:** el dinero le sale al proveedor al **inicio** del mes (la orden
agregada) y el pasivo se reconoce al **final**. Si tesorería paga esa orden antes de que corran las
pensiones, el asiento del pago **debita «seguros médicos por pagar» sin que nada la haya
acreditado** — la cuenta queda en negativo. Y si el período contable se cierra en el medio, deja de
ser temporal.

## La decisión

**El proceso de seguro genera su propio asiento**, en el momento en que fija los valores y manda a
pagar: **D cuentas individuales / H seguros médicos por pagar**.

⭐ **UN SOLO ASIENTO por corrida, por el total del período. No uno por jubilado.**

| | |
|---|---|
| **Por qué uno solo** | El hecho económico es uno —«este mes se descontó X y se le debe X al proveedor»— y **el pago con el que hay que cuadrarlo también es uno solo**, la orden agregada. Conciliar devengado contra pagado pasa a ser comparar un asiento contra una orden |
| **Contrapartida aceptada** | Desde el asiento **no se ve a quién se le bajó**. Ese detalle vive en `CRD.PGPC` (`PGPCVLSG` por jubilado) y en el reporte de la corrida |
| **Por qué no uno por jubilado** | Duplicaría los asientos del mes (180 de devengo pasarían a 360) y dejaría el devengo individual enfrentado a un pago agregado |

**Dónde se guarda:** `CRD.CRJB.CRJBASSG`, columna nueva (`crd/sql/244`). Número sin FK, mismo
criterio que `PGPC.PGPCNMAS`. **Nulo = todavía no se generó.**

## ⛔ La regla que evita devengar el seguro DOS veces

El devengo de pensiones **deja de incluir las líneas aux1=3 y 4 sólo cuando el período tiene
`CRJBASSG` generado**. No siempre.

**Por qué la condición y no quitarlas a secas**, que es el error fácil:

1. **La corrida de 9/2026 ya se generó** (orden 478, $450,40) **antes** de este cambio, así que su
   `CRJBASSG` queda nulo. Si el devengo dejara de incluir el seguro sin mirar esa columna,
   **septiembre se quedaría sin devengar el seguro por ningún lado**.
2. **Los meses retroactivos** (§10) no tienen cabecera de corrida con asiento de seguro. Su seguro
   se sigue devengando por el camino de siempre, dentro del asiento de pensiones.

⇒ **El esquema nuevo empieza a regir con la corrida de octubre.** Septiembre se devenga completo por
el camino viejo, una sola vez.

## Cuándo NO se genera

Si el total del período es 0, **no se genera asiento** — mismo criterio que la orden de pago, que
tampoco se crea (*«Sin seguro médico que pagar al proveedor… ($0)»*). Un asiento sin líneas no se
graba: es el defecto que §11.2 ya había atajado para los meses sin stub.
