# CAMBIO: Facturas de reembolso de gastos — bandeja electrónica (FRONTEND)

**Fecha:** 2026-08-19 (v2 — marcado en ambas pantallas, captura solo en Gestión de Documentos,
contabilización diferida)
**Módulo:** CXP
**Contraparte backend:** `C:\work\saaBE\v1\saaBE\docs\logica-negocio\cxp\CAMBIO-REEMBOLSO-GASTOS-BACKEND.md`

> **Instrucciones para el agente implementador:** documento autosuficiente. Los anclajes de línea
> son del 2026-08-19 — buscar por nombre de método/selector si se desplazaron. Seguir los patrones
> del proyecto (standalone components, signals, `MaterialFormModule`, snackbar). Otro equipo
> trabaja en RRHH y CNT: **no tocar nada fuera de `src/app/modules/cxp/` y los archivos aquí
> listados**. Al terminar: listar archivos creados/modificados y dudas abiertas.

---

## 1. Contexto y reparto de responsabilidades por pantalla (decisión del usuario)

Los proveedores intermediarios emiten **facturas de reembolso de gastos** (SRI): el XML puede
traer un bloque `<reembolsos>` con los documentos sustento de terceros, o venir mal generado sin
ese bloque. El backend (cambio en paralelo) parsea el bloque automáticamente, guarda los sustentos
en la tabla `PGS.RMBF`, y contabiliza la factura por los **grupos de producto de los sustentos**
(cada sustento resuelve un producto; los nuevos se crean en el grupo POR CLASIFICAR); la
contabilización queda **pendiente** hasta que todos los sustentos existan, sus productos estén
clasificados y la suma cuadre con el total de la factura.

Reparto en el frontend:

| Función | Bandeja electrónica | Gestión de documentos | Consulta de documentos |
|---|---|---|---|
| Marcar/desmarcar "es reembolso" un documento | ✅ | ✅ | — |
| Subir XML (con checkbox reembolso) | — (la subida de XML NO se agrega aquí) | ✅ (aquí vive la subida real) | — |
| Capturar/editar/eliminar documentos sustento | — | ✅ (diálogo) | — |
| Contabilizar reembolso pendiente | — | ✅ | — |
| Ver sustentos y cuadratura (solo lectura) | — | ✅ | ✅ |

---

## 2. Contrato API (copia idéntica a la del documento backend — no desviarse)

```
POST /SaaBE/rest/carga-documentos/procesarXml/{idDocumentoCxp}
  body: {contenidoXml, idEmpresa, idUsuario, pathDestino?, esReembolso?: 0|1}
  200 (campos NUEVOS sumados a los existentes):
       {..., esReembolso?: true, reembolsosLeidos?: number,
        advertenciaReembolso?: string, reembolsoManualPendiente?: true,
        contabilizacionPendiente?: true, motivoContabilizacionPendiente?: string}

POST /SaaBE/rest/carga-documentos/marcarReembolso/{idDocumentoCxp}
  body: {esReembolso: 0|1, idUsuario}
  200:  {idDocumentoCxp, esReembolso, idFacturaCompra?, estadoDocumento}
  422:  {error}   (pagos aplicados / sustentos activos / tabla destino no soportada)

POST /SaaBE/rest/carga-documentos/contabilizarReembolso/{idFacturaCompra}
  body: {idEmpresa, idUsuario}
  200:  {idFacturaCompra, asiento?, cantidadReembolsos, diferencia, cuadra}
  422:  {error, bloqueantes?}

POST /SaaBE/rest/carga-documentos/recalcularTotalesReembolso/{idFacturaCompra}
  200:  {idFacturaCompra, cantidadReembolsos, totalComprobantesReembolso,
         totalBaseImponibleReembolso, totalImpuestoReembolso, importeTotalFactura,
         diferencia, cuadra: boolean}

POST /SaaBE/rest/carga-documentos/crearProductoPorClasificar
  body: {nombre, codigo?, idEmpresa}
  200/201: ProductoPago (entidad completa; usar .id)

CRUD estándar tabla nueva (patrón idéntico a /dfcc):
  GET    /SaaBE/rest/rmbf/getByFactura/{idFactura}    ← usar ESTE para listar (solo activos)
  POST   /SaaBE/rest/rmbf                             (alta)
  PUT    /SaaBE/rest/rmbf                             (edición)
  DELETE /SaaBE/rest/rmbf/{id}                        (borrado físico)
  (además existen getAll/getId/selectByCriteria estándar)
```

