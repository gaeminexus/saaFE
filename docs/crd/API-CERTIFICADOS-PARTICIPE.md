# Contrato de API — Certificados de partícipe

**Fecha:** 2026-08-29 · **Módulo:** CRD
**Estado:** ⛔ **CONGELADO** por el árbitro el 2026-08-29. Ningún agente lo cambia por su cuenta: si
algo no cuadra, se reporta `BLOQUEADA` al árbitro y se espera. Un cambio unilateral rompe al otro
agente en silencio — ya pasó dos veces en la ola anterior (`ContratoRest.porEntidad` y `estadoTexto`).

**DDL:** `sql/DDL-CERTIFICADOS-CREDITO.sql` (lo ejecuta el usuario, **antes** del WAR).
**Plantillas de origen:** `C:\Docs\Clientes\Asoprep\Creditos\Certificados\*.docx` (históricas: la
fuente citada en los 6 es siempre "sistema S.A.A.", decisión del usuario).

Application path real: `/SaaBE/rest`. Los errores de negocio llegan como **`422` con JSON
`{"mensaje": "..."}`** y los inesperados como `500 {"mensaje"}` (lo envuelve `MensajeErrorJsonFilter`)
— mostrar `mensaje`, nunca el JSON crudo.

---

## 1. Qué es esto, en una tabla

Seis certificados que hoy se emiten a mano en Word, con numeración llevada fuera del sistema. Pasan a
emitirse desde la opción **"Impresión de certificados"** de `participe-dash`.

| Tipo | Constante `CrdTipoCertificado` | Qué afirma | Lo variable | `.jrxml` |
|---|---|---|---|---|
| 1 | `AL_DIA_EN_OBLIGACIONES` | Es partícipe desde el año X y está al día | año desde | `RPRT_CRTF_ALDI` |
| 2 | `HABER_RECIBIDO_APORTES` | Se le liquidó jubilación patronal y su rendimiento el día X | fecha de liquidación | `RPRT_CRTF_APRT` |
| 3 | `NO_ADEUDAR_CREDITO` | El crédito *tipo* No. *N* está cancelado | préstamo elegido | `RPRT_CRTF_NOAD` |
| 4 | `NO_ADEUDAR_GLOBAL` | No adeuda nada al Fondo (todos sus créditos cancelados) | — | `RPRT_CRTF_NOAG` |
| 5 | `LICITUD_DE_FONDOS` | El valor $X depositado en la cuenta N del banco B es la devolución de su fondo | monto, concepto, cuenta, banco | `RPRT_CRTF_LCTD` |
| 6 | `APORTES_PATRONALES_SIN_JUBILACION` | Recibió aportes patronales de cesantía [y la cuenta de jubilación patronal no registra movimientos]; no recibe pensión mensual, con corte al X | 3 banderas + fecha de corte | `RPRT_CRTF_PTRN` |

Las tres cosas que no se negocian:

1. **Una sola serie de números por año, compartida entre los 6 tipos**, asignada por el backend al
   emitir. El frontend nunca manda ni muestra un número antes de que exista.
2. **Cada valor impreso lleva su origen**: lo resolvió el sistema, lo capturó el operador porque el
   sistema no lo tenía, o el sistema lo tenía y el operador lo corrigió. Se guarda con el certificado.
3. **El PDF emitido se guarda tal cual**. Reimprimir es descargar ese binario, no regenerar.

---

## 2. El flujo

```
1. GET  /rest/crtf/precarga/{idEntidad}/{tipo}[?idPrestamo=..&idLiquidacion=..]
       → el backend resuelve todo lo que puede, marca el origen de cada campo
         y lista los BLOQUEOS. Si hay bloqueos, no hay botón de emitir.
2. El operador completa lo MANUAL_REQUERIDO y corrige lo editable si hace falta.
3. POST /rest/crtf/emitir        (el mismo mapa de campos, ya completo)
       → el backend RE-VALIDA los bloqueos, recalcula los orígenes (no confía en los
         que manda el frontend), toma el número, llena el reporte, guarda el PDF y
         devuelve el certificado. Todo en una transacción: si el PDF falla, el número
         nunca existió.
4. GET  /rest/crtf/pdf/{idCertificado}   → application/pdf (para imprimir y reimprimir)
```

---

## 3. Endpoints

Todos cuelgan de `@Path("crtf")` (`com.saa.ws.rest.crd.CertificadoRest`).

### 3.1 Precarga

