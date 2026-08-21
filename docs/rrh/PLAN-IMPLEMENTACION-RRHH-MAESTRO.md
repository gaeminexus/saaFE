# Plan de implementación del módulo RRHH — Documento maestro

**Cliente:** ASOPREP-FCPC · **Sistema:** SAA (`saaBE` + `saaFE`) · **Fecha:** 2026-08-19

Este es el documento raíz del plan. Contiene el contexto, las convenciones y el contrato entre
capas. El trabajo se ejecuta en paralelo siguiendo dos documentos hermanos:

| Documento | Responsable | Contenido |
|---|---|---|
| `PLAN-IMPLEMENTACION-RRHH-MAESTRO.md` | — | Este archivo. Léelo primero, siempre |
| `PLAN-IMPLEMENTACION-RRHH-BACKEND.md` | Agente backend | Entidades, DAO, Service, REST, motor de cálculo |
| `PLAN-IMPLEMENTACION-RRHH-FRONTEND.md` | Agente frontend | Pantallas, servicios HTTP, rutas, menú |
| `CONTRATO-DTO-PARAMETRIZACION-RRHH.md` | **Ambos** | Nombres de propiedad Java de cada columna. Contrato vinculante para el CRUD |
| `ANALISIS-MODULO-RRHH.md` | — | Diagnóstico previo: por qué se hace este trabajo |
| `GUIA-PRIMER-CALCULO.md` | — | Cómo llevar el motor de base vacía a un rol calculado, con el caso de prueba calculado a mano |

Los scripts de base de datos están en `docs/logica-negocio/rhh/sql/` y **son responsabilidad
del documento maestro**: ya están escritos y se ejecutan antes de cualquier código.

---

## 1. Qué se está construyendo y por qué

RHH existe hoy como un esqueleto CRUD generado por plantilla: 23 entidades con sus cinco capas,
2.309 líneas de `serviceImpl` **sin una sola operación aritmética**, y cuatro pantallas de
procesos con la UI terminada y cero conexión al backend. El detalle está en
`ANALISIS-MODULO-RRHH.md`.

Se construye el ciclo completo del colaborador —contrato, datos personales, operación diaria,
nómina mensual con normativa ecuatoriana, liquidación— más las salidas al IESS, al SRI y al
Ministerio del Trabajo.

### Cronograma comprometido

- Saldos de apertura al **31-dic-2025**.
- Enero a julio de 2026 se cargan **en modo histórico, sin generar asientos contables**.
- **Agosto de 2026 es el primer período productivo**, con contabilización, aunque se procese
  con valores retroactivos. Decisión confirmada por el cliente.
- Personal: entre 18 y 25 empleados, todos con ingreso desde junio de 2025.

---

## 2. Reglas no negociables

Estas cinco reglas aplican a todo el trabajo, en ambas capas. Si algo del plan las contradice,
gana la regla.

**1 · Nada se quema en el código.** Ningún porcentaje, valor, tope, plazo ni catálogo puede
aparecer como literal en Java o TypeScript. Todo vive en `RHH.PRNM`, `RHH.TBIR`, `RHH.TPGP`,
`RHH.CPNM` o en `SCP.PRBR`/`SCP.PDTR`. Un cambio de normativa debe resolverse con un `UPDATE`,
nunca con un despliegue. Si al implementar aparece un número sin lugar donde guardarse, **eso
es un hueco del modelo: repórtalo, no lo hardcodees**.

**2 · Los estados y catálogos son rubros.** Se leen con
`DetalleRubroDaoService.selectValorStringByRubAltDetAlt(rubroAlterno, detalleAlterno)`, usando
las constantes de `com.saa.rubros`. Nunca la PK, siempre el par de códigos alternos.

**3 · Multiempresa desde el día uno.** Toda tabla de parametrización lleva `PJRQCDGO` (FK a
`SCP.PJRQ`, que es donde se mapea `Empresa`). Toda consulta filtra por empresa. El sistema se
va a comercializar a otras compañías.

**4 · El dinero es `Double`, redondeado por renglón con `RedondeoNomina`.**
*(Regla modificada el 2026-08-19. Antes decía `BigDecimal`; ver la justificación abajo.)*

El tipo del dinero en RRHH es **`Double`**, igual que en los otros ocho módulos del sistema.
Todo redondeo pasa por `com.saa.ejb.rhh.util.RedondeoNomina`, y se aplica a **cada renglón**
antes de sumarlo — nunca solo al total. El total es la suma de renglones ya redondeados.

```java
Double valor = RedondeoNomina.porcentaje(baseIess, prnm.getAportePersonal());
Double total = RedondeoNomina.suma(renglon1, renglon2, renglon3);
```

Nunca `Math.round(v * 100) / 100.0` ni comparaciones con `==`: para comparar dinero se usa
`RedondeoNomina.sonIguales(a, b)`.

**Por qué `Double` y no `BigDecimal`,** contra la recomendación de manual:

1. **La capa contable ya es `Double`.** `CNT.DetalleAsiento.valorDebe` y `valorHaber` son
   `Double`. Usar `BigDecimal` en RRHH obligaría a convertir en cada línea de asiento, y las
   fronteras de conversión son justo donde aparecen los errores de redondeo. Mezclar es peor
   que uniformar.
