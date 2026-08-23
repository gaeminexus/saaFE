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

## D12 · El listado de finiquitos no resuelve el nombre del colaborador

**Dónde:** `Liquidación de haberes` (listado) — `/rest/lqdc/getAll`.

**Qué pasa:** el JSON trae `empleado` sin `nombre` ni `apellido` resueltos; sólo la
`identificacion` viene poblada. En pantalla la columna *Colaborador* queda inservible.

**Causa localizada (2026-08-21), confirmada por el backend:** no es que el backend no mande el
nombre — es que los campos se llaman **en plural**. `Liquidacion.empleado` es `@ManyToOne` y
`getAll` devuelve la entidad entera, así que el `Empleado` viaja completo, con `apellidos` y
`nombres`; el consumidor busca `apellido` y `nombre` en singular y obtiene `undefined undefined`.
El dato está ahí: para la cédula 1714531405, `apellidos: "BENITEZ MONTES"`,
`nombres: "GUILLERMINA NATASHA"`.

**Nada que tocar en el backend.** El arreglo es de una línea en el consumidor.

**Por qué importa:** el listado es donde se elige sobre qué finiquito actuar —aprobar, ejecutar
salida—, y esas dos acciones no se deshacen. Identificar a la persona por cédula y no por nombre
es más frágil de lo necesario, justo en la pantalla donde menos conviene.

**Arreglo esperado:** decidir si se resuelve en el backend (proyección del DTO) o en el
frontend (cruce contra `mpld`). El listado ya tiene la cédula, así que el cruce en cliente es
viable sin tocar el backend.

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

## D16 · Dos formatos de fecha distintos en el mismo módulo

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

**Arreglo esperado:** un único proveedor de fecha con locale `es-EC` para todo el módulo, y
sustituir los `input type="date"` nativos por el datepicker de Material, que es el que respeta el
locale.

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
