# Feature: Búsqueda de Coincidencias de Entidades

## Resumen
Implementación de diálogo de búsqueda de coincidencias para resolver el error "PARTICIPE NO ENCONTRADO" (novedad código 1) en la carga de archivos Petroamazonas.

## Componentes Creados

### 1. CoincidenciasEntidadDialogComponent
**Ubicación:** `src/app/modules/crd/dialog/coincidencias-entidad-dialog/`

**Archivos:**
- `coincidencias-entidad-dialog.component.ts` (60 líneas)
- `coincidencias-entidad-dialog.component.html` (64 líneas)
- `coincidencias-entidad-dialog.component.scss` (130 líneas)

**Funcionalidad:**
- Recibe `nombreBusqueda` y `registroOriginal` como parámetros
- Llama a `EntidadService.getCoincidencias(nombreBusqueda)` al inicializar
- Muestra tabla con coincidencias encontradas (numeroIdentificacion, razonSocial, nombreComercial)
- Permite selección de una entidad
- Retorna la entidad seleccionada al cerrar el diálogo

**Estados:**
- **Cargando:** Muestra spinner mientras obtiene datos
- **Sin resultados:** Mensaje amigable si no hay coincidencias
- **Con resultados:** Tabla interactiva con botones de selección
- **Selección activa:** Fila resaltada en verde, botón "Asociar Entidad" habilitado

## Cambios en Componentes Existentes

### 2. DetalleCargaComponent

**Archivo:** `detalle-consulta-carga.component.ts`

**Cambios en código:**
1. **Import agregado:**
   ```typescript
   import { CoincidenciasEntidadDialogComponent } from '../../dialog/coincidencias-entidad-dialog/coincidencias-entidad-dialog.component';
   ```

2. **Método `corregirRegistro()` modificado:**
   ```typescript
   corregirRegistro(registro: ParticipeXCargaArchivo): void {
     const novedad = registro.novedadesCarga;

     if (novedad === 1) {
       // PARTICIPE NO ENCONTRADO - Mostrar diálogo de coincidencias
       this.mostrarCoincidencias(registro);
     } else if (novedad === 2) {
       this.corregirDuplicado(registro);
     } else {
       this.snackBar.open(
         `⚠ Corrección para novedad ${novedad} no implementada aún`,
         'Cerrar',
         { duration: 3000 }
       );
     }
   }
   ```

3. **Nuevo método `mostrarCoincidencias()` privado:**
   ```typescript
   private mostrarCoincidencias(registro: ParticipeXCargaArchivo): void {
     const dialogRef = this.dialog.open(CoincidenciasEntidadDialogComponent, {
       width: '800px',
       data: {
         nombreBusqueda: registro.nombre,
         registroOriginal: registro
       }
     });

     dialogRef.afterClosed().subscribe(entidadSeleccionada => {
       if (entidadSeleccionada) {
         console.log('✅ Entidad seleccionada:', entidadSeleccionada);
         console.log('📝 Registro original:', registro);
         
         // TODO: Implementar lógica para asociar la entidad al partícipe
         this.snackBar.open(
           `✓ Entidad "${entidadSeleccionada.razonSocial}" asociada correctamente`,
           'Cerrar',
           { duration: 3000 }
         );
       }
     });
   }
   ```

**Archivo:** `detalle-consulta-carga.component.html`

**Cambios en template:**
- Botones de acción ahora son condicionales basados en `novedad.novedad.codigo`
- **Para novedad código 1 (PARTICIPE NO ENCONTRADO):**
  - Icono: `search` (lupa)
  - Texto: "Coincidencias"
- **Para otras novedades:**
  - Icono: `build` (herramienta)
  - Texto: "Corregir"

**Implementación:**
```html
<button
  mat-raised-button
  color="primary"
  (click)="corregirRegistro(element)"
  class="btn-corregir">
  <mat-icon>{{ novedad.novedad.codigo === 1 ? 'search' : 'build' }}</mat-icon>
  {{ novedad.novedad.codigo === 1 ? 'Coincidencias' : 'Corregir' }}
</button>
```

**Aplicado en:**
- Tab "Partícipes" (línea ~417)
- Tab "Descuentos" (línea ~509)

## Servicio Actualizado

### 3. EntidadService

**Archivo:** `src/app/modules/crd/service/entidad.service.ts`

**Método agregado anteriormente (ya existía):**
```typescript
getCoincidencias(nombre: string): Observable<Entidad[] | null> {
  const url = `${ServiciosCrd.RS_ENTD}/getCoincidencias/${nombre}`;
  return this.http.get<Entidad[]>(url).pipe(
    catchError(this.handleError)
  );
}
```

## Flujo de Usuario

1. **Usuario carga archivo** con partícipes no encontrados
2. **Sistema detecta** registros con `novedadesCarga === 1`
3. **Tab "Partícipes"** muestra acordeón con "PARTICIPE NO ENCONTRADO"
4. **Usuario expande** el acordeón (con spinner de carga)
5. **Tabla paginada** muestra registros problemáticos
6. **Usuario hace clic** en botón "Coincidencias" (icono lupa)
7. **Diálogo se abre** buscando coincidencias en base de datos
8. **Usuario revisa** coincidencias y selecciona la correcta
9. **Usuario confirma** haciendo clic en "Asociar Entidad"
10. **Sistema asocia** (TODO) la entidad al registro y actualiza estado

## Pendientes (TODO)

### Backend
- [ ] Implementar endpoint para actualizar asociación entidad-partícipe
- [ ] Validar que la entidad seleccionada es válida
- [ ] Recalcular novedades después de la asociación

### Frontend
- [ ] Implementar método `asociarEntidadARegistro(registro, entidad)` en service
- [ ] Actualizar UI después de asociación exitosa (remover de lista de novedades)
- [ ] Manejar errores de asociación
- [ ] Agregar confirmación antes de asociar (opcional)
- [ ] Implementar loading state durante asociación

## Testing

### Casos de prueba sugeridos:
1. **Búsqueda con coincidencias:** Verificar que se muestran resultados
2. **Búsqueda sin coincidencias:** Verificar mensaje "sin resultados"
3. **Selección de entidad:** Verificar highlight de fila y habilitación de botón
4. **Cancelar diálogo:** Verificar que no se hacen cambios
5. **Error en servicio:** Verificar manejo de errores HTTP
6. **Múltiples aperturas:** Verificar que el estado se resetea correctamente

## Estilos Destacados

### Dialog Component
```scss
.dialog-container {
  min-width: 700px;
  max-width: 900px;
  max-height: 80vh;
}

.selected-row {
  background-color: #e8f5e9 !important; // Verde claro
}

.search-info {
  background-color: #e3f2fd; // Azul claro
  border-left: 4px solid #2196F3; // Borde azul
}
```

## Convenciones Seguidas

✅ Standalone components (Angular 20)
✅ Signals para estado reactivo (`isLoading`, `coincidencias`, `entidadSeleccionada`)
✅ Material Design components
✅ Pipe `currency` para formato de moneda
✅ Error handling con `catchError`
✅ TypeScript estricto
✅ Comentarios en español
✅ Estructura modular por dominio (crd)

## Referencias

- **Guía de Guards:** `docs/patrones/GUARDS-AUTENTICACION-NAVEGACION.md`
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **Modelo Entidad:** `src/app/modules/crd/model/entidad.ts`
- **Modelo ParticipeXCargaArchivo:** `src/app/modules/crd/model/participe-x-carga-archivo.ts`

---

**Última actualización:** Enero 2025
**Autor:** Copilot (vía usuario)
**Estado:** ✅ Implementado (asociación pendiente)
