# API — Pago mensual de pensión complementaria

**Base:** `/SaaBE/rest/pgpc` · **Equipo:** CRD / Equipo B (`eqB`, `omen-saa-1`)
**Fecha:** 2026-09-02 · **Corregido y ampliado:** 2026-09-04

> El path de JAX-RS es `/rest`, así que la URL real es `/SaaBE/rest/pgpc/...`. **No** `/api/...`,
> que aparece en documentos viejos y ya no existe.

Plan de fondo: `PLAN-PAGO-JUBILADOS.md`. Este documento es el contrato; ante una diferencia entre
los dos, manda el **código**, y los dos documentos se corrigen.

---

## ⚠️ Corrección del 2026-09-04 — leer antes de implementar

Este contrato se verificó línea por línea contra `PagoPensionComplementariaRest.java`,
`PagoPensionComplementariaServiceImpl.java`, `DetallePagoPension.java` y la entidad
`PagoPensionComplementaria.java`. **Tres afirmaciones de la versión anterior eran falsas** y
habrían costado una pantalla mal construida:

| Qué decía | Qué pasa de verdad |
|---|---|
| §3 `porEntidad` devuelve «los mismos campos nuevos del detalle» (cruce y orden de pago) | **No.** Devuelve la entidad JPA cruda, que **no tiene** `valorCruzadoAPrestamo`, `valorOrdenPago` ni `generoOrdenPago`. Esos campos existen **sólo** en `DetallePagoPension`, el DTO de la corrida |
| Las fechas viajan como `yyyy-MM-dd` | Eso vale para lo que el frontend **envía**. Lo que **llega** son **arreglos** de Jackson: `[2026,8,1]`. Mismo defecto que ya se corrigió en `API-AUDITORIA-BANDAS.md` el 2026-09-03 |
| (no lo decía) | `estado` llega como número 1..5 sin ninguna leyenda. Ver §5 |

---

## 1. `POST /rest/pgpc/generarPagosDelMes`

Genera los pagos del período para todos los jubilados `JUBILADO_COMPLEMENTARIO` con `VPPC` activa.
**No aborta el lote**: cada jubilado va en su propia transacción (`REQUIRES_NEW`) y un fallo se
cuenta como error sin tumbar la corrida.

⛔ **Los parámetros van como QUERY PARAMS, no como cuerpo JSON.** Verificado en
`PagoPensionComplementariaRest:56-60`. Un `POST` con body se rechaza con 400 «Debe indicar idEmpresa».

```
POST /SaaBE/rest/pgpc/generarPagosDelMes?idEmpresa=1&anio=2026&mes=8&usuario=jperez
```

| Param | Tipo | Obligatorio | Si falta |
|---|---|---|---|
| `idEmpresa` | number | sí | 400 «Debe indicar idEmpresa» |
| `anio` | number | sí | 400 «Debe indicar anio y mes» |
| `mes` | number (1-12) | sí | 400 «Debe indicar anio y mes» |
| `usuario` | string no vacío | sí | 400 «Debe indicar el usuario que dispara la generación» |

**Respuesta 200.** El sobre sigue el convenio del resto de este REST: `exito`, `mensaje`, y el
cuerpo real anidado bajo `resultado` — **no al nivel superior**.

```json
{
  "exito": true,
  "mensaje": "Generación 8/2026 - 42 pagos generados, 3 ya existían, 1 con error, de 46 evaluados.",
  "resultado": {
    "anio": 2026, "mes": 8,
    "evaluados": 46, "generados": 42, "yaGenerados": 3, "conError": 1,
    "totalPagado": 12600.00,
    "totalCruzadoAPrestamos": 3480.00,
    "totalOrdenesGeneradas": 9120.00,
    "errores": ["Entidad 555: SALDO_INSUFICIENTE: ..."],
    "detalle": [
      {
        "idEntidad": 1234, "nombre": "...", "idPago": 987,
        "valorPension": 280.00, "valorSeguroSalud": 20.00,
        "valorCruzadoAPrestamo": 300.00,
        "valorOrdenPago": 0.00,
        "generoOrdenPago": false,
        "idAsientoDevengo": 4471,
        "estado": "GENERADO", "mensaje": null
      }
    ]
  }
}
```

`detalle` trae UN renglón por jubilado evaluado, con `estado` en `"GENERADO"` (PGPC nuevo),
`"YA_EXISTIA"` (idempotencia — no es error) o `"ERROR"` (con `mensaje`).

