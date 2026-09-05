# API — Pago mensual de pensión complementaria

**Base:** `/SaaBE/rest/pgpc` · **Equipo:** CRD / Equipo B (`eqB`, `omen-saa-1`)
**Fecha:** 2026-09-02 · **Corregido y ampliado:** 2026-09-04 (última: regla del seguro médico, §4ter)

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
    "totalSeguroInternoGeneral": 140.00,
    "totalGeneral": 28460.50,
    "totalSeguroGeneral": 1890.00,
    "detalle": [
      {
        "idEntidad": 1234, "nombre": "...",
        "mesesAdeudados": 8,
        "montoACruzar": 1200.00,
        "montoADinero": 300.00,
        "montoSeguroInterno": 0.00,
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

### ⭐ El seguro médico se muestra aparte — pedido del usuario, 2026-09-04

> *«En el tab de corrida del mes debe mostrarse también el seguro médico, ese no se está mostrando
> en pantalla.»*

**No es un detalle de presentación: son dos cuentas contables distintas.** La plantilla alterno 35
manda la pensión a `2.3.01.10.03 PENSIONES COMPLEMENTARIAS POR PAGAR` (aux1 2) y el seguro a
`2.3.90.90.06 SEGURO POR PAGAR JUBILADOS` (aux1 4). Que la pantalla los sume en un solo número
esconde una separación que la contabilidad sí hace.

Campos que se agregan a `DetallePrevisualizacionJubilado` **y** a `DetallePagoPension`:

| Campo | Qué |
|---|---|
| `valorPensionMensual` | La parte de pensión de UN mes (`VPPC.valorPagar − VPPC.valorSeguro`) |
| `valorSeguroMensual` | El seguro médico de UN mes (`VPPC.valorSeguro`) |
| `totalPension` | Pensión acumulada de todos los meses del retroactivo |
| `totalSeguro` | **Seguro médico acumulado** de todos los meses |

Y en el agregado de la respuesta: **`totalSeguroGeneral`**, la suma del seguro de todos los
jubilados de la corrida.

#### ✅ De dónde sale el valor del seguro — decisión del usuario, 2026-09-04

> *«El seguro se carga a mano.»*

**No hay fórmula, ni porcentaje, ni valor fijo.** Lo captura la oficina por jubilado, en el campo
«Valor de seguro» del padrón, y el sistema lo lee tal cual de `VPPC.VPPCVLSR`.

**Consecuencia: un seguro en cero NO es un defecto.** Medido el 2026-09-04: de **190**
configuraciones activas, **8** con seguro y **182** en cero.

⛔ **Y eso es NORMAL, confirmado por el usuario el 2026-09-04.** Un jubilado sin seguro médico es un
caso corriente, no un olvido de carga. Por eso:

- El campo **sigue siendo opcional** y **no lleva ningún aviso** al guardar en cero. Se evaluó
  agregar uno —*«¿seguro que este jubilado no tiene seguro médico?»*— y **se descartó**: molestaría
  en el caso mayoritario.
- El filtro «sin seguro asignado» del padrón existe para **consultar**, no para corregir. Va en gris
  neutro a propósito: **no es una alarma**.

**No volver a diagnosticar «faltan 182 seguros por cargar».** Ya se hizo una vez —el árbitro lo
planteó como trabajo de oficina el 2026-09-04— y el usuario lo corrigió: *«NO es trabajo de
oficina»*. La causa de lo que se estaba investigando era otra (ver `AL_DIA` en el §6).

⛔ **La trampa de la carga, y ya mordió:** `valorPagar` **es el total e incluye el seguro**. Cargar
el seguro y dejar `valorPagar` en 0 **bloquea al jubilado** con `SIN_VALOR_PENSION` — el sistema
entiende que no hay nada que pagarle. Para una pensión de 300 con 20 de seguro se carga
`valorPagar = 300` y `valorSeguro = 20`, **no** 280 y 20.

#### ⭐ Mes parcial: el reparto es PROPORCIONAL — decisión del árbitro, 2026-09-04

Cuando el último mes retroactivo queda **topado** —por saldo agotado o porque el préstamo quedó al
día— lo que se aplica es menos que la mensualidad completa. Ese parcial se reparte entre pensión y
seguro **en proporción a la mensualidad**:

```
pensiónAplicada = parcial × (valorPensionMensual / valorPagar)
seguroAplicado  = parcial − pensiónAplicada        ← por resta, para que sumen exacto
```

Con pensión 280 / seguro 20 y un parcial de $100: **$93,33 a pensión y $6,67 a seguro.**

**Por qué proporcional y no «seguro primero» o «pensión primero»:** conserva la relación del mes
completo y no privilegia una cuenta contable sobre la otra. Las otras dos opciones son defendibles
pero implican una decisión de prelación que nadie tomó, y elegirlas en silencio sería inventar una
regla contable.

⚠️ **Esta la tomó el árbitro bajo la delegación del usuario del 2026-09-04** (*«coordina todo tú, y
solo si hay alguna decisión que tomar avísame»*), por ser la opción neutra y para no frenar el
frente. **Es reversible**: si contabilidad prefiere otra prelación, se cambia en un solo lugar.
Queda registrada acá para que se pueda discutir con el dato a la vista, no para que pase inadvertida.

⛔ **El seguro se calcula por RESTA, nunca con su propia multiplicación.** Dos redondeos
independientes sobre el mismo parcial pueden no sumar el total, y ahí aparece un descuadre de
centavos entre las dos cuentas contables — que es exactamente el tipo de diferencia que después
cuesta días encontrar.

**Precisión del 2026-09-04 (regla del seguro, §4ter):** el «parcial» que se reparte en proporción es
`montoACruzar + montoADinero` — el tramo que lleva las dos cuentas mezcladas. `montoSeguroInterno`
es **100 % seguro** y entra entero del lado del seguro, por la misma resta:

```
totalPension = (montoACruzar + montoADinero) × (valorPensionMensual / valorPagar)
totalSeguro  = total − totalPension            ← incluye montoSeguroInterno completo
```

Cuando hay certificado `montoSeguroInterno` vale 0 y esto **degenera exactamente en la fórmula
anterior**: el cambio no toca a ningún jubilado con certificado.

⛔ **`totalPension` / `totalSeguro` cuentan lo PROCESADO, no lo adeudado ni lo devengado.** Hasta el
2026-09-04 la **corrida real** acumulaba también el remanente **retenido** por falta de certificado
—plata que nunca se movió— mientras el prevuelo sí lo excluía, y los dos daban números distintos
para el mismo jubilado. Corregido: ahora las dos rutas cuentan lo mismo. El **devengo contable**
sigue siendo aparte y por el nominal completo del mes (`PGPC.valorPension` / `PGPC.valorSeguro`).

⛔ **`valorPagar` de `VPPC` ya INCLUYE el seguro** — no se suman. `valorPagar` es el total mensual y
`valorSeguro` es la porción de ese total que corresponde al seguro. Sumar los dos duplica el seguro,
y es el error más fácil de cometer acá. Verificado en `PagoPensionComplementariaServiceImpl`:
`valorPension = valorTotal − valorSeguro`.

- **`totalACruzarPrestamos`**: lo que va a cancelar deuda. **No sale de la asociación.**
- **`totalADinero`**: lo que va a salir al banco como orden de pago. **Esto sí es dinero saliendo.**
- **`totalSeguroInternoGeneral`**: la porción de seguro médico que se traspasa a `2.3.90.90.06` sin
  salir al banco (§4ter). **No sale de la asociación**, y **no** está incluida en `totalADinero`.
- **`totalGeneral`**: **los tres**. Es lo que se descuenta de las cuentas de pensión complementaria.

⛔ **`totalGeneral` ya NO es `totalACruzarPrestamos + totalADinero`.** Desde la ampliación del
2026-09-04 hay una tercera porción. La identidad vigente es:

```
totalGeneral = totalACruzarPrestamos + totalADinero + totalSeguroInternoGeneral
```

El backend lo acumula fila a fila (`Σ detalle[].total`), no con esa suma, para que siga valiendo
**exacta** la identidad que la pantalla usa para su «Total pensión»:
`totalGeneral − totalSeguroGeneral`.

### ⚠️ El cruce es una ESTIMACIÓN, y hay que decirlo en la pantalla

`montoACruzar` se calcula como
`min(pensiones acumuladas, deuda exigible a la fecha de corrida, saldo del aporte 23)`.

**El monto real puede diferir**: el motor calcula mora e interés al aplicar, y esa parte no se
simula. La diferencia debería ser chica, pero **el número no es exacto y la pantalla no puede
presentarlo como si lo fuera.** Es para dimensionar y decidir, no para cuadrar contra el resultado.

⛔ **Si alguna vez este endpoint empieza a escribir algo "para simular mejor", está mal.** La única
garantía que lo hace útil es que se puede apretar sin miedo.

**Verificado el 2026-09-04**, no asumido: el bloque completo de `previsualizarCorrida` +
`previsualizarJubilado` no contiene **ninguna** llamada a `.save(`, `pagarConAportes`,
`crearMovimientoNegativo`, `registrarPagoDeOrigenExterno`, `generarAsientoDevengoPension` ni
`calcularSaldosRealesCuota` — esta última **sí persiste**, y por eso el prevuelo usa la variante
pura `calcularSaldosCuota`. Además el método es `@TransactionAttribute(NOT_SUPPORTED)`.

#### ⚠️ Segunda razón por la que el número es estimado: el tope agregado vs. por préstamo

El prevuelo aplica el `min(...)` **una vez, en agregado** (`meses × pensión` contra la deuda
exigible total y el saldo). La corrida real lo aplica **mes a mes y con tope POR préstamo**, que es
lo que evita pre-pagar cuotas futuras de un préstamo cuando hay **varios vigentes**.

**Para un jubilado con un solo préstamo las dos formas coinciden.** Con dos o más, el prevuelo puede
diferir del resultado. Es aceptable —el número está declarado como estimación— pero **no es solo la
mora lo que puede moverlo**, y quien compare prevuelo contra resultado tiene que saberlo.

---

## 4ter. ⭐ El seguro médico también desbloquea — decisión del usuario, 2026-09-04

> *«Si un jubilado no tiene préstamo ni certificado bancario ni cuenta bancaria, pero sí tiene
> seguro médico, ese también se le debe pagar ese mes. Los que tienen solo seguro médico se
> desbloquean de la misma forma que los que solo tienen préstamo.»*

### Por qué es la misma regla, no una excepción

El §6 ya tenía cerrado que **el certificado bancario gobierna la SALIDA DE DINERO AL BANCO, no el
cruce contra el préstamo**. Por eso un jubilado sin certificado pero con préstamo igual participa:
su plata cancela deuda, y eso **no pasa por el banco**.

**El seguro médico es exactamente el mismo caso.** No sale al banco: va a
`2.3.90.90.06 SEGURO POR PAGAR JUBILADOS` (plantilla alterno 35, aux1 3/4), mientras la pensión va a
`2.3.01.10.03`. Es un **traspaso interno** entre cuentas de la asociación. Si no hay salida al
banco, **no hay cuenta de destino que el certificado deba validar**.

### La regla, completa

| | Con certificado | Sin certificado |
|---|---|---|
| Cruce contra el préstamo | ✅ sí | ✅ **sí, igual** |
| Porción **PENSIÓN** del remanente → banco | ✅ sí | ⛔ **no sale, y no se consume** |
| Porción **SEGURO** del remanente → `2.3.90.90.06` | ✅ (va dentro de la orden de pago) | ✅ **sí, se traspasa igual** |

**El certificado bloquea SÓLO la porción PENSIÓN del remanente.** Ni el cruce (ya era así) ni la
porción seguro (esto es lo nuevo).

**Sólo se bloquea al jubilado que no tiene NINGUNO de los tres:** sin préstamo vigente, sin
certificado **y** sin seguro médico. Ahí no hay cruce posible, no puede salir dinero y no hay
seguro que traspasar — no queda nada que hacer con esa pensión este mes.

- Compuerta del prevuelo: `previsualizarJubilado`, `!hayPrestamoVigente && !tieneCertificado && !haySeguroMensual`.
- Compuerta de la corrida real: `generarMesesRetroactivos`, `motivoCorte = "SIN_PRESTAMO_SIN_CERTIFICADO_SIN_SEGURO"`.

### Cómo se parte el remanente

Mismo criterio del §4bis, sin inventar uno nuevo: **proporcional a la mensualidad y el seguro por
RESTA**, nunca con su propia multiplicación.

```
remanenteProcesable = min(remanente nominal del mes, saldo libre del aporte 23)
remanentePension    = remanenteProcesable × (valorPensionMensual / valorPagar)
remanenteSeguro     = remanenteProcesable − remanentePension       ← por resta

con certificado : al banco = remanenteProcesable   · traspaso interno = 0
sin certificado : al banco = 0                     · traspaso interno = remanenteSeguro
```

⛔ **El seguro traspasado TAMBIÉN consume saldo del aporte 23. No es gratis.** Se descuenta de
`saldoRestante` mes a mes, igual que el cruce y que la salida al banco; si no se descontara, el mes
siguiente sobregiraría el aporte.

### ⛔⛔ La consecuencia, y NO es plata perdida

Al procesar el seguro de un mes se registra el **movimiento negativo del aporte 23**. Ese movimiento
es el **ancla del retroactivo** (`resolverAnclaRetroactivo` toma el último movimiento negativo), así
que **el ancla avanza**: ese mes queda saldado y la porción de PENSIÓN retenida **no se vuelve a
pagar retroactivamente después**.

**Eso NO es plata perdida.** El remanente retenido **nunca se descuenta**: se queda en el saldo del
aporte 23 del jubilado. Es exactamente la semántica que `SOLO_CRUCE` ya tenía —y que el usuario ya
aprobó— para el jubilado con préstamo y sin certificado: el mes se procesa, el ancla avanza, y la
plata que no salió sigue siendo suya, en su saldo.

**No leer esto como una pérdida ni "arreglarlo" retrocediendo el ancla.** Retroceder el ancla
duplicaría el devengo del mes y volvería a traspasar el seguro que ya se traspasó.

### Campos nuevos (aditivos: un frontend viejo los ignora)

| Campo | Dónde | Qué |
|---|---|---|
| `montoSeguroInterno` | fila del prevuelo | Seguro que se traspasaría sin salir al banco. **No** suma a `montoADinero`; **sí** a `total` |
| `totalSeguroInternoGeneral` | agregado del prevuelo | Suma del anterior. Subconjunto de `totalSeguroGeneral` |
| `valorSeguroInterno` | fila de la corrida real | Lo mismo, ya ejecutado. Subconjunto de `totalSeguro` |

⛔ **`montoADinero` / `totalADinero` NO cambiaron de significado**: siguen siendo, exclusivamente,
**el dinero que sale al banco**. Ese es el número con el que el operador decide, y meter ahí un
traspaso interno lo habría inflado.

**Pendiente de pantalla (frontend):** la corrida hoy muestra tres tarjetas —«a préstamos», «a
dinero», «total general»— donde las dos primeras sumaban la tercera. Con esta regla ya no suman:
falta una cuarta, **«Seguro a traspaso interno»** (`totalSeguroInternoGeneral`), o la pantalla queda
con una diferencia sin explicar.

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

⛔ **Corregido el 2026-09-04 leyendo `registrarPgpcDelMes`** — este párrafo decía que un pago
100 % cruzado queda en **1** y «nunca pasa a 3». **Es al revés.** Los tres finales posibles son:

| Situación del mes | Estado |
|---|---|
| Salió orden de pago al banco | **2** `EN_PAGO` → `sincronizarPagos` lo lleva a 3 o 4 |
| No quedó remanente **pendiente**: el cruce se llevó todo, o lo poco que quedaba era seguro y ya se traspasó (§4ter) | **3** `PAGADA`, con `fechaPago` = la del período |
| Quedó remanente de **pensión** retenido (sin cuenta o sin certificado) | **1** `REGISTRADA` |

Los estados **1** y **3** de esta tabla **no tienen orden que sincronizar** y `sincronizarPago` los
salta. Es correcto y la pantalla no debe marcarlos como atascados.

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

### ⛔ CORREGIDO EL 2026-09-04 — este párrafo decía lo contrario y estaba desplegado

**La versión anterior decía que sin certificado NO se genera ningún pago** (bloqueo total). Eso
contradecía al `PLAN-PAGO-RETROACTIVO-JUBILADOS.md` §D2, escrito por el mismo árbitro horas después.
**Lo detectó el agente de frontend leyendo los dos documentos, antes de escribir código contra la
versión equivocada.** El usuario resolvió el 2026-09-04: vale D2.

**LA REGLA VIGENTE: el certificado gobierna la SALIDA DE DINERO, no el cruce contra el préstamo.**

| | Con certificado | Sin certificado |
|---|---|---|
| Cruce contra el préstamo | ✅ sí | ✅ **sí, igual** |
| Porción **PENSIÓN** del remanente al banco | ✅ sí | ⛔ **no sale, y no se consume** |
| Porción **SEGURO** del remanente (`2.3.90.90.06`) | ✅ sí | ✅ **sí, igual** — ampliación 2026-09-04, §4ter |

**Por qué:** el certificado valida **la cuenta de destino**. Si no hay salida al banco, no hay cuenta
que validar. Bloquear el cruce le cobraría al jubilado mora sobre una deuda que su propia pensión
podía estar cancelando. **Y por el mismo motivo tampoco bloquea el seguro**, que es un traspaso
interno entre cuentas de la asociación (§4ter).

**Consecuencia:** un jubilado con préstamo **o con seguro** y sin certificado **NO está bloqueado**.
Participa parcialmente. Ni «listo» ni «bloqueado»: es un tercer estado.

### El campo que lo dice, para no inferirlo

Tanto el `detalle` de `generarPagosDelMes` como el de `previsualizarCorrida` llevan:

```
"participacion": "COMPLETA" | "SOLO_CRUCE" | "BLOQUEADO"
```

| Valor | Qué significa |
|---|---|
| `COMPLETA` | **Nada quedó retenido.** Todo lo que correspondía se aplicó: a préstamo, al banco, al seguro, o a varios |
| `SOLO_CRUCE` | **Léase PARCIAL.** Quedó remanente de **pensión** que NO pudo salir por falta de certificado o de cuenta única. Se aplicó lo que sí podía (cruce y/o seguro); hay plata que el jubilado no cobró |
| `BLOQUEADO` | No participa. `motivoBloqueo` dice por qué |
| `AL_DIA` | Sin meses adeudados a este período. No es bloqueo |
| `null` | No fue un evento de participación de esta corrida (`YA_EXISTIA`, retroactivo con 0 meses) |

#### ⚠️ `SOLO_CRUCE` ya no es literal — el literal NO cambió, a propósito (2026-09-04)

Con la regla del seguro (§4ter) un jubilado **sin préstamo**, **sin certificado** y **con seguro
médico** procesa su seguro y retiene su pensión. Eso **no es «solo cruce»**: puede no haber habido
ningún cruce (`valorCruzadoAPrestamo = 0`).

**Aun así el backend sigue mandando `"SOLO_CRUCE"`, y es deliberado.** El valor se redefine, el
literal no:

> `SOLO_CRUCE` = **participación PARCIAL**: se procesó lo que se podía y quedó remanente de pensión
> retenido por falta de certificado. Es **accionable** — conseguir el certificado libera ese dinero.

**Por qué no un valor nuevo.** El frontend lee estos literales a mano
(`corrida-mes-pago-jubilados.component.ts`: `filasCompletas` / `filasSoloCruce` / `filasBloqueadas`,
`cantidadAccionable`, `claseParticipacion`, `textoParticipacion`, y el `type Participacion` de
`pago-pension-complementaria.ts`). Un literal desconocido **no cae en ninguna de esas cuatro
canastas** —ni siquiera en «Sin novedad», que filtra por `== null`— así que la fila desaparecería de
todas las pestañas y no contaría como accionable. La definición por **retención** sigue siendo
correcta para el caso nuevo; sólo la **etiqueta** quedó estrecha.

**Lo único pendiente es cosmético y es del frontend:** cambiar el texto visible de «Solo cruce» a
**«Parcial»** y el tooltip a *«Sin certificado: la pensión queda retenida; el cruce y el seguro sí se
procesaron»*. Sin tocar el literal, sin cambio de contrato, y coordinado por el árbitro.

#### ⚠️ Precisión del 2026-09-04: `COMPLETA` es «nada retenido», no «hubo salida al banco»

La primera redacción decía *«`SOLO_CRUCE`: tiene préstamo y no tiene certificado»*. **Tomada al pie
de la letra es incorrecta**, y lo señaló el agente de backend al implementarla:

> Un jubilado **100 % cruzado** —la deuda se llevó toda la pensión— **no tiene remanente**. Le falte
> o no el certificado, **no había nada que sacar al banco**: el certificado nunca llegó a importar.

Marcarlo `SOLO_CRUCE` diría «hay plata retenida», y no la hay. **La definición correcta es por
retención, no por posesión del certificado**, y es la que sirve en pantalla: `SOLO_CRUCE` es
**accionable** —conseguí el certificado y ese dinero sale—, mientras que un 100 % cruzado no
requiere ninguna acción.

⛔ **El frontend NO debe deducir esto cruzando `tieneCertificado` / `montoADinero` / `montoACruzar`.**
Tres campos combinados a mano se rompen la primera vez que cambie una regla; un campo explícito no.
Lo pidió el agente de frontend y tiene razón.

**Sin certificado, sin préstamo Y SIN SEGURO → `BLOQUEADO`**: no hay cruce posible, no puede salir
dinero y no hay seguro que traspasar, así que no hay nada que hacer con esa pensión este mes.
**Con seguro médico sí participa** (§4ter): procesa el seguro y retiene la pensión → `SOLO_CRUCE`.

La validación va en el **backend**, dentro de `generarPagoIndividual`, después de resolver la cuenta.

**Y el prevuelo de la pantalla muestra lo mismo que hará el backend** — con los tres valores de
`participacion`, no con un binario listo/bloqueado.

- `BLOQUEADO` → no entra, no suma a ningún total, con su motivo en la fila.
- `SOLO_CRUCE` → **sí entra**: suma a «Total a préstamos» y/o a «Seguro a traspaso interno», y
  **nunca** a «Total a dinero».
- `COMPLETA` → suma a «Total a préstamos» y a «Total a dinero».

> **Nota histórica.** Este párrafo decía *«sin certificado el jubilado no entra en la corrida»*,
> citando al usuario el mismo 2026-09-04. Esa instrucción quedó **reemplazada** ese mismo día por la
> decisión de arriba, cuando se hizo evidente que chocaba con D2 del plan retroactivo. Se conserva
> la traza porque el frontend llegó a implementar el bloqueo total y hay que saber por qué cambia.

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
