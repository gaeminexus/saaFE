# PLAN — SIMULADORES DE PRÉSTAMOS (módulo crd)

**Creado: 2026-08-25.** Documento de control del proyecto. El árbitro lo mantiene; los agentes
BE y FE lo leen antes de tocar nada y actualizan su §9 al cerrar una fase.

Espejado en `saaFE/docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`. El del backend es el autoritativo.

---

## 1. Qué se pide

Dos opciones nuevas en el menú de créditos:

| # | Simulador | Qué simula | Reporte |
|---|---|---|---|
| **1** | **Crédito nuevo** | Solo datos financieros → tabla de amortización | Jasper, marcado como simulación |
| **2** | **Préstamo existente** | Abono a capital (reduce plazo / reduce cuota) y **reestructuración** | Jasper, marcado como simulación |

**Ninguno escribe nada.** Son herramientas de consulta y negociación con el socio.

---

## 2. Estado del terreno — verificado en código el 2026-08-25

No confiar en esta sección sin contrastar: se levantó leyendo el código, no la documentación.

### 2.1 Lo que YA existe y se reusa

| Pieza | Ubicación | Nota |
|---|---|---|
| Simulación de abono a capital | `AbonoCapitalPrestamoServiceImpl.simular` | Calcula sin escribir |
| Tabla proyectada pura | `AbonoCapitalPrestamoServiceImpl:501-560` `construirTablaProyectada` | Devuelve `List<CuotaProyectada>` sin tocar BD |
| Endpoint de simulación | `GET /rest/prst/simularAbonoCapital/{id}?valor&modalidad` (`PrestamoRest:466`) | Envuelve en `{exito, etapa:"SIMULACION", mensaje, resultado}` |
| DTO de fila | `ejb/crd/service/dto/CuotaProyectada.java` | `numeroCuota, fechaVencimiento, capital, interes, cuota, saldoCapital` |
| DTO de cabecera | `SimulacionAbonoCapital.java` | `plazoActual/Nuevo`, `cuotaActual/Nueva`, `ahorroIntereses`, `tablaProyectada` |
| Diálogo de abono en FE | `crd/dialog/pagos/abono-capital-dialog.component.*` | Ya renderiza la tabla proyectada y las dos modalidades |
| Servicio Jasper del FE | `shared/services/jasper-reportes.service.ts` | `generar(modulo, nombre, params, formato) → Blob` |
| Descarga correcta del blob | `rrh/forms/procesos/descarga-reporte.ts` `guardarArchivo()` | Inserta el `<a>` en el DOM y revoca con `setTimeout(…, 2000)` |

**Las dos modalidades del abono ya son parámetros del endpoint: `modalidad=1` reduce plazo,
`modalidad=2` reduce cuota.** No hay que escribir esa matemática.

### 2.2 Lo que NO existe

- **Simulación de préstamo nuevo.** No hay camino de solo lectura: hoy hay que guardar el
  `Prestamo`, llamar `POST /prst/generarTablaAmortizacion/{id}/{tieneCuotaCero}` —que **escribe en
  `CRD.DTPR`**— y consultar las cuotas.
- **Reestructuración, refinanciamiento, novación.** Cero lógica. Los campos `PRSTRSTR`
  (`reestructurado`), `PRSTRFNN` (`refinanciado`), `PRSTESNV` (`esNovacion`) y `PRSTMNNV`
  (`montoNovacion`) existen en la entidad **sin un solo escritor** en todo el backend.
  `EstadoPrestamo.CANCELADO_POR_NOVACION = 5` existe sin proceso que lo asigne.
- **Rubro `TipoAmortizacion`.** Los valores `1` (francesa) y `2` (alemana) son literales mágicos
  en `PrestamoServiceImpl:139,141` y `AbonoCapitalPrestamoServiceImpl:475,510,522,532`.
- **Periodicidad distinta de mensual.** `com.saa.rubros.Periodicidad` existe pero está huérfano en
  `crd`: el motor asume mensual y vencimiento el último día del mes.

### 2.3 El motor de amortización actual

`PrestamoServiceImpl`: `generarAmortizacionFrancesa` (~158-309) y `generarAmortizacionAlemana`
(~311-462) son **puras** —devuelven `List<DetallePrestamo>` sin escribir— pero son **`private`**, y
el único llamador público persiste. No reciben parámetros financieros: los leen de la entidad
`Prestamo` ya guardada (`:112-131`).

⚠️ **Dos redondeos distintos para la misma matemática:** `PrestamoServiceImpl:514` usa
`Math.round(v*100.0)/100.0`; `AbonoCapitalPrestamoServiceImpl:752` usa
`BigDecimal.setScale(2, HALF_UP)`.

---

## 3. 🔴 El bloqueo de Jasper, y la salida

`ReporteServiceImpl:195` tiene **un único punto de llenado** en todo el proyecto:

```java
JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parametros, conn);
```

Es la sobrecarga con `Connection`, sin rama alternativa, y la conexión se pide
**incondicionalmente** en `:187-188` aunque el reporte no la necesite. En todo `src/main/java` hay
**cero** ocurrencias de `JRBeanCollectionDataSource`, `JRDataSource` o `JREmptyDataSource`. Los 40
`.jrxml` del proyecto llevan `<query language="SQL">`; el único sin query está en el módulo `test`,
que `esModuloValido()` (`ReporteServiceImpl:314-318`) rechaza.

**Consecuencia: una simulación —que por decisión es efímera y no está en la base— no es
reportable con la infraestructura actual.**

**Salida adoptada:** agregar a `ReporteServiceImpl` un camino de llenado con
`JRBeanCollectionDataSource`, como método nuevo. Es **aditivo**: no toca los 40 reportes
existentes, que siguen por la rama JDBC. Descartado persistir la simulación en una tabla temporal:
contradice la decisión de efimeridad y exige DDL en producción.

### 3.1 Consecuencia para las plantillas

Las plantillas de simulación **no llevan `<query>`**: sus `<field>` se resuelven contra las
propiedades del bean `CuotaProyectada`. Es un patrón de autoría **distinto** al de los 13 reportes
de `crd` existentes. Quien las abra en Jaspersoft Studio tiene que configurarlas con un
*JavaBean Data Adapter*, no con una conexión JDBC.

### 3.2 ⛔ El `.jasper` no es opcional

Repetido de `CLAUDE.md` porque es el error que más caro sale: **en JasperReports 7.0.3 la
compilación en tiempo de ejecución no funciona.** Un reporte con solo `.jrxml` compila en el IDE,
pasa la revisión, entra al commit y revienta la primera vez que un usuario lo ejecuta. **Cada
`.jrxml` de este plan va acompañado de su `.jasper` compilado con Jaspersoft Studio 7.0.3 —la misma
versión— y los dos se commitean.**

---

## 4. Decisiones tomadas — NO volver a proponerlas

1. **La simulación es efímera.** No se guarda en base. El PDF es el único rastro. Sin DDL nuevo.
2. **Reestructurar = cuatro palancas**, y el usuario puede combinarlas: ampliar plazo, capitalizar
   mora e intereses vencidos al capital, cambiar la tasa, y período de gracia.
3. **Una sola calculadora.** Se extrae el núcleo de francesa/alemana a un servicio puro y
   `PrestamoServiceImpl` pasa a usarlo. Descartado escribir un motor aparte solo para simular: dos
   fórmulas divergen, y un simulador que no coincide con el préstamo real es peor que no tenerlo.
4. **La extracción va precedida de una auditoría** del motor actual (§5). No se congela en un
   servicio compartido una fórmula que no se verificó, incluido el manejo de decimales.
