# El módulo RRHH como producto — qué se queda y qué se blanquea para un cliente nuevo

**Escrito el 2026-08-21.** El módulo se va a comercializar. Este documento fija, tabla por tabla,
qué es **normativa o producto** (se queda en toda instalación) y qué es **dato de ASOPREP** (se
borra al instalar para otro cliente). Verificado contra la BD local (conteo de filas por tabla) y
contra los scripts `sql/01`–`41`, que dicen quién cargó qué.

> **Criterio:** se queda todo lo que **fija la normativa ecuatoriana** (tasas, plazos, catálogos,
> conceptos de nómina, tablas de IR) y todo lo que es **estructura del producto** (DDL, rubros,
> CHECK, formatos de archivo). Se borra todo lo que **nombra a una persona, un contrato, un
> período o un valor de ASOPREP**. Cuando una tabla mezcla las dos cosas, se dice qué filas.

---

## 1. Se queda — normativa y producto

| Tabla | Qué tiene | Filas hoy | Origen | Nota |
|---|---|---:|---|---|
| `CPNM` | Conceptos de nómina (sueldo, décimos, aportes, provisiones, finiquito…) | 45 | `sql/08`, `17`, `22` | **Normativa.** Los alternos 1–68 son el vocabulario del motor. **Ojo:** las **cuentas contables** de cada concepto son del plan de cuentas de ASOPREP → ver §3 |
| `CSTR` | Causales de terminación con sus banderas (desahucio, despido, aviso de salida…) | 11 | `sql/07`, `32`, `33` | **Normativa** (Código del Trabajo). Los ALTR 1–11 mapean 1:1 al rubro 228 de causa IESS |
| `TBIR` | Tabla de impuesto a la renta por año | 19 | `sql/07` | **Normativa** (SRI). Se actualiza cada año con un script, no se borra |
| `TPGP` | Tipos de gastos personales deducibles | 6 | `sql/07` | **Normativa** (SRI) |
| `PRNM` | Parámetros de nómina por año: SBU, tasas IESS, FR, CCC, seguro TP, días, recargos, vacaciones, desahucio | 2 (2025, 2026) | `sql/07`, `16`, `41` | **Normativa**, pero la fila lleva `PJRQCDGO = 1236`. **Se conserva como plantilla y se re-apunta** a la empresa nueva (`UPDATE`), no se borra |
| `CFNM` | Configuración de nómina de la empresa (modo, cuentas, sucursal IESS, tipo empleador) | 1 | `sql/07`, `09`, `13`, `41` | **Estructura**: se conserva la fila como plantilla y se **vacían los valores del cliente** (cuentas contables, sucursal IESS, tipo de empleador) |
| `DFMR` / `FMRC` | Formato del archivo de marcaciones del biométrico | 5 / 1 | `sql/01` | **Producto** (formato de un equipo, no de un cliente) |
| `DFMB` / `FMBN` | Formato del archivo bancario de pago | 7 / 1 | `sql/14` | **Producto**, pero el banco es el de ASOPREP → se queda como **formato de ejemplo**; el cliente nuevo añade el suyo |
| `TPCE` | Tipos de contrato (con relación laboral IESS y duración máxima) | 1 | `sql/26` | **Normativa** en su forma (los tipos del Código del Trabajo), pero hoy sólo hay **una fila, cargada para ASOPREP con `PJRQCDGO = 1236`**. Se conserva y se re-apunta; el producto debería traer el catálogo completo (indefinido, eventual, ocasional, temporada, jornada parcial, emergente…) → **pendiente de semilla** |
| `DTLL` / `TRNO` | Detalle de turno y turno de trabajo | 7 / 1 | `sql/19`, `23` | La estructura es producto; **la fila `TRNO 1` es un fixture de prueba** (`19_SEED_TURNO_PRUEBA`) → **se borra** y el cliente crea sus turnos |
| `CTLG` | Catálogo genérico | 0 | — | Estructura |
| **Rubros SCP** `PRBR`/`PDTR` alternos **179–229** | Los 50 rubros del módulo: estados, tipos, modalidades, tipos de novedad IESS con plazos, códigos IESS | — | `sql/06`, `41` | **Normativa y producto.** Se quedan íntegros. El detalle `RECURSOS HUMANOS` del rubro 15 también |
| `com.saa.rubros.Rhh*` | Constantes Java con los **nombres** de lo anterior | — | código | Producto |
| Los 26 `CHECK` del esquema | `REFERENCIA-CHECKS-RHH.md` | — | DDL original + `sql/38` | Producto |
| Plantillas JasperReports `rep/rrhh/` | Rol individual, finiquito, etc. | — | código | Producto. Si alguna lleva el logo o el nombre de ASOPREP fijo, se parametriza por empresa |

