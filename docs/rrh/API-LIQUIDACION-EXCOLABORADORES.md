# Liquidaciones de ex-colaboradores de la administración anterior — diseño y contrato de API

**Equipo:** `omen-saa-3` · **Escrito:** 2026-09-30 · **Módulos:** `rhh` (backend y pantalla), un origen nuevo en `cxp` (bandeja de pagos)
**Espejo en el frontend:** `saaFE/docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md` (tiene que ser idéntico a este)

## 1. Qué se pidió

> *«Una pantalla que permita ingresar y pagar las liquidaciones y generar las actas de finiquito de
> empleados que dejaron de trabajar antes de enero de 2026 y recién están cobrando. No se los debe
> crear como colaboradores: son ex colaboradores de la anterior administración. Se debe registrar
> todo, generar la contabilidad, pagar y generar el acta. Si el pago se realizó en este año, ese
> pago también sale en el RDEP.»* — usuario, 2026-09-30

### Decisiones del usuario (2026-09-30), no re-litigar

| # | Pregunta | Decisión |
|---|---|---|
| D1 | ¿El sistema calcula la liquidación? | **No.** Los valores ya están calculados; se **ingresan** concepto por concepto |
| D2 | ¿La deuda ya está en libros? | **Sí.** Al pagar se debita la cuenta por pagar existente; **no hay gasto nuevo** ni asiento al registrar |
| D3 | ¿Cómo se paga? | **Por Tesorería**: bandeja de aprobación, transferencia, cheque o débito, y el asiento del pago sale al confirmar |

### Decisiones del árbitro, reversibles si el usuario pide otra cosa

- **D4. Una sola cuenta por liquidación.** El pago debita el **neto** contra **un** producto de pago
  (`PGS.PRDP`), cuyo grupo (`PGS.GRPP`) apunta a la cuenta por pagar donde está la deuda. El contador
  crea ese grupo y ese producto en *CxP → Parametrización → Grupos de productos*, sin programar.
  **Por qué no una cuenta por concepto:** el asiento de Tesorería (`contabilizarPagoOrigenExterno`)
  sólo arma líneas DEBE contra el banco. Los descuentos (aporte personal, retención) no tienen dónde ir
  sin ampliar ese motor, que es compartido. Con la deuda neta ya en libros (D2), una sola cuenta alcanza.
- **D5. Los tipos de concepto y los estados son constantes Java**, no catálogo `Rubro`. No consumen
  `PRBR`/`PDTR`: es el precedente de `CRD.USAP` (`EstadoUsuarioApp`). El frontend usa la misma lista (§5).
- **D6. Sin FK de base de datos hacia otros esquemas.** El banco (`TSR.BEXT`) y el producto de pago
  (`PGS.PRDP`) son columnas numéricas con su `@ManyToOne` en JPA, sin `FOREIGN KEY`. Una FK entre
  esquemas exige `GRANT REFERENCES`, y un `GRANT` comentado ya hizo fallar scripts en silencio
  (`ESTADO-EQUIPO-OMEN-2.md` §27). Dentro de `RHH` y hacia `SCP.PJRQ` sí hay FK: `RHH.FMBN` ya la tiene.
- **D7. Sólo salidas anteriores a 2026.** El servicio rechaza una fecha de salida posterior o igual al
  2026-01-01. La liquidación de un colaborador actual se hace con la liquidación de haberes normal (`/lqdc`).

## 2. Por qué no sirve lo que ya existe

- `RHH.LQDC` exige `MPLDCDGO` y `CNTECDGO` NOT NULL (`model/rhh/Liquidacion.java:45,52`): no se puede
  grabar sin crear al ex-empleado como colaborador, y el usuario lo descartó.
- El acta actual `rep/rhh/RPRT_ACTA_FNQT.jrxml` lee `RHH.LQDC` con **INNER JOIN** `RHH.MPLD`.
- El RDEP (`GeneracionSalidasOficialesServiceImpl.generarRdep:72`) sale **sólo** de `RHH.ACMN`, que
  tiene FK a `MPLD`.
- Hoy **ninguna** liquidación se paga por Tesorería: no existe un origen `RHH_LIQUID*`, y el estado
  PAGADA (5) de `LQDC` no lo escribe nadie. Es un hueco de la liquidación normal y **no se toca en este
  frente**. Queda registrado aparte (§9).

