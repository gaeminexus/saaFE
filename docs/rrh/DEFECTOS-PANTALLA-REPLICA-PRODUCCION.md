# Defectos de pantalla encontrados replicando en producción

**Abierto el 2026-08-21**, durante la réplica de enero de 2026 en producción
(`http://192.168.2.4:8080/Saa/menu`). Documento vivo: se amplía conforme aparecen.

> **Qué es y qué no.** Aquí van sólo defectos de **frontend** vistos en uso real. Los fallos de
> esquema o de motor van por su cauce, con el agente que lleva el backend y el modelo.
> Ninguno de los de aquí ha alterado ningún número de la calibración: todos se esquivaron, y
> cómo se esquivó está anotado en cada uno.
>
> La numeración continúa la de los «defectos de pantalla» del `ESTADO-RRHH.md`, que llegaba
> hasta el 8. Los defectos 7 y 8 de aquella lista se confirman aquí en producción.

> **⚠ Desde el 2026-08-23 esto es una lista de trabajo, no un archivo histórico.** Hay un agente
> corrigiendo estos defectos en paralelo a la réplica, así que **lo que se anota aquí se arregla**.
> Cambia el listón de qué entra: no sólo lo que rompe un número, también **lo que hace perder
> tiempo o invita a equivocarse** — un texto de ayuda que miente, un campo que no dice su formato,
> un combo que ofrece lo que no debería, una pantalla que obliga a un rodeo.
>
> **La disciplina no cambia:** cada entrada va **verificada en el DOM o en la base, nunca en la
> pantalla**, y **con el rodeo escrito**. El rodeo es lo que hace repetible el mes siguiente
> mientras el arreglo no llega.
>
> **Y quien replica no corrige nada**: encontrar y esquivar es este documento; arreglar es del otro
> agente. El despliegue no se toca hasta que julio esté cerrado, así que la aplicación no cambia a
> mitad de mes.

---

## D9 · El combo de Contrato no acota por colaborador

**Dónde:** `Nuevo finiquito` — `modules/rrh/forms/procesos/liquidacion/liquidacion-form.component.ts`

**Qué pasa:** el campo lleva el texto de ayuda *«Elija primero el colaborador para acotar la
lista»*, y **no acota**. Con TORRES CHAVEZ ya seleccionada, el desplegable ofrecía los contratos
de Barcenas Bermeo, Caiza Remache, Calderón Párraga y Castro Arce, entre otros.

**Por qué importa, y por qué va el primero de la lista:** se liquida a **otra persona** sin que
nada avise, y el registro que queda es internamente coherente.

> **Corregido el 2026-08-21 tras revisión del backend.** La primera redacción de este defecto
> decía que se grababa una pareja cruzada y que el backend debía validar la pertenencia. **Las
> dos cosas son falsas**, y conviene que quede escrito por qué:
>
> `/rest/lqdc/calcular` y `/rest/lqdc/simular` reciben **sólo `idContrato`**. `calculaFiniquito`
> saca la persona de `contrato.getEmpleado()` y con ella arma la liquidación. **El colaborador
> que se elige en pantalla no viaja nunca al backend**, así que no hay contra qué validar: no
> existe el dato con el que comparar.
>
> **La consecuencia no es menor, es distinta.** No puede grabarse una pareja cruzada
> —`LQDC.MPLDCDGO` es siempre el dueño del contrato—. Lo que ocurre es que **la pantalla enseña
> un nombre y el finiquito liquida a otro**, y el registro resultante es consistente consigo
> mismo. Ninguna comprobación de datos lo detecta: ni un `NOT NULL`, ni una FK, ni un bloque del
> contraste. Sólo se ve mirando **a quién se liquidó**, y para entonces la salida ya está
> ejecutada: contrato cerrado, persona en CESANTE, aviso al IESS emitido y saldos de vacaciones
> caducados, todo sobre alguien que no se iba.

**Cómo se esquivó:** tecleando la **cédula** en el combo de contrato, no el nombre. Filtra a un
único contrato y hace imposible acertar mal. **Sigue siendo obligatorio** mientras no se corrija.

**Arreglo esperado — sólo frontend.** No hay nada que arreglar en el backend. `cnte` **no expone
un `selectByEmpleado`**, así que el filtrado se hace en cliente sobre `/rest/cnte/getAll`:
quedarse con los contratos cuyo `empleado.codigo` sea el del colaborador elegido, y limpiar el
contrato seleccionado cuando el colaborador cambie.

---

## D10 · La fecha del contrato se pinta cruda

**Dónde:** el mismo combo de Contrato.

**Qué pasa:** las opciones salen como `CT-0602237265 · 2025,6,25`. Es el `LocalDate` de Java
llegando como arreglo `[2025, 6, 25]` y renderizándose sin convertir.

**Es el defecto 8 del `ESTADO-RRHH.md`**, confirmado ahora en producción.

**Arreglo esperado:** pasar por `FuncionesDatosService.convertirFechaDesdeBackend()`, que es
justo lo que `CLAUDE.md` manda usar para las tres formas en que el backend manda fechas.

---

## D11 · La vista no se refresca tras «Calcular y guardar»

**Dónde:** `Nuevo finiquito`, botón `Calcular y guardar`.

**Qué pasa:** el finiquito se persiste y la ruta cambia a `/liquidacion/1`, pero la pantalla
sigue mostrando la vista de *Nuevo finiquito*, con la cabecera en «Sin calcular» y el pie
diciendo *«Simulación: todavía no se ha guardado nada»* — que es exactamente lo contrario de lo
que acaba de ocurrir.

**Por qué importa:** invita a pulsar otra vez. En este caso `calculaFiniquito` reescribe en
sitio y no duplicaría, pero el usuario no tiene forma de saberlo desde la pantalla.

**Es el defecto 7 del `ESTADO-RRHH.md`**, confirmado ahora en producción.

**Cómo se esquivó:** verificando contra la base por REST (`/rest/lqdc/getAll`) en vez de contra
la pantalla. Es la regla general de esta réplica.

---

## D12 · ✅ NO SE REPRODUCE — el listado de finiquitos sí resuelve el nombre

**⛔ No arreglar nada de esta ficha sin leer esta cabecera. Reverificado el 2026-08-23 en
producción, a petición del corrector, que fue a arreglarlo y encontró que la causa descrita no
existe.**

**Lo que se observa hoy, y son dos observaciones independientes:**

