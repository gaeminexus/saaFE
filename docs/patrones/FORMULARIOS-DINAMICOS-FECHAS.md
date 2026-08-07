# Uso de Formateo de Fechas en Formularios Dinámicos

## 📋 Configuración de Campos de Fecha

### Ejemplo Básico

```typescript
import { DateFieldConfig } from '@shared/basics/table/dynamic-form/model/date.interface';
import { TipoFormatoFechaBackend } from '@shared/services/funciones-datos.service';

const fieldsConfig: FieldConfig[] = [
  // Campo de fecha con hora (por defecto)
  {
    type: 'date',
    name: 'fechaIngreso',
    label: 'Fecha de Ingreso',
    value: null,
    mostrarHora: true, // Muestra un campo adicional para seleccionar hora
    formatoBackend: TipoFormatoFechaBackend.FECHA_HORA
  } as DateFieldConfig,

  // Campo de solo fecha (sin hora)
  {
    type: 'date',
    name: 'fechaNacimiento',
    label: 'Fecha de Nacimiento',
    value: null,
    formatoBackend: TipoFormatoFechaBackend.SOLO_FECHA
    // mostrarHora no es necesario cuando solo queremos la fecha
  } as DateFieldConfig,

  // Campo de fecha con hora en 00:00:00
  {
    type: 'date',
    name: 'fechaVencimiento',
    label: 'Fecha de Vencimiento',
    value: null,
    formatoBackend: TipoFormatoFechaBackend.FECHA_HORA_CERO
  } as DateFieldConfig
];
```

## 🎯 Tipos de Formato Disponibles

### `TipoFormatoFechaBackend.FECHA_HORA` (Default)
```typescript
// Entrada: new Date('2025-02-05 14:43:28')
// Salida: "2025-02-05 14:43:28"
```
**Uso:** Cuando necesitas la fecha y hora exacta del usuario  
**UI:** Usa `mostrarHora: true` para mostrar un campo de hora adicional en pantalla

### `TipoFormatoFechaBackend.SOLO_FECHA`
```typescript
// Entrada: new Date('2025-02-05 14:43:28')
// Salida: "2025-02-05"
```
**Uso:** Fechas de nacimiento, vencimientos, contratación (sin importar la hora)  
**UI:** No uses `mostrarHora`, solo se muestra el datepicker

### `TipoFormatoFechaBackend.FECHA_HORA_CERO`
```typescript
// Entrada: new Date('2025-02-05 14:43:28')
// Salida: "2025-02-05 00:00:00"
```
**Uso:** Cuando el backend requiere hora pero debe ser medianoche (inicio del día)  
**UI:** No uses `mostrarHora`, la hora siempre será 00:00:00

## 📅 Comportamiento en Pantalla

### Campo Solo Fecha (`mostrarHora: false` o no configurado)
```typescript
{
  type: 'date',
  name: 'fechaNacimiento',
  label: 'Fecha de Nacimiento',
  formatoBackend: TipoFormatoFechaBackend.SOLO_FECHA
}
```
**En pantalla:** Solo muestra un datepicker estándar de Angular Material  
**Al enviar:** Formato "yyyy-MM-dd"

### Campo Fecha y Hora (`mostrarHora: true`)
```typescript
{
  type: 'date',
  name: 'fechaIngreso',
  label: 'Fecha y Hora de Ingreso',
  mostrarHora: true,
  formatoBackend: TipoFormatoFechaBackend.FECHA_HORA
}
```
**En pantalla:** 
- Datepicker para seleccionar la fecha
- Campo de hora adicional (input type="time") para HH:mm:ss
- Icono de reloj junto al campo de hora

**Al enviar:** Formato "yyyy-MM-dd HH:mm:ss" con la hora seleccionada

## 💡 Uso con DynamicFormDateHelper

### Opción 1: Formateo Automático

