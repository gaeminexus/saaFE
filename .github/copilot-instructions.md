# Instrucciones de Copilot para saaFE

Guía breve para que agentes de IA trabajen con esta app Angular 20.

## ⚠️ REGLA CRÍTICA: MINIMIZAR LECTURAS DE ARCHIVOS ⚠️

**PROHIBIDO usar read_file si el archivo ya está en `<editorContext>` o `<conversation-summary>`.**

**PROHIBIDO leer un archivo más de UNA vez durante una misma tarea.**

### Proceso OBLIGATORIO antes de cualquier acción:
1. **VERIFICAR SIEMPRE PRIMERO**:
   - ¿Está el archivo en `<editorContext>`? → **USAR ESE CONTENIDO. NO LEER.**
   - ¿Está en `<conversation-summary>`? → **USAR ESE CONTENIDO. NO LEER.**
   - ¿Está en mensajes previos? → **USAR ESE CONTENIDO. NO LEER.**

2. **SI NO ESTÁ EN NINGÚN CONTEXTO**: 
   - Leer UNA sola vez con rango AMPLIO (ej: líneas 1-500 o 1-1000)

3. **PLANIFICAR**: Todas las ediciones necesarias basándote en el contenido del contexto o de esa única lectura

4. **EJECUTAR**: Todas las ediciones en secuencia SIN más lecturas

5. **SI FALLA replace_string_in_file**: Ajustar el string usando el contexto que YA TIENES, NO leer otra vez

### Penalización:
- Si lees un archivo más de 1 vez → **ERROR CRÍTICO - DETENTE inmediatamente**
- Cada lectura adicional desperdicia requests premium del usuario
- Máximo 1 lectura por archivo por tarea
- **Esta regla NO tiene excepciones. Punto.**

### Ejemplo CORRECTO:
```
Usuario tiene archivo abierto en editor → YA está en <editorContext> → 0 lecturas
Archivo mencionado en conversación previa → Buscar en contexto → 0 lecturas  
Archivo desconocido → read_file(1-500) → Planificar 3 edits → Ejecutar 3 edits → 1 lectura total ✓
```

### Ejemplo INCORRECTO (PROHIBIDO):
```
read_file(1-400)    ← Lectura 1
read_file(115-135)  ← ERROR: Lectura 2 innecesaria
read_file(160-180)  ← ERROR: Lectura 3 innecesaria
read_file(290-315)  ← ERROR: Lectura 4 innecesaria
[...]               ← INACEPTABLE
```

---

## Resumen del Proyecto
- Framework: Angular CLI 20 con componentes standalone y Angular Material.
- Entrada: `src/main.ts` inicia `App` usando proveedores de `src/app/app.config.ts`.
- Ruteo: Centralizado en `src/app/app.routes.ts` con rutas en español y menús anidados por dominio (cnt, crd, cxc, cxp, tsr).
- Estructura por dominio: `src/app/modules/<dominio>/{forms,menu,model,service,resolver}`. Los modelos son interfaces TS (ej.: `modules/crd/model/producto.ts`).
- Capa compartida: `src/app/shared/` contiene proveedores de Material, utilidades, header/footer y servicios transversales.

## Ejecutar / Compilar / Probar
- Dev server (con proxy): `npm start` (alias de `ng serve --proxy-config proxy.conf.json`).
- Build: `npm run build`.
- Unit tests: `npm test` (Karma).
- Proxy dev: `proxy.conf.json` mapea `/api -> http://127.0.0.1:8080` y reescribe `^/api`.

## API y Patrones HTTP
- Bases de endpoints centralizadas en constantes:
  - Compartidos: `shared/services/ws-share.ts` (ej.: `ServiciosShare.RS_USRO`).
  - Créditos: `modules/crd/service/ws-crd.ts` (ej.: `ServiciosCrd.RS_PRDC`).
