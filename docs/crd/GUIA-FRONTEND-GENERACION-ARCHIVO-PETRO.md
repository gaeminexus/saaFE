# Guía Frontend — Generación de Archivo Petrocomercial

Contrato de los endpoints del módulo GNAP tal como están hoy en el backend, incluida
la **descarga marcada** y la **eliminación de una generación**.

Base URL: `/SaaBE/rest/gnap`

> **Requisito de base de datos:** el backend ya no arranca contra un GNAP sin las
> columnas `GNAPFCDS` / `GNAPUSDS`. Antes de probar contra un ambiente hay que
> ejecutar `docs/scripts/sql-gnap-marca-descarga.sql`.

---

## 1. Lo que cambia para el front

| Antes | Ahora |
|---|---|
| El TXT se bajaba con `GET /rest/files/download?filePath={rutaArchivo}` | Se baja con `GET /rest/gnap/descargarArchivo/{codigo}` |
| No se podía borrar una generación (fallaba por FK) | `DELETE /rest/gnap/eliminar/{codigo}` borra cabecera + detalle + TXT |
| — | Una generación **descargada ya no se puede borrar** |

La regla de negocio es una sola: **mientras el TXT no haya salido del sistema, la
generación se puede deshacer**. El backend sabe que salió porque la descarga pasa
por su propio endpoint, que estampa `fechaDescarga` / `usuarioDescarga`.

Por eso, **el botón de descarga debe dejar de apuntar a `/rest/files/download`**.
Si sigue usando el genérico, nada queda marcado y el sistema permitirá borrar
generaciones que ya se entregaron a Petrocomercial.

---

## 2. Modelo `GeneracionArchivoPetro` (JSON)

Es la entidad JPA serializada directamente — no hay DTO. Las fechas son
`LocalDate`, o sea strings `"YYYY-MM-DD"`.

```json
{
  "codigo": 12,
  "mesPeriodo": 8,
  "anioPeriodo": 2026,
  "fechaGeneracion": "2026-08-12",
  "usuarioGeneracion": "mvaca",
  "totalRegistros": 843,
  "totalMontoEnviado": 154320.75,
  "estado": 1,
  "nombreArchivo": "DESCUENTOS ASOPREP AGOSTO 2026.txt",
  "rutaArchivo": "C:\\Users\\wildfly\\archivos_petrocomercial\\DESCUENTOS ASOPREP AGOSTO 2026.txt",
  "fechaEnvio": null,
  "fechaProcesamiento": null,
  "fechaDescarga": null,
  "usuarioDescarga": null,
  "observaciones": null,
  "filial": { "codigo": 1 },
  "usuarioIngreso": "mvaca",
  "fechaIngreso": "2026-08-12",
  "usuarioModificacion": null,
  "fechaModificacion": null
}
```

### Campos nuevos

| Campo | Tipo | Significado |
|---|---|---|
| `fechaDescarga` | `"YYYY-MM-DD"` \| `null` | `null` = el TXT nunca se descargó. Con valor, la generación queda congelada. |
| `usuarioDescarga` | `string` \| `null` | Quién la descargó la **primera** vez. Descargas posteriores no la sobreescriben. |

### Estados (`estado`)

| Valor | Significado | ¿Se puede eliminar? |
|---|---|---|
| `0` | PENDIENTE — cabecera creada, sin procesar | Sí |
| `1` | GENERADO — ya tiene TXT | Sí, **solo si `fechaDescarga` es `null`** |
| `2` | ENVIADO | No |
| `3` | PROCESADO | No |

**Regla para habilitar el botón Eliminar en la grilla:**

```ts
const puedeEliminar = (g) =>
  g.fechaDescarga == null && (g.estado === 0 || g.estado === 1);
```

---

## 3. Endpoints

### 3.1 Listar generaciones

```
GET /SaaBE/rest/gnap/getAll
```

**200** → array de `GeneracionArchivoPetro`, ordenado por `fechaGeneracion` desc.
**500** → `text/plain` con el mensaje de error.

### 3.2 Obtener una generación

```
GET /SaaBE/rest/gnap/getId/{codigo}
```

**200** → `GeneracionArchivoPetro` · **404** → texto · **500** → texto.

Úsalo para **refrescar la fila después de descargar** y así ocultar el botón Eliminar.

### 3.3 Crear la cabecera (paso 1)

```
POST /SaaBE/rest/gnap
Content-Type: application/json
```

```json
{
  "mesPeriodo": 8,
  "anioPeriodo": 2026,
  "estado": 0,
  "usuarioGeneracion": "mvaca",
  "usuarioIngreso": "mvaca",
  "filial": { "codigo": 1 }
}
```

**201** → la generación creada, con `codigo` asignado.
**500** → `text/plain`.

