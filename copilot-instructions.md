# Instrucciones de Copilot para saaFE

Guía completa para que agentes de IA trabajen eficientemente con esta aplicación Angular 20.

## ⚠️ REGLAS CRÍTICAS - Premium Requests

### **SIEMPRE verificar contexto ANTES de usar herramientas costosas**

1. **Orden de verificación OBLIGATORIO:**
   - ✅ Primero: Revisar `attachments` (archivos adjuntos por el usuario)
   - ✅ Segundo: Revisar `editorContext` (archivo activo del usuario)
   - ✅ Tercero: Revisar `conversation-summary` (contexto de la conversación)
   - ⚠️ **ÚLTIMO RECURSO**: Usar `read_file` solo si el contenido NO está en ninguno de los anteriores

2. **Consumo de Premium Requests:**
   - Cada llamada a herramienta = 1 premium request (sin importar tamaño)
   - Plan del usuario: **1500 premium requests/mes** (reset: Nov 30, 7PM)
   - Los tokens de conversación NO consumen premium requests
   - Leer archivos innecesariamente = desperdicio de presupuesto del usuario

3. **Herramientas que consumen premium requests:**
   - `read_file` ⚠️
   - `grep_search` ⚠️
   - `replace_string_in_file` ⚠️
   - `semantic_search` ⚠️
   - `file_search` ⚠️
   - `list_dir` ⚠️
   - Todas las herramientas de manipulación de archivos

4. **Lo que NO consume premium requests:**
   - Leer `attachments` ✅
   - Leer `editorContext` ✅
   - Leer `conversation-summary` ✅
   - Generar respuestas (tokens) ✅

### **Ejemplo CORRECTO de verificación:**

```
Usuario adjunta archivo X en attachments
❌ MAL: usar read_file para leer archivo X
✅ BIEN: leer directamente de attachments
```

---

## Resumen del Proyecto

- **Framework**: Angular CLI 20 con componentes standalone y Angular Material
- **Entrada**: `src/main.ts` inicia `App` usando proveedores de `src/app/app.config.ts`
- **Ruteo**: Centralizado en `src/app/app.routes.ts` con rutas en español y menús anidados por dominio (cnt, crd, cxc, cxp, tsr)
- **Estructura por dominio**: `src/app/modules/<dominio>/{forms,menu,model,service,resolver}`
- **Modelos**: Interfaces TypeScript (ej.: `modules/crd/model/producto.ts`)
- **Capa compartida**: `src/app/shared/` contiene proveedores de Material, utilidades, header/footer y servicios transversales

---

## Ejecutar / Compilar / Probar

- **Dev server** (con proxy): `npm start` (alias de `ng serve --proxy-config proxy.conf.json`)
- **Build**: `npm run build`
- **Unit tests**: `npm test` (Karma)
- **Proxy dev**: `proxy.conf.json` mapea `/api -> http://127.0.0.1:8080` y reescribe `^/api`

---

## API y Patrones HTTP

### Bases de endpoints centralizadas en constantes:

- **Compartidos**: `shared/services/ws-share.ts` (ej.: `ServiciosShare.RS_USRO`)
- **Créditos**: `modules/crd/service/ws-crd.ts` (ej.: `ServiciosCrd.RS_PRDC`)

### Estilos de URLs coexistentes:

- **Preferido en dev con proxy**: `'/api/saa-backend/rest/...'` (ver bloque comentado en `ws-share.ts`)
- **Absoluto**: `'http://localhost:8080/saa-backend/rest/...'` (activo actualmente)
- **Regla**: Mantener un estilo por feature; usar proxy en código nuevo

### Servicios HTTP:

- Construyen URL con sufijos de método
- Retornan `Observable<T>` tipados
- Encadenan `catchError` a `handleError`
- Ver ejemplo: `producto.service.ts`

**Ejemplos de endpoints:**
```typescript
getAll(): GET ${ServiciosCrd.RS_PRDC}/getAll
getById(id): GET ${ServiciosCrd.RS_PRDC}/getId/{id}
```

**Criterios de búsqueda**: Probar múltiples endpoints como fallback, priorizando GET y luego POST (ver patrón `selectByCriteria` abajo)

**Particularidad de errores**: Algunos `handleError` devuelven `of(null)` cuando `status===200` en la ruta de error. Presérvalo salvo que refactores los consumidores.

---

