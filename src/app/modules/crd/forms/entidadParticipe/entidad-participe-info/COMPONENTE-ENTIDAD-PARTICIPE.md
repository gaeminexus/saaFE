# Componente: Entidad-Partícipe Info

## Descripción
Componente integrado para la edición simultánea de datos de **Entidad** y **Partícipe**. Permite gestionar toda la información relacionada con una persona (entidad) y sus datos como partícipe del fondo en una sola pantalla con diseño moderno por pestañas.

## Ubicación
```
src/app/modules/crd/forms/entidad-participe-info/
├── entidad-participe-info.component.ts     (450 líneas - Lógica)
├── entidad-participe-info.component.html   (600 líneas - Template)
├── entidad-participe-info.component.scss   (400 líneas - Estilos)
└── COMPONENTE-ENTIDAD-PARTICIPE.md        (Este archivo)
```

## Características Principales

### ✅ Diseño por Pestañas
- **Pestaña 1: Datos de la Entidad** - Información general de la persona
- **Pestaña 2: Datos del Partícipe** - Información específica del contrato

### ✅ Gestión de Formularios Duales
- Dos `FormGroup` independientes: `entidadForm` y `participeForm`
- Validación combinada: ambos formularios deben ser válidos para guardar
- Guardado secuencial: primero Entidad, luego Partícipe con referencia

### ✅ Modos de Operación
- **Modo Creación**: Crear nueva Entidad y Partícipe desde cero
- **Modo Edición**: Cargar y editar Entidad y Partícipe existentes

### ✅ Manejo Avanzado de Datos
- Objetos completos en selects (no IDs primitivos)
- Comparación de objetos con `compareWith`
- Formateo automático de fechas según tipo (con/sin hora)
- Carga paralela de datos de catálogos con `forkJoin`

## Estructura de Datos

### Pestaña 1: Entidad (5 secciones)

#### 1. Identificación
- Código (readonly en edición)
- Filial* (select de objetos `Filial`)
- Tipo Identificación* (select de objetos `TipoIdentificacion`)
- Número de Identificación*

#### 2. Nombres y Razón Social
- Razón Social*
- Nombre Comercial
- Fecha de Nacimiento

#### 3. Contacto
- Correo Personal
- Correo Institucional
- Teléfono
- Móvil
- Checkboxes: Teléfono verificado, Correo verificado, Móvil verificado

#### 4. Información Adicional
- Cargas Familiares (numérico)
- Sector Público (select A/I/N)
- ID Ciudad
- % Similitud
- URL Foto/Logo
- Estado*
- Migrado (checkbox)

### Pestaña 2: Partícipe (3 secciones)

#### 1. Datos Básicos del Partícipe
- Código (readonly)
- Código Alterno
- Tipo Partícipe* (select de objetos `TipoParticipe`)
- Remuneración Unificada*
- Fecha Ingreso al Fondo*

#### 2. Información Laboral
- Fecha Ingreso Trabajo
- Cargo Actual
- Lugar de Trabajo
- Unidad Administrativa
- Nivel de Estudios
- Ingreso Adicional Mensual
- Actividad Ingreso Adicional

#### 3. Estado y Salida
- Estado Actual
- Estado Cesante
- Estado*
- Fecha de Salida
- Motivo de Salida
- Fecha de Fallecimiento
- Causa de Fallecimiento

## Uso del Componente

### Integración en Routing

```typescript
// En app.routes.ts o módulo de routing correspondiente
{
  path: 'entidad-participe-info',
  component: EntidadParticipeInfoComponent,
  title: 'Gestión Entidad-Partícipe'
}
```

### Navegación para Crear

```typescript
// Desde cualquier componente
this.router.navigate(['/menucreditos/entidad-participe-info']);
```

### Navegación para Editar

```typescript
// Con query params para cargar datos existentes
this.router.navigate(['/menucreditos/entidad-participe-info'], {
  queryParams: {
    codigoEntidad: '12345',
    codigoParticipe: '67890'
  }
});
```

### Recibir Resultado tras Guardar

```typescript
// El componente emite eventos (si se implementan Outputs)
// O navega de vuelta tras guardar exitoso
```

## Servicios Requeridos

El componente inyecta los siguientes servicios:

