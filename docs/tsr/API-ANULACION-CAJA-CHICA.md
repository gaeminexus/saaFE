# API — Baja de caja chica y anulación de reposiciones/aperturas

**Equipo:** `lap-saa-1` · **2026-09-07** · Módulo `tsr` (+ delegación a `cxp`)
**Estado:** contrato congelado, implementación pendiente.
Verificado contra el código antes de escribirlo. Las líneas citadas son del árbol en `f241a5ba`.

---

## 0. Por qué existe esto

Hoy faltan dos cosas y las dos se descubrieron usando el sistema, no leyendo código:

1. **No hay forma de dar de baja una caja chica.** No hay endpoint, no hay botón, y la columna
   «ESTADO» de la pantalla de parametrización ni siquiera muestra `CJCHESTD` — muestra la alerta de
   reposición. Una caja que ya no se usa se queda en el selector de gastos para siempre.
2. **No hay forma de anular una reposición o una apertura desde caja chica.** El botón «Anular» de
   la grilla de movimientos exige `esGasto()` (`gastos-caja-chica.component.ts:595-597`), y el
   backend rechaza explícitamente el resto (`MovimientoCajaChicaServiceImpl.anularGasto:349-355`)
   remitiendo a `pgtr/revertirConfirmado`. Ese reverso funciona y está probado, pero vive en
   **CXP → pagos por transferencia**: quien maneja la caja no entra ahí y no tiene por qué saber que
   detrás de una reposición hay un pago programado.

**Decisiones de negocio tomadas por el usuario el 2026-09-07** (no re-preguntar, no reinterpretar):

- La baja de una caja **exige que esté en cero y sin pendientes**. No hay cascada: dar de baja una
  caja nunca reversa contabilidad de meses anteriores.
- El botón de anular reposición/apertura **va en la pantalla de caja chica** y por debajo llama al
  reverso del pago. El usuario no debe necesitar saber que existe un `PGS.PGTR`.

---

## 1. Modelo — lo que cambia

`TSR.CJCH` gana **una** columna. DDL en
`docs/logica-negocio/tsr/sql/lap1-06-caja-chica-motivo-anulacion.sql`. **Va antes del WAR**: la
entidad la mapea, e Hibernate nombra toda columna `@Column` en el `SELECT`, así que con el WAR
primero cualquier lectura de caja chica muere con `ORA-00904`.

| Columna | Tipo | Java | Para qué |
|---|---|---|---|
| `CJCHMTAN` | `VARCHAR2(500)` nullable | `String motivoAnulacion` | Motivo de la baja. Mismo descriptor que `TSR.MVCH.MVCHMTAN` |

**El estado no cambia de catálogo:** `com.saa.rubros.EstadoCajaChica` ya tiene `ACTIVA = 1` e
`INACTIVA = 2`. Dar de baja es pasar a 2. No se inventa un estado «ANULADA».

---

## 2. `POST /rest/cjch/anular/{id}` — dar de baja una caja

**Cuerpo**

```json
{ "motivo": "Se cierra la caja de sucursal norte", "idUsuario": 12 }
```

`motivo` es obligatorio y no puede venir vacío. `idUsuario` es el de la sesión.

**Respuesta 200**

```json
{ "idCaja": 4, "nombre": "CAJA CHICA MATRIZ", "estado": 2, "mensaje": "Caja chica dada de baja correctamente." }
```

**Validaciones — en este orden, y cada una con su propio mensaje.** Todas rechazan con `500` y
cuerpo `{"mensaje": "Error al dar de baja la caja chica: ..."}` (el `String` de error lo envuelve
`MensajeErrorJsonFilter`; **no es texto plano**).