2. **`validaDebeHaber` compara con tolerancia, no con igualdad exacta.**
   `DetalleAsientoServiceImpl:232` hace `if (Math.abs(debe - haber) > 0.01)`, y la suma la
   calcula Oracle en `NUMBER` exacto (`selectSumaDebeHaberByAsiento`); Java solo compara el
   resultado. El argumento fuerte a favor de `BigDecimal` —que el asiento no cuadre por un
   centavo— no aplica en esta arquitectura.
3. **Las columnas son `NUMBER(18,2)`.** Oracle guarda decimal exacto y redondea al escribir, de
   modo que el error de punto flotante no se persiste ni se arrastra entre períodos.
4. **La magnitud del error es irrelevante a esta escala.** `Double` tiene ~15 dígitos
   significativos; con 25 empleados, ~40 renglones y 12 meses son ~12.000 operaciones al año,
   frente a los ~10¹⁰ que harían falta para acumular medio centavo.

**Lo que `Double` sí rompe y `RedondeoNomina` resuelve:** el redondeo al medio centavo.
`1.005` se almacena como `1.00499999999999989`, así que redondear "hacia arriba" daría 1,00.
`RedondeoNomina` usa `BigDecimal.valueOf(double)` —que pasa por `Double.toString()` y recupera
la representación decimal corta— para que `1.005` dé 1,01. Es `BigDecimal` como herramienta
puntual de redondeo, no como tipo del modelo.

**Migrar el sistema entero a `BigDecimal` queda descartado:** es un ERP en producción sin
ningún test automatizado (`src/test` está vacío), y el retorno no compensa el riesgo.

**5 · El interruptor manda.** Si `PRDN.PRDNMODO = 1` (HISTORICO_SIN_CONTABILIZAR), no se genera
ningún asiento y no se valida ninguna cuenta contable, pero el período avanza igual por su
máquina de estados. Es lo que permite cargar enero–julio 2026 sin plan de cuentas.

**6 · Un control tiene que salir de otra fuente que aquello que verifica.**
*(Añadida el 2026-08-20, extraída de un defecto real.)*

**Dos copias de una regla no se contradicen entre sí: se equivocan juntas.** Un control que
comparte su origen con lo que verifica no es un control — es la misma afirmación escrita dos
veces, y pasa siempre.

**El caso que lo demostró.** La correspondencia «tipo de saldo de apertura → tipo de descuento
recurrente» estaba duplicada: una copia en el switch de `aplicarSaldosApertura` y otra dentro de
`validaConceptoDelPrestamo`. Las dos suponían quirografario para cualquier préstamo del IESS, de
modo que **un hipotecario migrado acababa en el concepto del quirografario y la validación no
avisaba nunca**: validaba contra la misma suposición que estaba validando. Se cerró poniendo la
correspondencia en un solo sitio —`tipoDescuentoDelSaldo`— que usan las dos rutas.

**Cómo se aplica al diseñar un control.** La pregunta, siempre, es **de dónde sale el valor con el
que se compara**:

- **`TOTAL IESS` contra la planilla del organismo → sirve.** La planilla la emite el IESS: no
  puede compartir un error con nuestro motor.
- **`TOTAL IESS` contra el propio rol → no sirve.** Los dos derivarían de la misma base imponible,
  y un error en esa base cuadraría consigo mismo.

Por eso el **control 2 del §3.2 del plan de carga es el que manda** sobre el líquido total, aunque
el líquido parezca el número importante: es el único que no sale de donde sale el rol.

El mismo criterio explica por qué el caso de `GUIA-PRIMER-CALCULO.md` §3 **se calculó a mano desde
los parámetros y no ejecutando el motor**, y por qué las dos ⚠ de marzo y abril son prueba a
favor: ahí el sistema **debe** discrepar de la planilla, y una coincidencia sería el error.

---

## 3. Convenciones del proyecto

### Base de datos

- Tabla: 4 letras mayúsculas. Columna: 4 de la tabla + 4 del descriptor; si el descriptor tiene
  menos de 4 caracteres se repite la última letra (`IVA` → `IVAA`).
- PK: `XXXXCDGO NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL`.
  RHH usa IDENTITY en todas sus tablas. **`SCP.PRBR` y `SCP.PDTR` son la excepción**: usan las
  secuencias `SCP.SQ_PRBRCDGO` y `SCP.SQ_PDTRCDGO`.
- Auditoría del esquema RHH: `XXXXFCHR` (fecha) y `XXXXUSRR` (usuario). El estándar general del
  proyecto dice `FCRG`/`USAR`, pero RHH ya consolidó la otra forma: **mantener la coherencia
  interna del esquema**.
- Índice obligatorio por cada FK, **salvo cuando una restricción `UNIQUE` o la PK ya indexa esa
  misma lista de columnas**: Oracle rechaza el duplicado con `ORA-01408`. Ojo con el matiz —
  la colisión solo ocurre si la lista es idéntica; un índice sobre `(A)` convive sin problema
  con uno sobre `(A, B)`. En este módulo el único caso es `RHH.CFNM`, cuya `UQ_CFNM_PJRQ` ya
  cubre `PJRQCDGO`.
