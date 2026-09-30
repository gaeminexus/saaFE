# API — Pase de préstamos EN MORA a DE PLAZO VENCIDO (memorando, liquidación y reverso)

**Equipo:** `omen-saa-1` (CRD · equipo B) · **Fecha:** 2026-09-30 · **Estado:** CONTRATO CONGELADO para
la fase 1 (el reporte a la aseguradora es fase 2 y no está acá).
**Diseño y decisiones del usuario (D1–D23):** `crd/DISENO-PASE-A-PLAZO-VENCIDO.md`. **Ese documento
manda** si este contrato y él se contradicen: avisar al árbitro, no elegir.
**DDL:** `crd/sql/247_DDL_DECLARACION_PLAZO_VENCIDO.sql` — `CRD.PLVN` y `CRD.DPLV`. ⛔ **Va antes del WAR.**

Espejo en `saaFE/docs/crd/API-PASE-A-PLAZO-VENCIDO.md`.

---

## 1. Resumen en una pantalla

| Paso | Quién | Qué | Endpoint |
|---|---|---|---|
| Consultar | Crédito | Préstamos en mora con su cuadro calculado a una fecha de corte | `GET /rest/plvn/candidatos` |
| 1 · Declarar | Jefe de Crédito | Varios a la vez → estado 8, foto, seguro futuro en cero | `POST /rest/plvn/declarar` |
| Memorando | Crédito | PDF o Word, uno por préstamo | `GET /rest/plvn/{id}/memorando` |
| 2 · Liquidar | Contabilidad | Bandeja de declaradas → liquidación a su fecha de corte | `POST /rest/plvn/{id}/liquidar` |
| Liquidación | Contabilidad | PDF o Word | `GET /rest/plvn/{id}/liquidacion` |
| Reverso | Jefe de Crédito | Vuelve a EN_MORA y devuelve el seguro | `POST /rest/plvn/{id}/revertir` |
| Consultas | ambos | Listado, detalle, último encabezado | `GET /rest/plvn/listar`, `/getId/{id}`, `/ultimoEncabezado` |

**No hay asiento contable en ningún paso** (D7, D17). La reclasificación a vencido la hace el cierre
de cartera mensual.

---

## 2. Reglas que atraviesan todo

1. **El backend recalcula SIEMPRE.** Los valores que muestra `candidatos` son una vista previa. `declarar`
   **no recibe montos**: los vuelve a calcular a la fecha de corte y graba eso. Si el frontend mandara
   montos, se ignorarían.
2. **Fórmulas:** las del diseño §4.4bis, sin excepción. Resumen:
   - Universo: **todas** las cuotas del préstamo, excepto `CANCELADA_ANTICIPADA (7)`.
   - **Capital e interés se aceleran** (D11): el devengado es el de **todas** las cuotas, vencidas o no.
   - **Desgravamen e incendio** (D22): el devengado es sólo el de las cuotas con `fechaVencimiento ≤ corte`.
   - **Mora:** `ProcesoMoraPrestamoService.calcularMoraCuota(cuota, tasaDiaria, corte)` sobre las cuotas
     vencidas e impagas al corte. ⛔ **Nunca** el campo `mora` persistido.
   - En cada fila: saldo = devengado − cobrado.
   - ⛔ **Cobrado = pagos válidos de `CRD.PGPR`** (no anulados), sumados por componente: la **misma
     fuente** que usa `MotorPagoPrestamoServiceImpl.calcularSaldosCuota` (:121-188) y el frontend
     (`saldo-prestamo.service.ts`). **No** las columnas `*Pagado` de `DTPR`: en créditos migrados no son
     confiables, y `DTPR` no tiene columna de seguro de incendio pagado (ése sale de PGPR
     `valorSeguroIncendio`). *Corrección del árbitro, 2026-09-30, antes de despachar: el diseño §4.4bis
     decía Σ `capitalPagado` y compañía.*
3. **Cinco invariantes** (diseño §4.4bis). Si una falla, el préstamo **no se puede declarar** y se dice cuál:
   - devengado = cobrado + saldo, fila por fila;
   - Σ saldos = total por cobrar;
   - saldo de capital = monto − capital cobrado;
   - cobradas + pendientes = cuotas de la tabla;
   - ningún saldo negativo.
4. **Todo o nada por lote.** `declarar` corre en **una** transacción: si falla un préstamo, no se declara
   ninguno. Sin `REQUIRES_NEW` en el bucle (lección de H78).
5. **Fechas:** `yyyy-MM-dd`. Nunca un `Date` crudo ni algo terminado en `Z` (`CLAUDE.md`, serialización).
   La respuesta viaja como la serializa Jackson hoy: las fechas llegan como **arreglo** `[2026,6,8]`.