## 🔍 Patrón de Búsqueda: selectByCriteria

### **Concepto**

`selectByCriteria` es el método estándar en los servicios para búsquedas avanzadas con múltiples criterios. Recibe un array de objetos `DatosBusqueda` que construyen dinámicamente la consulta SQL en el backend.

### **Estructura Básica**

```typescript
import { DatosBusqueda } from '@shared/model/datos-busqueda/datos-busqueda';
import { TipoDatos } from '@shared/basics/constantes';
import { TipoComandosBusqueda } from '@shared/model/datos-busqueda/tipo-comandos-busqueda';

buscar(): void {
  const criterios: DatosBusqueda[] = [];

  // 1. Construir criterios
  // ... (ver patrones abajo)

  // 2. Ejecutar búsqueda
  this.miService.selectByCriteria(criterios).subscribe({
    next: (result) => {
      this.datos.set(result || []);
      this.dataSource.data = result || [];
      
      if (!result || result.length === 0) {
        this.snackBar.open('No se encontraron resultados', 'Cerrar', { duration: 3000 });
      }
    },
    error: (error) => {
      this.datos.set([]);
      this.dataSource.data = [];
      console.error('Error en la búsqueda:', error);
      this.snackBar.open('Error al buscar: ' + error, 'Cerrar', { duration: 3000 });
    }
  });
}
```

### **Patrones de Criterios Comunes**

#### 1. Búsqueda Simple (LIKE)

```typescript
// razonSocial LIKE '%Juan%'
if (razonSocial) {
  const db = new DatosBusqueda();
  db.asignaUnCampoSinTrunc(
    TipoDatos.STRING,
    'razonSocial',
    razonSocial,
    TipoComandosBusqueda.LIKE
  );
  criterios.push(db);
}
```

#### 2. Búsqueda Exacta (IGUAL)

```typescript
// idEstado = 1
if (idEstado !== null && idEstado !== undefined) {
  const db = new DatosBusqueda();
  db.asignaUnCampoSinTrunc(
    TipoDatos.INTEGER,
    'idEstado',
    idEstado,
    TipoComandosBusqueda.IGUAL
  );
  criterios.push(db);
}
```

#### 3. Búsqueda en Campo Padre (JOIN)

```typescript
// filial.codigo = 'FIL01'
if (filial) {
  const db = new DatosBusqueda();
  db.asignaValorConCampoPadre(
    TipoDatos.LONG,
    'filial',           // Nombre de la relación
    'codigo',           // Campo del objeto padre
    filial,
    TipoComandosBusqueda.IGUAL
  );
  criterios.push(db);
}
```

#### 4. Búsqueda con Rango (BETWEEN)

```typescript
// fechaNacimiento BETWEEN '2000-01-01' AND '2000-12-31'
if (fechaDesde && fechaHasta) {
  const fechaDesdeFormateada = this.funcionesDatos.formatearFechaParaBackend(
    fechaDesde,
    TipoFormatoFechaBackend.SOLO_FECHA
  );
  const fechaHastaFormateada = this.funcionesDatos.formatearFechaParaBackend(
    fechaHasta,
    TipoFormatoFechaBackend.SOLO_FECHA
  );

  if (fechaDesdeFormateada && fechaHastaFormateada) {
    const db = new DatosBusqueda();
    db.asignaUnCampoConBetween(
      'fechaNacimiento',
      TipoDatos.DATE,
      fechaDesdeFormateada,
      TipoComandosBusqueda.BETWEEN,
      fechaHastaFormateada
    );
    criterios.push(db);
  }
}
```

#### 5. Búsqueda con Solo Fecha Desde (>=)

```typescript
// fechaNacimiento >= '2000-01-01'
if (fechaDesde && !fechaHasta) {
  const fechaDesdeFormateada = this.funcionesDatos.formatearFechaParaBackend(
    fechaDesde,
    TipoFormatoFechaBackend.SOLO_FECHA
  );

  if (fechaDesdeFormateada) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatos.DATE,
      'fechaNacimiento',
      fechaDesdeFormateada,
      TipoComandosBusqueda.MAYOR_IGUAL
    );
    criterios.push(db);
  }
}
```

#### 6. Búsqueda con Solo Fecha Hasta (<=)