1. **EntidadService** - CRUD de entidades
2. **ParticipeService** - CRUD de partícipes
3. **FilialService** - Catálogo de filiales
4. **TipoIdentificacionService** - Catálogo de tipos de identificación
5. **TipoParticipeService** - Catálogo de tipos de partícipe
6. **FuncionesDatosService** - Formateo de fechas
7. **Router** - Navegación
8. **ActivatedRoute** - Lectura de query params
9. **FormBuilder** - Construcción de formularios reactivos

## Configuración de Fechas

El componente utiliza el sistema de formateo centralizado:

```typescript
import { TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';

// En prepararDatosEntidad()
return this.funcionesDatosService.formatearFechasParaBackend(formValue, [
  { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA }
]);

// En prepararDatosParticipe()
return this.funcionesDatosService.formatearFechasParaBackend(formValue, [
  { campo: 'fechaIngresoFondo', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
  { campo: 'fechaIngresoTrabajo', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
  { campo: 'fechaSalida', tipo: TipoFormatoFechaBackend.FECHA_HORA },
  { campo: 'fechaFallecimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA }
]);
```

## Validaciones

### Campos Obligatorios - Entidad
- Filial
- Tipo Identificación
- Número de Identificación
- Razón Social
- Estado

### Campos Obligatorios - Partícipe
- Tipo Partícipe
- Remuneración Unificada
- Fecha Ingreso al Fondo
- Estado

### Validación Visual
- Mensajes de error debajo de cada campo inválido
- Botón "Guardar" deshabilitado si algún formulario es inválido
- Color rojo en campos con errores

## Flujo de Guardado

### 1. Validación
```typescript
isFormValid = computed(() => this.entidadForm?.valid && this.participeForm?.valid);
```

### 2. Preparación de Datos
- Formateo de fechas según configuración
- Conversión de objetos a estructura esperada por backend

### 3. Guardado Secuencial
```typescript
guardar(): void {
  // Paso 1: Guardar Entidad
  this.entidadService.add/update(entidadData).subscribe(entidadGuardada => {
    // Paso 2: Guardar Partícipe con referencia a Entidad guardada
    const participeData = this.prepararDatosParticipe(entidadGuardada);
    this.participeService.add/update(participeData).subscribe(result => {
      // Éxito: navegar o mostrar mensaje
      this.router.navigate(['/menucreditos/participe-dash']);
    });
  });
}
```

## Estados del Componente

### Signals Utilizados

```typescript
// Estados de carga
isLoading = signal<boolean>(false);
hasError = signal<boolean>(false);
errorMessage = signal<string>('');
isSaving = signal<boolean>(false);

// Datos de catálogos
filialesOptions = signal<Filial[]>([]);
tiposIdentificacionOptions = signal<TipoIdentificacion[]>([]);
tiposParticipeOptions = signal<TipoParticipe[]>([]);

// Estados de carga específicos
loadingFiliales = signal<boolean>(false);
loadingTiposIdentificacion = signal<boolean>(false);
loadingTiposParticipe = signal<boolean>(false);

// Códigos en modo edición
codigoEntidad = signal<number | null>(null);
codigoParticipe = signal<number | null>(null);

// Validación computada
isFormValid = computed(() => this.entidadForm?.valid && this.participeForm?.valid);
```

## Estilos y Diseño

### Características Visuales
- **Cards con gradientes**: Encabezados con degradado azul
- **Iconos Material**: Cada sección y campo tiene iconos descriptivos
- **Responsive**: 3 breakpoints (desktop, tablet, mobile)
- **Outline fields**: Campos con apariencia `outline` consistente
- **Pestañas con iconos**: Tabs con íconos y etiquetas

### Clases CSS Principales
```scss
.entidad-participe-container  // Contenedor principal
.header-section              // Encabezado con título y botones
.actions                     // Grupo de botones de acción
.loading-container          // Estado de carga centrado
.error-card                 // Card de error
.form-section              // Cards de formulario
.form-row                  // Fila de campos (flexbox)
.full-width               // Campo 100%
.half-width              // Campo 50%
.third-width            // Campo 33.33%
.checkbox-row          // Fila de checkboxes
```

