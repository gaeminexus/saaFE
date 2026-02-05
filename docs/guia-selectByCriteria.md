# Guía de Uso Correcto de selectByCriteria

## Introducción

`selectByCriteria` es el método estándar para realizar búsquedas dinámicas en los servicios del backend. Utiliza objetos `DatosBusqueda` para construir consultas SQL complejas de forma programática.

## ⚠️ REGLAS CRÍTICAS

### 1. SIEMPRE usar array de `DatosBusqueda[]`, NUNCA objetos planos

```typescript
// ❌ INCORRECTO
this.service.selectByCriteria({
  campo: 'nombre',
  valor: 'Juan'
});

// ✅ CORRECTO
const criterios: DatosBusqueda[] = [];
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(TipoDatos.STRING, 'nombre', 'Juan', TipoComandosBusqueda.LIKE);
criterios.push(db);
this.service.selectByCriteria(criterios);
```

### 2. Para recuperar por ID, usar `getById()`, NO `selectByCriteria`

**`selectByCriteria` es para búsquedas complejas o múltiples resultados. Para recuperar UN objeto por su clave primaria, usar `getById()`.**

```typescript
// ❌ INCORRECTO - NO usar selectByCriteria para buscar por ID
const criterios = new DatosBusqueda();
criterios.asignaUnCampoSinTrunc(TipoDatos.LONG, 'codigo', id.toString(), TipoComandosBusqueda.IGUAL);
this.asientoService.selectByCriteria([criterios]).subscribe({
  next: (asientos) => {
    const asiento = asientos[0]; // ❌ Extrae primer elemento de un array
  }
});

// ✅ CORRECTO - Usar getById para recuperar por clave primaria
this.asientoService.getById(id).subscribe({
  next: (asiento) => {
    // ✅ Recibe directamente el objeto, no un array
    console.log(asiento.numero);
  }
});
```

**Razones para usar `getById()`:**
- ✅ Más eficiente (consulta directa por PK)
- ✅ Retorna el objeto directamente, no un array
- ✅ Código más limpio y legible
- ✅ Semánticamente correcto
- ✅ Mejor rendimiento en el backend

---

## Estructura Básica

### 1. Importaciones Necesarias

```typescript
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
```

### 2. Inicialización del Array

```typescript
const criterios: DatosBusqueda[] = [];
```

---

## Casos de Uso Comunes

### 1. Búsqueda Simple por Campo

Buscar por un campo exacto o con LIKE.

```typescript
// Búsqueda exacta
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.STRING,
  'numeroIdentificacion',
  '1234567890',
  TipoComandosBusqueda.IGUAL
);
criterios.push(db);

// Búsqueda con LIKE (parcial)
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.STRING,
  'razonSocial',
  'Juan',
  TipoComandosBusqueda.LIKE
);
criterios.push(db);
```

**SQL generado:**
```sql
WHERE numeroIdentificacion = '1234567890'
  AND razonSocial LIKE '%Juan%'
```

---

### 2. Búsqueda en Campo de Entidad Padre (JOIN)

Para buscar en campos de objetos relacionados.

```typescript
// Buscar por código de filial
const db = new DatosBusqueda();
db.asignaValorConCampoPadre(
  TipoDatos.LONG,
  'filial',           // Nombre de la relación en la entidad
  'codigo',           // Campo en el objeto padre
  '123',              // Valor a buscar
  TipoComandosBusqueda.IGUAL
);
criterios.push(db);
```

**SQL generado:**
```sql
WHERE filial.codigo = 123
```

**Ejemplos adicionales:**
```typescript
// Buscar por código de tipo identificación
db.asignaValorConCampoPadre(
  TipoDatos.STRING,
  'tipoIdentificacion',
  'codigo',
  'CED',
  TipoComandosBusqueda.IGUAL
);

// Buscar por código de detalle carga archivo
db.asignaValorConCampoPadre(
  TipoDatos.LONG,
  'detalleCargaArchivo',
  'codigo',
  detalleId.toString(),
  TipoComandosBusqueda.IGUAL
);
```

---

### 3. Búsqueda con Rangos de Fechas (BETWEEN)

Para filtrar por fechas entre dos valores.

```typescript
const fechaDesde = '2024-01-01';
const fechaHasta = '2024-12-31';

const db = new DatosBusqueda();
db.asignaUnCampoConBetween(
  'fechaNacimiento',
  TipoDatos.DATE,
  fechaDesde,
  TipoComandosBusqueda.BETWEEN,
  fechaHasta
);
criterios.push(db);
```