- `COMMENT ON TABLE` y `COMMENT ON COLUMN` en todo, sin excepción — con esta nomenclatura, un
  campo sin comentario es ilegible.
- Tipos: `NUMBER`, `NUMBER(18,2)` para dinero, `NUMBER(18,6)` para porcentajes, `VARCHAR2(n)`,
  `DATE`, `TIMESTAMP`. Prohibidos `BIGINT`, `DECIMAL`, `VARCHAR`.

### Backend

Cada tabla implica siete archivos, en este orden:

```
model/rhh/{Entidad}.java
model/rhh/NombreEntidadesRhh.java          (agregar la constante)
ejb/rhh/dao/{Entidad}DaoService.java       @Local  extends EntityDao<T>
ejb/rhh/daoImpl/{Entidad}DaoServiceImpl.java  @Stateless, con obtieneCampos()
ejb/rhh/service/{Entidad}Service.java      @Local  extends EntityService<T>
ejb/rhh/serviceImpl/{Entidad}ServiceImpl.java @Stateless
ws/rest/rhh/{Entidad}Rest.java             @Path("xxxx") en minúsculas
```

`@NamedQuery` debe llamarse exactamente `{Entidad}All` y `{Entidad}Id`, y coincidir con la
constante de `NombreEntidadesRhh`, o se produce `IllegalArgumentException` en runtime.
`obtieneCampos()` devuelve los nombres de campo **Java** de esa entidad — no copiar de otra
entidad, que es el error que hoy tienen 18 de 23 DAOs.

Se mantiene la traza `System.out.println` al inicio de cada método de Service, DAO y REST: es
convención de la casa y el resto del sistema la respeta.

### Frontend

```
modules/rrh/forms/{area}/{pantalla}/    componente, plantilla y estilos
modules/rrh/model/{entidad}.ts          interface con el código de 4 letras en comentario
modules/rrh/service/{entidad}.service.ts  @Injectable({providedIn:'root'})
modules/rrh/service/ws-rrh.ts           constante de endpoint
app.routes.ts                           ruta bajo 'menurecursoshumanos'
modules/rrh/menu/menurecursoshumanos/   entrada de menú
```

---

## 4. Orden de ejecución de la base de datos

### Requisito previo: cuota del esquema RHH

Antes de ejecutar nada, un DBA debe confirmar que el usuario `RHH` tiene cuota en su tablespace:

```sql
ALTER USER RHH QUOTA UNLIMITED ON USERS;   -- ajustar al tablespace real del resto de esquemas
```

Sin esto aparece `ORA-01950: el usuario RHH tiene una cuota insuficiente en el tablespace`.
**La trampa es que el error no salta en los `CREATE TABLE`**: con `DEFERRED_SEGMENT_CREATION`
activo —el valor por defecto desde Oracle 11g— la tabla se crea sin reservar espacio y el fallo
aparece recién en el primer `INSERT`, varios scripts después. Si ocurre, no hay que rehacer los
DDL: basta conceder la cuota y reanudar desde el script de inserción que falló.

Conviene verificar antes que `RHH` use el mismo tablespace que `CNT`, `CRD`, `TSR` y los demás:

```sql
SELECT username, default_tablespace FROM dba_users
 WHERE username IN ('RHH','CNT','CRD','CBR','PGS','TSR','SCP','RPR') ORDER BY username;
```

### Orden de ejecución

Los nueve scripts de `docs/logica-negocio/rhh/sql/` se ejecutan en orden.

Los scripts **05, 07, 08 y 09 usan el parámetro con nombre `:EMPRESA`**, que DBeaver solicita en
un diálogo al ejecutar el script (Alt+X) y aplica a todas las sentencias. Los cuatro deben
recibir el mismo valor. En el 05 se usa para el backfill de `PJRQCDGO` en las filas que ya
existían de `MPLD`, `PRDN`, `TPCE` y `CTLG`: sin él, esas filas quedan con la empresa en nulo y
cualquier pantalla que filtre por empresa se muestra vacía sin dar ningún error. Para averiguarlo:

```sql
SELECT PJRQCDGO, PJRQNMBR FROM SCP.PJRQ WHERE PJRQNVLL = 1;
```

Si el diálogo no aparece, activar en DBeaver `Preferences → Editors → SQL Editor → SQL Processing
→ Parameters → Enable parameters in queries`, con el prefijo de parámetro con nombre en `:`.
Los scripts 01 a 06 no llevan parámetros: el esquema RHH y los rubros de `SCP` son globales.

