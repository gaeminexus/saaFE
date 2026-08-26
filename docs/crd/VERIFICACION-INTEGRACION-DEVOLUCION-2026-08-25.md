# Verificación de integración — pantalla de devolución de aportes

**Fecha:** 2026-08-25 · **Repo:** saaFE (frontend) · **Backend:** WildFly en
`http://localhost:8080/SaaBE`. Contrato de referencia: `PLAN-DEVOLUCION-APORTES.md` §6.

## Resultado global

- **Sobre de respuesta `{exito, etapa, mensaje, error, resultado}`: correcto en 2xx y en 4xx.**
  El servicio (`DevolucionAporteService.normalizarError`) reutiliza el sobre del cuerpo y la
  pantalla muestra `mensaje`, no un texto genérico. Verificado con respuestas reales.
- **Modelos (`model/devolucion/`) vs respuestas reales: coinciden campo por campo** en todo lo
  que se pudo observar (`deudaVigente`, `sincronizar`, sobre de error con todos los códigos).
- **No hubo nada que corregir en el front.** No se modificó código.
- **No se dejó nada creado en la BD de desarrollo.** Todas las escrituras intentadas fallaron
  en validación (no persisten) y `sincronizar` fue un no-op (0 devoluciones pendientes).
- **Dos puntos no verificables aquí** (ver §Limitaciones): el camino de éxito de `registrar`
  y la forma real del `porEntidad` poblado — porque **ninguna entidad del dev DB tiene saldo de
  aportes** y **no existe ninguna devolución** (7300 entidades barridas).

---

## 1. Lecturas / sobre de respuesta — respuestas reales

### `GET /rest/dvap/porEntidad/1` → 200 `application/json`
```json
{"exito":true,"etapa":"APLICACION","resultado":[]}
```
Lista vacía es `200 []`, no error (como dice §6.2). ✔

### `GET /rest/dvap/deudaVigente/1` → 200 `application/json`
```json
{"exito":true,"etapa":"APLICACION","resultado":{"idEntidad":1,"totalDeuda":0.0,"cantidadPrestamos":0,"tieneMora":false,"prestamos":[]}}
```

### `GET /rest/dvap/deudaVigente/5310` → 200 `application/json` (POBLADO)
```json
{"exito":true,"etapa":"APLICACION","resultado":{"idEntidad":5310,"totalDeuda":17039.33,"cantidadPrestamos":1,"tieneMora":true,
 "prestamos":[{"idPrestamo":7233,"idAsoprep":67730,"producto":"HIPOTECARIO","idEstado":11,"estadoTexto":"EN MORA","saldoPendiente":17039.33,"cuotasVencidas":29}]}}
```
`DeudaVigenteParticipe` y `PrestamoDeudaVigente` coinciden **campo por campo** (idEntidad,
totalDeuda, cantidadPrestamos, tieneMora, prestamos[idPrestamo, idAsoprep, producto, idEstado,
estadoTexto, saldoPendiente, cuotasVencidas]). ✔ `idEstado` es el estado operativo (11 = EN MORA).

### `POST /rest/dvap/sincronizar` → 200 `application/json`
```json
{"exito":true,"etapa":"APLICACION","mensaje":"Sincronización terminada: 0 evaluada(s), 0 pagada(s), 0 rechazada(s).",
 "resultado":{"evaluadas":0,"marcadasPagadas":0,"marcadasRechazadas":0,"huerfanas":0,"conError":0,"errores":[]}}
```
`ResultadoSincronizacionDevolucion` coincide exacto. No-op seguro: 0 devoluciones pendientes en todo el sistema. ✔

---

## 2. Errores — el sobre llega igual en 4xx, con código estable

| Caso (POST/GET) | HTTP | Cuerpo real |
|---|---|---|
| `registrar` sin `idEntidad` | **400** | `{"exito":false,"etapa":"VALIDACION","mensaje":"Debe indicar el partícipe (idEntidad)","error":"PARAMETRO_INVALIDO"}` |
| `registrar` entidad inexistente 999999999 | **404** | `{"exito":false,"etapa":"VALIDACION","mensaje":"ENTIDAD_NO_ENCONTRADA: no existe el partícipe 999999999","error":"ENTIDAD_NO_ENCONTRADA"}` |
| `registrar` tipo duplicado (ent. 5310) | **422** | `{"exito":false,"etapa":"VALIDACION","mensaje":"TIPO_DUPLICADO: el tipo de aporte 1 aparece más de una vez en el detalle","error":"TIPO_DUPLICADO"}` |
| `registrar` sin saldo (ent. 5310, tipo 1, $100) | **422** | `{"exito":false,"etapa":"VALIDACION","mensaje":"SALDO_INSUFICIENTE: el tipo APORTE PERSONALES tiene $0.00 disponibles y se piden $100.00","error":"SALDO_INSUFICIENTE"}` |
| `anular/999999999` | **404** | `{"exito":false,"etapa":"VALIDACION","mensaje":"DEVOLUCION_NO_ENCONTRADA: no existe la devolución 999999999","error":"DEVOLUCION_NO_ENCONTRADA"}` |

