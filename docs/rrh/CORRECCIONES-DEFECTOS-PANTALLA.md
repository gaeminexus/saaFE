# Correcciones de los defectos de pantalla de RRHH

**Abierto el 2026-08-23.** Autor único: el agente que corrige. Es el reverso de
`DEFECTOS-PANTALLA-REPLICA-PRODUCCION.md`, que es de quien replica y **no se toca desde aquí**.

Una entrada por defecto, con lo mismo en las cuatro: **qué era en realidad** —que no siempre es lo
que decía la ficha—, **qué se cambió**, **por qué ése es el arreglo** y **cómo se comprobó**.

> **Espejado en `saaBE/docs/logica-negocio/rhh/`.** El original es éste, el de saaFE, y lo mantengo
> yo; la copia la lleva el árbitro. No edito ningún otro `.md` de `docs/rrh/`.

> **Nada de esto está desplegado.** Va en la rama `correccion/defectos-pantalla-rrhh`, y ahí se
> queda hasta que el árbitro dé la orden. La réplica de 2026 sigue corriendo contra el desplegado
> de siempre: los rodeos de los guiones **siguen siendo válidos y obligatorios** mientras no se
> publique.

## Cómo se comprobó, en general

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **salida 0** |
| `npx ng build --configuration development` | **completa** (sólo avisos de `sass` de `cxp`, ajenos) |
| `campo-formulario.component.spec.ts` | **7 de 7** · D9, D10, D14, D15, D16 |
| `date.component.spec.ts` | **3 de 3** · D15 |
| `table-basic-hijos.regconfig.spec.ts` | **4 de 4** · D23 |
| `novedades-nomina.component.spec.ts` | **12 de 12** · D17, D18, D19, D22 |
| `periodos-nomina.component.spec.ts` | **6 de 6** · D15, D20, D21 |
| `liquidacion-form.component.spec.ts` | **10 de 10** · D9, D11, D24 |
| `liquidacion-list.component.spec.ts` | **8 de 8** · D24 |
| **Total propio** | **50 de 50** |

**Todo defecto corregido tiene un test que lo cubre**, salvo la mitad de D14 que ya estaba bien.
D12 no lleva ninguno porque **no hay defecto**: se cerró comprobando que no se reproduce.

**La suite completa está rota de antes y sigue igual: 284 fallos de 309** contando sólo lo ajeno.
282 son el mismo `NG0201: No provider found for HttpClient` de los `*.service.spec.ts` generados
por el CLI, que nunca declararon proveedor de HTTP; los otros dos son de
`MayorizacionProcesoComponent`, del módulo `cnt`. **Ninguno de los archivos tocados aquí está entre
ellos.** No se ha intentado arreglar el resto: no es de este encargo.

---

## D15 · La fecha inválida que se sustituía por la de HOY

**Qué era en realidad — confirmado en fuente, y es exactamente lo que decía la ficha.**
`DateComponent.onFechaPickerChange` abría con `const d = date || new Date()`.

La cadena completa, que importa porque explica por qué no se marcaba nada en rojo:

1. `EsDateAdapter.parse` (`shared/providers/material.providers.ts`) devuelve **`null`** para un
   texto que no puede leer — `1/31/2026` en `dd/MM` no tiene mes 31—. Es deliberado: así Material
   no enseña `matDatepickerParse` mientras se teclea a medias.
2. Material propaga ese `null`: en el evento `change` del `input` —que se dispara **antes** del
   `blur`— `_onChange()` emite `dateChange` con el valor nulo.
3. `onFechaPickerChange(null)` lo sustituía por `new Date()` y lo escribía en el control.
4. `setValue` dispara `writeValue` del `MatDatepickerInput`, que hace
   `_lastValueValid = true` y reformatea el `input`. **El control queda válido, con la fecha de
   hoy y con el campo repintado.** Ni error, ni rojo, ni hueco.

**Qué se cambió — dos sitios.**

`shared/.../dynamic-form/components/date/date.component.ts`, guarda de una línea:

```ts
if (!(date instanceof Date) || isNaN(date.getTime())) return;
```

`modules/rrh/.../periodo-nomina/periodos-nomina.component.ts`: `fechaInicio` y `fechaFin` pasan a
llevar `Validators.required`, y el patrón va en la etiqueta (`Fecha de inicio (dd/mm/aaaa)`).

**Por qué ése es el arreglo, y por qué hacen falta los dos.** La guarda sola quita el veneno —ya
nunca se inventa una fecha— pero deja un resto: como el adaptador devuelve `null` y no una fecha
inválida, un texto ilegible es **indistinguible de un campo vacío**, y esos dos campos no eran
obligatorios. Sin el `required`, la fecha mal tecleada viajaría como nulo. Con los dos, el
formulario se queda inválido y `Guardar` no pasa.

**Y una tercera, en el mismo movimiento:** `AddTableDialogComponent.grabar` y su gemelo de edición
hacían `if (this.form.control.valid) { ... }` **sin `else`**. Sobre un formulario inválido el botón
no hacía absolutamente nada y no marcaba ningún campo. Se les añade una línea:
`this.form.validateAllFormFields(this.form.control)`. Sin ella, «bloquea Guardar» es
indistinguible de «el botón está roto».