### Responsive Breakpoints
- **Desktop**: > 1200px - Layout completo
- **Tablet**: 768px - 1200px - Campos adaptativos
- **Mobile**: < 768px - Una columna, botones apilados
- **Small Mobile**: < 480px - Compacto máximo

## Mejores Prácticas

### 1. Manejo de Objetos
```typescript
// ✅ CORRECTO: Usar objetos completos
<mat-select formControlName="filial" [compareWith]="compararPorCodigo">
  <mat-option [value]="filial">{{ filial.nombre }}</mat-option>
</mat-select>

// ❌ INCORRECTO: Usar IDs primitivos
<mat-select formControlName="idFilial">
  <mat-option [value]="filial.codigo">{{ filial.nombre }}</mat-option>
</mat-select>
```

### 2. Formateo de Fechas
```typescript
// ✅ CORRECTO: Usar servicio centralizado con configuración
this.funcionesDatosService.formatearFechasParaBackend(data, [
  { campo: 'fecha', tipo: TipoFormatoFechaBackend.SOLO_FECHA }
]);

// ❌ INCORRECTO: Formateo manual
const fecha = new Date(data.fecha).toISOString();
```

### 3. Validación de Campos
```typescript
// ✅ CORRECTO: Método reutilizable
esCampoInvalido(campo: string, formulario: 'entidad' | 'participe'): boolean {
  const form = formulario === 'entidad' ? this.entidadForm : this.participeForm;
  const control = form.get(campo);
  return !!(control && control.invalid && (control.dirty || control.touched));
}

// En template
@if (esCampoInvalido('razonSocial', 'entidad')) {
  <mat-error>{{ obtenerErrorCampo('razonSocial', 'entidad') }}</mat-error>
}
```

## Extensiones Futuras

### Posibles Mejoras
1. **Outputs para eventos**: Emitir eventos al guardar/cancelar
2. **Confirmación de salida**: Detectar cambios no guardados
3. **Historial de cambios**: Auditoría de modificaciones
4. **Carga de archivos**: Subir foto/logo de entidad
5. **Validaciones cruzadas**: Entre campos de ambos formularios
6. **Auto-guardado**: Guardar borradores automáticamente

### Integración con otros Módulos
- **Partícipe Dashboard**: Navegar desde listado de partícipes
- **Reportes**: Generar PDF con información completa
- **Workflow**: Integrar con procesos de aprobación

## Troubleshooting

### Error: "No provider for DatePipe"
**Solución**: El servicio `FuncionesDatosService` no usa `DatePipe`. Si aparece este error, verifica imports.

### Error: "Cannot read property 'value' of null"
**Solución**: Asegúrate de que los FormGroups están inicializados en `ngOnInit()`.

### Los selects no muestran el valor seleccionado
**Solución**: Verifica que uses `[compareWith]="compararPorCodigo"` en los mat-select de objetos.

### Las fechas se guardan con formato incorrecto
**Solución**: Revisa la configuración en `prepararDatosEntidad()` y `prepararDatosParticipe()`.

## Dependencias de Material

El componente usa `MaterialFormModule` que exporta:
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatDatepickerModule
- MatNativeDateModule
- MatCheckboxModule
- MatButtonModule
- MatIconModule
- MatCardModule
- MatProgressSpinnerModule
- MatTabsModule

## Autores y Mantenimiento

- **Creado**: 2024 - Sistema SAA Frontend v1
- **Última actualización**: Implementación completa con diseño moderno por pestañas
- **Mantenedor**: Equipo de Desarrollo CRD

---

## Ejemplo Completo de Uso

```typescript
// 1. Desde un listado, navegar para crear nuevo
crearNuevo(): void {
  this.router.navigate(['/menucreditos/entidad-participe-info']);
}

// 2. Desde un listado, navegar para editar
editarRegistro(entidad: Entidad, participe: Participe): void {
  this.router.navigate(['/menucreditos/entidad-participe-info'], {
    queryParams: {
      codigoEntidad: entidad.codigo,
      codigoParticipe: participe.codigo
    }
  });
}

// 3. El componente detecta automáticamente el modo
// - Si hay queryParams: modo edición (carga datos)
// - Si NO hay queryParams: modo creación (formulario vacío)
```
