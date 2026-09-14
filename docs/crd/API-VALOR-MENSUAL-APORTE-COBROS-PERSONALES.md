# API — Valor mensual de aportes en «Cobros personales» (H62)

**Fecha:** 2026-09-14 · **Árbitro:** `omen-saa-1-arb` · **Sólo frontend**: el endpoint ya existe y no
cambia.

## 1. El defecto

`cobros-personales.component.ts:668-672` toma el valor mensual de cesantía y jubilación de
**`CRD.HDAP`** (`/rest/hdap/selectByCriteria` por cédula, mayor `idCarga`). **Nadie escribe `HDAP`**:
es una foto cargada una vez desde afuera. Caso real: contrato y HSTR con **129,95**, pantalla con
**51,98**.

## 2. La fuente correcta — decisión del usuario (2026-09-14): el CONTRATO

> *«compáralo con el proceso de generación de archivo petro, ya que ese lee incluso de la tabla de
> contratos (que es lo correcto) no de la tabla HSTR»*

El valor mensual de un tipo de aporte es el **monto de la vigencia de contrato que rige en el mes**,
con **la misma regla** que usa la generación del archivo Petro en su camino por contratos
(`GeneracionArchivoPetroServiceImpl.recopilarAportesPorFaltante` →
`VigenciaContratoService.esperadoEnLotePorFilial`, que replica
`VigenciaContratoDaoServiceImpl.selectVigenteEnFecha:82-92`):

```
contrato   = el ACTIVO de la entidad con mayor código        (ContratoDaoServiceImpl.selectActivoPorEntidad)
vigencia   = la de ese contrato y ese tipo de aporte con
               estado == 1 (ACTIVO)
               fechaInicio <= fechaRef
               fechaFin == null  ||  fechaFin >= fechaRef
fechaRef   = ÚLTIMO DÍA DEL MES EN CURSO (la generación evalúa contra el último día del mes del período)
valor      = vigencia.monto
```

Tipos de aporte: **11 = cesantía**, **9 = jubilación** (`ID_TIPO_APORTE` en
`saaFE/src/app/modules/crd/model/vigencia-contrato.ts`).

## 3. El endpoint — ya existe, verificado contra el código

`GET /rest/cntr/porEntidad/{idEntidad}` (`ContratoRest.porEntidad:151`). En el frontend ya está
`VigenciaContratoService.porEntidad(idEntidad)`, que devuelve un `ContratoPorEntidadDTO`.

- `200` con el DTO, aunque la entidad **no tenga contrato activo**: en ese caso `idContrato`,
  `montoCesantia` y `montoJubilacion` vienen `null` y `vigencias` viene `[]`. No es un error.
- `404` si la entidad no existe; `500` ante un error de base.
- `vigencias` trae **todas** las vigencias del contrato, **incluidas las anuladas** (el DAO no filtra
  por estado, `VigenciaContratoDaoServiceImpl:55-56`). Hay que filtrar `estado === 1`.
- ⚠️ `fechaInicio` / `fechaFin` pueden llegar como `"yyyy-MM-dd"` **o como arreglo `[y, m, d]`**
  (Jackson, ver `CLAUDE.md` §Serialización). Patrón que ya existe:
  `contrato-edit.component.ts` → `aTexto()` (líneas ~255-261).
- `montoCesantia` / `montoJubilacion` del DTO son el **espejo de la vigencia ABIERTA**
  (`VigenciaContratoServiceImpl.actualizarEspejo:301`). **No usarlos:** una vigencia abierta con
  `fechaInicio` futura ya está en el espejo y todavía no rige este mes. La regla del §2 sí lo
  distingue.

## 4. Lo que la pantalla muestra

| Situación | Columna «Valor mensual» | Mensaje de cobertura |
|---|---|---|
| Hay vigencia que rige | el monto | igual que hoy |
| Contrato activo sin vigencia que rija para ese tipo | `Sin vigencia` (texto, no `0,00`) | no se muestra |
| Sin contrato activo | `Sin contrato` | no se muestra |
| Falla la consulta | `No disponible` | no se muestra |

`0,00` y «no se sabe» no pueden verse igual: el operador decide cuánto cobrar mirando esa columna.

## 5. Trampa — qué usa HOY la generación en producción

La generación tiene **dos caminos** detrás del flag `CRD_GENERACION_POR_FALTANTE` (rubro 242,
`ConfiguracionGeneracionAportesService.porFaltanteActiva`), **apagado por defecto**:

- **apagado** → `recopilarAportesPorHistorialSueldo`: monto de **`CRD.HSTR` con estado 99**;
- **encendido** → `recopilarAportesPorFaltante`: **vigencias de contrato** (la regla del §2).

La **carga** del archivo Petro (`CargaArchivoPetroServiceImpl:4462`, `:4913`) usa **HSTR 99** siempre.
Mientras el flag esté apagado, la pantalla (contrato) y el archivo generado (HSTR) pueden mostrar
montos distintos para un mismo socio si HSTR y la vigencia no coinciden. El estado del flag se consulta
con `GET /rest/cnfg/generacionPorFaltanteAh`.