**Cómo se comprobó.** `date.component.spec.ts`, ejecutado: `onFechaPickerChange(null)` y
`onFechaPickerChange(new Date(NaN))` dejan el control en `null`; una fecha buena sí entra. Y en
`campo-formulario.component.spec.ts`, tecleando `1/31/2026` en el `input` real y disparando
`input`/`change`/`blur`: control en `null`, error `fechaIlegible`, formulario inválido.

> **Efecto sobre los guiones — hay que actualizarlos.** El rodeo de
> `GUION-MES-2026-0X.md` de **teclear primero la fecha de fin (`30/04/2026`) para demostrar el
> formato antes de teclear el día 1** deja de ser necesario cuando esto se publique: el campo dice
> ahora su patrón en la etiqueta y un texto ilegible se queda vacío y en rojo en vez de rellenarse
> con la fecha de hoy. **Mientras no se publique, el rodeo sigue siendo obligatorio.**
>
> **El guion no se actualiza todavía**, y no es pereza: ver «los dos cambios de guion» al final.

---

## D9 · El combo de Contrato que no acotaba por colaborador

**Qué era en realidad — la ficha acertaba en el síntoma y no podía saber la causa.** El código de
`liquidacion-form.component.ts` **sí** acotaba: al cambiar el colaborador reemplazaba la
`coleccion` del campo `contrato`. Lo que fallaba estaba un piso más abajo, en
`campo-formulario.component.ts`:

```ts
@Input({ required: true }) campo!: CampoFormulario;   // propiedad normal
readonly sugerencias = computed(() => { ... this.campo?.coleccion ... });
```

**Un `computed` sólo se recalcula cuando cambia una señal que él lee**, y `campo` no era una señal.
Cambiar la colección desde el padre no invalidaba nada: el desplegable seguía sirviendo la lista
completa que tenía cacheada. Sólo se refrescaba **de rebote**, al teclear, porque teclear sí toca
la señal `busqueda` — que es justamente por qué el rodeo de **teclear la cédula** funcionaba y por
qué abrir el desplegable sin teclear enseñaba a todo el mundo.

**Qué se cambió.** `campo` entra por un `signal` con `set`/`get`, así que `sugerencias` depende
ahora de él de verdad.

**Y una segunda red, en `liquidacion-form.component.ts`.** Antes de simular o calcular se comprueba
que `contrato.empleado.codigo` sea el del colaborador elegido, y si no, se corta con un mensaje que
dice de quién es el contrato. **Acotar la lista lo hace difícil; esto lo hace imposible.** Es
barato y cubre el caso que la ficha describe como el peor de la serie: la pantalla enseñando un
nombre y el finiquito liquidando al dueño del contrato, con el registro coherente consigo mismo.

**Por qué ése es el arreglo y no otro.** Como dejó escrito la corrección a D9 del 2026-08-21, el
backend no puede validar la pertenencia: `/rest/lqdc/calcular` y `/rest/lqdc/simular` reciben
**sólo `idContrato`**, y el colaborador de pantalla no viaja. Verificado otra vez aquí en
`LiquidacionRest.java`. Todo lo que se puede hacer se hace en el cliente.

**Cómo se comprobó.** Dos niveles, los dos ejecutados.

En `campo-formulario`: se monta el combo con dos contratos, se sustituye el `campo` por uno con la
colección acotada a uno, y **sin teclear nada** `sugerencias()` pasa de 2 a 1 y el que queda es el
correcto. Antes del cambio ese test da 2.

En `liquidacion-form`, sobre la pantalla entera y con dos personas —Torres Chávez y Castro Arce—
que tienen un contrato cada una: elegir a Torres deja la lista en `CT-1701020304` y sólo ése;
elegir colaborador limpia el contrato que hubiera puesto; y con el contrato de Castro puesto a
nombre de Torres, **ni `calcular` ni `simular` llegan a llamarse** y el aviso nombra a CASTRO ARCE.
El último caso comprueba el camino bueno: con su propio contrato, `calcular` se llama con
`(2, '2026-01-15', 3, null)` — que de paso verifica el contrato de datos de D16, la fecha viajando
como cadena `yyyy-MM-dd`.

---

## D18 · El combo de colaborador ofrecía a los CESANTES

**Qué era en realidad.** Tal cual lo describe la ficha: `collections: this.empleados`, la lista
entera del `getAll`, sin relación con el período elegido.

**Qué se cambió.** `novedades-nomina.component.ts` carga también los contratos y filtra la lista
con **el mismo criterio que usa el motor** en `selectActivosEnPeriodo`, incluida su asimetría:

- contrato empezado **antes de que acabe** el período y no vencido **antes de que empiece**;
- **con** fecha de terminación → se mira **sólo la fecha**, y con `> hasta`, porque el mes de la
  salida no va por nómina, lo paga el finiquito;
- **sin** fecha de terminación → se mira el estado del empleado (`MPLDESTD` 4 = CESANTE).