## 3. Modelo de datos — `rhh/sql/e3-05-ddl-liquidacion-excolaboradores.sql`

**El SQL va antes del WAR**: las dos entidades mapean tablas nuevas.

### `RHH.LQEX` — cabecera, una por ex-colaborador y liquidación

| Columna | Tipo | Nulo | Java (`LiquidacionExterna`) | Qué es |
|---|---|---|---|---|
| `LQEXCDGO` | NUMBER identity | PK | `Long codigo` | |
| `PJRQCDGO` | NUMBER | NO | `Empresa empresa` (FK `SCP.PJRQ`) | |
| `LQEXTPID` | VARCHAR2(1) | NO | `String tipoIdentificacion` | `C` cédula · `P` pasaporte (CHECK) |
| `LQEXIDNT` | VARCHAR2(20) | NO | `String identificacion` | Sin espacios (el servicio hace trim) |
| `LQEXAPLL` | VARCHAR2(100) | NO | `String apellidos` | En mayúsculas |
| `LQEXNMBR` | VARCHAR2(100) | NO | `String nombres` | En mayúsculas |
| `LQEXCRGO` | VARCHAR2(150) | sí | `String cargo` | Texto libre |
| `LQEXFCIN` | DATE | sí | `LocalDate fechaIngreso` | |
| `LQEXFCSL` | DATE | NO | `LocalDate fechaSalida` | **< 2026-01-01** (D7) |
| `LQEXCSTR` | NUMBER | sí | `CausalTerminacion causalTerminacion` (FK `RHH.CSTR`) | |
| `LQEXULRM` | NUMBER(18,2) | sí | `Double ultimaRemuneracion` | Informativo, para el acta |
| `LQEXTTIN` | NUMBER(18,2) | NO | `Double totalIngresos` | **Lo calcula el servidor** |
| `LQEXTTDS` | NUMBER(18,2) | NO | `Double totalDescuentos` | **Lo calcula el servidor** |
| `LQEXNETO` | NUMBER(18,2) | NO | `Double neto` | **Lo calcula el servidor**; CHECK > 0 |
| `LQEXPRDP` | NUMBER | NO | `ProductoPago productoPago` (sin FK, D6) | La cuenta por pagar que se debita (D4) |
| `LQEXBEXT` | NUMBER | sí | `BancoExterno banco` (sin FK, D6) | Banco del ex-colaborador |
| `LQEXTPCT` | NUMBER | sí | `Long tipoCuenta` | Alterno del rubro 23: 1 ahorro · 2 corriente |
| `LQEXNMCT` | VARCHAR2(30) | sí | `String numeroCuenta` | |
| `LQEXESTD` | NUMBER | NO | `Long estado` | §5.2 (CHECK 1-4) |
| `LQEXPGTR` | NUMBER | sí | `Long idPago` | `PGS.PGTR` en Tesorería (sin FK) |
| `LQEXASNT` | NUMBER | sí | `Long idAsiento` | El asiento del pago, copiado del pago confirmado |
| `LQEXFCPG` | DATE | sí | `LocalDate fechaPago` | Fecha real del pago = `PagoProgramado.fechaRespuesta`. **Decide el año del RDEP** |
| `LQEXOBSR` | VARCHAR2(500) | sí | `String observacion` | |
| `LQEXMTAN` | VARCHAR2(300) | sí | `String motivoAnulacion` | |
| `LQEXFCHR` | TIMESTAMP | sí | `LocalDateTime fechaRegistro` | **La sella el servidor.** JPA manda null y el DEFAULT no se aplica |
| `LQEXUSRR` | VARCHAR2(60) | sí | `String usuarioRegistro` | |

### `RHH.DLEX` — conceptos de la liquidación

