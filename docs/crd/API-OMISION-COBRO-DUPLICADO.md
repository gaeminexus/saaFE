# Omisión explícita del control de cobro duplicado — contrato de API

**Origen:** c45-1 (DS-01), lote 6. **Estado:** backend programado (compila; sin probar contra Oracle ni desplegado).

## Qué es el control

Al procesar un cobro (`POST /rest/cbcr/{id}/procesar`), si el préstamo de alguna línea ya tiene un evento **vigente** de la **misma
fecha** del depósito y el **mismo valor** que **no pertenece a ningún cobro** (pago manual, Petro, pensión, acuerdo), el proceso se
rechaza antes de escribir nada: procesar el cobro aplicaría el mismo pago dos veces.

Antes, el control no tenía excepción y el mensaje pedía anular un evento que podía ser válido. Ahora hay una **omisión explícita**.

## Petición

```
POST /rest/cbcr/{id}/procesar
Content-Type: application/json

{
  "usuario": "jperez",
  "reproceso": false,
  "omitirControlDuplicado": true,
  "motivoOmision": "Son dos pagos distintos: el de ventanilla del 12 y el descuento de Petro del mismo día"
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `usuario` | sí | Quien procesa (se valida, U-2) |
| `reproceso` | no | El modo re-proceso de siempre |
| `omitirControlDuplicado` | no | `true` = procesar aunque haya un evento suelto coincidente. Sin el campo, o en `false`, el control rechaza como siempre |
| `motivoOmision` | sí, si se omite | No vacío después de `trim`; sin largo mínimo |

Si `omitirControlDuplicado` es `true` y **no hay** coincidencia, la omisión no hace nada y no deja constancia.

## Respuesta

- Sin coincidencia, o con coincidencia y omisión con motivo: `200` con el `ResultadoProcesoCobro` de siempre.
- Error (todos **500 con texto**, igual que hoy; el FE muestra el texto del error):

| Prefijo del texto | Cuándo | Qué hacer |
|---|---|---|
| `POSIBLE_COBRO_DUPLICADO:` | hay un evento suelto coincidente y no se omitió | Si es el mismo dinero, anular ese evento. Si son dos pagos distintos, reintentar con la omisión y un motivo |
| `OMISION_SIN_MOTIVO:` | `omitirControlDuplicado = true` con `motivoOmision` vacío | Pedir el motivo |

El mensaje de `POSIBLE_COBRO_DUPLICADO` nombra el préstamo, el evento coincidente (código y tipo), la fecha y el valor, y termina con: «Si es el
mismo dinero, anule ese evento antes de procesar; si son dos pagos distintos, procese con la omisión explícita (omitirControlDuplicado =
true) y su motivo.»

## Constancia (sin tabla nueva)

Cada coincidencia omitida deja un texto que **empieza con el marcador fijo** `[OMISION-COBRO-DUPLICADO]`:

```
[OMISION-COBRO-DUPLICADO] cobro 69, préstamo 8085, evento coincidente 42 (PAGO_MANUAL), omitido por jperez: Son dos pagos distintos...
```

- En la observación del cobro (`CRD.CBCR.CBCROBSR`), una línea por préstamo omitido.
- En la huella de cada préstamo (`CRD.PRST.PRSTOBSR`), con la línea habitual «[fecha usuario] OMISION CONTROL COBRO DUPLICADO $valor - …».
- Ambas se truncan por la izquierda a 2000 bytes. El SQL `crd/sql/390_MEDICION_OMISIONES_COBRO_DUPLICADO.sql` las lista por el marcador.

Si el cobro tiene varias líneas con coincidencia, se registran todas (el control sin omisión rechaza por la primera).

## Pantalla de cobros (FE)

1. Al procesar, **no** mostrar el botón de omisión de entrada.
2. Si la respuesta es un error cuyo texto empieza con `POSIBLE_COBRO_DUPLICADO`, mostrar un diálogo con el texto completo del error y dos salidas:
   - **Cancelar** (deja el cobro como está; el usuario anula el evento suelto por su pantalla).
   - **Procesar de todas formas**: pide el motivo (obligatorio, no vacío) y reenvía el mismo `POST …/procesar` con
     `omitirControlDuplicado: true` y `motivoOmision`.
3. Conservar `reproceso` si el procesar original lo llevaba.
4. Mostrar la observación del cobro tras el proceso, donde queda la constancia.

El FE reconoce el error por el **prefijo** `POSIBLE_COBRO_DUPLICADO` del texto.

## Fase 2 (no programada)

Cuando se programe la pantalla, el error pasará a **409** con JSON estructurado `{codigo, mensaje, idPrestamo, idEvento, tipoEvento}`. Hoy
se queda en 500 con texto, porque un 409 con JSON podría mostrarse como JSON crudo en el FE actual.

## Lo que NO cambia

- La clave compuesta de «9»/«09» (validar) **no** lleva omisión: ahí el remedio es registrar el número del comprobante.
- El control de cobro duplicado solo mira cobros con préstamo (PAGO_CUOTA, PAGO_MULTIPLE, ABONO_CAPITAL, PRECANCELACION, COBRO_MIXTO).

## Qué necesita el FE para probar

- Un préstamo con un evento suelto (pago manual) de la misma fecha y valor que el depósito de un cobro aprobado (ver `c45-1`). Procesar sin
  omisión: error `POSIBLE_COBRO_DUPLICADO`. Con omisión y motivo: se procesa. Con omisión y motivo vacío: `OMISION_SIN_MOTIVO`.
- Revisar la observación del cobro y la del préstamo, y el SQL 390.
