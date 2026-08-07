# NEGOCIACIONES CON PROVEEDORES - CXP
## Documentación Técnica para Frontend

**Módulo:** Cuentas por Pagar (CXP)  
**Fecha:** 2026-07-20  
**Base URL API:** `{HOST}/saaBE/rest/`

---

## 1. DESCRIPCIÓN DEL PROCESO

El módulo de **Negociaciones con Proveedores** permite registrar y dar seguimiento a acuerdos comerciales formales con proveedores. El flujo completo es:

```
NEGOCIACION (cabecera)
    └── FORMA DE PAGO / CUOTAS (detalle de cuotas acordadas)
            └── PAGOS REALIZADOS (anticipos o pagos con factura)
    └── ADENDUMS (modificaciones al valor total)
    └── DOCUMENTOS DIGITALIZADOS (contratos, adendums escaneados)
```

### Flujo de uso típico:
1. Se crea la **negociación** indicando el proveedor, valor total, tipo de financiación y número de pagos.
2. Se registran las **cuotas** (forma de pago) indicando fecha, valor y/o porcentaje de cada pago.
3. Conforme se van realizando pagos, se registran en **PagoNegociacion** indicando si es anticipo o con factura.
4. Si se firman **adendums**, se registran indicando el valor del ajuste (+/-).
5. Los **documentos** (contratos, adendums escaneados) se digitalizan y asocian.

---

## 2. ESTRUCTURA DE TABLAS

### 2.1 `PGS.NGCP` — Negociación con Proveedor (Cabecera)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ID` | NUMBER | PK auto | Identificador único |
| `EMPRESA` | NUMBER | ✅ | FK → SCP.PJRQ — Empresa |
| `TITULAR` | NUMBER | ✅ | FK → TSR.TTLR — Proveedor (debe tener rol proveedor) |
| `FECHANEGOCIACION` | DATE | ✅ | Fecha en que se firmó/acordó la negociación |
| `FECHAINICIO` | DATE | ❌ | Fecha de inicio de vigencia |
| `FECHAFIN` | DATE | ❌ | Fecha estimada de finalización |
| `NUMCONTRATO` | VARCHAR2(200) | ❌ | Número de referencia del contrato físico |
| `DESCRIPCION` | VARCHAR2(2000) | ✅ | Objeto o descripción del negocio |
| `VALORTOTAL` | NUMBER(18,2) | ✅ | Valor total original pactado |
| `TIPOFINANCIACION` | VARCHAR2(50) | ❌ | `FIJO` \| `HITO` \| `PORCENTAJE` \| `UNICO` |
| `NUMEROPAGOS` | NUMBER(5) | ❌ | Número total de cuotas acordadas |
| `OBSERVACION` | VARCHAR2(2000) | ❌ | Observaciones adicionales |
| `ESTADO` | NUMBER(1) | ✅ | `1`=Activa, `0`=Inactiva, `2`=Suspendida |
| `USUARIO` | NUMBER | ✅ | FK → SCP.PJRQ — Usuario que registra |
| `FECHAREGISTRO` | TIMESTAMP | ✅ | Fecha/hora de registro (sistema) |
| `USUARIOMODIF` | NUMBER | ❌ | FK → SCP.PJRQ — Usuario que modifica |
| `FECHAMODIF` | TIMESTAMP | ❌ | Fecha/hora de última modificación |

**Valores de `TIPOFINANCIACION`:**
| Valor | Descripción |
|---|---|
| `FIJO` | Pagos fijos periódicos (ej: mensual, trimestral) |
| `HITO` | Pagos por hitos o entregables |
| `PORCENTAJE` | Pagos como porcentaje del total (ej: 40%, 30%, 30%) |
| `UNICO` | Un solo pago al final |

---

