# Propuesta: Importación de Estados de Cuenta Bancarios (EDC)

**Fecha:** Julio 25, 2026
**Origen:** Revisión de `Formatos EDC Bancarios/` (15 archivos, 11 bancos/cooperativas) proporcionados por el cliente
**Objetivo:** Cargar al sistema los movimientos de los estados de cuenta bancarios reales, para poder verificar cualquier transacción contra los movimientos registrados en los libros propios del cliente (módulo TSR / conciliación bancaria)

---

## 📋 1. Qué se revisó

Se abrieron los 15 archivos con datos reales (junio-julio 2026):

| Banco/Coop | Formato real | Fila donde empieza la tabla | Notas |
|---|---|---|---|
| B. Internacional | `.xls` (BIFF legado) | fila 4 | Fechas ISO, débito/crédito en columnas separadas |
| B. Amazonas | `.xls` **con contenido XLSX** (zip disfrazado) | fila 7 | Requiere detectar el formato real, no confiar en la extensión |
| B. Pacífico (Ahorro y Cte) | `.xlsx` | fila 1 | El más rico en datos: incluye cédula/nombre/banco del ordenante en transferencias |
| B. Atlántida | `.xlsx` | fila 3 | Incluye "Saldo Inicial" en encabezado; fechas ya como `datetime` |
| B. Austro | `.xlsx` | fila 8 | Encabezado con metadata de cuenta/usuario/reporte antes de la tabla |
| B. Guayaquil | `.xlsx` | fila 14 | Un solo campo "Monto" + columna "Signo" (+/-) en vez de débito/crédito separados |
| B. Manabí (Ahorro) | `.xlsx` | fila 14 | Montos como texto con formato europeo: `'$ 2.517,34'` (punto=miles, coma=decimales) |
| Coop. Policía Nacional | `.xlsx` | fila 5 | Columna `+/-` separada de la columna `Valor`; también incluye "Saldo Anterior" en encabezado |
| Coop. Alianza | `.xls` | fila 7 | Fechas en texto `mm/dd/yyyy` (ambiguas si no se sabe el banco) |
| Coop. JEP | `.xlsx` | fila 2 | Incluye fila "Saldo inicial" y "Saldo Final" dentro de la misma tabla de movimientos |
| Mutualista Pichincha | `.xls` (BIFF legado) | fila 19 | Muchas columnas vacías intermedias (celdas combinadas); fechas ISO como texto |

Además hay 3 archivos `.pdf` (Atlántida, JEP, Policía Nacional) que son el estado de cuenta oficial/firmado de esos mismos períodos — probablemente conviene guardarlos como respaldo adjunto del lote de carga, aunque los datos se importen desde el Excel.

**Conclusión clave:** no hay dos bancos con el mismo layout. Fila de inicio, nombres de columna, formato de fecha, formato de decimales y la forma de indicar débito/crédito varían todos. Esto descarta cualquier importador "genérico" de una sola pasada — se necesita **un parser por banco**, pero todos deben converger a **una misma tabla normalizada**.

---

## 🗄️ 2. Cómo encaja con lo que ya existe

El módulo TSR ya tiene el lado "libros propios del cliente" modelado:

- `CuentaBancaria` — cuenta bancaria (ligada a `Banco` y a `PlanCuenta`)
- `MovimientoBanco` — movimiento según la contabilidad propia del sistema (ligado a `Asiento` contable)
- `Conciliacion` / `DetalleConciliacion` — conciliación mensual, pero **solo con totales agregados** (`depositoTransito`, `chequeSistema`, `saldoEstadoCuenta`, etc.) — hoy en día alguien los tendría que calcular y tipear a mano
- La pantalla `conciliacion.component.ts` existe pero es un **mock**: datos hardcodeados, sin servicio real de backend

Lo que **no existe todavía** es una tabla que represente, línea por línea, lo que dice el banco. Ese es exactamente el hueco que hay que llenar para lograr "verificar cualquier transacción contra los movimientos del cliente".

---

## 🏗️ 3. Diseño de tablas propuesto

### 3.1 Tabla de lote de carga: `carga_edc_bancario`

Una fila por cada archivo importado. Permite trazabilidad (quién cargó qué, cuándo, y si hubo errores) y sirve como control de duplicados.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `cuenta_bancaria_id` | FK → `cuenta_bancaria` | |
| `banco_id` | FK → `banco` | |
| `nombre_archivo` | string | nombre original |
| `hash_archivo` | string | hash del contenido, para detectar recargas del mismo archivo |
| `fecha_carga` | datetime | |
| `usuario_id` | FK → usuario | quién hizo la carga |
| `periodo_desde` / `periodo_hasta` | date | tomado del propio archivo cuando esté disponible |
| `saldo_inicial_declarado` / `saldo_final_declarado` | decimal | tomado del encabezado del archivo, si lo trae |
| `total_filas_leidas` / `total_filas_importadas` | int | para detectar filas descartadas silenciosamente |
| `estado` | rubro | `PENDIENTE` / `PROCESADO` / `PROCESADO_CON_ADVERTENCIAS` / `ERROR` |
| `mensaje_error` | text | detalle si algo falló |
| `archivo_original` | blob/ruta | guardar el Excel (y el PDF si existe) como respaldo |

