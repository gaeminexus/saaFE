# Análisis Arquitectónico Completo - saaFE

## 📊 Resumen Ejecutivo

Este documento consolida el análisis exhaustivo de las carpetas `crd`, `dash` y `shared`, identificando los patrones correctos de programación que deben aplicarse en todo el proyecto.

**Fecha**: Diciembre 2024  
**Framework**: Angular 20 con componentes standalone  
**Archivos analizados**: 15+ archivos clave  
**Módulos**: cnt (Contabilidad), crd (Créditos), dash (Dashboard), shared (Compartido)

---

## 🎯 PATRONES IDENTIFICADOS

### 1. Signals Angular (Estado Reactivo)

#### ✅ Ejemplo Correcto: `exters.component.ts`
```typescript
import { signal } from '@angular/core';

export class ExtersComponent {
  // Signals para estado reactivo
  loading = signal<boolean>(false);
  totalRegistros = signal<number>(0);
  errorMsg = signal<string>('');
  isScrolled = signal<boolean>(false);

  // Uso en métodos
  loadAllData(): void {
    this.loading.set(true);
    this.exterService.selectByCriteria(this.filtros).pipe(
      catchError(() => this.exterService.getAll()),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.allData = response || [];
        this.totalRegistros.set(this.allData.length);
        this.updatePageData();
      },
      error: (err) => {
        this.errorMsg.set('Error al cargar datos');
        console.error('Error:', err);
      }
    });
  }
}
```

**Ventajas**:
- Detección automática de cambios sin `ChangeDetectorRef`
- Sintaxis clara y concisa
- Performance mejorada en Angular 20+

---

### 2. ViewChild Avanzado con ElementRef

#### ✅ Ejemplo Correcto: Scroll Detection
```typescript
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

export class ExtersComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.setupScrollDetection();
  }

  setupScrollDetection(): void {
    const container = this.tableContainer.nativeElement;
    container.addEventListener('scroll', () => {
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      this.isScrolled.set(scrollTop > 100 || scrollLeft > 50);
    });
  }

  scrollToTop(): void {
    this.tableContainer.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  scrollToLeft(): void {
    this.tableContainer.nativeElement.scrollTo({
      left: 0,
      behavior: 'smooth'
    });
  }
}
```

**Template HTML**:
```html
<div class="scroll-controls" *ngIf="isScrolled()">
  <button mat-mini-fab color="primary" (click)="scrollToTop()" matTooltip="Ir arriba">
    <mat-icon>keyboard_arrow_up</mat-icon>
  </button>
  <button mat-mini-fab color="primary" (click)="scrollToLeft()" matTooltip="Ir al inicio">
    <mat-icon>keyboard_arrow_left</mat-icon>
  </button>
</div>

<div class="table-container" #tableContainer>
  <table mat-table [dataSource]="dataSource" matSort>
    <!-- ... columnas ... -->
  </table>
</div>
```

---

### 3. Servicios HTTP con Fallbacks Robustos

#### ✅ Ejemplo Correcto: `exter.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ServiciosCrd } from './ws-crd';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExterService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  // Nivel 1: Intenta getAll con /saa-backend
  // Nivel 2: Fallback sin /saa-backend
  // Nivel 3: Retorna array vacío
  getAll(): Observable<Exter[]> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCrd.RS_EXTR}${wsGetAll}`;
    const urlFallback = url.replace('/saa-backend', '');

    return this.http.get<Exter[]>(url).pipe(
      catchError(() => {
        console.warn('Fallback: Intentando sin /saa-backend');
        return this.http.get<Exter[]>(urlFallback);
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleError<Exter[]>([], error);
      })
    );
  }

  // Nivel 1: selectByCriteria con POST
  // Nivel 2: Fallback a getAll
  selectByCriteria(filtros: any): Observable<Exter[]> {
    const wsSelectByCriteria = '/selectByCriteria';
    const url = `${ServiciosCrd.RS_EXTR}${wsSelectByCriteria}`;

    return this.http.post<Exter[]>(url, filtros, this.httpOptions).pipe(
      catchError(() => {
        console.warn('Fallback: Usando getAll');
        return this.getAll();
      }),
      catchError((error: HttpErrorResponse) => {
        return this.handleError<Exter[]>([], error);
      })
    );
  }

  // ⚠️ IMPORTANTE: Particularidad del sistema
  // Algunos endpoints retornan status 200 en error
  private handleError<T>(defaultValue: T, error: HttpErrorResponse): Observable<T> {
    console.error('Error HTTP:', error);
    
    // Particularidad del backend: status 200 en error
    if (error.status === 200) {
      console.warn('Status 200 en error - Retornando null');
      return of(null as T);
    }
    
    return of(defaultValue);
  }
}
```

