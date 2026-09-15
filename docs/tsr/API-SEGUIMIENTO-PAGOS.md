# API — Seguimiento de un pago

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-15 · **Estado:** congelado para la Fase B/C
**Diseño:** `saaBE/docs/logica-negocio/tsr/PLAN-SEGUIMIENTO-PAGOS.md`
**Espejo:** `saaFE/docs/tsr/API-SEGUIMIENTO-PAGOS.md`

Sin DDL. Endpoints **nuevos** en `PagoProgramadoRest` (`@Path("pgtr")`), sólo lectura. Las acciones (anular, revertir)
usan los endpoints **que ya existen**.

---

## 1. Buscar

```
GET /SaaBE/rest/pgtr/seguimiento?numero=123
GET /SaaBE/rest/pgtr/seguimiento?texto=AYALA
GET /SaaBE/rest/pgtr/seguimiento?origen=CRD_DEVOLUCION_APORTE&idOrigen=45
```

| Param | Regla |
|---|---|
| `numero` | `PGTRCDGO` exacto |
| `texto` | mismo criterio que `GET /pgtr/listar?texto=` (observación, beneficiario, titular) + número de factura/liquidación. Mínimo 3 caracteres |
| `origen` + `idOrigen` | los dos juntos; `origen` es la clave del origen (tabla §3) |
| `idEmpresa` | opcional |

Exactamente **uno** de `numero`, `texto`, o el par `origen`+`idOrigen`; si no → `400 {"mensaje": "..."}`.

**Respuesta `200`:** arreglo de `ResumenSeguimientoPago` (máx. 50, más reciente primero). Sin resultados → `200 []`
(**no** error).

```json
[{ "idPago": 123, "estado": 1, "estadoTexto": "REGISTRADO", "valor": 450.00,
   "fechaProgramada": "2026-09-15", "beneficiario": "AYALA NARANJO JUAN PABLO",
   "origen": "FACTURA_COMPRA", "origenTexto": "Factura de compra", "concepto": "Factura 001-001-000000123" }]
```

## 2. Detalle

```
GET /SaaBE/rest/pgtr/seguimiento/{idPago}
```

`404 {"mensaje": "No existe el pago N° {id}"}` si no existe (**no** 500).

```json
{
  "pago": {
    "idPago": 123, "estado": 2, "estadoTexto": "EN_ARCHIVO",
    "formaPago": 2, "formaPagoTexto": "Transferencia",
    "valor": 450.00, "fechaProgramada": "2026-09-15",
    "beneficiario": "AYALA NARANJO JUAN PABLO", "identificacionBeneficiario": "2100142914001",
    "concepto": "Factura 002-001-000000610", "observacion": "…",
    "cuentaOrigen": "Pichincha 2200…", "cuentaDestino": "Pacífico 1045…",
    "motivo": null, "referenciaBanco": null, "fechaRespuesta": null,
    "lote": { "idLote": 31, "nombreArchivo": "PAC_20260915.xlsx", "estado": 1, "estadoTexto": "GENERADO" },
    "asiento": { "codigo": 9811, "numeroAlterno": "2026-09-000812" }
  },
  "origen": {
    "clave": "FACTURA_COMPRA", "texto": "Factura de compra", "idOrigen": 610,
    "resuelto": true,
    "documento": { "numero": "002-001-000000610", "estado": 1, "estadoTexto": "Pendiente",
                   "fecha": "2026-09-07", "total": 37.50 },
    "ruta": "/menucuentaxpagar/pagos/solicitud"
  },
  "etapas": [
    { "clave": "ORIGEN",      "texto": "Factura registrada",        "situacion": "HECHA" },
    { "clave": "POR_APROBAR", "texto": "Aprobación de tesorería",   "situacion": "HECHA" },
    { "clave": "REGISTRADO",  "texto": "Archivo del banco",         "situacion": "HECHA" },
    { "clave": "EN_ARCHIVO",  "texto": "Respuesta del banco",       "situacion": "ACTUAL",
      "ruta": "/menutesoreria/pagos/confirmacion" },
    { "clave": "CONFIRMADO",  "texto": "Pagado",                    "situacion": "PENDIENTE" }
  ],
  "acciones": {
    "rutaEtapaActual": "/menutesoreria/pagos/confirmacion",
    "puedeAnular": true,  "motivoNoAnular": null,
    "puedeRevertir": false, "motivoNoRevertir": "Sólo se revierte un pago CONFIRMADO."
  }
}
```

