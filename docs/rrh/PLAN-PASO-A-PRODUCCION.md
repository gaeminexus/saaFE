# Cómo pasa todo esto a producción

**Escrito el 2026-08-21.** Producción tiene ejecutados los scripts **01–30** (verificando 32 y 33).
Local (1236) va por el 40. Este documento dice **qué se replica, en qué orden, y sobre todo qué
NO se copia**.

---

## 1. La regla que lo decide todo: producción CALCULA, no recibe copias

Los scripts de carga (`25`, `26`, `27`, `34`) **no fijan claves primarias**: `MPLD` se inserta por
`IDENTITY`, y contratos, historial y saldos se enganchan por **cédula**, no por código. Eso
significa que el `MPLDCDGO` de una persona en producción **no tiene por qué coincidir** con el de
local (local borró fixtures en el `20` y las secuencias avanzaron distinto).

**Consecuencia: no se puede copiar `NMNA`, `RNGL`, `ACMN`, `LQDC`… de local a producción.** Una
copia arrastraría códigos de empleado de local y apuntaría a la persona equivocada sin ningún
error. Lo que se copia son **scripts**, y los períodos **se calculan en producción con el motor
final**, exactamente como se hizo en local.

Esto no es un coste extra: **ya estaba en el plan**. Enero–julio hay que recalcularlos de todas
formas cuando se apliquen las once correcciones del motor, para que los siete meses salgan con las
mismas reglas. Ese recálculo se hace **una vez en local** (valida el motor corregido contra los
siete meses conocidos) y **otra vez en producción** (la que vale). La segunda es mecánica si la
primera se documentó bien — ver §4.

---

## 2. Clasificación de los scripts 01–41

| Script | Qué es | ¿Va a producción? |
|---|---|---|
| `01`–`05` | DDL | ✅ ya está |
| `06` | Rubros (normativa) | ✅ ya está |
| `07`–`09` | Parametría, conceptos, plantillas contables | ✅ ya está |
| `10`–`18` | Deltas de estructura y conceptos | ✅ ya está |
| `19` | **Fixture de prueba** (turno + empleado sintético) | ya está, y el `20` lo limpió |
| `20` | Limpieza de fixtures | ✅ ya está |
| `21`–`24` | DDL | ✅ ya está |
| `25`–`27` | **Datos de ASOPREP**: organización, apertura, ingresos de enero | ✅ ya está |
| `28`–`30` | Registro / delta rubro / precisión `SLDV` | ✅ ya está |
| **`31`** | `CTRL` enero (andamio de contraste) | ✅ **Sí** — ver §3 |
| **`32`** | Parametría `CSTR` (despido sin desahucio) | ✅ **Sí**, normativa |
| **`33`** | Causal de período de prueba + 2 correcciones `CSTR` | ✅ **Sí**, normativa. Idempotente (`NOT EXISTS`) |
| **`34`** | Gastos personales 2026 (datos de ASOPREP) | ✅ **Sí** — sin él, a seis personas les sale IR |
| **`35`, `36`, `40`** | `CTRL` febrero, marzo, abril | ✅ **Sí** — ver §3. **El `40` además lleva el `UPDATE` de la adenda de Méndez**, que es dato y es obligatorio |
| **`37`** | Corrección de la base del 13.º en la apertura | ❌ **NO va a producción.** Era un parche retroactivo para datos creados con el WAR viejo. Con el WAR final, `aplicarSaldosApertura` ya multiplica por 12 (corrección C, `aplicaAcumulado`): en producción el tipo 3 sale directo en **14 075,52**. Correrlo daría 168 906,24 |
| **`52`** | Anticipo de Pardo Calle (`DSRC` + `CTDS`) | ✅ **Sí**, después de aplicar la apertura y antes de calcular enero. No viene del corte porque nació el 01-01-2026, pero el rol lo descuenta en enero y febrero |
| **`38`** | CHECK de banderas de `CPNM` | ✅ **Sí**, estructura |
| **`39`** | Limpieza de nóminas huérfanas del PRDN 30 | ❌ **NO.** Es cirugía sobre un residuo de local. Producción no lo tendrá si calcula en el orden correcto (salidas antes del período) |
| **`41`** | DDL de novedades IESS + rubros | ✅ **Sí**, estructura y normativa |
| **`43`** | RUC del empleador en `CFNM` | ❌ **NO va a producción.** Sólo corrió en local y el `45` lo revirtió. **Pero cargaba dos datos que el `45` no deshace** — ver el aviso debajo de la tabla |
| **`44`** | Las tres jornadas IESS que faltaban en el rubro 225 | ✅ **Sí**. Seguro en cualquier momento: sólo inserta detalles de rubro |
| **`45`** | Retira `CFNMRUCC` | ❌ **NO va a producción**, porque el `43` tampoco fue: allí la columna nunca existió y el `DROP` fallaría con `ORA-00904`. En local sí corrió, y **después** de publicar el WAR que quita el mapeo |
| **`46`** | `CTRL` mayo | ✅ **Sí.** Datos inertes, sin `UPDATE` de ficha: mayo no tiene cambios de contrato |
| **`47`** | «Este empleador no retiene IR» + Robayo | ✅ **Sí** |
| **`48`** / **`49`** | Méndez a media jornada para ene–mar, y la adenda después de cerrar marzo | ✅ **Sí, y en ese orden exacto.** El motor lee el sueldo de hoy, no el vigente en el período: el `48` va antes de calcular enero y el `49` sólo cuando marzo esté cerrado |
| `46`+ | Los que vengan: `CTRL` mayo–julio, deltas | Según esta misma tabla |
| `BLANQUEO_RHH` (futuro) | Borrado de datos de cliente | ❌ Jamás en la producción de ASOPREP. Es para instalar a **otro** cliente |