⛔ **`generoOrdenPago: false` con `valorCruzadoAPrestamo > 0` NO es un error** — es el caso en que
la deuda se llevó toda la pensión del mes. El pago existe, se contabilizó, y no hubo salida de
dinero. **La pantalla no debe mostrarlo como fallo.**

### ⛔ La corrida es idempotente, pero el INFORME no se puede repetir

Verificado en `PagoPensionComplementariaServiceImpl:299-309`. Volver a correr el mismo mes **no
duplica ningún pago** —eso está bien resuelto— pero la rama `YA_EXISTIA` construye su renglón con
**sólo cinco campos**: `idEntidad`, `idPago`, `valorPension`, `valorSeguroSalud`, `estado`.

**No trae `nombre`, ni `valorCruzadoAPrestamo`, ni `valorOrdenPago`, ni `idAsientoDevengo`**, porque
no se vuelven a calcular. Y los totales del encabezado (`totalPagado`, `totalCruzadoAPrestamos`,
`totalOrdenesGeneradas`) **sólo suman lo generado en esa corrida**, así que en una segunda pasada
dan casi cero.

**Consecuencia para la pantalla:** la respuesta de la **primera** corrida es la única vez que existe
el informe completo del mes. Si el operador cierra la pantalla, **no lo recupera volviendo a
generar**. Por eso existe el §4.

---

## 2. `POST /rest/pgpc/sincronizarPagos`

Sin parámetros ni cuerpo. Reconciliador: lee el estado real de la orden en CXP de cada `PGPC`
pendiente y lo cierra como PAGADA o RECHAZADA.

```json
{ "exito": true,
  "resultado": { "evaluadas": 42, "marcadasPagadas": 40, "marcadasRechazadas": 1,
                 "huerfanas": 0, "conError": 1, "errores": ["..."] } }
```

⚠️ **Un rechazo revierte sólo el tramo que salía al banco.** El cruce contra el préstamo **no se
deshace**: ya consumió aporte y liquidó deuda, y son dos hechos distintos (§7 del plan). La pantalla
no debe sugerir que un rechazo devuelve las cuotas.

---

## 3. `GET /rest/pgpc/porEntidad/{idEntidad}`

Historial de un jubilado, del más reciente al más antiguo.

**Respuesta 200: un arreglo pelado de la entidad `PagoPensionComplementaria`**, sin sobre
`{exito,...}`. Verificado en `PagoPensionComplementariaRest:119-127`.

⛔ **NO trae los campos de cruce ni de orden de pago.** La versión anterior de este contrato decía
que sí y era falso. Los campos disponibles son exactamente las columnas de la entidad:

| Campo | Tipo | Notas |
|---|---|---|
| `codigo` | number | PK del `PGPC` |
| `entidad` | objeto | `Entidad` anidada (el partícipe) |
| `filial` | objeto | `Filial` anidada |
| `anio`, `mes` | number | período |
| `valorPension` | number | la pensión del mes |
| `valorSeguro` | number | el seguro de salud |
| `valor` | number | el total |
| `fecha` | **arreglo** | `LocalDate` → `[2026,8,31]` |
| `estado` | number | 1..5, ver §5 |
| `idPagoProgramado` | number \| null | la orden en CXP (`PGS.PGTR`). **Null = no hubo salida al banco** |
| `idAporte` | number \| null | el movimiento negativo en `APRT` |
| `numeroAsiento` | number \| null | |
| `numeroAsientoDevengo` | number \| null | el asiento de la plantilla alterno 35 |
| `usuarioRegistro` | string | |
| `fechaRegistro` | **arreglo** | `LocalDateTime` → `[2026,9,4,10,15,3,0]` |
| `fechaPago` | **arreglo** \| null | `LocalDate` |
| `usuarioAnulacion`, `fechaAnulacion`, `motivoAnulacion` | | hoy siempre nulos: **no existe anulación** |

**Cuánto fue a deuda se deduce**, no llega. Para el mes en curso, el dato bueno es el `detalle`
del §1.

---

## 4. `GET /rest/pgpc/porPeriodo?anio={a}&mes={m}` — ⬜ POR IMPLEMENTAR (eqB, 2026-09-04)

**No existe todavía.** Se construye ahora, junto con la pantalla, porque sin él el informe del mes
se pierde al cerrar la pantalla (§1).

