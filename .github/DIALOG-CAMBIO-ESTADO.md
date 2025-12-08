# Diálogo Genérico de Cambio de Estado

## Descripción

`AuditoriaDialogComponent` es un componente genérico y reutilizable para cambiar el estado de cualquier entidad del sistema (Entidad, Préstamo, Aporte, etc.).

## Ubicación

```
src/app/modules/crd/dialog/auditoria-dialog/
├── auditoria-dialog.component.ts
├── auditoria-dialog.component.html
├── auditoria-dialog.component.scss
└── auditoria-dialog.component.spec.ts
```

## Interfaces

### CambiarEstadoDialogData

```typescript
export interface CambiarEstadoDialogData {
  entidad: any; // Entidad genérica (puede ser Entidad, Prestamo, Aporte, etc.)
  estadosDisponibles: any[]; // Lista de estados disponibles
  titulo?: string; // Título personalizado del diálogo (default: 'Cambiar Estado')
  entidadTipo?: string; // Tipo de entidad (default: 'Entidad')
  campoNombre?: string; // Campo a mostrar como nombre (default: 'razonSocial')
  campoIdentificacion?: string; // Campo de identificación (default: 'numeroIdentificacion')
  campoEstadoActual?: string; // Campo del estado actual (default: 'idEstado')
}
```

### CambiarEstadoDialogResult

```typescript
export interface CambiarEstadoDialogResult {
  nuevoEstado: number; // Código del nuevo estado seleccionado
  motivo: string; // Motivo del cambio (mínimo 10 caracteres)
}
```

## Ejemplos de Uso

### 1. Cambiar Estado de Entidad (Partícipe)

```typescript
import { MatDialog } from '@angular/material/dialog';
import { AuditoriaDialogComponent, CambiarEstadoDialogData } from '@crd/dialog/auditoria-dialog/auditoria-dialog.component';

// En tu componente
constructor(private dialog: MatDialog) {}

cambiarEstadoEntidad(entidad: Entidad, estadosDisponibles: EstadoParticipe[]): void {
  const dialogData: CambiarEstadoDialogData = {
    entidad: entidad,
    estadosDisponibles: estadosDisponibles,
    titulo: 'Cambiar Estado de Partícipe',
    entidadTipo: 'Partícipe',
    campoNombre: 'razonSocial',
    campoIdentificacion: 'numeroIdentificacion',
    campoEstadoActual: 'idEstado'
  };

  const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
    width: '600px',
    data: dialogData,
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // result.nuevoEstado = código del nuevo estado
      // result.motivo = motivo del cambio
      this.ejecutarCambioEstado(entidad.codigo, result.nuevoEstado, result.motivo);
    }
  });
}
```

### 2. Cambiar Estado de Préstamo

```typescript
cambiarEstadoPrestamo(prestamo: Prestamo, estadosDisponibles: EstadoPrestamo[]): void {
  const dialogData: CambiarEstadoDialogData = {
    entidad: prestamo,
    estadosDisponibles: estadosDisponibles,
    titulo: 'Cambiar Estado de Préstamo',
    entidadTipo: 'Préstamo',
    campoNombre: 'producto.nombre', // Campo anidado
    campoIdentificacion: 'codigo',
    campoEstadoActual: 'estadoPrestamo.codigo' // Campo anidado
  };

  const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
    width: '600px',
    data: dialogData,
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.prestamoService.cambiarEstado(prestamo.codigo, result.nuevoEstado, result.motivo)
        .subscribe({
          next: () => {
            this.snackBar.open('Estado del préstamo actualizado', 'Cerrar', { duration: 3000 });
            this.cargarDatos(); // Recargar datos
          },
          error: (err) => {
            this.snackBar.open('Error al cambiar estado', 'Cerrar', { duration: 3000 });
          }
        });
    }
  });
}
```

### 3. Cambiar Estado de Aporte

