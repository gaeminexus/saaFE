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

> **⚠ Aviso para quien despliegue: la rama lleva más de lo que dice este documento.** El commit
> `a5ad484` «Cambios» —de `xeonpotato`, 2026-08-23— quedó **sobre esta rama y no sobre `main`**, y
> trae unas 2 800 líneas ajenas: la carga automática del SRI de CXP y los `.md` de la réplica y del
> `ESTADO`, que tienen otros dos escritores. **No es mío y no lo he tocado.** Lo anoto porque
> publicar esta rama tal cual publicaría también todo eso, que es justo lo que el encargo pedía
> mantener separado. Los commits míos son `14eff13`, `8fe8f46`, `25ff86f` y `c7f1003`; si hace
> falta, se dejan solos.

> **⚠ Hallazgo del 2026-08-25, previo a cualquier otro trabajo de esta sesión: la rama no compila,
> y no es cosa mía.** `npx tsc --noEmit -p tsconfig.app.json`, `npx ng build --configuration
> development` y **cualquier** `npx ng test` —da igual qué spec se filtre con `--include`, porque
> `tsconfig.spec.json` incluye `src/**/*.ts` entero— fallan con `TS2307` sobre dos módulos que
> `gestion-documentos.component.ts` y `carga-documentos.service.ts` (`modules/cxp`) importan y que
> **nunca se llegaron a comitear**: `dialogs/clasificar-productos-dialog/clasificar-productos-
> dialog.component.ts` y `model/productos-sin-clasificar.ts`. Confirmado que ya estaba así en el
> commit `a5ad484` —el ajeno de CXP citado arriba— con el árbol limpio y sin ningún cambio mío:
> `git show a5ad484:...` trae el import, `git ls-tree -r a5ad484` no trae los dos archivos. No es
> una regresión de esta sesión ni de D25; estaba roto desde el 23 y nadie lo había necesitado
> compilar entero hasta ahora.
>
> **Por qué esto no es "otro tema, no me toca" sin más:** bloquea *todo* — no se puede correr un
> solo test de RRHH mientras estos dos archivos falten, porque `login.component.ts` importa
> `AppConfig` de `app.config.ts`, que hace `provideRouter(routes)` de `app.routes.ts`, que registra
> `gestion-documentos.component.ts` entre las rutas eager de CXP. No hay spec de este módulo que
> escape a esa cadena.
>
> **Qué se hizo para poder verificar D25 sin tocar el trabajo de otro:** dos archivos *stub*,
> minúsculos y sin lógica —una interfaz vacía y un componente standalone con plantilla en blanco—,
> creados **sin comitear**, sólo para que `tsc`/`ng build`/`ng test` tuvieran algo que resolver.
> Con ellos puestos, `tsc --noEmit` vuelve a 0. Se usaron para correr los tests de D25 (ver abajo) y
> **se borraron los dos antes de tocar nada más**; el árbol quedó otra vez idéntico a `HEAD`,
> comprobado con `git status --porcelain`. No se creó ni se dejó ningún archivo de CXP.
>
> **No lo arreglo yo.** No es de RRHH, no sé qué debía hacer el diálogo de clasificación de
> productos, y completarlo de verdad es del agente o la persona que dejó `abrirClasificacionProductos()`
> a medias en `gestion-documentos.component.ts:608-619`. Lo que sí digo, para quien lo lea antes que
> yo: **mientras esos dos archivos no existan, nadie puede correr `ng test` ni `ng build` en esta
> rama**, ni siquiera sobre código que no tiene nada que ver con CXP.

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
| `login.destino.spec.ts` | **13 de 13** · D25 |
| `avisos.spec.ts` | **9 de 9** · D26 |
| **Total propio** | **72 de 72** |

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

# Los ocho que aparecieron mientras se corregía

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

`D25` lo levantó la réplica después, y **se corrige junto con la mitad que le faltaba a D21**:
sueltos son dos molestias; juntos dejan un dato sin forma de alcanzarse dos veces.

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