**SQL generado:**
```sql
WHERE fechaNacimiento BETWEEN '2024-01-01' AND '2024-12-31'
```

**Variantes con un solo extremo:**
```typescript
// Solo desde (mayor o igual)
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.DATE,
  'fechaNacimiento',
  fechaDesde,
  TipoComandosBusqueda.MAYOR_IGUAL
);

// Solo hasta (menor o igual)
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.DATE,
  'fechaNacimiento',
  fechaHasta,
  TipoComandosBusqueda.MENOR_IGUAL
);
```

---

### 4. Búsqueda con Operador OR

Para buscar en múltiples campos con lógica OR (ej: email en varios campos).

```typescript
// (correoPersonal LIKE 'email' OR correoInstitucional LIKE 'email')

// 1. Abrir paréntesis
const dbParenOpen = new DatosBusqueda();
dbParenOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
criterios.push(dbParenOpen);

// 2. Primer campo
const dbCorreoPersonal = new DatosBusqueda();
dbCorreoPersonal.asignaUnCampoSinTrunc(
  TipoDatos.STRING,
  'correoPersonal',
  email,
  TipoComandosBusqueda.LIKE
);
dbCorreoPersonal.setNumeroCampoRepetido(1);
criterios.push(dbCorreoPersonal);

// 3. Segundo campo con OR
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

// 4. Cerrar paréntesis
const dbParenClose = new DatosBusqueda();
dbParenClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
criterios.push(dbParenClose);
```

**SQL generado:**
```sql
WHERE (correoPersonal LIKE '%email%' OR correoInstitucional LIKE '%email%')
```

**⚠️ Importante:**
- `setNumeroCampoRepetido()` diferencia cada ocurrencia del mismo campo
- `setTipoOperadorLogico(TipoComandosBusqueda.OR)` en el segundo criterio
- Siempre abrir y cerrar paréntesis

---

### 5. Búsqueda por Valores Booleanos/Estados

Para campos numéricos que representan estados (0/1).

```typescript
// Estado activo (1) o inactivo (0)
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.INTEGER,
  'idEstado',
  '1',  // 1 = Activo, 0 = Inactivo
  TipoComandosBusqueda.IGUAL
);
criterios.push(db);

// Sector público (Sí/No)
const db = new DatosBusqueda();
db.asignaUnCampoSinTrunc(
  TipoDatos.INTEGER,
  'sectorPublico',
  '1',  // 1 = Sí, 0 = No
  TipoComandosBusqueda.IGUAL
);
criterios.push(db);
```

---

### 6. Ordenamiento (ORDER BY)

Siempre agregar al final del array de criterios.

```typescript
// Ordenar por razón social ascendente
const dbOrderBy = new DatosBusqueda();
dbOrderBy.orderBy('razonSocial');
dbOrderBy.setTipoOrden(DatosBusqueda.ORDER_ASC);
criterios.push(dbOrderBy);

// Ordenar por fecha descendente
const dbOrderBy = new DatosBusqueda();
dbOrderBy.orderBy('fechaCreacion');
dbOrderBy.setTipoOrden(DatosBusqueda.ORDER_DESC);
criterios.push(dbOrderBy);
```

**SQL generado:**
```sql
ORDER BY razonSocial ASC
ORDER BY fechaCreacion DESC
```

---

## Ejemplo Completo: Búsqueda de Entidades

```typescript
buscar(): void {
  const formValues = this.filtrosForm.value;
  const criterios: DatosBusqueda[] = [];

  // 1. Filtro por filial (JOIN)
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

  // 2. Filtro por razón social (LIKE)
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

  // 3. Filtro por email con OR (correoPersonal OR correoInstitucional)
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

  // 4. Filtro por rango de fechas (BETWEEN)
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

  // 5. Filtro por estado
  if (formValues.idEstado !== null && formValues.idEstado !== undefined) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatos.INTEGER,
      'idEstado',
      formValues.idEstado,
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);
  }

  // 6. Ordenamiento
  const dbOrderBy = new DatosBusqueda();
  dbOrderBy.orderBy('razonSocial');
  dbOrderBy.setTipoOrden(DatosBusqueda.ORDER_ASC);
  criterios.push(dbOrderBy);

  // 7. Ejecutar búsqueda
  this.entidadService.selectByCriteria(criterios).subscribe({
    next: (result) => {
      this.entidades.set(result || []);
      this.dataSource.data = result || [];
    },
    error: (error) => {
      console.error('Error en la búsqueda:', error);
      this.snackBar.open('Error al buscar: ' + error, 'Cerrar', { duration: 3000 });
    }
  });
}
```