| # | Script | Qué hace |
|---|---|---|
| 01 | `01_DDL_TABLAS_PARAMETRIZACION.sql` | `CFNM`, `PRNM`, `TBIR`, `TPGP`, `CSTR`, `CPNM`, `FMRC`, `DFMR` |
| 02 | `02_DDL_TABLAS_PERSONAL.sql` | `CRGF`, `CBEM`, `GSPR`, `CPXM`, `NVIS` |
| 03 | `03_DDL_TABLAS_NOMINA.sql` | `NVNM`, `ACMN`, `PVNM`, `PYIR`, `LQBS`, `DSRC`, `CTDS`, `HREX` |
| 04 | `04_DDL_TABLAS_ASISTENCIA_PAGO.sql` | `CRMR`, `RDPG`, `DRPG`, `UTLD`, `DTUT`, `SLAP` |
| 05 | `05_DDL_ALTER_TABLAS_EXISTENTES.sql` | Campos nuevos y corrección de tipos en las 23 tablas actuales |
| 06 | `06_INSERT_RUBROS.sql` | 42 rubros (179–220) + detalle `RECURSOS_HUMANOS` del rubro 15 |
| 07 | `07_INSERT_PARAMETRIZACION.sql` | Parámetros 2025/2026, tabla de IR, topes, causales, configuración |
| 08 | `08_INSERT_CONCEPTOS_NOMINA.sql` | Catálogo de 44 conceptos de nómina |
| 09 | `09_INSERT_PLANTILLAS_CONTABLES.sql` | Tipos de asiento, plantillas y sus líneas |

### Datos normativos del script 07 — verificados

Toda la parametría del script 07 está verificada al 2026-08-19 contra la Resolución SRI
NAC-DGERCGC25-00000043 y contrastada con fuentes independientes.

**Dos cambios de 2026 que conviene tener presentes**, porque rompen la intuición de quien
conozca la tabla de años anteriores:

1. La tabla del impuesto a la renta 2026 tiene **diez tramos, no nueve**.
2. La **tarifa máxima es 37 %, no 35 %**. El tramo del 35 % pasó a ser el penúltimo y aplica
   entre 82.679 y 109.956; por encima de 109.956 se aplica 37 %.

La coherencia aritmética de la tabla está comprobada: el impuesto sobre fracción básica de cada
tramo es el acumulado del anterior más su excedente por su porcentaje. El script incluye la
consulta de verificación con `LAG(...)` que lo demuestra.

Topes de gastos personales 2026, con la canasta de enero en USD 821,80: **7, 9, 11, 14, 17 y 20
canastas** para 0, 1, 2, 3, 4 y 5 o más cargas, lo que da rebajas máximas de 1.035,47 / 1.331,32
/ 1.627,16 / 2.070,94 / 2.514,71 / 2.958,48.

### Códigos alternos contables — asignados por el cliente

- **Tipo de asiento (`CNT.PLNT`): código alterno `6` para los cuatro asientos de RRHH.** No se
  crea uno por asiento: los cuatro comparten tipo, y lo que los distingue es la plantilla. El
  script 09 lo inserta solo si no existe ya para la empresa.
- **Plantillas (`CNT.PLNS`): `163` rol de pagos, `164` provisiones, `165` pago, `166`
  liquidación.** El 163 era el siguiente código alterno disponible en la instalación.

En `com.saa.rubros.TipoAsientos` basta con una constante:

```java
/** Asientos generados por el modulo de RRHH: rol, provisiones, pago y liquidacion. */
public static final int RECURSOS_HUMANOS = 6;
```

No confundir este `6` con `ModuloSistema.RECURSOS_HUMANOS = 5`: uno es el tipo de asiento
contable y el otro la etiqueta de módulo que se pasa como último argumento de `generarAsiento`.

---

## 5. Cómo se contabiliza

El módulo **no inventa** su mecanismo contable: usa el de CNT.

### Las piezas

| Tabla | Qué es |
|---|---|
| `CNT.PLNT` (`TipoAsiento`) | Tipo de la cabecera del asiento, con `PLNTCDAL` único |
| `CNT.PLNS` (`Plantilla`) | Plantilla del asiento, con `PLNSCDAL` único |
| `CNT.DTPL` (`DetallePlantilla`) | Líneas de la plantilla: `planCuenta`, `DTPLMVMN` (1=DEBE, 2=HABER) y `DTPLAXL1..5` |
| `CNT.PLNN` (`PlanCuenta`) | Plan de cuentas. **Ojo: `PLNN` es el plan de cuentas, `PLNT` es el tipo de asiento y `PLNS` es la plantilla** |

### La convención de `auxiliar1` — se estrena en este módulo

`DTPLAXL1..5` existen en la entidad pero **hoy no los consume ningún proceso del sistema**
(cero referencias en `ejb/` y `ws/`). RHH inaugura su uso, así que la convención queda fijada
aquí:

> **`DTPLAXL1` contiene el código alterno del detalle del rubro 214 (`RHH_LINEA_ASIENTO`)**,
> que identifica el papel de esa línea dentro del asiento.

El proceso localiza su línea así:

```sql
SELECT d.* FROM CNT.DTPL d
 WHERE d.PLNSCDGO = :idPlantilla
   AND d.DTPLAXL1 = :codigoAlternoLinea   -- p. ej. 18 = SUELDOS POR PAGAR
   AND d.DTPLESTD = 1
```

Los códigos están agrupados por asiento: 1–29 rol de pagos, 30–49 provisiones, 50–59 pago,
60–79 liquidación. La lista completa está en el script 06, rubro 214.