6. **Errores:** el cuerpo es `{"mensaje": "CODIGO: descripción"}`. Lo arma el filtro global
   `MensajeErrorJsonFilter` a partir del texto. El código va **antes de los dos puntos**, igual que
   en `/rest/cbbp` (`CuentaBancariaBeneficiarioRest.respuestaError`). HTTP: **400** dato inválido,
   **404** no existe, **409** conflicto de estado o de unicidad, **422** regla de negocio (cálculo
   que no cuadra), **500** inesperado.

---

## 3. `GET /rest/plvn/candidatos?fechaCorte=yyyy-MM-dd`

Préstamos con `PRSTIDST = 11` (D1), cada uno con su cuadro calculado a `fechaCorte`. **No graba nada.**

- `fechaCorte` es obligatoria y no puede ser posterior a hoy. Si falta, o es futura → **400**
  `PARAMETRO_INVALIDO`.
- ⛔ **Rendimiento.** Pueden ser cientos de préstamos. Hay que traer las cuotas **en lote**, con una
  consulta para todos los préstamos. Nada de una consulta por préstamo: todos los `@ManyToOne` del
  modelo son EAGER, y cada entidad arrastra su grafo (lección de `/prst/saldos`, 2026-09-10).

**200:**

```json
[
  {
    "idPrestamo": 60123,
    "numeroPrestamo": "60123",
    "tipoCredito": "HIPOTECARIO",
    "nombreParticipe": "VEGA BOZZANO MARIA JOSE",
    "cedula": "1713977211",
    "fechaInicio": [2013,7,23],
    "fechaFin": [2026,6,30],
    "fechaUltimoCobro": [2019,5,31],
    "fechaInicioMora": [2019,5,31],
    "dividendoMensual": 779.64,
    "montoPrestamo": 90018.75,
    "capital":      { "devengado": 90018.75, "cobrado": 40232.39, "saldo": 49786.36 },
    "interes":      { "devengado": 58472.16, "cobrado": 39841.92, "saldo": 18630.24 },
    "desgravamen":  { "devengado":  2710.77, "cobrado":  1119.39, "saldo":  1591.38 },
    "seguroIncendio": { "devengado": 0, "cobrado": 0, "saldo": 0 },
    "mora":         { "devengado": 14535.62, "cobrado": 0, "saldo": 14535.62 },
    "totalCobrado": 81193.70,
    "totalPorCobrar": 84543.60,
    "cuotasPlazo": 155,
    "cuotasCobradas": 66,
    "cuotasPendientes": 89,
    "cuotasPorVencer": 1,
    "cuotasConSeguroAAnular": 1,
    "valido": true,
    "inconsistencias": []
  }
]
```

Los números del ejemplo son **ilustrativos**. No hay que copiarlos del Word del usuario, que trae tres
incoherencias (diseño §1).

- `valido = false` cuando falla una invariante. `inconsistencias` es la lista de textos que dicen cuál
  falla y con qué valores. **La pantalla muestra el préstamo, pero no deja seleccionarlo.**
- `cuotasConSeguroAAnular`: cuántas cuotas posteriores al corte tienen desgravamen o incendio mayor a
  cero. Es lo que `declarar` va a poner en cero.
- **`numeroPrestamo`** = `Prestamo.idAsoprep` (`PRSTIDAS`, número de operación en ASOPREP) y, si es nulo,
  `codigo` (`PRSTCDGO`), como **texto**. Es la convención de todas las pantallas del frontend
  (`idAsoprep ?? codigo`, 23 lugares). *Medido por el ejecutor BE el 2026-09-30: el candidato inicial
  `PRSTCDGO` era incorrecto.* Al declarar se congela en `PLVNNMPS`, y los documentos imprimen eso.

---

## 4. `GET /rest/plvn/ultimoEncabezado`

Devuelve lo que la pantalla del paso 1 precarga en PARA y CC (D21): lo de la última declaración grabada.

**200:** `{ "paraNombre": "ECO. LEONARDO RAMÍREZ", "paraCargo": "REPRESENTANTE LEGAL ASOPREP-FCPC", "ccNombre": "ING. STEVEN CEVALLOS", "ccCargo": "CONTADOR GENERAL" }`

Si nunca se declaró nada, devuelve los cuatro campos en `null` con **200**, no 404.

---

## 5. `POST /rest/plvn/declarar`

**Cuerpo:**