Campos NUEVOS en `FacturaCompra` (GET `/fctc/...`): `esReembolso (0|1)`, `codDocReembolso`,
`totalComprobantesReembolso`, `totalBaseImponibleReembolso`, `totalImpuestoReembolso`.
Campo NUEVO en `DocumentoCxp`: `esReembolso (0|1)`.

**Estados relevantes de `DocumentoCxp.estadoDocumento` para este cambio:** una factura reembolso
puede quedar en **2 = XML CARGADO** aun después de grabarse la factura, cuando la contabilización
está pendiente (faltan sustentos, productos sin clasificar o descuadre) — la `observacion` del
documento trae el motivo. Pasa a **3 = REGISTRADO** cuando `contabilizarReembolso` tiene éxito
(o directamente si la empresa no genera contabilidad).

---

## 3. Archivos NUEVOS

### 3.1 Modelo — `src/app/modules/cxp/model/reembolso-factura-compra.ts`

```typescript
import { FacturaCompra } from './factura-compra';

/**
 * Detalle de reembolsos de gastos de una factura de compra (tabla PGS.RMBF).
 * Un registro por documento sustento (<reembolsoDetalle> del XML SRI, ANEXO 5).
 */
export interface ReembolsoFacturaCompra {
  id: number;
  factura: FacturaCompra;              // en altas enviar stub {id} as any
  tipoIdentificacionProveedor: string; // tabla 6 SRI: 04=RUC 05=Cédula 06=Pasaporte 08=Id exterior
  identificacionProveedor: string;
  codPaisPago: string;                 // tabla 25 SRI, '593'=Ecuador
  tipoProveedor: string;               // tabla 26 SRI: 01=Persona natural 02=Sociedad
  codDoc: string;                      // tabla 3 SRI: 01=Factura 03=Liquidación...
  establecimiento: string;             // 3 dígitos
  puntoEmision: string;                // 3 dígitos
  secuencial: string;                  // hasta 9 dígitos
  fechaEmision: string;                // 'YYYY-MM-DD' (LocalDate del backend; puede llegar array)
  numeroAutorizacion: string;          // 10-49 dígitos
  baseImponibleCero: number;           // base tarifa 0 / no objeto / exento
  baseImponibleGravada: number;
  tarifaIva: number | null;            // 15 / 12 / 8 / 5
  valorIva: number;
  valorIce: number;
  total: number;                       // bases + impuestos
  producto: number | null;             // id de ProductoPago (contabilización por grupo)
  origen: number;                      // 1=XML 2=MANUAL
  estado: number;                      // 1=Activo 0=Anulado
  observacion?: string;
}

/** Respuesta de POST /carga-documentos/recalcularTotalesReembolso/{id} */
export interface CuadraturaReembolso {
  idFacturaCompra: number;
  cantidadReembolsos: number;
  totalComprobantesReembolso: number;
  totalBaseImponibleReembolso: number;
  totalImpuestoReembolso: number;
  importeTotalFactura: number;
  diferencia: number;
  cuadra: boolean;
}
```

### 3.2 Catálogos SRI — `src/app/modules/cxp/model/catalogos-sri-reembolso.ts`

Catálogos fijos de la Ficha Técnica del SRI; NO son rubros de BD (decisión: no crear rubros para
catálogos normativos que no cambian por instalación).