Si todavía no han llegado los contratos, o si el filtro dejara la lista vacía, se ofrece la lista
completa: **un combo vacío se lee como «no hay nadie» y es peor que uno ancho de más.**

**Por qué copiar el criterio del motor y no inventar uno.** La pregunta que el usuario tiene
delante del combo es «¿a quién tiene sentido registrarle una novedad de este mes?», y la única
respuesta correcta es «a quien el cálculo va a procesar». Cualquier criterio propio se
desincronizaría de `ContratoEmpleadoDaoServiceImpl` en la siguiente corrección del motor.

**Cómo se comprobó.** Seis tests ejecutados sobre los datos de la réplica —febrero de 2026, con
Torres Chávez y Benítez Montes de baja el 15 y el 16 de enero—: en febrero no se ofrecen y Bravo
Caiza sí; quien se va en marzo sí aparece en febrero; un cesante **sin** fecha de terminación en el
contrato queda fuera siempre, que es la red de seguridad; y con los contratos vacíos se ofrece la
lista entera en vez de ninguna.

> **Y el test corrigió al arreglo, o más bien a lo que yo esperaba de él.** Escribí primero un caso
> que daba por hecho que Torres seguía ofreciéndose **en enero**, el mes de su salida. Falla, y
> tiene que fallar: `selectActivosEnPeriodo` compara con `> :hasta`, no con `>= :desde`, porque
> **el mes de la salida no va por nómina, lo paga el finiquito**. `ESTADO-RRHH.md` ya lo tenía
> verificado contra los datos —enero sale con 22 y ellos no están—. El código estaba bien y la
> expectativa mal; el caso se invirtió y quedó documentado, porque es justo el matiz que alguien
> «arreglaría» dentro de seis meses creyendo que corrige un olvido.

---

## D17 · El combo de Período vacío hasta re-elegir el ejercicio

**Qué era en realidad — la ficha describe bien el síntoma y se equivoca en el mecanismo.** Decía:
*«La lista se carga en el evento de cambio del ejercicio, y con el valor preseleccionado ese evento
no se dispara nunca»*. **Es falso**: `ngOnInit` llamaba a `cargarPeriodos()`.

Lo que sí pasaba —y explica que en abril no se reprodujera— es que esa llamada estaba **encadenada
dentro del `forkJoin` de colaboradores y conceptos**, dos `getAll` completos. Hasta que ésos no
volvían, el desplegable de *Período* estaba vacío. En enero, con la caché fría, dio tiempo a
abrirlo; en abril no. Es una carrera, no un evento que falta, y por eso «no se reproduce siempre».

**Qué se cambió.**

1. `cargarPeriodos()` sale del `forkJoin`: se pide **de entrada y por su cuenta**.
2. Nace una señal `cargandoPeriodos`, y mientras es cierta la pantalla dice *«Cargando los períodos
   de 2026…»*.
3. `registrarEjercicios(...)` también aquí, como en el listado, para que el combo de ejercicio
   aprenda su piso del dato.

**Por qué el aviso importa tanto como la carga.** El mensaje que salía con la lista vacía era
*«No hay períodos de nómina creados para 2026»* — que durante la carga **es mentira**, y es
justamente la mentira que lleva a crear un segundo período del mismo mes. El arreglo de la carrera
sin el arreglo del mensaje deja el daño intacto para la próxima vez que la red vaya lenta.

**Cómo se comprobó.** La carrera **sí se reproduce en un test**, que es lo bueno de tenerla
aislada: se dejan colgando los tres `getAll` del `forkJoin` y se emite sólo la lista de períodos.
Con eso, `periodos()` trae los dos y `cargandoPeriodos()` ya es falso — antes del cambio el
desplegable seguía vacío. Un segundo test lee el texto de la pantalla: mientras carga dice
*«Cargando los períodos»* y **no** dice *«No hay períodos de nómina creados»*; cuando la lista
llega vacía de verdad, entonces sí.

Y un tercero cubre el hueco que este arreglo podía abrir: elegir período **antes** de que lleguen
las colecciones deja el combo de colaborador vacío un instante, y la relectura de `ngOnInit` rehace
la tabla cuando el `forkJoin` aterriza. Sin ese test, adelantar los períodos habría cambiado un
defecto por otro.

---

## D11 (defecto 7) · La vista que no se refresca tras «Calcular y guardar»

**Qué era en realidad.** Exactamente lo que decía la ficha del `ESTADO-RRHH.md`. `calcular()`
navega de `/liquidacion/nuevo` a `/liquidacion/{id}` **con el mismo componente**; Angular reutiliza
la instancia, `ngOnInit` no vuelve a correr, y el id se leía una sola vez de
`route.snapshot.paramMap`.

**Qué se cambió.** El id se lee del **flujo** `route.paramMap`, con `takeUntilDestroyed`. Y al
recargar se limpian `simulacion` y `detalle`, y `cargando` vuelve a `true`.