**Producción quedó al día hasta el 42 el 2026-08-21.** Pendiente desde ahí: **`43`** (hecho), **`44`** (jornadas, seguro ya) y **`45`** (retira `CFNMRUCC`, **sólo tras publicar el WAR nuevo**). Mayo pasa a ser el `46`. Sigue fuera el `39`, y el `40` espera a que marzo cierre en producción.

> **⚠️ El par `43`/`45` no se replica, pero deja un hueco que sí hay que cerrar a mano.** El `43` no sólo creaba `CFNMRUCC`: también cargaba `CFNMSCIE = '0001'` y `CFNMSGSC = 'R'`, y el `45` **sólo borra la columna del RUC**. Saltarse los dos deja esas dos columnas en `NULL` en producción. Las columnas existen allí (las crearon el `41` y el `42`), así que basta el dato:
>
> ```sql
> UPDATE RHH.CFNM SET CFNMSCIE = '0001', CFNMSGSC = 'R' WHERE PJRQCDGO = :EMPRESA; COMMIT;
> ```
>
> **`CFNMTPEM` se queda en `NULL` en producción**: el `'PROV'` de local es un centinela de pruebas, y su ausencia allí es lo que mantiene al exportador negándose hasta que Steven dé el código real. El RUC no se carga: se lee de `CBR.FCDR`, que ya existe en producción.

**Los que aún no están en producción y deben ir, en orden:** `31` → `32` → `33` → `34` → `35` →
`36` → `37` → `38` → `40` → `41`. **Saltando el `39`.**

### Cómo saber si `32` y `33` ya corrieron en producción

```sql
SELECT CSTRCDGO, CSTRALTR, CSTRNMBR, CSTRDSHC, CSTRDSPD, CSTRAVSL
  FROM RHH.CSTR ORDER BY CSTRCDGO;
```

- Si **hay 11 filas** y la 11 es `Terminacion en periodo de prueba` → el `33` corrió.
- Si `Despido intempestivo` tiene `CSTRDSHC = 'N'` → el `32` corrió.
- Si hay 10 filas o el despido tiene `'S'`, faltan. Los dos son seguros de reejecutar.

---

## 3. `CTRL` sí va a producción, y no es contradicción

