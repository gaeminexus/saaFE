# Verificación de integración — pantalla de bandas de cartera (Fase 1)

**Fecha:** 2026-08-25 · **Repo:** saaFE (frontend) · **Backend:** WildFly desplegado en
`http://localhost:8080/SaaBE`, empresa ASOPREP `1236`.

Esta es la verificación pendiente del contrato `API-BANDAS-PRODUCTO.md`: sus JSON de ejemplo
no se capturaron de llamadas HTTP reales (lo dice su §0.3). Aquí se contrastan contra
respuestas reales capturadas con `curl`.

---

## Resultado global

- **Lecturas:** todas responden `200 application/json` y su forma coincide **campo por campo**
  con `bandas-cartera.model.ts`. Sin discrepancias de estructura.
- **Round-trip de fechas:** correcto, **sin corrimiento de día** ni de zona horaria.
- **Una discrepancia con el contrato**, ya corregida en el front y pendiente de alinear por
  backend: **la forma del cuerpo de error** (ver más abajo).

---

## 1. Discrepancia para el backend — forma del cuerpo de error

El contrato §0.2 dice que los errores son `500` con el cuerpo en **texto plano**
`"Error <qué>: mensaje"`. La respuesta **real** es `500` con `Content-Type: application/json`
y cuerpo `{"mensaje":"Error <qué>: mensaje"}`.

Captura real (`curl -i`):

```
GET http://localhost:8080/SaaBE/rest/cbpr/clasificar?idProducto=21&idEmpresa=1236&tipoCartera=1&dias=45
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
Content-Length: 158

{"mensaje":"Error al clasificar la banda: No hay configuracion de bandas vigente al 2026-08-25 para el producto 21, empresa 1236, tipo de cartera POR VENCER"}
```

**Acción tomada en el front (no es un parche que oculte el problema):** el servicio
`BandasCarteraService.extraerMensajeError` ahora extrae `mensaje` cuando el cuerpo es JSON,
y **mantiene** el camino de texto plano por si el backend alinea el contrato. Sin el arreglo,
Angular parsea el JSON a objeto y el front mostraba el mensaje genérico de Angular
(«Http failure response … 500»), no el mensaje de negocio.

**Decisión para el backend:** alinear el contrato (documentar que el error es
`application/json {"mensaje": "..."}`) **o** cambiar el backend a texto plano. El front ya
soporta ambas, pero el contrato debería decir la verdad.

---

## 2. Lecturas verificadas (todas `200 application/json`)

### `GET /rest/cbpr/listado?idEmpresa=1236`
15 productos. `porVencer:null` solo en **21 HIPOTECARIO NOVACION** y **22 PRENDARIO NOVACION**;
`vencido:null` en ninguno; inactivos (`estadoProducto:0`) los códigos **3, 5, 6, 8, 10**.
Todo coincide con las notas del contrato §2.1. Ejemplo real (producto 2, POR VENCER):

```json
{"idConfiguracion":1,"fechaDesde":[2020,1,1],"fechaHasta":null,"editable":false,
 "bandas":[{"idBanda":1,"numero":1,"periodos":1,"diaInicio":1,"diaFin":30,"etiqueta":"1 - 30","idPlanCuenta":10279,"cuentaContable":"1.3.01.05","nombreCuenta":"DE 1 A 30 DIAS","estado":1},
           {"idBanda":5,"numero":5,"periodos":null,"diaInicio":361,"diaFin":null,"etiqueta":"mas de 360 (resto)","idPlanCuenta":10283,"cuentaContable":"1.3.01.25","nombreCuenta":"DE MAS DE 360 DIAS","estado":1}]}
```

> **Hallazgo #1 (confirmado):** con la vigencia retrotraída a `2020-01-01`, el listado ya
> devuelve configuraciones vigentes (`editable:false`), por lo que la pantalla muestra las
> bandas en vez de la vista vacía.

### `GET /rest/cbpr/vigente?idProducto=7&idEmpresa=1236&tipoCartera=2`
`idConfiguracion:26`, 6 bandas, rangos derivados por el servidor. Coincide con el ejemplo del
contrato §2.2.