**Por qué también hay que limpiar la simulación.** Sin eso la pantalla del finiquito ya guardado
seguiría enseñando el pie *«Simulación: todavía no se ha guardado nada»*, que es la frase concreta
que la ficha señala como lo contrario de lo que acaba de ocurrir. El id nuevo por sí solo arregla
la cabecera y deja el pie mintiendo.

**Cómo se comprobó.** Tres tests ejecutados que empujan el `paramMap` a mano, que es exactamente lo
que hace el router al navegar sobre el mismo componente: de `nuevo` a `1`, la pantalla deja de ser
«Nuevo finiquito», el título pasa a «Finiquito 1» y la cabecera abandona «Sin calcular». El
segundo simula primero, comprueba que el pie dice *«Simulación: todavía no se ha guardado nada»*, y
que tras el cambio de ruta **ya no lo dice**. El tercero navega de vuelta a `nuevo` y verifica que
el detalle se limpia.

> **La regla de la réplica sigue siendo la buena igualmente**: confirmar lo persistido por REST y
> no por esta pantalla. Un test no sustituye a ver el desplegado, y esto no está desplegado.

---

## D12 · El listado que «no resuelve el nombre del colaborador» — CERRADO: NO SE REPRODUCE

> **Resuelto el 2026-08-23.** El agente de réplica trajo el JSON crudo de `/rest/lqdc/getAll`: **el
> nombre viene en los cuatro finiquitos**. Y además abrió el listado: la pantalla los pinta
> completos, con su cédula. **No se reproduce, y no había nada que arreglar.** La ficha se queda
> marcada, no borrada — un defecto que se investigó y resultó no existir vale documentado, porque
> es lo que impide que alguien vuelva a abrirlo dentro de tres meses con el mismo síntoma mal leído.
>
> Lo que sigue es el análisis que se hizo antes de tener el JSON, y se conserva porque **es la
> razón por la que no se escribió código**: la causa que describía la ficha no estaba en el
> código, y arreglarla habría sido escribir un cruce contra `mpld` para un fallo inexistente.

**No se ha tocado nada, y ésta es la razón.** La ficha, ya corregida una vez, afirma que *«el
consumidor busca `apellido` y `nombre` en singular»* y que *«el arreglo es de una línea»*. **Las
dos cosas son falsas en el código actual.**

`liquidacion-list.component.ts:82`, sin cambios desde el commit `f019941`:

```ts
colaborador: `${fila.empleado?.apellidos ?? ''} ${fila.empleado?.nombres ?? ''}`.trim(),
```

**Plural, los dos.** Y `grep` de `apellido[^s]` sobre todo `src/app/modules/rrh` **no devuelve una
sola línea**: el singular no existe en el módulo.

Del lado del backend tampoco aparece el motivo: `Liquidacion.empleado` es un `@ManyToOne` sin
`fetch` declarado —o sea EAGER—, `LiquidacionRest.getAll` serializa la entidad entera sin
proyección ni DTO, y `Empleado` declara `apellidos` y `nombres` como `@Basic` normales, sin
`@JsonIgnore`.

**Qué hacía falta para cerrarlo, y no lo podía hacer yo.** Que quien replica capturara el JSON
crudo de `/rest/lqdc/getAll` —el JSON, no la pantalla—. Lo hizo, y trae los nombres: **el análisis
de arriba era correcto y el defecto no existe**. Se cierra sin tocar código.

**Lo que deja como lección, y es la de siempre una vuelta más adentro.** El síntoma —una columna
que se lee vacía— era real para quien lo anotó; la causa que se le atribuyó no. Entre las dos hubo
una redacción intermedia que ya se había corregido una vez. **La regla de verificar contra el JSON
y no contra la pantalla vale también para diagnosticar, no sólo para leer valores**: el primer sitio
donde había que mirar era la respuesta cruda, y es el último al que se llegó.

---

## D14 · «El filtro de los combos distingue mayúsculas» — LA MITAD NO ERA ESO

**La parte de las mayúsculas ya estaba bien, en los dos autocompletados del sistema.** La ficha
supone `opcion.toUpperCase().includes(termino)`. No es lo que hay:

- `campo-formulario.component.ts` (el combo de *Causal de terminación*, que es el de la ficha)
  comparaba `parte.toLowerCase().includes(texto)` con `texto` ya en minúsculas.
- `shared/.../autocomplete.component.ts` (los combos de los diálogos) termina en
  `result.toLowerCase().includes(nombreCampo.toLowerCase())`.

**Los dos lados en minúsculas, en los dos componentes.** Teclear `Renuncia` tenía que encontrar
`Renuncia voluntaria`, y el spec lo confirma. **No sé qué se vio el 2026-08-21** —una lista aún sin
cargar y un segundo intento con la caché caliente es la explicación que mejor encaja, pero es una
conjetura y la dejo escrita como tal.

**Qué sí se cambió, que es la otra mitad de lo que pedía la ficha:** *«y de paso quitar acentos»*.
`normalizar()` pasa los dos lados por `NFD` + retirada de diacríticos + minúsculas. Ahora `Nunez`
encuentra `Núñez` y `Penafiel` encuentra `Peñafiel`, que en un maestro de personal ecuatoriano no
es cosmético.