```typescript
export interface OpcionSri { codigo: string; descripcion: string; }

/** Tabla 6 — Tipo de identificación */
export const SRI_TIPO_IDENTIFICACION: OpcionSri[] = [
  { codigo: '04', descripcion: 'RUC' },
  { codigo: '05', descripcion: 'Cédula' },
  { codigo: '06', descripcion: 'Pasaporte' },
  { codigo: '08', descripcion: 'Identificación del exterior' },
];

/** Tabla 26 — Tipo de proveedor del reembolso */
export const SRI_TIPO_PROVEEDOR_REEMBOLSO: OpcionSri[] = [
  { codigo: '01', descripcion: 'Persona natural' },
  { codigo: '02', descripcion: 'Sociedad' },
];

/** Tabla 3 — Tipos de documento sustento más comunes (ampliable) */
export const SRI_TIPO_DOC_SUSTENTO: OpcionSri[] = [
  { codigo: '01', descripcion: 'Factura' },
  { codigo: '03', descripcion: 'Liquidación de compra de bienes o prestación de servicios' },
  { codigo: '04', descripcion: 'Nota de crédito' },
  { codigo: '05', descripcion: 'Nota de débito' },
  { codigo: '08', descripcion: 'Entradas a espectáculos públicos' },
  { codigo: '09', descripcion: 'Tiquetes de máquinas registradoras' },
  { codigo: '11', descripcion: 'Pasajes expedidos por empresas de aviación' },
  { codigo: '12', descripcion: 'Documentos emitidos por instituciones financieras' },
  { codigo: '20', descripcion: 'Documentos emitidos por entidades del Estado' },
  { codigo: '21', descripcion: 'Carta de porte aéreo' },
  { codigo: '41', descripcion: 'Comprobante de venta emitido por reembolso' },
];

/** Tarifas de IVA vigentes para el combo del diálogo */
export const TARIFAS_IVA: number[] = [15, 12, 8, 5];
```

### 3.3 Servicio — `src/app/modules/cxp/service/reembolso-factura-compra.service.ts`

Copiar EXACTAMENTE la estructura de `detalle-factura-compra.service.ts` (mismo `handleError`,
métodos `getAll/getById/add/update/delete/selectByCriteria`) con tipo `ReembolsoFacturaCompra` y
constante `ServiciosCxp.RS_RMBF`, con dos diferencias:

- `delete(id)` llama `DELETE ${ServiciosCxp.RS_RMBF}/${id}`.
- Agregar:

```typescript
  /** Reembolsos ACTIVOS de una factura, ordenados por id (endpoint dedicado del backend). */
  getByFactura(idFactura: number): Observable<ReembolsoFacturaCompra[] | null> {
    return this.http
      .get<ReembolsoFacturaCompra[]>(`${ServiciosCxp.RS_RMBF}/getByFactura/${idFactura}`)
      .pipe(catchError(this.handleError));
  }
```

### 3.4 Diálogo de subida de XML — `src/app/modules/cxp/forms/procesos/dialogs/subir-xml-dialog/`

**Solo se usa desde Gestión de Documentos.** Diálogo nuevo (`.ts`, `.html`, `.scss`) que
reemplaza la apertura directa del `<input type="file">`. Patrón de referencia: `adendum-dialog`
(`src/app/modules/cxp/forms/negociaciones/dialogs/adendum-dialog/`).

```typescript
export interface SubirXmlDialogData {
  documento: DocumentoCxp;   // contexto: serie, emisor, tipo, y d.esReembolso para precargar
}
export interface SubirXmlDialogResult {
  file: File;
  esReembolso: boolean;
}
```

Contenido:
- Caja de contexto read-only: `serieComprobante`, `razonSocialEmisor`, `tipoComprobante`,
  `importeTotal` (estilo `cuota-info-box`/`info-row` de `pago-dialog`).