1. **El JSON trae el nombre.** `/rest/lqdc/getAll` —capturado crudo, 22 301 bytes, cuatro
   finiquitos— devuelve `empleado` completo en los cuatro, con `apellidos` y `nombres` poblados:

   ```
   22 | 1716501778 | CEVALLOS ALEMAN | EDGAR GIOVANNY | estado 3 | 384.05
    1 | 0602237265 | TORRES CHAVEZ   | ELIZABETH MARIA| estado 3 | 7556.41
    2 | 1714531405 | BENITEZ MONTES  | GUILLERMINA NATASHA | estado 3 | 493.64
   21 | 1720245735 | CASTRO ARCE     | LESLY MARICELA | estado 3 | 384.05
   ```

2. **La pantalla los pinta.** El listado enseña `CEVALLOS ALEMAN EDGAR GIOVANNY`,
   `TORRES CHAVEZ ELIZABETH MARIA`, `BENITEZ MONTES GUILLERMINA NATASHA` y
   `CASTRO ARCE LESLY MARICELA`, cada uno con su cédula. **La columna *Colaborador* no está
   inservible: está bien.**

**Y la causa que esta ficha describía no existe en el código de hoy:** `liquidacion-list.component.ts`
compone `colaborador` con **`fila.empleado?.apellidos`** y **`fila.empleado?.nombres`**, los dos en
plural, y un `grep 'apellido[^s]'` sobre `modules/rrh` no devuelve una sola línea.

**Qué hacer con esto:** **no hay nada que arreglar**. Se deja la ficha —no se borra— porque un
defecto retirado sin explicación se vuelve a abrir. Si la columna volviera a salir vacía, sería una
causa **nueva** y habría que buscarla desde cero, no desde el singular/plural.

> **La lección, que vale más que el defecto:** esta ficha describía una causa con file:línea y
> resultó no existir. **Una causa anotada envejece peor que un síntoma anotado** — el síntoma sigue
> siendo comprobable dentro de un mes; la causa puede haberse arreglado por otro camino y la ficha
> no se entera. Al anotar, el síntoma y **cómo comprobarlo** son obligatorios; la causa es una
> hipótesis con fecha.

---

## D13 · El campo de fecha pide mm/dd/yyyy  — ampliado por D16

**Dónde:** `Nuevo finiquito`, campo *Fecha de salida*. Presumiblemente en todos los campos de
fecha de la aplicación.

**Qué pasa:** el marcador de posición es `mm/dd/yyyy` y el campo acepta formato estadounidense.
Para una salida del **15 de enero** hay que teclear `01/15/2026`.

**Por qué importa:** en Ecuador la convención es dd/mm/yyyy. `15/01/2026` es una fecha válida
leída al revés en once meses del año — sólo del 13 en adelante el día es inequívoco. Una salida
del 05-01 tecleada como `05/01/2026` se guarda silenciosamente como **1 de mayo**, y el finiquito
sale con ocho meses más de antigüedad, décimos y vacaciones. No hay error, no hay aviso: sale un
número creíble y equivocado.

**Cómo se esquivó:** convirtiendo a mano cada fecha del guion antes de teclearla, y verificando
después en la base que `LQDCFCHS` trae `[2026, 1, 15]`.

**Arreglo esperado:** locale `es-EC` en el proveedor de fecha de Material.

---

## D14 · El filtro de los combos distingue mayúsculas

**Dónde:** combo *Causal de terminación*. Probablemente todos los autocompletados del módulo.

**Qué pasa:** teclear `Renuncia` **no encuentra nada**. Teclear `RENUNCIA` encuentra
*«Renuncia voluntaria · Art. 169 num. 2»*. La opción existía en los dos casos.

**Causa probable:** el filtro pasa a mayúsculas el texto de la opción pero **no el que teclea el
usuario**, del estilo `opcion.toUpperCase().includes(termino)`. Con el término en minúsculas
nunca hay coincidencia.

**Por qué importa:** una lista que no encuentra lo que sí tiene se lee como *«esa causal no está
parametrizada»*. El siguiente paso natural de quien replica es ir a crear una causal duplicada, o
elegir la más parecida de las que sí aparecen — y la causal decide qué rubros de ley entran en el
finiquito. Aquí separaba «Renuncia voluntaria» de «Abandono voluntario del trabajo».

**Cómo se esquivó:** tecleando en mayúsculas. Vale para todos los combos del módulo mientras no
se corrija.

**Arreglo esperado:** normalizar los dos lados del `includes`, y de paso quitar acentos.

---

## D15 · Una fecha inválida se sustituye en silencio por la de HOY

**El más peligroso de los encontrados hasta ahora.**

**Dónde:** diálogo *Agregar Registro* de `Períodos de nómina`, campos *Fecha de inicio* y
*Fecha de fin* (datepicker de Material).

**Qué pasa:** al teclear `1/31/2026` —inválido si el campo lee dd/mm, porque no hay mes 31— el
control **no avisa, no marca el campo en rojo y no lo deja vacío**: lo rellena con **la fecha de
hoy**. En la corrida quedó `21/08/2026`.

**Por qué es el peor:** el período se habría creado del **1 de enero al 21 de agosto** y el
formulario se veía perfectamente relleno.

**Nada aguas abajo lo habría frenado. Verificado en fuente el 2026-08-21:**
`PeriodoNominaServiceImpl.saveSingle` es **un paso directo al DAO, sin una sola validación** — ni
comprueba que las fechas correspondan al año y mes declarados, ni que el rango sea un mes. Con el
período del 1 de enero al 21 de agosto:

| Qué habría pasado | Consecuencia |
|---|---|
| `calculaDiasTrabajados` | **21 días a las 22 personas** |
| `selectActivosEnPeriodo` | pierde a Castro Arce y Cevallos Alemán —su salida del 06-03 no es posterior al 21-08— → **20 nóminas** |
| ventana de novedades del IESS | barre **ocho meses** |
| `ACMN` | etiquetados **2026/1** con ocho meses dentro |

**Y lo habría cazado la comprobación 2 del guion, no el líquido:** 22 filas con días ≠ 30 en vez
de las dos esperadas. Es el argumento entero de por qué el §4 se mira en ese orden.

**Cómo se detectó:** releyendo el valor del `input` desde el DOM después de teclearlo, no
mirando la pantalla. No es paranoia: es que el campo se había reescrito solo.

**Arreglo esperado:** una fecha que no parsea deja el control en estado inválido y bloquea
`Guardar`. Nunca se sustituye por un valor plausible. **La guarda en el backend va a la lista de
fin de calibración**; el motor sigue congelado.

### Regla de operación mientras tanto

**Después de crear el período de cada mes, antes de tocar nada más:**

