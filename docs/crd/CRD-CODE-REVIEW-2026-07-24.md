# Revisión de Código — Módulo `crd` (Créditos)

**Fecha:** 2026-07-24
**Alcance:** `src/app/modules/crd/**` (préstamos, contratos, entidad-partícipe, históricos/archivos-petro, capa de servicios/modelos)
**Método:** revisión de una sola pasada por 5 agentes en paralelo, sin verificación adversarial cruzada. Tratar como pistas fuertes, no como confirmaciones al 100%, especialmente los últimos ítems de la lista.

19 hallazgos, ordenados de mayor a menor severidad.

---

## 1. El pago de préstamos muestra éxito pero nunca se guarda
`src/app/modules/crd/forms/cruce-valores/cruce-valores.component.ts:741`

El procesamiento de pagos ("Cruce de Valores") muestra un mensaje de éxito pero nunca llama al backend — la llamada de persistencia está comentada con un TODO.

**Escenario de falla:** Un cajero aplica un pago a un préstamo mediante Cruce de Valores; el diálogo se cierra con "✅ Pago ... realizado exitosamente" pero el saldo real del préstamo, la mora y los registros de cuotas nunca se actualizan en ningún lado. Mismo patrón en `src/app/modules/crd/forms/pago-cuotas/pago-cuotas.component.ts:583-599`.

## 2. El procesamiento de pagos de pensión nunca llega al backend
`src/app/modules/crd/forms/entidad-participe/jubilados/proceso-pago-jubilados/proceso-pago-jubilados.component.ts:386`

"Procesar Pago mes" para pagos de pensión de jubilados solo ejecuta una cuenta regresiva de 5 segundos en la interfaz y nunca llama a ningún servicio para registrar el desembolso.

**Escenario de falla:** El operador selecciona jubilados, hace clic en Procesar Pago, espera 5s, ve "Pago procesado exitosamente" y cree que el pago del mes quedó registrado — no se persiste nada en el servidor, y el estado de "procesado" se reinicia al recargar.

## 3. Los registros de afectación siempre guardan capital/interés en cero
`src/app/modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component.ts:1968`

`construirPayloadAfectacion()` fija `capitalAfectar`/`interesAfectar`/`desgravamenAfectar` en 0 sin importar el valor real que se está aplicando.

**Escenario de falla:** El usuario aplica exitosamente $500 de un archivo Petro a una cuota; el registro histórico persistido muestra `valorAfectar=$500` pero el impacto en capital/interés/desgravamen = $0 — ocurre en el camino normal (sin errores), corrompiendo el desglose contable de cada registro procesado por lote.

## 4. La conciliación de participantes devuelve datos falsos
`src/app/modules/crd/service/novedad-carga.service.ts:69`

`buscarParticipesSimilares()` devuelve datos ficticios (códigos y puntajes de similitud inventados) en lugar de llamar al backend; `vincularParticipe()` también simula una respuesta exitosa sin enviar nada al servidor.

**Escenario de falla:** Durante la conciliación real de archivos Petro/nómina, a un usuario que resuelve un participante no encontrado se le muestran "participantes similares" fabricados, sin ninguna indicación de que la coincidencia es falsa. Invocado desde `detalle-consulta-carga.component.ts:823` y `carga-aporte-back.component.ts:955`.

## 5. El formulario de edición de contratos no coincide con el modelo entidad/filial
`src/app/modules/crd/forms/contrato/contrato-edit/contrato-edit.component.ts:65`

Los nombres de campos del formulario reactivo (`codigoEntidad`, `filial` como string plano) no coinciden con los objetos anidados `entidad`/`filial` del modelo `Contrato`.

**Escenario de falla:** Al abrir cualquier contrato existente para editar, "Código Entidad" aparece vacío, y filial se renderiza como "[object Object]"; al guardar se envía un payload sin la referencia requerida a entidad/tipoContrato.

## 6. Editar un participante reinicia silenciosamente `tipoCalificacion`
`src/app/modules/crd/forms/entidad-participe/entidad-participe-info/entidad-participe-info.component.ts:152`

El control se llama `codigoTipoCalificacion`, pero `patchValue()` escribe a una clave `tipoCalificacion` que no existe en el form group.

**Escenario de falla:** Editar un participante existente y guardar sobrescribe/pierde el valor real de `tipoCalificacion` con 0. Comparar con `entidad-edit.component.ts`, que no tiene este problema.

## 7. Se muestra "Procesado" antes de que el backend lo confirme
`src/app/modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component.ts:898`

`procesarArchivo()` marca `archivoYaProcesado` como verdadero antes de que `aplicarPagosArchivoPetro` se resuelva.

**Escenario de falla:** Solicitud lenta o el usuario navega hacia otra pantalla antes de la respuesta; el rollback de la ruta de error nunca se ejecuta.

## 8. El guardado por lote no es atómico y arriesga duplicados en un reintento
`src/app/modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component.ts:1658`

`guardarAfectacionesFinancieras()` dispara todas las operaciones vía `forkJoin` sin atomicidad.

**Escenario de falla:** Una operación falla con 409 mientras otras tienen éxito; el usuario ve solo un mensaje de fallo genérico, asume que nada se guardó, y reintenta todo el lote — creando duplicados.

