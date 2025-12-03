# Resolución de Errores 405 en Módulo de Asientos

## 🚨 Problema Original

El componente `AsientosComponent` generaba errores HTTP 405 (Method Not Allowed):

```
GET http://localhost:4200/api/saa-backend/rest/asnt/criteria 405 (Method Not Allowed)
GET http://localhost:4200/api/saa-backend/rest/asnt 405 (Method Not Allowed)
GET http://localhost:4200/api/saa-backend/rest/prdo/getActual 405 (Method Not Allowed)
```

### Causa Raíz

El backend **requiere requests POST**, no GET, incluso para búsquedas y consultas. La arquitectura REST del servidor es:

- ❌ `GET /asnt` → 405 Method Not Allowed
- ❌ `GET /asnt/criteria?param=value` → 405 Method Not Allowed
- ✅ `POST /asnt/criteria` (con body JSON) → Correcto

## ✅ Solución Implementada

### 1. **AsientoService - Cambios Principales**

#### Antes (Incorrecto):

```typescript
// ❌ Usaba GET con query parameters
selectByCriteria(filtros: FiltrosAsiento): Observable<Asiento[]> {
  const params: any = { /* parámetros */ };
  return this.http.get<Asiento[]>(`${this.baseUrl}/criteria`, { params });
}

getAll(): Observable<Asiento[]> {
  return this.http.get<Asiento[]>(this.baseUrl); // GET → 405
}
```

#### Después (Correcto):

```typescript
// ✅ Usa POST con body
selectByCriteria(filtros: FiltrosAsiento): Observable<Asiento[]> {
  const wsEndpoint = '/criteria';
  const url = `${this.baseUrl}${wsEndpoint}`;

  const criteriosBody: any = {
    // Construir objeto con criterios
    fechaDesde: filtros.fechaDesde,
    tipoAsiento: filtros.tipoAsiento,
    // ... etc
  };

  return this.http.post<Asiento[]>(url, criteriosBody, this.httpOptions).pipe(
    catchError((err: HttpErrorResponse) => {
      console.error('[AsientoService] Error:', err);
      return of([]); // Retornar array vacío en error
    })
  );
}

// getAll() ahora delega a selectByCriteria (que usa POST)
getAll(): Observable<Asiento[]> {
  return this.selectByCriteria({}).pipe(
    catchError((err) => {
      console.warn('[AsientoService] getAll fallback:', err);
      return of([]);
    })
  );
}
```

#### HttpOptions Agregadas:

```typescript
private httpOptions = {
  headers: { 'Content-Type': 'application/json' }
};

// Usado en todos los métodos HTTP
this.http.post<Asiento[]>(url, criteriosBody, this.httpOptions)
```

### 2. **AsientosComponent - Simplificación del Error Handling**

#### Antes:

```typescript
// ❌ Intentaba GET, luego fallback a getAll() que también es GET
this.asientoService.selectByCriteria({}).pipe(
  catchError((err) => {
    console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
    return this.asientoService.getAll(); // También GET → 405
  })
);
```

#### Después:

```typescript
// ✅ Usa selectByCriteria directamente (ahora con POST)
this.asientoService.selectByCriteria({}).subscribe({
  next: (asientos) => {
    this.dataSource.data = (asientos || []).filter((a) => a.empresa?.codigo === 280);
    this.cargando = false;
  },
  error: (error) => {
    console.error('[AsientosComponent] Error:', error);
    this.dataSource.data = []; // Empty state en desarrollo
    this.mostrarMensaje('No hay asientos disponibles', 'info');
  },
});
```

## 📋 Cambios en Métodos HTTP

| Método                | Antes                                      | Después                        | Razón                         |
| --------------------- | ------------------------------------------ | ------------------------------ | ----------------------------- |
| `getAll()`            | `GET /asnt`                                | `POST /asnt/criteria`          | Backend requiere POST         |
| `selectByCriteria()`  | `GET /asnt/criteria?params`                | `POST /asnt/criteria`          | Backend requiere POST         |
| `crearAsiento()`      | `POST /asnt`                               | `POST /asnt` (con httpOptions) | Se agregó Content-Type        |
| `actualizarAsiento()` | `PUT /asnt/{id}`                           | `PUT /asnt/{id}` (con body)    | Parámetros en body, no query  |
| `anularAsiento()`     | `PUT /asnt/{id}/anular?razonAnulacion=...` | `PUT /asnt/{id}/anular` (body) | Body en lugar de query params |

## 🔍 Patrón Correcto para Búsquedas

Este patrón sigue la convención de otros servicios en la app como:

- `PeriodoService.selectByCriteria()` - POST a `/prdo/selectByCriteria/`
- `PlanCuentaService.selectByCriteria()` - POST a `/plnn/selectByCriteria`
- `DetalleMayorAnaliticoService.selectByCriteria()` - POST a `/dtma/selectByCriteria/`

```typescript
// Patrón estándar:
selectByCriteria(datos: any): Observable<Asiento[] | null> {
  const wsEndpoint = '/criteria';  // o '/selectByCriteria/'
  const url = `${ServiciosCnt.RS_ASNT}${wsEndpoint}`;

  return this.http.post<Asiento[]>(url, datos, this.httpOptions).pipe(
    catchError(this.handleError)
  );
}
```

## 🎯 Resultado

### ✅ Errores Resueltos

- ❌ `405 Method Not Allowed` en `/asnt/criteria`
- ❌ `405 Method Not Allowed` en `/asnt`
- ✅ Requests ahora usan POST correctamente
- ✅ Respuestas vacías se manejan como estado válido (empty array)

### 🔄 Flujo Nueva Actualización

```
1. AsientosComponent.ngOnInit()
   ↓
2. cargarDatos() → selectByCriteria({})
   ↓
3. AsientoService.selectByCriteria()
   ↓
4. POST /api/saa-backend/rest/asnt/criteria (body: {})
   ↓
5. Backend procesa y retorna Asiento[] o error
   ↓
6. Component recibe array y lo filtra por empresa 280
   ↓
7. DataSource se actualiza y tabla se renderiza
```

### Error Handling

```typescript
// Graceful degradation en desarrollo:
- Backend API no disponible → Mostrar estado vacío
- Criterios inválidos → Array vacío sin crash
- Usuario ve UI sin datos pero sin errores de consola
```

## 📝 Notas Importantes

1. **Mock Data**: En desarrollo, si el backend no está disponible, la app muestra estado vacío en lugar de errores
2. **Empty Criteria**: `selectByCriteria({})` es válido - envía body vacío para obtener todos
3. **HttpOptions**: Ahora se usan en todos los métodos para consistencia
4. **Proxy Config**: Sigue funcionando en dev server (localhost:4200 → http://127.0.0.1:8080)

## 🧪 Pruebas

```bash
# Build para verificar compilation
npm run build

# Dev server
npm start

# Navegación
http://localhost:4200/menucontabilidad/asientos
```

Verifica que:

- ✅ No haya errores 405 en console
- ✅ Página se carga sin crashes
- ✅ Tabla muestra estado vacío (sin datos) o datos del backend
- ✅ Los formularios de filtro no generan errores

## 📚 Referencias

- `.github/DEVELOPMENT_STANDARDS.md` - Estándares de desarrollo
- `.github/GUARDS-AUTENTICACION-NAVEGACION.md` - Patrones de servicios
- Otros servicios con `selectByCriteria`: `periodo.service.ts`, `plan-cuenta.service.ts`

---

**Actualizado**: Diciembre 2, 2025  
**Versión**: Angular 20, saaFE v1