**Alcance REDUCIDO a propósito.** `API-PAGO-JUBILADOS-ANULACION-Y-PERIODO.md` (escrito por
`lap-saa-1-arb` el 2026-09-03) especifica este mismo endpoint con tres campos extra —
`totalCruzado`, `cruces[]` y `anulable`/`motivoNoAnulable`. **Esos tres NO se implementan ahora**:
los dos primeros salen de `CRD.PGCE`, una tabla **reservada pero cuyo DDL no está autorizado ni
escrito**, y el tercero depende de la anulación, que tampoco existe.

⛔ **El frontend NO debe construir columnas para `totalCruzado`, `cruces` ni `anulable`: no van a
llegar.** Cuando `CRD.PGCE` se autorice, este endpoint los agrega y el contrato se amplía.

**Respuesta 200:** arreglo pelado de `PagoPensionComplementaria`, **exactamente la misma forma del
§3**, ordenado por partícipe. Un período sin pagos devuelve `[]`, **no** 404.

**Implementación:** un `selectByPeriodo(anio, mes)` en el DAO al lado de `selectByEntidadYPeriodo`,
y el método REST calcado de `porEntidad`. No hace falta nada más.

---

## 4bis. `POST /rest/pgpc/previsualizarCorrida` — ⬜ POR IMPLEMENTAR (2026-09-04)

**Pedido del usuario, 2026-09-04:** *«Quiero que en la pantalla de corrida me dé un detalle de lo
que se va a cruzar: cuánto en préstamos, cuánto en dinero, y el total.»*

⛔ **NO ESCRIBE NADA.** Es una simulación: mismos parámetros que `generarPagosDelMes`, misma lógica
de decisión, **cero** filas creadas, cero asientos, cero órdenes.

```
POST /SaaBE/rest/pgpc/previsualizarCorrida?idEmpresa=1&anio=2026&mes=8&usuario=jperez
```

### Por qué va en el backend y no en el frontend

El monto a cruzar depende de las **cuotas exigibles** de cada préstamo a la fecha de corrida. Para
calcularlo en el navegador habría que traer los préstamos y las cuotas de los 133 jubilados —cientos
de consultas— y **reimplementar en TypeScript la regla del tope**, que ya vive en el backend. Dos
copias de la misma regla se desincronizan; la primera vez que cambie una, el prevuelo va a mentir.

**Reutiliza la misma función que calcula el tope en la corrida real.** Si no la reutiliza, no sirve.

### Respuesta 200

Mismo sobre `{exito, mensaje, resultado}` del §1.

```json
{
  "exito": true,
  "resultado": {
    "anio": 2026, "mes": 8,
    "evaluados": 187,
    "aptos": 120, "bloqueados": 67,
    "totalACruzarPrestamos": 18450.00,
    "totalADinero": 9870.50,
    "totalGeneral": 28320.50,
    "detalle": [
      {
        "idEntidad": 1234, "nombre": "...",
        "mesesAdeudados": 8,
        "montoACruzar": 1200.00,
        "montoADinero": 300.00,
        "total": 1500.00,
        "tienePrestamo": true,
        "tieneCertificado": true,
        "apto": true,
        "motivoBloqueo": null
      }
    ]
  }
}
```

- **`totalACruzarPrestamos`**: lo que va a cancelar deuda. **No sale de la asociación.**
- **`totalADinero`**: lo que va a salir al banco como orden de pago. **Esto sí es dinero saliendo.**
- **`totalGeneral`**: la suma. Es lo que se descuenta de las cuentas de pensión complementaria.

### ⚠️ El cruce es una ESTIMACIÓN, y hay que decirlo en la pantalla

`montoACruzar` se calcula como
`min(pensiones acumuladas, deuda exigible a la fecha de corrida, saldo del aporte 23)`.

**El monto real puede diferir**: el motor calcula mora e interés al aplicar, y esa parte no se
simula. La diferencia debería ser chica, pero **el número no es exacto y la pantalla no puede
presentarlo como si lo fuera.** Es para dimensionar y decidir, no para cuadrar contra el resultado.

⛔ **Si alguna vez este endpoint empieza a escribir algo "para simular mejor", está mal.** La única
garantía que lo hace útil es que se puede apretar sin miedo.

---

## 5. Estados de `PGPC` (`PGPCESTD`)

De `com.saa.rubros.EstadoPagoPensionComplementaria`. **Son constantes planas, no catálogo `Rubro`.**

