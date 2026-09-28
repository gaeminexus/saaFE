# API — Detalle del ATS en pantalla (`POST /rest/ats/detalle`)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-28 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/cxc/API-DETALLE-ATS.md`. La pantalla del ATS vive en el módulo `cxc` del
frontend (`cxc/reportes/ats`), aunque el backend sea `sri`.

---

## 1. El pedido, textual

> *«Se requiere una pantalla que me permita ver todo el listado de documentos de un mes con esos
> datos [base 0, base 15, IVA 15…] para poder compararlo con el ATS, y también exportar a Excel. Si
> en esa pantalla [Consulta de Documentos de cxp] no se puede, se debe crear una nueva pantalla de
> consulta que lea de las tablas de los documentos y muestre esos valores.»*

Decisiones del usuario (2026-09-28):

| Pregunta | Decisión |
|---|---|
| ¿De dónde salen las cifras? | **De las mismas líneas que arma el generador del ATS.** No hay una consulta paralela |
| ¿Entra `sri` al alcance? | **Sí** |
| ¿Qué documentos? | **Compras, retenciones y ventas**: el ATS entero en pantalla |
| ¿Formato de exportación? | **CSV** (lo abre Excel). No se agrega ninguna librería de `.xlsx` |

## 2. Por qué no se extiende Consulta de Documentos de `cxp`

Esa pantalla lista primero desde `DocumentoCxp` (`PGS.DCXP`, la bandeja de carga), que solo guarda
subtotal, IVA y total. El desglose por tarifa vive en `FCTC`/`NTCC`/`NTDC`/`LQCC` y hoy solo se ve en
la ficha, documento por documento (`consulta-documentos.component.ts:755-759`).

**El motivo de fondo no es técnico, es de verdad única:** una pantalla para *comparar contra el ATS*
que calcule las bases por su cuenta es un **segundo cálculo** del mismo período. Ya pasó una vez: el
ATS excluía las facturas de intermediario y el cuadre 104 no, y dos reportes del mismo mes se
contradecían (estado del equipo §46.8, `ReporteCuadreSriServiceImpl:339`). El generador tiene reglas
que una consulta nueva tendría que copiar exactas, y que ya cambiaron cuatro veces este mes:

- el período es `fechaRegistroContable`, **y si falta**, la fecha de emisión;
- se excluyen las facturas de intermediario (`FCTCESIN = 1`) y los documentos no activos;
- la **liquidación emitida por ASOPREP** (referenciada por `CBR.LQCS`) no resta `SUBCERO`;
- la base gravada es una **resta** (`SUBTOTAL − SUBCERO − SUBNOOBJ − SUBEXENT`) y se deja en 0 si da negativa;
- la retención se enlaza por `autorización | número normalizado a 15`.

**Por eso la pantalla muestra lo que el generador arma, no lo que la tabla tiene.**

## 3. Diseño del backend

### 3.1 La regla que no se negocia: el XML del ATS no cambia ni un byte

Dos datos que la pantalla necesita **se calculan hoy mientras se escribe el XML**, dentro de
`writeDetalleCompra`:

1. **qué retención quedó enlazada a cada compra** (`clavesRetencionUsadas`, `:840-848` aprox.);
2. **dos avisos**: el del proveedor con pasaporte y el de *«supera USD 500 sin forma de pago»*.

Así que el detalle **no reconstruye** ese recorrido: **genera el XML igual que `generarAts` y lo
descarta**. Cuesta milisegundos, y garantiza que los avisos y los enlaces de la pantalla son los
mismos que los del archivo.

### 3.2 Refactor de `GeneradorAtsServiceImpl` — extracción pura

1. **Extraer** todo lo que hoy va desde el inicio de `generarAts` hasta la llamada a `generarXml`
   inclusive (validaciones, rangos de fecha, aviso RIMPE, las cuatro listas de compra, las facturas de
   intermediario, ventas, retenciones recibidas, retenciones de compra, el bloque del ÍTEM 13b, los
   anulados y `totalVentasDeclarado`) a:

   ```java
   private ArmadoAts armar(Long idFacturador, int anio, int mes) throws Throwable
   ```

   `ArmadoAts` es una `private static class` nueva, junto a `LineaCompra`, con campos `final`:
   `facturador`, `periodo`, `compras`, `ventas`, `anulados`, `facturasIntermediario`,
   `retencionesCompra`, `clavesRetencionUsadas`, `totalVentasDeclarado`, `xml` y `avisos`.

