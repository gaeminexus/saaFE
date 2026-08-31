# Contrato — mantenimiento de `CRD.CTAP` (cuentas contables por tipo de aporte)

**Fecha:** 2026-08-31 · **Árbitro:** equipo A de `crd`
**Estado:** CONGELADO. Verificado leyendo `CuentaTipoAporteRest.java`, no el reporte del agente.
**Espejo obligatorio:** `saaFE/docs/crd/API-CUENTAS-TIPO-APORTE.md`

---

## 1. Qué configura esta pantalla, y por qué importa que esté bien

Por cada **tipo de aporte** y **empresa**, dos cuentas contables:

- **`cuentaPasivo`** — lo que el fondo le debe al socio por ese tipo (`2.1.01.xx` / `2.1.02.xx`).
  Es el **DEBE** del asiento de reclasificación de la devolución de aportes.
- **`cuentaLiquidacion`** — la obligación de pagarle (`2.3.01.xx`). Es el **HABER** de ese asiento,
  y también la cuenta que **CXP debita** al confirmarse el pago.

> ⚠️ **Un tipo de aporte sin fila activa acá NO se puede devolver.** El proceso aborta con un
> mensaje que dice qué tipo falta. Es deliberado: **nunca adivina una cuenta.** Hoy quedan sin
> configurar, a propósito, las reservas (17-20, no se devuelven) y los tipos sin movimientos
> (2, 3, 4, 5, 10, 25). El tipo **1** está pendiente de definición del usuario.

> ⚠️ **Y la trampa que hace peligrosa esta pantalla:** si `cuentaLiquidacion` no coincide con la
> cuenta del grupo del producto de pago de CXP, **CRD acredita una cuenta y CXP debita otra — y los
> dos asientos cuadran.** No hay validación cruzada (decisión: son configuraciones independientes
> de dos módulos, y bloquear el guardado crearía un orden artificial entre equipos). El control es
> el bloque 4.1 del script `crd/sql/95`, manual. **La pantalla debe advertirlo al guardar.**

---

## 2. Los seis endpoints

Todos verificados en `CuentaTipoAporteRest.java` (`@Path("ctap")`).

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/rest/ctap/getAll` | todas, activas e inactivas |
| `GET` | `/rest/ctap/porEmpresa/{idEmpresa}` | **solo activas** de esa empresa |
| `POST` | `/rest/ctap` | crear |
| `PUT` | `/rest/ctap` | editar **solo las dos cuentas** |
| `PUT` | `/rest/ctap/desactivar/{codigo}` | baja lógica (`estado = 0`). Idempotente |
| `PUT` | `/rest/ctap/activar/{codigo}` | reactivar. Idempotente |

### Forma de la fila

```json
{
  "codigo": 1,
  "tipoAporte":        { "codigo": 9, "nombre": "JUBILACION PERSONAL", ... },
  "empresa":           { "codigo": 1236, ... },
  "cuentaPasivo":      { "codigo": 10354, "numeroCuenta": "2.1.02.05.01", "nombre": "...", ... },
  "cuentaLiquidacion": { "codigo": 10362, "numeroCuenta": "2.3.01.10.01", "nombre": "...", ... },
  "estado": 1
}
```

### Crear

```json
POST /rest/ctap
{ "tipoAporte": {"codigo": 9}, "empresa": {"codigo": 1236},
  "cuentaPasivo": {"codigo": 10354}, "cuentaLiquidacion": {"codigo": 10362} }
→ 201 + la fila creada
```

`estado` **lo pone el servidor**, siempre ACTIVO. Mandar `codigo` es error: para eso está el `PUT`.

### Editar

```json
PUT /rest/ctap
{ "codigo": 1, "cuentaPasivo": {"codigo": 999}, "cuentaLiquidacion": {"codigo": 10362} }
→ 200 + la fila actualizada
```

> **`tipoAporte`, `empresa` y `estado` se IGNORAN aunque vengan en el body.** No es un descuido: sin
> eso, editar una cuenta podría mover la fila a otro (tipo, empresa) y chocar con la constraint
> única sin que nadie entienda por qué. **No los mandes** — si los mandás, no pasa nada, pero
> tampoco hacen nada.

### Errores

| Código | Cuándo |
|---|---|
| `400` | falta un campo obligatorio, o el `POST` trae `codigo` |
| `404` | no existe el tipo, la empresa, o alguna de las dos cuentas — el mensaje dice cuál |
| `409` | ya hay una configuración activa para ese (tipo, empresa) — el mensaje trae su código |
| `500` | error inesperado |

> ⚠️ **TODOS los errores llegan como `{"mensaje": "..."}`, nunca texto plano.**
> `com.saa.ws.rest.MensajeErrorJsonFilter` es un `@Provider` global que envuelve toda respuesta con
> status ≥ 400. **Mirando la clase REST no se ve** — el filtro es transparente. Mostrá `mensaje`.

---

## 3. Lo que la pantalla tiene que hacer, y lo que no

**Sí:**
- Listar por empresa, con las cuentas legibles (número y nombre), no solo el código.
- Un selector de cuenta que **busque por número y por nombre**. Son ~10 candidatas entre las
  `2.1.xx` y ~5 entre las `2.3.01.xx`, pero el plan de cuentas completo tiene miles.
- **Advertir al guardar** que la `cuentaLiquidacion` tiene que coincidir con el producto de pago de
  CXP de ese tipo. Es la única defensa contra el error del §1.
- Mostrar las inactivas de alguna forma (`getAll`), o el operador no puede reactivar una.

**No:**
- **No hay `DELETE`.** Baja lógica y nada más. Una fila borrada perdería el rastro de con qué
  cuenta se contabilizó lo que ya se contabilizó.
- No inventes un selector de tipo de aporte que ofrezca los 25: los que no se devuelven no van acá.
  Ofrecelos todos igual — el operador decide — pero **no** pre-cargues nada.

---

## 4. Para probarlo

`CRD.CTAP` tiene **11 filas cargadas** por el script `crd/sql/94`, todas de la empresa **1236**.
El mapeo completo, con el porqué de cada par, está en `crd/MAPEO-CUENTAS-TIPO-APORTE.md` §3.

Casos que conviene cubrir: crear una fila para un tipo sin configurar (por ejemplo el 12 si se
desactivara), intentar crear un duplicado para un (tipo, empresa) que ya existe → `409`, desactivar
y reactivar, y editar las dos cuentas de una fila existente.
