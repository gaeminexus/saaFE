# API — Asignar la cuenta de destino a un pago por aprobar, y los dos agujeros que la hacían falta

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-29 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/pagos/API-ASIGNAR-CUENTA-DESTINO.md`.
**Aprobado por el usuario:** «Sí, has los 3 arreglos» (2026-09-29).

---

## 1. El caso que lo originó

Pago **699** (egreso de tesorería 50, ZOOM COMMUNICATIONS, 173,31). Se registró el 2026-09-29 a las
12:38:26 **sin cuenta de destino** (`PGTRCTBN` nulo), aunque ZOOM tiene **una sola** cuenta activa, la
267, a nombre del colaborador que va a recibir el dinero. Al aprobarlo por transferencia:

> *No se puede aprobar por transferencia: a los pagos [699] les falta la cuenta bancaria de destino del
> beneficiario…*

Salida de `pagos/sql/e2-74`: el 699 es el único pago por aprobar en esa situación. Es el segundo caso,
después del pago 394 (estado del equipo §42).

### Por qué la guarda tiene razón y el pago no tiene salida

- La guarda de `aprobar` (`PagoProgramadoServiceImpl:1440-1461`) mira la cuenta **guardada en el
  pago**, no las cuentas que el titular tiene hoy. **Es correcto** que sea así: la cuenta se elige a
  propósito, y un titular puede tener varias.
- La cuenta del pago se fija **al registrarlo**, y **nada la cambia después**: no hay pantalla ni
  endpoint para hacerlo. Un pago que nace sin cuenta solo se destraba anulándolo y volviéndolo a
  registrar.

### Por qué nació sin cuenta: tres causas posibles, y no se puede saber cuál fue

El backend no pierde el dato: `EgresoRest:86` → `EgresoServiceImpl:177` → el pago. Lo que no llegó
fue el `idCuentaDestinoTitular` del frontend. `registro-egreso.component.ts` lo manda nulo en tres
casos:

1. **La cuenta se cargó al titular después** de registrar el pago.
2. **Se pulsó Registrar mientras se consultaban las cuentas.** `puedeRegistrar` (`:305-310`) no mira
   `cargandoCuentasDestino`.
3. **La consulta falló**, y la rama `error` (`:270-273`) deja la lista vacía sin avisar. Ojo: el
   caso «sin cuentas» **también llega por esa rama**, porque `selectByCriteria` responde 500 con
   *«no devolvio ningun registro»* cuando no hay filas (`CuentaBancariaTitularServiceImpl:66`). Hoy
   la pantalla no distingue un fallo de un titular sin cuentas.

**Por qué no se sabe cuál fue:** la cuenta 267 tiene `CTBNFCRG` nulo. **Ninguna cuenta nueva guarda
su fecha de creación**: la ficha del titular no la manda al crear (`titulares-v2.component.ts:1335-1341`
solo la reenvía al editar) y el backend no la pone (`CuentaBancariaTitularServiceImpl.saveSingle:79-88`).

## 2. Los tres arreglos

| # | Qué | Dónde |
|---|---|---|
| **A** | Asignar la cuenta de destino a un pago por aprobar, desde la bandeja | BE + FE |
| **B** | Que el registro de egreso no deje salir un pago sin cuenta por descuido | FE |
| **C** | La cuenta bancaria nueva guarda su fecha de creación | BE |

**Sin SQL, sin DDL.** WAR y FE en cualquier orden. Si se despliega solo el FE, el botón «Asignar
cuenta» da 404 y los campos nuevos de la bandeja llegan `undefined`: la pantalla tiene que tolerarlo
(§4.2).

## 3. Backend

### 3.1 Un solo criterio de «tiene cuenta de destino»

Extraer a `PagoProgramadoServiceImpl`:

```java
private boolean tieneCuentaDestino(PagoProgramado pago)
```

con **exactamente** la condición que hoy está en línea dentro de `aprobar` (`:1441-1446`):
`cuentaDestino != null` **o** beneficiario ocasional completo (`beneficiarioBanco`,
`beneficiarioTipoCuenta` y `beneficiarioCuenta` no vacío). La guarda de `aprobar` pasa a llamarlo, y
también la proyección de la §3.2. **Un criterio, dos lugares que lo usan**: que la bandeja avise y que
`aprobar` rechace **lo mismo**.

### 3.2 `GET /pgtr/porAprobar` — tres campos nuevos en `PagoPorAprobar`

`com.saa.model.cxp.PagoPorAprobar` gana tres campos, con getters y setters en el mismo estilo de una
línea del archivo, y se llenan en `porAprobar` (`PagoProgramadoServiceImpl:~1331`):

| Campo | Tipo | Valor |
|---|---|---|
| `idTitular` | `Long` | `pago.getTitular().getCodigo()`, **null** si el pago no tiene titular (origen externo con beneficiario ocasional) |
| `tieneCuentaDestino` | `Boolean` | `tieneCuentaDestino(pago)` (§3.1) |
| `cuentaDestino` | `String` | Texto para mostrar, **null** si no tiene. Con cuenta del titular: `banco.nombre + " — " + numeroCuenta`. Con beneficiario ocasional: `beneficiarioBanco.nombre + " — " + beneficiarioCuenta` |

Cambio aditivo: ningún campo existente cambia.

### 3.3 Endpoint nuevo: `POST /pgtr/cuentaDestino/{id}`

`POST` y no `PUT` porque es la forma de todas las acciones de este REST (`/anular/{id}`,
`/revertirConfirmado/{id}`). Se copia el patrón de `anular` (`PagoProgramadoRest:623-647`).

```
POST /SaaBE/rest/pgtr/cuentaDestino/699
Content-Type: application/json