- Estilos coexistentes:
  - Preferido en dev con proxy: `'/api/saa-backend/rest/...'` (ver bloque comentado en `ws-share.ts`).
  - Absoluto: `'http://localhost:8080/saa-backend/rest/...'` (activo actualmente). Mantén un estilo por feature; usa proxy en código nuevo.
- Servicios: construyen URL con sufijos de método, retornan `Observable<T>` tipados y encadenan `catchError` a `handleError` (ver `producto.service.ts`). Ejemplos:
  - `getAll(): GET ${ServiciosCrd.RS_PRDC}/getAll`
  - `getById(id): GET ${ServiciosCrd.RS_PRDC}/getId/{id}`
  - Criterios: probar múltiples endpoints como fallback, priorizando GET y luego POST (ver `selectByCriteria`).
- Particularidad de errores: algunos `handleError` devuelven `of(null)` cuando `status===200` en la ruta de error. Presérvalo salvo que refactores los consumidores.

## UI y Componentes
- Shell standalone: `src/app/app.ts` muestra `Header`/`Footer` salvo en `/` y `/login`. El título sale de `localStorage['empresaName']` o heurísticas de ruta.
- Material: a nivel app vía `provideMaterial()` en `shared/providers/material.providers.ts`. Los componentes standalone pueden importar módulos Material adicionales o usar `SharedModule` según convenga.
- Estilos globales: `src/styles/styles.scss` con SCSS en `src/styles/{abstracts,base,components,pages}`.

## Utilidades y Exportaciones
- Datos: `shared/services/funciones-datos.service.ts` (transformaciones de texto, NVL, formateo de fechas; constantes `FECHA_HORA` y `SOLO_FECHA`).
- Exportar:
  - CSV/PDF con `shared/services/export.service.ts`. PDF usa jsPDF global (`window.jsPDF` / `window.jspdf.jsPDF`) o carga CDN; soporta `window.loadJsPDF()`. Tipos en `types/jspdf.d.ts`.

## Convenciones y Detalles
- TypeScript estricto en código y plantillas (`tsconfig.json`, `angular.json`). Prefiere interfaces explícitas en `modules/*/model` y manejo estricto de null.
- Rutas en español y agrupadas por dominio; agrega páginas editando `app.routes.ts` y colocando componentes en `modules/<dominio>/forms` o `menu`.
- Contratos backend con códigos de 4 letras (ej.: `PRDC`, `TPPR`); alinea modelos/servicios con comentarios en los modelos.
- Al añadir APIs: extiende el `ws-*.ts` correspondiente y referencia desde el servicio. En dev, prioriza bases con proxy.
- Si cambias la base del backend, alterna los bloques activos en `ws-share.ts`/`ws-crd.ts` o introduce selección por entorno, manteniendo consistencia entre features.

## Ejemplos Rápidos
- Nuevo GET en un servicio:
  - ``const url = `${ServiciosCrd.RS_PRDC}/getAll`; return this.http.get<Producto[]>(url).pipe(catchError(this.handleError));``
- Exportar desde un componente a CSV:
  - ``this.exportService.exportToCSV(rows, 'productos', ['Nombre','Estado']);``

---

## 🔥 Patrones Críticos Angular 20

### **Signals (Obligatorio en Componentes Nuevos)**

Signals es el patrón reactivo de Angular 17+. Reemplaza BehaviorSubject en muchos casos.

```typescript
import { Component, signal, computed } from '@angular/core';

export class MiComponente {
  // Declaración con valor inicial
  loading = signal<boolean>(false);
  totalRegistros = signal<number>(0);
  errorMsg = signal<string>('');
  items = signal<Producto[]>([]);
  
  // Signal computado (readonly)
  hasItems = computed(() => this.items().length > 0);
  
  // Métodos
  cargarDatos(): void {
    this.loading.set(true);  // Actualizar valor
    
    this.service.getAll().subscribe({
      next: (data) => {
        this.items.set(data);
        this.totalRegistros.set(data.length);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('Error al cargar');
        this.loading.set(false);
      }
    });
  }
  
  // Update con función
  toggleLoading(): void {
    this.loading.update(v => !v);
  }
  
  // Leer valor
  verificar(): void {
    if (this.loading()) {
      console.log('Cargando...');
    }
  }
}
```