**Cómo se comprobó.** Spec ejecutado, tres formas del mismo término: `renuncia`, `RENUNCIA` y
`RENÚNCIA` devuelven la opción. La tercera falla antes del cambio.

---

## D13 y D16 · Dos formatos de fecha, y ninguno decía cuál era el suyo

**Qué era en realidad.** Confirmado, y con un matiz que la ficha no tenía: **el módulo ya tenía
locale `es-EC`**. `provideMaterial()` registra `EsDateAdapter` y `APP_DATE_FORMATS` con
`DD/MM/YYYY`. Lo que no lo respetaba era el otro control: `campo-formulario` pintaba las fechas con
`<input matInput type="date">`, y **un `input type="date"` nativo no atiende al locale de la
aplicación sino al del navegador** — de ahí el `mm/dd/yyyy` de *Nuevo finiquito* conviviendo con el
`dd/mm/yyyy` del diálogo de períodos. El arreglo esperado de la ficha —«locale `es-EC` en el
proveedor»— ya estaba hecho y no era suficiente.

**Qué se cambió, en `campo-formulario`:**

1. El `input type="date"` pasa a ser **datepicker de Material**, el mismo control que la otra
   pantalla. Una sola convención en todo el módulo, `dd/mm/aaaa`.
2. El `placeholder` es literalmente `dd/mm/aaaa`. **Esto es lo que vuelve innecesario el rodeo del
   día 30.**
3. Al salir del campo, un texto que no llegó a ser fecha marca el error `fechaIlegible` y enseña
   *«Fecha no válida. Use el calendario o teclee dd/mm/aaaa»*.

**Lo delicado, y por qué está hecho así.** El control del formulario **sigue guardando la cadena
`yyyy-MM-dd`**: el datepicker trabaja contra un `FormControl<Date>` propio del componente y se
sincroniza. No es adorno — `POST /rest/lqdc/calcular` declara `fechaSalida: string`, y
`salida-oficial.service.ts` deja escrito que el backend la lee con `LocalDate.parse`. Colgar el
datepicker directamente del control del formulario habría cambiado lo que viaja en cinco
pantallas: ficha del colaborador, contratos, novedades del IESS, finiquito y datos personales.
**El control cambia; el contrato de datos no.**

**Y un desfase de un día que apareció al hacerlo, y que casi entra.** Los controles de la ficha
nacen con la cadena de `aValorDeInput`, `2026-01-15`. Pasarla por
`convertirFechaDesdeBackend` termina en `new Date('2026-01-15')`, que JavaScript lee como
medianoche **UTC**: en Ecuador (UTC−5) eso es el **14** de enero. Cada visita a una ficha habría
retrocedido un día cada fecha guardada. Se resuelve con `desdeIsoLocal()`, que lee `yyyy-MM-dd`
como fecha local y va **antes** de la conversión general; y en el camino de vuelta, `aCadenaIso()`
formatea a mano en lugar de `toISOString()`, por lo mismo.

**Cómo se comprobó.** Spec ejecutado, ida y vuelta: sembrar `'2026-01-15'` deja el datepicker en el
**15** de enero de 2026 —no el 14—, y poner `new Date(2026, 0, 15)` devuelve exactamente
`'2026-01-15'` al formulario. Más los dos casos de tecleo: `1/31/2026` queda ilegible y vacío,
`31/01/2026` entra como `2026-01-31`.

> **Efecto sobre los guiones.** Cuando esto se publique, *Nuevo finiquito* deja de pedir
> `01/15/2026` y pide `15/01/2026`, como el resto. **Las fechas convertidas a mano de los guiones
> quedan al revés**, y ésa es la línea que hay que revisar en los cinco. Hasta entonces, la
> conversión a mano sigue siendo obligatoria.
>
> **El guion no se actualiza todavía**, y no es pereza: ver «los dos cambios de guion» al final.

---

## D10 (defecto 8) · La fecha cruda en el combo de contrato

**Qué era en realidad.** Como decía la ficha. `partesBuscables` hacía `String(valor)` sobre lo que
llegara, y un `LocalDate` de Java en forma de arreglo `[2025, 6, 25]` se convierte en la cadena
`2025,6,25`.

**Qué se cambió.** `aTexto()` reconoce lo que parece una fecha —un `Date`, un arreglo de números de
tres o más posiciones, o una ruta cuyo nombre contiene `fecha`— y la pasa por
`convertirFechaDesdeBackend` + `formatoFecha(..., SOLO_FECHA)`, que es lo que manda `CLAUDE.md`.

**Por qué se toca la función de búsqueda y no sólo la de la etiqueta.** Son la misma:
`etiquetaDe()` se arma con `partesBuscables()`. Formatear en un solo sitio tiene además un efecto
que la ficha no pedía y se agradece: la opción **se puede buscar por `25/06/2025`**, que es como la
lee un humano, en vez de por `2025,6,25`.

