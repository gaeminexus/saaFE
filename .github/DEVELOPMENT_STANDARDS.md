# Documentación de Estándares de Desarrollo - saaFE

## 📋 Resumen Ejecutivo

Esta guía define los estándares y patrones de desarrollo para la aplicación Angular 20 **saaFE**, estableciendo convenciones consistentes para la creación de componentes, servicios y módulos empresariales.

## 🏗️ Arquitectura del Proyecto

### **Stack Tecnológico**
- **Framework**: Angular CLI 20 con componentes standalone
- **UI Library**: Angular Material Design
- **Estilo**: SCSS con arquitectura modular
- **Testing**: Karma + Jasmine
- **Build**: Angular CLI con proxy de desarrollo

### **Estructura de Directorios**
```
src/
├── app/
│   ├── modules/           # Módulos por dominio de negocio
│   │   ├── cnt/          # Contabilidad
│   │   ├── crd/          # Créditos  
│   │   ├── cxc/          # Cuentas por Cobrar
│   │   ├── cxp/          # Cuentas por Pagar
│   │   └── tsr/          # Tesorería
│   ├── shared/           # Componentes y servicios compartidos
│   ├── app.config.ts     # Configuración de proveedores
│   ├── app.routes.ts     # Rutas centralizadas
│   └── main.ts           # Punto de entrada
├── styles/               # Estilos globales SCSS
└── proxy.conf.json       # Configuración de proxy para desarrollo
```

### **Estructura por Dominio**
Cada módulo sigue una arquitectura consistente:
```
modules/<dominio>/
├── forms/                # Componentes de formularios CRUD
├── menu/                 # Componentes de navegación del dominio
├── model/                # Interfaces TypeScript (entidades de negocio)
├── service/              # Servicios HTTP para APIs
└── resolver/             # Resolvers para pre-carga de datos
```

## 🔧 Comandos de Desarrollo

### **Servidor de Desarrollo**
```bash
npm start                 # Inicia con proxy habilitado
# Equivale a: ng serve --proxy-config proxy.conf.json
```

### **Build y Testing**
```bash
npm run build            # Build de producción
npm test                 # Tests unitarios con Karma
```

### **Configuración de Proxy**
El archivo `proxy.conf.json` mapea:
- **Intercepta**: `/api` → `http://127.0.0.1:8080`
- **Reescribe**: Elimina prefijo `/api` del path

## 🌐 Patrones de API y HTTP

### **Centralización de Endpoints**
```typescript
// shared/services/ws-share.ts - Servicios compartidos
export class ServiciosShare {
  static readonly RS_USRO = '/api/saa-backend/rest/usro';  // Usuarios
  static readonly RS_EMPR = '/api/saa-backend/rest/empr';  // Empresas
}

// modules/crd/service/ws-crd.ts - Servicios de créditos
export class ServiciosCrd {
  static readonly RS_PRDC = '/api/saa-backend/rest/prdc';  // Productos
  static readonly RS_PART = '/api/saa-backend/rest/part';  // Partícipes
}
```

### **Convenciones de URLs**
- **Preferido** (con proxy): `'/api/saa-backend/rest/...'`
- **Absoluto** (legacy): `'http://localhost:8080/saa-backend/rest/...'`
- **Mantener consistencia**: Un estilo por feature/módulo

### **Patrones de Servicios HTTP**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private baseUrl = ServiciosCrd.RS_PRDC;

  constructor(private http: HttpClient) {}

  // Operaciones CRUD estándar
  getAll(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.baseUrl}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(entity: Producto): Observable<Producto> {
    return this.http.post<Producto>(`${this.baseUrl}/add`, entity)
      .pipe(catchError(this.handleError));
  }

  // Criterios con múltiples fallbacks
  selectByCriteria(criteria: any): Observable<Producto[]> {
    // Intenta GET primero, luego POST como fallback
    return this.http.get<Producto[]>(`${this.baseUrl}/getByCriteria`, { params: criteria })
      .pipe(
        catchError(() => 
          this.http.post<Producto[]>(`${this.baseUrl}/selectByCriteria`, criteria)
        ),
        catchError(this.handleError)
      );
  }

  // Manejo de errores específico del sistema
  private handleError = (error: HttpErrorResponse): Observable<any> => {
    if (error.status === 200) return of(null); // Particularidad del backend
    console.error('Error en ProductoService:', error);
    return throwError(() => error);
  };
}
```

### **Códigos de Backend**
- **Convención**: Códigos de 4 letras (ej: `PRDC`, `PART`, `USRO`)
- **Alineación**: Modelos frontend coinciden con contratos backend
- **Documentación**: Comentarios en interfaces con códigos correspondientes

```typescript
/**
 * Modelo para Productos (coincide con backend PRDC)
 */