2. `generarAts` queda como `armar(...)` + nombre de archivo + zip + aviso de tamaño +
   `ResultadoGeneracionAts`. **Mismo orden de avisos y mismos mensajes.**

3. `LineaCompra` gana dos campos `final` al **final** del constructor: `String origen` y
   `Long idDocumento`. Se pasan en los cuatro `new LineaCompra(...)`:

   | Método | `origen` | `idDocumento` |
   |---|---|---|
   | `comprasFacturaCompra` | `"FACTURA"` | `f.getId()` |
   | `comprasLiquidacion` | `"LIQUIDACION"` | `l.getId()` |
   | `comprasNotaCredito` | `"NOTA_CREDITO"` | `n.getId()` |
   | `comprasNotaDebito` | `"NOTA_DEBITO"` | `n.getId()` |

   ⚠️ Dentro de `comprasFacturaCompra` están **tanto** la factura (`01`) **como** la nota de venta
   (`02`). El `origen` es la tabla (`FACTURA`) y el tipo se lee de `tipoComprobante`.

4. **Dos helpers extraídos de `writeDetalleCompra`**, que pasa a llamarlos (mismo resultado):
   - `private String claveRetencion(LineaCompra c)`: la expresión de la clave `autorización|número`,
     o `null` si no hay autorización.
   - `private List<String> formasPagoDeclarables(LineaCompra c, RetencionInfo ret)`: la lista
     `formasPago` que hoy se arma en línea (la del documento, o la de la retención como respaldo).

5. **Nada más se toca.** No se cambian filtros, fórmulas, mensajes, orden de consultas ni
   `formatDecimal`. Si el ejecutor ve algo que *parece* un defecto en el generador, **lo reporta y
   no lo corrige** en este frente.

### 3.3 Método nuevo

```java
// GeneradorAtsService
DetalleAts detalleAts(Long idFacturador, int anio, int mes) throws Throwable;
```

Implementación: `ArmadoAts a = armar(idFacturador, anio, mes);` y mapear a los DTO de la §4. Empieza
con la traza `System.out.println("=== detalleAts | facturador=… | periodo=…/… ===")` de la casa.

### 3.4 ⛔ Todo monto del DTO se pasa por `formatDecimal`

```java
private double comoDeclarado(double valor) { return Double.parseDouble(formatDecimal(valor)); }
```

`formatDecimal` (`:1443`) hace **`Math.abs`** y redondea a 2 con `%.2f`. `redondear` (`:1529`) **no**
aplica `Math.abs` y redondea distinto en los bordes. Si el DTO usara el `double` crudo o `redondear`,
una nota de crédito podría verse negativa en pantalla y positiva en el XML, y un centavo podría no
coincidir. **Cada monto de la §4 es `comoDeclarado(x)`**, y los totales se suman **ya redondeados**,
línea por línea, igual que se suman a mano sobre el XML.

### 3.5 DTO — `com.saa.ejb.sri.service.dto`, junto a `ResultadoGeneracionAts`

POJOs planos con getters y setters escritos a mano, como `ResultadoGeneracionAts`. **Sin anotaciones
de Jackson**: basta una en el proyecto para que WildFly apague JSON-B (`CLAUDE.md`, «Serialización»).
Fechas como `LocalDate`: viajan como arreglo `[2026,8,10]`.

Archivos: `DetalleAts.java`, `CompraAts.java`, `AirAts.java`, `VentaAts.java`, `AnuladoAts.java`,
`CompraExcluidaAts.java`.

## 4. Contrato

### 4.1 Request

```
POST /SaaBE/rest/ats/detalle
Content-Type: application/json

{ "idFacturador": 1, "anio": 2026, "mes": 8 }
```