- Botón "Seleccionar archivo XML" que dispara un `<input type="file" accept=".xml,.XML">` oculto;
  mostrar el nombre elegido.
- `<mat-checkbox [(ngModel)]="esReembolso">Es factura de reembolso de gastos</mat-checkbox>`,
  **inicializado con `data.documento.esReembolso === 1`** (pudo marcarse antes desde la bandeja).
  Hint: *"Si el XML incluye el bloque de reembolsos del SRI se leerá automáticamente; si no,
  podrá registrar los documentos sustento manualmente y luego contabilizar."*
  (Verificar que `MatCheckboxModule` esté en `MaterialFormModule`; si no, importarlo directo.)
- **Autodetección UX:** al seleccionar archivo, `FileReader.readAsText(file, 'UTF-8')`; si el
  contenido incluye `'<reembolsoDetalle>'` o `'<codDocReembolso>'`, auto-marcar el checkbox
  (editable) con hint "Se detectó bloque de reembolsos en el XML".
- Acciones: "Cancelar" (`ref.close(null)`) / "Subir XML" (deshabilitado sin archivo,
  `ref.close({file, esReembolso})`).

### 3.5 Diálogo CRUD de sustento — `src/app/modules/cxp/forms/procesos/dialogs/reembolso-dialog/`

Crear/editar un documento sustento, calcado de `adendum-dialog` (alta si `data.reembolso === null`;
cierra con `boolean`).

```typescript
export interface ReembolsoDialogData {
  idFacturaCompra: number;
  reembolso: ReembolsoFacturaCompra | null;  // null = alta
  idUsuario: number;
  idEmpresa: number;
}
```

Campos (usar `mat-form-field appearance="outline"` en `.form-grid` de 2 columnas; combos con las
constantes de §3.2):

| Campo | Control | Validación |
|---|---|---|
| Tipo identificación proveedor | `mat-select` `SRI_TIPO_IDENTIFICACION` | requerido |
| Identificación proveedor | input text | requerido; tipo 04 → 13 dígitos, tipo 05 → 10 |
| Tipo proveedor | `mat-select` `SRI_TIPO_PROVEEDOR_REEMBOLSO` | requerido |
| País de pago | input text, default `'593'` | 3 caracteres |
| Tipo doc. sustento | `mat-select` `SRI_TIPO_DOC_SUSTENTO` | requerido, default `'01'` |
| Establecimiento / Pto. emisión / Secuencial | 3 inputs (maxlength 3/3/9, solo dígitos) | requeridos para codDoc 01/03/04/05; opcionales para el resto |
| Fecha emisión | datepicker (patrón `pago-dialog`: `[matDatepicker]` + captura raw + blur sync) | requerida |
| Nro. autorización / clave acceso | input text maxlength 49 | opcional |
| **Producto (contabilización)** | ver bloque abajo | **requerido** |
| Base imponible 0% | input number step 0.01 | >= 0 |
| Base imponible gravada | input number step 0.01 | >= 0 |
| Tarifa IVA | `mat-select` `TARIFAS_IVA` | requerida si base gravada > 0 |
| Valor IVA | input number, autocalculado = baseGravada × tarifa/100 al cambiar cualquiera de los dos, editable, redondeado a 2 decimales | >= 0 |
| Valor ICE | input number step 0.01, default 0 | >= 0 |
| Total | read-only calculado = base0 + baseGravada + IVA + ICE | > 0 para guardar |
| Observación | textarea rows 2 | opcional |

**Bloque Producto** (el backend contabiliza por el grupo del producto de cada sustento):
- Combo con búsqueda sobre los productos existentes: cargar con `ProductoPagoService.getAll()`
  (endpoint `ServiciosCxp.RS_PRDP`; si no existe el servicio, crearlo con el patrón estándar).
  **Regla de la casa:** el filtro de búsqueda debe matchear por al menos 2 campos —
  `nombre` y `codigo` (`p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)`).
