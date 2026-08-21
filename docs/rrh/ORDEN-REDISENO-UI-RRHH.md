# Interfaz de RRHH — regla para lo que se construya, migración congelada

**Fecha:** 2026-08-20 · **Decisión del dueño del producto** · Vinculante para el frontend

> **Este documento cambió de alcance el 2026-08-20, el mismo día que se escribió.** Nació como una
> orden de rehacer diecinueve pantallas y **eso queda congelado**. Lo que sigue vigente es la
> regla para lo que se construya de aquí en adelante.

---

## 1. La decisión vigente

**Las pantallas existentes se quedan como están.** Primero se termina el proceso: las pruebas
completas, el módulo funcional y la información de ASOPREP cargada y cuadrada. La parte visual se
migra después, pantalla por pantalla y sin prisa.

**Lo que se construya desde ahora nace ya en la forma nueva:**

- **No usa `table-basic-hijos`.**
- Interfaz moderna e intuitiva, con las condiciones del §3.

En la práctica eso son **la fase 8 (liquidación), la fase 9 (salidas oficiales y utilidades) y el
tablero**, que hay que escribir de todos modos. No tiene sentido levantarlas sobre el componente
que va a salir.

### Por qué se congela

Rehacer diecinueve pantallas ahora detiene el proceso entero, y el proceso es lo que tiene fecha:
la calibración de enero a junio y agosto en producción. La interfaz no tiene fecha.

### Un error de criterio que conviene no repetir

El piloto elegido fue `forms/personal/ficha`, escogida por ser **la que más campos tiene y la que
peor sufría el diálogo**. Pero la petición era **dejar de usar `table-basic-hijos`**, y la parte
de la ficha que se rehízo **no usaba ese componente**. Se optimizó para el problema equivocado.

Cuando se retome la migración, el orden lo marca **qué pantallas usan `table-basic-hijos` y con
cuánto dolor**, no cuántos campos tienen.

### Lo construido no se tira

`forms/personal/ficha/contratos` quedó en vista propia y funcionando. **Se conserva**: es la
implementación de referencia con la que se migrará el resto, y revertirla costaría trabajo para
perder información. Es la única pantalla en la forma nueva hasta que se retome.

Y las piezas compartidas que salieron del piloto **no dependen del contenedor y se usan desde
ya**: `forms/comunes/cuerpo-entidad.ts` con `armarCuerpo` y la guarda del combo, `mensajes.ts`,
`EstadoListaService`.

---

## 2. Lo que no puede cambiar

Vale para todo lo que se construya. Es presentación; nada de esto se mueve:

- **El contrato REST y los nombres de propiedad del DTO.** Un desajuste ahí no rompe el build: se
  ve como campo vacío. `PLAN-IMPLEMENTACION-RRHH-MAESTRO.md` §6 y
  `CONTRATO-DTO-PARAMETRIZACION-RRHH.md` siguen siendo vinculantes.
- **Nada normativo quemado en código.** Todo a `PRNM`/`CPNM`/rubros. Si un valor no tiene dónde
  vivir, es hueco del modelo y se reporta.
- **Estados y catálogos por rubro, con código alterno.** Multiempresa siempre. Dinero `Double` con
  `RedondeoNomina`. `usuarioRegistro` desde `usuario-sesion`.
- **Las fechas, con la regla verificada:** `LocalDate` como `yyyy-MM-dd`, `LocalDateTime` como ISO
  local **sin zona**. Nunca un `Date` crudo ni nada terminado en `Z` — serializa Jackson y
  **descarta el offset en vez de convertirlo**, así que un `Date` de las 08:30 en Ecuador queda
  grabado a las 13:30, en silencio.
- **El design system.** `styles/abstracts` manda. No es licencia para inventar paleta ni
  tipografía.
- **Componentes por debajo de 300 líneas.**

---

## 3. Condiciones de la forma nueva