```json
{
  "fechaCorte": "2026-06-08",
  "usuario": "grobayo",
  "paraNombre": "ECO. LEONARDO RAMÍREZ",
  "paraCargo": "REPRESENTANTE LEGAL ASOPREP-FCPC",
  "ccNombre": "ING. STEVEN CEVALLOS",
  "ccCargo": "CONTADOR GENERAL",
  "prestamos": [
    { "idPrestamo": 60123, "numeroMemorando": "ASOPREP-FCPC-CREDITO-GR-033-2026" }
  ]
}
```

**Validaciones, en este orden:**
1. `fechaCorte` obligatoria y no futura. `usuario` y `prestamos` obligatorios; `prestamos` no vacío. Si
   falla → **400** `PARAMETRO_INVALIDO`.
2. Un `numeroMemorando` por préstamo (D16), obligatorio y no vacío. Se compara normalizado:
   `UPPER(TRIM(...))`.
   - Repetido **dentro del mismo lote** → **409** `MEMORANDO_DUPLICADO`, diciendo cuál.
   - Ya existe en `CRD.PLVN`, **incluidas las revertidas** → **409** `MEMORANDO_DUPLICADO`, diciendo
     cuál y a qué préstamo pertenece.
3. Un mismo `idPrestamo` dos veces en el lote → **400** `PARAMETRO_INVALIDO`.
4. Cada préstamo **en estado 11 al momento de confirmar**. Pudo cambiar desde la consulta: lo cobraron o
   se regularizó. Si alguno no está en 11 → **409** `PRESTAMO_NO_EN_MORA`, con la lista y el estado
   actual de cada uno.
5. Se recalcula el cuadro de cada préstamo. Si falla alguna invariante → **422** `CALCULO_NO_CUADRA`,
   con el préstamo, la invariante y los valores.

**Qué hace, por préstamo, todo dentro de una transacción:**
1. Inserta en `PLVN`: estado 1 DECLARADA, `PLVNESAN = 11`, la foto completa, PARA/CC y la auditoría.
2. **Seguro (D13, D19, D22, D23).** Para cada cuota con `fechaVencimiento > fechaCorte` que no esté
   `PAGADA (4)` ni `CANCELADA_ANTICIPADA (7)` y tenga desgravamen o incendio mayor a cero:
   - guarda en `DPLV` los valores originales;
   - pone `desgravamen` y `valorSeguroIncendio` en cero;
   - **recalcula `total` y `totalConSeguro` de la cuota** restando exactamente lo que quitó.
   - ⛔ **Antes de programar esto, el ejecutor mide** qué columnas de la cuota suman el seguro. Si
     `total` / `totalConSeguro` no lo incluyen, o si hay otra columna que sí, **reporta y se detiene**:
     `sql/247` guarda exactamente esas cuatro y se corrige antes de correrlo.
   - ⚠️ Si una cuota futura ya tiene seguro **pagado** (un adelanto), no se baja por debajo de lo pagado:
     se deja en lo pagado. Así no queda un «pagado de más» que ningún proceso sabe tratar.
3. `PRSTIDST` 11 → **8**, con `fechaModificacion`.

**201:**

```json
[
  { "idDeclaracion": 1, "idPrestamo": 60123, "numeroMemorando": "ASOPREP-FCPC-CREDITO-GR-033-2026",
    "totalPorCobrar": 84543.60, "cuotasSinSeguro": 1 }
]
```

---

## 6. `POST /rest/plvn/{id}/liquidar`

**Cuerpo:** `{ "fechaCorte": "2026-06-08", "usuario": "scevallos" }`

- La declaración está en estado 1. Si está en 2 → **409** `YA_LIQUIDADA`. Si está en 3 → **409**
  `DECLARACION_REVERTIDA`. Si no existe → **404** `DECLARACION_NO_ENCONTRADA`.
- `fechaCorte` no puede ser futura ni anterior a la fecha del memorando (`PLVNFCCR`). Si lo es → **400**
  `PARAMETRO_INVALIDO`.
- **Recalcula a esa fecha** las seis filas de la liquidación: saldo de capital, interés vencido,
  desgravamen, incendio, mora y total. Usa las mismas fórmulas del §2. Si entre el memorando y hoy
  entró un pago o corrió la mora, la liquidación lo refleja, y por eso tiene su propia foto (`PLVNLQ*`).
- Graba también las cuotas impagas (`PLVNLQCI`), el usuario y la fecha. Pasa a estado **2 LIQUIDADA**.
- Sin asiento (D17).

**200:** la declaración completa (la misma forma del §9).

---

## 7. `POST /rest/plvn/{id}/revertir`

**Cuerpo:** `{ "usuario": "grobayo", "motivo": "El partícipe firmó acuerdo de pago" }`