---

## 2. Se blanquea — datos de ASOPREP

En orden de borrado (hijas antes que padres; las FK son `NO ACTION`, no hay cascada):

| Orden | Tabla | Qué tiene | Filas hoy |
|---:|---|---|---:|
| 1 | `CTRL`, `CTRL_PARAM` | **Andamio de calibración.** Los valores del rol y la planilla de ASOPREP para el contraste | 428 / 1 |
| 2 | `RNGL` | Renglones de nómina | 364 |
| 3 | `RLPG` | Roles de pago | 64 |
| 4 | `PVNM` | Provisiones por período | 177 |
| 5 | `ACMN` | Acumulados (incluida la apertura) | 421 |
| 6 | `DRPG`, `RDPG`, `PRTE` | Detalle de pago, órdenes de pago, partes | 0 |
| 7 | `NMNA` | Nóminas | 64 |
| 8 | `NVNM` | Novedades de nómina | 19 |
| 9 | `TMLQ`, `LQBS` | Detalle de liquidación, liquidación de beneficios | 21 / 0 |
| 10 | `LQDC` | Liquidaciones de haberes | 4 |
| 11 | `NVIS` | Novedades IESS | 4 |
| 12 | `PRDN` | Períodos de nómina | 3 |
| 13 | `SLOF` | Salidas oficiales generadas | 0 |
| 14 | `DSRC`, `CTDS` | Descuentos recurrentes, cuotas | 2 / 4 |
| 15 | `GSPR`, `CRGF`, `PYIR` | Gastos personales, cargas familiares, proyecciones de IR | 27 / 1 / 44 |
| 16 | `SLDV`, `SLAP` | Saldos de vacaciones, saldos de apertura | 22 / 57 |
| 17 | `SLCT`, `PTCN`, `RSMN`, `MRCC`, `HREX`, `CRMR`, `UTLD`, `DTUT` | Solicitudes, permisos, resumen de marcaciones, marcaciones, horas extra, cargas de marcaciones, utilidades | 0 |
| 18 | `HSTR` | Historial del empleado | 24 |
| 19 | `NXOO` | Anexos / adendas de contrato | 4 |
| 20 | `CNTE` | Contratos | 24 |
| 21 | `CBEM`, `CPXM` | Cuentas bancarias del empleado, capacitaciones | 0 |
| 22 | `MPLD` | **Empleados** | 24 |
| 23 | `CRGO`, `DPTC`, `DPRT` | Cargos, departamentos, direcciones — **la estructura orgánica de ASOPREP** | 19 / 19 / 1 |
| 24 | `TRNO 1`, `DTLL` de ese turno | Fixture de prueba | 1 / 7 |

Después del borrado: **reiniciar las secuencias** `RHH.SQ_*` de esas tablas (o dejar que sigan;
los huecos no rompen nada, pero un cliente nuevo que empiece en `MPLD 25` extraña).

**Lo que NO se toca al blanquear:** nada de la sección 1, y nada de `SCP`, `CNT` ni el resto del
ERP. El blanqueo es del esquema `RHH` y sólo de las filas de la sección 2.

---