Existe además el patrón alternativo ya usado en TSR (`MotivoCobro`, `MotivoPago` llevan FK
directa a `DetallePlantilla` y resuelven con `detallePlantillaService.recuperaCuentaContable`).
`RHH.CPNM` soporta ambos: tiene `DTPLCDGO` para ese patrón y `PLNNCDGO` para la cuenta propia
del concepto, igual que `PGS.GRPP` (`GrupoProductoPago`).

### La llamada

```java
Asiento generarAsiento(Long idEmpresa, int codigoAltTipoAsiento,
        LocalDate fechaAsiento, String observaciones, String usuario,
        List<DetalleAsiento> lineas, Long moduloSistema) throws Throwable;
```

`AsientoContableServiceImpl` resuelve la plantilla, arma la cabecera, asigna período y
numeración, guarda los detalles y ejecuta `validaDebeHaber`, que **revierte toda la transacción**
si el asiento no cuadra. Por eso hay que comprobar el cuadre con `RedondeoNomina.suma(...)` y
`RedondeoNomina.sonIguales(...)` antes de llamar, y ajustar la diferencia por redondeo
(tolerancia en `CFNM.CFNMTLCD`) contra la línea de cuadre.

`moduloSistema` se pasa como `ModuloSistema.RECURSOS_HUMANOS` en el rol y las provisiones, y
como `ModuloSistema.TESORERIA` en el asiento de pago, porque ahí el dinero sale de tesorería.

---

## 6. Contrato REST — el punto de sincronización entre capas

Backend y frontend trabajan en paralelo contra este contrato. **Si hay que cambiarlo, se
actualiza aquí primero y se avisa a la otra capa.**

### CRUD estándar

Toda entidad nueva expone el juego habitual. El application path es `/rest`, de modo que la URL
real es `/SaaBE/rest/{tabla}/...`:

```
GET    /rest/{tabla}/getAll
GET    /rest/{tabla}/getId/{id}
POST   /rest/{tabla}                    saveSingle
PUT    /rest/{tabla}                    saveSingle
DELETE /rest/{tabla}/{id}
POST   /rest/{tabla}/selectByCriteria   body: List<DatosBusqueda>
```

Paths de las tablas nuevas: `cpnm`, `cfnm`, `prnm`, `tbir`, `tpgp`, `cstr`,
`fmrc`, `dfmr`, `crgf`, `cbem`, `gspr`, `cpxm`, `nvis`, `nvnm`, `acmn`, `pvnm`, `pyir`, `lqbs`,
`dsrc`, `ctds`, `hrex`, `crmr`, `rdpg`, `drpg`, `utld`, `dtut`, `slap`, `fmbn`, `dfmb`, `slof`.

### Endpoints de proceso

Estos son los que el frontend necesita para las pantallas de procesos. Todos devuelven JSON.

Los tres de `rlpg` se acordaron el 2026-08-19, al arrancar la fase 5, y los sirve
`GeneracionRolPagoService`. **Los roles se generan al aprobar el período**, desde el propio
`aprobarPeriodo`: `/rest/rlpg/generar` es la regeneración, para un período reabierto y
recalculado. El cuerpo de `registrarRecepcion` es **`List<Long>` de ids de rol** —confirmado el
2026-08-19, siguiendo el precedente de `/rest/hrex/aprobar`—; el servidor marca `recibido='S'` y
sella `fechaEnvio` con la fecha del día cuando esté en nulo, y **devuelve el número de roles marcados**. El `usuarioRegistro` viaja como parámetro de consulta en los dos endpoints POST, siguiendo el precedente de `/rest/prdn/calcular/{id}?usuarioRegistro=`, porque el cuerpo ya lo ocupa la lista de ids.

> **Regla general, explicitada el 2026-08-19: TODO endpoint de proceso POST lleva
> `?usuarioRegistro=`** salvo que su cuerpo JSON ya incluya la clave (como `sldv/acreditar`).
> El backend lo lee con `@QueryParam("usuarioRegistro")` en `prdn/calcular`, `aprobar`,
> `cerrar` y `contabilizar`, en `rlpg/generar` y `registrarRecepcion`, y en
> `pyir/proyectarTodos` (junto con `?idEmpresa=`); como clave del cuerpo JSON en `reabrir`,
> `recalcularEmpleado`, `excluirEmpleado`, `pyir/proyectar`, `slap/aplicar` y `slap/revertir`;
> y como parte del multipart en `slap/cargar`. **La tabla de abajo es la resolución
> autoritativa, verificada endpoint por endpoint contra los REST el 2026-08-19** — ante una
> contradicción entre la regla y la tabla, manda la tabla.
> No es opcional decorativo: alimenta los campos de auditoría (`PRDNUSAP`, `RLPGUSRR`,
> `RNGLUSRR`, …). Se detectó que el frontend no lo enviaba en **ninguna** llamada de proceso y
> toda la auditoría quedaba en nulo sin dar error; la tabla de abajo decía `—` en parámetros y
> esa omisión era del contrato, no de las capas.