5. **Pantalla nueva dedicada por simulador**, y **además** el diálogo de abono existente
   (`abono-capital-dialog`) gana el botón de exportar el PDF de simulación.
6. El simulador de crédito nuevo pide: **monto, tasa, plazo, tipo de amortización, fecha de inicio,
   cuota 0 de gracia, desgravamen y seguro de incendio.** Sin los dos seguros el simulador mostraría
   una cuota menor que la que el socio va a pagar de verdad.
7. **Los `.jrxml` los escribe el agente; el usuario los compila** a `.jasper` en Jaspersoft Studio
   7.0.3 y commitea ambos.
8. Ninguna pantalla ni servicio de este plan **escribe** en `CRD.PRST` ni en `CRD.DTPR`.

Tomadas el 2026-08-25 al cerrar la auditoría de la fase 0 (§5), sobre reglas de negocio que el
código nunca tuvo claras:

9. **El interés proporcional del primer mes SE COBRA, y va en la cuota 1** (defecto D1). La cuota 1
   pasa a valer capital + interés del mes + proporcional. Se corrige `PrestamoServiceImpl:279` para
   que la cuota lo incluya, **igual que ya hace la alemana en `:402`**.
10. **Con cuota 0 de gracia, el período desde el desembolso hasta el primer vencimiento se cobra
    proporcional a los días reales** (defecto D4), no como mes comercial. En el ejemplo 15/03 →
    30/04 son 46 días: 153,33, no 100,00.
11. **`PRSTTSAA` y `PRSTINNM` son una sola tasa** (defecto D10): al guardar el préstamo,
    `interesNominal` se deriva de `tasa`. Elimina el default silencioso de 9 % de la mora.
12. **Consecuencia de la 10, decidida por el árbitro:** se quita el `+1` de `diasMesInicial`
    (`PrestamoServiceImpl:180`). Hoy el stub cuenta ambos extremos y la cuota 1 cobra encima un mes
    comercial completo: 47 días facturados para un período real de 46. Con la decisión 10 las dos
    cuotas tienen que contar días reales.
13. **Las correcciones aplican solo a tablas nuevas. Nada retroactivo.** Recalcular movería
    `DTPRCPTL`/`DTPRSICP` de cuotas que ya tienen `PagoPrestamo` asociado y descuadraría el
    desglose de `PGPR` contra `DTPR`.
14. **Toda la cartera está migrada de otro sistema y desde saaBE no se ha otorgado ningún crédito
    nuevo** (confirmado por el usuario el 2026-08-25). Por lo tanto **D1, D2, D3, D6, D7 y D8 no han
    causado ningún daño**: ninguna tabla de `CRD.DTPR` en producción salió de ese generador. Son
    defectos latentes, no deuda a reconciliar. Corregir bien, sin compatibilidad hacia atrás y sin
    backfills.

    ⚠️ **La excepción es D10, y no la tapa el punto 14.** El proceso de mora de las 02:00 corre
    sobre la cartera migrada **sin importar quién la creó**: lee `PRSTINNM` y, si viene nula o ≤ 0,
    cae a `TASA_POR_DEFECTO = 9.0` en silencio (`ProcesoMoraPrestamoServiceImpl:218-221`). "Los
    registros ya están como están" no aplica a un dato que un timer sigue tocando cada noche.

15. **`CuotaProyectada` gana tres campos: `desgravamen`, `seguroIncendio` y `total`.** Resuelto por
    el árbitro el 2026-08-25 al cerrar la fase 1. `ParametrosAmortizacion` recibía
    `desgravamenPorCuota` y `seguroIncendioPorCuota` pero la calculadora no podía expresarlos en la
    salida, así que la fila mostraba `cuota = capital + interés` **sin los seguros** — exactamente
    la falla que la decisión 6 existe para evitar. Peor: los totales de cabecera sí los incluirían,
    así que la suma de la columna visible no daría el total mostrado.

    `total = cuota + desgravamen + seguroIncendio`, **el mismo invariante que `DTPRTTLL`** en la
    tabla real. El cambio es **aditivo**: `CuotaProyectada` también la devuelve
    `simularAbonoCapital` en producción, y el diálogo de abono simplemente ignora los campos
    nuevos. Opcional y deseable más adelante: que el abono también los llene, ya que la
    re-amortización copia desgravamen y seguro de la última cuota reemplazada (§7.3 paso 6 de
    `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md`).

16. **Si la cuota 0 de gracia cobra o no los seguros lo decide el usuario al simular**, no una regla
    fija del código. Resuelto por el usuario el 2026-08-25, cerrando la duda que el agente BE dejó
    abierta en la §11.6 (había asumido que sí). `ParametrosAmortizacion` gana
    `cobrarSegurosEnCuotaCero`, y la pantalla lo ofrece como una casilla, visible solo cuando hay
    cuota 0.

    **Es inerte en la creación de préstamos reales, y por eso se puede agregar sin riesgo:**
    `PrestamoServiceImpl.generarAmortizacion` pasa `0.0` en `desgravamenPorCuota` y
    `seguroIncendioPorCuota` (comportamiento preexistente, verificado el 2026-08-25 en las líneas
    195-197), así que la casilla solo cambia algo donde los seguros son distintos de cero — el
    simulador. Si algún día el generador real empieza a calcular seguros, esta decisión hay que
    volver a mirarla.

---

## 5. Fase 0 — Auditoría del motor (GATE)

**Ninguna otra fase arranca hasta cerrar esta.** Se audita `generarAmortizacionFrancesa`,
`generarAmortizacionAlemana` y `redondear`, contrastados contra `construirTablaProyectada` de
`AbonoCapitalPrestamoServiceImpl`, que es la misma matemática escrita dos veces.

Puntos que la auditoría tiene que responder con un número concreto, no con una opinión:

1. `SUM(capital)` == monto exacto, incluido el ajuste de residuo de la última cuota, en francesa,
   en alemana y con cuota 0.
2. El interés proporcional del primer mes se cuenta **una sola vez** (~181 y el reparto ~238-243).
3. Deriva por redondeo cuota a cuota: ¿el saldo llega exactamente a 0?
4. Invariantes `saldoInicialCapital = capital + saldoCapital + saldoOtros` y
   `total = cuota + desgravamen + valorSeguroIncendio` en TODAS las filas, incluida la 0 y la
   última. Hubo un defecto histórico de campos sin llenar (§3.1 de
   `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md`): confirmar si está corregido.
5. `tasa` (PRSTTSAA) vs `interesNominal` (PRSTINNM): la amortización usa la primera y el proceso de
   mora la segunda. ¿Deliberado o campo cruzado?
6. Divergencia entre los dos motores para el mismo saldo/tasa/plazo.
7. Casos borde: tasa 0 o negativa, plazo 1, monto mínimo, `fechaInicio` nula, plazo > 600.

**Regla de cierre:** lo que la auditoría marque como *defecto confirmado* se corrige **antes** de
extraer la calculadora. Lo que marque como *produce datos vivos en producción* se **congela tal
cual** y se documenta, aunque sea feo: cambiarlo movería préstamos ya emitidos.

### 5.1 ✅ RESULTADO DE LA AUDITORÍA — 2026-08-25

Hecha replicando la aritmética `double` de los dos motores en un harness independiente y
contrastando fila por fila. El árbitro verificó además los cuatro hallazgos de mayor severidad
leyendo el código línea por línea.

