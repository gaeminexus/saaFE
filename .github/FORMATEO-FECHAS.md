# Guía de Formateo de Fechas para Backend

## 📋 Formato Estándar

Todas las fechas que se envían al backend **DEBEN** usar el formato:

```
yyyy-MM-dd HH:mm:ss
```

**Ejemplo:** `2025-02-05 14:43:28`

## 🎯 Servicio Centralizado

Se ha creado un servicio centralizado en `shared/services/funciones-datos.service.ts` para manejar el formateo de fechas de forma consistente en toda la aplicación.

### Métodos Disponibles

#### 1. `formatearFechaParaBackend(fecha, incluirHora?)`

Formatea una fecha individual al formato del backend.

**Parámetros:**
- `fecha`: `Date | string | null | undefined` - La fecha a formatear
- `incluirHora`: `boolean` (opcional, default: `true`) - Si incluir la hora o solo la fecha

**Retorna:** `string | null` - Fecha formateada o `null` si es inválida

**Ejemplos:**

```typescript
import { FuncionesDatosService } from '@shared/services/funciones-datos.service';

// Inyectar el servicio
private funcionesDatosService = inject(FuncionesDatosService);

// Uso básico
const fechaFormateada = this.funcionesDatosService.formatearFechaParaBackend(new Date());
// Resultado: "2025-02-05 14:43:28"

// Solo fecha (sin hora)
const soloFecha = this.funcionesDatosService.formatearFechaParaBackend(new Date(), false);
// Resultado: "2025-02-05"

// Manejo de null
const fechaNull = this.funcionesDatosService.formatearFechaParaBackend(null);
// Resultado: null
```

#### 2. `formatearFechasParaBackend(obj, camposFecha, incluirHora?)`

Formatea múltiples campos de fecha en un objeto de una sola vez.

**Parámetros:**
- `obj`: `any` - Objeto con campos de fecha
- `camposFecha`: `string[]` - Array con nombres de campos que contienen fechas
- `incluirHora`: `boolean` (opcional, default: `true`) - Si incluir la hora

**Retorna:** `any` - Nuevo objeto con fechas formateadas

**Ejemplo:**

```typescript
const datosFormulario = {
  nombre: 'Juan Pérez',
  fechaNacimiento: new Date('1990-05-15'),
  fechaIngreso: new Date(),
  correo: 'juan@example.com'
};

const datosParaBackend = this.funcionesDatosService.formatearFechasParaBackend(
  datosFormulario, 
  ['fechaNacimiento', 'fechaIngreso']
);

// Resultado:
// {
//   nombre: 'Juan Pérez',
//   fechaNacimiento: '1990-05-15 00:00:00',
//   fechaIngreso: '2025-02-05 14:43:28',
//   correo: 'juan@example.com'
// }
```

## 💡 Patrones de Uso Comunes

### En Componentes con FormGroup

```typescript
export class MiComponente {
  private funcionesDatosService = inject(FuncionesDatosService);
  
  prepararDatos(formValue: any): Partial<MiEntidad> {
    return {
      ...formValue,
      // Formatear fecha individual
      fechaNacimiento: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaNacimiento) as any,
      // Otros campos...
    };
  }
}
```

### Con Múltiples Fechas

```typescript
prepararDatos(formValue: any): Partial<MiEntidad> {
  return this.funcionesDatosService.formatearFechasParaBackend(
    formValue,
    ['fechaNacimiento', 'fechaContrato', 'fechaVencimiento']
  );
}
```

### En Servicios

```typescript
@Injectable({ providedIn: 'root' })
export class MiService {
  private funcionesDatosService = inject(FuncionesDatosService);
  
  crear(entidad: MiEntidad): Observable<MiEntidad> {
    const datosParaBackend = this.funcionesDatosService.formatearFechasParaBackend(
      entidad,
      ['fechaCreacion', 'fechaModificacion']
    );
    
    return this.http.post<MiEntidad>(this.url, datosParaBackend);
  }
}
```