```
GET    /rest/crtf/precarga/{idEntidad}/{tipo}
       ?idPrestamo=N       // solo tipo 3: préstamo elegido. Sin él, la respuesta trae la lista
                           //   "prestamos" para elegir y el campo numeroCredito queda vacío.
       ?idLiquidacion=N    // solo tipos 2 y 5: fila de CRD.HPCS elegida cuando hay varias.
                           //   Sin él, el backend toma la más reciente y trae "liquidaciones".
       → PrecargaCertificado
```

```
PrecargaCertificado = {
    idEntidad, tipo, tipoTexto,              // el backend resuelve el catálogo, no el cliente
    nombre, cedula,                          // ENTD.ENTDRZNS / ENTDNMID, tal como están en la base
    calidadSistema,                          // ESPRCDEX propuesto desde ENTDIDST (1..9)
    calidadSistemaTexto,                     // "ACTIVO", "CESANTE", ...
    puedeEmitir,                             // boolean: bloqueos.length == 0 && ningún MANUAL_REQUERIDO sin valor
    bloqueos:      [ MotivoBloqueo ],        // vacío = no hay impedimento
    campos:        { clave: CampoCertificado },   // ver §4, las claves dependen del tipo
    prestamos:     [ PrestamoCertificado ],  // solo tipos 3 y 4; en los demás []
    liquidaciones: [ LiquidacionCertificado ] // solo tipos 2 y 5; en los demás []
}

CampoCertificado = {
    valor,            // String | Number | Boolean | null. Fechas como "yyyy-MM-dd"
    valorTexto,       // cómo se va a imprimir ("2005", "27 de octubre de 2020", "$145.728,15")
    origen,           // "SISTEMA" | "MANUAL_REQUERIDO" | "MANUAL_EDITADO"
    editable,         // false = el operador no lo puede tocar; el backend lo pisa si lo mandan
    fuente            // de dónde salió cuando es SISTEMA ("CRD.CNTR.CNTRFCIN", "CRD.HPCS #204", ...)
}

MotivoBloqueo = {
    codigo,           // estable, ver §5
    mensaje,          // accionable, listo para mostrar: "El préstamo Hipotecario No. 67023 está EN MORA"
    idPrestamo, numeroCredito, producto, estado, estadoTexto   // null cuando no aplica a un préstamo
}

PrestamoCertificado = {
    idPrestamo,       // PRST.PRSTCDGO — es lo que se manda en idPrestamo
    numeroCredito,    // PRSTIDAS, o PRSTCDGO si no tiene (préstamos nacidos en S.A.A.)
    producto,         // PRDC.PRDCNMBR ("EMERGENTE")
    productoTexto,    // como se imprime: "Crédito Emergente"
    fecha,            // PRSTFCHA, yyyy-MM-dd
    estado, estadoTexto,   // PRSTIDST y su nombre
    cancelado         // boolean: PRSTIDST IN (3, 4, 5)
}

LiquidacionCertificado = {
    idLiquidacion,    // HPCS.HPCSCDGO — es lo que se manda en idLiquidacion
    fechaPago,        // yyyy-MM-dd
    tipo,             // "J", "C", "JP", "CP", "JRV", "CRV" (ya normalizado a mayúsculas)
    tipoTexto,        // "Jubilación retiro voluntario", ...
    valor,
    observacion
}
```

### 3.2 Emisión

```
POST   /rest/crtf/emitir
       body: SolicitudEmisionCertificado
       → ResultadoEmisionCertificado                        (200)
       → 422 { mensaje }   si hay un bloqueo o falta un MANUAL_REQUERIDO (§5)
       → 500 { mensaje }   si falló el reporte o la base — nada quedó grabado, ningún número consumido

SolicitudEmisionCertificado = {
    idEntidad, tipo,
    idPrestamo,                   // obligatorio en el tipo 3; ignorado en los demás
    idLiquidacion,                // opcional en 2 y 5: la fila de HPCS que se usó en la precarga
    calidad,                      // ESPRCDEX que se va a imprimir (el propuesto o el corregido)
    campos: { clave: valor },     // SOLO el valor por clave (no el CampoCertificado entero)
    usuario                       // obligatorio
}

ResultadoEmisionCertificado = {
    idCertificado, numero, anio,
    numeroAlterno,                // "ASOPREP-FCPC-PARTICIPE-099-2026"
    fechaEmision,                 // yyyy-MM-dd
    tipo, tipoTexto,
    calidad, calidadTexto,
    campos: { clave: CampoCertificado },   // lo que efectivamente se imprimió, con el origen FINAL
    urlPdf                        // "/rest/crtf/pdf/{idCertificado}"
}
```