**Lo que está bien, y se dice primero:** el defecto histórico de §3.1 de
`ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md` **está corregido** — `saldoInicialCapital`, `total`,
`totalConSeguro`, `valorSeguroIncendio` y el espejo `idEstado`=`estado` se llenan en los tres
constructores. La captura de `saldoCapitalAntesDeLaCuota` está en el orden correcto. Las
validaciones de entrada cubren los cinco campos obligatorios. Los vencimientos son correctos en los
cuatro caminos. El interés proporcional **no compone**: entra a `interes` y nunca toca
`saldoCapital`.

| # | Defecto | Ubicación | Severidad |
|---|---|---|---|
| **D1** | El interés proporcional entra en `DTPRINTR` pero **no** en `DTPRCUOT` ni `DTPRTTLL` (francesa). La alemana no tiene el defecto (`:402`) | `:239` vs `:279`/`:300` | **Alta — es plata** |
| **D4** | Con cuota 0, el proporcional se calcula (`:181`) y se descarta. El comentario de `:237` afirma lo contrario y **es falso** | `:186-229`, `:238` | **Alta** |
| **D10** | `PRSTTSAA` y `PRSTINNM` sin sincronizar; con `PRSTINNM` nula la mora cae a un default silencioso de **9 %** | `PrestamoRest:138,163` | **Alta** |
| **D2** | La alemana **nunca** ajusta el residuo: la guarda mira el `double`, donde el residuo no vive (~1,8e−12) | `:405` | Alta |
| **D3** | La francesa arrastra lo mismo, de forma dependiente de los datos (a veces da exacto) | `:253` | Media |
| **D9** | Los dos motores **no** producen la misma tabla: 2 centavos de diferencia en la última cuota | — | Media |
| **D6** | `SICP = capital + saldoCapital + saldoOtros` falla en **4 de 12 filas** de la alemana | — | Media |
| **D5** | `DTPRSLDO` = capital pendiente en el generador, = importe por cobrar en los otros seis escritores del repo | `:204,281,355,434` | Media |
| **D8** | El stub cuenta ambos extremos **y** la cuota 1 cobra un mes completo: un día de más, siempre | `:180` | Baja pero sistemática |
| **D7** | `capital + interés ≠ cuota` por ±0,01 en filas sueltas; justo por debajo del umbral de la guarda del motor | — | Baja |

**Cómo revienta D1 en producción, que es lo que lo hace grave:** `MotorPagoPrestamoServiceImpl`
toma `totalPendiente` de `cuota.getTotal()`. Cobra 888,49 cuando el desglose suma 945,16; la
prelación consume todo, el restante queda en 0,00, **la guarda de desfase no se dispara** y la cuota
se marca **PAGADA sin ninguna alarma**. Sobre 10.000 al 12 % a 12 meses la entidad deja de cobrar
**56,66 por préstamo**; sobre 100.000 al 15,5 % a 60 meses, **731,94**.

**La corrección de D2/D3/D6/D7/D9 ya está escrita y probada** en
`AbonoCapitalPrestamoServiceImpl:528-559`: redondear la cuota fija primero, redondear el saldo en
cada paso, y forzar `capitalCuota = redondear(saldo)` en la última cuota **sin condición**. No hay
que inventar nada: hay que portarla.

### 5.2 Casos borde

| Caso | Resultado |
|---|---|
| Tasa 0 o negativa | Rechazado por `:123`. Correcto: sin la guarda `cuotaFija` sería `NaN` |
| Plazo 1 | Correcto en francesa y alemana |
| `fechaInicio` nula | Rechazado por `:129`. Correcto |
| **Monto muy chico (0,05)** | **Roto**: 12 filas en cero y `SUM(capital) = 0,00` contra un monto de 0,05 |
| **Plazo > 600** | **Sin tope**: genera 600 filas en la BD. El generador no tiene el `MAX_CUOTAS_NUEVAS` que sí tiene `AbonoCapitalPrestamoServiceImpl:53` |

### 5.3 Qué se congela

- **La convención de vencimientos** (último día del mes, hora tomada de `fechaInicio`). Coherente en
  los cuatro caminos y respetada por el motor de abono.
- **Los residuos ya persistidos** de D2/D3/D6. Ver decisión 13.
- **`DTPRSLDO` en filas que ya pasaron por el motor de pagos**: ahí la semántica ya es la del motor.
- **La prelación y la tolerancia de 0,01** (`MotorPagoPrestamoServiceImpl:344-365`), confirmadas por
  negocio el 2026-08-14. D7 se roza con ese umbral, pero la solución es que el generador cierre el
  redondeo, no mover la tolerancia.

---

## 6. Arquitectura

```
CalculadoraAmortizacionService (@Local)          ← NUEVO, puro, sin EntityManager
  calcular(ParametrosAmortizacion) → List<CuotaProyectada>
        ▲                                    ▲
        │                                    │
PrestamoServiceImpl                  SimulacionPrestamoService (@Local)  ← NUEVO
  generarAmortizacion*                 simularCreditoNuevo(...)
  (pasa a delegar; sigue                simularReestructuracion(...)
   persistiendo igual)                        │
                                    AbonoCapitalPrestamoService.simular  ← YA EXISTE, se reusa
```

`ParametrosAmortizacion` es un DTO con escalares: `monto`, `tasaAnual`, `plazo`,
`tipoAmortizacion`, `fechaInicio`, `tieneCuotaCero`, `desgravamenPorCuota`, `seguroIncendioPorCuota`.
**No recibe una entidad `Prestamo`**: es lo que permite simular sin que exista el préstamo.

La reestructuración es la misma calculadora sembrada con el estado actual del préstamo: capital de
arranque = saldo de capital pendiente (+ mora e interés vencido si se capitalizan), y las otras tres
palancas entran como `tasaAnual`, `plazo` y `tieneCuotaCero`/gracia.

---

## 7. Contratos REST propuestos

Todos **GET/POST de solo lectura**. Envoltura igual a la de las simulaciones existentes:
`{exito, etapa:"SIMULACION", mensaje, resultado}`.

| Método | Path | Cuerpo / query | Devuelve |
|---|---|---|---|
| `POST` | `/rest/prst/simularCreditoNuevo` | `ParametrosAmortizacion` | tabla + totales |
| `POST` | `/rest/prst/simularReestructuracion` | `idPrestamo` + las 4 palancas | tabla + comparativa antes/después |
| `GET` | `/rest/prst/simularAbonoCapital/{id}?valor&modalidad` | — | **ya existe, no se toca** |
| `POST` | `/rest/prst/simulacion/reporte` | tipo + los mismos parámetros | **PDF** (recalcula y llena) |

### 7.1 Contrato canónico de `simularReestructuracion` — fijado por el árbitro el 2026-08-25

BE y FE llegaron con formas distintas: 7 campos coincidían, 6 que el FE lee no existían, y 7 que el
BE manda no se usaban. **Manda la forma del backend**, que es más rica y más honesta, con tres
campos agregados. Nombres definitivos:

```
idPrestamo, tipoAmortizacion,
saldoCapitalPendiente,              // NO "saldoCapitalActual"
capitalizarVencido,
moraCapitalizada,                   // desglosado a propósito: el socio ve QUÉ se capitalizó
interesVencidoCapitalizado,
capitalDeArranque,                  // NO "capitalReestructurado"
tasaActual, tasaNueva,              // ← AGREGAR en BE
plazoActual, plazoNuevo,
cuotaActual, cuotaNueva,
mesesGracia,                        // ← AGREGAR en BE (eco del pedido)
totalAPagarActual, totalAPagarNuevo,
tablaProyectada
```

**Por qué el desglose gana al campo único:** el FE había inferido un `valorCapitalizado` agregado.
Capitalizar mora e interés vencido es la palanca que más plata mueve en una reestructuración, y el
socio tiene derecho a ver **de qué se compone** lo que se le suma al capital, no un número total.
Un solo campo obliga a confiar; dos lo hacen auditable en pantalla.