| Campo | Regla |
|---|---|
| `lote`, `asiento`, `documento`, `ruta` | `null` si no aplica |
| `origen.resuelto` | `false` → el origen no tiene resolutor: `documento = null`, la pantalla muestra «origen sin detalle» |
| `etapas[].situacion` | `HECHA` · `ACTUAL` · `PENDIENTE`. En RECHAZADO/ANULADO la última etapa alcanzada es `ACTUAL` y se agrega `{clave:"RECHAZADO"|"ANULADO", situacion:"ACTUAL"}` |
| `acciones.puedeAnular` | mismas reglas que `POST /pgtr/anular/{id}` (hoy: estado 0/1/2 y no cheque) |
| `acciones.puedeRevertir` | mismas reglas que `POST /pgtr/revertirConfirmado/{id}` (hoy: estado 3) |
| fechas | `yyyy-MM-dd` como texto (no arreglo de Jackson) |

## 3. Orígenes y pantalla de la etapa previa (`origen.ruta`)

| `clave` | Documento | `ruta` |
|---|---|---|
| `FACTURA_COMPRA` / `NOTA_VENTA` (FCTC tipo 02) | PGS.FCTC | `/menucuentaxpagar/pagos/solicitud` |
| `LIQUIDACION_COMPRA` | PGS.LQCC | `/menucuentaxpagar/pagos/solicitud` |
| `EGRESO_TESORERIA` | TSR.EGRS | `/menutesoreria/procesos/registrar/egresos` |
| `ANTICIPO_PROVEEDOR` | PGS.ANTP | `/menutesoreria/procesos/anticipos/proveedores` |
| `TSR_CAJA_CHICA` | TSR.MVCH | `/menutesoreria/procesos/caja-chica/reposicion` |
| `CXC_DEVOLUCION_CLIENTE` | CBR.ANTC | `/menutesoreria/procesos/anticipos/seguimiento` |
| `RHH_NOMINA` | RHH.RDPG | `/menurecursoshumanos/procesos/ordenes-pago` |
| `RHH_BENEFICIO_SOCIAL` | RHH.ODBS | `/menurecursoshumanos/procesos/pago-beneficios-sociales` |
| `RHH_ANTICIPO_EMPLEADO` | RHH.ANTE | `/menurecursoshumanos/procesos/anticipos` |
| `RHH_PLANILLA_IESS` | RHH.PLIS | `/menurecursoshumanos/procesos/planillas-iess` |
| `CRD_DEVOLUCION_APORTE` | CRD.DVAP | `/menucreditos/devolucion-aportes` |
| `CRD_PENSION_COMPLEMENTARIA`, `CRD_SEGURO_JUBILADOS` | CRD.PGPC / sin documento | `/menucreditos/jubilados` |
| `CRD_DESEMBOLSO_PRESTAMO` | CRD.PRST | `/menucreditos/prestamo-edit` |

⚠️ **Las rutas son las de `saaFE app.routes.ts` al 2026-09-15.** El backend las devuelve como texto; si una ruta cambia en el
FE, cambia en el resolutor. `CRD_SEGURO_JUBILADOS` usa un `idOrigen` sintético (`anio*100+mes`): `documento` va `null` y
`resuelto: true`.

## 4. Acciones — endpoints existentes

| Botón | Llamada | Notas |
|---|---|---|
| Ir a la etapa | navegar a `acciones.rutaEtapaActual` (o `origen.ruta` si la etapa actual es el origen) | |
| Anular | `POST /rest/pgtr/anular/{idPago}` | pedir motivo; mostrar el mensaje del backend tal cual si rechaza |
| Revertir | `POST /rest/pgtr/revertirConfirmado/{idPago}` | pedir confirmación explícita: revierte contabilidad |

Después de cualquier acción, volver a pedir `GET /pgtr/seguimiento/{id}`.

## 5. Trampas

- **No** calcular en el FE si se puede anular: usar `acciones`.
- Un pago de **origen externo no tiene titular**: el beneficiario viene de `PGTRBFNM`/`PGTRBFID`.
- En nómina y beneficios el «beneficiario» es un texto («Nomina 8/2026 - 12 empleado(s)»), no una persona.
