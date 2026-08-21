# Plan de implementación RRHH — Frontend

**Repositorio:** `C:\work\saaFE\v1\saaFE` · Angular 20 · standalone components · Material · SCSS

> **Lee primero `PLAN-IMPLEMENTACION-RRHH-MAESTRO.md`** (en `saaBE/docs/logica-negocio/rhh/`).
> Contiene las reglas no negociables, el **contrato REST** y los DTO. El contrato es el punto de
> sincronización: el frontend puede avanzar sin esperar al backend siempre que respete esas
> firmas.

El módulo se **rehace completo**. Las 10 pantallas actuales de parametrización y gestión sí
funcionan contra el backend, pero ninguna usa el design system ni `table-basic-hijos`: cada una
reimplementa la tabla a mano (`vacaciones-list` tiene 771 líneas) y hardcodea colores en ~30
archivos. Se conserva el conocimiento de negocio que ya está en ellas, no su código.

---

## Fase 0 · Saneamiento

### Endpoints rotos en `modules/rrh/service/ws-rrh.ts`

De las 24 constantes, cinco no funcionan hoy:

| Constante | Ahora | Debe quedar | Motivo |
|---|---|---|---|
| `RS_HSTR` | `/hsrt` | `/hscg` | Typo del frontend, y el backend renombra a `hscg` para resolver su colisión con `crd/HistorialSueldoRest` |
| `RS_RNGL` | `/rngl` | `/rngl` | Sin cambio: lo corrige el backend, que tenía `rngk` |
| `RS_SLDV` | `/sldv` | `/sldv` | Sin cambio: lo corrige el backend, que tenía `SLDV` en mayúsculas |
| `RS_RBRO` | `/rbro` | **eliminar** | No existe ningún `@Path("rbro")`. Los rubros se leen con `shared/services/detalle-rubro.service` |
| `RS_TPPR` | `/tppr` | **eliminar** | Apunta a `crd/TipoPrestamoRest`: devuelve tipos de préstamo de Crédito en una pantalla de RRHH. Los tipos de permiso son `RHH.CTLG` → `/ctlg` |

`RS_PMLS` también desaparece: hoy apunta a `/slct` como parche temporal porque no existía
entidad de permisos. Se usa `/ptcn` (`Peticiones`), que es la tabla correcta.

### Rutas y componentes muertos

- `app.routes.ts` declara **dos árboles casi idénticos**: `path: 'rrhh'` (línea 630) y
  `path: 'menurecursoshumanos'` (línea 746). El menú lateral y el botón del dash apuntan siempre
  al segundo, de modo que las ~114 líneas del primero son inalcanzables. **Eliminar el bloque
  630–744 completo.**
- Eliminar `forms/procesos/aportes/rrh-aportes.component.ts` y
  `forms/procesos/liquidaciones/rrh-liquidaciones.component.ts`: demos hardcodeados de 21 líneas
  que nadie importa ni enruta.
- Eliminar los cuatro componentes de `forms/reportes/`: son mocks de 21 líneas con dos filas
  literales. Se reconstruyen contra `/rest/rprt/generar`.

### Deuda a no arrastrar

- `usuarioRegistro: 'demo'` hardcodeado en cuatro puntos de `permisos-licencias-form`.
- `getUsuarioRegistro()` duplicado ~10 veces: usar `shared/services/usuario-sesion.ts`.
- `CUSTOM_ELEMENTS_SCHEMA` en casi todos los componentes, que desactiva la validación de
  plantillas de Angular. **No reproducirlo.**
- `vacaciones-form.component.ts:316` tiene la validación de saldo desactivada con
  `// TODO(test)`. La regla vuelve a estar activa en la reconstrucción.
- `console.log` con volcado de criterios en `empleado.service.ts` y `asistencia.service.ts`.

---

## Convenciones

### Design system — obligatorio

Todo `.scss` empieza importando los abstracts. Cero colores y medidas hardcodeadas:

```scss
@use '../../../../styles/abstracts/colors' as *;
@use '../../../../styles/abstracts/variables' as *;
```

