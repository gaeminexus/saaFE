# Contrato de API — Pago de beneficios sociales (décimos acumulados)

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-01 · **Estado:** congelado antes de implementar.
**Diseño de referencia:** `docs/logica-negocio/rhh/PLAN-PAGO-BENEFICIOS-Y-SALIDA-POR-TESORERIA.md`

> **Espejo en el frontend:** `saaFE/docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`.
> ⚠️ La carpeta de RRHH en `saaFE` es **`docs/rrh/`**, no `docs/rhh/` — existe una `docs/rhh/`
> vacía y dejar el contrato ahí lo pone donde nadie lo busca.

---

## 0. Antes de leer nada más

**Estos endpoints todavía no existen.** Este documento es el contrato que el backend debe cumplir y
contra el que el frontend puede construir en paralelo. Si al implementar algo no cierra, se corrige
**este archivo primero** y después el código.

**Application path:** `/SaaBE/rest/...`. No `/api/...`, que aparece en docs viejos y ya no existe.

**Serialización — la trampa que más caro sale:** el proveedor es **Jackson**, no JSON-B.
`LocalDate` viaja como `yyyy-MM-dd` y `LocalDateTime` como ISO **local, sin zona**.
⛔ **Nunca mandar un `Date` de JavaScript crudo ni una cadena terminada en `Z`**: Jackson
**descarta el offset en vez de convertirlo**, así que `2026-12-24T13:30:00.000Z` se graba como
`13:30` y queda cinco horas adelantado, sin ningún error.

**Trampa del `PUT` — vale para toda entidad del sistema:** `EntityDaoImpl.save()` hace `em.merge()`
con el objeto tal como llegó del JSON, sin releer la fila y sin saltar nulos. Como ningún campo
persistido del modelo es primitivo, **una clave ausente en el JSON se graba como `null`**, FKs
incluidas. **Regla para el frontend: `GET` de la entidad completa, aplicar encima sólo los campos
que el formulario edita, y mandar el objeto entero.** Nunca armar un payload «sólo con lo que
cambió». ⛔ Y **no "arreglar" `EntityDaoImpl`**: hereda de él todo el proyecto.

---

## 1. Recurso `odbs` — orden de pago de beneficio social

Cabecera consolidada que agrupa las liquidaciones (`RHH.LQBS`) de un tipo de beneficio y un año, y
las paga con **un solo** pago en tesorería.

### 1.1 Endpoints estándar

Los seis de la casa, sobre `RHH.ODBS`:

```
GET    /rest/odbs/getAll
GET    /rest/odbs/getId/{id}
POST   /rest/odbs                      (saveSingle)
PUT    /rest/odbs                      (saveSingle)
DELETE /rest/odbs/{id}
POST   /rest/odbs/selectByCriteria     (body: List<DatosBusqueda>)
```

### 1.2 `POST /rest/odbs/generar` — armar la orden

Agrupa las liquidaciones sueltas y crea la cabecera.

**Body**
```json
{
  "idEmpresa": 1,
  "tipoBeneficio": 1,
  "anio": 2026,
  "region": null,
  "usuario": "jperez"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idEmpresa` | number | sí | |
| `tipoBeneficio` | number | sí | `1` décimo tercero · `2` décimo cuarto · `3` fondos de reserva |
| `anio` | number | sí | |
| `region` | number \| null | **sólo si `tipoBeneficio = 2`** | Región del décimo cuarto. Para los otros tipos debe ir `null` |
| `usuario` | string | sí | |

**200 — orden creada**
```json
{
  "exito": true,
  "idOrden": 12,
  "numero": "ODBS-2026-0001",
  "tipoBeneficio": 1,
  "tipoBeneficioTexto": "DECIMO TERCERO",
  "anio": 2026,
  "region": null,
  "total": 18450.75,
  "numeroEmpleados": 37,
  "estado": 1,
  "estadoTexto": "GENERADA",
  "mensaje": "Orden generada con 37 empleados."
}
```

**200 con `exito: false`** — no hay liquidaciones sueltas para ese (empresa, tipo, año, región).
⚠️ **No alcanza con mirar el status HTTP.** Es el estilo de la casa y ya causó confusión en el
frente R; el frontend debe leer `exito` siempre.

```json
{ "exito": false, "mensaje": "No hay liquidaciones pendientes de pago para DECIMO TERCERO 2026." }
```

**409 Conflict** — ya existe una orden viva (`GENERADA` o `ENVIADA_A_TESORERIA`) para esa
combinación. Se devuelve el id de la existente para que la pantalla pueda ofrecer abrirla.
```json
{ "exito": false, "idOrdenExistente": 9, "mensaje": "Ya existe la orden 9 en estado GENERADA." }
```

**500** — `"Error al generar la orden: {mensaje}"`, texto plano. Estilo de la casa.

### 1.3 `GET /rest/odbs/detalle/{id}` — las liquidaciones de una orden

Lo que la pantalla muestra al abrir la orden.