1. **Ni `table-basic-hijos`, ni modales, ni paneles laterales para capturar o editar.** El modal
   por el defecto que lo destapó —1205 px de diálogo en un viewport de 1115, con Guardar 21 px
   fuera de pantalla—; el panel lateral porque en pantallas pequeñas no es funcional y desperdicia
   el ancho mientras la lista, que ya nadie mira, se lo queda.
2. **La forma es la vista propia:** lista y formulario son dos vistas con su ruta, y el formulario
   ocupa el ancho completo. Campos agrupados en bloques, dos columnas cuando hay ancho, una
   cuando no. **Etiqueta al lado del campo, no encima** — con la etiqueta flotante encima de cada
   campo la lectura se vuelve un mosaico.
3. **La barra de acciones no se va de la pantalla nunca.** Fija abajo, fuera del scroll.
4. **No se pierde el contexto.** Cabecera persistente con el registro y el colaborador, y al
   volver, la lista vuelve como estaba: filtro, orden y posición.
5. **Usable hasta ancho de tableta sin scroll horizontal**, medido a un ancho declarado.
6. **La pantalla se organiza por la tarea, no por la tabla.** Un período de nómina no es una fila
   con botones: es un flujo con estado, acciones disponibles y resultados.
7. **La captura repetitiva se hace sin ratón**: edición en línea, `Tab` que avanza, `Enter` que
   confirma la fila.
8. **Los errores dicen qué hacer.** El listón: «Período histórico: no se emite el asiento de
   provisiones», y el empleado sin cuenta bancaria se nombra.

---

## 4. Reglas que salieron de probar, y que valen para cualquier pantalla

Éstas no son de estilo. Son defectos verificados, y cada uno costó una sesión de encontrar:

- **El modelo de presentación y el de persistencia no son el mismo objeto.** La fila que pinta la
  tabla lleva adornos —etiquetas de estado, plazos calculados— que no existen en la entidad, y
  mandarla en un `PUT` da *«Not able to deserialize data provided»*. Se guarda el **registro
  crudo indexado por código** y de ahí se arman el formulario y el cuerpo.
  **Corolario: una pantalla no está probada hasta que se ha editado un registro existente**, no
  sólo creado uno — el alta no sufre este defecto porque parte de `{}`.
- **Un combo de referencia con texto escrito y nada elegido se corta antes de enviar.** Si no se
  selecciona, el cuerpo viaja con `{codigo:'renun'}` → 400 incomprensible, o `ORA-02291` con el
  nombre de la FK si el código no existe. La guarda vive en `forms/comunes/cuerpo-entidad.ts`.
- **Un formulario con cambios no se pierde por un clic al aire.** Avisar antes de descartar.
  Descartar sigue siendo posible; deja de ser accidental.
- **El contenido proyectado se instancia aunque el contenedor esté cerrado.** Los
  `formControlName` buscan controles en un grupo vacío y revientan el ciclo de detección de
  cambios, dejando la tabla sin cabeceras — y el síntoma apunta a la tabla, no a la causa. Sólo
  aplica si se proyecta contenido; en la vista propia no ocurre.
- **Medir antes de reportar.** Los dos defectos anteriores se iban a reportar como problemas de la
  tabla y no lo eran.

---

## 5. Consecuencias del congelamiento

- **El defecto del diálogo de `table-basic-hijos` vuelve a estar vivo** y ya no lo resuelve el
  rediseño: las pantallas existentes lo siguen usando. Arreglarlo —envolver el cuerpo en
  `mat-dialog-content` con su `overflow` y dejar los botones en `mat-dialog-actions`— pasa a ser
  trabajo real, y toca a los seis módulos. **No es urgente para la carga histórica**: las
  pantallas de migración ya están construidas y en uso.
- El defecto del `fechaRegistro` está resuelto por el sellado de auditoría opt-in del backend.

---

## 6. Cuando se retome

Pantalla por pantalla, empezando por las que **usan `table-basic-hijos`** y más se sufren.
`contratos` es la referencia. Nada de big bang, y nada antes de que el módulo esté funcional y la
información de ASOPREP cargada y cuadrada.