```typescript
import { Component, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DynamicFormDateHelper } from '@shared/basics/table/dynamic-form/helpers/dynamic-form-date.helper';
import { FuncionesDatosService } from '@shared/services/funciones-datos.service';

export class MiFormularioComponent {
  private funcionesDatosService = inject(FuncionesDatosService);
  
  formGroup!: FormGroup;
  fieldsConfig: FieldConfig[] = [
    // ... configuración de campos
  ];
  
  guardar(): void {
    // Formatear automáticamente todas las fechas según su configuración
    const datosParaBackend = DynamicFormDateHelper.formatearFechasFormulario(
      this.formGroup,
      this.fieldsConfig,
      this.funcionesDatosService
    );
    
    // Enviar al backend
    this.miService.guardar(datosParaBackend).subscribe();
  }
}
```

### Opción 2: Con Transformaciones Adicionales

```typescript
guardar(): void {
  const datosParaBackend = DynamicFormDateHelper.prepararDatosParaBackend(
    this.formGroup,
    this.fieldsConfig,
    this.funcionesDatosService,
    (datos) => {
      // Transformaciones adicionales
      datos.activo = datos.activo ? 1 : 0;
      datos.estado = datos.estado || 1;
      
      // Eliminar campos no deseados
      delete datos.campoTemporal;
      
      return datos;
    }
  );
  
  this.miService.guardar(datosParaBackend).subscribe();
}
```

### Opción 3: Validación en Desarrollo

```typescript
ngOnInit(): void {
  // Validar configuración de fechas en desarrollo
  if (!environment.production) {
    const advertencias = DynamicFormDateHelper.validarConfiguracionFormulario(this.fieldsConfig);
    
    if (advertencias.length > 0) {
      console.warn('⚠️ Advertencias en configuración de fechas:', advertencias);
    }
  }
}
```

## 🔧 Uso Manual con FuncionesDatosService

### Formateo Individual

```typescript
import { inject } from '@angular/core';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '@shared/services/funciones-datos.service';

export class MiComponente {
  private funcionesDatosService = inject(FuncionesDatosService);
  
  prepararDatos(formValue: any) {
    return {
      ...formValue,
      // Solo fecha
      fechaNacimiento: this.funcionesDatosService.formatearFechaParaBackend(
        formValue.fechaNacimiento,
        TipoFormatoFechaBackend.SOLO_FECHA
      ),
      
      // Con hora
      fechaIngreso: this.funcionesDatosService.formatearFechaParaBackend(
        formValue.fechaIngreso,
        TipoFormatoFechaBackend.FECHA_HORA
      ),
      
      // Con hora en 00:00:00
      fechaVencimiento: this.funcionesDatosService.formatearFechaParaBackend(
        formValue.fechaVencimiento,
        TipoFormatoFechaBackend.FECHA_HORA_CERO
      )
    };
  }
}
```

### Formateo Múltiple con Configuración

```typescript
prepararDatos(formValue: any) {
  return this.funcionesDatosService.formatearFechasParaBackend(formValue, [
    // String simple = FECHA_HORA por defecto
    'fechaCreacion',
    
    // Con configuración específica
    { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
    { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA },
    { campo: 'fechaVencimiento', tipo: TipoFormatoFechaBackend.FECHA_HORA_CERO }
  ]);
}
```

## 📝 Ejemplo Completo

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FieldConfig } from '@shared/basics/table/dynamic-form/model/field.interface';
import { DateFieldConfig } from '@shared/basics/table/dynamic-form/model/date.interface';
import { TipoFormatoFechaBackend } from '@shared/services/funciones-datos.service';
import { FuncionesDatosService } from '@shared/services/funciones-datos.service';
import { DynamicFormDateHelper } from '@shared/basics/table/dynamic-form/helpers/dynamic-form-date.helper';

