# API — Reestructuración y novación de créditos

**Estado:** CONGELADO 2026-10-13 · **Dueño:** `omen-saa-1` · **Diseño:** `DISENO-REESTRUCTURACION-NOVACION.md` (RN1–RN14), solo en saaBE.
**Espejo:** `saaFE/docs/crd/API-REESTRUCTURACION-NOVACION.md`. Base `/SaaBE/rest`. Fechas `yyyy-MM-dd`.

---

## 1. La pantalla: Créditos → Préstamos → Ingreso

- Campo nuevo **Tipo de operación**: `NUEVO` (por defecto, como hoy), `REESTRUCTURACION` o `NOVACION`.
- Con R o N, después de elegir el partícipe, se elige el **préstamo original** de una lista que da §2.
  Al elegirlo, la pantalla muestra el **valor de sustitución** con su desglose, y además:
  - **R:** pone el **monto = VS**, de solo lectura, y propone el producto RESTRUCTURADO;
  - **N:** exige un **monto > VS**, muestra el **desembolso neto = monto − VS** y propone el producto NOVACION.
- Guardar, generar la tabla y Aprobar funcionan igual que en un préstamo nuevo. El mensaje de éxito
  al aprobar dice además «Préstamo original N° X cancelado».

## 2. `GET /prst/sustituibles/{idEntidad}?tipo=REESTRUCTURACION|NOVACION`

Los préstamos del partícipe que se pueden reestructurar o novar a hoy, cada uno con su VS:

```json
[{ "idPrestamo": 5555, "idAsoprep": 70123, "producto": "EMERGENTE", "familia": "QUIROGRAFARIO",
   "estado": 11, "puede": true, "motivo": null,
   "valorSustitucion": 4210.55,
   "desglose": { "capital": 3980.00, "interes": 180.20, "mora": 35.35, "seguros": 15.00 },
   "productoSugerido": { "idProducto": 3, "nombre": "EMERGENTE RESTRUCTURADO" } }]
```

Los préstamos que no se pueden usar vienen con `puede: false` y un `motivo`, por ejemplo: más de 60
días vencido (R); con atrasos (N); de una familia sin plantilla (N prendario o hipotecario); con un
cobro en trámite.

## 3. Guardar — `POST`/`PUT /prst`, campos nuevos en el `Prestamo`

| Campo | Columna | Quién lo escribe |
|---|---|---|
| `idPrestamoOriginal` | `PRSTPROR` | El FE en el alta con R o N. El servidor valida RN4, RN9 y RN10 y que el original sea del mismo partícipe. |
| `valorSustitucion` | `PRSTVLSS` | **El servidor**, al aprobar. Lo que mande el cliente se ignora. |
| `reestructurado` / `esNovacion` / `montoNovacion` | ya existían | **El servidor**, según el tipo. |

Error **422** con `mensaje` si el original no se puede usar, si el producto no es de la familia, o si
el monto no cumple RN7 o RN8.

## 4. Aprobar — `POST /prst/aprobar/{id}`, sin cambios de cuerpo

Si el préstamo tiene `idPrestamoOriginal`, en la misma transacción:
1. recalcula el VS;
2. valida RN7 (R: monto = VS) o RN8 (N: neto > 0);
3. cancela el original (RN11);
4. arma **un solo asiento** con el traslado (diseño §3);
5. **N:** la orden de desembolso va por el **neto**; **R:** no hay orden de desembolso.

**422** si el VS cambió y es R: «El saldo del original cambió a $X; regenere la tabla con ese monto».

## 5. Estados

`5 CANCELADO_POR_NOVACION` y **`13 CANCELADO_POR_REESTRUCTURACION`** (nuevo) para el original. El FE
agrega el 13 a su mapa de estados.

## 6. Impresos

La tabla (`RPRT_TBLA_ACML`) y el pagaré (`RPRT_PRST_PGRE`) del préstamo nuevo funcionan igual.
