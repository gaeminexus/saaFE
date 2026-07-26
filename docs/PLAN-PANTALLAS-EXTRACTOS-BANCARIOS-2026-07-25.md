# Plan: Pantallas de Importación de Extractos Bancarios (EDC)

**Fecha:** Julio 25, 2026
**Estado:** **Implementado, compilado, y los 11 parsers probados contra los archivos
reales de muestra** (no solo compilación — se corrió cada parser de verdad contra su
archivo real con un harness standalone, ver §7). Pendiente únicamente probar en vivo
contra el contenedor Docker `saa-oracle-23ai` + WildFly (el REST/EJB completo) y el
flujo de las 4 pantallas en navegador.
**Continúa de:** `docs/PROPUESTA-IMPORTACION-EDC-BANCARIOS-2026-07-25.md` (revisión de los
11 formatos de banco) y de la Fase 1 ya completada (tablas `TSR.EXBC` / `TSR.DEXB` /
`TSR.CTEB`, entidades JPA, DAO/Service EJB y REST CRUD básicos — verificado en el
contenedor Docker `saa-oracle-23ai`).

---

## 1. Por qué

Contabilidad necesita subir el extracto bancario mensual de cada una de las ~10
cuentas de ASOPREP (11 formatos de banco/cooperativa distintos), para verificar
transacciones contra los libros propios y llevar un tablero de cuántas cuentas ya
cargaron / conciliaron cada mes.

La Fase 1 dejó el modelo de datos listo (`EXBC`, `DEXB`, `CTEB`) y un CRUD básico,
pero **todavía no había forma real de usarlo**:

- No existía un endpoint que reciba el Excel de un banco, lo interprete y guarde el
  lote — hoy `/exbc` solo permitía crear un registro a la vez vía JSON, sin parser.
- No existía ninguna pantalla que lea `EXBC`/`DEXB`/`CTEB` reales. La pantalla
  `conciliacion.component.ts` que existe hoy es un **mock hardcodeado** (datos de
  ejemplo fijos en el componente, sin llamada a backend).

Este documento describe ambas piezas ya construidas: el endpoint de carga (con los
11 parsers, uno por banco) y las 4 pantallas que lo usan.

---

## 2. Alcance de esta ronda

Se cubren **los 11 bancos/cooperativas** desde el inicio (no un subconjunto), para
que el selector de cuenta bancaria de la pantalla de carga funcione de verdad para
todas las cuentas reales del cliente.

**Fuera de alcance** (a construir después, mencionado aquí para que el equipo lo
tenga presente):
- Motor de conciliación automática DEXB↔MVCB (hoy `CTEBCONC` sigue leyendo el flag
  de `Conciliacion` ya existente — decisión ya tomada en Fase 1).
- Reemplazo/anulación de una carga ya confirmada.
- Exportar detalle a Excel/CSV, alertas automáticas de vencimiento de período.
- Los 3 PDF paralelos que entregan Atlántida/JEP/Policía Nacional (redundantes con
  el Excel) no se procesan ni se adjuntan.

---

## 3. Decisiones de diseño (heredadas de Fase 1, no se reabren aquí)

| Decisión | Motivo |
|---|---|
| No se guarda el archivo físico completo (a diferencia del patrón CRD/Petro, que sí sube a disco) | `EXBC` no tiene columna `rutaArchivo`; la auditoría vive en `DEXB.DEXBCRDO` (CLOB con la fila cruda) |
| El parser se resuelve automáticamente por el banco de la cuenta elegida, no lo elige el usuario ni se adivina por contenido | El usuario ya sabe qué cuenta está cargando; adivinar por contenido es una fuente de errores silenciosos |
| Flujo en dos fases: **validar** (previsualiza, no persiste) → **confirmar** (persiste) | Mismo patrón que ya existe en el código (`validarArchivoPetro` / `procesarArchivoPetro` del módulo CRD) — se reparsa el archivo dos veces en vez de mantener estado entre requests |
| Cargar un extracto **no** dispara recálculo del tablero de cumplimiento (`CTEB`) | Ya es una acción explícita del usuario vía `/cteb/generar` y `/cteb/recalcular`, que ya existen |
| Formato de archivo se detecta por firma de bytes, nunca por extensión | Banco Amazonas entrega un archivo `.xls` que en realidad es un `.xlsx` (ver corrección abajo) |