## 3. Lo que está a medias: mezcla normativa con datos del cliente

Son las tablas donde el blanqueo **no es borrar filas sino vaciar columnas**:

| Tabla | Columna(s) del cliente | Qué hacer |
|---|---|---|
| `CPNM` | Las **cuentas contables** de cada concepto (`sql/09`) | El concepto se queda; la cuenta se pone a NULL. El cliente nuevo las mapea a su plan. **El motor debe negarse a contabilizar un concepto sin cuenta**, no saltárselo |
| `CFNM` | Cuentas puente, centro de costo, sucursal IESS, tipo de empleador, producto de pago | Vaciar; la pantalla de configuración las pide al instalar |
| `PRNM` | `PJRQCDGO` | Re-apuntar a la empresa nueva. Las tasas son nacionales |
| `TPCE` | `PJRQCDGO` | Re-apuntar, y **completar el catálogo** (hoy una sola fila) |
| `CNTE.CNTECDSC` | Código sectorial de cada contrato | Se va con el contrato (sección 2). El catálogo sectorial completo **no se carga** en el producto: tiene miles de filas y cambia cada año; cada contrato lleva el suyo |
| `SCP.PDTR` rubros 225–229 | `PDTRVLRV = '?'` | **No es del cliente: es normativa sin leer.** Se completa una vez con las credenciales de ASOPREP y queda para todos |

---

## 3 bis. Una dependencia asumida a propósito: RRHH necesita el módulo de facturación

**Decisión del 2026-08-21.** El RUC del empleador es el primer campo de todo registro del archivo
del IESS, y **no existe en el núcleo**: `SCP.PJRQ` tiene código, jerarquía, nombre, nivel, padre e
ingresado, y ninguna tabla de `SCP` lleva un RUC. Donde sí está es en `CBR.FCDR` (el facturador),
con FK a la empresa.

Se eligió que **RRHH lea de `CBR.FCDR`** en vez de guardar una copia, para tener una sola fuente.
El coste, y hay que decirlo claro: **el módulo RRHH ya no es instalable sin el de facturación.**

Si algún día hay que venderlo suelto, la salida **no** es volver a la copia: es subir el RUC a
`SCP.PJRQ`, que es su sitio natural, y que los dos módulos lean de allí.

Lo que **sí** se queda en `CFNM` porque no es de facturación: sucursal IESS (`CFNMSCIE`), tipo de
empleador (`CFNMTPEM`) y código de seguro social (`CFNMSGSC`). La sucursal del IESS no es un
establecimiento del SRI — son numeraciones de organismos distintos.

**Y lo mismo aplicará a razón social, dirección y logo** cuando toque parametrizar los `.jrxml`
(acta de finiquito, rol individual, RDEP): salen de `CBR.FCDR`, no se copian.

---

## 3 ter. Préstamos del IESS: la pieza está entera, faltan datos y un defecto

**Verificado el 2026-08-21.** `DSRC` (el acuerdo) + `CTDS` (la tabla de amortización, con **valor por cuota, capital e interés separados**) existen, el paso 12 de `calcularPeriodo` los aplica solo, y la pantalla `forms/procesos/descuentos-recurrentes` cubre **las dos mitades** — hay `camposCuota()` para la cuota y `cuota-descuento.service.ts`.

Es justo lo que un préstamo del IESS necesita: su cuota deriva mes a mes (Calderón 14,23 → 14,13 → 14,04) y una tabla por cuota lo representa exacto, sin recargar nada.

**Lo que falta no es la pantalla:**

1. **Los datos.** `DSRC` tiene 2 filas y `CTDS` 4, ninguna de préstamo. Las tablas de amortización están en `REF-03 §3` con el detalle mensual de los siete períodos.
2. **El punto 12 — y es prerrequisito, no mejora.** El motor aplica la cuota y **nunca la marca**: `CTDSESTD` se queda en PENDIENTE, `CTDSVLDS` en cero y `DSRCSLDD` no baja. Sin corregirlo, un préstamo de doce cuotas mostraría el saldo íntegro para siempre y la pantalla sería inútil.
3. **Las dos filas de Calderón y Pardo**: no son huérfanas —son sus anticipos de enero y febrero, cobrados de verdad— pero su saldo miente por el punto 12.

