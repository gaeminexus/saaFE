# Los CHECK del esquema RHH — vocabularios que la base impone y el repo no documenta

**Escrito el 2026-08-21, leído de la base con `ALL_CONSTRAINTS`.**

Existe porque uno de estos CHECK tumbó la ejecución de salida de un finiquito y **su definición no
está en ningún script del repositorio**: viene de la creación original del esquema. Cualquiera que
escriba un literal en una de estas columnas sin consultar antes va a repetir el fallo.

## El fallo que lo originó

`LiquidacionHaberesServiceImpl.ejecutarSalida` escribía `'TERMINADO'` en `CNTE.CNTEESTD`, sobre
esta premisa, que estaba escrita en el código como decisión tomada:

> «CNTEESTD es VARCHAR2 y texto libre, no rubro —decisión tomada, igual que RLPGESTD—»

**Las dos mitades son falsas.** `CNTEESTD` tiene el CHECK `CK_CNTRESTD`, y `RLPGESTD` —la columna
que se citaba como precedente— tiene el suyo, `CK_RLPGESTD`. Que una columna sea `VARCHAR2` y no
apunte a un rubro **no** significa que acepte cualquier cosa.

Resultado: `ORA-02290`, y el commit entero se cae. Lo peligroso es cómo se ve desde fuera —el
`System.out` del método ya había impreso «Salida ejecutada … contrato cerrado, empleado CESANTE»
con los números correctos, porque se imprime **antes** del commit—. **La traza de un `@Stateless`
no prueba que la transacción cerró; sólo la base lo prueba.**

## Cómo se pregunta

```sql
SELECT TABLE_NAME, CONSTRAINT_NAME, SEARCH_CONDITION
  FROM ALL_CONSTRAINTS
 WHERE OWNER = 'RHH' AND CONSTRAINT_TYPE = 'C'
   AND CONSTRAINT_NAME NOT LIKE 'SYS_%'
 ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```

Los `SYS_%` se excluyen porque son los `NOT NULL` que Oracle nombra solo; no aportan vocabulario.

## Lo que admite cada columna, hoy

### Vocabularios de palabra completa — los que muerden

| Tabla | Columna | Valores admitidos |
|---|---|---|
| `CNTE` | `CNTEESTD` | `BORRADOR` · `ACTIVO` · **`CERRADO`** · `ANULADO` |
| `NXOO` | `NXOOTPOO` | `RENOVACION` · `ANEXO` · `ADENDUM` |
| `PTCN` | `PTCNESTD` | `SOLICITADO` · `APROBADO` · `RECHAZADO` · `ANULADO` |
| `SLCT` | `SLCTESTD` | `SOLICITADA` · `APROBADA` · `RECHAZADA` · `ANULADA` |

> **`PTCN` en masculino y `SLCT` en femenino.** No es un descuido que se pueda «corregir» al
> escribir: son literales distintos y el CHECK los distingue. `'APROBADA'` en `PTCNESTD` falla.

### Banderas `S`/`N`

**Pendientes de existir — las añade [`sql/38`](sql/38_CHECK_BANDERAS_CPNM.sql), sin ejecutar:**
`CPNM.CPNMIMIE` · `CPNM.CPNMIMIR` · `CPNM.CPNMPTRN`. Hoy **no tienen CHECK**, y `CPNMIMIE` se copia
tal cual a `RNGL.RNGLIMPN` (`ProcesoNominaServiceImpl:1368`), que sí lo tiene y además es
`NOT NULL`.

> **Es la misma forma del fallo de `CNTEESTD`, pero invisible a la revisión de código:** el literal
> no está escrito a mano, viene del catálogo. **Un origen sin vocabulario copiado a un destino con
> vocabulario es tan peligroso como un literal inventado**, y sólo se ve mirando las dos columnas a
> la vez. Al añadir una copia de columna a columna, comprobar que el origen esté al menos tan
> restringido como el destino.

Ya existentes:

`CTLG.CTLGGCEE` · `CTLG.CTLGRQDC` · `DTLL.DTLLLBRB` · `HSTR.HSTRACTL` · `RNGL.RNGLIMPN` ·
`RSMN.RSMNASNT` · `RSMN.RSMNJSTF` · `TPCE.TPCERQRE` (ojo: su CHECK se llama `RHH_TPCE_REQ_CK`,
fuera del patrón `CK_*`) · `TPCN.TPCNRQRE`

### Activo/Inactivo `A`/`I`

`CRGO.CRGOESTD` · `CTLG.CTLGESTD` · `DPRT.DPRTESTD` · `DPTC.DPTCESTD` · `RLPG.RLPGESTD` ·
`TPCN.TPCNESTD` · `TRNO.TRNOESTD`

### Rangos y reglas

| Tabla | CHECK | Regla |
|---|---|---|
| `DTLL` | `CK_DTLLDIAA` | `DTLLDIAA BETWEEN 1 AND 7` |
| `PRDN` | `CK_PRDNMSEE` | `PRDNMSEE BETWEEN 1 AND 12` |
| `CTRL` | `CK_CTRL_UNO` | `(CTRLALTR IS NULL) <> (CTRLTOTL IS NULL)` — una fila de control es **o** de concepto **o** de total, nunca las dos ni ninguna |

## Regla para el código nuevo

Antes de escribir un literal en una columna `VARCHAR2` de estado o de tipo en RHH, mirar esta
tabla. Si la columna no está aquí, preguntárselo a la base con la consulta de arriba y **añadirla
a este documento en el mismo cambio**. Un comentario en el código que afirme que una columna es
texto libre no vale como fuente: éste era exactamente el caso.

Y si de verdad hiciera falta un valor nuevo, la vía es ampliar el CHECK con un script numerado en
`sql/`, no elegir un sinónimo que quepa. Cuatro valores para un contrato y un quinto que significa
lo mismo que `CERRADO` es como se degrada un vocabulario.