### 3.2 Tabla de movimientos importados: `movimiento_bancario_externo`

Una fila por cada línea de movimiento del estado de cuenta, **ya normalizada** al mismo formato sin importar el banco de origen.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `carga_id` | FK → `carga_edc_bancario` | |
| `cuenta_bancaria_id` | FK → `cuenta_bancaria` | denormalizado, para consultas rápidas sin join |
| `fila_origen` | int | número de fila en el Excel original — clave para depurar diferencias |
| `fecha_transaccion` | date | fecha real del movimiento |
| `fecha_contable` | date | nullable; algunos bancos las distinguen (fecha real vs. contable) |
| `tipo` | enum | `DEBITO` / `CREDITO`, ya normalizado (ver §4.2 sobre cómo se deriva) |
| `valor` | decimal | siempre positivo; el signo lo da `tipo` |
| `saldo_reportado` | decimal | nullable; el saldo que trae el banco después del movimiento |
| `descripcion` | string | concepto/descripción tal como viene |
| `referencia` | string | número de documento/referencia del banco |
| `referencia_2` | string | nullable; algunos bancos traen una segunda referencia |
| `codigo_transaccion_banco` | string | código propio del banco (ej. `N/C`, `TW`, `CABE`) — útil para clasificar tipo de movimiento |
| `identificacion_contraparte` | string | nullable; solo Pacífico lo trae hoy (cédula del ordenante) |
| `nombre_contraparte` | string | nullable |
| `banco_contraparte` | string | nullable |
| `datos_extra` | JSON | catch-all para columnas específicas de un banco que no ameritan su propio campo (ej. "Canal", "Agencia", "Asiento" del banco) |
| `estado_conciliacion` | enum | `SIN_CONCILIAR` / `CONCILIADO` / `DESCARTADO` |
| `movimiento_banco_id` | FK → `MovimientoBanco`, nullable | se llena cuando se hace el match con el movimiento contable propio |

**Restricción única recomendada:** `(cuenta_bancaria_id, fecha_transaccion, referencia, valor)` — evita que recargar el mismo archivo (o un archivo con rango de fechas solapado) duplique movimientos.

### 3.3 Extensión mínima a lo existente

Agregar a `DetalleConciliacion` (ya existente) un campo:

- `movimiento_bancario_externo_id` — FK nullable

Así, cuando se arma la conciliación mensual, cada partida en tránsito puede apuntar a la línea real del banco que la sustenta, en vez de ser solo un número tipeado a mano.

---

## ⚙️ 4. Proceso de importación

### 4.1 Arquitectura: un parser por banco, una salida común

Dado que son 11 formatos fijos y conocidos (no un layout arbitrario que suba cualquier usuario), lo más simple y mantenible es un **Strategy pattern** en el backend:

```
BankStatementParser (interfaz)
 ├─ InternacionalParser
 ├─ PacificoParser
 ├─ AtlantidaParser
 ├─ AustroParser
 ├─ GuayaquilParser
 ├─ ManabiParser
 ├─ PoliciaNacionalParser
 ├─ AlianzaParser
 ├─ JepParser
 ├─ PichinchaParser (Mutualista)
 └─ AmazonasParser
```

Cada uno sabe: en qué fila empieza el encabezado real, cómo se llaman sus columnas, cómo formatea sus fechas, cómo formatea sus decimales, y cómo determina débito vs. crédito. Todos devuelven una lista de `MovimientoBancoExternoDTO` ya normalizada. **No conviene** construir una UI genérica de "mapeo de columnas configurable por el usuario" — con 11 formatos fijos eso es sobre-ingeniería; es más simple (y más fácil de dar mantenimiento) tener un parser explícito por banco.

Selección del parser: por el `banco_id` de la `CuentaBancaria` a la que se está importando (el usuario elige cuenta bancaria antes de subir el archivo, no el sistema adivinando el banco por el contenido).

### 4.2 Normalización de débito/crédito y signo

Se detectaron 3 convenciones distintas en los archivos:

1. **Columnas separadas Débito/Crédito** (Internacional, Pacífico, Atlántida, Austro, JEP, Mutualista, Amazonas): la más simple — si `Débito > 0` es tipo `DEBITO`, si no, `CREDITO`.
2. **Columna única + columna de signo** (Guayaquil: `Monto` + `Signo` con `+`/`-`; Policía Nacional: `Valor` + columna `+/-`).
3. **Columna única con signo implícito en el concepto** — no se encontró este caso en la muestra, pero el diseño de `BankStatementParser` debe dejar espacio para ello.