Notas:
- `estado: 0` es obligatorio en la práctica: el paso 2 rechaza cualquier
  generación cuyo estado no sea `0` o `null`.
- `fechaGeneracion` la pone el backend si el `codigo` viene vacío.
- Esta ruta **no valida periodo duplicado**. Antes de crear, verifica en la grilla
  que no exista ya una generación para ese mes/año/filial.

### 3.4 Generar el archivo (paso 2)

```
POST /SaaBE/rest/gnap/generarArchivo/{codigo}
```

Sin body. El usuario se toma de la cabecera. Es el proceso pesado (recopila
aportes y cuotas, arma DTGA/PDGA/CXPG y escribe el TXT) — **muestra spinner y no
pongas un timeout corto**.

**200:**
```json
{
  "success": true,
  "mensaje": "Archivo generado exitosamente",
  "codigoGeneracion": 12,
  "totalRegistros": 843,
  "totalMonto": 154320.75,
  "nombreArchivo": "DESCUENTOS ASOPREP AGOSTO 2026.txt",
  "rutaArchivo": "C:\\Users\\wildfly\\archivos_petrocomercial\\DESCUENTOS ASOPREP AGOSTO 2026.txt"
}
```

**400** `{"error": "ID de generación inválido"}`
**404** `{"error": "Generación no encontrada con ID: 12"}`
**409** `{"error": "Esta generación ya fue procesada. Estado actual: 1"}`
**500** `{"error": "Error: ..."}`

Al terminar, la generación queda en `estado: 1` y con `fechaDescarga: null`.

### 3.5 Descargar el TXT (paso 3) — marca la generación

```
GET /SaaBE/rest/gnap/descargarArchivo/{codigo}?usuario={usuario}
```

`usuario` es opcional; si no se manda se usa el `usuarioGeneracion` de la cabecera.
Mándalo siempre con el usuario de la sesión: es lo que queda como auditoría.

**200** → cuerpo binario (`application/octet-stream`) con
`Content-Disposition: attachment; filename="DESCUENTOS ASOPREP AGOSTO 2026.txt"`.
Como efecto, la generación queda con `fechaDescarga` y `usuarioDescarga` llenos.

| Código | Cuerpo (texto plano, **no JSON**) |
|---|---|
| 400 | `ID de generación inválido` |
| 404 | `Generación no encontrada con ID: 12` / `El archivo no existe en el servidor: ...` |
| 409 | `La generación aún no tiene archivo generado` (todavía no corriste el paso 2) |
| 500 | `Error al descargar el archivo de la generación: ...` |

⚠️ Los errores de **este** endpoint son texto plano; los de los demás son JSON.
En el `catch` usa `await response.text()`, no `.json()`.

⚠️ La marca se estampa **antes** de mandar el archivo. Si el usuario cancela la
descarga a medio camino, la generación queda bloqueada igual. Es deliberado: ante
la duda, se asume que el archivo salió.

### 3.6 Eliminar una generación

```
DELETE /SaaBE/rest/gnap/eliminar/{codigo}?usuario={usuario}
```

Borra en cascada `CXPG → PDGA → DTGA → GNAP` y elimina el TXT del disco. Todo en
una transacción; si algo falla no se borra nada. Después el periodo mes/año/filial
queda libre para volver a generarse.

**200:**
```json
{
  "success": true,
  "mensaje": "Generación eliminada exitosamente. El periodo 8/2026 puede volver a generarse.",
  "codigoGeneracion": 12,
  "cuotasEliminadas": 1204,
  "participesEliminados": 843,
  "detallesEliminados": 5,
  "nombreArchivo": "DESCUENTOS ASOPREP AGOSTO 2026.txt",
  "archivoEliminado": true
}
```

`archivoEliminado: false` significa que el TXT ya no estaba en disco. **No es un
error** y los registros sí se borraron — no muestres advertencia por eso.

| Código | Cuerpo | Cuándo |
|---|---|---|
| 400 | `{"error": "ID de generación inválido"}` | código nulo o ≤ 0 |
| 404 | `{"error": "Generación no encontrada con ID: 12"}` | no existe |
| 409 | `{"error": "No se puede eliminar la generación: el archivo ya fue descargado el 2026-08-12 por mvaca."}` | ya descargada |
| 409 | `{"error": "No se puede eliminar la generación: ya fue marcada como ENVIADA a Petrocomercial."}` | estado 2 |
| 409 | `{"error": "No se puede eliminar la generación: ya fue marcada como PROCESADA."}` | estado 3 |
| 500 | `{"error": "..."}` | error inesperado |

El **409 se muestra tal cual al usuario**: el mensaje ya viene redactado en
español y con la fecha y el usuario que descargaron.