| Valor | Constante | Significa |
|---|---|---|
| 1 | `REGISTRADA` | Generado y contabilizado. Todavía sin confirmar en tesorería |
| 2 | `EN_PAGO` | Orden creada en CXP, esperando el pago |
| 3 | `PAGADA` | Confirmada por `sincronizarPagos` |
| 4 | `RECHAZADA` | CXP rechazó o reversó. **El cruce contra el préstamo NO se deshizo** |
| 5 | `ANULADA` | **Hoy inalcanzable**: no existe endpoint de anulación |

Un pago que se llevó toda la pensión en cruce queda en **1**, no en 2, y **nunca pasa a 3** porque
no hay orden que sincronizar. Es correcto y la pantalla no debe marcarlo como atascado.

---

## 6. Errores

| Código | HTTP | Cuándo |
|---|---|---|
| `ENTIDAD_NO_ENCONTRADA` | 404 | No existe el jubilado |
| `SIN_VALOR_PENSION` | 422 | Sin `VPPC` activa, o más de una |
| `SALDO_INSUFICIENTE` | 422 | El saldo del aporte tipo 23 no alcanza |
| `SIN_CUENTA_BANCARIA` | 422 | No tiene exactamente una cuenta bancaria activa |
| **`SIN_CERTIFICADO_BANCARIO`** | 422 | **Nuevo 2026-09-04.** La cuenta activa no tiene certificado bancario cargado |
| **`TIPO_ADJUNTO_CERTIFICADO_NO_CONFIGURADO`** | 422 | **Nuevo 2026-09-04.** No se pudo *verificar* el certificado: el catálogo `CRD.TPDJ` está mal. **No es culpa del jubilado** |
| `PAGO_NO_ENCONTRADO` | 404 | No existe el pago |

### ⭐ Regla del certificado bancario — decisión del usuario, 2026-09-04

> *«Una regla adicional para procesar el pago retroactivo es que tenga subido el certificado
> bancario. Eso se debe incluir en la validación.»*

**No se genera el pago de un jubilado cuya cuenta bancaria activa no tenga el certificado
bancario cargado.** La validación va en el **backend**, dentro de `generarPagoIndividual`, justo
después de resolver la cuenta única activa.

**Y el prevuelo de la pantalla también BLOQUEA** (ampliación del usuario, 2026-09-04: *«la corrida
del mes también debe tomar eso como bloqueante, si es que no tiene subido el certificado bancario
no se le incluye en la corrida»*). Sin certificado, el jubilado **no entra en la corrida**: cuenta
como bloqueado, no suma al total a pagar, y aparece con su motivo en la fila.

⛔ **Los dos lados tienen que coincidir.** Si el prevuelo lo mostrara como «listo» y el backend lo
rechazara, el operador vería un total que no se va a pagar y N renglones `ERROR` que el prevuelo no
anticipó. El prevuelo no es un adorno: es la promesa de lo que va a pasar al ejecutar.

#### ⛔ Las dos causas que NO se pueden confundir

Esto es lo que decide si la regla ayuda o hace daño:

| Situación | Código | Qué significa | De quién es el problema |
|---|---|---|---|
| La cuenta existe y **no tiene** certificado | `SIN_CERTIFICADO_BANCARIO` | falta el documento de ESE jubilado | de la oficina: hay que pedirlo y subirlo |
| **No se pudo verificar** el certificado | `TIPO_ADJUNTO_CERTIFICADO_NO_CONFIGURADO` | el catálogo `CRD.TPDJ` no resuelve | **del sistema**, y afecta a TODOS por igual |

`CuentaBancariaParticipeServiceImpl.obtenerCertificado()` **lanza excepción** si no encuentra el
tipo `'CERTIFICADO BANCARIO'` en `CRD.TPDJ`. Ese caso **no debe salir como
`SIN_CERTIFICADO_BANCARIO`**: si sale así, el operador va a leer 187 renglones diciendo «falta el
certificado» y va a salir a pedirle el documento a 187 personas que quizá ya lo entregaron.

#### ⛔⛔ ADVERTENCIA DE ORDEN — leer antes de activar esta regla

**Al 2026-09-04 `CRD.TPDJ` tiene DOS filas activas llamadas `'CERTIFICADO BANCARIO'`** (ids 4 y 37,
medido con `sql/192`), y `resolverTipoCertificadoBancario()` resuelve con `tipos.get(0)` sobre una
consulta **sin `ORDER BY`**.

