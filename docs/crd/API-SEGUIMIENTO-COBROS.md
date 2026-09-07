# API — Seguimiento mensual de cobros personales

**Fecha:** 2026-09-07 · **Equipo:** `omen-saa-1` (`omen1`) · **Estado:** contrato cerrado, sin implementar.

Pedido del usuario: *«dar seguimiento a todos los cobros realizados personalmente en un mes: cuándo
se ingresó, cuándo se aprobó por contabilidad, cuándo se procesó en crédito, y desde esa pantalla
consultar sus respaldos»*.

---

## 1. ⭐ Lo que YA existe — esto NO es un frente de datos, es de consulta

Verificado contra el código el 2026-09-07 **antes** de diseñar nada. La conclusión cambia el tamaño
del trabajo:

**`CRD.CBCR` ya guarda la huella completa del circuito.** No falta ni una columna, no hay DDL:

| Etapa | Usuario | Fecha | Motivo |
|---|---|---|---|
| Registro | `CBCRUSRG` | `CBCRFCRG` | — |
| Aprobación (contabilidad) | `CBCRUSAP` | `CBCRFCAP` | — |
| Rechazo | `CBCRUSRC` | `CBCRFCRC` | `CBCRMTRC` |
| **Proceso (crédito)** | `CBCRUSPR` | `CBCRFCPR` | — |
| Anulación | `CBCRUSAN` | `CBCRFCAN` | `CBCRMTAN` |
| **Reverso** | `CBCRUSRV` | `CBCRFCRV` | `CBCRMTRV` + `CBCRNMRV` |

Más `CBCRVLRR` (valor), `CBCRFCHA` (fecha del depósito), `CBCRRFRN` (referencia), `CBCRTPOO` (tipo),
`CBCRESTD` (estado), **`CBCRRTRS` (ruta del respaldo digitalizado)** y los tres asientos
(`CBCRASN1` / `CBCRASRP` / `CBCRASN2`).

**Y el visor de respaldos ya está hecho:** `crd/dialog/cobros/comprobante-viewer.component.ts`
renderiza imagen o PDF **inline** desde `rutaRespaldo`, contra
`${ServiciosShare.RS_FILE}/view?filePath=...` (`FileRest:175`). **Se reusa tal cual, no se
reescribe.**

**Lo único que falta, entonces:**

1. Un endpoint que **liste por rango de fechas** — hoy `CobroCreditoDaoService` solo tiene
   `selectByEstado`, `selectByEntidad` y `selectByReferencia`. **No hay ninguna consulta por fecha.**
2. La pantalla.

---

## 2. Decisiones tomadas — para que nadie las adivine

| Decisión | Cuál | Por qué |
|---|---|---|
| Qué se lista | **Solo `CRD.CBCR`** (cobros individuales) | Es exactamente «cobros personales». La carga Petro NO es un `CobroCredito`: vive en `CRAR`, con otro ciclo (`API-COBRO-PETRO-DOS-PASOS.md`) |
| Por qué fecha filtra | **`CBCRFCHA`** (fecha del depósito) | Es la fecha del hecho económico. La de registro se **muestra** en la fila, pero no filtra: si filtrara por registro, un depósito de fin de mes registrado el 2 quedaría fuera del mes al que pertenece |
| Qué estados entran | **TODOS**, incluidos rechazados y anulados | Es una pantalla de seguimiento: un cobro que se atascó o murió es justo lo que hay que poder ver. Filtrar por estado es cosa de la pantalla, no del endpoint |
| Rango | `desde` / `hasta` libres, no «mes» | Un mes es el caso de uso, pero un rango libre lo cubre y además sirve para cortes que cruzan meses |

---

## 3. El endpoint

```
GET /rest/cbcr/seguimiento?desde=2026-08-01&hasta=2026-08-31
```

- `desde` y `hasta` en `yyyy-MM-dd`, **inclusive los dos**.
- Faltando alguno → 500 `desde y hasta son obligatorios (yyyy-MM-dd)`.
- `hasta` anterior a `desde` → 500 `hasta no puede ser anterior a desde`.
- Devuelve **200 con lista vacía** si no hay filas. **Nunca 404** — «no hubo cobros» es una
  respuesta válida, no un error.

### Forma de cada fila — `FilaSeguimientoCobro`

```json
{
  "idCobro": 54,
  "tipoOperacion": "PAGO_CUOTA",
  "estado": 3,
  "nombreEstado": "PROCESADO",
  "fechaCobro": "2026-08-21",
  "referencia": "TRF-889210",
  "valor": 171.85,

  "idEntidad": 1450,
  "participe": "PEREZ GOMEZ JUAN CARLOS",
  "identificacion": "1712345678",

  "cuentaBancaria": "Pichincha - 2100123456",

  "usuarioRegistro": "mlopez",     "fechaRegistro": "2026-08-21T09:14:02",
  "usuarioAprobacion": "acontab",  "fechaAprobacion": "2026-08-22T11:03:44",
  "usuarioRechazo": null,          "fechaRechazo": null,  "motivoRechazo": null,
  "usuarioProceso": "jcredito",    "fechaProceso": "2026-08-22T15:40:10",
  "usuarioAnulacion": null,        "fechaAnulacion": null, "motivoAnulacion": null,
  "usuarioReverso": null,          "fechaReverso": null,   "motivoReverso": null,
  "numeroReversos": 0,

  "horasHastaAprobacion": 25.8,
  "horasHastaProceso": 4.6,

  "rutaRespaldo": "cobros/2026/08/TRF-889210.pdf",
  "tieneRespaldo": true,

  "asientoTransitorio": "CRE-2026-08-0421",
  "asientoReparto": "CRE-2026-08-0447",
  "asientoDefinitivo": "CRE-2026-08-0448"
}
```