| Método | Ruta | Body / parámetros | Devuelve |
|---|---|---|---|
| POST | `/rest/prdn/validar/{idPeriodo}` | — | `List<String>` de mensajes; vacío = OK |
| POST | `/rest/prdn/calcular/{idPeriodo}` | `?usuarioRegistro=` | `ResultadoCalculoPeriodo` |
| POST | `/rest/prdn/recalcularEmpleado` | `{idPeriodo, idEmpleado, preservarManuales, usuarioRegistro}` | `ResultadoCalculoNomina` |
| POST | `/rest/prdn/simular` | `{idContrato, idPeriodo}` | `ResultadoCalculoNomina` (no persiste) |
| POST | `/rest/prdn/aprobar/{idPeriodo}` | `?usuarioRegistro=` | 200 o error |
| POST | `/rest/prdn/reabrir/{idPeriodo}` | `{motivo, usuarioRegistro}` | 200 o error |
| POST | `/rest/prdn/contabilizar/{idPeriodo}` | `?usuarioRegistro=` | `Asiento`, o 204 sin cuerpo si es histórico |
| POST | `/rest/prdn/contabilizarProvisiones/{idPeriodo}` | `?usuarioRegistro=` | `Asiento`, o 204 si es histórico o el período no generó provisiones |
| POST | `/rest/prdn/cerrar/{idPeriodo}` | `?usuarioRegistro=` | 200 o error |
| POST | `/rest/prdn/excluirEmpleado` | `{idPeriodo, idEmpleado, motivo, usuarioRegistro}` | 200 o error |
| GET | `/rest/prdn/previsualizarAsiento/{idPeriodo}/{tipo}` | — | `List<LineaAsientoNomina>` |
| POST | `/rest/pyir/proyectar` | `{idEmpleado, anio, mesDesde, usuarioRegistro}` | `ResultadoProyeccionIr` |
| POST | `/rest/pyir/proyectarTodos/{anio}` | `?idEmpresa=&usuarioRegistro=` | número de empleados proyectados |
| POST | `/rest/lqbs/generarDecimoTercero/{anio}` | — | número de beneficios generados |
| POST | `/rest/lqbs/generarDecimoCuarto/{anio}/{region}` | — | número de beneficios generados |
| POST | `/rest/lqbs/generarFondosReserva/{anio}` | — | número de beneficios generados |
| POST | `/rest/sldv/acreditar` | `{idEmpresa, fechaCorte, usuarioRegistro}` | número de períodos acreditados |
| GET | `/rest/sldv/disponible/{idEmpleado}` | — | días disponibles |
| POST | `/rest/sldv/caducar` | `{idEmpresa, fechaCorte, usuarioRegistro}` | `List<String>` con el detalle de lo caducado |
| POST | `/rest/crmr/previsualizar` | multipart: `archivo`, `archivoNombre`, `idFormato`, `idEmpresa` — los dos ids **como texto**, y `archivoNombre` con `encodeURIComponent` | `ResultadoImportacionMarcaciones` |
| POST | `/rest/crmr/confirmar` | igual, más `?usuarioRegistro=` | `ResultadoImportacionMarcaciones` |
| POST | `/rest/crmr/anular/{idCarga}` | `{motivo, usuarioRegistro}` | 200 o error |
| POST | `/rest/rsmn/consolidar` | `{desde, hasta, usuarioRegistro}` | número de resúmenes generados |
| POST | `/rest/hrex/aprobar` | `List<Long>` de ids, `?usuarioRegistro=` | número de horas aprobadas |
| POST | `/rest/rlpg/generar/{idPeriodo}` | `?usuarioRegistro=` | número de roles generados |
| GET | `/rest/rlpg/verificar/{id}` | — | `true`/`false` de integridad |
| POST | `/rest/rlpg/registrarRecepcion` | `List<Long>` de ids de rol, `?usuarioRegistro=` | número de roles marcados |
| POST | `/rest/lqdc/simular` | `{idContrato, fechaSalida, idCausal}` | `ResultadoLiquidacion` |
| POST | `/rest/lqdc/calcular` | `{idContrato, fechaSalida, idCausal, observaciones, usuarioRegistro}` | `Liquidacion` |
| POST | `/rest/lqdc/aprobar/{id}` | `?usuarioRegistro=` | 200 o error |
| POST | `/rest/lqdc/ejecutarSalida/{id}` | `?usuarioRegistro=` | 200 o error |
| POST | `/rest/lqdc/contabilizar/{id}` | `?usuarioRegistro=` | `Asiento` |
| POST | `/rest/rdpg/generar` | `{idPeriodo, idCuentaBancaria, usuarioRegistro}` | `OrdenPagoNomina` con su detalle |
| GET | `/rest/rdpg/archivoBancario/{id}` | — | archivo binario |
| POST | `/rest/rdpg/confirmar/{id}` | `{fechaAcreditacion, usuarioRegistro}` | `OrdenPagoNomina` actualizada |
| POST | `/rest/slap/cargar` | multipart: `archivo` + `idEmpresa` + `fechaCorte` + `usuarioRegistro`, todos **como texto** | número de saldos cargados |
| GET | `/rest/slap/validar` | `?idEmpresa=&fechaCorte=` | `List<String>` de inconsistencias |
| POST | `/rest/slap/aplicar` | `{idEmpresa, fechaCorte, usuarioRegistro}` | número de saldos aplicados |
| POST | `/rest/slap/revertir` | `{idEmpresa, fechaCorte, usuarioRegistro}` | número de saldos revertidos |
| POST | `/rest/utld/calcular` | `{idEmpresa, anio, utilidadContable, usuarioRegistro}` | `Utilidad` |
| POST | `/rest/slof/generarRdep/{anio}` | `?idEmpresa=&usuarioRegistro=` | XML del RDEP |
| POST | `/rest/slof/registrarGeneracion` | `{idEmpresa, tipoSalida, anio, mes, idEmpleado, nombreArchivo, usuarioRegistro}` | `SalidaOficial` |
| POST | `/rest/slof/registrarPresentacion/{id}` | `{fechaPresentacion, numeroComprobante, usuarioRegistro}` | `SalidaOficial` |