---

## Tipos de Datos Disponibles

### TipoDatos (TipoDatosBusqueda)

```typescript
TipoDatos.STRING    // Textos (varchar, text)
TipoDatos.INTEGER   // Enteros (int, boolean como 0/1)
TipoDatos.LONG      // Long (bigint, IDs grandes)
TipoDatos.DECIMAL   // Decimales (numeric, decimal)
TipoDatos.DATE      // Fechas (date, timestamp)
TipoDatos.DOUBLE    // Double precision
```

### TipoComandosBusqueda (Operadores)

```typescript
// Comparación
TipoComandosBusqueda.IGUAL          // =
TipoComandosBusqueda.DIFERENTE      // !=
TipoComandosBusqueda.MAYOR          // >
TipoComandosBusqueda.MAYOR_IGUAL    // >=
TipoComandosBusqueda.MENOR          // <
TipoComandosBusqueda.MENOR_IGUAL    // <=
TipoComandosBusqueda.LIKE           // LIKE '%valor%'
TipoComandosBusqueda.BETWEEN        // BETWEEN valor1 AND valor2

// Lógica
TipoComandosBusqueda.AND            // AND (default)
TipoComandosBusqueda.OR             // OR

// Paréntesis
TipoComandosBusqueda.ABRE_PARENTESIS
TipoComandosBusqueda.CIERRA_PARENTESIS
```

---

## Búsquedas con forkJoin (Múltiples Consultas)

Cuando necesitas ejecutar múltiples búsquedas en paralelo (ej: buscar partícipes para cada detalle).

```typescript
import { forkJoin } from 'rxjs';

// Crear un array de observables (una búsqueda por cada detalle)
const participeQueries = detalles.map(detalle => {
  const criterios: DatosBusqueda[] = [];
  
  const db = new DatosBusqueda();
  db.asignaValorConCampoPadre(
    TipoDatos.LONG,
    'detalleCargaArchivo',
    'codigo',
    detalle.codigo.toString(),
    TipoComandosBusqueda.IGUAL
  );
  criterios.push(db);

  return this.participeService.selectByCriteria(criterios);
});

// Ejecutar todas las búsquedas en paralelo
forkJoin(participeQueries).subscribe({
  next: (results) => {
    // results es un array con los resultados en el mismo orden
    results.forEach((participes, index) => {
      const detalle = detalles[index];
      // Procesar participes para este detalle
    });
  },
  error: (error) => {
    console.error('Error en búsquedas paralelas:', error);
  }
});
```

---

## Errores Comunes

### ❌ Error 1: Usar objetos planos

```typescript
// ❌ INCORRECTO
this.service.selectByCriteria({
  campo: 'nombre',
  valor: 'Juan'
});
```

**Solución:** Siempre usar `DatosBusqueda[]`

---

### ❌ Error 2: No usar asignaValorConCampoPadre para JOINs

```typescript
// ❌ INCORRECTO - Esto no funciona para campos de entidades relacionadas
db.asignaUnCampoSinTrunc(
  TipoDatos.LONG,
  'filial.codigo',  // ❌ No usar punto
  '123',
  TipoComandosBusqueda.IGUAL
);
```

**Solución:**
```typescript
// ✅ CORRECTO
db.asignaValorConCampoPadre(
  TipoDatos.LONG,
  'filial',    // Nombre de la relación
  'codigo',    // Campo en el objeto padre
  '123',
  TipoComandosBusqueda.IGUAL
);
```

---

### ❌ Error 3: Olvidar setNumeroCampoRepetido en OR

```typescript
// ❌ INCORRECTO - Búsqueda OR sin numeroCampoRepetido
db1.asignaUnCampoSinTrunc(TipoDatos.STRING, 'correoPersonal', 'email', TipoComandosBusqueda.LIKE);
// Falta: db1.setNumeroCampoRepetido(1);

db2.asignaUnCampoSinTrunc(TipoDatos.STRING, 'correoInstitucional', 'email', TipoComandosBusqueda.LIKE);
db2.setTipoOperadorLogico(TipoComandosBusqueda.OR);
// Falta: db2.setNumeroCampoRepetido(2);
```