```sql
SELECT PRDNCDGO, PRDNANOO, PRDNMSEE, PRDNFCHI, PRDNFCHF,
       CASE WHEN EXTRACT(MONTH FROM PRDNFCHI) = PRDNMSEE
             AND EXTRACT(MONTH FROM PRDNFCHF) = PRDNMSEE
             AND EXTRACT(YEAR  FROM PRDNFCHI) = PRDNANOO
             AND EXTRACT(YEAR  FROM PRDNFCHF) = PRDNANOO
            THEN 'OK' ELSE '*** RANGO FUERA DEL MES: BORRAR Y REHACER ***' END AS VEREDICTO
  FROM RHH.PRDN ORDER BY PRDNANOO, PRDNMSEE;
```

---

## D16 · Dos formatos de fecha distintos en el mismo módulo, y ninguno lo dice

**Dónde:** comparar dos pantallas de RRHH.

| Pantalla | Control | Formato |
|---|---|---|
| `Nuevo finiquito` · *Fecha de salida* | `input type="date"` nativo | **mm/dd/yyyy** |
| `Períodos de nómina` · *Fecha de inicio/fin* | datepicker de Material | **dd/mm/yyyy** |

**Qué pasa:** el 15 de enero se teclea `01/15/2026` en una pantalla y `15/01/2026` en la otra.

**Por qué importa:** sustituye D13. El problema no es sólo que el formato sea el estadounidense
—que ya está mal para Ecuador—, sino que **no es el mismo en las dos pantallas**, así que no hay
una sola regla que quien replica pueda aprender. Combinado con **D15**, teclear la convención de
la pantalla de al lado no da un error: da la fecha de hoy.

**Y ninguno de los dos campos dice cuál es el suyo** —añadido el 2026-08-23—. Los `placeholder`
son `Fecha de inicio` y `Fecha de fin`, sin patrón, sin ejemplo y sin `hint`; el icono de calendario
es idéntico en las dos pantallas. **La única forma de averiguar el formato es teclear una fecha
ambigua y ver qué pasa**, y por D15 lo que pasa es que se rellena con la de hoy en silencio.

De ahí el rodeo que usan los cinco guiones y que funcionó en abril y en mayo: **teclear primero el
día 30 o 31**, que sólo es legible en `dd/mm`; si el campo lo conserva, el formato queda demostrado
antes de teclear el día 1, que es el ambiguo.

**Arreglo esperado:** un único proveedor de fecha con locale `es-EC` para todo el módulo, y
sustituir los `input type="date"` nativos por el datepicker de Material, que es el que respeta el
locale. **Y un `hint` con el patrón bajo cada campo de fecha**: vuelve innecesario el rodeo del día
30, que hoy es la única defensa que hay.

---

## D17 · El combo de Período no se llena hasta que se re-elige el ejercicio

**Dónde:** `Novedades del período`. Cabecera con *Ejercicio* y *Período*.

**Qué pasa:** la pantalla abre con *Ejercicio* ya en `2026`, y el desplegable de *Período* sale
**vacío** aunque el período exista. Sólo se puebla al **volver a elegir 2026**, el mismo valor que
ya estaba puesto. La lista se carga en el evento de cambio del ejercicio, y con el valor
preseleccionado ese evento no se dispara nunca.

**Por qué importa:** la pantalla queda inservible y el mensaje que muestra —*«Seleccione un
período para cargar o revisar sus novedades»*— apunta a un desplegable vacío. Se lee como *«el
período no está creado»*, y quien replica se va a crearlo otra vez. Con `PRDN` ya creado, un
segundo período del mismo mes es exactamente el tipo de dato duplicado que después nadie
distingue.


**⚠ No se reproduce siempre —comprobado el 2026-08-23—.** Al registrar las novedades de **abril**,
recién creado el período 4/2026 —y otra vez en **mayo**, con el 5/2026—, el desplegable **trajo todos los períodos sin necesidad de
re-elegir el ejercicio**. En enero sí hizo falta. **Quien vaya a arreglarlo, que no lo dé por no
reproducible al primer intento**: el rodeo —volver a elegir el año— sigue en los guiones justo por
esto, y un combo vacío se lee como que el período no existe, que es la conclusión equivocada y cara.
**Cómo se esquivó:** abriendo el combo de ejercicio y volviendo a pulsar `2026`.

**Arreglo esperado:** cargar la lista de períodos también en la inicialización, no sólo en el
`change`.

---

## D18 · El combo de colaborador de Novedades ofrece a los CESANTES

**Dónde:** `Novedades del período`, diálogo *Agregar Registro*, campo *Colaborador*.

**Qué pasa:** al registrar las novedades de **febrero**, la lista ofrecía las **24 personas**,
incluidas **Torres Chávez** y **Benítez Montes**, que causaron baja el 15 y el 16 de **enero** y
están en `MPLD` estado 4 CESANTE con el contrato `CERRADO`. Se puede registrar una novedad de
febrero a alguien que ya no está en la empresa.

**Gravedad — confirmada por el backend el 2026-08-21, y es baja.** `calcularPeriodo` pregunta
`selectAprobadas` **una vez por cada contrato que procesa**, así que a quien no está en el
período **no se le pregunta nunca**. La novedad quedaría huérfana y no se leería jamás: **no
puede alterar ningún número**. Es suciedad de datos, no un error de cálculo.

**Arreglo esperado:** filtrar por contrato vigente en el rango del período. **Va a la lista de
fin de calibración como guarda, no como corrección urgente.**

---

## D19 · La rejilla de Novedades no puede confirmar que una novedad va a entrar

**Prioridad: detrás de D22.** Corregido el 2026-08-23 — la primera versión de esta ficha lo
presentaba como riesgo vivo y no lo es.

**Dónde:** `Novedades del período`, listado.

**Qué pasa:** las columnas son `ACCIONES · COLABORADOR · CONCEPTO · CANTIDAD · VALOR · DESCRIPCIÓN
· APROBADA` —leídas del texto de la página el 2026-08-23 con las diez de abril cargadas—.
**`NVNMESTD` no está**, y el motor exige **las dos** condiciones: `aprobada = 'S'` **y**
`estado = 1` (`NovedadNominaDaoServiceImpl:58-59`).

**Pero el riesgo de nacer invisible por el estado ya está tapado en el origen**, y lo tapó el
arreglo del defecto 6: `novedades-nomina.component.ts` arma el registro con
`estado: datos.estado ?? ESTADO_ACTIVO`, así que **toda novedad creada desde esta pantalla nace con
estado 1**. Verificado en fuente.

**Lo que queda, que es un hueco de verificación y no un riesgo:**

- **La rejilla no puede confirmar lo que el arreglo previene.** Quien comprueba tiene que salir de
  la pantalla y preguntárselo a la base, aunque el dato esté bien.