> **Regla de los endpoints multipart, fijada el 2026-08-20 tras el defecto de `crmr`.** En un
> `multipart/form-data`, **todo identificador y toda fecha viajan como texto** y el método los
> parsea dentro, devolviendo un 400 **con mensaje** si falta o no convierte. Declararlos tipados
> (`@FormParam("idFormato") Long`) hace que RESTEasy rechace la petición **antes de despachar el
> método**: 400 sin cuerpo y sin una sola línea en el log, que es indistinguible de un endpoint
> inexistente. Precedentes: `ExtractoBancarioRest`, `SaldoAperturaRest` y ahora
> `CargaMarcacionesRest`. Y el nombre del archivo se envía con `encodeURIComponent` y se decodifica
> en el servidor con `URLDecoder.decode(..., UTF_8)`, porque el proveedor de multipart no declara
> charset para los campos de texto planos.

### Nombres de campo del CRUD — contrato vinculante

Esta sección fija las **rutas** y los **DTO de proceso**, pero el JSON del CRUD estándar viaja
con los nombres de propiedad **Java** de cada entidad, y esos no se derivan de forma unívoca del
nombre de columna (`CPNMIMIE` podría ser `imponibleIess` o `imponibleIESS`).

Están fijados uno por uno en **`CONTRATO-DTO-PARAMETRIZACION-RRHH.md`**, verificado contra el
DDL columna por columna. **El backend construye sus entidades con exactamente esos nombres.**

Es el tipo de desajuste que no rompe ninguna compilación: se manifiesta como campos que llegan
vacíos o que no se guardan, y solo aparece probando la pantalla. Si alguna capa necesita cambiar
un nombre, se cambia en el contrato primero y se avisa a la otra.

### DTO compartidos

Son POJO `Serializable` sin `@Entity`, en `com.saa.model.rhh`, siguiendo el precedente de
`com.saa.model.cnt.RespuestaBalance`. El frontend los espeja como interfaces en
`modules/rrh/model/`.

```
ResultadoCalculoPeriodo { idPeriodo, empleadosProcesados, empleadosConError,
                          totalIngresos, totalDescuentos, totalNeto, totalPatronal,
                          errores: string[] }

ResultadoCalculoNomina  { idEmpleado, nombreEmpleado, diasTrabajados,
                          renglones: RenglonCalculado[],
                          totalIngresos, totalDescuentos, neto, advertencias: string[] }

RenglonCalculado        { codigoConcepto, nombreConcepto, tipoConcepto,
                          cantidad, base, porcentaje, valor, orden }
                        // codigoConcepto es el CODIGO ALTERNO (CPNMALTR),
                        // NO la PK (CPNMCDGO). Ver la nota de abajo.

ResultadoProyeccionIr   { idEmpleado, anio, ingresosProyectados, baseImponible,
                          impuestoCausado, gastosDeclarados, tope, rebaja,
                          impuestoAPagar, mesesRestantes, retencionMensual }

ResultadoLiquidacion    { idEmpleado, fechaSalida, causal, aniosServicio,
                          rubros: RenglonCalculado[], totalIngresos,
                          totalDescuentos, neto }

ResultadoImportacionMarcaciones { idCarga, nombreArchivo, lineasTotales, lineasOk,
                                  lineasError, lineasDuplicadas,
                                  errores: string[], fechaDesde, fechaHasta }

LineaAsientoNomina      { cuenta, nombreCuenta, descripcion, debe, haber,
                          codigoLinea, centroCosto }
```

> **`RenglonCalculado.codigoConcepto` lleva el código alterno (`CPNMALTR`), nunca la PK.**
> Fijado el 2026-08-19 tras encontrarse que dos productores del mismo DTO no coincidían: el
> motor ponía el alterno y la liquidación empezó a poner la PK. **El frontend consume los dos**,
> así que un renglón de finiquito habría mostrado un número que no corresponde a ningún concepto
> del catálogo visible. Manda el motor, que además está congelado.
>
> Es el riesgo propio de un DTO con más de un productor: no lo detecta ninguna compilación y en
> pantalla se ve como un código plausible pero equivocado. Al añadir un productor nuevo de
> cualquiera de estos siete DTO, contrastarlo contra el existente.