**Durante la calibración se siguen registrando como novedad del período**, a propósito: cambiar de mecanismo a mitad de la serie metería una variable donde comparamos contra números conocidos. **Desde agosto, los préstamos salen solos y el cliente sólo teclea anticipos.**

---

## 4. Lo que hay que construir para que el blanqueo sea un botón, no una tarde

1. **`sql/BLANQUEO_RHH.sql`** con los 24 `DELETE` del §2 en orden, los `UPDATE` del §3, y un
   `SELECT` de control al final que cuente filas en cada tabla y falle si la sección 1 cambió.
   **No se escribe hasta que julio cierre**: antes de eso, borrar en local destruiría la calibración.
2. **Semilla del catálogo `TPCE`** completo del Código del Trabajo, por empresa.
3. **Pantalla de configuración inicial** que pida lo del §3 (cuentas, sucursal IESS, tipo de
   empleador, formato bancario) y **no deje calcular** hasta que esté completo.
4. **Parametrizar por empresa** cualquier logo, nombre o RUC que hoy esté fijo en un `.jrxml`.

---

## 4 bis. Ningún código de estos documentos sirve en la base nueva

**Escrito el 2026-08-23, al cerrar la calibración de los cinco meses en producción.** Es la lección
que más cara sale y la que ningún documento decía: **la nómina de ASOPREP se replicó dos veces —en
local y en producción— y casi ningún identificador coincidió entre las dos.**

La prueba, con los `PRDNCDGO` de los cinco meses:

| | Enero | Febrero | Marzo | Abril | Mayo |
|---|---:|---:|---:|---:|---:|
| Local | 1 | 2 | **30** | — | — |
| **Producción** | **1** | **2** | **21** | **41** | **42** |

**No es una serie, no tiene lógica y no se deduce de nada.** Enero y febrero coincidieron por azar,
y ese azar es justo lo que hace peligroso el hábito: se copia un código de un guion, funciona dos
veces, y a la tercera apunta a otra cosa **sin dar error**.

### Qué no se transcribe nunca, y qué sí

| Identificador | ¿Se transcribe? | Por qué |
|---|---|---|
| `PRDNCDGO`, `LQDCCDGO`, `NVNMCDGO`, `NVISCDGO` | **NUNCA** | Surrogates por instalación. Los que aparecen en los cinco guiones son **de local** |
| `MPLDCDGO`, `CNTECDGO` | **NUNCA** | Ídem. Se llega a la persona **por cédula**, nunca por código |
| `ASNTCDGO` (base del censo) | **NUNCA** | Es una marca de agua del momento: se lee **al empezar el mes**, no se hereda |
| **`CPNMALTR`** | **SÍ** | Es **vocabulario del motor**, normativa, y viaja con el producto (§1). Los alternos 23, 24 y 25 son préstamo quirografario, hipotecario y anticipo **en toda instalación** |
| `CPNMCDGO` | **NUNCA, y es el más traicionero** | En producción, alterno **23 → código 20 · 24 → 21 · 25 → 22**. Consultar por código **no da error: devuelve otros tres conceptos**, con nombres plausibles y valores plausibles |

> **La regla, en una línea: se filtra por alterno, jamás por código.** Y lo mismo con las personas:
> **por cédula**, jamás por `MPLDCDGO`.

### Cómo se obtiene cada uno en la base nueva

