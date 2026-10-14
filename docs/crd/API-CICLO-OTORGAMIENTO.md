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

Cuerpo de `rechazar`:

```json
{ "usuario": "jperez", "observacion": "texto libre, opcional" }
```

Cuerpo de `aprobar` (**corregido 2026-10-13**: desde el desembolso, `7bca1713`, el backend exige
además `idEmpresa` e `idUsuario`; sin ellos responde *«falta idEmpresa»* / *«falta idUsuario»*):

```json
{ "usuario": "jperez", "observacion": "texto libre, opcional", "idEmpresa": 1236, "idUsuario": 15 }
```

- `idEmpresa`: la empresa de la sesión (la misma que mandan las demás pantallas que generan órdenes
  de pago). `idUsuario`: el **código numérico** del usuario de la sesión, no el login.
- Aprobar pasa el préstamo a VIGENTE, escribe el asiento de entrega y deja la **orden de desembolso**
  en tesorería con el producto de pago **976** «Desembolso de prestamo a socio» (grupo 79, cuenta
  `2.3.90.90.10 SOCIOS POR PAGAR`, creado con `crd/sql/322` el 2026-10-13).

### idAsoprep — lo asigna «Aprobar» (U6, 2026-10-13)

Diseño: `PLAN-CICLO-OTORGAMIENTO.md` §7.
- `aprobar` asigna `idAsoprep = MAX(PRSTIDAS) + 1` y lo devuelve en el `Prestamo` de la respuesta.
  La pantalla lo muestra en el mensaje de éxito («Préstamo aprobado con N° Asoprep 60124») y en el campo.
- Si dos aprobaciones chocan, la segunda responde con el error *«Otro préstamo se aprobó al mismo
  tiempo y tomó el número N; vuelva a aprobar»*. No se graba nada; reintentar.
- **`POST`/`PUT /prst` (saveSingle) ignoran el `idAsoprep` que mande el cliente.** Nuevo o no
  aprobado → `null`. Aprobado → el valor que ya tiene la base. El FE manda `idAsoprep: null`,
  **nunca 0**.
- En «Ingreso» el campo es de **solo lectura** y no obligatorio. Sin número muestra «Se asigna al
  aprobar».

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

---

## 7. Anular un préstamo otorgado, e imprimir pagaré y tabla (NUEVO 2026-10-13)

Diseño: `docs/logica-negocio/crd/DISENO-ANULACION-PRESTAMO-E-IMPRESOS.md` (AN1–AN11), solo en saaBE.

### 7.1 `GET /prst/{id}/puedeAnular`
`{ "puede": true|false, "motivo": "texto o null" }`. El botón «Anular» se muestra solo en VIGENTE (2)
o EN_MORA (11), y se **habilita** con `puede = true`. Con `puede = false`, el `motivo` va como tooltip.

### 7.2 `POST /prst/anular/{id}`
```json
{ "usuario": "jperez", "motivo": "texto obligatorio", "idEmpresa": 1236, "idUsuario": 15 }
```
- Anula la orden de desembolso en tesorería, **reversa** el asiento de entrega con la fecha de hoy y
  deja el préstamo en **ANULADO (12)**. El idAsoprep se conserva.
- **200:** el `Prestamo` actualizado (`idEstado: 12`, `usuarioAnulacion`, `fechaAnulacion`, `motivoAnulacion`,
  `idAsientoEntrega`, `idAsientoReverso`).
- **400** sin `motivo`, `usuario`, `idEmpresa` o `idUsuario`. **404** si el préstamo no existe.
- **422** si no se puede, con `{ "mensaje": "..." }`: estado no anulable, tiene pagos o cobros (el mensaje
  dice cuáles), la orden ya fue pagada o está en archivo del banco (el texto de CXP), un cierre de
  cartera o una provisión ya lo procesó, está en una póliza de seguro viva, falta el asiento de
  entrega, o el período de hoy está cerrado.
- Todo o nada: con un 422 no cambió nada.

### 7.3 Impresos — `POST /rprt/generar` (ACTUALIZADO 2026-10-13: modelos del cliente)

Diseño: `docs/logica-negocio/crd/DISENO-IMPRESOS-OTORGAMIENTO.md` (IM1–IM17), solo en saaBE.

