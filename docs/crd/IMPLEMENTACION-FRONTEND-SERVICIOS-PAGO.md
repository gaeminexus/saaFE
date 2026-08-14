# Implementación frontend de los servicios de pago de préstamos

**saaFE · módulo CRD · 2026-08-14**

Mapa de dónde quedó cada endpoint de `GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md`. Léelo junto con
esa guía: acá no se repite el contrato, solo dónde vive en el frontend.

## Capa de servicios

| Endpoint de la guía | Método del frontend |
|---|---|
| `GET /aprt/saldosPorEntidad/{id}` | `OperacionesPagoPrestamoService.saldosPorEntidad()` |
| `POST /prst/pagarCuota` | `.pagarCuota()` |
| `POST /prst/pagarConAportes` | `.pagarConAportes()` |
| `GET /prst/simularAbonoCapital/{id}` | `.simularAbonoCapital()` |
| `POST /prst/abonarCapital` | `.abonarCapital()` |
| `GET /prst/simularPrecancelacion/{id}` | `.simularPrecancelacion()` |
| `POST /prst/precancelar` | `.precancelar()` |
| `POST /prst/anularOperacion` | `.anularOperacion()` |
| `GET /evpr/*` | `EventoPrestamoService` |
| `GET /hdtp/*` | `HistDetallePrestamoService` |

Archivos: `src/app/modules/crd/service/operaciones-pago-prestamo.service.ts`,
`evento-prestamo.service.ts`, `hist-detalle-prestamo.service.ts`. Constantes de endpoint
(`RS_EVPR`, `RS_HDTP`) en `service/ws-crd.ts`.

Tipos y catálogos en `src/app/modules/crd/model/pagos/`: `respuesta-pago.ts` (sobre común y tabla
de códigos de error), `catalogos-pago.ts` (estados de cuota y préstamo, modalidades, tolerancia),
`operaciones-pago.ts` (requests y resultados).

### Por qué este servicio no propaga el error de HTTP

El resto de servicios del módulo hace `throwError(() => error.error)` en `handleError`. Los de pago
no: devuelven siempre `RespuestaPago`, incluso en 4xx, porque el cuerpo del error trae el código
estable en `error` y **ese código es la lógica de pantalla** (ofrecer precancelación, sugerir otra
modalidad, refrescar saldos). El llamador solo ramifica por `resp.exito` y luego por `resp.error`.

## Capa de diálogos

`src/app/modules/crd/dialog/pagos/` — reutilizables desde cualquier pantalla que tenga un préstamo.
Reciben un `ContextoPrestamo` (`contextoDesdePrestamo(prestamo)`) y devuelven un
`SalidaDialogoPago`.

| Diálogo | Cubre |
|---|---|
| `PagoPrestamoDialogComponent` | Pago en efectivo (§4) y pago con aportes (§5), con selector de fuente |
| `AbonoCapitalDialogComponent` | Simulación + aplicación (§6-§7), comparativa y cambio de modalidad en caliente |
| `PrecancelacionDialogComponent` | Simulación + reparto efectivo/aportes + aplicación (§8-§9) |
| `HistorialOperacionesDialogComponent` | Historial `evpr`, tabla histórica `hdtp` y anulación LIFO (§10-§11) |
| `ReciboOperacionDialogComponent` | Comprobante con el desglose de `cuotasAfectadas`, imprimible |

Las derivaciones que sugiere la guía (`PRESTAMO_NO_AL_DIA` → pagar, `ABONO_CUBRE_CAPITAL` y
`VALOR_EXCEDE_DEUDA` → precancelar, `CUOTA_NO_CUBRE_INTERES` → modalidad 2, `SIN_CUOTAS_FUTURAS` →
pagar) se resuelven cerrando el diálogo con `{accion: 'ir-a-...'}`; la pantalla abre el flujo
correcto sin perder el préstamo elegido (`procesarSalida()`).

Estilos comunes en `pagos-shared.scss`. Todos los controles interactivos tienen 44px de alto mínimo
para uso táctil en tablet.