### 2.2 `PGS.FPNG` — Forma de Pago / Cuotas de Negociación

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ID` | NUMBER | PK auto | Identificador único |
| `NEGOCIACION` | NUMBER | ✅ | FK → PGS.NGCP |
| `NUMEROCUOTA` | NUMBER(5) | ✅ | Número secuencial de la cuota (1, 2, 3...) |
| `DESCRIPCION` | VARCHAR2(1000) | ❌ | Descripción del hito/cuota (ej: "Anticipo inicial", "Entrega parcial") |
| `FECHAPAGO` | DATE | ❌ | Fecha acordada para el pago |
| `PORCENTAJE` | NUMBER(6,2) | ❌ | % del total que representa (para tipo PORCENTAJE) |
| `VALORCUOTA` | NUMBER(18,2) | ✅ | Valor monetario de la cuota |
| `ESTADO` | NUMBER(1) | ✅ | `1`=Pendiente, `2`=Pago parcial, `3`=Pagado total, `0`=Anulado |
| `ORDEN` | NUMBER(5) | ❌ | Orden de visualización |

> **Nota:** Para negociaciones tipo `PORCENTAJE`, enviar tanto `PORCENTAJE` como `VALORCUOTA` (el valor calculado). Ejemplo: 40% de $100,000 = `PORCENTAJE: 40`, `VALORCUOTA: 40000`.

---

### 2.3 `PGS.PGNG` — Pagos Realizados sobre Cuotas

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ID` | NUMBER | PK auto | Identificador único |
| `FORMAPAGO` | NUMBER | ✅ | FK → PGS.FPNG — Cuota a la que se aplica el pago |
| `FECHAPAGO` | DATE | ✅ | Fecha en que se realizó el pago |
| `VALORPAGO` | NUMBER(18,2) | ✅ | Valor del pago |
| `DESCRIPCION` | VARCHAR2(1000) | ❌ | Observación del pago |
| `TIPOPAGO` | VARCHAR2(50) | ✅ | `ANTICIPO` \| `FACTURA` |
| `FACTURACOMPRA` | NUMBER | ❌ | FK → PGS.FCTC — Factura asociada (si ya existe) |
| `FACTURADO` | NUMBER(1) | ✅ | `1`=El valor ya tiene factura del proveedor, `0`=Sin factura aún |
| `PAGADO` | NUMBER(1) | ✅ | `1`=Pago liquidado/cancelado, `0`=Pendiente de liquidar |
| `REFCOMPROBANTE` | VARCHAR2(200) | ❌ | N° de transferencia, cheque u otro comprobante |
| `ESTADO` | NUMBER(1) | ✅ | `1`=Activo, `0`=Anulado |
| `USUARIO` | NUMBER | ✅ | FK → SCP.PJRQ — Usuario que registra |
| `FECHAREGISTRO` | TIMESTAMP | ✅ | Fecha/hora de registro (sistema) |

**Lógica de negocio de `TIPOPAGO`:**

| Escenario | `TIPOPAGO` | `FACTURADO` | `PAGADO` | `FACTURACOMPRA` |
|---|---|---|---|---|
| Se entregó anticipo, sin factura aún | `ANTICIPO` | `0` | `0` | null |
| Anticipo ya tiene factura del proveedor | `ANTICIPO` | `1` | `0` | ID_FACTURA |
| Pago completo con factura cancelada | `FACTURA` | `1` | `1` | ID_FACTURA |
| Pago con factura pero aún sin cancelar | `FACTURA` | `1` | `0` | ID_FACTURA |

---