Disponibles: `$primary-color` (#667eea), `$secondary-color` (#764ba2), `$background-gradient`,
`$text-primary/secondary/muted`, `$success-color`, `$error-color`, `$warning-color`,
`$info-color`, `$border-light/medium/dark`, `$shadow-color-light/medium/dark`; y la escala
`$spacing-xs…xl`, `$font-size-xs…4xl`, `$font-weight-*`, `$border-radius-sm/md/lg`,
`$transition-quick/normal/slow`, `$z-index-*`.

### Pantalla maestro-detalle: usar `table-basic-hijos`

El componente genérico `shared/basics/table/forms/table-basic-hijos/` resuelve tabla, paginador,
filtro y diálogos de alta, edición y borrado. La referencia canónica es
`modules/tsr/forms/bancos/bancos.component.{ts,html,scss}` — 245 líneas de `.ts` y **41 de
`.html`**, frente a las 771 que hoy tiene `vacaciones-list`.

El `.ts` solo construye un `TableConfig`:

```typescript
this.tableConfig = {
  entidad: Entidades.CONCEPTO_NOMINA,
  titulo: 'Conceptos de nómina',
  registros: this.conceptos,
  fields: [ { columna: 'nombre', header: 'Concepto', ancho: '30%' }, ... ],
  regConfig: [ { type: 'input', name: 'nombre', label: 'Concepto',
                 validations: [...], transformToUppercase: false },
               { type: 'select', name: 'tipoConcepto', label: 'Tipo',
                 rubroAlterno: 179 }, ... ],
  add: true, edit: true, remove: true,
  paginator: true, filter: true,
  onBeforeSave: (data) => this.prepararGuardado(data),
  onDataUpdate: (data) => this.formatear(data)
};
```

Y el `.html` es un `.page-header` más una sola etiqueta
`<app-table-basic-hijos [configTable]="tableConfig" (emiteError)="onTableError($event)">`.

La carga se hace con `DatosBusqueda`, que ya usa el módulo:

```typescript
const db = new DatosBusqueda();
db.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empresa', 'codigo',
                            empresaId, TipoComandosBusqueda.IGUAL);
this.service.selectByCriteria([db, orden]).subscribe(...);
```

**Cuándo no usarlo:** las pantallas de proceso (cálculo de nómina, liquidación, importación de
marcaciones) no son CRUD y llevan componentes propios. Ahí sí se construye a medida, pero
respetando el design system y el layout `.page-header` + panel.

### Servicios

Molde estándar, con la particularidad conocida del proyecto:

```typescript
@Injectable({ providedIn: 'root' })
export class ConceptoNominaService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<ConceptoNomina[]> {
    return this.http.get<ConceptoNomina[]>(`${ServiciosRhh.RS_CPNM}/getAll`)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ConceptoNomina[]> {
    return this.http.post<ConceptoNomina[]>(`${ServiciosRhh.RS_CPNM}/selectByCriteria`, datos)
      .pipe(catchError(this.handleError));
  }
  // ...
}
```

`handleError` debe tratar el HTTP 400 con mensaje de "sin registros" como lista vacía, tal como
hace hoy `empleado.service.ts:52-62` — es el comportamiento correcto contra este backend, que
lanza `IncomeException` cuando una búsqueda no devuelve filas.

### Fechas

Las fechas llegan del backend en tres formas distintas (arreglo `[y,m,d,h,mi,s,ns]`, string
formateado, o `Date`). **Normalizar siempre** con
`FuncionesDatosService.convertirFechaDesdeBackend()`. Nunca parsear a mano.

### Combos

Regla vigente del proyecto: todo combo alimentado desde una tabla distinta a rubros debe permitir
filtrar por **al menos dos campos**. La única excepción es una tabla con exactamente `id`,
`nombre` y `estado`. En RRHH esto aplica a empleado (nombre + cédula), concepto de nómina
(nombre + código alterno), plan de cuentas (nombre + número de cuenta) y causal de terminación
(nombre + artículo).

---

## Pantallas por fase

### Fase 1 · Parametrización

| Pantalla | Endpoint | Tipo |
|---|---|---|
| Conceptos de nómina | `/cpnm` | `table-basic-hijos` |
| Parámetros por año | `/prnm` | Formulario extenso, agrupado por secciones |
| Tabla de impuesto a la renta | `/tbir` | Maestro-detalle por año; 2026 tiene diez tramos, con tarifa máxima 37 % |
| Topes de gastos personales | `/tpgp` | `table-basic-hijos` |
| Causales de terminación | `/cstr` | `table-basic-hijos` con las banderas de efecto |
| Configuración de nómina | `/cfnm` | Formulario único por empresa |
| Formatos de marcación | `/fmrc` + `/dfmr` | Maestro-detalle |
| Cargos, departamentos, tipos de contrato, turnos | ya existen | Reconstruir con `table-basic-hijos` |

La pantalla de parámetros por año merece cuidado: es donde el usuario cambia el SBU cada enero.
Agrupar en secciones —valores base, IESS, impuesto a la renta, utilidades, bases de cálculo,
horas extra, vacaciones, indemnizaciones— con el año como selector arriba y un botón de
"duplicar del año anterior".

### Fase 2 · Ficha del colaborador

Una sola pantalla con pestañas, en lugar de las cinco sueltas de hoy:

- **Datos personales** — identificación, nombres, nacimiento, estado civil, género,
  nacionalidad, instrucción, discapacidad y CONADIS, enfermedad catastrófica, contacto de
  emergencia, foto.
- **Cargas familiares** (`/crgf`) — con el contador de las que califican para la rebaja de IR,
  visible, porque determina el tope.
- **Contratos** (`/cnte`) — tipo de relación laboral, jornada, modalidades de décimos y fondos de
  reserva, ocupación MDT.
- **Historial de cargos** (`/hscg`).
- **Datos bancarios** (`/cbem`) — con soporte de reparto por porcentaje.
- **Gastos personales** (`/gspr`) — por categoría y año, con el tope calculado a la vista.
- **Novedades IESS** (`/nvis`) — con semáforo de plazo: el aviso de entrada vence a los 15 días
  y el de salida a los 3.

### Fase 3 · Migración

Pantalla de carga de saldos de apertura: subir archivo → previsualizar → validar (muestra
`List<String>` de inconsistencias) → aplicar → opción de revertir. Es un asistente de cuatro
pasos, no un CRUD.

### Fases 4 y 5 · Nómina

**Período de nómina** es la pantalla central del módulo:

- Cabecera con año, mes, tipo, fechas, estado y **modo** (histórico o productivo), este último
  bien visible, porque cambia lo que hace el botón de contabilizar.
- Barra de acciones que refleja la máquina de estados: Validar → Calcular → Aprobar →
  Contabilizar → Cerrar, con cada botón habilitado solo en su estado. Reabrir queda disponible
  mientras no exista asiento.
- Tabla de empleados del período con ingresos, descuentos y neto, y detalle expandible con los
  renglones.
- Acciones por empleado: recalcular, excluir, ver rol.
- Panel de totales del período.
- Al validar, mostrar la `List<String>` de mensajes en un panel, no en un `snackbar`: pueden ser
  varios y el usuario necesita leerlos con calma.

**Novedades del período** (`/nvnm`): es también la vía de carga manual de la nómina histórica de
enero a julio de 2026, así que necesita carga rápida y masiva — idealmente una tabla editable
con empleado, concepto, cantidad y valor.

**Rol de pago** (`/rlpg`): lista con descarga de PDF vía `JasperReportesService`.

### Fase 6 · Pago

**Orden de pago** (`/rdpg`): generar desde el período, ver el detalle por empleado, descargar el
archivo bancario, confirmar acreditación, registrar rechazos individuales.

**Previsualización del asiento**: antes de contabilizar, mostrar las líneas devueltas por
`/rest/prdn/previsualizarAsiento/{id}/{tipo}` con sus totales de debe y haber. Es lo que permite
al contador detectar una cuenta mal mapeada antes de emitir.

### Fase 7 · Asistencia

**Importación de marcaciones**: subir archivo → previsualizar (muestra líneas OK, con error y
duplicadas) → confirmar → ver el log. Poder anular una carga.

**Marcaciones** (`/mrcc`): registro manual y corrección, con el origen visible.

**Resumen diario** (`/rsmn`): calendario o tabla por empleado y rango, con atrasos, horas extra
tipificadas y marcaciones inconsistentes señaladas para revisión.

**Horas extra** (`/hrex`): bandeja de aprobación, con las que exceden el tope legal destacadas.

### Fases 8 y 9 · Liquidación y salidas

**Liquidación**: simular antes de calcular —el usuario necesita ver el finiquito antes de
comprometerlo—, luego calcular, aprobar y ejecutar salida. Mostrar el desglose por rubro.

**Salidas oficiales**: pantalla por salida (RDEP, planilla IESS, formularios MDT), cada una con
selector de período, botón de generar y descarga. Siguen el patrón del módulo `rpr`, que ya hace
esto para la Superintendencia de Bancos.

### Tablero de RRHH

Pantalla de entrada del módulo, con indicadores: headcount, altas y bajas del mes, costo de
nómina del período, ausentismo, cumpleaños próximos, y avisos IESS por vencer. Es lo que da la
sensación de módulo moderno más allá de las tablas. Consultas dedicadas en el backend, no
agregación en el cliente.

---

## Reportes

Usar `shared/services/jasper-reportes.service.ts`, que ya existe y ya lista `rhh` entre sus
módulos:

```typescript
this.jasperService.generar('rhh', 'RPRT_ROL_INDIVIDUAL', { P_NMNA_CODIGO: id, P_USUARIO: usuario })
    .subscribe(blob => this.descargar(blob, 'rol-pago.pdf'));
```

Consumidores de referencia: `cxc/facturas-ingreso`, `crd/dialog/recibo-operacion-dialog`,
`tsr/anticipos-clientes`. Los 14 que existen hoy resuelven bien el patrón de descarga.

Además, `modules/rpr/menu/menureportes/menureportes.component.ts:51` tiene la entrada
"Recursos Humanos" **comentada** en el menú global de reportes: hay que activarla.

---

## Rutas y menú

Todas las rutas cuelgan de `path: 'menurecursoshumanos'` en `app.routes.ts`, con
`canActivate: [authGuard]` y `canDeactivate: [canDeactivateGuard]` en los formularios de edición.

El menú (`modules/rrh/menu/menurecursoshumanos/`) se reorganiza en cinco grupos: Tablero,
Parametrización, Personal, Procesos, Reportes.

**Corregir los permisos**: hoy todos los grupos usan `idPermiso: 811` y todas las hojas `830`,
que es copia y pega sin granularidad. Asignar un permiso por pantalla, siguiendo cómo lo hacen
los menús de `crd` y `tsr`.

---

## Checklist por pantalla

- [ ] `.scss` importa `styles/abstracts/colors` y `variables`; cero hex y cero px literales
- [ ] Usa `table-basic-hijos` si es maestro-detalle
- [ ] Interface en `model/` con el código de tabla de 4 letras en comentario por campo
- [ ] Servicio en `service/` con `catchError` y el manejo de "sin registros" como lista vacía
- [ ] Constante en `ws-rrh.ts`
- [ ] Ruta bajo `menurecursoshumanos` y entrada de menú con su propio `idPermiso`
- [ ] Fechas normalizadas con `FuncionesDatosService`
- [ ] Usuario desde `usuario-sesion`, nunca hardcodeado
- [ ] Sin `CUSTOM_ELEMENTS_SCHEMA`, sin `console.log`
- [ ] Combos con búsqueda por al menos dos campos
- [ ] Componente por debajo de 300 líneas; si crece más, es señal de que falta extraer