**Por qué en la rejilla, que es donde se elige.** Todas las consultas de verificación de los
guiones —`NMNA`, `ACMN`, `NVNM`— van por ese código. En producción los períodos son 1, 2, 21, 41:
no hay serie que deducir.

**Y también en la cabecera del panel, añadido con D25.** La ficha ofrecía las dos opciones con un
«o»; hacen falta las dos, y por motivos distintos. La columna sirve para **elegir** sin abrir nada;
la cabecera, para **confirmar** sobre qué período se ha aterrizado al seguir un enlace. Con D25
arreglado esa URL ya se puede compartir y recargar, así que aterrizar en ella deja de ser un
accidente y pasa a ser un camino normal.

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

## D25 · La URL de un período rebotaba por el login y perdía el destino — **con D21**

**Los dos juntos, porque por separado ninguno cuenta la historia entera.** D21 decía que
`PRDNCDGO` sólo se lee de la barra de direcciones. D25 dice que esa barra de direcciones no se
puede usar dos veces. **El resultado combinado es un dato que existe y no tiene forma de
alcanzarse**: no se puede recargar la página, ni pegar el enlace en un mensaje, ni volver mañana al
mismo período por donde se llegó hoy.

**Qué era en realidad, y el reparto de culpa no es el que parece.** `authGuard`
(`shared/guard/auth.guard.ts`) hace su parte bien y la hacía desde siempre:

```ts
router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
```

**El destino se manda. Lo que faltaba era que alguien lo leyera.** `login.component.ts` tenía
**cinco salidas** y las cinco navegaban a `/menu` sin mirar la query: la de sesión ya viva, las tres
de la restauración desde `localStorage` —incluida la de error— y la del login tecleado.

**Por qué se lee como un problema de sesión sin serlo.** El camino real es abrir la URL en una
pestaña nueva o desde un enlace compartido. Ahí `sessionStorage` está vacío —es por pestaña—, la
guarda deniega, y el login **restaura la sesión desde `localStorage` sin pedir nada**: el usuario
ve un parpadeo por la pantalla de login y aparece en el menú, con su sesión intacta. Todo apunta a
la sesión, y la sesión no tuvo nada que ver. **Lo que se perdió fue el destino, y se perdió después
de que la guarda lo hubiera puesto a salvo.**

**Qué se cambió.**

- `irAlDestino()` sustituye a las cinco navegaciones a `/menu`, y va al `returnUrl` cuando lo hay.
- `destinoPedido()` lo valida antes de usarlo.
- Y la otra mitad de D21: **`PRDN 41` en la cabecera del panel**, junto al «Período 4/2026». La
  columna del listado ya estaba; esto es lo que se ve al **aterrizar** siguiendo la URL, que es
  justo el momento en que hace falta confirmar sobre qué período se ha caído.

**La validación no es celo de más.** Un `returnUrl` viaja en la barra de direcciones y lo escribe
quien quiera; sólo se acepta una ruta absoluta de este mismo origen —nada de `//host`, nada de
`esquema://`, nada relativo— y se rechaza `/login` para no hacer un bucle. **No se corrige la
navegación de una aplicación abriendo un salto a otro sitio al lado**, y menos en un sistema cuya
revisión de arquitectura ya tiene abierta la autenticación.

**Cómo se comprobó.** Trece tests ejecutados, y **seis fallan si se revierte D25** —comprobado
revirtiéndolo, y hubo que comprobarlo dos veces: el primer intento de revertir **no llegó a
aplicarse** y los trece siguieron en verde. Un revert que no revierte convierte la comprobación en
un sello de goma, así que la segunda vez el script aborta si el texto que busca no está.

Los seis que caen son los que llevan al destino: la pestaña nueva con la sesión compartida, esa
misma sin usuario, esa misma con la carga de datos fallando, la sesión ya viva, el login tecleado,
y la ruta interna con query propia. Los otros siete —los seis `returnUrl` rechazados y el caso sin
`returnUrl`— **pasan en los dos mundos, y es lo correcto**: son guardas contra aceptar de más, no
contra aceptar de menos. Igual que en D24, lo digo para que nadie los cuente como prueba.