- **Y no cubre filas de otra procedencia**: una novedad cargada por script o migrada no pasó por ese
  `??`, y en la rejilla se ve igual que las demás.

**Cómo se esquiva:** con la consulta de `NVNMAPRB`+`NVNMESTD` contra la base antes de calcular, que
está en todos los guiones. `/rest/nvnm/getAll` **sí** expone `estado`.

**Arreglo esperado:** una columna de estado, o —mejor— un distintivo en la fila que responda la
pregunta que el usuario tiene de verdad: «¿esta novedad va a entrar al cálculo?». Sigue mereciendo
pintarse; lo que cambia es que **no hay nada ardiendo detrás**.

---

## D20 · El diálogo de períodos no dice a qué ejercicio va el período

**Dónde:** `Períodos de nómina` → *Agregar Registro*.

**Qué pasa:** el diálogo tiene **seis campos** —`Mes (1 a 12)`, fecha de inicio, fecha de fin, tipo,
modo y observaciones— y **ninguno es el año**. Verificado leyendo los `input` del diálogo el
2026-08-23. El año sale del desplegable **`Ejercicio`** de la cabecera de la pantalla, **fuera del
diálogo y tapado por él** mientras se teclea.

**Por qué importa:** se teclea «mes 5» sin nada delante que diga 2026, y el período nace en el
ejercicio que estuviera seleccionado.

**Ninguna cifra del mes lo delataría** —el período se calcularía igual, con sus fechas correctas
dentro de un año que no es—, **pero el control de rango del §2 sí lo caza**, y esto es lo que separa
a D20 de D19 y D22: compara `EXTRACT(YEAR FROM PRDNFCHI) = PRDNANOO` y las fechas tecleadas llevan
el año de verdad, así que un ejercicio equivocado sale como **`RANGO MALO`** en la primera consulta
después de guardar. **D19 y D22 no tienen ningún control detrás; éste sí.**

**Cómo se esquiva:** mirar el `Ejercicio` de la cabecera **antes** de abrir el diálogo, y confirmar
`PRDNANOO` en la consulta de rango, que ya lo trae. Y si sale `RANGO MALO` por esta causa, el
veredicto es el suyo: **borrar el período y rehacerlo**, no editarlo.

**Arreglo esperado:** que el diálogo muestre el ejercicio —aunque sea de sólo lectura, en el título:
*«Nuevo período de 2026»*—. El dato ya está en la pantalla; sólo falta que esté donde se teclea.

---

## D21 · El código del período sólo se puede leer de la URL

**Dónde:** `Períodos de nómina`, listado y panel de proceso.

**Qué pasa:** la rejilla enseña `MES · TIPO · ESTADO · MODO · COLAB. · NETO`, y **no el
`PRDNCDGO`**. El panel de proceso tampoco lo escribe: la cabecera dice «Período 4/2026». El único
sitio donde aparece es **la barra de direcciones** —`…/procesos/periodos-nomina/41`—, de donde se
leyó que abril era el `PRDN` 41.

**Por qué importa:** el código es lo que se necesita para **cualquier** consulta de verificación
—las de `NMNA`, `ACMN` y `NVNM` van por él— y para anotar el mes en el registro de réplica. Sin
él hay que pedirlo a quien tenga la base, o deducirlo, **y no es deducible**: en producción los
períodos son 1, 2, 21, 41, que no siguen ninguna serie.

**Cómo se esquiva:** abrir el período y leer el último segmento de la URL.

**Arreglo esperado:** una columna con el código en la rejilla, o el código en la cabecera del panel
junto al «Período 4/2026». Es una línea y ahorra una pregunta por mes.

---

## D22 · «Aprobada para el cálculo» nace en `No` y nada obliga a resolverlo

**⭐ El mejor candidato de la tanda: el arreglo es de una línea y no toca el DDL.**

**Dónde:** `Novedades del período`, diálogo *Agregar Registro*, desplegable *Aprobada para el
cálculo*.

**Qué pasa:** el control **nace con `No` puesto**, no vacío. Guardar sin tocarlo es un camino
normal, sin fricción y sin aviso: el formulario está completo y válido.

**Y el `'N'` lo pone la pantalla, no la base** —corregido el 2026-08-23; la primera versión de esta
ficha se lo atribuía al `DEFAULT` del DDL—. Está escrito a mano en la definición del control, en
`novedades-nomina.component.ts`:

```ts
{
  type: 'select',
  name: 'aprobada',
  label: 'Aprobada para el cálculo',
  value: 'N',        // ← el valor inicial del formulario, no el DEFAULT de la columna
  ...
}
```

**Por qué importa, y no es una preferencia de usabilidad:** `'N'` es exactamente el valor con el que
`selectAprobadas` descarta la novedad — la condición es `aprobada = 'S' and estado = 1`. La fila se
guarda, en la rejilla se ve igual que las demás —y por **D19** la rejilla tampoco enseña el estado—
y **el cálculo no la mira**. El mes sale con un descuento de menos y **ninguna cifra dice de quién**.
**No hay ningún control aguas abajo que lo cace**: sólo la consulta que se corre a mano antes de
calcular.

> **El arreglo NO es cambiar ningún `DEFAULT` a `'S'`**, y conviene decirlo porque es la tentación
> obvia: `'N'` es el valor correcto para una bandera de aprobación —una novedad no debe entrar al
> cálculo hasta que alguien la apruebe—. **Poner `'S'` metería novedades sin aprobar en la nómina**,
> que es peor que el problema. Lo que falla no es el valor: es que **nada obliga a resolverlo y nada
> avisa si se queda sin resolver**.

**Y por eso el que el `'N'` sea de la pantalla es una buena noticia:** el arreglo cabe entero en el
frontend. **Quitar el `value: 'N'` y marcar el campo como obligatorio** deja el control vacío, con
el formulario sin poder guardarse hasta que alguien responda. **No toca el DDL en absoluto**, que es
justo lo que la advertencia de arriba pedía.

**Cómo se esquiva hoy:** poniendo `Sí` a mano en cada fila y **releyendo el valor en el DOM antes de
guardar** —el desplegable no acepta el clic automatizado y hay que manejarlo con teclado, ver la
nota de operación del final—. Más la consulta de `NVNMAPRB`+`NVNMESTD` contra la base antes de
calcular. **Diez filas en abril, ocho en mayo: son diez y ocho oportunidades de que se escape una.**

**Arreglo esperado:** quitar `value: 'N'` de la definición del control y hacerlo `required`. Es la
única de las dos columnas silenciosas que se puede cerrar desde la pantalla: la otra, `NVNMESTD`, no
la ve el usuario nunca — y esa ya la tapa `estado: datos.estado ?? ESTADO_ACTIVO` en el origen.