export interface Producto {
  codigo: number;           // PRDC_CODIGO
  nombre: string;           // PRDC_NOMBRE
  estado: number;           // PRDC_ESTADO
  tipoProducto: TipoProducto; // Relación con TPPR
}
```

## 🎨 Componentes UI y Material Design

### **Shell de la Aplicación**
```typescript
// app.component.ts - Shell standalone
@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <app-header *ngIf="showShell" [title]="pageTitle"></app-header>
    <main [class.with-shell]="showShell">
      <router-outlet></router-outlet>
    </main>
    <app-footer *ngIf="showShell"></app-footer>
  `
})
export class AppComponent {
  showShell = !['/', '/login'].includes(this.router.url);
  pageTitle = localStorage['empresaName'] || this.inferTitleFromRoute();
}
```

### **Configuración de Material Design**
```typescript
// shared/providers/material.providers.ts
export function provideMaterial() {
  return [
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // Configuraciones específicas de Material
  ];
}

// app.config.ts - Configuración global
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideMaterial(),
    // otros providers
  ]
};
```

### **Importación en Componentes Standalone**
```typescript
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    // otros módulos Material según necesidad
  ]
})
export class MiComponente { }
```

## 📊 Análisis del Componente Plantilla General

### **Estructura del Archivo HTML**

El componente `src/app/modules/cnt/forms/plantilla-general/plantilla-general.component.html` ejemplifica las mejores prácticas establecidas:

#### **1. Organización Jerárquica**
```html
<div class="plantilla-container">
  <!-- Header Principal -->
  <div class="page-header">...</div>
  
  <!-- Banner Informativo -->
  <div class="info-banner">...</div>
  
  <!-- Layout Maestro-Detalle -->
  <div class="content-layout">
    <div class="maestro-panel">...</div>
    <div class="detalle-panel">...</div>
    <div class="welcome-panel">...</div>
  </div>
</div>
```

#### **2. Patrones de UI Identificados**

**Header con Acciones:**
```html
<div class="page-header">
  <div class="header-content">
    <h1 class="page-title">
      <mat-icon>description</mat-icon>
      Plantillas Contables Generales
    </h1>
    <div class="header-actions">
      <button mat-raised-button color="primary" (click)="nuevaPlantilla()">
        <mat-icon>add</mat-icon>
        Nueva Plantilla
      </button>
    </div>
  </div>
</div>
```

**Cards con Material Design:**
```html
<mat-card class="plantillas-card">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>list</mat-icon>
      Plantillas Disponibles
    </mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <!-- Contenido -->
  </mat-card-content>
</mat-card>
```

**Filtros Estandarizados:**
```html
<div class="filter-section">
  <mat-form-field appearance="outline" class="filter-field">
    <mat-label>Buscar plantillas</mat-label>
    <input matInput (keyup)="applyFilterMaestro($event)" 
           placeholder="Buscar por nombre..." autocomplete="off">
    <mat-icon matSuffix>search</mat-icon>
  </mat-form-field>
</div>
```

#### **3. Layout Maestro-Detalle**

**Panel Maestro:**
```html
<div class="maestro-panel">
  <mat-card class="plantillas-card">
    <!-- Lista de items con selección -->
    <div class="plantilla-item" 
         [class.selected]="plantillaSeleccionada?.codigo === plantilla.codigo"
         (click)="seleccionarPlantilla(plantilla)">
      <div class="plantilla-info">
        <mat-chip [class]="getEstadoBadgeClass(plantilla.estado)">
          {{ getEstadoText(plantilla.estado) }}
        </mat-chip>
        <div class="plantilla-nombre">{{ plantilla.nombre }}</div>
      </div>
    </div>
  </mat-card>
</div>
```

**Panel Detalle:**
```html
<div class="detalle-panel" *ngIf="isEditing">
  <!-- Formulario -->
  <mat-card class="plantilla-form-card">
    <form [formGroup]="plantillaForm" class="plantilla-form">
      <!-- Campos del formulario -->
    </form>
  </mat-card>
  
  <!-- Tabla de detalles -->
  <mat-card class="detalles-card">
    <table mat-table [dataSource]="dataSourceDetalles">
      <!-- Definiciones de columnas -->
    </table>
  </mat-card>
</div>
```

#### **4. Tabla con Columnas Tipadas**