### 2.4 `PGS.ADNG` — Adendums de Negociación

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ID` | NUMBER | PK auto | Identificador único |
| `NEGOCIACION` | NUMBER | ✅ | FK → PGS.NGCP |
| `NUMADENDUM` | VARCHAR2(200) | ❌ | Número o referencia del adendum (ej: "ADENDUM-001") |
| `FECHAADENDUM` | DATE | ✅ | Fecha de firma del adendum |
| `DESCRIPCION` | VARCHAR2(2000) | ✅ | Motivo o razón del adendum |
| `VALORAJUSTE` | NUMBER(18,2) | ✅ | Valor del ajuste: **positivo** = incremento, **negativo** = reducción |
| `VALORTOTALRESULTANTE` | NUMBER(18,2) | ✅ | Valor total de la negociación tras este adendum |
| `OBSERVACION` | VARCHAR2(2000) | ❌ | Observaciones adicionales |
| `ESTADO` | NUMBER(1) | ✅ | `1`=Activo, `0`=Anulado |
| `USUARIO` | NUMBER | ✅ | FK → SCP.PJRQ — Usuario que registra |
| `FECHAREGISTRO` | TIMESTAMP | ✅ | Fecha/hora de registro (sistema) |

> **Cálculo del frontend:** `VALORTOTALRESULTANTE = valor_total_vigente_anterior + VALORAJUSTE`

---

### 2.5 `PGS.PTNG` — Documentos Digitalizados

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `ID` | NUMBER | PK auto | Identificador único |
| `NEGOCIACION` | NUMBER | ✅ | FK → PGS.NGCP |
| `PATH` | VARCHAR2(1000) | ✅ | Ruta/URL del archivo digitalizado |
| `NOMBREDOC` | VARCHAR2(500) | ❌ | Nombre descriptivo del documento |
| `TIPODOC` | VARCHAR2(50) | ❌ | `CONTRATO` \| `ADENDUM` \| `ANEXO` \| `OTRO` |
| `PRINCIPAL` | NUMBER(1) | ❌ | `1`=Documento principal (contrato), `0`=Complementario |
| `ADENDUM` | NUMBER | ❌ | FK → PGS.ADNG — Si pertenece a un adendum específico |

---

## 3. ENDPOINTS REST

**Base URL:** `{HOST}/saaBE/rest/`  
**Content-Type:** `application/json`

---

### 3.1 Negociación con Proveedor — `/ngcp`

#### GET `/ngcp/getAll`
Obtiene todas las negociaciones registradas.
```
GET {BASE_URL}/ngcp/getAll
```
**Response 200:**
```json
[
  {
    "id": 1,
    "empresa": { "pjrqcdgo": 1 },
    "titular": { "ttlrcdgo": 25 },
    "fechaNegociacion": "2026-03-15",
    "fechaInicio": "2026-04-01",
    "fechaFin": "2026-12-31",
    "numContrato": "CONT-2026-001",
    "descripcion": "Suministro de materiales de construcción",
    "valorTotal": 100000.00,
    "tipoFinanciacion": "PORCENTAJE",
    "numeroPagos": 3,
    "observacion": null,
    "estado": 1,
    "usuario": { "pjrqcdgo": 5 },
    "fechaRegistro": "2026-03-15T10:30:00",
    "usuarioModif": null,
    "fechaModif": null
  }
]
```

#### GET `/ngcp/getId/{id}`
Obtiene una negociación por ID.
```
GET {BASE_URL}/ngcp/getId/1
```

#### GET `/ngcp/getByCriteria`
Busca negociaciones por criterios. Enviar array de criterios en el body.
```
GET {BASE_URL}/ngcp/getByCriteria
Body: [{"campo": "empresa.pjrqcdgo", "valor": "1", "operador": "="}]
```

#### POST `/ngcp`
Crea una nueva negociación.
```
POST {BASE_URL}/ngcp
```
**Body:**
```json
{
  "empresa": { "pjrqcdgo": 1 },
  "titular": { "ttlrcdgo": 25 },
  "fechaNegociacion": "2026-07-20",
  "fechaInicio": "2026-08-01",
  "fechaFin": "2026-12-31",
  "numContrato": "CONT-2026-045",
  "descripcion": "Construcción de bodega sector norte",
  "valorTotal": 150000.00,
  "tipoFinanciacion": "PORCENTAJE",
  "numeroPagos": 3,
  "observacion": "Incluye materiales y mano de obra",
  "estado": 1,
  "usuario": { "pjrqcdgo": 5 },
  "fechaRegistro": "2026-07-20T08:00:00"
}
```
**Response 201:** Objeto creado con `id` generado.

#### PUT `/ngcp`
Actualiza una negociación existente (debe incluir `id`).
```
PUT {BASE_URL}/ngcp
```
**Response 200:** Objeto actualizado.

#### DELETE `/ngcp/delete/{id}`
Elimina una negociación.
```
DELETE {BASE_URL}/ngcp/delete/1
```

---

### 3.2 Cuotas / Forma de Pago — `/fpng`

#### GET `/fpng/getByCriteria`
Obtener todas las cuotas de una negociación específica.
```
GET {BASE_URL}/fpng/getByCriteria
Body: [{"campo": "negociacion.id", "valor": "1", "operador": "="}]
```
**Response 200:**
```json
[
  {
    "id": 1,
    "negociacion": { "id": 1 },
    "numeroCuota": 1,
    "descripcion": "Primer pago - 40% inicial",
    "fechaPago": "2026-08-01",
    "porcentaje": 40.00,
    "valorCuota": 60000.00,
    "estado": 1,
    "orden": 1
  },
  {
    "id": 2,
    "negociacion": { "id": 1 },
    "numeroCuota": 2,
    "descripcion": "Segundo pago - 30%",
    "fechaPago": "2026-10-01",
    "porcentaje": 30.00,
    "valorCuota": 45000.00,
    "estado": 1,
    "orden": 2
  },
  {
    "id": 3,
    "negociacion": { "id": 1 },
    "numeroCuota": 3,
    "descripcion": "Tercer pago - 30% final",
    "fechaPago": "2026-12-01",
    "porcentaje": 30.00,
    "valorCuota": 45000.00,
    "estado": 1,
    "orden": 3
  }
]
```

#### POST `/fpng`
Crea una cuota de la negociación.
```
POST {BASE_URL}/fpng
```
**Body:**
```json
{
  "negociacion": { "id": 1 },
  "numeroCuota": 1,
  "descripcion": "Primer pago - 40% inicial",
  "fechaPago": "2026-08-01",
  "porcentaje": 40.00,
  "valorCuota": 60000.00,
  "estado": 1,
  "orden": 1
}
```

#### PUT `/fpng`
Actualiza una cuota (incluir `id`).

#### DELETE `/fpng/delete/{id}`
Elimina una cuota.

---

### 3.3 Pagos Realizados — `/pgng`

#### GET `/pgng/getByCriteria`
Obtener todos los pagos de una cuota específica.
```
GET {BASE_URL}/pgng/getByCriteria
Body: [{"campo": "formaPago.id", "valor": "1", "operador": "="}]
```
**Response 200:**
```json
[
  {
    "id": 1,
    "formaPago": { "id": 1 },
    "fechaPago": "2026-08-05",
    "valorPago": 60000.00,
    "descripcion": "Pago completo cuota 1 con factura 001-001-000123",
    "tipoPago": "FACTURA",
    "facturaCompra": { "id": 45 },
    "facturado": 1,
    "pagado": 1,
    "refComprobante": "TRF-20260805-001",
    "estado": 1,
    "usuario": { "pjrqcdgo": 5 },
    "fechaRegistro": "2026-08-05T14:30:00"
  }
]
```

#### GET `/pgng/getByCriteria` — Pagos de toda la negociación
Para obtener todos los pagos de una negociación, primero obtener las cuotas y luego filtrar por cada cuota. Alternativamente usar la vista `V_ESTADO_CUOTAS_NEGOCIACION`.

#### POST `/pgng`
Registra un pago (anticipo o con factura).
```
POST {BASE_URL}/pgng
```
**Body — Anticipo sin factura:**
```json
{
  "formaPago": { "id": 2 },
  "fechaPago": "2026-09-15",
  "valorPago": 12000.00,
  "descripcion": "Anticipo parcial del segundo pago",
  "tipoPago": "ANTICIPO",
  "facturaCompra": null,
  "facturado": 0,
  "pagado": 0,
  "refComprobante": "TRF-20260915-003",
  "estado": 1,
  "usuario": { "pjrqcdgo": 5 },
  "fechaRegistro": "2026-09-15T10:00:00"
}
```
**Body — Pago con factura:**
```json
{
  "formaPago": { "id": 1 },
  "fechaPago": "2026-08-05",
  "valorPago": 60000.00,
  "descripcion": "Pago cuota 1 contra factura 001-001-000123",
  "tipoPago": "FACTURA",
  "facturaCompra": { "id": 45 },
  "facturado": 1,
  "pagado": 1,
  "refComprobante": "TRF-20260805-001",
  "estado": 1,
  "usuario": { "pjrqcdgo": 5 },
  "fechaRegistro": "2026-08-05T14:30:00"
}
```

#### PUT `/pgng`
Actualiza un pago (incluir `id`). Usar para:
- Asociar una factura a un anticipo previo (actualizar `facturaCompra`, `facturado`)
- Marcar un pago como liquidado (actualizar `pagado = 1`)

#### DELETE `/pgng/delete/{id}`
Anula/elimina un pago.

---

### 3.4 Adendums — `/adng`

#### GET `/adng/getByCriteria`
Obtener todos los adendums de una negociación.
```
GET {BASE_URL}/adng/getByCriteria
Body: [{"campo": "negociacion.id", "valor": "1", "operador": "="}]
```
**Response 200:**
```json
[
  {
    "id": 1,
    "negociacion": { "id": 1 },
    "numAdendum": "ADENDUM-001",
    "fechaAdendum": "2026-11-10",
    "descripcion": "Trabajos adicionales de impermeabilización no contemplados en contrato original",
    "valorAjuste": 10000.00,
    "valorTotalResultante": 160000.00,
    "observacion": "Aprobado por gerencia en reunión del 2026-11-08",
    "estado": 1,
    "usuario": { "pjrqcdgo": 5 },
    "fechaRegistro": "2026-11-10T09:00:00"
  }
]
```

#### POST `/adng`
Registra un adendum.
```
POST {BASE_URL}/adng
```
**Body:**
```json
{
  "negociacion": { "id": 1 },
  "numAdendum": "ADENDUM-001",
  "fechaAdendum": "2026-11-10",
  "descripcion": "Trabajos adicionales de impermeabilización",
  "valorAjuste": 10000.00,
  "valorTotalResultante": 160000.00,
  "observacion": "Aprobado por gerencia",
  "estado": 1,
  "usuario": { "pjrqcdgo": 5 },
  "fechaRegistro": "2026-11-10T09:00:00"
}
```
> ⚠️ El frontend debe calcular `valorTotalResultante` = valor total vigente anterior + `valorAjuste`.

#### PUT `/adng`
Actualiza un adendum (incluir `id`).

#### DELETE `/adng/delete/{id}`
Elimina un adendum.

---

### 3.5 Documentos Digitalizados — `/ptng`

#### GET `/ptng/getByCriteria`
Obtener todos los documentos de una negociación.
```
GET {BASE_URL}/ptng/getByCriteria
Body: [{"campo": "negociacion.id", "valor": "1", "operador": "="}]
```
**Response 200:**
```json
[
  {
    "id": 1,
    "negociacion": { "id": 1 },
    "path": "/uploads/negociaciones/1/contrato-principal.pdf",
    "nombreDoc": "Contrato principal 2026",
    "tipoDoc": "CONTRATO",
    "principal": 1,
    "adendum": null
  },
  {
    "id": 2,
    "negociacion": { "id": 1 },
    "path": "/uploads/negociaciones/1/adendum-001.pdf",
    "nombreDoc": "Adendum 001 - Trabajos adicionales",
    "tipoDoc": "ADENDUM",
    "principal": 0,
    "adendum": { "id": 1 }
  }
]
```

#### POST `/ptng`
Registra un documento (la carga del archivo se hace por el servicio de files existente).
```
POST {BASE_URL}/ptng
```
**Body:**
```json
{
  "negociacion": { "id": 1 },
  "path": "/uploads/negociaciones/1/contrato-principal.pdf",
  "nombreDoc": "Contrato principal 2026",
  "tipoDoc": "CONTRATO",
  "principal": 1,
  "adendum": null
}
```

#### PUT `/ptng`
Actualiza un documento (incluir `id`).

#### DELETE `/ptng/delete/{id}`
Elimina la referencia al documento.

---

## 4. VISTAS DISPONIBLES PARA ESTADO DE CUENTA

Las siguientes vistas SQL están disponibles en la base de datos para consultas de estado de cuenta. El frontend puede solicitarlas a través de endpoints nativos SQL/Stored Procedure o reportes específicos.

### 4.1 `PGS.V_ESTADO_NEGOCIACION` — Resumen por Negociación

Campos disponibles:

| Campo | Descripción |
|---|---|
| `ID_NEGOCIACION` | ID de la negociación |
| `EMPRESA` | ID de la empresa |
| `TITULAR` | ID del proveedor |
| `NUMCONTRATO` | Número de contrato |
| `DESC_NEGOCIACION` | Descripción |
| `VALOR_ORIGINAL` | Valor original pactado |
| `TIPOFINANCIACION` | Tipo de financiación |
| `FECHANEGOCIACION` | Fecha de negociación |
| `TOTAL_ADENDUMS` | Suma de todos los ajustes por adendums |
| `VALOR_TOTAL_VIGENTE` | Valor original + adendums = valor actual de la negociación |
| `TOTAL_PAGADO` | Total de pagos registrados (anticipos + facturas) |
| `TOTAL_FACTURADO` | Total con factura del proveedor |
| `TOTAL_ANTICIPO_SIN_FACTURA` | Total entregado sin factura aún |
| `TOTAL_LIQUIDADO` | Total efectivamente cancelado/liquidado |
| `SALDO_PENDIENTE` | Valor vigente − total pagado = saldo por pagar |

### 4.2 `PGS.V_ESTADO_CUOTAS_NEGOCIACION` — Detalle por Cuota

| Campo | Descripción |
|---|---|
| `ID_CUOTA` | ID de la cuota |
| `ID_NEGOCIACION` | ID de la negociación |
| `TITULAR` | ID del proveedor |
| `NUMCONTRATO` | Número de contrato |
| `NUMEROCUOTA` | Número de cuota |
| `DESC_CUOTA` | Descripción de la cuota |
| `FECHA_PAGO_ACORDADA` | Fecha pactada de pago |
| `PORCENTAJE` | Porcentaje que representa |
| `VALOR_CUOTA_PACTADO` | Valor acordado de la cuota |
| `ESTADO_CUOTA` | Estado de la cuota |
| `TOTAL_PAGADO_CUOTA` | Total abonado a esta cuota |
| `TOTAL_FACTURADO_CUOTA` | Total con factura en esta cuota |
| `TOTAL_ANTICIPO_CUOTA` | Total anticipos sin factura en esta cuota |
| `TOTAL_LIQUIDADO_CUOTA` | Total liquidado en esta cuota |
| `SALDO_CUOTA` | Saldo pendiente de esta cuota |

---

## 5. FLUJO DE PANTALLAS SUGERIDO

### Pantalla 1 — Lista de Negociaciones (`/cxp/negociaciones`)
- **Tabla** con columnas: Proveedor, N° Contrato, Fecha, Valor Original, Valor Vigente, Saldo Pendiente, Estado, Acciones
- **Filtros:** Empresa, Proveedor, Estado, Rango de fechas
- **Botón:** Nueva Negociación
- **Endpoint:** `GET /ngcp/getByCriteria` o `GET /ngcp/getAll`

### Pantalla 2 — Formulario Nueva/Editar Negociación
- **Sección 1 — Cabecera:**
  - Proveedor (autocomplete — solo titulares con rol proveedor)
  - Fecha negociación, Fecha inicio, Fecha fin
  - N° Contrato (opcional)
  - Descripción
  - Valor Total
  - Tipo de Financiación (dropdown: Fijo / Hito / Porcentaje / Único)
  - Número de pagos
  - Observación
- **Sección 2 — Cuotas (tabla editable — se habilita tras guardar cabecera):**
  - Al seleccionar tipo `PORCENTAJE`: mostrar campo % y calcular automáticamente el valor
  - Al seleccionar tipo `FIJO`: ingresar directamente el valor
  - Columnas: N° Cuota, Descripción, Fecha Pago, Porcentaje, Valor, Acciones
  - **Endpoint guardar cuota:** `POST /fpng`
- **Sección 3 — Documentos:**
  - Upload de archivo (usar servicio de files existente) + `POST /ptng`
  - Indicar si es contrato principal
- **Endpoints:** `POST /ngcp` (nueva) | `PUT /ngcp` (editar)

### Pantalla 3 — Detalle / Estado de Cuenta de Negociación (`/cxp/negociaciones/:id`)
- **Cabecera:** datos generales de la negociación
- **Resumen financiero (cards):**
  - Valor Original
  - Total Adendums (+/-)
  - Valor Total Vigente
  - Total Pagado
  - Saldo Pendiente
  - Anticipos sin Factura (facturas pendientes de recibir)
- **Tab 1 — Cuotas y Pagos:**
  - Tabla de cuotas con expansión por cuota mostrando los pagos realizados
  - Por cada cuota: barra de progreso (pagado / total cuota)
  - Botón "Registrar Pago" por cuota
  - Indicadores: ✅ Pagado | ⚠️ Parcial | ❌ Pendiente | 🔴 Vencido
- **Tab 2 — Adendums:**
  - Historial de adendums con valorAjuste y valorTotalResultante
  - Botón "Nuevo Adendum"
- **Tab 3 — Documentos:**
  - Lista de archivos con tipo, nombre y botón de descarga
  - Botón "Subir Documento"

### Pantalla 4 — Registrar Pago (Modal/Dialog)
- Cuota de referencia (readonly): N° cuota, Descripción, Valor pactado, Saldo pendiente
- Fecha de pago
- Valor del pago
- Tipo: `ANTICIPO` | `FACTURA`
- Si es `FACTURA`: selector de factura de compra del proveedor
- ¿Está pagado/liquidado? (toggle)
- Referencia de comprobante (N° transferencia, cheque, etc.)
- Descripción/observación
- **Endpoint:** `POST /pgng`

### Pantalla 5 — Nuevo Adendum (Modal/Dialog)
- Negociación de referencia (readonly): valor total vigente actual
- N° Adendum
- Fecha adendum
- Descripción/motivo
- Valor del ajuste (positivo o negativo)
- Valor total resultante (calculado automáticamente: vigente + ajuste)
- Observación
- Subir documento del adendum
- **Endpoints:** `POST /adng` + `POST /ptng`

---

## 6. RESUMEN DE ENDPOINTS

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/ngcp/getAll` | Todas las negociaciones |
| `GET` | `/ngcp/getId/{id}` | Negociación por ID |
| `GET` | `/ngcp/getByCriteria` | Negociaciones por criterio |
| `POST` | `/ngcp` | Crear negociación |
| `PUT` | `/ngcp` | Actualizar negociación |
| `DELETE` | `/ngcp/delete/{id}` | Eliminar negociación |
| `GET` | `/fpng/getId/{id}` | Cuota por ID |
| `GET` | `/fpng/getByCriteria` | Cuotas por criterio (filtrar por negociacion.id) |
| `POST` | `/fpng` | Crear cuota |
| `PUT` | `/fpng` | Actualizar cuota |
| `DELETE` | `/fpng/delete/{id}` | Eliminar cuota |
| `GET` | `/pgng/getId/{id}` | Pago por ID |
| `GET` | `/pgng/getByCriteria` | Pagos por criterio (filtrar por formaPago.id) |
| `POST` | `/pgng` | Registrar pago/anticipo |
| `PUT` | `/pgng` | Actualizar pago (asociar factura, marcar pagado) |
| `DELETE` | `/pgng/delete/{id}` | Anular pago |
| `GET` | `/adng/getId/{id}` | Adendum por ID |
| `GET` | `/adng/getByCriteria` | Adendums por criterio (filtrar por negociacion.id) |
| `POST` | `/adng` | Crear adendum |
| `PUT` | `/adng` | Actualizar adendum |
| `DELETE` | `/adng/delete/{id}` | Eliminar adendum |
| `GET` | `/ptng/getId/{id}` | Documento por ID |
| `GET` | `/ptng/getByCriteria` | Documentos por criterio (filtrar por negociacion.id) |
| `POST` | `/ptng` | Registrar documento |
| `PUT` | `/ptng` | Actualizar documento |
| `DELETE` | `/ptng/delete/{id}` | Eliminar documento |