**Mientras eso siga así, esta validación puede bloquear a jubilados que SÍ tienen su certificado**,
porque el `get(0)` puede devolver el tipo que no es y los adjuntos del otro quedan invisibles.

**El orden correcto es: primero `sql/193` (dejar una sola fila activa), después activar la regla.**
Al revés, se convierte un defecto de pantalla en un bloqueo de pagos.

⛔ **Estos cinco casi nunca llegan como HTTP.** En `generarPagosDelMes` el fallo de **un** jubilado
se captura por dentro y sale como un renglón del `detalle` con `estado: "ERROR"` y su `mensaje`,
dentro de una respuesta **200**. La pantalla que sólo mire el código HTTP va a dar por buena una
corrida en la que fallaron veinte jubilados. **Hay que leer `conError` y `errores`.**

**Forma del cuerpo de error** (cuando sí es HTTP ≥400): `{"exito": false, "mensaje": "...",
"error": "CODIGO"}`, de `respuestaFallo`.

---

## 6bis. ⭐ Regla de fechas del circuito de jubilados — decisión del usuario, 2026-09-04

> *«La contabilización y los procesos de jubilados que se registren con fecha de fin de mes. Cada
> período se debe pagar a jubilados y todo que se registre con fin de mes.»*

**Toda fecha de negocio y de contabilidad del pago mensual es el ÚLTIMO DÍA DEL MES DEL PERÍODO.**
No el día 1, y no el día en que se corre el proceso. Un agosto procesado el 4 de septiembre se
registra **2026-08-31**.

Es la misma regla que H21 fijó para la carga Petro, y por el mismo motivo: el hecho económico
pertenece al período, no al día en que el operador alcanzó a procesarlo.

### Qué cambia y qué no

| Campo | Antes | Ahora | Por qué |
|---|---|---|---|
| `PGPC.fecha` | día **1** del mes | **último día** del mes | fecha del hecho |
| `PGPC.fechaPago`, la orden a tesorería | día 1 | último día | derivan de `fecha` |
| El asiento de devengo | día 1 | último día | usa `pago.getFecha()` |
| `APRT.fechaTransaccion` | `now()` ⚠️ | último día | **fecha de negocio**, no de auditoría |
| `PagoAporte.fechaContable` | `now()` ⚠️ | último día | **contable** |
| `PGPC.fechaRegistro`, `APRT.fechaRegistro`, `PagoAporte.fechaRegistro` | `now()` | **`now()`, sin cambio** | son auditoría: *cuándo se registró*, y esa sí es la fecha real |

**La distinción que hace que esto no se rompa de nuevo:** `fechaRegistro` es auditoría y vale
`now()`; `fecha`/`fechaTransaccion`/`fechaContable` son del hecho económico y valen fin de mes.
El defecto anterior fue reusar un mismo `fechaHora = now()` para las dos cosas.

**El patrón ya existía en el módulo:** `AporteServiceImpl.procesarJubilacion` resuelve exactamente
esto con `fechaEfectiva.atStartOfDay()` cuando la fecha no es hoy. Se copia, no se inventa.

### Dos fechas que NO se tocan, y por qué

- **`PGPC.fechaPago` cuando lo escribe `sincronizarPagos`** (`:714`, desde
  `pagoProgramado.getFechaRespuesta()`): es **el día real en que el banco respondió**. Es un hecho
  externo; sobreescribirlo con fin de mes sería registrar algo que no pasó.
- **El contra-movimiento de un rechazo** (`:854-882`): un pago de agosto rechazado en octubre genera
  su reverso **en octubre**. Fecharlo el 31 de agosto reabriría un mes ya cerrado.

### ⭐ Refinamiento del usuario, 2026-09-04 (segunda vuelta) — la regla definitiva

> *«Si se procesa con fecha posterior al fin de mes que se procese con fecha de fin de mes lo de
> cartera y el pago con fecha actual, y si se procesa dentro del mes, entonces que se procese con
> fecha de proceso.»*

**La fecha del hecho es `min(último día del mes del período, hoy)`.** Una sola expresión cubre los
dos casos que plantea el usuario:

| Caso | Período | Se corre | Fecha del hecho |
|---|---|---|---|
| Período cerrado | agosto | 4-sep | **2026-08-31** (fin de mes) |
| Dentro del mes | septiembre | 20-sep | **2026-09-20** (hoy) |
| Último día | septiembre | 30-sep | **2026-09-30** (hoy y fin de mes coinciden) |