---

## 4. Corrección a un hallazgo previo: Banco Amazonas **no está corrupto**

En las notas de avance de Fase 1 había quedado como pendiente sin resolver que el
archivo de Amazonas parecía "corrupto/inválido". Esto **no** viene del documento
`PROPUESTA-IMPORTACION-EDC-BANCARIOS-2026-07-25.md` — ese documento ya tenía el
diagnóstico correcto ("`.xls` con contenido XLSX (zip disfrazado)... Requiere
detectar el formato real, no confiar en la extensión"), solo que no se había
verificado si el archivo en sí era válido más allá de la extensión engañosa.

Se volvió a abrir el archivo real (`B. AMAZONAS 2026.xls`) para esta propuesta y
**el archivo está perfectamente sano** — es un ZIP/XLSX válido (se verificó
extrayendo y comprobando el checksum de cada parte interna, todas OK). El
diagnóstico original del documento de Fase 1 era correcto; la duda sobre
"corrupción" queda descartada.

Estructura real confirmada al decodificar el archivo:

- Filas 1-2: banner "Titular" / "ASOPREP FCPC"
- Fila 3: etiquetas "Cuenta #", "Tipo de Cuenta", "Fecha", "Balance"
- Fila 4: valores (número de cuenta, tipo, fecha de corte, balance final)
- Filas 5-6: banner "Movimientos" / rango de período ("01/06/2026 - 30/06/2026")
- **Fila 7: encabezado real de la tabla** — `Id | Fecha | Descripción | Débito | Crédito | Balance` (confirma lo ya documentado)
- Fila 8 en adelante: datos

**Detalle nuevo que el hallazgo original no tenía:** Débito, Crédito y Balance
llegan como **texto** con formato de miles-coma/decimal-punto (`"1,200.00"`), igual
que Guayaquil — no como números nativos de Excel. Además, el archivo **no trae un
campo de saldo inicial explícito**, solo el balance final de corte; el saldo inicial
del período se deriva matemáticamente de la primera fila (`balance − (crédito −
débito)`). Se verificó manualmente que esta derivación cuadra en las 3 filas de la
muestra (saldo inicial 2,518.19 → +1,200.00 crédito, −0 débito → 3,718.19 →
+1,967,870.51 → 1,971,588.70 → +164.28 → 1,971,752.98 balance final, que coincide
con el balance declarado en la fila 4) — y luego se confirmó de nuevo corriendo el
parser real contra el archivo (ver §7).

---

## 5. Backend (`saaBE`)

### 5.1 Parsers — paquete nuevo `com.saa.ejb.tsr.parser`

Un `BankStatementParser` por banco, todos extendiendo una clase base
`AbstractExcelStatementParser` que centraliza: apertura del workbook (HSSF/XSSF
según la firma de bytes detectada), recorrido de filas desde el encabezado
configurado, el **balance replay** (acumular saldo fila a fila y comparar contra el
saldo que reporta el banco, señalando cualquier discrepancia sin abortar la carga),
y el guardado de la fila cruda para el CLOB de auditoría (`DEXBCRDO`).

| Banco | Formato | Fila encabezado | Fechas | Débito/Crédito | Notas propias |
|---|---|---|---|---|---|
| B. Internacional | .xls (legado) | 4 | texto ISO | columnas separadas (NUMERIC nativo) | sin saldo inicial declarado — se deriva de la primera fila |
| B. Pacífico (Ahorro/Cte) | .xlsx | 1 | texto dd/mm/yyyy | monto único (`Valor`) + código `TipoMov` (`N/C`=crédito, `N/D`=débito) | mismo header en ambos archivos (Ahorro y Cte), un solo parser sirve para los dos; cédula/nombre/banco del ordenante se anexan a `descripcion` (no hay columna dedicada); sin separador de miles en los montos |
| B. Atlántida | .xlsx | 3 | datetime nativo | columnas separadas (NUMERIC nativo) | saldo inicial viene en el encabezado del archivo (fila 0, columna 1) |
| B. Austro | .xlsx | **10** | texto ISO con hora (`"2026-06-30 22:44:55.81"`) | columnas separadas (NUMERIC nativo) | saldo inicial ("Saldo Ini:") en fila 8, columna 8 |
| B. Guayaquil | .xlsx | 14 | texto ISO | monto+signo, texto convención US (`$3,617,432.99`) | sin saldo inicial declarado — se deriva de la primera fila |
| B. Manabí (Ahorro) | .xlsx | 14 | texto ISO con hora | monto único + palabra completa en "Tipo Movimiento" (`"CREDITO"`/`"DEBITO"`, no un símbolo +/-), texto convención europea (`$ 2.517,34`) | parser de montos opuesto al de Guayaquil (punto=miles, coma=decimal); **filas en orden descendente** — se revierten antes de guardar; sin saldo inicial declarado |
| Coop. Policía Nacional | .xlsx | 5 | datetime nativo | columna `Valor` (NUMERIC nativo pese al formato "$") + columna `+/-` | saldo anterior en encabezado (fila 1, columna 2) |
| Coop. Alianza | .xls (legado) | 7 | texto **mm/dd/yyyy** (hardcodeado, nunca inferido) | monto = VALOR EFECTIVO + VALOR CHEQUE, signo por código `TIPO` (`"NC"`=crédito confirmado; `"ND"` para débito asumido por convención, sin confirmar en la muestra) | sin saldo inicial declarado |
| Coop. JEP | .xlsx | 2 | datetime nativo | columnas separadas (NUMERIC nativo) | descarta filas "Saldo inicial"/"Saldo Final" mezcladas en la tabla; el saldo inicial real se toma de esa misma fila antes de descartarla |
| Mutualista Pichincha | .xls (legado) | **18** | texto ISO | columnas separadas, **texto plano** (no NUMERIC) | fila 19 es un sub-título de producto ("AHORRO CORRIENTE"), se filtra por no traer saldo; columnas vacías intermedias (celdas combinadas); filas en orden **descendente** — se revierten antes de guardar |
| B. Amazonas | **XLSX real pese a extensión `.xls`** | 7 | texto dd/mm/yyyy | columnas separadas, **texto convención US** | sin saldo inicial explícito — se deriva de la primera fila (ver §4) |

**Correcciones encontradas al verificar los 11 archivos reales uno por uno** (no solo
Amazonas): además de la corrección de Pacífico (la propuesta original lo clasificaba
como "columnas separadas Débito/Crédito" — en realidad es monto único + código
`TipoMov`), se encontraron y corrigieron, primero al leer los archivos y luego de
nuevo al correr los parsers contra ellos (§7):
- **Austro**: el encabezado real está en la fila 10 (1-indexado), no en la fila 8.
  Las fechas llegan en texto con hora, no como datetime nativo.
- **Manabí**: no existe columna de signo (+/-) — el débito/crédito se determina por
  la palabra completa en "Tipo Movimiento". Además, **las filas vienen en orden
  descendente** (más reciente primero, igual que Pichincha) — esto no se detectó al
  leer el archivo manualmente, solo al correr el balance replay real (ver §7).
- **Alianza**: no hay columnas separadas de Débito/Crédito — es VALOR EFECTIVO +
  VALOR CHEQUE con el signo dado por el código `TIPO`. La muestra real solo trajo
  movimientos de crédito (2 filas), así que el código de débito ("ND") se asumió por
  convención y **no está confirmado** — pedir al cliente una muestra más larga antes
  de dar esto por cerrado.
- **Mutualista Pichincha**: el encabezado real está en la fila 18 (1-indexado), no
  en la 19 (esa fila es un sub-título de producto que hay que filtrar aparte).
- **Pacífico**: `TipoMov` solo mostró 2 códigos (`N/C`/`N/D`) en una muestra de 11-12
  movimientos de un mes — el campo es de uso general del banco y podría traer otros
  códigos en un archivo más largo; el balance replay señalará como advertencia
  cualquier fila donde caiga del lado equivocado.

Dado que se encontraron correcciones reales en **5 de los 11 bancos** solo leyendo
los archivos, y **2 bugs adicionales** al correr los parsers de verdad (ver §7), el
equipo debería tratar cualquier detalle de formato bancario que no esté
explícitamente marcado como "confirmado"/"verificado" en este documento con la misma
cautela.

`BankStatementParserFactory`: mapa `Banco.nombre → parser`, con los 11 registrados
(coincidencia por palabra clave normalizada — sin tildes, mayúsculas — no por
igualdad exacta). Si algún banco nuevo se agrega a `BNCO` sin parser, falla con un
mensaje explícito ("parser no implementado para {banco}"), nunca con un fallback
silencioso.

Detección de formato: primeros bytes del archivo — `PK\x03\x04` = XLSX/ZIP,
`D0 CF 11 E0` = XLS legado (OLE2). En la práctica esto lo hace
`WorkbookFactory.create(InputStream)` de Apache POI internamente (ya inspecciona la
firma, nunca la extensión).

### 5.2 Servicio — `ImportacionExtractoBancarioService`

- `validar(archivo, nombreArchivo, idCuentaBancaria)` → resuelve cuenta/banco/
  parser, detecta formato, calcula hash SHA-256 del archivo, avisa si ya fue
  cargado (usando `ExtractoBancarioDaoService.selectByHash`, ya existe), corre el
  parser, devuelve un resumen. **No persiste nada.**
- `confirmar(archivo, nombreArchivo, idCuentaBancaria, idEmpresa, usuarioCreacion)`
  → reparsea el mismo archivo y esta vez guarda `ExtractoBancario` +
  `DetalleExtractoBancario` (uno por fila) en una sola transacción, usando los
  servicios `saveSingle` que ya existen. Si el hash ya existe, rechaza con error
  explícito (evita duplicar la carga).

### 5.3 REST

Dos endpoints multipart nuevos en `ExtractoBancarioRest.java` (ya existe, `@Path("exbc")`):

```
POST /exbc/importar/validar/{idCuentaBancaria}     (archivo, archivoNombre)
POST /exbc/importar/confirmar/{idCuentaBancaria}   (archivo, archivoNombre, idEmpresa, usuarioCreacion)
```

Mismo patrón multipart que ya usa `AsoprepGenerales.procesarArchivoPetro` en el
módulo de créditos.

---

## 6. Frontend (`saaFE`)

### 6.1 Modelos y servicios nuevos (`src/app/modules/tsr/model` y `/service`)

`extracto-bancario.ts`, `detalle-extracto-bancario.ts`, `control-extracto-bancario.ts`
(mismos campos que las entidades Java) + sus servicios CRUD estándar (mismo patrón
que `cuenta-bancaria.service.ts`), más `validarImportacion` / `confirmarImportacion`
en el servicio de extracto (arman `FormData`, mismo patrón que
`ServiciosAsoprepService.almacenaDatosArchivoPetro`).

### 6.2 Cuatro pantallas nuevas (estilo visual: grid de `mat-card` con stat tiles,
como `participe-dash.component`; flujo de carga en dos pasos, como
`carga-aportes.component`)