---

## 7. MAPEO ENTIDADES — TABLA — ENDPOINT

| Entidad Java | Tabla DB | Path REST | Clase REST |
|---|---|---|---|
| `NegociacionProveedor` | `PGS.NGCP` | `/ngcp` | `NegociacionProveedorRest` |
| `FormaPagoNegociacion` | `PGS.FPNG` | `/fpng` | `FormaPagoNegociacionRest` |
| `PagoNegociacion` | `PGS.PGNG` | `/pgng` | `PagoNegociacionRest` |
| `AdendumNegociacion` | `PGS.ADNG` | `/adng` | `AdendumNegociacionRest` |
| `PathNegociacion` | `PGS.PTNG` | `/ptng` | `PathNegociacionRest` |

---

## 8. REGLAS DE NEGOCIO IMPORTANTES

1. **El titular debe ser proveedor:** Al seleccionar el titular en el frontend, filtrar solo aquellos que tengan el rol de proveedor activo asignado.

2. **Consistencia de cuotas:** La suma de los valores de todas las cuotas (`FPNG.VALORCUOTA`) debe ser igual al `VALORTOTAL` de la negociación. El frontend debe validar esto antes de guardar.

3. **Para tipo PORCENTAJE:** La suma de los porcentajes de todas las cuotas debe ser 100%. El valor de cada cuota = `(porcentaje / 100) * valorTotal`.

