# Especificación — Reporte Jasper "Comprobante de pagos de la cuota"

**Módulo:** CRD (Créditos)
**Origen del requerimiento:** reimpresión que hoy emite el frontend desde el diálogo `PrestamoPagosDialogComponent`, abierto con el botón del ojo (👁) en la tabla de cuotas (`detallePrestamo`) de la pantalla **ParticipeDash**.
**Objetivo:** que el backend genere en **JasperReports** el MISMO comprobante que hoy imprime el navegador, pero como PDF corporativo **con el logo del fondo (ASOPREP‑FCPC)**.
**Fecha:** 2026-08-17

> Referencia visual: el PDF de ejemplo `Comprobante — HIPOTECARIO #61939.pdf` (cuota #143). El reporte Jasper debe reproducir ese contenido y esas secciones, agregando el logo en la cabecera.

---

## 1. Entrada del reporte

El reporte se genera para **una sola cuota**. Parámetro único:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `P_DTPR_CODIGO` | `Long` | Código de la cuota = `DTPR.DTPRCDGO`. Es el mismo `detalle.codigo` con el que el frontend hoy consulta los pagos. |
| `P_LOGO` (opcional) | `InputStream`/ruta | Logo del fondo. Puede ir embebido en el `.jasper` o pasarse como parámetro. Ver §7. |

Endpoint sugerido (seguir el patrón REST/EJB existente del módulo CRD):
`GET /SaaBE/rest/crd/reportePagosCuota/{dtprCodigo}` → devuelve `application/pdf`.

---

## 2. Fuentes de datos (tablas)

Todo el contenido sale de **5 tablas del esquema `CRD`**. No hay ningún cálculo que no esté ya en la BD.

| Tabla | Rol en el reporte |
|---|---|
| **`CRD.DTPR`** (DetallePrestamo) | La cuota: cabecera, valores pactados y saldos pendientes. **1 fila.** |
| **`CRD.PGPR`** (PagoPrestamo) | Los pagos registrados contra la cuota: tabla de movimientos y observaciones. **N filas.** |
| **`CRD.PRST`** (Prestamo) | Enlaza la cuota con producto y partícipe. Aporta el nº de operación (`idAsoprep`). |
| **`CRD.PRDC`** (Producto) | Nombre del producto para el subtítulo ("HIPOTECARIO"). |
| **`CRD.ENTD`** (Entidad) | Nombre del partícipe (`razonSocial`). |

### 2.1 Dataset MAESTRO (cabecera + composición de la cuota)

```sql
SELECT
    d.DTPRCDGO   AS codigo_cuota,
    d.DTPRNMCT   AS numero_cuota,
    d.DTPRFCVN   AS fecha_vencimiento,
    d.DTPRESTD   AS estado_cuota,          -- catálogo §5.1
    d.DTPRTTLL   AS cuota_total,           -- si es 0/null, usar DTPRCTAA
    d.DTPRCTAA   AS cuota_base,
    d.DTPRSLDO   AS saldo_pendiente_cuota, -- autoritativo (no restar)
    -- Valores PACTADOS de la cuota
    d.DTPRDSGR   AS pactado_desgravamen,
    d.DTPRMRAA   AS pactado_mora,
    d.DTPRINVN   AS pactado_interes_vencido,
    d.DTPRINTR   AS pactado_interes,
    d.DTPRCPTL   AS pactado_capital,
    d.DTPRVLSI   AS pactado_seguro,
    d.DTPRSLOT   AS pactado_pago_extra,
    -- SALDOS pendientes por concepto (autoritativos donde existen)
    d.DTPRSLMR   AS saldo_mora,
    d.DTPRSLIV   AS saldo_interes_vencido,
    d.DTPRSLIN   AS saldo_interes,
    d.DTPRSLCP   AS saldo_capital,
    -- Contexto para la cabecera
    p.PRSTCDGO   AS prestamo_codigo,
    p.PRSTIDAS   AS id_asoprep,            -- nº que se muestra en el título
    pr.PRDCNMBR  AS producto_nombre,       -- "HIPOTECARIO"
    e.ENTDRZNS   AS participe              -- "RUEDA TORRES EDISON"
FROM CRD.DTPR d
JOIN CRD.PRST p  ON p.PRSTCDGO = d.PRSTCDGO
JOIN CRD.PRDC pr ON pr.PRDCCDGO = p.PRDCCDGO
JOIN CRD.ENTD e  ON e.ENTDCDGO = p.ENTDCDGO
WHERE d.DTPRCDGO = $P{P_DTPR_CODIGO};
```

### 2.2 Dataset DETALLE (tabla de pagos registrados)

```sql
SELECT
    g.PGPRFCHA   AS fecha_pago,
    g.PGPRTPOO   AS tipo_operacion,        -- catálogo §5.2
    g.EVPRCDGO   AS evento_codigo,         -- nº de operación (puede ser NULL)
    g.PGPRDSGR   AS desgravamen,
    g.PGPRMRPG   AS mora,
    g.PGPRINVP   AS interes_vencido,
    g.PGPRINPG   AS interes,
    g.PGPRCPPG   AS capital,
    g.PGPRVLSI   AS seguro,
    g.PGPRSLOT   AS pago_extra,
    g.PGPRVLRR   AS total,                 -- valor total del pago
    g.PGPROBSR   AS observacion
FROM CRD.PGPR g
WHERE g.DTPRCDGO = $P{P_DTPR_CODIGO}
  AND NVL(g.PGPRANUL, 0) = 0              -- ⚠️ CRÍTICO: excluir anulados (§4.1)
ORDER BY g.PGPRFCHA ASC;
```

> **Nombres de columna verificados** contra las entidades JPA del backend
> (`com.saa.model.crd.PagoPrestamo`, `DetallePrestamo`, `Prestamo`, `Producto`, `Entidad`).
> Ojo con estos que NO siguen el patrón obvio: `PGPR.valor = PGPRVLRR`, `PGPR.tipo = PGPRTPOO`,
> `PGPR.anulado = PGPRANUL`, `PGPR.observacion = PGPROBSR`, `ENTD.razonSocial = ENTDRZNS`.

---

## 3. Layout del reporte (secciones)

El reporte, en **A4 horizontal (landscape)**, tiene estas secciones en orden:

### 3.1 Cabecera (con LOGO)
- **Logo del fondo** a la izquierda (nuevo respecto al comprobante actual).
- **Título (H1):** `Pagos de la cuota #{numero_cuota}`
- **Subtítulo:** `{producto_nombre} #{id_asoprep}` → ej. `HIPOTECARIO #61939`
  - Si `id_asoprep` viene NULL, usar `prestamo_codigo`.

### 3.2 Banda de datos (pares etiqueta/valor, en una fila que envuelve)
En este orden exacto:

| Etiqueta | Valor | Fuente |
|---|---|---|
| Partícipe | `participe` | `ENTD.ENTDRZNS` |
| Cuota | `#{numero_cuota}` | `DTPR.DTPRNMCT` |
| Vencimiento | fecha corta | `DTPR.DTPRFCVN` |
| Estado | texto del estado | `DTPR.DTPRESTD` → catálogo §5.1 |
| Cuota total | moneda | `DTPR.DTPRTTLL` (o `DTPRCTAA` si 0) |
| Total pagado | moneda | `SUM(PGPR.PGPRVLRR)` vigentes |
| Saldo pendiente | moneda | `DTPR.DTPRSLDO` (máx. 0; nunca negativo) |

### 3.3 Frase resumen (una línea)
Texto derivado del nº de pagos, total pagado y saldo:
- Si `saldo_pendiente ≤ 0.01`:
  `"{n} {pago|pagos} por {total_pagado} cubrieron la cuota completa: no queda saldo pendiente."`
- Si no:
  `"{n} {pago|pagos} por {total_pagado}. Todavía queda pendiente {saldo_pendiente} de esta cuota."`

(ej. del PDF: *"1 pago por $409.40. Todavía queda pendiente $21,858.18 de esta cuota."*)

### 3.4 Tabla "Pagos registrados"
- **Nota que se imprime encima de la tabla (texto fijo):**
  `PAGOS REGISTRADOS — IMPUTACIÓN: DESGRAVAMEN, MORA, INTERÉS VENCIDO, INTERÉS, CAPITAL, SEGURO`
- **Columnas (en este orden):**

| # | Encabezado | Contenido | Alineación |
|---|---|---|---|
| 1 | `Fecha del pago` | `fecha_pago` (fecha corta) | izq. |
| 2 | `Operación` | `{tipo texto}` + ` · #{evento_codigo}` si no es NULL | izq. |
| 3 | `Desgrav.` | `desgravamen` (moneda) | der. |
| 4 | `Mora` | `mora` | der. |
| 5 | `Int. vencido` | `interes_vencido` | der. |
| 6 | `Interés` | `interes` | der. |
| 7 | `Capital` | `capital` | der. |
| 8 | `Seguro` | `seguro` | der. |
| 9 | `Total` | `total` (negrita) | der. |

- **Fila de totales (tfoot):** primera celda `TOTALES` (col. 1‑2 fusionadas), y la suma de columnas 3‑9. Se calcula sumando las filas del dataset (equiv. `SUM()` de cada columna, solo vigentes).

> El "pago extra" (`PGPRSLOT`) NO tiene columna propia en esta tabla — no se muestra como columna aquí, pero sí participa en la composición (§3.5) y en el saldo. (Se mantiene así para que la tabla replique 1:1 el comprobante actual.)

### 3.5 Bloque "Composición de la cuota"
Título de sección (texto fijo): `COMPOSICIÓN DE LA CUOTA`.
Tabla de dos columnas: **etiqueta** = nombre del concepto; **valor** = texto:
`Pactado {X} · Pagado {Y} · Pendiente {Z}`

Un renglón por concepto, en este orden de prelación:

| Concepto | Pactado (DTPR) | Pagado (SUM PGPR) | Pendiente |
|---|---|---|---|
| Desgravamen | `DTPRDSGR` | `SUM(PGPRDSGR)` | `Pactado − Pagado` (no tiene columna de saldo) |
| Mora | `DTPRMRAA` | `SUM(PGPRMRPG)` | `DTPRSLMR` |
| Interés vencido | `DTPRINVN` | `SUM(PGPRINVP)` | `DTPRSLIV` |
| Interés | `DTPRINTR` | `SUM(PGPRINPG)` | `DTPRSLIN` |
| Capital | `DTPRCPTL` | `SUM(PGPRCPPG)` | `DTPRSLCP` |
| Seguro *(solo si aplica, §4.3)* | `DTPRVLSI` | `SUM(PGPRVLSI)` | `Pactado − Pagado` |
| Pago extra | `DTPRSLOT` | `SUM(PGPRSLOT)` | `Pactado − Pagado` |

**Regla de qué renglones mostrar:** siempre se muestran **Capital** e **Interés**. Los demás conceptos solo se muestran si `Pactado > 0` **o** `Pagado > 0` (para no llenar de ceros la cuota típica). `Pendiente` nunca se pinta negativo (piso en 0).

### 3.6 Bloque "Observaciones"
Título de sección (texto fijo): `OBSERVACIONES`.
Un renglón por cada pago que tenga `PGPROBSR` no vacío:
- etiqueta = `fecha_pago` (fecha corta)
- valor = texto de la observación

Si ningún pago tiene observación, el bloque se omite por completo.

### 3.7 Pie de página (texto fijo — LEYENDA)
Debe imprimirse al pie del documento, en gris/tenue:

```
ASOPREP-FCPC · Sistema de Administración de Aportes (SAA) · Documento generado desde el sistema.
```

---

## 4. Consideraciones de negocio (OBLIGATORIAS)

### 4.1 Excluir pagos anulados — crítico
El dataset de detalle (§2.2) **debe** filtrar `NVL(PGPRANUL,0) = 0`. Tras una anulación, el pago sigue existiendo en `PGPR` con `PGPRANUL = 1`; si no se filtra, los pagos reversados vuelven a contarse y descuadran totales, saldo y composición. Esto es exactamente lo que hace el frontend hoy (`pagoVigente()`), y es un bug conocido del módulo si se omite.

### 4.2 Saldo pendiente = columna, no resta
El "Saldo pendiente" de la cabecera sale directo de `DTPR.DTPRSLDO` (acotado a mínimo 0), **no** de `cuota_total − total_pagado`. Igual, los `Pendiente` de Mora / Interés vencido / Interés / Capital en la composición usan sus columnas de saldo (`DTPRSLMR`, `DTPRSLIV`, `DTPRSLIN`, `DTPRSLCP`). Respetar esto para que el reporte cuadre con lo que ve el operador en pantalla.

> ℹ️ Nota heredada: en el comprobante actual, el `Pendiente` de Interés puede mostrar el mismo valor que el pactado aunque ya esté pagado (p. ej. en el PDF de ejemplo, Interés "Pagado $164.92 · Pendiente $164.92"). Es el comportamiento vigente del cálculo por concepto. **Replicarlo tal cual** para no introducir diferencias respecto a la pantalla; si el fondo quiere corregirlo, es una decisión aparte que hay que confirmar antes.

### 4.3 Columna/renglón "Seguro"
La tabla de pagos (§3.4) muestra **siempre** las 7 columnas de concepto, incluida Seguro (con $0.00 cuando no aplica). En cambio, el **renglón** "Seguro" de la composición (§3.5) solo se incluye para productos con seguro. En el frontend el criterio es: `producto.tipoPrestamo.codigo ∈ {2,3,4,5}`. El backend puede resolverlo con el mismo `TipoPrestamo` del producto (`PRDC` → `TPPR`); **confirmar el nombre de la columna de tipo de préstamo** al implementar. Si se prefiere simplificar, mostrar el renglón Seguro cuando `DTPRVLSI > 0` o `SUM(PGPRVLSI) > 0` da el mismo resultado práctico.

### 4.4 Orden de los pagos
`ORDER BY PGPRFCHA ASC` (del más antiguo al más reciente). Es el orden en que el frontend los pinta.

---

## 5. Catálogos (mapeo código → texto)

### 5.1 Estado de la cuota — `DTPR.DTPRESTD`
| Código | Texto |
|---|---|
| 1 | Pendiente |
| 2 | Activa |
| 3 | Emitida |
| 4 | Pagada |
| 5 | En mora |
| 6 | Parcial |
| 7 | Cancelada anticipada |
| 8 | Vencida |
| *(otro)* | `Estado {código}` |

### 5.2 Tipo de operación del pago — `PGPR.PGPRTPOO`
| Código | Texto |
|---|---|
| `PAGO_MANUAL` | Pago de cuota |
| `PAGO_APORTES` | Pago con aportes |
| `ABONO_CAPITAL` | Abono a capital |
| `PRECANCELACION` | Precancelación |
| `REGISTRO_APORTE` | Registro de aporte |
| `DESCUENTO_NOMINA` | Descuento por nómina |
| `MIGRACION` | Saldo migrado |
| `NULL`/vacío | Pago de cuota |
| *(otro)* | el mismo texto con `_`→espacio, en minúsculas |

(En el PDF de ejemplo, `MIGRACION` se imprime como **"Saldo migrado"**.)

---

## 6. Formato de valores

| Tipo | Formato | Ejemplo |
|---|---|---|
| Moneda | `$#,##0.00` (separador de miles `,`, decimal `.`, símbolo `$` pegado) | `$21,858.18` |
| Fecha corta | `d/M/yyyy` (locale es‑EC, **sin** ceros a la izquierda) | `31/5/2026` |
| Nº de cuota / operación | entero con prefijo `#` | `#143`, `#61939` |

Todos los importes monetarios se muestran con 2 decimales siempre, incluso `$0.00`.

---

## 7. Logo y estilo

- **Logo del fondo (ASOPREP‑FCPC)** en la cabecera (arriba a la izquierda). Es el único elemento nuevo frente al comprobante actual. Adjuntar el archivo del logo (PNG/JPG con fondo transparente de preferencia) al `.jrxml`, o pasarlo como parámetro `P_LOGO`.
- Paleta del comprobante actual (referencial, se puede ajustar a la identidad del fondo):
  - Texto principal `#1A202C`, secundario/gris `#718096`, encabezados de sección `#4A5568`.
  - Encabezado de tabla fondo `#EDF2F7`, borde `#CBD5E0`; fila de totales fondo `#F7FAFC`.
  - Pie tenue `#A0AEC0` con línea superior `#E2E8F0`.
- Página **A4 horizontal**, márgenes ~14 mm.
- Títulos de sección en MAYÚSCULAS con leve espaciado entre letras (como en el PDF).

---

## 8. Textos fijos / leyendas que el reporte DEBE incluir

Resumen de todas las cadenas literales (para traducción/localización y para que no se omitan):

1. Título: **`Pagos de la cuota #{n}`**
2. Nota sobre la tabla de pagos:
   **`PAGOS REGISTRADOS — IMPUTACIÓN: DESGRAVAMEN, MORA, INTERÉS VENCIDO, INTERÉS, CAPITAL, SEGURO`**
3. Encabezados de tabla: `Fecha del pago`, `Operación`, `Desgrav.`, `Mora`, `Int. vencido`, `Interés`, `Capital`, `Seguro`, `Total`
4. Fila de totales: **`TOTALES`**
5. Título de sección: **`COMPOSICIÓN DE LA CUOTA`** · patrón de valor `Pactado {X} · Pagado {Y} · Pendiente {Z}`
6. Título de sección: **`OBSERVACIONES`**
7. Etiquetas de cabecera: `Partícipe`, `Cuota`, `Vencimiento`, `Estado`, `Cuota total`, `Total pagado`, `Saldo pendiente`
8. Pie de página (leyenda institucional):
   **`ASOPREP-FCPC · Sistema de Administración de Aportes (SAA) · Documento generado desde el sistema.`**

---

## 9. Checklist de aceptación

- [ ] El PDF reproduce el `Comprobante — HIPOTECARIO #61939.pdf` de ejemplo (mismos valores para la cuota #143) **más el logo**.
- [ ] Los pagos con `PGPRANUL = 1` **no** aparecen ni suman.
- [ ] `Saldo pendiente` = `DTPRSLDO`, nunca negativo.
- [ ] Totales de la tabla = suma exacta de las filas vigentes.
- [ ] Estados y tipos de operación se muestran con su texto (no el código).
- [ ] Bloque "Observaciones" se omite si no hay observaciones.
- [ ] Renglón "Seguro" en la composición solo aparece cuando aplica.
- [ ] Pie de página con la leyenda institucional presente en todas las páginas.
- [ ] Formato de moneda `$#,##0.00` y fecha `d/M/yyyy`.
