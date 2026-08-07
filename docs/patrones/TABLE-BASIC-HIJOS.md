# Guía: Agregar una Nueva Entidad CRUD con `TableBasicHijosComponent`

Esta guía explica el flujo completo para registrar una nueva entidad de catálogo en el sistema CRD y hacerla funcionar con el componente `app-table-basic-hijos`.

---

## Arquitectura del Flujo

```
TableBasicHijosComponent
  └─► ServiceLocatorService.ejecutaServicio(entidad, datos, accion)
        └─► isEntidadCrd(entidad)  ← ⚠️ PASO CRÍTICO (allowlist)
              └─► ServiceLocatorCrdService.ejecutaServicio(...)
                    └─► MiNuevoService.add() / update() / delete()

  Después de cada operación:
  └─► ServiceLocatorService.recargarValores(entidad)
        └─► ServiceLocatorCrdService.recargarValores(...)
              └─► MiNuevoService.getAll()  ← Refresca la tabla
```

**Si la entidad NO está en `isEntidadCrd()`, todas las operaciones CRUD caen al `default` y se ignoran silenciosamente.**

---

## Checklist Completo (5 pasos)

### 1. Modelo (`modules/crd/model/`)

```typescript
// mi-entidad.ts
export interface MiEntidad {
  codigo: number;   // PK
  nombre: string;
  estado: number;   // 1 = activo, 0 = inactivo
  // ...otros campos
}
```

### 2. Endpoint (`modules/crd/service/ws-crd.ts`)

```typescript
export class ServiciosCrd {
  // ...existentes...
  public static RS_MIEN = `${API_URL}/mien`;   // ← Añadir
}
```

### 3. ID de Entidad (`modules/crd/model/entidades-crd.ts`)

```typescript
export class EntidadesCrd {
  // ...existentes...
  public static readonly MI_ENTIDAD = 468;   // ← Añadir (siguiente número disponible)
}
```