```typescript
cambiarEstadoAporte(aporte: Aporte, estadosDisponibles: EstadoAporte[]): void {
  const dialogData: CambiarEstadoDialogData = {
    entidad: aporte,
    estadosDisponibles: estadosDisponibles,
    titulo: 'Cambiar Estado de Aporte',
    entidadTipo: 'Aporte',
    campoNombre: 'entidad.razonSocial', // Campo anidado
    campoIdentificacion: 'codigo',
    campoEstadoActual: 'idEstado'
  };

  const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
    width: '600px',
    data: dialogData
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Lógica de cambio de estado
    }
  });
}
```

### 4. Cambiar Estado de Producto

```typescript
cambiarEstadoProducto(producto: Producto, estadosDisponibles: any[]): void {
  const dialogData: CambiarEstadoDialogData = {
    entidad: producto,
    estadosDisponibles: [
      { codigo: 1, nombre: 'ACTIVO' },
      { codigo: 2, nombre: 'INACTIVO' }
    ],
    titulo: 'Cambiar Estado de Producto',
    entidadTipo: 'Producto',
    campoNombre: 'nombre',
    campoIdentificacion: 'codigo',
    campoEstadoActual: 'estado'
  };

  const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
    width: '600px',
    data: dialogData
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Actualizar producto
      producto.estado = result.nuevoEstado;
      this.productoService.update(producto).subscribe();
    }
  });
}
```

## Características

### ✅ Genérico y Reutilizable

- Funciona con **cualquier tipo de entidad**
- Configuración flexible mediante parámetros

### ✅ Soporte para Campos Anidados

- Puede acceder a propiedades anidadas como `producto.nombre`, `estadoPrestamo.codigo`
- Sintaxis con punto: `'entidad.razonSocial'`

### ✅ Validaciones

- Estado nuevo: **requerido**
- Motivo: **requerido, mínimo 10 caracteres**

### ✅ UI/UX

- Muestra información resumida de la entidad
- Estado actual destacado con badge
- Mensaje de advertencia
- Botones con iconos Material

## Configuración por Defecto

Si no se especifican los parámetros opcionales, se usan estos valores:

```typescript
{
  titulo: 'Cambiar Estado',
  entidadTipo: 'Entidad',
  campoNombre: 'razonSocial',
  campoIdentificacion: 'numeroIdentificacion',
  campoEstadoActual: 'idEstado'
}
```

## Integración con Auditoría

Este diálogo se puede integrar con el sistema de auditoría para registrar todos los cambios de estado:

```typescript
dialogRef.afterClosed().subscribe((result) => {
  if (result) {
    // 1. Ejecutar cambio de estado
    this.entidadService.cambiarEstado(entidad.codigo, result.nuevoEstado).subscribe({
      next: () => {
        // 2. Registrar en auditoría
        const auditoria: Auditoria = {
          modulo: 'CRD',
          entidad: 'ENTIDAD',
          idEntidad: entidad.codigo,
          accion: 'ACTUALIZAR',
          nombreCampoAnterior: 'idEstado',
          valorAnterior: entidad.idEstado.toString(),
          nombreCampoNuevo: 'idEstado',
          valorNuevo: result.nuevoEstado.toString(),
          motivo: result.motivo,
          // ... otros campos
        };

        this.auditoriaService.add(auditoria).subscribe();
      },
    });
  }
});
```

## Notas Técnicas

- Componente **standalone** (no requiere módulo)
- Usa **Material Dialog** (`MatDialog`)
- Formulario reactivo con **FormBuilder**
- Inyección de datos con **MAT_DIALOG_DATA**
- TypeScript estricto compatible

## Migración desde EntidadCambiarEstadoDialog

Si tienes código usando `EntidadCambiarEstadoDialogComponent`, puedes migrarlo fácilmente:

```typescript
// ❌ Antes (específico para entidades)
this.dialog.open(EntidadCambiarEstadoDialogComponent, {
  data: { entidad, estadosDisponibles },
});

// ✅ Ahora (genérico)
this.dialog.open(AuditoriaDialogComponent, {
  data: {
    entidad,
    estadosDisponibles,
    titulo: 'Cambiar Estado de Partícipe',
    entidadTipo: 'Partícipe',
  },
});
```

---

**Última actualización:** Diciembre 2025
