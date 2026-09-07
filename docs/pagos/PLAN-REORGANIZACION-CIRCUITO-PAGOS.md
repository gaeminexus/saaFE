> **Espejo.** El original vive en `saaBE/docs/logica-negocio/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md` y es el que manda.
> Los enlaces relativos de este archivo apuntan a documentos que solo existen en `saaBE`.

# Reorganización del circuito de pagos: CxP solicita, Tesorería ejecuta

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Origen:** orden del usuario del 2026-09-07.

> **Textual del usuario:** *«Solo el ingreso de pagos debe estar en cxp. El resto —aprobación,
> generación archivo bancos, recepción / confirmación manual, consultas y gestión— debe estar en
> TSR. Movámosla y creemos las pantallas correctas.»*

Este documento es el diseño. **Nada se implementa antes de que esté acá** (regla 7 del esquema de
trabajo). El formato de los dos archivos bancarios va aparte, en
[`FORMATO-ARCHIVO-BANCOS.md`](FORMATO-ARCHIVO-BANCOS.md).

---

## 1. Las tres decisiones del usuario, tomadas el 2026-09-07

| # | Decisión | Qué significa |
|---|---|---|
| **1** | **Se mueven pantallas y menú. El Java NO se mueve.** | El FE se reorganiza completo. En el backend solo se AGREGA lo nuevo (los formateadores). `PagoProgramado`, `LotePago`, sus DAO/Service/REST **se quedan en `com.saa.ejb.cxp` / `com.saa.model.cxp`** |
| **2** | **Para el Pacífico generamos un `.xlsx`** | Listo para copiar y pegar en la fila 16 de `BIZBANK_LIGHT.xls`. El proyecto ya tiene Apache POI (`poi` + `poi-ooxml` en el `pom`), no hay dependencia nueva |
| **3** | **El circuito viejo de cheques de TSR queda quieto** | El submenú `Pagos > Solicitud Pagos / Cheques Generados / Impresos / Entregados` (sobre `TSR.PAGO`) **no se toca**. El circuito nuevo (`PGS.PGTR`) convive con él |

### 1.1 Por qué el Java no se mueve — está decidido, pero conviene que quede escrito

Las tablas **ya están en el esquema neutral `PGS`** (`PGS.PGTR`, `PGS.LTPG`), no en `CXP`. El REST
**ya es `/rest/pgtr`**, que es el código de tabla, no el nombre de un módulo. O sea que lo único
«de CxP» que tiene el circuito es el **nombre del paquete Java**, que ningún usuario ve.

Y moverlo cuesta caro: `crd`, `rhh` y `cxc` llaman a `PagoProgramadoServiceImpl.registrarPagoDeOrigenExterno`.
Cambiar el paquete les rompe los imports **en un árbol de trabajo compartido con otros dos equipos**,
a cambio de cero diferencia visible. Se descarta.

---

## 2. Estado real de hoy — verificado contra el código, no contra docs

### 2.1 Backend: el ciclo completo YA existe, y vive en `cxp`

`PagoProgramadoRest` (`@Path("pgtr")`) tiene los diez endpoints del ciclo:

| Endpoint | Etapa |
|---|---|
| `POST /pgtr` | registrar (ingreso) |
| `GET /pgtr/porAprobar` · `POST /pgtr/aprobar` · `GET /pgtr/disponibilidad/{idCuenta}` | aprobación |
| `POST /pgtr/lote` · `GET /pgtr/lote/{idLote}/archivo` | archivo al banco |
| `POST /pgtr/lote/{idLote}/respuesta` · `POST /pgtr/confirmarManual` | recepción / confirmación |
| `GET /pgtr/listar` · `POST /pgtr/anular/{id}` · `POST /pgtr/revertirConfirmado/{id}` | consulta y gestión |

**No falta backend del ciclo.** Lo que falta es el formato real de los archivos (§4) y la
reorganización del frente (§3).

### 2.2 Frontend: hoy el circuito está partido en dos, y en el módulo equivocado

| Dónde está hoy | Qué es |
|---|---|
| `cxp/forms/pagos/pagos-transferencia/` — **1.114 líneas TS + 776 HTML**, ruta `/menucuentaxpagar/pagos/transferencias` | **Cinco pestañas**: `1. Registrar Pago` · `2. Generar Archivo` · `3. Cargar Respuesta del Banco` · `4. Confirmación Manual` · `5. Seguimiento` |
| `tsr/forms/procesos/aprobacion-pagos/` — 314 TS, ruta `/menutesoreria/procesos/aprobacion-pagos` | La bandeja de `POR_APROBAR`. **Ya está en Tesorería**, movida ahí el 2026-08-28 por decisión del usuario |

