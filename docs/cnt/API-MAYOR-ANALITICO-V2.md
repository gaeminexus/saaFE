# Contrato de API — Mayor Analítico (pantalla V2)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Módulo:** `cnt`
**Verificado contra el código**, no contra documentación previa.

> ⛔ **`docs/logica-negocio/cnt/MayorAnalitico-API-COMPLETA.md` está DESACTUALIZADO en las rutas.**
> Documenta `http://localhost:8080/saaBE/api/myan/...`. Ese `/api/` **no existe**: el application
> path de JAX-RS es `/rest` (`com.saa.ws.rest.ApplicationConfig`). Es la trampa que el `CLAUDE.md`
> ya avisa. Los cuerpos de ese doc siguen sirviendo; **las rutas no**.

---

## 1. Ruta base real

```
/SaaBE/rest/myan
```

Clase: `com.saa.ws.rest.cnt.MayorAnaliticoRest` (`@Path("myan")`).

### 1bis. ⚠️ Ojo: el frontend NO usa esa ruta tal cual, y las dos son correctas

`ServiciosCnt.RS_MYAN` (`saaFE/src/app/modules/cnt/service/ws-cnt.ts`) vale:

```
/api/saa-backend/rest/myan
```

**Ese `/api/` es un prefijo de proxy, no el application path de JAX-RS.** El proxy reescribe
`/api/saa-backend` al contexto del WAR, y `/rest/myan` es lo que efectivamente llega al servidor.
O sea:

| Capa | Ruta |
|---|---|
| Lo que llama el frontend | `/api/saa-backend/rest/myan/...` |
| Lo que atiende el servidor | `/SaaBE/rest/myan/...` |

⛔ **No confundir este `/api/` con el `/api/` de los docs viejos**, que es otra cosa: aquéllos
escriben `/saaBE/api/myan/...` — sin `/rest` en ningún lado — y ésa sí es una ruta que no existe.

⚠️ Varios javadoc de `reporte-myan.service.ts` arrastran esa forma vieja (`/SaaBE/api/cnt/myan/...`)
en los comentarios. **Son comentarios equivocados; la URL real la arma `RS_MYAN`.** No se corrigieron
en este frente para no tocar métodos existentes, pero quedan anotados acá.

---

## 2. Los cuatro endpoints que usa la pantalla, verificados

### 2.1 `POST /rest/myan/generarReporte`

Genera el reporte en tablas temporales y devuelve el secuencial que lo identifica.

**Cuerpo** (`ParametrosMayorAnalitico`, verificado campo por campo):

```json
{
  "fechaInicio":      "2026-01-01",
  "fechaFin":         "2026-09-07",
  "empresa":          1,
  "cuentaInicio":     "1010101",
  "cuentaFin":        "9999999",
  "tipoDistribucion": 0,
  "tipoAcumulacion":  0,
  "centroInicio":     null,
  "centroFin":        null
}
```

| Campo | Tipo Java | Obligatorio | Nota |
|---|---|---|---|
| `fechaInicio` / `fechaFin` | `LocalDate` | **Sí** | ⚠️ `yyyy-MM-dd`. **Nunca un `Date` de JS ni nada terminado en `Z`** — ver `CLAUDE.md`, Serialización |
| `empresa` | `Long` | Sí | |
| `cuentaInicio` / `cuentaFin` | `String` | No | Número de cuenta contable, no el código |
| `tipoDistribucion` | `Integer` | Sí | **Tres valores, no dos.** Ver §3 |
| `tipoAcumulacion` | `Integer` | Sí | `0` sin acumular · `1` acumulado |
| `centroInicio` / `centroFin` | `String` | No | |

**Respuesta 200** (`RespuestaMayorAnalitico`):

```json
{
  "exitoso": true,
  "mensaje": "...",
  "secuencialReporte": 12345,
  "totalCabeceras": 87,
  "totalDetalles": 4210,
  "fechaProceso": "..."
}
```

⚠️ **Un 200 no significa que haya datos.** Si `exitoso` es `false` o `secuencialReporte` es `null`,
no hubo reporte. La pantalla debe mirar el cuerpo, no el código HTTP.

### 2.2 `GET /rest/myan/resultado/{secuencialReporte}`

Devuelve las **cabeceras** (una por cuenta contable): `List<MayorAnalitico>`.