4. **Estado de cuota automático:** Al registrar pagos, el frontend debe actualizar el estado de la cuota (`FPNG.ESTADO`):
   - Si `totalPagado >= valorCuota` → Estado `3` (Pagado total)
   - Si `totalPagado > 0 && totalPagado < valorCuota` → Estado `2` (Pago parcial)
   - Si `totalPagado == 0` → Estado `1` (Pendiente)

5. **Adendum y valor vigente:** El valor vigente de la negociación es siempre `NGCP.VALORTOTAL + SUM(ADNG.VALORAJUSTE)` donde `ADNG.ESTADO = 1`.

6. **Liquidación de anticipo:** Cuando un anticipo recibe su factura, actualizar el pago con `FACTURACOMPRA = id_factura` y `FACTURADO = 1`. Cuando la factura sea cancelada en el sistema, actualizar `PAGADO = 1`.

7. **Documentos y adendums:** Al registrar un adendum con documento, guardar primero el adendum (`POST /adng`), obtener el ID generado, y luego guardar el documento (`POST /ptng`) incluyendo el ID del adendum en el campo `adendum`.

---

## 9. EJEMPLO DE FLUJO COMPLETO

### Escenario: Negociación de $150,000 con pagos 40%-30%-30%, con adendum y anticipo

```
1. Crear negociación (POST /ngcp)
   → id: 1, valorTotal: 150000, tipoFinanciacion: PORCENTAJE

2. Crear 3 cuotas (POST /fpng x3):
   → Cuota 1: 40% = $60,000, fecha: 2026-08-01
   → Cuota 2: 30% = $45,000, fecha: 2026-10-01
   → Cuota 3: 30% = $45,000, fecha: 2026-12-01

3. Cuota 1 pagada con factura (POST /pgng):
   → formaPago.id: 1, valorPago: 60000, tipoPago: FACTURA
   → facturaCompra.id: 45, facturado: 1, pagado: 1
   → Actualizar cuota 1 estado → 3 (PUT /fpng)

4. Cuota 2 — anticipo parcial (POST /pgng):
   → formaPago.id: 2, valorPago: 12000, tipoPago: ANTICIPO
   → facturado: 0, pagado: 0
   → Actualizar cuota 2 estado → 2 (PUT /fpng)
   → Saldo cuota 2: $45,000 - $12,000 = $33,000

5. Adendum de $10,000 adicionales (POST /adng):
   → negociacion.id: 1, valorAjuste: 10000
   → valorTotalResultante: 160000
   → Nuevo valor vigente: $160,000

6. Valor vigente total de la negociación:
   → Valor original: $150,000
   → Adendum:        +$10,000
   → Valor vigente:  $160,000
   → Total pagado:    $72,000 ($60k cuota1 + $12k anticipo)
   → Saldo pendiente: $88,000
   → Sin factura:     $12,000 (anticipo cuota 2)
   → Facturas a pedir al proveedor:
      - Cuota 2: $33,000 restantes del 30%
      - Cuota 3: $45,000 del 30% + $10,000 del adendum
```