| # | Regla | Mensaje |
|---|---|---|
| 1 | `motivo` presente y no vacío | «Debe indicar el motivo de la baja.» |
| 2 | La caja existe | la `NoResultException` de `selectById` sube tal cual |
| 3 | No está ya en estado 2 | «La caja chica 'X' ya está dada de baja.» |
| 4 | **Saldo = 0**, con `TOLERANCIA = 0.01` (`MovimientoCajaChicaServiceImpl:47`) | «La caja chica 'X' tiene un saldo de $N: regularícelo antes de darla de baja.» |
| 5 | **Sin pagos en curso**: ningún `PGS.PGTR` con `PGTRORGN = 'TSR_CAJA_CHICA'`, `PGTRIDOR` en los movimientos de la caja y `PGTRESTD` en (0,1,2) | «La caja chica 'X' tiene el pago N° P en curso (estado E): confírmelo, anúlelo o recháncelo antes de darla de baja.» |
| 6 | **Sin cierre en BORRADOR**: `cierreCajaChicaDaoService.selectBorrador(idCaja)` devuelve null | reusar el texto de `rechazaSiEnBorrador` |

**Efecto:** `CJCHESTD = 2`, `CJCHMTAN = motivo`. **Nada más.** No toca movimientos, no toca
asientos, no toca pagos. Los movimientos históricos quedan como están y el histórico sigue
consultable.

**Consecuencia visible:** la caja desaparece de `GET /cjch/activas/{idEmpresa}`, o sea de gastos,
reposición, cierre y del semáforo de saldos — que es exactamente lo que se busca. Sigue apareciendo
en parametrización, que lista con `getAll`.

---

## 3. `POST /rest/cjch/activar/{id}` — deshacer la baja

**Cuerpo:** `{ "idUsuario": 12 }`

**Respuesta 200:** `{ "idCaja": 4, "nombre": "...", "estado": 1, "mensaje": "Caja chica reactivada." }`

Sin esto, una baja por error solo se deshace con SQL. Valida únicamente que la caja exista y que
esté en estado 2. Pone `CJCHESTD = 1` y `CJCHMTAN = null`.

---

## 4. `POST /rest/mvch/anular/{id}` — se extiende a reposición y apertura

**El endpoint ya existe y no cambia de ruta ni de cuerpo.** Cuerpo: `{ "motivo": "...", "idUsuario": N }`.

Lo que cambia es a qué responde. Hoy, para todo lo que no sea un gasto, devuelve el error
«El movimiento N no es un gasto. Reverse el pago programado N° X (pgtr/revertirConfirmado)».
Pasa a resolverlo él mismo:

| Tipo (`MVCHTPOO`) | Qué hace |
|---|---|
| 2 · Gasto | Igual que hoy: `anularGasto`. **No tocar esa rama.** |
| 1 · Apertura, 3 · Reposición | Delega en el pago (§4.1) |
| 4 · Ajuste +, 5 · Ajuste − | Sigue rechazando. **No existe hoy ningún endpoint que los cree**, así que no hay caso real que cubrir; inventarles una rama es código muerto |

### 4.1 La delegación, según el estado del pago

El movimiento guarda el id del pago en `MovimientoCajaChica.idPago` (columna `PGTRCDGO`, id crudo a
propósito — ver el javadoc del campo: un `@ManyToOne` ahí arrastra los trece EAGER de
`PagoProgramado` y ya causó un `ORA-04036` en producción. **No convertirlo en relación.**).

| `PGTRESTD` | Acción | Método |
|---|---|---|
| 3 · Confirmado | Reversa contabilidad y anula el movimiento | `pagoProgramadoService.revertirPagoConfirmado(idPago, motivo, idUsuario)` |
| 0, 1, 2 · Por aprobar / registrado / en archivo | Anula el pago; todavía no hay asiento | `pagoProgramadoService.anularPago(idPago, motivo, idUsuario)` |
| 4, 5 · Rechazado / anulado | Rechaza: «El pago N° P de este movimiento ya está en estado E. Si el movimiento sigue activo hay un vínculo roto: repórtelo antes de continuar.» | — |
| `idPago` nulo | Rechaza: «El movimiento N no tiene pago asociado: no se puede anular automáticamente.» | — |