> **Esto arregla el rebote, no la autenticación.** Que la sesión se restaure sola desde
> `localStorage` sin pedir credenciales es otra cosa, está en la revisión de arquitectura (F2/H2) y
> **no se toca aquí**: con la calibración cerrada y el despliegue pendiente, cambiar cuándo se pide
> la contraseña no es una corrección de pantalla.

> **Re-verificado de verdad el 2026-08-25 — la sesión anterior lo había dejado como "comprobado" sin
> serlo.** El script de reversión que se usó entonces no se comiteó —vivía fuera del repo, en un
> scratchpad de esa sesión— y esta sesión no tiene memoria de él, así que se rehízo desde cero, esta
> vez guardando el porqué en vez de dar por buena una afirmación de una sesión que ya no está.
>
> El script nuevo hace una única sustitución de texto, exacta, sobre `login.component.ts:114`:
> `this.router.navigateByUrl(this.destinoPedido() ?? '/menu');` ⇄
> `this.router.navigateByUrl('/menu');`. **Aborta con código de salida 1 si el texto que busca no
> está**, en cualquiera de las dos direcciones — se probó primero pidiéndole un `restore` sobre el
> archivo ya arreglado, y abortó, que es la prueba de que la comprobación de aquí no es un sello de
> goma. Revertir sólo esa línea es fiel al pre-D25: en el commit `a5ad484` —el padre real de
> `c7f1003`, D25— las cinco salidas hacían `this.router.navigate(['/menu'])` sin mirar el
> `returnUrl`, y las cinco pasan hoy por `irAlDestino()`, así que revertir la única línea de
> `irAlDestino()` reproduce el mismo comportamiento en las cinco sin tocarlas una por una.
>
> **Resultado, con `login.destino.spec.ts` corrido de verdad en Chrome Headless, no supuesto:**
>
> | Estado del código | Resultado |
> |---|---|
> | Con el arreglo (`HEAD`) | **13 de 13** |
> | Revertido (una línea) | **6 FAILED, 7 SUCCESS** |
> | Restaurado | **13 de 13**, y `git diff` sobre el archivo vacío |
>
> Y los seis que caen son exactamente los seis que dice el párrafo de arriba, nombre por nombre en
> el reporte de Karma: las tres de la pestaña nueva, la sesión ya viva, el login tecleado y la ruta
> interna con query propia. Los siete que sobreviven al revert —el caso sin `returnUrl` y los seis
> rechazados— también sobreviven aquí, que es lo que tenían que hacer.
>
> El script se corrió con dos stubs de CXP puestos y sin comitear —ver el aviso del principio del
> documento— y se retiraron los dos antes de dar esto por cerrado. **D25 pasa de "comprobado" a
> "comprobado y reproducido"**, y el script queda descrito aquí, no en el repo, por si hace falta
> una tercera vez.

---

## D26 · El aviso de error se dibujaba detrás del header

**Qué es.** Cuando falla la generación de un reporte, el backend manda el motivo y la aplicación
lo enseña en una galleta roja arriba a la derecha… **por detrás del header**. El usuario ve que no
pasa nada y no ve por qué. Es la familia entera de este módulo otra vez: no es que falte la
información, es que existe y no llega a los ojos de nadie. Y un error invisible se lee como «el
botón no hace nada», que es el diagnóstico equivocado.

**Qué era en realidad — y bajarlo NO bastaba.** El apilamiento real, leído de los `.scss`:

| Elemento | `z-index` | Dónde |
|---|---:|---|
| Header | **9999** | sticky, arriba |
| Panel lateral de la ficha | 1050 | fixed, derecha, de arriba abajo |
| Pie de acciones del finiquito | 1020 | sticky, abajo |
| **Contenedor de overlays del CDK** | **1000** | ← aquí vive el snackbar |
| Footer | 20 | fixed, abajo, 35 px |