> **Convención de nombres de servicio, observada tres veces y ya patrón:** cuando el nombre
> natural del servicio de proceso ya lo ocupa el CRUD generado de esa tabla, **el de proceso
> lleva el verbo delante**. Así nacieron `GeneracionRolPagoService` (junto a `RolPagoService`),
> `GeneracionOrdenPagoService` (junto a `OrdenPagoNominaService`) y `CalculoUtilidadesService`
> (junto a `UtilidadService`), además de `AcreditacionVacacionesService` y
> `ProvisionActuarialService`. No se fusiona la lógica de negocio dentro del CRUD.

---

## 7. Fases

El orden responde a una restricción concreta: **la asistencia va después del motor de nómina**,
porque en modo histórico los días trabajados y las horas extra se cargan a mano como novedades
(`RHH.NVNM`). Esperar al biométrico bloquearía la carga de enero–julio 2026 sin necesidad.

| Fase | Contenido | Entregable | Esfuerzo |
|---|---|---|---|
| **0** | Saneamiento de los 7 defectos verificados, limpieza de `rep/rrhh` y rutas muertas | El CRUD deja de devolver basura en `selectByCriteria` | 1 |
| **1** | Scripts 01–09 + entidades y capas de las tablas de parametría | Pantallas de parametría; SBU y tabla de IR cargados | 3 |
| **2** | Maestro de personal ampliado | Ficha completa del colaborador | 3 |
| **3** | Migración de apertura al 31-dic-2025 | Corte cargado y verificable | 2 |
| **4** | Motor de cálculo, IR, beneficios, vacaciones, provisiones | **Enero 2026 cuadrado contra el rol real** | 8 |
| **5** | Rol de pago y reportes internos | **Carga ene–jul 2026 terminada** | 3 |
| **6** | Contabilización y pago | **Agosto 2026 en producción** | 5 |
| **7** | Asistencia e importador del biométrico | Marcaciones alimentando la nómina | 5 |
| **8** | Liquidación y acta de finiquito | Finiquitos calculados y contabilizados | 4 |
| **9** | Salidas oficiales: RDEP, planilla IESS, formularios MDT, utilidades | Cumplimiento regulatorio | 5 |

Ruta crítica hacia producción: 0 → 1 → 2 → 3 → 4 → 5 → 6.

El frontend avanza en paralelo desde la fase 1, siguiendo su propio documento.

---

## 8. Criterio de aceptación

No hay framework de pruebas en el repositorio (`src/test` está vacío), así que la verificación
es funcional y por comparación contra datos reales:

1. **La prueba fuerte:** recalcular los roles de enero a julio de 2026 y cuadrarlos contra los
   que ASOPREP efectivamente pagó. El propio plan de carga histórica la habilita sin trabajo
   extra. Con 18–25 empleados es perfectamente abarcable a mano.
2. Cuadrar el total de aportes de cada período contra la planilla emitida por el IESS.
3. Contrastar la proyección de IR contra el formulario 107 del ejercicio anterior.
4. Verificar que `validaDebeHaber` no rechace ningún asiento y que el gasto de nómina cuadre
   contra el mayor contable.
5. Probar cada endpoint corregido en la fase 0 antes de darla por cerrada.

**Los cinco cumplen la regla 6 del §2, y no por casualidad:** los cinco comparan contra algo que
**no sale del sistema** —el rol que ASOPREP pagó, la planilla del IESS, el formulario 107, el
mayor contable—. Antes de añadir un control a esta lista, la pregunta es de dónde sale el valor
con el que se compara; si sale del propio motor, no es un control.

---

## 9. Insumos aún pendientes del cliente

| # | Insumo | Estado | Bloquea |
|---|---|---|---|
| 1 | Archivo de muestra del biométrico y marca del equipo | Se enviará después | Fase 7 |
| 2 | Período de arranque contable | **Resuelto: agosto 2026, con retroactivos** | — |
| 3 | Plan de cuentas | Se enviará después; los campos ya existen | Fase 6 |
| 4 | Número de empleados | **Resuelto: entre 18 y 25** | — |
| 5 | Utilidades | **Resuelto: ASOPREP no reparte, pero la funcionalidad se construye completa** | — |
| 6 | Rol de pago real para calibrar `CPNM` | Se enviará después | Calibración de fase 4 |
| 7 | Formato de la planilla IESS: archivo de carga o reporte | Se enviará después | Fase 9 |

Mientras el punto 3 esté abierto, los períodos se crean con `PRDNMODO = 1`.

---

## 10. Regla de mantenimiento

Cualquier cambio en el motor de cálculo, en `RHH.CPNM`, en los parámetros normativos o en las
salidas oficiales **debe actualizar el documento correspondiente en el mismo cambio**, igual que
la regla ya vigente para los procesos Petro.

A medida que avancen las fases, este plan se desglosa en documentos de reglas por proceso dentro
de `docs/logica-negocio/rhh/`: `REGLAS-NOMINA.md`, `REGLAS-IESS.md`, `REGLAS-DECIMOS.md`,
`REGLAS-IMPUESTO-RENTA.md`, `REGLAS-LIQUIDACION.md`, `REGLAS-VACACIONES.md`.