`totalAPagarActual` incluye siempre mora e interés vencido pendientes, **se capitalicen o no**: si
no se capitalizan esa deuda no desaparece, solo queda fuera de la tabla nueva
(`SimulacionPrestamoServiceImpl:142-146`).

### 7.2 `SolicitudReporteSimulacion` — dos campos que el FE infirió mal

Verificado contra `ejb/crd/service/dto/SolicitudReporteSimulacion.java` el 2026-08-25. **Manda el
Java.** De ocho campos, seis coincidían y **dos no**:

| Java (canónico) | Lo que el FE infirió |
|---|---|
| `valorAbono` | ~~`valor`~~ |
| `modalidadAbono` | ~~`modalidad`~~ |

El FE los nombró como los query params de `GET /simularAbonoCapital?valor&modalidad`, que es una
inferencia razonable — pero dentro de un DTO que transporta **tres cuerpos distintos**, `valor` a
secas es ambiguo, y por eso el Java los desambigua. Los nombres del backend quedan.

Los valores de `tipo` sí coincidían exacto: `CREDITO_NUEVO` | `ABONO_CAPITAL` | `REESTRUCTURACION`
(`PrestamoRest:620,643,666`).

**Cómo habría fallado:** el reporte de abono habría llegado con `valorAbono` y `modalidadAbono` en
null. Se salvó porque los botones están deshabilitados hasta la 3b. Es el segundo desajuste de
contrato del proyecto por inferir una forma en vez de leerla — el primero fue la respuesta de
`simularReestructuracion` (§7.1). **Cuando un agente infiera un contrato, el árbitro lo contrasta
contra el Java antes de darlo por bueno.**

**El reporte recalcula en el backend a partir de los parámetros**; el frontend no le manda las filas.
Así el PDF no puede diferir de lo que se mostró ni ser manipulado desde el cliente.

---

## 8. Plantillas Jasper

| Plantilla | Simulador |
|---|---|
| `RPRT_SMLC_NUEV` | Crédito nuevo |
| `RPRT_SMLC_ABON` | Abono a capital |
| `RPRT_SMLC_RSTR` | Reestructuración |

Requisitos de las tres:

- **Sin `<query>`**: el detalle viene por `JRBeanCollectionDataSource` sobre `CuotaProyectada`.
- **Leyenda de simulación imposible de pasar por alto**: banda de título y pie de cada página con
  el texto de que es una simulación referencial, sin valor contractual, y no constituye aprobación
  de crédito. Es el requisito funcional central: estos PDF van a circular.
- Parámetros de cabecera como escalares (socio, fecha, monto, tasa, plazo, totales).
- ⚠️ `convertirTiposParametros` (`ReporteServiceImpl:220-248`) **no convierte fechas ni booleanos**:
  las fechas viajan como `String` `dd/MM/yyyy`, igual que en `RPRT_ESCT_APRT`.
- `P_IMAGEN` se omite: el backend inyecta el logo si no viene.

---

## 9. Fases, agentes y tablero

| Fase | Agente | Contenido | Estado |
|---|---|---|---|
| **0** | BE | Auditoría del motor (§5). **GATE** | ✅ **Cerrada 2026-08-25** — 10 defectos, §5.1 |
| **1** | BE | Correcciones D1-D10 según decisiones 9-13 + `CalculadoraAmortizacionService` + `PrestamoServiceImpl` delegando | ✅ **Cerrada 2026-08-25** — sin compilar, ver §11 |
| **2** | BE | `SimulacionPrestamoService` + los 2 endpoints de simulación | ✅ **Cerrada 2026-08-25** — sin compilar, ver §11 |
| **3** | BE | Llenado Jasper por colección en `ReporteServiceImpl` + endpoint de reporte + los 3 `.jrxml` | ✅ **Cerrada 2026-08-25** — sin compilar, ver §11.11. ⚠️ **Faltan los 3 `.jasper`, ver 3b** |
| **3b** | Usuario | Compilar los 3 `.jasper` en Jaspersoft Studio 7.0.3 y commitear ambos | ✅ **Cerrada 2026-08-25** — los tres con md5 distinto, verificado que no cayeron en el defecto del clon (§10.1) |
| **4** | FE | Menú, rutas y pantalla del simulador de crédito nuevo | ✅ **Entregada 2026-08-25** |
| **5** | FE | Pantalla del simulador sobre préstamo existente (abono + reestructuración) | ✅ **Entregada 2026-08-25** |
| **5b** | FE | Realineación al contrato canónico de la §7.1 | ✅ **Entregada 2026-08-25** — ver §12 |
| **6** | FE | Botón de exportar PDF en los dos simuladores y en el `abono-capital-dialog` | ✅ **Entregada 2026-08-25**, **deshabilitados** hasta la 3b |
| **6b** | FE | Fix de las fechas `Invalid Date` en `abono-capital-dialog` y `precancelacion-dialog` (§10.4) | ✅ **Entregada 2026-08-25** |
| **6c** | FE | Corregir `valorAbono`/`modalidadAbono` en `SolicitudReporteSimulacion` (§7.2) | ✅ **Entregada 2026-08-25** |
| **T** | FE | **Limpieza transversal**: helpers de descarga a `shared/`, deduplicación del blob en `crd` | ✅ **Entregada 2026-08-25** — cinco lugares, cero `revokeObjectURL` a mano en `crd` |
| **D** | Usuario | **Desplegar el WAR**, compilar el FE y habilitar los 3 `exportarPdfHabilitado` | ⬜ **Único paso que falta** |

**Estado: el proyecto está completo en código.** Todo lo que queda es despliegue.

⚠️ **Los botones de PDF salen deshabilitados a propósito.** Hay una sola bandera
`exportarPdfHabilitado = false` por pantalla (`simulador-credito`, `simulador-prestamo`,
`abono-capital-dialog`). **Habilitarlas antes de que el WAR esté arriba da 500.** Esa precaución ya
sirvió una vez: cuando se descubrió el desajuste de `valorAbono`/`modalidadAbono` (§7.2), los
botones deshabilitados evitaron que llegara a un usuario.

**Paralelización:** la 4 puede arrancar contra el contrato de la §7 apenas cierre la 2. La 5 depende
de la 2. La 6 depende de la 3b. **Nada se puede *probar* hasta que el WAR con las fases 1-3 esté
desplegado y los `.jasper` commiteados.**

⚠️ **El tablero se resetea si alguien reescribe el documento.** Pasó el 2026-08-25: las fases 5 y 6b
figuraban en ⬜ estando entregadas. **Solo el árbitro edita este archivo** (regla fijada ese día,
después de que dos agentes y el árbitro escribieran sobre las dos copias y se perdiera contenido);
los agentes reportan en su respuesta.

**Nada de esto compila acá**: el usuario compila en Eclipse. No usar `mvn` ni `javac` para verificar.

---

## 10. Hallazgos laterales — no son de este plan, pero conviene no perderlos

1. **7 reportes de `crd` ejecutan el binario de otro reporte.** `RPRT_TBLA_CSPR`, `CSPT`, `ETDI`,
   `JBPR`, `JBPT`, `PNCM`, `RMJP` y `RNCP` tienen `.jasper` **byte-idénticos** entre sí (mismo md5,
   44.664 bytes) y sus `.jrxml` declaran internamente `name="RPRT_TBLA_ACML"`. Son copias de ACML
   con la query editada **cuyo `.jasper` nunca se recompiló**; como el servicio prefiere el
   `.jasper`, en runtime corren la consulta de ACML. Preexistente, ajeno a este plan, sin verificar
   contra producción.
