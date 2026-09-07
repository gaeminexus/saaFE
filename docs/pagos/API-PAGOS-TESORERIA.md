# Contrato de API — circuito de pagos (solicitud en CxP, ejecución en Tesorería)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Verificado contra el código**, no contra docs
previos.

**Base:** `/SaaBE/rest/pgtr` — ⛔ **no** `/api/...`, que es lo que dicen varios documentos viejos del
repositorio. El application path de JAX-RS es `/rest` (`com.saa.ws.rest.ApplicationConfig`).

Diseño del frente: [`PLAN-REORGANIZACION-CIRCUITO-PAGOS.md`](PLAN-REORGANIZACION-CIRCUITO-PAGOS.md).
Formato de los archivos: [`FORMATO-ARCHIVO-BANCOS.md`](FORMATO-ARCHIVO-BANCOS.md).

> **Los endpoints NO cambian de ruta con esta reorganización.** El REST ya era `/pgtr` (código de
> tabla, no de módulo). Lo único que cambia en el contrato es §3: el archivo del lote ahora puede
> ser binario.

---

## 0. Estados de un pago (`PGS.PGTR.PGTRESTD`)

| Valor | Estado | Quién lo pone |
|---|---|---|
| **0** | `POR_APROBAR` | Nace así cuando se registra **sin** cuenta de origen. Es el flujo normal |
| **1** | `REGISTRADO` | Tesorería aprobó y eligió transferencia |
| **2** | `EN_ARCHIVO` | Incluido en un lote/archivo enviado al banco |
| **3** | `CONFIRMADO` | El banco pagó. **Recién acá** se generan asiento, aplicación y movimiento bancario |
| **4** | `RECHAZADO` | El banco no ejecutó. Queda en seguimiento |
| **5** | `ANULADO` | Anulado por el usuario, con motivo |

⚠️ Cheque y débito automático **saltan** de `POR_APROBAR` directo a `CONFIRMADO` al aprobar.

---

## 1. Solicitud — la pantalla que QUEDA en Cuentas por Pagar

### `POST /pgtr`

```json
{
  "idFacturaCompra": 123,
  "idCuentaDestinoTitular": 9,
  "valor": 1500.00,
  "fechaProgramada": "2026-09-15",
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Pago factura agosto"
}
```

⛔ **`idCuentaBancariaOrigen` NO se manda desde esta pantalla.** Omitirlo es lo que hace que el pago
nazca `POR_APROBAR` y caiga en la bandeja de tesorería. Mandarlo salta la aprobación: es
exactamente el comportamiento que esta reorganización viene a sacar de CxP.

⛔ **`formaPago` tampoco.** La forma de pago la elige tesorería al aprobar.

**200** → el `PagoProgramado` creado.
**400** → falta `idFacturaCompra`, `valor` o `idEmpresa`.

### `GET /pgtr/facturasComprometidas/{idTitular}`

```json
{ "idTitular": 45, "idsFacturas": [12, 87, 103] }
```

Facturas cuyo saldo ya está íntegramente comprometido por pagos vigentes. **Se sacan del combo.**
Un pago parcial **no** saca la factura de la lista.

---

## 2. T1 — Aprobación (Tesorería)

### `GET /pgtr/porAprobar?idEmpresa=1&origen=&desde=&hasta=`

Devuelve una lista de `PagoPorAprobar`. `origen`, `desde` y `hasta` son opcionales.

### `GET /pgtr/disponibilidad/{idCuenta}?fecha=2026-09-07`

Tres números, y los tres se muestran: **saldo contable**, **comprometido** (pagos
`REGISTRADO`/`EN_ARCHIVO` de esa cuenta) y **disponible = saldo − comprometido**.

⚠️ El saldo sale de contabilidad (`saldoCuentaFechaEmpresa`), **no** de `MovimientoBanco`.

### `POST /pgtr/aprobar`

```json
{
  "idsPagos": [21, 22, 23],
  "idCuentaBancaria": 4,
  "formaPago": 2,
  "fechaPago": "2026-09-07",
  "idUsuario": 5,
  "agruparEnUnCheque": false
}
```

`formaPago`: **2** transferencia · **3** cheque · **4** débito automático. **1 (efectivo) no está
soportado.**
`agruparEnUnCheque` solo con `formaPago=3`; **todos los pagos deben ser del mismo titular** o
responde **409**.

🟠 **Trampa conocida, sin corregir (§24 del estado del equipo):** la guarda que exige cuenta de
destino al aprobar por transferencia **enumera dos orígenes** (`RHH_ANTICIPO_EMPLEADO`,
`TSR_CAJA_CHICA`) en vez de mirar si el pago tiene cuenta. Un pago de cualquier otro origen sin
cuenta **pasa la aprobación** y revienta después, al generar el archivo, con el lote ya aprobado.

---

## 3. T2 — Generación del archivo al banco (Tesorería)

### `POST /pgtr/lote`

```json
{ "idsPagos": [21, 22], "idCuentaOrigen": 4, "idEmpresa": 1, "idUsuario": 5 }
```

**200:**

```json
{
  "exito": true,
  "mensaje": "Archivo de pagos generado con 2 transferencia(s).",
  "idLote": 77,
  "nombreArchivo": "PAGOS_LOTE_77_20260907.txt",
  "contenido": "PA\t1\tUSD\t45000\t...",
  "contenidoBase64": "UEExCVVTRAk0NTAwMAk...",
  "mimeType": "text/plain",
  "formatoBanco": "INTERNACIONAL",
  "valorTotal": 1980.55,
  "numeroPagos": 2
}
```

### 🔴 Lo que cambia en este contrato, y por qué

Hoy la respuesta trae **solo `contenido`, como texto**. El archivo del Pacífico es un **`.xlsx`**, y
un `.xlsx` no entra en un string.