## 9. Saldo/mora en cero reemplazado por un campo de respaldo obsoleto
`src/app/modules/crd/forms/prestamo/prestamo-dash/prestamo-dash.component.ts:2021`

`obtenerSaldoPrestamo`/`obtenerMoraPrestamo`/`obtenerValorPrestamo` usan `||` (trata 0 como "faltante") en vez de `??`.

**Escenario de falla:** Un préstamo liquidado (`saldoTotal=0`) cae al campo `saldoCapital`, que puede aún contener valores obsoletos — KPIs y gráficos del dashboard muestran saldos incorrectos.

## 10. El botón "Pago Total" puede fijar un monto superior a los fondos disponibles
`src/app/modules/crd/forms/cruce-valores/pago-dialog.component.ts:403`

`setPagoTotal()` siempre fija `montoPago = saldoPrestamo`, ignorando `montoMaximo`.

**Escenario de falla:** Con fondos disponibles menores al saldo del préstamo, "Pago Total" fija un monto inválido y ambos botones de pago se deshabilitan silenciosamente.

## 11. Contratos nuevos guardados con un valor de `estado` de tipo incorrecto
`src/app/modules/crd/forms/contrato/contrato-edit/contrato-edit.component.ts:71`

El control `estado` tiene por defecto el string `'Activo'`, mientras que `Contrato.estado` es numérico en el resto del módulo.

**Escenario de falla:** Un contrato nuevo se guarda con `estado: "Activo"`; `contrato-consulta` lo lista como "Inactivo" ya que `"Activo" !== 1`.

## 12. Acceso sin protección a `entidad.codigo` puede colapsar la exportación
`src/app/modules/crd/forms/contrato/contrato-consulta/contrato-consulta.component.ts:238`

`exportarCSV`/`exportarPDF` acceden a `c.entidad.codigo` sin optional chaining.

**Escenario de falla:** Un contrato con `entidad` nula colapsa la exportación con un `TypeError`.

## 13. Nombre sin codificar en URL rompe la búsqueda de entidades
`src/app/modules/crd/service/entidad.service.ts:43`

`getCoincidencias()`/`getByNombrePetro35()` interpolan un nombre de texto libre en la URL sin `encodeURIComponent`.

**Escenario de falla:** Un nombre con "/", "?", "&", "#" o espacios rompe la ruta o trunca la solicitud.

## 14. Campos numéricos sin protección colapsan la exportación de cuotas
`src/app/modules/crd/dialog/prestamo-detalle-dialog/prestamo-detalle-dialog.component.ts:159`

`exportarCuotasCSV`/`exportarTodoPDF` llaman `.toFixed()` sin protección de nulos.

**Escenario de falla:** Una cuota con capital/interés/saldo nulo rompe la exportación completa del préstamo.

## 15. Falta manejo de errores bloquea la navegación de ruta ante fallo del backend
`src/app/modules/crd/resolver/consulta-carga-archivo-resolver.service.ts:14`

Este resolver no tiene `catchError`, a diferencia de sus hermanos (`estados`, `listados-crd`, `tipos-crd`).

**Escenario de falla:** Un fallo del backend deja al usuario atascado en la pantalla anterior sin error visible.

## 16. Errores reales del backend se muestran silenciosamente como lista vacía
`src/app/modules/crd/service/exter.service.ts:28`

El fallback de error en `getAll()` intenta una URL "alternativa" con un `.replace()` que nunca coincide (no-op), y termina devolviendo `[]`.

**Escenario de falla:** Una caída real del backend se muestra como "sin registros".

## 17. `getPage()` ignora sus propios parámetros de paginación/filtro
`src/app/modules/crd/service/exter.service.ts:56`

`getPage(page, size, criteria)` ignora los parámetros y llama a `getAll()`. Sin puntos de llamada actualmente.

## 18. El límite por cuota evita la validación de presupuesto agregado
`src/app/modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component.ts:1603`

`onValorAfectarChange()` retorna temprano al limitar por cuota, saltándose la validación de presupuesto agregado.

**Escenario de falla:** El "saldo pendiente" en pantalla se vuelve negativo silenciosamente durante la captura (el guardado final sí revalida en el servidor).

## 19. Reinicio incompleto del estado de la interfaz entre búsquedas de participantes
`src/app/modules/crd/forms/entidad-participe/participe-dash/participe-dash.component.ts:1776`

`buscarEntidad()`/`cargarEntidadPorCodigo()` no reinician todos los mapas/estados entre búsquedas consecutivas (solo el botón "limpiar" lo hace).

**Escenario de falla:** Problema latente de estado obsoleto; no es un cruce de datos entre participantes hoy en día porque `Prestamo.codigo` es una PK global.

---

## Prioridad recomendada

Los hallazgos #1–#4 son los más urgentes: dos flujos de pago (préstamos y pensiones de jubilados) muestran éxito sin persistir nada, un guardado por lote corrompe el desglose de capital/interés, y un servicio de conciliación devuelve datos simulados. Los cuatro son silenciosos — sin error, sin colapso — por lo que solo saldrían a la luz durante una conciliación posterior.