- Estado 1 o 2: se puede revertir aunque ya esté liquidada (D14 y D17). Si está en 3 → **409**
  `DECLARACION_REVERTIDA`. Si no existe → **404**.
- `motivo` es obligatorio y no puede estar vacío → si no, **400** `PARAMETRO_INVALIDO`.
- El préstamo tiene que estar en **8**. Si no lo está (alguien lo cambió por otro camino) → **409**
  `PRESTAMO_NO_EN_PLAZO_VENCIDO`, con el estado actual. **No se fuerza.**

**Qué hace, en una transacción:**
1. Devuelve el seguro desde `DPLV` a cada cuota **que siga sin pagar** (no `PAGADA`, no
   `CANCELADA_ANTICIPADA`): restituye desgravamen, incendio, `total` y `totalConSeguro`, y marca
   `DPLVFCRS`. Una cuota que se pagó sin seguro mientras estuvo en 8 **no se toca**: devolverle el
   seguro la reabriría. Queda contada en la respuesta como `cuotasNoRestituidas`.
2. `PRSTIDST` 8 → **11 siempre** (D14). Después decide el proceso nocturno: si ya no tiene cuotas
   vencidas, lo regulariza a 2 como a cualquier préstamo en 11.
3. Declaración a **3 REVERTIDA**, con usuario, fecha y motivo. **No se borra nada.**
4. Sin asiento (D17).

**200:** `{ "idDeclaracion": 1, "idPrestamo": 60123, "cuotasRestituidas": 1, "cuotasNoRestituidas": 0 }`

---

## 8. Documentos — `GET /rest/plvn/{id}/memorando?formato=PDF|DOCX` · `GET /rest/plvn/{id}/liquidacion?formato=PDF|DOCX`

- Devuelven el archivo: `application/pdf`, o
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, con
  `Content-Disposition: attachment; filename="ORDEN_DE_COBRO_<APELLIDOS_NOMBRES>.pdf"` o
  `"LIQUIDACION_<...>.docx"`.
- `formato` por defecto: `PDF`. Cualquier otro valor → **400**.
- **Se llenan desde la foto de `PLVN`**, nunca desde las cuotas. Reimprimir da siempre el mismo documento.
- `liquidacion` sobre una declaración en estado 1 → **409** `NO_LIQUIDADA`.
- Una declaración REVERTIDA **sí se puede reimprimir**, porque es un documento que existió. Lleva la
  marca «REVERTIDA» en el encabezado.
- **Plantillas:** `rep/crd/RPRT_PLVN_MMRN.jrxml` (memorando) y `rep/crd/RPRT_PLVN_LQDC.jrxml`
  (liquidación).
  - Sintaxis **compacta**. Llevan su `.jasper` compilado **y el fill verificado**:
    `compilar-jasper.bat` + `verificar-fill-jasper.bat`, los dos.
  - Sin `SELECT`: todo llega por parámetros.
  - El texto sigue los Word del usuario (`CLAUDE.md`, reportes). Reproduce el cuadro con las filas de
    devengado / cobrado / saldo y el total.
  - **Líneas de firma sin nombre** (D15): Jefe de Crédito en el memorando, Jefe de Contabilidad en la
    liquidación.
  - La liquidación dice las cuotas impagas **en número y en letras** («ochenta y ocho (88)») y el mes y
    año de inicio de la mora. No hay utilitario de número a letras en el backend (grep, 2026-09-30):
    se escribe **dentro del módulo `crd`**, no en `basico`, que es compartido.
- **DOCX:** se agrega `case "DOCX"` con `JRDocxExporter` en `ReporteServiceImpl.exportarReporte`.
  ⚠️ **Ese archivo es de todos los módulos.** El cambio es sólo aditivo (PDF, EXCEL y HTML no se
  tocan), y el aviso a los otros equipos lo da el árbitro con autorización del usuario.
- «Adj. Tabla de Amortización»: la pantalla ofrece un botón con el reporte de tabla que **ya existe**.
  El ejecutor mide cuál (`rep/crd/RPRT_TBLA_*`) y lo reporta. No se crea uno nuevo.

---

## 9. Consultas

### `GET /rest/plvn/listar?estado=&desde=&hasta=`
- `estado` es opcional (1, 2 o 3). `desde` y `hasta` son opcionales y filtran por la fecha del memorando.
- Es la **bandeja de Contabilidad** (`estado=1`) y el historial de Crédito.

### `GET /rest/plvn/getId/{id}`

Las dos devuelven la declaración con esta forma:

```json
{
  "idDeclaracion": 1, "idPrestamo": 60123, "numeroPrestamo": "60123", "estado": 1,
  "numeroMemorando": "...", "fechaCorte": [2026,6,8],
  "paraNombre": "...", "paraCargo": "...", "ccNombre": "...", "ccCargo": "...",
  "nombreParticipe": "...", "cedula": "...", "tipoCredito": "...",
  "cuadro": { ...la misma forma del §3 },
  "liquidacion": null,
  "usuarioDeclaracion": "grobayo", "fechaDeclaracion": [2026,6,8,10,15,0],
  "usuarioReverso": null, "fechaReverso": null, "motivoReverso": null
}
```

`liquidacion`, cuando existe, trae: `{ fechaCorte, saldoCapital, interesVencido, desgravamen, seguroIncendio, mora, total, cuotasImpagas, usuario, fecha }`.

⚠️ **No se expone la entidad JPA cruda.** Se usa un DTO: la entidad `PLVN` tiene un `@ManyToOne`
EAGER al préstamo, y serializarla arrastra todo el grafo.

---

## 10. La mora de los préstamos en 8 (D6, D10) — cambio en el proceso nocturno

No es un endpoint, pero sin esto el frente no cumple D6. **Va en el mismo WAR.**

- `DetallePrestamoDaoServiceImpl.selectPrestamosConCuotasVencidas`: el universo pasa a
  `IN (2, 8, 11)`.
- `ProcesoMoraPrestamoServiceImpl.calcularMoraPrestamo:197-213`: la guarda del 8 **deja de salir
  temprano**. Calcula y persiste la mora de las cuotas igual que para cualquier préstamo, pero **no
  toca el estado del préstamo**: no pasa a 11 y no se regulariza a 2. El estado de las **cuotas** sigue
  la regla actual (`EN_MORA (5)`, salvo `PARCIAL`).
- ⚠️ **Consecuencia aceptada por el usuario (D10):** la primera corrida después del WAR carga la mora
  completa a los préstamos que ya estaban en 8. **El `sql/77` queda obsoleto y NO se corre.**
- Se actualizan en el mismo cambio:
  - el JavaDoc de las dos clases;
  - `PROCESO-DIARIO-INTERES-MORA.md` §11 (la mora de los 8 ya no se excluye; el estado sí se protege);
  - `LIMPIEZA-MORA-PLAZO-VENCIDO.md` (marcarlo obsoleto por D10).

---

## 11. La pantalla (frontend)

Una entrada de menú en Créditos: **«Plazo Vencido»**. Es corta a propósito, por H71: un nombre de menú
largo no se recorta, desaparece entero.

La pantalla tiene **tres pestañas**:

1. **Declarar** (Crédito)
   - Pide la fecha de corte (por defecto hoy, no se admite una fecha futura) y un botón «Consultar».
   - Muestra la tabla de candidatos con selección múltiple. Los que tienen `valido=false` se muestran
     deshabilitados, con sus inconsistencias a la vista.
   - Cada fila seleccionada tiene su campo de número de memorando.
   - Arriba de la tabla van PARA y CC, precargados con `/ultimoEncabezado`.
   - Para confirmar abre un diálogo que dice cuántos préstamos se declaran, el total y cuántas cuotas
     quedan sin seguro.
   - Si el backend rechaza (409 o 422), la pantalla **muestra su mensaje tal cual**. No lo reemplaza
     por uno genérico (lección de H13: `handleError` no puede convertir un error en «sin datos»).
2. **Por liquidar** (Contabilidad)
   - `listar?estado=1`, fecha de corte por fila y botón «Liquidar».
3. **Historial**
   - `listar` con filtros de estado y fechas.
   - Por fila: descargar el memorando y la liquidación en PDF o Word, la tabla de amortización, y
     «Revertir». Revertir pide el motivo en un diálogo y sólo aparece si el estado es 1 o 2.

⚠️ **Permisos:** no existen los nodos de permiso para esta pantalla ni para separar Crédito de
Contabilidad (D3, D14). La entrada queda **sin `idPermiso`**, como pasó con sepelio, y la separación
por rol la asigna el frente de seguridad, que es de otro equipo. El árbitro lo registra como deuda.

---

## 12. Lo que este contrato NO cubre

- **El reporte a la aseguradora para la nota de crédito** (fase 2, diseño §4.6): falta que el usuario lo
  valide con la aseguradora.
- **Un estado de cuota «de plazo vencido»:** existe en el frontend (9) y no en el backend. No se crea
  acá.
- **La vía legal:** D6 dice que el valor se revisa cuando se cobre por legal. Eso lo resuelve la
  liquidación a una fecha nueva, sin endpoint aparte.