El overlay del CDK trae `z-index: 1000` de fábrica y **está por debajo de casi todo lo que tiene
posición propia**. Arriba lo tapa el header; abajo lo habrían tapado el pie de acciones del
finiquito y el panel lateral de la ficha —**justo la pantalla desde la que más errores se
muestran**—. Mover la posición sin subir el `z-index` habría cambiado un escondite por otro.

**Qué se cambió — tres cosas, y las tres hacen falta.**

1. **`z-index: 10000` en `.cdk-overlay-container`**, en `src/styles/styles.scss`. Es lo que pone al
   snackbar por delante del header y de todo lo demás.
2. **Posición abajo y centrada**, y `margin-bottom: 43px` para que no se monte sobre el footer
   fijo de 35 px.
3. **Un solo sitio para toda la configuración**: `modules/rrh/forms/comunes/avisos.ts`.

**Sobre el punto 3, que es el que evita la recaída.** Había **43 configuraciones sueltas repetidas
en 35 archivos**, con **ocho duraciones distintas** y cinco `panelClass` distintas. Las 43 pasan
ahora por `opcionesAviso()`. Arreglarlo pantalla por pantalla habría dejado el defecto latente en
la primera copia que nadie tocara — y con 43 copias, esa copia existe seguro.

**La duración también era parte del defecto.** Un error que se va antes de leerse es tan invisible
como uno que no se muestra. Ahora escala con la longitud: 5 s de tiempo base más 30 ms por
carácter, con suelo de 8 s y techo de 20 s.

> **Y aquí el test corrigió a la implementación, no al revés.** La primera fórmula era 18 ms por
> carácter y sin tiempo base. El test «un error largo permanece más que uno corto» falló: hacían
> falta **444 caracteres** para superar el suelo de 8 s, y ningún mensaje real llega a eso, así que
> el escalado no se activaba nunca y la fórmula sólo *parecía* hacer algo. Es la misma clase de
> defecto que el archivo huérfano de abajo —código que existe y no se ejecuta—, esta vez cazado
> antes de salir.

**Cómo se comprobó.** Nueve tests ejecutados, uno por cada cosa que el árbitro pidió comprobar y no
suponer:

| Lo que había que comprobar | Test |
|---|---|
| Que se ve | posición `bottom` / `center`, y la misma para éxito y error |
| Que se ve **entero** | `white-space: pre-line` + `word-break: break-word` en el `label` |
| Cuánto permanece | el mensaje de Jasper **supera** el suelo, no se queda en él; techo de 20 s |
| Que no lo tapa nada abajo | `z-index` por encima de las cuatro capas de la tabla; `margin-bottom` sobre el footer |
| Que no rompe los avisos de éxito | conserva `snackbar-success` y sus 4 s; sólo cambia de sitio |

Más `tsc` en 0, build completa y los ocho specs anteriores del módulo sin tocarse.

---

## Hallazgo de D26 · `src/styles.scss` no lo compila nadie, y llevaba un arreglo dentro

**Esto vale más que la corrección.** `angular.json` compila **`src/styles/styles.scss`** en sus dos
configuraciones. Existe además un **`src/styles.scss` huérfano** —3 384 bytes, del 2026-07-13— que
**no referencia nadie**: ni `angular.json`, ni `karma.conf.js`, ni ningún `@use` de otra hoja.

Y en su línea 83 estaba, escrita palabra por palabra, la regla que arregla D26:

```scss
.cdk-overlay-container { z-index: 10000 !important; }
```

**Alguien corrigió este mismo defecto hace mes y medio, en un archivo que el build no toca.** Nunca
se ejecutó. Un mes y medio después el defecto se reporta otra vez y hay que diagnosticarlo entero
desde cero.

> **Un arreglo que existe y no se ejecuta es peor que uno que no se hizo**: quien lo busca lo
> encuentra, lo da por resuelto y deja de buscar.

