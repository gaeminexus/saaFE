# ESTADO DEL TRABAJO EN CURSO — punto de retomada

> ⛔ **DOCUMENTO SUPERADO — NO ES LA FUENTE DE ESTADO. Congelado el 2026-08-29.**
>
> **El estado vigente de `crd` está en `docs/logica-negocio/ESTADO-CRD.md`.** Empezar por ahí.
>
> Este documento decía ser "el primer archivo que se lee" y lo fue hasta el 2026-08-25, pero
> quedó atrás: no menciona la ola de Devengo de Aportes, ni la alimentación contable, ni nada
> de lo hecho el 28 y 29 de agosto. **Su §0 afirma que "nada de esto está compilado ni
> desplegado" — falso desde el 2026-08-29: los frentes A a E están en producción.**
>
> Se conserva porque sus §2 (`Pais` fuera de `crd`), §3 (detalle técnico del fix de mora) y §5
> (decisiones cerradas) siguen siendo la mejor explicación de esos tres temas. **Leerlo como
> referencia histórica de esos puntos, nunca como tablero de estado.**

**Última actualización: 2026-08-25.** Documento de traspaso entre sesiones.

Espejado en `saaFE/docs/crd/ESTADO-TRABAJO-EN-CURSO.md`. El del backend es el autoritativo.

---

## 0. Resumen en diez líneas

Hay **tres frentes abiertos** a la vez, en distinto estado:

| Frente | Código | Base de datos | Desplegado |
|---|---|---|---|
| **A — Devolución de aportes a partícipes** | 8 de 9 fases entregadas | DDL ya ejecutado en producción | ❌ No |
| **B — Sacar `Pais` de `crd`** | Terminado (BE y FE) | Sin cambios: la tabla se queda en `CRD.PSSS` | ❌ No |
| **C — Fix del proceso de mora (urgente)** | Terminado y verificado | Restitución de estados: la hace el usuario | ❌ No |

**Nada de esto está compilado ni desplegado.** Los tres van en el mismo despliegue.

⚠️ **Lo más urgente es C**: el proceso diario de las 02:00 reclasifica préstamos
`8 DE_PLAZO_VENCIDO → 11 EN_MORA` todos los días hasta que el fix esté arriba.

---

## 1. Frente A — Devolución de aportes

**Documento de control:** `docs/logica-negocio/crd/PLAN-DEVOLUCION-APORTES.md` (el tablero
vive en su §11 y el detalle de implementación en la §12). Espejado en `saaFE/docs/crd/`.

### Estado por fase

| Fase | Agente | Estado |
|---|---|---|
| 0 — Cimientos | BE | ✅ Entregada |
| 1 — CXP origen externo | BE | ✅ Entregada |
| 2 — CRD registro | BE | ✅ Entregada |
| 3 — CRD reconciliación | BE | ✅ Entregada |
| 4 — FE pantalla | FE | ✅ Entregada |
| **5 — FE CXP (`pagos-transferencia`)** | **FE** | ❌ **PENDIENTE** |
| 6a — BE aviso de deuda | BE | ✅ Entregada |
| 6b — FE aviso de deuda | FE | ✅ Entregada, **falta la línea gris** (ver abajo) |
| 7 — BE contabilidad opcional | BE | ✅ Entregada |

### Lo que falta en el frontend

1. **Fase 5**: `cxp/model/pago-programado.ts` no tiene `origenExterno`, y
   `pagos-transferencia` está intacto. Sin esto, una devolución no se distingue en la
   pantalla de pagos de CXP.
2. **Línea gris del aviso de deuda**: si `GET /dvap/deudaVigente` falla, el diálogo no muestra
   nada, y "no se pudo consultar" queda idéntico a "no tiene deuda". Ratificado por el árbitro
   en la §6.5 del plan: hay que agregarla, **sin bloquear**.

### Base de datos

`docs/logica-negocio/crd/sql/DDL-DEVOLUCION-APORTES.sql` — **YA EJECUTADO en producción.**
La sección 8 (controles de dinero sin contabilizar) se agregó después; es de solo lectura y no
requiere volver a correr el archivo.

### Parametrización deliberadamente NO cargada

`CRD.TPAP.TPAPPRDP` está vacío **a propósito** (decisión del usuario del 2026-08-24: por ahora
la devolución no alimenta contabilidad). La fase 7 hizo que eso ya no falle.