```typescript
// fechaNacimiento <= '2000-12-31'
if (fechaHasta && !fechaDesde) {
  const fechaHastaFormateada = this.funcionesDatos.formatearFechaParaBackend(
    fechaHasta,
    TipoFormatoFechaBackend.SOLO_FECHA
  );

  if (fechaHastaFormateada) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatos.DATE,
      'fechaNacimiento',
      fechaHastaFormateada,
      TipoComandosBusqueda.MENOR_IGUAL
    );
    criterios.push(db);
  }
}
```

#### 7. Búsqueda con OR entre Campos (con paréntesis)

```typescript
// (correoPersonal LIKE '%juan%' OR correoInstitucional LIKE '%juan%')
if (email) {
  // Abrir paréntesis
  const dbParenOpen = new DatosBusqueda();
  dbParenOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
  criterios.push(dbParenOpen);

  // Primer campo
  const dbCorreoPersonal = new DatosBusqueda();
  dbCorreoPersonal.asignaUnCampoSinTrunc(
    TipoDatos.STRING,
    'correoPersonal',
    email,
    TipoComandosBusqueda.LIKE
  );
  dbCorreoPersonal.setNumeroCampoRepetido(1);
  criterios.push(dbCorreoPersonal);

  // Segundo campo con OR
  const dbCorreoInstitucional = new DatosBusqueda();
  dbCorreoInstitucional.asignaUnCampoSinTrunc(
    TipoDatos.STRING,
    'correoInstitucional',
    email,
    TipoComandosBusqueda.LIKE
  );
  dbCorreoInstitucional.setTipoOperadorLogico(TipoComandosBusqueda.OR);
  dbCorreoInstitucional.setNumeroCampoRepetido(2);
  criterios.push(dbCorreoInstitucional);

  // Cerrar paréntesis
  const dbParenClose = new DatosBusqueda();
  dbParenClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
  criterios.push(dbParenClose);
}
```

#### 8. Ordenamiento (ORDER BY)

```typescript
// ORDER BY razonSocial ASC (por defecto)
const dbOrderBy = new DatosBusqueda();
dbOrderBy.orderBy('razonSocial');
criterios.push(dbOrderBy);

// ORDER BY fechaCreacion DESC
const dbOrderByDesc = new DatosBusqueda();
dbOrderByDesc.orderBy('fechaCreacion');
dbOrderByDesc.setTipoOrden(DatosBusqueda.ORDER_DESC);
criterios.push(dbOrderByDesc);
```

### **Tipos de Datos Disponibles (TipoDatos)**

```typescript
TipoDatos.STRING   // Cadenas de texto
TipoDatos.INTEGER  // Números enteros
TipoDatos.LONG     // Números largos (IDs)
TipoDatos.DATE     // Fechas
TipoDatos.DECIMAL  // Números decimales
TipoDatos.BOOLEAN  // Booleanos
```

### **Operadores de Comparación (TipoComandosBusqueda)**

```typescript
TipoComandosBusqueda.IGUAL        // =
TipoComandosBusqueda.LIKE         // LIKE '%valor%'
TipoComandosBusqueda.BETWEEN      // BETWEEN valor AND valor1
TipoComandosBusqueda.MAYOR        // >
TipoComandosBusqueda.MAYOR_IGUAL  // >=
TipoComandosBusqueda.MENOR        // <
TipoComandosBusqueda.MENOR_IGUAL  // <=
TipoComandosBusqueda.DIFERENTE    // !=
TipoComandosBusqueda.AND          // Operador lógico AND
TipoComandosBusqueda.OR           // Operador lógico OR
```

### **Ejemplo Completo Real**

Este ejemplo está tomado de `entidad-consulta.component.ts`:

```typescript
buscar(): void {
  const formValues = this.filtrosForm.value;
  const criterios: DatosBusqueda[] = [];

  // Búsqueda en campo padre
  if (formValues.filial) {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'filial',
      'codigo',
      formValues.filial,
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);
  }

  // Búsqueda LIKE simple
  if (formValues.razonSocial) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatos.STRING,
      'razonSocial',
      formValues.razonSocial,
      TipoComandosBusqueda.LIKE
    );
    criterios.push(db);
  }

  // Búsqueda OR con paréntesis: (correoPersonal LIKE email OR correoInstitucional LIKE email)
  if (formValues.email) {
    const dbParenOpen = new DatosBusqueda();
    dbParenOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
    criterios.push(dbParenOpen);

    const dbCorreoPersonal = new DatosBusqueda();
    dbCorreoPersonal.asignaUnCampoSinTrunc(
      TipoDatos.STRING,
      'correoPersonal',
      formValues.email,
      TipoComandosBusqueda.LIKE
    );
    dbCorreoPersonal.setNumeroCampoRepetido(1);
    criterios.push(dbCorreoPersonal);

    const dbCorreoInstitucional = new DatosBusqueda();
    dbCorreoInstitucional.asignaUnCampoSinTrunc(
      TipoDatos.STRING,
      'correoInstitucional',
      formValues.email,
      TipoComandosBusqueda.LIKE
    );
    dbCorreoInstitucional.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    dbCorreoInstitucional.setNumeroCampoRepetido(2);
    criterios.push(dbCorreoInstitucional);

    const dbParenClose = new DatosBusqueda();
    dbParenClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
    criterios.push(dbParenClose);
  }

  // Rango de fechas con BETWEEN
  if (formValues.fechaDesde && formValues.fechaHasta) {
    const fechaDesdeFormateada = this.funcionesDatos.formatearFechaParaBackend(
      formValues.fechaDesde,
      TipoFormatoFechaBackend.SOLO_FECHA
    );
    const fechaHastaFormateada = this.funcionesDatos.formatearFechaParaBackend(
      formValues.fechaHasta,
      TipoFormatoFechaBackend.SOLO_FECHA
    );

    if (fechaDesdeFormateada && fechaHastaFormateada) {
      const db = new DatosBusqueda();
      db.asignaUnCampoConBetween(
        'fechaNacimiento',
        TipoDatos.DATE,
        fechaDesdeFormateada,
        TipoComandosBusqueda.BETWEEN,
        fechaHastaFormateada
      );
      criterios.push(db);
    }
  }

  // Ordenamiento
  const dbOrderBy = new DatosBusqueda();
  dbOrderBy.orderBy('razonSocial');
  criterios.push(dbOrderBy);

  // Ejecutar búsqueda
  this.entidadService.selectByCriteria(criterios).subscribe({
    next: (result) => {
      this.entidades.set(result || []);
      this.dataSource.data = result || [];
      
      if (this.paginator) {
        this.paginator.firstPage();
      }

      if (!result || result.length === 0) {
        this.snackBar.open('No se encontraron resultados', 'Cerrar', { duration: 3000 });
      }
    },
    error: (error) => {
      this.entidades.set([]);
      this.dataSource.data = [];
      console.error('Error en la búsqueda:', error);
      this.snackBar.open('Error al buscar: ' + error, 'Cerrar', { duration: 3000 });
    }
  });
}
```

### **Buenas Prácticas**

1. **Validar valores antes de agregar criterios:**
   ```typescript
   if (valor) { /* agregar criterio */ }
   if (valor !== null && valor !== undefined) { /* para números/booleanos */ }
   ```

2. **Formatear fechas antes de agregar a criterios:**
   ```typescript
   const fechaFormateada = this.funcionesDatos.formatearFechaParaBackend(
     fecha,
     TipoFormatoFechaBackend.SOLO_FECHA
   );
   if (fechaFormateada) { /* agregar criterio */ }
   ```

3. **Limpiar tabla en errores:**
   ```typescript
   error: (error) => {
     this.datos.set([]);
     this.dataSource.data = [];
     // ... mostrar mensaje
   }
   ```

4. **Usar `setNumeroCampoRepetido()` para campos duplicados:**
   - Necesario cuando el mismo campo aparece en múltiples criterios OR
   - Evita conflictos en la consulta SQL generada

5. **Siempre cerrar paréntesis abiertos:**
   - Por cada `ABRE_PARENTESIS` debe haber un `CIERRA_PARENTESIS`

6. **Orden de criterios:**
   - Criterios de filtro primero
   - ORDER BY al final

### **Referencia Completa**

Para documentación detallada de `DatosBusqueda`, ver JSDoc en:
- `shared/model/datos-busqueda/datos-busqueda.ts`

---

## UI y Componentes

### Shell standalone:

- `src/app/app.ts` muestra `Header`/`Footer` salvo en `/` y `/login`
- Título sale de `localStorage['empresaName']` o heurísticas de ruta

### Material:

- A nivel app vía `provideMaterial()` en `shared/providers/material.providers.ts`
- Los componentes standalone pueden importar módulos Material adicionales o usar `SharedModule`

### Estilos globales:

- `src/styles/styles.scss` con SCSS en `src/styles/{abstracts,base,components,pages}`

---

## Utilidades y Exportaciones

### Datos:

`shared/services/funciones-datos.service.ts`:
- Transformaciones de texto
- Función `NVL` (manejo de nulos)
- **Formateo de fechas para backend** (ver sección dedicada abajo)
- Constantes: `FECHA_HORA` y `SOLO_FECHA`

### Exportar:

**CSV/PDF**: `shared/services/export.service.ts`
- PDF usa jsPDF global (`window.jsPDF` / `window.jspdf.jsPDF`) o carga CDN
- Soporta `window.loadJsPDF()`
- Tipos en `types/jspdf.d.ts`

---

## 📅 Formateo de Fechas - REGLA CRÍTICA

### **Formato Estándar del Backend**

**TODAS** las fechas que se envían al backend **DEBEN** usar el formato:

```
yyyy-MM-dd HH:mm:ss
```

**Ejemplo:** `2025-02-05 14:43:28`

### **Servicio Centralizado: FuncionesDatosService**

**Ubicación:** `shared/services/funciones-datos.service.ts`

Este servicio proporciona métodos para formatear fechas de forma consistente en toda la aplicación.

### **Tipos de Formato Disponibles**

```typescript
export enum TipoFormatoFechaBackend {
  FECHA_HORA = 'FECHA_HORA',           // "2025-02-05 14:43:28"
  SOLO_FECHA = 'SOLO_FECHA',           // "2025-02-05"
  FECHA_HORA_CERO = 'FECHA_HORA_CERO'  // "2025-02-05 00:00:00"
}
```

### **Métodos Principales**

#### 1. `formatearFechaParaBackend(fecha, tipo?)`

Formatea una fecha individual.

```typescript
import { inject } from '@angular/core';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '@shared/services/funciones-datos.service';

private funcionesDatosService = inject(FuncionesDatosService);

// Con fecha y hora
const fechaHora = this.funcionesDatosService.formatearFechaParaBackend(
  new Date(),
  TipoFormatoFechaBackend.FECHA_HORA
);
// Resultado: "2025-02-05 14:43:28"

// Solo fecha
const soloFecha = this.funcionesDatosService.formatearFechaParaBackend(
  new Date(),
  TipoFormatoFechaBackend.SOLO_FECHA
);
// Resultado: "2025-02-05"

// Fecha con hora en 00:00:00
const fechaCero = this.funcionesDatosService.formatearFechaParaBackend(
  new Date(),
  TipoFormatoFechaBackend.FECHA_HORA_CERO
);
// Resultado: "2025-02-05 00:00:00"

// Manejo de null
const fechaNull = this.funcionesDatosService.formatearFechaParaBackend(null);
// Resultado: null
```

#### 2. `formatearFechasParaBackend(obj, camposFecha)`

Formatea múltiples campos de fecha en un objeto.

```typescript
// Opción 1: Array de strings (usa FECHA_HORA por defecto)
const datos1 = this.funcionesDatosService.formatearFechasParaBackend(
  formValue,
  ['fechaCreacion', 'fechaModificacion']
);

// Opción 2: Array de configuraciones específicas
const datos2 = this.funcionesDatosService.formatearFechasParaBackend(
  formValue,
  [
    { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
    { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA },
    { campo: 'fechaVencimiento', tipo: TipoFormatoFechaBackend.FECHA_HORA_CERO }
  ]
);
```

### **Uso en Formularios Dinámicos**

Para formularios dinámicos, usa el helper `DynamicFormDateHelper`:

```typescript
import { DynamicFormDateHelper } from '@shared/basics/table/dynamic-form/helpers/dynamic-form-date.helper';

// Configuración de campo de fecha en fieldsConfig
{
  type: 'date',
  name: 'fechaNacimiento',
  label: 'Fecha de Nacimiento',
  value: null,
  formatoBackend: TipoFormatoFechaBackend.SOLO_FECHA
} as DateFieldConfig

// Al guardar, formateo automático
const datosParaBackend = DynamicFormDateHelper.formatearFechasFormulario(
  this.formGroup,
  this.fieldsConfig,
  this.funcionesDatosService
);
```

**Con campo de hora en pantalla:**

```typescript
{
  type: 'date',
  name: 'fechaIngreso',
  label: 'Fecha y Hora de Ingreso',
  mostrarHora: true,  // Muestra input de hora en UI
  formatoBackend: TipoFormatoFechaBackend.FECHA_HORA
} as DateFieldConfig
```