**Cómo se comprobó.** Spec ejecutado: `etiquetaDe()` sobre un contrato con `fechaInicio:
[2025, 6, 25]` devuelve `CT-0102030405 · 25/06/2025`.

---

# Los seis que aparecieron mientras se corregía

`D19` a `D22` se anotaron en la ficha **después** de recibir el encargo, que llegaba hasta D18.
Están hechos porque caen en los mismos dos archivos que ya estaban abiertos y ninguno pasa de
unas líneas. **Van marcados aparte para que el árbitro pueda separarlos si quiere.**

`D23` es distinto: salió de esta revisión, lo verificó el árbitro —y corrigió mi descripción— y
llegó **autorizado**, con tres condiciones que se cumplen: en la rama y sin desplegar, con un test
que prueba que Agregar tras Editar abre limpio, y con la comprobación previa de que nada dependa de
que la mutación persista.

`D24` salió de la misma pantalla que cerró D12, y llegó también autorizado y con el alcance ya
acotado por el árbitro: **desambiguar la columna mirando el contrato, sin esperar al backend**. El
arreglo de fondo es del motor.

## D19 · La rejilla de Novedades no enseñaba el campo que decide si la novedad entra

**Qué era.** Confirmado: las columnas eran `COLABORADOR · CONCEPTO · CANTIDAD · VALOR ·
DESCRIPCIÓN · APROBADA`, y el motor exige **las dos** condiciones, `aprobada = 'S'` **y**
`estado = 1`.

**Qué se cambió.** Columna nueva **«¿Entra al cálculo?»**, que responde la pregunta entera y dice
además cuál de las dos mitades falta: `Sí`, `No · sin aprobar` o `No · sin estado`. El aviso de
cabecera pasa a contar lo mismo: donde decía «N novedades sin aprobar» —media condición— ahora dice
«N novedades que el cálculo NO va a mirar».

**Por qué una columna de veredicto y no una de `NVNMESTD`.** Enseñar el estado crudo obliga al
usuario a saber que 1 es ACTIVO y que hay una segunda condición. La pregunta que tiene es si la
fila va a entrar; la columna la contesta.

**Cómo se comprobó.** Tres tests ejecutados con las tres filas que importan: aprobada `S` y estado
`1` → `Sí`; aprobada `N` → `No · sin aprobar`; y **aprobada `S` con estado nulo → `No · sin
estado`**, que es la que en la rejilla vieja se veía idéntica a la buena. Más que la columna existe
y que el aviso de cabecera cuenta **dos** y no una, que es lo que contaba el contador anterior.

## D20 · El diálogo de períodos no decía a qué ejercicio iba el período

**Qué se cambió.** La etiqueta del mes pasa a ser `Mes (1 a 12) del ejercicio 2026`, con el año
tomado del selector de la cabecera.

**Por qué así y no cambiando el título del diálogo.** El título («Agregar Registro») vive en
`shared/`, y la migración visual está congelada. La etiqueta del campo es de este módulo, y pone el
año **exactamente donde se teclea el mes**, que es lo que pedía la ficha.

## D21 · El código del período sólo se podía leer de la URL

**Qué se cambió.** Columna `Nº` con `PRDNCDGO` en la rejilla de períodos.

**Por qué en la rejilla y no en la cabecera del panel.** Es el sitio donde se elige, y todas las
consultas de verificación de los guiones —`NMNA`, `ACMN`, `NVNM`— van por ese código. En producción
los períodos son 1, 2, 21, 41: no hay serie que deducir.

## D22 · «Aprobada para el cálculo» nacía en `No`

**Qué se cambió.** El campo nace **sin valor** (`value: null`) y lleva `Validators.required`, con
el mensaje *«Diga si la novedad entra al cálculo: sin "Sí" el motor no la mira»*.

**Por qué no se toca el `DEFAULT 'N'` del DDL.** Porque `'N'` es el valor correcto para una bandera
de aprobación, exactamente como razona la ficha: poner `'S'` metería novedades sin aprobar en la
nómina, que es peor. Lo que faltaba no era otro valor por defecto: era que **alguien tuviera que
responder**. Con el `required` —y con la línea añadida al `else` de `grabar()`, ver D15— el
diálogo no se cierra sin respuesta.

**Cómo se comprobó.** Test ejecutado: el campo llega con `value` en nulo y con una validación
`required` entre las suyas. Verificado además que **no rompe la edición**: al editar,
`EditTableDialogComponent` escribe la cadena `'S'`/`'N'` en el control, y `Validators.required` la
da por buena.

---

---

## D23 · «Agregar Registro» tras «Editar» abría precargado con la fila editada

**Autorizado por el árbitro el 2026-08-23**, que además corrigió mi primera descripción. La había
contado como «los dos diálogos comparten el array», y es peor que eso.

**Qué es en realidad.** No es que se comparta el array: es que
`EditTableDialogComponent.asignaValoresaForm` (`edit-table-dialog.component.ts:27`) **escribe
dentro de los `FieldConfig`** —`val.value` y `val.selected`—. La mutación es sobre **los objetos**,
así que **sobrevive a cualquier reasignación del array**: `this.regConfig = this.configTable.regConfig`
en `ngOnChanges` y en `ngOnInit` no la deshace, porque los objetos son los mismos. Corregir el
array y no los objetos habría dado un arreglo que parece funcionar y no funciona.

