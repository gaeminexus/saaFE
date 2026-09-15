# API — Observación adicional al registrar un documento CXP

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-15 · **Estado:** congelado
**Diseño:** `saaBE/docs/logica-negocio/cxp/PLAN-OBSERVACION-ASIENTO-DOCUMENTOS-CXP.md`
**Espejo:** `saaFE/docs/cxp/API-OBSERVACION-ADICIONAL-REGISTRO-CXP.md`

> ⛔ **Orden de despliegue: `e2-48` → WAR → FE.** Sin la columna, toda lectura de `DocumentoCxp` da
> `ORA-00904`. El FE nuevo contra un WAR viejo no rompe: la clave nueva se ignora.

---

## 1. Registrar — endpoint existente, un campo nuevo opcional

```
POST /SaaBE/rest/carga-documentos/registrarBD/{idDocumentoCxp}
```

```json
{
  "idEmpresa": 1236,
  "idUsuario": 17,
  "esIntermediario": false,
  "idProductoIntermediario": null,
  "observacionAdicional": "Compra autorizada por memo 45-2026"
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `observacionAdicional` | `string`, opcional | Hasta **500 caracteres**. Ausente, `null` o sólo espacios → se guarda **nulo**. El backend hace `trim` |

**Semántica:** cada llamada a `registrarBD` **reemplaza** la observación guardada con lo que llega. Si
se registra sin la casilla, queda nula aunque un intento anterior la hubiera guardado.

## 2. Respuestas

Sin cambios respecto de hoy (el mismo `200` / `422` de `registrarBD`), más un caso:

| Caso | HTTP | Cuerpo |
|---|---|---|
| Más de 500 caracteres | `422` | `{ "error": "La observación adicional admite hasta 500 caracteres (se recibieron N).", "tipo": "ERROR_REGISTRO" }` — **no se graba nada** |

## 3. Dónde queda

- `DocumentoCxp.observacionAdicional` (`PGS.DCXP.DCXPOBAD`). Viaja en todo JSON de `DocumentoCxp`
  (`/documento/{id}`, `/resumen/{idCargaTxt}`), `null` si no tiene.
- ⚠️ **No confundir con `DocumentoCxp.observacion`** (`DCXPOBSR`): ésa la escribe el sistema (motivos de
  anulación, productos pendientes…) y cambia sola. **Nunca** mandar la observación del usuario ahí.

## 4. Qué hace con el asiento

Todo asiento generado para ese documento —al registrar, al completar productos pendientes, al
contabilizar un reembolso o al recontabilizar— termina en ` | {observacionAdicional}` si la tiene.

## 5. Trampas para el frontend

- **El texto se manda sólo si la casilla está marcada.** Casilla desmarcada → no mandar el campo (o `null`),
  aunque el textarea conserve texto de antes.
- Casilla marcada con el texto vacío: no se puede confirmar. Si no, el usuario cree haber agregado una
  observación y se guarda nula.
- `maxlength="500"` en el textarea **y** contador visible `n/500`.
- La pantalla `bandeja-electronica` registra sin diálogo: **no** lleva esta opción (límite conocido, §2.6
  del diseño).