```json
[{ "codigo": 1001, "secuencial": 12345, "numeroCuenta": "1010101",
   "nombreCuenta": "CAJA GENERAL", "saldoAnterior": 1500.00,
   "planCuenta": {}, "centroCosto": {}, "empresa": {}, "observacion": null }]
```

### 2.3 `GET /rest/myan/detalle/{idMayorAnalitico}`

Devuelve los **movimientos de UNA cuenta**: `List<DetalleMayorAnalitico>`. El `{idMayorAnalitico}`
es el `codigo` de la cabecera, **no** el secuencial del reporte.

```json
[{ "codigo": 55001, "fechaAsiento": "2026-03-14", "numeroAsiento": 812,
   "descripcionAsiento": "...", "valorDebe": 100.00, "valorHaber": 0.00,
   "saldoActual": 1600.00, "estadoAsiento": 1,
   "numeroCentroCosto": "001", "nombreCosto": "ADMINISTRACION",
   "planCuenta": {},
   "asiento": { "codigo": 9001, "numeroAlterno": "DI-2026-03-0044",
                "observaciones": "...", "tipoAsiento": { "nombre": "DIARIO" } } }]
```

`estadoAsiento`: `1` Activo · `2` Anulado · `3` Preliminar · `4` Incompleto.

### 2.4 `DELETE /rest/myan/resultado/{secuencialReporte}`

Limpia las tablas temporales. La pantalla actual lo llama en `ngOnDestroy` y antes de regenerar.
**Se conserva igual en la V2**: sin esto, `CNT.MYAN`/`CNT.DTMA` acumulan basura.

---

## 3. 🔴 `tipoDistribucion` tiene TRES valores y la pantalla actual expone DOS

`MayorAnaliticoServiceImpl:163` hace `switch` sobre `com.saa.rubros.ReporteTipoDistribucion`:

| Valor | Constante | Etiqueta correcta |
|---|---|---|
| `0` | `SIN_CENTRO_COSTO` | Sin centro de costo |
| `1` | `CENTRO_COSTO_POR_CUENTA_CONTABLE` | Centro por cuenta |
| `2` | `CUENTA_CONTABLE_POR_CENTRO_COSTO` | **Cuenta por centro** |

El `.ts` actual ya declara las tres etiquetas correctas en `opcionesTipoDistribucion`, **pero el
`.html` no usa ese arreglo**: escribe a mano dos `<mat-option>` con las etiquetas equivocadas
(*«Sin distribución» / «Con distribución»*) y **sin el valor `2`**.

**Consecuencia:** una de las tres formas del reporte que el backend implementa **no se puede pedir
desde la pantalla**, y las otras dos están mal rotuladas. La V2 debe enlazar el `<mat-select>` al
arreglo del `.ts`, no volver a escribir las opciones a mano.

> Es el patrón que este equipo ya tiene registrado (§24 del estado): **una lista escrita a mano en
> otro lugar que la fuente de verdad se desincroniza y nadie se entera.**

⚠️ Además el `.html` manda `value="0"` como **string** y el backend declara `Integer`. Hoy funciona
porque Jackson coerciona `"0"` a `0`. En la V2 va como número, que es lo que el contrato declara.

---

## 4. 🟢 `numeroAlterno` YA VIAJA — no hace falta tocar el backend para eso

**Es el hallazgo que define el reparto de este frente.**

`DetalleMayorAnalitico` declara `@ManyToOne @JoinColumn(name="ASNTCDGO") private Asiento asiento`.
`@ManyToOne` es **EAGER** por defecto, el endpoint devuelve la entidad directamente y no hay
`@JsonIgnore` de por medio. Así que el movimiento ya llega con:

```
detalle.asiento.numeroAlterno    →  "DI-2026-03-0044"
```

Lo confirma el código que ya lo consume: `mayor-analitico-asiento-dialog.component.ts:150` lee
`this.detalleMayor?.asiento` del propio payload del detalle.

`ASNTNMAL` es `VARCHAR2(100)` y lo genera `AsientoServiceImpl:244` con el formato
`{prefijo}-{año}-{mes}-{secuencial}`.

### ⚠️ La trampa: `numeroAlterno` puede venir nulo, y `asiento` también

`ASNTNMAL` es nullable y lo asigna el servicio **al grabar**: los asientos viejos, o los creados por
caminos que no pasan por esa numeración, no lo tienen. Y `DTMA.ASNTCDGO` puede no resolver.