Consecuencia aceptada, escrita en la §6.5.b del plan: **sin desglose no hay asiento, y sin
asiento tampoco hay movimiento bancario.** Un pago confirmado así es invisible para la
conciliación. Aceptable para revisar pantallas, **no para producción con dinero real**. Los
controles para encontrarlos después están en la §6.5.b y en la sección 8 del DDL.

---

## 2. Frente B — `Pais` fuera de `crd`

**CERRADO en código.** Verificado el 2026-08-25: `com.saa.model.scp.Pais` tiene
`@Table(name = "PSSS", schema = "CRD")`.

### Cómo quedó, y por qué

| Capa | Resultado |
|---|---|
| Clase Java | `com.saa.model.scp.Pais` (movida desde `crd`) |
| Dao / Service | `com.saa.basico.ejb` / `com.saa.basico.ejbImpl` |
| REST | `com.saa.ws.rest.basico.PaisRest`, con `@Path("psss")` **intacto** |
| Frontend | `shared/model/pais.ts`, `shared/services/pais.service.ts`, `RS_PSSS` en `ServiciosShare` |
| **Tabla** | **`CRD.PSSS`. No se movió y no se va a mover.** |

⚠️ **REGLA PERMANENTE: la tabla de países es `CRD.PSSS`, siempre. Nunca `SCP.PSSS`.**
Paquete y esquema **no coinciden a propósito**: la clase está en `scp` para que `tsr` no dependa
de `crd`, y la tabla está en `CRD` por decisión del usuario. Quien lo "corrija" rompe producción.

`docs/general/sql/MIGRACION-PAIS-CRD-A-SCP.md` está **descartado**: se intentó en producción el
2026-08-24, abortó en el paso 5.1 por privilegios sobre el esquema `SCP`, y **no dejó daño**
(`SCP.PSSS` nunca se creó, ninguna FK se dropeó). Se conserva solo como registro.

### La deuda resultó ser menor de lo que creíamos

Verificado en producción: `TSR.TTLR` tiene tres constraints (`SYS_C0048369` check, `PK_TTLR`,
`UK_TTLR_IDNT_ESTD`) y **ninguna de tipo `R`**. La FK a países **nunca existió**: `PSSSCDGO` es
una columna suelta, con **una sola fila** con valor. La única FK contra `CRD.PSSS` es
`FK_PRVN_PSSS` desde `CRD.PRVN`, interna a `crd`.

**Retirar `crd` hoy no rompe nada, ni en compilación ni en base.** La deuda está cerrada, no
diferida.

---

## 3. Frente C — Fix del proceso de mora ⚠️ URGENTE

### El defecto

Desde el **2026-08-14**, el proceso diario de las 02:00 incluía los préstamos en
**8 DE_PLAZO_VENCIDO** en su universo. Como esos préstamos por definición tienen cuotas
vencidas, **todos** entraban por la rama que reclasifica a **11 EN_MORA**. Se perdió ese estado
en toda la cartera afectada.

Peor: una vez en 11, al regularizarse las cuotas el proceso los manda a **2 VIGENTE**, no de
vuelta a 8.

**Causa raíz:** el universo se copió del Grupo 2 del G48. Para el G48 incluir el 8 está bien
porque **solo lee**. Este proceso **escribe el estado del préstamo**. Compartir universo entre
un reporte y un proceso que persiste estados no es reutilización.

### La corrección, entregada y verificada por el árbitro

| Nivel | Archivo | Cambio |
|---|---|---|
| Universo del lote | `DetallePrestamoDaoServiceImpl.selectPrestamosConCuotasVencidas` (~829) | `IN (:vigente, :plazoVencido, :enMora)` → `IN (:vigente, :enMora)` |
| Guarda por préstamo | `ProcesoMoraPrestamoServiceImpl.calcularMoraPrestamo` (~207) | Sale antes de leer cuotas si el préstamo está en 8. Cubre el endpoint `POST /prst/calcularMora/{id}`, que se saltea la consulta del lote |

Verificado por el árbitro: la guarda está en la línea 207 y **todas** las escrituras vienen
después (225 lectura de cuotas, 264-265 estado de cuota, 290 y 299 estado del préstamo).
`selectPrestamosConCuotasVencidas` lo llama **únicamente** el proceso de mora: sin daño colateral.

Documentado en `docs/logica-negocio/crd/PROCESO-DIARIO-INTERES-MORA.md` §3, §4 y §11 (historial).

### Lo que el fix NO limpia

El usuario tiene respaldo de qué préstamos vuelven a 8 y hace esa restitución por su lado.
**Pero restituir `PRSTIDST` no limpia lo que quedó escrito en las cuotas**: `DTPRMRAA`,
`DTPRMRCL`, `DTPRDSMR`, `DTPRSLMR`, `DTPRTTLL` inflado y cuotas en estado 5.

