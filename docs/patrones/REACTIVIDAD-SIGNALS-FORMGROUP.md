# Regla: Signals y FormGroup no se mezclan leyendo el valor agregado

Mezclar Angular Signals (`computed()`, `signal()`) con Reactive Forms (`FormGroup`) es
correcto y es el patrón que ya usa este repositorio. El error que **vuelve** es leer el
valor de un `FormGroup`/`FormControl` como si fuera una lectura reactiva cuando no lo es.
Esta regla cubre los dos lugares donde eso pasa.

## La regla

> **Un `computed()` NUNCA debe leer `formGroup.value` ni una propiedad plana no-signal.**
> **Un callback de `valueChanges` NUNCA debe leer `formGroup.value` (el agregado del PADRE).**
>
> En ambos casos, lee el control individual con `.get('campo')?.value`, o el valor que el
> propio evento ya trae. Si necesitas que un `computed()` reaccione a un control de
> formulario, espeja ese control en una `signal()` actualizada por `valueChanges` y lee la
> signal, nunca el control.

Los dos casos no son el mismo bug por casualidad: los dos vienen de tratar como
"reactivo" algo que Angular no trata como tal en ese punto exacto del ciclo.

---

## Caso 1 — `computed()` que lee un FormGroup o una propiedad plana

Un `computed()` de Angular Signals **solo se invalida cuando cambia una signal que leyó
dentro de su función**. Leer `this.miFormGroup.value` o `this.miPropiedadPlana` dentro del
`computed()` no registra ninguna dependencia — esos no son signals. El resultado: el
`computed()` se queda con el valor calculado la última vez que **alguna otra signal sí
cambió**, y no se entera de que el formulario o la propiedad cambiaron después.

### ❌ Mal — el computed no se entera del cambio

```typescript
cuentaOrigenSeleccionada: CuentaBancaria | null = null; // propiedad plana, [(ngModel)]

puedeRegistrar = computed(() =>
  this.totalADevolver() > 0 &&        // lee una signal → sí es una dependencia real
  !!this.cuentaOrigenSeleccionada     // lee una propiedad plana → NO es una dependencia
);
```

Si el usuario ya escribió un monto (eso sí toca una signal y deja `puedeRegistrar` en
`false` en caché) y **después** elige la cuenta origen, el `computed()` nunca se vuelve a
evaluar: el botón se queda deshabilitado para siempre, sin ningún error visible. Este fue
el defecto real detrás del "botón de devolución que no funciona" (pedido 5) — la hipótesis
inicial era "falta cuenta bancaria activa", pero la causa real era esta.

### ✅ Bien — todo lo que el computed necesita es una signal

```typescript
cuentaOrigenSeleccionada = signal<CuentaBancaria | null>(null);

puedeRegistrar = computed(() =>
  this.totalADevolver() > 0 &&
  !!this.cuentaOrigenSeleccionada()   // ahora sí es una lectura de signal
);
```

En la plantilla, el binding pasa de `[(ngModel)]` (dos vías, escribe la propiedad
directamente) a explícito:

```html
<mat-select [ngModel]="cuentaOrigenSeleccionada()"
            (ngModelChange)="cuentaOrigenSeleccionada.set($event)">
```

**Ejemplo real:** `src/app/modules/crd/forms/devolucion-aportes/devolucion-aportes.component.ts:123-127,190` (`cuentaParticipeSeleccionada`, `cuentaOrigenSeleccionada`, `puedeRegistrar`).

### Mismo caso, con un `FormGroup` en vez de una propiedad plana

Da exactamente el mismo síntoma si el computed lee `.get('campo')?.value` de un
`FormGroup` en vez de una propiedad plana — un `FormControl` tampoco es una signal:

```typescript
// ❌ Mal: el select cambia, pero este computed no se entera hasta que `cabecera` cambie
vigenciaAbiertaDelTipoElegido = computed(() => {
  const tipo = this.formVigencia.get('idTipoAporte')?.value;
  return this.cabecera()?.vigencias.find(v => v.idTipoAporte === tipo && v.fechaFin === null);
});
```