### Qué más hay ahí dentro sin aplicarse

Inventariado regla por regla contra la hoja compilada. **No se ha movido nada de esto** —trasladarlo
cambiaría el aspecto de la aplicación de golpe y la migración visual sigue congelada—; se reporta:

| Regla del huérfano | ¿Aplicada hoy? |
|---|---|
| **El tema Material entero** — `mat.core()`, paletas, densidad y una **escala tipográfica de 12 niveles** | **NO.** La aplicación usa el prebuilt `indigo-pink` de `angular.json`. Esa tipografía no ha estado nunca en efecto |
| `body { padding-bottom: 35px }` — hueco para el footer fijo | **NO.** Sin él, el footer de 35 px se monta sobre el final del contenido. **Es la misma familia que D26** y probablemente sea un defecto por derecho propio |
| `html, body { overflow: hidden }`, `body { height/width: 100vh/vw }`, `app-root { … }` | **NO.** El reset compilado pone `height: 100%` y nada más |
| `.cdk-overlay-container` y `.mat-mdc-snack-bar-container` | Ya no aplica: **trasladadas** a la hoja buena al corregir D26 |
| Los cuatro `*-snackbar` y la fuente de iconos | **Sí**, duplicados en la hoja compilada. Ahí no falta nada |

**El segundo de la lista es el que merece ficha propia**: un footer `position: fixed` sin hueco
reservado tapa el final de cualquier pantalla larga. No lo abro yo porque no lo he visto en uso —
lo dejo señalado para quien replica.

### Qué se hizo con el archivo

**Se conserva, neutralizado con una cabecera**, en vez de borrarlo. La cabecera dice, en el primer
sitio donde mira quien lo abra, que **nada de lo que hay ahí se aplica** y dónde vive la hoja buena.

**Por qué no se borra:** el tema y la escala tipográfica son una decisión de diseño que alguien
puede querer aplicar de verdad, y un archivo borrado no lo encuentra un `grep` — sólo lo encuentra
quien ya sabe que existió. El daño real era que el próximo lo editara creyendo que sirve, y eso lo
cierra la cabecera. **Si el árbitro prefiere borrarlo, es un `git rm` y el inventario de arriba ya
conserva lo que había dentro.**

---

## La frontera de `avisos.ts` — hasta dónde llega y por qué se paró ahí

**`avisos.ts` centraliza RRHH, y sólo RRHH.** Las 43 configuraciones que D26 unificó eran las 43
del módulo; fuera de `modules/rrh/` siguen naciendo `snackBar.open` sueltos, cada uno con su propio
literal de duración y de `panelClass`, exactamente el patrón que D26 describe como el que deja el
defecto latente en la primera copia que nadie toque. Contado hoy, `grep -rl "snackBar.open"
src/app/modules/ --include="*.ts"` fuera de `rrh/`:

| Módulo | Archivos con `snackBar.open` crudo |
|---|---:|
| `crd` | 36 |
| `tsr` | 19 |
| `cnt` | 18 |
| `cxc` | 17 |
| `cxp` | 16 |
| `dash` | 1 |
| **Total ajeno a RRHH** | **107** |

**El de `crd/prestamo-consulta` que menciona el encargo es real** —`prestamo-consulta.component.ts`
tiene cuatro, en las líneas 164, 192, 685 y 723— y es uno más de los 36 de `crd`, no un caso
aislado.

**Por qué se paró en la frontera del módulo, y no es pereza ni descuido:**

1. **El encargo es RRHH.** `avisos.ts` vive en `modules/rrh/forms/comunes/` a propósito: es la
   configuración de *este* módulo, no un servicio compartido. Moverlo a `shared/` para que otros
   módulos lo usen es una decisión de arquitectura que toca código de fuera de RRHH y de fuera de
   lo que se me encargó — la clase de cambio que la regla 2 de este encargo pide consultar antes,
   no decidir sola.