**En templates:**
```html
@if (loading()) {
  <mat-spinner></mat-spinner>
}

@if (errorMsg()) {
  <div class="error">{{ errorMsg() }}</div>
}

<p>Total: {{ totalRegistros() }}</p>
<p>Tiene items: {{ hasItems() }}</p>
```

**Cuándo usar Signals:**
- Estado local de componente (loading, error, data)
- Reemplazo de variables con ChangeDetectorRef
- Computaciones derivadas (computed)

**Cuándo NO usar Signals:**
- Servicios con estado global (usar BehaviorSubject)
- Observables de HTTP (mantener pipe/subscribe)

---

### **Convenciones de Nombres (Obligatorio)**

Mantener consistencia en toda la app:

```typescript
// ✅ Componentes: kebab-case
periodo-contable.component.ts
detalle-asiento.component.ts
consulta-archivos-petro.component.ts

// ✅ Servicios: PascalCase + "Service"
PeriodoService
DetalleAsientoService
ProductoService

// ✅ Interfaces/Modelos: PascalCase
export interface Producto { ... }
export interface Asiento { ... }
export interface PagedResponse<T> { ... }

// ✅ Constantes: SCREAMING_SNAKE_CASE
export const EMPRESA_CODIGO = 'EMP001';
export const FECHA_HORA = 'dd/MM/yyyy HH:mm';
export const API_BASE_URL = '/api/saa-backend/rest';

// ✅ Variables: camelCase
totalRegistros = 0;
criteriosConsulta = [];
datosBusqueda: DatosBusqueda;

// ✅ Métodos: camelCase (verbos en español)
cargarDatos(): void { ... }
guardarAsiento(): void { ... }
validarFormulario(): boolean { ... }
```

---

### **ViewChild y Manipulación del DOM**

Pattern avanzado para acceso a elementos nativos.

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

export class MiComponente implements AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef;
  @ViewChild('scrollButton') scrollButton!: ElementRef;
  
  isScrolled = signal<boolean>(false);
  
  ngAfterViewInit(): void {
    this.setupScrollDetection();
  }
  
  private setupScrollDetection(): void {
    const container = this.tableContainer.nativeElement;
    
    container.addEventListener('scroll', () => {
      const scrollTop = container.scrollTop;
      this.isScrolled.set(scrollTop > 100);
    });
  }
  
  scrollToTop(): void {
    this.tableContainer.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'  // Animación suave
    });
  }
  
  scrollToElement(id: string): void {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
```

**Template:**
```html
<div #tableContainer class="table-container">
  <!-- Contenido scrollable -->
</div>

@if (isScrolled()) {
  <button #scrollButton 
          class="scroll-top-btn"
          (click)="scrollToTop()">
    ↑ Volver arriba
  </button>
}
```

**CSS:**
```scss
.scroll-top-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}
```

---

### **TrackBy para Optimización de Loops**

SIEMPRE usar `trackBy` en *ngFor o @for con arrays grandes (>20 items).

```typescript
export class ListadoComponent {
  productos: Producto[] = [];
  
  // Función trackBy (preferir propiedad única)
  trackByProducto(index: number, item: Producto): number {
    return item.codigo;  // ← Usar ID único
  }
  
  trackByIndex(index: number): number {
    return index;  // ← Solo si no hay ID
  }
}
```

**Template (Angular 17+ con @for):**
```html
@for (producto of productos; track producto.codigo) {
  <tr>
    <td>{{ producto.nombre }}</td>
    <td>{{ producto.precio }}</td>
  </tr>
}
```

**Template (Angular 16- con *ngFor):**
```html
<tr *ngFor="let producto of productos; trackBy: trackByProducto">
  <td>{{ producto.nombre }}</td>
  <td>{{ producto.precio }}</td>
