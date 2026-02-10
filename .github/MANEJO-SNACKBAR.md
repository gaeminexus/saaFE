# Guía de Implementación de SnackBars (Notificaciones)

Documentación sobre el uso correcto de `MatSnackBar` para mostrar notificaciones al usuario en la aplicación.

## 📋 Índice

- [Configuración Básica](#configuración-básica)
- [Estilos Globales Requeridos](#estilos-globales-requeridos)
- [Implementación en Componentes](#implementación-en-componentes)
- [Configuración Recomendada](#configuración-recomendada)
- [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Configuración Básica

### 1. Imports Necesarios

En el componente standalone:

```typescript
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [
    // ... otros imports
    MatSnackBarModule,
  ],
  // ...
})
export class MiComponente {
  constructor(private snackBar: MatSnackBar) {}
  
  // O usando inject (preferido en nuevos componentes):
  // private snackBar = inject(MatSnackBar);
}
```

---

## Estilos Globales Requeridos

⚠️ **CRÍTICO**: Los estilos de `panelClass` DEBEN estar en `src/styles.scss` (estilos globales), NO en los estilos del componente.

**Razón:** Los overlays de Material (SnackBar, Dialog, etc.) se renderizan fuera del componente, directamente en el `<body>`, por lo que no tienen acceso a los estilos encapsulados del componente.

### Ubicación: `src/styles.scss`

```scss
// Estilos globales para SnackBar (deben estar aquí, no en componentes)
.success-snackbar {
  background: #4caf50 !important;
  color: white !important;
  
  .mat-mdc-snack-bar-label {
    color: white !important;
  }
}

.error-snackbar {
  background: #f44336 !important;
  color: white !important;
  
  .mat-mdc-snack-bar-label {
    color: white !important;
  }
}

.warning-snackbar {
  background: #ff9800 !important;
  color: white !important;
  
  .mat-mdc-snack-bar-label {
    color: white !important;
  }
}

.info-snackbar {
  background: #667eea !important;
  color: white !important;
  
  .mat-mdc-snack-bar-label {
    color: white !important;
  }
}
```

---

## Implementación en Componentes

### Método Helper Recomendado

Crear un método privado en el componente para centralizar la lógica:

```typescript
private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
  let panelClass = '';
  switch (type) {
    case 'success':
      panelClass = 'success-snackbar';
      break;
    case 'error':
      panelClass = 'error-snackbar';
      break;
    case 'warn':
      panelClass = 'warning-snackbar';
      break;
    case 'info':
      panelClass = 'info-snackbar';
      break;
  }

  this.snackBar.open(message, 'Cerrar', {
    duration: 6000,                      // 6 segundos
    panelClass: [panelClass],            // Clase CSS (debe estar en styles.scss)
    horizontalPosition: 'center',        // Posición horizontal
    verticalPosition: 'bottom'           // Posición vertical
  });
}
```

---

## Configuración Recomendada

### ✅ Configuración que FUNCIONA (Probada en Producción)

**Basada en:** `table-basic-hijos.component.ts`, `asientos-contables-dinamico.ts`

```typescript
this.snackBar.open(mensaje, 'Cerrar', {
  duration: 6000,                    // ← 6 segundos (tiempo suficiente para leer)
  panelClass: ['error-snackbar'],    // ← Clases con guión: success-, error-, warning-, info-
  horizontalPosition: 'center',      // ← Centro horizontal
  verticalPosition: 'bottom'         // ← BOTTOM (no 'top')
});
```

### ❌ Configuraciones que NO Funcionan

```typescript
// ❌ MAL: Estilos en el componente
@Component({
  styleUrls: ['./componente.scss']  // ← Los estilos de panelClass NO funcionan aquí
})

// ❌ MAL: verticalPosition 'top' puede quedar tapado por headers/overlays
verticalPosition: 'top'  // ← Puede no ser visible

// ❌ MAL: Nombres de clase invertidos
panelClass: ['snackbar-error']  // ← Usar 'error-snackbar'

// ❌ MAL: Sin usar panelClass (sin estilos)
this.snackBar.open(mensaje, 'Cerrar', {
  duration: 4000
  // ← Sin panelClass, sin colores
});
```

---

## Problemas Comunes y Soluciones

### Problema 1: "El SnackBar no se muestra"

**Síntomas:** 
- Console.log confirma que se llama a `snackBar.open()`
- No aparece visualmente en pantalla
- SnackBarRef se crea correctamente

**Soluciones:**

1. **Verificar posición vertical:**
   ```typescript
   verticalPosition: 'bottom'  // ← Usar bottom, no top
   ```

2. **Agregar delay después de cerrar dialogs:**
   ```typescript
   dialogRef.afterClosed().subscribe((confirmed) => {
     if (confirmed) {
       // Delay para que el dialog se cierre completamente
       setTimeout(() => {
         this.showMessage('Mensaje', 'error');
       }, 300);
     }
   });
   ```

3. **Verificar z-index en estilos globales:**
   ```scss
   .mat-mdc-snack-bar-container {
     z-index: 10000 !important;  // ← Asegurar que esté encima
   }
   ```

### Problema 2: "El SnackBar no tiene colores/estilos"

**Causa:** Los estilos de `panelClass` están en el archivo SCSS del componente en lugar de `styles.scss`.

**Solución:** Mover todas las clases de snackbar a `src/styles.scss`.

### Problema 3: "Nombres de clase inconsistentes"

**Síntoma:** En algunos componentes funciona, en otros no.

**Solución:** Estandarizar nombres de clase:
- ✅ `success-snackbar`
- ✅ `error-snackbar`
- ✅ `warning-snackbar`
- ✅ `info-snackbar`

❌ NO usar: `snackbar-success`, `snackbar-error`, etc.

---

## Ejemplos de Uso

### Ejemplo 1: Notificación de Éxito

```typescript
guardarDatos(): void {
  this.service.save(datos).subscribe({
    next: (response) => {
      this.showMessage('Datos guardados correctamente', 'success');
      this.loadData();
    },
    error: (error) => {
      const errorMsg = error?.error?.message || 'Error al guardar';
      this.showMessage(errorMsg, 'error');
    }
  });
}
```

### Ejemplo 2: Validación con Mensaje de Advertencia

```typescript
validarFormulario(): boolean {
  if (!this.form.valid) {
    this.showMessage('Complete todos los campos requeridos', 'warn');
    return false;
  }
  return true;
}
```

### Ejemplo 3: Mensaje de Información

```typescript
ngOnInit(): void {
  this.loadData();
  this.showMessage('Datos cargados correctamente', 'info');
}
```

### Ejemplo 4: Eliminación con Dialog y SnackBar

```typescript
eliminar(item: Item): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    data: {
      title: 'Eliminar Item',
      message: '¿Está seguro?'
    }
  });

  dialogRef.afterClosed().subscribe((confirmed) => {
    if (confirmed) {
      this.service.delete(item.id).subscribe({
        next: (response) => {
          // Delay para que el dialog se cierre completamente
          setTimeout(() => {
            if (response === 'OK') {
              this.showMessage('Item eliminado correctamente', 'success');
              this.loadData();
            } else {
              // Backend devuelve mensaje de error como string
              this.showMessage(response || 'No se pudo eliminar', 'error');
            }
          }, 300);
        },
        error: (error) => {
          setTimeout(() => {
            const errorMsg = error?.error || 'Error al eliminar';
            this.showMessage(errorMsg, 'error');
          }, 300);
        }
      });
    }
  });
}
```

---

## Checklist de Implementación

Al implementar SnackBars en un nuevo componente, verificar:

- [ ] `MatSnackBarModule` importado en el componente standalone
- [ ] `MatSnackBar` inyectado en constructor o con `inject()`
- [ ] Método `showMessage()` implementado con configuración estándar
- [ ] Clases CSS en `src/styles.scss` (NO en componente)
- [ ] `verticalPosition: 'bottom'`
- [ ] `horizontalPosition: 'center'`
- [ ] `duration: 6000` (6 segundos)
- [ ] Nombres de clase: `success-snackbar`, `error-snackbar`, etc.
- [ ] Delay de 300ms si se muestra después de cerrar un dialog

---

## Referencias de Código

Componentes con implementación correcta:
- `src/app/shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component.ts`
- `src/app/modules/cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico.ts`
- `src/app/modules/cnt/forms/periodo-contable/periodo-contable.component.ts`

Estilos globales:
- `src/styles.scss` (líneas con clases de snackbar)

---

## Notas Técnicas

### Angular Material y Overlays

Los overlays de Angular Material (SnackBar, Dialog, Tooltip, Menu, etc.) se renderizan usando el `Overlay` service, que crea elementos DOM fuera del árbol del componente, directamente bajo `<body>`. Por esta razón:

1. **View Encapsulation no aplica:** Los estilos del componente con `ViewEncapsulation.Emulated` (default) no afectan a los overlays.

2. **Estilos deben ser globales:** Usar `styles.scss` o agregar `encapsulation: ViewEncapsulation.None` (no recomendado).

3. **z-index considerations:** Los overlays tienen z-index altos por defecto (>1000), pero pueden ser tapados por elementos con z-index superior.

### Diferencias entre Angular Versions

- **Angular 14-:** Clases CSS: `.mat-snack-bar-container`, `.mat-simple-snackbar`
- **Angular 15+:** Clases CSS: `.mat-mdc-snack-bar-container`, `.mat-mdc-snack-bar-label`

Nuestra app usa Angular 20, por lo que debemos usar las clases `mat-mdc-*`.

---

**Última actualización:** Febrero 2026  
**Autor:** Equipo de Desarrollo saaFE  
**Basado en:** Issue de SnackBars en periodo-contable (Enero 2026)