1. **Cargar Extracto Bancario** — elegir cuenta bancaria → subir archivo →
   "Validar" (muestra resumen: período, saldos, totales, advertencias de saldo si
   las hay, aviso si ya fue cargado) → "Confirmar Carga".
2. **Consulta de Extractos** — tabla de `EXBC` filtrable, con columnas banco,
   cuenta, período, saldos, estado, **archivo, usuario que cargó, fecha de carga**
   (el requisito explícito de auditoría — quién y cuándo), acción "Ver Detalle".
3. **Detalle de Extracto** — cabecera de `EXBC` + tabla de `DEXB` (fecha,
   descripción, referencia, débito, crédito, saldo, estado de revisión), con vista
   expandible de la fila cruda (CLOB) para auditoría.
4. **Tablero de Cumplimiento** — grid de tarjetas por período de `CTEB` (cuentas
   totales / cargadas / conciliadas con barra de progreso), botones "Generar
   Período" / "Recalcular" (ya existen en backend), vista que cruza cuentas
   bancarias activas contra `EXBC` del período para señalar cuáles faltan.

### 6.3 Menú y rutas

Nuevo grupo "Extractos Bancarios" bajo Tesorería → Procesos, reusando el mismo
`idPermiso: 830` que el resto del módulo (el sistema de permisos granular todavía
no está implementado en el proyecto).

