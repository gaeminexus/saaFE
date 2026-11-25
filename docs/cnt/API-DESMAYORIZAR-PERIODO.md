# Desmayorizar un período mayorizado sin cierre contable — contrato de API

**Origen:** 6.5 del cuadre (DS-21). **Estado:** backend programado en el lote 5 (compila; sin probar contra Oracle ni desplegado).
Va junto con `cnt/sql/omen1-02-hcpr-accion-desmayorizar.sql`, que hay que correr ANTES del EAR.

## Para qué

Un período MAYORIZADO que **no** tiene cierre contable no se puede «reabrir» (`POST /prdo/reabrir` exige que esté cerrado) y la
desmayorización de siempre (`GET /myrz/desmayorizacion/...`) falla si `PRDO.PRDOMYRZ` apunta a una mayorización que ya no existe
(referencia colgante): `NoResultException` y toda la transacción se revierte. Este endpoint cubre ese caso.

El ciclo de estados del período (`EstadoPeriodos`): 1 ACTIVO → 2 MAYORIZADO → 3 DESMAYORIZADO. El cierre contable (C17) es aparte
(`PRDOCNCR`, `POST /prdo/cerrar` y `/prdo/reabrir`).

## Endpoint

```
POST /rest/prdo/desmayorizar?idEmpresa=1236&anio=2025&mes=12&usuario=jperez&ip=10.0.0.5&motivo=...
```

| Parámetro | Obligatorio | Qué es |
|---|---|---|
| `idEmpresa`, `anio`, `mes` | sí | El período (mes 1 a 12) |
| `usuario` | sí | Usuario que ejecuta; se valida (U-2) |
| `motivo` | sí | Queda en la bitácora CNT.HCPR |
| `ip` | no | Para la bitácora |

Mismo permiso que `POST /prdo/reabrir`. El GET viejo `/myrz/desmayorizacion/{empresa}/{periodoDesde}/{periodoHasta}/{proceso}` sigue
como está.

## Qué hace

1. Rechaza si el período tiene **cierre contable**: «reábralo primero (POST /prdo/reabrir)».
2. Rechaza si el período **no está MAYORIZADO**.
3. Si `PRDOMYRZ` apunta a una mayorización que existe: desmayoriza por la vía de siempre (respaldo de saldos MYRH/DTMH, asientos
   desvinculados, mayorización eliminada).
4. Si `PRDOMYRZ` es nulo o apunta a una mayorización inexistente (**referencia colgante**): desvincula los asientos que apunten a
   ella, limpia la referencia y deja el período en DESMAYORIZADO, sin respaldar nada.
5. Registra en CNT.HCPR: tipo `CONTABLE`, acción `DESMAYORIZAR`, con usuario, ip y motivo (con el id colgante si lo hubo).

Todo en una transacción: si algo falla, no queda nada a medias.

## Respuesta 200

```json
{
  "idEmpresa": 1236,
  "anio": 2025,
  "mes": 12,
  "estadoAnterior": 2,
  "estadoNuevo": 3,
  "referenciaColgante": true,
  "mensaje": "Período 2025-12 desmayorizado: la mayorización 4567 ya no existía; solo se limpió la referencia."
}
```

## Errores

Errores de negocio: **400** con el mensaje de texto (el mismo formato que `/prdo/cerrar` y `/prdo/reabrir`); usuario inválido: **400**
«No se puede procesar sin un usuario válido: ...»; cualquier otro: **500**.

| Caso | Mensaje (resumen) |
|---|---|
| Sin motivo | «El motivo de la desmayorización es obligatorio…» |
| Período cerrado | «…está CERRADO: reábralo primero (POST /prdo/reabrir)…» |
| No mayorizado | «…no está MAYORIZADO (estado N): no hay nada que desmayorizar.» |
| Período inexistente | «No existe el período contable AAAA-MM en la empresa…» |

## FE

En la pantalla de estado del período (`GET /rest/prdo/estado/{idEmpresa}/{anio}/{mes}` ya existe): mostrar el botón **«Desmayorizar»**
cuando `estadoMayorizacion` = 2 (MAYORIZADO) y `estado` = «ABIERTO» (sin cierre contable). Pide el motivo (obligatorio), llama el POST
y refresca el estado. Si `referenciaColgante` es true, mostrar el `mensaje` como aviso. La bitácora (`GET /rest/prdo/bitacora/{idEmpresa}`)
mostrará acciones `DESMAYORIZAR` además de `CIERRE` y `REAPERTURA`.

## Antes de desplegar

- `cnt/sql/omen1-02-hcpr-accion-desmayorizar.sql`: amplía `CK_HCPR_ACCION` (con controles antes y después y el reverso comentado). Sin
  él, el INSERT de la bitácora falla con ORA-02290 y la desmayorización se revierte.
