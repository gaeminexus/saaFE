# Contrato de API — Nota de venta de compra, ingreso manual

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-04 · **Diseño:** `PLAN-NOTA-VENTA-COMPRA-MANUAL.md`
**Espejo del frontend:** `saaFE/docs/cxp/API-NOTA-VENTA-COMPRA-MANUAL.md`

> **Congelado antes de que el frontend arranque.** Si algo de acá no coincide con el código al
> implementarlo, **se corrige este documento en el mismo cambio**, no se ajusta el frontend a
> escondidas.

---

## 0. Trampas que valen más que el contrato

1. ⛔ **El application path de JAX-RS es `/rest`.** Las URLs reales son `/SaaBE/rest/fctc/...`.
   Varios documentos viejos de este repositorio dicen `/api/...`: **están desactualizados.**
2. ⛔ **NO usar el `POST /rest/fctc` genérico** para esto. Ése es el CRUD de `EntityDaoImpl`: un
   `merge` pelado que **no valida, no crea detalles, no resuelve el sustento tributario y no genera
   asiento**. Una nota de venta creada por ahí queda invisible para la contabilidad y para el ATS, y
   nadie se entera hasta que no cuadra el mes.
3. ⚠️ **Fechas.** El serializador de este proyecto es **Jackson**, y con `LocalDateTime` **descarta
   el offset en vez de convertirlo**: `"2026-09-04T13:30:00.000Z"` se graba como `13:30`. Un `Date`
   de JavaScript de las 08:30 en Ecuador viaja como `13:30Z` y queda **cinco horas adelantado sin
   ningún error**. **Mandar `fecha` como ISO local sin zona (`"2026-09-04T00:00:00"`), nunca un
   `Date` crudo ni nada terminado en `Z`.**
4. ⚠️ **Un 200 no significa que se haya grabado.** Si vuelven `bloqueantes`, **no se grabó nada** —
   la transacción corta antes de tocar la base. Ver §3.

---

## 1. `POST /rest/fctc/manual` — registrar una nota de venta

Registra el documento completo en una sola llamada: cabecera, detalles, formas de pago, sustento
tributario y asiento contable. **Todo o nada.**

### Cuerpo

```json
{
  "idEmpresa": 1236,
  "idUsuario": 45,
  "idTitular": 812,

  "tipoComprobante": "02",
  "numEstablecimiento": "001",
  "numPtoEmision": "001",
  "secuencial": "000000123",
  "autorizacion": "1122334455",
  "fecha": "2026-09-04T00:00:00",
  "observacion": "Nota de venta sin XML, ingresada manualmente",

  "subtotal": 105.00,
  "subcero": 0.00,
  "descuento": 0.00,
  "pIVA": 15.0,
  "vIVA": 15.75,
  "total": 120.75,

  "detalles": [
    {
      "idProducto": 77,
      "descripcion": "Cemento",
      "cantidad": 10,
      "valor": 8.50,
      "descuento": 0.00,
      "baseImponible": 85.00,
      "porcentajeIVA": 15.0,
      "valorIVA": 12.75,
      "codigoIVASRI": "4",
      "total": 97.75
    }
  ],

  "formasPago": [
    { "formaPago": "01", "valor": 120.75, "plazo": 0, "unidadTiempo": "dias" }
  ]
}
```

### Campos