Mismo cuerpo y mismas validaciones que `POST /ats/generar` (`AtsRest.java`); se copia su método tal
cual cambiando la llamada y el texto del 500.

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| **200** | siempre que se pudo armar, **aunque no haya un solo documento** | `DetalleAts` |
| **400** | falta `idFacturador`/`anio`/`mes`, mes fuera de 1-12, facturador inexistente o sin empresa (`IncomeException`) | texto plano del mensaje |
| **500** | cualquier otra cosa | `"Error al consultar el detalle del ATS: " + mensaje` |

⚠️ Un período sin documentos **no es error**: responde 200 con las listas vacías. El 400 es solo
para los casos de `IncomeException` que ya lanza `generarAts`.

### 4.2 Response 200 — `DetalleAts`

```jsonc
{
  "nombreArchivo": "AT082026.xml",       // el que tendría el XML: para que el usuario sepa contra cuál compara
  "anio": 2026, "mes": 8,
  "compras":   [ /* CompraAts */ ],        // en el MISMO orden en que van al XML
  "ventas":    [ /* VentaAts */ ],
  "anulados":  [ /* AnuladoAts */ ],
  "excluidas": [ /* CompraExcluidaAts */ ],  // intermediario: NO van al ATS
  "retencionesNoEnlazadas": [ { "numeroRetencion": "...", "documentoSustento": "...", "autorizacion": "..." } ],
  "totalesCompras": {                      // suma de las líneas de `compras`, ya redondeadas
    "cantidad": 71,
    "baseNoGraIva": 0.00, "baseImponible": 0.00, "baseImpGrav": 0.00, "baseImpExe": 0.00,
    "montoIce": 0.00, "montoIva": 0.00, "total": 0.00,
    "retencionIva": 0.00, "retencionRenta": 0.00
  },
  "totalesVentas": {
    "cantidadLineas": 0, "numeroComprobantes": 0,
    "baseImponible": 0.00, "baseImpGrav": 0.00, "montoIva": 0.00, "montoIce": 0.00,
    "valorRetIva": 0.00, "valorRetRenta": 0.00
  },
  "totalVentasDeclarado": 0.00,           // el <totalVentas> de la cabecera del XML
  "avisos": [ "..." ]                     // LOS MISMOS que devolvería /ats/generar, en el mismo orden
}
```

`retencionesNoEnlazadas` sale de las claves de `retencionesCompra` que **no** están en
`clavesRetencionUsadas` después de `generarXml`: el mismo recorrido que produce hoy el aviso
*«Retención … no quedó enlazada a ninguna compra»* (`generarXml`, bucle después de `</compras>`).

### 4.3 `CompraAts` — una por `<detalleCompras>`