```typescript
// ✅ Bien: se espeja el control en una signal por valueChanges, y el computed lee la signal
private tipoAporteElegido = signal<number>(ID_TIPO_APORTE.JUBILACION);

vigenciaAbiertaDelTipoElegido = computed(() => {
  const tipo = this.tipoAporteElegido();
  return this.cabecera()?.vigencias.find(v => v.idTipoAporte === tipo && v.fechaFin === null);
});

// en ngOnInit:
this.formVigencia.get('idTipoAporte')!.valueChanges.subscribe(tipo => this.tipoAporteElegido.set(tipo));
```

**Ejemplo real:** `src/app/modules/crd/forms/contrato/contrato-edit/contrato-edit.component.ts:92-96,145`.
Verificado con `ng.getComponent(...).vigenciaAbiertaDelTipoElegido()` en el navegador: antes
del fix devolvía siempre la vigencia de Jubilación aunque el `<mat-select>` mostrara
Cesantía — el `computed()` solo dependía de la signal `cabecera`, y esta pantalla se usa
tanto para el hint de fecha mínima como para la validación al guardar, así que el bug no
era solo visual.

---

## Caso 2 — leer `formGroup.value` dentro del `valueChanges` de un control HIJO

Este es independiente de signals; es puro Reactive Forms. `AbstractControl.setValue()`
actualiza el `.value` del **control que cambió** y emite su `valueChanges` **antes** de
propagar el cambio hacia el `FormGroup` padre y actualizar el `.value` agregado del padre.
Si el callback de `valueChanges` de un control hijo lee `this.miFormGroup.value` (el
agregado del padre), lee el valor de **antes** de este cambio — un paso atrás.

### ❌ Mal — el cálculo usa el valor anterior

```typescript
this.formVigencia.get('porcentaje')!.valueChanges.subscribe(() => this.actualizarMontoCalculado());

private actualizarMontoCalculado(): void {
  const { modo, porcentaje } = this.formVigencia.value;   // agregado del PADRE: un paso atrás
  const monto = remuneracion * (porcentaje ?? 0) / 100;
  this.formVigencia.get('monto')?.setValue(monto, { emitEvent: false });
}
```

Síntoma verificado en el navegador: tipear "15" en el campo de porcentaje (dígito a
dígito: "1", luego "2"... hasta "15") dejaba el monto calculado con el valor de "1", no de
"15" — el cálculo siempre corría un dígito atrasado respecto de lo que se veía en pantalla.

### ✅ Bien — lee cada control por separado

```typescript
private actualizarMontoCalculado(): void {
  const modo = this.formVigencia.get('modo')?.value;             // control individual: ya actualizado
  const porcentaje = this.formVigencia.get('porcentaje')?.value; // control individual: ya actualizado
  const monto = remuneracion * (porcentaje ?? 0) / 100;
  this.formVigencia.get('monto')?.setValue(monto, { emitEvent: false });
}
```

El control individual (`porcentaje`) sí tiene su propio `.value` actualizado en ese punto
— es el agregado del **padre** el que todavía no sincronizó, no el hijo que disparó el
evento.

**Ejemplo real:** `src/app/modules/crd/forms/contrato/contrato-edit/contrato-edit.component.ts:307` (`actualizarMontoCalculado`).

---

## Cómo detectarlo en revisión

Sospecha de este patrón cuando encuentres:

- Un `computed()` que referencia `algo.value` de un `FormGroup`/`FormControl`, o una
  propiedad de clase que se asigna con `[(ngModel)]` sin ser `signal()`.
- Un callback de `.valueChanges.subscribe(...)` que lee `this.miFormGroup.value` (el
  agregado) en vez de `this.miFormGroup.get('campo')?.value` o el valor que el propio
  evento entrega como parámetro.
- Un botón o un valor calculado que "a veces no se actualiza" o "va un paso atrás", sin
  ningún error en consola — es la firma de este bug: no lanza excepción, simplemente no
  se recalcula.

## La regla corta para nuevo código

1. Dentro de un `computed()`: solo lecturas de `signal()`. Si necesitas el valor de un
   `FormControl`, espéjalo primero en una `signal()` vía `valueChanges.subscribe()`.
2. Dentro del `valueChanges` de un control (o de su callback disparado por ese evento):
   lee ese control (o el valor del propio evento), nunca `this.miFormGroup.value`.