---

## D23 · El diálogo de Agregar se abre precargado con la fila que se editó antes

**Levantado por el árbitro el 2026-08-23, y estuvo activo mientras se cargaban las novedades de
abril y mayo.** No lo encontró la réplica: lo encontró la lectura del código.

**Dónde:** cualquier pantalla montada sobre `table-basic-hijos` — Novedades del período entre
ellas.

**Qué pasa:** `table-basic-hijos` pasa **la misma instancia** de `regConfig` a los diálogos de
*Agregar* y de *Editar*, y `asignaValoresaForm` (`edit-table-dialog.component.ts:27`) **escribe
dentro de esos objetos** (`val.value`, `val.selected`). Después de editar una fila, el siguiente
*Agregar Registro* **abre precargado con los valores de la fila editada**, y reasignar el array no
lo deshace.

**Por qué es peor que D15 y D22, siendo de la misma familia:** allí el valor que aparece solo es
inventado —la fecha de hoy, una `'N'`—. **Aquí el valor precargado es de un registro real**:
colaborador, concepto e importe, los tres plausibles y los tres del mismo dominio. Un formulario
así **no se ve mal por ningún lado**: se ve como una fila que alguien ya empezó a rellenar.

**En abril y mayo no llegó a morder, y por una razón que no fue prudencia:** no se editó ninguna
fila. Las dieciocho novedades son altas limpias —`NVNMCDGO` 37 a 44 en mayo, consecutivos tras las
diez de abril, sin huecos—, y la única cancelación fue la de abril, que no llegó a guardarse.
**Si se hubiera corregido una sola fila desde la rejilla, la siguiente alta habría salido
precargada.**

### Regla de operación, desde ya y hasta que se publique el arreglo

**Después de cualquier *Editar*, el siguiente *Agregar* se relee entero en el DOM, campo por campo,
incluidos los que no se iban a tocar.**

```js
const d = document.querySelector('mat-dialog-container');
Array.from(d.querySelectorAll('input'))
  .map(i => i.getAttribute('placeholder') + ' = [' + i.value + ']').join('\n')
  + '\nAPROBADA = [' + d.querySelector('.mat-mdc-select-value').textContent.trim() + ']'
```

**No basta con releer los campos que se teclean, que es justo lo que este defecto explota:** el
campo precargado es el que nadie iba a mirar. Lo esperado en un *Agregar* limpio es **todo vacío**
salvo el desplegable de Aprobada, que trae su `No` (D22).

**Arreglo esperado:** que cada diálogo reciba una **copia** de `regConfig`, o que
`asignaValoresaForm` no escriba en el objeto de configuración. Mientras la instancia sea compartida,
cualquier pantalla nueva montada sobre `table-basic-hijos` nace con el defecto puesto.

---

## D24 · El listado de finiquitos llama «APROBADA» a una salida ya ejecutada

**Dónde:** `Liquidación de haberes` (listado), columna *Estado*. Observado el 2026-08-23.

**Qué pasa:** los cuatro finiquitos de producción —Torres Chávez, Benítez Montes, Castro Arce y
Cevallos Alemán— salen con estado **`APROBADA`**. Los cuatro tienen **la salida ya ejecutada**: sus
contratos están `CERRADO`, las personas en estado 4 CESANTE y sus saldos de vacaciones caducados.

**La causa no es de pintado, es que el dato no distingue:** `ejecutarSalida` **no cambia
`LQDCESTD` al terminar**, así que el `3` es a la vez «aprobada, pendiente de ejecutar» y «ejecutada».
En `LQDC` las dos situaciones son indistinguibles; sólo se separan **por los efectos**.

**Por qué importa:** el listado es donde se elige sobre qué finiquito actuar, y *Ejecutar salida* es
**la acción que no se deshace** —la propia pantalla lo dice en su cabecera—. Un listado que muestra
cuatro salidas ejecutadas como «APROBADA» **invita literalmente a ejecutarlas otra vez**. Es el peor
sitio del módulo para un estado ambiguo.


**Y el daño concreto detrás del segundo clic —confirmado por el árbitro el 2026-08-23—:**
`ejecutarSalida` exige `APROBADA` **de entrada** y no mueve el estado al terminar, así que
**aprobada, ejecutada y contabilizada son el mismo `3`** — y **`generarAvisoSalida` no es
idempotente**. Un segundo clic **duplica el aviso al IESS**. No es una molestia de presentación:
es una pantalla que muestra cuatro salidas ya ejecutadas como pendientes, junto al botón que las
vuelve a ejecutar, con un efecto que sale del sistema y llega al regulador.

**Es el punto 21 de la lista de correcciones del motor, visto desde la pantalla.** Lo que lo
convierte de ambigüedad de datos en invitación a pulsar dos veces es **dónde** se ve.
**Cómo se esquiva:** no fiarse de la columna. Se comprueba por los efectos —`CNTE.CNTEESTD =
'CERRADO'`, `MPLD` en estado 4, saldos caducados—, nunca por el estado del finiquito.

**Arreglo esperado:** el arreglo de verdad es del motor —que `ejecutarSalida` selle un estado
propio, que es corrección de fin de calibración—. **Mientras tanto, y esto sí es de pantalla:** la
columna puede resolver la ambigüedad mirando el contrato, y distinguir «APROBADA» de «EJECUTADA»
sin esperar al backend. Es la misma información que hoy hay que ir a buscar a mano.

---

## D25 · Una URL profunda no sobrevive a una recarga: rebota al menú

**Dónde:** cualquier ruta interna. Observado el 2026-08-23 en
`…/procesos/periodos-nomina/42`.

**Qué pasa:** al recargar esa dirección —o abrirla directamente— la aplicación pasa por
`/Saa/login` y **aterriza en `/Saa/menu`**, no en la ruta pedida. **La sesión no se pierde**:
comprobado en el momento, `sessionStorage.logged` y `localStorage.logged` seguían en `'true'` y no
hizo falta volver a entrar. Lo que se pierde es **el destino**.

**Por qué importa, aunque parezca menor:** es la única forma de llegar a un período por su código
—el `PRDNCDGO` sólo se lee de la URL, **D21**—, así que las dos cosas se combinan: no se puede
enseñar un período a nadie con un enlace, ni volver a él tras un refresco. Cuesta cuatro clics de
menú cada vez, y en un módulo donde se navega entre Períodos, Novedades y Liquidación decenas de
veces al mes, se nota.

**Cómo se esquiva:** navegar siempre por el menú, nunca por la barra de direcciones. Y si hace
falta el código del período, leerlo de la URL **sin recargar**.

