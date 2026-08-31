# Orden de ejecución del DDL pendiente de CRD — **antes del WAR**

**Fecha:** 2026-08-31 · Escrito y verificado por el árbitro del equipo A (`saabe-25`)
**Estado:** nada ejecutado. Lo corre el usuario.

---

## 0. Por qué esto cambió de prioridad

Hasta hoy estos scripts figuraban como *"no corren hasta que exista el código que los usa"*.
**El código ya existe** — se escribió el 2026-08-31, antes del colapso de las sesiones. El orden se
dio vuelta: **ahora el DDL va ANTES del WAR.**

**El fallo que esto evita.** Hibernate incluye **toda** columna `@Column` básica en el `SELECT` que
genera. Una columna mapeada que no existe en la base no rompe solo la función nueva: rompe
**cualquier lectura de esa entidad**, con `ORA-00904`, en pantallas sin relación aparente. No se ve
al compilar y aparece cuando un usuario abre la pantalla.

**Y hay una tabla ya viva en producción del lado equivocado:** `CRD.ACCN` existe desde el
2026-08-30 y la pantalla de condonación está desplegada. La entidad `AcuerdoCondonacion` mapea hoy
tres columnas que la tabla **no tiene**. Desplegar el WAR sin correr el 84 y el 86 no rompe una
función nueva: **rompe la pantalla de condonación entera.**

### Lo que cada script destraba

| Script | DDL | Ya mapeado en el código | Si no corre |
|---|---|---|---|
| **84** | `ACCN.ACCNVLAP`, `ACCN.ACCNVLDP` + tabla `CRD.DAAP` | `AcuerdoCondonacion:98,111`, entidad `DetalleAporteAcuerdoCondonacion` | toda lectura de `ACCN` falla |
| **85** | tabla `CRD.DAPR` | entidad `DetalleAportePrecancelacion` + DAO | la precancelación mixta no persiste |
| **86** | `ACCN.PJRQCDGO` | `AcuerdoCondonacion:197` | toda lectura de `ACCN` falla |
| **87** | `AVPC.TPAPCDGO` + catálogo | `AfectacionValoresParticipeCarga` | toda lectura de `AVPC` falla (carga Petro) |

---

## 1. ⚠️ El orden entre el 81 y el 87 NO es indistinto

**Verificado el 2026-08-31 leyendo los dos scripts.**

| Script | PDTR | Rubro | Alterno | Deja la secuencia en |
|---|---|---|---|---|
| 81 (`JUBILACION`) | 1178 | 235 | **7** | `RESTART START WITH 1179` |
| 83 (`COBRO_MIXTO`) — **ya corrido** | 1179 | 245 | 7 | — |
| 87 (`EXCEDENTE_PETRO`) | 1180 | 235 | **8** | `RESTART START WITH 1181` |

**No hay colisión de códigos:** el 81 y el 87 comparten el rubro 235 pero usan alternos distintos
(7 y 8), y PDTR distintos (1178 y 1180). El alterno 7 del script 83 es de **otro rubro** (245), así
que no choca. Esto ya estaba previsto en `REGISTRO-RESERVAS-EQUIPOS.md`.

**Pero el `ALTER SEQUENCE` sí colisiona si se corren al revés.** El 81 deja la secuencia en 1179 y
el 87 en 1181. Si corrés el 87 primero y el 81 después, **la secuencia queda en 1179 con 1179 y
1180 ya ocupados**, y el próximo rubro creado desde la aplicación muere por PK duplicada — en una
pantalla sin ninguna relación con lo que hiciste.

> **Regla: el 81 va antes que el 87.** Y como los dos `ALTER SEQUENCE` están **comentados** en sus
> scripts, corré **solo el del 87** (`RESTART START WITH 1181`), al final, una vez.

---

## 2. Orden de ejecución

**Antes de empezar**, los tres controles obligatorios del registro de reservas:

```sql
SELECT MAX(PRBRCDGO) AS MAX_PRBR FROM SCP.PRBR;
SELECT MAX(PDTRCDGO) AS MAX_PDTR FROM SCP.PDTR;
SELECT s.SEQUENCE_NAME, s.LAST_NUMBER FROM ALL_SEQUENCES s
WHERE  s.SEQUENCE_OWNER = 'SCP'
AND    s.SEQUENCE_NAME IN ('SQ_PRBRCDGO','SQ_PDTRCDGO');
```

