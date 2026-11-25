# Tope de la provisión de mora (D-186) y ajuste de lo ya provisionado — contrato de API

**Origen:** lote 7 (el reproceso lo necesita para cerrar octubre de 2025). **Estado:** backend programado (compila; sin probar contra
Oracle ni desplegado). Va con `sql/392_MVIC_TIPO_10_AJUSTE_TOPE_PROVISION.sql` (antes del EAR) y la propiedad
`saa.cartera.topeProvisionMoraDesde`. Medición de aceptación: `sql/391_MEDICION_TOPE_PROVISION_MORA.sql`.

## El problema

El paso ⑦ del cierre provisionaba el 100 % del interés pendiente y el 100 % de la mora CALCULADA de toda cuota vencida, pero en 1.4.02 solo
está la mora contabilizada (la devengada en MVIC por ④/⑩). Al 30-sep-2025 el cuadre midió la mora provisionada en 637.176,12 contra 42.566,11
en 1.4.02, y 456.172 de ese exceso son de cuotas vencidas antes de 2020.

## La regla (POR PRÉSTAMO, lote 7b)

```
tope del préstamo = max(0, Σ cuotas del préstamo de (devengo MVIC tipo 5 − 6, mora, fecha contable ≤ corte)
                           − Σ mora cobrada vigente (≤ corte)
                           − mora condonada)                    ← SIN piso por cuota
reparto           = el tope del préstamo se reparte entre sus cuotas con mora calculada pendiente,
                    de la más vieja a la más nueva, sin pasar de la mora calculada pendiente de cada una
tope de la cuota  = lo repartido a esa cuota           (Σ tope repartido del préstamo ≤ tope del préstamo)
provisión de mora a constituir = max(0, tope de la cuota − saldo provisionado de mora de la cuota)
ajuste tipo 10 por cuota       = max(0, saldo provisionado de mora − tope de la cuota)
```

Por qué por préstamo: en 1.4.02 el negativo de una cuota (mora cobrada o condonada por encima de lo devengado) sí rebaja la cuenta y
compensa la mora pendiente de las otras cuotas del mismo préstamo (control 3 del cuadre al 30-sep-2025: 42.566,11 por préstamo contra
43.680,62 con piso por cuota). El paso ⑦ y la herramienta usan la misma función (`TopeProvisionMora.repartir`).

- **Mora condonada:** `CRD.DACC` (concepto 3 = mora) `.DACCVLCN` de los acuerdos APLICADOS (`ACCNESTD = 2`) con fecha ≤ corte, por préstamo. Un acuerdo reabierto
  (lote 1c) deja de restar solo, porque deja de estar APLICADO. El bloque 5 del SQL 391 compara con la variante del MVIC tipo 9.
- **El interés NO cambia:** sigue al 100 % del interés pendiente.
- **Saldo provisionado de mora** = Σ tipo 1 y 4 − Σ tipo 2, 3, 9 y **10** (vigentes). El tipo 10 es nuevo (abajo).
- No se borra nada del préstamo: la mora sigue en `DTPR`, en la G48 y se cobra. Cuando ④/⑩ la devenguen, el ⑦ siguiente la provisiona.
- Funciona en modo normal (sin límite de fecha del libro) y al corte (reproducible a una fecha pasada).

## Activación

Propiedad del servidor `saa.cartera.topeProvisionMoraDesde` (AAAA-MM-DD): primer corte cuyo ⑦ aplica el tope. **Sin la propiedad, o con un corte
anterior, el ⑦ es el de siempre byte a byte.** La semilla de la corrida de arranque nunca lleva el tope (el libro de devengo está vacío ahí).

| Ambiente | Valor |
|---|---|
| Producción | el mismo valor que `saa.cartera.devengoCompletoDesde` (el próximo cierre) |
| Reproceso | `2025-10-31` |

## Tipo de movimiento 10 «AJUSTE_TOPE_PROVISION»

El cuadre contabiliza el exceso de lo ya provisionado en un asiento (D 1.4.99.05 / H 4.7.05.10). El libro MVIC por cuota tiene que reflejarlo, o el
⑦ nuevo volvería a provisionar lo reversado. El tipo 10 resta del saldo provisionado igual que el 2, el 3 y el 9 (no se reutiliza el 9, que es de
condonación). Componente MORA, valor positivo, sin corrida, `ASNTCDGO` = el asiento del cuadre, origen `AJUSTE_TOPE`. Requiere `sql/392`.

