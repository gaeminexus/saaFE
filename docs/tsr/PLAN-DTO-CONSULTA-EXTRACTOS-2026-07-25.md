# Plan: DTO liviano para "Consulta de Extractos Bancarios" (pendiente de implementar)

**Fecha:** Julio 25, 2026
**Estado:** En espera — diagnosticado y diseñado, no implementado todavía.
**Por qué se detuvo:** el usuario pidió dejarlo pendiente para retomar después.

---

## 1. Problema

La pantalla "Consulta de Extractos Bancarios" (`GET /exbc/getAll`) tarda mucho en
mostrar la lista completa, y **sigue lenta incluso después de una primera
optimización** (agregar `join fetch` para `cuentaBancaria`, `cuentaBancaria.banco`
y `empresa` en el named query `ExtractoBancarioAll`, ver
`c:\work\saaBE\saaBE\src\main\java\com\saa\model\tsr\ExtractoBancario.java`).

## 2. Causa raíz (confirmada, no solo sospechada)

Se midió el payload real de `/exbc/getAll`: **18 KB para solo 6 filas**. La causa
es que `ExtractoBancario` expone su grafo JPA completo por serialización directa
de entidades, y ese grafo es mucho más profundo que lo que el `join fetch` actual
cubre. Todas las asociaciones son `@ManyToOne` con `FetchType.EAGER` (default de
JPA), así que cualquier tramo no cubierto por `join fetch` dispara una consulta
N+1 adicional **por fila**:

```
ExtractoBancario
├── cuentaBancaria                      [OK] ya cubierto por join fetch
│   ├── banco                           [OK] ya cubierto por join fetch
│   │   └── empresa → jerarquia         [FALTA] N+1
│   ├── planCuenta                      [FALTA] N+1
│   │   ├── naturalezaCuenta → empresa → jerarquia   [FALTA] N+1
│   │   └── empresa → jerarquia         [FALTA] N+1
│   └── cuentaApertura (mismo tipo que planCuenta, nullable)  [FALTA] N+1
└── empresa                             [OK] ya cubierto por join fetch
    └── jerarquia                       [FALTA] N+1
```

Además del costo de consultas, el mismo objeto `Empresa`/`Jerarquia` se serializa
**4-5 veces por fila** (una vez por cada camino que llega a él) aunque la pantalla
de lista **no usa ninguno** de esos datos — solo muestra: nombre de banco, número
de cuenta, período (fechaDesde/fechaHasta), saldoInicial, saldoFinal, estadoCarga,
archivoNombre, usuarioCreacion, fechaCreacion (ver
`c:\work\saaFE\v1\saaFE\src\app\modules\tsr\forms\generales\consulta-extractos-bancarios\consulta-extractos-bancarios.component.ts`,
propiedad `displayedColumns`).

## 3. Opciones evaluadas

1. **Parche rápido**: seguir agregando `join fetch` hasta cubrir todo el grafo
   (`cuentaBancaria.planCuenta(.naturalezaCuenta/.empresa.jerarquia)`,
   `cuentaBancaria.cuentaApertura(...)` como `left join fetch` por ser nullable,
   `cuentaBancaria.banco.empresa.jerarquia`, `e.empresa.jerarquia`). Elimina el
   N+1 restante pero el payload sigue siendo igual de grande (se sigue
   devolviendo el grafo completo) — el problema solo se pospone a la próxima
   pantalla que reutilice esta entidad, y empeora a medida que crecen los
   extractos.
2. **Solución recomendada**: DTO liviano dedicado a esta lista + endpoint propio
   (ver diseño abajo). Elimina el N+1 de raíz y reduce el payload a solo los
   campos que la pantalla realmente usa.

## 4. Diseño de la solución recomendada

Se investigó el codebase (agente Explore) para confirmar que esto **no entra en
conflicto** con los patrones existentes — ver hallazgos completos en la
respuesta de esa sesión; resumen:

- **Ya existe precedente directo de DTOs** en `com.saa.model.crd.dto` (ej.
  `EntidadResumenEstadoDTO`, `AporteKpiDTO`): campos planos, `Serializable`,
  poblados manualmente en el DAO impl a partir de resultados `Object[]` de una
  query (NO se usa el patrón JPQL `select new ...` en ningún lado del código —
  hay que seguir el estilo `Object[]` existente, no inventar uno nuevo).