2. **`RPRT_TBLA_ETDI` no tiene `.jrxml` en el repositorio**, solo el `.jasper`. Sin fuente.
3. **`simularAbonoCapital` no es del todo puro:** llama a `calcularSaldosRealesCuota`, que tiene un
   efecto de persistencia deliberado y documentado (autocorrige cuotas a PAGADA). Hoy se dispara
   desde un diálogo puntual; una pantalla de consulta lo invocaría mucho más seguido.
4. **Las fechas de la tabla proyectada no se muestran en dos diálogos en producción.** Hallado por
   el agente FE el 2026-08-25 y verificado por el árbitro:
   `abono-capital-dialog.component.html:199` y `precancelacion-dialog.component.html:113` hacen
   `{{ c.fechaVencimiento | date: 'dd/MM/yyyy' }}` directo. Pero `fechaVencimiento` es un
   `LocalDateTime` que Jackson serializa como **arreglo** (`[2026,8,31,0,0]`), y el pipe `date` de
   Angular no lo acepta: `new Date([2026,8,31,0,0])` da `Invalid Date`.

   El modelo lo declara mal, además: `CuotaProyectada.fechaVencimiento` está tipado como `string`
   (`crd/model/pagos/operaciones-pago.ts:129`), mientras que en la misma familia de modelos la
   línea 322 sí lo tipa como `string | number[] | Date` — alguien ya conocía el problema y no se
   propagó.

   Encaja con que las fases 2-6 de `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md` se entregaran
   **«sin pruebas funcionales»**: nadie ejerció esa tabla. La forma correcta es
   `FuncionesDatosService.formatoFecha()` / `convertirFechaDesdeBackend()`, que es lo que usa
   `devolucion-aportes.component.ts`. **Fix chico, fuera del alcance de este plan; ver fase 6b.**

---

## 11. Estado de implementación — Fases 1, 1b y 2 (BE) — 2026-08-25

**Sin compilar** (no hay `mvn`/`javac` en este entorno; lo compila el usuario en Eclipse). Revisado
a mano, campo por campo, contra el código previo — recomiendo compilar antes de tocar la fase 2.

### 11.1 Archivos

| Archivo | Qué cambió |
|---|---|
| `ejb/crd/service/dto/ParametrosAmortizacion.java` | **Nuevo.** DTO de escalares de la §6. |
| `ejb/crd/service/CalculadoraAmortizacionService.java` | **Nuevo.** `@Local`, `calcular(...)`. |
| `ejb/crd/serviceImpl/CalculadoraAmortizacionServiceImpl.java` | **Nuevo.** `@Stateless`, sin `EntityManager`. Único lugar del sistema con la matemática de amortización. |
| `ejb/crd/serviceImpl/PrestamoServiceImpl.java` | `generarAmortizacionFrancesa`/`Alemana` pasan a ser wrappers de una cuota línea que arman `ParametrosAmortizacion` y delegan; `construirDetalle(...)` mapea `CuotaProyectada` → `DetallePrestamo` conservando todos los campos e invariantes. `saveSingle` deriva `interesNominal` de `tasa` (D10). Se quitó el campo `@EJB FechaService fechaService`, que quedó sin uso al mover la matemática a la calculadora. |
| `ejb/crd/serviceImpl/ProcesoMoraPrestamoServiceImpl.java` | Traza nueva cuando se activa el default silencioso de 9 % (`TASA_POR_DEFECTO`), sin quitarlo — pedido explícito del encargo. |

### 11.2 Defectos D1-D10: dónde quedó cada uno

Todos corregidos **dentro de `CalculadoraAmortizacionServiceImpl`**, no como parches puntuales sobre
el código viejo: la Parte A y la Parte B del encargo se hicieron en un solo paso, escribiendo
directamente la versión ya corregida en el servicio nuevo, en vez de corregir primero
`PrestamoServiceImpl` y extraer después (mismo resultado final, sin el archivo intermedio que la
Parte B iba a borrar de todos modos).

| Defecto | Dónde | Cómo |
|---|---|---|
| D1 | `calcularFrancesa` | `cuota = redondear(capitalCuota + interes)`, igual que la alemana. El capital se sigue derivando con el interés SIN proporcional (`interesBase`), tal como pedía el encargo — no se tocó. |
| D2/D3/D6/D7/D9 | `calcularFrancesa`/`calcularAlemana` | Portado de `AbonoCapitalPrestamoServiceImpl:501-560`: cuota fija (o capital fijo en alemana) redondeada una sola vez arriba, `interes`/`saldoCapital` redondeados en cada paso, última cuota = `redondear(saldoAntes)` **sin condición** de magnitud. Se incluyó también el guardarraíl `if (capitalCuota > saldoAntes) capitalCuota = redondear(saldoAntes)` que trae el método de origen — no estaba en la lista de "tres cambios" del encargo, pero es parte literal de lo que se portó. |
| D4 | `agregarCuotaCero` | La cuota 0 cobra `capital * tasaDiaria * díasReales(fechaInicio → su propio vencimiento)`, ya no `saldoCapital * tasaMensual`. Con el ejemplo del plan (15/03 → 30/04) da $153,33. |
| D5 | No aplica acá | Es de mapeo (`DTPRSLDO`), se trata en `construirDetalle`/entidad, no en la calculadora. |
| D8 | `calcular` | `diasMesInicial` sin el `+1`. |
| D10 | `PrestamoServiceImpl.saveSingle` | `interesNominal = tasa` en cada guardado (PUT y POST ya comparten `saveSingle`; no hizo falta tocar `PrestamoRest`). El default de 9 % en `ProcesoMoraPrestamoServiceImpl` **se dejó**, con traza nueva cuando se activa. |
| Casos borde (ítem 6) | `validar` / `validarNingunaCuotaEnCero` | `plazo > 600` → `PLAZO_EXCEDE_TOPE` (rechazo duro, no truncado en silencio — ver 11.3.2). Cualquier cuota regular con `capital` o `cuota` en 0,00 → `MONTO_INSUFICIENTE_PARA_PLAZO`. |

### 11.3 Decisiones tomadas al implementar — no estaban explícitas en el encargo

1. **D4 y D8 se corrigieron para los dos tipos de amortización**, no solo para la francesa. La
   auditoría (§5.1) solo cita líneas de `generarAmortizacionFrancesa` para D4/D8, pero
   `generarAmortizacionAlemana` tenía el mismo bloque de cuota 0 copiado y pegado, con el mismo
   defecto. Dejarlo sin corregir en la alemana habría significado que la única calculadora del
   sistema (decisión 3) heredara un defecto no corregido de uno de los dos motores. Si el árbitro
   quería el alcance limitado a la francesa, esto es una desviación y hay que revisarla.
2. **El tope de 600 se implementó como rechazo duro (`IncomeException`), no como truncado
   silencioso.** En `AbonoCapitalPrestamoServiceImpl` el plazo nuevo es un valor DERIVADO de un
   abono y truncarlo en silencio es razonable. Acá el plazo es un dato que el usuario pide para un
   préstamo real: truncarlo en silencio generaría un préstamo con menos cuotas de las pedidas, sin
   avisar. Me pareció el riesgo mayor de los dos, así que rechacé en vez de truncar.
3. ~~`ParametrosAmortizacion.desgravamenPorCuota` / `seguroIncendioPorCuota` no los usa la
   calculadora.~~ **RESUELTO por la decisión 15 del árbitro — ver §11.6.**
4. **Se quitó el campo `@EJB FechaService fechaService` de `PrestamoServiceImpl`.** Quedó sin ningún
   uso al mover toda la matemática de fechas a la calculadora; lo dejé fuera para no tener una
   inyección muerta.