| Columna | Tipo | Nulo | Java (`DetalleLiquidacionExterna`) | Qué es |
|---|---|---|---|---|
| `DLEXCDGO` | NUMBER identity | PK | `Long codigo` | |
| `LQEXCDGO` | NUMBER | NO | `LiquidacionExterna liquidacion` (FK) | Mismo patrón de serialización que `DetalleLiquidacion` → `Liquidacion`. Verificar que no haga ciclo en Jackson |
| `DLEXTPCN` | NUMBER | NO | `Long tipoConcepto` | §5.1 (CHECK) |
| `DLEXDSCR` | VARCHAR2(200) | sí | `String descripcion` | Opcional. Si viene vacía, el acta usa el nombre del tipo |
| `DLEXVLOR` | NUMBER(18,2) | NO | `Double valor` | **Siempre positivo** (CHECK > 0). El signo lo da el tipo |
| `DLEXORDN` | NUMBER | sí | `Long orden` | |
| `DLEXFCHR` | TIMESTAMP | sí | `LocalDateTime fechaRegistro` | La sella el servidor |
| `DLEXUSRR` | VARCHAR2(60) | sí | `String usuarioRegistro` | |

## 4. El circuito

```
REGISTRADA ──enviarATesoreria──> EN_TESORERIA ──(Tesorería aprueba y confirma)──> sincronizarPago ──> PAGADA
    │  editable                       │                                                         (fecha, asiento)
    └──anular──> ANULADA <──anular────┘ (sólo si el pago sigue POR_APROBAR: se anula también en Tesorería)
```

- **Registrar** no genera asiento (D2). Sólo guarda.
- **Enviar a Tesorería** llama `pagoProgramadoService.registrarPagoDeOrigenExterno` con:
  - `origen` = `OrigenPagoExterno.RHH_LIQUIDACION_EXCOLABORADOR` (constante nueva, texto `"RHH_LIQ_EXCOLABORADOR"`, 21 caracteres; `PGTRORGN` admite 30);
  - `idOrigen` = `LQEXCDGO`; `valor` = `neto`; `fechaProgramada` = hoy;
  - `BeneficiarioOcasional` con nombre, identificación, banco, tipo de cuenta y número. Con los datos
    bancarios completos, Tesorería puede aprobarlo por transferencia; sin ellos, sólo por cheque (la
    guarda de `aprobar` lo exige, `PagoProgramadoServiceImpl:~1437`);
  - `desglose` = **una** `LineaContablePago` `{idProductoPago: productoPago, valor: neto, concepto: "Liquidación <apellidos nombres> - administración anterior"}`.
    Con el desglose, **Tesorería genera el asiento al confirmar**: DEBE la cuenta del grupo del producto, HABER el banco;
  - `observacion` = el mismo texto; `idUsuario` = el que manda el frontend.
  - Graba `idPago` y pasa a EN_TESORERIA. **Idempotente:** si ya existe un pago vigente de este origen
    y este id (`selectVigentesByOrigen`), no crea otro.
- **Sincronizar pago:** busca el pago y, si está CONFIRMADO, copia `fechaPago` = `fechaRespuesta` e
  `idAsiento` = el asiento del pago, y pasa a PAGADA. Si Tesorería lo rechazó o anuló, vuelve a
  REGISTRADA con `idPago` = null, para poder corregir y reenviar. `getAll` y `selectByCriteria`
  sincronizan antes de devolver, sin timer (precedente: `sincronizarDevoluciones` de CxC).
- **Anular:** en REGISTRADA pasa directo; en EN_TESORERIA, sólo si el pago sigue POR_APROBAR (lo anula
  en Tesorería con el método que ya usa `OrdenBeneficioSocialServiceImpl.anular`). Una PAGADA no se
  anula acá: se revierte el pago en Tesorería, y queda fuera de este frente.
- El origen nuevo se registra en los **tres mapas** de `PagoProgramadoServiceImpl:~3937-3992`: el
  resolutor de seguimiento, la ruta (`/menurecursoshumanos/procesos/liquidaciones-excolaboradores`) y
  la etiqueta (`Liquidación ex-colaborador`). ⚠️ `PagoProgramadoServiceImpl` es de `cxp`, y lo toca
  también `omen-saa-2`: el cambio es **sólo aditivo** en esos tres mapas.

## 5. Constantes

### 5.1 Tipo de concepto — `com.saa.rubros.RhhConceptoLiquidacionExterna`