**Qué se cambió.** `configParaDialogo()` en `table-basic-hijos.component.ts`, una copia superficial
por apertura, en `add()` y en `edit()`:

```ts
private configParaDialogo(): FieldConfig[] {
  return this.regConfig.map((campo) => ({ ...campo }));
}
```

**Superficial y no profunda a propósito.** `collections` se comparte —son las listas de los combos,
que en Novedades son la plantilla entera y los conceptos de nómina, y nadie las muta por fila— y lo
que se separa es exactamente lo que los diálogos escriben. Una copia profunda por apertura pagaría
miles de objetos por cada clic sin arreglar nada más.

**La condición previa, que era comprobar que nada dependa de que la mutación persista.** Se
verificó antes de tocar, y no depende nada:

| Quién | Qué hace | Alcance |
|---|---|---|
| `AddTableDialogComponent.asignaValoresaForm` | escribe `val.value` | su propio diálogo |
| `EditTableDialogComponent.asignaValoresaForm` | escribe `val.value`, `val.selected` | su propio diálogo |
| `AutocompleteComponent.ngOnInit` | escribe `field.collections` en los combos de rubro | su propio diálogo |
| `DynamicFormComponent.createControl` | **lee** `field.value` | mismo diálogo, después de la escritura |
| `AutocompleteComponent.ngOnInit` | **lee** `field.value`, `field.selected` | mismo diálogo, después de la escritura |
| `EditTableDialogComponent.asignaValoresaRegistro` | lee `val.name` y toma el valor de `this.form.value` | **no** lee `val.value` |

Fuera de `shared/basics/table`, `grep` de `regConfig` sobre `src/app` devuelve **sólo asignaciones**
—los módulos suministran la configuración y ninguno lee de vuelta valores mutados— y no hay ninguna
comparación por identidad de objetos `FieldConfig`. La única consecuencia observable del cambio es
que la caché de `collections` de los combos de rubro se escribe ahora en la copia; da igual, porque
`getDetallesByParent` es una lectura síncrona de caché que se rehace en cada apertura.

**Cómo se comprobó.** Cuatro tests ejecutados, y **tres de ellos fallan si se revierte el
arreglo** —comprobado revirtiéndolo y volviendo a correrlos—:

1. Se edita una fila con descripción, importe y aprobación; se abre el alta y **se deja que el
   diálogo haga lo suyo**; los tres campos llegan vacíos. Este detalle importa: `asignaValoresaForm`
   del alta **respeta** cualquier valor no nulo, así que si la contaminación llegara hasta ahí no la
   limpiaría, la tomaría por un valor por defecto.
2. Cada apertura recibe objetos propios, distintos de los del `configTable` y distintos entre sí.
3. Las `collections` siguen siendo **la misma instancia**.
4. Editar ya no contamina el `configTable` de la pantalla.

> **Sigue en la rama y sin desplegar**, como las demás. Y mientras no se publique, el rodeo vale y
> es nuevo: **releer el DOM del diálogo de Agregar también cuando se acaba de editar una fila**. Es
> un caso que la comprobación de la ficha ya cubre, pero que nadie tenía motivo para sospechar.

---

## D24 · Aprobada, ejecutada y contabilizada eran el mismo 3

**Salió de la misma pantalla que cerró D12**, y llegó autorizado con el alcance acotado: la
columna, sin esperar al backend.

**Qué es.** `ejecutarSalida` **exige `APROBADA` de entrada y no mueve el estado al terminar**, así
que en `LQDC` los tres momentos son el mismo `LQDCESTD` 3. Los cuatro finiquitos de producción —1
Torres, 2 Benítez, 21 Castro y 22 Cevallos— están los cuatro en 3 **con la salida ya ejecutada**, y
el listado los enseñaba como si les faltara ese paso.

**Por qué no es sólo cosmético.** Es la pantalla desde la que se abre el finiquito para pulsar
«Ejecutar salida», que no se deshace. Una ambigüedad de datos leída ahí se convierte en invitación
a pulsar dos veces, y hay daño detrás: **`generarAvisoSalida` no es idempotente** — un segundo clic
no reescribe la novedad del IESS, genera otra.

**Qué se cambió.** `salidaEjecutada()` en `model/estados-liquidacion.ts`, que deduce de **los
efectos** lo que el estado no dice: contrato en `CNTEESTD = 'CERRADO'` y empleado en `MPLDESTD` 4
CESANTE. Los dos son `@ManyToOne` y viajan en el mismo `getAll`, así que no hace falta una llamada
más. Con eso:

| Dónde | Antes | Ahora |
|---|---|---|
| Columna del listado | `Aprobada` | `Aprobada · salida ejecutada` / `· salida pendiente` |
| Pastilla | naranja en los tres casos | **aviso sólo si está pendiente**; ejecutada en neutro |
| Cabecera del finiquito | `Aprobada` | el mismo matiz, en la pantalla del botón |
| Confirmación de la salida | el texto de siempre | encabezado con el aviso de duplicación del IESS |

