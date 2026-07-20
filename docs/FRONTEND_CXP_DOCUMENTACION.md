# Documentación Frontend — Módulo CXP (Cuentas por Pagar)
> **Fecha:** Julio 2026  
> **Backend:** WildFly + JakartaEE — Base URL: `/saaBE/rest/`  
> **Schema BD:** `PGS` (Oracle)

---

## Índice
1. [Tablas y Entidades del Módulo](#1-tablas-y-entidades-del-módulo)
2. [Proceso de Carga de Documentos SRI](#2-proceso-de-carga-de-documentos-sri)
3. [Endpoints del Proceso de Carga](#3-endpoints-del-proceso-de-carga)
4. [Endpoints CRUD por Entidad](#4-endpoints-crud-por-entidad)
5. [Flujo de Pantallas](#5-flujo-de-pantallas)
6. [Estados y Catálogos](#6-estados-y-catálogos)
7. [Formato del Archivo TXT del SRI](#7-formato-del-archivo-txt-del-sri)

---

## 1. Tablas y Entidades del Módulo

### 1.1 Entidades de Facturación de Compras

---

#### `FacturaCompra` — tabla `pgs.fctc` — endpoint base: `/fctc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK autoincremental |
| `tipoComprobante` | `string` | Sí | Código de tipo de comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa receptora |
| `titular` | `object {ttlrcdgo: number}` | No | Proveedor (emisor del documento) |
| `tipoDoc` | `string` | Sí | Tipo de documento |
| `numero` | `string` | Sí | Número del comprobante |
| `numEstablecimiento` | `string` | Sí | Número de establecimiento |
| `numPtoEmision` | `string` | Sí | Número de punto de emisión |
| `secuencial` | `string` | Sí | Secuencial del comprobante |
| `ambiente` | `number` | Sí | `1`=PRUEBA `2`=PRODUCCIÓN |
| `clave` | `string` | Sí | Clave de acceso (49 dígitos) |
| `fecha` | `string (ISO 8601)` | Sí | Fecha del comprobante |
| `observacion` | `string` | Sí | Observaciones |
| `subtotal` | `number` | Sí | Subtotal gravado 12% |
| `subcero` | `number` | Sí | Subtotal gravado 0% |
| `subtotal5` | `number` | Sí | Subtotal gravado 5% |
| `subtotal8` | `number` | Sí | Subtotal gravado 8% |
| `pIVA` | `number` | Sí | Porcentaje IVA |
| `vIVA` | `number` | Sí | Valor IVA 12% |
| `vIVA5` | `number` | Sí | Valor IVA 5% |
| `vIVA8` | `number` | Sí | Valor IVA 8% |
| `vICE` | `number` | Sí | Valor ICE |
| `vIRBPNR` | `number` | Sí | Valor IRBPNR |
| `descuento` | `number` | Sí | Descuento total |
| `porDescuento` | `number` | Sí | Porcentaje de descuento |
| `propina` | `number` | Sí | Propina |
| `subsidio` | `number` | Sí | Subsidio |
| `totalSinSub` | `number` | Sí | Total sin subsidio |
| `ahorroSub` | `number` | Sí | Ahorro por subsidio |
| `total` | `number` | Sí | Total del comprobante |
| `ptoEmision` | `number` | Sí | ID del punto de emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario que registró |
| `pathGen` | `string` | Sí | Path del XML generado |
| `autorizacion` | `string` | Sí | Número de autorización SRI |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha de autorización SRI |
| `formaPago` | `number` | Sí | Código forma de pago |
| `estado` | `number` | Sí | `1`=ACTIVO `0`=INACTIVO |
| `estadoEmision` | `number` | Sí | Estado de emisión |

---

#### `DetalleFacturaCompra` — tabla `pgs.dfcc` — endpoint base: `/dfcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK autoincremental |
| `factura` | `object {id: number}` | No | FK a FacturaCompra |
| `descripcion` | `string` | Sí | Descripción del ítem |
| `cantidad` | `number` | Sí | Cantidad |
| `valor` | `number` | Sí | Precio unitario |
| `subTotal` | `number` | Sí | Subtotal del ítem |
| `descuento` | `number` | Sí | Descuento del ítem |
| `baseImponible` | `number` | Sí | Base imponible |
| `porcentajeIVA` | `number` | Sí | Porcentaje IVA aplicado |
| `valorIVA` | `number` | Sí | Valor IVA |
| `porcentajeICE` | `number` | Sí | Porcentaje ICE |
| `valorICE` | `number` | Sí | Valor ICE |
| `subsidio` | `number` | Sí | Subsidio del ítem |
| `precioSinSub` | `number` | Sí | Precio sin subsidio |
| `total` | `number` | Sí | Total del ítem |
| `producto` | `number` | Sí | ID del producto |
| `codigoIVASRI` | `number` | Sí | Código IVA según SRI |
| `estado` | `number` | Sí | `1`=ACTIVO |

---

#### `PathFacturaCompra` — tabla `pgs.pfcc` — endpoint base: `/pfcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `factura` | `object {id: number}` | No | FK a FacturaCompra |
| `path` | `string` | Sí | URL/path del archivo XML |
| `alterno` | `number` | Sí | Código alterno (TSRI 600) |

---

#### `FormaPagoFacturaCompra` — tabla `pgs.fpfm` — endpoint base: `/fpfm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `factura` | `object {id: number}` | No | FK a FacturaCompra |
| `formaPago` | `string` | Sí | Código forma de pago (TSRI 24) |
| `valor` | `number` | Sí | Valor pagado |
| `plazo` | `number` | Sí | Plazo |
| `unidadTiempo` | `string` | Sí | Unidad de tiempo del plazo |

---

#### `LiquidacionCompraCompra` — tabla `pgs.lqcc` — endpoint base: `/lqcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `tipoComprobante` | `string` | Sí | Código tipo comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa receptora |
| `titular` | `object {ttlrcdgo: number}` | No | Proveedor |
| `tipoDoc` | `string` | Sí | Tipo de documento |
| `numero` | `string` | Sí | Número |
| `numEstablecimiento` | `string` | Sí | Establecimiento |
| `numPtoEmision` | `string` | Sí | Punto de emisión |
| `secuencial` | `string` | Sí | Secuencial |
| `ambiente` | `number` | Sí | `1`=PRUEBA `2`=PRODUCCIÓN |
| `clave` | `string` | Sí | Clave de acceso |
| `fecha` | `string (ISO 8601)` | Sí | Fecha |
| `observacion` | `string` | Sí | Observación |
| `subtotal` | `number` | Sí | Subtotal |
| `subcero` | `number` | Sí | Subtotal 0% |
| `pIVA` | `number` | Sí | % IVA |
| `vIVA` | `number` | Sí | Valor IVA |
| `vICE` | `number` | Sí | Valor ICE |
| `vIRBPNR` | `number` | Sí | Valor IRBPNR |
| `descuento` | `number` | Sí | Descuento |
| `porDescuento` | `number` | Sí | % Descuento |
| `propina` | `number` | Sí | Propina |
| `subsidio` | `number` | Sí | Subsidio |
| `totalSinSub` | `number` | Sí | Total sin subsidio |
| `ahorroSub` | `number` | Sí | Ahorro subsidio |
| `total` | `number` | Sí | Total |
| `ptoEmision` | `number` | Sí | ID punto de emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario |
| `pathGen` | `string` | Sí | Path XML |
| `autorizacion` | `string` | Sí | Autorización SRI |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha autorización |
| `estado` | `number` | Sí | Estado |
| `estadoEmision` | `number` | Sí | Estado emisión |

---

#### `DetalleLiquidacionCompraCompra` — tabla `pgs.dlcm` — endpoint base: `/dlcm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `liquidacion` | `object {id: number}` | No | FK a LiquidacionCompraCompra |
| `descripcion` | `string` | Sí | Descripción |
| `cantidad` | `number` | Sí | Cantidad |
| `valor` | `number` | Sí | Valor unitario |
| `subTotal` | `number` | Sí | Subtotal |
| `porcentajeIVA` | `number` | Sí | % IVA |
| `valorIVA` | `number` | Sí | Valor IVA |
| `porcentajeICE` | `number` | Sí | % ICE |
| `valorICE` | `number` | Sí | Valor ICE |
| `subsidio` | `number` | Sí | Subsidio |
| `precioSinSub` | `number` | Sí | Precio sin subsidio |
| `descuento` | `number` | Sí | Descuento |
| `total` | `number` | Sí | Total |
| `producto` | `number` | Sí | ID producto |
| `estado` | `number` | Sí | Estado |

---

#### `PathLiquidacionCompraCompra` — tabla `pgs.plcc` — endpoint base: `/plcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `liquidacion` | `object {id: number}` | No | FK a LiquidacionCompraCompra |
| `path` | `string` | Sí | Path del XML |
| `alterno` | `number` | Sí | Código alterno |

---

#### `FormaPagoLiquidacionCompraCompra` — tabla `pgs.fplm` — endpoint base: `/fplm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `liquidacion` | `object {id: number}` | No | FK a LiquidacionCompraCompra |
| `formaPago` | `string` | Sí | Código forma de pago |
| `valor` | `number` | Sí | Valor |
| `plazo` | `number` | Sí | Plazo |
| `unidadTiempo` | `string` | Sí | Unidad de tiempo |

---

#### `NotaCreditoCompra` — tabla `pgs.ntcc` — endpoint base: `/ntcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `tipoComprobante` | `string` | Sí | Código tipo comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa |
| `titular` | `object {ttlrcdgo: number}` | No | Proveedor |
| `tipoDoc` | `string` | Sí | Tipo documento |
| `numero` | `string` | Sí | Número |
| `numEstablecimiento` | `string` | Sí | Establecimiento |
| `numPtoEmision` | `string` | Sí | Punto emisión |
| `secuencial` | `string` | Sí | Secuencial |
| `ambiente` | `number` | Sí | Ambiente |
| `clave` | `string` | Sí | Clave de acceso |
| `fecha` | `string (ISO 8601)` | Sí | Fecha |
| `tipoDocModificado` | `string` | Sí | Tipo doc que modifica |
| `numDocModificado` | `string` | Sí | Número del doc que modifica |
| `fechaEmisionDM` | `string (ISO 8601)` | Sí | Fecha emisión doc modificado |
| `observacion` | `string` | Sí | Motivo de la nota de crédito |
| `subtotal` | `number` | Sí | Subtotal |
| `subcero` | `number` | Sí | Subtotal 0% |
| `pIVA` | `number` | Sí | % IVA |
| `vIVA` | `number` | Sí | Valor IVA |
| `vICE` | `number` | Sí | Valor ICE |
| `vIRBPNR` | `number` | Sí | Valor IRBPNR |
| `descuento` | `number` | Sí | Descuento |
| `porDescuento` | `number` | Sí | % Descuento |
| `propina` | `number` | Sí | Propina |
| `subsidio` | `number` | Sí | Subsidio |
| `total` | `number` | Sí | Total |
| `ptoEmision` | `number` | Sí | Punto de emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario |
| `pathGen` | `string` | Sí | Path XML |
| `autorizacion` | `string` | Sí | Autorización |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha autorización |
| `estado` | `number` | Sí | Estado |
| `estadoEmision` | `number` | Sí | Estado emisión |

---

#### `DetalleNotaCreditoCompra` — tabla `pgs.dtcc` — endpoint base: `/dtcc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `notaCredito` | `object {id: number}` | No | FK a NotaCreditoCompra |
| `descripcion` | `string` | Sí | Descripción |
| `cantidad` | `number` | Sí | Cantidad |
| `valor` | `number` | Sí | Valor unitario |
| `subTotal` | `number` | Sí | Subtotal |
| `descuento` | `number` | Sí | Descuento |
| `baseImponible` | `number` | Sí | Base imponible |
| `porcentajeIVA` | `number` | Sí | % IVA |
| `valorIVA` | `number` | Sí | Valor IVA |
| `porcentajeICE` | `number` | Sí | % ICE |
| `valorICE` | `number` | Sí | Valor ICE |
| `subsidio` | `number` | Sí | Subsidio |
| `total` | `number` | Sí | Total |
| `producto` | `number` | Sí | ID producto |
| `estado` | `number` | Sí | Estado |

---

#### `PathNotaCreditoCompra` — tabla `pgs.ptcv` — endpoint base: `/ptcv`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `notaCredito` | `object {id: number}` | No | FK a NotaCreditoCompra |
| `path` | `string` | Sí | Path del XML |
| `alterno` | `number` | Sí | Código alterno |

---

#### `NotaDebitoCompra` — tabla `pgs.ntdc` — endpoint base: `/ntdc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `tipoComprobante` | `string` | Sí | Código tipo comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa |
| `titular` | `object {ttlrcdgo: number}` | No | Proveedor |
| `tipoDoc` | `string` | Sí | Tipo documento |
| `numero` | `string` | Sí | Número |
| `numEstablecimiento` | `string` | Sí | Establecimiento |
| `numPtoEmision` | `string` | Sí | Punto emisión |
| `secuencial` | `string` | Sí | Secuencial |
| `ambiente` | `number` | Sí | Ambiente |
| `clave` | `string` | Sí | Clave de acceso |
| `fecha` | `string (ISO 8601)` | Sí | Fecha |
| `tipoDocModificado` | `string` | Sí | Tipo doc que modifica |
| `numDocModificado` | `string` | Sí | Número del doc que modifica |
| `fechaEmisionDM` | `string (ISO 8601)` | Sí | Fecha emisión doc modificado |
| `observacion` | `string` | Sí | Motivo |
| `subtotal` | `number` | Sí | Subtotal |
| `subcero` | `number` | Sí | Subtotal 0% |
| `pIVA` | `number` | Sí | % IVA |
| `vIVA` | `number` | Sí | Valor IVA |
| `vICE` | `number` | Sí | Valor ICE |
| `vIRBPNR` | `number` | Sí | Valor IRBPNR |
| `descuento` | `number` | Sí | Descuento |
| `porDescuento` | `number` | Sí | % Descuento |
| `propina` | `number` | Sí | Propina |
| `subsidio` | `number` | Sí | Subsidio |
| `total` | `number` | Sí | Total |
| `ptoEmision` | `number` | Sí | Punto emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario |
| `pathGen` | `string` | Sí | Path XML |
| `autorizacion` | `string` | Sí | Autorización |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha autorización |
| `estado` | `number` | Sí | Estado |
| `estadoEmision` | `number` | Sí | Estado emisión |

---

#### `DetalleNotaDebitoCompra` — tabla `pgs.dtdc` — endpoint base: `/dtdc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `notaDebito` | `object {id: number}` | No | FK a NotaDebitoCompra |
| `descripcion` | `string` | Sí | Descripción |
| `cantidad` | `number` | Sí | Cantidad |
| `valor` | `number` | Sí | Valor |
| `subTotal` | `number` | Sí | Subtotal |
| `descuento` | `number` | Sí | Descuento |
| `baseImponible` | `number` | Sí | Base imponible |
| `porcentajeIVA` | `number` | Sí | % IVA |
| `valorIVA` | `number` | Sí | Valor IVA |
| `porcentajeICE` | `number` | Sí | % ICE |
| `valorICE` | `number` | Sí | Valor ICE |
| `subsidio` | `number` | Sí | Subsidio |
| `total` | `number` | Sí | Total |
| `estado` | `number` | Sí | Estado |

---

#### `PathNotaDebitoCompra` — tabla `pgs.ptdc` — endpoint base: `/ptdc`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `notaDebito` | `object {id: number}` | No | FK a NotaDebitoCompra |
| `path` | `string` | Sí | Path del XML |
| `alterno` | `number` | Sí | Código alterno |

---

#### `RetencionCompra` — tabla `pgs.rtcm` — endpoint base: `/rtcm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `tipoComprobante` | `string` | Sí | Código tipo comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa |
| `proveedor` | `object {ttlrcdgo: number}` | No | Proveedor |
| `tipoDoc` | `string` | Sí | Tipo documento |
| `periodoFiscal` | `string` | Sí | Período fiscal `mm/aaaa` |
| `numero` | `string` | Sí | Número |
| `numEstablecimiento` | `string` | Sí | Establecimiento |
| `numPtoEmision` | `string` | Sí | Punto emisión |
| `secuencial` | `string` | Sí | Secuencial |
| `ambiente` | `number` | Sí | Ambiente |
| `clave` | `string` | Sí | Clave de acceso |
| `fecha` | `string (ISO 8601)` | Sí | Fecha |
| `observacion` | `string` | Sí | Observación |
| `total` | `number` | Sí | Valor total retenido |
| `ptoEmision` | `number` | Sí | Punto emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario |
| `pathGen` | `string` | Sí | Path XML |
| `autorizacion` | `string` | Sí | Autorización |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha autorización |
| `estado` | `number` | Sí | Estado |
| `estadoEmision` | `number` | Sí | Estado emisión |

---

#### `DetalleRetencionCompra` — tabla `pgs.drcm` — endpoint base: `/drcm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `retencion` | `object {id: number}` | No | FK a RetencionCompra |
| `tipoDocReten` | `string` | Sí | Tipo documento retenido |
| `numDocReten` | `string` | Sí | Número documento retenido |
| `fechaEmiDoc` | `string (YYYY-MM-DD)` | Sí | Fecha emisión doc retenido |
| `codImpuesto` | `string` | Sí | Código de impuesto |
| `codRetencion` | `string` | Sí | Código de retención |
| `baseImponible` | `number` | Sí | Base imponible |
| `porcentajeReten` | `number` | Sí | Porcentaje de retención |
| `valorReten` | `number` | Sí | Valor retenido |
| `estado` | `number` | Sí | Estado |

---

#### `PathRetencionCompra` — tabla `pgs.prcm` — endpoint base: `/prcm`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `retencion` | `object {id: number}` | No | FK a RetencionCompra |
| `path` | `string` | Sí | Path del XML |
| `alterno` | `number` | Sí | Código alterno |

---

#### `RetencionCompraV2` — tabla `pgs.rcv2` — endpoint base: `/rcv2`

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK |
| `tipoComprobante` | `string` | Sí | Código tipo comprobante |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa |
| `proveedor` | `object {ttlrcdgo: number}` | No | Proveedor |
| `tipoDoc` | `string` | Sí | Tipo documento |
| `periodoFiscal` | `string` | Sí | Período fiscal `mm/aaaa` |
| `numero` | `string` | Sí | Número |
| `numEstablecimiento` | `string` | Sí | Establecimiento |
| `numPtoEmision` | `string` | Sí | Punto emisión |
| `secuencial` | `string` | Sí | Secuencial |
| `ambiente` | `number` | Sí | Ambiente |
| `clave` | `string` | Sí | Clave de acceso |
| `fecha` | `string (ISO 8601)` | Sí | Fecha |
| `observacion` | `string` | Sí | Observación |
| `total` | `number` | Sí | Total retenido |
| `ptoEmision` | `number` | Sí | Punto emisión |
| `usuario` | `object {pjrqcdgo: number}` | Sí | Usuario |
| `pathGen` | `string` | Sí | Path XML |
| `autorizacion` | `string` | Sí | Autorización |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha autorización |
| `estado` | `number` | Sí | Estado |
| `estadoEmision` | `number` | Sí | Estado emisión |

---

### 1.2 Entidades del Proceso de Carga TXT

---

#### `CargaArchivoTxt` — tabla `pgs.crtx` — endpoint base: `/crtx`
> Cabecera: una fila por cada vez que se sube un archivo TXT.

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK autoincremental |
| `empresa` | `object {pjrqcdgo: number}` | No | Empresa que carga |
| `usuario` | `object {pjrqcdgo: number}` | No | Usuario que carga |
| `fechaCarga` | `string (ISO 8601)` | Sí | Fecha/hora de carga |
| `nombreArchivo` | `string` | Sí | Nombre del archivo TXT |
| `totalRegistros` | `number` | Sí | Total de líneas procesadas |
| `registrosNuevos` | `number` | Sí | Documentos nuevos |
| `registrosDuplicados` | `number` | Sí | Documentos ya existentes sin diferencias |
| `registrosNovedad` | `number` | Sí | Documentos con diferencias detectadas |
| `estado` | `number` | Sí | `1`=PROCESADO `2`=ERROR_PARCIAL |
| `observacion` | `string` | Sí | Observaciones generales |

---

#### `DetalleCargaTxt` — tabla `pgs.dctx` — endpoint base: `/dctx`
> Detalle: una fila por cada documento/línea del TXT.

| Campo | Tipo JSON | Nullable | Descripción |
|-------|-----------|:--------:|-------------|
| `id` | `number` | No | PK autoincremental |
| `cargaTxt` | `object {id: number}` | No | FK a CargaArchivoTxt |
| `rucEmisor` | `string` | Sí | RUC del emisor |
| `razonSocialEmisor` | `string` | Sí | Razón social del emisor |
| `tipoComprobante` | `string` | Sí | Tipo de comprobante (ver catálogo) |
| `serieComprobante` | `string` | Sí | Serie `001-001-000000001` |
| `claveAcceso` | `string` | Sí | Clave de acceso (49 dígitos) |
| `fechaAutorizacion` | `string (ISO 8601)` | Sí | Fecha de autorización SRI |
| `fechaEmision` | `string (YYYY-MM-DD)` | Sí | Fecha de emisión |
| `identificacionReceptor` | `string` | Sí | RUC del receptor |
| `valorSinImpuestos` | `number` | Sí | Subtotal sin impuestos |
| `iva` | `number` | Sí | Valor IVA |
| `importeTotal` | `number` | Sí | Total del documento |
| `numeroDocumentoModificado` | `string` | Sí | Doc modificado (N/C, N/D) |
| `estadoDocumento` | `number` | Sí | Ver tabla de estados |
| `pathXml` | `string` | Sí | Path del XML subido |
| `fechaCargaXml` | `string (ISO 8601)` | Sí | Fecha/hora de carga del XML |
| `usuarioCargaXml` | `object {pjrqcdgo: number}` | Sí | Usuario que subió el XML |
| `idDocumentoBD` | `number` | Sí | ID en tabla destino (FacturaCompra.id, etc.) |
| `tipoTablaDestino` | `string` | Sí | Nombre de la tabla destino |
| `fechaRegistroBD` | `string (ISO 8601)` | Sí | Fecha de registro en BD |
| `usuarioRegistroBD` | `object {pjrqcdgo: number}` | Sí | Usuario que registró en BD |
| `fechaReversion` | `string (ISO 8601)` | Sí | Fecha de reversión |
| `usuarioReversion` | `object {pjrqcdgo: number}` | Sí | Usuario que revirtió |
| `novedad` | `string` | Sí | Descripción de diferencias detectadas |
| `estadoNovedad` | `number` | Sí | `1`=PENDIENTE `2`=REEMPLAZADO `3`=MANTENIDO |
| `idDetallePrevio` | `number` | Sí | ID del `dctx` previo con misma clave |
| `observacion` | `string` | Sí | Observaciones |

---

## 2. Proceso de Carga de Documentos SRI

### Descripción general

El proceso consta de **5 fases** independientes por documento:

```
[FASE 1] Usuario sube el archivo TXT del SRI
            ↓
         Sistema lee cada línea y crea registro en dctx
         Valida si la clave de acceso ya existe:
           → Si NO existe       → estadoDocumento = 1 (LEÍDO)
           → Si existe SIN dif. → estadoDocumento = 1 (DUPLICADO, nota en observacion)
           → Si existe CON dif. → estadoDocumento = 5 (NOVEDAD, detalle en novedad)

[FASE 2] Usuario sube el XML de un documento específico
            ↓
         Se guarda pathXml, fechaCargaXml, usuarioCargaXml
         estadoDocumento = 2 (XML_CARGADO)

[FASE 3] Sistema parsea el XML y crea registros en tablas CXP
            ↓
         Según tipoComprobante:
           Factura              → FacturaCompra + DetalleFacturaCompra + FormaPagoFacturaCompra + PathFacturaCompra
           Nota de Crédito      → NotaCreditoCompra + DetalleNotaCreditoCompra + PathNotaCreditoCompra
           Nota de Débito       → NotaDebitoCompra + DetalleNotaDebitoCompra + PathNotaDebitoCompra
           Liquidación de compra→ LiquidacionCompraCompra + DetalleLiquidacionCompraCompra + PathLiquidacionCompraCompra
           Retención            → RetencionCompra + DetalleRetencionCompra + PathRetencionCompra
           Retención V2         → RetencionCompraV2 + PathRetencionCompra
         estadoDocumento = 3 (REGISTRADO_BD)

[FASE 4] Si hay NOVEDAD, el usuario decide:
           MANTENER   → estadoNovedad = 3, no se toca nada más
           REEMPLAZAR → se revierte el previo y se ejecuta Fase 2 + Fase 3 con nuevo XML

[FASE 5] Si necesita revertirse:
            ↓
         Se eliminan los registros en las tablas CXP
         estadoDocumento = 6 (REVERTIDO)
```

### Formato del archivo TXT (columnas separadas por TAB)

| # | Columna | Tipo | Ejemplo |
|---|---------|------|---------|
| 1 | `RUC_EMISOR` | string | `1791287541001` |
| 2 | `RAZON_SOCIAL_EMISOR` | string | `MEGADATOS S.A.` |
| 3 | `TIPO_COMPROBANTE` | string | `Factura` |
| 4 | `SERIE_COMPROBANTE` | string | `001-012-020741173` |
| 5 | `CLAVE_ACCESO` | string (49 dígitos) | `0104202601179128754100120010120207411732227568117` |
| 6 | `FECHA_AUTORIZACION` | `dd/MM/yyyy HH:mm:ss` | `01/04/2026 05:16:07` |
| 7 | `FECHA_EMISION` | `dd/MM/yyyy` | `01/04/2026` |
| 8 | `IDENTIFICACION_RECEPTOR` | string | `1793228946001` |
| 9 | `VALOR_SIN_IMPUESTOS` | decimal | `37.5` |
| 10 | `IVA` | decimal | `5.63` |
| 11 | `IMPORTE_TOTAL` | decimal | `43.13` |
| 12 | `NUMERO_DOCUMENTO_MODIFICADO` | string | *(vacío en facturas)* |

> ⚠️ La primera línea es el encabezado y se ignora automáticamente.  
> ⚠️ `NUMERO_DOCUMENTO_MODIFICADO` solo aplica en Notas de Crédito y Notas de Débito.

---

## 3. Endpoints del Proceso de Carga

**Base URL:** `/saaBE/rest/carga-documentos`

---

### FASE 1 — Cargar archivo TXT

**`POST /carga-documentos/cargarTxt`**

El frontend lee el archivo con `FileReader.readAsText()` y envía el contenido completo.

**Request:**
```json
{
  "contenidoTxt": "RUC_EMISOR\tRAZON_SOCIAL_EMISOR\t...\n1791287541001\tMEGADATOS S.A.\tFactura\t001-012-020741173\t0104202601179128754100120010120207411732227568117\t01/04/2026 05:16:07\t01/04/2026\t1793228946001\t37.5\t5.63\t43.13\t",
  "nombreArchivo": "1793228946001_Recibidos.txt",
  "idEmpresa": 1,
  "idUsuario": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|:---------:|-------------|
| `contenidoTxt` | `string` | ✅ | Contenido completo del archivo leído |
| `nombreArchivo` | `string` | ✅ | Nombre original del archivo |
| `idEmpresa` | `number` | ✅ | ID de la empresa receptora |
| `idUsuario` | `number` | ✅ | ID del usuario que carga |

**Response `201`:**
```json
{
  "idCargaTxt": 42,
  "nombreArchivo": "1793228946001_Recibidos.txt",
  "totalRegistros": 20,
  "nuevos": 18,
  "duplicados": 1,
  "novedades": 1,
  "detalles": [
    {
      "linea": 1,
      "serie": "001-012-020741173",
      "claveAcceso": "0104202601179128754100120010120207411732227568117",
      "resultado": "NUEVO"
    },
    {
      "linea": 2,
      "serie": "001-012-020741172",
      "claveAcceso": "0104202601179128754100120010120207411722212415017",
      "resultado": "DUPLICADO"
    },
    {
      "linea": 4,
      "serie": "001-001-000090015",
      "claveAcceso": "0204202601179319944100120010010000900157985907315",
      "resultado": "NOVEDAD",
      "diferencias": "importeTotal: previo=19.00 nuevo=19.31"
    }
  ]
}
```

**Response `500`:**
```json
{ "error": "Error al cargar TXT: descripción del error" }
```

---

### Consultar resumen de una carga

**`GET /carga-documentos/resumen/{idCargaTxt}`**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idCargaTxt` | `number` (path) | ID retornado en la Fase 1 |

**Response `200`:**
```json
{
  "cabecera": {
    "id": 42,
    "empresa": { "pjrqcdgo": 1 },
    "usuario": { "pjrqcdgo": 5 },
    "fechaCarga": "2026-07-19T10:30:00",
    "nombreArchivo": "1793228946001_Recibidos.txt",
    "totalRegistros": 20,
    "registrosNuevos": 18,
    "registrosDuplicados": 1,
    "registrosNovedad": 1,
    "estado": 1,
    "observacion": null
  },
  "detalles": [
    {
      "id": 101,
      "cargaTxt": { "id": 42 },
      "rucEmisor": "1791287541001",
      "razonSocialEmisor": "MEGADATOS S.A.",
      "tipoComprobante": "Factura",
      "serieComprobante": "001-012-020741173",
      "claveAcceso": "0104202601179128754100120010120207411732227568117",
      "fechaAutorizacion": "2026-04-01T05:16:07",
      "fechaEmision": "2026-04-01",
      "identificacionReceptor": "1793228946001",
      "valorSinImpuestos": 37.5,
      "iva": 5.63,
      "importeTotal": 43.13,
      "numeroDocumentoModificado": null,
      "estadoDocumento": 1,
      "pathXml": null,
      "fechaCargaXml": null,
      "usuarioCargaXml": null,
      "idDocumentoBD": null,
      "tipoTablaDestino": null,
      "fechaRegistroBD": null,
      "usuarioRegistroBD": null,
      "fechaReversion": null,
      "usuarioReversion": null,
      "novedad": null,
      "estadoNovedad": null,
      "idDetallePrevio": null,
      "observacion": null
    }
  ]
}
```

---

### FASE 2 — Subir XML de un documento

**`POST /carga-documentos/cargarXml/{idDetalle}`**

El frontend lee el archivo XML con `FileReader.readAsText()`.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idDetalle` | `number` (path) | `id` del registro `dctx` — debe tener `estadoDocumento = 1` |

**Request:**
```json
{
  "contenidoXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
  "pathDestino": "/docs/xml/cxp/0104202601179128754100120010120207411732227568117.xml",
  "idUsuario": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|:---------:|-------------|
| `contenidoXml` | `string` | ✅ | Contenido completo del XML |
| `pathDestino` | `string` | ✅ | Ruta donde se guardará. Sugerido: `/docs/xml/cxp/{claveAcceso}.xml` |
| `idUsuario` | `number` | ✅ | ID del usuario |

**Response `200`:**
```json
{
  "id": 101,
  "estadoDocumento": 2,
  "pathXml": "/docs/xml/cxp/0104202601179128754100120010120207411732227568117.xml",
  "fechaCargaXml": "2026-07-19T11:00:00",
  "usuarioCargaXml": { "pjrqcdgo": 5 }
}
```

---

### FASE 3 — Registrar documento en BD

**`POST /carga-documentos/registrarBD/{idDetalle}`**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idDetalle` | `number` (path) | `id` del registro `dctx` — debe tener `estadoDocumento = 2` |

**Request:**
```json
{
  "idEmpresa": 1,
  "idUsuario": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|:---------:|-------------|
| `idEmpresa` | `number` | ✅ | ID de la empresa |
| `idUsuario` | `number` | ✅ | ID del usuario |

**Response `200`:**
```json
{
  "idDocumentoBD": 512,
  "tipoTablaDestino": "FACTURA_COMPRA",
  "mensaje": "FacturaCompra registrada con id=512"
}
```

> Los posibles valores de `tipoTablaDestino`:
> `FACTURA_COMPRA` | `NOTA_CREDITO_COMPRA` | `NOTA_DEBITO_COMPRA` | `LIQUIDACION_COMPRA_COMPRA` | `RETENCION_COMPRA` | `RETENCION_COMPRA_V2`

---

### FASE 4 — Resolver novedad

#### Consultar novedades pendientes

**`GET /carga-documentos/novedades/{idEmpresa}`**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idEmpresa` | `number` (path) | ID de la empresa |

**Response `200`:** *(Lista de `DetalleCargaTxt` con `estadoDocumento=5` y `estadoNovedad=1`)*
```json
[
  {
    "id": 105,
    "rucEmisor": "1793199441001",
    "razonSocialEmisor": "CERTIFICADA EC S.A.S.",
    "serieComprobante": "001-001-000090015",
    "claveAcceso": "0204202601179319944100120010010000900157985907315",
    "fechaEmision": "2026-04-02",
    "importeTotal": 19.31,
    "estadoDocumento": 5,
    "estadoNovedad": 1,
    "novedad": "importeTotal: previo=19.00 nuevo=19.31",
    "idDetallePrevio": 88
  }
]
```

#### Resolver una novedad

**`POST /carga-documentos/resolverNovedad/{idDetalle}`**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idDetalle` | `number` (path) | `id` del `dctx` con `estadoDocumento = 5` |

**Request — opción MANTENER:**
```json
{
  "accion": "MANTENER",
  "idUsuario": 5
}
```

**Request — opción REEMPLAZAR:**
```json
{
  "accion": "REEMPLAZAR",
  "contenidoXml": "<?xml version=\"1.0\"?>...",
  "pathDestino": "/docs/xml/cxp/0204202601179319944100120010010000900157985907315_v2.xml",
  "idUsuario": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|:---------:|-------------|
| `accion` | `string` | ✅ | `"MANTENER"` o `"REEMPLAZAR"` |
| `contenidoXml` | `string` | Solo si REEMPLAZAR | Nuevo XML |
| `pathDestino` | `string` | Solo si REEMPLAZAR | Path destino del nuevo XML |
| `idUsuario` | `number` | ✅ | ID del usuario |

**Response `200` (MANTENER):**
```json
{
  "accion": "MANTENIDO",
  "mensaje": "Se mantiene el documento previo sin cambios."
}
```

**Response `200` (REEMPLAZAR):**
```json
{
  "accion": "REEMPLAZADO",
  "idDocumentoBD": 513,
  "tipoTablaDestino": "FACTURA_COMPRA",
  "mensaje": "FacturaCompra registrada con id=513"
}
```

---

### FASE 5 — Revertir un documento

**`POST /carga-documentos/revertir/{idDetalle}`**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idDetalle` | `number` (path) | `id` del `dctx` — debe tener `estadoDocumento = 3` |

**Request:**
```json
{
  "idUsuario": 5
}
```

**Response `200`:**
```json
{
  "mensaje": "Documento revertido correctamente.",
  "idDetalleCargaTxt": 101,
  "idDocumentoBD": 512,
  "tipoTablaDestino": "FACTURA_COMPRA"
}
```

**Response `500`:**
```json
{ "error": "Solo se pueden revertir documentos con estado REGISTRADO_BD (3). Estado actual: 1" }
```

---

## 4. Endpoints CRUD por Entidad

> Todos los endpoints CRUD siguen el mismo patrón.  
> **Base URL:** `/saaBE/rest/`

### Patrón general

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| `GET` | `/{entidad}/getAll` | — | Lista todos los registros |
| `GET` | `/{entidad}/getId/{id}` | — | Obtiene un registro por ID |
| `GET` | `/{entidad}/getByCriteria` | `[DatosBusqueda]` | Busca por criterios |
| `POST` | `/{entidad}` | Objeto entidad | Crea nuevo registro |
| `PUT` | `/{entidad}` | Objeto entidad con ID | Actualiza registro |
| `DELETE` | `/{entidad}/delete/{id}` | — | Elimina por ID |

### Tabla de rutas por entidad

| Entidad | Ruta base |
|---------|-----------|
| `FacturaCompra` | `/fctc` |
| `DetalleFacturaCompra` | `/dfcc` |
| `PathFacturaCompra` | `/pfcc` |
| `FormaPagoFacturaCompra` | `/fpfm` |
| `LiquidacionCompraCompra` | `/lqcc` |
| `DetalleLiquidacionCompraCompra` | `/dlcm` |
| `PathLiquidacionCompraCompra` | `/plcc` |
| `FormaPagoLiquidacionCompraCompra` | `/fplm` |
| `NotaCreditoCompra` | `/ntcc` |
| `DetalleNotaCreditoCompra` | `/dtcc` |
| `PathNotaCreditoCompra` | `/ptcv` |
| `NotaDebitoCompra` | `/ntdc` |
| `DetalleNotaDebitoCompra` | `/dtdc` |
| `PathNotaDebitoCompra` | `/ptdc` |
| `RetencionCompra` | `/rtcm` |
| `DetalleRetencionCompra` | `/drcm` |
| `PathRetencionCompra` | `/prcm` |
| `RetencionCompraV2` | `/rcv2` |
| `CargaArchivoTxt` | `/crtx` |
| `DetalleCargaTxt` | `/dctx` |

### Ejemplo de `DatosBusqueda` para `getByCriteria`

```json
[
  {
    "campo": "cargaTxt.id",
    "valor": "42",
    "operador": "="
  }
]
```

---

## 5. Flujo de Pantallas

### Pantalla 1 — Historial de Cargas

**Descripción:** Lista todas las cargas realizadas.

**Llamada al cargar:**
```
GET /crtx/getAll
```

**Columnas de la tabla:**

| Columna | Campo |
|---------|-------|
| ID | `id` |
| Archivo | `nombreArchivo` |
| Fecha de Carga | `fechaCarga` |
| Usuario | `usuario` |
| Total | `totalRegistros` |
| Nuevos | `registrosNuevos` |
| Duplicados | `registrosDuplicados` |
| Novedades | `registrosNovedad` |
| Estado | `estado` |

**Acciones:**
- Botón **"Nueva Carga"** → abre modal de carga de TXT → llama `POST /carga-documentos/cargarTxt`
- Botón **"Ver Documentos"** por fila → navega a Pantalla 2 con `idCargaTxt`

---

### Pantalla 2 — Documentos de una Carga

**Descripción:** Lista de todos los documentos leídos del TXT con su estado actual.

**Llamada al cargar:**
```
GET /carga-documentos/resumen/{idCargaTxt}
```

**Columnas de la tabla:**

| Columna | Campo |
|---------|-------|
| ID | `id` |
| RUC Emisor | `rucEmisor` |
| Razón Social | `razonSocialEmisor` |
| Tipo | `tipoComprobante` |
| Serie | `serieComprobante` |
| Fecha Emisión | `fechaEmision` |
| Sin Impuestos | `valorSinImpuestos` |
| IVA | `iva` |
| Total | `importeTotal` |
| Estado | `estadoDocumento` (badge con color) |
| Novedad | `novedad` |

**Acciones por fila según `estadoDocumento`:**

| Estado | Botón disponible | Acción |
|:------:|-----------------|--------|
| `1` LEÍDO | **Subir XML** | Abre modal → `POST /carga-documentos/cargarXml/{id}` |
| `2` XML CARGADO | **Registrar en BD** | Confirmar → `POST /carga-documentos/registrarBD/{id}` |
| `3` REGISTRADO | **Revertir** | Confirmar → `POST /carga-documentos/revertir/{id}` |
| `4` ERROR | **Reintentar** | Vuelve a estado 1, repite flujo |
| `5` NOVEDAD | **Resolver** | Abre modal de resolución |
| `6` REVERTIDO | *(sin acción)* | Solo visualización |

---

### Pantalla 3 — Modal: Subir XML

**Trigger:** Botón "Subir XML" en Pantalla 2 (documento con `estadoDocumento = 1`)

**Campos del formulario:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Archivo XML | `file input (accept=".xml")` | Se lee con `FileReader` |
| Path destino | `string` (auto-calculado) | `/docs/xml/cxp/{claveAcceso}.xml` |

**Al confirmar:**
```
POST /carga-documentos/cargarXml/{idDetalle}
Body: { contenidoXml, pathDestino, idUsuario }
```

---

### Pantalla 4 — Modal: Registrar en BD

**Trigger:** Botón "Registrar en BD" (documento con `estadoDocumento = 2`)

**Muestra resumen del documento:**
- Tipo de comprobante
- Serie
- Emisor
- Total

**Al confirmar:**
```
POST /carga-documentos/registrarBD/{idDetalle}
Body: { idEmpresa, idUsuario }
```

---

### Pantalla 5 — Modal: Resolver Novedad

**Trigger:** Botón "Resolver" (documento con `estadoDocumento = 5`)

**Muestra:**
- Descripción de la diferencia detectada (`novedad`)
- Documento previo (`idDetallePrevio`)

**Opciones del usuario:**

**Opción A — MANTENER:**
```
POST /carga-documentos/resolverNovedad/{idDetalle}
Body: { "accion": "MANTENER", "idUsuario": 5 }
```

**Opción B — REEMPLAZAR** (solicita nuevo XML):
```
POST /carga-documentos/resolverNovedad/{idDetalle}
Body: {
  "accion": "REEMPLAZAR",
  "contenidoXml": "...",
  "pathDestino": "/docs/xml/cxp/{claveAcceso}_v2.xml",
  "idUsuario": 5
}
```

---

### Pantalla 6 — Modal: Revertir Documento

**Trigger:** Botón "Revertir" (documento con `estadoDocumento = 3`)

**Advertencia:** "Esta acción eliminará los registros creados en BD. ¿Desea continuar?"

**Al confirmar:**
```
POST /carga-documentos/revertir/{idDetalle}
Body: { "idUsuario": 5 }
```

---

### Pantalla 7 — Novedades Pendientes

**Descripción:** Vista centralizada de todas las novedades sin resolver de la empresa.

**Llamada al cargar:**
```
GET /carga-documentos/novedades/{idEmpresa}
```

**Columnas de la tabla:**

| Columna | Campo |
|---------|-------|
| ID | `id` |
| RUC Emisor | `rucEmisor` |
| Razón Social | `razonSocialEmisor` |
| Serie | `serieComprobante` |
| Total previo | *(consultar `idDetallePrevio`)* |
| Total nuevo | `importeTotal` |
| Diferencia | `novedad` |
| Fecha Carga | `cargaTxt.fechaCarga` |

**Acción:** Botón **"Resolver"** por fila → abre Modal de Pantalla 5.

---

## 6. Estados y Catálogos

### Estado del Documento (`estadoDocumento`)

| Valor | Nombre | Color | Descripción |
|:-----:|--------|:-----:|-------------|
| `1` | LEÍDO | 🔵 `#2196F3` | Leído del TXT, pendiente de XML |
| `2` | XML CARGADO | 🟡 `#FF9800` | XML subido, pendiente de registro en BD |
| `3` | REGISTRADO EN BD | 🟢 `#4CAF50` | Registros creados en tablas CXP |
| `4` | ERROR | 🔴 `#F44336` | Falló en algún paso del proceso |
| `5` | NOVEDAD | 🟠 `#FF5722` | Ya existía con valores distintos |
| `6` | REVERTIDO | ⚫ `#9E9E9E` | Registros de BD eliminados |

### Estado de Novedad (`estadoNovedad`)

| Valor | Nombre | Descripción |
|:-----:|--------|-------------|
| `1` | PENDIENTE | Sin resolución |
| `2` | REEMPLAZADO | Usuario eligió reemplazar XML y re-registrar |
| `3` | MANTENIDO | Usuario eligió mantener el documento previo |

### Tipo de Tabla Destino (`tipoTablaDestino`)

| Valor | Entidad creada |
|-------|---------------|
| `FACTURA_COMPRA` | `FacturaCompra` + detalles + formaPago + path |
| `NOTA_CREDITO_COMPRA` | `NotaCreditoCompra` + detalles + path |
| `NOTA_DEBITO_COMPRA` | `NotaDebitoCompra` + detalles + path |
| `LIQUIDACION_COMPRA_COMPRA` | `LiquidacionCompraCompra` + detalles + path |
| `RETENCION_COMPRA` | `RetencionCompra` + detalles + path |
| `RETENCION_COMPRA_V2` | `RetencionCompraV2` + path |

### Tipos de Comprobante (TXT SRI)

| Valor en TXT | `tipoTablaDestino` resultante |
|--------------|-------------------------------|
| `Factura` | `FACTURA_COMPRA` |
| `Nota de Crédito` | `NOTA_CREDITO_COMPRA` |
| `Nota de Débito` | `NOTA_DEBITO_COMPRA` |
| `Liquidación de compra` | `LIQUIDACION_COMPRA_COMPRA` |
| `Comprobante de Retención` | `RETENCION_COMPRA` |
| `Comprobante de Retención electrónica versión 2.0` | `RETENCION_COMPRA_V2` |

---

## 7. Formato del Archivo TXT del SRI

### Ejemplo real (columnas separadas por TAB)

```
RUC_EMISOR	RAZON_SOCIAL_EMISOR	TIPO_COMPROBANTE	SERIE_COMPROBANTE	CLAVE_ACCESO	FECHA_AUTORIZACION	FECHA_EMISION	IDENTIFICACION_RECEPTOR	VALOR_SIN_IMPUESTOS	IVA	IMPORTE_TOTAL	NUMERO_DOCUMENTO_MODIFICADO
1791287541001	MEGADATOS S.A.	Factura	001-012-020741173	0104202601179128754100120010120207411732227568117	01/04/2026 05:16:07	01/04/2026	1793228946001	37.5	5.63	43.13	
1791287541001	MEGADATOS S.A.	Factura	001-012-020741172	0104202601179128754100120010120207411722212415017	01/04/2026 05:16:07	01/04/2026	1793228946001	27.5	4.13	31.63	
0991331859001	ATIMASA S.A.	Factura	265-051-000272846	0104202601099133185900122650510002728461357246814	01/04/2026 08:52:47	01/04/2026	1793228946001	17.39	2.61	20	
1793199441001	CERTIFICADA EC S.A.S.	Factura	001-001-000090015	0204202601179319944100120010010000900157985907315	02/04/2026 16:11:25	02/04/2026	1793228946001	16.79	2.52	19.31	
```

### Lógica de lectura en JavaScript (sugerencia)

```javascript
// Leer el archivo TXT en el frontend
const leerArchivoTxt = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file, 'UTF-8');
  });
};

// Llamar al endpoint de carga
const cargarTxt = async (file, idEmpresa, idUsuario) => {
  const contenidoTxt = await leerArchivoTxt(file);
  const response = await fetch('/saaBE/rest/carga-documentos/cargarTxt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contenidoTxt,
      nombreArchivo: file.name,
      idEmpresa,
      idUsuario
    })
  });
  return response.json();
};

// Leer y subir XML
const cargarXml = async (file, idDetalle, idUsuario) => {
  const contenidoXml = await leerArchivoTxt(file);
  const claveAcceso  = ''; // obtener del detalle seleccionado
  const pathDestino  = `/docs/xml/cxp/${claveAcceso}.xml`;
  const response = await fetch(`/saaBE/rest/carga-documentos/cargarXml/${idDetalle}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contenidoXml, pathDestino, idUsuario })
  });
  return response.json();
};
```

---

## Notas Generales

- Todas las fechas se manejan en formato **ISO 8601**: `"2026-04-01T05:16:07"`.
- Todos los endpoints retornan `Content-Type: application/json`.
- En caso de error, todos los endpoints retornan `{ "error": "descripción" }` con status `500`.
- Los campos de tipo objeto (`empresa`, `titular`, `usuario`, etc.) se envían como `{ "pjrqcdgo": valor }` o `{ "id": valor }` según corresponda.
- El campo `ambiente`: `1 = PRUEBA`, `2 = PRODUCCIÓN`.
- El campo `estado` en entidades: `1 = ACTIVO`, `0 = INACTIVO`.