**Regla obligatoria para la V2, en pantalla y en los dos exports:**

```
numeroAlterno = detalle.asiento?.numeroAlterno || String(detalle.numeroAsiento ?? '') || '—'
```

⛔ **Nunca dejar la celda vacía sin respaldo.** Una columna de identificación de asiento en blanco
en un mayor analítico exportado es un renglón que el contador no puede rastrear.

---

## 5. 🆕 El único endpoint nuevo: todos los movimientos del reporte en UNA llamada

**Por qué hace falta.** La pantalla actual, para exportar todo, hace
`forkJoin(cuentas.map(c => obtenerDetalles(c.codigo)))` — **una petición HTTP por cuenta contable**.
Con las 87 cuentas de un reporte chico son 87 peticiones en paralelo; con un mayor anual de varios
cientos de cuentas, son varios cientos. Y la V2 necesita **buscar y ordenar sobre todo el reporte**,
no sólo sobre la cuenta seleccionada, lo que hoy es imposible sin traerlo todo.

### `GET /rest/myan/detalleReporte/{secuencialReporte}`

Devuelve **todos** los movimientos de **todas** las cuentas del reporte, en una sola respuesta.

**Respuesta 200:** `List<DetalleMayorAnalitico>`, misma forma exacta que §2.3 — el mismo objeto, con
su `asiento` anidado. No se inventa un DTO nuevo: la V2 reusa el modelo que el FE ya tiene.

**Respuesta 204** si el reporte no tiene movimientos. **500** con `{"mensaje": "..."}` ante error.

> ⚠️ Los errores del REST **no llegan como texto plano** aunque el endpoint escriba un `String`:
> `MensajeErrorJsonFilter` los envuelve en `{"mensaje": "..."}`. Ver §8.3 del registro de reservas.

**Cómo se implementa** (para el agente de backend, sin margen a inventar):

1. `DetalleMayorAnaliticoDaoService` — método nuevo, con JavaDoc como los de al lado:
   `List<DetalleMayorAnalitico> selectBySecuencialReporte(Long secuencialReporte) throws Throwable;`
2. `DetalleMayorAnaliticoDaoServiceImpl` — calcado de `selectByIdMayorAnalitico:43-50`:
   ```java
   Query query = em.createQuery(" select   b " +
                                " from     DetalleMayorAnalitico b " +
                                " where    b.mayorAnalitico.secuencial = :secuencialReporte " +
                                " order by b.mayorAnalitico.numeroCuenta, b.fechaAsiento, b.codigo");
   ```
3. `MayorAnaliticoRest` — método nuevo calcado de `getDetalle` (líneas 231-255), mismo estilo de
   `catch (Throwable e)` y la línea de traza `System.out.println` al entrar.

⛔ **No se toca ningún método existente** de esos tres archivos.

---

## 6. Orden de despliegue

1. **No hay DDL.** Este frente no crea ni modifica ninguna columna, así que no aplica la regla del
   `.sql` antes del WAR.
2. **El WAR va antes que el FE**, porque la V2 consume `/detalleReporte/{secuencial}`, que el WAR
   viejo no tiene. Al revés (WAR nuevo, FE viejo) es inofensivo: no se toca ningún endpoint existente.

### 🔴 Y si se despliega al revés, el síntoma MIENTE

`ReporteMyanService.handleErrorLista` (`reporte-myan.service.ts:83-87`) se traga **cualquier** error
y devuelve lista vacía:

```ts
private handleErrorLista<T>() {
  return (error: HttpErrorResponse): Observable<T[]> => {
    return of([]);
  };
}
```

Así que con el WAR viejo, `/detalleReporte/{secuencial}` responde **404**, el servicio lo convierte
en `[]`, y la vista «Todos los movimientos» muestra **«Sin movimientos»** — no un error.

**El operador ve un reporte vacío y concluye que no hay datos, cuando lo que pasa es que falta
desplegar el backend.** Es el §8.1 del registro de reservas —*un fallo de consulta se lee como «no
hay datos»*— en su forma más directa, y acá tiene un disparador concreto y previsible: el orden de
despliegue.

⚠️ **Regla práctica:** si la vista B sale vacía y la vista A tiene datos, **no es el reporte, es el
WAR.** Las dos leen del mismo reporte generado; que una traiga filas y la otra no es imposible salvo
que el endpoint no exista.