**Arreglo esperado:** que el guard devuelva a la ruta solicitada en vez de al menú —guardar la URL
de destino y restaurarla tras la comprobación de sesión—. Es el patrón estándar de *redirect
back*.

> **Ojo al diagnosticarlo:** el rebote pasa por `/Saa/login`, así que a primera vista parece un
> problema de sesión y no lo es. **La sesión está viva**; lo que falta es el retorno al destino.
> Quien lo mire buscando por qué «se cae la sesión» no va a encontrar nada.

---

## Registro de la réplica

| Fecha | Qué se hizo | Defectos que salieron |
|---|---|---|
| 2026-08-21 | Enero · LQDC 1 (Torres Chávez) calculada, 7 556,41 | D9 · D10 · D11 · D12 · D13 |
| 2026-08-21 | Enero · LQDC 2 (Benítez Montes) calculada, 493,64 | D14 |
| 2026-08-21 | Enero · salidas ejecutadas, LQDC 1 y 2, nacen las dos NVIS | — |
| 2026-08-21 | Enero · PRDN 1 creado, histórico, 01/01–31/01 | **D15** · D16 |
| 2026-08-21 | Enero · cinco novedades de préstamos IESS | D17 |
| 2026-08-21 | Enero · calculado, aprobado, contabilizado (sin asiento) y **CERRADO** en 16 476,92 | — |
| 2026-08-22 | Febrero · PRDN 2 creado (estrena el §2), ocho novedades, **calculado** en 17 525,11 | D18 |
| 2026-08-22 | Febrero · contrastado **con el período en estado 3**, aprobado, contabilizado sin asiento y **CERRADO** en 17 525,11 · diferencia cero | ninguno nuevo |
| 2026-08-22 | Febrero · el censo de asientos acotado se valida a sí mismo: entre la base **8174** y la aprobación nacieron **cinco asientos ajenos** (T-EGRESOS y CXP). Un censo total los habría leído como contabilización de la nómina | — · no es de pantalla |
| 2026-08-22 | Marzo · los dos finiquitos —**`LQDC` 21 Castro Arce y 22 Cevallos Alemán**, 384,05 cada uno— calculados, aprobados y **con la salida ejecutada ANTES de calcular el mes** · nacen las otras dos NVIS. Los cuatro finiquitos de producción son `LQDC` **1** Torres Chávez, **2** Benítez Montes, **21** y **22**, y los cuatro quedan en `LQDCESTD` **3**: `ejecutarSalida` **no cambia el estado al terminar**, así que el 3 es el estado final de una salida **ya ejecutada** y en `LQDC` no se distingue de una aprobada sin ejecutar — se distingue por los efectos (contrato `CERRADO`, empleado en 4, saldos caducados) | ninguno nuevo |
| 2026-08-22 | Marzo · PRDN 21 creado, seis novedades (todas préstamos, sin anticipos), **calculado en 17 591,12 y con 20 filas a la primera** — en local hubo que limpiar dos huérfanas con el `sql/39`; aquí lo evitó el orden | ninguno nuevo |
| 2026-08-22 | Marzo · contrastado en estado 3, aprobado, contabilizado sin asiento y **CERRADO** · diferencia cero. **Avisó al cerrar** —las dos NVIS del 06-03, en PENDIENTE— y en modo histórico el aviso deja cerrar: son la prueba de los 208,22 declarados de más | ninguno nuevo |
| 2026-08-22 | `sql/49` corrido **con marzo ya en estado 7**: Méndez Torres a 482 · jornada 1 · 40 h. Reverificado el 2026-08-23: contrato ACTIVO, una sola fila | — |
| 2026-08-23 | Abril · comprobaciones previas al §1, todas por consulta a la base: ficha de Méndez **482 · jornada 1 · 40 h**, contrato ACTIVO y una sola fila · períodos 1, 2 y 21 en estado 7 y modo 1, **abril no existe** · **base de asientos `MAX(ASNTCDGO)` = 8179** —la del §6— · `CTRL_PARAM` en 3, que no bloquea | — |
| 2026-08-23 | Abril · **`PRDN` 41** creado —`+ Nuevo` → *Agregar Registro*— con mes **4**, `01/04/2026`–`30/04/2026`, MENSUAL y modo **1 histórico sin contabilizar**; Observaciones vacío a propósito. Rango verificado en la base: **2026/4, 01-04 a 30-04, modo 1, estado 1 ABIERTO**. **D15 no mordió, y lo probó la técnica y no la suerte:** se teclea **primero la fecha de fin**, `30/04/2026`, que sólo es legible en `dd/mm` — sobrevivió al blur en `ng-valid` y la base guardó el **30 de abril**, no el 23 de agosto, así que el formato quedó demostrado antes de teclear el día 1, que es el ambiguo. Los seis campos releídos en el DOM antes de Guardar | ninguno nuevo · ver la nota del combo vacío al final |
| 2026-08-23 | Abril · **las diez novedades** registradas en `PRDN` 41, las diez con «Aprobada para el cálculo» = **Sí** y elegidas **por cédula**: quirografarios **687,05**, hipotecarios **1 015,14**, anticipos **1 300,00**. Viteri en **una sola** novedad de 420,23 con los dos NUT en la descripción. **D17 no se reprodujo**: el desplegable de período trajo los cuatro sin re-elegir el ejercicio. En la fila de Pazmiño la cédula dejó **un solo candidato** —`0909917759 - PAZMIÑO JARAMILLO`—, comprobado leyendo las opciones del overlay antes de elegir | ninguno nuevo · dos tropiezos de manejo, abajo |
| 2026-08-23 | Abril · **calculado** en `PRDN` 41: 20 colaboradores · ingresos 21 034,34 · descuentos 4 945,12 · **neto 16 089,22** · patronal 2 498,04, clavado sobre la predicción del guion | ninguno nuevo |
| 2026-08-23 | Abril · **contrastado con el período en estado 3 CALCULADO —camino canónico—, antes de aprobar**. Los cinco bloques como los fijaba el esperado: **+175,00 de Calderón y nada más**, descuadre patronal vacío. **`PERIODO_LEIDO` dijo `2026-04` en los cuatro bloques que lo traen**, primera corrida en que el mes leído se comprueba dentro de cada bloque en vez de fiarlo al preámbulo | ninguno nuevo |
| 2026-08-23 | Abril · aprobado → **contabilizar rol** → cerrado, en ese orden y sin saltos. **`contabilizarRol` pisa `PRDNOBSR`, así que va antes de `cerrarPeriodo`**: al revés, un aviso de novedades sin declarar se perdería en silencio. **Abril no avisó**, como debía —sus NVIS no existen: las de Castro y Cevallos son del 06-03, fuera de la ventana—. **No se pulsó «Contabilizar provisiones»** | ninguno nuevo |
| 2026-08-23 | Abril · **verificado en la base**: `PRDN` 41 en estado 7, los tres asientos en nulo, `PRDNOBSR` con el texto exacto de la carga histórica —`contabilizarRol` escribió y `cerrarPeriodo` no lo pisó, que es la prueba de que no hubo aviso— · `ACMN` 120 del período · seis tipos de 20 · tipo 9 ausente · aporte personal 1 942,93 · 600 días · las mismas 20 personas que en `NMNA` · **550 en el año** · nada por encima de `ASNTCDGO` 8179 | ninguno nuevo |
| 2026-08-23 | **Las 46 filas de `ACMN` sin período son 19 personas, y cuadran solas** — los **17 de la apertura** más **Torres Chávez** y **Benítez Montes**, que entraron en enero de 2026 y por eso no estaban en el corte. Castro Arce y Cevallos Alemán **sí** estaban en el corte, así que no suman. **Confirmación por una vía que no comparte origen con nada de lo que se venía mirando**: salió de propina al contar los acumulados de abril, no de un control diseñado para eso | — |
| 2026-08-23 | Mayo · **`PRDN` 42** creado, mes 5, `01/05/2026`–`31/05/2026`, MENSUAL, modo 1. **D15 no mordió** (fin primero). **Near-miss corregido antes de guardar**: el teclado sin filtrar eligió la *segunda* opción de los dos combos —`QUINCENAL` y **`PRODUCTIVO CONTABILIZA`**—; se filtró tecleando hasta dejar una sola opción y se releyó. Verificado luego por REST: `cod 42 · anio 2026 · mes 5 · [2026,5,1]–[2026,5,31] · modo 1 · tipo 1` | ninguno nuevo · ver la corrección al rodeo del teclado |
| 2026-08-23 | Mayo · **las ocho novedades** registradas en `PRDN` 42, las ocho por cédula y con Aprobada = **Sí**: quirografarios **171,25**, hipotecarios **1 015,14**, anticipos **1 869,81**. **Sin Viteri ni Robayo en quirografarios** —el arrastre de abril habría metido 420,23 y 95,48—, Calderón en **14,04** y no 14,13, y **Pazmiño Jaramillo dos veces**, hipotecario 145,29 y anticipo 500,00, las dos con la lista del overlay comprobada antes de elegir: **un solo candidato en las dos**, Moreno no llegó a aparecer | ninguno nuevo |
| 2026-08-23 | Mayo · **calculado** en `PRDN` 42: 20 colaboradores · 21 034,34 · 4 999,13 · **16 035,21** · patronal 2 498,04, las cinco iguales a la predicción. **Calderón aterriza en 0,00 exacto** (700,00 − 66,15 − 14,04 − 619,81), el filo del céntimo cayó del lado bueno | ninguno nuevo |
| 2026-08-23 | Mayo · contrastado en estado 3, **cierra en CERO** —el primero desde marzo sin diferencia conocida—. Bloque 2 con **tres** filas, ninguna de Robayo ni de Calderón; bloque 1 vacío; subtotal 1 869,81; 114 renglones. Aprobado → **contabilizar rol** → cerrado, sin saltos. **No se pulsó «Contabilizar provisiones»** | ninguno nuevo |
| 2026-08-23 | **D23 cerrado por el lado de la réplica**: en **dieciocho altas** de abril y mayo **no se editó ni una sola fila**, así que el diálogo precargado no llegó a dispararse. `NVNMCDGO` 37–44 consecutivos tras las diez de abril, sin huecos. **No mordió por casualidad, no por precaución**: si se hubiera corregido una fila desde la rejilla, la siguiente alta habría salido precargada con datos de un registro real | D23 (ajeno a la réplica) |