`DELETE /SaaBE/rest/gnap/{id}?usuario=...` hace exactamente lo mismo (delega en el
anterior), por si la pantalla ya usaba esa ruta.

### 3.7 Consultar el detalle generado

Endpoints CRUD estándar, por si la pantalla muestra el desglose:

```
POST /SaaBE/rest/dtga/selectByCriteria    detalle por producto (AH, HS, PE, PH, PQ, PP)
POST /SaaBE/rest/pdga/selectByCriteria    una fila por línea del TXT
POST /SaaBE/rest/cxpg/selectByCriteria    cuotas/aportes que componen cada línea
```

---

## 4. Flujo completo en la UI

```
[Crear cabecera]  POST /gnap                      -> estado 0
        |
[Generar archivo] POST /gnap/generarArchivo/{cod} -> estado 1, fechaDescarga null
        |                                            (aquí todavía se puede Eliminar)
        |
[Descargar]       GET  /gnap/descargarArchivo/{cod} -> fechaDescarga = hoy
        |                                            (Eliminar se deshabilita)
        v
[Enviar / Procesar]  estados 2 y 3
```

Después de **descargar** hay que **refrescar la fila** (`GET /gnap/getId/{codigo}`
o recargar la grilla). Si no, el botón Eliminar sigue habilitado en pantalla y el
usuario recibirá un 409 al presionarlo.

Antes de eliminar, pide confirmación explícita — el borrado es físico e
irreversible:

> ¿Eliminar la generación de AGOSTO 2026? Se borrarán la cabecera, su detalle
> completo y el archivo TXT. Esta acción no se puede deshacer.

---

## 5. Implementación de la descarga

El endpoint devuelve el binario, no una URL. Hay dos formas:

### Opción recomendada — `fetch` + blob

Permite mostrar el error real cuando falla (un `<a href>` mostraría el mensaje de
error como si fuera el archivo).

```ts
async function descargarArchivoPetro(codigo: number, usuario: string) {
  const url = `/SaaBE/rest/gnap/descargarArchivo/${codigo}?usuario=${encodeURIComponent(usuario)}`;
  const resp = await fetch(url, { method: 'GET' });

  if (!resp.ok) {
    // OJO: los errores de este endpoint son texto plano, no JSON
    throw new Error(await resp.text());
  }

  // Nombre real del archivo, tomado de la cabecera
  const disposition = resp.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const nombre = match ? match[1] : `DESCUENTOS_PETRO_${codigo}.txt`;

  const blob = await resp.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);

  // La generación quedó marcada: refrescar para deshabilitar "Eliminar"
  await recargarGeneracion(codigo);
}
```

Si el backend está en otro host que el front, `Content-Disposition` no se lee sin
que el servidor exponga la cabecera (`Access-Control-Expose-Headers`). En ese caso
el `match` falla y se usa el nombre por defecto — mejor tomar `nombreArchivo` del
objeto de la generación que ya tienes en la grilla.

### Opción simple — enlace directo

```html
<a [href]="'/SaaBE/rest/gnap/descargarArchivo/' + g.codigo + '?usuario=' + usuario"
   download>Descargar TXT</a>
```

Funciona y marca la descarga, pero si hay error el usuario recibe un archivo con
el texto del error adentro, y la grilla no se entera de que hay que refrescar.

---

## 6. Eliminación — ejemplo

```ts
async function eliminarGeneracionPetro(codigo: number, usuario: string) {
  const url = `/SaaBE/rest/gnap/eliminar/${codigo}?usuario=${encodeURIComponent(usuario)}`;
  const resp = await fetch(url, { method: 'DELETE' });
  const body = await resp.json();

  if (!resp.ok) {
    // 409 -> mensaje listo para mostrar tal cual
    throw new Error(body.error ?? 'No se pudo eliminar la generación');
  }

  return body; // { success, mensaje, cuotasEliminadas, participesEliminados, ... }
}
```

---

## 7. Checklist de cambios en el front

- [ ] Cambiar la descarga de `/rest/files/download?filePath=...` a `GET /rest/gnap/descargarArchivo/{codigo}?usuario=...`.
- [ ] Refrescar la generación después de descargar.
- [ ] Agregar botón **Eliminar**, habilitado solo con `fechaDescarga == null && estado in (0,1)`.
- [ ] Diálogo de confirmación advirtiendo que el borrado es físico e irreversible.
- [ ] Mostrar el mensaje del 409 tal cual viene en `error`.
- [ ] Mostrar en la grilla la columna **Descargado** (`fechaDescarga` + `usuarioDescarga`), que es lo que explica al usuario por qué no puede borrar.
- [ ] En el manejo de errores de la descarga usar `response.text()`; en el resto, `response.json()`.