Lo que hace el backend con `campos` al emitir, clave por clave:

| El sistema lo resolvió | El operador mandó | Origen final |
|---|---|---|
| sí | el mismo valor o nada | `SISTEMA` |
| sí | otro valor, y el campo es editable | `MANUAL_EDITADO` |
| sí | otro valor, y el campo NO es editable | se ignora lo mandado, `SISTEMA` |
| no | un valor | `MANUAL_REQUERIDO` |
| no | nada | **422**, no se emite |

`calidad` sigue la misma regla: si es distinta de `calidadSistema` queda `MANUAL_EDITADO` en el
snapshot y en `CRTFCLDD` va lo impreso. El snapshot (`CRTFDTOS`) es exactamente el objeto `campos`
del resultado más `calidad`, `firmante`, `cargo`, `ciudad` y `fuenteDatos`.

### 3.3 Consulta y reimpresión (ya implementados)

```
GET    /rest/crtf/getByEntidad/{idEntidad}   → [ Certificado ]   // sin el PDF; más reciente primero; incluye anulados
GET    /rest/crtf/getByAnio/{anio}           → [ Certificado ]   // la serie completa del año, por número
GET    /rest/crtf/pdf/{idCertificado}        → application/pdf, Content-Disposition inline; filename="<numeroAlterno>.pdf"
                                             → 404 { mensaje } si no existe
POST   /rest/crtf/anular/{idCertificado}?motivo=X&usuario=Y
                                             → Certificado (estado 2)
                                             → 422 { mensaje } si ya estaba anulado o falta el motivo
```

`Certificado` (entidad, tal como la serializa Jackson): `codigo, anio, numero, numeroAlterno,
tipoCertificado, entidad {codigo, razonSocial, numeroIdentificacion, …}, prestamo (null salvo tipo 3),
calidad, fechaEmision [aaaa,m,d], usuarioEmision, datos (String JSON), estado, usuarioAnulacion,
fechaAnulacion, motivoAnulacion, fechaRegistro`. **`pdf` no viaja** (`@JsonIgnore`).

---

## 4. Claves de `campos` por tipo

Comunes a los 6 (nunca editables, siempre `SISTEMA`):

| Clave | Valor | Fuente |
|---|---|---|
| `firmante` | "Lic. Gabriel Patricio Robayo Rueda" | rubro 243 alt 1 |
| `cargo` | "Jefe de Crédito" | rubro 243 alt 2 |
| `ciudad` | "Quito" | rubro 243 alt 3 |
| `fuenteDatos` | "sistema S.A.A." | fijo |

Por tipo. **E** = editable por el operador. El texto de `valorTexto` es el que va al papel.

**Tipo 1 — al día**

| Clave | Tipo | E | Cómo lo resuelve el sistema |
|---|---|---|---|
| `anioDesde` | Number | sí | `CRD.CNTR.CNTRFCIN` del contrato de adhesión; si no hay, primer periodo con aporte (`MIN(NVL(APRTPRDV, TRUNC(APRTFCTR,'MM')))` de tipos 9/11); si tampoco, `MANUAL_REQUERIDO` |

**Tipo 2 — haber recibido aportes**

| Clave | Tipo | E | Cómo lo resuelve el sistema |
|---|---|---|---|
| `fechaLiquidacion` | "yyyy-MM-dd" | sí | `CRD.HPCS.HPCSFCHP` de la liquidación elegida (`idLiquidacion`) o la más reciente de tipo `JP`/`CP`; sin filas → `MANUAL_REQUERIDO`. HPCS solo tiene datos desde 2024: para la mayoría de los cesantes históricos será manual |

**Tipo 3 — no adeudar, un crédito** (requiere `idPrestamo`)

| Clave | Tipo | E | Cómo lo resuelve el sistema |
|---|---|---|---|
| `numeroCredito` | Number | no | `PRSTIDAS`, o `PRSTCDGO` si es nulo |
| `productoTexto` | String | no | "Crédito " + `PRDCNMBR` en formato título |

**Tipo 4 — no adeudar, global**: sin campos propios. Un partícipe **sin ningún préstamo** puede
emitirlo (no adeuda nada).

**Tipo 5 — licitud de fondos**