</tr>
```

**Performance:**
- SIN trackBy: Angular re-crea TODOS los elementos en cada cambio
- CON trackBy: Angular solo actualiza elementos modificados
- Crítico en tablas con >50 filas

---

## 🛡️ Seguridad y Navegación

### **Guards (Functional Guards)**

Ubicación: `src/app/shared/guard/`

**1. Auth Guard (Autenticación):**

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLogged = localStorage.getItem('logged') === 'true';

  if (!isLogged) {
    console.warn('AuthGuard: Acceso denegado. Usuario no autenticado.');
    router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url }  // ← Preservar destino
    });
    return false;
  }

  return true;
};
```

**2. CanDeactivate Guard (Prevenir Pérdida de Datos):**

```typescript
import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
  currentRoute,
  currentState,
  nextState
) => {
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }

  return confirm('¿Está seguro de que desea abandonar esta página? Los cambios no guardados se perderán.');
};
```

**Uso en app.routes.ts:**

```typescript
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';

export const routes: Routes = [
  // Rutas públicas
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas (requieren autenticación)
  { 
    path: 'menu', 
    component: MenuComponent,
    canActivate: [authGuard]
  },
  {
    path: 'menucontabilidad',
    component: MenuContabilidadComponent,
    canActivate: [authGuard],
    children: [
      { 
        path: 'asientos', 
        component: AsientosComponent,
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard]  // ← Proteger formulario
      },
      // ... todas las rutas hijas con guards
    ]
  }
];
```

**Implementación en Componente:**

```typescript
import { Component } from '@angular/core';
import { CanComponentDeactivate } from '@shared/guard/can-deactivate.guard';

export class AsientosComponent implements CanComponentDeactivate {
  formularioModificado = signal<boolean>(false);
  
  onInputChange(): void {
    this.formularioModificado.set(true);
  }
  
  guardar(): void {
    // Lógica de guardado
    this.formularioModificado.set(false);
  }
  
  canDeactivate(): boolean {
    if (this.formularioModificado()) {
      return confirm('¿Deseas salir sin guardar los cambios?');
    }
    return true;
  }
}
```

**Documentación completa:** `.github/GUARDS-AUTENTICACION-NAVEGACION.md`

---

## 📋 Patrones de Desarrollo

### **Paginación Local (Slice Pattern)**

Para paginar datos en memoria sin llamadas al backend:

```typescript
export class TablaComponent implements OnInit {
  // Datos completos
  allData: Producto[] = [];
  
  // Datos de página actual
  dataSource = new MatTableDataSource<Producto>([]);
  
  // Paginador
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  
  ngOnInit(): void {
    this.cargarDatos();
  }
  
  cargarDatos(): void {
    this.service.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.totalItems = data.length;
        this.updatePageData();
      }
    });
  }
  
  updatePageData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.allData.slice(start, end);
  }
  
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePageData();
  }
  
  aplicarFiltro(filtro: string): void {
    const filtered = this.allData.filter(item => 
      item.nombre.toLowerCase().includes(filtro.toLowerCase())
    );
    
    this.totalItems = filtered.length;
    this.pageIndex = 0;  // ← Resetear a primera página
    this.dataSource.data = filtered.slice(0, this.pageSize);
  }
}
```

**Template:**
```html
<mat-paginator 
  [length]="totalItems"
  [pageSize]="pageSize"
  [pageSizeOptions]="[5, 10, 20, 50]"
  (page)="onPageChange($event)">
</mat-paginator>
```

---

## 🧪 Testing (Karma + Jasmine)

### **Estructura de Tests**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MiComponente } from './mi-componente';
import { MiService } from './mi.service';