```json
{ "modulo": "crd", "nombreReporte": "RPRT_PRST_SLCT", "formato": "PDF", "parametros": { "P_PRSTCDGO": 5555, "P_USUARIO": "jperez" } }
{ "modulo": "crd", "nombreReporte": "RPRT_PRST_PGRE", "formato": "PDF", "parametros": { "P_PRSTCDGO": 5555 } }
{ "modulo": "crd", "nombreReporte": "RPRT_TBLA_ACML", "formato": "PDF", "parametros": { "P_PRSTCDGO": 5555, "P_USUARIO": "jperez" } }
```
- **Solicitud de crédito** (`RPRT_PRST_SLCT`, nueva): desde GENERADO (1) o PENDIENTE (6), y en
  adelante, salvo RECHAZADO (7).
- **Pagaré** (`RPRT_PRST_PGRE`, ahora con el **modelo V2 del cliente**): necesita la tabla (lleva la cuota) y se bloquea en RECHAZADO (7) y en **ANULADO (12)**: un pagaré de un préstamo anulado no se imprime.
  Antes de aprobar sale marcado **BORRADOR** y sin número, porque el número es el idAsoprep.
- **Tabla de amortización** (`RPRT_TBLA_ACML`): igual que antes. Sale desde GENERADO, incluido ANULADO,
  que se imprime marcado así.
- Botones en Créditos → Préstamos → Ingreso, con el préstamo cargado: «Imprimir solicitud»,
  «Imprimir pagaré», «Imprimir tabla» y «Imprimir documentos» (§7.4).

### 7.4 Los tres juntos — `POST /rprt/generarLote` (NUEVO 2026-10-13)
```json
{ "modulo": "crd", "formato": "PDF",
  "reportes": [
    { "nombreReporte": "RPRT_PRST_SLCT", "parametros": { "P_PRSTCDGO": 5555, "P_USUARIO": "jperez" } },
    { "nombreReporte": "RPRT_PRST_PGRE", "parametros": { "P_PRSTCDGO": 5555 } },
    { "nombreReporte": "RPRT_TBLA_ACML", "parametros": { "P_PRSTCDGO": 5555, "P_USUARIO": "jperez" } }
  ] }
```
- **200:** `application/pdf`, un solo documento con los reportes en el orden pedido. Mismo manejo de
  la respuesta binaria que `/rprt/generar`.
- **400:** `formato` distinto de PDF o `reportes` vacío. **500:** falló uno de los reportes. El
  mensaje dice cuál, y no se entrega un PDF a medias.
- **Al aprobar con éxito** (§3), la pantalla llama a este endpoint **automáticamente**, en ese orden
  (solicitud, pagaré, tabla), y abre el PDF para imprimir. El préstamo ya tiene idAsoprep, así que el
  pagaré sale numerado.
- «Imprimir documentos» hace lo mismo bajo demanda, y solo se habilita con idAsoprep, es decir, ya
  aprobado.
- Si el lote falla después de aprobar, **la aprobación ya quedó hecha**: se muestra el error del
  impreso como aviso, no como fallo de la aprobación, y los botones siguen disponibles para reintentar.

## 8. Suma asegurada del bien en garantía (NUEVO 2026-10-13)

Diseño: `docs/logica-negocio/crd/DISENO-GARANTIA-BIEN-Y-PROVISION-CARTERA.md` (GA1–GA6), solo en saaBE.

- **Campo:** `valorAsegurado` (número > 0, dos decimales) en el `Prestamo` que se envía con `POST/PUT /prst`.
- **Cuándo se muestra:** solo si el producto es de familia **PRENDARIO o HIPOTECARIO**, es decir, si el
  tipo de préstamo del producto se llama así. En ese caso es **obligatorio**. En un quirografario no se
  muestra y no se envía.
- **Etiqueta:** «Suma asegurada del bien». Va con un texto de ayuda: «Valor por el que se registra la
  garantía en cuentas de orden».
- **Al editar** un préstamo cargado, se muestra el valor que ya tiene.
- **Aprobar** (§3) un prendario o hipotecario sin `valorAsegurado > 0` devuelve **422**, con
  `{ "mensaje": "Falta la suma asegurada del bien: sin ella no se registra la garantía en cuentas de orden" }`.
  No se numera ni se contabiliza nada.