### 11.4 Lo que NO se tocó, tal como pedía el encargo

`MotorPagoPrestamoServiceImpl`, la prelación, la tolerancia de 0,01, y
`AbonoCapitalPrestamoServiceImpl` (solo se leyó, no se modificó — sigue siendo la fuente de la que
se portó D2/D3/D6/D7/D9). Nada retroactivo: no hay ningún `UPDATE` ni recálculo de `DetallePrestamo`
existentes; los fixes solo afectan tablas que se generen de acá en adelante.

### 11.5 Pendiente de verificación de la fase 1 (no pude hacerla yo)

- **Compilar en Eclipse.** No usé `mvn` ni `javac`.
- Correr `generarTablaAmortizacion` francesa y alemana, con y sin cuota 0, contra un caso conocido
  y confirmar a mano `SUM(capital) == monto`, el ejemplo de $153,33 de la cuota 0, y que la cuota 1
  sin cuota 0 incluya el proporcional (D1).
- Confirmar con el árbitro la decisión 1 de la §11.3 (alcance del fix de D4/D8 a la alemana).

---

### 11.6 Fase 1b — `CuotaProyectada` gana `desgravamen`/`seguroIncendio`/`total` — 2026-08-25

Aplica la decisión 15 del árbitro (§4). Cambios:

| Archivo | Qué cambió |
|---|---|
| `ejb/crd/service/dto/CuotaProyectada.java` | +3 campos `Double`: `desgravamen`, `seguroIncendio`, `total`, con getters/setters. Nada más se tocó. |
| `ejb/crd/serviceImpl/CalculadoraAmortizacionServiceImpl.java` | `calcular` lee `desgravamenPorCuota`/`seguroIncendioPorCuota` de `ParametrosAmortizacion` (con `nvl`) y los pasa a `agregarCuotaCero`/`calcularFrancesa`/`calcularAlemana`/`fila`. Cada fila (incluida la 0) llena los tres campos nuevos; `total = redondear(cuota + desgravamen + seguroIncendio)` — el mismo invariante de `DTPRTTLL`, no otro. |
| `ejb/crd/serviceImpl/PrestamoServiceImpl.java` | `construirDetalle` ya no recibe `ParametrosAmortizacion` ni recalcula nada: copia `proyectada.getDesgravamen()/getSeguroIncendio()/getTotal()` directo a `DTPRDSGR`/`DTPRVLSI`/`DTPRTTLL` (y a `desgravamenFirmado`/`desgravamenOriginal`, igual que antes). La calculadora es ahora la única fuente de ese cálculo. |
| `ejb/crd/serviceImpl/AbonoCapitalPrestamoServiceImpl.java` | **No se tocó**, tal como pedía el encargo: `construirTablaProyectada` sigue sin llenar los tres campos nuevos, que quedan `null` en las filas que devuelve `simularAbonoCapital`. Es aditivo: el diálogo de abono ignora campos que no conoce. |

**Decisión sobre la cuota 0, pedida explícitamente por el encargo — no la adiviné, la tomé y la
dejo escrita acá:** la cuota 0 de gracia **SÍ cobra** `desgravamenPorCuota` y `seguroIncendioPorCuota`,
igual que las cuotas regulares (ver el javadoc de `agregarCuotaCero`). Razón: son primas ligadas a
que el préstamo esté vigente y asegurado, no a que se amortice capital — durante la gracia el
capital sigue expuesto al riesgo que esos seguros cubren. **No está verificada contra el producto
real**: el generador de `PrestamoServiceImpl` nunca ejerció la cuota 0 con un desgravamen/seguro
distinto de 0,0 (ambos parámetros pasaban siempre en `0.0`), así que esta rama de código no tiene
precedente en producción. Si el negocio decide que la gracia no cobra seguros, es cambiar dos
líneas en `agregarCuotaCero`, no un cambio de arquitectura.

---

### 11.7 Fase 2 — `SimulacionPrestamoService` + 2 endpoints — 2026-08-25

| Archivo | Qué es |
|---|---|
| `ejb/crd/service/dto/SolicitudReestructuracion.java` | **Nuevo.** `idPrestamo`, `capitalizarVencido`, `nuevaTasaAnual` (null = mantener), `nuevoPlazo` (null = mantener), `mesesGracia`. |
| `ejb/crd/service/dto/ResultadoSimulacionCreditoNuevo.java` | **Nuevo.** `tablaProyectada`, `totalCapital`, `totalInteres`, `totalDesgravamen`, `totalSeguro`, `totalAPagar`, `valorCuota` — exactamente los campos pedidos. |
| `ejb/crd/service/dto/ResultadoSimulacionReestructuracion.java` | **Nuevo.** Comparativa antes/después: `plazoActual/Nuevo`, `cuotaActual/Nueva`, `totalAPagarActual/Nuevo`, más `saldoCapitalPendiente`, `capitalizarVencido`, `moraCapitalizada`, `interesVencidoCapitalizado`, `capitalDeArranque` y `tablaProyectada`. |
| `ejb/crd/service/SimulacionPrestamoService.java` | **Nuevo.** `@Local`, `simularCreditoNuevo`/`simularReestructuracion`. |
| `ejb/crd/serviceImpl/SimulacionPrestamoServiceImpl.java` | **Nuevo.** `@Stateless`. Reusa `CalculadoraAmortizacionService` para los dos métodos. |
| `ws/rest/crd/PrestamoRest.java` | +`@EJB SimulacionPrestamoService` + `POST /simularCreditoNuevo` y `POST /simularReestructuracion`, mismo sobre `{exito, etapa:"SIMULACION", mensaje, resultado}` que `simularAbonoCapital`. Reusa `respuestaErrorNegocio` sin tocarlo: `PARAMETRO_INVALIDO` ya mapea a 400 (lista existente), los códigos nuevos (`MONTO_INSUFICIENTE_PARA_PLAZO`, `PLAZO_EXCEDE_TOPE`, `GRACIA_NO_SOPORTADA`) caen al 422 genérico de `IncomeException`, igual que `VALOR_INVALIDO` y el resto de los que no están en las listas `CODIGOS_4xx`. |

**`calcularSaldosRealesCuota`, explícito como pedía el encargo: NO se usó.** `simularReestructuracion`
lee `CRD.DTPR` tal cual está (`detallePrestamoDaoService.selectCuotasNoPagadasByPrestamo`), sin pasar
por `MotorPagoPrestamoService.calcularSaldosRealesCuota`. Ese método autocorrige cuotas a PAGADA como
efecto de persistencia deliberado (§10.3 del plan); usarlo en un servicio que la decisión 8 obliga a
que **no escriba nada** habría sido contradictorio. Costo aceptado: si `DTPR` y `PGPR` están
desfasados, el saldo que muestra la simulación puede diferir un poco del que reconciliaría ese
método. Aceptable en un simulador; no lo sería en una operación real.

### 11.8 Decisiones tomadas en la fase 2 — no estaban explícitas en el encargo

1. **"capitalizarVencido suma mora + interés vencido" (2 términos), no "+ capital atrasado" (3
   términos).** El encargo de este turno dice tres términos; la arquitectura del plan (§6) dice
   dos: *"capital de arranque = saldo de capital pendiente (+ mora e interés vencido si se
   capitalizan)"*. Fui con la versión del plan porque sumar un tercer término de "capital
   atrasado" **duplicaría plata**: `saldoCapitalPendiente` ya se calcula sobre TODAS las cuotas
   pendientes (`selectCuotasNoPagadasByPrestamo`), vencidas o no — el capital de una cuota vencida
   ya está adentro. Si el árbitro quería un tercer término genuinamente distinto (no ya cubierto
   por `saldoCapitalPendiente`), hace falta que diga exactamente qué campo es.
