# Contrato — ciclo de otorgamiento del crédito

**Fecha:** 2026-08-31 · **Equipo:** CRD · EQUIPO B · **Escrito por:** árbitro `omen-saa-1-arb`
**Backend:** en construcción en paralelo, **sin desplegar**. Se implementa contra este contrato.

> Complementa `API-GENERACION-TABLA-AMORTIZACION.md`, que sigue vigente: la generación de la tabla
> no cambia de forma, solo suma una guarda más (§4).

---

## 1. Qué se agrega a la pantalla

`forms/prestamo/prestamo-edit` deja de ser un alta suelta y pasa a tener **ciclo**: la solicitud se
crea, se le genera la tabla, y se **aprueba** o se **rechaza** ahí mismo.

**No hay niveles de aprobación, ni bandeja, ni segundo firmante** (decisión del usuario, 2026-08-31).
Quien opera la pantalla aprueba. No busques una pantalla de autorización: no existe y no se va a
construir.

---

## 2. Los estados

Vienen del catálogo `EstadoPrestamo` y viajan en **`prestamo.idEstado`** (`PRSTIDST`).

| Código | Nombre | Qué significa en la pantalla |
|---|---|---|
| `6` | `PENDIENTE_DE_APROBACION` | Solicitud creada, **todavía sin tabla** |
| `1` | `GENERADO` | Tiene tabla de amortización, **sin aprobar** |
| `2` | `VIGENTE` | Aprobado. La tabla queda **congelada** |
| `7` | `RECHAZADO` | Rechazado. Terminal |

⚠️ **No uses `prestamo.estadoPrestamo` (`ESPSCDGO`) para esto.** Es la FK al catálogo, no el estado
operativo. El campo que manda es `idEstado`.

```
  PENDIENTE_DE_APROBACION (6) ──generar tabla──► GENERADO (1) ──aprobar──► VIGENTE (2)
             │                                        │  ▲                      │
             │                                        │  └─ regenerar           │
             └──────────── rechazar ──────────────────┤                         ▼
                                                      ▼              [ desembolso: NO es
                                               RECHAZADO (7)           de esta pantalla ]
```

---

## 3. Los dos endpoints nuevos

```
POST /SaaBE/rest/prst/aprobar/{id}
POST /SaaBE/rest/prst/rechazar/{id}
```

Cuerpo, los dos iguales:

```json
{ "usuario": "jperez", "observacion": "texto libre, opcional" }
```

Devuelven el `Prestamo` actualizado, con `idEstado` ya movido y los campos de auditoría llenos
(`usuarioAprobacion`/`fechaAprobacion`, o `usuarioRechazo`/`fechaRechazo`).

**Errores:** `HTTP 500`. ⚠️ **El cuerpo NO es texto plano, aunque el REST lo escriba así:** hay un `@Provider` global (`com.saa.ws.rest.MensajeErrorJsonFilter`) que envuelve toda respuesta ≥400 cuya entidad sea un `String` y cuyo tipo sea JSON, y la entrega como `{"mensaje": "..."}`. Leé `error.mensaje` primero, con el texto crudo como respaldo — que es lo que ya hace `extraerMensajeError`. Si la transición no
aplica —por ejemplo aprobar un préstamo que todavía no tiene tabla— el mensaje **nombra el estado
actual**. Mostralo tal cual con `extraerMensajeError`; no lo reemplaces por un texto genérico.

⚠️ **El backend valida el estado siempre, no confía en que la pantalla haya deshabilitado el botón.**
Deshabilitar el botón es para que el usuario entienda; la garantía está del otro lado.

---

## 4. Qué habilitar y qué no, según el estado

| Estado | Guardar datos | Generar tabla | Regenerar | Aprobar | Rechazar |
|---|---|---|---|---|---|
| `6` PENDIENTE | Sí | **Sí** | — | **No** (sin tabla no hay qué aprobar) | **Sí** |
| `1` GENERADO | Sí | — | **Sí**, con confirmación | **Sí** | **Sí** |
| `2` VIGENTE | Solo lo no financiero | **No** | **No, nunca** | — | — |
| `7` RECHAZADO | No | **No** | **No** | — | — |

**La regla de congelamiento es nueva y es la que más se va a notar:** una vez aprobado, la tabla no
se regenera **aunque no tenga ningún pago**. Hasta ahora la única guarda era la de pagos; ahora son
dos y se verifican las dos.

Aprobar y rechazar **piden confirmación** (`ConfirmDialogComponent`, el mismo que ya usa el botón de
regenerar). Rechazar es `type: 'danger'` y es terminal: decilo en el mensaje.

---

## 5. Lo que NO entra en esta pantalla

- **El desembolso hacia tesorería.** Es un proceso aparte, posterior a la aprobación, con su propio
  asiento. La pantalla llega hasta dejar el préstamo `VIGENTE`. No agregues botón de desembolsar ni
  toques `fechaAcreditacion`/`usuarioAcreditacion`.
- **Evaluación de capacidad de pago por bandas.** Existe en el backend, se conecta más adelante.
- **La carga de tabla desde Excel.** Es el camino de la cartera migrada y queda **intacto**. No le
  agregues guardas de estado ni lo toques.

---

## 6. Cuidado con la cartera migrada

Esta misma pantalla es la que se usa hoy para registrar los préstamos **migrados**, que entran ya en
`VIGENTE` y con su tabla cargada por Excel. Al agregar el ciclo:

- **No rompas ese camino.** Un préstamo que abre en `VIGENTE` tiene que seguir viéndose y editándose
  como hasta ahora, solo que sin poder regenerar la tabla.
- Los botones de aprobar y rechazar **no aparecen** en un préstamo `VIGENTE` o `RECHAZADO`: no hay
  transición válida desde ahí.