describe('MiComponente', () => {
  let component: MiComponente;
  let fixture: ComponentFixture<MiComponente>;
  let httpMock: HttpTestingController;
  let service: MiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MiComponente,  // ← Componente standalone
        HttpClientTestingModule
      ],
      providers: [MiService]
    }).compileComponents();

    fixture = TestBed.createComponent(MiComponente);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MiService);
    
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();  // ← Verificar que no hay requests pendientes
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load data on init', () => {
    const mockData = [{ id: 1, nombre: 'Test' }];
    
    component.ngOnInit();
    
    const req = httpMock.expectOne('/api/saa-backend/rest/productos/getAll');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
    
    expect(component.items()).toEqual(mockData);
    expect(component.loading()).toBe(false);
  });
});
```

**Comandos:**
- `npm test` - Ejecutar todos los tests
- `ng test --include='**/mi-componente.spec.ts'` - Test específico
- Configuración en `karma.conf.js`

---

## 🌿 Workflow Git

### **Estructura de Branches**

```
main           ← Producción estable (solo merge desde develop)
  └─ develop   ← Integración de features (base para nuevas features)
       ├─ feature/cnt-mayorizacion
       ├─ feature/crd-productos
       ├─ fix/tabla-filtros
       └─ fix/login-redirect
```

**Convenciones:**
- `feature/<modulo>-<descripcion>` - Nuevas funcionalidades
- `fix/<descripcion>` - Correcciones de bugs
- `docs/<descripcion>` - Solo documentación
- `refactor/<descripcion>` - Refactorización sin cambio funcional

### **Conventional Commits (Obligatorio)**

Formato: `<tipo>(<scope>): <descripción>`

```bash
# Features
git commit -m "feat(cnt): agregar componente mayorizacion-proceso"
git commit -m "feat(crd): implementar filtros en consulta-productos"

# Fixes
git commit -m "fix(shared): corregir scroll detection en table-basic-hijos"
git commit -m "fix(cxp): resolver error en cálculo de totales"

# Docs
git commit -m "docs(github): actualizar guía de guards"
git commit -m "docs(readme): agregar sección de testing"

# Style (formato, no lógica)
git commit -m "style(cnt): formatear código según prettier"

# Refactor
git commit -m "refactor(crd): extraer lógica de filtros a servicio"

# Test
git commit -m "test(shared): agregar tests para export.service"

# Chore (tareas, config)
git commit -m "chore: actualizar dependencias Angular a v20"
git commit -m "chore(karma): configurar junit reporter"
```

**Scopes disponibles:**
- `cnt` - Contabilidad
- `crd` - Créditos
- `cxc` - Cuentas por Cobrar
- `cxp` - Cuentas por Pagar
- `tsr` - Tesorería
- `shared` - Componentes/servicios compartidos
- `github` - Documentación .github
- `root` - Archivos raíz (angular.json, package.json)

**Breaking Changes:**
```bash
git commit -m "feat(shared)!: cambiar firma de export.service.exportToCSV

BREAKING CHANGE: exportToCSV ahora requiere parámetro headers obligatorio"
```

---

## 📚 Referencias Adicionales

Para profundizar en patrones específicos, consultar:

- **Formateo de Fechas:** `.github/FORMATEO-FECHAS.md`
- **Formularios Dinámicos:** `.github/FORMULARIOS-DINAMICOS-FECHAS.md`
- **Refactorización de Plan de Cuentas:** `.github/REFACTORIZACION-PLAN-CUENTAS.md`
- **Análisis Arquitectónico:** `.github/ANALISIS_ARQUITECTURA.md`
- **Estándares de Desarrollo:** `.github/DEVELOPMENT_STANDARDS.md`
- **Proceso de Contribución:** `.github/CONTRIBUTING.md`
- **Guards y Seguridad:** `.github/GUARDS-AUTENTICACION-NAVEGACION.md`

---

**Última actualización:** Enero 2025 (Fase 48 - Consolidación de Documentación)