- Debajo, link/botón "Crear producto POR CLASIFICAR": pide solo el nombre (prellenar con
  `REEMBOLSO {identificación ingresada}` y código = identificación) y llama
  `cargaDocumentosService.crearProductoPorClasificar(nombre, codigo, idEmpresa)`; al responder,
  selecciona el producto creado en el combo y muestra snackbar
  "Producto creado en POR CLASIFICAR — recuerde clasificarlo antes de contabilizar".
- En edición de una fila origen XML, el producto viene asignado; mostrarlo y permitir cambiarlo.

`guardar()` (payload; el resto del método igual a `adendum-dialog`):

```typescript
const payload: Partial<ReembolsoFacturaCompra> = {
  ...(this.form.id ? { id: this.form.id, origen: this.data.reembolso!.origen } : { origen: 2 }),
  factura: { id: this.data.idFacturaCompra } as any,
  tipoIdentificacionProveedor: this.form.tipoIdentificacion,
  identificacionProveedor: this.form.identificacion.trim(),
  codPaisPago: this.form.codPais || '593',
  tipoProveedor: this.form.tipoProveedor,
  codDoc: this.form.codDoc,
  establecimiento: this.form.establecimiento,
  puntoEmision: this.form.puntoEmision,
  secuencial: this.form.secuencial,
  fechaEmision: this.toISO(this.fechaControl.value),   // 'YYYY-MM-DD'
  numeroAutorizacion: this.form.numeroAutorizacion || undefined,
  baseImponibleCero: Number(this.form.baseCero) || 0,
  baseImponibleGravada: Number(this.form.baseGravada) || 0,
  tarifaIva: this.form.baseGravada > 0 ? Number(this.form.tarifaIva) : (null as any),
  valorIva: Number(this.form.valorIva) || 0,
  valorIce: Number(this.form.valorIce) || 0,
  total: this.totalCalculado,
  producto: this.form.idProducto,        // requerido
  estado: 1,
};
```

### 3.6 Sección de sustentos reutilizable — `src/app/modules/cxp/forms/procesos/reembolsos-factura/`

Componente standalone `ReembolsosFacturaComponent` (selector `app-reembolsos-factura`):

```typescript
@Input({ required: true }) idFacturaCompra!: number;
@Input() editable = true;              // false = solo lectura (consulta-documentos)
@Input() contabilizacionPendiente = false; // true → mostrar botón Contabilizar
@Input() idUsuario = 1;
@Input() idEmpresa = 1;
@Output() contabilizado = new EventEmitter<void>();  // para que el padre recargue
```

Comportamiento:
- Al iniciar/cambiar inputs: `reembolsoService.getByFactura(idFacturaCompra)` y (si `editable`)
  `cargaDocumentosService.recalcularTotalesReembolso(idFacturaCompra)` para el chip de cuadratura.
- Tabla `MatTableDataSource<ReembolsoFacturaCompra>` con columnas:
  `['identificacionProveedor', 'codDoc', 'documento', 'fechaEmision', 'producto',
  'baseImponibleCero', 'baseImponibleGravada', 'valorIva', 'valorIce', 'total', 'origen',
  'acciones']`
  - `documento` = `{{ r.establecimiento }}-{{ r.puntoEmision }}-{{ r.secuencial }}` (font-mono).
  - `producto`: mostrar nombre (resolver contra la lista de `ProductoPago` cargada una vez;
    si el nombre empieza con "REEMBOLSO" y su grupo es POR CLASIFICAR, mostrar badge ámbar
    "POR CLASIFICAR" si esa info está disponible en el modelo; si no, omitir el badge).
  - `origen`: badge "XML" / "MANUAL" (clases `.badge` del módulo).
  - `fechaEmision` con el helper `toDate()` (puede llegar como array desde el backend).
  - `acciones` (solo `editable`): editar (abre `ReembolsoDialogComponent`) y eliminar
    (`confirm(...)` → `reembolsoService.delete(id)`).