```html
<!-- Columna con manejo de tipos de datos -->
<ng-container matColumnDef="codigoCuenta">
  <th mat-header-cell *matHeaderCellDef class="header-cell cuenta-header">
    <mat-icon>account_balance</mat-icon>
    Plan de Cuenta
  </th>
  <td mat-cell *matCellDef="let detalle" class="data-cell cuenta-cell">
    <!-- Manejo condicional de objetos vs strings -->
    <ng-container *ngIf="detalle.planCuenta && typeof detalle.planCuenta === 'object'; else planCuentaString">
      <div class="cuenta-nombre-solo">{{ detalle.planCuenta.nombre }}</div>
    </ng-container>
    <ng-template #planCuentaString>
      <div class="cuenta-nombre-solo">{{ getPlanCuentaNombre(detalle.planCuenta) }}</div>
    </ng-template>
  </td>
</ng-container>
```

#### **5. Estados y Badges Visuales**

```html
<!-- Badges con clases dinámicas -->
<ng-container matColumnDef="movimiento">
  <td mat-cell *matCellDef="let detalle" class="data-cell movimiento-cell">
    <span class="badge badge-mov" 
          [ngClass]="detalle.movimiento === 1 ? 'mov-debe' : 'mov-haber'">
      {{ detalle.movimiento === 1 ? 'DEBE' : 'HABER' }}
    </span>
  </td>
</ng-container>

<ng-container matColumnDef="estado">
  <td mat-cell *matCellDef="let detalle" class="data-cell estado-cell">
    <span class="badge badge-estado" 
          [ngClass]="detalle.estado === 1 ? 'est-activo' : 'est-inactivo'">
      {{ detalle.estado === 1 ? 'Activo' : 'Inactivo' }}
    </span>
  </td>
</ng-container>
```

#### **6. Estados Vacíos y Loading**

```html
<!-- Estado vacío con call-to-action -->
<div class="empty-state" *ngIf="plantillas.length === 0">
  <mat-icon class="empty-icon">description</mat-icon>
  <h3>No hay plantillas disponibles</h3>
  <p>Comience creando una nueva plantilla</p>
</div>

<!-- Loading state -->
<div class="loading-container" *ngIf="loading">
  <mat-icon class="spinning">refresh</mat-icon>
  <p>Cargando plantillas...</p>
</div>
```

#### **7. Panel de Bienvenida**

```html
<!-- Onboarding para usuarios nuevos -->
<div class="welcome-panel" *ngIf="!isEditing">
  <mat-card class="welcome-card">
    <mat-card-content>
      <div class="welcome-content">
        <mat-icon class="welcome-icon">description</mat-icon>
        <h2>Gestión de Plantillas Contables</h2>
        <p>Descripción funcional...</p>
        <div class="welcome-actions">
          <button mat-raised-button color="primary" (click)="nuevaPlantilla()">
            <mat-icon>add</mat-icon>
            Crear Primera Plantilla
          </button>
        </div>
        <div class="help-info">
          <h3>¿Cómo usar las plantillas?</h3>
          <ul>
            <li>Paso 1...</li>
            <li>Paso 2...</li>
          </ul>
        </div>
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

## 🛠️ Servicios Compartidos y Utilidades

### **Funciones de Datos**
```typescript
// shared/services/funciones-datos.service.ts
@Injectable({
  providedIn: 'root'
})
export class FuncionesDatosService {
  // Constantes de formato
  static readonly FECHA_HORA = 'dd/MM/yyyy HH:mm:ss';
  static readonly SOLO_FECHA = 'dd/MM/yyyy';

  // Formateo de fechas
  formatDate(date: Date | string, format: string): string {
    // Implementación robusta de formateo
  }

  // Null Value Logic
  nvl<T>(value: T | null | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  // Transformaciones de texto
  transformText(text: string, type: 'upper' | 'lower' | 'title'): string {
    // Implementación de transformaciones
  }
}
```

### **Servicio de Exportación**
```typescript
// shared/services/export.service.ts
@Injectable({
  providedIn: 'root'
})
export class ExportService {
  // Exportar a CSV
  exportToCSV(data: any[], filename: string, headers?: string[]): void {
    // Implementación de exportación CSV
  }

