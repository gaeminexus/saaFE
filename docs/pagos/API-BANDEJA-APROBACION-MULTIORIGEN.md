# Contrato — bandeja de aprobación de pagos: filtro de origen múltiple

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Módulos:** `cxp` (backend) · `tsr` (pantalla)
**Pedido del usuario:** *«en la pantalla de aprobación de pagos el combo origen sea más grande
porque no se alcanza a leer todo, y sea de selección múltiple, debo poder escoger varios orígenes al
mismo tiempo»*.

---

## 1. Por qué esto NO es sólo un cambio de pantalla

El combo no filtra en el cliente: manda `origen` al servidor.

```
GET /rest/pgtr/porAprobar?idEmpresa=1&origen=FACTURA_COMPRA&desde=...&hasta=...
```

`PagoProgramadoRest:203-206` lo recibe como **`@QueryParam("origen") String origen`** — un solo
valor. Para elegir varios hay que tocar las tres capas.

---

## 2. 🔴 La trampa: «origen» no es una columna

`PagoProgramadoDaoServiceImpl.selectPorAprobar:222-234` **no compara un campo**. Traduce el origen a
cuatro predicados distintos:

| Origen | Predicado JPQL |
|---|---|
| `FACTURA_COMPRA` | `p.facturaCompra is not null` |
| `EGRESO_TESORERIA` | `p.egreso is not null` |
| `ANTICIPO_PROVEEDOR` | `p.anticipo is not null` |
| cualquier otro (etiquetas de `OrigenPagoExterno`) | `p.origenExterno = :origen` |

**Así que la selección múltiple no es un `IN`.** Es un `OR` que mezcla predicados de asociación con
un `IN` sobre una columna. Elegir *Factura de compra* + *Anticipo a trabajador* tiene que producir:

```sql
and ( p.facturaCompra is not null or p.origenExterno in :origenesExternos )
```

### ⛔ Los paréntesis externos NO son estilo, son la corrección

Sin el `( … )` que envuelve el `OR`, el JPQL queda:

```sql
where p.empresa.codigo = :idEmpresa and p.estado = :estado
  and p.facturaCompra is not null or p.origenExterno in :origenesExternos
```

y `AND` liga más fuerte que `OR`: la segunda rama **se evalúa sola**, sin el filtro de empresa ni el
de estado. La bandeja empezaría a mostrar **pagos de otras empresas y en cualquier estado**, y no
daría ningún error — devolvería filas de más, que es la falla que nadie reporta hasta que alguien
aprueba lo que no debía.

**Es la misma familia que las trampas que este equipo ya tiene registradas** (los `COLUMN_n` de los
`.jrxml`, el tabulador del archivo del Internacional): *un cambio estructural que no falla, produce
un resultado distinto en silencio.*

---

## 3. El contrato nuevo

### `GET /rest/pgtr/porAprobar`

```
GET /rest/pgtr/porAprobar?idEmpresa=1&origen=FACTURA_COMPRA&origen=RHH_ANTICIPO_EMPLEADO&desde=2026-09-01&hasta=2026-09-30
```

| Parámetro | Tipo | Nota |
|---|---|---|
| `idEmpresa` | `Long` | **Obligatorio.** 400 si falta |
| `origen` | **repetible** | Cero, uno o varios. **Cero = todos los orígenes** |
| `desde` / `hasta` | `yyyy-MM-dd` | Opcionales |

**Respuesta:** sin cambios — `List<PagoPorAprobar>` con `id`, `origen`, `beneficiario`, `concepto`,
`valor`, `fechaSolicitada`.

### ✅ Es retrocompatible, y eso importa porque el archivo es compartido

`@QueryParam("origen") List<String>` en JAX-RS acepta el parámetro repetido **y también el simple**:
un `?origen=FACTURA_COMPRA` de un cliente viejo llega como lista de un elemento y se comporta
exactamente igual que hoy. **Ningún consumidor existente se rompe**, y `lap-saa-1` viene commiteando
sobre estos mismos archivos.

---

## 4. Backend — los tres cambios, en orden

### 4.1 `PagoProgramadoDaoServiceImpl.selectPorAprobar` (línea 213)

Firma: `String origen` → `List<String> origenes`. La construcción del filtro:

```java
if (origenes != null && !origenes.isEmpty()) {
    List<String> condiciones = new ArrayList<>();
    List<String> externos    = new ArrayList<>();
    for (String o : origenes) {
        if (o == null || o.trim().isEmpty()) {
            continue;
        }
        String origen = o.trim();
        if (OrigenPagoCxp.FACTURA_COMPRA.equals(origen)) {
            condiciones.add("p.facturaCompra is not null");
        } else if (OrigenPagoCxp.EGRESO_TESORERIA.equals(origen)) {
            condiciones.add("p.egreso is not null");
        } else if (OrigenPagoCxp.ANTICIPO_PROVEEDOR.equals(origen)) {
            condiciones.add("p.anticipo is not null");
        } else {
            externos.add(origen);
        }
    }
    if (!externos.isEmpty()) {
        condiciones.add("p.origenExterno in :origenesExternos");
    }
    if (!condiciones.isEmpty()) {
        jpql.append(" and ( ").append(String.join(" or ", condiciones)).append(" ) ");
    }
}
```

Y el binding, **sólo si se agregó el `in`**:

```java
if (!externos.isEmpty()) {
    query.setParameter("origenesExternos", externos);
}
```

⛔ Ligar un parámetro que no está en el JPQL lanza `IllegalArgumentException` en tiempo de ejecución.
⛔ Una lista vacía o con sólo cadenas en blanco **no debe agregar ninguna condición**: es «todos».

### 4.2 `PagoProgramadoServiceImpl.porAprobar` (línea 1065)

Firma: `String origen` → `List<String> origenes`. Se le saca el `trim`/`isEmpty` de la línea 1078
—ahora lo hace el DAO— y se pasa la lista tal cual. Actualizar la traza `System.out.println` para
que imprima la lista.

### 4.3 `PagoProgramadoRest.porAprobar` (línea 200)

`@QueryParam("origen") String origen` → `@QueryParam("origen") List<String> origen`.
El resto del método no cambia. Actualizar el JavaDoc del parámetro: repetible, cero = sin filtro.

⛔ **No se toca ningún otro método** de esos tres archivos.

---

## 5. Frontend — la pantalla

`src/app/modules/tsr/forms/procesos/aprobacion-pagos/`

### 5.1 El combo

- `filtroOrigen = signal<OrigenPago | null>(null)` → **`filtroOrigenes = signal<OrigenPago[]>([])`**
- `<mat-select multiple>`, sin la opción `Todos`: en un select múltiple **la lista vacía ES «todos»**.
  Una opción `null` conviviendo con selecciones reales es ambigua y no se puede representar.
  Que el `<mat-label>`/placeholder diga «Origen (todos)» cuando no hay nada elegido.
- ⚠️ **No dispares `buscar()` en cada tilde.** Hoy el `(ngModelChange)` busca en cada cambio; con
  selección múltiple eso son N llamadas mientras la persona arma su selección. Buscar **al cerrar el
  panel** (`(closed)` de `mat-select`) o con el botón de buscar que ya existe.

### 5.2 El ancho — que es la mitad del pedido

El bloque `.filters` es un `display: flex` con `flex-wrap`, y el campo de origen toma el ancho por
defecto de `mat-form-field`, que corta las etiquetas largas. Darle un ancho propio suficiente para
la etiqueta más larga de `ORIGEN_PAGO_LABELS` (**`min-width: 280px`** como piso, y que pueda crecer),
y que el panel desplegable no recorte: `mat-select` con `panelWidth: 'auto'` o una clase de panel con
`min-width` propia.

**Verificarlo con la etiqueta más larga que exista de verdad**, no con una inventada.

### 5.3 El servicio

`src/app/modules/cxp/service/pago-programado.service.ts:106-114`

```ts
let params = new HttpParams().set('idEmpresa', filtros.idEmpresa);
for (const o of filtros.origenes ?? []) {
  params = params.append('origen', o);   // append, NO set
}
```

⛔ **`set` pisa el valor anterior**: con `set` en un bucle sólo viaja el último origen, y el síntoma
es una bandeja que filtra por uno solo sin avisar. Y `FiltrosPorAprobar.origen?: string` pasa a
`origenes?: string[]`.

### 5.4 Lo que NO se toca

⛔ **La lógica de «agrupar en un solo cheque»** (`agruparEnUnCheque`, `beneficiariosSeleccionados`,
`hayBeneficiariosDistintos`, `puedeMarcarAgruparEnUnCheque`, `sincronizarAgrupacion`) es de
`lap-saa-1`, commit `c9798bd`, y es **ortogonal** a este cambio: depende de la selección de filas y
de la forma de pago, no del filtro. No se toca ni una línea.

⚠️ Pero sí hay que **verificar** que sigue andando: cambiar el filtro recarga la bandeja y limpia
`seleccionados`, y esa casilla depende de los seleccionados. Que al filtrar quede coherente.

---

## 6. Orden de despliegue

**Sin DDL.** **El WAR va antes que el FE**: el FE nuevo manda `origen` repetido, y el WAR viejo
—que lo recibe como `String`— se quedaría con uno solo, filtrando de menos sin avisar. Al revés
(WAR nuevo, FE viejo) es inofensivo por la retrocompatibilidad del §3.