---

## 7. Verificación realizada

**Compilación:**
- Backend: `javac` contra el classpath completo del proyecto (Apache POI 5.2.3 ya
  presente en `pom.xml`, más el resto de dependencias Maven) — sin errores.
- Frontend: `tsc --noEmit` sobre todo el proyecto — sin errores.

**Prueba real contra los 11 archivos de muestra** (no solo compilación): se escribió
un harness Java standalone que instancia cada parser vía
`BankStatementParserFactory` y lo corre contra su archivo real, imprimiendo fechas,
saldos, conteo de filas y advertencias del balance replay. Resultado tras las
correcciones:

| Banco | Filas | Advertencias | Notas |
|---|---|---|---|
| Internacional | 9 | 0 | limpio |
| Pacífico Ahorro | 12 | 0 | limpio — confirma `N/C`/`N/D` en un mes completo real |
| Pacífico Cte | 1 | 0 | limpio |
| Atlántida | 6 | 0 | limpio |
| Austro | 1 | 0 | limpio |
| Guayaquil | 1 | 0 | limpio (saldo inicial derivado da 0.0 — artefacto de tener una sola fila en la muestra, no un bug) |
| Manabí | 4 | 0 | **limpio después del fix** (ver abajo) |
| Policía Nacional | 5 | 0 | limpio |
| Alianza | 2 | 1 | **advertencia real, no bug** (ver abajo) |
| JEP | 1 | 0 | **limpio después del fix** (ver abajo) |
| Mutualista Pichincha | 5 | 0 | limpio |
| Amazonas | 3 | 0 | limpio |