  // Exportar a PDF usando jsPDF
  exportToPDF(data: any[], filename: string, config?: PdfConfig): void {
    // Usa window.jsPDF o window.jspdf.jsPDF
    // Tipos definidos en types/jspdf.d.ts
  }
}
```

## 📝 Estilos y Theming

### **Arquitectura SCSS**
```
src/styles/
├── abstracts/            # Variables, mixins, funciones
├── base/                 # Reset, tipografía base
├── components/           # Estilos de componentes reutilizables
├── pages/               # Estilos específicos de páginas
└── styles.scss          # Archivo principal
```

### **Uso de Variables SCSS**
```scss
// Importación en componentes
@use 'sass:color';
@use '../../../../styles/abstracts/colors' as *;

.mi-componente {
  background: $primary-color;
  border: 1px solid color.adjust($primary-color, $lightness: 10%);
}
```

## 🧪 Testing y Calidad

### **Convenciones de Testing**
- **Archivos**: `*.spec.ts` para cada servicio y componente
- **Framework**: Karma + Jasmine
- **Comando**: `npm test`
- **Cobertura**: TypeScript estricto en tests

### **Ejemplo de Test de Servicio**
```typescript
describe('ProductoService', () => {
  let service: ProductoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductoService]
    });
    service = TestBed.inject(ProductoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch all productos', () => {
    const mockData = [{ codigo: 1, nombre: 'Test' }];
    
    service.getAll().subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${service.baseUrl}/getAll`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```

## 🔄 Patrones de Estado y Navegación

### **Rutas en Español**
```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'menucontabilidad',
    component: MenuContabilidadComponent,
    children: [
      { path: 'plantillas/general', component: PlantillaGeneralComponent },
      { path: 'plantillas/sistema', component: PlantillaSistemaComponent },
      { path: 'periodo-contable', component: PeriodoContableComponent }
    ]
  }
];
```

### **Gestión de Estado Local**
```typescript
@Component({...})
export class MiComponente {
  // Estados de UI
  loading = false;
  isEditing = false;
  isNewRecord = false;

  // Datos
  items: Item[] = [];
  selectedItem: Item | null = null;

  // FormGroup reactivo
  itemForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    estado: [1, Validators.required]
  });

  // Manejo de estados
  nuevoItem(): void {
    this.isEditing = true;
    this.isNewRecord = true;
    this.itemForm.reset({ estado: 1 });
  }

  seleccionarItem(item: Item): void {
    this.selectedItem = item;
    this.isEditing = true;
    this.isNewRecord = false;
    this.itemForm.patchValue(item);
  }
}
```

## 📋 Checklist para Nuevos Componentes

### ✅ **Estructura y Organización**
- [ ] Carpeta en `modules/<dominio>/forms/`
- [ ] Archivos: `.ts`, `.html`, `.scss`, `.spec.ts`
- [ ] Componente standalone con imports necesarios
- [ ] Documentación JSDoc en métodos principales

### ✅ **Servicios HTTP**
- [ ] Servicio en `modules/<dominio>/service/`
- [ ] Constantes de URL en `ws-<dominio>.ts`
- [ ] Métodos CRUD estándar (getAll, getById, add, update, delete)
- [ ] Manejo de errores con `handleError`
- [ ] Tipos de retorno explícitos (`Observable<T>`)

### ✅ **UI y UX**
- [ ] Layout maestro-detalle cuando sea apropiado
- [ ] Filtros de búsqueda funcionales
- [ ] Estados de loading y error
- [ ] Estados vacíos con call-to-action
- [ ] Validaciones de formulario
- [ ] Responsive design
- [ ] Iconos Material apropiados

### ✅ **Integración**
- [ ] Ruta agregada a `app.routes.ts`
- [ ] Import del componente en rutas
- [ ] Opción de menú configurada
- [ ] Estilos siguiendo patrones establecidos
- [ ] Tests básicos funcionando

### ✅ **Calidad del Código**
- [ ] TypeScript estricto sin errores
- [ ] Convenciones de naming consistentes
- [ ] Comentarios en código complejo
- [ ] Manejo de memoria (unsubscribe)
- [ ] Accesibilidad básica (aria-labels, etc.)

## 🚀 Mejores Prácticas

### **Performance**
- Usar `OnPush` change detection cuando sea posible
- Lazy loading de módulos grandes
- Optimización de bundles con `ng build --prod`

### **Mantenibilidad**
- Componentes pequeños y enfocados (< 300 líneas)
- Servicios reutilizables
- Constantes centralizadas
- Documentación actualizada

### **Seguridad**
- Sanitización de inputs del usuario
- Validación en frontend Y backend
- Manejo seguro de tokens de autenticación

Esta documentación establece el foundation para desarrollo consistente y escalable en el proyecto saaFE, asegurando calidad y mantenibilidad a largo plazo.