Se espera `MAX_PDTR = 1179` (lo dejó el script 83). **Si da otra cosa, parar y avisar** — significa
que alguien más insertó, y el rango del equipo A ya no es el que este documento supone.

| Paso | Script | Qué es | Nota |
|---|---|---|---|
| 1 | `81_RUBRO_MOVIMIENTO_JUBILACION.sql` | PDTR 1178, rubro 235 alterno 7 | **antes que el 87**, por la secuencia |
| 2 | `84_ACUERDO_PAGO_CON_APORTES.sql` | columnas de `ACCN` + tabla `DAAP` | DDL puro, sin catálogo |
| 3 | `86_ACUERDO_EMPRESA.sql` | `ACCN.PJRQCDGO` + FK a `SCP.PJRQ` | DDL puro. **No necesita `GRANT REFERENCES`** — ver abajo |
| 4 | `85_PRECANCELACION_MIXTA_APORTES.sql` | tabla `CRD.DAPR` | DDL puro |
| 5 | `87_EXCEDENTE_PETRO_A_APORTES.sql` | `AVPC.TPAPCDGO` + PDTR 1180 | **último**, y acá va el `ALTER SEQUENCE ... START WITH 1181` |

Los pasos 2, 3 y 4 son intercambiables entre sí. **El 1 antes del 5 no lo es.**

### Sobre el `GRANT REFERENCES` del paso 3 — verificado, NO hace falta

Una FK cross-schema normalmente exige `GRANT REFERENCES` corrido como owner del schema apuntado, y
el rol DBA no lo habilita solo — fue lo que trabó `DDL-COBRO-PETRO-DOS-PASOS.sql` con `TSR`.

**Acá no aplica, y la evidencia es que ya pasó dos veces:** `DDL-BANDAS-PRODUCTO.sql` (`FK_CBPR_PJRQ`)
y `DDL-CIERRE-CARTERA.sql` (`FK_CRCT_PJRQ`) crean FKs de `CRD` a `SCP.PJRQ` y **los dos corrieron en
producción**. Si el grant faltara, habrían fallado. `CRD` ya tiene `REFERENCES` sobre `SCP.PJRQ`.

### Después de correr todo, y antes del WAR

```
docs/logica-negocio/crd/sql/VERIFICACION-ENTIDADES-VS-ESQUEMA-CRD.sql
```

**Completo, las DOS consultas.** La B es la que encuentra columnas mapeadas que faltan; ya atrapó
una caída de producción el 2026-08-30.

Dos advertencias al leer el resultado:
1. `ALL_TAB_COLUMNS` muestra solo lo que ve el usuario conectado. Conectarse con el mismo usuario
   del datasource o con DBA, o salen faltantes falsos.
2. Si aparece algo **además** de lo que estos cinco scripts arreglan: **parar y avisar antes del
   WAR.** Eso es un mapeo que nadie previó.

---

## 3. Recién entonces, el WAR

Y el WAR sale **junto con el build del frontend**, no antes: la Fase 0 dejó `idEmpresa` obligatorio
en 7 endpoints, y las pantallas que lo alimentan están en `saaFE` sin desplegar. Un WAR solo deja
los cobros manuales fallando con *"idEmpresa es obligatorio"*.

**Secuencia completa:** DDL (§2) → verificación entidad-vs-esquema → WAR + build del frontend,
juntos → prueba funcional.

---

## 4. Lo que este documento NO cubre

- **`CRD.PRCA`** — entidad con DAO, service y endpoint REST vivo contra una tabla que no existe en
  producción, resto de una implementación superseded que nadie llama. Está registrada desde antes;
  no la arregla ninguno de estos scripts y no bloquea (nadie la invoca). Anotada para que no
  sorprenda en la salida de la verificación.
- **El flag de contabilidad (rubro 237).** Sigue en 0 y **no se enciende** hasta cerrar las fases
  del `PLAN-CIERRE-CONTABLE-TOTAL.md`.