**Las cinco pestañas de una sola pantalla son exactamente el reparto que pide el usuario**: la 1 es
«ingreso de pagos» y las otras cuatro son «el resto». La reorganización es partir ese componente.

### 2.3 Lo que ya está bien y no se toca

`aprobacion-pagos` ya vive en Tesorería y ya consume `/pgtr/porAprobar`, `/pgtr/aprobar` y
`/pgtr/disponibilidad`. **Se queda donde está**; solo cambia de lugar en el menú (§3.3).

---

## 3. El reparto

### 3.1 Lo que QUEDA en Cuentas por Pagar

**Una sola pantalla, con lo que hoy es la pestaña 1.**

| Pantalla | Ruta | Contenido |
|---|---|---|
| **Solicitud de pago** | `/menucuentaxpagar/pagos/solicitud` | Buscar proveedor, buscar factura, valor, observación, `POST /pgtr`. Nada más |

⛔ **La solicitud NO elige cuenta bancaria ni forma de pago.** Eso ya es así hoy (nace
`POR_APROBAR`) y es la decisión de fondo del rediseño de agosto: quien elige banco y gira el cheque
es tesorería. La pantalla nueva **no debe volver a mostrar esos campos**.

La ruta vieja `/menucuentaxpagar/pagos/transferencias` **redirige** a la nueva, para no romper
enlaces guardados.

### 3.2 Lo que PASA a Tesorería

Cuatro pantallas, una por etapa. **No una pantalla con cuatro pestañas**: la etapa la ejecutan
personas distintas en momentos distintos, y el menú tiene que poder llevarte directo a la tuya.

| # | Pantalla | Ruta | Sale de | Qué hace |
|---|---|---|---|---|
| **T1** | **Aprobación de pagos** | `/menutesoreria/pagos/aprobacion` | ya existe en `tsr/forms/procesos/aprobacion-pagos/` | Bandeja `POR_APROBAR`, elige cuenta y forma de pago, aprueba en bloque |
| **T2** | **Generación de archivo al banco** | `/menutesoreria/pagos/archivo-banco` | pestaña 2 | Lista `REGISTRADO`, selecciona, `POST /pgtr/lote`, descarga el archivo |
| **T3** | **Recepción y confirmación** | `/menutesoreria/pagos/confirmacion` | pestañas 3 y 4 | Carga la respuesta del banco **o** confirma a mano. **Las dos son la misma etapa** |
| **T4** | **Consulta y gestión de pagos** | `/menutesoreria/pagos/consulta` | pestaña 5 | Seguimiento con filtros, anular, revertir confirmado |

**T3 junta las pestañas 3 y 4 a propósito.** Son dos caminos para el mismo hecho —el banco pagó o no
pagó— y el propio plan de agosto dejó dicho que *«la pantalla de confirmación manual es el camino
principal, no algo temporal»*, porque el lector del archivo de respuesta sigue siendo provisional.
Separarlas en dos ítems de menú sugiere que la carga del archivo es lo normal, y no lo es.

### 3.3 El menú de Tesorería

**Un nodo `Pagos` nuevo, hermano del de cheques que ya existe**, no dentro de él:

```
Tesorería
└── Procesos
    ├── Pagos por transferencia          ← NUEVO
    │   ├── Aprobación de pagos          (T1 · se mueve acá desde Procesos)
    │   ├── Generación de archivo         (T2)
    │   ├── Recepción y confirmación      (T3)
    │   └── Consulta y gestión            (T4)
    └── Pagos                             ← EXISTENTE, NO SE TOCA
        ├── Consulta > Cheques
        └── Procesos > Solicitud Pagos / Cheques Generados / Impresos / Entregados
```

⚠️ **El nodo nuevo se llama «Pagos por transferencia», no «Pagos».** Tesorería ya tiene un nodo
`Pagos` (el de cheques, sobre `TSR.PAGO`) y dos nodos con el mismo nombre en el mismo menú es cómo
se pierde media hora buscando una pantalla. El ítem `Aprobación de pagos` sale de `Procesos` y entra
al nodo nuevo — es un cambio de lugar en el menú, no de componente ni de ruta de archivo.

---

## 4. Backend: lo único que se agrega

### 4.1 Los formateadores reales

Paquete nuevo **`com.saa.ejb.tsr.formateador`**, calcado de `com.saa.ejb.tsr.parser`:

| Archivo | Qué es |
|---|---|
| `FormateadorArchivoBancoFactory` | Copia de `BankStatementParserFactory`: mapa palabra clave → proveedor, resuelto contra el nombre del banco de la **cuenta de origen**, con fallo explícito si no hay implementación |
| `InternacionalArchivoPagoFormateador` | Los 12 campos separados por tabulador, ANSI (`windows-1252`), sin cabecera |
| `PacificoArchivoPagoFormateador` | `.xlsx` con las 14 columnas de la macro BizBank Light |

