# API — Pago mensual de pensión complementaria

**Base:** `/SaaBE/rest/pgpc` · **Equipo:** CRD / Equipo B · **Fecha:** 2026-09-02

> El path de JAX-RS es `/rest`, así que la URL real es `/SaaBE/rest/pgpc/...`. **No** `/api/...`,
> que aparece en documentos viejos y ya no existe.

Plan de fondo: `PLAN-PAGO-JUBILADOS.md`. Este documento es el contrato; ante una diferencia entre
los dos, manda el plan y este archivo se corrige.

---

## Lo que cambia respecto de lo que hay hoy

Los tres endpoints **ya existen y sus rutas no cambian**. Lo que cambia es **lo que devuelven**: al
agregarse el cruce contra préstamos, un pago del mes deja de ser un solo número.

---

## 1. `POST /rest/pgpc/generarPagosDelMes`

Genera los pagos del período para todos los jubilados `JUBILADO_COMPLEMENTARIO` con `VPPC` activa.
**No aborta el lote**: cada jubilado va en su propia transacción y un fallo se cuenta como error.

**Query params:** `idEmpresa`, `anio`, `mes`, `usuario`.

**Respuesta 200** — implementada el 2026-09-02 (`PLAN-PAGO-JUBILADOS.md` §3/§4). El sobre de la
respuesta sigue el mismo convenio que el resto de este REST (`exito`, `mensaje`, y el cuerpo real
anidado bajo `resultado` — **no al nivel superior**, a diferencia de como lo mostraba una versión
anterior de este documento):

```json
{
  "exito": true,
  "mensaje": "Generación 8/2026 - 42 pagos generados, 3 ya existían, 1 con error, de 46 evaluados.",
  "resultado": {
    "anio": 2026, "mes": 8,
    "evaluados": 46, "generados": 42, "yaGenerados": 3, "conError": 1,
    "totalPagado": 12600.00,
    "totalCruzadoAPrestamos": 3480.00,
    "totalOrdenesGeneradas": 9120.00,
    "errores": ["Entidad 555: SALDO_INSUFICIENTE: ..."],
    "detalle": [
      {
        "idEntidad": 1234, "nombre": "...", "idPago": 987,
        "valorPension": 280.00, "valorSeguroSalud": 20.00,
        "valorCruzadoAPrestamo": 300.00,
        "valorOrdenPago": 0.00,
        "generoOrdenPago": false,
        "idAsientoDevengo": 4471,
        "estado": "GENERADO", "mensaje": null
      }
    ]
  }
}
```

`detalle` trae UN renglón por cada jubilado evaluado, con `estado` en `"GENERADO"` (PGPC nuevo),
`"YA_EXISTIA"` (idempotencia — no es error) o `"ERROR"` (con `mensaje`). Los renglones `YA_EXISTIA`
no traen `nombre` ni los campos de cruce/orden (no se volvieron a calcular).

⛔ **`generoOrdenPago: false` con `valorCruzadoAPrestamo > 0` NO es un error** — es el caso en que
la deuda se llevó toda la pensión del mes. El pago existe, se contabilizó, y no hubo salida de
dinero. **La pantalla no debe mostrarlo como fallo**; es el escenario 5 de la verificación del plan.

---

## 2. `POST /rest/pgpc/sincronizarPagos`

Reconciliador: lee el estado real de la orden en CXP de cada `PGPC` pendiente y lo cierra como
PAGADA o RECHAZADA. Sin cambios de forma.

⚠️ **Un rechazo revierte sólo el tramo que salía al banco.** El cruce contra el préstamo **no se
deshace**: ya consumió aporte y liquidó deuda, y son dos hechos distintos (§7 del plan). La pantalla
no debe sugerir que un rechazo devuelve las cuotas.

---

## 3. `GET /rest/pgpc/porEntidad/{idEntidad}`

Historial del jubilado, del más reciente al más antiguo. Cada fila incorpora los mismos campos
nuevos del detalle de arriba, para que el histórico muestre cuánto fue a deuda y cuánto al banco.

---

## Errores

Códigos ya definidos en `PagoPensionComplementariaService`, sin cambios:

| Código | HTTP | Cuándo |
|---|---|---|
| `ENTIDAD_NO_ENCONTRADA` | 404 | No existe el jubilado |
| `SIN_VALOR_PENSION` | 422 | Sin `VPPC` activa, o más de una |
| `SALDO_INSUFICIENTE` | 422 | El saldo del aporte tipo 23 no alcanza |
| `SIN_CUENTA_BANCARIA` | 422 | No tiene exactamente una cuenta bancaria activa |
| `PAGO_NO_ENCONTRADO` | 404 | No existe el pago |

⚠️ **Formato del error, verificado sobre el cable:** `MensajeErrorJsonFilter` es un `@Provider`
global que envuelve toda respuesta ≥400 cuyo cuerpo sea texto, y la entrega como
`{"mensaje": "..."}`. **No llega texto plano.** Documentos viejos dicen lo contrario.

---

## Fechas

`LocalDate` viaja como `yyyy-MM-dd` y `LocalDateTime` como ISO **local, sin zona**. Nunca un `Date`
crudo de JavaScript ni nada terminado en `Z`: Jackson descarta el offset en vez de convertirlo, y un
instante de las 08:30 de Ecuador se graba como 13:30 sin ningún error.