**Tres respuestas y no dos, que es la decisión de diseño que importa.** `salidaEjecutada` devuelve
`si`, `no` o **`desconocido`**, y exige **las dos señales de acuerdo**. Si falta el contrato en la
respuesta, o si el contrato está cerrado pero el colaborador sigue activo, **no se afirma nada** y
la etiqueta vuelve a ser el `Aprobada` de siempre. Decir «pendiente» por no tener el dato sería
peor que callarse: es exactamente la lectura que invita a pulsar el botón.

**Lo que NO se hizo, a propósito: quitar el botón.** Sería la protección de verdad, y por eso hay
que decir por qué no. Es una deducción a partir de efectos, no un estado; si la deducción falla, el
usuario se queda **sin manera de ejecutar una salida legítima y sin que la pantalla le explique por
qué**. Un aviso que se puede leer y seguir adelante degrada bien cuando se equivoca; un bloqueo, no.
**El arreglo de fondo —que `ejecutarSalida` deje su propio estado— es el punto 21 del motor**, y con
un estado de verdad el botón sí se puede retirar sin adivinar nada. Si el árbitro prefiere el
bloqueo antes de eso, es una línea en `accionesDisponibles` y se pone.

**Cómo se comprobó.** Diez tests ejecutados —ocho en el listado, dos en el finiquito—, y
**cuatro de ellos fallan si se revierte D24**, comprobado revirtiéndolo:

1. El listado distingue `Aprobada · salida ejecutada` de `· salida pendiente`.
2. La pastilla reserva el aviso para el que todavía tiene el paso pendiente.
3. Con el contrato ausente en la respuesta, **no se afirma nada** y la pastilla vuelve a aviso.
4. Con las dos señales contradiciéndose, tampoco.
5. `PAGADA` y `ANULADA` quedan intactas: añadirles el matiz sería ruido.
6. La confirmación lleva el aviso de duplicación sólo cuando la salida ya parece ejecutada, y
   **conserva** todo lo que decía antes.
7. La cabecera del finiquito dice lo mismo que la columna.

> Los casos 3 y 4 pasan también con D24 revertido, y es lo correcto: son guardas contra
> **afirmar de más**, no contra afirmar de menos. Lo digo para que nadie los cuente como prueba
> del arreglo.

---

# Lo que se deja sin tocar, y por qué

| Qué | Por qué |
|---|---|
| **D12** | **Cerrado el 2026-08-23: no se reproduce.** El JSON crudo trae los nombres. Ver arriba. |
| **Quitar el botón «Ejecutar salida» (D24)** | Es una deducción de efectos, no un estado: si falla, bloquea una salida legítima sin explicar por qué. El bloqueo va con el punto 21 del motor. Ver D24. |
| **La mitad de mayúsculas de D14** | Ya estaba bien en los dos componentes. Sólo se hizo la parte de los acentos. |
| **`EsDateAdapter.parse` devolviendo `null`** | **Aplazado por el árbitro a después de julio, con el despliegue.** Ver abajo. |
| **La suite de tests, 284 fallos** | Rota de antes y ajena: `NG0201` de HTTP en los specs generados por el CLI, más dos de `cnt`. |
| **Los dos cambios de guion** | **No se hacen todavía**, y la razón es de fondo: ver abajo. |

## Aplazado a después de julio · `EsDateAdapter.parse`

Devuelve `null` para un texto ilegible, y `null` es lo mismo que devuelve para un campo vacío. La
consecuencia es que **Material nunca activa su error `matDatepickerParse`** y un texto imposible es
indistinguible de no haber escrito nada. Aquí se ha rodeado por fuera —comprobando el texto crudo
al salir del campo, en `campo-formulario`— pero el arreglo de raíz es una línea:

```ts
return new Date(NaN);   // en vez de `return null`
```

Con `TouchedErrorStateMatcher` ya puesto, el error sólo aparecería **al salir del campo**, nunca
mientras se teclea a medias, que es lo que el comentario original quería evitar.

**Decisión del árbitro del 2026-08-23: no ahora.** Toca `shared/providers/` y alcanza a todos los
módulos, no sólo a RRHH; va con el despliegue de después de julio, no antes. El rodeo que hay en
`campo-formulario` cubre las pantallas de este módulo mientras tanto.

## Y los dos cambios de guion tampoco se tocan todavía

Los dos efectos anotados arriba —que el rodeo del día 30 deja de hacer falta, y que *Nuevo
finiquito* pasa a pedir `15/01/2026`— **se escriben en los guiones el mismo día que se despliega,
no antes**. Decisión del árbitro, y el motivo es el que hace que importe: si se actualizan ya,
**quien replique junio seguiría el rodeo nuevo contra la aplicación vieja**, tecleando `15/01/2026`
en un campo que todavía lee `mm/dd`. Eso no da error: da el 1 de mayo. Adelantar la documentación
sería introducir exactamente el defecto que se está corrigiendo.