**2 bugs reales encontrados y corregidos al correr los parsers** (no se habrían
detectado solo leyendo los archivos ni con la compilación):

1. **Manabí venía en orden descendente** (igual que Pichincha) y el parser no lo
   sabía — sin el fix, 3 de 4 filas marcaban advertencia de saldo falsa. Se agregó
   `isOrdenDescendente() = true` a `ManabiStatementParser`, igual que Pichincha.
   Verificado manualmente que revertir el orden hace que las 4 filas cuadren exacto
   (al centavo).
2. **JEP generaba 6 filas fantasma** con fecha `1899-12-31` y todos los campos en
   null. Causa: Apache POI puede devolver una `Cell` no nula pero de tipo `BLANK`
   para celdas con formato aplicado más allá del rango real de datos — el chequeo
   `celda == null` no lo detecta. Se corrigió `JepStatementParser` (y
   preventivamente `AtlantidaStatementParser` y `PoliciaNacionalStatementParser`,
   que usan el mismo patrón aunque no manifestaron el bug en su muestra) para
   chequear también `celda.getCellType() == CellType.BLANK`. Se agregó además una
   red de seguridad en `AbstractExcelStatementParser`: cualquier fila sin fecha o
   sin ningún dato financiero (débito/crédito/saldo todos null) se descarta
   automáticamente, para que este tipo de bug no pueda volver a colarse en ningún
   parser, presente o futuro.

**La advertencia de Alianza no es un bug conocido:** el archivo declara período
completo ("FECHA INICIAL: 06/01/2026" / "FECHA FINAL: 06/30/2026") pero la muestra
solo trae 2 movimientos — se probó revertir el orden (como Manabí/Pichincha) y el
balance replay sigue sin cuadrar, lo que descarta un problema de orden. Lo más
probable es que la muestra esté truncada (le faltan filas intermedias del mes real).
No se cambió código por esto — es exactamente la clase de discrepancia que el
balance replay está diseñado para señalar en vez de ocultar. Pedir al cliente una
muestra completa de un mes antes de dar el parser de Alianza por cerrado.