| Campo | Tipo | Sale de | Elemento del ATS |
|---|---|---|---|
| `origen` | string | `LineaCompra.origen` | — |
| `idDocumento` | number | `LineaCompra.idDocumento` | — |
| `tipoComprobante` | string | `c.tipoComprobante` | `tipoComprobante` |
| `codSustento` | string | `c.codSustento` | `codSustento` |
| `tpIdProv` | string | `tipoIdentificacionCompra(c.titular)` | `tpIdProv` |
| `idProv` | string | `titular.identificacion` | `idProv` |
| `proveedor` | string | `titular.razonSocial`; si está vacía, `titular.nombre` | — |
| `numeroDocumento` | string | `establecimiento-puntoEmision-secuencial` | — |
| `establecimiento` · `puntoEmision` · `secuencial` | string | `c.*` | ídem |
| `autorizacion` | string | `c.autorizacion` | `autorizacion` |
| `fechaEmision` | LocalDate | `c.fechaEmision` | `fechaEmision` |
| `fechaRegistro` | LocalDate | `c.fechaRegistro`, **y si es null `c.fechaEmision`** (lo mismo que escribe el XML) | `fechaRegistro` |
| `fechaRegistroCapturada` | boolean | `c.fechaRegistro != null` | — |
| `baseNoGraIva` | number | `c.baseNoObjeto` | `baseNoGraIva` |
| `baseImponible` | number | `c.base0` — **base 0%** | `baseImponible` |
| `baseImpGrav` | number | `c.baseGravada` — **base gravada (15%, 5% y 8% juntas)** | `baseImpGrav` |
| `baseImpExe` | number | `c.baseExenta` | `baseImpExe` |
| `montoIce` · `montoIva` | number | `c.montoIce` · `c.montoIva` | ídem |
| `total` | number | suma de las seis anteriores, ya redondeadas | — |
| `valRetBien10` … `valRetServ100` | number ×6 | `RetencionInfo`, 0 si no hay | los seis `valRet*` |
| `retencionIva` | number | suma de los seis anteriores | — |
| `air` | `AirAts[]` | `ret.airLineas`; vacío si no hay | `detalleAir` |
| `retencionRenta` | number | suma de `air[].valRetAir` | — |
| `numeroRetencion` | string \| null | `estabRetencion1-ptoEmiRetencion1-secRetencion1`, null si no hay | `*Retencion1` |
| `autorizacionRetencion` | string \| null | `ret.autRetencion1` | `autRetencion1` |
| `fechaRetencion` | LocalDate \| null | `ret.fechaEmiRet1` | `fechaEmiRet1` |
| `formasPago` | string[] | `formasPagoDeclarables(c, ret)` | `formaPago` |
| `formasPagoDeclaradas` | boolean | `total > 500` y `formasPago` no vacía: **solo entonces van al XML** | — |

`AirAts`: `{ codRetAir: string, baseImpAir: number, porcentajeAir: number, valRetAir: number }`.
`DetalleAir` guarda **strings ya formateados**: se convierten con `Double.parseDouble`, sin volver a
formatear.

⚠️ **La base al 15% no existe como columna, ni acá ni en la tabla.** `baseImpGrav` es la resta, y
**incluye** lo del 5% y el 8% (el ATS no tiene elemento para esas tarifas). La pantalla lo tiene que
decir en el encabezado de la columna, no en una nota al pie.

### 4.4 `VentaAts` — una por `<detalleVentas>` (agrupada por cliente y tipo)

`tpIdCliente`, `idCliente`, `cliente` (razón social o nombre), `tipoComprobante`,
`numeroComprobantes`, `idsDocumento` (number[]), `baseNoGraIva` (**siempre 0**: el XML escribe
`"0.00"` fijo), `baseImponible`, `baseImpGrav`, `montoIva`, `montoIce`, `valorRetIva`, `valorRetRenta`.

⚠️ El ATS de ventas **no va por documento**, va **agrupado por cliente y tipo**. La pantalla muestra
lo mismo, con la cantidad de comprobantes. Si el usuario necesita la venta por documento, es otro
pedido.

### 4.5 `AnuladoAts` y `CompraExcluidaAts`

- `AnuladoAts`: `tipoComprobante`, `establecimiento`, `puntoEmision`, `secuencial`, `autorizacion`.
- `CompraExcluidaAts`, una por factura de `facturasIntermediario`: `idDocumento`, `tipoComprobante`,
  `idProv`, `proveedor`, `numeroDocumento`, `fechaEmision`, `subtotal`, `montoIva`, `total`
  (`FacturaCompra.total`; si es null, subtotal + IVA), `motivo: "INTERMEDIARIO"`, y
  `numeroRetencion` si tiene una retención enlazada (el caso del aviso del ÍTEM 13b).

## 5. Diseño del frontend

- **Pantalla nueva** `cxc/reportes/ats-detalle/` (standalone, con `index.ts` como `cxc/reportes/ats/`).
  Ruta `reportes/ats-detalle` en `app.routes.ts`, al lado de `reportes/ats` (`:982`), con
  `loadComponent` y `authGuard`, título `'Detalle del ATS'`.