| Hace falta | Dónde está |
|---|---|
| `PRDNCDGO` del mes | **Sólo en la URL** del panel de proceso —`…/procesos/periodos-nomina/42`—, o preguntándoselo a `RHH.PRDN` por año y mes. **La rejilla no lo enseña** |
| `LQDCCDGO` de un finiquito | La columna **Nº** del listado de Liquidación **sí** lo enseña. Es la única de las dos pantallas que lo hace |
| `CPNMCDGO` de un concepto | `SELECT CPNMCDGO FROM RHH.CPNM WHERE CPNMALTR = :alterno AND PJRQCDGO = :empresa`. **Nunca al revés** |
| Base de asientos del mes | `SELECT MAX(ASNTCDGO) FROM CNT.ASNT` **antes de empezar**, y el censo del cierre acotado a `> :BASE`. Un censo total **no vale**: otros módulos escriben en paralelo |
| Una persona o un contrato | Por **cédula** en los combos, que es además lo único que desempata a dos homónimos |

### Qué defectos abiertos lo hacen más difícil

Los cuatro que convierten esto de incomodidad en trampa. Fichas completas en
[`DEFECTOS-PANTALLA-REPLICA-PRODUCCION.md`](DEFECTOS-PANTALLA-REPLICA-PRODUCCION.md):

- **D21** — el `PRDNCDGO` **sólo se puede leer de la URL**. Ni la rejilla ni la cabecera del panel
  lo escriben.
- **D25** — y esa URL **no sobrevive a una recarga**: rebota al menú. Sumado a D21, **el dato existe
  y no hay forma de llegar a él dos veces**, ni de enseñárselo a nadie con un enlace.
- **D9 · D14 · D18** — los combos no acotan por colaborador, **distinguen mayúsculas** y ofrecen a
  los **cesantes**. Teclear la cédula en mayúsculas es lo único que deja un solo candidato, y hay
  que **comprobar que de verdad quedó uno** antes de elegir.
- **D24** — `LQDCESTD` vale `3` para aprobada, ejecutada y contabilizada a la vez, y el listado las
  muestra a todas como «APROBADA». **El código del finiquito se ve; su situación real, no.**

### Dónde está el detalle

**No se repite aquí.** Cada mes tiene su sección **«Lo que enseñó ejecutarlo»** al final de su
guion, con los códigos reales que salieron y de dónde salieron:
[`GUION-MES-2026-01`](GUION-MES-2026-01.md) · [`02`](GUION-MES-2026-02.md) ·
[`03`](GUION-MES-2026-03.md) · [`04`](GUION-MES-2026-04.md) · [`05`](GUION-MES-2026-05.md).

> **Y una advertencia sobre cómo leerlos:** enero a marzo van marcados como **reconstruidos** de la
> bitácora y del `ESTADO-RRHH.md`; abril y mayo, como **de primera mano**. La procedencia está
> escrita a propósito — un registro que no dice de dónde sale envejece como si fuera una fuente, y
> no lo es.

---

## 5. Lo que este ejercicio de ASOPREP le deja al producto — y no se borra

Vale la pena decirlo porque es lo que se vende:

- **Diez correcciones del motor** que ningún cliente de pruebas habría destapado
  (`ESTADO-RRHH.md`, lista de fin de calibración).
- **El instrumento de contraste** (`CONTRASTE_MES_CONTRA_ROL_REAL.sql` + `CTRL`): para un cliente
  nuevo que venga con histórico, es exactamente el mismo procedimiento — cargar su rol en `CTRL`,
  calcular, contrastar. **`CTRL` se vacía, no se elimina.**
- **Las reglas de aceptación** (dos puertas: verde en el contraste y fiel a lo ocurrido) y el
  criterio de los dos regímenes (histórico manda lo presentado; en vivo manda la normativa).
- **`NORMATIVA-IESS-NOVEDADES.md`** y **`REFERENCIA-CHECKS-RHH.md`**: documentación de producto.
- Los cinco errores reales de ASOPREP que el sistema **impide estructuralmente** (décimo cuarto
  omitiendo a una persona, dos versiones del mismo mes, cédula propagada a siete libros,
  descuento a quien ya salió, planilla declarando a quien ya salió): son el argumento comercial.