### `GET /rest/bndp/getByConfiguracion/26`
`BandaProductoDetalle[]` con las 6 bandas (mismo objeto que va en `bandas`). OK §2.6.

### `GET /rest/cbpr/historial?idProducto=2&idEmpresa=1236&tipoCartera=1`
`ConfiguracionBandaDetalle[]`. OK §2.3.

### `GET /rest/cbpr/cuentas?idEmpresa=1236&filtro=1.3.01`
```json
[{"idPlanCuenta":10279,"cuentaContable":"1.3.01.05","nombre":"DE 1 A 30 DIAS"}, ...]
```
`CuentaBandaDisponible[]` (3 campos). OK §4.3.

### `GET /rest/cbpr/clasificar` (verificación funcional)
| idProducto | tipoCartera | dias | banda recibida | cuenta | esperado |
|---|---|---|---|---|---|
| 7 | 2 | 100 | 3 (`91 - 270`) | `1.3.12.10` | ✔ banda 3 / 1.3.12.10 |
| 7 | 2 | 800 | 6 (`mas de 720 (resto)`) | `1.3.12.25` | ✔ resto / 1.3.12.25 |

`fecha` sale como arreglo `[2026,8,25]`. Rangos derivados por el servidor (el front no los calcula).

---

## 3. Escrituras verificadas

### Validaciones (no persisten: fallan) — `POST /rest/cbpr/guardarConfiguracion` sobre producto 21
Todas devuelven `500 application/json {"mensaje": ...}` con el texto de negocio legible:

- números no consecutivos → `Los numeros de banda deben ser consecutivos desde 1; en la posicion 2 se recibio 3`
- dos bandas resto → `Solo la ULTIMA banda puede tener periodos nulos (banda abierta); la banda 1 de 2 los tiene`
- banda sin cuenta (idPlanCuenta 0) → `La cuenta contable 0 de la banda 1 no existe`

### Round-trip de fechas — `POST /rest/cbpr/cerrarVigencia` sobre producto 2, POR VENCER
Se envió `fechaDesdeNueva: "2027-03-15"` (string ISO). Estado tras la operación
(`GET /rest/cbpr/historial?idProducto=2&idEmpresa=1236&tipoCartera=1`):

```
config 29 | desde [2027,3,15] | hasta null       | idBandas 144,145,146,147,148   (NUEVA)
config  1 | desde [2020,1,1]  | hasta [2027,3,14] | idBandas 1,2,3,4,5             (cerrada)
```

- **Envié `"2027-03-15"` y volvió `[2027,3,15]`: mismo día, sin corrimiento** → manejo de zona
  horaria correcto (era el punto frágil).
- La vieja quedó cerrada el **día anterior** (`[2027,3,14]`): vigencias contiguas, sin hueco ni traslape.
- Los `idBanda` cambiaron (1–5 → 144–148): el backend borra e inserta el juego completo; el
  front debe releer los ids de la respuesta (lo hace).

> ⚠ **Modificación dejada en la BD de desarrollo (a restaurar):**
> producto **2 (EMERGENTE), tipoCartera 1 (POR VENCER)**:
> 1. `CBPR` id **1**: `CBPRFCFN` pasó de `NULL` a `2027-03-14` (reabrir → `NULL`).
> 2. `CBPR` id **29** (nueva, `CBPRFCIN=2027-03-15`) + sus bandas `BNDP` **144–148**: eliminar.
>
> Restauración es SQL (dominio del agente de BD/backend). Hoy (2026-08-25) la config 1 sigue
> siendo la vigente, así que la pantalla no se ve afectada mientras tanto.

---

## 4. Guard de USUARIO 1

Lógica centralizada en `shared/guard/usuario-uno.guard.ts` (`esUsuarioUno()` + `usuarioUnoGuard`).
Cubierto por pruebas unitarias (`usuario-uno.guard.spec.ts`, 5/5 en verde): permite al usuario 1,
**bloquea con redirección** (`UrlTree` a `/menucreditos/parametrizacion`) a cualquier otro; la
opción de menú se agrega solo si `esUsuarioUno()` (misma función → un solo lugar).
```
