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
| `'select'` | Combo desplegable (requiere `options: []`) |
| `'date'` | Selector de fecha |
| `'checkbox'` | Booleano |

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

**Última actualización:** Marzo 2026