`CTRL` es andamio, pero **el contraste es la única forma de saber que producción reprodujo lo que
local validó**. Cada mes que se calcule en producción se contrasta con el mismo instrumento y debe
dar los **mismos bloques que dio en local** (los esperados están escritos: `ESPERADO-CONTRASTE-*.md`).
Cuando julio cierre en producción y cuadre, `CTRL` se **vacía** (`DELETE ... WHERE CTRLANOO = 2026`);
la tabla se queda para el próximo cliente con histórico.

---

## 4. La secuencia completa hasta agosto en vivo

```
LOCAL                                            PRODUCCIÓN
─────────────────────────────────────────────    ─────────────────────────────────────────────
1. Calibrar abril → julio (en curso)
2. Aplicar las 11 correcciones del motor
3. RECALCULAR ene–jul con el motor corregido
   (reabrir con cuidado: punto 6 de la lista)
4. Contrastar los 7 meses otra vez → verde
5. Escribir el GUION de cada mes (ver abajo)
                                                 6. Scripts 31–41 (sin el 39)
                                                 7. Publicar el WAR FINAL (con las 11 correcciones
                                                    y la estructura de novedades)
                                                 8. Por pantalla, siguiendo el guion, mes a mes:
                                                    períodos · novedades · liquidaciones · salidas
                                                    · calcular · contrastar · aprobar ·
                                                    contabilizar (modo histórico) · cerrar
                                                 9. Verificar ACMN de los 7 meses contra local
                                                10. Vaciar CTRL · CTRL_PARAM
                                                11. Agosto: modo = CONTABILIZA · novedades ·
                                                    planilla de control · asiento
```

**El paso 5 es el que hace mecánico el 8.** Hoy el conocimiento de «qué novedades lleva cada mes»
está repartido entre los scripts `CTRL`, el `ESTADO` y la memoria de los agentes. Antes de replicar,
el frontend escribe **un guion por mes** (`GUION-MES-2026-0X.md`): qué novedades registrar y con
qué valores, qué liquidaciones crear y en qué orden, qué debe dar la cabecera, y qué bloques
espera el contraste. Quien replique en producción no decide nada: sigue el guion.

**Orden dentro de cada mes, sin saltos** (lo aprendido en marzo): liquidar → aprobar → ejecutar
salida → **y sólo después** calcular el período.

---


## 4 bis. ANTES DE RECALCULAR UN MES PASADO: comprobar que la ficha no ha cambiado

**Regla de operación, obligatoria mientras el sueldo no tenga vigencia por fecha (punto 14).**

El motor lee `CNTE.CNTESLRB` **de hoy**. Si alguien cambió el sueldo, la jornada o los días
declarados desde que ese mes se cerró, **el recálculo no reproduce el mes: lo reescribe con datos
de después**. No falla, no avisa, y el mes queda cerrado con un sueldo que nunca se pagó.

Pasó en local y costó encontrarlo: `sql/40` pasó a Méndez Torres a 482 por la adenda del 01-04
**sin fecha de vigencia**, y al recalcular enero el motor le pagó 482 sobre 30 días en vez de 241.
`241,00 − 22,77 = 218,23`, que fue exactamente el desvío del mes.

> **En producción nadie va a tener este contexto.** Quien replique verá un recálculo que termina
> sin errores y un total que no cuadra por un importe que no se parece a nada conocido.

**El detector, antes de tocar ningún período cerrado:**

```sql
-- Compara el sueldo con el que se calculó cada mes contra el de la ficha de hoy.
-- Debe salir VACIO. Cada fila es alguien cuyo recálculo saldría con el sueldo equivocado.
SELECT p.PRDNANOO AS ANIO, p.PRDNMSEE AS MES, m.MPLDIDNT, m.MPLDAPLL,
       r.RNGLVLRO AS SUELDO_DEL_MES, c.CNTESLRB AS SUELDO_DE_HOY
  FROM RHH.RNGL r
  JOIN RHH.NMNA n ON n.NMNACDGO = r.NMNACDGO
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
  JOIN RHH.CNTE c ON c.MPLDCDGO = m.MPLDCDGO
  JOIN RHH.CPNM k ON k.CPNMCDGO = r.CPNMCDGO
 WHERE k.CPNMALTR = 1                      -- el concepto Sueldo
   AND n.NMNADITR = 30                     -- sólo meses completos: los parciales prorratean
   AND r.RNGLVLRO <> c.CNTESLRB
 ORDER BY 1, 2, 3;
```

