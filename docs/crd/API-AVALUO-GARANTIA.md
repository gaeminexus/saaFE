# Avalúo del bien en garantía (PRSTVLGR) — contrato de API y de pantalla

**Estado: PROPUESTA para el FE; el backend de captura NO está programado.** Origen: 3.9 del cuadre (DS-08, bien en cuentas de orden).
Lo único ya programado es la baja de garantía por el valor con que el bien entró (ver «Lo que ya cambió»).

## Por qué

- El bien **entra** en cuentas de orden por la suma asegurada (`CRD.PRST.PRSTVLAS`) al registrar la entrega
  (`ContabilidadPrestamoServiceImpl.contabilizarEntrega`) y **sale** al terminar el préstamo
  (`GarantiaOrdenPrestamoServiceImpl.darDeBaja`).
- `PRSTVLAS` cambia después de la entrega (pólizas, captura manual), y `PRSTVLGR` (avalúo) solo se carga de afuera (archivo de
  Cartera). Si entrada y salida difieren queda un residuo en 7.3/7.4. Lo mide `sql/388_MEDICION_RESIDUO_BIEN_CUENTAS_ORDEN.sql`.
- Ninguna pantalla captura el avalúo de los préstamos nuevos, y la G51 va con el avalúo en 0.

## Lo que ya cambió en el backend (lote 5)

`darDeBaja` saca el bien por **el mismo valor con que entró**: el haber − debe de las líneas «Entrega préstamo N - bien en garantía
(orden)» del asiento de entrega (asientos activos). Si el préstamo no tiene asiento de entrega con bien (cartera migrada), se
mantiene la regla de antes: `PRSTVLGR` si es > 0, si no `PRSTVLAS`. No hay cambio de API.

## Lo que queda por hacer (backend + FE)

### 1. Captura en la solicitud (FE)

- Pantalla: `modules/crd/forms/prestamo/prestamo-edit` (la misma que hoy captura `valorAsegurado`).
- Campo nuevo `valorGarantia` («Avalúo del bien»), visible y numérico (> 0, 2 decimales) en los mismos casos en que se muestra
  `valorAsegurado` (`requiereValorAsegurado()`: prendario e hipotecario).
- `model/prestamo.ts`: `valorGarantia: number; // PRSTVLGR - avalúo del bien`.
- Backend: **sin cambio** para guardarlo. La entidad `Prestamo` ya tiene `valorGarantia` y `POST/PUT /rest/prst` lo persiste.

### 2. Obligatoriedad al aprobar — [DECIDE EL CUADRE]

Hoy `PrestamoServiceImpl.aprobar` rechaza (422) un prendario o hipotecario sin suma asegurada. Propuesta: la misma validación para el
avalúo, con el mensaje «Falta el avalúo del bien: sin él no se registra la garantía en cuentas de orden». **[DECIDE EL CUADRE]**: si es
obligatorio o solo se captura. Si es obligatorio, bloquea aprobaciones de los préstamos que hoy no lo tengan (ver el bloque 4 del 388).

### 3. Captura posterior — endpoint propuesto

Espejo de la suma asegurada (`PUT /posg/sumaAsegurada`).

```
PUT /rest/posg/avaluo
Content-Type: application/json

{ "idPrestamo": 123, "valor": 85000.00, "usuario": "jperez" }
```

Respuesta 200:

```json
{ "idPrestamo": 123, "valorAnterior": null, "valorNuevo": 85000.00 }
```

Reglas: solo préstamos prendarios o hipotecarios; `valor` > 0; usuario válido (U-2). Errores de negocio: 400 con
`{"mensaje": "..."}` (préstamo inexistente, valor inválido, tipo de préstamo que no lleva bien). **[DECIDE EL CUADRE]**: si se puede
cambiar después de la entrega. Con la baja por el valor asentado, cambiar el avalúo después de entregar no afecta la salida; solo
sirve para la G51 y para consultas.

### 4. Entrada por el avalúo — espera el merge de c45 (ya mergeado)

`contabilizarEntrega` podría entrar el bien por `PRSTVLGR > 0 ? PRSTVLGR : PRSTVLAS`. Es una propuesta aparte (archivo
`ContabilidadPrestamoServiceImpl`); no está decidida ni programada.

### 5. G51 — otro lote

`GeneracionG51ServiceImpl` pone tipo A21 y `valorAvaluo = 0.0` fijo. Usar el avalúo capturado es una decisión del cuadre.

## Qué necesita el FE para probar

- Un préstamo prendario o hipotecario en solicitud: el campo «Avalúo del bien» aparece junto a la suma asegurada y viaja en el JSON
  del préstamo como `valorGarantia`.
- Guardar y volver a abrir: el valor vuelve en `GET /rest/prst/getId/{id}` (`valorGarantia`).
- Con la columna `PRSTVLGR` ya existente en la base (control en el bloque 0 del 388).