**Se AGREGAN tres claves y no se saca ninguna:**

| Clave | Cuándo viene | Para qué |
|---|---|---|
| `contenido` | Solo formatos de texto (Internacional). `null` en binarios | Compatibilidad: el FE viejo sigue andando |
| `contenidoBase64` | **SIEMPRE**, incluido el Internacional | El contenido crudo del archivo, en Base64 |
| `mimeType` | Siempre | `text/plain` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `formatoBanco` | Siempre | `INTERNACIONAL`, `PACIFICO`, … Se muestra en pantalla: el usuario tiene que saber qué archivo bajó |

**Regla para el FE:** si viene `contenidoBase64`, se descarga eso decodificado con su `mimeType`; si
no, se descarga `contenido` como texto. **Nunca los dos.** Como `contenidoBase64` viene siempre, en
la práctica el camino de Base64 es el que se usa en los dos formatos, y el de `contenido` queda como
respaldo por si un formateador futuro no lo mandara.

> ⚠️ **Corregido el 2026-09-07.** Hasta esta fecha la tabla de arriba decía que `contenidoBase64`
> venía `null` en formatos de texto. **Era falso**: `PagoProgramadoServiceImpl:1595` y `:1621` lo
> mandan siempre, y el comentario del propio método lo dice —*«contenidoBase64: siempre, para el
> Internacional TAMBIEN»*—. La nota de abajo sobre el ANSI ya asumía lo correcto, así que el
> documento se contradecía consigo mismo. Verificado contra el código.

⚠️ **El texto del Internacional es ANSI (`windows-1252`), no UTF-8.** Si el FE arma el Blob como
UTF-8, cualquier tilde o `ñ` en un nombre sale mal y el banco rechaza la línea. **Para el
Internacional conviene bajar también `contenidoBase64`** y no reconstruir el texto en el navegador.

### `GET /pgtr/lote/{idLote}/archivo`

Mismo cuerpo que arriba, para volver a bajar un lote ya generado. **No** regenera el lote ni cambia
estados.

### 🟠 Errores que van a aparecer y hay que mostrar tal cual

| Situación | Qué pasa |
|---|---|
| Un pago del lote sin cuenta destino ni beneficiario ocasional | **Aborta el lote entero**, ningún archivo. El mensaje nombra el pago y el proveedor |
| El banco de la cuenta de origen no tiene formateador | `IllegalArgumentException` con la lista de bancos soportados |
| Un beneficiario con `IDENTIFICACION_DEL_EXTERIOR` | Rechazo explícito: ninguno de los dos formatos tiene ese tipo de documento |

---

## 4. T3 — Recepción y confirmación (Tesorería)

### `POST /pgtr/lote/{idLote}/respuesta?idUsuario=5`

`Content-Type: application/octet-stream`, el binario del archivo en el cuerpo.

⚠️ **El lector sigue siendo provisional.** Espera un Excel de **4 columnas armado a mano** (id de
pago, resultado, referencia, motivo), **no** el archivo nativo del banco. Confirmado con el usuario
el 2026-08-28: **la confirmación manual es el camino principal, no un parche temporal.** La pantalla
tiene que reflejar eso —la carga del archivo no puede ser lo primero ni lo más grande.

### `POST /pgtr/confirmarManual`

```json
{
  "idsPagos": [12, 13],
  "referencia": "TRX-9981",
  "fechaPago": "2026-09-07",
  "observacion": "Confirmado con estado de cuenta",
  "idUsuario": 5
}
```

Hace **lo mismo** que la respuesta del banco: aplicación de pago, asiento contable y movimiento
bancario. Es el momento en que el saldo de la factura se mueve.

---

## 5. T4 — Consulta y gestión (Tesorería)

### `GET /pgtr/listar?idEmpresa=1&estado=&idTitular=`

`estado` e `idTitular` opcionales. `idEmpresa` **obligatorio** (400 si falta).

### `POST /pgtr/anular/{id}` · `POST /pgtr/revertirConfirmado/{id}`

Body: `{ "motivo": "...", "idUsuario": 5 }`. El motivo es obligatorio.

- **Anular** aplica a pagos que todavía no se confirmaron.
- **Revertir confirmado** deshace la contabilidad de un pago ya confirmado.

⚠️ **Un pago revertido queda `RECHAZADO`/`ANULADO` y NO se puede reconfirmar**: hay que volver a
generarlo. La pantalla no debe ofrecer «confirmar» sobre un pago revertido.

### `POST /pgtr/selectByCriteria`

Body: `List<DatosBusqueda>`. Búsqueda genérica de la casa.

---

## 6. Serialización — la trampa que muerde en las fechas

Serializa **Jackson**, no JSON-B (verificado sobre el cable el 2026-08-20).

- `LocalDate` → **`"yyyy-MM-dd"`**
- `LocalDateTime` → **ISO local SIN zona**

⛔ **Nunca un `Date` de JavaScript crudo ni nada terminado en `Z`.** Jackson **descarta el offset en
vez de convertirlo**: `"2026-09-07T13:30:00.000Z"` se graba como `13:30`. Un `Date` de las 08:30 en
Ecuador viaja como `13:30Z` y queda **cinco horas adelantado, sin ningún error**. En un `fechaPago`
eso mete el pago en el día equivocado.

---

## 7. Errores

El estilo de la casa: el cuerpo del error es **texto plano**, no JSON.

| Código | Cuándo |
|---|---|
| **400** | Falta un parámetro obligatorio, o la disponibilidad no se pudo calcular |
| **409** | Regla de negocio: pagos de distinto titular en un cheque agrupado |
| **500** | `"Error al ...: " + mensaje` — se muestra el mensaje tal cual, que es donde está el dato útil |