**Pendiente (no se puede verificar sin el entorno vivo):**
- Correr los 2 endpoints REST contra el contenedor Docker `saa-oracle-23ai` con
  WildFly desplegado (persistencia real en EXBC/DEXB).
- Flujo completo en navegador (cargar → confirmar → ver en consulta → ver detalle
  → tablero) contra las cuentas bancarias de prueba ya existentes en desarrollo.
- Confirmar que recargar el mismo archivo (mismo hash) es rechazado en confirmar
  con mensaje claro, y que validar avisa sin bloquear la previsualización.
- Confirmar que `Banco.nombre` en la base de datos real efectivamente contiene las
  palabras clave que usa `BankStatementParserFactory` (INTERNACIONAL, PACIFICO,
  ATLANTIDA, AUSTRO, GUAYAQUIL, MANABI, POLICIA, ALIANZA, JEP, PICHINCHA, AMAZONAS)
  — si el nombre real en `BNCO` usa una palabra distinta, hay que ajustar el mapa.

---

## 8. Preguntas para el equipo

1. Confirmado: reusar `idPermiso: 830` para las 4 pantallas nuevas mientras no
   exista un módulo de permisos granular.
2. ¿Alguien del equipo tiene una muestra de extracto más larga de Mutualista
   Pichincha? La única probada hasta ahora tiene 5 transacciones y falta confirmar
   que el formato no pagina en archivos más largos.
3. ¿Alguien puede conseguir una muestra de Coop. Alianza con al menos un movimiento
   de débito y sin huecos (un mes completo)? La única muestra disponible solo trajo
   2 créditos y el balance replay no cuadra, probablemente por filas faltantes.
4. ¿Alguien puede conseguir una muestra de Banco Pacífico más larga (más de un mes)
   para confirmar que `TipoMov` no trae otros códigos además de `N/C`/`N/D`?

---

## 9. Archivos creados (referencia rápida)

**Backend** (`c:\work\saaBE\saaBE\src\main\java\com\saa\`):
- `ejb/tsr/parser/`: `BankStatementParser.java`, `ParsedStatement.java`,
  `AbstractExcelStatementParser.java`, `BankStatementParserFactory.java`, y los 11
  parsers (`InternacionalStatementParser.java`, `PacificoStatementParser.java`,
  `AtlantidaStatementParser.java`, `AustroStatementParser.java`,
  `GuayaquilStatementParser.java`, `ManabiStatementParser.java`,
  `PoliciaNacionalStatementParser.java`, `AlianzaStatementParser.java`,
  `JepStatementParser.java`, `PichinchaStatementParser.java`,
  `AmazonasStatementParser.java`).
- `ejb/tsr/service/ImportacionExtractoBancarioService.java` +
  `ejb/tsr/serviceImpl/ImportacionExtractoBancarioServiceImpl.java`.
- `model/tsr/ResumenImportacionExtracto.java` (DTO).
- `ws/rest/tsr/ExtractoBancarioRest.java` (modificado: 2 endpoints multipart nuevos).

**Frontend** (`c:\work\saaFE\v1\saaFE\src\app\modules\tsr\`):
- `service/ws-tsr.ts` (modificado: constantes `RS_EXBC`/`RS_DEXB`/`RS_CTEB`).
- `model/extracto-bancario.ts`, `model/detalle-extracto-bancario.ts`,
  `model/control-extracto-bancario.ts`, `model/resumen-importacion-extracto.ts`.
- `service/extracto-bancario.service.ts`, `service/detalle-extracto-bancario.service.ts`,
  `service/control-extracto-bancario.service.ts`.
- `forms/generales/cargar-extracto-bancario/`,
  `forms/generales/consulta-extractos-bancarios/`,
  `forms/generales/detalle-extracto-bancario/`,
  `forms/generales/tablero-cumplimiento-extractos/` (cada una con `.ts`/`.html`/`.scss`).
- `app.routes.ts` y `menu/menutesoreria/menutesoreria.component.ts` (modificados:
  rutas y grupo de menú "Extractos Bancarios").