**Solución:** Siempre numerar campos repetidos en grupos OR

---

### ❌ Error 4: Olvidar cerrar paréntesis

```typescript
// ❌ INCORRECTO
dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
criterios.push(dbOpen);
// ... criterios ...
// ❌ Falta cerrar paréntesis
```

**Solución:** Siempre cerrar con `CIERRA_PARENTESIS`

---

### ❌ Error 5: Buscar por entidad padre incorrecta

```typescript
// ❌ INCORRECTO - Buscar partícipes por cargaArchivo.codigo
db.asignaValorConCampoPadre(
  TipoDatos.LONG,
  'cargaArchivo',  // ❌ Entidad incorrecta
  'codigo',
  cargaId.toString(),
  TipoComandosBusqueda.IGUAL
);
```

**Solución:** Verificar la relación correcta en el modelo
```typescript
// ✅ CORRECTO - Buscar por detalleCargaArchivo.codigo
db.asignaValorConCampoPadre(
  TipoDatos.LONG,
  'detalleCargaArchivo',  // ✅ Relación directa
  'codigo',
  detalleId.toString(),
  TipoComandosBusqueda.IGUAL
);
```

---

## Validaciones Previas

Siempre validar valores antes de crear criterios:

```typescript
// ✅ BUENA PRÁCTICA
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

// ✅ BUENA PRÁCTICA - Validar booleanos con null check
if (formValues.idEstado !== null && formValues.idEstado !== undefined) {
  const db = new DatosBusqueda();
  db.asignaUnCampoSinTrunc(
    TipoDatos.INTEGER,
    'idEstado',
    formValues.idEstado,
    TipoComandosBusqueda.IGUAL
  );
  criterios.push(db);
}
```

---

## Formateo de Fechas

Usar `FuncionesDatosService` para formatear fechas:

```typescript
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../shared/services/funciones-datos.service';

// En el constructor
private funcionesDatos = inject(FuncionesDatosService);

// En el método de búsqueda
const fechaFormateada = this.funcionesDatos.formatearFechaParaBackend(
  formValues.fecha,
  TipoFormatoFechaBackend.SOLO_FECHA  // 'dd/MM/yyyy'
);

// o para fecha con hora
const fechaHoraFormateada = this.funcionesDatos.formatearFechaParaBackend(
  formValues.fechaHora,
  TipoFormatoFechaBackend.FECHA_HORA  // 'dd/MM/yyyy HH:mm:ss'
);
```

---

## Resumen de Métodos DatosBusqueda

| Método | Uso Principal |
|--------|---------------|
| `asignaUnCampoSinTrunc()` | Búsqueda simple por campo |
| `asignaValorConCampoPadre()` | Búsqueda en entidad relacionada (JOIN) |
| `asignaUnCampoConBetween()` | Rangos (fechas, números) |
| `usaParentesis()` | Agrupar condiciones con paréntesis |
| `orderBy()` | Ordenar resultados |
| `setTipoOperadorLogico()` | Cambiar a OR (default es AND) |
| `setNumeroCampoRepetido()` | Diferenciar campos repetidos en OR |
| `setTipoOrden()` | ASC o DESC para ordenamiento |

---

## Checklist de Validación

Antes de ejecutar `selectByCriteria()`:

- [ ] ✅ Usar array `DatosBusqueda[]`, no objetos planos
- [ ] ✅ Importar `DatosBusqueda`, `TipoDatos` y `TipoComandosBusqueda`
- [ ] ✅ Usar `asignaValorConCampoPadre()` para campos de entidades relacionadas
- [ ] ✅ En búsquedas OR: usar paréntesis y `setNumeroCampoRepetido()`
- [ ] ✅ Siempre cerrar paréntesis que se abrieron
- [ ] ✅ Validar valores null/undefined antes de crear criterios
- [ ] ✅ Formatear fechas con `formatearFechaParaBackend()`
- [ ] ✅ Agregar `orderBy()` al final si se necesita ordenamiento
- [ ] ✅ Manejar errores con `catchError` o bloque `error` en subscribe

---

## Referencias

- **Archivo de referencia:** `entidad-consulta.component.ts`
- **Documentación completa:** `datos-busqueda.ts` (con JSDoc)
- **Tipos de datos:** `tipo-datos-busqueda.ts`
- **Comandos:** `tipo-comandos-busqueda.ts`