**Constantes de Endpoints**:
```typescript
// ws-crd.ts
export class ServiciosCrd {
  public static RS_EXTR = 'http://localhost:8080/saa-backend/rest/extr';
  public static RS_PRDC = 'http://localhost:8080/saa-backend/rest/prdc';
  public static RS_PRST = 'http://localhost:8080/saa-backend/rest/prst';
  // ... más endpoints
}
```

---

### 4. Paginación Local con Filtrado

#### ✅ Ejemplo Correcto: `exters.component.ts`
```typescript
export class ExtersComponent {
  dataSource = new MatTableDataSource<Exter>();
  allData: Exter[] = [];
  pageSize = 10;
  pageIndex = 0;
  totalRegistros = signal<number>(0);

  loadAllData(): void {
    this.loading.set(true);
    this.exterService.selectByCriteria(this.filtros).pipe(
      catchError(() => this.exterService.getAll()),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        this.allData = response || [];
        this.totalRegistros.set(this.allData.length);
        this.updatePageData(); // Actualiza página actual
      }
    });
  }

  updatePageData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    const pageData = this.allData.slice(start, end);
    this.dataSource.data = pageData;
  }

  pageChanged(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePageData();
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.pageIndex = 0; // Reset a primera página
    this.totalRegistros.set(this.dataSource.filteredData.length);
    this.updatePageData();
  }
}
```

**Template HTML**:
```html
<mat-form-field appearance="outline" class="filter-field">
  <mat-label>Buscar registros</mat-label>
  <mat-icon matPrefix>search</mat-icon>
  <input matInput (keyup)="applyFilter($any($event.target).value)" 
         placeholder="Buscar por cualquier campo..." />
  <mat-hint>Busca por cédula, nombre, correo, etc.</mat-hint>
</mat-form-field>

<mat-paginator
  [pageSize]="pageSize"
  [pageIndex]="pageIndex"
  [length]="totalRegistros()"
  [pageSizeOptions]="[10, 20, 50, 100]"
  (page)="pageChanged($event)"
  showFirstLastButtons>
</mat-paginator>
```

---

### 5. TrackBy para Optimización

#### ✅ Ejemplo Correcto: `exters.component.ts`
```typescript
export class ExtersComponent {
  trackRow(index: number, item: Exter): number {
    return item.codigo; // Usar PK única
  }
}
```

**Template HTML**:
```html
<table mat-table [dataSource]="dataSource" matSort [trackBy]="trackRow">
  <!-- ... columnas ... -->
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
```

**Beneficios**:
- Reduce re-renders innecesarios
- Mejora performance en listas grandes
- Preserva estado de elementos

---

### 6. Resolvers con forkJoin

#### ✅ Ejemplo Correcto: `estados-resolver.service.ts`
```typescript
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface EstadosData {
  estadosParticipe: EstadoParticipe[];
  estadosPrestamo: EstadoPrestamo[];
  estadosCesantia: EstadoCesantia[];
  estadosCivil: EstadoCivil[];
}

export const estadosResolver: ResolveFn<EstadosData> = () => {
  const estadoParticipeService = inject(EstadoParticipeService);
  const estadoPrestamoService = inject(EstadoPrestamoService);
  const estadoCesantiaService = inject(EstadoCesantiaService);
  const estadoCivilService = inject(EstadoCivilService);

  // Carga paralela con forkJoin
  return forkJoin({
    estadosParticipe: estadoParticipeService.getAll().pipe(
      catchError(() => of([]))
    ),
    estadosPrestamo: estadoPrestamoService.getAll().pipe(
      catchError(() => of([]))
    ),
    estadosCesantia: estadoCesantiaService.getAll().pipe(
      catchError(() => of([]))
    ),
    estadosCivil: estadoCivilService.getAll().pipe(
      catchError(() => of([]))
    )
  });
};
```

**Configuración en routes**:
```typescript
{
  path: 'estados-crd',
  component: EstadosCrdComponent,
  resolve: { estados: estadosResolver }
}
```

**Uso en componente**:
```typescript
export class EstadosCrdComponent implements OnInit {
  estadosParticipe: EstadoParticipe[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data['estados'] as EstadosData;
    this.estadosParticipe = data.estadosParticipe || [];
    this.estadosPrestamo = data.estadosPrestamo || [];
    // ... más datos
  }
}
```