2. **`saldoCapitalPendiente = Σ(capital - capitalPagado)`** sobre las cuotas de
   `selectCuotasNoPagadasByPrestamo` (no PAGADAS ni CANCELADAS ANTICIPADAMENTE). Es el análogo sin
   efecto secundario de lo que `calcularSaldosRealesCuota` reconstruiría en vivo — ver 11.7. `mora`
   e `interés vencido` pendientes se leen de `saldoMora`/`saldoInteresVencido` (el neto, no el
   bruto `mora`/`interesVencido`), para no contar de más si ya hubo un pago parcial.
3. **"Mantener el plazo actual" (`nuevoPlazo == null`) = la cantidad de cuotas PENDIENTES hoy**
   (`pendientes.size()`), **no** `prestamo.getPlazo()` (el plazo ORIGINAL de todo el préstamo).
   Sembrar la tabla nueva con el plazo original completo, pero solo con el capital que queda
   pendiente, daría cuotas artificialmente chicas. Si el árbitro quería otra base, decirlo.
4. **`mesesGracia` fuera de `{0, 1}` se rechaza** con `GRACIA_NO_SOPORTADA` (422), no se trunca.
   La calculadora de la fase 1 solo modela UN período de gracia (una cuota 0); no hay soporte de
   gracia multi-mes en ningún lugar del sistema (§2.2 del plan: "Periodicidad distinta de mensual
   ... el motor asume mensual"). Truncar en silencio un pedido de 3 meses de gracia a 1 habría sido
   el mismo error que ya se evitó con el tope de 600 en la fase 1.
5. **`totalAPagarActual`/`totalAPagarNuevo` incluyen la mora e interés vencido pendientes SIEMPRE**,
   se capitalicen o no. Si `capitalizarVencido` es `false`, esa deuda no entra a la tabla nueva
   (no se le cobra en las cuotas nuevas) pero **tampoco desaparece**: sigo sumándola al total para
   que el número represente "lo que el socio va a terminar pagando en total", no solo lo que cubre
   la tabla. Es una lectura, no está pedida palabra por palabra en el encargo — el árbitro puede
   preferir que `totalAPagarNuevo` sea estrictamente la suma de la tabla nueva sin ese agregado.
6. **`cuotaActual`/`plazoActual` se derivan de `Prestamo`/`pendientes` en vivo**, no de la última
   simulación de abono ni de ningún caché: siempre la foto más reciente de `CRD.DTPR`.

### 11.9 Pendiente de verificación de la fase 1b y 2 (no pude hacerla yo)

- Compilar en Eclipse (fases 1, 1b y 2 son un solo build).
- Probar `POST /rest/prst/simularCreditoNuevo` con desgravamen y seguro > 0 y confirmar que la
  cuota 0 (si se pide) los cobra, y que `totalAPagar` de la cabecera coincide con `Σtotal` de la
  tabla.
- Probar `POST /rest/prst/simularReestructuracion` sobre un préstamo con cuotas vencidas (el caso
  que `simularAbonoCapital` rechaza) y confirmar que SÍ corre, y que `capitalizarVencido=true` vs
  `false` da `capitalDeArranque` y `totalAPagarNuevo` distintos.
- Confirmar con el árbitro las 6 decisiones de la §11.8, en particular la 1 (dos términos vs tres)
  y la 3 (qué significa "mantener el plazo actual").

### 11.10 Fase 2b — `tasaActual`/`tasaNueva`/`mesesGracia` en `ResultadoSimulacionReestructuracion` — 2026-08-25

Cierra el hueco que el FE ya había anticipado en su §12: la fase 2 no mandaba estos tres campos del
contrato canónico de la §7.1. Cambio chico y acotado:

| Archivo | Qué cambió |
|---|---|
| `ejb/crd/service/dto/ResultadoSimulacionReestructuracion.java` | +3 campos: `tasaActual`, `tasaNueva` (`Double`), `mesesGracia` (`Integer`), con getters/setters. Nada más se tocó — los nombres ya eran los canónicos de la §7.1. |
| `ejb/crd/serviceImpl/SimulacionPrestamoServiceImpl.java` | `tasaActual = nvl(prestamo.getTasa())`; `tasaNueva` es la misma variable que ya se usaba para sembrar `ParametrosAmortizacion.tasaAnual` (si `nuevaTasaAnual` venía null, ya era `tasaActual` — ahora ese valor efectivo también se expone). `mesesGracia` es la misma variable ya validada contra `{0,1}` — puro eco, sin recalcular nada. |

Sin decisiones nuevas que tomar acá: los tres campos ya existían como variables locales en el
método, solo faltaba copiarlos al DTO de salida.

### 11.11 Fase 3 (BE) — 2026-08-25

**Sin compilar** (no hay `mvn`/`javac` en este entorno). ⚠️ **Esta es la fase más fácil de romper en
silencio: leer §3.2 y 11.11.3 antes de dar por cerrado nada acá.**

#### 11.11.1 Archivos

| Archivo | Qué cambió |
|---|---|
| `ejb/reporte/service/ReporteService.java` | +`generarReporteDesdeColeccion(modulo, nombreReporte, parametros, datos, formato)`. Aditivo: `generarReporte` no se tocó. |
| `ejb/reporte/serviceImpl/ReporteServiceImpl.java` | Implementación del método nuevo. Carga **solo** el `.jasper` (sin rama de compilar `.jrxml` en runtime — ver 11.11.2), arma `JRBeanCollectionDataSource` sobre la lista que recibe, llena con `JasperFillManager.fillReport(jasperReport, parametros, dataSource)` — **nunca** pide `Connection` ni llama a `lookupDataSource()`. Reusa `exportarReporte`/`convertirTiposParametros`, que son privados y ya existían — no hubo que tocarlos. |
| `ejb/crd/service/dto/SolicitudReporteSimulacion.java` | **Nuevo.** `tipo` + los tres cuerpos posibles (`creditoNuevo`, los tres campos de abono, `reestructuracion`) + `nombreSocio`/`identificacionSocio` para la cabecera del PDF. |
| `ws/rest/crd/PrestamoRest.java` | +`@EJB ReporteService` + `POST /simulacion/reporte`. Según `tipo`, **recalcula** llamando a `simulacionPrestamoService`/`abonoCapitalPrestamoService` (nunca recibe la tabla del cliente), arma el mapa de parámetros del reporte y llama a `generarReporteDesdeColeccion("crd", nombreReporte, parametros, tabla, "PDF")`. |
| `src/main/resources/rep/crd/RPRT_SMLC_NUEV.jrxml` | **Nuevo.** Sin `.jasper` — ver 11.11.4. |
| `src/main/resources/rep/crd/RPRT_SMLC_RSTR.jrxml` | **Nuevo.** Sin `.jasper` — ver 11.11.4. |
| `src/main/resources/rep/crd/RPRT_SMLC_ABON.jrxml` | **Nuevo.** Sin `.jasper` — ver 11.11.4. |

#### 11.11.2 Por qué el método nuevo no tiene rama de compilar `.jrxml`

`generarReporte` (el existente, sin tocar) SÍ tiene una rama que intenta compilar el `.jrxml` en
runtime si el `.jasper` falta (con `JRJaninoCompiler`). Es exactamente la rama que CLAUDE.md marca
como rota en JasperReports 7.0.3 (`JRJaninoCompiler` no existe en el jar; Janino se retiró del
producto). No la copié al método nuevo: si faltara el `.jasper`, `generarReporteDesdeColeccion`
lanza `IllegalArgumentException` con un mensaje explícito en vez de fallar más abajo con un error
de classloading confuso. Es más honesto que replicar una rama que ya se sabe que no funciona.

#### 11.11.3 La conexión JDBC — verificado que no se pide

Pedido explícito del encargo: `generarReporteDesdeColeccion` **no llama a `lookupDataSource()` en
ningún punto** — se puede confirmar con un `grep lookupDataSource` sobre el método nuevo, que no da
resultados. Un datasource caído no puede tumbar este camino.

#### 11.11.4 ⛔⛔⛔ FALTAN LOS 3 `.jasper` — el reporte revienta sin esto

**Dejé los tres `.jrxml` sin compilar, como tenía que ser: yo no puedo compilarlos.** El usuario
tiene que abrir los tres en **Jaspersoft Studio 7.0.3** (misma versión, no una más nueva) y generar
el `.jasper` de cada uno en la misma carpeta (`src/main/resources/rep/crd/`), y commitear los seis
archivos (los 3 `.jrxml` ya están, faltan los 3 `.jasper`):

- `RPRT_SMLC_NUEV.jasper`
- `RPRT_SMLC_RSTR.jasper`
- `RPRT_SMLC_ABON.jasper`

**Sin esto, `POST /rest/prst/simulacion/reporte` responde `IllegalArgumentException: No se encontró
el reporte compilado` la primera vez que alguien lo prueba** — no es un caso borde, es el camino
feliz completo. Es la fase 3b del tablero (§9) y está marcada como bloqueante ahí.

#### 11.11.5 Diseño de las tres plantillas — decisiones que tomé

1. **`RPRT_SMLC_ABON` tiene 6 columnas, no 8.** `RPRT_SMLC_NUEV` y `RPRT_SMLC_RSTR` sí muestran
   `desgravamen`/`seguroIncendio`/`total` porque sus datos vienen de
   `CalculadoraAmortizacionServiceImpl` (los llena, fase 1b). `RPRT_SMLC_ABON` usa la tabla que
   devuelve `AbonoCapitalPrestamoServiceImpl.simular`, que el encargo de la fase 1b pidió explícito
   NO tocar — esos tres campos quedan `null` ahí. Meterlos en la plantilla de todos modos habría
   mostrado una columna en blanco en cada fila; mejor no prometerla.
2. **Orientación:** horizontal (`842x595`) para NUEV/RSTR por las 8-9 columnas; vertical
   (`595x842`, igual que `RPRT_ESCT_APRT`) para ABON, que entra cómodo en 6.
3. **`fechaVencimiento` es `java.time.LocalDateTime`, no `java.util.Date`.** Lo declaré así en el
   `<field>` (coincide con el getter real de `CuotaProyectada`) y formateo con
   `$F{fechaVencimiento}.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))` dentro del
   `textField`, en vez de usar el `pattern` nativo del elemento (que espera `java.util.Date`).
4. **Cabecera del PDF (socio) la manda el frontend como escalar (`P_NOMBRE_SOCIO`,
   `P_IDENTIFICACION_SOCIO`), no se busca en base.** `CalculadoraAmortizacionService` es
   deliberadamente ajena a `Entidad`/`Prestamo` (decisión 3 de la §4: recibe escalares, no una
   entidad), y traer un DAO de `Entidad` a `PrestamoRest`/`ReporteServiceImpl` solo para el nombre
   de un PDF me pareció una dependencia nueva no pedida. Si el frontend no manda esos dos campos,
   la cabecera del PDF sale en blanco — no es un error.
5. **La leyenda de simulación va en banda roja (`#B10000` de fondo, texto blanco) en el título Y en
   el pie de cada página**, no solo como texto plano — el encargo pedía "imposible de pasar por
   alto" y estos PDF van a circular fuera de la oficina.
6. **No usé `whenNoDataType="NoDataSection"` ni escribí banda `<noData>`** (a diferencia de
   `RPRT_ESCT_APRT`): una simulación que llega a este endpoint ya pasó por
   `simularCreditoNuevo`/`simularReestructuracion`/`simular`, que fallan con excepción antes de
   devolver una tabla vacía. Si algún día `datos` llega vacío de verdad, el reporte igual imprime
   (título + cabecera + tabla sin filas), no hay caso de error oculto.
7. **Verifiqué a mano** (sin Jaspersoft Studio) que los tres `.jrxml` son XML bien formado y que
   cada `$P{...}`/`$F{...}` referenciado tiene su `<parameter>`/`<field>` declarado — no hay
   referencias colgantes. **No pude verificar que compilen** ni que el layout se vea bien: eso
   requiere Jaspersoft Studio, que no tengo acá.

#### 11.11.6 Pendiente de verificación de la fase 3 (no pude hacerla yo)

- **Compilar los tres `.jasper` en Jaspersoft Studio 7.0.3** (§11.11.4) — bloqueante para probar
  nada de esta fase.
- Compilar el backend en Eclipse.
- Probar `POST /rest/prst/simulacion/reporte` con `tipo=CREDITO_NUEVO`, `ABONO_CAPITAL` y
  `REESTRUCTURACION` y confirmar que cada PDF se genera, que la leyenda de simulación se ve en
  título y pie, y que las fechas salen `dd/MM/yyyy` (no `Invalid Date`, no arreglo serializado).
- Confirmar con el árbitro las 6 decisiones de la §11.11.5, en particular la 4 (cabecera del socio
  como escalar del frontend, sin tocar `Entidad`).
- Revisar el layout real en Jaspersoft Studio: los anchos de columna y las posiciones de la
  §11.11.5 se calcularon a mano (sin poder previsualizar) — es probable que necesiten un ajuste
  visual fino.

---

## 12. Estado de implementación — Fase 5 (FE), realineada contra el contrato canónico — 2026-08-25

`crd/model/simuladores/simulador-prestamo-existente.ts` y `crd/forms/simulador-prestamo/` (fase 5,
entregada antes de que existiera la §7.1) tenían un `ResultadoSimulacionReestructuracion` inferido,
espejando `SimulacionAbonoCapital`. Se realineó contra los nombres definitivos de la §7.1:

- `saldoCapitalActual` → `saldoCapitalPendiente`, `capitalReestructurado` → `capitalDeArranque`.
- `valorCapitalizado` (un solo número) → `moraCapitalizada` + `interesVencidoCapitalizado`,
  mostrados **por separado** en pantalla, sin sumarlos (así lo pide la §7.1: capitalizar es la
  palanca que más plata mueve).
- Se agregaron `tipoAmortizacion` (dato simple, no comparativo) y la comparativa
  `totalAPagarActual` vs `totalAPagarNuevo`, destacada como el bloque central de la pantalla
  (`.total-comparativa`).
- `tasaActual`, `tasaNueva` y `mesesGracia` quedaron **opcionales** en el modelo (`?:`): la fase 2
  del backend todavía no los manda (llegan en la 2b, según la §7.1). La pantalla los oculta con
  `@if` cuando no vienen, en vez de mostrar `undefined`.
- Nuevo aviso condicional: si `capitalizarVencido` es `false`, se muestra una alerta explicando que
  la mora y el interés vencido pendientes no desaparecen — siguen debiéndose por fuera de la tabla
  nueva, aunque el "total a pagar actual" ya los cuenta. Sin este aviso el bloque destacado se leía
  como un ahorro que no es tal.

No se tocó nada del diálogo de abono ni de `simulador-credito` (fase 4) en esta corrección.
`tsc --noEmit` y `ng build` pasan limpio.