Y una vez de vuelta en 8, **el proceso ya no las toca**: esa mora se congela y **se sigue
cobrando** — `GeneracionArchivoPetroServiceImpl.calcularSaldoCuota` la suma al archivo de
descuentos, y la prelación del motor de pagos la cobra en cualquier pago manual.

Consultas para medirlo (pendientes de correr):

```sql
-- Mora escrita en cuotas de préstamos que vuelven a estado 8
SELECT d.PRSTCDGO, COUNT(*) AS CUOTAS_CON_MORA,
       SUM(d.DTPRMRAA) AS MORA_ESCRITA, SUM(NVL(d.DTPRSLMR,0)) AS MORA_PENDIENTE
FROM   CRD.DTPR d
WHERE  d.PRSTCDGO IN ( /* lista de respaldo */ ) AND NVL(d.DTPRMRAA,0) > 0
GROUP  BY d.PRSTCDGO ORDER BY MORA_ESCRITA DESC;

-- De esa mora, cuánta YA SE COBRÓ
SELECT g.PRSTCDGO, SUM(g.PGPRMRPG) AS MORA_YA_COBRADA
FROM   CRD.PGPR g
WHERE  g.PRSTCDGO IN ( /* la misma lista */ )
AND    NVL(g.PGPRMRPG,0) > 0 AND NVL(g.PGPRANUL,0) = 0
GROUP  BY g.PRSTCDGO;

-- Cuotas que quedaron en estado 5 EN_MORA
SELECT PRSTCDGO, COUNT(*) FROM CRD.DTPR
WHERE  PRSTCDGO IN ( /* la misma lista */ ) AND DTPRESTD = 5
GROUP  BY PRSTCDGO;
```

Si dan distinto de cero, hace falta un documento MD de limpieza (controles, respaldo, `UPDATE`
recomponiendo `DTPRTTLL` con la fórmula de idempotencia de la §5, rollback).

---

## 4. Tareas del usuario, pendientes

### 🔴 Urgente

1. **Compilar y desplegar** los tres frentes juntos. Tiene que estar arriba **antes de las
   02:00**, o el timer vuelve a reclasificar lo restituido.
2. **Restituir a 8** los préstamos, desde el respaldo.
3. **Verificar al día siguiente** que ninguno se movió:
   ```sql
   SELECT PRSTCDGO, PRSTIDST, PRSTFCMD FROM CRD.PRST
   WHERE PRSTCDGO IN ( /* lista restituida */ ) AND PRSTIDST <> 8;
   -- 0 filas. Si devuelve algo, el fix no estaba desplegado.
   ```

### 🟡 Para decidir

4. Correr las tres consultas de mora residual (§3) y decidir si hace falta el documento de
   limpieza.

### ⚪ Deliberadamente sin hacer

5. `TPAPPRDP` sin cargar (§1). Cuando se defina la parametrización contable, cargarlo activa
   los asientos solo, sin tocar código.

---

## 5. Decisiones tomadas — NO volver a proponerlas

1. `cnt`, `tsr` y `cxp` **nunca** dependen de `crd`. El sistema se comercializará sin `crd`.
2. **`CRD.PSSS`, nunca `SCP.PSSS`.** Migración de esquema descartada de forma permanente.
3. El aviso de "pago realizado" va **por consulta desde CRD**, nunca por callback desde CXP.
4. Pantalla nueva dedicada. Las dos de cruce de valores **no se tocan**.
5. El partícipe **no** se convierte en `TSR.Titular`: beneficiario denormalizado en `PGTR`.
6. Los aportes negativos se generan **al registrar**, antes de que salga el dinero.
7. Rechazo o reverso → **contra-movimiento positivo**, nunca borrar ni editar (`CRD.APRT` es
   append-only para los reportes).
8. Una devolución puede cubrir varios tipos de aporte en **una sola** orden de pago.
9. Deuda de préstamo al devolver: **se avisa, no se bloquea, y no se netea.** Descartadas:
   bloquear con 422, y netear pagando los préstamos con los aportes.
10. `CRD.CSNT` (Cesantía) **queda como está**: es andamiaje muerto, no participa.
11. La contabilidad de la devolución es **opcional** por ahora (§6.5.b del plan).
12. `EntidadesCrd.PAIS` y el registro de `PaisService` en `service-locator-crd.service.ts`
    **quedan como están**: los dos consumidores reales inyectan el servicio directo.