**200**
```json
{
  "idOrden": 12,
  "numero": "ODBS-2026-0001",
  "tipoBeneficio": 1,
  "anio": 2026,
  "total": 18450.75,
  "numeroEmpleados": 37,
  "estado": 2,
  "estadoTexto": "ENVIADA_A_TESORERIA",
  "idPagoProgramado": 451,
  "estadoPago": 2,
  "fechaPago": null,
  "idAsiento": null,
  "detalle": [
    {
      "idLiquidacion": 501,
      "idEmpleado": 88,
      "identificacion": "1712345678",
      "nombreEmpleado": "PEREZ JUAN",
      "fechaInicio": "2025-12-01",
      "fechaFin": "2026-11-30",
      "baseCalculo": 6000.00,
      "dias": 360,
      "valor": 500.00,
      "valorPagado": 0.00,
      "estado": 1
    }
  ]
}
```

**200 con `exito: false`** si el id no existe.

### 1.3bis `GET /rest/odbs/listar` — la bandeja de órdenes

**Agregado el 2026-09-01**, corrigiendo un hueco que detectó el frontend al revisar este contrato.

**Por qué no alcanzan los endpoints estándar.** `getAll`/`selectByCriteria` devuelven la entidad
cruda, cuya fila sólo trae `ODBSESTD` (1-4). Con eso **la lista no distingue dos situaciones muy
distintas que comparten el estado `2 ENVIADA_A_TESORERIA`**: la orden que todavía espera aprobación
de tesorería, y la que tesorería **ya pagó** pero RRHH aún no contabilizó — donde la provisión sigue
viva. Hoy esa diferencia sólo se ve abriendo la orden (`estadoPago` del §1.3), y una bandeja que no
la muestra induce al usuario a creer que no queda nada por hacer.

Es una **proyección**, no la entidad — ver `docs/estandar/ESTANDAR-PROYECCIONES-EN-LISTADOS.md` y
`com.saa.model.cxp.PagoPorAprobar`, que es el precedente exacto.

**Query params:** `idEmpresa` (obligatorio) · `anio` · `tipoBeneficio` · `estado` (todos opcionales).

**200** — arreglo de filas:
```json
[
  {
    "idOrden": 12,
    "numero": "ODBS-2026-0001",
    "tipoBeneficio": 1,
    "tipoBeneficioTexto": "DECIMO TERCERO",
    "anio": 2026,
    "region": null,
    "total": 18450.75,
    "numeroEmpleados": 37,
    "fechaEmision": "2026-12-20",
    "fechaPago": null,
    "estado": 2,
    "estadoTexto": "ENVIADA_A_TESORERIA",
    "idPagoProgramado": 451,
    "estadoPago": 4,
    "estadoPagoTexto": "CONFIRMADO",
    "idAsiento": null
  }
]
```

⚠️ **`estadoPago` e `idAsiento` son los dos campos que hacen útil esta proyección.** Sin ellos la
fila no puede pintar el estado intermedio del §3.2. `estadoPago` es `null` mientras la orden no se
haya enviado a tesorería.

**`numeroEmpleados` es columna persistida** (`ODBSNMEM`), no un calculado de la respuesta de
`generar`: se escribe al armar la orden y no cambia después. Se puede confiar en ella en la lista.

**Body**
```json
{ "idUsuario": 4, "observacion": "Décimo tercero acumulado 2026" }
```

Registra **un** `PagoProgramado` de origen `RHH_BENEFICIO_SOCIAL` por el total de la orden, con
`idCuentaBancariaOrigen = null` y **sin desglose contable**, así que:

- El pago **nace `POR_APROBAR`** y aparece en la bandeja de tesorería.
- Tesorería asigna cuenta y forma de pago con `POST /pgtr/aprobar` (endpoint existente, sin cambios).
- ⚠️ **El pago no genera asiento ni movimiento bancario al confirmarse.** Es deliberado (decisión D1
  del diseño): **la contabilidad la hace RRHH** en el paso siguiente. No es un defecto.

**200**
```json
{
  "exito": true,
  "idOrden": 12,
  "idPagoProgramado": 451,
  "estadoPago": 2,
  "estadoPagoTexto": "POR_APROBAR",
  "mensaje": "Orden enviada a tesorería. Queda pendiente de aprobación."
}
```

**409 Conflict** — la orden no está `GENERADA` (ya se envió, ya se pagó, o está anulada).

### 1.5 `POST /rest/odbs/confirmarPago/{id}` — cerrar el ciclo y contabilizar

Se llama **después** de que tesorería confirmó el pago.

**Body**
```json
{ "fechaPago": "2026-12-23", "usuario": "jperez" }
```

`fechaPago` es `LocalDate` → **`yyyy-MM-dd`**. Ver la trampa de serialización del §0.

Efectos, en este orden:
1. Exige que el `PagoProgramado` de la orden esté **`CONFIRMADO`**; si no, **409**.
2. Por cada `LQBS` de la orden: `valorPagado = valor`, `fechaPago`, `estado = PAGADO`.
3. Genera el asiento de **baja de provisión** — DEBE la línea de provisión por pagar que
   corresponda al tipo (40 décimo tercero, 41 décimo cuarto, 43 fondos de reserva), HABER banco (51).
