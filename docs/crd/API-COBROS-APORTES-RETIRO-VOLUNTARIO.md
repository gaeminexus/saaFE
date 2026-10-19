# Contrato — Cuentas de RETIRO VOLUNTARIO en cobros personales (tipos 21 y 22)

**Fecha:** 2026-10-19 · **Equipo:** `omen-saa-1` · **Árbitro:** `omen-saa-1-arb`
**Espejo obligatorio:** `saaFE/docs/crd/API-COBROS-APORTES-RETIRO-VOLUNTARIO.md`
**Relacionado:** `MAPEO-CUENTAS-TIPO-APORTE.md` §3, `sql/330`, `sql/331`,
`API-COBROS-APROBACION-CONTABILIDAD.md` (CBCR), `API-COBRO-APORTE-PENSION-COMPLEMENTARIA.md` §5.

## 1. Pedido y decisiones del usuario. NO re-litigar

| # | Decisión |
|---|---|
| RV1 | Cuentas (2026-10-16 y 2026-10-19): **22 JUBILACION RETIRO VOLUNTARIO → `2.1.02.25.05`** CTA INDIVIDUAL PASIVOS JUBILACION (plantilla 21, aux1 **54**, `sql/330`). **21 CESANTIA RETIRO VOLUNTARIO → `2.1.01.20.05`** CTA INDIVIDUAL PASIVOS CESANTIA (plantilla 21, aux1 **55**, `sql/331`). |
| RV2 | En **cobros personales** se habilitan **las dos operaciones** (respuesta «C», 2026-10-19): **(a)** el socio **deposita** en su cuenta de retiro voluntario (registrar aporte 21/22 por transferencia o depósito, vía CBCR) y **(b)** se **paga un préstamo debitando** la cuenta de retiro voluntario (`pagarConAportes` con origen 21/22). |

## 2. Backend

| # | Regla |
|---|---|
| B1 | `CrdLineaAsiento.APORTES_CESANTIA_RETIRO_VOLUNTARIO = 55`. `ContabilizacionIndividualCreditoServiceImpl.aux1ParaTipoAporte`: **21 → 55** (el 22 → 54 ya está, `dc60347d`). Con eso, `lineaAporteRegistrado` (depósito) y `lineasCruceAportesConsumidos` (débito) resuelven los dos tipos. |
| B2 | `CobroCreditoServiceImpl.esTipoAporteContabilizable` acepta **9, 11, 2, 23, 21 y 22**. Se actualizan su comentario y el de :1772. El 23 conserva su regla de solo JUBILADO COMPLEMENTARIO; **21 y 22 no tienen restricción de estado del partícipe** (supuesto del árbitro, ver §5). |
| B3 | **No se toca otra lista blanca** sin reportarla. El BE mide el camino completo de **aprobación** de un `REGISTRO_APORTE`/`COBRO_MIXTO` con una línea 21 o 22 (creación del movimiento en `CRD.APRT`, contabilidad y lo que use contrato/vigencia, que 21/22 no tienen) y reporta con archivo:línea cualquier punto que asuma 9/11. |
| B4 | Ningún endpoint nuevo ni cambio de forma. `POST /cbcr/registrar` (detalles con `idTipoAporte` 21/22) y `POST /prst/pagarConAportes` (`aportes: [{idTipoAporte: 21|22, valor}]`) aceptan los dos tipos. Errores de negocio: los mismos de hoy (`SALDO_APORTES_INSUFICIENTE`, `TIPO_APORTE_NO_VIGENTE`, el `IncomeException` de tipo no contabilizable). |
| B5 | **Orden de despliegue:** `sql/330` y `sql/331` **antes** del WAR. Sin la línea, falla con «La plantilla alterno 21 no tiene la línea del tipo de aporte …». |

## 3. Frontend (`cobros-personales`)

| # | Regla |
|---|---|
| F1 | **Se resuelve por id, no por nombre** (corrige un defecto). Hoy `saldoPorNombre`/`idTipoAportePara` toman la **primera** cuenta cuyo nombre contiene `cesant`/`jubila`, así que a un socio sin 9/11 le pueden tomar el **22** o el **12 RENDIMIENTO CESANTIA** sin avisar. Desde ahora: cesantía = **11**, jubilación = **9**, cesantía RV = **21**, jubilación RV = **22**, con constantes en `ID_TIPO_APORTE` (`model/vigencia-contrato.ts`). La pensión (23) puede seguir por nombre (`pension` es inequívoco) o pasar a id, a criterio del FE. Esto **reemplaza** la regla «nunca un literal 23» del §5.2 del contrato de pensión complementaria **solo para estos tipos**. |
| F2 | **Depósito (a):** la tabla de cuentas suma dos filas, **«Cesantía retiro voluntario»** y **«Jubilación retiro voluntario»**, con su saldo. Se muestran **solo si el socio tiene ese tipo** en `saldosAporte` (con cualquier saldo, incluso 0). No llevan valor mensual ni cobertura: no tienen contrato ni vigencia. Su monto entra en `montoAportesSocio` y viaja como línea `idTipoAporte` 21/22 de CBCR, igual que cesantía y jubilación. |
| F3 | **Débito (b):** el selector «cuenta de aportes de origen» ofrece **cesantía, jubilación, cesantía RV y jubilación RV**, cada una con su **nombre y saldo**. Solo se ofrecen las que el socio tiene con **saldo > 0**. El control de saldo insuficiente usa el saldo **del tipo elegido**. Se mantiene la regla de un solo préstamo con débito. |
| F4 | El recibo y los mensajes usan el **nombre real** del tipo (`nombreAporte`), no «cesantía»/«jubilación» a secas, para que no se confunda la personal con la de retiro voluntario. |
| F5 | Nada más cambia: ni el flujo de CBCR ni la aprobación ni el comprobante. |

## 4. Pruebas que tiene que pasar (las corre el usuario tras desplegar)

1. Socio con 22: **depositar** $10 en «Jubilación retiro voluntario» → aprobar el cobro → el asiento acredita `2.1.02.25.05` y el saldo del 22 sube $10.
2. Ídem con 21 contra `2.1.01.20.05`.
3. **Pagar una cuota debitando** la jubilación RV → asiento: DEBE `2.1.02.25.05` y el saldo del 22 baja.
4. Socio con 11 **y** 12 (rendimiento): el débito «cesantía» sale del **11**, no del 12 (F1).

## 5. Abierto (no bloquea)

- ¿Los aportes **21/22** se reciben de **cualquier** partícipe, o solo de alguno en un estado particular (p. ej. retirado voluntario)? Mientras no se diga, sin restricción (B2).
- Coherencia con `CRD.CTAP` (devolución): bloque 5 del `sql/331`. Si la cuenta de pasivo de CTAP para 21/22 no es la misma de la plantilla 21, la devolución daría de baja otra cuenta.