2. **El arreglo de fondo de D26 —el `z-index` del `.cdk-overlay-container`— ya es global**, está en
   `src/styles/styles.scss` y no en `avisos.ts`. Eso significa que **los 107 avisos ajenos ya se ven
   por delante del header**, aunque cada uno siga con su propia duración y sin el escalado por
   longitud. El defecto que abrió D26 —el aviso invisible— no sigue abierto fuera de RRHH; lo que
   sigue abierto es la duplicación de configuración, que es un defecto de mantenimiento, no de
   pantalla.
3. **107 sitios en 6 módulos no es una línea de guarda funcional.** Centralizarlos de verdad
   implicaría decidir un `avisos.ts` compartido —o seis copias, una por módulo, que sería repetir el
   problema que D26 cerró— y tocar entre 16 y 36 archivos por módulo. Es trabajo real de otro
   alcance, no algo que quepa en "guarda de una línea" ni en esta rama de defectos de pantalla.

**Qué haría falta para mover la frontera, si alguna vez toca:** sacar `opcionesAviso()` y
`duracionError()` de `modules/rrh/forms/comunes/avisos.ts` a un sitio compartido —`shared/` es el
candidato obvio, pero decidir su forma final no es de esta ficha—, y repetir por módulo el
mismo barrido que hizo D26 dentro de RRHH: localizar cada `snackBar.open`, sustituirlo por
`this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje))`, y un spec por módulo que
comprueba que sigue habiendo alguna llamada cruda. Se anota aquí para que quien lo retome no
tenga que redescubrir el inventario.

---

# Lo que se deja sin tocar, y por qué

| Qué | Por qué |
|---|---|
| **D12** | **Cerrado el 2026-08-23: no se reproduce.** El JSON crudo trae los nombres. Ver arriba. |
| **Quitar el botón «Ejecutar salida» (D24)** | **Decidido en firme el 2026-08-23: no se pone, y no se pone tampoco si alguien lo pide.** Ver abajo. |
| **La restauración de sesión sin credenciales (D25)** | Que `localStorage` reviva la sesión sin pedir contraseña es la revisión de arquitectura F2/H2, no una corrección de pantalla. D25 arregla el rebote, no la autenticación. |
| **La mitad de mayúsculas de D14** | Ya estaba bien en los dos componentes. Sólo se hizo la parte de los acentos. |
| **`EsDateAdapter.parse` devolviendo `null`** | **Aplazado por el árbitro a después de julio, con el despliegue.** Ver abajo. |
| **La suite de tests, 284 fallos** | Rota de antes y ajena: `NG0201` de HTTP en los specs generados por el CLI, más dos de `cnt`. |
| **Los dos cambios de guion** | **No se hacen todavía**, y la razón es de fondo: ver abajo. |

## Decisión en firme · el botón «Ejecutar salida» NO se deshabilita

**Y esto va escrito aquí, y no sólo en la entrada de D24, para que sobreviva a que alguien lo pida
un mal día.** La tentación es evidente: si sabemos que la salida ya está ejecutada, quitar el botón
parece la protección de verdad.

**No lo es, y hay precedente escrito en el catálogo del `ESTADO-RRHH.md`**: la fila del botón de
reabrir deshabilitado sobre un período `CERRADO`. Allí la pantalla impedía algo que estaba
permitido, y **nadie lo investigó nunca — porque nadie investiga un botón gris**. Un bloqueo mal
deducido repetiría ese fallo exacto, y esta vez sobre una acción que sí hay que poder hacer.

La diferencia está en cómo degrada cada opción cuando la deducción se equivoca:

| | Si la deducción acierta | Si se equivoca |
|---|---|---|
| **Aviso en la confirmación** | frena el segundo clic | el usuario lo lee, ve que no aplica y sigue |
| **Botón deshabilitado** | frena el segundo clic | **acción legítima imposible, sin explicación y sin recurso** |

**Cuando el punto 21 del motor esté hecho habrá un estado de verdad**, y entonces el botón se
retira sin adivinar nada. Hasta ese día, aviso; nunca bloqueo.

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