4. `ODBS.estado = PAGADA`, `ODBSFCPG`, `ASNTCDGO`.

**200**
```json
{
  "exito": true,
  "idOrden": 12,
  "idAsiento": 7788,
  "numeroAsiento": "RH-2026-000345",
  "liquidacionesPagadas": 37,
  "total": 18450.75,
  "mensaje": "Pago confirmado y provisión dada de baja."
}
```

**409 Conflict** — el pago no está confirmado en tesorería, o la orden no está
`ENVIADA_A_TESORERIA`.
```json
{ "exito": false, "mensaje": "El pago 451 no está CONFIRMADO en tesorería (estado actual: POR_APROBAR)." }
```

### 1.6 `POST /rest/odbs/anular/{id}` — deshacer

**Body:** `{ "motivo": "...", "usuario": "jperez" }` — `motivo` obligatorio.

- Desenlaza las `LQBS` (`LQBSODBS = null`) para que puedan volver a agruparse.
- `ODBS.estado = ANULADA`.
- **409** si la orden ya está `PAGADA`: primero hay que revertir el pago en tesorería
  (`POST /pgtr/revertirConfirmado/{id}`), igual que exige el anticipo a empleado.

---

## 2. Estados

**Orden (`ODBSESTD`)** — rubro `RHH_ESTADO_ORDEN_BENEFICIO`

| Valor | Estado | Se puede |
|---|---|---|
| 1 | `GENERADA` | enviar a tesorería · anular |
| 2 | `ENVIADA_A_TESORERIA` | confirmar pago · anular |
| 3 | `PAGADA` | nada (revertir primero en tesorería) |
| 4 | `ANULADA` | nada |

**Liquidación (`LQBSESTD`)**: `1` pendiente (como nace hoy) → `2` pagada.

**Tipo de beneficio (`LQBSTPBN` / `ODBSTPBN`)** — rubro `RHH_TIPO_BENEFICIO_SOCIAL`:
`1` décimo tercero · `2` décimo cuarto · `3` fondos de reserva · `4` vacaciones · `5` utilidades.
**Esta orden sólo maneja 1, 2 y 3.**

---

## 3. Trampas que no se deducen del código

1. **`exito: false` con HTTP 200.** Varios endpoints devuelven 200 y no hicieron nada. Leer siempre
   el campo `exito`, nunca sólo el status.
2. **El pago no contabiliza; contabiliza RRHH.** Confirmar el pago en la bandeja de tesorería
   **no** genera el asiento. Hasta que no se llame `confirmarPago`, la provisión sigue viva. Una
   pantalla que muestre la orden como cerrada al ver el pago confirmado estaría mintiendo.

   **Cómo se representa — decidido el 2026-09-01, sobre la propuesta del frontend.** Son **tres**
   estados visuales, no dos, y no se pueden derivar de un solo booleano:

   | Situación | `estado` / `estadoPago` | Cómo se muestra |
   |---|---|---|
   | Esperando a tesorería | `2` / `POR_APROBAR` | badge neutro — «Enviada a tesorería» |
   | **Pagada, sin contabilizar** | `2` / `CONFIRMADO` | **badge ámbar** — «Pagado por tesorería · pendiente de contabilizar». **Nunca verde** |
   | Cerrada | `3 PAGADA` | badge verde, con `numeroAsiento` |

   En el detalle, aviso persistente mientras dure el estado intermedio: *«Tesorería confirmó el
   pago. La provisión sigue viva hasta "Confirmar pago"»*, con el botón de `confirmarPago`
   destacado. ⛔ **No usar un booleano tipo `acreditada`** (el patrón de `ordenes-pago`, que deriva
   de `!!fechaAcreditacion`): ahí hay dos estados y acá hay tres.
3. **Sin desglose no hay movimiento bancario.** Estos pagos no aparecen en `MovimientoBanco`. Es
   consecuencia aceptada de la decisión D1, no un defecto a reportar.
4. **`region` sólo aplica al décimo cuarto.** Mandarla en los otros tipos debe rechazarse, no
   ignorarse en silencio.
5. **Fechas:** `LocalDate` → `yyyy-MM-dd`. Nada con `Z`, nunca un `Date` crudo.
6. **`PUT` parcial borra columnas.** Ver §0.

---

## 4. Lo que este contrato todavía no cubre

- **Reporte del Ministerio de Trabajo (SUT).** Confirmado obligatorio, pero el formato exacto del
  CSV depende del archivo de ejemplo que hay que descargar del SUT. Cuando se tenga, se agrega acá
  como `GET /rest/odbs/reporteMdt/{id}`.
- **Vacaciones, jubilación patronal y desahucio.** Sus provisiones se dan de baja por otro camino;
  pendiente de levantamiento (§4.1 del diseño).
