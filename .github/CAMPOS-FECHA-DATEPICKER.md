# Campos de Fecha con Datepicker — Patrón Estándar

Guía para implementar campos de fecha que:
- Permiten ingreso **por teclado** (ej: `15/08/2026`) sin que se borre al salir del campo (Tab/clic)
- Permiten selección **por picker** sin requerir doble clic
- Siempre muestran el formato **dd/MM/yyyy**

---

## ¿Por qué falla el enfoque con `[(ngModel)]`?

Angular Material Datepicker maneja su propio modelo interno. Cuando el usuario escribe texto libre y luego sale del campo (`blur`), Material intenta parsear el valor con su adaptador de fechas. Si el texto no coincide exactamente con el formato interno del adaptador, **Material reemplaza o borra el valor mostrado**, ignorando lo que el usuario escribió.

Además, `[(ngModel)]` crea una carrera entre la actualización del modelo del componente y el ciclo de procesamiento interno de Material, lo que provoca que el picker requiera dos selecciones para reflejar el valor.

---

## Solución: FormControl + ViewChild + Raw Capture

El patrón correcto (basado en `asientos-contables-dinamico` de CNT) usa tres elementos:

1. **`FormControl`** en lugar de `[(ngModel)]` → Material respeta el valor de un `FormControl` tipado como `Date`
2. **`@ViewChild`** con referencia al `<input>` nativo → permite forzar el texto `dd/MM/yyyy` directamente sobre el DOM
3. **Captura del texto crudo** en el evento `(input)` → guarda lo que el usuario escribe antes de que Material lo procese en `blur`

---

## Implementación

### 1. Template HTML

```html
<mat-form-field appearance="outline">
  <mat-label>Fecha</mat-label>
  <input
    #miCampoFechaInput
    matInput
    [matDatepicker]="pickerMiFecha"
    [formControl]="fechaControl"
    placeholder="dd/mm/aaaa"
    (input)="capturarFechaRaw($event)"
    (dateChange)="onFechaPickerChange($event.value)"
    (blur)="syncFechaFromRaw($event)"
  />
  <mat-datepicker-toggle matIconSuffix [for]="pickerMiFecha"></mat-datepicker-toggle>
  <mat-datepicker #pickerMiFecha></mat-datepicker>
</mat-form-field>
```

**Reglas del template:**
- Usar `[formControl]="fechaControl"` — **nunca** `[(ngModel)]` en inputs con `[matDatepicker]`
- Agregar `#miCampoFechaInput` como referencia de template (nombre único por componente)
- Tres eventos: `(input)` para capturar texto crudo, `(dateChange)` para el picker, `(blur)` para sincronizar al salir

### 2. TypeScript — Declaraciones

```typescript
import {
  Component, ElementRef, ViewChild, AfterViewInit, inject
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { FuncionesDatosService } from 'ruta/a/funciones-datos.service';

export class MiComponente {
  // ViewChild con la misma referencia del template
  @ViewChild('miCampoFechaInput', { read: ElementRef })
  miCampoFechaInputRef!: ElementRef<HTMLInputElement>;

  // FormControl inicializado con la fecha actual
  fechaControl = new UntypedFormControl(new Date());

  // Variable privada para guardar el texto crudo mientras el usuario escribe
  private _rawFecha: string = '';

  private funcionesDatosS = inject(FuncionesDatosService);
}
```

### 3. TypeScript — Métodos

```typescript
/** Captura el texto tal como lo escribe el usuario, antes de que Material lo procese */
capturarFechaRaw(event: Event): void {
  this._rawFecha = (event.target as HTMLInputElement).value;
}

/** Al salir del campo: parsea el texto crudo, actualiza el FormControl y fuerza el formato en el DOM */
syncFechaFromRaw(event: FocusEvent): void {
  const rawValue = (this._rawFecha || (event.target as HTMLInputElement)?.value || '').trim();
  this._rawFecha = '';

  if (!rawValue) return;

  const parts = rawValue.split('/');
  if (parts.length !== 3) return;

  const dia = Number(parts[0]);
  const mes = Number(parts[1]) - 1;  // Los meses en Date son 0-indexados
  const anio = Number(parts[2]);

  const fechaValida =
    !isNaN(dia) && dia >= 1 && dia <= 31 &&
    !isNaN(mes) && mes >= 0 && mes <= 11 &&
    !isNaN(anio) && anio >= 1000 && anio <= 9999;

  if (fechaValida) {
    const date = new Date(anio, mes, dia);
    // Verificar que la fecha construida es coherente (ej: 31/02 no existe)
    if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
      const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      // 1. Actualizar el FormControl con el Date real (no el string)
      this.fechaControl.setValue(date, { emitEvent: false });
      // 2. DESPUÉS de que Material procese su blur, forzar el texto formateado en el input nativo
      setTimeout(() => {
        if (this.miCampoFechaInputRef?.nativeElement) {
          this.miCampoFechaInputRef.nativeElement.value = formatted;
        }
        // Aquí llamar lógica de negocio que dependa de la fecha, ej:
        this.onCambioFecha();
      });
    }
  }
}

/** Cuando el usuario selecciona una fecha desde el picker */
onFechaPickerChange(date: Date | null | undefined): void {
  const d = date || new Date();
  // 1. Actualizar el FormControl con el Date
  this.fechaControl.setValue(d, { emitEvent: false });
  const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
  // 2. Forzar el texto formateado en el input nativo (después del ciclo de Material)
  setTimeout(() => {
    if (this.miCampoFechaInputRef?.nativeElement) {
      this.miCampoFechaInputRef.nativeElement.value = formatted;
    }
  });
  // Aquí llamar lógica de negocio, ej:
  this.onCambioFecha();
}

/** Inicializar con fecha actual */
setFecha(): void {
  this.fechaControl.setValue(new Date(), { emitEvent: false });
}

/** Leer el valor del campo para enviar al backend */
private usarFechaEnPayload(): void {
  const fecha: Date = this.parseFechaLocal(this.fechaControl.value);
  // usar `fecha` en el payload...
}
```