Todos los `error` están en el union `CodigoErrorDevolucion`; los HTTP (400/404/422) coinciden con
la tabla §6. `content-type: application/json` en todos. El `mensaje` es descriptivo y apto para
mostrar al usuario. `normalizarError` lo reusa (detecta `'exito' in cuerpo`) y
`mensajeDeRespuestaDevolucion` muestra ese `mensaje`. ✔

---

## 3. Fechas

- **Entrada (`registrar.fecha`):** el front la arma con `formatearFecha` →
  `yyyy-MM-dd` con componentes LOCALES, nunca `toISOString()`/`Z`. Correcto por diseño.
- **Salida (`porEntidad`: `fecha`, `fechaPago`):** **no observable** — no existe ninguna
  devolución en el dev DB (ver §Limitaciones). **Posible ambigüedad de contrato:** §6.2 muestra
  `"fecha":"2026-08-24"` (string), pero §0.1 dice que `LocalDate` **sale como arreglo
  `[a,m,d]`**. No se pudo dirimir con una respuesta real.
  - **Impacto en el front: ninguno.** La pantalla renderiza con
    `FuncionesDatosService.formatoFecha(fecha, 2)` → `convertirFechaDesdeBackend`, que acepta
    **arreglo `[a,m,d]`, string y `Date`**. Se vea como se vea, la fecha se muestra bien.
  - Lo único que podría no reflejar la realidad es el **tipo** `DevolucionListado.fecha: string`
    (cosmético; `formatFecha` recibe `unknown`, no rompe compilación). **Para el backend:**
    confirmar la serialización real de `fecha`/`fechaPago` de `dvap` y, si es arreglo, alinear el
    ejemplo de §6.2 (y opcionalmente el tipo del front). No hay defecto funcional que parchear.

---

## 4. Endpoints de apoyo que consume la pantalla

- `POST /rest/entd/selectByCriteria` → 200, 7300 entidades (búsqueda de partícipe). ✔
- `POST /rest/prst/selectByCriteria` → 200, 5664 préstamos (usado para localizar entidades con deuda). ✔
- `GET /rest/aprt/saldosPorEntidad/{id}` → 200 `{"exito":true,"resultado":[...]}`; **vacío para
  todas las entidades muestreadas** (ver §Limitaciones).
- `GET /rest/cnbc/getAll` → 200, 15 cuentas propias (array plano; la pantalla filtra por empresa en cliente). ✔
- `POST /rest/cnbp/selectByCriteria` → respondió **400** `{"mensaje":"Not able to deserialize data
  provided."}` con mi criterio `curl` ad-hoc mal formado. **No es defecto del backend ni del
  front:** la pantalla construye el `DatosBusqueda` con el modelo compartido. No se investigó más
  por no ser endpoint de `dvap`.

---

## Limitaciones — lo que NO se pudo verificar y por qué

- **El dev DB no tiene saldo de aportes en ninguna entidad.** Se muestrearon 1500 entidades
  repartidas + 300 con préstamo con `GET /aprt/saldosPorEntidad`: **todas vacías**; el intento de
  `registrar` sobre la entidad real 5310 devolvió `SALDO_INSUFICIENTE: … $0.00 disponibles`.
- **No existe ninguna devolución:** `GET /dvap/porEntidad` barrido sobre las **7300** entidades →
  0 con `resultado` no vacío.
- Consecuencia: **el camino de éxito de `registrar` (201 + `ResultadoDevolucion`) y la forma
  poblada de `porEntidad` (incluida la del `fecha`) no se pudieron capturar con una respuesta
  real.** Crearlos exigiría fabricar filas `CRD.APRT` con saldo positivo, que es SQL y queda
  fuera del alcance del frontend. Si se cargan datos de aporte para una entidad de prueba, con eso
  se cierra el round-trip de fechas de escritura de una sola pasada.

## Discrepancias para el backend / documento
1. **Forma de `fecha`/`fechaPago` de salida en `dvap`** (§6.2 string vs §0.1 arreglo): confirmar y
   alinear el documento. Sin efecto funcional en el front (lo tolera `convertirFechaDesdeBackend`).

## Qué se dejó en la BD de desarrollo
**Nada.** No persistió ninguna escritura (todas fallaron en validación) y `sincronizar` fue no-op.