| Clave | Tipo | E | Cómo lo resuelve el sistema |
|---|---|---|---|
| `monto` | Number | sí | `HPCS.HPCSVLRR` de la liquidación elegida o la más reciente (cualquier tipo); sin filas → `MANUAL_REQUERIDO` |
| `fechaPago` | "yyyy-MM-dd" | sí | `HPCS.HPCSFCHP` de esa fila |
| `conceptoDevolucion` | String | sí | por `HPCSTIPC`: `JRV` → "fondo de jubilación retiro voluntario", `CRV` → "fondo de cesantía retiro voluntario", `J`/`JP` → "fondo de jubilación", `C`/`CP` → "fondo de cesantía" |
| `tipoCuenta` | Number 1/2 | sí | `CRD.CNBP` activa del partícipe (`CNBPTPCN`: 1 corriente, 2 ahorros); si tiene varias, la de menor código; sin cuenta → `MANUAL_REQUERIDO` |
| `numeroCuenta` | String | sí | `CNBP.CNBPNMRO` |
| `banco` | String | sí | `TSR.BEXT.BEXTNMBR` de esa cuenta |

**Tipo 6 — aportes patronales sin jubilación mensual**

| Clave | Tipo | E | Cómo lo resuelve el sistema |
|---|---|---|---|
| `recibioCesantiaPatronal` | Boolean | sí | `EXISTS CRD.APRT` con `TPAPCDGO IN (14, 16)`. Siempre resuelto (`true`/`false`); el operador puede corregirlo (medido: solo 338 de 3.351 cesantes lo tienen en S.A.A.) |
| `jubilacionPatronalSinMovimientos` | Boolean | sí | `NOT EXISTS CRD.APRT` con `TPAPCDGO IN (13, 15)`. Decide si el `.jrxml` imprime "y la cuenta jubilación patronal no registra movimientos". Sale de los datos **por defecto**; misma fuente débil que la fila anterior, así que el operador puede corregirlo y queda `MANUAL_EDITADO` (más auditable que dos documentos separados) |
| `recibePensionMensual` | Boolean | sí | `EXISTS CRD.APRT` con `TPAPCDGO = 23` o fila en `CRD.HPPJ` por cédula. Si es `true`, el certificado **no se puede emitir** (bloqueo `RECIBE_PENSION`) |
| `fechaCortePension` | "yyyy-MM-dd" | sí | **Siempre `MANUAL_REQUERIDO`**: no existe en ninguna tabla |

---

## 5. Bloqueos y errores (códigos estables)

Los bloqueos salen en `precarga.bloqueos` y **se vuelven a evaluar en `emitir`**: un POST directo con
un bloqueo vigente recibe `422` con el mismo `mensaje`. El frontend no puede saltárselos y el backend
no confía en que los respetó.

| Código | Tipos | Cuándo | `mensaje` (ejemplo) |
|---|---|---|---|
| `PRESTAMO_EN_MORA` | 1, 4 | un préstamo del partícipe con `PRSTIDST IN (8, 11)` (uno por préstamo) | "El préstamo Hipotecario No. 67023 está EN MORA" |
| `CUOTA_VENCIDA` | 1 | un préstamo VIGENTE (`PRSTIDST = 2`) con cuotas impagas cuya **fecha de vencimiento ya pasó**: `DetallePrestamoDaoService.selectCuotasVencidasByPrestamo(idPrestamo, hoy 00:00)`, el mismo criterio del proceso diario de mora (una cuota que vence hoy todavía no está vencida). **No por `DTPRESTD`**: medido en Fase 1, ningún vigente tiene cuotas en 5/8 — la mora vive en la cabecera, y ese filtro daría siempre cero. Cubre el préstamo que venció y el proceso de las 02:00 todavía no reclasificó | "El préstamo Emergente No. 70463 tiene 2 cuotas vencidas" |
| `PARTICIPE_EN_MORA` | 1 | `ENTDIDST = 8` (ACTIVO EN MORA) | "El partícipe está marcado ACTIVO EN MORA por falta de aportes" |
| `PRESTAMO_NO_CANCELADO` | 3, 4 | el préstamo (3) o alguno (4) con `PRSTIDST NOT IN (3, 4, 5)` | "El préstamo Emergente No. 70463 está VIGENTE, no cancelado" |

**Un solo motivo por préstamo**, el más específico: en el tipo 4 un préstamo en 8/11 sale como
`PRESTAMO_EN_MORA` (no además como `PRESTAMO_NO_CANCELADO`), y uno en 9 sale solo como
`PRESTAMO_POR_REVISAR`.
| `PRESTAMO_POR_REVISAR` | 3, 4 | `PRSTIDST = 9` (CANCELADO POR REVISAR): **no cuenta como cancelado**, alguien lo revisa primero | "El préstamo Emergente No. 65813 está CANCELADO POR REVISAR: debe revisarse antes de certificar" |
| `PRESTAMO_NO_PERTENECE` | 3 | `idPrestamo` no es del partícipe | — |
| `RECIBE_PENSION` | 6 | `recibePensionMensual = true` | "El partícipe registra pagos de pensión complementaria: no se puede certificar que no la recibe" |

