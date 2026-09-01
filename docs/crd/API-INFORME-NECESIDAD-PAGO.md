# Contrato — Informe de necesidad de pago (devolución individual)

**Fecha:** 2026-09-01 · **Equipo:** CRD · EQUIPO B · **Escrito por:** árbitro `omen-saa-1-arb`
**Backend:** el reporte se construye en paralelo. Se implementa contra este contrato.
**Diseño completo:** `saaBE/docs/logica-negocio/crd/ESPECIFICACION-INFORME-NECESIDAD-PAGO-DEVOLUCION.md`

> **Qué es.** Un PDF con el formato del informe de necesidad de pago que hoy se hace a mano en Word,
> pero **para un solo partícipe**, con el desglose de lo que se le devuelve. Se imprime desde la
> pantalla de devolución de aportes.

---

## 1. No hay endpoint nuevo

El reporte se genera por el endpoint genérico de Jasper, que **ya existe y ya está cableado en el
frontend**. No hay que crear ningún servicio nuevo.

```ts
// src/app/shared/services/jasper-reportes.service.ts — ya existe, no se modifica
this.jasperReportes.generar('crd', 'RPRT_INFR_DVAP', parametros, 'PDF')
  // -> Observable<Blob>
```

Por debajo es `POST /SaaBE/rest/rprt/generar` con
`{ modulo, nombreReporte, formato, parametros }` y `responseType: 'blob'`.

---

## 2. Los cuatro parámetros

```ts
const parametros = {
  P_ID_DEVOLUCION: 4812,              // number  — la devolución a imprimir
  P_NUMERO_INFORME: 'FCPC-CRE-GR-137-2026',  // string — lo digita el operador
  P_OBSERVACIONES: '',                // string — lo digita el operador, puede ir vacío
  P_FECHA_DESDE: '2026-01-01'         // string 'yyyy-MM-dd'
};
```

| Parámetro | Qué es | Quién lo pone |
|---|---|---|
| `P_ID_DEVOLUCION` | Id de la devolución (`DVAPCDGO`). Al registrar sale de `resultado.idDevolucion`; en el histórico, de la fila elegida | la pantalla |
| `P_NUMERO_INFORME` | El `INFORME No.` de la cabecera. **Obligatorio** | **el operador**, en el diálogo |
| `P_OBSERVACIONES` | Texto libre de la sección Observaciones. Si va vacío, la sección **desaparece del PDF** sin dejar hueco | **el operador**, en el diálogo |
| `P_FECHA_DESDE` | Desde qué fecha se listan los aportes que el partícipe ya aplicó a préstamos. **Precargar con el 1 de enero del año de la devolución** | la pantalla propone, el operador puede cambiar |

⚠️ **`P_FECHA_DESDE` va como `'yyyy-MM-dd'`, string plano.** Nunca un `Date` de JavaScript ni nada
terminado en `Z`: `CLAUDE.md` documenta que Jackson **descarta el offset en vez de convertirlo** y
la fecha queda corrida sin ningún error.

---

## 3. Dónde van los botones (decisión U6)

Los dos abren **el mismo diálogo** y llaman al **mismo reporte**. No dupliques la lógica: un solo
método y un solo componente de diálogo, usado desde los dos lugares.

| Dónde | Cuándo aparece |
|---|---|
| **Al registrar** — pantalla de confirmación de `forms/devolucion-aportes` | Después de que `POST /dvap/registrar` responde bien, junto al mensaje de éxito |
| **Histórico** — lista de devoluciones del partícipe | En cada fila, para reimprimir una devolución anterior |

**El diálogo pide tres cosas** antes de generar: número de informe (obligatorio), observaciones
(opcional, `textarea`) y fecha desde (precargada, editable).

---

## 4. Qué hacer con el blob

El endpoint devuelve el PDF como `Blob`. **Abrirlo en pestaña nueva** con `URL.createObjectURL`,
igual que los demás reportes de `crd` — no forzar descarga.

**Liberá el object URL** (`URL.revokeObjectURL`) cuando la pestaña ya lo tomó; si no, el blob queda
en memoria toda la sesión.

---

## 5. Manejo de errores — la trampa

⚠️ **El endpoint responde `blob` cuando sale bien y JSON cuando falla.** Con
`responseType: 'blob'`, un error **también llega como blob**, así que un `catch` que muestre
`error.message` va a mostrar `[object Blob]`.

**Hay que leer el blob de error como texto antes de mostrarlo:**

```ts
error: async (err) => {
  let mensaje = 'No se pudo generar el informe';
  if (err.error instanceof Blob) {
    try { mensaje = JSON.parse(await err.error.text())?.mensaje ?? mensaje; } catch { /* deja el genérico */ }
  }
  // mostrar `mensaje`
}
```

Códigos posibles: **400** si falta el módulo o el nombre del reporte (no debería pasar, van fijos),
**500** con el mensaje en el cuerpo para cualquier otro fallo.

---

## 6. Lo que el informe muestra, y lo que NO afirma

El PDF trae tres bloques. **Importa entender el tercero para no describirlo mal en la pantalla:**

| Bloque | Qué es |
|---|---|
| **Lo que se devuelve** | El desglose por tipo de aporte de **esta** devolución. Exacto |
| **Aportes aplicados a préstamos** | Los aportes que el partícipe **ya usó** para pagar préstamos, desde `P_FECHA_DESDE`. Es un histórico de cruces |
| **Deuda vigente** | Lo que el partícipe sigue debiendo al momento de emitir. Saldos **referenciales** |

⛔ **En el sistema, cruzar contra préstamos y devolver aportes son dos operaciones separadas y sin
enlace entre sí.** La devolución **no descuenta** los préstamos: ni siquiera valida la deuda (el
aviso del diálogo de confirmación es informativo por decisión del 2026-08-24).

**Consecuencia para el frontend: no rotules estos bloques como "deducciones" ni muestres un
"neto a pagar" calculado en la pantalla.** El valor a pagar es el total de la devolución y nada más.
El informe pone los tres bloques uno al lado del otro para que el lector los interprete; no hay una
resta que el sistema haya hecho.

---

## 7. Lo que NO entra

- **No se toca la lógica de registrar la devolución**, ni sus validaciones, ni el aviso de deuda.
- **No se calcula ningún total en el frontend.** Todos los importes los imprime el reporte.
- **No hay endpoint nuevo, ni servicio nuevo.** `JasperReportesService` se usa tal cual está.