---

### 7. Formateo de Fechas (FuncionesDatosService)

#### ✅ Ejemplo Correcto: `funciones-datos.service.ts`
```typescript
export enum TipoFormatoFechaBackend {
  SOLO_FECHA = 'yyyy-MM-dd',
  FECHA_HORA = 'yyyy-MM-ddTHH:mm:ss',
  FECHA_HORA_CERO = 'yyyy-MM-ddT00:00:00'
}

export interface ConfiguracionCampoFecha {
  campo: string;
  tipo: TipoFormatoFechaBackend;
}

@Injectable({
  providedIn: 'root'
})
export class FuncionesDatosService {
  
  // Para UN campo
  formatearFechaParaBackend(
    fecha: Date | string | null | undefined,
    tipoFormato: TipoFormatoFechaBackend = TipoFormatoFechaBackend.FECHA_HORA
  ): string | null {
    if (!fecha) return null;

    try {
      let fechaObj: Date;
      
      if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      } else {
        fechaObj = fecha;
      }

      if (isNaN(fechaObj.getTime())) {
        console.error('Fecha inválida:', fecha);
        return null;
      }

      const year = fechaObj.getFullYear();
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const day = String(fechaObj.getDate()).padStart(2, '0');
      const hours = String(fechaObj.getHours()).padStart(2, '0');
      const minutes = String(fechaObj.getMinutes()).padStart(2, '0');
      const seconds = String(fechaObj.getSeconds()).padStart(2, '0');

      switch (tipoFormato) {
        case TipoFormatoFechaBackend.SOLO_FECHA:
          return `${year}-${month}-${day}`;
        case TipoFormatoFechaBackend.FECHA_HORA:
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        case TipoFormatoFechaBackend.FECHA_HORA_CERO:
          return `${year}-${month}-${day}T00:00:00`;
        default:
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return null;
    }
  }

  // Para MÚLTIPLES campos
  formatearFechasParaBackend(
    objeto: any,
    configuraciones: ConfiguracionCampoFecha[]
  ): any {
    if (!objeto) return objeto;

    const objetoClonado = { ...objeto };

    configuraciones.forEach(config => {
      if (objetoClonado[config.campo]) {
        objetoClonado[config.campo] = this.formatearFechaParaBackend(
          objetoClonado[config.campo],
          config.tipo
        );
      }
    });

    return objetoClonado;
  }
}
```

**Uso en componente**:
```typescript
export class MiFormularioComponent {
  constructor(private funcionesDatos: FuncionesDatosService) {}

  enviarDatos(): void {
    const configFechas = [
      { campo: 'fechaInicio', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaFin', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'horaCreacion', tipo: TipoFormatoFechaBackend.FECHA_HORA }
    ];

    const payload = this.funcionesDatos.formatearFechasParaBackend(
      this.formulario.value,
      configFechas
    );

    this.service.crear(payload).subscribe(/*...*/);
  }

  // Para mostrar en template (función custom)
  formatFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return 'N/A';
    
    try {
      const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
      const fechaLimpia = fechaStr.split('[')[0].replace('Z', '');
      const fechaObj = new Date(fechaLimpia);
      
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      return fechaObj.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (err) {
      return 'Error de formato';
    }
  }
}
```

---

### 8. TableBasicHijosComponent (Tabla Genérica)

#### ✅ Ejemplo Correcto: `tipos-crd.component.ts`
```typescript
import { TableBasicHijosComponent } from 'shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from 'shared/basics/table/model/table-interface';
import { FieldFormat } from 'shared/basics/table/model/field-format-interface';
import { FieldConfig } from 'shared/basics/table/dynamic-form/model/field.interface';
import { EntidadesCrd } from '../../model/entidades-crd';
import { Validators } from '@angular/forms';

export class TiposCrdComponent implements OnInit {
  tableConfigContrato!: TableConfig;
  tiposContrato: TipoContrato[] = [];

  ngOnInit(): void {
    this.setupTableConfigs();
  }

  private setupTableConfigs(): void {
    this.tableConfigContrato = {
      entidad: EntidadesCrd.TIPO_CONTRATO,
      titulo: 'Tipos de Contrato',
      registros: this.tiposContrato,
      fields: this.getFieldsContrato(),
      regConfig: this.getRegConfigContrato(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };
  }

  private getFieldsContrato(): FieldFormat[] {
    return [
      { fName: 'codigo', fLabel: 'Código', fSort: true },
      { fName: 'nombre', fLabel: 'Nombre', fSort: true },
      { fName: 'descripcion', fLabel: 'Descripción', fSort: true },
      { fName: 'estado', fLabel: 'Estado', fSort: true }
    ];
  }

  private getRegConfigContrato(): FieldConfig[] {
    return [
      {
        type: 'input',
        name: 'nombre',
        label: 'Nombre del Tipo',
        inputType: 'text',
        validations: [
          { 
            name: 'required', 
            validator: Validators.required, 
            message: 'El nombre es requerido' 
          },
          { 
            name: 'maxlength', 
            validator: Validators.maxLength(100), 
            message: 'Máximo 100 caracteres' 
          }
        ]
      },
      {
        type: 'input',
        name: 'descripcion',
        label: 'Descripción',
        inputType: 'text',
        validations: []
      },
      {
        type: 'select',
        name: 'estado',
        label: 'Estado',
        options: [
          { value: 1, label: 'Activo' },
          { value: 0, label: 'Inactivo' }
        ],
        validations: [
          { 
            name: 'required', 
            validator: Validators.required, 
            message: 'El estado es requerido' 
          }
        ]
      }
    ];
  }
}
```