⚠️ **Los dos métodos de `PagoProgramadoServiceImpl` ya anulan el `MovimientoCajaChica` por su
cuenta** (`anularMovimientoCajaChicaSiAplica`, invocado desde `revertirContabilidadOrigenExterno:2864`
y desde la anulación de pago en `:1889`). **No volver a marcarlo anulado después de delegar**: sería
escribir dos veces lo mismo y, peor, invita a que alguien agregue una anulación de asiento «por las
dudas» que terminaría reversando el mismo asiento dos veces. Es el mismo error que el comentario de
`anularGasto:367-371` ya documenta para las aplicaciones de pago.

### 4.2 Guardas previas, antes de delegar

Las mismas que ya tiene el gasto, en este orden:

1. `motivo` obligatorio.
2. El movimiento no está ya anulado (`MVCHESTD = 2`).
3. El movimiento no quedó incluido en un cierre (`CRCHCDGO` no nulo → rechaza).
4. `rechazaSiEnBorrador(idCaja, fecha, "el movimiento N")`.

**Respuesta 200:** el mensaje debe decir qué se anuló, no «Gasto anulado correctamente» para todo:

```json
{ "mensaje": "Reposición anulada: se reversó el pago N° 812 y su asiento." }
```

---

## 5. Frontend

**Sin cambios de servicio**: `movimiento-caja-chica.service.ts` ya tiene `anular(id, {motivo, idUsuario})`
apuntando a `POST /mvch/anular/{id}`, y es el mismo endpoint.

1. **`gastos-caja-chica.component.ts:595-597`** — `puedeAnular()` deja de exigir `esGasto()`:

   ```ts
   puedeAnular(m: MovimientoCajaChica): boolean {
     const t = this.tipoDeMovimiento(m);
     return this.estaActivo(m)
       && (t === TipoMovimientoCajaChica.GASTO
        || t === TipoMovimientoCajaChica.REPOSICION
        || t === TipoMovimientoCajaChica.APERTURA);
   }
   ```

   El `matTooltip` y el texto del diálogo dejan de decir «gasto» fijo: se arman según el tipo.
   **La advertencia del diálogo cambia de fondo para reposición y apertura** — ahí no se libera
   saldo, se reversa un pago y su asiento. Texto: «Se anulará la reposición, se reversará el pago
   al banco y su asiento contable. El saldo de la caja bajará en $N.»

2. **`cajas-chicas.component.ts` (parametrización)** — acción «Dar de baja» por fila, con diálogo de
   motivo (`MotivoDialogComponent`, el mismo que usa la anulación de gastos), llamando a
   `POST /cjch/anular/{id}`. Para una caja ya en estado 2, la acción es «Reactivar» →
   `POST /cjch/activar/{id}`.

3. **La columna «ESTADO» de esa tabla hoy miente**: su `matColumnDef` es `alerta` y muestra
   «Reponer / OK», que es la alerta de saldo, no `CJCHESTD`. Agregar una columna real de estado
   (Activa / Dada de baja) — sin ella, una caja dada de baja se ve idéntica a una activa en la única
   pantalla donde aparece.

---

## 6. Trampas verificadas

- **`GET /cjch/activas` filtra `estado = 1`.** Una caja con `CJCHESTD` nulo desaparece igual que una
  dada de baja, y por otra causa: ver `BARRIDO-PAYLOADS-PARCIALES-LAP-1.md` §3ter. Ese defecto se
  corrige aparte; si no está corregido, **la baja de cajas va a confundirse con él**.
- **El saldo nunca está guardado.** `CajaChicaServiceImpl.calcularSaldo` lo suma cada vez sobre los
  movimientos **activos**. Por eso anular un movimiento cambia el saldo sin que nadie escriba un
  saldo, y por eso *borrar* una fila de `TSR.MVCH` cuadraría la caja dejando vivos el pago, el
  asiento y el movimiento bancario.