## Falsa alarma, anotada para que no se repita

**No hay divergencia de apellido entre local y producción.** Durante la carga de Benítez Montes
se reportó que producción decía `BENITIZ MONTES` y local `BENITEZ MONTES`. Era falso: el
`BENITIZ` venía de la **descripción en lenguaje natural que genera la herramienta de búsqueda de
elementos**, no del DOM ni del dato. Verificado después contra `/rest/mpld/getAll`:
`apellidos: "BENITEZ MONTES"`, código 46.

**Regla que deja:** los valores se leen del JSON o del texto de la página, nunca de la
descripción generada por una herramienta que interpreta la pantalla. Es la misma regla de
«verificar contra la base y no contra la pantalla», una vuelta más adentro.


---

## Corrección a D9 — la consecuencia no era la que decía, y su arreglo es sólo de frontend

**Verificado en fuente el 2026-08-21.** `/rest/lqdc/calcular` y `/rest/lqdc/simular` reciben **sólo
`idContrato`** (`LiquidacionRest:147,167`); `calculaFiniquito` saca la persona de
`contrato.getEmpleado()` y con ella arma la liquidación (`LiquidacionHaberesServiceImpl:576`). **El
colaborador que se elige en pantalla nunca viaja al backend.**

Tres consecuencias, y son distintas de las que decía la primera versión de este defecto:

- **No se puede grabar una pareja cruzada.** `LQDC.MPLDCDGO` es siempre el dueño del contrato.
- **La validación de pertenencia que se le pedía al backend no es implementable**: no hay contra
  qué validarla, porque el empleado elegido no se transmite.
- **El fallo real es otro, y no es menor:** la pantalla enseña un nombre y el finiquito liquida al
  dueño del contrato, y **el registro queda internamente coherente**. Ninguna comprobación de datos
  lo detecta; sólo mirar a quién se liquidó. Sigue siendo el más grave de la serie.

**El arreglo es sólo de frontend**: no existe endpoint `selectByEmpleado` en `cnte`, así que se
filtra en cliente sobre `/rest/cnte/getAll`. Que el endpoint acepte además `idEmpleado` y rechace
el desajuste es el **punto 19** de la lista de correcciones del motor.

**El rodeo sigue vigente y sigue siendo obligatorio:** teclear la cédula en el combo de contrato.

---

## No es defecto, es regla: un combo que no prende se queda en su valor por defecto

**2026-08-23, replicando abril. Dos episodios, misma lección.** Al crear el período, dos clics
sobre las opciones de los autocompletes —*Tipo de período* y *Modo*— **no prendieron**: el panel se
cerró y el campo se quedó con su **placeholder gris**, que a ojo se lee como un valor puesto. Al
registrar las novedades, el `mat-select` de ***Aprobada para el cálculo*** no aceptó **ningún** clic
automatizado —ni por coordenada ni por referencia—: el panel se cerraba y el valor se quedaba en el
**`No`** de arranque.

