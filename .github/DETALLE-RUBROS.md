# DetalleRubroService - Guía de Uso

## 📋 Índice
- [Introducción](#introducción)
- [Arquitectura](#arquitectura)
- [Inicialización](#inicialización)
- [API Completa](#api-completa)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Integración con Componentes](#integración-con-componentes)
- [Flujo del Sistema](#flujo-del-sistema)
- [Mejores Prácticas](#mejores-prácticas)
- [Troubleshooting](#troubleshooting)

---

## Introducción

`DetalleRubroService` es un servicio de caché global que gestiona los datos de rubros y detalles de rubros en el sistema saaFE. Este servicio:

- **Carga una sola vez** ~800 registros al inicio de sesión
- **Mantiene datos en memoria** usando Angular Signals para reactividad
- **Provee acceso síncrono** sin necesidad de subscripciones
- **Se restaura automáticamente** desde localStorage

### ¿Qué son los Detalles de Rubro?

Los rubros son categorías maestras del sistema (ej: Estados, Tipos de Documento, Países) y los **detalles de rubro** son los valores específicos dentro de cada categoría:

```
Rubro 1010 (Estados)
├── DetalleRubro { codigoAlterno: 1, descripcion: "ACTIVO" }
├── DetalleRubro { codigoAlterno: 2, descripcion: "INACTIVO" }
└── DetalleRubro { codigoAlterno: 3, descripcion: "SUSPENDIDO" }

Rubro 1020 (Tipos de Documento)
├── DetalleRubro { codigoAlterno: 1, descripcion: "CEDULA" }
├── DetalleRubro { codigoAlterno: 2, descripcion: "PASSPORT" }
└── DetalleRubro { codigoAlterno: 3, descripcion: "RIF" }
```

---

## Arquitectura

### Patrón de Caché con Signals

```typescript
@Injectable({ providedIn: 'root' })
export class DetalleRubroService {
  // Signals reactivos
  private detallesSignal = signal<DetalleRubro[]>([]);
  private cargaCompletada = signal<boolean>(false);
  
  // Computed para verificar estado
  private hayDatos = computed(() => this.detallesSignal().length > 0);
}
```

### Estados del Servicio

1. **🔄 Inicialización**: Carga datos desde backend una sola vez
2. **✅ Caché Activo**: Datos disponibles para acceso síncrono
3. **🧹 Limpio**: Cache vacío (logout o error)

---

## Inicialización

### Carga Automática en Login

La carga se realiza automáticamente a través de `AppStateService` durante el login:

```typescript
// app-state.service.ts
inicializarApp(empresaId: number, username: string): Observable<AppData> {
  return forkJoin({
    empresa: this.usuarioService.getEmpresaById(empresaId),
    usuario: this.usuarioService.getByNombre(username),
    detallesRubro: this.detalleRubroService.inicializar() // ← Carga paralela
  }).pipe(
    tap(data => {
      console.log(`DetalleRubros cargados: ${data.detallesRubro.length} registros`);
    })
  );
}
```

### Restauración Automática

Si el usuario ya está logueado, los datos se restauran desde localStorage:

```typescript
// app.config.ts - APP_INITIALIZER
export function initializeApp(appStateService: AppStateService) {
  return (): Promise<void> => {
    // Restaura caché de DetalleRubroService automáticamente
    return appStateService.verificarSesionExistente().toPromise();
  };
}
```

---

## API Completa

### Métodos de Inicialización

#### `inicializar(): Observable<DetalleRubro[]>`
Carga inicial de datos (una sola vez).

```typescript
// ✅ Uso correcto en AppStateService
this.detalleRubroService.inicializar().subscribe({
  next: (detalles) => console.log(`${detalles.length} registros cargados`),
  error: (err) => console.error('Error cargando rubros', err)
});
```

#### `estanDatosCargados(): boolean`
Verifica si los datos están disponibles.

```typescript
if (this.detalleRubroService.estanDatosCargados()) {
  // Proceder con lógica de negocio
} else {
  // Mostrar loading o redirigir al login
}
```

### Métodos de Consulta (Síncronos)

#### `getDetalles(): DetalleRubro[]`
Obtiene todos los detalles cargados.

```typescript
const todosLosDetalles = this.detalleRubroService.getDetalles();
console.log(`Total detalles: ${todosLosDetalles.length}`);
```

#### `getDetallesByParent(idPadre: number): DetalleRubro[]`
Filtra detalles por rubro padre.

```typescript
// Obtener todos los estados (rubro 1010)
const estados = this.detalleRubroService.getDetallesByParent(1010);
// [{ codigoAlterno: 1, descripcion: "ACTIVO" }, ...]

// Obtener tipos de documento (rubro 1020)  
const tiposDoc = this.detalleRubroService.getDetallesByParent(1020);
// [{ codigoAlterno: 1, descripcion: "CEDULA" }, ...]
```

#### `getDescripcionByParentAndAlterno(idPadre: number, alterno: number): string`
Obtiene descripción específica.

```typescript
// Obtener descripción del estado activo
const descripcion = this.detalleRubroService.getDescripcionByParentAndAlterno(1010, 1);
// "ACTIVO"

// Obtener descripción de tipo documento cédula
const tipoDoc = this.detalleRubroService.getDescripcionByParentAndAlterno(1020, 1);
// "CEDULA"
```

#### `getNumeroByParentAndAlterno(idPadre: number, alterno: number): number`
Obtiene valor numérico específico.

```typescript
// Para rubros que manejan valores numéricos
const valor = this.detalleRubroService.getNumeroByParentAndAlterno(1030, 5);
// 100.5 (por ejemplo)
```

### Métodos de Gestión

#### `limpiarCache(): void`
Limpia el caché (logout o refresh forzado).

```typescript
// En logout
logout(): void {
  this.detalleRubroService.limpiarCache();
  this.router.navigate(['/login']);
}
```

---

## Ejemplos de Uso

### 1. Dropdown de Estados en Componente

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { DetalleRubroService } from '@shared/services/detalle-rubro.service';
import { DetalleRubro } from '@shared/model/detalle-rubro';

@Component({
  selector: 'app-entidad-form',
  template: `
    <mat-select formControlName="estado" placeholder="Estado">
      @for (estado of estadosOptions(); track estado.codigoAlterno) {
        <mat-option [value]="estado.codigoAlterno">
          {{ estado.descripcion }}
        </mat-option>
      }
    </mat-select>
  `
})
export class EntidadFormComponent implements OnInit {
  estadosOptions = signal<DetalleRubro[]>([]);
  
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  ngOnInit(): void {
    // Acceso inmediato - datos ya en memoria
    this.estadosOptions.set(
      this.detalleRubroService.getDetallesByParent(1010)
    );
  }
}
```

### 2. Mostrar Descripción en Tabla

```typescript
@Component({
  template: `
    <mat-table [dataSource]="dataSource">
      <ng-container matColumnDef="estado">
        <mat-header-cell *matHeaderCellDef>Estado</mat-header-cell>
        <mat-cell *matCellDef="let entidad">
          {{ getEstadoDescripcion(entidad.estado) }}
        </mat-cell>
      </ng-container>
    </mat-table>
  `
})
export class EntidadListaComponent {
  
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  getEstadoDescripcion(codigoEstado: number): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(1010, codigoEstado);
  }
}
```

### 3. AutocompleteComponent Genérico

```typescript
@Component({
  selector: 'app-autocomplete-rubro',
  template: `
    <mat-autocomplete #auto="matAutocomplete">
      @for (option of filteredOptions(); track option.codigoAlterno) {
        <mat-option [value]="option.codigoAlterno">
          {{ option.descripcion }}
        </mat-option>
      }
    </mat-autocomplete>
  `
})
export class AutocompleteRubroComponent implements OnInit {
  @Input() rubroPadre!: number;
  
  options = signal<DetalleRubro[]>([]);
  filteredOptions = computed(() => {
    // Lógica de filtrado basada en input del usuario
    return this.options().filter(option => 
      option.descripcion.toLowerCase().includes(this.searchTerm().toLowerCase())
    );
  });
  
  searchTerm = signal<string>('');
  
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  ngOnInit(): void {
    this.options.set(
      this.detalleRubroService.getDetallesByParent(this.rubroPadre)
    );
  }
}
```

### 4. Validación de Datos

```typescript
export class ValidationService {
  
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  esEstadoValido(codigoEstado: number): boolean {
    const estados = this.detalleRubroService.getDetallesByParent(1010);
    return estados.some(estado => estado.codigoAlterno === codigoEstado);
  }
  
  obtenerEstadosPermitidos(): number[] {
    return this.detalleRubroService.getDetallesByParent(1010)
      .map(estado => estado.codigoAlterno);
  }
}
```

---

## Integración con Componentes

### Patrón Reactivo con Signals

```typescript
@Component({
  selector: 'app-mi-componente',
  template: `
    @if (datosDisponibles()) {
      <!-- Contenido principal -->
      <div class="content">
        @for (item of itemsConDescripcion(); track item.id) {
          <div>{{ item.descripcion }}</div>
        }
      </div>
    } @else {
      <!-- Estado de carga -->
      <mat-spinner></mat-spinner>
    }
  `
})
export class MiComponente implements OnInit {
  items = signal<MiItem[]>([]);
  
  // Computed que combina items con descripciones de rubros
  itemsConDescripcion = computed(() => {
    return this.items().map(item => ({
      ...item,
      estadoDescripcion: this.detalleRubroService.getDescripcionByParentAndAlterno(1010, item.estado),
      tipoDescripcion: this.detalleRubroService.getDescripcionByParentAndAlterno(1020, item.tipo)
    }));
  });
  
  // Computed para verificar disponibilidad
  datosDisponibles = computed(() => 
    this.detalleRubroService.estanDatosCargados() && this.items().length > 0
  );
  
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  ngOnInit(): void {
    // Cargar datos del componente
    this.cargarItems();
  }
  
  private cargarItems(): void {
    // Lógica para cargar items...
    this.items.set(itemsCargados);
  }
}
```

---

## Flujo del Sistema

### 1. Inicio de Sesión

```mermaid
graph TD
    A[Usuario hace Login] --> B[AuthService.login()]
    B --> C[AppStateService.inicializarApp()]
    C --> D[forkJoin: Usuario + Empresa + DetalleRubros]
    D --> E[DetalleRubroService.inicializar()]
    E --> F[HTTP GET /api/detalle-rubro/getAll]
    F --> G[~800 registros cargados en Signal]
    G --> H[Navegación a Dashboard]
    H --> I[Componentes acceden síncronamente]
```

### 2. Navegación Normal

```mermaid
graph TD
    A[Usuario navega a componente] --> B[ngOnInit()]
    B --> C[detalleRubroService.getDetallesByParent()]
    C --> D[Acceso inmediato a Signal]
    D --> E[Datos mostrados en UI]
```

### 3. Refresh de Página

```mermaid
graph TD
    A[F5 / Refresh] --> B[APP_INITIALIZER]
    B --> C[AppStateService.verificarSesionExistente()]
    C --> D{¿Sesión válida?}
    D -->|Sí| E[Restaurar caché DetalleRubros desde localStorage]
    D -->|No| F[Redirect a Login]
    E --> G[Sistema listo para uso]
```

---

## Mejores Prácticas

### ✅ Hacer

```typescript
// 1. Verificar datos antes de usar
if (this.detalleRubroService.estanDatosCargados()) {
  const estados = this.detalleRubroService.getDetallesByParent(1010);
}

// 2. Usar computed para reactividad
const itemsConEstado = computed(() => 
  this.items().map(item => ({
    ...item,
    estadoTexto: this.detalleRubroService.getDescripcionByParentAndAlterno(1010, item.estado)
  }))
);

// 3. Cachear resultados si se usan repetidamente
private readonly ESTADOS_CACHE = this.detalleRubroService.getDetallesByParent(1010);

// 4. Usar en pipes para transformaciones
@Pipe({ name: 'estadoDescripcion' })
export class EstadoDescripcionPipe implements PipeTransform {
  constructor(private detalleRubroService: DetalleRubroService) {}
  
  transform(codigoEstado: number): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(1010, codigoEstado);
  }
}
```

### ❌ Evitar

```typescript
// ❌ NO llamar inicializar() desde componentes
ngOnInit() {
  this.detalleRubroService.inicializar().subscribe(/* ... */);
}

// ❌ NO usar getAll() observable innecesariamente
ngOnInit() {
  this.detalleRubroService.getAll().subscribe(/* ... */);
}

// ❌ NO asumir que los datos están disponibles
const estados = this.detalleRubroService.getDetallesByParent(1010); // Puede ser []

// ❌ NO limpiar caché sin motivo
someMethod() {
  this.detalleRubroService.limpiarCache(); // Solo en logout
}
```

### Códigos de Rubros Comunes

```typescript
// Constantes recomendadas
export const RUBROS = {
  ESTADOS: 1010,
  TIPOS_DOCUMENTO: 1020,
  PAISES: 1030,
  TIPOS_PERSONA: 1040,
  GENEROS: 1050,
  TIPOS_CONTRATO: 2010,
  TIPOS_APORTE: 2020,
  // ... otros rubros del sistema
} as const;

// Uso en componentes
const estados = this.detalleRubroService.getDetallesByParent(RUBROS.ESTADOS);
```

---

## Troubleshooting

### Problema: "Datos no disponibles"

**Síntomas:**
- `getDetallesByParent()` retorna array vacío
- Warning en consola: "Datos no cargados"

**Solución:**
```typescript
// Verificar estado de carga
console.log('Datos cargados:', this.detalleRubroService.estanDatosCargados());
console.log('Total detalles:', this.detalleRubroService.getDetalles().length);

// Si no están cargados, verificar AppStateService
console.log('AppState inicializado:', this.appStateService.estaInicializado());
```

### Problema: "Descripciones vacías"

**Síntomas:**
- `getDescripcionByParentAndAlterno()` retorna string vacío
- UI muestra valores en blanco

**Diagnóstico:**
```typescript
// Verificar que el rubro padre existe
const detallesPorRubro = this.detalleRubroService.getDetallesByParent(1010);
console.log('Detalles para rubro 1010:', detallesPorRubro);

// Verificar códigos alternos disponibles
detallesPorRubro.forEach(d => {
  console.log(`Código: ${d.codigoAlterno}, Descripción: ${d.descripcion}`);
});
```

### Problema: "Performance lenta"

**Optimizaciones:**
```typescript
// 1. Cachear resultados en propiedades de clase
private readonly estadosOptions = this.detalleRubroService.getDetallesByParent(1010);

// 2. Usar memoización para filtros complejos
private memoizedFilter = new Map<string, DetalleRubro[]>();

getFilteredEstados(filtro: string): DetalleRubro[] {
  if (!this.memoizedFilter.has(filtro)) {
    const resultado = this.estadosOptions.filter(e => 
      e.descripcion.toLowerCase().includes(filtro.toLowerCase())
    );
    this.memoizedFilter.set(filtro, resultado);
  }
  return this.memoizedFilter.get(filtro)!;
}
```

### Debugging del Estado

```typescript
// Método para debugging (agregar temporalmente)
debugDetalleRubros(): void {
  console.group('🐛 Debug DetalleRubroService');
  console.log('Carga completada:', this.detalleRubroService.estanDatosCargados());
  console.log('Total registros:', this.detalleRubroService.getDetalles().length);
  
  // Verificar rubros principales
  const principales = [1010, 1020, 1030, 1040];
  principales.forEach(rubroId => {
    const detalles = this.detalleRubroService.getDetallesByParent(rubroId);
    console.log(`Rubro ${rubroId}: ${detalles.length} detalles`);
  });
  
  console.groupEnd();
}
```

### Logs del Sistema

El servicio genera logs automáticos que puedes usar para debugging:

```
DetalleRubroService: Cargando datos desde backend...
DetalleRubroService: 847 registros cargados
DetalleRubroService: Usando datos en caché
DetalleRubroService: Datos no cargados. Llama a inicializar() primero.
DetalleRubroService: Caché limpiada
```

---

## Conclusión

`DetalleRubroService` es un componente crítico del sistema saaFE que optimiza el acceso a datos maestros mediante un patrón de caché inteligente. Su correcta utilización garantiza:

- ⚡ **Performance**: Acceso síncrono sin subscripciones
- 🔄 **Reactividad**: Integración con Angular Signals
- 💾 **Eficiencia**: Una sola carga HTTP por sesión
- 🛡️ **Confiabilidad**: Restauración automática y manejo de errores

Para soporte adicional o dudas específicas, consulta la implementación en [`src/app/shared/services/detalle-rubro.service.ts`](../src/app/shared/services/detalle-rubro.service.ts).