- Fila/bloque de totales: suma de bases, IVA, ICE y total.
- **Chip de cuadratura** (de `recalcularTotalesReembolso`): verde si `cuadra`, ámbar con la
  `diferencia` si no. Recordar que la cuadratura ES bloqueante para contabilizar.
- Botón "Agregar documento" (solo `editable`) → diálogo en modo alta.
- **Tras cada alta/edición/borrado: llamar SIEMPRE `recalcularTotalesReembolso`** (persiste los
  totales en la cabecera — obligatorio, no opcional) y recargar la lista.
- **Botón "Contabilizar"** (si `contabilizacionPendiente && editable`):
  `cargaDocumentosService.contabilizarReembolso(idFacturaCompra, idEmpresa, idUsuario)`;
  éxito → snackbar "Factura contabilizada" + `contabilizado.emit()`;
  422 → mostrar `error` del cuerpo y, si trae `bloqueantes`, listarlos (reusar el estilo del
  diálogo de bloqueantes de `gestion-documentos`).

---

## 4. Archivos MODIFICADOS

### 4.1 `src/app/modules/cxp/service/ws-cxp.ts`

```typescript
  public static RS_RMBF = `${API_URL}/rmbf`; // ReembolsoFacturaCompra (reembolso de gastos)
```

### 4.2 `src/app/modules/cxp/service/carga-documentos.service.ts`

1. El método que sube el XML (`procesarXml` — el endpoint principal del backend es
   `POST /carga-documentos/procesarXml/{id}`; si las pantallas usan `cargarXml`, aplicar a ese)
   acepta y propaga `esReembolso`:

```typescript
  procesarXml(idDocumentoCxp: number, payload: { contenidoXml: string; idEmpresa: number;
      idUsuario: number; esReembolso?: number }): Observable<any> {
    return this.http.post(`${this.PROCESS_URL}/procesarXml/${idDocumentoCxp}`, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }
```

2. Métodos nuevos:

```typescript
  marcarReembolso(idDocumentoCxp: number, esReembolso: boolean, idUsuario: number): Observable<any> {
    return this.http.post(`${this.PROCESS_URL}/marcarReembolso/${idDocumentoCxp}`,
      { esReembolso: esReembolso ? 1 : 0, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  contabilizarReembolso(idFacturaCompra: number, idEmpresa: number, idUsuario: number): Observable<any> {
    return this.http.post(`${this.PROCESS_URL}/contabilizarReembolso/${idFacturaCompra}`,
      { idEmpresa, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  recalcularTotalesReembolso(idFacturaCompra: number): Observable<CuadraturaReembolso | null> {
    return this.http.post<CuadraturaReembolso>(
      `${this.PROCESS_URL}/recalcularTotalesReembolso/${idFacturaCompra}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  crearProductoPorClasificar(nombre: string, codigo: string | null, idEmpresa: number): Observable<any> {
    return this.http.post(`${this.PROCESS_URL}/crearProductoPorClasificar`,
      { nombre, codigo, idEmpresa }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }
```

> Los 422 de este servicio traen cuerpo útil (`error`, `bloqueantes`, `advertenciaReembolso`).
> Mantener el patrón de extracción de error que ya usa `gestion-documentos`
> (`extraerMensajeError`).

### 4.3 Modelos existentes

`src/app/modules/cxp/model/factura-compra.ts` — agregar:

```typescript
  /** Reembolso de gastos: 0=No 1=Sí (SRI codDoc 41 / bloque <reembolsos>) */
  esReembolso?: number;
  codDocReembolso?: string;
  totalComprobantesReembolso?: number;
  totalBaseImponibleReembolso?: number;
  totalImpuestoReembolso?: number;
```

`src/app/modules/cxp/model/documento-cxp.ts` — agregar:

```typescript
  /** Marcado como factura de reembolso de gastos: 0=No 1=Sí */
  esReembolso?: number;
```

### 4.4 `gestion-documentos.component.ts` / `.html` — pantalla principal del cambio

`src/app/modules/cxp/forms/procesos/gestion-documentos/`

1. **Subida de XML con diálogo:** `abrirSelectorXml(d)` deja de disparar el `<input #inputXml>`
   directo y abre `SubirXmlDialogComponent` con `{documento: d}`; en `afterClosed`, si hay
   resultado: leer el archivo (mismo `FileReader.readAsText(file, 'UTF-8')` actual) y llamar al
   servicio con `esReembolso: result.esReembolso ? 1 : 0` en el payload. Aplicar lo mismo al
   flujo `resolverNovedad` REEMPLAZAR (`abrirResolverReemplazar`), que también sube XML. Eliminar
   el input oculto y su handler si nada más los usa.
2. **Marcar/desmarcar reembolso por fila:** en la columna de acciones, agregar un icon button
   `receipt_long` (tooltip "Marcar como reembolso de gastos" / "Desmarcar reembolso"), visible en
   todos los estados; color `primary` cuando `d.esReembolso === 1`. Acción:
   `confirm(...)` → `marcarReembolso(d.id, !esMarcado, idUsuario)` → recargar la lista.
   422 → snackbar con el `error` del cuerpo. Mostrar además un badge "REEMBOLSO" en la fila
   cuando `d.esReembolso === 1` (junto al tipo de comprobante, clase `.tipo-badge` o `.badge`).
3. **Respuesta del proceso XML:** si trae `advertenciaReembolso`, snackbar de advertencia
   (duración 8000). Si trae `reembolsoManualPendiente` o `contabilizacionPendiente`, snackbar con
   acción "Gestionar reembolsos" que abra el diálogo del punto 4.
4. **Diálogo "Documentos de reembolso":** acción nueva por fila (icon button `fact_check` o
   entrada del mismo menú), visible cuando `d.esReembolso === 1 &&
   d.tipoTablaDestino === 'FACTURA_COMPRA' && d.idDocumentoBD` (estados 2 o 3). Abre un
   `MatDialog` ancho (`width: '1200px', maxWidth: '98vw'`) cuyo contenido es
   `<app-reembolsos-factura [idFacturaCompra]="d.idDocumentoBD" [editable]="true"
   [contabilizacionPendiente]="d.estadoDocumento === 2" [idUsuario]="idUsuario"
   [idEmpresa]="idEmpresa" (contabilizado)="..." />`. El wrapper del diálogo puede ser un
   componente mínimo inline (patrón de los diálogos inline ya presentes en este mismo archivo,
   p.ej. `RegistroBloqueantesDialogComponent`). Al cerrarse (o al emitir `contabilizado`),
   recargar la lista para reflejar el cambio de estado 2 → 3.
5. **Panel de bloqueantes existente:** sin cambios de código, pero verificar que los productos de
   reembolso (`nombre = "REEMBOLSO {identificación}"`) aparecen y se clasifican correctamente en
   el flujo `crearProductosYRegistrar` (el backend los incluye en `productosPendientes`).

### 4.5 `bandeja-electronica.component.ts` / `.html` — solo marcar/desmarcar

`src/app/modules/cxp/forms/procesos/bandeja-electronica/`

**NO portar aquí la subida de XML ni la gestión de sustentos** (decisión del usuario: eso vive en
gestión de documentos). Cambios mínimos:

1. Agregar `'acciones'` al final de `columnasDetalle` y un `<ng-container matColumnDef="acciones">`
   con UN solo botón: el toggle de reembolso del §4.4 punto 2 (mismo icono, tooltip y confirm),
   operando sobre `d.documento.id` (las filas aquí son `DetalleCargaTxt`; el documento es
   `d.documento`). Tras la respuesta, recargar el detalle (`recargarDetalle()` o equivalente).
2. Badge "REEMBOLSO" en la fila cuando `d.documento.esReembolso === 1` (por ejemplo junto a
   `tipoComprobante`).
3. No tocar los handlers muertos existentes (`abrirSelectorXml`, `subirXml`, etc.) — quedan como
   están.

### 4.6 `consulta-documentos.component.ts` / `.html` — solo lectura

En el `case 'FACTURA_COMPRA'` de `verDetalle()`: si `cab?.esReembolso === 1`, mostrar badge
"REEMBOLSO DE GASTOS" en el encabezado y, debajo del detalle y formas de pago, la sección
`<app-reembolsos-factura [idFacturaCompra]="cab.id" [editable]="false" />` con título
"Documentos de reembolso". Sin acciones de edición ni botón contabilizar aquí.

---

## 5. Orden de implementación sugerido

1. Modelos (§3.1, §3.2, §4.3) + constante `RS_RMBF` (§4.1).
2. `ReembolsoFacturaCompraService` (§3.3) + métodos nuevos de `CargaDocumentosService` (§4.2)
   (+ `ProductoPagoService` si no existe).
3. `ReembolsoDialogComponent` (§3.5) y `ReembolsosFacturaComponent` (§3.6).
4. Gestión de documentos (§4.4) — el grueso del cambio.
5. Bandeja electrónica (§4.5) y consulta de documentos (§4.6).

## 6. Criterios de aceptación

1. Subir XML CON `<reembolsos>` desde gestión de documentos → si sus productos ya están
   clasificados, el documento queda en estado 3; el diálogo de reembolsos muestra los sustentos
   origen XML con producto, y el chip de cuadratura verde.
2. Subir XML CON `<reembolsos>` con proveedores de gasto nuevos → aparece el panel de
   clasificación existente con los productos "REEMBOLSO ..."; al clasificar y reintentar, se
   registra y contabiliza.
3. Subir XML SIN `<reembolsos>` marcando el checkbox → snackbar con acción; el documento queda en
   estado 2 con badge REEMBOLSO; el diálogo permite agregar sustentos (con producto), el chip se
   actualiza tras cada cambio, y "Contabilizar" pasa el documento a estado 3 solo cuando todos
   los productos están clasificados y la suma cuadra (si no, muestra el 422 con el motivo).
4. Marcar reembolso desde la bandeja un documento en estado 1 → al subir después el XML en
   gestión, el checkbox del diálogo aparece pre-marcado.
5. Marcar reembolso una factura ya registrada → pasa a estado 2 pendiente de sustentos (el
   backend anula el asiento); con pagos aplicados, muestra el 422.
6. Desmarcar con sustentos activos → 422 con mensaje; sin sustentos → vuelve a la normalidad
   (el backend regenera el asiento si corresponde).
7. Una factura normal no muestra nada nuevo salvo el toggle de marcado.
8. Consulta de documentos muestra los sustentos en solo lectura.

## 7. Notas y trampas conocidas del proyecto

- `selectByCriteria` espera `DatosBusqueda[]`, nunca un objeto plano
  (`docs/transversal/guia-selectByCriteria.md`) — aquí se evita usando `getByFactura`.
- Fechas del backend pueden llegar como array `[y,m,d,...]` — usar el helper `toDate()` de los
  componentes de procesos (o `FuncionesDatosService`).
- `handleError` de los servicios CXP convierte status 200 vacío en `of(null)` — mantenerlo.
- No tocar `app.routes.ts` ni menús: no hay pantalla nueva.
- La cuadratura es **bloqueante para contabilizar** pero no para guardar sustentos: dejar guardar
  aunque no cuadre y reflejarlo solo en el chip.
- Otro equipo trabaja en RRHH/CNT: limitar los cambios a los archivos listados.
