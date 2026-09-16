# API + DISEÑO — Bandeja electrónica: pantalla de carga de TXT y consulta de cargas

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-16 · **Estado:** congelado, despachado
**Espejo:** `saaFE/docs/cxp/API-CARGAS-TXT-BANDEJA-ELECTRONICA.md`

> *«Debe existir una pantalla de carga de txt y otra de consulta de cargas, ya que actualmente tenemos más de 300
> cargas de txt y es extremadamente complicado consultar cargas anteriores. Deberían existir filtros por fecha de
> carga o período contable. Sería ideal contar con una pantalla muy amigable de carga, que no solo permita escoger
> el archivo sino arrastrarlo, y otra de consulta completa.»* — usuario, 2026-09-16

Sin DDL: la tabla ya guarda todo lo que hace falta.

---

## 1. Lo que hay hoy (medido)

- **`PGS.CRTX`** (`CargaArchivoTxt`) ya tiene: empresa (`CRTXPJRQ`), usuario (`CRTXUSAR`), **fecha de carga**
  (`CRTXFCGA`), nombre del archivo (`CRTXNARV`), totales (`CRTXTTLR` leídos, `CRTXRGNV` nuevos, `CRTXRGDP`
  duplicados, `CRTXRGND` novedades), estado (`CRTXESTD`), observación y **período contable** (`PRDOCDGO`).
- **REST `crtx`**: `getAll`, `getId`, `getByEmpresa/{idEmpresa}`, `selectByCriteria`, `DELETE`. **`getByEmpresa`
  devuelve las 300 y pico sin filtro ni tope** — es lo que hace impracticable la consulta.
- **La carga del TXT vive dentro de la bandeja electrónica** (`bandeja-electronica.component.ts:134`), mezclada con
  el trabajo diario sobre los documentos de una carga.
- El resumen de una carga ya existe: `GET /carga-documentos/resumen/{idCargaTxt}`.

## 2. Endpoint NUEVO — buscar cargas

```
GET /SaaBE/rest/crtx/buscar?idEmpresa=1236&desde=2026-08-01&hasta=2026-08-31
                           &idPeriodo=57&nombreArchivo=RECI&estado=1&limite=100
```

| Param | Regla |
|---|---|
| `idEmpresa` | **obligatorio** → sin él, `400 {"mensaje": …}` |
| `desde` / `hasta` | `yyyy-MM-dd`, sobre `CRTXFCGA`, inclusive los dos |
| `idPeriodo` | `PRDOCDGO` exacto |
| `nombreArchivo` | contiene, sin distinguir mayúsculas |
| `estado` | exacto |
| `limite` | por defecto **100**, máximo 500 |

**200** — más recientes primero:

```json
[{ "idCarga": 312, "fechaCarga": "2026-08-14", "nombreArchivo": "RECIBIDOS_08.txt",
   "totalLeidos": 68, "nuevos": 60, "duplicados": 6, "novedades": 2,
   "estado": 1, "estadoTexto": "…", "usuario": "MMOREJON",
   "periodo": { "idPeriodo": 57, "nombre": "AGOSTO 2026" },
   "registrados": 58, "pendientes": 10 }]
```

- `registrados` / `pendientes`: documentos de esa carga ya registrados en BD (estado 3) y los que no. **Si contarlos
  encarece la consulta, se devuelven en `null`** y la pantalla no los muestra: **medirlo antes, no suponerlo**.
- Sin resultados → `200 []`, nunca un error.
- `fechaCarga` como texto `yyyy-MM-dd` (trampa de Jackson, CLAUDE.md §Serialización).

Nada más cambia en el backend: la carga sigue siendo `POST /carga-documentos/cargarTxt` y el detalle
`GET /carga-documentos/resumen/{idCargaTxt}`.

## 3. Pantallas

### 3.1 `menucuentaxpagar/procesos/carga-txt` — **Carga de TXT**
- Zona grande de **arrastrar y soltar**, y también botón para elegir el archivo. Al soltar: nombre, tamaño y
  botón Cargar. Sólo `.txt`; otra extensión → mensaje, sin llamar al backend.
- Al terminar, tarjeta con el resultado real que ya devuelve `cargarTxt` (leídos, nuevos, duplicados, novedades) y
  dos botones: **«Ir a la bandeja de esta carga»** y **«Cargar otro archivo»**.
- **La carga sale de la bandeja electrónica**: esa pantalla queda para trabajar los documentos.

### 3.2 `menucuentaxpagar/procesos/consulta-cargas` — **Consulta de cargas**
- Filtros: **fecha de carga desde/hasta**, **período contable** (combo), nombre del archivo y estado. Por defecto,
  el mes en curso.
- Tabla paginada: fecha, archivo, período, usuario, leídos, nuevos, duplicados, novedades, estado y acciones.
- Acciones por fila: **Ver documentos** (abre la bandeja en esa carga) y **Exportar CSV** del listado filtrado.
- Ordenar por fecha de carga, descendente por defecto.
- ⚠️ Si la tabla lleva paginador o `matSort`, el enganche va con el método **idempotente** del §9 del
  `REGISTRO-RESERVAS-EQUIPOS.md`: un `@ViewChild` dentro de un `@if` se resuelve `undefined` y la tabla queda
  mostrando la primera página de 300 cargas sin decirlo.

### 3.3 Menú
En «Cuentas por pagar → Procesos»: **Carga de TXT**, **Consulta de cargas**, **Bandeja electrónica**, en ese orden.
Permisos: los que ya gobiernan la bandeja; **no se inventa un permiso nuevo** (darlo de alta es del usuario).

## 4. Despliegue

WAR → FE. Sin SQL. El FE nuevo contra un WAR viejo: la consulta de cargas responde 404 y la pantalla muestra el
error; la carga del TXT sigue funcionando porque usa el endpoint de siempre.