## Pantallas

- **`forms/cobros-personales`** — cobro en ventanilla. La parte destinada al préstamo se registra
  con `pagarCuota` (efectivo/transferencia/depósito) o `pagarConAportes` (método "Débito de cuenta
  de aportes"). Barra de acciones del préstamo con los cuatro flujos y el historial.
- **`forms/cruce-de-valores`** — cruce de saldo de aportes contra préstamos. Un
  `pagarConAportes` por préstamo, en secuencia.

Las pantallas antiguas `forms/cruce-valores` y `forms/pago-cuotas` quedaron sin tocar y siguen sin
enviar nada al backend.

## Decisiones que conviene conocer antes de tocar esto

**El filtro de préstamos usa `idEstado`, no `estadoPrestamo`.** Son columnas distintas
(`PRSTIDST` vs `ESPSCDGO`) y la guía es explícita: el estado operativo que evalúan los servicios de
pago está en `idEstado`. Ambas pantallas traen los préstamos del partícipe y descartan del lado del
cliente los estados terminales con `admiteOperaciones()`. Antes filtraban por `estadoPrestamo = 2`,
lo que dejaba fuera los créditos de plazo vencido (8) y en mora (11), que sí se pueden cobrar.

**Ya no se dirige dinero a una cuota puntual.** `pagarCuota`/`pagarConAportes` aplican el monto en
cascada desde la cuota más antigua con la prelación desgravamen → mora → interés vencido → interés →
capital → seguro. Las tablas de cuota de las pantallas son una **proyección** por saldo de cuota; el
desglose real llega en la respuesta y se muestra en el comprobante.

**El cruce sobre varios préstamos no es atómico.** No existe una operación que abarque varios
créditos: son N transacciones independientes, cada una anulable por su cuenta. Si una falla, el
backend no deja nada escrito para ese préstamo y su parte del fondo vuelve al pozo para los
siguientes.

**Ninguna pantalla vuelve a llamar `GET /aprt/getAll` para saldos.** Se usa `saldosPorEntidad`, que
agrega en la base de datos. `AporteService.getAll()` quedó con una advertencia en el JSDoc.

**Los pagos anulados se filtran.** §14 de la guía agrega `anulado` a `PagoPrestamo`. El modelo lo
incorpora junto con el helper `pagoVigente()`, y las dos pantallas que listaban pagos
(`participe-dash` y `navegacion-cascada`) lo aplican: un pago reversado ya no cuenta como válido en
el estado de cuenta del partícipe. Cualquier pantalla nueva que liste `PagoPrestamo` debe usar ese
helper.

---

# Pendiente por implementar

Decisiones tomadas el **2026-08-14**. Nada de esta sección está hecho todavía; es el trabajo que
sigue. Los puntos 1 y 2 dependen de que el backend publique servicios nuevos.

## 1. Aporte del socio a sus cuentas personales — bloqueado por backend

**Estado: se solicitó el servicio al equipo de backend.** Cuando llegue la documentación se
implementa acá.

El problema: la sección "Aportes del socio" de Cobros Personales permite repartir el cobro hacia
cesantía y jubilación, pero eso es un aporte del socio a sus propias cuentas y la guía de servicios
de pago cubre únicamente operaciones sobre préstamos. Hoy la pantalla lo captura, avisa que no se
guarda y solo confirma la parte del préstamo.

Qué hay que hacer cuando llegue el endpoint:

- Crear el servicio y los tipos siguiendo el patrón de `OperacionesPagoPrestamoService` (sobre de
  respuesta, códigos de error estables, sin propagar el error de HTTP).
- En `forms/cobros-personales/cobros-personales.component.ts`: reemplazar el aviso por la llamada
  real. Los puntos a tocar son `montoAportesSinEndpoint()` (el `computed` que hoy solo sirve para
  advertir), `puedeConfirmar()` (que hoy exige que el cobro incluya el préstamo) y
  `confirmarPago()`.
- En `cobros-personales.component.html`: quitar el bloque `.aviso-pendiente` de la tarjeta "Aportes
  del socio" y los dos `.allocation-note` que explican la limitación.
- Decidir si el cobro combinado (préstamo + aportes) se registra como dos operaciones
  independientes, como el cruce multi-préstamo, o si el backend expondrá algo atómico. Si son dos,
  el comprobante debe mostrar ambas y advertir que se anulan por separado.

## 2. Documentos de respaldo por préstamo — bloqueado por backend

**Decisión: crear una ruta nueva de pagos por préstamo que almacene los documentos por
`idPrestamo`.** Hay que solicitarla al equipo de backend.

Hoy el comprobante que se adjunta en Cobros Personales no se sube a ningún lado: solo se deja
constancia del nombre del archivo en el comprobante impreso
(`cobros-personales.component.ts`, método `mostrarRecibo`, arreglo `extras`).

Qué hay que definir con backend antes de implementar:

- Endpoint de carga (`multipart/form-data`, como `PrestamoService.cargarTablaExcel()`, que ya sube
  un archivo sin fijar `Content-Type` para que el browser ponga el boundary).
- Si el documento se asocia solo a `idPrestamo` o también al `idEvento` de la operación que lo
  originó. Asociarlo al evento permitiría mostrar el respaldo en el historial y saber qué respaldo
  quedó huérfano cuando una operación se anula — vale la pena pedirlo.
- Endpoints de listado y descarga por préstamo.
- Tipos y tamaños aceptados, y si se valida en el frontend antes de subir.

Qué hay que hacer en el frontend:

- Servicio nuevo en `modules/crd/service/`.
- En Cobros Personales, subir el archivo después de que el pago responda con éxito (nunca antes: si
  el pago falla no debe quedar un documento colgado) y reflejar el fallo de la subida sin dar por
  perdido el pago, que sí quedó registrado.
- Mostrar los documentos del préstamo en `HistorialOperacionesDialogComponent`.
- Extender el mismo adjunto a los diálogos de precancelación y abono a capital, que hoy no tienen
  dónde cargar un respaldo.

## 3. Quitar las pantallas antiguas del menú

**Decisión: se quitan del menú.**

- `modules/crd/menucreditos/menucreditos.component.ts`: eliminar las entradas
  `/menucreditos/pago-cuotas` (~línea 220) y `/menucreditos/cruce-valores` (~línea 225). Las
  entradas de `cruce-de-valores` y `cobros-personales` se quedan.
- Definir si además se quitan las rutas de `app.routes.ts` (líneas 1035 y 1037) y se borran las
  carpetas `forms/cruce-valores` y `forms/pago-cuotas`. Quitarlas solo del menú las deja accesibles
  por URL directa; borrarlas es más limpio pero es irreversible fuera de git. Ninguna de las dos
  envía nada al backend hoy, así que borrarlas no rompe ningún flujo — pero conviene confirmarlo
  antes, porque `pago-cuotas` es la única que llama a `GET /bext/getAll` (bancos externos) y a
  `ParticipeService`, y `cruce-valores` la única con vista contable Debe/Haber de aportes.
- `ExportService` seguirá teniendo usuarios después de esto; no borrarlo.

## 4. Decisiones ya cerradas (no requieren trabajo)

- **Cruce multi-préstamo no atómico**: aceptado tal como está. N préstamos son N transacciones
  independientes, cada una anulable por separado, y la pantalla lo advierte antes de confirmar.
- **Sin asignación a una cuota puntual**: aceptado. El backend aplica el monto en cascada y las
  tablas de las pantallas quedan como proyección.
- **Exportación a CSV/PDF de la consulta y arrastrar-y-soltar aporte sobre préstamo** (funciones de
  las pantallas antiguas): no se portan. El comprobante imprimible sí se portó, reimplementado en
  `ReciboOperacionDialogComponent` sin la dependencia de jsPDF por CDN. Si más adelante se pide la
  exportación, el punto de partida es `shared/services/export.service.ts`.
