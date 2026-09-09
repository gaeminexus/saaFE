# Contrato — tres columnas nuevas en el informe mensual de préstamos (CCPM)

**Equipo:** `omen-saa-1` (omen1) · **Fecha:** 2026-09-09 · **Pedido por:** el usuario, urgente.
**Verificado contra el código, no contra documentación.**

---

## 1. Qué se pide y por qué

El informe mensual de préstamos (CCPM) hoy identifica al partícipe **solo por la cédula**. Se
agregan tres datos: **nombre**, **fecha de vencimiento del préstamo** y **monto solicitado**.

**Es un cambio ADITIVO.** No se quita ni se renombra ningún campo existente, no cambia ninguna
ruta y no cambia ningún tipo. Un cliente viejo sigue funcionando contra el payload nuevo.

## 2. ⛔ Lo primero: el orden de despliegue no es negociable

| Paso | Qué | Quién |
|---|---|---|
| 1 | Correr `crd/sql/220_DDL_CCPM_TRES_COLUMNAS.sql` contra la base | el usuario |
| 2 | Leer su bloque 3: tienen que salir **exactamente 3 filas** | el usuario |
| 3 | Recién entonces, desplegar el WAR | |

**Por qué en ese orden:** Hibernate incluye toda columna `@Column` en el `SELECT` que genera. Con
el WAR arriba y la tabla sin las columnas, **cualquier** lectura del CCPM revienta con `ORA-00904`
— no solo los campos nuevos: la pantalla entera de informes mensuales de crédito. Es el accidente
del 2026-09-08 con `CRD.CFCR`, que dejó los G40–G51 de agosto sin salir y se manifestó como un
`STATUS_MARKED_ROLLBACK` que no nombraba la causa. Tercera vez en nueve días.

## 3. Los tres campos

| Campo JSON | Columna | Tipo JSON | Origen — verificado en el código |
|---|---|---|---|
| `razonSocial` | `CCPMRZSC` VARCHAR2(2000) | `string \| null` | `prestamo.getEntidad().getRazonSocial()` — `CRD.ENTD.ENTDRZNS` |
| `fechaVencimiento` | `CCPMFCVN` DATE | `array Jackson` | `prestamo.getFechaFin()` — `CRD.PRST.PRSTFCFN` |
| `montoSolicitado` | `CCPMMNSL` NUMBER(18,2) | `number \| null` | `prestamo.getMontoSolicitado()` — `CRD.PRST.PRSTMNSL` |

### 3.1 `fechaVencimiento` es el vencimiento de la ÚLTIMA CUOTA

No es un campo suelto ni una fecha administrativa. `PrestamoServiceImpl:568-575` recorre los
detalles de la tabla de amortización y se queda con la última `fechaVencimiento`; lo reescribe
tanto en el alta normal (`:575`) como en la carga por Excel (`:815`), así que está poblado también
en la cartera migrada.

### 3.2 ⚠️ `montoSolicitado` puede venir vacío, y es una decisión tomada con eso sabido

**Ninguna línea del backend escribe `montoSolicitado`.** Se buscó `setMontoSolicitado(` en todo
`src/main/java`: aparece solo en la entidad y en un mapper del app móvil que lo *lee*. Llega tal
cual del JSON del frontend al dar de alta el préstamo, y el camino de carga por Excel —por donde
entró toda la cartera migrada— tampoco lo setea.

El usuario eligió este campo el 2026-09-09 **con la advertencia sobre la mesa**. El bloque 1 del
`sql/220` mide cuántos préstamos vivos lo tienen en NULL o en 0; si sale mayoritariamente vacío,
la decisión se revisa antes de que el informe salga con una columna en blanco.

⚠️ **Para el frontend esto no es teórico:** la columna tiene que renderizar el vacío como vacío,
nunca como `0`. Un cero en un informe financiero se lee como un dato, no como un faltante.

### 3.3 Formato de fecha — la trampa de Jackson

`fechaVencimiento` es un `LocalDate` y **Jackson lo serializa como arreglo**: `[2026,8,10]`, no
`"2026-08-10"`. Es el mismo formato que ya trae `fechaPrestamo` y `fechaExigibilidad` en este
mismo payload, así que la pantalla ya sabe manejarlo (`esFecha: true` en la definición de
columnas). No inventar un parseo nuevo: copiar el de `fechaPrestamo`.

## 4. Endpoints — NINGUNO cambia

Application path `/rest`. La clase es `@Path("ccpm")`.

```
GET    /SaaBE/rest/ccpm/getAll
GET    /SaaBE/rest/ccpm/getId/{id}
POST   /SaaBE/rest/ccpm                    (saveSingle)
DELETE /SaaBE/rest/ccpm/{id}
POST   /SaaBE/rest/ccpm/selectByCriteria   (body: List<DatosBusqueda>)
```

Los tres campos aparecen en la respuesta de todos ellos, porque el CCPM se serializa como entidad
JPA directa (no hay capa de DTO en este proyecto).

## 5. Qué NO se toca

- **`RPR.CG48` y el generador del G48.** El G48 es el reporte **regulatorio** que va a la
  Superintendencia y tiene estructura fija. El CCPM es el informe **interno** que comparte su
  lógica base. Agregar columnas acá no lo afecta, y no hay que "sincronizarlos".
- **`RPR.HMCP` (`HistoricoCCPM`).** Ya hoy no espeja `CCPMFCPR`, la columna que se agregó al CCPM
  antes que estas tres. Se mantiene ese precedente a propósito: el histórico guarda el juego de
  columnas con el que nació.
- **`CPRM` y `CJBM`**, los otros dos informes mensuales. `CPRM` es de aportes por partícipe y
  `CJBM` de jubilados; ninguno reporta operaciones de crédito.

## 6. Pantalla

`saaFE/src/app/modules/rpr/forms/informes-mensuales-credito/`, arreglo `colsCCPM` (línea ~145).
El modelo es `rpr/model/ccpm.ts`. Las columnas se declaran con `{ campo, header, esNumero?,
esFecha? }` y el orden del arreglo **es** el orden en pantalla y en el CSV exportado.