## Endpoints

Errores siempre como JSON `{"mensaje": "..."}`: 400 para un error de negocio o un usuario inválido, 500 para cualquier otra falla.

### `POST /rest/prov/ajusteTopeMora` — previsualizar o grabar

```json
{ "idEmpresa": 1236, "corte": "2025-10-31", "idAsiento": 12345, "usuario": "jperez", "grabar": false, "incluirDetalle": true }
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `idEmpresa` | sí | Empresa contable |
| `corte` | sí | `yyyy-MM-dd`; tiene que ser la fecha del asiento |
| `idAsiento` | sí | El asiento que el cuadre contabilizó por el exceso |
| `usuario` | sí | Se valida (U-2), también para previsualizar |
| `grabar` | no | `true` graba; `false` o ausente solo previsualiza |
| `incluirDetalle` | no | `true` devuelve el detalle por cuota (máximo 500 filas, por ajuste descendente) |

Qué hace: busca las cuotas con saldo de provisión de mora al corte, calcula por cuota el tope con la regla de arriba y el ajuste
`max(0, saldo − tope)`. Lo valida contra el asiento:

- el asiento tiene que estar **ACTIVO** y su **fecha** ser el corte;
- por cada **cuenta de la 1.4.99.05** (la línea de la plantilla 36, papel 81, de cada tipo de préstamo; si varios tipos comparten cuenta se suman),
  `|Σ ajuste − (debe − haber) del asiento en esa cuenta| ≤ 0,01`.

Si no cuadra, **no graba** (con `grabar = true` responde 400 con las diferencias por cuenta).

**Idempotente:** si el asiento ya tiene movimientos tipo 10 vigentes, no repite nada y responde `yaGrabado: true`.

Respuesta 200:

```json
{
  "corte": "2025-10-31", "idAsiento": 12345, "grabado": false, "yaGrabado": false,
  "totalAjuste": 594610.01, "totalAsiento": 594610.01, "cuadra": true, "cuotasAjustadas": 1873,
  "porTipo": [ { "idTipoPrestamo": 1, "cuenta": "1.4.99.05", "ajuste": 594610.01, "asiento": 594610.01, "diferencia": 0.00 } ],
  "detalle": [ { "idCuota": 55, "idPrestamo": 9, "operacion": 70001, "numeroCuota": 12, "idTipoPrestamo": 1,
                 "saldoProvisionadoMora": 310.25, "moraCalculadaPendiente": 400.10, "moraContabilizadaPendiente": 12.00,
                 "tope": 12.00, "ajuste": 298.25 } ],
  "advertencias": []
}
```

(Los valores son de forma, no reales.) `detalle` solo viene con `incluirDetalle`; si hay más de 500, una advertencia lo dice y el detalle completo
sale del SQL 391.

### `POST /rest/prov/ajusteTopeMora/anular` — anular el ajuste de un asiento

```json
{ "idAsiento": 12345, "usuario": "jperez" }
```

Respuesta 200: `{ "idAsiento": 12345, "movimientosAnulados": 1873 }`. Marca `MVICANUL = 1` en los tipo 10 de ese asiento (nunca borra). Se usa si el
cuadre anula su asiento. `anularByCorrida` no lo toca: el ajuste no cuelga de una corrida.

## Cómo se prueba (aceptación)

1. Correr `sql/392` (antes del EAR) y definir `saa.cartera.topeProvisionMoraDesde`.
2. Con el ⑦ del corte reproducido, `sql/391` bloque 1: el exceso por tipo de préstamo = lo que contabilizó el cuadre.
3. `POST /rest/prov/ajusteTopeMora` con `grabar = false` (el `porTipo` y `cuadra`), luego con `grabar = true`.
4. Correr de nuevo el mismo POST: `yaGrabado: true`. Correr el ⑦ dos veces en el mismo corte no cambia nada.
5. Al 31-oct-2025, después del ajuste y del ⑦ nuevo: el bloque 1 y el 2 del 391 en 0, y la mora de la 1.4.99.05 igual a la mora de la 1.4.02, al centavo
   por tipo (bloque 5 del 391 contra el saldo de 1.4.02).