⛔ **`FormateadorArchivoBancoPlanoImpl` no se borra**: queda como respaldo para un banco sin formato
propio, pero **deja de ser el que devuelve la factory**. Su javadoc ya dice *«NO USAR EN PRODUCCIÓN»*.

### 4.2 El contrato del archivo cambia, porque ahora puede ser binario

Hoy `POST /pgtr/lote` y `GET /pgtr/lote/{id}/archivo` devuelven `contenido` como **texto**. Un
`.xlsx` no entra en un string. **El contrato se extiende, no se rompe** — contrato exacto en
[`API-PAGOS-TESORERIA.md`](API-PAGOS-TESORERIA.md) §3.

### 4.3 La columna que falta en la base

`TSR.BEXT.BEXTCDBC` — código BCE de la institución financiera. **Los dos formatos lo exigen y no
existe.** DDL: `../tsr/sql/e2-14-codigo-institucion-banco-externo.sql`. Detalle y por qué también
está rompiendo el archivo de la nómina: `FORMATO-ARCHIVO-BANCOS.md` §3.

---

## 5. Fases y orden

| Fase | Qué | Quién | Depende de |
|---|---|---|---|
| **A** | DDL `e2-14` + `BancoExterno.codigoBanco` + campo en la pantalla de bancos externos | BE, luego FE | — |
| **B** | Los dos formateadores + la factory + el contrato binario | BE | A (el código de banco sale de ahí) |
| **C** | Partir el componente: `solicitud` en CxP, T2/T3/T4 en TSR | FE | B (para el contrato del archivo) |
| **D** | Menús y rutas, con la redirección de la ruta vieja | FE | C |

### ⛔ Orden de despliegue

1. **El `.sql` va ANTES del WAR.** En cuanto `BancoExterno` mapee `BEXTCDBC`, Hibernate la mete en
   todo `SELECT` de la entidad: si la columna no existe, revienta con `ORA-00904` **cualquier**
   pantalla que liste bancos externos, incluidas las que no muestran el código. Es la regla 9 en su
   forma concreta.
2. **El WAR va antes que el FE**, porque el FE nuevo consume `contenidoBase64`, que el WAR viejo no
   manda. Al revés (WAR nuevo, FE viejo) es inofensivo: el FE viejo lee `contenido`, que se conserva.

---

## 6. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| **1** | 🔴 **El valor va en centavos en un formato y en dólares en el otro.** Equivocarse multiplica o divide por cien todos los pagos del lote | Está escrito en `FORMATO-ARCHIVO-BANCOS.md` §1.4 y §2.5, y va literal al prompt del agente |
| **2** | 🔴 **Campo 12 vacío = «Banco Internacional»**, no «no sé». Sin `BEXTCDBC` cargado, los pagos a otros bancos se mandan al Internacional | El control 4.3 del `e2-14` cuenta exactamente cuántos beneficiarios quedan sin código. **Mientras devuelva filas con cuentas > 0, el archivo del Internacional no sale a producción** |
| **3** | 🟠 `tsr` está **compartido con `lap-saa-1`** y este equipo ya tuvo dos caídas de producción ahí (§14 del estado) | El paquete nuevo es `com.saa.ejb.tsr.formateador`, **archivos nuevos, cero archivos de `tsr` modificados**. El FE toca `menutesoreria.component.ts` y `app.routes.ts`: `git status` + `git log -3` sobre esos dos antes de editar |
| **4** | 🟠 Partir un componente de 1.114 líneas es donde se pierde lógica en silencio | El componente viejo **no se borra en la misma entrega**: queda ruteado hasta que las cuatro pantallas nuevas estén probadas. La baja es un ítem aparte |
| **5** | 🟡 `IDENTIFICACION_DEL_EXTERIOR` (rubro 4) no tiene equivalente en ninguno de los dos formatos | Se rechaza el pago con mensaje explícito al generar el archivo. **No se manda `P` a la buena de Dios** |

---

## 7. Lo que este frente NO hace

- **No unifica** el circuito nuevo con el viejo de cheques de `TSR.PAGO` (decisión 3 del usuario).
- **No toca** el motor de formatos bancarios de RRHH (`RHH.FMBN`/`DFMB`) — el porqué está en
  `FORMATO-ARCHIVO-BANCOS.md` §6.
- **No arregla** el archivo bancario de la nómina, que hoy manda el nombre del banco donde va el
  código. La columna `BEXTCDBC` lo destraba, pero conectarla es un frente de `rhh` aparte.
- **No implementa** la agrupación por beneficiario en el archivo: descartada por el usuario el
  2026-08-28 (*«no debemos agrupar, está bien que salga una línea por cada pago»*).