- **Menú:** entrada `displayName: 'Detalle del ATS'` (15 caracteres, el límite es 24:
  `docs/patrones/NOMBRES-DE-MENU-LATERAL.md`), debajo de «ATS y Cuadre 103/104» en
  `menucuentasxcobrar.component.ts:~141`, **con el mismo `idPermiso`**
  (`Permisos.CXC_ATS_Y_CUADRE_103_104`). ⛔ **No se crea un permiso nuevo**: requeriría un alta en el
  sistema de seguridades que no hace ningún script (precedente: el permiso 900, estado §36).
- **Desde la pantalla del ATS:** botón «Ver detalle» que navega a la nueva con
  `queryParams: { idFacturador, periodo: 'yyyy-MM' }`. La nueva los lee al iniciar y consulta sola.
- **Filtros:** facturador + mes, copiados de `ats.component.ts` (`periodoMes`, `mesAnteriorISO`,
  combo de facturadores). Botón «Consultar».
- **Pestañas:** `Compras (n)` · `Ventas (n)` · `Anulados (n)` · `Excluidas y sin enlazar (n)` ·
  `Avisos (n)`.
- **Compras:** tabla con filtro de texto (proveedor, RUC o número), ordenamiento y paginador. Fila de
  totales **del período completo** (`totalesCompras`, no la página visible). Columnas visibles por
  defecto: Tipo, N° documento, Proveedor, RUC, F. emisión, F. registro, No objeto, Base 0%, Base
  gravada, Exento, IVA, ICE, Total, Ret. IVA, Ret. renta, N° retención. El detalle `air` y los seis
  `valRet*` en una fila expandible o en un diálogo.
  - Encabezado de «Base gravada»: `Base gravada (15% + 5% + 8%)`, con tooltip
    *«baseImpGrav del ATS: subtotal − 0% − no objeto − exento»*.
  - Si `fechaRegistroCapturada` es false, la F. registro con un ícono y el tooltip *«no capturada:
    el ATS usa la fecha de emisión»*.
- **CSV:** un botón por pestaña con `ExportService.exportToCSV`. Exporta **todas las filas
  filtradas, no la página**, con **todas** las columnas de la §4.3, incluidos los seis `valRet*`, y
  la clave técnica del ATS en el encabezado (`Base 0% (baseImponible)`). Nombre de archivo:
  `ATS-compras-2026-08.csv`, etc. Fechas con `fechaCsv` (`shared/utils/fecha-csv.util.ts`).
- **Fechas:** llegan como arreglo. Se normalizan con
  `FuncionesDatosService.convertirFechaDesdeBackend()`, nunca a mano (`saaFE/CLAUDE.md`).
- **Errores:** `mensajeDeError(err)` en un banner, como la pantalla del ATS. Un 200 con listas vacías
  muestra *«Sin documentos en el período»*, **no** un error.
- **Avisos:** los mismos que devuelve `/ats/generar`, listados tal cual. Es la misma lista, a
  propósito.

## 6. Trampas, para que no las descubra el usuario

1. **El XML no puede cambiar.** Toda la §3.2 es extracción. Verificación del usuario, después del
   despliegue: regenerar agosto y comparar el ZIP contra el último generado, con los mismos datos.
   Tienen que ser idénticos.
2. **`Math.abs` en `formatDecimal`**: la pantalla muestra lo **declarado**, no el signo de la tabla
   (§3.4).
3. **Ventas agrupadas**, no por documento (§4.4).
4. **`baseImpGrav` no es «base 15%»**: incluye 5% y 8% (§4.3).
5. **No hay endpoint de Excel.** El CSV es la exportación. El `window.XLSX` de `dash-ventas` no lo
   carga nadie: ese botón está roto y **no es parte de este frente**.
6. **El detalle y el ATS corren la misma lógica, pero no en la misma transacción.** Si alguien
   registra un documento entre la consulta y la generación, van a diferir. Es esperable y no es un
   defecto.

## 7. Qué NO toca este frente

`ReporteCuadreSriServiceImpl` (cuadres 103/104), `consulta-documentos` de `cxp`, las entidades de
compra y venta, ningún `.sql`. **Sin DDL: WAR y FE en cualquier orden** (el FE sin el WAR recibe 404
en la pantalla nueva, y nada más se afecta).