- **La capa genérica de DAO no impone nada**: `EntityDao<Tipo>` /
  `EntityDaoImpl<Tipo>` (`com.saa.basico.utilImpl.EntityDaoImpl`) solo maneja
  CRUD genérico. Los métodos custom (como el que devolvería el DTO) se agregan
  a la interfaz específica (`ExtractoBancarioDaoService`), tal como `crd` agregó
  `selectResumenPorEstado` / `selectKpisGlobales` a sus DAOs sin tocar la
  interfaz genérica.
- **REST ya devuelve POJOs planos en otros lados** (no solo entidades) — ej.
  `ExtractoBancarioRest.validarImportacion()` ya devuelve
  `ResumenImportacionExtracto` vía `.entity(resumen)`. Mismo patrón para el DTO
  nuevo.
- **Convención de paquete**: usar `com.saa.model.tsr.dto` (nuevo sub-paquete),
  siguiendo el precedente de `com.saa.model.crd.dto`. Nota: `ResumenImportacionExtracto`
  quedó en `com.saa.model.tsr` (sin sub-paquete `dto`) por una inconsistencia de
  esta misma sesión — se puede mover a `com.saa.model.tsr.dto` de paso para
  alinear, es opcional.
- **Convención de path REST**: no hay precedente de `/resumen` o `/lista` en
  `tsr` — usar un path descriptivo y distinto de `/getAll` (que sigue existiendo
  para el uso de entidad completa), ej. `/listaResumen`.

### Archivos a crear/tocar

**Backend (`c:\work\saaBE\saaBE`):**
- Nuevo: `src/main/java/com/saa/model/tsr/dto/ExtractoBancarioResumenDTO.java`
  — campos: `codigo`, `bancoNombre`, `numeroCuenta`, `fechaDesde`, `fechaHasta`,
  `saldoInicial`, `saldoFinal`, `estadoCarga`, `archivoNombre`, `usuarioCreacion`,
  `fechaCreacion` (los mismos que usa `displayedColumns` en el frontend).
- Modificar `ExtractoBancarioDaoService.java` / `ExtractoBancarioDaoServiceImpl.java`:
  agregar método `selectResumenLista()` (nombre tentativo) que arma una query
  JPQL con `select e.codigo, cb.banco.nombre, cb.numeroCuenta, e.fechaDesde, ...`
  (proyección de columnas, no `select e`) devolviendo `List<Object[]>`, y lo
  mapea a `List<ExtractoBancarioResumenDTO>` en el DAO impl — igual que
  `EntidadDaoServiceImpl.java` / `AporteDaoServiceImpl.java`.
- Modificar `ExtractoBancarioRest.java`: nuevo endpoint
  `@GET @Path("/listaResumen")` devolviendo `List<ExtractoBancarioResumenDTO>`.

**Frontend (`c:\work\saaFE\v1\saaFE`):**
- Nuevo modelo `src/app/modules/tsr/model/extracto-bancario-resumen.ts` (o
  reutilizar/ajustar el existente si aplica).
- `extracto-bancario.service.ts`: nuevo método `getListaResumen()` apuntando a
  `/listaResumen`.
- `consulta-extractos-bancarios.component.ts`: cambiar `cargarExtractos()` para
  usar el nuevo método en lugar de `getAll()`. El resto del componente
  (`aplicarFiltro`, `displayedColumns`, etc.) debería necesitar cambios mínimos
  porque ya solo usa esos mismos campos.

### Nota de alcance

`getAll()` (la versión con entidad completa) **no se elimina** — puede seguir
usándose donde sí se necesite el grafo completo (si existiera algún otro
consumidor). Este cambio es aditivo: un endpoint nuevo y más liviano para la
pantalla de lista específicamente.

---

## 5. Para retomar

Cuando se retome esta tarea, este documento tiene todo el contexto necesario
para implementar directamente sin tener que re-diagnosticar el problema ni
re-investigar las convenciones del codebase.