@Component({
  selector: 'app-ejemplo-completo',
  // ...
})
export class EjemploCompletoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private funcionesDatosService = inject(FuncionesDatosService);
  
  formGroup!: FormGroup;
  
  fieldsConfig: FieldConfig[] = [
    {
      type: 'input',
      name: 'nombre',
      label: 'Nombre',
      inputType: 'text',
      value: ''
    },
    {
      type: 'date',
      name: 'fechaNacimiento',
      label: 'Fecha de Nacimiento',
      value: null,
      formatoBackend: TipoFormatoFechaBackend.SOLO_FECHA,
      placeholder: 'Seleccione fecha'
    } as DateFieldConfig,
    {
      type: 'date',
      name: 'fechaIngreso',
      label: 'Fecha y Hora de Ingreso',
      value: null,
      formatoBackend: TipoFormatoFechaBackend.FECHA_HORA,
      mostrarHora: true
    } as DateFieldConfig,
    {
      type: 'date',
      name: 'fechaContrato',
      label: 'Fecha de Contrato',
      value: null,
      formatoBackend: TipoFormatoFechaBackend.FECHA_HORA_CERO
    } as DateFieldConfig
  ];
  
  ngOnInit(): void {
    this.inicializarFormulario();
    this.validarConfiguracion();
  }
  
  inicializarFormulario(): void {
    const controls: any = {};
    
    this.fieldsConfig.forEach(field => {
      controls[field.name] = [field.value || null];
    });
    
    this.formGroup = this.fb.group(controls);
  }
  
  validarConfiguracion(): void {
    const advertencias = DynamicFormDateHelper.validarConfiguracionFormulario(this.fieldsConfig);
    
    if (advertencias.length > 0) {
      console.warn('Configuración de fechas:', advertencias);
    }
  }
  
  guardar(): void {
    if (this.formGroup.invalid) {
      console.error('Formulario inválido');
      return;
    }
    
    // Opción 1: Usar el helper
    const datosParaBackend = DynamicFormDateHelper.prepararDatosParaBackend(
      this.formGroup,
      this.fieldsConfig,
      this.funcionesDatosService,
      (datos) => {
        // Transformaciones adicionales si es necesario
        return datos;
      }
    );
    
    console.log('Datos formateados:', datosParaBackend);
    // Resultado esperado:
    // {
    //   nombre: 'Juan Pérez',
    //   fechaNacimiento: '1990-05-15',
    //   fechaIngreso: '2025-02-05 14:43:28',
    //   fechaContrato: '2025-01-01 00:00:00'
    // }
    
    // Enviar al servicio
    // this.miService.guardar(datosParaBackend).subscribe();
  }
}
```

## ⚠️ Consideraciones Importantes

1. **El formGroup mantiene Date objects** - Los valores en el formulario siguen siendo `Date` para que el datepicker funcione correctamente

2. **El formateo se hace al enviar** - Solo cuando se llama a `formatearFechasFormulario()` o `prepararDatosParaBackend()`

3. **Configuración por campo** - Cada campo de fecha puede tener su propio formato independiente

4. **mostrarHora vs formatoBackend** - Son propiedades independientes:
   - `mostrarHora: true` → Muestra campo de hora en pantalla
   - `formatoBackend` → Define cómo se formatea al enviar al servidor
   - Puedes tener `mostrarHora: false` con `FECHA_HORA` (usará la hora actual del navegador)

5. **Campo de hora** - Cuando `mostrarHora: true`:
   - Se muestra un input HTML5 tipo "time" con formato HH:mm:ss
   - El usuario puede escribir o usar los selectores del navegador
   - La hora se sincroniza automáticamente con el objeto Date del formulario

6. **Validación en desarrollo** - Usa `validarConfiguracionFormulario()` para detectar conflictos de configuración

7. **Compatibilidad** - El servicio `FuncionesDatosService` también tiene métodos legacy para código existente

## 🎨 Patrones Recomendados

### Para Formularios de Personas
```typescript
fechaNacimiento: TipoFormatoFechaBackend.SOLO_FECHA
fechaIngreso: TipoFormatoFechaBackend.FECHA_HORA
```

### Para Formularios de Documentos
```typescript
fechaEmision: TipoFormatoFechaBackend.SOLO_FECHA
fechaVencimiento: TipoFormatoFechaBackend.FECHA_HORA_CERO
```

### Para Registros con Auditoría
```typescript
fechaCreacion: TipoFormatoFechaBackend.FECHA_HORA
fechaModificacion: TipoFormatoFechaBackend.FECHA_HORA
```

---

**Actualizado:** Noviembre 2025  
**Servicio:** `shared/services/funciones-datos.service.ts`  
**Helper:** `shared/basics/table/dynamic-form/helpers/dynamic-form-date.helper.ts`