**Y el pago va siempre con la fecha actual**, separado de lo de cartera.

#### ⭐ Por qué esta regla es la correcta y no solo una preferencia

**`min(fin de mes, hoy)` no puede producir una fecha futura, nunca.** Eso hace que el circuito
entero deje de chocar con los controles de fecha futura que tienen los tres pasos, **sin tocar
ninguno**:

| Paso | Control | Con esta regla |
|---|---|---|
| Cruce contra préstamos | `ProcesoPagoPrestamoServiceImpl:594` (`validarFechaNoFutura`) | nunca se dispara |
| Aportes + asiento de jubilación | `AporteServiceImpl:459` | nunca se dispara |
| Pago / devolución en efectivo | `DevolucionAporteServiceImpl:330` | va con fecha actual, nunca se dispara |

⛔ **Esto reemplaza la idea de ampliar el control** que se había evaluado antes. Ampliarlo habría
significado modificar `pagarConAportes`, que es **compartido con la carga Petro y con el pago
mensual de pensión**, y habría exigido avisar a los otros equipos. La regla del usuario obtiene el
mismo resultado con radio de impacto cero.

#### La jubilación del partícipe: ya no hay conflicto

Una jubilación **no tiene período**: es un hecho del mes en curso. Por lo tanto
`min(fin de mes, hoy)` da **siempre hoy**, que es exactamente lo que
`jubilar-participe.component.ts:689` ya manda. **No hay nada que cambiar en ese frente**, y el
conflicto que se documentaba más abajo queda resuelto por esta regla, no por una excepción.

#### ⚠️ La mina que esto desactiva, y que existía por unas horas

La primera versión de la regla (fin de mes **incondicional**, commit `79204e4`) dejaba el pago
mensual expuesto: correr un período **dentro** de su propio mes daba fecha futura, y
`cruzarContraPrestamos` -> `pagarConAportes` habría lanzado `FECHA_INVALIDA` **para todo jubilado
con préstamo vigente**, saliendo como renglones `ERROR` dentro de un 200. Agosto corrido en
septiembre no la tocaba (fecha pasada), pero cualquier corrida en el mes sí.

**Se detectó antes de cualquier corrida**, al verificar si el refinamiento liberaba los controles.

### Conflicto RESUELTO: la jubilación del partícipe (histórico)

`AporteServiceImpl.procesarJubilacion` **rechaza toda fecha futura**:

```java
if (fechaEfectiva.isAfter(LocalDate.now()))
    throw new IncomeException(ERR_FECHA_INVALIDA + ": la fecha " + fechaEfectiva + " es futura");
```

Y `jubilar-participe.component.ts:689` hoy manda **la fecha de hoy**, que es la que alimenta los tres
pasos (cruce, devolución en efectivo y `procesarJubilacion`).

**Si se le aplicara «fin de mes» a la jubilación procesada a mitad de mes, la fecha caería en el
futuro y el proceso fallaría con 422.** El pago mensual no tiene este problema porque su período
siempre está cerrado hacia atrás.

**✅ RESUELTO por el refinamiento de arriba, sin tocar el control.** Como una jubilación no tiene
período, `min(fin de mes, hoy)` da siempre **hoy**, y el control nunca se alcanza. La jubilación
sigue con la fecha del día — que resulta ser lo correcto, no una excepción.

Se conserva este bloque porque documenta **por qué** el control está donde está: si alguien más
adelante quiere fechar una jubilación en el futuro, acá está la razón por la que no se puede.

---

## 7. Fechas — las dos direcciones, que no son simétricas

- **Lo que el frontend ENVÍA:** `LocalDate` como `yyyy-MM-dd`, `LocalDateTime` como ISO **local sin
  zona**. Nunca un `Date` crudo de JavaScript ni nada terminado en `Z` — Jackson descarta el offset
  en vez de convertirlo y un instante de las 08:30 de Ecuador se graba como 13:30, sin ningún error.
- **Lo que el frontend RECIBE:** ⛔ **arreglos.** `[2026,8,31]` para `LocalDate`,
  `[2026,9,4,10,15,3,0]` para `LocalDateTime`. Formatearlos antes de mostrarlos **y antes de
  exportarlos**: el 2026-09-03 se encontró un CSV de otro tablero que volcaba `2026,7,31` en una
  celda por saltarse ese paso.