**Template HTML**:
```html
<mat-tab-group [(selectedIndex)]="selectedTabIndex">
  <mat-tab label="Tipo Contrato">
    <ng-template matTabContent>
      <app-table-basic-hijos 
        [configTable]="tableConfigContrato">
      </app-table-basic-hijos>
    </ng-template>
  </mat-tab>
  <!-- ... más tabs ... -->
</mat-tab-group>
```

---

### 9. Dynamic Form (Formularios Dinámicos)

#### ✅ Ejemplo Correcto: `add-table-dialog.component.ts`
```typescript
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DynamicFormComponent } from 'shared/basics/table/dynamic-form/components/dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-add-table-dialog',
  standalone: true,
  imports: [DynamicFormComponent, MaterialFormModule]
})
export class AddTableDialogComponent implements OnInit {
  @ViewChild(DynamicFormComponent) form!: DynamicFormComponent;

  constructor(
    public dialogRef: MatDialogRef<AddTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.asignaValoresaForm();
  }

  async grabar(): Promise<void> {
    if (this.form.control.valid) {
      try {
        if (this.data.onSave) {
          await this.data.onSave(this.form.value);
        }
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error al guardar:', error);
      }
    }
  }

  asignaValoresaForm(): void {
    this.data.regConfig.forEach((val: FieldConfig) => {
      val.value = null;
    });
  }
}
```

---

### 10. Menú Recursivo con Animaciones

#### ✅ Ejemplo Correcto: `menu-list.component.ts`
```typescript
import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { NavService } from 'shared/basics/service/nav.service';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
    forwardRef(() => MenuListComponent) // Recursión
  ],
  animations: [
    trigger('indicatorRotate', [
      state('collapsed', style({ transform: 'rotate(0deg)' })),
      state('expanded', style({ transform: 'rotate(180deg)' })),
      transition('expanded <=> collapsed', 
        animate('225ms cubic-bezier(0.4,0.0,0.2,1)'))
    ])
  ]
})
export class MenuListComponent implements OnInit {
  @Input() items: NavItem[] = [];
  @Input() depth: number = 0;
  expanded: boolean = false;

  constructor(
    public navService: NavService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.navService.currentUrl.subscribe((url: string) => {
      if (this.items.some(item => url.includes(item.route))) {
        this.expanded = true;
      }
    });
  }

  isRouteActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  onItemSelected(item: NavItem): void {
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
    }
    this.expanded = !this.expanded;
  }
}
```

---

## 📦 INTERFACES Y CONSTANTES

### Constantes Compartidas
```typescript
// shared/basics/constantes.ts
export class AccionesGrid {
  public static readonly ADD = 1;
  public static readonly EDIT = 2;
  public static readonly REMOVE = 3;
}
```

### Constantes de Entidades
```typescript
// modules/crd/model/entidades-crd.ts
export class EntidadesCrd {
  public static readonly TIPO_CONTRATO = 19;
  public static readonly TIPO_PARTICIPE = 20;
  public static readonly TIPO_PRESTAMO = 14;
  public static readonly PRODUCTO = 10;
  public static readonly PRESTAMO = 11;
  // ... más códigos
}
```