{ "idCuentaDestinoTitular": 267, "idUsuario": 5 }
```

Servicio: `Map<String, Object> asignarCuentaDestino(Long idPago, Long idCuentaDestinoTitular, Long idUsuario) throws Throwable`
en `PagoProgramadoService` y su Impl. Empieza con la traza de la casa,
`System.out.println("=== asignarCuentaDestino | pago=… | cuenta=… ===")`.

**Validaciones, en este orden.** Todas lanzan `IncomeException` con el texto de la tabla.

| # | Condición | Mensaje |
|---|---|---|
| 1 | `idCuentaDestinoTitular` nulo | `Debe indicar la cuenta bancaria de destino.` |
| 2 | el pago no existe (`em.find`) | `No se encontró el pago con ID: {id}` |
| 3 | estado ≠ `POR_APROBAR` | `Solo se puede asignar la cuenta a un pago por aprobar: el pago {id} está en estado {estado}.` |
| 4 | el pago no tiene titular | `El pago {id} no tiene un beneficiario registrado en el maestro de titulares: su cuenta se carga en el origen del pago.` |
| 5 | la cuenta no existe | `No se encontró la cuenta bancaria del beneficiario con ID: {id}` |
| 6 | la cuenta es de otro titular | `La cuenta bancaria de destino pertenece a otro titular, no al beneficiario del pago.` (mismo texto que `:753-756`) |
| 7 | la cuenta está inactiva (`estado` no nulo e igual a 0) | `La cuenta bancaria {numero} está inactiva.` |

Si pasa todo: `pago.setCuentaDestino(cuenta)`, se guarda **solo el pago** y se devuelve:

```json
{ "exito": true, "mensaje": "Cuenta de destino asignada al pago 699.", "pago": 699,
  "cuentaDestino": "BANCO PICHINCHA — 5308005831" }