**No se numera como defecto, y la razón es verificable:** en esas mismas filas los otros dos
combos —*Colaborador* y *Concepto*, que son autocompletes— aceptaron la selección por referencia y
por teclado. Sólo falla el `mat-select`, y sólo ante el clic automatizado. **Es un artefacto del
utillaje, no del sistema**, y una bitácora que mezcla las dos cosas deja de servirle a quien
replica.

### El rodeo, que sí es obligatorio

**Los `mat-select` se manejan con teclado**: abrir, `Up`/`Down` hasta la opción y `Enter`. Por esa
vía entra siempre. Los autocompletes admiten además la referencia de elemento.

**Y los refs del diálogo se leen en cada fila, nunca se suponen correlativos.** En la quinta
novedad se dieron por consecutivos —como lo habían sido en las cuatro anteriores— y no lo eran: el
clic cayó fuera del campo de *Valor* y **el importe `490.00` se escribió dentro del campo de
concepto**, que quedó en `Prestamo hipotec490.00ario IESS - 24`. Se canceló el diálogo y se rehízo
la fila. **Un importe incrustado en un nombre de concepto es barato de descartar el mismo día e
imposible de descubrir tres meses después.**

### La comprobación que caza las dos cosas

```js
const d = document.querySelector('mat-dialog-container');
Array.from(d.querySelectorAll('input'))
  .map(i => i.getAttribute('placeholder') + ' = [' + i.value + ']').join('\n')
  + '\nAPROBADA = [' + d.querySelector('.mat-mdc-select-value').textContent.trim() + ']'
```

Se corre **antes de pulsar Guardar, en todas y cada una de las filas**. Un `[]` donde debería haber
texto es un campo vacío por mucho que la pantalla enseñe la palabra en gris; y el colaborador tiene
que traer el **guion separador**, porque sin él no se eligió de la lista.

### Por qué esto es la familia de D15 y no su contrario

**El valor por defecto no es un valor inocuo.** `NVNMAPRB` lleva `DEFAULT 'N'` en el DDL del
`sql/03`, y **`'N'` es exactamente el valor con el que `selectAprobadas` descarta la novedad sin un
solo aviso** — la condición es `aprobada = 'S' and estado = 1`. Una fila que se guarda con el
desplegable sin tocar **no entra en el cálculo, no da error y en la rejilla se ve como cualquier
otra**.

Así que es **la misma forma que
[D15](#d15--una-fecha-inválida-se-sustituye-en-silencio-por-la-de-hoy)**, no su contrario: allí el
control se rellena solo con la fecha de hoy, aquí se queda con una `'N'` que mata la fila entera, y
en los dos casos **el formulario se ve completo y correcto**. Lo que salvó las diez novedades no fue
que el default fuera inofensivo: fue **releer el DOM** y que esta verificación exista.

> **Y por eso la verificación de aprobada + estado va contra la base antes de calcular**, con
> `NVNMESTD` nulo como el otro sospechoso —el `DEFAULT 1` de columna no se dispara porque JPA manda
> el nulo explícito—. Dos caminos distintos, el mismo final: **la novedad existe y el motor no la
> mira.**

### Corrección al rodeo del teclado — 2026-08-23, creando el período de mayo

**El teclado no elige «la opción», elige «la siguiente».** En Novedades funcionó porque la cédula
o el nombre habían dejado **un solo candidato** en la lista. En el diálogo de períodos, los combos
de *Tipo de período* y *Modo* se abren **sin filtrar y con la primera opción ya activa**, así que
`Down` + `Enter` selecciona **la segunda**.

Resultado en mayo, leído del DOM antes de guardar:

```
Tipo de período = [QUINCENAL]                    ← debía ser MENSUAL
Modo            = [PRODUCTIVO CONTABILIZA]       ← debía ser HISTORICO SIN CONTABILIZAR
```

**Y ese modo es el peor de los dos errores posibles**, porque no lo delata ninguna cifra:
`calcularPeriodo` no lee el modo, así que el mes habría salido con los mismos veinte netos y el
daño habría aparecido en `contabilizarRol` o en el cierre, lejos de la causa.

**La regla, corregida:**

1. **Teclear siempre para filtrar** hasta que quede **una sola** opción — y comprobarlo:
   ```js
   Array.from(document.querySelectorAll('.cdk-overlay-container mat-option')).map(o => o.textContent.trim())
   ```
   Un array de un elemento es la condición para pulsar `Down` + `Enter`. Con dos o más, se filtra
   más.
2. **Releer el `value` después**, que es lo que cazó esto.

> **Lo que esto enseña de las dos comprobaciones:** el rodeo del teclado **no es la comprobación**,
> es sólo la vía de entrada, y una vía de entrada puede fallar de formas nuevas en cada pantalla.
> **La comprobación es releer el DOM**, y es la única que ha cazado las tres cosas distintas de este
> mes: el combo que no prende, el importe escrito en el campo equivocado y la opción de al lado.

#### Y el que se salvó sin analizar era el peor: `PRDNTPNM`

**Añadido el 2026-08-23, levantado por el árbitro.** De los dos combos mal elegidos se analizó el
modo y se dio por menor el tipo. Al revés:

**Nadie lee `PRDNTPNM`.** `getTipoPeriodo()` **no tiene un solo llamador** — comprobado con `grep`
sobre `saaBE/src`: la columna aparece en el `@Column` de `PeriodoNomina` y en su getter, y en
ningún sitio más.

| Campo mal elegido | Cuándo se nota | Quién lo caza |
|---|---|---|
| **Rango** de fechas | al calcular | los días ≠ 30 de la comprobación 2 |
| **Modo** | en `contabilizarRol` o al cerrar | revienta, o emite asiento donde no debía |
| **Tipo (`PRDNTPNM`)** | **nunca** | **nadie** |

Un `QUINCENAL` no habría movido una sola cifra ni habría mordido al cerrar: se habría quedado mal
**para siempre** en el registro histórico del cliente, y ningún control lo habría visto. **Que no
rompa nada es exactamente lo que lo hace el peor de los tres.**

**No es un defecto nuevo: es la forma del catálogo otra vez** —un campo que nadie interroga, como
`CPNMROLM` antes de que el cotejo lo mirara—. El control de rango de los cinco guiones lleva ya
`PRDNTPNM` **con veredicto propio**: de tres veredictos a cuatro.

> **La regla que deja, y aplica a cualquier diálogo:** al releer el DOM antes de guardar, **un campo
> vale por lo que costaría descubrirlo mal, no por lo que rompe hoy**. Los que no rompen nada son
> los que hay que mirar con más cuidado, porque son los únicos que ningún control posterior va a
> corregir.