- **La reposición contabiliza al confirmar el pago, no al registrarlo** (`contabilizarPagoCajaChica`,
  `PagoProgramadoServiceImpl:2571`). Un pago en estado 0/1/2 no tiene asiento: anularlo no reversa
  nada contable, y está bien que así sea.
- **`tsr` ya depende de `cxp`**: `MovimientoCajaChicaServiceImpl` inyecta `AplicacionPagoCxpService`.
  Inyectar además `PagoProgramadoService` no agrega una dirección de dependencia nueva. Lo que sigue
  prohibido es que `tsr`, `cnt` o `cxp` dependan de `crd`.

---

## 7. Dos hallazgos del 2026-09-07, encontrados usando el sistema

Salieron de anular una reposición real (`TSR.MVCH` 5 / `PGS.PGTR` 156 de «Caja Chica oficinas»).
Ninguno de los dos es teórico: los dos ya pasaron en producción.

### 7.1 Un pago de caja chica `POR_APROBAR` queda atrapado

**Ninguna pantalla puede anularlo.** La bandeja de `tsr/forms/procesos/aprobacion-pagos` solo
aprueba — no tiene rechazar ni anular. Y `cxp/forms/pagos/pagos-transferencia` no lista los
`POR_APROBAR` (su `estadosFiltro:165-171` arranca en «Registrado») y su `puedeAnular():963-965`
exige `REGISTRADO` o `EN_ARCHIVO`. El endpoint `POST /pgtr/anular/{id}` sí lo acepta —
`anularPago:1865-1885` solo rechaza ANULADO, con cheque y CONFIRMADO— pero nadie lo llama para ese
estado.

**El javadoc de `anularMovimientoCajaChicaSiAplica:2931-2941` dice que ese camino es «hoy
inalcanzable en la práctica porque el pago de caja chica nace CONFIRMADO (sólo admite cheque o
débito automático, nunca transferencia)». Eso dejó de ser cierto.** El cambio del 2026-08-30
(`registrarPagoBanco:450-453`) hizo opcional la cuenta bancaria de origen: **sin cuenta, el pago
nace `POR_APROBAR`**. El pago 156 es exactamente ese caso. El comentario quedó desactualizado y
describe una garantía que ya no existe.

**El endpoint del §4 lo resuelve** (estados 0/1/2 → `anularPago`). Mientras no exista, la única
salida es llamar el endpoint a mano o SQL:
`docs/logica-negocio/tsr/sql/lap1-07-anular-reposicion-mvch5-pgtr156.sql`.

### 7.2 ⚠️ Sin decidir — la reposición suma al saldo antes de que el dinero llegue

El movimiento de reposición **nace ACTIVO y entra al saldo en el instante en que se registra**
(`registrarPagoBanco:502-512`), sin esperar a que el pago se confirme. Y `calcularSaldo` suma todos
los movimientos activos sin mirar el estado del pago. Así que **el saldo de la caja incluye dinero
que todavía no salió del banco.**

No es un detalle contable: el control que impide gastar de más
(`MovimientoCajaChicaServiceImpl:169`, `valor > saldoActual + TOLERANCIA`) compara contra ese saldo
inflado. **Se pueden registrar gastos contra plata que no está en la caja.**

Ya pasó, y con números: la caja 1 abrió con 249.58, tiene 361.70 en gastos activos y una reposición
de 180.25 cuyo pago nunca se aprobó. Saldo en pantalla: 68.13. Saldo real disponible: **−112.12**.
Los gastos de agosto se cargaron *después* de registrar la reposición de septiembre, y el sistema
los aceptó uno por uno.

**Decisión pendiente del usuario** — no implementar ninguna de estas sin que la elija:

- que `calcularSaldo` cuente la reposición solo cuando su pago esté `CONFIRMADO`, o
- que el movimiento nazca en un estado «en tránsito» que no suma, y pase a activo al confirmarse, o
- dejarlo como está y controlarlo por procedimiento.

La primera es la más chica de escribir, pero **cambia el saldo mostrado de toda caja con una
reposición en curso**, así que no es un ajuste silencioso.