### **Patrones de Uso Comunes**

#### En componentes con FormGroup:

```typescript
export class MiComponente {
  private funcionesDatosService = inject(FuncionesDatosService);
  
  prepararDatos(formValue: any): Partial<MiEntidad> {
    return this.funcionesDatosService.formatearFechasParaBackend(
      formValue,
      [
        { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
        { campo: 'fechaContrato', tipo: TipoFormatoFechaBackend.FECHA_HORA }
      ]
    );
  }
}
```

#### En servicios HTTP:

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

### **⚠️ Errores Comunes a Evitar**

#### ❌ NO hacer esto:

```typescript
// NO - Enviar Date object directamente
const datos = { fecha: new Date() };

// NO - Formateo manual
const datos = { fecha: `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}` };

// NO - Usar toISOString() o toLocaleDateString()
const datos = { fecha: new Date().toISOString() };
```

#### ✅ SÍ hacer esto:

```typescript
// SÍ - Usar el servicio centralizado
const datos = {
  fecha: this.funcionesDatosService.formatearFechaParaBackend(
    formValue.fecha,
    TipoFormatoFechaBackend.FECHA_HORA
  )
};

// SÍ - Para múltiples fechas
const datos = this.funcionesDatosService.formatearFechasParaBackend(
  formValue,
  [
    { campo: 'fecha1', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
    { campo: 'fecha2', tipo: TipoFormatoFechaBackend.FECHA_HORA }
  ]
);
```

### **Guías de Uso por Contexto**

#### Fechas de Personas:
```typescript
fechaNacimiento: TipoFormatoFechaBackend.SOLO_FECHA
fechaIngreso: TipoFormatoFechaBackend.FECHA_HORA
```

#### Documentos:
```typescript
fechaEmision: TipoFormatoFechaBackend.SOLO_FECHA
fechaVencimiento: TipoFormatoFechaBackend.FECHA_HORA_CERO
```

#### Auditoría/Metadata:
```typescript
fechaCreacion: TipoFormatoFechaBackend.FECHA_HORA
fechaModificacion: TipoFormatoFechaBackend.FECHA_HORA
```

### **Campos de Metadata**

Los campos de auditoría (`fechaIngreso`, `fechaModificacion`, `usuarioIngreso`, etc.):

1. Deben estar `disabled: true` en el FormGroup
2. NO se deben enviar al backend (el backend los maneja)
3. Eliminarlos antes de enviar datos:

```typescript
prepararDatos(formValue: any): Partial<Entidad> {
  const datos = this.funcionesDatosService.formatearFechasParaBackend(
    formValue,
    [{ campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA }]
  );

  // Eliminar metadata
  delete (datos as any).usuarioIngreso;
  delete (datos as any).fechaIngreso;
  delete (datos as any).usuarioModificacion;
  delete (datos as any).fechaModificacion;
  
  return datos;
}
```

### **Documentación Completa**

Para guías detalladas, consulta:
- `.github/FORMATEO-FECHAS.md` - Guía completa de formateo de fechas
- `.github/FORMULARIOS-DINAMICOS-FECHAS.md` - Uso en formularios dinámicos

---

## Convenciones y Detalles

### TypeScript:

- Estricto en código y plantillas (`tsconfig.json`, `angular.json`)
- Prefiere interfaces explícitas en `modules/*/model`
- Manejo estricto de null

### Rutas:

- En español y agrupadas por dominio
- Agregar páginas editando `app.routes.ts`
- Componentes en `modules/<dominio>/forms` o `menu`

### Contratos backend:

- Códigos de 4 letras (ej.: `PRDC`, `TPPR`)
- Alinear modelos/servicios con comentarios en los modelos

### APIs nuevas:

- Extender el `ws-*.ts` correspondiente
- Referenciar desde el servicio
- En dev, priorizar bases con proxy

### Cambios de base backend:

- Alternar bloques activos en `ws-share.ts`/`ws-crd.ts`
- O introducir selección por entorno
- Mantener consistencia entre features

---

## Ejemplos Rápidos

### Nuevo GET en un servicio:

```typescript
const url = `${ServiciosCrd.RS_PRDC}/getAll`;
return this.http.get<Producto[]>(url).pipe(catchError(this.handleError));
```