**Si sale alguna fila, hay dos caminos y sólo uno es correcto:**

1. **La ficha de hoy es la buena y el mes viejo estaba mal** → se recalcula y se acepta el cambio.
2. **El mes viejo es el bueno y la ficha cambió después** → **hay que bailar la ficha al valor que
   regía ese mes antes de recalcular, y devolverla después**. Es lo que hacen `sql/48` y `sql/49`.

**Nunca recalcular sin haber decidido cuál de los dos es.** Y la comprobación va **antes**, no
después: después, el mes ya está reescrito.

## 4 ter. El molde del guion por mes — lo que el backend necesita para contrastar en producción

**Escrito el 2026-08-21, al cerrar los cinco primeros meses.** El frontend redacta el guion de cada
mes; esto fija contra qué. Está escrito desde donde va a estar quien lo use: **corriendo el
contraste en producción, sin nada del contexto de esta calibración.**

> **La regla que lo gobierna: el guion APUNTA, no COPIA.** Ningún importe del cliente se transcribe
> al guion. Ya están en `CTRL`, y duplicarlos crea dos fuentes que divergen — es exactamente lo que
> pasó con `CTRL` y `REF-02`, donde el control acabó compartiendo origen con lo controlado y
> cuadraba en falso justo donde había un centavo real.
>
> **Pero hay valores que sí hacen falta para registrar las novedades del mes.** La salida no es
> transcribirlos: es que el guion traiga **la consulta que los lista**. Accionable y de fuente
> única.

### 1. El esperado del mes, fila por fila, nunca en totales

El guion apunta a `ESPERADO-CONTRASTE-{MES}.md`; **no lo repite**. Un total en verde no distingue
un acierto de dos errores que se anulan: los −20,17 de mayo podían ser Robayo o dos cosas mal que
se cancelan, y sólo la descomposición por persona lo separa.

### 2. Las precondiciones, cada una con su comprobación

No basta enumerarlas: en producción nadie sabrá cuál olvidó.

| Precondición | Cómo se comprueba |
|---|---|
| `CTRL_PARAM` en el mes | `SELECT ANIO, MES FROM RHH.CTRL_PARAM;` |
| `sql/NN` del mes ejecutado | `SELECT COUNT(*) FROM RHH.CTRL WHERE CTRLANOO=:a AND CTRLMESS=:m;` |
| `NMNA` con las filas que tocan | `SELECT COUNT(*) FROM RHH.NMNA n JOIN RHH.PRDN p ON p.PRDNCDGO=n.PRDNCDGO WHERE p.PRDNANOO=:a AND p.PRDNMSEE=:m;` |

**Con el parámetro en otro mes todos los bloques salen vacíos y parecen un éxito.** Es la primera
trampa del instrumento y la más fácil de pisar.

### 3. El orden dentro del mes, y qué se rompe al invertirlo

Tres dependencias que hoy **sólo funcionan porque alguien las recuerda**:

| Orden | Qué pasa al invertirlo |
|---|---|
| Salidas **antes** de calcular el período | Nóminas huérfanas. En local lo arregló `sql/39`, **que no se replica** |
| `contabilizarRol` **antes** de `cerrarPeriodo` | `contabilizarRol` pisa `PRDNOBSR` y **el aviso de novedades sin declarar se pierde en silencio** |
| `CTRL_PARAM` **antes** de contrastar | Bloques vacíos que se leen como «cuadra» |

### 4. Qué cambia respecto al mes anterior, y por qué