| Código | Nombre | Clase | Gravado IR (RDEP) |
|---|---|---|---|
| 1 | Remuneración pendiente | Ingreso | Sí |
| 2 | Décimo tercer sueldo | Ingreso | No |
| 3 | Décimo cuarto sueldo | Ingreso | No |
| 4 | Vacaciones no gozadas | Ingreso | Sí |
| 5 | Fondos de reserva | Ingreso | No |
| 6 | Bonificación por desahucio | Ingreso | No |
| 7 | Indemnización por despido | Ingreso | No |
| 8 | Otro ingreso gravado | Ingreso | Sí |
| 9 | Otro ingreso no gravado | Ingreso | No |
| 20 | Aporte personal IESS | Descuento | → `aportePersonal` del RDEP |
| 21 | Retención de impuesto a la renta | Descuento | → `retencion` del RDEP |
| 22 | Préstamo o anticipo | Descuento | No va al RDEP |
| 23 | Otro descuento | Descuento | No va al RDEP |

Ingreso = 1 a 9, descuento = 20 a 23. `totalIngresos` = suma de los ingresos, `totalDescuentos` =
suma de los descuentos, `neto` = la diferencia, **redondeados a 2 decimales en el servidor**. Lo que
mande el frontend en esos tres campos se ignora.

> ⚠️ **Supuesto para confirmar con el contador:** la columna «Gravado IR» sigue la regla general (los
> décimos, los fondos de reserva, el desahucio y la indemnización no se gravan). Si un caso se aparta,
> se registra con el tipo 8 o el 9, sin tocar código.

### 5.2 Estado — `com.saa.rubros.RhhEstadoLiquidacionExterna`

`1 REGISTRADA` · `2 EN_TESORERIA` · `3 PAGADA` · `4 ANULADA`

## 6. Endpoints — `@Path("lqex")`, URL real `/SaaBE/rest/lqex/...`

El estilo de error es el de la casa: 500 con el texto del `IncomeException`. El frontend lo lee con
`mensajeDeError` (`REGISTRO-RESERVAS-EQUIPOS.md` §8.3).

| Método y ruta | Cuerpo | Respuesta 200 | Reglas |
|---|---|---|---|
| `GET /lqex/getAll` | — | `LiquidacionExterna[]` | Sincroniza los pagos EN_TESORERIA antes de devolver |
| `GET /lqex/getId/{id}` | — | `LiquidacionExterna` | |
| `POST /lqex/selectByCriteria` | `DatosBusqueda[]` | `LiquidacionExterna[]` | Estándar, con sincronización. **Sin resultados = `[]` con 200, no 500** |
| `GET /lqex/detalle/{id}` | — | `DetalleLiquidacionExterna[]` | Ordenado por `orden` y luego `codigo` |
| `POST /lqex/registrar` | `{liquidacion: {...}, detalles: [...]}` | `LiquidacionExterna` | Crea la cabecera y los detalles en **una** transacción. Estado 1 |
| `PUT /lqex/actualizar` | igual, con `liquidacion.codigo` | `LiquidacionExterna` | Sólo en REGISTRADA. **Reemplaza** todos los detalles |
| `POST /lqex/enviarATesoreria/{id}` | `{idUsuario}` | `{liquidacion, idPago}` | Sólo desde REGISTRADA. §4 |
| `POST /lqex/sincronizarPago/{id}` | — | `LiquidacionExterna` | §4 |
| `POST /lqex/anular/{id}` | `{idUsuario, motivo}` | `LiquidacionExterna` | Motivo obligatorio. §4 |

**Cuerpo de `registrar`, exacto** (fechas `yyyy-MM-dd`, nunca un `Date` crudo ni nada terminado en `Z`):

```json
{
  "liquidacion": {
    "empresa": {"codigo": 1},
    "tipoIdentificacion": "C",
    "identificacion": "1712345678",
    "apellidos": "PEREZ LOPEZ",
    "nombres": "JUAN CARLOS",
    "cargo": "ASISTENTE CONTABLE",
    "fechaIngreso": "2019-03-01",
    "fechaSalida": "2025-11-30",
    "causalTerminacion": {"codigo": 3},
    "ultimaRemuneracion": 850.00,
    "productoPago": {"id": 57},
    "banco": {"codigo": 10},
    "tipoCuenta": 1,
    "numeroCuenta": "2200123456",
    "observacion": "Acta de la administración anterior",
    "usuarioRegistro": "JCEVALLOS"
  },
  "detalles": [
    {"tipoConcepto": 1,  "descripcion": "Sueldo de noviembre 2025", "valor": 850.00, "orden": 1},
    {"tipoConcepto": 4,  "valor": 425.00, "orden": 2},
    {"tipoConcepto": 20, "valor": 119.00, "orden": 3}
  ]
}
```