```

**No toca nada más.** Ni valor, ni estado, ni forma de pago, ni cuenta de origen, ni contabilidad. Un
pago que ya tenía cuenta **se puede reasignar** (mismas validaciones): cambiar de cuenta antes de
aprobar es legítimo, y el pago todavía no salió al banco.

**Códigos HTTP en el REST:**

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| 200 | asignada | el `Map` de arriba |
| 400 | `IncomeException` (validaciones 1-7) | texto del mensaje |
| 500 | cualquier otra cosa | `"Error al asignar la cuenta de destino: " + mensaje` |

⚠️ `anular` responde **500** también ante una `IncomeException`. Acá **no**: se captura
`IncomeException` aparte y se responde 400, como hace `AtsRest.generar`. El `MensajeErrorJsonFilter`
envuelve el 400 en `{ mensaje }` y el FE lo lee con `mensajeDeError`.

### 3.4 Arreglo C — fecha de creación de la cuenta bancaria

En `CuentaBancariaTitularServiceImpl.saveSingle` (`:79-88`), **después** de convertir el `codigo == 0`
en null y **antes** de grabar:

```java
if (cuentaBancariaTitular.getCodigo() == null && cuentaBancariaTitular.getFechaCreacion() == null) {
    cuentaBancariaTitular.setFechaCreacion(LocalDateTime.now());
}
```

Lo mismo dentro del bucle de `save(List)` (`:43-48`), con la misma condición. **Solo en el alta.** En
la edición, la ficha ya reenvía la fecha que tenía (`titulares-v2:1338-1343`). Las cuentas que ya
existen sin fecha **se quedan así**: no hay de dónde sacarla.

⛔ **No se toca `usuarioCreacion`.** Hoy sale siempre `'sistema'`, porque el FE lo lee de una clave de
`localStorage` que nadie guarda. Esa lectura está en **34 lugares** del frontend, en varios módulos: es
un frente aparte, no autorizado.

## 4. Frontend

### 4.1 Modelo y servicio

- `cxp/model/pago-programado.ts`, `PagoPorAprobar`: agregar `idTitular?: number | null`,
  `tieneCuentaDestino?: boolean`, `cuentaDestino?: string | null`. **Opcionales**, por §4.2.
- `cxp/service/pago-programado.service.ts`: agregar
  `asignarCuentaDestino(idPago: number, idCuentaDestinoTitular: number, idUsuario: number): Observable<any>`
  → `POST ${RS_PGTR}/cuentaDestino/${idPago}`, copiando el método de anular del mismo servicio.

### 4.2 Bandeja de Aprobación de pagos (`tsr/forms/procesos/aprobacion-pagos/`)

- **Aviso por fila**: si `tieneCuentaDestino === false`, bajo el beneficiario va un aviso chico
  *«Sin cuenta de destino»* (ícono `warning`). Si `cuentaDestino` trae texto, se muestra en gris.
- ⚠️ **Tolerar el WAR viejo:** si `tieneCuentaDestino` llega `undefined`, **no** se muestra el aviso
  ni el botón. Solo `=== false` activa el aviso. Nunca `!p.tieneCuentaDestino`.
- **Botón «Asignar cuenta»** en Acciones (ícono `account_balance`, tooltip *«Asignar cuenta de
  destino»*), visible **solo** si `tieneCuentaDestino === false` **y** `idTitular != null`.
- El botón abre un diálogo que lista las cuentas **activas** del titular con
  `CuentaBancariaTitularService.selectByCriteria` (criterio `titular.codigo` con
  `asignaValorConCampoPadre`, exactamente como `registro-egreso.component.ts:258-263`, y el mismo
  filtro `esCuentaActiva`). Cada opción se muestra con banco, número, tipo y, si lo tiene,
  **`nombreTitularCuenta`**: en este caso es lo que importa, porque la cuenta es de un colaborador y
  no de ZOOM.
  - Con **una** cuenta, viene preseleccionada. Con varias, **no** se preselecciona ninguna.
  - Sin cuentas (la respuesta vacía llega como error, §1 causa 3): el diálogo dice *«El beneficiario
    no tiene cuentas bancarias activas. Cárguelas en Titulares y vuelva a intentar.»*, y **no** lo
    presenta como un error.
  - Al confirmar: `asignarCuentaDestino`. Con éxito, snackbar con el `mensaje` y **recarga de la
    bandeja**. Con error, `mensajeDeError(err, 'No se pudo asignar la cuenta')` dentro del diálogo.
- Diálogo nuevo `tsr/forms/procesos/aprobacion-pagos/asignar-cuenta-destino-dialog/` (standalone),
  junto a la pantalla que lo usa. `tsr/` no tiene carpeta `dialog/`. La estructura se copia de
  `shared/components/motivo-dialog/`, que es el diálogo que esta bandeja ya abre para anular
  (`aprobacion-pagos.component.ts:354`).

### 4.3 Arreglo B — Registro de egreso (`tsr/forms/registrar/registro-egreso/`)

1. **`puedeRegistrar`** exige además `!this.cargandoCuentasDestino()`.
2. **Si el titular tiene cuentas y no se eligió ninguna** (`cuentasDestino().length > 0` y
   `regIdCuentaDestino == null`), `puedeRegistrar` es false y bajo el combo aparece *«Elija la
   cuenta a la que se transfiere»*. Un egreso **sin beneficiario** o de un beneficiario **sin
   cuentas** se sigue pudiendo registrar como hoy: se pagará por cheque o débito, que es un caso
   válido. El aviso que ya existe (`beneficiarioSinCuentaDestino`) se conserva.
3. **Distinguir «sin cuentas» de «falló la consulta»** en la rama `error` de `cargarCuentasDestino`:
   - Si el mensaje, normalizado sin tildes, contiene `no devolvio ningun registro`, es un titular
     **sin cuentas**: lista vacía, como hoy.
   - Si no, es un **fallo**: `cuentasDestinoError` = `mensajeDeError(err, 'No se pudieron consultar
     las cuentas del beneficiario')`, visible en la pantalla, y **`puedeRegistrar` en false** hasta
     que la consulta se repita con éxito (botón *Reintentar*, o volviendo a elegir el beneficiario).
   - Patrón a copiar: `esRespuestaVacia` de `tsr/service/estado-cuenta-titular.service.ts:245-251`
     (usa `mensajeDeError` y quita tildes). Ojo: `CuentaBancariaTitularService.handleError` relanza
     `error.error` (el cuerpo), no el `HttpErrorResponse`. `mensajeDeError` maneja las dos formas;
     no se lee `err.error` a mano.

## 5. Trampas

1. **El criterio de «tiene cuenta» vive en un solo método** (§3.1). Si la bandeja avisa distinto de lo
   que `aprobar` rechaza, la pantalla miente.
2. **El FE nuevo con el WAR viejo:** `tieneCuentaDestino` llega `undefined`. Solo `=== false` muestra
   el aviso (§4.2).
3. **La respuesta vacía es un 500.** `selectByCriteria` de cuentas responde error cuando no hay filas.
   Todo lo que liste cuentas tiene que distinguir los dos casos (§4.3.3).
4. **`POST`, no `PUT`**, y **400 para `IncomeException`**, no el 500 de `anular` (§3.3).
5. **No automatizar la elección.** Ni el backend al aprobar ni el FE con varias cuentas eligen solos a
   qué cuenta va la plata.

## 6. Qué NO toca

La lógica de `aprobar` fuera de la extracción de §3.1. Los formateadores del archivo del banco. El
registro de pagos de factura, liquidación y anticipo: tienen su propio selector de cuenta, y si
tuvieran el mismo agujero que la §4.3 es otro pedido. `usuarioCreacion` (§3.4). Ningún `.sql`.
