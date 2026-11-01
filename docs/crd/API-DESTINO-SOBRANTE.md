# Contrato: destino del sobrante por partícipe en la carga Petro/ARCH (B8, `CRD.DSSB`)

**omen-saa-1-arb, 2026-11-01.** Diseño: `saaBE/docs/logica-negocio/petro/DISENO-DESTINO-SOBRANTE-DSSB.md`.
DDL: `saaBE/docs/logica-negocio/crd/sql/357` (se corre antes del EAR).

## 1. Para qué
Cuando una carga trae plata que no se puede aplicar (cuota ya pagada, aporte ya completo, seguro sin
préstamo, parcial de ARCH), hoy el partícipe queda con una **novedad bloqueante** y el operador reparte
a mano por montos (afectación manual, AVPC). Con esto, el operador elige **un destino por partícipe** y
el proceso aplica el sobrante solo:

| `tipoDestino` | Significado | Campos |
|---|---|---|
| 1 | Siguiente cuota | `prestamo` opcional (sin préstamo = la cuota pendiente más antigua de un préstamo vigente o en mora) |
| 2 | Aporte | `tipoAporte` **obligatorio**: 9 (jubilación) u 11 (cesantía) |
| 3 | Devolución al partícipe (socios por pagar → pago programado de Tesorería) | ninguno |

El sobrante exacto recién se conoce al procesar; el destino se elige **antes** de procesar. Si no hay
destino elegido, la novedad bloqueante sigue apareciendo como hoy (decisión DU2). La afectación manual
por montos (AVPC) sigue igual para casos raros.

## 2. Endpoints (`/SaaBE/rest/dssb`)
| Método | Ruta | Cuerpo / params | Respuesta |
|---|---|---|---|
| GET | `/selectByCarga/{idCarga}` | — | 200 `DestinoSobrante[]` (activos y anulados; filtrar `estado == 1` para mostrar el vigente) |
| GET | `/getId/{id}` | — | 200 `DestinoSobrante` |
| POST | `?usuario=<usuarioSesion()>` | `DestinoSobrante` (abajo) | **201** el registro creado. Si el partícipe ya tenía uno activo en esa carga, el anterior queda anulado y vale el nuevo |
| PUT | `?usuario=<usuarioSesion()>` | `DestinoSobrante` | 200 (mismo efecto que POST) |
| POST | `/anular/{id}?usuario=<usuarioSesion()>` | — | 200. Solo si aún no se aplicó y la carga no está PROCESADA |

`usuario` va con `encodeURIComponent`, el mismo de F1, **sin relleno**.

**Cuerpo:**
```json
{
  "cargaArchivo": { "codigo": 510 },
  "entidad":      { "codigo": 12345 },
  "tipoDestino":  1,
  "prestamo":     { "codigo": 987 },
  "tipoAporte":   null,
  "observacion":  "texto opcional"
}
```
`prestamo` solo con destino 1; `tipoAporte` solo con destino 2. Respuesta además con `codigo`, `estado`
(1 activo, 0 anulado), `valorAplicadoAportes` / `valorAplicadoPrestamos` (los escribe el proceso; nulos
antes de procesar), `idPagoProgramado` (destino 3, después de procesar). **Los nombres exactos de los
campos los confirma `DestinoSobrante.java` del BE; si difieren, manda el BE y se corrige este contrato.**

**Errores:** 400 usuario faltante/inexistente («No se puede registrar el destino sin un usuario válido: …»);
409 regla de negocio (préstamo que no es del partícipe, tipo de aporte distinto de 9/11, carga ya
procesada…), texto del servidor; 500 otro.

## 3. Pantalla
- Dónde: en el **detalle de la carga** (`detalle-consulta-carga`) y/o en la vista previa
  (`carga-aporte-back`), una columna **«Destino del sobrante»** por partícipe que muestra el destino
  vigente (o «—») y abre un diálogo para elegirlo/cambiarlo/anularlo.
- El diálogo: radio 1/2/3; con 1, selector opcional de préstamo del partícipe (los vigentes/en mora;
  usar el servicio de préstamos ya existente); con 2, selector Jubilación/Cesantía; observación opcional.
- Resaltar a los partícipes que **ya tienen una novedad bloqueante de sobrante** (las novedades existentes
  de la carga), para que el operador sepa dónde hace falta.
- Con la carga PROCESADA, la columna es de solo lectura y muestra lo aplicado/devuelto.
- Un 409/400 muestra el texto del servidor.