No son bloqueos sino errores de la solicitud (`422`): `PARAMETRO_INVALIDO` (falta `usuario`, `tipo`
desconocido, `idPrestamo` ausente en tipo 3), `ENTIDAD_NO_ENCONTRADA`, `CAMPO_REQUERIDO` ("Falta
capturar: fechaCortePension"), `CALIDAD_INVALIDA` (no está en 1..9).

Con la regla "al día" (a)+(b)+(c) **el bloqueo es total**: no hay "emitir con advertencia". El
operador ve qué préstamo y en qué estado, y corrige en el módulo que corresponda.

---

## 6. Reglas que el frontend NO puede romper

- **Los tres orígenes se ven distintos**, sin excepción y sin leyenda escondida: `SISTEMA` (el
  sistema lo afirma), `MANUAL_REQUERIDO` (el sistema no lo sabía; el operador lo afirma) y
  `MANUAL_EDITADO` (el sistema lo sabía y el operador lo cambió). Es un requisito del usuario: el que
  firma tiene que ver qué está afirmando por su cuenta. Un campo `MANUAL_REQUERIDO` vacío deshabilita
  el botón de emitir y se marca como faltante.
- **`editable: false` es de solo lectura.** No se manda de vuelta; si se manda, el backend lo pisa.
- **`bloqueos` no vacío = sin botón de emitir**, y **los motivos a la vista** con su préstamo y estado.
  Un botón muerto sin explicación es un defecto, no una validación.
- **La calidad se propone, no se impone**: mostrar `calidadSistemaTexto` como valor inicial de un
  selector con las tres palabras del certificado (partícipe / partícipe cesante / partícipe jubilado
  ← alternos 1,8,9 / 2,4,5 / 3,6,7). Si el operador cambia, se manda el alterno elegido y en la
  respuesta viene `MANUAL_EDITADO`. Los dos ejemplos reales "jubilados" están como CESANTE en la base.
- **Tipo 3: primero elegir el préstamo** de `prestamos` (mostrar `numeroCredito`, `productoTexto`,
  `estadoTexto`; los no cancelados se ven pero no se pueden elegir), después pedir la precarga con
  `idPrestamo`.
- **Tipos 2 y 5 con varias `liquidaciones`**: mostrarlas y dejar elegir; la precarga ya viene con la
  más reciente aplicada.
- **El número no existe hasta que `emitir` responde.** No mostrar "próximo número", no reservar.
- **Después de emitir, abrir `urlPdf`** (inline). Reimprimir = la misma URL desde el listado de
  `getByEntidad`; un anulado se puede reimprimir y se muestra como anulado.
- **Fechas hacia el backend:** `yyyy-MM-dd` siempre. Nunca un `Date` crudo ni nada terminado en `Z`.
  Desde el backend, normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`.
- **Montos** con 2 decimales y separador de miles al mostrar; hacia el backend, número plano.
- **La pantalla puede ofrecer 6 opciones** (las que el usuario espera ver) aunque los tipos 6 y el
  antiguo "5" sean la misma plantilla: el backend ya no distingue, es un solo tipo 6.

---

## 7. Protocolo de reporte

Cada agente reporta **al terminar cada pieza**, sin esperar a las demás:

```
PIEZA <n> — <BACKEND|FRONTEND> — <COMPLETADA | BLOQUEADA | COMPLETADA CON DESVÍOS>
Archivos tocados:      <lista>
Qué quedó funcionando: <2-4 líneas>
Desvíos del contrato:  <qué se hizo distinto y por qué; "ninguno" si no hubo>
Hallazgos:             <lo que se encontró y el contrato no contemplaba>
Impacto en el otro:    <si algo obliga a cambiar este contrato>
Pendiente:             <lo que no se hizo y por qué>
```

El backend **no compila ni despliega** (lo hace el usuario en Eclipse): reporta el código escrito, no
resultados de compilación. Los `.jrxml` se entregan **sin `.jasper`**: los compila el usuario con
Jaspersoft Studio 7.0.3 y sin ellos el reporte revienta al primer uso (ver CLAUDE.md, Reportes).