| Campo | Tipo | Oblig. | Nota |
|---|---|---|---|
| `idEmpresa` | number | **sí** | |
| `idUsuario` | number | **sí** | ⚠️ **numérico**, no el nombre. En `saaFE` sale de `AppStateService`, que expone el id; `usuarioSesion()` devuelve texto y puede devolver el literal `'SYSTEM'`, que **no existe** en la base |
| `idTitular` | number | **sí** | El proveedor. Debe tener cuenta contable CxP (ver §3) |
| `tipoComprobante` | string | no | Por defecto **`"02"`** (nota de venta). El servidor lo fija; el cliente no debería mandarlo |
| `numEstablecimiento` | string(3) | **sí** | `"001"` |
| `numPtoEmision` | string(3) | **sí** | `"001"` |
| `secuencial` | string(9) | **sí** | `"000000123"` |
| `autorizacion` | string | no | Número de autorización de la preimpresa |
| `fecha` | ISO local | **sí** | Fecha de emisión. **Sin zona** (trampa 3) |
| `observacion` | string(2000) | no | |
| `subtotal`, `subcero`, `descuento`, `pIVA`, `vIVA`, `total` | number | ver nota | Totales de cabecera. **Los de IVA son opcionales y por defecto 0**: una nota de venta RISE no desglosa IVA. Ver §3.1 del plan — pendiente de confirmar con contabilidad |
| `detalles[]` | array | **sí, ≥1** | |
| `detalles[].idProducto` | number | **sí** | `ProductoPago`. **De acá sale la cuenta del DEBE**, por el grupo del producto |
| `detalles[].descripcion` | string(500) | **sí** | |
| `detalles[].cantidad`, `.valor`, `.baseImponible`, `.total` | number | **sí** | |
| `detalles[].descuento`, `.porcentajeIVA`, `.valorIVA`, `.codigoIVASRI` | | no | |
| `formasPago[]` | array | no | Si va vacío no se crea ninguna |

**El servidor NO recalcula los totales a partir del detalle.** Graba lo que llega. Es deliberado: el
documento físico manda, y un redondeo del servidor que no coincida con el papel es peor que un total
que el usuario tipeó mirando la nota de venta. **El frontend es el responsable de que cuadren, y
debe mostrar la suma del detalle al lado del total tipeado para que el usuario vea la diferencia
antes de grabar.**

### Respuesta 200 — registrado

```json
{
  "exito": true,
  "idFactura": 9012,
  "numero": "001-001-000000123",
  "asiento": "2026-09-000481",
  "sustento": "01",
  "mensaje": "Nota de venta registrada correctamente."
}
```

`asiento` puede venir **`null`** si la empresa tiene la generación contable apagada
(`Facturador.generaConta = 0`). No es un error.

### Respuesta 200 — **NO se grabó**, hay condiciones bloqueantes

```json
{
  "exito": false,
  "bloqueantes": [
    { "tipo": "PROVEEDOR_SIN_CUENTA",
      "detalle": "El proveedor 'FERRETERIA X' (RUC: 1791414004001) no tiene cuenta contable CxP asignada. Configúrela en Contabilidad → Cuentas por Titular." },
    { "tipo": "PRODUCTO_SIN_CLASIFICAR",
      "detalle": "El producto 'Cemento' está en el grupo POR_CLASIFICAR." }
  ]
}
```

⛔ **`exito: false` con HTTP 200 significa que NO se grabó nada.** Es el mismo patrón que ya usa la
carga automática, y el frontend **debe** distinguirlo de un 200 exitoso: mirar `exito`, no el código
HTTP.

### Códigos de error

| Código | Cuándo |
|---|---|
| **200** | Registrado (`exito: true`) **o** rechazado por bloqueantes (`exito: false`) |
| **400** | El cuerpo no es válido: falta un obligatorio, `detalles` vacío, fecha ilegible |
| **500** | Error inesperado. Cuerpo: `"Error al registrar la nota de venta: <mensaje>"` |

---

## 2. Tipos de bloqueante

| `tipo` | Significado | Cómo lo resuelve el usuario |
|---|---|---|
| `PROVEEDOR_SIN_CUENTA` | El titular no tiene cuenta contable bajo rol Proveedor | Contabilidad → Cuentas por Titular |
| `PRODUCTO_SIN_CLASIFICAR` | Un producto del detalle está en el grupo `POR_CLASIFICAR` | Clasificarlo en su grupo |
| `GRUPO_SIN_CUENTA` | El grupo del producto no tiene cuenta contable | Parametrizar el grupo |
| `TIPO_ASIENTO_FALTANTE` | No existe el tipo de asiento de factura de compra para la empresa | Parametrizar contabilidad |
| `DOCUMENTO_DUPLICADO` | Ya existe una nota de venta con ese establecimiento-ptoEmisión-secuencial del mismo proveedor | Verificar el número |