### 4.3 Normalización de fechas

- Ya vienen como `datetime` de Excel: Atlántida, Policía Nacional, JEP, Manabí, Austro, Guayaquil (fecha) → trivial.
- Vienen como texto `dd/mm/yyyy`: Pacífico.
- Vienen como texto `mm/dd/yyyy`: Alianza (¡formato distinto al resto, fácil de confundir con `dd/mm/yyyy`!).
- Vienen como texto ISO `yyyy-mm-dd`: Internacional, Guayaquil, Mutualista Pichincha.

Por eso el formato de fecha **debe ser una propiedad explícita de cada parser**, nunca "detectado" automáticamente — con datos financieros, adivinar mal un `03/06` vs `06/03` es exactamente el tipo de error silencioso que este proyecto ya ha sufrido antes.

### 4.4 Normalización de montos

La mayoría son números nativos de Excel. La excepción real encontrada es **Manabí**, que entrega los montos como texto con formato latino: `'$ 2.517,34'` (punto = separador de miles, coma = decimal). Su parser debe: quitar `$` y espacios, quitar puntos, reemplazar coma por punto, convertir a decimal.

### 4.5 Validación automática de integridad (recomendado)

Cada archivo trae su propio saldo corriente (columna `Saldo`/`SaldoDespMov`/`Saldos Disponibles`) y, en varios casos, el saldo inicial del período en el encabezado. Se recomienda que el importador:

1. Tome el saldo inicial declarado (si el archivo lo trae) o el saldo final del período anterior ya importado.
2. Vaya sumando/restando cada movimiento normalizado.
3. Compare el saldo calculado contra el saldo reportado por el banco en cada fila.
4. Si hay una discontinuidad, marque el lote como `PROCESADO_CON_ADVERTENCIAS` y señale la fila exacta.

Esto detecta automáticamente filas mal parseadas, filas perdidas, o un error de signo — sin depender de que alguien lo note manualmente después.

### 4.6 Manejo de formatos de archivo "mentirosos"

- `B. Amazonas 2026.xls`: la extensión dice `.xls` pero el contenido real es un ZIP/XLSX (firma `PK\x03\x04`). El importador debe detectar el formato real por la firma de bytes, no confiar en la extensión.
- `B. Internacional` y `Mutualista Pichincha`: estos sí son BIFF legado real (`.xls` clásico) y necesitan el parser correspondiente (equivalente a `xlrd`/Apache POI HSSF en el backend Java).

---

## 🔄 5. Flujo de uso propuesto

1. Usuario entra a **Tesorería → Conciliación → Cargar Estado de Cuenta**.
2. Selecciona `Cuenta Bancaria` (esto ya determina el `Banco` y por lo tanto el parser a usar).
3. Sube el archivo. Backend detecta el formato real, corre el parser correspondiente, valida saldo corriente.
4. Se muestra un resumen previo a confirmar: rango de fechas, total créditos/débitos, cualquier advertencia de saldo — el usuario confirma antes de persistir (evita cargas parciales silenciosas, que es justamente el tipo de bug que ya se encontró antes en el módulo CRD).
5. Al confirmar, se graba el lote (`carga_edc_bancario`) y sus líneas (`movimiento_bancario_externo`).
6. La pantalla de **Conciliación** (hoy un mock) se conecta a datos reales: cruza automáticamente `movimiento_bancario_externo` contra `MovimientoBanco` por fecha + monto + referencia; lo que no cruza queda visible como "solo banco" o "solo libros" para revisión manual — reemplazando los signals hardcodeados actuales por el estado real.

---

## ❓ 6. Preguntas abiertas para confirmar antes de implementar

1. ¿El backend es Java/Spring (como sugiere la nomenclatura `TSR.MVCB` en los comentarios de `MovimientoBanco`)? Eso determina si el parser de `.xls` legado usa Apache POI o algo equivalente.
2. ¿Cada banco entrega un archivo por cuenta y por mes, o puede venir un archivo con múltiples cuentas/meses mezclados (como pasó en el scan, donde el mismo banco aparece repetido)? Esto afecta si `carga_edc_bancario` es 1:1 con archivo o si un archivo puede generar varios lotes.
3. ¿Quién sube los archivos — un usuario por banco manualmente cada mes, o eventualmente se conectará por API/SFTP a cada banco? (Si es lo segundo, vale la pena separar aún más el "origen del archivo" del "parser", pero no cambia el diseño de tablas.)
4. Para los 3 archivos con versión PDF paralela (Atlántida, JEP, Policía Nacional) — ¿se debe guardar el PDF como respaldo legal adjunto al lote, o basta con el Excel?
5. ¿Match automático de conciliación por fecha+monto+referencia es suficiente, o se necesita una tolerancia de días (ej. cheques que tardan en cobrarse) configurable por cuenta?