### Interfaces de Tabla
```typescript
// shared/basics/table/model/table-interface.ts
export interface TableConfig {
  fields?: FieldFormat[];
  registros?: any;
  regConfig?: FieldConfig[];
  entidad?: number;
  tiene_hijos?: boolean;
  es_hijo?: boolean;
  add?: boolean;
  edit?: boolean;
  remove?: boolean;
  buttonExtra?: boolean;
  iconButtonExtra?: string;
  tipButtonExtra?: string;
  row_size?: string;
  footer?: boolean;
  paginator?: boolean;
  paginator_start?: number;
  paginator_salto?: number;
  filter?: boolean;
  fSize?: string;
  titulo?: string;
  descripcion?: string;
  entidad_padre?: number;
  reg_padre?: any;
  campo_padre?: string;
}
```

---

## 🎨 ESTILOS Y PALETA

### Paleta Oficial
```scss
// abstracts/_colors.scss
$primary-gradient-start: #667eea;
$primary-gradient-end: #764ba2;
$primary-dark: #5a67d8;

// Badges de estado
.badge-activo {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.badge-mayorizado {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.badge-inactivo {
  background: linear-gradient(135deg, #cbd5e0, #a0aec0);
  color: #2d3748;
}
```

---

## 🚀 CHECKLIST DE IMPLEMENTACIÓN

### Al Crear un Nuevo Componente Grid

- [ ] Usar signals para estado (`loading`, `totalRegistros`, `errorMsg`)
- [ ] Implementar ViewChild para MatPaginator, MatSort, ElementRef
- [ ] Agregar setupScrollDetection() para scroll buttons
- [ ] Implementar trackRow(index, item) con ID único
- [ ] Usar paginación local con updatePageData()
- [ ] Implementar filtros con applyFilter()
- [ ] Colores del sistema (#667eea → #764ba2)

### Al Crear un Nuevo Servicio

- [ ] Interface PagedResponse<T> si aplica
- [ ] httpOptions con Content-Type: application/json
- [ ] Métodos con múltiples fallbacks (getAll, selectByCriteria)
- [ ] handleError personalizado (particularidad status 200)
- [ ] Constantes de endpoints en ws-*.ts
- [ ] Tipado estricto con interfaces del model

### Al Crear un Resolver

- [ ] Usar forkJoin para carga paralela
- [ ] catchError con of([]) o of(null) por stream
- [ ] Interface tipada para el retorno
- [ ] Configurar en routes con resolve: {}
- [ ] Obtener datos en ngOnInit con route.snapshot.data

### Al Formatear Fechas

- [ ] Importar TipoFormatoFechaBackend de FuncionesDatosService
- [ ] Usar formatearFechaParaBackend para un campo
- [ ] Usar formatearFechasParaBackend para múltiples campos
- [ ] ConfiguracionCampoFecha[] para configuración
- [ ] Función formatFecha custom para mostrar en templates
- [ ] NUNCA usar DatePipe directamente (problemas con zonas horarias)

---

## 📚 REFERENCIAS CLAVE

### Archivos de Referencia

| Patrón | Archivo de Referencia |
|--------|----------------------|
| Grid moderno con signals | `crd/forms/exters/exters.component.ts` |
| Servicio robusto | `crd/service/exter.service.ts` |
| Resolver con forkJoin | `crd/resolver/estados-resolver.service.ts` |
| Tabla genérica | `shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component.ts` |
| Formulario dinámico | `shared/basics/table/dynamic-form/components/dynamic-form/dynamic-form.component.ts` |
| Menú recursivo | `shared/basics/menu/menu-list.component.ts` |
| Utilidades fechas | `shared/services/funciones-datos.service.ts` |
| Constantes endpoints | `crd/service/ws-crd.ts` |

---

## ✅ CONCLUSIONES

1. **Signals son el estándar**: Usar signals en lugar de propiedades tradicionales para estado reactivo
2. **Fallbacks robustos**: Todos los servicios deben tener múltiples niveles de fallback
3. **Paginación local**: Preferir paginación local con filtrado para mejor UX
4. **TrackBy obligatorio**: Implementar trackBy en todas las listas para performance
5. **Resolvers con forkJoin**: Pre-cargar datos relacionados en paralelo
6. **FuncionesDatosService para fechas**: NUNCA usar pipes de fecha directamente
7. **TableBasicHijosComponent**: Usar para grids CRUD genéricos reutilizables
8. **Colores consistentes**: Paleta #667eea → #764ba2 en todo el sistema
9. **ViewChild avanzado**: ElementRef para features como scroll detection
10. **TypeScript estricto**: Interfaces explícitas y manejo estricto de null

---

**Última actualización**: Diciembre 2024  
**Mantenido por**: Equipo de Desarrollo saaFE