---

## Por qué funciona este patrón

| Paso | Qué ocurre |
|------|-----------|
| El usuario escribe `15/08/2026` | `(input)` guarda el texto en `_rawFecha` |
| El usuario presiona Tab | Material dispara `blur` y trata de parsear el valor del input |
| `syncFechaFromRaw` se ejecuta | Lee `_rawFecha`, construye un `Date` real |
| `setValue(date, { emitEvent: false })` | Material recibe un `Date` válido → no lo borra |
| `setTimeout(() => input.value = formatted)` | **Después** de que Material termine su ciclo, se sobreescribe el texto mostrado con `dd/MM/yyyy` |
| El usuario abre el picker | El picker muestra la fecha correcta porque el `FormControl` tiene un `Date` real |
| El usuario selecciona en el picker | `(dateChange)` → mismo ciclo: `setValue` + `setTimeout` para el texto |

> **Clave:** `setValue(date, { emitEvent: false })` da a Material un `Date` real (no un string), lo que evita que lo descarte. El `setTimeout` sin delay asegura que la sobreescritura del `.value` sucede en el siguiente tick, después del procesamiento interno de Material.

---

## Si el campo debe deshabilitarse (documento ya guardado)

```typescript
// Al guardar / modo lectura:
this.fechaControl.disable();

// Al crear nuevo / modo edición:
this.fechaControl.enable();
```

> **No usar** `[disabled]="deshabilitado"` en el HTML con `formControl` — usar siempre `.disable()` / `.enable()` programáticamente.

---

## Campos de fecha secundarios (ej: fecha de documento modificado)

Cuando hay más de un campo de fecha en el mismo componente, repetir el mismo patrón con nombres distintos:

```typescript
@ViewChild('fechaDMInput', { read: ElementRef })
fechaDMInputRef!: ElementRef<HTMLInputElement>;

fechaDMControl = new UntypedFormControl(null);  // null = sin valor inicial
private _rawFechaDM: string = '';

capturarFechaDMRaw(event: Event): void { ... }
syncFechaDMFromRaw(event: FocusEvent): void { ... }
onFechaEmiDMPickerChange(date: Date | null | undefined): void { ... }
```

```html
<input
  #fechaDMInput
  matInput
  [matDatepicker]="pickerFechaDM"
  [formControl]="fechaDMControl"
  placeholder="dd/mm/aaaa"
  (input)="capturarFechaDMRaw($event)"
  (dateChange)="onFechaEmiDMPickerChange($event.value)"
  (blur)="syncFechaDMFromRaw($event)"
/>
```

---

## Componentes donde ya está aplicado

| Componente | FormControl(s) |
|---|---|
| `facturas-ingreso` | `fechaControl` |
| `notas-credito` | `fechaControl`, `fechaDMControl` |
| `notas-debito` | `fechaControl`, `fechaDMControl` |
| `retenciones` | `fechaControl`, `fechaEmiDocControl` |
| `retencionesv2` | `fechaControl`, `fechaEmiDocControl` |
| `liquidaciones` | `fechaControl` |
| `asientos-contables-dinamico` (CNT) | `fechaAsiento` (en FormGroup) |

---

## Utilidad de formato

`FuncionesDatosService.formatoFecha(date, FuncionesDatosService.SOLO_FECHA)` devuelve el string `dd/MM/yyyy`.

Para parsear un string `dd/MM/yyyy` de vuelta a `Date`, usar el método privado `parseFechaLocal(valor)` presente en cada componente, o extraerlo a un servicio compartido si se necesita reutilizar.

---

**Última actualización:** Julio 2026
