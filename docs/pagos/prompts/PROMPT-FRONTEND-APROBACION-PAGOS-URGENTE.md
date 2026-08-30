# PROMPT — **FRONTEND** — Cerrar Aprobación de Pagos (urgente) + origen CXC

> **Eres el agente de FRONTEND**, repositorio `saaFE`. Trabajas en paralelo con un agente de
> BACKEND que toca `saaBE`, y con otro equipo de 3 agentes que trabaja **solo en el módulo
> `crd`**. **No edites nada de `crd`** (`modules/crd/**`) — ese módulo lo cierra el otro equipo.
> Tu alcance aquí es `cxp`, `tsr`, `rhh`, `cxc`.
>
> **Lee antes de escribir código:**
> 1. `docs/logica-negocio/pagos/PLAN-REDISENO-APROBACION-PAGOS.md` (espejado o en `saaBE`, pídelo
>    al usuario si no está en este repo) — sobre todo §3.2-3.4 y §7 (contrato exacto de
>    `GET /pgtr/porAprobar` y `POST /pgtr/aprobar`).
> 2. `CLAUDE.md` de este repositorio.
>
> **Regla dura:** no cambies el contrato de los endpoints por tu cuenta. Si algo no cuadra,
> reporta `BLOQUEADA` y espera.
>
> Reporta cada ítem con el formato: `ÍTEM <n> — COMPLETADO | BLOQUEADO`, apenas lo termines.

---

## Contexto

El backend ya tiene la bandeja de aprobación (`GET /pgtr/porAprobar`, `POST /pgtr/aprobar`) y el
componente `modules/cxp/forms/procesos/aprobacion-pagos/` ya existe y parece funcional (bandeja,
selección múltiple, aprobación en lote). El backend está agregando ahora
`GET /pgtr/disponibilidad/{idCuenta}` (antes no existía) y un origen nuevo, `CXC_DEVOLUCION_CLIENTE`.
Producción tiene un defecto urgente de base de datos que el usuario corrige por su cuenta — no es
parte de tu trabajo, pero explica por qué esto es prioritario: el negocio depende de que el ciclo
completo de aprobación quede usable hoy.

## ÍTEM 1 — Verificar (y terminar si falta) que las pantallas de origen no pidan cuenta/forma de pago

Las pantallas que **registran** una solicitud de pago deben haber dejado de pedir cuenta bancaria
de origen y forma de pago — eso se elige ahora al aprobar (§3.2 del plan). Verifica estas tres,
**no asumas que ya están completas solo porque tienen cambios recientes**:

- `modules/cxp/forms/pagos/pagos-transferencia/` — ya parece migrada (revisa igual).
- `modules/tsr/forms/registrar/registro-egreso/`
- `modules/tsr/forms/anticipos/anticipos-proveedores/`

**Distingue con cuidado** entre dos cosas que se ven parecidas: (a) un selector en el FORMULARIO de
registro que todavía pide cuenta/forma de pago al crear la solicitud — **eso hay que quitarlo**; y
(b) lógica de **lectura/visualización** que muestra la forma de pago de un pago **ya aprobado y
registrado antes de este cambio** (dato histórico legítimo) — **eso se queda**. Si encuentras
código de forma de pago en estas pantallas, determina cuál de los dos casos es antes de tocar nada,
y repórtalo explícitamente en tu entrega (qué encontraste, qué es cada cosa).

## ÍTEM 2 — Consumir `GET /pgtr/disponibilidad/{idCuenta}` en la pantalla de aprobación

En `aprobacion-pagos.component.ts`, al seleccionar la cuenta bancaria para aprobar, llama
`GET /pgtr/disponibilidad/{idCuenta}?fecha=<hoy>` y muestra los tres números junto al selector:

| Campo | Etiqueta |
|---|---|
| `saldo` | "Saldo contable" |
| `comprometido` | "Comprometido (pagos ya aprobados sin confirmar)" |
| `disponible` | "Disponible real" |

Si el total seleccionado (que ya calculas en la pantalla) supera `disponible`, muestra una
advertencia **antes** de que el usuario apruebe (no esperes a que el backend rechace con 400 para
avisar — el backend igual valida y rechaza, esto es solo para que el usuario no llegue a intentarlo
a ciegas). Si el `GET` falla, muestra "disponibilidad desconocida", no un número inventado ni cero
— inventar aquí es peor que no saberlo (mismo criterio que ya usa el interruptor de contabilidad de
CRD, no lo reinventes).

Crea el método correspondiente en `modules/cxp/service/pago-programado.service.ts` (o el que ya
maneje `RS_PGTR` — no crees un servicio nuevo).

## ÍTEM 3 — Nuevo origen: `CXC_DEVOLUCION_CLIENTE`

En `modules/cxp/model/pago-programado.ts`:

```typescript
export type OrigenPago =
  | 'FACTURA_COMPRA'
  | 'EGRESO_TESORERIA'
  | 'ANTICIPO_PROVEEDOR'
  | 'CRD_DEVOLUCION_APORTE'
  | 'TSR_CAJA_CHICA'
  | 'RHH_ANTICIPO_EMPLEADO'
  | 'CXC_DEVOLUCION_CLIENTE';   // nuevo

export const ORIGEN_PAGO_LABELS: Record<OrigenPago, string> = {
  // ... los seis existentes, sin tocarlos ...
  CXC_DEVOLUCION_CLIENTE: 'Devolución a cliente',
};
```

Con eso la bandeja de aprobación ya lo muestra correctamente (usa `origenLabel()`, que ya lee de
este mapa — no dupliques el mapeo en el componente).

**Además**, en la pantalla donde se gestionan los `AnticipoCliente` con saldo a favor (búscala en
`modules/cxc/` — probablemente cerca de gestión de anticipos o del estado de cuenta del cliente;
si no la encuentras, repórtalo y no inventes una pantalla nueva sin confirmar con el árbitro),
agrega un botón "Solicitar devolución" quesolo aparece cuando `saldo > 0`, que llama
`POST /rest/antc/solicitarDevolucion` con `{idAnticipo, valor, usuario}` (confirma el path exacto
contra lo que entregue el backend — puede diferir un poco de esto, es una propuesta). Tras
solicitar, el anticipo debe reflejar que tiene una devolución en curso (si el backend no distingue
ese estado todavía, repórtalo, no lo inventes en el frontend).

## ÍTEM 4 — Verificación rápida antes de cerrar

Confirma que las pantallas de origen que **no** tocaste en el ítem 1 (si las hay) siguen
funcionando sin cambio de comportamiento.

---

## Reglas de la casa (verificadas en este repositorio)

- **Angular 20, standalone components.** Signals para estado local. **No introduzcas librerías
  nuevas.**
- **Fechas del backend:** normaliza siempre con `FuncionesDatosService.convertirFechaDesdeBackend()`.
  No parsees fechas a mano.
- **Errores:** llegan como JSON `{"mensaje": "..."}` con estado 500 (o 400 en validaciones). Muestra
  `mensaje`, no el JSON.
- Español en interfaz, código y commits. Montos con 2 decimales y separador de miles.
- **No espejes archivos `.sql` a este repositorio.** Los `.md` sí, si el usuario te pide guardarlo.