Es lo que convierte una lista en algo verificable. **Sin esta columna, cada cambio legítimo parece
una regresión.** Ejemplos ya conocidos: en marzo desaparece el par de vacaciones; desde abril
Méndez es tiempo completo y sale del bloque 3; **en junio Viteri entra en fondos de reserva al
cumplir el año el 25 — el renglón que lleva cinco meses en 1 cambia por motivo legítimo**.

### 5. La comprobación de fichas del §4 bis, antes de cualquier recálculo

La que nos costó los 218,22 de Méndez. Va **antes**, no después: después, el mes ya está reescrito.

### 6. Las cuatro liquidaciones, antes de calcular el período de su mes

**Es la mitad del trabajo del guion, y el orden que nos costó las huérfanas de marzo.**

| Quién | Salida | Antes de calcular |
|---|---|---|
| Torres Chávez | 15-01-2026 | enero |
| Benítez Montes | 16-01-2026 | enero |
| Castro Arce | 06-03-2026 | marzo |
| Cevallos Alemán | 06-03-2026 | marzo |

Crear → aprobar → **ejecutar la salida**. Las tres, no sólo las dos primeras.

**Dos consecuencias que el guion debe anticipar, porque las dos parecen errores y no lo son:**

- **Las salidas regeneran las cuatro `NVIS`**, así que enero y marzo volverán a cerrar con el aviso
  de novedades sin declarar en `PRDNOBSR`. **Es correcto**: son la evidencia de los 208,22 que
  ASOPREP pagó de más y de los dos avisos de enero que tampoco se presentaron.
- **Las liquidaciones dependen de que `sql/37` haya corrido.** Si no, los décimos del finiquito
  salen mal — es el script que corrigió la base del 13.º en la apertura, y **producción tiene el
  mismo defecto porque tiene la misma apertura del `26`**.

---

## 5. Las trampas conocidas de la réplica

| Trampa | Por qué pasa | Qué hacer |
|---|---|---|
| El WAR de producción es viejo | Si se calcula ene–jul con un motor sin las 11 correcciones, hay que rehacerlo todo | **Publicar el WAR final ANTES de calcular nada**, y verificar con `javap` como se hizo aquí |
| `CTRL_PARAM` en el mes equivocado | El contraste sale vacío y parece verde | Comprobar `SELECT * FROM RHH.CTRL_PARAM` antes de cada contraste |
| Secuencias de rubros por detrás | `06` y `41` insertan `PRBR`/`PDTR` con IDs explícitos | **En local no existen** (verificado 2026-08-21: `ALL_SEQUENCES` vacío para ambas). En producción, tras el `41`: consultar `ALL_SEQUENCES` del owner `SCP`; si existen y van por detrás, `ALTER SEQUENCE SCP.SQ_PRBRCDGO RESTART START WITH 231` y `SCP.SQ_PDTRCDGO RESTART START WITH 1108` (topes reales tras el 41: 230 y 1107) |
| El `37` ejecutado dos veces | Duplica la base del 13.º de la apertura | Tiene aviso en cabecera; **una sola vez** |
| El `39` ejecutado en producción | Borraría nóminas legítimas si los códigos coinciden por casualidad | **No se ejecuta.** Si producción dejara huérfanas por calcular en mal orden, se escribe uno nuevo con los códigos de producción |
| Reabrir un mes con otro posterior calculado | `reabrirPeriodo` no avisa (punto 6) | En producción no debería hacer falta reabrir nunca: se calcula una vez, bien, con el guion |
| `PRDNMODO` | Ene–jul en `1` (histórico, sin asiento); **agosto en modo contabiliza** | Crear agosto con el modo correcto; verificar antes de calcular |

---

## 5 bis. Agosto en adelante: los préstamos del IESS dejan de ser novedad mensual

**Decisión de producto tomada el 2026-08-21, y NO se aplica a la calibración.**