⚠️ **Nombres de la clave de identidad, verificados contra las entidades el 2026-09-30:**
`ProductoPago` se identifica por **`id`** (`model/cxp/ProductoPago.java:48`), no por `codigo`.
`BancoExterno`, `CausalTerminacion` y `Empresa` se identifican por **`codigo`**.

**Validaciones de `registrar` y `actualizar`** (400 no: el estilo de la casa es 500 con este texto):

- Identificación: `C` → 10 dígitos; `P` → de 5 a 15 caracteres alfanuméricos. «La identificación no es válida para el tipo indicado.»
- Apellidos, nombres, fecha de salida y producto de pago: obligatorios, cada uno con su mensaje.
- Fecha de salida ≥ 2026-01-01 → «Esta pantalla es sólo para salidas anteriores a 2026. Use la liquidación de haberes.»
- Al menos un ingreso; cada valor > 0; tipos dentro de §5.1; neto > 0 → «El neto a pagar debe ser mayor que cero.»
- Otra liquidación no ANULADA con la misma identificación → «Ya existe la liquidación N.º <código> para esta identificación.»
- Datos bancarios: o los tres (banco, tipo, número) o ninguno. Si faltan, se graba igual y la
  respuesta lo dice en `observacion`; no se bloquea (se puede pagar con cheque).

## 7. Acta de finiquito — `rep/rhh/RPRT_ACTA_FNQT_EXCL.jrxml`

- Copia del layout de `RPRT_ACTA_FNQT.jrxml` (mismas secciones y firmas), pero lee `RHH.LQEX` +
  `RHH.DLEX` + `LEFT JOIN RHH.CSTR`. Parámetros: `P_LQEX_CODIGO` (Long), `P_IMAGEN`, `P_USUARIO`.
- Columnas **explícitas**, sin `SELECT *` (regla de `CLAUDE.md`). El nombre del concepto se resuelve
  con un `CASE` sobre `DLEXTPCN` con los textos de §5.1, o con `DLEXDSCR` si viene.
- Sintaxis **compacta**. Compilar con `compilar-jasper.bat <ruta>` Y pasar
  `verificar-fill-jasper.bat <ruta-al-jasper>`: los dos, y commitear el `.jrxml` con su `.jasper`.
- Se genera con el endpoint general `POST /rest/rprt/generar`
  `{modulo:"rhh", nombreReporte:"RPRT_ACTA_FNQT_EXCL", formato:"PDF", parametros:{P_LQEX_CODIGO:<id>}}`.
  Disponible en cualquier estado salvo ANULADA.

## 8. RDEP

`generarRdep(anio)` agrega, además de lo que ya sale de `ACMN`, cada `LQEX` en estado PAGADA cuyo
**`fechaPago` cae en `anio`**:

- `ingresoGravado` = suma de los conceptos con «Gravado IR = Sí» (tipos 1, 4 y 8);
- `aportePersonal` = tipo 20; `retencion` = tipo 21;
- identificación, apellidos y nombres, los de `LQEX`.
- **Si la misma identificación ya sale por `ACMN`** (un ex-colaborador recontratado), se **suman** a
  ese mismo `<empleado>`; no se duplica la persona.
- El formato del XML no cambia: el mismo `<empleado>` de hoy.

## 9. Fuera de este frente, registrado para que no se pierda

- **La liquidación de haberes normal (`LQDC`) tampoco se paga por Tesorería.** La cuenta 70
  `LIQUIDACIONES_POR_PAGAR` se acredita y nada la debita. Es el mismo circuito que éste, sobre otra tabla.
- **`contabilizarLiquidacion` manda todos los EGRESO, incluido el aporte personal IESS, a la línea 14
  `CUENTAS_POR_COBRAR_EMPLEADOS`** (`ContabilizacionNominaServiceImpl:655-658`), no a IESS por pagar.
  A revisar con el contador.
- **El finiquito escribe sus acumulados del RDEP con el año de la fecha de SALIDA, no del pago**
  (`LiquidacionHaberesServiceImpl:898`), y traga el error en silencio (`:932`).
- **El RDEP de hoy no es el XML del SRI**: es un XML propio con tres montos
  (`GeneracionSalidasOficialesServiceImpl:99-126`).