### Exportar desde un componente a CSV:

```typescript
this.exportService.exportToCSV(rows, 'productos', ['Nombre','Estado']);
```

---

## Cambios Relevantes de Esta Sesión

### 1. **Refactorización de DatosBusqueda** (Nov 2024)

Se renombraron métodos numerados a nombres descriptivos en español:

- ✅ `asigna3` → `asignaUnCampoSinTrunc` (búsqueda simple sin truncado)
- ✅ `asigna7` → `asignaUnCampoConBetween` (búsqueda con rango BETWEEN)
- ✅ `asigna8` → `asignaUnCampoTruncadoConBetween` (BETWEEN con truncado)

**Patrón establecido**: Nombres en español descriptivos que indican claramente la funcionalidad del método.

**Refactorización realizada**:
- `datos-busqueda.ts`: Definiciones y documentación JSDoc completa
- `entidad-consulta.component.ts`: 13 llamadas actualizadas
- `login.component.ts`: 1 llamada actualizada
- `participe-dash.component.ts`: 3 llamadas actualizadas
- `navegacion-cascada.component.ts`: 6 llamadas actualizadas

**Total**: 23 refactorizaciones exitosas sin errores de compilación.

### 2. **Documentación JSDoc Completa**

Se documentó completamente la clase `DatosBusqueda` con:
- ✅ Descripción de cada método (25+ métodos)
- ✅ Parámetros con tipos y descripciones
- ✅ Ejemplos prácticos de uso con `@example`
- ✅ Notas adicionales con `@remarks`
- ✅ Documentación de todas las constantes estáticas

**Resultado**: IntelliSense muestra tooltips completos al hover sobre los métodos.

### 3. **Mejoras en Manejo de Errores**

Se agregó limpieza de tabla cuando ocurren errores de búsqueda en `entidad-consulta.component.ts`:

```typescript
error: (error) => {
  this.entidades.set([]);       // Limpiar signal
  this.dataSource.data = [];     // Limpiar tabla
  console.error('Error en la búsqueda:', error);
  this.snackBar.open('Error al buscar entidades: ' + error.message, 'Cerrar', { duration: 3000 });
}
```

**Beneficio**: Evita mostrar datos obsoletos cuando falla una búsqueda.

### 4. **Features Implementadas Anteriormente**

(Estas se implementaron en esta sesión pero antes de la conversación actual)

- ✅ Botón "Dash" en entidad-consulta para navegar a participe-dash
- ✅ Participe-dash con modo búsqueda vs precargado
- ✅ Botón regresar en participe-dash
- ✅ Optimización de estilos de botones (hover sin fondo, solo texto)
- ✅ Ajustes de diseño de filtros
- ✅ Corrección de pantallas que no crecían con sidebar colapsado
- ✅ Optimización de performance (GPU acceleration, grids)
- ✅ Resolver implementado para entidad-edit (pre-carga de datos)
- ✅ Animaciones restauradas después del resolver
- ✅ Limpieza de console.log

---

## Archivos de Test (.spec.ts)

Los archivos `.spec.ts` son archivos de **pruebas unitarias** con Jasmine/Karma:
- Se ejecutan con `npm test`
- No son necesarios para el funcionamiento de la app
- Útiles para desarrollo TDD (Test-Driven Development)
- Pueden omitirse en desarrollo rápido

---

## Notas Importantes

### Modo Desarrollo Ágil:

- Activo hasta **Nov 30, 2024** o **60% de uso de premium requests**
- Priorizar implementación sobre documentación exhaustiva
- Documentar solo cambios críticos o arquitectónicos

### Memoria de Sesiones:

- Copilot **NO recuerda** conversaciones entre sesiones (al cerrar VS Code)
- Este archivo (`copilot-instructions.md`) es la **memoria permanente**
- Actualizar este archivo con decisiones importantes para futuras sesiones

---

## Buenas Prácticas Establecidas

1. **Verificar contexto antes de leer archivos** (CRÍTICO)
2. Usar nombres descriptivos en español para métodos
3. Documentar con JSDoc métodos públicos complejos
4. Limpiar estado en handlers de error
5. Usar Angular signals para reactividad
6. Mantener consistencia en estilos de endpoints
7. Prefijos de 4 letras para contratos backend
8. Interfaces explícitas para modelos
9. Manejo estricto de null/undefined
10. Optimizar performance (GPU, subscripciones, etc.)