Hoy los préstamos del IESS —quirografarios e hipotecarios— se cargan como **novedad del período**
(`NVNM`), una fila por persona y mes. No es donde deben vivir: `DSRC` (descuento recurrente) y
`CTDS` (sus cuotas) ya existen, el **paso 12 de `calcularPeriodo` los procesa solo**, y `CTDS`
guarda **valor por cuota con capital e interés separados**. Eso último es lo que decide: la cuota
del IESS deriva mes a mes —Calderón fue `14,23 → 14,13 → 14,04`— y con una cuota por fila esa
deriva se representa **exacta**, sin recargar la novedad cada mes ni redondear nada.

Estado actual del mecanismo: **existe y ya se usó** — 2 filas en `DSRC` y 4 en `CTDS`, que son los
anticipos reales de **Pardo Calle** y **Calderón Párraga**, 700 en dos cuotas de 350 cada uno.
**Se cobraron**: están en los renglones de enero y febrero, y son los que explican el febrero de
Calderón —`350` de cuota más `269,52` de novedad = **619,52**, que es lo que imprime el rol—.

> **Por qué NO se cambia ahora.** Mayo, junio y julio siguen con `NVNM`. Cambiar de mecanismo a
> mitad de la serie metería una variable nueva **justo donde estamos comparando contra números
> conocidos**: si un mes dejara de cuadrar, no sabríamos si es el motor o el cambio de mecanismo.
> La calibración termina con el mecanismo con el que empezó.

**Qué cambia en agosto:** el cliente **deja de teclear préstamos**. Se registran una vez como
`DSRC` con sus `CTDS`, y el motor los descuenta solo hasta que se agotan. Lo único que seguirá
capturándose a mano son los **anticipos**.

### El prerrequisito de verdad: la cuota se aplica pero no se marca (punto 12)

**Es lo que hay que arreglar ANTES de cargar ningún préstamo por aquí, no después.** El paso 12 de
`calcularPeriodo` descuenta la cuota y ahí se acaba: **`CTDSESTD` se queda en PENDIENTE,
`CTDSVLDS` en cero y `DSRCSLDD` no baja**. Verificado en la base — las cuatro cuotas de Pardo y
Calderón se cobraron de verdad, y las cuatro siguen en estado 1 con `CTDSVLDS = 0`, `cuotasPagadas
= 0` y saldo 700.

> **No amenaza los recálculos**, y por eso no ha dado la cara en cinco meses:
> `selectPendientesPorVencer` filtra por vencimiento y cada cuota dispara en un solo mes. Enero
> cuadró y sigue cuadrando.
>
> **Pero deja el mecanismo inservible para lo que viene.** Un préstamo del IESS de doce cuotas
> nunca bajaría de saldo y la pantalla lo mostraría intacto después de un año pagándolo. Con dos
> cuotas y un anticipo la mentira es invisible; con doce y un préstamo, no.

Al cerrar el período hay que **marcar la cuota, descontar el saldo y subir `cuotasPagadas`**.

**Corrección de una nota anterior:** estas dos filas **no son huérfanas ni una mina de duplicados**
—se dijo aquí y era falso—. Son anticipos reales, ya cobrados, y activarlas no duplicaría nada.
**Lo que sí es cierto es que su saldo miente.**

## 6. Qué NO hacer

- **No copiar tablas de datos calculados de local a producción** (`NMNA`, `RNGL`, `ACMN`, `PVNM`,
  `LQDC`, `TMLQ`, `NVIS`, `PRDN`, `RLPG`, `SLDV`). Los códigos de empleado no coinciden.
- **No ejecutar el `39`** en producción.
- **No calcular ningún período en producción antes del WAR final.** Cada mes calculado con un
  motor intermedio es un mes que hay que reabrir.
- **No blanquear nunca la producción de ASOPREP.** El blanqueo es para instalar a otro cliente.
- **No pasar los préstamos del IESS de `NVNM` a `DSRC`/`CTDS` durante la calibración.** Es para
  agosto; ver §5 bis. Y **no cargar préstamos por ese camino hasta que el punto 12 esté corregido**:
  hoy la cuota se aplica pero no se marca, así que el saldo nunca bajaría.
