# `RUC Proveedor` en `infoAdicional` — Resolución NAC-DGERCGC26-00000027

**Equipo:** `omen-saa-2` · **Fecha:** 2026-09-10 · **Encargo:** el usuario.
**Módulo:** `cxc` (emisión electrónica).

> ## ⏰ FECHA LÍMITE: **26 de septiembre de 2026**
> 60 días calendario desde la publicación (28-jul-2026). **Quedan 16 días.**

---

## 1. Qué exige la norma

La **Resolución NAC-DGERCGC26-00000027** (vigente desde el 28-jul-2026) creó el registro
obligatorio de proveedores de sistemas de facturación electrónica y, junto con el **Anexo 26 de la
Ficha Técnica v2.34**, obliga a que **todo comprobante electrónico** lleve en su
`<infoAdicional>` un campo con el **RUC del proveedor del sistema** que lo emitió.

| | |
|---|---|
| **Dónde** | Dentro de `<infoAdicional>`, como un `<campoAdicional>` más |
| **Nombre exacto del atributo** | `nombre="RUC Proveedor"` — con esa mayúscula y ese espacio |
| **Valor** | El RUC del proveedor del sistema. Alfanumérico, máx. 300 caracteres |
| **Comprobantes alcanzados** | Facturas, notas de crédito, notas de débito, guías de remisión, **liquidaciones de compra** y **comprobantes de retención** |

### 1.1 El valor para el SAA

**`1793228946001`** — GAEMII NEXUS S.A.S., el proveedor del sistema.

⚠️ **No es el RUC del emisor ni del cliente.** Es el de quien hace el software. Es el mismo para
**todos** los facturadores y todas las empresas que usen el SAA, porque identifica al sistema, no
al contribuyente.

### 1.2 Evidencia de campo, no sólo de la norma

El usuario entregó una factura **real y autorizada en producción** de otro contribuyente
(HOTEL SABET, `FAC_001002000009250.xml`, autorizada el 09-sep-2026) que ya lo trae:

```xml
<infoAdicional>
  <campoAdicional nombre="Descripción">Alojamiento 1 noche Hab. 301 ...</campoAdicional>
  <campoAdicional nombre="RUC Proveedor">0992560754001</campoAdicional>
</infoAdicional>
```

**Esa es la forma que el SRI ya aceptó.** Vale más que cualquier lectura de la ficha — es la
lección del ATS de ayer, aplicada a tiempo esta vez.

---

## 2. Dónde hay que tocarlo — los seis emisores

`grep` sobre `writeStartElement("infoAdicional")`:

| # | Archivo | Línea | Comprobante |
|---|---|---|---|
| 1 | `cxc/serviceImpl/FacturaServiceImpl.java` | 1218 | Factura |
| 2 | `cxc/serviceImpl/NotaCreditoServiceImpl.java` | 480 | Nota de crédito |
| 3 | `cxc/serviceImpl/NotaDebitoServiceImpl.java` | 476 | Nota de débito |
| 4 | `cxc/serviceImpl/LiquidacionCompraServiceImpl.java` | 1260 | Liquidación de compra |
| 5 | `cxc/serviceImpl/RetencionServiceImpl.java` | 345 | Retención (V1) |
| 6 | `cxc/serviceImpl/RetencionV2ServiceImpl.java` | 479 | Retención (V2) |

**Los seis llevan el campo.** El SAA no emite guías de remisión, así que ese caso de la norma no
aplica.

⛔ **El bloque `<infoAdicional>` puede no escribirse hoy si no hay datos que poner.** Hay que
verificar emisor por emisor: si algún camino omite el elemento entero cuando no hay observaciones,
ahora **tiene que escribirse igual**, porque el `RUC Proveedor` ya no es opcional.

---

## 3. Cómo, y por qué así

### 3.1 Una sola constante, no seis literales

El RUC va en **un único lugar**, y los seis emisores lo leen de ahí:

```java
/** RUC del proveedor del sistema (Resolución NAC-DGERCGC26-00000027, Anexo 26 FT v2.34). */
public static final String RUC_PROVEEDOR_SISTEMA = "1793228946001";
/** Nombre exacto del campoAdicional que exige la norma. Literal, no traducir ni cambiar mayúsculas. */
public static final String CAMPO_RUC_PROVEEDOR = "RUC Proveedor";
```

**Por qué no seis literales sueltos:** este repositorio lleva tres tropiezos registrados en
septiembre por la misma causa — un valor repetido lejos de su fuente que se desincroniza (los
`COLUMN_n` de los `.jrxml`, el `5` del estado de emisión, el `"05"` del tipo de identificación).
Seis copias de un RUC es la próxima.

**Por qué constante y no parámetro de base:** el proveedor del sistema es una propiedad del
**software**, no del contribuyente. No cambia por empresa ni por facturador. Si algún día el SAA se
vende con otra marca, se cambia en un lugar.

### 3.2 El nombre del campo es literal

`"RUC Proveedor"` — mayúscula en las dos palabras, un espacio en el medio. **El SRI compara el
atributo `nombre` como texto.** No es un catálogo ni un código: es esa cadena exacta.

---

## 4. El RIDE — decisión del usuario, NO se toca todavía

**Verificado hoy:** ninguno de los cinco RIDE imprime `infoAdicional`. Ni el campo nuevo, ni el
`"Datos Adicionales"` que ya viaja en el XML desde siempre.

```
RPRT_RIDE_FACTURA.jrxml        → 0 coincidencias de infoAdicional
RPRT_RIDE_LIQUIDACION.jrxml    → 0
RPRT_RIDE_NOTA_CREDITO.jrxml   → 0
RPRT_RIDE_NOTA_DEBITO.jrxml    → 0
RPRT_RIDE_RETENCION_V2.jrxml   → 0
```

O sea que **agregarlo al RIDE no es "un campo más": es abrir una sección que hoy no existe** en
cinco reportes. Y cada `.jrxml` tocado arrastra el ciclo completo de `CLAUDE.md`: verificar si está
en sintaxis clásica (y convertirlo si lo está), `compilar-jasper.bat`, y `verificar-fill-jasper.bat`
— que existe justamente porque dos reportes compilaron limpios y reventaron en producción.

**Lo que la norma exige es el XML.** El RIDE es la representación impresa y hoy ya omite
`infoAdicional` sin que nadie lo haya objetado en años de operación.

**Recomendación:** hacer el XML primero (tiene fecha), y decidir el RIDE aparte. Si se hace, va como
frente propio con su compilación y su verificación de fill, no apurado contra el 26.

---

## 5. Cómo se verifica que quedó bien

⛔ **No alcanza con que compile.** Los pasos, en orden:

1. Emitir **un comprobante de cada tipo** en el ambiente que corresponda y abrir el XML generado.
2. Confirmar que `<infoAdicional>` existe **siempre**, aun sin observaciones.
3. Confirmar el campo, literal:
   `<campoAdicional nombre="RUC Proveedor">1793228946001</campoAdicional>`
4. Que el SRI lo **autorice**. Un comprobante que valida contra el XSD puede igual ser rechazado, y
   al revés: el XSD no valida el contenido de `infoAdicional`, así que la única prueba real es la
   autorización.

⚠️ **Ojo con el límite de intentos:** el SRI bloquea una clave de acceso después de **2 intentos no
autorizados por día** (`identificador 90`, medido el 2026-09-09). Probar de a uno y leer la
respuesta antes de reintentar.