**El frontend debe mapear estos códigos a etiquetas**, igual que
`gestion-documentos.component.ts` mapea los de la carga automática. **Un código que llegue sin estar
en el mapa no se muestra**, y el usuario ve un bloqueo sin explicación.

---

## 3. Reglas que el frontend tiene que respetar

1. **Leer entero, sobrescribir, mandar entero.** `EntityDaoImpl.save()` es un `merge` pelado: un
   `PUT` con payload parcial **graba `null`** en las columnas ausentes, FKs incluidas. Vale para
   cualquier edición posterior de la nota de venta. ⛔ **No "arreglar" `EntityDaoImpl`.**
2. **La nota de venta aparece en las pantallas existentes de CxP**, porque se guarda en la misma
   tabla que las facturas. Distinguirla por `tipoComprobante === "02"`.
3. ⛔ **No va a tener `clave`, `ambiente`, `pathGen` ni XML asociado.** Toda pantalla que hoy lea
   esos campos de una factura tiene que tolerar `null`. **Es un ítem de barrido obligatorio, no una
   observación:** un campo ausente no da error, da `undefined`, y el síntoma aparece lejos del
   cambio.

---

## 4. La nota de venta tiene que verse en todo `cxp` y `tsr` — requisito del usuario

> *«Debe incluirse en el estado de cuenta de titular y poder realizar pagos normales y con caja
> chica.»*

### 4.1 ✅ Funcionar, funciona solo. No hay nada que agregar

Verificado el 2026-09-04 leyendo los tres consumidores. **Ninguno filtra por `tipoComprobante`:**
los tres preguntan *«qué documentos tiene este titular»*, y la nota de venta **es** uno de ellos en
la misma tabla.

| Camino | Cómo busca hoy |
|---|---|
| Estado de cuenta de titular | `tsr/service/estado-cuenta-titular.service.ts:131` — enumera **fuentes**: `{ etiqueta:'Facturas de compra', url: ServiciosCxp.RS_FCTC, campoTitular:'titular' }` |
| Proposición de pago | `cxp/forms/procesos/proposicion-pago:201` — `facturaS.selectByCriteria(criterioTitular)` |
| Selector de caja chica | `cxp/dialog/documento-cruce-selector-dialog:105-113` — criterio único `titular.codigo IGUAL` |

**Pagarla, normal o con caja chica, tampoco necesita nada nuevo:** `AplicacionPagoCxp` la referencia
como `facturaCompra`, porque es una fila de `PGS.FCTC`.

### 4.2 🟡 Lo que SÍ hay que hacer: que no la llamen «Factura»

Los tres rotulan por **el endpoint que trajo la fila**, no por el tipo de la fila. Una nota de venta
va a aparecer —con su saldo correcto— bajo la etiqueta «Factura» / «Facturas de compra».

| Dónde | Hoy | Debe decir |
|---|---|---|
| Estado de cuenta de titular | sección «Facturas de compra» | distinguir la nota de venta, o mostrar el tipo por fila |
| Selector de caja chica | mapea todo lo de `facturaService` a `tipo: 'FACTURA'` | **«Nota de venta»** si `tipoComprobante === '02'` |
| Proposición de pago | ídem | ídem |

**Regla:** la etiqueta sale de `tipoComprobante` **de la fila**, nunca de qué servicio la trajo.
**Un solo helper compartido y los tres lo usan** — no tres copias, que es como nacen los dos
`extraerCodigo` con criterios opuestos que ya tenemos en este repositorio.

**Por qué es 🟡 y no 🔴:** el saldo del titular sale bien igual. Pero un usuario que lee
«Factura 001-001-000000123» va a buscar un XML que no existe, y puede concluir que falta cargar
algo.