## ⚠️ Errores Comunes a Evitar

### ❌ NO hacer esto:

```typescript
// NO - Enviar Date object directamente
const datos = {
  fecha: new Date()  // El backend recibirá ISO string incorrecto
};

// NO - Formateo manual inconsistente
const datos = {
  fecha: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`
};

// NO - Usar toISOString() o toLocaleDateString()
const datos = {
  fecha: new Date().toISOString()  // Formato incorrecto para el backend
};
```

### ✅ SÍ hacer esto:

```typescript
// SÍ - Usar el servicio centralizado
const datos = {
  fecha: this.funcionesDatosService.formatearFechaParaBackend(formValue.fecha)
};

// SÍ - Para múltiples fechas
const datos = this.funcionesDatosService.formatearFechasParaBackend(
  formValue,
  ['fecha1', 'fecha2', 'fecha3']
);
```

## 🔍 Campos de Metadata

Los campos de auditoría (metadata) como `fechaIngreso`, `fechaModificacion`, `usuarioIngreso`, etc., normalmente:

1. Están marcados como `disabled: true` en el FormGroup
2. No se deben enviar al backend (el backend los maneja automáticamente)
3. Deben eliminarse antes de enviar datos

**Ejemplo:**

```typescript
prepararDatos(formValue: any): Partial<Entidad> {
  const datos = {
    ...formValue,
    // Formatear solo fechas editables por el usuario
    fechaNacimiento: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaNacimiento) as any
  };

  // Eliminar campos de metadata
  delete (datos as any).usuarioIngreso;
  delete (datos as any).fechaIngreso;
  delete (datos as any).usuarioModificacion;
  delete (datos as any).fechaModificacion;
  
  return datos;
}
```

## 📝 Checklist de Implementación

Cuando trabajes con fechas en un nuevo componente:

- [ ] Importar `FuncionesDatosService`
- [ ] Inyectar el servicio
- [ ] Identificar todos los campos de tipo `Date` en el modelo
- [ ] Usar `formatearFechaParaBackend()` o `formatearFechasParaBackend()` en `prepararDatos()`
- [ ] Verificar que no se envíen campos de metadata
- [ ] Probar con una fecha real que se guarde correctamente en el formato `yyyy-MM-dd HH:mm:ss`

## 🎨 Ejemplo Completo

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FuncionesDatosService } from '@shared/services/funciones-datos.service';

@Component({
  selector: 'app-ejemplo',
  // ...
})
export class EjemploComponent {
  private fb = inject(FormBuilder);
  private funcionesDatosService = inject(FuncionesDatosService);
  
  formulario: FormGroup = this.fb.group({
    nombre: [''],
    fechaNacimiento: [null],
    fechaContrato: [null],
    // Metadata (disabled)
    fechaIngreso: [{ value: null, disabled: true }],
    usuarioIngreso: [{ value: '', disabled: true }]
  });
  
  guardar(): void {
    const datosParaBackend = this.prepararDatos(this.formulario.value);
    // Enviar datosParaBackend al servicio...
  }
  
  prepararDatos(formValue: any): any {
    const datos = this.funcionesDatosService.formatearFechasParaBackend(
      formValue,
      ['fechaNacimiento', 'fechaContrato']
    );
    
    // Eliminar metadata
    delete datos.fechaIngreso;
    delete datos.usuarioIngreso;
    
    return datos;
  }
}
```

## 🚀 Migración de Código Existente

Si encuentras código que formatea fechas manualmente:

1. Importar `FuncionesDatosService`
2. Reemplazar el código manual con `formatearFechaParaBackend()`
3. Verificar que el formato sea correcto
4. Eliminar funciones locales de formateo de fechas

---

**Documentado:** Noviembre 2025  
**Servicio:** `shared/services/funciones-datos.service.ts`  
**Formato:** `yyyy-MM-dd HH:mm:ss`