### 4. Servicio (`modules/crd/service/mi-entidad.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class MiEntidadService {
  private apiUrl = ServiciosCrd.RS_MIEN;

  constructor(private http: HttpClient) {}

  getAll(): Observable<MiEntidad[]> {
    return this.http.get<MiEntidad[]>(`${this.apiUrl}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<MiEntidad> {
    return this.http.get<MiEntidad>(`${this.apiUrl}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(reg: MiEntidad): Observable<MiEntidad> {
    return this.http.post<MiEntidad>(`${this.apiUrl}/add`, reg)
      .pipe(catchError(this.handleError));
  }

  update(reg: MiEntidad): Observable<MiEntidad> {
    return this.http.put<MiEntidad>(`${this.apiUrl}/update`, reg)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
```

### 5. Registrar en los 3 service-locators ⚠️

Hay que actualizar **3 archivos** obligatoriamente:

#### 5a. `service-locator-crd.service.ts` — lógica CRUD

```typescript
// 1. Imports
import { MiEntidadService } from '../../../modules/crd/service/mi-entidad.service';
import { MiEntidad } from '../../../modules/crd/model/mi-entidad';

// 2. Constructor
constructor(
  // ...existentes...
  public miEntidadService: MiEntidadService,
) {}

// 3. En ejecutaServicio() — añadir case antes del bloque ENTIDADES PRINCIPALES
case EntidadesCrd.MI_ENTIDAD: {
  switch (proceso) {
    case AccionesGrid.ADD: {
      this.reg = value as MiEntidad;
      this.reg.estado = 1;
      return firstValueFrom(this.miEntidadService.add(this.reg));
    }
    case AccionesGrid.EDIT: {
      this.reg = value as MiEntidad;
      return firstValueFrom(this.miEntidadService.update(this.reg));
    }
    case AccionesGrid.REMOVE: {
      return firstValueFrom(this.miEntidadService.delete(value));
    }
    default: return Promise.resolve(undefined);
  }
}

// 4. En recargarValores() — añadir case
case EntidadesCrd.MI_ENTIDAD: {
  return firstValueFrom(this.miEntidadService.getAll());
}
```

#### 5b. `service-locator.service.ts` — allowlist de enrutamiento ⚠️ CRÍTICO

```typescript
private isEntidadCrd(entidad: number): boolean {
  const entidadesCrd = [
    // ...existentes...
    EntidadesCrd.MI_ENTIDAD,   // ← AÑADIR AQUÍ O EL CRUD NO FUNCIONA
  ];
  return entidadesCrd.includes(entidad);
}
```

**Este es el paso que se olvida con más frecuencia.** Si la entidad no está en este array, `TableBasicHijosComponent` llamará a `ejecutaServicio()` pero el switch caerá en `default` y la operación se ignorará sin error visible.

---

## Campos que leen de Rubros (nomenclatura especial)

### Columna de visualización: `R_<codigoAlterno>_<campo>`

La tabla detecta automáticamente columnas con este patrón y llama a `getDescripcionByParentAndAlterno()`.

```typescript
fields: [
  // Muestra la descripción del rubro con codigoAlterno=24,
  // usando el valor de row.rubroTipoBancoH como código del detalle
  { column: 'R_24_rubroTipoBancoH', header: 'Tipo de Banco', fWidth: '30%' },
]
```

- `R` → prefijo (convención)
- `24` → `codigoAlterno` del rubro padre
- `rubroTipoBancoH` → campo del registro que contiene el `codigoAlterno` del `DetalleRubro`

> **⚠️ Restricción:** el campo (`rubroTipoBancoH`) **no debe contener guiones bajos** (`_`) ya que la tabla separa por `_`.

### Campo de formulario: `type: 'autocomplete'` + `rubroAlterno`

Para que el diálogo ADD/EDIT cargue las opciones desde el rubro automáticamente:

```typescript
regConfig: [
  {
    type: 'autocomplete',
    label: 'Tipo de Banco',
    name: 'rubroTipoBancoH',   // nombre del campo en el modelo
    rubroAlterno: 24,           // codigoAlterno del rubro padre
    autocompleteType: 1,
  },
]
```

El autocomplete carga las opciones llamando a `getDetallesByParent(24)` y guarda el `codigoAlterno` del `DetalleRubro` seleccionado en `rubroTipoBancoH`.

---



---

## Uso en Componente (Pantalla de Parametrización)

### Resolver (opcional pero recomendado para precarga)

```typescript
// mi-modulo-resolver.service.ts
export interface MiModuloData {
  misEntidades: MiEntidad[] | null;
}

@Injectable({ providedIn: 'root' })
export class MiModuloResolverService implements Resolve<MiModuloData> {
  constructor(private miEntidadService: MiEntidadService) {}

  resolve(): Observable<MiModuloData> {
    return forkJoin({
      misEntidades: this.miEntidadService.getAll().pipe(
        catchError(() => of(null))
      ),
    });
  }
}
```

### Carga en `ngOnInit` con `selectByCriteria` (alternativa sin resolver)

Cuando la entidad pertenece a una empresa (tiene campo `empresa`) se debe filtrar
por la empresa logueada en lugar de usar un resolver.

**⚠️ `selectByCriteria` requiere siempre un array de `DatosBusqueda[]`, nunca objetos planos.**

```typescript
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

// Leer empresa del localStorage (clave estándar del proyecto)
private getEmpresaCodigo(): number | null {
  const raw = localStorage.getItem('idEmpresa');
  return raw ? parseInt(raw, 10) : null;
}

// Llamar en ngOnInit:
ngOnInit(): void {
  this.cargarDatos();
}

private cargarDatos(): void {
  const empresaCodigo = this.getEmpresaCodigo();
  const criterios: DatosBusqueda[] = [];

  if (empresaCodigo) {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',        // nombre de la relación en la entidad JPA
      'codigo',         // campo del objeto padre
      empresaCodigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);
  }

  // Ordenamiento (opcional)
  const orden = new DatosBusqueda();
  orden.orderBy('nombre');
  criterios.push(orden);

  this.miEntidadService.selectByCriteria(criterios).subscribe({
    next: (data) => {
      const registros = Array.isArray(data) ? data : [];
      this.setupTableConfig(registros);        // pasar los datos al tableConfig
    },
    error: () => this.setupTableConfig([]),
  });
}
```

**Reglas clave:**
- Usar `localStorage.getItem('idEmpresa')` (clave estándar del proyecto).
- **Nunca** pasar objetos planos: `selectByCriteria({ empresa: { codigo } })` es **incorrecto**.
- Para JOINs (campos de entidades relacionadas) usar `asignaValorConCampoPadre()`.
- Pasar los datos precargados a `registros` del `TableConfig`.

### Componente TS

```typescript
export class MiPantallaComponent implements OnInit {
  misEntidades: MiEntidad[] = [];
  tableConfigMiEntidad!: TableConfig;

  ngOnInit(): void {
    const data = this.route.snapshot.data['misEntidades'] as MiModuloData;
    this.misEntidades = data.misEntidades || [];
    this.setupTableConfigs();
  }

  private setupTableConfigs(): void {
    this.tableConfigMiEntidad = {
      entidad: EntidadesCrd.MI_ENTIDAD,
      titulo: 'Mis Entidades',
      registros: this.misEntidades,
      fields: [
        { column: 'nombre', header: 'Nombre', fWidth: '60%' },
        { column: 'estado', header: 'Estado', fWidth: '40%' },
      ],
      regConfig: [
        {
          type: 'input',
          label: 'Nombre',
          name: 'nombre',
          inputType: 'text',
          validations: [
            { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
          ]
        }
      ],
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const esExito = errorData.codigoHttp && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      duration: esExito ? 4000 : 8000,
      panelClass: [esExito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
```

### Template HTML

```html
<app-table-basic-hijos
  *ngIf="tableConfigMiEntidad"
  [configTable]="tableConfigMiEntidad"
  (emiteError)="onTableError($event)">
</app-table-basic-hijos>
```

---

## Opciones Clave de `TableConfig`

| Propiedad | Tipo | Descripción |
|---|---|---|
| `entidad` | `number` | ID en `EntidadesCrd` — enruta al servicio correcto |
| `registros` | `any[]` | Datos iniciales cargados por el resolver |
| `fields` | `FieldFormat[]` | Columnas visibles: `column`, `header`, `fWidth` |
| `regConfig` | `FieldConfig[]` | Campos del formulario ADD/EDIT |
| `add/edit/remove` | `boolean` | Botones de acción habilitados |
| `paginator` | `boolean` | Activar paginación (default: `true`) |
| `filter` | `boolean` | Activar búsqueda (default: `true`) |
| `fSize` | `string` | Tamaño de letra: `'em-1'`, `'em-08'` |
| `row_size` | `string` | Altura de fila: `'s08'`, `'s10'` |
| `es_hijo` | `boolean` | Es tabla hija de otra entidad |
| `campo_padre` | `string` | Campo FK que apunta al padre |
| `reg_padre` | `any` | Registro padre seleccionado |
| `onDataUpdate` | `Function` | Callback para transformar datos al recargar |

---

## Tipos de Campo para `regConfig`

| `type` | Uso |
|---|---|
| `'input'` | Texto o número (`inputType: 'text'/'number'`) |
| `'select'` | Combo desplegable estático (requiere `collections: []`) |
| `'autocomplete'` | Combo con búsqueda (requiere `collections` o `rubroAlterno`) |
| `'date'` | Selector de fecha |
| `'checkbox'` | Booleano |

---

## 🎯 Guía Completa de Combos (Select y Autocomplete)

### 📌 Diferencias entre Select y Autocomplete

| Característica | `select` | `autocomplete` |
|---|---|---|
| **Uso principal** | Pocas opciones estáticas (2-10) | Muchas opciones o búsqueda necesaria |
| **Búsqueda** | ❌ No | ✅ Sí (filtra al escribir) |
| **Formato datos** | `codigo` + `descripcion` | `codigo`/`codigoAlterno` + campo libre |
| **Rubros automáticos** | ❌ No | ✅ Sí (con `rubroAlterno`) |

---

### 1️⃣ Campo SELECT (Opciones Estáticas)

Usado para opciones fijas como Estado (Activo/Inactivo), Sí/No, etc.

#### Configuración Básica

```typescript
regConfig: [
  {
    type: 'select',
    label: 'Estado',
    name: 'estado',
    value: 1,                    // ← Valor por defecto (opcional)
    autocompleteType: 1,         // ← REQUERIDO (tipo simple, sin dependencias)
    selectField: ['descripcion'], // ← Campo(s) a mostrar
    collections: [
      { codigo: 1, descripcion: 'Activo' },
      { codigo: 0, descripcion: 'Inactivo' },
    ],
  },
]
```

#### ⚠️ Formato Obligatorio de Collections

**✅ CORRECTO:**
```typescript
collections: [
  { codigo: 1, descripcion: 'Activo' },   // 'codigo' y 'descripcion'
  { codigo: 0, descripcion: 'Inactivo' }
]
```

**❌ INCORRECTO (formato antiguo):**
```typescript
options: [
  { key: 1, value: 'Activo' },    // NO usar 'key'/'value'
  { key: 0, value: 'Inactivo' }
]
```

#### Valores por Defecto

```typescript
{
  type: 'select',
  name: 'estado',
  value: 1,           // ← Se preselecciona "Activo" en ADD
  collections: [ ... ]
}
```

#### Extracción de Código en `onBeforeSave`

Los selects devuelven el **objeto completo**, necesitas extraer solo el `codigo`:

```typescript
onBeforeSave: (datos: any) => {
  const extraerCodigo = (valor: any): any => {
    if (valor === null || valor === undefined) return null;
    // Extraer 'codigo' si es objeto
    return typeof valor === 'object' && valor.codigo !== undefined 
      ? valor.codigo 
      : valor;
  };

  return {
    ...datos,
    estado: extraerCodigo(datos.estado),
    conciliaDescuadre: extraerCodigo(datos.conciliaDescuadre),
  };
}
```

#### Mostrar Etiquetas en la Tabla

Transformar códigos numéricos a etiquetas legibles:

```typescript
// En TableConfig
fields: [
  { column: 'estadoLabel', header: 'Estado', fWidth: '20%' }  // ← columna con label
],

onDataUpdate: (data: any[]) => {
  return data.map((row) => ({
    ...row,
    estadoLabel: row.estado === 1 ? 'Activo' : 'Inactivo',  // ← transformación
  }));
}
```

---

### 2️⃣ Campo AUTOCOMPLETE (Búsqueda Dinámica)

Usado para listas grandes o datos de rubros (catálogos del sistema).

#### Tipo 1: Autocomplete Simple (con Rubros)

El caso más común: cargar opciones desde un **Rubro** (ej: tipos de banco, tipos de cuenta).

```typescript
regConfig: [
  {
    type: 'autocomplete',
    label: 'Tipo de Banco',
    name: 'rubroTipoBancoH',        // ← Campo del modelo
    autocompleteType: 1,             // ← Tipo simple (sin padre)
    rubroAlterno: 24,                // ← ID del rubro (codigoAlterno del Rubro)
    selectField: ['descripcion'],    // ← Campo(s) a mostrar
  },
]
```

**Cómo funciona:**
1. `AutocompleteComponent` detecta `rubroAlterno: 24`
2. Llama automáticamente a `detalleRubroService.getDetallesByParent(24)`
3. Carga las opciones desde `DetalleRubro[]`
4. El usuario selecciona → guarda el **`codigoAlterno`** del `DetalleRubro`

#### Tipo 2: Autocomplete con Collections Manuales

Si las opciones NO vienen de un rubro:

```typescript
{
  type: 'autocomplete',
  label: 'Cliente',
  name: 'cliente',
  autocompleteType: 1,
  selectField: ['nombre', 'identificacion'],  // Muestra "Juan Pérez - 1234567890"
  collections: this.listaClientes,             // Cargada en ngOnInit
}
```

#### Tipo 3: Autocomplete Dependiente (Padre-Hijo)

Para combos donde las opciones dependen de otro combo:

```typescript
// Combo padre
{
  type: 'autocomplete',
  label: 'Provincia',
  name: 'provincia',
  autocompleteType: 1,
  selectField: ['nombre'],
  collections: this.provincias,
}

// Combo hijo (se filtra según provincia seleccionada)
{
  type: 'autocomplete',
  label: 'Ciudad',
  name: 'ciudad',
  autocompleteType: 2,              // ← Tipo dependiente
  filterFather: 'provincia',        // ← Campo de relación en el objeto
  selectField: ['nombre'],
  collections: this.ciudades,       // Todas las ciudades
}
```

#### Extracción de Código en `onBeforeSave` (Rubros)

Los autocomplete con rubros devuelven objetos con `codigoAlterno`:

```typescript
onBeforeSave: (datos: any) => {
  const extraerCodigo = (valor: any): any => {
    if (valor === null || valor === undefined) return null;
    
    // Selects normales usan 'codigo'
    if (typeof valor === 'object' && valor.codigo !== undefined) {
      return valor.codigo;
    }
    // Autocomplete de rubros usan 'codigoAlterno'
    if (typeof valor === 'object' && valor.codigoAlterno !== undefined) {
      return valor.codigoAlterno;
    }
    return valor;
  };

  return {
    ...datos,
    rubroTipoBancoH: extraerCodigo(datos.rubroTipoBancoH),
    estado: extraerCodigo(datos.estado),
  };
}
```

#### Mostrar Descripción de Rubro en la Tabla

Usar la nomenclatura `R_<codigoAlterno>_<campo>`:

```typescript
fields: [
  { 
    column: 'R_24_rubroTipoBancoH',   // R_<rubroPadre>_<campoModelo>
    header: 'Tipo de Banco', 
    fWidth: '30%' 
  }
]
```

La tabla automáticamente llama a:
```typescript
detalleRubroService.getDescripcionByParentAndAlterno(24, row.rubroTipoBancoH)
```

---

### 📋 Ejemplo Completo: Entidad Banco

#### 1. Modelo

```typescript
export interface Banco {
  codigo: number;
  nombre: string;
  sigla: string;
  rubroTipoBancoH: number;      // ← codigoAlterno del DetalleRubro (rubro 24)
  conciliaDescuadre: number;     // ← 0 o 1
  estado: number;                // ← 0 o 1
  empresa: number;
}
```

#### 2. TableConfig

```typescript
private setupTableConfig(registros: Banco[]): void {
  this.tableConfig = {
    entidad: EntidadesTesoreria.BANCO,
    titulo: 'Bancos',
    registros,
    
    // Columnas visibles
    fields: [
      { column: 'nombre', header: 'Descripción', fWidth: '30%' },
      { column: 'R_24_rubroTipoBancoH', header: 'Tipo', fWidth: '25%' },  // ← Rubro
      { column: 'conciliaLabel', header: 'Permite Descuadre', fWidth: '20%' },
      { column: 'estadoLabel', header: 'Estado', fWidth: '15%' },
    ],
    
    // Campos del formulario
    regConfig: [
      {
        type: 'input',
        label: 'Descripción',
        name: 'nombre',
        inputType: 'text',
        transformToUppercase: true,
        validations: [
          { name: 'required', validator: Validators.required, message: 'Requerido' }
        ],
      },
      {
        type: 'autocomplete',           // ← Autocomplete con rubro
        label: 'Tipo de Banco',
        name: 'rubroTipoBancoH',
        autocompleteType: 1,
        rubroAlterno: 24,               // ← Rubro de tipos de banco
        selectField: ['descripcion'],
      },
      {
        type: 'select',                 // ← Select estático
        label: 'Concilia Descuadre',
        name: 'conciliaDescuadre',
        value: 0,                       // ← Default: No
        autocompleteType: 1,
        selectField: ['descripcion'],
        collections: [
          { codigo: 1, descripcion: 'Sí' },
          { codigo: 0, descripcion: 'No' },
        ],
      },
      {
        type: 'select',
        label: 'Estado',
        name: 'estado',
        value: 1,                       // ← Default: Activo
        autocompleteType: 1,
        selectField: ['descripcion'],
        collections: [
          { codigo: 1, descripcion: 'Activo' },
          { codigo: 0, descripcion: 'Inactivo' },
        ],
      },
    ],
    
    add: true,
    edit: true,
    paginator: true,
    filter: true,
    
    // Transformar datos antes de enviar al backend
    onBeforeSave: (datos: any) => {
      const extraerCodigo = (valor: any): any => {
        if (!valor) return null;
        if (typeof valor === 'object' && valor.codigo !== undefined) {
          return valor.codigo;
        }
        if (typeof valor === 'object' && valor.codigoAlterno !== undefined) {
          return valor.codigoAlterno;
        }
        return valor;
      };

      return {
        ...datos,
        empresa: this.getEmpresaCodigo(),              // ← Agregar empresa
        rubroTipoBancoH: extraerCodigo(datos.rubroTipoBancoH),
        conciliaDescuadre: extraerCodigo(datos.conciliaDescuadre),
        estado: extraerCodigo(datos.estado),
      };
    },
    
    // Transformar datos para mostrar en la tabla
    onDataUpdate: (data: any[]) => {
      return data.map((row) => ({
        ...row,
        conciliaLabel: row.conciliaDescuadre ? 'Sí' : 'No',
        estadoLabel: row.estado === 1 ? 'Activo' : 'Inactivo',
      }));
    },
  };
}
```

---

### 🔧 Solución de Problemas Comunes

#### ❌ El combo aparece vacío

**Causa:** Formato incorrecto de `collections` o falta `autocompleteType`.

**Solución:**
```typescript
{
  type: 'select',
  autocompleteType: 1,           // ← AGREGAR ESTO
  selectField: ['descripcion'],  // ← Y ESTO
  collections: [
    { codigo: 1, descripcion: 'Opción 1' }  // ← usar 'codigo', no 'key'
  ]
}
```

#### ❌ El autocomplete de rubro no carga opciones

**Causa:** Falta `collections` o `rubroAlterno` incorrecto.

**Solución:**
```typescript
{
  type: 'autocomplete',
  rubroAlterno: 24,              // ← Verificar que el rubro existe
  autocompleteType: 1,
  selectField: ['descripcion'],
  // NO necesitas 'collections' si usas rubroAlterno
}
```

#### ❌ El valor no se guarda en el backend

**Causa:** El objeto completo se envía en lugar del `codigo` o `codigoAlterno`.

**Solución:** Usar `onBeforeSave` para extraer solo el código numérico.

#### ❌ Al editar, el combo aparece vacío

**Causa:** Los valores numéricos no se convierten a objetos en el diálogo de edición.

**Solución:** El `EditTableDialogComponent` ya maneja esto automáticamente desde la última actualización. Si persiste el problema, verifica que `collections` esté presente en el campo.

---

### 📚 Referencias

- **DetalleRubroService:** Ver `.github/DETALLE-RUBROS.md`
- **Ejemplos reales:**
  - `modules/tsr/forms/bancos/bancos.component.ts` (autocomplete + select)
  - `modules/cnt/forms/parametrizacion/naturaleza-cuentas/` (autocomplete con rubros)
  - `modules/crd/forms/parametrizacion/listados-crd/` (múltiples selects)

---

## Entidades CRD Registradas (referencia rápida)

| ID | Constante | Descripción |
|---|---|---|
| 400–409 | ESTADO_PARTICIPE ... TIPO_CONTRATO | Estados y tipos base |
| 430 | PRODUCTO | Productos de crédito |
| 440 | MOTIVO_PRESTAMO | Motivos de préstamo |
| 441 | METODO_PAGO | Métodos de pago |
| 450 | NIVEL_ESTUDIO | Niveles de estudio |
| 451 | PROFESION | Profesiones |
| 466 | ESTADO_CUOTA_PRESTAMO | ✅ Estado de cuota préstamo |
| 467 | ORDEN_AFECTACION_VALOR_PRESTAMO | ✅ Orden de afectación |

Ver lista completa en `modules/crd/model/entidades-crd.ts`.

---

**Última actualización:** Junio 2026 — Agregada guía completa de combos (Select y Autocomplete)