**Notas de forma, que son las que se rompen si no se leen:**

- `nombreEstado` lo resuelve el **backend** con el mismo texto que ya usa `textoEstado(...)` en
  `CobroCreditoServiceImpl`. **No se deja al frontend traducir el número**: hoy hay dos catálogos de
  estado en la app y traducir de nuevo es cómo se desincronizan.
- `horasHastaAprobacion` = de `fechaRegistro` a `fechaAprobacion`. `horasHastaProceso` = de
  `fechaAprobacion` a `fechaProceso`. **`null` si la etapa no ocurrió** — nunca `0`, que se
  confundiría con «fue inmediato». Son el corazón del seguimiento: dicen **dónde se traba el
  circuito**.
- `tieneRespaldo` es `rutaRespaldo != null && !vacío`. Se manda calculado para que la grilla no
  repita la regla.
- Los asientos van como **`numeroAlterno`** (el legible, `CRE-2026-08-0447`), no como PK. `null` si
  esa etapa no generó asiento — normal en un cobro registrado y no procesado, o con la contabilidad
  apagada.
- **Fechas:** `fechaCobro` es `LocalDate` → `yyyy-MM-dd`. Las demás son `LocalDateTime` → **ISO
  local sin zona**. Jackson descarta el offset en vez de convertirlo: un valor terminado en `Z`
  se graba corrido cinco horas y **sin ningún error**.

---

## 4. Implementación en el backend

- **DAO** — `CobroCreditoDaoService` / `Impl`: método nuevo
  `List<CobroCredito> selectByRangoFechaCobro(LocalDate desde, LocalDate hasta)`, JPQL con
  `@PersistenceContext EntityManager`, `WHERE c.fecha BETWEEN :desde AND :hasta ORDER BY c.fecha DESC, c.codigo DESC`.
  Declararlo en la interfaz con JavaDoc, como el resto.
- **Service** — `CobroCreditoService.seguimiento(LocalDate desde, LocalDate hasta)` devuelve
  `List<FilaSeguimientoCobro>`. El **armado del DTO va acá**, no en el REST.
- **REST** — `CobroCreditoRest`, `GET /seguimiento`, con la línea de traza `System.out.println` y el
  `catch (Throwable e)` de la casa.

⚠️ **Cuidado con el N+1.** Cada fila toca `entidad`, `cuentaBancaria` y los tres asientos. Un mes
puede traer cientos de cobros. Usar `JOIN FETCH` en el JPQL para `entidad`, `cuentaBancaria` y los
tres asientos, o medir y reportarlo. **No entregar sin haber mirado cuántas consultas dispara.**

⛔ **No se toca `procesarCobro`, `aprobarCobro`, `anularCobro` ni `reversarProceso`.** Esto es
**solo lectura**.

---

## 5. La pantalla

**Nueva:** `crd/forms/cobros/seguimiento-cobros/`. **No se modifica `consulta-cobros`** (que sigue
siendo la de terminales) ni `proceso-credito` ni `bandeja-contabilidad`.

### Lo que tiene que resolver, en orden de importancia

1. **Selector de mes**, con «mes actual» por defecto y flechas de mes anterior/siguiente. Que abrir
   la pantalla y ver el mes en curso no cueste ni un clic.
2. **Tarjetas de resumen arriba**: total de cobros, suma de valores, y el conteo por estado
   (registrados / aprobados / procesados / rechazados / anulados). **Clicables**: filtran la tabla.
3. **La línea de tiempo de cada cobro, que es el corazón del pedido.** Por fila, las tres etapas
   —Ingresado → Aprobado → Procesado— con su fecha, su usuario y el tiempo que tardó. Una etapa que
   no ocurrió se ve **vacía, no ausente**: la gracia es ver dónde se cortó.
4. **Respaldo**: reusar `ComprobanteViewerComponent` tal cual. Un ícono en la fila cuando
   `tieneRespaldo`; al abrir el detalle, el comprobante se ve **inline**, sin descargar nada.
   Cuando no hay respaldo, decirlo explícitamente — no dejar el hueco mudo.
5. **Filtros**: texto libre (partícipe, identificación, referencia), tipo de operación y estado.
6. **Exportar a Excel/CSV** lo que está filtrado. Es una pantalla de seguimiento: alguien va a
   querer llevárselo a una reunión.

### Reglas que no son estéticas

- ⛔ **`handleError`**: un fallo de parseo llega como emisión **exitosa** con `null`, no como error.
  Distinguir `null` (la consulta falló) de `[]` (no hubo cobros) **en el punto de consumo** y decir
  cosas distintas. **NO tocar `handleError`** — son 316 archivos.
- ⛔ **El paginador se engancha una sola vez.** Si la tabla vive dentro de un `@if` que arranca en
  falso, el `@ViewChild` resuelve `undefined` y **nunca se reintenta**: la tabla muestra las
  primeras filas de un conjunto más grande **sin ningún indicio**. Es el defecto que ya se corrigió
  en siete pantallas de `cnt` (§9 del `REGISTRO-RESERVAS-EQUIPOS.md`). Enganchar con un método
  idempotente llamado también desde `ngAfterViewChecked`.
- Los tiempos se muestran legibles («1 d 2 h», «45 min»), pero **el dato crudo llega en horas**: el
  formateo es de la vista.

---

## 6. Lo que este frente NO hace

- **No cambia el circuito.** Nadie aprueba, procesa, anula ni reversa desde acá. Es una pantalla de
  lectura; las acciones viven en sus pantallas.
- **No trae la carga Petro.** Otro ciclo, otra tabla, otro contrato.
- **No agrega columnas.** Cero DDL: la huella completa ya está en `CBCR`.
