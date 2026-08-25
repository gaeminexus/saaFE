# Estado del módulo RRHH

**Última actualización:** 2026-08-25 · 🏁 **ENERO A MAYO CERRADOS EN PRODUCCIÓN, LOS CINCO EN DIFERENCIA CERO** · ⏳ **WAR con el 22 y el 10 publicado en local, PENDIENTE de subir a producción** · **junio es el siguiente y tiene guion propio** · julio cierra la carga histórica

> Este archivo existe para que una sesión nueva de cualquier agente recupere el estado sin
> depender del historial de conversación. **Actualízalo al terminar cada fase.**
> Si algo de aquí contradice al código, gana el código: corrige el archivo.
> Vive en `saaBE/docs/logica-negocio/rhh/` con espejo en `saaFE/docs/rrh/`. Si lo editas en
> uno, cópialo al otro. **Los `.sql` NO se espejan: viven sólo en `saaBE/docs/logica-negocio/rhh/sql/`.**

## Dónde estamos — 2026-08-21

> **Esta cabecera es lo único que hace falta leer para retomar.** Todo lo de abajo es historia
> que respalda lo de aquí.

### En una frase

**En PRODUCCIÓN están cerrados y contrastados enero, febrero, marzo y abril.** Los tres primeros
con **diferencia cero**; abril con **+175,00**, que son los OTROS sin clasificar de Calderón y es
pregunta abierta con el cliente, no un fallo de cálculo. **Mayo es el siguiente**, y en local sólo
corrió con el motor viejo. Junio y julio tienen sus datos cargados (`sql/50`, `sql/51`) pero **no se
han corrido todavía**.

| Mes | Dónde está | Neto con el motor final | Contra el cliente |
|---|---|---|---|
| Enero | ✅ cerrado y contrastado **en PRODUCCIÓN** | **16 476,92** | **0,00** |
| Febrero | ✅ cerrado y contrastado **en PRODUCCIÓN** | **17 525,11** | **0,00** |
| Marzo | ✅ cerrado y contrastado **en PRODUCCIÓN** | **17 591,12** | **0,00** |
| Abril | ✅ **CERRADO, REABIERTO Y VUELTO A CERRAR** el 2026-08-24 · `PRDN 41` · 20 colaboradores. Se cerró primero en 16 089,22 con +175,00; **se reabrió por decisión del cliente** para registrar los OTROS de Calderón como concepto **31**, y cerró en cero. Ver [`GUION-REAPERTURA-ABRIL.md`](GUION-REAPERTURA-ABRIL.md) | **15 914,22** | **0,00** |
| Mayo | ✅ **CERRADO Y CONTRASTADO en PRODUCCIÓN** el 2026-08-23 · `PRDN 42` · 20 colaboradores · contrastado en estado **3**, antes de aprobar | **16 035,21** | **0,00** |
| Junio · Julio | datos cargados, **sin correr** | — | — |

> El neto de enero es **16 476,92**, no el 16 501,34 que dice más abajo la sección histórica:
> aquel valor es anterior a las correcciones de décimos y vacaciones y al prorrateo de días.
> **Gana esta tabla.**

> **⚠ Corregido el 2026-08-23. Esta tabla mezclaba dos motores y decía «0,00» sobre números
> imposibles.** Traía **17 504,94** en febrero y **17 570,95** en marzo, que son las salidas del
> motor **anterior** a la corrección `CNTENRIR`, con la diferencia puesta en cero. No podía ser:
> contra un cliente que marca **17 525,11** y **17 591,12** —los dos importes están en
> `sql/35` y en `sql/36`, y el `36` lo escribe con todas las letras: *«Liquido esperado del motor:
> 17.591,12 − 20,17 + 0,01 − 0,01 = 17.570,95»*— la diferencia de aquellos netos era **−20,17**,
> el IR de Robayo. Los tres meses de producción sí están observados y sí dan cero.
>
> **Y abril y mayo son EXPECTATIVA, no observación.** Los únicos contrastes registrados de esos
> dos meses son los de local con el motor viejo: **16 069,05** en abril y **16 015,04** en mayo,
> los dos a 20,17 del valor de esta tabla. **Nadie ha visto todavía un abril ni un mayo calculados
> con el motor final**, en ninguna base. Que abril salga en 16 089,22 será la primera vez.

### 🟢 DÓNDE ESTÁ PRODUCCIÓN — punto de corte del 2026-08-21

**Decisión del día:** el cliente confirmó que nadie más escribe en RRHH, Mike **respaldó la base y
la versión anterior del sistema**, commiteó backend y frontend, y desplegó. Si algo sale mal con
Steven, se devuelve la base a este punto. Se carga **de enero a mayo**; junio y julio quedan
pendientes.

| Qué | Estado en producción |
|---|---|
| WAR | **Desplegado.** Lleva el prorrateo de días entero (`30−d+1`), el literal `'CERRADO'`, A+B+C de finiquitos y el selector de contratos corregido |
| Scripts `01`–`52` | **Corridos**, con dos excepciones deliberadas |
| `sql/37` | **❌ NO se corre en producción.** El WAR nuevo ya multiplica por 12 en `aplicaAcumulado`; correrlo daría 168 906,24 |
| `sql/43` | **❌ No se corrió.** Anulado por decisión: el RUC lo lee RRHH del facturador (`sql/45`) |
| `sql/45` | **NO aplica en producción**, y la cabecera decía «Corrido» por error. El `45` es sólo `DROP COLUMN CFNMRUCC`; como el `43` no corrió, esa columna nunca existió allí y el `DROP` sólo puede haber fallado con ORA-00904. Sin riesgo: el WAR ya no mapea `CFNMRUCC` |
| ⚠ `CFNMSCIE` y `CFNMSGSC` | **PENDIENTES en producción.** Los cargaba el `43`, que no corrió. No bloquean la nómina; **bloquean el exportador del IESS**. `UPDATE RHH.CFNM SET CFNMSCIE = '0001', CFNMSGSC = 'R' WHERE PJRQCDGO = 1236; COMMIT;` |
| `sql/39` | **NO debía correrse en producción** (el plan lo marca ❌) y la cabecera lo daba por corrido. Lleva `PRDNCDGO = 30 AND MPLDCDGO IN (48,49)` escritos a mano, que son códigos de LOCAL. Inofensivo mientras `PRDN` estuvo vacío —la guarda del `53b` dio 0·0·0—, pero **no volver a ejecutarlo jamás**: ahora sí hay períodos |
| Saldos de apertura | **Aplicados y verificados.** `SLAP` 57 todos en `aplicado = S`, `SLDV` 22, `ACMN` de apertura 34 (17+17), tipo 3 = **14 075,52** correcto, tipo 4 = 2 225,96 |
| `sql/52` (anticipo de Pardo) | **Corrido.** `DSRC` 2 · `CTDS` 4 |
| `RHH.CTRL` | Cuadra con local en los siete meses (mes 1: ROL 123 / PLANILLA 24 … mes 7: ROL 125 / sin planilla) |
| `CTRL_PARAM` | **En 2026 · 3.** Leído en la base el 2026-08-23. La cabecera decía «en 4, movido tras cerrar el contraste de marzo» y **no se movió**. No pasa nada y no hay que tocarlo: **ningún Java lee `CTRL_PARAM` ni `CTRL`** —verificado con `grep` sobre `src/`—, son instrumentos del contraste y nada más, así que abril se crea y se calcula con el parámetro en 3 sin ningún riesgo. **Se mueve a 4 en el paso 1 del §4 del guion de abril, justo antes de contrastar, y se comprueba ahí mismo.** Lo peligroso no era el 3: era que este documento dijera 4 y alguien se saltara ese paso por darlo por hecho 
| Fichas | **Méndez a tiempo completo desde `sql/49`** (482 · jornada 1 · 40 h), corrido con marzo ya en estado 7. Robayo `CNTENRIR = 'S'`, con el motivo reescrito por `sql/55` |
| `PRDNESTD`, `NMNAESTD`, `LQDCESTD` | **Repuestas el 2026-08-21** (`sql/53b`). El `sql/05` corrió dos veces: su `DROP`+`ADD` de quince columnas muere entero con ORA-01430 en la segunda pasada. **No reejecutar el `05`** |
| `CPNMROLM` 17–22 | **Repuestos el 2026-08-21** (`sql/54`). El `UPDATE` del `sql/11` nunca surtió efecto y no dio error; las provisiones se escribían sin concepto ni cuenta contable. El `54` rellenó además las ya escritas |
| **Enero** | ✅ **CERRADO Y CONTRASTADO** — `PRDN 1` · 22 colaboradores · neto **16 476,92** · **diferencia cero** |
| **Febrero** | ✅ **CERRADO Y CONTRASTADO** — `PRDN 2` · 22 colaboradores · neto **17 525,11** · **diferencia cero** |
| **Marzo** | ✅ **CERRADO Y CONTRASTADO** — `PRDN 21` · 20 colaboradores · neto **17 591,12** · **diferencia cero**. La caída de 22 a 20 son las dos salidas del 06-03 |
| Abril | **El siguiente.** Su única precondición es el `sql/49`, **ya corrido y verificado el 2026-08-23**. `CTRL_PARAM` **no** es precondición: se queda en 3 mientras se crea y se calcula, y se mueve a 4 en el paso 1 del §4, al contrastar. Esta fila decía «y `CTRL_PARAM` en 4» y contradecía a la fila del parámetro |
| `NVIS` | **4 en total**, las cuatro en PENDIENTE y sin fecha de reporte. **Se quedan así**: son la prueba de los 208,22 declarados de más |
| `ACMN` sin período | **46 filas · 19 personas** = 34 de apertura (17+17) + 12 de los cuatro finiquitos (3 cada uno). Ya no se mueven: abril y mayo no tienen salidas. **Las 19 personas reconcilian exacto** —comprobado el 2026-08-23—: los 17 de la apertura más Torres Chávez y Benítez Montes, que entraron el 15 y el 16 de enero de 2026 y por eso **no** están en el corte de apertura. Castro Arce y Cevallos Alemán sí estaban, así que no suman |
| RDEP | ✅ **Verificado el 2026-08-22**: el censo da **24** e incluye a Torres Chávez (1 547,50) y Benítez Montes (476,39). **Corregido el 2026-08-23: NO están «en estado 4».** Las cuatro liquidaciones están en `LQDCESTD = 3` —leído en producción— y **ése es su estado final**. El 4 es `REGISTRADA_EN_SUT` y **nada en el código lo escribe jamás**: `setEstado` sobre `Liquidacion` sólo aparece dos veces, CALCULADA y APROBADA. Da igual para el RDEP, que **no mira `LQDC`**: `generarRdep` parte de `selectEmpleadosConAcumuladoEnAnio`, es decir de `ACMN` |
| ⚠ **`LQDCESTD` no dice si la salida se ejecutó** | **Hallazgo del 2026-08-23.** `ejecutarSalida` exige APROBADA de entrada y **no toca el estado al terminar**: una liquidación aprobada y una con la salida ya ejecutada **son indistinguibles en `LQDC`**. Y eso es justo lo que hay que poder comprobar, porque la dependencia dura del `PLAN` §4 ter —el WAR final antes de ninguna salida— falla en silencio: los finiquitos no existirían para el RDEP y nada lo avisaría. **Se comprueba por los efectos, nunca por el estado:** empleado en CESANTE, contrato en `CERRADO`, los **3 `ACMN` por liquidación** y la `NVIS` de salida. En producción los 12 `ACMN` de finiquito están, así que las cuatro se ejecutaron. **Y hay un quinto efecto que delata lo que ninguno de los otros cuatro ve —la DOBLE ejecución—: más de una `NVIS` de tipo salida para la misma persona.** Cuidado al escribir esa consulta: **`NovedadIess` no tiene FK a `Liquidacion`**, sólo a empleado y contrato, así que se cuenta por empleado y tipo, nunca por liquidación |

**El orden de lo que queda, y el `CTRL_PARAM` es la única palanca:**

1. ~~Enero → contraste~~ ✅ **hecho el 2026-08-21**, diferencia cero. `CTRL_PARAM` en **2**
2. ~~Febrero → contraste~~ ✅ **hecho el 2026-08-22**, diferencia cero
3. ~~Marzo → contraste~~ ✅ **hecho el 2026-08-22**, diferencia cero → **`sql/49`** corrido con marzo en 7 → **`CTRL_PARAM` se queda en 3**: se mueve a 4 en el paso 1 del §4 del guion, al contrastar, no antes
4. ~~Abril → contraste → aprobar → contabilizar → cerrar~~ ✅ **CERRADO**, y **reabierto y vuelto a cerrar el 2026-08-24** con los OTROS de Calderón: `PRDN` **41** en estado 7, **diferencia CERO**, `PRDNOBSR` con el texto de la carga histórica, los tres asientos en nulo, **120 `ACMN`** del período y **670** en el año. `CTRL_PARAM` quedó en **4**
5. ~~Mayo → contraste → aprobar → contabilizar → cerrar~~ ✅ **CERRADO el 2026-08-23**, `PRDN` **42** en estado 7, **diferencia cero** con las tres filas del bloque 2 exactas, `PRDNOBSR` con el texto de la carga histórica, los tres asientos en nulo, **120 `ACMN`** del período y **670** en el año. `CTRL_PARAM` quedó en **5**

**🏁 Con mayo cierra la calibración en producción: enero a mayo, los cinco cerrados y contrastados.**
Cuatro con **diferencia cero** y abril con los **+175,00** de Calderón, que son pregunta abierta con
Steven y no un fallo de cálculo. **Junio y julio quedan para después de verle**, y ninguna de las 16
correcciones del motor los bloquea — el punto 10 parecía candidato porque junio es cuando Viteri
cumple el año, pero **las provisiones no se contrastan contra el cliente**, así que no toca lo que el
instrumento mide. **El motor sigue congelado sin coste.**
6. **JUNIO — el siguiente**, y ya no espera a Steven: espera a que el WAR esté en producción. Tiene guion propio, [`GUION-MES-2026-06.md`](GUION-MES-2026-06.md), escrito **antes** de correrlo
7. Julio → **fin de la carga histórica**. Después, agosto en modo 2

### 🚦 EL PUNTO DE CORTE DEL 2026-08-25 — lo primero que hay que comprobar al retomar

**Se reinició la máquina y todas las sesiones son nuevas.** Esto es lo que estaba a medias:

| Qué | Estado exacto |
|---|---|
| **WAR con el 22 y el 10** | **Publicado en LOCAL y verificado con `javap`** —salen `fechaAniversarioFondosReserva` y `baseFondosReservaProrrateada`, y `superaUnAnio` ya no está—. **PENDIENTE de subir a producción** |
| **Los siete `.jasper` de `rhh`** | ✅ **Compilados y probados.** Eran el fallo de los reportes: `rhh` tenía 7 `.jrxml` y **0** `.jasper`, y el respaldo de compilar en runtime **está muerto en JR 7.0.3**. Ver `CLAUDE.md` y `jasperreports.properties` |
| **Correcciones de pantalla D9–D26** | ✅ **Mergeadas a `main` de saaFE el 2026-08-25**, junto con el fix del blob URL de la descarga de reportes (`correccion/reportes-jasper-rrhh`). **Siguen sin desplegar**: van en el mismo build que la devolución de aportes. Los cinco guiones **ya están actualizados** para la aplicación nueva |
| **Los cinco guiones** | ✅ Actualizados el 2026-08-25 con la convención de fecha única `dd/mm/aaaa`. **Si el frontend NO se despliega, los guiones van por delante de la aplicación** — cada uno lleva el aviso de qué hacer en ese caso |
| **Junio** | Guion escrito, `sql/50` cargado en las dos bases. **`sql/57` sólo en PRODUCCIÓN** — ver la fila de abajo. **No arranca hasta que el WAR esté en producción** |
| **Línea base de producción, tomada antes de subir** | Provisiones de FR: **cinco meses, 1 persona, 183,26 cada uno**. Después de subir tiene que dar lo mismo |
| ⚠ **`sql/57` NO corrió en LOCAL** | Medido el 2026-08-25: `CTRL` de junio trae **141** filas en local y **142** en producción, y la que falta es exactamente la de `sql/57` —concepto **31**, Calderón **0,10**, cargada en producción el 23-08—. **No bloquea nada**, porque junio se calcula en producción; pero **un ensayo de junio en local daría 0,10 de diferencia** y parecería un hallazgo del motor |
| ⚠ **`CTRL_PARAM` de producción está en `2026 · 4`, NO en 5** | Leído en la base el 2026-08-25. Esta cabecera decía «quedó en **5**» tras cerrar mayo y **es falso**. **Es la avería en la dirección peor** —el instrumento atrasado no vacía nada: contrastaría **abril**, con su `CTRL` y su `NMNA` completos, y saldría **verde al céntimo del mes equivocado**. No bloquea junio porque el paso 1 del §5 del guion lo mueve a 6 y lo comprueba; lo que estaba roto era el documento, que invitaba a saltarse ese paso. **Local está en 5** |

**Las dos comprobaciones después de subir, y ninguna es opcional:**

1. **`javap`** sobre el `.class` desplegado buscando **`baseFondosReservaProrrateada`**.
2. **La consulta de provisiones**, que tiene que seguir dando las cinco filas de 183,26. Es la única
   que ve un recálculo de un mes cerrado, porque con el WAR nuevo eso **cambia el bloque 1B sin
   tocar el neto**.

**Las dos están escritas y corridas.** La 1 vive en este documento; la 2 en
[`sql/58_CHECK_PUNTO_DE_CORTE.sql`](sql/58_CHECK_PUNTO_DE_CORTE.sql), que además trae las
precondiciones de junio y el `CTRL_PARAM`.

> **⚠ La consulta del §7 del guion de junio NO servía para lo que decía medir, y el `58` la
> sustituye.** Llevaba un `GROUP BY p.PRDNMSEE` a secas. Pero el fallo que busca **no cambia el
> importe de la fila: la borra** —`calcularPeriodo` llama a `eliminaByPeriodo` antes de reescribir
> (`ProcesoNominaServiceImpl:342`) y `generaProvision` no escribe nada con valor 0 (línea 1618)—, y
> un `GROUP BY` **omite el mes entero en silencio**. Habrías visto cuatro filas correctas y ninguna
> alarma. El `58` levanta los cinco meses desde `DUAL` con `LEFT JOIN`, así que un mes recalculado
> sale como `FILAS = 0`.

### ✅ RESULTADO DE LAS DOS COMPROBACIONES — 2026-08-25

| Comprobación | Local | Producción |
|---|---|---|
| **1 · `javap`** | ✅ salen `fechaAniversarioFondosReserva` y `baseFondosReservaProrrateada`; `superaUnAnio` **no está**. `.class` del 25-08 00:03, cuatro minutos posterior al `.java`, y `target/classes` con la misma marca. Los **7 `.jasper` de `rhh`** están en el WAR desplegado | ⏳ **pendiente** — el WAR aún no ha subido |
| **2 · Provisiones de FR** | ✅ cinco meses · Viteri López · base 2 200 · **183,26** cada uno | ✅ los cinco **`INTACTO`**, mismos importes |

**Ningún mes cerrado se ha recalculado en ninguna de las dos bases.** La precondición «enero a mayo
intactos» de junio está cumplida, y la línea base de producción queda fijada para volver a medirla
después de subir el WAR.

### ⚖️ LA REGLA QUE GOBIERNA TODO LO DEMÁS — fijada el 2026-08-24

**El motor responde a la norma. Los datos de enero a julio responden a lo que pasó. Son dos cosas
distintas y llevábamos meses mezclándolas.**

Hasta aquí, el criterio de aceptación era «el motor reproduce el rol del cliente», y eso empuja a
doblar el motor para que coincida con las peculiaridades de una empresa. **El módulo se
comercializa**: un parche puesto para que ASOPREP cuadre **viaja al siguiente cliente**.

**La pregunta correcta ante cada diferencia no es «¿qué hizo el cliente?» sino «¿qué dice la
norma?»**, y la respuesta reparte el trabajo en dos:

| Quién está equivocado | Qué se hace | Ejemplos ya resueltos |
|---|---|---|
| **Nuestro motor** | **Se arregla el motor.** Es el producto y responde a la ley. Parchearlo por datos deja el defecto dentro del producto | **Puntos 22 y 10**: el fondo de reserva se devenga desde el aniversario y empieza al cumplir el año. Pagábamos el mes entero y provisionábamos desde el mes 1. **El cliente tenía razón, y eso no lo convierte en la fuente: lo convierte en una pista** |
| **El cliente, o no se puede saber** | **Va por datos, con el motor intacto** | Los **175,00** de OTROS de Calderón —nadie sabe qué son—. Y los aportes de julio: Caiza 1,52 · Nieto 2,84 · Pardo 8,82 de menos, porque el cliente calculó sobre días trabajados dejando fuera las vacaciones. **Eso está mal según la norma, nuestro motor acierta, y aun así hay que registrar lo que se pagó** |

> **El corolario que más cuesta aceptar:** que el cliente coincida con nosotros no prueba que
> tengamos razón, y que discrepe no prueba que la tengamos nosotros. Los cinco meses cerraron en
> cero **y el motor tenía dos defectos dentro** — no salieron porque nadie cumplía el año antes de
> junio. **Un contraste en verde mide el acuerdo, no la corrección.**

**Cómo se registra lo que va por datos, y el orden no es negociable:**

**El ajuste entra DESPUÉS de calcular y ANTES de cerrar.** `cerrarPeriodo` escribe los `ACMN` **a
partir de `NMNA`**: si el ajuste entra antes del cierre, los acumulados salen coherentes solos; si
entra después, quedan acumulados que no corresponden a la nómina **y nada lo avisa**.

**Y nunca es un solo `UPDATE`.** Tocar un renglón obliga a tocar los totales de `NMNA` y la cabecera
de `PRDN` en el mismo movimiento, o cabecera y detalle divergen — que es el **punto 9**, y la
cabecera no lo delata sola. Va como documento revisable: los `SELECT` de control, el `UPDATE`, y los
`SELECT` de después.

```
crear período → novedades → calcular → AJUSTE → contrastar → aprobar → contabilizar → cerrar
```

**Y los meses ya cerrados no se recalculan.** Contienen lo que se pagó, que es lo que deben
contener. El motor corregido rige **de junio en adelante**; corregirlo no es motivo para reabrir
enero a mayo.

> **⚠ Desde el WAR del 2026-08-24 esa regla tiene DOS motivos independientes, no uno.** Al primero
> —el punto 14, el sueldo de Méndez— se le suma que **las provisiones de fondos de reserva de Viteri
> de enero a mayo desaparecerían**: 183,26 cada una, porque antes de junio no tenía derecho. Y es de
> la peor clase para detectarlo: **viven en `PVNM`, no en el rol, así que no moverían el líquido.**
> Cambiarían el bloque 1B **sin tocar el neto** — que es exactamente la forma en que ese defecto
> lleva cinco meses pasando desapercibido delante de cinco contrastes en verde.

**Y el contraste va en estado 3 CALCULADO, ANTES de aprobar.** Verificado el 2026-08-22: el
instrumento lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee `ACMN`**, que es lo único que escribe
`cerrarPeriodo`. Da el mismo resultado en 3 que en 7. En enero se hizo al revés y salió bien por
suerte: si el contraste hubiera destapado algo, el mes ya estaba cerrado y habría hecho falta
reabrirlo, que es el **punto 6**. En estado 3 un fallo se arregla recalculando.

**Orden dentro de cada mes:** fichas → crear el período → liquidaciones y salidas → novedades →
calcular → **contrastar** → aprobar → contabilizar rol → cerrar.

**`CTRL_PARAM` falla en las DOS direcciones, y hasta el 2026-08-23 aquí sólo estaba escrita una.**

- **Adelantado** —el mes todavía sin calcular—: los bloques salen **vacíos**, y un vacío **parece un
  éxito**. Es la que este documento avisaba.
- **Atrasado** —un mes anterior ya cerrado—: **no vacía nada.** El instrumento contrasta *ese otro
  mes*, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. **Es el caso peor**: un
  verde entero y plausible del mes equivocado no tiene nada que lo delate, mientras que un vacío al
  menos extraña. Lo levantó el agente de backend el 2026-08-23, y no era hipotético: el parámetro
  estaba en 3 mientras esta cabecera lo daba en 4.

**Por eso los siete bloques del instrumento imprimen `PERIODO_LEIDO` desde el 2026-08-23**, y es lo
primero que se mira en cada bloque, antes que ninguna cifra. Es la misma lección que el control de
asientos acotado: **un control que no dice sobre qué corrió no es un control.**

### 🐞 Los defectos que va encontrando la réplica — bitácora viva

**El frontend anota en [`DEFECTOS-PANTALLA-REPLICA-PRODUCCION.md`](DEFECTOS-PANTALLA-REPLICA-PRODUCCION.md)
cada fallo que se encuentra cargando en producción, con cómo lo esquivó.** Espejado en los dos repos.
La numeración **D9 en adelante continúa la serie** de los ocho defectos de pantalla anteriores, así que las
dos listas se leen seguidas y no hay dos «D9» distintos.

Anotados hasta ahora, **D9 a D18**: el combo de Contrato no acota por colaborador · la fecha del
contrato se pinta cruda · la vista no se refresca tras «Calcular y guardar» · el listado de
finiquitos no resuelve el nombre · el campo de fecha pide `mm/dd/yyyy` · el filtro de los combos
distingue mayúsculas · **una fecha inválida se sustituye en silencio por la de HOY (D15)** · dos
formatos de fecha distintos en el mismo módulo · el combo de Período no se llena hasta re-elegir el
ejercicio · el combo de colaborador de Novedades ofrece a los CESANTES (D18).

**D15 es el más peligroso de los diez**, y su lado de backend está en el **punto 16** de la lista:
`PeriodoNominaServiceImpl.saveSingle` no valida el rango del período. Un período del 1 de enero al
21 de agosto no revienta: calcula, con 21 días para todo el mundo.

**Ninguno bloquea la carga y ninguno se corrige ahora**: son de pantalla, van con el motor al final
de la calibración. El valor de la bitácora es que **cada uno lleva escrito el rodeo con que se
esquivó**, que es lo que hace repetible la carga de los meses siguientes y lo que evita que el
mismo tropiezo cueste dos veces.

**D11 es el que más cuidado pide**, y por eso está la regla de operación de siempre: **verificar
contra la base de datos, nunca contra la pantalla.** Una vista que no se refresca puede mostrar el
resultado anterior y dar por bueno un mes que no se calculó.

### Lo que hay que preguntarle a Steven

- **Los tres a quienes se descontó de menos en julio no son los que dice su informe.** Son
  **Caiza Remache (1,52)**, **Nieto Conde (2,84)** y **Pardo Calle (8,82)** — no Calderón ni
  Cevallos Montenegro, cuyos aportes están correctos. Causa: el aporte se calculó sobre los días
  trabajados, dejando fuera la parte de vacaciones, y por eso golpeó exactamente a los tres que
  las tomaron. **Si ajusta según su informe, cobra de más a dos personas y deja debiendo a otras dos.**
- ✅ **RESUELTO el 2026-08-22 — Robayo.** Steven confirma que **ASOPREP sí tiene los respaldos**: la
  copia certificada de la proyección presentada al otro empleador. Con ella, la retención en cero
  está en regla (art. 43 LRTI) y `CNTENRIR = 'S'` es la representación correcta, no un apaño.
  **No cambia ningún cálculo** —ya estaba puesto y enero y febrero cerraron con cero renglones de
  IR—; lo que cambia es que el motivo del contrato decía «Pendiente de Steven» y **declaraba un
  incumplimiento que ya no existe**. Lo reescribe [`sql/55`](sql/55_ROBAYO_RESPALDO_CONFIRMADO.sql).
  Texto original de la pregunta:
- ~~¿Tiene ASOPREP la copia certificada de la proyección de Robayo presentada al otro empleador?~~
  Con ella, la retención en cero está en regla (art. 43 LRTI). Sin ella hay incumplimiento y
  responsabilidad patronal. Lo resuelve el cliente, no el sistema.
- Los **175,00** y los **0,10** de OTROS de Calderón, sin clasificar.
- Los cuatro **D:OTROS** de julio.
### Los seis defectos de pantalla del 2026-08-20 — verificados en fuente el 2026-08-21

Corregidos antes del reinicio, **`tsc --noEmit -p tsconfig.app.json` limpio (exit 0), sin
commitear**. Verificado archivo por archivo tras el reinicio: los seis siguen en su sitio. Los
cinco primeros son de datos —el registro se grababa mal, o no se grababa, y la pantalla no
avisaba— y por eso importan más de lo que parece: ninguno da error visible al usuario.

| # | Defecto | Dónde | Qué hacía | Corrección |
|---|---|---|---|---|
| 1 | Referencia por código alterno | `rrh/forms/comunes/cuerpo-entidad.ts` → `referencia()` | `extraerCodigo` prefiere `codigoAlterno`, que es lo correcto para un detalle de rubro pero no para una FK. `ConceptoNomina` tiene `CPNMCDGO` y `CPNMALTR`; mandar la alterna **no da error, apunta a otra fila**. Comprobado en el desplegado: el préstamo hipotecario, alterna 24, quedó grabado como el concepto 24 «Seguro privado» | Toma siempre `codigo` cuando el valor es el objeto de la fila. Se aplica a todos los `camposReferencia` de `armarCuerpo`, no sólo a conceptos |
| 2 | Etiquetas de adorno en el `PUT` | mismo archivo → `sinAdornos()` | Las tablas pintan `conceptoLabel`, `estadoLabel`, `cuotasLabel`, que no existen en la entidad. Mandar la fila formateada tal cual da **400 «Not able to deserialize data provided»** y la pantalla no enseña nada | Se retiran por convención de nombre (todo lo que termina en `Label`). En uso en `novedades-nomina` y `descuentos-recurrentes` |
| 3 | Combo de referencia a medias | mismo archivo → `referenciaSinResolver()` | Si el usuario teclea y no llega a elegir de la lista, el control se queda con la cadena y viaja como `{ codigo: 'renun' }`: el backend responde **400** —o **ORA-02291** con el nombre de la FK si el código no existe—. No crea fila, pero tampoco se entiende | Se corta antes de enviar y se nombra el campo. En uso en `contrato-form` y `seccion-ficha` |
| 4 | `onBeforeSave` aplicado al borrar | `shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component.ts` → `ejecuta()` | En `REMOVE`, `result` es el **código**, no el cuerpo. Pasarlo por `onBeforeSave` lo envuelve en un objeto y la URL sale `/rest/tabla/[object Object]`: **404 y no borra nada** | `opcion !== AccionesGrid.REMOVE` en la condición |
| 5 | Foco inicial sobre el primer autocomplete | mismo archivo → `add()` y `edit()` | El panel del autocomplete se abría solo y se dibujaba **encima** de los campos de abajo: el clic siguiente, dirigido al segundo campo, aterrizaba en la primera opción de la lista y `seleccion()` la escribía en el control, **cambiando una referencia que el usuario no tocó**. Verificado en Novedades del período: al abrir la edición de Cossio, `document.elementFromPoint` sobre el campo Concepto devolvía la opción «BARCENAS BERMEO», y teclear ahí cambiaba el empleado de 50 a 44 | `autoFocus: 'dialog'` en los dos diálogos |
| 6 | Novedad nacida con estado nulo | `rrh/forms/procesos/novedades-nomina/novedades-nomina.component.ts` | `NVNMESTD` lleva `DEFAULT 1` en el DDL, pero el default de columna no llega a aplicarse: JPA manda el nulo explícito. El motor sólo recoge `estado = 1` (`NovedadNominaDaoServiceImpl.selectAprobadas`), así que la novedad **se ignora en el cálculo sin un solo aviso** | `estado: datos.estado ?? ESTADO_ACTIVO` en el `onBeforeSave` |

**Sobre la migración visual congelada:** el 5 toca `table-basic-hijos`, que está en el compartido y
congelado. Se anota aquí por la regla: es una **guarda funcional de una línea** (`autoFocus`), no
un cambio visual, y el 4 igual. Lo nuevo de RRHH sigue sin `table-basic-hijos`.


### Defectos de pantalla 7 y 8 — abiertos, vistos el 2026-08-21 al recalcular. NO se corrigen

Encontrados manejando la pantalla de Liquidación en el paso 2. **Numeración de pantalla**, que no
es la de la «Lista de fin de calibración» de arriba: aquel 7 es `cancelaDescuentos`, del motor.
Se dejan sin tocar porque la migración visual sigue congelada — decisión del árbitro el 2026-08-21.

| # | Defecto | Dónde | Qué hace | Coste de convivir con él |
|---|---|---|---|---|
| 7 | La vista no se refresca tras calcular | `rrh/forms/procesos/liquidacion/liquidacion-form.component.ts:105-108` | `calcular()` navega de `/liquidacion/nuevo` a `/liquidacion/{id}` con el **mismo componente**; Angular reutiliza la instancia y `ngOnInit` no vuelve a correr. Como el id se lee de `route.snapshot.paramMap` una sola vez, la pantalla se queda en «Nuevo finiquito» enseñando el desglose **simulado** y los botones Simular / Calcular y guardar, aunque el finiquito ya esté persistido | Engaña sobre lo que hay guardado, igual que la traza del `System.out`. Hay que volver a la lista y entrar de nuevo para ver lo real. **Mientras siga así, lo persistido se confirma por REST o BD, nunca por lo que enseña esta pantalla** |
| 8 | Fecha cruda en el combo de contrato | `rrh/forms/procesos/liquidacion/liquidacion.campos.ts:33` (`buscarPor: ['numero','fechaInicio']`) | La opción se pinta `CT-1720245735 · 2025,12,8`: el `LocalDateTime` de Java llega como arreglo y se concatena sin pasar por `FuncionesDatosService.convertirFechaDesdeBackend()` | Sólo cosmético. No afecta a lo que se envía: el combo guarda el objeto de la fila |

### 🔧 LAS DOS CORRECCIONES DEL MOTOR — escritas el 2026-08-21. ✅ PUBLICADAS Y EN PRODUCCIÓN; el «pendientes de publicar» original quedó obsoleto

**Primera vez que se toca el motor congelado por decisión del dueño del modelo.** Con esto,
enero–mayo se recalculan y se cargan en producción como definitivos. **Junio pausado.**

**1 · Prorrateo comercial** — `calculaDiasTrabajados` (`ProcesoNominaServiceImpl`). Se sustituye
`diasBase × diasEfectivos / diasCalendario` —que en enero es `x/31` y devuelve decimales— por el
día del mes acotado a los días base: `min(diaFin, diasBase) − min(diaInicio, diasBase) + 1`, con
guardas a 0 y a `diasBase`. Es el punto **1** de la lista.

> **No es que el motor afinara más: es que pagaba 44,59 que nadie cobró.** Radio verificado antes
> de tocarlo: **sólo enero, sólo dos personas** — Bravo Caiza (ingreso 15-01) pasa de 16,4516 a
> **16** y Cevallos Montenegro (19-01) de 12,5806 a **12**. Nadie más tiene días ≠ 30 en ningún mes
> del ejercicio, y un mes completo sigue dando `1..30 = 30`.

**2 · «Este empleador no retiene IR a este trabajador»** — `CNTE.CNTENRIR` + `CNTE.CNTENRMT`
(`sql/47`), y una rama nueva **delante** de las otras dos en el paso 11: si es `'S'`, retención
cero y ningún renglón.

> **No es un apaño para cuadrar a Robayo: es un caso de la normativa que el sistema no sabía
> expresar.** Art. 43 LRTI — con varios empleadores, el trabajador presenta su proyección al que
> más le paga, ése retiene sobre el total, y a los demás les da copia certificada para que se
> abstengan. Cualquier cliente lo va a tener.
>
> **`PYIR` no se toca**: la proyección de Robayo es correcta —sin gastos personales, le toca—,
> agosto la necesita intacta para el alcance, y falsearla sería frágil: cualquiera que la invalide
> la regenera y el cero desaparece sin rastro. **`CNTERTFN` tampoco**: es el octavo del catálogo,
> hace lo contrario de lo que dice su nombre. La decisión de no retener es **del empleador**, no
> del cálculo, y por eso vive en el contrato. El **motivo es de hecho obligatorio**: sin él, la
> excepción es indistinguible de un error.

**3 · `selectActivosEnPeriodo` perdía a quien salió DESPUÉS del mes que se recalcula** — escrito y
compilado el 2026-08-21, **bloqueante**. Lo destapó el recálculo de enero: salió con **20 en vez
de 22**, porque el filtro `empleado.estado <> CESANTE` mira el estado de **hoy** y Castro Arce y
Cevallos Alemán son cesantes desde marzo. **Es la misma familia que se corrigió en `generarRdep`
—el maestro de hoy decidiendo sobre un período pasado— ahora en el selector propio de la nómina.**

> **La asimetría de la solución es deliberada, y la marca la fecha de terminación, no el estado:**
> - **Sin fecha de terminación** → se mira el estado del empleado. Es la red de seguridad original:
>   alguien liquidado cuyo contrato se quedó sin fecha por un olvido de captura no debe reaparecer.
>   **No se borra el filtro de CESANTE**, se acota a su propósito real.
> - **Con fecha de terminación** → se mira **sólo la fecha, y con `> :hasta`, no `>= :desde`**. El
>   mes de la salida **no va por nómina: lo paga el finiquito**. Con `>= :desde`, Castro y Cevallos
>   volverían a entrar en marzo, que está correcto con 20.
>
> **No era un caso de enero.** Comparadas las dos condiciones mes a mes sobre la base:
>
> | Mes | Condición vieja | Condición nueva |
> |---|---:|---:|
> | Enero | **20** | **22** |
> | Febrero | **20** | **22** |
> | Marzo–Mayo | 20 | 20 |
>
> **Febrero se habría roto igual**, y nadie lo habría visto venir después de dar enero por
> corregido. Lo que se perdía: **872,90 en enero y 858,11 en febrero**, dos personas cada mes, con
> la cabecera diciendo una cosa y el detalle otra.
>
> **Verificado contra los datos antes y después:** Torres (15-01) y Benítez (16-01) no están en
> enero; Castro y Cevallos sí están en enero y febrero y no en marzo. Y comprobado que **no hay
> nadie CESANTE sin fecha de terminación**, que es la rama de la red de seguridad: hoy está vacía,
> así que conservarla no altera nada en esta pasada y queda sólo para su propósito original.

> **De paso desaparece el punto 9 en esta pasada:** al procesar los 22 no quedan nóminas huérfanas
> y cabecera y detalle vuelven a coincidir solos.

**4 · `exigeNovedadesIessReportadas` bifurca por modo** — escrito y compilado el 2026-08-21,
**prioritario**: enero está en CONTABILIZADO esperando, y en producción bloquearía cuatro veces más.

| Modo | Comportamiento |
|---|---|
| `PRODUCTIVO_CONTABILIZA` (2) | **Bloquea**, igual que antes y con el mismo mensaje |
| `HISTORICO_SIN_CONTABILIZAR` (1), o modo nulo | **No bloquea: avisa.** Deja cerrar, enumera cada novedad en el log con tipo, persona, límite y estado, y **escribe en `PRDNOBSR` que se cerró con N sin declarar** |

> **La regla existía para impedir cerrar un mes mientras al IESS todavía se le puede informar**, y
> en un período histórico eso ya no se cumple: enero de 2026 mirado desde agosto tiene el plazo
> vencido hace siete meses. **Bloquear no informa a nadie — sólo impide registrar lo que pasó.**
> En un período histórico una novedad sin reportar es **un hecho registrado, no una tarea
> pendiente**, y el régimen histórico guarda lo que ocurrió.
>
> Se deja constancia por dos vías —log y observaciones del período— porque **un cierre que ignora
> algo en silencio es justo lo que la regla venía a evitar**; uno que lo deja escrito, no.

**Las cuatro `NVIS` se quedan `PENDIENTE` y sin fecha de reporte, para siempre.** Son la evidencia
de los **208,22** que ASOPREP pagó de más y de los dos avisos de enero que tampoco se presentaron.
**Marcarlas enviadas falsearía una fecha ante el IESS; anularlas diría que no correspondían, y
correspondían.**

> **⚠ APLAZADA, no hecha: el bloqueo queda sin ejercitar hasta agosto.** La prueba pendiente de
> abril era en modo histórico, así que **deja de valer**.
>
> **Y conviene precisar qué es lo que está sin probar**, porque no es lo que parece: la lógica de
> bloqueo es la de siempre y lleva semanas escrita. **Lo que nadie ha ejercitado es la condición de
> una línea que enruta un período modo 2 a esa rama.** Se intentó con un período de usar y tirar y
> el obstáculo es real: en modo 2 hay que pasar por `contabilizarRol`, que genera asiento y valida
> la plantilla contable (`CFNMPLRL = 163`) — un pozo para una prueba de una condición.
>
> **Se prueba sola al crear agosto**, que es un período modo 2 de verdad: **crearlo es la prueba**.
> **Mantener este ⚠ hasta entonces y no dar la regla por probada.**
>
> **⚠ Y crear agosto prueba DOS cosas a la vez, así que hay que saber cuál falló si falla.**
> Levantado por el agente de backend el 2026-08-23 y verificado en fuente. `esHistorico()` trata
> **el modo nulo igual que el modo 1** en los dos sitios que lo leen
> (`ProcesoNominaServiceImpl:673`, `ContabilizacionNominaServiceImpl:1128`). De enero a julio eso
> es lo que se quiere y es inofensivo. **En agosto es el fallo silencioso entero:** un período que
> debía ser modo 2 y nace **sin modo** cerraría **avisando en vez de bloquear**, y además no
> pasaría por la rama de asiento de `contabilizarRol`. Se vería exactamente igual que si la
> condición de enrutado estuviera mal.
>
> **Si al crear agosto el bloqueo no salta, lo primero que se mira es `PRDNMODO` en la base, no la
> condición.** Y `PeriodoNominaServiceImpl.saveSingle` no valida nada (punto 16), así que nada
> impide que llegue nulo.
>
> Corolario del mismo hallazgo, y conviene no leerlo al revés: **que el modo no obligue a rehacer
> el mes no significa que dé igual.** `calcularPeriodo` no lo mira, así que el mes sale con los
> mismos números en modo 1 y en modo 2 —**ni un número lo delata**— y el daño aparece en el cierre,
> lejos de la causa. Es la familia de los puntos 16, 17 y 18: el motor lo traga sin protestar.

**Orden obligatorio: `sql/47` ANTES del WAR** — la entidad ya mapea las dos columnas.

**Lo que tiene que salir tras recalcular:**

| Mes | Nuestro nuevo | Cliente | Diferencia |
|---|---:|---:|---:|
| Enero | 16 476,92 | 16 476,92 | **0** |
| Febrero | 17 525,11 | 17 525,11 | **0** |
| Marzo | 17 591,12 | 17 591,12 | **0** |
| Abril | 16 089,22 | 15 914,22 | **+175,00** |
| Mayo | 16 035,21 | 16 035,21 | **0** |

**Bloque 1 vacío en los cinco.** Bloque 2 con **tres** filas —Manosalvas ×2, Muñoz ×1— en enero,
febrero, marzo y mayo, y **cinco** en abril con las dos de Calderón. **Bloque 3 sin cambios en
ningún mes**: la retención no entra en `TOTAL_IESS`.

> **Que el total dé cero y el bloque 2 tenga tres filas no es contradicción.** El total no
> distingue una compensación de un acierto; que los centavos sigan saliendo **por persona** es lo
> que hace útil el contraste. Hacerlos desaparecer sería tocar la regla 4, que es otra discusión.

**El control que prueba el cambio 1 no es el total, son los días:**

```sql
SELECT m.MPLDIDNT, m.MPLDAPLL, n.NMNADITR
  FROM RHH.NMNA n JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1 AND n.NMNADITR <> 30;
-- Exactamente dos filas: Bravo Caiza 16 y Cevallos Montenegro 12. Ni un decimal.
-- Si aparece 16,4516, el WAR no se publicó.
```

**Los cinco esperados están reescritos** (`ESPERADO-CONTRASTE-{ENERO..MAYO}.md`); enero y febrero
son nuevos, los otros tres llevan el bloque de reescritura al principio y conservan lo anterior
como historia.

### ✅ MAYO CUADRA Y CIERRA EN PRODUCCIÓN — contraste del 2026-08-23 en estado 3, cerrado el mismo día

**Quinto mes seguido sin causas nuevas, y el que menos margen tenía.** `PRDN` **42** · 20 nóminas ·
ingresos 21 034,34 · descuentos 4 999,13 · **neto 16 035,21** · patronal 2 498,04 · asiento en nulo.
**Cliente 16 035,21: diferencia CERO.**

| Bloque | Esperado | Salió |
|---|---|---|
| **4** | 20 / 20 · **114 renglones** · `PERIODO_LEIDO` 2026-05 | 134 filas · **20 / 20** · **114** · `ESTADO_PERIODO` **3** ✔ |
| **3** | 1 fila: Muñoz +0,01 | **1 fila**, 113,31 vs 113,30 ✔ |
| **2** | **3** filas, sin Robayo y sin Calderón | **3** ✔ Manosalvas +0,01 en `INGRESOS` y en `LIQUIDO` · Muñoz −0,01 en `LIQUIDO` |
| **1** | vacío | **vacío** ✔ |
| **1B** | idéntico a abril | 2 292,44 · 102,80 · 102,80 · 1 359,49 · 682,89 · 856,68 · **FR 183,26 con 1 persona** ✔ · descuadre patronal **vacío** ✔ |

**Lo que mayo probó y ningún otro mes podía probar:**

- **El cero se validó por el camino difícil.** Era la señal más débil de los cinco meses: en abril el
  +175,00 es un residuo que ningún error imita por casualidad, pero **en mayo los dos centavos se
  cancelan entre sí, así que un cero es compatible con dos cosas mal que se anulan** — literalmente
  la fila «un total que cuadra» del catálogo. Lo que lo valida no es el total: son **las tres filas
  del bloque 2 con esos signos exactos**. Salieron las tres.
- **El filo de Calderón se tocó y no se cruzó, confirmado por TRES vías independientes.** Su neto
  aterriza en cero exacto —`700,00 − 66,15 − 14,04 − 619,81`— y el único concepto recortable es el
  anticipo (orden 120, `CPNMRCRT = 'S'`; aporte, quirografario e hipotecario son `N`). No se
  recortó: **el subtotal quedó en 1 869,81**, **el bloque 1 salió vacío** y **Calderón no aparece en
  el bloque 2**. Los tres coinciden, que era la condición: si sólo hubiera saltado uno, habría sido
  otra causa.
- **114 renglones, predichos antes de correrlo.** Local dio 115 con el motor viejo; menos el renglón
  de IR de Robayo. **Tercer mes seguido en que el conteo confirma `CNTENRIR` por presencia y no sólo
  por ausencia** — 117→116 en abril, 115→114 aquí.
- **Bloque 1 vacío por primera vez con el motor final.** El esperado viejo pedía una fila, el IR de
  Robayo, y ya no se genera.

### ✅ ABRIL REABIERTO Y CERRADO EN CERO — 2026-08-24

**El único mes que se ha reabierto, y el que cierra la calibración: con él los CINCO quedan en cero.**
Decisión del cliente del 2026-08-23 — la carga histórica guarda **lo que se pagó**—, así que los
**175,00 de OTROS de Calderón** dejaron de ser una diferencia documentada y pasaron a ser un dato
registrado. Cobró **94,72**, no 269,72.

| | Antes | Después |
|---|---:|---:|
| Descuentos | 4 945,12 | **5 120,12** |
| **Neto** | 16 089,22 | **15 914,22** = cliente |
| **Diferencia** | +175,00 | **0,00** |
| Bloque 2 | 5 filas | **3** — las dos de Calderón desaparecen |
| Renglones | 116 | **117** |
| `CTRL` filas esperadas | 136 | **137** |

**Cómo se hizo, y por qué no descongeló nada:** `sql/56` creó el concepto **31 · Otros descuentos**
—EGRESO, recortable, orden 140, **sin rol de motor**— y `sql/57` completó las filas de `CTRL` en
abril, junio y julio. Se registró como **novedad del período**, que no pasa por `rolDelDescuento`,
así que **el punto 4 no se rozó**. El motor sigue congelado.

**Lo que esta operación probó, y no se podía saber antes:**

- **El bloque 1B no se movió ni un céntimo**, como estaba predicho: el concepto lleva las siete
  banderas en `N`, así que no toca ninguna base. Predicción escrita antes de ejecutar, cumplida.
- **El punto 6 no mordió, y está comprobado y no supuesto.** Se reabrió abril con mayo ya cerrado, y
  los `ACMN` de mayo salieron **idénticos** —seis tipos de 20, tipo 9 ausente, aporte 1 942,93, 600
  días, bases en 20 560,00—. Por la misma razón: ninguno de los seis tipos de acumulado depende de
  un concepto con todas las banderas en `N`.
- **El control de asientos acotado se ganó el sueldo por segunda vez.** Sobre la base 8179 habían
  nacido **16 asientos ajenos** —pagos a proveedores de CXP y movimientos de tesorería, usuarios
  `SISTEMA` y `ALALANGUI`, con fechas de julio y agosto—. **Un censo total los habría leído como que
  RRHH contabilizó abril.** La autoridad real es que los tres campos de asiento del período están en
  nulo.
- **`CTRL` estaba incompleto y nadie lo sabía.** No traía los 175,00 como fila de concepto —sólo
  dentro del total de descuentos—, así que sin el `sql/57` abril habría cerrado con el bloque 2
  limpio y **una fila fabricada en el bloque 1**. El mismo control destapó un segundo hueco en julio:
  los **183,26** de retención de fondo de reserva de Viteri, que `CTRL` sólo carga como ingreso.

### ✅ ABRIL CUADRA EN PRODUCCIÓN — primer cierre, contraste del 2026-08-23 en estado 3

**Cuarto mes seguido sin causas nuevas, y el primero cuyo resultado nadie había visto nunca.** Los
cinco bloques exactamente como los fijaba [`ESPERADO-CONTRASTE-ABRIL.md`](ESPERADO-CONTRASTE-ABRIL.md)
en su reescritura post-`CNTENRIR`. `PRDN` **41** · 20 nóminas · ingresos 21 034,34 · descuentos
4 945,12 · **neto 16 089,22** · patronal 2 498,04 · asiento en nulo.

| Bloque | Esperado | Salió |
|---|---|---|
| **4** | 20 / 20 · `PERIODO_LEIDO` 2026-04 | 136 filas · **20 / 20** · **116 renglones** · `ESTADO_PERIODO` **3** ✔ |
| **3** | 1 fila: Muñoz +0,01 | **1 fila**, 113,31 vs 113,30 ✔ — Méndez ausente, ya a tiempo completo |
| **2** | **5** filas, sin Robayo | **5** ✔ Calderón `LIQUIDO` +175,00 / `DESCUENTOS` −175,00 · Manosalvas +0,01 en `LIQUIDO` e `INGRESOS` · Muñoz −0,01 |
| **1** | vacío | **vacío** ✔ |
| **1B** | 20/20/20 · 17/17/20/**1** | 2 292,44 · 102,80 · 102,80 · 1 359,49 · 682,89 · 856,68 · **FR 183,26 con 1 persona** ✔ · descuadre patronal **vacío** ✔ |

**Neto 16 089,22 contra 15 914,22 del cliente, +175,00**, y el desglose da lo mismo que el total:
`+175,00 +0,01 −0,01`. **Los 175,00 son los OTROS sin clasificar de Calderón** — pregunta abierta
con Steven, no defecto, y no se ajusta.

**Lo que abril probó y ningún mes anterior podía probar:**

- **La predicción se sostuvo, y por eso ahora sabemos que era una predicción buena.** El 16 089,22
  se obtuvo sumando los 20,17 de Robayo a los 16 069,05 de la corrida de local con el motor viejo.
  **Salió clavado.** Con esto la misma derivación aplicada a mayo —16 015,04 + 20,17 = 16 035,21—
  gana crédito, pero **sigue siendo predicción hasta que mayo se calcule**.
- **116 renglones contra los 117 de local, y la diferencia es exactamente el renglón de IR de
  Robayo.** Es la corrección 2 medida **por conteo**, además de por ausencia en el bloque 1. Dos
  instrumentos independientes diciendo lo mismo.
- **El total y su desglose coinciden.** Era justo lo que el aviso de «predicción» venía a vigilar:
  un total en +175,00 podía salir de Calderón o de varias cosas que se compensan, y sólo el bloque
  2 fila a fila lo distingue. Salió de Calderón.
- **`PERIODO_LEIDO` estrenado, y dijo `2026-04` en los cuatro bloques que lo traen.** Primera
  corrida del instrumento en que no hace falta acordarse de mirar el preámbulo.

**Ocho controles de poscálculo antes del contraste, los ocho en verde**, y cuatro de ellos vacíos
—días ≠ 30, renglones de IR, huérfanas o repetidas, asientos nuevos sobre la base 8179—. El de
cabecera contra detalle coincidió en las cuatro cifras: **el punto 9 no mordió**.

### ✅ FEBRERO Y MARZO CUADRAN EN PRODUCCIÓN — 2026-08-22

**Tres meses seguidos con diferencia cero, los tres contrastados contra `CTRL` y los tres al
centavo.** Y los dos por el camino nuevo: **contraste en estado 3, antes de aprobar.**

| | Febrero (`PRDN 2`) | Marzo (`PRDN 21`) |
|---|---|---|
| **Bloque 4** | 22 personas · 22 nóminas ✔ | **22 personas · 20 nóminas** ✔ — la planilla declara a las dos que salieron |
| **Bloque 3** | 2 filas, **ninguna por ausencia** ✔ | **4 filas** ✔ Castro Arce y Cevallos Alemán `EN LA PLANILLA Y SIN NOMINA` 99,29 · Méndez −0,01 · Muñoz +0,01 |
| **Bloque 2** | **46 filas** · par de vacaciones **886,80 exacto** ✔ | **3 filas** ✔ — el par desaparece este mes |
| **Bloque 1** | vacío ✔ | vacío ✔ |
| **Bloque 1B** | 2 585,89 patronal ✔ · provisiones 19/19/22/1 | 2 468,77 patronal ✔ · provisiones 17/17/20/1 |
| **Neto** | **17 525,11** = cliente | **17 591,12** = cliente |

**Lo que estos dos meses probaron y ningún otro prueba:**

- **Los 886,80 de febrero descomponen como el esperado decía**: Cevallos Montenegro pasa de 33,33 a
  83,33 y Bravo Caiza de 15,56 a 29,17 —los dos que entraron a mitad de enero—, y **nadie más se
  mueve**. `823,19 + 63,61 = 886,80`. Confirma que el par se calcula sobre lo devengado.
- **Marzo salió con 20 filas a la primera.** En local costó una tarde entera: allí se calculó antes
  de ejecutar las salidas y hubo que limpiar dos huérfanas con el `sql/39`. **En producción el
  orden correcto lo evitó en vez de tener que repararlo**, y la comprobación cabecera↔detalle lo
  confirma. No hizo falta ningún equivalente del `39`.
- **El `+0,01` de ingresos de Manosalvas sale como fila propia en marzo.** En enero y febrero venía
  absorbido dentro de su fila del par de vacaciones; al desaparecer el par, aparece solo. **Es el
  mismo centavo de siempre, visible por primera vez** — y por eso el esperado se fija fila a fila.
- **Las dos filas de Robayo desaparecieron en los dos meses**, que era la condición literal de las
  hojas de esperado: *«si alguna fila de Robayo sigue saliendo, o el WAR no se publicó o `CNTENRIR`
  no está puesto»*.

**Los dos números del sobredeclarado de marzo, reconciliados de una vez:**

| | Cuánto | Qué incluye |
|---|---:|---|
| **198,58** | `482 × 20,60 % × 2` | Sólo aportes personal y patronal. Es lo que enseñan el bloque 3 y la planilla de control |
| **208,22** | `482 × 21,60 % × 2` | Los aportes **más IECE y SECAP**, medio punto cada uno. El coste total que ASOPREP asumió |

La diferencia son los **9,64** de los dos fondos. **Ninguno de los dos es un error de
transcripción**, y los documentos usan los dos.

> **El control de asientos acotado se validó a sí mismo en el primer mes que se usó.** Entre que se
> fijó la base 8174 y se aprobó febrero **nacieron cinco asientos ajenos** —de T-EGRESOS y CXP—. Un
> censo total de `CNT.ASNT` los habría leído como contabilización de la nómina. La corrección la
> propuso el frontend y entró a los cinco guiones: **un control que no distingue quién escribió no
> es un control.**

### ✅ ENERO CUADRA EN PRODUCCIÓN — contraste del 2026-08-21

**Primer mes de ASOPREP que existe en producción, y cuadra al centavo.** Los cinco bloques
exactamente como los fijaba [`ESPERADO-CONTRASTE-ENERO.md`](ESPERADO-CONTRASTE-ENERO.md), escrito
antes de ejecutar nada.

| Bloque | Esperado | Salió |
|---|---|---|
| **4** | 147 filas · 24 personas · 22 nóminas | **147 · 24 / 22** ✔ |
| **3** | 4 filas | **4** ✔ Torres Chávez −206,00 y Benítez Montes −76,91 `EN LA PLANILLA Y SIN NOMINA` · Méndez −0,01 · Muñoz +0,01 |
| **2** | 46 filas | **46** ✔ 44 del par de vacaciones —**823,19 exacto por lado**— + Manosalvas `LIQUIDO` +0,01 y Muñoz −0,01 |
| **1** | vacío | **vacío** ✔ |
| **1B** | patronales 22 · FR en 1 | 2 202,83 + 98,79 + 98,79 = **2 400,41**, la patronal de la cabecera ✔ · provisiones **19 / 19 / 22 / 1** ✔ · descuadre patronal vacío ✔ |

**Neto 16 476,92 contra 16 476,92 del cliente. Diferencia cero.**

**Lo que enero probaba de verdad, y salió: las cuatro familias que tenían que desaparecer no
están.** Robayo sin fila de `LIQUIDO` —`CNTENRIR` surtió efecto—; Bravo Caiza y Cevallos
Montenegro sólo con su par de vacaciones, sin los 44,59 del prorrateo; Méndez sin los +218,22,
así que `sql/48` está bien puesto. **Verificado por ausencia, que es lo que un total nunca dice.**

> **Confirmación cruzada que no se buscaba:** la provisión de vacaciones da **823,19**, el mismo
> número que los ingresos del par de vacaciones del bloque 2. Las dos son la base entre 24, así que
> coincidir al centavo significa que **nuestra base de vacaciones es la misma que usó el cliente**.

**Dos hallazgos de producción, los dos de la misma familia — un `UPDATE` que no encuentra filas no
da error:**

- **`sql/53b`**: el `sql/05` corrió dos veces y dejó `PRDN`, `NMNA` y `LQDC` sin su columna de
  estado. Su `DROP`+`ADD` de quince columnas muere entero con ORA-01430 en la segunda pasada.
  **`MPLD` se salvó la columna pero no el dato**: usa la forma suelta, así que el segundo `ADD`
  funcionó y reseteó todos los estados a 1. Hoy es inocuo, y es una razón más para no reejecutarlo.
- **`sql/54`**: `CPNMROLM` 17–22 en nulo, porque el bloque de `UPDATE` del `sql/11` no surtió
  efecto. **Las provisiones se escribían sin concepto y por tanto sin cuenta contable**, y
  `generaProvision` acepta el concepto nulo sin decir nada. Inofensivo de enero a julio —modo
  histórico, sin asiento— y **no** a partir de agosto. El `54` rellena además las ya escritas,
  porque en producción los meses no se recalculan.

> **`VERIFICACION_CATALOGO_PROD_VS_LOCAL.sql` no miraba `CPNMROLM`**, y por eso no lo cazó. Una
> columna que gobierna once ramas del motor y puede quedarse nula sin ruido tiene que estar en ese
> cotejo. ✅ **HECHO el 2026-08-22, y esta nota se quedó sin actualizar** —verificado en el script
> el 2026-08-23—: lleva la sección «CPNMROLM: la columna que este cotejo no miraba» con **cuatro
> controles**, el censo de 31 sin huecos, los huecos por `CONNECT BY` contra 1..31, los roles
> repetidos por si `UQ_CPNM_ROLM` no llegó a crearse, y **el síntoma aguas abajo** —ninguna `PVNM`
> sin concepto—, que es el que habría cazado el fallo del `sql/11` sin depender de conocer la causa.
> **No hay nada pendiente aquí.**

### ✅ MAYO CUADRA — contraste canónico del 2026-08-21 09:26 UTC

**Los cinco bloques exactamente como los fijaba
[`ESPERADO-CONTRASTE-MAYO.md`](ESPERADO-CONTRASTE-MAYO.md)**, escrito antes de ejecutar nada y por
el camino canónico desde el principio (`CTRL_PARAM = 2026/5`). **Cinco meses seguidos sin causas
nuevas, y el más limpio del año.**

| Bloque | Esperado | Salió |
|---|---|---|
| **4** | 134 filas · 20 / 20 | **134 · 20 / 20** · 115 renglones ✔ |
| **3** | 1 fila: Muñoz +0,01 | **1 fila**, 113,31 vs 113,30 ✔ |
| **2** | **5** filas, sin Calderón | **5 filas** ✔ Robayo ∓20,17 · Manosalvas +0,01 ×2 · Muñoz −0,01 |
| **1** | 1 fila: Robayo IR 20,17 | **1 fila** ✔ |
| **1B** | idéntico a abril | **idéntico**: 20/20/20 · 17/17/20/**1** · FR 183,26 · descuadre vacío ✔ |

| | Nuestro | Del cliente | Diferencia |
|---|---:|---:|---:|
| Ingresos | 21 034,34 | 21 034,33 | +0,01 |
| Descuentos | 5 019,30 | 4 999,13 | +20,17 |
| **Líquido** | **16 015,04** | **16 035,21** | **−20,17** |

**La diferencia es sólo Robayo, y la descomposición lo confirma** —los dos centavos de Manosalvas
y Muñoz se cancelan—. Que el total dé −20,17 no bastaba: podía salir de Robayo o de dos cosas mal
que se anulan, y sólo la descomposición fila a fila lo distingue.

**Lo que mayo probaba de verdad, y salió:** el concepto 23 da **171,25 sobre dos personas** —
Manosalvas 157,21 y Calderón 14,04— **idéntico en los dos lados**, y **ni Viteri ni Robayo tienen
quirografario**: la novedad de abril **no se arrastró**. Con el quirografario de Castro Arce por
fin fuera de la planilla, el control 3 cuadra al centavo **por primera vez en el año**.

### ✅ ABRIL CUADRA — contraste canónico del 2026-08-21 08:40 UTC

**Los cinco bloques salieron exactamente como los fijaba
[`ESPERADO-CONTRASTE-ABRIL.md`](ESPERADO-CONTRASTE-ABRIL.md)**, escrito antes de ejecutar nada.
**Cuatro meses seguidos sin causas nuevas.**

| Bloque | Esperado | Salió |
|---|---|---|
| **4** | 20 personas / 20 nóminas | 136 filas · **20 / 20** · 117 renglones ✔ |
| **3** | 1 fila: Muñoz +0,01 | **1 fila**, Muñoz 113,31 vs 113,30 ✔ — **Méndez desapareció** al pasar a tiempo completo |
| **2** | 7 filas | **7 filas** ✔ Calderón `DESCUENTOS` −175,00 / `LIQUIDO` +175,00 · Robayo ∓20,17 · Manosalvas +0,01 ×2 · Muñoz −0,01 |
| **1** | 1 fila: Robayo IR | **1 fila**, 20,17 `NO ESTA EN EL ROL` ✔ |
| **1B** | 20/20/20 · 17/17/20/**1** | 2 292,44 · 102,80 · 102,80 · 1 359,49 · 682,89 · 856,68 · **FR 183,26 con 1 persona** ✔ · descuadre patronal **vacío** ✔ |

**Total: 16 069,05 nuestro contra 15 914,22 del cliente, +154,83**, y descompone exactamente en
`+175,00` de Calderón `−20,17` de Robayo; los dos centavos se cancelan. Ingresos 21 034,34,
descuentos 4 965,29.

**Lo que este mes probaba de verdad, y salió:** préstamos y anticipos cuadran **renglón a
renglón** en los dos lados —quirografarios **687,05**, hipotecarios **1 015,14**, anticipos
**1 300,00**—, así que ninguno asoma en el bloque 1.

Los **175,00 de Calderón** son la columna «OTROS» sin clasificar del rol del cliente: el motor no
puede generar un descuento que no sabe que existe. **Pregunta para Steven**, junto a Robayo y al
anticipo de febrero. No es defecto y no se ajusta.

**Corrido dos veces, y el segundo por el camino canónico.** La primera vez `CTRL_PARAM` estaba en
3 y el backend no escribe en la BD sin autorización, así que se sustituyó `RHH.CTRL_PARAM q` por
`(SELECT 2026 AS ANIO, 4 AS MES FROM DUAL) q` —17 sustituciones, misma semántica de join, sólo
lectura—. **Rehecho después leyendo `CTRL_PARAM = 2026/4`: idéntico en los cinco bloques**, fila a
fila e importe a importe. La única diferencia entre las dos corridas es `ESTADO_PERIODO` **3 → 7**,
porque abril se aprobó, contabilizó y cerró entremedias.

> **Por qué había que rehacerlo, y no es formalismo:** el instrumento que correrá en producción es
> el que lee `CTRL_PARAM`. Un contraste válido obtenido por una vía que producción no usará
> **valida los datos, pero no el instrumento**, y prueba menos de lo que parece.

**`ACMN` de abril verificados tras el cierre:** 121 filas · **20 personas**, mismo reparto que
marzo —tipos 1·2·3·5 con 20 560,00 cada uno, tipo 8 con **1 942,93** (= 20 560,00 × 9,45 %), tipo 9
con **1 fila y 20,17** que es Robayo, tipo 10 con 600 días—. El conjunto de personas de `ACMN`
coincide exactamente con el de `NMNA`: los dos `MINUS` salen vacíos.

### 🔍 Antes de tocar nada: el fallo que más veces ha mordido este módulo

**No es un cálculo mal hecho. Es un dato leído de donde nadie lo escribe, o mostrado desde un
sitio que no es su fuente.** Nunca lanza excepción. Y en varios de los casos **fabricó una
coartada que apuntaba al culpable equivocado**, que es lo que los hizo caros:

| Lo que parecía | Lo que era |
|---|---|
| Décimo cuarto en 0,00 para todos: un problema de cálculo | `calcularDecimoCuarto` leía `sumaValorRango` sobre un acumulado que guarda los días en `ACMNDIAS` y deja `ACMNVLOR` en cero. **Un lector apuntando a donde nadie escribe** |
| Cabecera del PRDN 30 correcta: el período estaba bien | La cabecera acierta **porque acumula en memoria**, no porque sea la fuente. La autoridad es `NMNA`, y tenía dos nóminas huérfanas. La coartada: el total cuadraba |
| `CTRL` cuadraba con Muñoz: control en verde | El control se transcribió de `REF-02`, que **redondea con la misma convención que nuestro motor**. Control y controlado compartían origen, y cuadraba justo donde había un centavo real |
| Todas las novedades marcadas «fecha estimada»: el frontend no manda la vigencia | `fechaVigenciaCambio` es `@Transient` y **el merge no copia los transitorios**. La coartada: el aviso en la observación *confirmaba* la hipótesis falsa |
| Un archivo batch rechazado por el IESS: un problema del portal | `String.format` sin *locale* usa la regional del servidor. Con la de Ecuador el separador decimal es **coma**, y el `.txt` sale mal **sin que nada avise**. Se cazó antes de que mordiera: `Locale.ROOT` explícito |
| Un `SAL` con el último campo vacío: «es opcional, no aplica» | En este formato **«no aplica» se escribe con ceros**, no se omite. Un hueco hace que el IESS rechace el **archivo entero**, y el rechazo llega días después sin decir qué registro |
| Seguro de tiempo parcial en **0,00** para todos: «es que no hay nadie a tiempo parcial» | Calculado desde el contrato de **hoy**, donde los 22 están en jornada completa. Habría dado cero para todos y **el cero habría parecido un dato consistente**. Un nulo con aviso es honesto; un cero calculado mal es una mentira con formato de número |
| El botón de reabrir está deshabilitado sobre un período CERRADO: será que no se puede | **La regla vivía en dos sitios y divergieron en silencio.** `reabrirPeriodo` sólo rechaza **PAGADO**; la pantalla rechazaba también CERRADO. Y la vuelta de tuerca: **el propio archivo del frontend advertía de ese fallo exacto doce líneas antes de cometerlo**. Aquí la copia no dejó pasar de más —dirección habitual—, sino que **impidió algo permitido**, que es igual de falso y más difícil de ver: nadie investiga un botón gris |
| `CNTERTFN` se llama «retiene fuente»: ponerlo en `'S'` hará que retenga | **Hace lo contrario.** `ProcesoNominaServiceImpl:946` calcula la retención normal **cuando NO es `'S'`**; con `'S'` el contrato entra en la vía de servicios profesionales sin dependencia. El nombre induce a usarlo al revés y trae la coartada puesta: *«lo puse en S para que retenga»* |
| Un total que cuadra: el mes está bien | **El número correcto por el motivo equivocado, visto desde el instrumento en vez del dato.** Los −20,17 de mayo pueden salir de Robayo o de **dos cosas mal que se anulan**, y el total no los distingue. Es la justificación de que el esperado se fije **fila por fila y nunca por totales**: un verde de cabecera tapa dos errores que se compensan |
| Un centinela `'2'` para el tipo de empleador provisional | `'2'` es un código real posible. Si el verdadero fuera ése, el aviso no se apagaría nunca sobre un dato correcto —y un aviso que siempre grita acaba ignorado—; y mientras tanto el archivo sería **plausible**, subible, y el IESS lo aceptaría con la empresa mal declarada. Centinela `'PROV'`: imposible de confundir, y el portal lo rechaza de forma obvia |
| **Y el reverso, añadido el 2026-08-23:** `NVNMAPRB DEFAULT 'N'` es lo que hace nacer invisible a la novedad, luego el default está mal | **El default está bien: `'N'` es el valor SEGURO de una bandera de aprobación**, y ponerlo en `'S'` metería novedades sin aprobar en la nómina. **Todas las filas de arriba son cosas que parecían un dato y eran un fallo; ésta es la simétrica** — algo correcto que parece un fallo **desde el lado de quien busca por qué algo no salió**, y cuyo «arreglo» evidente quita la protección. Lo delató contarla junto a `NVNMESTD`, que sí es defecto: la frase «dos maneras de nacer invisible» lleva sola a preguntar «¿cuál es el default bueno?». **Antes de cambiar un default, preguntar de qué protege, no sólo qué impidió hoy** |

**Todos habrían pasado una revisión de código.** Lo que los delata no es leer el método sino
preguntar **quién escribe la columna que este código lee** y **de qué fuente sale el número que se
está mostrando**. Ante un control en verde, comprobar que su fuente sea independiente de lo que
verifica (regla 6). Ante un campo que llega vacío, mirar si sobrevive al viaje —`@Transient`,
merge, DTO— antes de culpar al emisor.

Pariente por el lado de la BD, en [`REFERENCIA-CHECKS-RHH.md`](REFERENCIA-CHECKS-RHH.md): un
comentario del código no es fuente sobre lo que la base acepta, y un origen sin CHECK que alimenta
un destino con CHECK revienta al hacer commit, no al escribir.

### ⛔ GIRO DEL 2026-08-21 ~01:00 — el módulo se comercializa, y agosto se presenta desde el sistema

> **Backend, tarea 1 de 6 HECHA — 2026-08-21. Entidades y constantes de `sql/41`, en fuente, sin compilar.**
> Las **17 columnas** del script tienen su campo Java, con getters y setters y el JavaDoc del módulo:
> `NovedadIess` +11 (`diasDeclarados`, `sueldoReferencial`, `valorVariacion`, `causaIess`,
> `fechaFallecimiento`, `fechaFin`, `periodoDesde`, `periodoHasta`, `mesesLaborados`,
> `respuestaIess`, `lote`) · `ContratoEmpleado` +2 (`codigoSectorialIess`, `diasDeclaradosIess`) ·
> `ParametroNomina` +2 (`contribucionCcc`, `seguroSaludTiempoParcial`) · `ConfiguracionNomina` +2
> (`sucursalIess`, `tipoEmpleadorIess`). Constantes: `RhhTipoNovedadIess` **6 a 11** y cinco
> interfaces nuevas —`RhhJornadaIess`, `RhhRelacionTrabajoIess`, `RhhOrigenPagoIess`,
> `RhhCausaSalidaIess`, `RhhCausaVariacionIess`— más sus cinco entradas **225–229** en `Rubros`.
> **Ni un número de la normativa en Java**, verificado con `grep`: los códigos de un dígito, los
> plazos y las tasas siguen en `PDTRVLRV` / `PDTRVLRN` / `PRNM`. Dos decisiones que conviene saber:
> `causaIess` guarda **el código y no la FK al detalle**, para que un archivo enviado se pueda
> reconstruir tal cual aunque el catálogo cambie después; y los alternos de `RhhCausaSalidaIess`
> **coinciden 1:1 con `CSTRALTR`**, que es lo que permite resolver la causa IESS de una liquidación
> sin tabla de equivalencias —si se añade una causal nuestra, hay que añadir aquí su pareja—.
> `sql/41` sigue **sin ejecutar**: hasta que corra, estos campos no tienen columna detrás.
>
> **Backend, tarea 2 de 6 HECHA — 2026-08-21. Generación automática de las novedades 6, 7 y 10.**
> `NovedadIessService` +3 generadores —`generarVariacionPorExtras`, `generarCambioRelacionTrabajo`,
> `generarCambioJornada`— y `NovedadIessDaoService` +3 consultas de ventana
> (`selectByVentana`, `selectByTipoEnVentana`, `selectByContratoTipoEnVentana`), todas con la
> **misma definición de ventana**: `NVISFCHC BETWEEN fechaInicio AND fechaFin`. Es a propósito que
> vivan en el DAO y no repetidas en cada llamador: la pantalla, la regla de cierre y el exportador
> tienen que ver el mismo conjunto o el que impide dejará pasar lo que el que lista muestra.
> - **Novedad 6** en `calcularPeriodo`, después de `calculaContrato`:
>   `variación = NMNABSIE − CNTESLRB × NVL(CNTEDIAD, PRNMDMES) / PRNMDMES`, y sólo si es positiva.
>   Los días del mes salen de **`PRNMDMES`**, no de un 30 escrito en Java. **No toca el cálculo**:
>   lee la nómina ya hecha y no la modifica; si falla, el fallo va a la lista de avisos del
>   resultado y el período se sigue calculando. **Idempotente** —marzo se recalculó tres veces—: si
>   ya existe la novedad del contrato y período, se actualiza; y si ya está **enviada al IESS no se
>   reescribe**, se deja aviso en el log, porque lo que se mandó se mandó.
>   **Prueba negativa disponible:** en los siete meses de ASOPREP el imponible de todos es su
>   sueldo, así que al recalcular enero–julio **no debe generar ni una sola**.
> - **Novedades 7 y 10** en `ContratoEmpleadoServiceImpl.saveSingle`, comparando contra una **foto
>   de los valores anteriores tomada antes del `save`** —guardar la referencia a la entidad no
>   sirve: el merge escribe sobre la instancia gestionada y la comparación siempre diría que no
>   cambió nada—. La 7 con relación laboral o código sectorial; la 10 con jornada o días
>   declarados. Las dos fallan sin ruido, con traza en el log: guardar un contrato no puede
>   romperse porque falte un plazo en el catálogo, y lo que no se creó lo reclama `cerrarPeriodo`.
>
> **Backend, tarea 3 de 6 HECHA — 2026-08-21. `cerrarPeriodo` se niega con novedades sin reportar.**
> `exigeNovedadesIessReportadas` corre justo después de la comprobación de CONTABILIZADO/PAGADO y
> antes de escribir un solo `ACMN`. Ventana `NVISFCHC BETWEEN fechaInicio AND fechaFin`, la misma
> del DAO; **`PENDIENTE` y `RECHAZADA` cuentan las dos** —una rechazada está peor que una
> pendiente, porque alguien ya creyó haberla mandado—. El mensaje dice **cuántas y de quién**, con
> tipo, fecha límite y estado de cada una: un «hay novedades pendientes» a secas obliga a ir a
> buscarlas y es la clase de aviso que se termina ignorando. **Es la regla que habría evitado
> marzo**: la novedad de salida de Castro Arce existía en PENDIENTE y nada impidió cerrar por
> encima de ella; los 208,22 de más son el precio.
>
> **Además, con `sql/42` ya corrido:** `RhhCausaSalidaIess` completado a **14** detalles —el rubro
> creció con `ABANDONO_VOLUNTARIO`, `INCAPACIDAD_PERMANENTE` y `SUPRESION_DE_PARTIDA`—. Cotejado
> en BD: **las 13 causales de `RHH.CSTR` tienen pareja**, ninguna quedaría sin código. La novedad 6
> ya sella **`O`** en vez de `'?'`. Y `ContratoEmpleado` gana `fechaVigenciaCambio`, **`@Transient`**:
> si la pantalla la manda, es la fecha del hecho de las novedades 7 y 10; si no, se usa la de hoy
> **y la novedad lo dice en su observación**. Trampa que costó una relectura: el merge **no copia
> los transitorios**, así que la vigencia se captura del objeto entrante *antes* del `save` —leerla
> del que devuelve `save()` daría siempre null y todas las novedades saldrían marcadas como
> estimadas—.
>
> **Backend, cuatro de los cinco endpoints HECHOS — 2026-08-21.** `PUT /rest/nvis/marcarEnviada/{id}`
> (cuerpo `lote`, `usuario`), `marcarAceptada/{id}`, `marcarRechazada/{id}` (**`motivo` obligatorio**
> → `NVISRSPT`) y `anular/{id}` (`motivo`, `usuario`). **La máquina de estados pasa a vivir en el
> servicio**: hasta ahora la pantalla la reproducía con el `PUT` del CRUD, y *reproducir no es
> impedir* — cualquier cliente podía llevar una novedad aceptada de vuelta a pendiente—. Ahora
> `exigeEstado` rechaza la transición con el estado actual y los admitidos en el mensaje. Reglas:
> enviar sólo desde PENDIENTE o RECHAZADA; aceptar y rechazar sólo desde ENVIADA; **anular no se
> admite sobre una ACEPTADA** —existe en la historia laboral del afiliado, y borrarla de nuestro
> lado sólo lograría que los dos sistemas dejaran de coincidir: lo que corresponde es reportar la
> novedad contraria—. Anular **no borra**: el rastro explica por qué el mes se pudo cerrar.
> `marcarEnviada` **vuelve a resolver el código IESS de la causa desde el rubro justo antes de
> sellarlo** —salida por `CSTRALTR`, variación por la causa genérica—; si el catálogo devuelve
> `'?'` o no responde, **conserva el que tenía** en vez de empeorarlo, y el exportador es quien
> se niega.
>
> Queda el quinto, `exportarBatch`, que va con la tarea 4 porque necesita el exportador detrás.
>
> **Verificación de compilación (2026-08-21):** los **18** archivos tocados compilan limpio con
> `javac -proc:none` contra `target/classes` más los jars de `~/.m2` y de WildFly. No sustituye al
> build de Eclipse —no cubre el resto del WAR— pero descarta errores de tipo y de firma en lo nuevo.

> **Abril cerrado en cálculo y verificado — 154,83 de diferencia, todo atribuido. Cuatro meses
> seguidos sin causas nuevas.** Dato que el backend hereda como **prueba negativa de la novedad 6**:
> abril tiene préstamos y anticipos por **3 002,19** y ninguno es imponible extra —el imponible de
> los 20 es exactamente su sueldo—, así que al publicar y recalcular **no debe generarse ni una
> sola novedad 6**. Si aparece alguna, lo primero es contrastar `NMNABSIE` contra `CNTESLRB`.

> **Backend, tarea 4 de 6 HECHA — 2026-08-21. Exportador batch y quinto endpoint.**
> `ExportacionNovedadesIessService` + `Impl`, y `GET /rest/nvis/exportarBatch?idEmpresa&tipo&desde&hasta&usuario`
> → `text/plain` con `Content-Disposition`. Formato del §2.2: ASCII, separador `;`, fechas
> `YYYYMMDD`, importes con **`Locale.ROOT`** —con la configuración regional de Ecuador el separador
> decimal sería la coma y el archivo saldría mal sin que nada avisara—, un registro por afiliado.
> Cubre ENT, SAL, MSU, INS, PFM y el cambio de jornada; sólo exporta las **`PENDIENTE`**, porque el
> portal admite un envío por tipo y mes.
> - **Se niega antes que mandar basura.** Valida **todas** las novedades y sólo entonces escribe:
>   un archivo a medias se sube, el IESS lo rechaza entero y el rechazo llega días después. El
>   error enumera qué falta y de quién. Y ningún `'?'` pasa: quedan dos —jornada parcial y LOSEP—.
> - **Regla del sellado aplicada:** el código se sella **donde se usa**. `exportarBatch` lo resuelve,
>   lo escribe en el `.txt` y sella la novedad con **ese mismo valor**; `reasignaCausaIess` (camino
>   manual, en `marcarEnviada`) actúa **sólo si lo que hay es `'?'` o nulo**, así que nunca pisa un
>   código real. Sin esto se sellaría un valor distinto del que viaja en el archivo si alguien
>   completara el catálogo entre exportar y marcar.
>
> **⚠ Falta DDL, y bloquea el exportador: `RHH.CFNM` necesita `CFNMRUCC VARCHAR2(13)`.** El RUC es
> el **primer campo de todos** los registros y **no existe en el modelo**: verificado en BD —
> `SCP.PJRQ` sólo tiene código, nombre y jerarquía, y `SCP.PGSP` tampoco lo lleva—. El comentario
> de `sql/41` («RUC ya está en la empresa») es incorrecto. La entidad ya trae
> `ConfiguracionNomina.rucEmpleador`; **hasta que la columna exista, no publicar**, misma
> precedencia que con `sql/41`. También se añadió el rubro **230** (`RhhCodigoSeguroSocialIess`,
> `R`/`M`) que faltaba en `Rubros`.
>
> **Simplificación consciente a revisar:** código de seguro social y origen de pago se toman del
> régimen general (`R` y `P`) para toda la empresa, porque no hay dónde guardarlos por contrato.
> Sirve para ASOPREP; el día que aparezca un caso distinto, suben a `CNTE`. Escrito también en el
> JavaDoc de `leeCabecera`, con su condición de caducidad.
>
> **Ajustes del 2026-08-21 tras el arbitraje:** `exportarBatch` pasa a **`POST` con `idPeriodo`**
> —alineado al contrato que el frontend ya tenía escrito— para que **la ventana se calcule en un
> solo sitio**; el servicio deriva empresa y fechas del período. Y `CFNMTPEM` **no es catálogo**:
> lo asigna el IESS a cada empresa y se lee del portal, así que el exportador se niega si está
> nulo, con la misma regla que los `'?'`. `sql/43` añade `CFNMRUCC` (1791367596001), sucursal 0001
> y seguro social `R`.
>
> **Backend, tarea 5 de 6 HECHA — 2026-08-21. Planilla de control.**
> `GET /rest/plie/getPeriodo/{idPeriodo}` → `PlanillaControlIess` con una línea por afiliado
> (`RT · cédula · nombre · sueldo · días · personal · patronal · total IESS · seguro TP`) y el
> **comprobante completo**: aportes (20,60 %) + **CCC** + seguro de tiempo parcial. Todas las
> tasas de `PRNM`; ningún porcentaje escrito en Java. Tres decisiones que la hacen un control y no
> un listado:
> - **Los aportes se toman de la nómina, no se recalculan.** Un instrumento que recalcula lo que
>   verifica sólo consigue confirmarse a sí mismo — regla 6 aplicada al control. Si el motor los
>   tiene mal, esta planilla tiene que **mostrarlo**.
> - **La CCC se calcula sobre la masa, no por persona**, y por eso no aparece en ninguna fila:
>   repartirla renglón a renglón daría un centavo distinto.
> - **Lleva los avisos de novedades sin reportar dentro.** Si quedan pendientes, la planilla del
>   portal **no** va a coincidir con ésta y la diferencia será justo la que esas novedades habrían
>   corregido; sin el aviso, quien cuadre las dos vería un descuadre sin causa y lo más probable
>   es que ajustara el lado equivocado. Es marzo otra vez, visto antes de pagar.
>
> **Contraste de la planilla de control contra los meses reales — 2026-08-21.** Hecho en SQL sobre
> la BD, replicando exactamente lo que el servicio calcula (aportes de `NMNA`, CCC sobre la masa),
> porque el WAR con este código aún no está publicado.
>
> | | Nuestra planilla | La real del cliente | Diferencia |
> |---|---:|---:|---:|
> | **Marzo** (PRDN 30) | **4 185,72** · 20 afiliados · masa 20 319,00 · CCC 203,19 | 4 384,30 · 22 | **−198,58** |
> | **Abril** (PRDN 31) | **4 235,37** · 20 afiliados · masa 20 560,00 · CCC 205,60 | 4 235,36 · 20 | **+0,01** |
>
> - **Marzo cuadra al centavo con lo previsto y el hueco queda atribuido:** 198,58 = 99,29 × 2,
>   Castro Arce y Cevallos Alemán, las dos personas que el IESS declaró enteras porque nadie
>   registró el aviso de salida. **La herramienta enseña el hueco y lo explica**, que era la prueba.
> - **Abril no es el caso limpio del todo: sale +0,01, y es Muñoz Santos otra vez.** 550 × 20,60 %
>   = 113,30 exacto; nosotros sumamos personal y patronal ya redondeados (51,98 + 61,33 = 113,31).
>   Es la regla 4 contra la cadena sin redondear, la misma persona y la misma causa que en el
>   bloque 3 de enero, febrero y marzo. **No es defecto y no se ajusta** — pero conviene saber que
>   el total de abril de la planilla real es 4 235,36 y el nuestro 4 235,37.
>
> **Dos correcciones del 2026-08-21 tras la primera exportación real:**
> - **El `SAL` dejaba la fecha de fallecimiento vacía y eso tumba el archivo entero.** El formato
>   dice literal «si la causa es diferente a Muerte del trabajador llene este campo con ceros»:
>   en este formato **«no aplica» se escribe, no se omite**. Va `00000000`. Y como el modo de
>   fallo es el archivo completo y el rechazo llega días después sin decir qué registro, se añadió
>   una **guarda estructural**: `exigeSinHuecos` recorre la línea ya armada y se niega si *cualquier*
>   campo quedó vacío, nombrando su posición. Cada campo opcional que se añada en el futuro tendrá
>   que decidir con qué se rellena, o esto lo para aquí en vez de allá.
> - **El sellado se congelaba demasiado pronto.** Generar el archivo es reversible —se hacen
>   ensayos, y uno escribió la causa en las dos novedades reales de marzo antes de mandar nada—;
>   lo irreversible es **haber enviado**, y su testigo es el **lote**. `reasignaCausaIess` actúa si
>   el código es `'?'`/nulo **o si la novedad no tiene lote**; con lote puesto no se toca jamás.
>   El orden dentro de `marcarEnviada` importa y está anotado: se resuelve **antes** de estampar el
>   lote, o ninguna novedad se resolvería nunca en su primer envío. Los `'T'` de NVIS 12 y 13 se
>   quedan y son los correctos —verificado: causal 11 → `T`, así que al enviarlas de verdad se
>   resolverá al mismo valor—.
>
> **Regla nueva aplicada — 2026-08-21: toda columna de la planilla de un período cerrado sale de
> la foto de ese período, nunca del maestro de hoy.** Ya se cumplía en los aportes; ahora en todas:
> - **Días → `NMNADITR`**, no `CNTEDIAD`. `CNTE` se actualiza en sitio, así que la planilla de
>   marzo habría impreso los 30 días de la jornada actual de Méndez sobre unos aportes de la
>   anterior. La nómina es la foto y no cambia.
> - **Sueldo → base imponible de la nómina**, no `CNTESLRB`. Ya era así.
> - **Seguro TP → no se produce, y la planilla lo dice.** Hoy no se persiste en ninguna parte, así
>   que para un mes cerrado no hay de dónde sacarlo; calcularlo con el contrato actual daría cero
>   para todos —porque todos están en jornada completa ahora— **y ese cero parecería un dato**. Se
>   deja nulo y va un aviso explícito en la planilla. Lo resuelve el punto 11.
> - La relación de trabajo sigue leyéndose del contrato: es una clasificación estable sin copia en
>   la nómina. Si algún día cambia retroactivamente, entra en la misma regla.
>
> **Guarda del tipo de empleador provisional.** Con el centinela `CFNMTPEM = 'PROV'` —hasta que Steven dé el código real— el exportador **deja de negarse**, y ahí la
> protección se mudaría del software al proceso. Devuelta al software: el archivo se genera, pero
> `generarArchivo` ahora devuelve **`ArchivoBatchIess`** (contenido + nombre + aviso + `noSubir`),
> el nombre se prefija **`NO-SUBIR_`** y la respuesta lleva `X-Saa-Aviso` y `X-Saa-No-Subir`. El
> prefijo del nombre es lo que importa: el cliente descarga un *blob* y el nombre del archivo es
> lo único que el usuario ve con seguridad. En cuanto `CFNMTPEM` lleve el código real, el aviso
> desaparece solo.
>
> **`exportarBatch` devuelve JSON, no *blob* — 2026-08-21.** Verificado: `config/standalone-cors.cli`
> **no declara `Access-Control-Expose-Headers`**, y ni `Content-Disposition` ni las `X-Saa-*` son
> *safelisted*. Cruzando origen se habrían perdido **las dos barreras a la vez y en silencio**: el
> aviso y el nombre `NO-SUBIR_`. No se arregla exponiendo cabeceras —obligaría a tocar el `.cli` de
> cada instalación y a que nadie lo olvidara jamás; **una protección que depende de un script
> externo no es una protección**—. El cuerpo es ahora `ArchivoBatchIess`
> (`nombre` · `contenido` · `registros` · `noSubir` · `aviso`) y el frontend arma la descarga. Son
> veinte líneas de texto: el coste es cero y el aviso viaja donde no se puede caer.
>
> **`POST /rest/nvis/registrar` — 2026-08-21.** Alta manual con **plazo calculado**. El POST del
> CRUD graba lo que le llega y deja `NVISFCLM` en nulo, y **una novedad sin plazo es precisamente
> la que se escapa**: no sale vencida en ninguna pantalla ni tiene días restantes que mirar. Es el
> agujero de marzo con otro disfraz, y peor, porque esta vez faltaría hasta la fecha que habría
> delatado el retraso. El plazo sale del `PDTRVLRN` del rubro 204 —el mismo sitio que la generación
> automática— y **no se acepta del cliente**: si viniera en el cuerpo, una pantalla con un error de
> cálculo podría conceder más días de los que da la ley y nadie lo notaría hasta la multa.
>
> **Backend, tarea 6 de 6 HECHA — 2026-08-21. Los dos bloqueantes de la replicación.**
> - **Los finiquitos ya escriben `ACMN`.** Paso 6 de `ejecutarSalida`: sin esto, quien sale por
>   liquidación **no existía para el RDEP** —Torres Chávez cobró 7 556,41 en enero y para el SRI
>   era como si no hubiera cobrado nada, porque los acumulados sólo se escribían al cerrar un
>   período y el mes en que alguien se va su finiquito no pasa por ninguna nómina—. Se escriben
>   tres, y **ninguna regla es inventada**: `GRAVADO_IR` = suma de los renglones de ingreso cuyo
>   concepto está marcado `CPNMIMIR = 'S'` —hoy remuneración pendiente y vacaciones no gozadas;
>   décimos e indemnizaciones quedan fuera, que es lo correcto—; `APORTE_PERSONAL` = el renglón
>   del rol 31; `IMPONIBLE_IESS` = **la base sobre la que ese aporte se calculó**, no el total del
>   finiquito. Idempotente por clave, como el cierre. Falla sin ruido con traza: no puede tumbar
>   una salida ya aprobada, y lo que no se escribió se ve en el RDEP, que es donde importa.
> - **`generarRdep` ya no excluye a los cesantes.** Partía de `selectActivosEnPeriodo`, que filtra
>   por `empleado.estado <> CESANTE`: quien entró en enero y se fue en marzo quedaba fuera aunque
>   hubiera cobrado y se le hubiera retenido —en 2026, dos de veintidós—. **La fuente correcta es
>   el propio acumulado**: `selectEmpleadosConAcumuladoEnAnio` (nueva en el DAO) trae a quien tiene
>   `GRAVADO_IR` o `RETENCION_IR` en el ejercicio, cesante o no. El declarativo declara a quien
>   cobró, no a quien sigue en la empresa.
>
> **✅ LOS DOS VERIFICADOS EN PRODUCCIÓN — 2026-08-22. El tercer bloqueante queda cerrado.**
> Con enero y febrero cerrados y las cuatro salidas ejecutadas, el censo de quien tiene
> `GRAVADO_IR` o `RETENCION_IR` en 2026 —que es exactamente de donde parte `generarRdep`— devuelve
> **24 personas**, y entre ellas **Torres Chávez (1 547,50)** y **Benítez Montes (476,39)**, las
> dos en `MPLDESTD = 4`.
>
> **El defecto tenía tres capas, y ahora se ven las tres por separado:**
>
> | | Declararía | Por qué |
> |---|---:|---|
> | Sin ninguna corrección | **20** | Fuera Castro y Cevallos por cesantes; fuera Torres y Benítez por no tener nómina |
> | Sólo con `generarRdep` corregido | **22** | Es lo que da **local**, donde las salidas nunca se ejecutaron. Castro y Cevallos entran con estado 4 |
> | Con los `ACMN` del finiquito además | **24** | Es lo que da **producción**. Torres y Benítez existen sólo por su finiquito |
>
> **Dos comprobaciones cruzadas que lo cierran sin lugar a duda:**
> - **Castro Arce y Cevallos Alemán suman 1 119,60 en producción contra 964,00 en local.** La
>   diferencia es **155,60**, que es exactamente el `GRAVADO_IR` de su finiquito. Las dos mitades
>   de la corrección sumando sobre la misma persona.
> - **Torres Chávez declara 1 547,50 de un finiquito de 7 556,41**, y eso es lo correcto: el
>   gravado son los renglones marcados `CPNMIMIR = 'S'` —remuneración pendiente y vacaciones no
>   gozadas—, y su indemnización por despido intempestivo **no es gravable**. La regla no se
>   inventó y se ve funcionando.
>
> **`RETENCION_IR = 0 en las 24, Robayo incluido.** `CNTENRIR` también queda verificado sobre el
> declarativo.
>
>
> **⚠ Hallazgo (RESUELTO arriba en lo que dependía del backend): la planilla de un mes pasado leía el contrato de HOY.** `CNTE` se actualiza en sitio
> —`sql/40` pasó a Méndez Torres a tiempo completo (482 · jornada 1 · 40 h) desde abril—, así que
> al pedir la planilla de **marzo** el contrato ya no dice lo que decía entonces: saldría con
> **30 días y sin seguro de tiempo parcial**, cuando en marzo era parcial con **15 días y 10,63**.
> **Los aportes no se ven afectados** —salen de `NMNA`, que sí es histórica—, pero **dos columnas
> del control sí**. Es de la familia del catálogo de arriba: el dato no viene de donde parece.
> Para agosto en adelante es inofensivo (se mira el mes en curso); para reimprimir un mes cerrado
> no lo es. Se arregla congelando días y jornada en la nómina, o leyendo el historial `HSTR`.
> **No lo toco: decisión del dueño del modelo.**


Tres cosas nuevas que cambian el plan, en orden de importancia:

1. **ASOPREP va a presentar la planilla del IESS de agosto desde el sistema**, no a mano. Y el
   sistema **no tiene generador de planilla** — ni lo necesita: la planilla la genera el IESS a
   partir de las novedades. Lo que hace falta es **la estructura completa de novedades + la regla
   de no cerrar con pendientes + la planilla de control + el archivo batch.** Todo está derivado
   de la normativa verificada en [`NORMATIVA-IESS-NOVEDADES.md`](NORMATIVA-IESS-NOVEDADES.md) y la
   DDL está en [`sql/41`](sql/41_DDL_NOVEDADES_IESS.sql) (escrito, sin ejecutar). **Los códigos del archivo batch YA ESTÁN**: el anexo resultó ser público (`ksempm1320c.html`) y [`sql/42`](sql/42_CODIGOS_IESS_DEL_ANEXO.sql) los carga. **No son números, son letras** — salida `V/T/B/R/F/A/I/D/S`, variación `O`, origen de pago `P/E`, seguro social `R/M`. Queda **un solo `'?'`**: la jornada parcial, que el IESS no documenta. El exportador sigue obligado a negarse si encuentra alguno.
2. **El módulo se vende a otros clientes.** Qué se queda y qué se blanquea está tabla por tabla en
   [`PRODUCTO-BLANQUEO-NUEVO-CLIENTE.md`](PRODUCTO-BLANQUEO-NUEVO-CLIENTE.md). Regla: normativa y
   estructura se quedan; todo lo que nombre a una persona, contrato, período o valor de ASOPREP se
   borra. `CTRL` se vacía, no se elimina: es el instrumento para el próximo cliente con histórico.
   → **Cómo llega todo a producción** (scripts 31–41 sin el 39; el WAR final ANTES de calcular; los períodos se CALCULAN en producción, no se copian, porque las cargas no fijan `MPLDCDGO`): [`PLAN-PASO-A-PRODUCCION.md`](PLAN-PASO-A-PRODUCCION.md).
3. **Tres hallazgos que bloqueaban la replicación**, destapados al mirar el RDEP. **Dos cerrados el
   2026-08-22, verificados en producción; queda uno.**
   (a) ~~los finiquitos no escriben `ACMN`~~ → **CERRADO**: escriben tres por liquidación, ninguno
   en cero. (b) ~~`generarRdep` excluye a los cesantes~~ → **CERRADO**: el censo de producción da
   **24** e incluye a Torres Chávez y Benítez Montes. (c) **SIGUE ABIERTO — el punto 11**: Méndez
   modelada con el sueldo partido (241 / 30 días) cuando el IESS pide **referencial 482 / 15 días /
   seguro TP 10,63**. Es el único de los tres que no se resolvió, y **sube de cosmético a
   bloqueante de la planilla del IESS**. Va a la lista del final.

**El punto 10 quedó resuelto por los datos, sin Steven:** la única planilla FR del cliente es de
Viteri, junio, base 366,67 = 2 200 × 5/30 — **los cinco días desde que cumplió el año (25-06)**.
El cliente aplica la guarda de antigüedad; nuestro motor no, en la rama `ACUMULADO_EN_EL_IESS`.

**Lo que pidió Mike para las 07:00 del 2026-08-21** —todo ene–jul cargado y agosto listo para
novedades, planilla y contabilidad— **no cabe en el tiempo**: a la 01:30 faltan abril, mayo, junio
y julio (marzo solo costó una tarde entera) más construir la estructura de novedades, la pantalla y
la planilla de control. Lo que sí cabe y se está haciendo: normativa verificada, DDL escrita,
blanqueo documentado, `sql/40` listo, y abril en marcha. El resto se entrega en el día, no a las 7.

### Para qué es esta corrida, y el criterio de aceptación — fijado el 2026-08-21

**El objetivo no es sólo calibrar el motor. Es dejar enero–julio dentro del sistema en producción**,
porque el cliente quiere **generar el RDEP desde el sistema este año** —y eso necesita el año
completo— y emitir **agosto ya con contabilidad**, siendo julio el último mes que contabilizó a
mano. De ahí que los períodos históricos vayan en `PRDNMODO = 1`, sin asiento: es correcto y
deliberado.

**Los dos regímenes, y no se mezclan:**

| | Enero–julio 2026 (histórico) | Agosto 2026 en adelante |
|---|---|---|
| Qué manda | **Lo que se presentó a los entes de control**: las planillas pagadas al IESS y los roles entregados a los trabajadores | **La normativa.** El motor calcula bien y punto |
| Si el cliente lo hizo mal | **Se guarda como se hizo.** Steven cuadra las diferencias después de julio, con ajuste contable o arreglo con el trabajador | No puede ocurrir: el sistema tiene que **impedirlo**, no sólo no cometerlo |
| Contabilidad | Ninguna. Ya la hizo el cliente a mano | Del sistema, desde el primer día |

**Regla que gobierna las dos columnas: el motor se ajusta a la normativa, NUNCA a los errores del
cliente.** Cuando el histórico tiene que reflejar un error, se refleja **en el dato**, no cambiando
la regla de cálculo. Un motor doblado para reproducir un error de 2026 se lo hace a todos los años
siguientes.

**Precisión cuando las dos fuentes del histórico se contradicen** (pasó en marzo): **el rol
entregado manda sobre los renglones de nómina; la planilla del IESS manda sobre la declaración al
IESS.** Marzo declaró a dos personas que ya no estaban: el sistema lleva las 20 del rol, y los
208,22 sobredeclarados son una conciliación documentada, no una nómina que inventar.

**Dos puertas, no una.** Hasta ahora medíamos sólo la primera:

1. **Verde en el contraste** — el motor reproduce el mes.
2. **Fiel a lo ocurrido** — lo que queda grabado coincide con lo que se pagó y se declaró.

**Consecuencia inmediata, ya decidida (2026-08-21): el IR de Robayo va en CERO de enero a julio.**
Hoy el sistema le tiene grabados 20,17 mensuales —renglón de nómina y `ACMN` tipo 9— en 28, 29 y
30; a julio serían **141,19 que nunca se retuvieron**. Dejarlos declararía al SRI una retención
inexistente, contradiría la transferencia bancaria y —lo que de verdad importa— **haría que agosto
calculara mal el alcance**, porque el motor creería que ya retuvo. Se corrige en la pasada de
recálculo, no ahora.

**Cuándo se aplica todo esto: al terminar julio, en una sola pasada, antes de replicar.** No mes a
mes: obligaría a reabrir meses cerrados, que es el punto 6 de la lista. La secuencia es
calibrar ene–jul → aplicar las diez correcciones juntas → **recalcular ene–jul con el motor
corregido** → grabar el residuo como ocurrió → replicar → agosto en vivo.

**Y la buena noticia, que se ve al clasificar la lista con este criterio: corregir el motor a la
normativa nos ACERCA al cliente en los puntos que mueven dinero.** El 1 (prorrateo `30−d+1`) es la
convención que usan el cliente y el IESS, no la nuestra; el 10 (FR sin guarda de antigüedad) nos
deja donde está el cliente, que no provisiona a nadie. Los demás son robustez interna. **El residuo
real tras corregir es minúsculo: el IR de Robayo y los ±0,01 de redondeo.** Casi todo lo que
parecía tensión entre «correcto» y «lo que ocurrió» no lo era.


### Pantalla «Novedades del mes (IESS)» — construida el 2026-08-21

`procesos/novedades-iess`, permiso **894** (pendiente de alta en la tabla del backend; hoy no
molesta porque la comprobación de `MenuListComponent.onItemSelected` está comentada). Sin
`table-basic-hijos`: usa `TablaRrhComponent`. `tsc --noEmit` limpio.

Lista por período con tipo, colaborador, identificación, fecha del hecho, fecha límite, plazo y
estado; contador de pendientes y de vencidas; acciones sobre la fila elegida; alta manual;
exportación del batch por tipo.

**Tres decisiones que la gobiernan, y el porqué:**

| Decisión | Razón |
|---|---|
| **El período se resuelve por fecha del hecho, no por una FK** | Al IESS se le reporta un hecho, y su mes es el de ese hecho. Se filtra con el rango `fechaInicio`–`fechaFin`, la misma ventana que usa la regla de cierre del backend. Una FK ataría la novedad a un período que puede no existir: los avisos de entrada se reportan antes de que nadie calcule nada |
| **`RECHAZADA` cuenta como pendiente** | El IESS la devolvió y sigue sin declararse. Si no contara, un mes con una novedad que nadie corrigió se daría por cerrado — el agujero de marzo con otro disfraz. La lista `ESTADOS_PENDIENTES_ANTE_EL_IESS` alimenta a la vez el contador y el semáforo, para que lo que la pantalla enseña y lo que el backend exige no puedan separarse |
| **«Vencida» se mide contra hoy o contra la fecha de reporte, según el estado** | Mientras se debe, el plazo corre contra hoy. Una vez enviada se mide contra `fechaReporte`: enviada a tiempo no empeora con el tiempo, y enviada tarde quedó tarde para siempre. Se ve al rechazar una novedad — el plazo vuelve a correr y el semáforo vuelve a rojo |

**Qué tipos se exportan: se lee del rubro, no de una constante.** `PDTRVLRV` del rubro 204 lleva
el código de tres letras del archivo (`ENT`, `SAL`, `MSU`, `PFM`, `INS`, `PRA`), y es de donde lo
saca el exportador. **Un detalle sin ese valor es un tipo que sólo se registra en el portal uno por
uno** — hoy el 7 (cambio de relación), el 8 (licencia sin remuneración) y el 9 (reintegro
anticipado). El nulo **es un dato, no una ausencia**: por eso `getAlfanumericoByParentAndAlterno`
—añadido a `DetalleRubroService`— devuelve `null` y no cadena vacía. Leerlo del rubro hace que la
pantalla y el exportador no puedan divergir el día que el IESS habilite un archivo nuevo. Se usa en
tres sitios: aviso al elegir el tipo en el alta, el menú de exportar no los ofrece, y un contador
en la cabecera del mes.

**Mensajes largos y accionables van a panel, no a `snackbar`.** El bloqueo del cierre, el rechazo
del exportador y la advertencia sobre el archivo generado no son errores de sistema: son
instrucciones, y ocho segundos no bastan para leerlas ni para apuntar qué corregir. El del cierre
lleva además enlace a esta pantalla, que es donde se resuelve. Se limpian al releer el período o al
cambiar de mes, para que no queden contradiciendo lo que hay.

**El motivo del rechazo va a `NVISRSPT`, no a `observacion`.** Uno es del organismo y el otro de
quien registra; mezclarlos hace que meses después nadie sepa quién escribió qué. Y **sustituye** en
vez de concatenar: la respuesta vigente del IESS es la última, y un campo que crece es una bitácora
disfrazada. La pantalla lo enseña al seleccionar una rechazada — escribirlo sin poder leerlo sería
el mismo problema una capa más adentro.

**Las cuatro acciones van a los endpoints de proceso**, no al `PUT` del CRUD, desde que el backend
los publicó. La pantalla sigue replicando la máquina de estados para no ofrecer lo que no toca,
pero **replicar no es impedir** y ahora quien impide es el servicio. Verificado saltándose la
pantalla: aceptar una PENDIENTE y anular una ACEPTADA devuelven 400 nombrando el estado actual y
los admitidos.

**Alta manual:** pide los campos comunes más los que exige el tipo elegido —sueldos, período y
meses de FR, valor de la variación, fecha de fin de la licencia, días y sueldo referencial del
cambio de jornada—, porque el exportador se niega si falta uno y pedirlos todos siempre obligaría a
inventar valores. Al cambiar de tipo se retiran los controles del anterior. **La fecha límite no se
calcula aquí**: vive en `PDTRVLRN` del rubro 204 y la resuelve el backend, así que el alta va a
`POST /nvis/registrar` y no al CRUD — el CRUD deja `fechaLimite` en `null`, y una novedad sin plazo
es justo la que se escapa.

> **Trampa de las cabeceras, encontrada y ya resuelta por diseño.** La primera versión del
> exportador devolvía el aviso en cabeceras `X-Saa-*` y el nombre en `Content-Disposition`.
> **Ninguna de las dos es safelisted**: cruzando origen, un navegador no las expone a JavaScript
> sin `Access-Control-Expose-Headers`. Se habrían perdido a la vez el aviso *y* el prefijo
> `NO-SUBIR_` del nombre —las dos protecciones, juntas—, dejando un archivo que no debe subirse
> indistinguible de uno bueno. No mordía en local porque el frontend va por el proxy y en
> producción se despliega en el mismo WildFly, pero habría mordido en cuanto el backend cambiara de
> host. **Se arregla quitando el canal, no reforzándolo:** el exportador pasa a devolver JSON con
> `nombre`, `contenido`, `registros`, `noSubir` y `aviso`, y la descarga se arma desde ahí.

**Método para los datos de prueba, corregido el 2026-08-21.** Una `NVIS` de prueba se le apareció
al backend en una consulta y estuvo a punto de dar por probada la regla de cierre. No fue falta de
limpieza —se borraron todas— sino **la ventana en que el dato vivía**, y que la marca estaba en
`observacion`, que no es lo que se mira en un listado. Regla: **avisar antes de crearla, no
después**, y crear-probar-borrar en la misma operación.

### Estado por capa

| Capa | Estado | Lo inmediato |
|---|---|---|
| **Base de datos** | Scripts 01–09 y deltas 10 a **35** ejecutados en local (1236); el 31 y el 35 recargados con Muñoz en 51,98 / 498,03. Producción sólo tiene hasta la apertura | Ninguno pendiente |
| **Backend** | Fases 0–9 completas. Motor congelado salvo `AcreditacionVacacionesService` y `LiquidacionHaberesServiceImpl`, levantados por defectos atribuidos. Todo publicado y verificado con las tres comprobaciones a las 18:18 | Enero y febrero cerrados y en verde. **Correcciones A, B y C —décimos del finiquito, `sumaDiasRango`, apertura del 13.º— publicadas y verificadas el 2026-08-21 21:20** · símbolo del `javap`: `sumaDiasRango` · los dos finiquitos del 06-03 esperados en **384,05** cada uno |
| **Frontend** | Fases 0–9 construidas. Migración visual **congelada**; lo nuevo sin `table-basic-hijos`. Sin commitear, 225 archivos | Febrero cerrado (133 `ACMN`). **Marzo**: período, novedades, y las dos liquidaciones del 06-03 —contrastarlas contra los 384,05 antes de aprobarlas— |
| **Cliente** | Todo lo de enero a julio entregado y volcado a `C:\Docs\Clientes\Asoprep\rrhh\REsumen`. **Steven devolvió 2 confirmaciones + 4 novedades + la cédula de Bravo Caiza (2026-08-21)** | Preguntas abiertas para Steven: el anticipo de 269,52 de Calderón en febrero · los 175,00 y los 0,10 de OTROS de Calderón · los cuatro D:OTROS de julio. **Robayo RESUELTO el 2026-08-22** (tiene los respaldos) y **el punto 10 resuelto por los datos**, no por Steven |

**Lo que devolvió Steven el 2026-08-21, y qué hacemos con cada cosa** — verificado contra la BD antes de responder:

| Lo que dice | Veredicto |
|---|---|
| Cédula de Bravo Caiza mal en los siete libros y en el archivo de IR (figura `1714531405`, de Benítez Montes, a quien reemplazó; la correcta es `2150051205`) — «no sé si esto genera el descuadre» | **No genera ninguno, y el error no llegó a nuestros datos.** `MPLD` tiene a Bravo Caiza en `2150051205` y a Benítez en `1714531405`, sin cédulas duplicadas; `CTRL` usa la correcta en los tres meses. La única fila de enero bajo `1714531405` es legítimamente de Benítez (su `TOTAL_IESS` de 76,91; salió el 16-01). Bravo Caiza **cuadra exacto** en marzo: 700 / 66,15 / 633,85 en los dos lados, y no aparece en ninguna diferencia. Quien cargó `sql/31` y `sql/36` ya corrigió la cédula al transcribir |
| Méndez Torres: la hoja dice 235,00 pero el rol y el IESS reportan 241,00 sobre 15 días; entiende que lo correcto es **482,00 con media jornada** | **Confirmarle que sí.** Y anota una consecuencia nuestra: nuestro `CNTE` la lleva con `CNTESLRB = 241`, `CNTEJRND = 2`, `CNTEHRSM = 20` — o sea, media jornada **con el sueldo ya partido**. Da los 241,00 correctos pero sobre **30 días**, no 15, y el motor no prorratea por jornada (la vía `porHoras` exige `CNTEVLHR`, que está en null). Es el origen exacto del «30 nuestros contra 15», y **no es cosmético: los días van a la planilla del IESS**. Se arregla con el punto 1 de la lista, no antes |
| Vacaciones de enero y febrero aparecen a la vez como ingreso y descuento, efecto cero; ¿lo reproducimos? | **Confirmarle que es presentación de la provisión y que nadie cobró ni se le descontó nada. Nuestro sistema no lo reproduce y así se queda**: netea a cero y añadir dos renglones que se anulan sólo ensucia el rol. Ya documentado como «par de vacaciones» |
| Marzo: 208,22 pagados de más al IESS por Castro Arce y Cevallos Alemán | **Confirma nuestro §3.4 y lo afina.** Nosotros teníamos 198,58 de aporte; él añade **9,64 de la contribución del 1 %**, que nuestro modelo no lleva. La cifra completa del sobrepago es **208,22**. Sugerirle pedir nota de crédito y revisar los avisos de salida — el nuestro se generó (`NVIS 12`, límite 09-03) |
| Décimo cuarto de Rodríguez Valencia, 482,00, omitida en la hoja de 19 trabajadores | **Nuestro sistema sí la tiene.** `MPLD 61`, ingreso 2025-07-16 —la fecha que él da— y el motor le provisiona **40,17 al mes** (×12 = 482). Es un fallo de la hoja del cliente que nuestro cálculo no comparte |

### Lo que enero enseñó, y que los meses siguientes van a repetir

Las diez diferencias del primer contraste, **todas atribuidas, ninguna nueva**:

| Causa | Quién | Qué se hizo |
|---|---|---|
| IR que el cliente no retiene | 6 con gastos personales | `sql/34` los cargó e invalidó las proyecciones. Recalcular debe ponerlos en cero |
| IR de Robayo | 1 | Sin gastos, le toca. El cliente retiene desde agosto: **política, no defecto**. Pregunta a Steven |
| Días de ingreso a mitad de mes | Bravo Caiza, Cevallos M. | Motor usa fracción de 31; cliente e IESS, `30 − d + 1` sobre 30. **Motor congelado: se corrige al final con lo demás** |
| Par de vacaciones del rol | 22 | Presentación, netea a cero. Documentado |
| Medio centavo en el líquido | **Manosalvas Llerena (+0,01)** y **Muñoz Santos (−0,01)** | Regla 4 —redondear por renglón— contra la cadena sin redondear del `.xlsb`. **Se cancelan en el total.** No se ajusta |
| Medio centavo contra la planilla | Méndez Torres (−0,01) y **Muñoz Santos (+0,01)** en `TOTAL IESS` | La planilla redondea la suma —`241 × 20,60 %`, `550 × 20,60 %`—; nosotros sumamos personal y patronal ya redondeados. No se ajusta. **Muñoz sale en dos controles a la vez**, con signo distinto en cada uno |

**La décima, Manosalvas, verificada célula a célula contra `ROL ENERO 2026.xlsb` el 2026-08-20**
—no contra el markdown—, y con ella salió la que la acompaña:

| | Manosalvas | Muñoz Santos |
|---|---:|---:|
| Ingresos, suma de renglones redondeados | 2 290,17 | 572,92 |
| Descuentos, suma de renglones redondeados | 809,39 | 74,90 |
| **Nuestro líquido** | **1 480,78** | **498,02** |
| Celda `LIQUIDO A RECIBIR` del `.xlsb`, sin redondear | 1 480,773333… | 498,025 |
| **Líquido del cliente** (lo que muestra y lo que se transfirió) | **1 480,77** | **498,03** |
| Diferencia | **+0,01** | **−0,01** |

El origen es el mismo en los dos y es la regla 4 vista desde el otro lado: la hoja del cliente
arrastra los decimales completos (`166,6666…` de décimo tercero, `83,3333…` de vacaciones,
`51,975` de aporte) y sólo redondea al mostrar; nosotros redondeamos cada renglón antes de
sumarlo. **La propia hoja no cuadra consigo misma**: sus columnas visibles dan
`2 290,17 − 809,39 = 1 480,78` y su celda de líquido dice `1 480,77`. La transferencia bancaria
salió por la celda, no por la resta. No se ajusta nada.

> **Y de paso destapó un defecto en el control, que es lo importante.** `RHH.CTRL` trae a Muñoz
> con `LIQUIDO 498,02` y aporte `51,97`; el `.xlsb` del cliente dice **498,03** y **51,98**. Los
> valores se transcribieron del markdown de `REF-02`, **que redondea por fila con la misma
> convención que nuestro motor** — así que el control y lo controlado comparten origen y el
> contraste daba «cuadra» justo donde hay un centavo de diferencia real. Es la **regla 6** en
> los datos, no en el código.
>
> **CORREGIDO el 2026-08-20 por la noche, en `sql/31` y `sql/35`**, con el criterio del dueño del
> modelo: manda lo que el cliente muestra, firma y transfiere, no la resta de sus columnas.
> Muñoz queda con `51,98` y `498,03` en los dos meses, y los totales del cliente en **16 476,92**
> (enero) y **17 525,11** (febrero). `DESCUENTOS 74,89` se quedó como estaba: es el total del
> cliente y es correcto.
>
> **Ojo con el encabezado del script 31, que dice lo contrario de lo que pasó.** Afirma que «con
> esto Muñoz deja de ser diferencia», y es al revés en el renglón que importa:
>
> | Dónde aparece Muñoz | Antes de corregir | Después |
> |---|---|---|
> | Concepto 20, aporte | diferencia **falsa** (51,97 contra nuestros 51,98) | **desaparece** ✔ |
> | `LIQUIDO` | cuadraba en falso (498,02 = 498,02) | **aparece: −0,01** |
> | Control 2, `TOTAL_IESS` | — | **aparece: +0,01** (113,31 contra 113,30) |
>
> Eso es exactamente lo que la corrección venía a conseguir —quitar la coincidencia falsa y dejar
> ver la diferencia real—, pero conviene que el comentario lo diga bien.

### El líquido esperado de enero: 16 501,34

El **16 407,49** anterior estaba mal: restaba el prorrateo de los que entran a mitad de mes en vez
de sumarlo. El motor les paga **de más**, no de menos. Dos rutas independientes dan el mismo
número, y la segunda cierra exacta contra el `.xlsb`:

| Ruta | Cálculo | Resultado |
|---|---|---:|
| **A** — desde lo que el motor dio | 16 210,87 (lo calculado) + 290,47 (los seis IR que se van a cero) | **16 501,34** |
| **B** — desde el rol del cliente | 16 476,92 + 44,59 (prorrateo) − 20,17 (IR de Robayo) | **16 501,34** |

Los 44,59 del prorrateo, por persona: Bravo Caiza 347,59 contra 338,05 (**+9,54**) y Cevallos
Montenegro 759,45 contra 724,40 (**+35,05**) — 49,25 de sueldo de más menos 4,66 de aporte de más.
Los dos ±0,01 del rol se cancelan y no entran.

**Los anclajes de enero, releídos del `.xlsb`:**

| Control | Cliente (suma de sus totales por persona) | Nuestro motor (por renglón) | Lo que decía el doc |
|---|---:|---:|---:|
| Ingresos | 21 053,86 | 21 053,86 | 21 053,86 ✔ |
| Descuentos | 4 576,93 | **4 576,94** | 4 576,93 |
| **Líquido** | **16 476,92** | **16 476,92** | 16 476,91 ✗ |

El líquido del doc estaba mal por una sola celda: `RHH.CTRL` trae a Muñoz con `498,02` y el
`.xlsb` dice **498,03**. El total sin redondear de la hoja es `16 476,9232` y la hoja
`DATOS TRANSFERENCIAS` —el documento de pago, no el de cálculo— totaliza **16 476,92**.

**Y hay que esperar un centavo de más en descuentos, sin que el líquido se mueva.** Las columnas
del cliente no cierran entre sí —`21 053,86 − 4 576,93 = 16 476,93`, y su líquido es 16 476,92—
porque redondea sólo al mostrar: el descuento total de Muñoz enseña `74,89` arrastrando
`74,891666`. Las nuestras sí cierran, porque redondeamos cada renglón, que es la regla 4. Y los
dos líquidos coinciden de todas formas porque Manosalvas (+0,01) y Muñoz (−0,01) se cancelan.
El §3.3 de `PLAN-CARGA-HISTORICA-ASOPREP.md` queda corregido con esta misma nota.

Y el contraste **funciona**: `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`, parametrizado por
`RHH.CTRL_PARAM`, con los valores esperados en `RHH.CTRL` cargados por `sql/31` para enero.
Bloque 4 primero, siempre.

### Centavos revisados contra el libro — 2026-08-20

Los ocho roles se releyeron celda a celda de los `.xlsb` y ocho valores del §3.3 del plan y del §4
del índice del cliente cambiaron en un centavo. **Quedan corregidos, y esta tabla existe para que
nadie lea aquello como una transcripción descuidada: no lo era.**

| Mes / hoja | Descuentos antes | después | Líquido antes | después |
|---|---:|---:|---:|---:|
| Enero | 4 576,93 | 4 576,93 | 16 476,91 | **16 476,92** |
| Febrero | 5 119,02 | 5 119,02 | 17 525,10 | **17 525,11** |
| Marzo | 3 202,21 | **3 202,22** | 17 591,11 | **17 591,12** |
| Abril | 5 120,11 | **5 120,12** | 15 914,21 | **15 914,22** |
| Mayo | 4 999,12 | **4 999,13** | 16 035,20 | **16 035,21** |
| Junio | 5 299,12 | **5 299,13** | 15 817,44 | 15 817,44 |
| `ROL JULIO PAGADO` | 5 198,60 | **5 198,62** | 16 283,70 | **16 283,71** |
| `ROL JULIO CORREGIDO` | 5 211,78 | **5 211,79** | 16 270,53 | 16 270,53 |

**Los ingresos no cambiaron en ninguno de los ocho.** Julio pagado se movió dos centavos; el resto,
uno.

**El plan copió bien lo que tenía delante.** Los valores viejos vienen de las tablas por persona de
`REF-02`, y son correctos respecto de ellas: el desvío nace **una capa más abajo**, al volcar el
`.xlsb` a markdown, porque ahí cada fila se redondeó **hacia abajo en el medio centavo** mientras
que Excel redondea hacia arriba. Con un solo caso por mes —el aporte de Muñoz, `550 × 9,45 % =
51,975`— basta para mover el total. La causa está en el §17 de `REF-06`.

**Por qué se aceptan estos valores y no los anteriores:** cada líquido tiene **doble
confirmación** —la suma de los 22 importes por persona ya redondeados, y el total de la hoja
`DATOS TRANSFERENCIAS` del mismo libro, que es el documento de pago— y las dos coinciden en los
ocho roles. Los descuentos sólo tienen la primera, y por eso van sin negrita en el plan.

> **Regla que deja esto:** `RHH.CTRL` y las tablas de valores esperados se cargan **del `.xlsb`**,
> nunca de los `.md` de `REF-02`. El markdown sirve para leer; para un control, no.

> Nota de husos: las marcas de tiempo de las consultas de esa noche salen como `2026-08-21` porque
> el contenedor de Oracle corre en UTC. Es la misma jornada del 20 en Ecuador.

### El contraste de enero, corrido con el control ya corregido — 2026-08-21, 00:55 UTC

Bloque 4 primero: **147 filas de `CTRL` · 24 personas · 22 nóminas · 124 renglones · estado 7**.

**Cinco personas difieren en `LIQUIDO`, y las cinco están atribuidas:**

| Persona | Nuestro | Del rol | Dif. | Causa |
|---|---:|---:|---:|---|
| Cevallos Montenegro | 759,45 | 724,40 | **+35,05** | prorrateo de ingreso a mitad de mes |
| Bravo Caiza | 347,59 | 338,05 | **+9,54** | prorrateo de ingreso a mitad de mes |
| Robayo Rueda | 1 338,08 | 1 358,25 | **−20,17** | IR que el cliente no retiene hasta agosto |
| Manosalvas Llerena | 1 480,78 | 1 480,77 | **+0,01** | regla 4 contra la cadena sin redondear |
| Muñoz Santos | 498,02 | 498,03 | **−0,01** | regla 4 contra la cadena sin redondear |

En conceptos salen cinco filas, las mismas causas: los dos sueldos prorrateados (+38,71 y +10,54),
sus dos aportes (+3,66 y +1,00) y el IR de Robayo como `NO ESTA EN EL ROL`. **El aporte de Muñoz
ya no aparece**: era la diferencia falsa que creaba el control mal transcrito.

El resto de las 49 filas de totales son el **par de vacaciones** del §4.1: cada persona con
`−RMU/24` en `INGRESOS` y en `DESCUENTOS` a la vez, neteando a cero en el líquido. No es defecto.

**Control 2, contra la planilla del IESS:** Torres Chávez (206,00) y Benítez Montes (76,91) salen
como `EN LA PLANILLA Y SIN NOMINA`, que es correcto —cobraron por finiquito—; Cevallos M. (+7,98)
y Bravo (+2,17) arrastran el prorrateo; y los dos medios centavos, Méndez (−0,01) y Muñoz (+0,01).

> **Y esto cierra el §4.1 sin preguntarle al cliente.** El **rol individual —el que firma el
> trabajador—** no tiene línea de vacaciones: los totales de Muñoz ahí son `550,00` y `51,98`, no
> `572,92` y `74,89`. El par existe sólo en la hoja mensual y desaparece en el documento que ve el
> empleado: **es presentación**, confirmado en el propio formato de ASOPREP.

### Febrero, contrastado y en verde — 2026-08-21, 01:21 UTC

Contraste canónico, con `CTRL_PARAM` en 2026/2. **Bloque 4 primero:**
`147 filas · 22 personas · 22 nóminas · 127 renglones · estado 3 CALCULADO`.

**Líquido del período: 17 504,94**, que es al centavo lo que se había calculado a mano antes de
correr nada —`17 525,11 − 20,17` de Robayo—.

| Bloque | Resultado |
|---|---|
| **1 · conceptos** | **una sola fila**: Robayo, IR 20,17, `NO ESTA EN EL ROL` |
| **2 · totales** | 47 filas: **44 son el par de vacaciones** (22 personas × `INGRESOS` y `DESCUENTOS`) y **3 son `LIQUIDO`** |
| **3 · control 2** | dos filas, los medios centavos de Méndez (−0,01) y Muñoz (+0,01) |

Las tres de `LIQUIDO`, y no hay ninguna más:

| Persona | Nuestro | Del rol | Dif. | Causa |
|---|---:|---:|---:|---|
| Robayo Rueda | 1 338,08 | 1 358,25 | **−20,17** | IR que el cliente no retiene hasta agosto |
| Manosalvas Llerena | 1 480,79 | 1 480,78 | **+0,01** | regla 4 · §17 de `REF-06` |
| Muñoz Santos | 498,02 | 498,03 | **−0,01** | regla 4 · §17 de `REF-06` |

**Febrero no aporta ninguna diferencia nueva.** Sin ingresos ni salidas, el prorrateo no se
ejercita y Bravo Caiza ya va a mes completo; lo que queda son las tres causas que enero dejó
atribuidas. El control 2 cuadra para las 22 personas, así que la base imponible es correcta una a
una sin depender de que el rol lo esté.

> **Lo que costó una vuelta:** el primer cálculo de febrero salió en **19 025,92**, y el contraste
> localizó la causa en una sola pasada —ocho renglones `EL SISTEMA NO LO GENERO` por **1 520,98**,
> que es exactamente la distancia—: faltaba el **paso 2 del ciclo**, registrar las novedades del
> mes. Eran los tres hipotecarios (1 015,13), los tres quirografarios (186,33) y dos anticipos
> nuevos (319,52). No era el motor: los anticipos que vienen del saldo de apertura sí salieron, y
> en enero los seis préstamos se habían descontado bien. Registradas las ocho, el mes cerró en
> verde. **Los renglones pasaron de 119 a 127**, y ese conteo del bloque 4 es la forma rápida de
> ver si las novedades están puestas.

### Los tres números de febrero — confirmados contra el motor

Calculados a mano el 2026-08-20 **antes de que nadie calculara febrero**, y confirmados contra el
motor el 2026-08-21. Son la ventana móvil
que ahora sale de `PVNM` (`valorDiaVacaciones`, corte 2026-02-28, con enero **cerrado**: la
ventana cubre 202503–202602 y sólo enero cae dentro, así que el saldo de apertura pondera junto
a ella por sus días).

| Persona | Saldo apertura (días @ tarifa) | Enero: base `PVNM` / días `ACMN` 10 | Tarifa de la ventana | **A mano** | **Del motor** |
|---|---:|---:|---:|---:|---:|
| Viteri López | 7,75 @ 73,1187 | 2 200,00 / 30,0000 | 73,3333 | **73,1485** | **73,1485** ✔ |
| Bárcenas Bermeo | 7,71 @ 23,3281 | 700,00 / 30,0000 | 23,3333 | **23,3288** | **23,3288** ✔ |
| Bravo Caiza | — sin saldo — | 383,87 / 16,4516 | 23,3333 | **23,3333** | **23,3333** ✔ |

> **Confirmados contra el motor desplegado el 2026-08-21 a las 00:54 UTC**, con los tres insumos
> releídos de la BD (`SLDV`, `PVNM` tipo 3, `ACMN` tipo 10) y coincidiendo uno a uno. Se leen con
> el endpoint de sólo lectura **`GET /rest/sldv/valorDia/{idEmpleado}/{fechaCorte}`**, añadido
> porque `valorDiaVacaciones` no deja rastro en un mes normal: sus dos llamadores son `acreditar`
> —que sólo escribe a quien cumple un año, y **nadie de ASOPREP lo cumple antes del 25-jun-2026**—
> y el finiquito. Los ids son 64 Viteri · 44 Bárcenas · 66 Bravo Caiza.

- **Viteri** sube 0,0298 y sigue por debajo de 73,3333: su tarifa mezclada arrastra el tramo
  anterior a la adenda y un mes de doce no lo borra. Movimiento continuo, sin salto.
- **Bárcenas** no se mueve: 23,33 antes y después. Los 7 diezmilésimos son huella de que
  `SLAPDIAS` guarda **7,71** y no 7,708333 —el guion redondeó los días a dos decimales—; el par
  (días, tarifa) sigue devolviendo 179,86, que es lo que protege el script 30.
- **Bravo Caiza sale con 23,3333 y no en cero**, que era el punto de la corrección. Y su tarifa
  **no la afecta el defecto de convención de días**: base y días se prorratean con el mismo
  factor y el cociente lo cancela. Cuando se aplique la corrección del §4.4c pasará a 23,3331.

**Si enero no está cerrado cuando se calcule febrero, los tres cambian**: la consulta filtra
`estado = CERRADO`. Viteri caería a 73,1187, Bárcenas a 23,3281 y **Bravo Caiza volvería a
0,00**. El orden es: recalcular enero → aprobar → cerrar → recién entonces febrero.

### Las tres correcciones de decimos y vacaciones — 2026-08-21, publicadas y verificadas

Arbitradas, aplicadas en el código y **publicadas el 2026-08-21 a las 21:14, verificadas a las
21:20** con `javap -c -p` sobre `WEB-INF/classes` (símbolo: **`sumaDiasRango`**). **No republicar.**

| | Qué estaba mal | Qué se hizo | Dónde |
|---|---|---|---|
| **A** | El finiquito pagaba sólo la fracción del último mes: `remuneración/12` y `sbu/12 × días/30`. A quien acumula décimos le faltaba todo lo anterior — 8,03 en vez de 118,40 y 119,16 | Décimo tercero = `(Σ ACMN tipo 3 desde diciembre + remuneración pendiente)/12`. Décimo cuarto = `SBU × (Σ días tipo 10 + días de la fila de apertura tipo 4 + días del mes)/360`. Vacaciones en **tres** tramos: saldo `SLDV`, meses cerrados no acreditados, y mes en curso | `LiquidacionHaberesServiceImpl` |
| **B** | `calcularDecimoCuarto` leía `sumaValorRango` sobre el acumulado de días, que guarda los días en `ACMNDIAS` y deja `ACMNVLOR` en cero: **el décimo cuarto anual salía 0,00 para todo el mundo** | `sumaDiasRango` nuevo en el DAO, y el cálculo leyendo `ACMNDIAS` | `AcumuladoNominaDaoService` + `Impl`, `BeneficioSocialServiceImpl` |
| **C** | La apertura escribía el **importe** del décimo tercero en un acumulado que guarda la **base**: 30,03 donde van 360,33, junto a filas mensuales de 482,00 | `aplicaAcumulado` multiplica por doce sólo para `BASE_DECIMO_TERCERO` | `MigracionRhhServiceImpl` |

**Un solo lector de días para A y para B**, que era la condición: `sumaDiasRango` lo usan el décimo
cuarto anual, el del finiquito y el devengo de vacaciones. La correspondencia deja de estar
duplicada, que es la regla 6 aplicada al código.

> **Cuidado con el 37 y el código de C juntos.** El script 37 ya corrigió las 17 filas cargadas
> —suman **14 075,52**, doce veces los 1 172,96 del saldo— y la corrección de `aplicaAcumulado`
> hace lo mismo en el momento de aplicar. **Volver a ejecutar el 37 después de una reaplicación de
> la migración multiplicaría por doce otra vez.** Es la misma familia que el aviso del script 30.

> **`calcularDecimoCuarto` se levantó del congelado** con el criterio verificado de que no lo llama
> ni `ProcesoNomina` ni `Liquidacion`, así que ningún mes ya calculado se mueve.

### Los dos finiquitos del 06-03, a mano con las reglas nuevas — 2026-08-21

Castro Arce (1720245735) y Cevallos Alemán (1716501778) son **idénticos**: ingreso 08-12-2025,
RMU 482,00, décimos `ACUMULA`, saldo de vacaciones 0,96 días @ 15,6354, sin descuentos
recurrentes. Causal 11 «Terminación en periodo de prueba» —`DSHC=N · DSPD=N · VCPR=S · DCPR=S`—.
**No hay acta del cliente: este cálculo es el único control.**

| Rubro | rol | Base | Cant. | **Valor** |
|---|---:|---:|---:|---:|
| Remuneración pendiente | 30 | 482,00 | 6 | **96,40** |
| Aporte personal IESS finiquito | 31 | 96,40 | — | **−9,11** |
| Décimo tercero proporcional | 23 | 1 420,76 | — | **118,40** |
| Décimo cuarto proporcional | 24 | 482,00 | 89 | **119,16** |
| Vacaciones no gozadas | 25 | 15,9569 | 3,71 | **59,20** |
| | | | **Ingresos** | **393,16** |
| | | | **Descuentos** | **9,11** |
| | | | **NETO** | **384,05** |

**De dónde sale cada uno:**

- **Décimo tercero.** Σ `ACMN` tipo 3 de (2025,12) a (2026,2) = `360,36 + 482 + 482 = 1 324,36`,
  más la remuneración pendiente 96,40 → `1 420,76 / 12`. Los 360,36 son la fila de apertura **ya
  corregida por el script 37**; antes valía 30,03 y el resultado habría sido 90,86.
- **Décimo cuarto.** 89 días: 60 de `ACMN` tipo 10 (enero y febrero cerrados) + 23 de la fila de
  apertura tipo 4 + 6 del mes. `482 × 89 / 360`. **119,16, no 118,40**: el tramo de 2025 se valora
  al SBU vigente hoy, no al de entonces.
- **Vacaciones, tres tramos redondeados por separado.** Saldo `0,96 × 15,6354 = 15,01` a su propia
  tarifa · meses cerrados no acreditados `60/24 = 2,5 días × 16,0667 = 40,17` · mes en curso
  `0,25 × 16,0667 = 4,02`. El tramo del medio es el que no existía: nadie lo contaba.

> **Una decisión que conviene mirar.** Lo devengado se valora a `ultimaRemuneración / PRNMDIAS` =
> **16,0667**, que aquí es exactamente la tarifa de ventana de `AcreditacionVacaciones`
> —`964/60`— porque el sueldo no cambió. **No** se usa el `valorDiaVacaciones` ponderado
> (15,9470): con él el neto sería **383,72** en vez de 384,05, porque arrastraría la tarifa de 2025
> a días ganados en 2026. Si se prefiere la ponderada es una línea. El campo
> `acreditacionVacacionesService` queda inyectado y sin usar en esta clase a la espera de esa
> decisión.

### LA LISTA DE CORRECCIONES DEL MOTOR — la referencia única

**Escrita el 2026-08-22, y hasta esa fecha NO EXISTÍA.** Los documentos llevaban semanas citando
«el punto 10», «el punto 12», «las 11 correcciones», y la única lista escrita tenía **cinco**
puntos. Esto la reconstruye.

> **Los números son estables y no se renumeran.** Están citados desde `PLAN-PASO-A-PRODUCCION.md`,
> los cinco guiones, `NORMATIVA-IESS-NOVEDADES.md` y los esperados. Los huecos **5, 8, 13 y 15**
> quedan vacíos a propósito: se usaron alguna vez en conversación y **no tienen referente
> recuperable en ningún documento**. No se reutilizan — un número reciclado haría que una
> referencia vieja apuntara a otra cosa sin que nada avisara.

> **Regla que gobierna la lista: se aplican JUNTAS al final de la calibración**, para que los siete
> meses queden calculados con las mismas reglas. La excepción son las cuatro de abajo, que se
> publicaron antes por decisión expresa del dueño del modelo.

#### Ya publicadas y verificadas en producción — 2026-08-21

| | Qué | Cómo se comprobó |
|---|---|---|
| **A** | **Prorrateo comercial `30 − d + 1`** (`calculaDiasTrabajados`). Es el **punto 1** de la lista | Días enteros en enero: Bravo Caiza 16 y Cevallos Montenegro 12, sin decimales |
| **B** | **`CNTENRIR` — «este empleador no retiene IR a este trabajador»** (art. 43 LRTI) | Cero renglones de IR en enero, y Robayo sin fila en el bloque 2 |
| **C** | **`selectActivosEnPeriodo` ya no pierde a quien salió DESPUÉS del mes** | Enero con 22 y no 20; Castro y Cevallos dentro |
| **D** | **`exigeNovedadesIessReportadas` bifurca por modo**: bloquea en productivo, avisa en histórico | `PRDNOBSR` de enero con el aviso de las dos NVIS |

#### Pendientes

| # | Qué | Dónde | Estado |
|---|---|---|---|
| **1** | Prorrateo de ingreso a mitad de mes: `30 − día + 1` sobre mes de 30, no fracción de 31 | `calculaDiasTrabajados` | ✅ **HECHA** — es la A |
| **2** | **Proyección anual del IR de quien entra a mitad de mes** multiplica el sueldo por los meses restantes sin descontar que el primero es parcial (Cevallos M.: 24 000 en vez de ~22 839). Misma causa raíz que el 1 | paso 11 de `calcularPeriodo` | Hoy no cambia resultados: la rebaja lo cubre |
| **3** | **Patronal del finiquito**: falta el rol 32 y su rama en `calculaFiniquito`, igual que el 31 | `LiquidacionHaberesServiceImpl` | `CPNMROLM` 32 no existe en el catálogo. Verificado en producción el 2026-08-21 |
| **4** | **`RhhTipoDescuentoRecurrente` 6 y 7 sin rol equivalente**: `rolDelDescuento` lanza excepción ante un descuento de seguro privado o de «otros» | `ProcesoNominaServiceImpl` | Hoy no molesta: ASOPREP no los usa |
| **5** | *(hueco — sin referente recuperable, no reutilizar)* | | |
| **6** | **`reabrirPeriodo` no avisa cuando hay un mes posterior ya calculado.** Los acumulados del posterior quedan viejos en silencio | `ProcesoNominaServiceImpl` | Es la razón de contrastar **en estado 3**, antes de cerrar |
| **7** | **`cancelaDescuentos` escribe `fechaFin = LocalDate.now()`**, no la fecha de salida del finiquito. En una carga histórica eso deja el descuento «vigente» desde el mes real hasta hoy | `LiquidacionHaberesServiceImpl:783` | Inofensivo hoy: a quien sale no le queda nómina. Rompería cualquier consulta por rango de fechas |
| **8** | *(hueco — sin referente recuperable, no reutilizar)* | | |
| **9** | **La cabecera del período se acumula EN MEMORIA sobre los contratos procesados, no desde `NMNA`.** Si alguien deja de estar activo entre dos cálculos, la cabecera baja y el detalle no, y las dos divergen sin ruido | `calcularPeriodo` | Mitigado por la C —hoy no quedan huérfanas—, pero la raíz sigue. Lo detecta el cruce cabecera↔detalle de los guiones |
| **10** | **Fondos de reserva sin la guarda de antigüedad** (`superaUnAnio`) en la rama `ACUMULADO_EN_EL_IESS`: provisionamos desde el primer mes; el cliente y el IESS empiezan al cumplir el año | paso 8 de `calcularPeriodo` | **Resuelto por los datos, sin Steven**: la única planilla FR del cliente es la de Viteri en junio, base 366,67 = 2 200 × 5/30, los cinco días desde el 25-06. Corregirlo nos ACERCA al cliente |
| **11** | **`ContratoEmpleado` no tiene historia de vigencias**, así que la jornada parcial se modela partiendo el sueldo (Méndez 241 / 30 días) cuando el IESS pide **referencial 482 / 15 días / seguro TP 10,63** | `ContratoEmpleado` | **Bloqueante de la planilla del IESS.** Mientras no exista, el contrato se baila a mano entre meses con `sql/48` y `sql/49` |
| **12** | **La cuota de `CTDS` se aplica pero no se marca**: `CTDSESTD` se queda PENDIENTE, `CTDSVLDS` en cero y `DSRCSLDD` no baja | paso 12 de `calcularPeriodo` | **Prerrequisito de agosto**, cuando los préstamos del IESS pasen de `NVNM` a `DSRC`/`CTDS`. Un préstamo de doce cuotas nunca bajaría de saldo |
| **13** | *(hueco — sin referente recuperable, no reutilizar)* | | |
| **14** | **El motor lee `CNTESLRB` de HOY al recalcular un mes pasado.** No falla, no avisa, y el mes queda cerrado con un sueldo que nunca se pagó | `calculaSueldoPeriodo` | Costó los 218,22 de Méndez. Mientras no se arregle, rige el detector del `PLAN-PASO-A-PRODUCCION` §4 bis, **antes** de recalcular |
| **15** | *(hueco — sin referente recuperable, no reutilizar)* | | |
| **16** | **`PeriodoNominaServiceImpl.saveSingle` no valida NADA**: ni que las fechas correspondan al año/mes declarados, ni que el rango sea un mes. Es un paso directo al DAO | `PeriodoNominaServiceImpl:96` | **Nuevo del 2026-08-21, destapado por D15.** Un período del 1 de enero al 21 de agosto habría dado **21 días a las 22 personas** y habría perdido a quien sale más tarde, sin un solo error. Lo cazó la comprobación 2 del guion, no el motor |
| **17** | **`generaProvision` acepta el concepto nulo sin decir nada** y escribe `PVNM.CPNMCDGO` en nulo: la provisión queda **sin cuenta contable** | `ProcesoNominaServiceImpl:1591` | **Nuevo del 2026-08-21.** Es lo que destapó el 1B de enero en producción. El dato se reparó con `sql/54`; la guarda del motor no |
| **18** | **Se puede registrar una novedad a quien no está en el período.** Nada comprueba que el empleado tenga contrato vigente en la ventana | `NovedadNominaService` | **Nuevo del 2026-08-22 (D18).** Inofensivo: `calcularPeriodo` pregunta `selectAprobadas` una vez por contrato procesado, así que la fila queda huérfana y no se lee jamás. No puede alterar ningún número |
| **19** | **`/rest/lqdc/calcular` y `/simular` reciben SÓLO `idContrato`**, así que el backend no puede validar que el contrato pertenezca al colaborador elegido en pantalla — no recibe el colaborador | `LiquidacionRest:147,167` | **Nuevo del 2026-08-21 (D9).** El registro sale internamente coherente, así que **ninguna comprobación de datos lo detecta**: la pantalla enseña un nombre y el finiquito liquida al dueño del contrato |
| **20** | **`generarAvisoSalida` NO es idempotente**: crea una `NovedadIess` nueva sin comprobar si ya existe una para esa liquidación | `NovedadIessServiceImpl:144-153` | **Nuevo del 2026-08-22.** Asimetría con la novedad 6, que sí lo es. **Y su alcanzabilidad, añadida el 2026-08-23: no es un problema de instalaciones viejas, es un doble clic.** `ejecutarSalida` exige APROBADA de entrada y **no mueve el estado al terminar**, así que nada impide pulsar dos veces, y la pantalla tampoco puede protegerlo porque no tiene de dónde leer que ya se ejecutó. Repasados los seis pasos, **cinco aguantan la repetición** —contrato y empleado se reescriben con lo mismo, `cancelaDescuentos` y `caducaSaldosVacaciones` ya no encuentran filas vigentes, y los `ACMN` son idempotentes por clave vía `selectByClave`—. **El único que no es éste.** Arreglar el 20 cubre el daño real sin tocar la máquina de estados |
| **21** | **La liquidación no deja constancia de que la salida se ejecutó.** `LQDCESTD` colapsa **tres hitos distintos en el mismo 3**: aprobada, salida ejecutada y contabilizada. Ni `ejecutarSalida` ni `contabilizarLiquidacion` mueven el estado | `LiquidacionHaberesServiceImpl:219` · `RhhEstadoLiquidacion` | **Nuevo del 2026-08-23.** Es el 20 por su otro lado, y **tiene precedente en casa**: `contabilizarLiquidacion` sí se protege de la doble ejecución, pero con `getAsiento() != null`, no con el estado — ésa es la forma que le falta a `ejecutarSalida`. Coste ya pagado: una casilla del registro de réplica rellenada con «estado 4» leyendo un vocabulario que no existe. Los estados **4 `REGISTRADA_EN_SUT`, 5 `PAGADA` y 6 `ANULADA` están declarados y no los escribe nadie**: `setEstado` sobre `Liquidacion` aparece **dos veces** en todo el proyecto, CALCULADA y APROBADA. **No es de la familia de 16/17/18** —no hay valor tragado en silencio— sino un campo que no responde la pregunta que se le hace |
| **22** | **La rama MENSUALIZADO de fondos de reserva paga el MES COMPLETO el primer mes, sin prorratear desde el aniversario.** Y la rama ACUMULADO ni siquiera comprueba el aniversario, que es el **punto 10**: **son la misma cuenta escrita dos veces en el mismo bloque de veinte líneas, y se arreglan JUNTOS** | paso 8 de `calcularPeriodo` | **DESCONGELADO el 2026-08-24, el único de los 17.** No para que junio cuadre, sino porque **la norma lo dice**: el fondo de reserva se devenga desde el aniversario y nace *«a partir del mes 13»*. **La fórmula es `30 − d`, NO `30 − d + 1`** — fijada contra la planilla real del IESS de Viteri: ingresó el **25-06-2025** y el IESS le da **5 días** con base 366,67, o sea del **26** al 30. El mes 12 se completa **el día** del aniversario, así que el fondo empieza al siguiente. **No reutilizar `calculaDiasTrabajados`**: allí el día de ingreso sí se trabaja, y son dos convenciones parecidas para cosas distintas. **Enero a mayo NO se recalculan.** La prueba es falsable: junio debe salir **44,60 por debajo** del cliente —**7,93** de los cuatro días de más al 8,33 %, más **36,67** del fondo de Viteri— y los D:OTROS de julio suman **44,60**: **los dos meses se anulan EXACTOS**. El 44,59 que se calculó primero salía del doceavo y era el número equivocado |

**Son 17 pendientes, no 11** —el 21 nació el 2026-08-23 y el 22 el 2026-08-24—. Cualquier documento que diga «las 11 correcciones», «las 15» o «las 16» está desactualizado.

**Tres de los pendientes —16, 17 y 18— son la misma familia**, y merece verse junta: **un valor que
el motor traga sin protestar y cuyo daño aparece meses después, lejos de su causa.** Un rango de
fechas absurdo, un concepto nulo, una novedad de nadie. Ninguno lanza excepción, ninguno deja
traza, y los tres se cazaron por un control externo —el guion, el contraste— y no por el motor.
Cuando se aborden, la guarda importa tanto como el arreglo.

### Lo que falta en los documentos del cliente

- **Acta de finiquito de Benítez Montes.** Su liquidación quedó en 493,64 contra 672,47 del
  banco; la orden del banco no es un desglose. Hipótesis más cercana: desahucio sin prorratear
  (175,00, a 3,83). No se ajusta sin acta.
- **Planilla del IESS del período 2026-07** —el archivo llamado `2026-07` es junio—.
- **Robayo:** ¿retienen desde agosto a propósito o nadie proyectó hasta entonces?
- **Calderón, febrero:** ¿los 269,52 son un anticipo **nuevo**, además del de diciembre? En el rol
  se le descuentan 619,52 en el mes —350,00 de la segunda cuota del de 700,00 más esos 269,52— y
  su líquido queda en cero. Del mismo hilo que el §4.6: si cada mes se concede uno nuevo
  dimensionado al neto disponible, el modelo de cuotas no aplica.

### Tres reglas operativas que hoy costaron ciclos

1. **Las tres comprobaciones de despliegue, en orden**: fuente→compilado, compilado→publicado,
   y `javap` buscando un símbolo nuevo en el `.class` **desplegado**. Eclipse a veces no publica
   aunque el workspace esté al día. Tres ciclos perdidos hoy por esto.
2. **Un `UPDATE` que no encuentra filas no da error, y un bloque PL/SQL que falla en DBeaver
   tampoco.** Mirar siempre cuántas filas tocó. Dos ciclos hoy.
3. **El frontend no lanza `ng build`** salvo orden explícita: para verificar compila con
   `tsc --noEmit`. Un build se colgó 17 minutos.

### Fuera de este módulo, pendiente sin dueño

`docs/pendientes/BUSQUEDAS-ROTAS-CRD.md` — siete defectos de infraestructura compartida
encontrados de paso (búsquedas rotas en CRD, JSON a mano en 14 sitios, consultas con `select`
implícito). Ninguno bloquea RRHH.

## ✅ La apertura de ASOPREP — CARGADA Y VERIFICADA el 2026-08-20

Empresa **1236**, la ASOPREP real. Los cuatro controles del script 26 cuadraron exactos:

| Control | Valor |
|---|---:|
| Masa salarial nominal de los 22 contratos | **21 283,00** |
| Saldo de vacaciones, 22 personas | **3 637,61** |
| Décimo tercero acumulado, 17 personas | **1 172,96** |
| Décimo cuarto acumulado, 17 personas | **2 225,96** |
| Anticipo de Calderón | **700,00** |

**La masa reconcilia con la planilla del IESS de enero** por los cuatro movimientos del mes
—`21 283,00 − 2 700,00 + 1 373,33 + 1 173,33 = 21 129,66`—, así que los sueldos están bien uno
por uno y no sólo en total. Diecisiete y no veintidós en los dos décimos porque **los cinco
mensualizados no acumulan**, confirmado contra el acta de Torres Chávez.

Los **57 saldos quedan pendientes de aplicar**: se materializan desde la pantalla de migración,
que es el camino diseñado y reversible. **No se cargó el saldo de antigüedad** —la fecha de
ingreso va directa en el empleado— así que el camino de `aplicaAntiguedad`, cuya reversión exacta
sigue pendiente, no se ejercita: **`SLAPFCAN` dejó de bloquear la fase A**.

Scripts: `25_CARGA_ORGANIZACION` · `26_CARGA_APERTURA` · `27_CARGA_INGRESOS_ENERO`.

> **Tres defectos de esquema salieron al cargar**, todos de la misma familia y ninguno visible
> hasta que alguien escribió en esa tabla por primera vez: `RHH.TPCE` vacía —sin ella no puede
> existir ningún contrato—, y `HSTR.DPRTCDGO`, obligatoria y sin mapear, que hacía **imposible
> insertar un historial de posiciones desde la aplicación**. Detalle en
> `sql/28_DDL_LIMPIEZA_DPRTCDGO.sql`, con el barrido que esta familia pide.

## ✅ La prueba de enero — EN VERDE el 2026-08-19

**El caso a mano de `GUIA-PRIMER-CALCULO.md` cuadró completo contra el motor desplegado, sin
una sola diferencia.** Vigencia del deployment verificada por contenido y por `javap` (el
`.class` contiene `sumaPorRol` y ya no contiene `sumaAporte`).

- Los **ocho renglones exactos**, con el décimo cuarto sobre base 482,00 (el SBU, no el sueldo).
- Los **cuatro totales**: 973,48 · 75,60 · 897,88 · 97,20.
- La **cabecera repartida por rol**: `NMNAAPPR` 75,60 · `NMNAAPPT` 89,20 · `NMNAIESC` 8,00 ·
  `NMNATTPT` 97,20 — los dos del medio son los que la corrección `sumaPorRol` vino a arreglar.
- Los **tres delatores**: `baseDecimoCuarto` 0,00 · ningún renglón de IR · una sola provisión
  (vacaciones 33,33), apuntando al concepto con `rolMotor` 19, el de provisión.
- **Ciclo completo**: aprobar emitió el rol `202601-000001` (hash verificado, `verificar` →
  `true`), contabilizar en histórico dejó `PRDNASNT` nulo, cerrar escribió los **seis `ACMN`**
  esperados (tipos 1, 2, 3, 5, 8 y 10; el 4 y el 9 ausentes por valer cero — cabo suelto
  conocido de `escribeAcumulado`).
- Nota sin importancia: la `NMNA` quedó con `codigo = 3` por las identidades consumidas en las
  corridas abortadas previas. No hay filas huérfanas.

**Lo que queda de verificación es contra el cliente, y los datos ya llegaron: enero a julio de
2026 completos** (ver «Los datos reales de ASOPREP»). El motor no tiene ninguna prueba interna
pendiente.

**Decisión del 2026-08-19: el backend construye las fases 5 a 9 completas, con el motor
congelado.** Las órdenes están en `ORDENES-BACKEND-FASES-5-9.md`. Cuando llegue el rol, enero se
verifica contra un motor que no se movió, y desde ahí se pule todo lo demás con datos reales.

`ProcesoNominaServiceImpl`, `RetencionRentaServiceImpl`, `BeneficioSocialServiceImpl`,
`AcreditacionVacacionesServiceImpl` y `ProvisionActuarialServiceImpl` **no se modifican**. Si
aparece un defecto del motor se reporta, no se corrige: si el motor se mueve mientras tanto, un
descuadre de enero no se podrá atribuir. Única excepción autorizada: añadir al final de
`aprobarPeriodo` la llamada que genera los roles de pago, y el reparto de los tres campos de
aporte en la cabecera de `NMNA` (ver abajo).

**Resuelto el 2026-08-19 · el aporte patronal en la cabecera.** El paso 15 asignaba a
`NMNAAPPT` el total de renglones patronales —97,20 en vez de 89,20— y nunca asignaba
`NMNAIESC`, que quedaba en `NULL`. No es una cuarta parada: la columna admite nulo. Se autoriza
corregirlo **antes** de verificar enero porque es la cabecera sobre la que se construye el
resumen de aportes de la fase 5, que es con lo que el cliente cuadra contra la planilla del
IESS. De paso, `sumaAporte` localizaba los aportes por la terna en lugar de por `CPNMROLM`,
contra la decisión ya tomada: se sustituye por `sumaPorRol`. El detalle y los valores esperados
están en `ORDENES-BACKEND-FASES-5-9.md`.

## Las tres paradas de la prueba de enero — resueltas

La prueba arrancó y se detuvo tres veces. Dos defectos eran del motor y están corregidos en el
código, pendientes de recompilar; el tercero era del esquema y **lo cerró el script 12, ejecutado
el 2026-08-19**.

**Corregidos por el backend, pendientes de recompilar:**

1. `NMNA` se persistía con `NMNATING`, `NMNATDSC` y `NMNANETO` en nulo, siendo `NOT NULL`. La
   cabecera se guarda antes de calcular los renglones porque estos necesitan su `codigo`.
   Ahora se siembran en cero y se sobrescriben al final. Producía `ORA-02290`.
2. `RNGLCANT` y `RNGLIMPN` son `NOT NULL` y el motor pasaba nulo. Ahora graban cero y `"N"`
   respectivamente; el snapshot del concepto sobrescribe `imponible` cuando hay concepto.

**El tercero, cerrado por `sql/12_DDL_LIMPIEZA_RBRO.sql`:**

`RHH.RNGL` y `RHH.TMLQ` conservaban una columna `RBROCDGO` del diseño anterior a `CPNM`, con
`NOT NULL` y FK a `RHH.RBRO`, que estaba vacía y no la mapeaba ninguna entidad. Ninguna fila
podía insertarse en esas dos tablas: no existía valor válido que poner. En `RNGL` era lo que
bloqueaba el cálculo; en `TMLQ` habría bloqueado la liquidación de haberes en la fase 8 sin que
nadie lo supiera hasta entonces. El script cubrió las dos y borró la tabla.

**`sql/13_DDL_FASES_5_9.sql`, también ejecutado**, no tenía que ver con enero: cerró los dos
huecos de modelo que las fases 5 a 9 chocarían de inmediato. Agregó `RHH.CFNM.CFNMCTMR` —la
cuenta marcadora 9678, que no tenía dónde guardarse y habría acabado escrita en Java contra la
regla 1—, el rubro alterno **223** `RHH_TIPO_SALIDA_OFICIAL` y la tabla `RHH.SLOF`, que registra
cada salida oficial generada y su presentación al organismo.

**Queda pendiente el barrido**, que es lo que evita una cuarta parada en las fases siguientes:
`sql/VERIFICACION_12_13_Y_BARRIDO.sql`. Solo consultas; su resultado se le entrega al backend
antes de que arranque la fase 5.

## Defectos corregidos después de las nueve fases

### `CargaMarcacionesRest` — los dos endpoints de importación, 2026-08-20

Reportados por el frontend con dos controles ejecutados con el mismo `curl`
(`exbc/importar/validar` y `slap/cargar` sí llegan al servicio), así que la diferencia estaba
aislada en la firma del método.

1. **`idFormato` e `idEmpresa` iban declarados `@FormParam Long`.** Una conversión de
   `@FormParam` que falla la rechaza RESTEasy **antes de despachar**: 400 sin cuerpo y **sin
   traza en el log**. Es lo que hacía inalcanzables `previsualizar` y `confirmar` —y con ellos la
   prueba del `FMRC` sintético—. Ahora son `String` con un `parseId` privado, como
   `ExtractoBancarioRest` y `SaldoAperturaRest`, y un campo faltante o no numérico devuelve 400
   **con mensaje**.
2. **Faltaba `URLDecoder.decode(nombreArchivo, UTF_8)`.** Un archivo del reloj con tildes o ñ
   quedaba corrupto en `CRMRNMAR`. Cosmético —el nombre es trazabilidad, no clave— pero el
   precedente ya estaba escrito. El frontend alinea su cliente con `encodeURIComponent`.

**Barrido:** no hay ningún otro `@FormParam` con tipo distinto de `String` o `InputStream` en
toda la capa `ws/rest`. Era el único caso de esta familia.

### `EntityDaoImpl` — dos cambios en infraestructura compartida, 2026-08-20

Los dos son de los nueve módulos, no de RRHH, y los dos se hicieron **aditivos a propósito**: el
CRUD genérico no tiene pruebas, así que un cambio que altere la conducta de todos a la vez no se
puede respaldar con nada.

**1 · El `case INTEGER` de `selectByCriteria`.** Antes de tocarlo se verificó qué hacía: un
criterio `INTEGER` **lanzaba** —la cláusula se escribía en el JPQL, el parámetro no se enlazaba y
`QueryParameterBindingsImpl.validate()` lanzaba `QueryParameterException` al ejecutar, sin que
nadie la absorbiera—. Como no devolvía resultados sin filtrar sino ninguno, ningún módulo podía
apoyarse en la conducta anterior y el arreglo no puede cambiar nada donde nadie mira. Detalle y
límites en el contrato de DTO. **Con esto `anio` se puede volver a filtrar en el servidor**, en
`ParametroNomina`, `TablaImpuestoRenta`, `TopeGastoPersonal`, `AcumuladoNomina`,
`ProyeccionImpuestoRenta`, `SaldoVacaciones`, `GastoPersonalProyectado` y `PeriodoNomina` — el
frontend puede retirar `filtrarPorAnio` cuando esté publicado.

**2 · El sellado de auditoría, opt-in.** `EntityDaoImpl.save` solo hacía `persist`/`merge`, así
que **`fechaRegistro` quedaba en nulo en todo lo creado por el CRUD genérico**, en todos los
módulos, mientras los servicios de proceso la ponían a mano. Ahora hay tres interfaces en
`com.saa.basico.util`:

- `EntidadAuditable` — declara `getUsuarioRegistro()`.
- `EntidadAuditableFecha` / `EntidadAuditableFechaHora` — `getFechaRegistro()` y su setter.

**Son dos y no una porque `fechaRegistro` no tiene un solo tipo**: en RHH son 23 entidades
`LocalDate` y 30 `LocalDateTime`. El getter admitiría una firma única por covarianza, pero el
setter no —los parámetros son invariantes en Java—. Separándolas, **una entidad se suma
escribiendo solo `implements` en su declaración**, sin tocar un getter ni un setter.

`save` sella con un `instanceof` **solo al insertar** (`id == null`) y **solo si el campo está en
nulo**: nunca sobreescribe lo que puso un servicio de proceso o lo que trajo la petición. Quien no
implemente las interfaces se comporta exactamente igual que antes.

**El usuario no lo sella el DAO**, y es deliberado: el CRUD genérico no tiene al usuario en el
alcance. Hoy lo trae el JSON de la petición o lo pone el servicio. Fabricar un valor ahí sería
peor que el nulo, porque la auditoría dejaría de distinguir lo que se sabe de lo que no. La
interfaz lo declara para que un interceptor con contexto de sesión pueda llenarlo más adelante.

**Marcadas las 53 entidades de RHH** que tienen `fechaRegistro` — las ocho clases restantes de
`model/rhh` son DTO de proceso y no llevan auditoría. Antes de marcarlas se comprobó que las 53
declaran los cuatro métodos con la firma exacta y la misma forma de declaración de clase.

**Lección que vale para el contrato:** en multipart, **todo identificador viaja como texto y se
parsea dentro del método**. Declararlo tipado mueve el fallo a un punto donde no se puede
diagnosticar.

### Los mensajes de error no llegaban a ninguna pantalla — 2026-08-20

Lo encontró el frontend probando la guarda del empleado sin cuenta bancaria de la fase 6. El
patrón `entity("texto").type(APPLICATION_JSON)` está en **cada método de cada clase REST**, así
que el cliente intentaba parsear un cuerpo que no era JSON y el mensaje quedaba enterrado en
`text`. **Ningún mensaje de error del backend llegaba a ninguna pantalla, de ningún módulo.**

Bloqueaba la calibración: comparando seis meses renglón por renglón, un mes que falla habría
dicho «No se pudo calcular» sin decir por qué.

Corregido con **una clase y sin tocar un solo método**: `com.saa.ws.rest.MensajeErrorJsonFilter`,
un `ContainerResponseFilter` que envuelve en `{"mensaje": "..."}` cuando el estado es ≥ 400, la
entidad es un `String` y el tipo declarado es JSON. No toca los endpoints `TEXT_PLAIN` —el camino
de login— ni los cuerpos que ya son JSON. El detalle, el barrido previo de `responseType`
`'text'`/`'blob'` y la única pantalla que ve cambiar el cuerpo están en
**`docs/general/MENSAJES-ERROR-REST.md`**.

**Para recompilar y publicar (la tanda entera del 2026-08-20):** `CargaMarcacionesRest`,
`EntityDaoImpl`, las tres interfaces nuevas de `com.saa.basico.util`
(`EntidadAuditable`, `EntidadAuditableFecha`, `EntidadAuditableFechaHora`), **las 53 entidades de
`model/rhh`** —que solo cambian su línea de declaración— y `MensajeErrorJsonFilter`. Ningún
script SQL.

## Dos defectos transversales, sin corregir — 2026-08-20

Los encontró el frontend al recorrer el camino feliz de la fase 6. **Ninguno es de RRHH**: los
dos viven en infraestructura compartida por toda la casa, y por eso no los arregla quien los
encontró.

### 1. El diálogo de `table-basic-hijos` no cabe y no scrollea

Medido: el `mat-dialog-container` ocupa **1205 px con un viewport de 1115**, los botones
Cancelar/Guardar quedan en `y=1136` —21 px por debajo del corte— y **no existe ningún
`mat-dialog-content`**, así que no hay contenedor que pueda scrollear. Con once campos el
diálogo del maestro entra por poco; el del detalle no entra, y el botón Guardar es
inalcanzable con el ratón. El frontend tuvo que pulsarlo por JS y crear los seis `DFMB`
restantes por REST.

Es del `dynamic-form` compartido, así que toca a los seis módulos. **Y sube de prioridad con la
carga histórica**: 24 empleados con sus contratos, adendas y novedades se capturan por estos
diálogos. Un formulario largo que no se puede guardar con el ratón deja de ser cosmético cuando
hay que usarlo cientos de veces.

### 2. `fechaRegistro` en nulo por el CRUD genérico

Verificado en el código: **`EntityDaoImpl` no sella ningún campo de auditoría** — sólo
`persist`/`merge`. Por eso `DFMB` creado desde la pantalla queda con la fecha en nulo, mientras
que `RDPG` y `DRPG`, creados por `GeneracionOrdenPagoService`, la traen sellada: los servicios
de proceso la ponen a mano. No es un defecto de RRHH, es la conducta de la casa en todos los
módulos.

**Ruling: no se toca `EntityDaoImpl.save` para que selle a todo el mundo.** Cambiar el
comportamiento de escritura de toda la aplicación desde una capa que nadie está mirando es
demasiado alcance para el problema. La forma correcta es **opt-in**: una interfaz de auditoría
que la entidad implementa y que el DAO genérico reconoce; quien no la implemente sigue igual.
Así RRHH lo gana sin que ningún otro módulo cambie de conducta.

## La tanda del 2026-08-20, publicada y verificada en vivo

**Despliegue sano.** Las dos comprobaciones limpias sobre todo `com/saa`, y el arranque de las
10:47 sin un error: `SaaPU` procesado, RESTEasy desplegado, contexto `/SaaBE` registrado. Las 53
entidades tocadas a la vez no rompieron nada.

**El `ORA-02290` de `PRDN`, confirmado y cerrado.** `SYS_C009297` era `PRDNFCHR IS NOT NULL`, y la
columna tiene **`DEFAULT SYSDATE` a la vez que el CHECK**: en Oracle el default solo se aplica
cuando la columna **se omite** del INSERT, y Hibernate nombra siempre todas las columnas mapeadas.
Por eso por SQL a mano funcionaba siempre y solo reventaba por JPA. Comprobado creando un período
con el mismo cuerpo que manda la pantalla, sin `fechaRegistro`: **201 Created**, con
`fechaRegistro` sellada por el DAO. El sellado de auditoría desactivó **veinticuatro** minas
iguales de golpe, una por cada `*FCHR` del esquema.

**Cuatro `NOT NULL` más, en `RSMN`, que sí bloqueaban.** La consolidación de marcaciones moría con
`ORA-02290` en la primera fila. Aisladas una a una contra el desplegado:

| Restricción | Columna | Propiedad |
|---|---|---|
| `SYS_C009280` | `RSMNTRDE` | `minutosTarde` |
| `SYS_C009281` | `RSMNEXTR` | `minutosExtra` |
| `SYS_C009282` | `RSMNASNT` | `ausencia` |
| `SYS_C009283` | `RSMNJSTF` | `justificado` |

Las dos de minutos las llena `armaResumen`/`aplicaTopes` en la vía normal. **`ausencia` y
`justificado` no las ponía nadie**: se siembran ahora en `'N'`, y solo si están en nulo, para no
borrar una ausencia registrada a mano. Un día reconstruido desde marcaciones no es una ausencia,
así que `'N'` es el valor correcto y no un relleno. Mismo criterio que `RNGLCANT`/`RNGLIMPN`.

**Una tercera de `RNGL` que nadie había mirado: `RNGLORDN`.** No estalla hoy porque
`calcularPeriodo` numera los renglones 1..n antes de guardarlos, y ninguna pantalla crea
renglones todavía. **Estallará en cuanto exista la pantalla de renglón manual** —que hace falta
para el ajuste de 0,10 de Calderón de junio y julio—: ese formulario debe enviar `orden`,
`cantidad` e `imponible`, o muere con `ORA-02290`.

`MRCCFCHH` y `LQDCNETO` están cubiertas: las llenan el importador y `calcular` de la liquidación.

### La consolidación del sintético, cerrada el 2026-08-20

Con el turno del script 19 puesto y `RSMNFNTE` ya numérica, la reconsolidación del 05 al 08 de
enero devolvió **4 resúmenes** y el del **07-01 cuadró con los ocho valores calculados a mano**:
12,4167 trabajadas · 3,4167 suplementarias · 0 extraordinarias · **1,6667 nocturnas** · 5 minutos
de atraso · 0 de salida anticipada · 205 de extra · no inconsistente. **La franja nocturna
funciona**; el cero anterior era la falta de turno, como se había diagnosticado.

Los otros tres días también son coherentes: el 05 descuenta los 59 minutos de almuerzo (8,5667),
el 06 da 32 minutos de exceso, y el 08 —una sola marcación— sale **inconsistente `S`** con horas
en cero, que es justo lo que debe hacer con un número impar.

**El día inconsistente ya no inventa números.** Reportaba 540 minutos de salida anticipada
calculados contra una salida que no existe: no es un dato incompleto, es un dato **falso**, y en un
informe que sume esa columna aparece como si alguien se hubiera ido nueve horas antes. Cuando el
número de marcaciones es impar, **los siete valores calculados van a cero** —horas trabajadas,
suplementarias, extraordinarias, nocturnas, atraso, salida anticipada y minutos extra— y queda una
traza en el log.

Se anula también el **atraso**, y no solo lo derivado de la salida: con un número impar **no se
sabe cuál marcación falta**, así que si la que falta es la de entrada, la que se tomó como tal es
en realidad una salida y el atraso calculado sobre ella tampoco significa nada. Lo que **sí** se
conserva son los hechos observados —`entradaReal`, `salidaReal` y sus dos horas de texto—, que son
lo que necesita quien vaya a corregir el día a mano.

### El aporte al IESS del finiquito — corregido el 2026-08-20

`simular` devolvía `totalDescuentos: 0` en las tres causales: el script 17 creó los ocho roles del
finiquito **todos de tipo ingreso** y el lado del descuento no existía. Cerrado con el rol **31**
y el concepto `CPNMALTR` 68 del script 22, más **una sola llamada** en `calculaFiniquito`.

Hizo falta una llamada y no un mecanismo porque **la liquidación no evalúa `CPNMTPCL` ni
`CPNMBSCL`**: calcula en Java y `agrega(...)` recibe el valor hecho. Clasificar el signo ya
funcionaba por `CPNMTPCN`, y la base ya estaba en una variable local —la remuneración pendiente,
que es exactamente la única materia gravada—. El detalle y las dos decisiones que no conviene
deshacer están en la fase 8 del plan de backend.

**Lo que debe salir:** Torres Chávez, 9,45 % de **1.000,00** = **94,50**, neto **7.556,41**. Si
sale 723,01, el porcentaje se está aplicando a los 7.650,91 de ingresos.

**Comprobado contra el desplegado el 2026-08-20.** `simular` sobre el contrato 2 (salario 800,
`aportaIess = 'S'`, salida 15-01-2026) devuelve el rubro `codigoConcepto 68` con
`tipoConcepto 2`, **`base 400,00`** —la remuneración pendiente, no los ingresos— y **`valor
37,80`**. `totalDescuentos` pasa de 0 a **37,80** y el neto queda en 415,61. Es discriminante: si
el porcentaje se aplicara al total de ingresos (453,41) daría 42,85. La aritmética de Torres
Chávez es la misma por el mismo camino —2.000 × 15/30 = 1.000, y 9,45 % = 94,50—; falta solo su
contrato, que entra con la carga de la fase A.

### El descanso de la jornada — cerrado el 2026-08-20

`TRNOMNDS` y `DTLLMNDS` (script 23), mapeadas como `minutosDescanso` en `Turno` y `DetalleTurno`,
con la **precedencia `DTLL → TRNO`** que ya tenían la entrada y la salida: el modelo admite que un
viernes tenga otro horario, así que también otro almuerzo.

**Dos mitades, las dos implementadas:**

1. **Jornada teórica = intervalo − descanso.** Sin esto, un turno de 08:30 a 17:30 con una hora de
   almuerzo declaraba nueve horas cuando el trabajador solo puede acumular ocho: nadie alcanzaba
   nunca su jornada y las suplementarias no empezaban hasta las 18:30 en vez de las 17:30. Una
   hora de trabajo extra al día sin pagar, en silencio.
2. **Horas trabajadas: se resta el descanso teórico solo cuando el día no trae pares
   intermedios.** La condición se resuelve por lo que trae **cada día**, no por cómo esté
   configurado el reloj: con cuatro marcaciones ya se descontó el almuerzo real y restar además el
   teórico lo contaría dos veces; con dos, no se descontó ninguno. Cubre igual al reloj que solo
   marca entrada y salida, a la persona que marca cuatro, y a la que un martes olvida marcar la
   salida a almorzar. Solo en día laborable: en uno no laborable no hay jornada programada y por
   tanto no hay almuerzo previsto que descontar.

Sin la segunda mitad quedaba latente el error de signo contrario: con dos marcaciones, nueve horas
de presencia bruta contra ocho de jornada habrían dado **una hora de suplementarias diaria que
nadie trabajó**.

> ### ⚠ El descanso queda **implementado, con la aritmética verificada a mano y sin verificación empírica**
>
> `sql/20` se llevó al empleado de prueba y sus marcaciones, y no se recrea un fixture en la 1236 a
> horas de cargar los 22 reales: se acaba de gastar un script en dejar esa empresa limpia.
>
> **La primera consolidación real con asistencia es su prueba, y el descanso no puede pasar a
> producción sin ella.** No es «ya lo comprobaremos»: es una comprobación con dueño —quien ponga la
> asistencia en servicio— y con momento —antes de pagar la primera hora extra—.
>
> Lo que quedó calculado a mano, para contrastarlo entonces, con turno 08:30–17:30, tolerancia 10 y
> descanso 60 (jornada teórica **8 h**): un día con **cuatro** marcaciones no resta el descanso y
> ve subir su exceso —el 05 del sintético pasaba de 0 a 0,5667 h de suplementarias—; un día con
> **dos** sí lo resta y su exceso **no cambia**, porque las horas trabajadas y la jornada teórica
> pierden los mismos 60 minutos. El descanso corrige el registro de horas efectivas; lo que corrige
> el pago de extras es la mitad 1.

### La migración de apertura: qué se puede revertir y qué no

**De los ocho tipos de saldo, solo uno sobrescribe un valor existente.** Los otros siete crean su
propia fila y `SLAPRFTB`/`SLAPRFID` los revierte con exactitud:

| Tipo | Qué materializa | Reversión |
|---|---|---|
| 1 ANTIGUEDAD | Escribe `MPLD.MPLDFCIN` sobre el maestro | **Sobrescribe — el único** |
| 2 VACACIONES_PENDIENTES | Fila nueva en `SLDV` | Exacta |
| 3, 4, 5, 8 Décimos, fondos e IR | Fila nueva en `ACMN` | Exacta |
| 6, 7 Préstamos | Fila nueva en `DSRC` + sus `CTDS` | Exacta: borra las cuotas y después la cabecera |

Aplicar toma solo los pendientes, así que no hay doble aplicación que duplique filas.

**Cerrado el 2026-08-20 con `SLAP.SLAPFCAN`** (script 24), mapeada como `fechaAnterior`:
`aplicaAntiguedad` **guarda el valor previo antes de pisarlo** y la reversión lo restaura. Un
`SLAPFCAN` nulo significa que el empleado no tenía fecha antes, así que restaurar nulo es entonces
el valor correcto y no una pérdida. La reversión limpia también `SLAPFCAN`, para que una segunda
reversión no restaure un valor de dos aplicaciones atrás.

Y `validar` **avisa antes** si el maestro ya trae una fecha distinta de la que carga el saldo, aun
siendo la reversión exacta: **reversible no es lo mismo que correcto**, y saber que vas a pisar un
dato distinto vale por sí solo.

### El valor del día de vacaciones de la apertura — corregido el 2026-08-20

`aplicaVacaciones` ponía días, ceros y banderas, y **nunca leía `saldo.getValor()`**: `valorDia`
quedaba en nulo en las 22 filas y **los 3.637,61 de vacaciones se quedaban en `SLAP` sin
materializarse en ninguna parte**. Los dos décimos no tenían el problema porque `aplicaAcumulado`
sí escribe el valor en `ACMN`.

**`valorDia` sale del propio saldo —valor ÷ días— y no del sueldo del contrato**, y la diferencia
importa exactamente en cuatro personas:

| Persona | Sueldo ÷ 30 | Tarifa real del saldo |
|---|---:|---:|
| Barcenas (sin adenda) | 23,33 | **23,33** — coinciden |
| Torres Chávez | 66,67 | **65,27** |
| Nieto Conde | 30,00 | **30,65** |
| Viteri López | 73,33 | **73,12** |
| Pardo Calle | 23,33 | **21,96** |

Los cuatro tienen **adenda anterior al corte**, así que su saldo abarca dos tramos de sueldo y la
tarifa correcta es la mezcla de los dos. Calcularla desde el contrato daría el valor equivocado
justo donde importa, y dejaría de reproducir el importe de apertura.

> **Los días eran un dato malo, no un defecto del servicio.** `SLAPDIAS` traía días de servicio
> —185 en Barcenas, a quien le tocan 7,71— y el servicio los copiaba fielmente a
> `SLDV.diasAsignados`. Se corrige en el dato con `SLAPDIAS * 15/360`.
>
> **Ojo con el total:** sumando los días ya redondeados a dos decimales da **103,47**, y
> redondeando la suma da 103,46. La diferencia de un centavo es del orden de las operaciones, no
> de los datos.

### Los tipos de saldo de préstamo — familia cerrada el 2026-08-20

**El catálogo de saldos era más grueso que el de descuentos**: dos clases de préstamo contra
cinco de descuento recurrente. Dos consecuencias, y la segunda no se había visto:

1. **El anticipo no tenía tipo propio** y había que migrarlo como préstamo interno, con lo que
   acababa en el concepto equivocado. El rol de ASOPREP tiene **una sola columna `ANTIC SUELD`**:
   dos anticipos en conceptos distintos cuadran el total y fallan el desglose.
2. **`PRESTAMO_IESS` resolvía siempre a quirografario**, así que **un hipotecario migrado acababa
   en el concepto del quirografario**. No muerde en la calibración —los del IESS de enero entran
   como novedades del mes— pero sí en la réplica de producción desde agosto, donde los préstamos
   van como `DSRC` y nadie compara concepto por concepto.

**Y la validación no avisaba de ninguno de los dos, porque validaba contra la misma suposición**:
la correspondencia saldo → descuento estaba **duplicada** en el switch de aplicar y en
`validaConceptoDelPrestamo`, y las dos copias se equivocaban igual. **Dos copias de una regla no
se contradicen entre sí: se equivocan juntas**, y por eso el control no servía de control.

> Este defecto es el origen de la **regla 6 del §2 del maestro** —«un control tiene que salir de
> otra fuente que aquello que verifica»—, que es la razón de que el control 2 de la calibración
> sea el `TOTAL IESS` contra la planilla del organismo y no contra el propio rol.

Cerrado con el script 29 —tipos **9 `ANTICIPO`** y **10 `PRESTAMO_HIPOTECARIO_IESS`**, y el 6
renombrado a `PRESTAMO QUIROGRAFARIO IESS`, porque **el nombre era la mitad del problema**: quien
migraba un hipotecario elegía el 6 por parecer el genérico— y **cuatro cambios en Java**:

| # | Dónde | Qué |
|---|---|---|
| 1 | `RhhTipoSaldoApertura` | Las dos constantes |
| 2 | Switch de `aplicarSaldosApertura` | Los cuatro tipos de préstamo por una sola rama |
| 3 | **`validaCamposPorTipo`** | Los tipos nuevos exigen saldo y cuotas. **Sin esto pasan por la puerta de atrás** y llegan a aplicarse sin comprobar nada |
| 4 | **`tipoDescuentoDelSaldo`** | La correspondencia, **en un solo sitio**, usada por aplicar y por validar |

**El saldo de Calderón se corrige en `SLAP`, no en el `DSRC`**: cambiar el concepto de lo ya
materializado es un parche que se pierde en la siguiente reaplicación; cambiar su tipo a 9 hace
que salga bien solo. Va en el paso 5 del script 29 y **no se corre hasta que el `case` esté
publicado**, o el saldo queda inaplicable.

### El número de referencia del préstamo migrado — hueco de modelo, 2026-08-20

**El síntoma:** `aplicaDescuento` metía `SLAPOBSR` —texto libre de 500— en `DSRCNMRO`
—estructurado, de 50—. Una observación de 65 caracteres dio `ORA-12899` y, como aplicar es una
sola transacción y debe serlo, **esa fila tumbó las 57**.

**Lo de fondo es peor que la longitud, y se ve leyendo el importador.** El archivo de migración
trae **dos columnas separadas**: `numeroReferencia` (campo 7) y `observacion` (campo 8).
`armaObservacion` las **concatena** en `SLAPOBSR` como `"REF=<numero>;<texto libre>"`, porque
`SLAP` no tiene dónde guardar la referencia. Después `aplicaDescuento` vuelca esa cadena entera
en `DSRCNMRO`.

De modo que **hoy `DSRCNMRO` no contiene el NUT ni cuando cabe**: contiene `REF=1234567;` más lo
que hubiera de texto libre. **La conciliación por NUT contra el detalle del IESS no funcionaría
tampoco con valores cortos** — y el NUT es la clave del control 3 de la calibración.

**Lo que hace falta:** una columna propia en `SLAP`, con **la misma anchura que su destino**
—`VARCHAR2(50)`—, de forma que el desbordamiento deje de ser representable en vez de depender de
que alguien se acuerde de recortar. Es la misma familia que `SLAPFCAN`: una columna que falta
obliga al código a meter un dato en el campo de otro.

**Mientras tanto, red con traza:** `numeroReferencia(saldo)` recorta a 50 y **deja en el log el
valor completo**, advirtiendo de que si es un NUT la conciliación del mes siguiente no lo va a
encontrar. Truncar en silencio un NUT lo corrompe sin levantar ningún error; truncar con traza al
menos deja qué buscar.

### Un defecto nuevo, encontrado al inventariar para la limpieza

**`SolicitudVacaciones` mapea una columna que no existe.** `GET /rest/slct/getAll` devuelve
`ORA-00904: "SV1_0"."SLCTFHAP": identificador no válido`. La entidad declara
`@Column(name = "SLCTFHAP") private LocalDate fechaAprobacion` y **ningún script del 01 al 19 crea
esa columna**; su pareja `SLCTAPRB` (`usuarioAprobacion`) está en el mismo caso, aunque el error se
detiene en el primer identificador inválido y no llega a nombrarla.

La pantalla de vacaciones no funciona contra el backend, y no es de las que el frontend tiene
pendientes de reconstruir: falla en el `getAll`.

**Cerrado el 2026-08-20.** Se crearon las dos columnas y `slct/getAll` devuelve `[]`. El script 21
era correcto pero su bloque `DECLARE … END; /` no llegó a ejecutarse —en SQL Developer hay que
lanzarlo como script, no como sentencia—; se resolvió con los dos `ALTER` sueltos. **Conviene
recordar el modo de fallo**: un script con PL/SQL que «corre» sin error y no hace nada es
indistinguible de uno que funcionó, salvo por su consulta de comprobación posterior. Es la misma
familia que «deltas 10 a 17 ejecutados» sin verificar columna por columna.

**Lo de `aprt` era un error mío, no un problema:** `AportesRetenciones` se sirve en **`@Path("prte")`**
sobre `RHH.PRTE`, no en `aprt`. La ruta que probé no existe. `GET /rest/prte/getAll` responde en
0,2 s con **0 filas**. Ni volumen ni cuelgue.

### El barrido bidireccional entidad ↔ esquema — pendiente de ejecutar

**`RBROCDGO`, `RSMNFNTE` y `DPRTCDGO` son el mismo defecto tres veces**, y los tres aparecieron
por casualidad: una columna del diseño anterior que la entidad no mapea, o que mapea con otro
tipo. **Ninguno de los barridos anteriores los ve:**

- El de `NOT NULL` ocultos mira la base y no las entidades: ve que `DPRTCDGO` es obligatoria, pero
  no que nadie la mapea.
- El de `getAll` por REST solo detecta lo que **falta** en la base —como `SLCTFHAP`—, porque **un
  `SELECT` nunca toca una columna que la entidad no nombra**. Por eso `hscg` salió limpia en el
  barrido de los 53 paths mientras `DPRTCDGO` bloqueaba toda inserción.

Los tres solo se manifiestan **al escribir**, así que **las tablas todavía vacías son
precisamente las que no los han mostrado** — y en RRHH quedan varias que solo se estrenan en
producción.

**El barrido que sí los encuentra está escrito:** `sql/VERIFICACION_ENTIDAD_VS_ESQUEMA.sql`. Cruza
las **830 columnas de las 53 entidades** contra `all_tab_columns` en las dos direcciones y
comparando el tipo, con la obligatoriedad resuelta por las dos vías en que este esquema la
declara. Cinco bloques:

| Bloque | Qué encuentra | Precedente |
|---|---|---|
| **A** | Sobra en la base **y es obligatoria** | `DPRTCDGO`, `RBROCDGO` — ninguna fila se puede insertar |
| **B** | Sobra en la base, opcional | Dato muerto: decidir si se borra o se mapea |
| **C** | Falta en la base | `SLCTFHAP` — `ORA-00904` |
| **D** | El tipo no cuadra | `RSMNFNTE`, `Liquidacion.estado` — `ORA-01722` esperando datos |
| **E** | Tablas de RHH que ninguna entidad mapea | El bloque anterior solo mira las 53 con entidad |

El inventario de columnas está también como texto plano en
`sql/INVENTARIO_COLUMNAS_ENTIDADES_RHH.txt`, para diffs a mano.

#### ✅ Corrido el 2026-08-20: **vacío en A, B, C y D**

**Después de `RBROCDGO`, `RSMNFNTE` y `DPRTCDGO` no hay un cuarto.** La familia queda cerrada, y
era lo que había que saber antes de calcular seis meses.

**Con qué se cerró, para que nadie lo repita a mano:** el cruce bidireccional **con tipo** de
`sql/VERIFICACION_ENTIDAD_VS_ESQUEMA.sql`, que compara las 830 columnas de las 53 entidades contra
`all_tab_columns` en las dos direcciones. Los barridos anteriores no servían y conviene saber por
qué antes de improvisar otro:

| Instrumento | Qué ve | Qué se le escapa |
|---|---|---|
| Barrido de `NOT NULL` ocultos | Que una columna es obligatoria | Que **nadie la mapea** — `DPRTCDGO` |
| `getAll` por REST, los 53 paths | Columnas mapeadas que **no existen** — `SLCTFHAP` | Todo lo que sobra: un `SELECT` no toca lo que la entidad no nombra |
| Sondeo por escritura | Que la tabla **admite** una fila | Que sobre algo opcional, o que un tipo no cuadre |
| **Cruce bidireccional con tipo** | **Las cuatro cosas** | Solo lo que no tenga entidad ni tabla, que cubre el bloque E |

Único resto, y de otra naturaleza: **`TPCN` es una tabla vacía de seis columnas** —resto del
diseño anterior, como `RBRO`— que se borra en la limpieza previa al primer commit.

**Este barrido va antes del primer commit y antes de estrenar cualquier tabla en producción.**
Vuelve a hacer falta cada vez que se agreguen entidades o se toque el DDL: el inventario del
`WITH` se regenera desde los `@Column` reales.

#### El bloque A, adelantado por sondeo — 2026-08-20

El bloque A es el único que se puede ejercitar sin base de datos, y de la única forma en que ese
defecto se manifiesta: **insertando una fila de verdad**. Se probó el CRUD de las tablas que
**nadie había escrito nunca**, borrando cada fila a continuación:

| Tabla | Resultado |
|---|---|
| `SLDV`, `DSRC`, `CTDS` | **OK** — las tres las estrena la aplicación de saldos, que corre ahora |
| `LQDC`, `TMLQ` | **OK** — las dos que desbloqueó el script 12; `TMLQ` no había recibido nunca una fila, y enero le mete dos finiquitos |
| `SLOF`, `UTLD`, `DTUT`, `CBEM` | **OK** |
| `RDPG` | Ver abajo |

**Ni un solo `ORA-02290`: ninguna de esas tablas esconde una columna obligatoria sin mapear.** No
hay un cuarto `DPRTCDGO` entre las que están a punto de estrenarse.

Dos matices que salieron del sondeo:

- **`RDPG.PRDNCDGO` es `NOT NULL` en la base y la entidad lo mapea como opcional** (`@JoinColumn`
  sin `nullable = false`). No tiene efecto: `GeneracionOrdenPagoService` siempre lo informa,
  porque una orden es siempre de un período. Es un desajuste de declaración, no de conducta.
- **`DSRC.DSRCFCHI` es `NOT NULL` de columna** —`ORA-01400`, no `ORA-02290`— y **sí está
  mapeada**. La distinción importa: `ORA-01400` es un `NOT NULL` visible en `all_tab_columns`;
  `ORA-02290` es el CHECK con nombre de sistema, que es el invisible.

**Lo que el sondeo no cubre** y sigue necesitando el SQL: los bloques B, C, D y E, `DRPG` —que
necesita una `RDPG` padre— y unas pocas donde el sondeo no llegó a construir un cuerpo válido.
El sondeo prueba que **se puede insertar**; no prueba que no sobre nada ni que los tipos cuadren.

### Barrido inverso de columnas — hecho el 2026-08-20, y sin herramienta nueva

La forma barata de contrastar cada `@Column` contra el esquema real **es el propio `getAll`**: si
una entidad mapea una columna que no existe, Oracle contesta `ORA-00904` y la nombra. Así apareció
`SLCT` por casualidad, y así se puede buscar a propósito.

Corrido contra **los 53 paths de RHH**: `acmn cbem cfnm cnte cpnm cpxm crgf crgo crmr cstr ctds
ctlg dfmb dfmr dprt dptc drpg dsrc dtll dtut fmbn fmrc gspr hrex hscg lqbs lqdc mpld mrcc nmna nvis
nvnm nxoo prdn prnm prte ptcn pvnm pyir rdpg rlpg rngl rsmn slap slct sldv slof tbir tmlq tpce tpgp
trno utld`.

**Resultado tras los dos `ALTER` de `SLCT`: los 53 responden sin un solo `ORA-*`.** No hay ningún
otro desajuste de existencia escondido en el módulo. `slct/getAll` devuelve `[]`.

**El límite de este barrido, que conviene tener claro:** detecta **columnas que no existen**, no
**tipos que no coinciden**. Un desajuste de tipo como el de `RSMNFNTE` o `Liquidacion.estado` solo
se manifiesta cuando hay **filas con datos incompatibles**, y hoy casi todas estas tablas están
vacías. Para esa mitad sigue haciendo falta contrastar `data_type` contra el `@Column` en la
salida de `all_tab_columns` — es la parte que no se puede hacer sin base de datos.

## Una particularidad del esquema que hay que conocer

**Los `NOT NULL` de `RHH` están declarados como CHECK con nombre de sistema**, no como atributo
de columna. Por eso `all_tab_columns.nullable` dice `Y` para columnas que sí son obligatorias,
y auditarlas con esa vista da un falso negativo. Fue lo que ocultó los tres defectos anteriores.

La consulta que sí los encuentra:

```sql
SELECT table_name, search_condition_vc FROM all_constraints
 WHERE owner = 'RHH' AND constraint_type = 'C'
   AND search_condition_vc LIKE '%NOT NULL%'
 ORDER BY table_name;
```

Hay que correrla contra las tablas de las fases 6 a 9 antes de que el motor escriba en ellas.

## Un riesgo operativo: Eclipse publica, pero hay que comprobarlo bien

Se detectó que las clases desplegadas en `/c/wildfly38/standalone/deployments/SaaBE.war/WEB-INF/classes/`
estaban cuatro horas atrasadas respecto de `target/classes`. **Se estuvo probando código viejo.**

**Comprobado el 2026-08-19: el desfase ya no está.** Se compararon las 475 clases de
`com/saa/{model,ejb,ws/rest}/rhh` y `com/saa/rubros` entre las dos rutas, byte a byte: cero
diferencias y cero ausentes.

**Compara contenido, no marcas de tiempo.** El `ls -l` que traía este archivo da falsos
positivos: la copia del deployment queda con la hora de la copia, no con la de la compilación,
de modo que varias clases idénticas aparecen «distintas» por unos segundos. Lo que vale es:

```bash
D=/c/wildfly38/standalone/deployments/SaaBE.war/WEB-INF/classes
T=/c/work/saaBE/v1/saaBE/target/classes
cd "$T" && find com/saa/model/rhh com/saa/ejb/rhh com/saa/ws/rest/rhh com/saa/rubros -name '*.class' |
  while read f; do
    if   [ ! -f "$D/$f" ];        then echo "AUSENTE: $f"
    elif ! cmp -s "$T/$f" "$D/$f"; then echo "DIFIERE: $f"; fi
  done
```

Si imprime algo, la prueba no es válida.

**Y esa comparación sola no basta: tiene un punto ciego.** Contrasta `target/classes` contra el
deployment, así que detecta «compilado y no publicado» pero **no** «ni siquiera compilado» — si
Eclipse no compiló, los dos lados están igual de viejos y el chequeo dice OK. Se descubrió el
2026-08-19: las constantes 23–30 de `RhhRolConceptoMotor` no estaban en ninguna de las dos rutas
y la comparación las daba por buenas. Es la misma familia que el engaño de las marcas de tiempo.

La segunda mitad, que compara el fuente contra su `.class` compilado:

```bash
S=/c/work/saaBE/v1/saaBE/src/main/java
T=/c/work/saaBE/v1/saaBE/target/classes
cd "$S" && find com/saa/model/rhh com/saa/ejb/rhh com/saa/ws/rest/rhh com/saa/rubros -name '*.java' |
  while read f; do
    c="$T/${f%.java}.class"
    if   [ ! -f "$c" ];        then echo "SIN COMPILAR: $f"
    elif [ "$S/$f" -nt "$c" ]; then echo "FUENTE MAS NUEVO: $f"; fi
  done
```

### La tercera comprobación, que es la que no se puede engañar

**Buscar en el `.class` desplegado un símbolo que sólo exista en la versión nueva.** Un método, una
constante, lo que el cambio haya introducido:

```bash
javap -p /c/wildfly38/standalone/deployments/SaaBE.war/WEB-INF/classes/com/saa/rubros/RhhTipoSaldoApertura.class \
  | grep -c ANTICIPO      # 0 = el codigo nuevo NO esta dentro
```

Es superior a `cmp` porque responde a la pregunta que importa —**¿está el código nuevo ahí
dentro?**— en vez de a «¿son idénticos estos dos archivos?». Y no la engañan ni las marcas de
tiempo ni los tamaños.

> **Cuidado con el patrón de búsqueda**, que ya dio un falso negativo: buscar `valorDia` en un
> `.class` devuelve cero porque el método compilado se llama `setValorDia`. Un cero mal buscado
> parece una prueba y no lo es.

**Ocurrió tres veces el 2026-08-20**, y las tres costaron un ciclo: sin compilar, compilado sin
publicar, y compilado sin publicar otra vez. **Eclipse a veces deja el servidor en caché y el
publish no ocurre aunque el workspace esté al día.** No basta con darle a publicar: hay que
comprobarlo.

**Las tres juntas son la comprobación completa**, y en este orden: primero que el fuente esté
compilado, después que lo compilado esté publicado, y por último que el símbolo nuevo esté dentro
del `.class` desplegado. Aquí las marcas de tiempo **sí** valen,
porque comparan dos artefactos del mismo lado —fuente y compilado— y no un original con su
copia.

**Corridas las dos el 2026-08-20 sobre `model/rhh`, `ejb/rhh`, `ws/rest/rhh` y `rubros`:** cero
sin compilar, cero fuente más nuevo, cero ausente y cero diferente. El árbol estaba íntegro
**antes** de la corrección de `CargaMarcacionesRest` de ese mismo día, que vuelve a dejar un
archivo pendiente de publicar.

**Y hay una confirmación por llamada real, que es la que faltaba.** Los endpoints de `crmr`
daban **404** antes de la recompilación y ahora dan **400 con cuerpo vacío**: el 404 decía «el
endpoint no existe en el desplegado», el 400 dice «existe y RESTEasy rechaza el parámetro
antes de despachar». El cambio de síntoma prueba que el deployment está al día — no hace falta
volver a comprobarlo. Queda una sola llamada por hacer: la de `lqdc`, que el frontend seguía
reportando como 404 en un resumen anterior a la publicación.

## Trabajo pendiente por capa

### Backend

El paquete completo está en **`ORDENES-BACKEND-FASES-5-9.md`**. Resumen:

1. **Orden 0 — hecho el 2026-08-19**, salvo el resto del barrido. Los scripts 12 y 13 están
   ejecutados; el bloque 3 del barrido (la consulta de `all_constraints`) se contrastó contra
   las entidades y **ninguna columna obligatoria queda sin mapear** en las diez tablas de las
   fases 5 a 9 — no hay un segundo `RBROCDGO`. `MRCCTPOO`, `MRCCORGN` y `RSMNFNTE` ya eran
   `Long` en el árbol de trabajo: faltaba la recompilación, no el cambio. Eclipse publica.
   **Pendiente:** los bloques 1, 2 y 4 y la consulta de `all_tab_columns` del bloque 3 —esta
   última es la que ve los `NOT NULL` de `SLOF`, declarados como atributo de columna—.
2. **Fases 5 a 9**, en orden y entregando fase por fase. **La 5 está entregada**; sigue la 6.
3. **La verificación ya no es «abril»: el cliente entregó enero a julio de 2026 completos**, el
   2026-08-20. Ver la sección «Los datos reales de ASOPREP». La ventana de calibración va de
   **enero a junio**, que es el tramo con planilla del IESS en la carpeta. El caso a mano de
   `GUIA-PRIMER-CALCULO.md` sigue siendo de enero y se corre igual —valida el cálculo de un mes
   suelto; los cuatro registros mínimos ya están creados y el período en estado 1—.
   **Si algo no coincide, no corregir**: reportar primero cuál de los dos está mal y por qué.

### Frontend

**Cerrado el 2026-08-20: ya no queda ninguna tarea bloqueada por el backend.**

1. ~~Conversión de rubros de asistencia~~. Publicada la recompilación, el frontend aplicó los
   tres campos a `number`, los combos escribiendo el código alterno, y retiró
   `descripcionTolerante()`. **Las dos compuertas están abiertas**:
   `CAMPOS_ASISTENCIA_PERSISTEN` y `APROBACION_HORAS_EXTRA_DISPONIBLE`. Decisión ratificada:
   se dejan en el código en vez de borrarlas —documentan la dependencia y permiten cerrarlas
   si un despliegue retrocede—.

**Cerrado el 2026-08-19:**

2. ~~Combo `rolMotor`~~. `CPNMROLM` existe en la entidad Java desde la fase 1 y el rubro 221
   está cargado desde el delta 10: nunca dependió del backend. Hecho: campo en
   `model/concepto-nomina.ts`, constante `RubrosRrh.ROL_MOTOR_CONCEPTO`, combo del rubro 221 en
   `conceptos-nomina.campos.ts` y columna en la lista. El nulo se preserva —`extraerCodigo`
   ahora normaliza la cadena vacía a nulo, que antes habría llegado como `''` a una columna
   numérica—.
3. ~~`casilleroF107`~~. Expuesto en el modelo y en el formulario, junto a `casilleroRdep` y
   `codigoIess`.

**Fase 5 construida el 2026-08-19:**

- **Roles de pago** (`forms/procesos/roles-pago/`) suma los tres procesos de
  `GeneracionRolPagoService`: regenerar el período, verificar la integridad de un rol y
  registrar la recepción en bloque. El estado que muestra la lista **se deriva de `fechaEnvio`
  y `recibido`** (`estado-rol.ts`), nunca de `RLPGESTD`. Regenerar solo aparece sobre períodos
  ya aprobados, porque la vía normal es `aprobarPeriodo`.
- **Reportes de nómina** (`forms/procesos/reportes-nomina/`), pantalla nueva con el rol
  consolidado, las provisiones y el resumen de aportes. Los tres van por
  `POST /rest/rprt/generar` con `modulo: 'rhh'`; el rol individual se queda por colaborador en
  la pantalla de roles. Ruta, entrada de menú y permiso 889 registrados, y **activada la entrada
  "Recursos Humanos"** que estaba comentada en el menú global de reportes de `rpr`.
- Helpers compartidos nuevos: `forms/procesos/descarga-reporte.ts` (nombres de plantilla,
  descarga y el mensaje del 404 mientras `rep/rhh/` esté vacía) y
  `forms/procesos/seleccion-filas.ts`.

**Confirmado el 2026-08-19:** el cuerpo de `registrarRecepcion` es `List<Long>`, la fecha la
sella el servidor. Y al aplicar la decisión de parámetros Jasper se encontró y corrigió que el
rol individual enviaba `P_NMNA_CODIGO` con el código de la nómina: ahora envía `P_RLPG_CODIGO`
con el código del rol.

**Nombres de plantilla — resuelto el 2026-08-19 (dueño del contrato).** El frontend pedía
`RPRT_ROL_INDIVIDUAL` / `RPRT_ROL_CONSOLIDADO` / `RPRT_PROVISIONES` / `RPRT_RESUMEN_APORTES` y
el backend entregó los `.jrxml` como `RPRT_ROLL_INDV` / `RPRT_ROLL_CNSL` / `RPRT_PRVS_PRDO` /
`RPRT_APRT_RSMN`. Los cuatro habrían dado 404. **Ganan los nombres del backend**, que siguen el
patrón canónico de la casa (`RPRT_CMPB_PGCT`): el frontend cambia sus cuatro constantes en
`forms/procesos/descarga-reporte.ts`.

**La compuerta de asistencia — 2026-08-19.** Al verificar qué persiste de verdad se encontró que
de las once columnas del script 05 en `RSMN` la entidad solo mapea `tipoAusencia`, y que
`Marcaciones` no mapea `procesado`: el diálogo de corrección escribía seis campos que se
descartaban en silencio, incluida la marca de inconsistencia. Todo lo que depende de esos campos
quedó tras **una sola compuerta, `CAMPOS_ASISTENCIA_PERSISTEN`** en
`forms/asistencia/utiles-asistencia.ts`, junto a `descripcionTolerante()`, para que ambas cosas
se liberen con el mismo aviso de recompilación: la columna «Consolidada» de marcaciones no se
pinta, el diálogo de corrección solo muestra los tres campos que persisten (la justificación
obligatoria y su `Validators.required` se registran solo con la compuerta abierta), y el resumen
diario conserva sus columnas con un **aviso visible** de que las horas y la marca de
inconsistencia no vienen del backend — decisión ratificada: avisar informa mejor que un muñón
sin columnas, y al mapear la fase 7 queda correcta sola.

**Hallazgo `sldv`:** no existe pantalla de vacaciones ni llamada a `acreditar` / `disponible` /
`caducar` en el frontend — solo el CRUD generado. Quien la construya debe arrancar con el cuerpo
real: `{idEmpresa, fechaCorte, usuarioRegistro}` (verificado contra `SaldoVacacionesRest`).

**Lo que le falta al frontend, al 2026-08-20.** Ya no es «bloqueado por el backend»: las nueve
fases existen del otro lado. La fase 6 está construida (órdenes de pago, formatos de archivo
bancario, previsualización de asiento) y la 7 completa. Lo que queda es trabajo propio:

| Hueco | Estado |
|---|---|
| **Fase 8 — liquidación** | Sigue siendo el CRUD generado. `liquidacion.service.ts` no tiene `simular`/`calcular`/`aprobar`/`ejecutarSalida`/`contabilizar`; el form y la lista arrastran seis `TODO RRHH` |
| **Fase 9 — salidas oficiales y utilidades** | No existe nada: ni pantalla, ni modelo, ni servicio, ni constantes para `slof`/`utld`/`dtut` en `ws-rrh.ts` |
| Aportes y retenciones | Cuatro `TODO RRHH`, sin búsqueda real |
| Vacaciones y permisos/licencias | Limpiados pero no reconstruidos: 737, 616, 512 y 444 líneas, tabla a mano en vez de `table-basic-hijos`. Sin pantalla para `sldv/acreditar`, `disponible` ni `caducar` |
| Tablero de RRHH | No existe |

**La fase 8 está en el camino crítico y antes se creía que no.** Enero de 2026 trae dos
finiquitos reales con cifras oficiales —Torres Chávez 7 556,41 con acta del Ministerio del
Trabajo, y Benítez Montes 672,47 con la orden de pago del banco—, así que el primer mes de la
calibración ya necesita liquidación. No es una fase tardía.

## Fase 5 — entregada el 2026-08-19

`GeneracionRolPagoService` y su `Impl`, dos consultas propias en `RolPagoDaoService`, los tres
endpoints de proceso de `rlpg`, el enganche en `aprobarPeriodo` y los cuatro `.jrxml` de
`rep/rhh/` con su `.md`. Sin entidad nueva: `RolPago` ya mapeaba todo lo del script 05. El
detalle y el porqué de cada decisión están en el bloque «Estado de ejecución» de la fase 5 del
plan de backend.

Lo que conviene saber sin abrir aquel documento:

- **El rol se emite al aprobar el período**, desde `aprobarPeriodo`. `generarRoles` se expone
  suelto para regenerar mientras el período no se cierre.
- **Los tres estados que admiten `generarRoles` son `APROBADO` (4), `CONTABILIZADO` (5) y
  `PAGADO` (6)** — `GeneracionRolPagoServiceImpl:234`. Rechaza `CERRADO` (7), `ANULADO` (8) y
  todo lo anterior a 4. **La guarda del frontend debe replicar exactamente esos tres**, ni
  `>= APROBADO` (dejaría pasar CERRADO) ni `=== APROBADO` (ocultaría el botón donde regenerar
  sigue siendo legítimo). El mensaje de error decía «debe estar APROBADO» y provocó esa segunda
  lectura equivocada el 2026-08-19: se corrigió para nombrar los tres.
- **Idempotente por el número de rol** (`AAAAMM-NNNNNN`, determinista). Al regenerar **no se
  tocan `RLPGFCEN` ni `RLPGRCBD`**: la entrega ya ocurrida no se deshace.
- **`RLPGESTD` se graba con `'A'`**, el marcador técnico de fila vigente de las tablas de RHH
  con estado `VARCHAR2`. No es valor normativo.
- **El hash no incluye fecha de emisión, usuario ni entrega**, solo el contenido del rol; si los
  incluyera, regenerar un rol idéntico daría otro hash y la verificación no significaría nada.
- **`registrarRecepcion` recibe `List<Long>`** y devuelve cuántos marcó. Sella `RLPGFCEN` con la
  fecha del día solo si estaba en nulo. Un id inexistente aborta la tanda entera.
- **Los cuatro reportes no tienen endpoint propio:** `POST /rest/rprt/generar` con
  `modulo: "rhh"`. Parámetros `P_RLPG_CODIGO` (individual) y `P_PRDN_CODIGO` (los tres de
  período), más `P_USUARIO` y `P_IMAGEN`.
- **Dos controles impresos.** El rol individual avisa si sus renglones no suman los totales
  grabados. El resumen de aportes avisa si `NMNATTPT` no es `NMNAAPPT + NMNAIESC`, que es como
  se delatan las nóminas calculadas antes del reparto por rol: se corrigen recalculando.

**Para recompilar y publicar:** `ProcesoNominaServiceImpl`, `Marcaciones`, `ResumenNomina`,
`RolPagoDaoService`, `RolPagoDaoServiceImpl`, `RolPagoRest`, y las dos clases nuevas
`GeneracionRolPagoService` / `GeneracionRolPagoServiceImpl`. Los `.jrxml` solo hay que
publicarlos. **Ningún script SQL quedó pendiente en esta fase.**

## Fase 6 — entregada el 2026-08-19

Entidades `RDPG` y `DRPG` con sus siete archivos, `ContabilizacionNominaService` completo,
`GeneracionOrdenPagoService`, `selectByPlantillaYAuxiliar` en el DAO de `DetallePlantilla`,
`ConfiguracionNomina` ampliada con la cuenta marcadora y cinco endpoints de proceso. El detalle
está en el bloque «Estado de ejecución» de la fase 6 del plan de backend.

Lo que conviene saber sin abrir aquel documento:

- **El interruptor no se tocó.** El modo histórico sigue avanzando a `CONTABILIZADO` sin asiento;
  se extendió el mismo criterio a provisiones (devuelve `null`) y al pago (registra la fecha de
  acreditación, que es un hecho, pero no emite asiento). `previsualizar` **sí** funciona en modo
  histórico: es la única forma de ver qué asiento se emitiría.
- **La cuenta marcadora se lee de `CFNM.CFNMCTMR`**, mapeada como `cuentaMarcadora`. El 9678 no
  aparece en el código. Si la columna está en nulo el servicio **lanza** en vez de suponer: sin
  ella ninguna línea se reconocería como pendiente y el sistema emitiría asientos con todas las
  cuentas iguales, que es justo el fallo que el control evita.
- **Una línea que suma cero no entra en el asiento** ni exige cuenta. En ASOPREP eso afecta a las
  líneas 16 y 17 —fondos de reserva y décimos «por pagar»—, vacías porque con la modalidad
  MENSUALIZADO esos valores ya viajan dentro del neto de la línea 18.
- **Los renglones se clasifican por `CPNMROLM`**, igual que en el motor. La línea 11 lleva los
  roles 2, 3 y 4: el IESS recauda el IECE y el SECAP en la misma planilla.
- **El cuadre se comprueba con `RedondeoNomina` antes de `generarAsiento`.** La diferencia menor
  a `CFNMTLCD` se ajusta contra la línea de cuadre; la mayor se rechaza con el importe exacto.
- **El residuo del reparto entre cuentas va a la principal**, o el detalle no sumaría el neto.
  Un empleado sin cuenta bancaria activa detiene la orden entera, con su nombre en el mensaje.
- **`contabilizarLiquidacion` lanza diciendo qué falta.** Necesita los tres mapeos de la fase 8.

**Dos huecos del modelo, reportados sin inventar — resueltos el 2026-08-19:**

1. **El formato del archivo bancario → `sql/14_DDL_FORMATO_ARCHIVO_BANCARIO.sql`.** Crea
   `RHH.FMBN`/`RHH.DFMB` —el espejo de salida de `FMRC`/`DFMR`—, el rubro alterno **224**
   `RHH_CAMPO_ARCHIVO_BANCARIO` (11 campos), reutiliza el rubro 209 para el tipo de formato, y
   de paso declara la FK `RDPG.CTBNCDGO → TSR.CNBC` que el script 04 dejó solo en comentario.
   La cabecera y el pie son plantillas con marcadores (`{FECHA}` `{CONTADOR}` `{TOTAL}`
   `{EMPRESA}` `{SECUENCIAL}`). Los nombres de propiedad están en el anexo del contrato.
   `generarArchivoBancario` pasa de lanzar a leer estas tablas; cuando el banco entregue su
   especificación, se crea un `FMBN` y no se toca código.
2. **El titular del egreso de tesorería → `sql/15_INSERT_PRODUCTO_PAGO_NOMINA.sql`.**
   Verificado en base el 2026-08-19: **`EGRSTTLR` es nulable (`Y`)** y **`EGRSPRDP` es
   obligatorio (`N`)**. Confirma el Javadoc de `Egreso`: el titular solo hace falta cuando el
   archivo del banco sale de él, y el de nómina sale de `DRPG`, que lleva su propio snapshot
   por empleado — así que **el egreso de nómina va sin titular, legítimamente**. El producto sí
   hace falta: el script 15 crea el grupo y el producto «PAGO DE NÓMINA» (`CODIGO = 'NOMINA'`),
   con el grupo apuntando a la cuenta marcadora 9678 como las líneas del script 09. Lo vetado
   era reutilizar un producto de otro dominio, no crear el propio. **El servicio lo localiza
   por `CODIGO`, nunca por `ID`** —que es IDENTITY y cambia entre instalaciones— y lanza si no
   existe, en vez de crearlo al vuelo: es parametría, y crearla en caliente escondería una
   instalación a medio configurar. Con esto `RDPG.EGRSCDGO` deja de quedar en nulo y la
   conciliación bancaria puede casar el pago con el extracto.

**Para recompilar y publicar:** las dos entidades nuevas y sus doce archivos de capa,
`ConfiguracionNomina` y su DAO, `CuentaBancariaEmpleadoDaoService` y su impl,
`DetallePlantillaDaoService` y su impl, `ContabilizacionNominaService` y su impl,
`GeneracionOrdenPagoService` y su impl, `PeriodoNominaRest`, `NombreEntidadesRhh`.
**Ningún script SQL quedó pendiente**, salvo el que haga falta si se decide parametrizar el
formato bancario.

## Fase 7 — entregada el 2026-08-19

`FMBN`/`DFMB` con sus catorce archivos y `generarArchivoBancario` reescrito —lo que **cierra la
fase 6**—; `CRMR` con sus siete archivos; las ampliaciones ratificadas de `Marcaciones` y
`ResumenNomina`; `ImportacionMarcacionesService` con las siete reglas;
`ConsolidacionMarcacionesService`; y cinco endpoints de proceso. Detalle en el bloque «Estado de
ejecución» de la fase 7 del plan de backend.

Lo que conviene saber sin abrir aquel documento:

- **El archivo bancario ya no bloquea.** Sin `FMBN` activo el mensaje dice que falta *crearlo*,
  no que falte código. En ancho fijo un valor más largo que la longitud **se recorta**: una línea
  larga descuadra las columnas siguientes y el banco rechaza el archivo entero.
- **La deduplicación es doble:** contra la base y **dentro del propio archivo**. Un reloj repite
  la misma marcación en dos líneas del mismo fichero.
- **Una línea mala no aborta el archivo** (regla 7); va al log de `CRMRLGGO`.
- **`anular` rechaza la anulación si alguna marcación ya se consolidó**: retirarla dejaría el
  resumen apoyado en datos que ya no existen.
- **Un número impar de marcaciones no se adivina**: el resumen sale `inconsistente = 'S'`.
- **El tope `PRNMHRMX` no recorta horas**, solo avisa: la hora se trabajó y hay que pagarla.
- **Sin turno no se inventa horario:** el resumen sale con horas trabajadas y sin atraso.
- **`POST /rest/hrex/aprobar` devolvía 405** contra el desplegado, exactamente como documentó la
  prueba del frontend. El endpoint nuevo lo resuelve al desplegarse.

**Dos cosas que reporto y no decido:**

1. **`CODIGO_DEL_BANCO` sale del nombre del banco.** `TSR.BNCO` no tiene código de institución
   —solo la PK y el nombre—. Si el banco real lo pide, hace falta una columna en `TSR.BNCO` y
   llevarla al snapshot de `DRPG`. Para quien paga a un solo banco destino, `LITERAL_FIJO` basta.
2. **Las 19h00 y las 06h00 están en el código**, como constantes con su cita del Art. 49 del
   Código del Trabajo. No las consideré parámetro de empresa sino definición legal; si el
   criterio se prefiere al revés, hace falta dónde guardarlas.

**Nombres de propiedad que fijé y falta ratificar:** los de `RHH.CRMR` —`nombreArchivo`, `hash`,
`fechaCarga`, `fechaDesde`, `fechaHasta`, `lineasTotales`, `lineasOk`, `lineasError`,
`lineasDuplicadas`, `log`, más `formato` para `FMRCCDGO`—. Coinciden con los del DTO
`ResultadoImportacionMarcaciones` de la §6 del maestro.

**La prueba con el `FMRC` sintético está montada y sin correr:** formato 1 creado en base
(delimitado por coma, una línea de cabecera y una de pie, cinco campos), empleado de prueba con
código biométrico `7`, y el archivo en `docs/logica-negocio/rhh/muestra-marcaciones-sintetica.txt`.
Ejercita las siete reglas; **esperado: 12 líneas, 9 ok, 2 con error, 1 duplicada**, del 05 al 08
de enero de 2026.

**Corrida el 2026-08-20 contra el desplegado, y cuadró exacta.** `previsualizar` y `confirmar`
devuelven los cuatro números esperados —**12 líneas, 9 ok, 2 con error, 1 duplicada**, del
05-01-2026 al 08-01-2026— y los dos errores nombran su línea: el biométrico `99` inexistente y la
hora `'ocho'` ilegible. Las nueve marcaciones quedaron persistidas con la línea de origen y el
dispositivo, y la duplicada de la línea 8 fuera. El deduplicado dentro del propio archivo
funciona.

**Valores esperados de la consolidación del 07-01-2026**, una vez puesto el turno del script 19
(miércoles, laborable, 08:00–17:00 con 10 minutos de tolerancia). Calculados a mano desde el
código, igual que el caso de enero — si el motor difiere, uno de los dos está mal:

| Campo | Valor | De dónde sale |
|---|---|---|
| `horasTrabajadas` | **12,4167** | 08:15 a 20:40, sin pares intermedios |
| `horasSuplementarias` | **3,4167** | exceso sobre la jornada de 9 h |
| `horasExtraordinarias` | **0** | nada después de medianoche, y el día es laborable |
| `horasNocturnas` | **1,6667** | de 19:00 a 20:40, y topado por la jornada ordinaria |
| `minutosTarde` | **5** | 08:15 contra 08:00 menos 10 de tolerancia |
| `minutosSalidaAnticipada` | **0** | salió después de la hora |
| `minutosExtra` | **205** | las suplementarias en minutos |
| `inconsistente` | **N** | dos marcaciones, número par |

**La jornada de 20h40 no se pudo medir todavía, y no es un defecto del cálculo.** La franja
nocturna está bien parametrizada —`PRNMHRIN` 19, `PRNMHRFN` 6, recargo 25 %— y el 07-01 tiene su
salida a las 20:40 grabada intacta. Pero el recargo nocturno se cuenta **sobre la jornada
ordinaria, no sobre el exceso**, y el contrato de prueba **no tiene turno**: no hay ni un `TRNO`
creado en la base. Sin turno la jornada teórica es 0, todo el día cae en exceso y `horasNocturnas`
sale estructuralmente 0. Para cerrar esta comprobación hace falta **un `TRNO` con sus `DTLL` por
día de la semana, asignado al contrato** — 08:00 a 17:00 con su tolerancia basta. Es un dato, no
código.

**Para recompilar y publicar:** `FMBN`/`DFMB` y sus catorce archivos, `CargaMarcaciones` y sus
siete, `Marcaciones` y `ResumenNomina` con sus dos DAO, `EmpleadoDaoService` y su impl,
`MarcacionesDaoService` y su impl, `DetalleFormatoMarcacionDaoService` y su impl,
`ImportacionMarcaciones*`, `ConsolidacionMarcaciones*`, `GeneracionOrdenPagoServiceImpl`,
`CargaMarcacionesRest`, `ResumenNominaRest`, `HoraExtraRest`, `NombreEntidadesRhh`, `Rubros` y
`RhhCampoArchivoBancario`. **Ningún script SQL pendiente**, salvo el que decidas para los dos
huecos de arriba.

## Fase 8 — entregada el 2026-08-19

Los **tres huecos de mapeo cerrados** con los nombres del anexo, `LiquidacionHaberesService` con
sus cuatro operaciones, `contabilizarLiquidacion` real —desbloqueado justamente por esos
mapeos— y cinco endpoints. Detalle en el bloque «Estado de ejecución» de la fase 8 del plan de
backend.

- **`Liquidacion.estado` pasa de `String` a `Long`** (rubro 196). Misma familia que `MRCCTPOO`:
  el script 05 recreó la columna como `NUMBER` y la primera escritura habría dado `ORA-01722`.
- **Qué rubro corresponde lo decide la causal**, no una lista en Java. Los importes de ley salen
  de `PRNM`.
- **La jubilación patronal entra en cero**: el importe sale del estudio actuarial, igual que la
  provisión.
- **Un neto negativo se registra y no lanza**: el trabajador debe dinero y ese saldo hay que
  gestionarlo, no hacerlo desaparecer.
- **`ejecutarSalida` exige la liquidación aprobada.** Cierra el contrato, pasa al empleado a
  CESANTE, avisa al IESS, cancela los descuentos y caduca los saldos de vacaciones.

**Los ocho rubros se localizan por `CPNMROLM`** (roles 23–30, script 17). Lo reporté cuando iban
por `CPNMALTR` y la decisión fue extender el rubro. El matiz: el código alterno **sí discrimina**,
así que no había riesgo de tomar el concepto equivocado — lo que fallaba era la regla 1 y la
coherencia. **Ya no queda ningún `CPNMALTR` literal en el módulo**; la única excepción viva es la
retención por servicios profesionales, por la terna, porque no es cálculo ordinario.

**Falta de la fase 8:** `generarActaFiniquitoSut`, que es un reporte de `rep/rhh/` y va con los
de la fase 9.

## Fase 9 — entregada el 2026-08-19 · el módulo está completo

`UTLD`, `DTUT` y `SLOF` con sus veintiún archivos, `CalculoUtilidadesService`,
`GeneracionSalidasOficialesService` con el RDEP, el rubro 223, cuatro endpoints y tres reportes.
Detalle en el bloque «Estado de ejecución» de la fase 9 del plan de backend.

- **`CalculoUtilidadesService`**, no `UtilidadService`: ese nombre lo ocupa el CRUD. Tercera vez
  que pasa, así que ya es patrón: **el servicio de proceso lleva el verbo delante**.
- **Se construyó completo aunque `CFNMAPUT='N'`**, rechazando la operación mientras la bandera
  esté apagada. Mismo patrón que `ProvisionActuarialService`.
- **Dos divisiones protegidas** en el reparto: sin días o sin cargas el coeficiente queda en
  cero. Lo de las cargas es un caso real —una empresa donde nadie declara— y esa parte de la
  base no tiene a quién ir.
- **El excedente sobre el tope va al IESS**, no se reparte entre los demás.
- **La idempotencia de `SLOF` compara los nulos con `is null`, no con igualdad.** `null = null`
  es desconocido, no verdadero: escrito con igualdad, la salida anual y la consolidada no se
  encontrarían nunca y cada generación crearía una fila nueva. Misma familia de fallo silencioso
  que el `||` de la franja nocturna.
- **Regenerar no borra la fecha de presentación.** Si ya se presentó, el hecho ocurrió; lo que
  delata que el contenido cambió es el hash.

**Lo que queda fuera y por qué:** los tres formularios del MDT y el archivo de carga de la
planilla IESS. Los formatos no los tenemos —el del IESS es el insumo 4—. Los tipos 3 a 6 del
rubro 223 existen para registrarlos en cuanto lleguen, y el registro de generación y
presentación ya funciona para ellos **sin tocar código**.

## Decisiones tomadas que no se vuelven a discutir

- **La migración visual está congelada; la regla vale sólo para lo nuevo — 2026-08-20.** Se
  ordenó rehacer diecinueve pantallas y **se revirtió el mismo día**: detenía el proceso, y el
  proceso es lo que tiene fecha. **Las pantallas existentes se quedan como están** hasta que el
  módulo esté funcional y la información de ASOPREP cargada y cuadrada. **Lo que se construya de
  ahora en adelante no usa `table-basic-hijos`** y nace con la interfaz nueva: en la práctica, la
  fase 8, la fase 9 y el tablero. Condiciones y reglas verificadas en `ORDEN-REDISENO-UI-RRHH.md`.
  `forms/personal/ficha/contratos` quedó en la forma nueva y **se conserva** como implementación
  de referencia.
- **El dinero es `Double`**, no `BigDecimal`, con redondeo por renglón vía `RedondeoNomina`.
  Justificación completa en la regla 4 del maestro.
- **El aporte patronal NO se provisiona.** El asiento de rol ya lo registra en las líneas 3 y 11
  del rubro 214; provisionarlo contaría el costo dos veces. El tipo 5 del rubro 206 queda sin uso.
- **`CPNMPRCN` manda sobre `PRNM`** en los cinco porcentajes duplicados, con caída a `PRNM`. La
  divergencia avisa en `validarPeriodo` y **bloquea** en `aprobarPeriodo`.
- **Los rubros del finiquito también van por `CPNMROLM`** (roles 23–30, script 17): no queda
  ningún `CPNMALTR` literal en el módulo. Única excepción viva: la retención por servicios
  profesionales, por la terna.
- **El motor localiza los conceptos por `CPNMROLM`**, nunca por `CPNMALTR` ni por la terna
  tipo/cálculo/base. El índice único `UQ_CPNM_ROLM` impide que dos conceptos reclamen el mismo rol.
- **La provisión de vacaciones es obligatoria para todos**, con independencia de la modalidad de
  décimos o fondos de reserva. `baseVac / 24`, con el divisor derivado de `PRNMDIVC / PRNMDANO`.
- **Empleado y Partícipe siguen separados**: sin FK entre `RHH.MPLD` y `CRD.ENTD`.
- **Las cuentas contables tienen el marcador 9678.** La condición de "sin configurar" es
  `PLNNCDGO = 9678`, no un valor nulo.
- **`Historial` no tiene propiedad `departamento`**: se navega `departamentoCargo.departamento`.
- **`DepartamentoCargo` serializa en minúscula** (`departamento`, `cargo`).
- ~~**`anio` se filtra en el cliente**~~ **— resuelto el 2026-08-20.** El DAO genérico no
  enlazaba `INTEGER` en `selectByCriteria`: el parámetro quedaba declarado y sin enlazar, y
  Hibernate lanzaba `QueryParameterException` antes de ejecutar. **No lo ignoraba: fallaba**, así
  que el `case` nuevo es aditivo y ningún módulo podía apoyarse en la conducta anterior.
  Autorizado y aplicado, calcado del `case LONG` con su rama de `BETWEEN`. Los `anio` de RRHH son
  `Integer` en las ocho entidades que los declaran —verificado en `ParametroNomina`,
  `TablaImpuestoRenta`, `AcumuladoNomina`, `PeriodoNomina` y `SaldoVacaciones`—, así que el
  filtro puede volver al servidor cuando el frontend toque esas pantallas. **No es urgente**:
  filtrar en el cliente con estos volúmenes funciona.
  El mismo barrido encontró **cuatro búsquedas rotas en CRD**, ajenas a RRHH y anteriores a este
  trabajo: `docs/pendientes/BUSQUEDAS-ROTAS-CRD.md`.
- **`RLPGESTD` se queda como `String`** y no se crea rubro de estado del rol: el estado real ya
  lo llevan `RLPGFCEN` (enviado) y `RLPGRCBD` (recibido). Mismo criterio que `CNTEESTD`.
- **La cuenta marcadora se lee de `CFNM.CFNMCTMR`**, que crea el script 13. El `9678` nunca se
  escribe en Java.
- ~~**`RDPG.EGRSCDGO` queda en nulo**~~ **— cerrado por el script 15 y verificado el 2026-08-20.**
  `TSR.EGRS` exigía `Titular` y `ProductoPago`, y la nómina no tenía ninguno de los dos. La
  consulta del hueco resolvió que `EGRSTTLR` admite nulo y `EGRSPRDP` no, así que el script 15
  creó el grupo y el producto «PAGO DE NÓMINA» (`CODIGO = 'NOMINA'`). Confirmado en el camino
  feliz de febrero: la orden de pago creó el egreso 14 contra ese producto, con titular nulo y
  observación «Egreso consolidado de la orden de pago de nómina 1, generado desde RRHH».
- **El servicio de proceso de la orden se llama `GeneracionOrdenPagoService`**, no
  `OrdenPagoNominaService`: ese nombre lo ocupa el CRUD de `RDPG`. Mismo criterio que
  `GeneracionRolPagoService` frente a `RolPagoService`.
- **Las salidas oficiales no duplican datos.** El RDEP y el 107 se generan desde `RNGL`, `ACMN`
  y `LQBS` con los casilleros de `CPNMRDEP`/`CPNMF107`/`CPNMIESS`. `RHH.SLOF` registra solo el
  hecho de la generación y de la presentación al organismo. Se descartó reusar `RPR.EJRC`
  porque no tiene empleado, y el 107 se emite uno por persona.

## El finiquito no calcula el aporte al IESS — 2026-08-20

**Hueco del modelo, y es del dueño del modelo:** el script 17 creó los ocho roles del finiquito
(23–30) y **los ocho son de tipo ingreso**. No existe el lado del descuento.

Verificado por el frontend de tres formas independientes: `simular` devuelve `totalDescuentos: 0`
en las tres causales sobre un contrato con `aportaIess = 'S'`; `LiquidacionHaberesServiceImpl`
suma descuentos sólo de rubros de tipo egreso y del saldo de descuentos recurrentes, sin una sola
referencia a `aportePersonal` ni al 9,45 %; y los ocho roles son tipo 1.

**Consecuencia directa sobre la calibración:** para Torres Chávez el motor daría ingresos
7 650,91 y **neto 7 650,91 en vez de 7 556,41** — los 94,50 exactos. Enero no cierra.

**La regla normativa, que es ley y no preferencia:** el aporte se calcula **sólo sobre la
remuneración pendiente**; indemnizaciones, décimos y vacaciones no son materia gravada. En el
caso de Torres Chávez, 9,45 % de 1 000,00 y no de 7 650,91. Y el porcentaje sale de
`PRNM.aportePersonal`, nunca escrito en Java.

> **`LiquidacionHaberesServiceImpl` NO está entre los cinco servicios congelados.** Los congelados
> son `ProcesoNominaServiceImpl`, `RetencionRentaServiceImpl`, `BeneficioSocialServiceImpl`,
> `AcreditacionVacacionesServiceImpl` y `ProvisionActuarialServiceImpl`. La liquidación es código
> de fase 8, escrito **después** de que enero cerrara en verde, así que modificarlo no compromete
> la atribución de ningún descuadre. Se puede tocar.

**Antes de escribir el delta hace falta un dato del backend:** cómo obtiene
`LiquidacionHaberesServiceImpl` el valor de un concepto — si evalúa `tipoCalculo` y `baseCalculo`
como el motor mensual, o si sólo suma rubros ya valorados. `ConceptoNomina` tiene banderas de base
para décimo tercero, décimo cuarto, vacaciones y utilidades, **pero ninguna para el aporte**: en
la nómina mensual la base imponible se arma con `RNGLIMPN`. Si la liquidación no tiene equivalente,
el concepto nuevo no basta y hay que añadir el mecanismo. El concepto se diseña contra el
mecanismo, no al revés.

**Limitación conocida y aceptada por ahora:** el finiquito tampoco calcula impuesto a la renta.
No hace falta para enero —el acta de Torres Chávez sólo lleva el aporte— pero un finiquito con
indemnizaciones altas sí puede generarlo.

## El instrumento de contraste de la calibración

`sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`. Enfrenta lo calculado contra lo que ASOPREP pagó,
**persona por persona y concepto por concepto, y solo saca las diferencias**: si el mes cuadra,
sale vacío. Se corre igual los seis meses cambiando `&ANIO` y `&MES`.

| Bloque | Qué compara | ¿Sale vacío si cuadra? |
|---|---|---|
| 1 | Cada concepto contra el rol — **solo tipos 1 y 2** | Sí |
| **1B** | **Patronales y provisiones: lo que el rol no imprime** | **No — informativo** |
| 2 | Los totales de cabecera: ingresos, descuentos, líquido y días | Sí |
| 3 | **Control 2:** `TOTAL IESS` afiliado por afiliado contra la planilla | Sí |
| 4 | Que la comparación **haya comparado algo**, con su marca de tiempo | No — informativo |
| 5 | El catálogo de conceptos, para mapear las columnas del rol a `CPNMALTR` | No |

**Orden de lectura: el 4 primero**, después el 3 —el que manda—, después el 1 y el 2, y el 1B se
mira aunque todo cuadre.

**Por qué el 1 solo compara ingresos y egresos.** El rol de ASOPREP no imprime provisiones ni
aporte patronal, y nuestro motor sí los genera: compararlos ahí produciría **una veintena de filas
de «lo tenemos y ellos no» que no son diferencias**, y veinte filas esperadas son el sitio perfecto
para que se pierda la única que sí lo es. Van al **1B, aparte y a la vista** — no se esconden, se
separan de lo que tiene contrapartida.

Y que no tengan contrapartida en el rol no significa que no tengan control: **los patronales los
controla el bloque 3**, el `TOTAL IESS` de la planilla. Las provisiones no las controla nadie
contra el cliente, y por eso hay que poder mirarlas: son el pasivo que la empresa acumula. El 1B
lleva además el control impreso del resumen de aportes —`NMNATTPT = NMNAAPPT + NMNAIESC`—, que
delata una nómina calculada antes del reparto por rol.

**Dos decisiones de diseño, las dos de la regla 6:**

- **Los valores esperados no se derivan de nada nuestro**: salen del rol y de la planilla, y
  `CTRLFNTE` deja escrito de cuál, para que la regla se pueda auditar después.
- **No se redondea ni se agrupa para cuadrar.** Las diferencias que ya sabemos que van a salir
  —los 30 días de Méndez Torres y el ajuste de 0,10 de Calderón— se reconocen leyéndolas. **Una
  tolerancia que tapa una diferencia conocida tapa también la que no conocemos.** No hace falta
  redondear: las columnas son `NUMBER(18,2)` y Oracle guarda decimal exacto.

**Por qué `FULL OUTER JOIN` y no `LEFT`:** un `LEFT` solo vería lo que calculamos de más o de
menos y se le escaparía **el caso más grave, un concepto que el rol tiene y el sistema no
generó** — un renglón ausente no produce ninguna fila en nuestro lado.

**El bloque 4 existe porque una consulta de diferencias vacía solo significa «no hay diferencias»
si de verdad se comparó algo:** con la tabla de contraste sin cargar, los tres primeros bloques
salen vacíos y parecen un éxito. Lleva además `SYSTIMESTAMP`, porque **una salida de comprobación
sin momento es ambigua** — ya costó dos veces, la última diez minutos discutiendo un tipo de saldo
porque la consulta era anterior a una reversión.

**La tabla `RHH.CTRL` la carga el dueño del modelo.** Su contrato está en el paso 0 del script:
exactamente una de `CTRLALTR` (concepto) y `CTRLTOTL` (total) informada por fila, con un `CHECK`
que impide la fila ambigua.

## Pendientes con fecha

### `revertirSaldosApertura` no acepta filtro — **antes de producción**

Hoy la firma es `(idEmpresa, fechaCorte)`: **todo el corte o nada**. La reversión del 2026-08-20
es la demostración —**57 filas revertidas para arreglar 22**, cuando los 17 del décimo tercero,
los 17 del cuarto y el anticipo estaban correctos al centavo—.

**Por qué no es cosmético:** una migración de 24 personas rara vez falla entera, y obligar a
rehacer 35 filas correctas para corregir 22 **es una garantía de que alguien acabe corrigiendo la
tabla destino a mano** — que es exactamente lo que la reversión existe para evitar, y lo que deja
un `SLAP` diciendo una cosa y un `SLDV` diciendo otra.

**Forma que tendría:** filtro **por tipo de saldo** y **por fila**, sobre la misma
`selectAplicados`. No antes de terminar la calibración; **sí antes de producción**, porque allí
una migración fallida a medias no se puede rehacer entera sin consecuencias.

## Cabos sueltos conocidos

- **`escribeAcumulado` no graba ceros.** Para sumar da igual, pero impide distinguir "mes
  procesado en cero" de "mes nunca cerrado". Al terminar la carga de enero a julio hay que
  comprobar que los siete meses tienen filas de `ACMN` tipo 10 con el mismo número de empleados.
- **`CPNMIMIR` es `imponibleIr` pero `RNGLIMIR` es `gravadoIr`.** Mismo concepto, dos nombres.
- **Los `idPermiso` del menú no se validan.** La comprobación está comentada en
  `menu-list.component.ts`. Es preparación, no seguridad.
- **Nada está commiteado, en ninguna de las dos capas.** Al 2026-08-20: backend 364 archivos
  tocados y 279 sin seguimiento; frontend 228, con los borrados de la estructura vieja ya en el
  índice. Hace falta una revisión completa antes del primer commit.
- **Falta el `case INTEGER` en `EntityDaoImpl.selectByCriteria`** — por eso el frontend filtra
  `anio` en el cliente. Es infraestructura compartida de toda la casa, no de RRHH: antes de
  tocarlo hay que decir qué hace hoy con un criterio `INTEGER` (¿lanza o lo ignora en
  silencio?), porque de eso depende si el arreglo es aditivo o si algún módulo se apoya en el
  comportamiento actual.
- **El formato real del archivo bancario y el del biométrico no los tenemos.** Ya no bloquean el
  modelo: `FMBN`/`DFMB` (script 14) y `FMRC`/`DFMR` les dan dónde vivir. Falta el contenido.
- **Tres huecos de mapeo en la fase 8, verificados y aparcados** (detalle en las órdenes,
  orden 4): `DetalleLiquidacion` sin `CPNMCDGO` ni sus cuatro columnas de snapshot;
  `Liquidacion` sin 14 columnas del script 05; y `Liquidacion.estado` como `String` cuando
  `LQDCESTD` ya es `NUMBER` con rubro. Ninguno bloquea antes de la fase 8. El encabezado del
  script 12 afirmaba que `DetalleLiquidacion` declaraba `CPNMCDGO`; corregido.

## El caso de prueba de enero

Empleado con sueldo 800, mes completo, décimos y fondos de reserva mensualizados, ingreso
anterior a enero de 2025 (ya cumplió el año).

| Concepto | Tipo | Valor |
|---|---|---|
| Sueldo | Ingreso | 800,00 |
| Fondos de reserva 8,33 % | Ingreso | 66,64 |
| Décimo tercero (800 ÷ 12) | Ingreso | 66,67 |
| Décimo cuarto (482 ÷ 12) | Ingreso | 40,17 |
| Aporte personal IESS 9,45 % | Egreso | 75,60 |
| Aporte patronal 11,15 % | Patronal | 89,20 |
| IECE 0,50 % | Patronal | 4,00 |
| SECAP 0,50 % | Patronal | 4,00 |
| Provisión vacaciones (800 ÷ 24) | Provisión | 33,33 |

**Ingresos 973,48 · Descuentos 75,60 · Neto 897,88 · Patronal 97,20 · Costo empleador 1.104,01**

Y en la cabecera de `NMNA`, que también hay que reportar: `NMNAAPPR` 75,60 · `NMNAAPPT` **89,20**
· `NMNAIESC` **8,00** · `NMNATTPT` 97,20. Los dos del medio son los que estaban mal.

Tres comprobaciones que delatan un error: `baseDecimoCuarto` debe salir **0,00** —el sueldo
tiene `CPNMBSDC='N'` y el décimo cuarto se calcula sobre el SBU—; **no debe haber renglón de
impuesto a la renta**, porque la base anual da 8.692,80 bajo la fracción básica de 12.208; y la
provisión de vacaciones debe ser **la única** del escenario.

Variante para quien ingresó en junio de 2025 —el grueso del personal— que no cobra fondos de
reserva: ingresos 906,84, neto 831,24, costo 1.037,37.

## Los datos reales de ASOPREP — recibidos el 2026-08-20

El cliente entregó **35 archivos que cubren enero a julio de 2026**, no el mes suelto que se
había pedido. Un agente los analizó y volcó a siete documentos en
`C:\Docs\Clientes\Asoprep\rrhh\REsumen` — **leer esos, no los originales**: los `.xlsb`
necesitan `pyxlsb`, los PDF del IESS se desalinean con `pdftotext -layout`, y cinco PDF son
escaneos sin capa de texto ya transcritos.

| Archivo | Contenido |
|---|---|
| `REFERENCIA-ASOPREP.md` | Índice, entidad, resumen económico, tasas 2026 |
| `REF-01-entidad-y-personal.md` | 33 personas: cargos, fechas, adendas, régimen de décimos, cuentas |
| `REF-02-roles-de-pago.md` | Los 7 libros de rol, sus **4 layouts distintos**, tablas mes a mes |
| `REF-03-iess-planillas-prestamos.md` | Planillas de aporte de enero a junio y préstamos por NUT |
| `REF-04-renta-y-decimos.md` | Proyección de IR 2026, cargas familiares, gastos personales, décimo cuarto |
| `REF-05-finiquitos-y-avisos.md` | Las dos salidas de enero y los dos ingresos, transcritos |
| `REF-06-inconsistencias.md` | **Registro de errores — leer antes de citar cualquier cifra** |

**Enero cierra al centavo contra un control independiente**, que era el objetivo:

```
masa planilla 21 129,66 = RMU del rol 19 756,33 + Torres 1 000,00 + Benítez 373,33
aporte personal 1 866,97 (rol) + 129,78 (9,45 % de los dos finiquitos) = 1 996,75 = planilla
TOTAL IESS      4 069,80 (rol) + 282,92 (20,60 % de los mismos)        = 4 352,72 = planilla
```

### Cinco cosas que van a chocar contra el motor

Resolverlas **antes** de correr, no cuando no cuadre:

1. **El «CCC 1 %» es IECE + SECAP, y el modelo ya lo produce bien.** Se creyó al principio que
   faltaba un concepto: es falso, y conviene dejarlo escrito para que nadie lo vuelva a
   «arreglar». `9,45 + 11,15 + 0,50 + 0,50 = 21,60 %`, que es el total girado al IESS. El rol
   del cliente presenta IECE y SECAP juntos en una columna llamada `VALOR CCC 1%`; nosotros
   producimos dos renglones que suman lo mismo, y `NMNAIESC` ya lleva esa suma —8,00 sobre un
   sueldo de 800 en el caso sintético, que es exactamente el 1 %—. **La correspondencia de
   cabecera es completa**, y así se compara:

   | Columna del cliente | Campo nuestro | Enero, Bárcenas (RMU 700) |
   |---|---|---|
   | `APORTE PERSONAL 9.45%` | `NMNAAPPR` | 66,15 |
   | `APORTE PATRONAL 11.15%` | `NMNAAPPT` | 78,05 |
   | `VALOR CCC 1%` | `NMNAIESC` (IECE + SECAP) | 7,00 |
   | `TOTAL PATRONAL` | `NMNATTPT` | 85,05 |
   | `TOTAL IESS` | `NMNAAPPR + NMNAAPPT` | 144,20 = 700 × 20,60 % |

   Ojo con el último: el `TOTAL IESS` del cliente **no incluye el CCC**, y es el que cuadra
   persona a persona contra el `VALOR` de la planilla.
2. **En enero y febrero, VACACIONES aparece como ingreso *y* como descuento por el mismo valor,
   a todo el mundo** (823,19 en ambos lados, RMU ÷ 24). Es presentación de la provisión: netea
   a cero. El líquido cuadra igual, pero los totales de ingresos y descuentos no, si el motor no
   reproduce el par. Desde marzo desaparece; en junio vuelve como vacaciones reales pagadas.
3. **El régimen de décimos es una sola bandera** (columna P de `DATOS TRABAJADORES`,
   `ACUMULA`/`MENSUAL`) que gobierna el 13.º **y** el 14.º juntos. Nuestro contrato tiene dos
   banderas separadas: hay que cargarlas iguales. Sólo tres personas están en `MENSUAL`.
4. **La RMU de Méndez Torres no reproduce el rol.** La hoja dice 235; el rol y el IESS dicen
   **241 sobre 15 días**. 235 es la mitad del SBU de 2025 y quedó sin actualizar. Va como RMU
   482 con jornada de 15 días.
5. **La cédula de Bravo Caiza está mal en las hojas de rol** (`1714531405`, que es la de Benítez
   Montes, a quien reemplazó). La correcta es **`2150051205`**, confirmada por el aviso de
   entrada al IESS. Cargar la correcta y saber que el cruce por cédula contra `REF-02` falla
   sólo para ella.

Y una trampa de lectura: **en las tablas del §7 de `REF-02` las columnas `RMU` y `Días` están
invertidas** —30,00 es días y 700,00 es la RMU—. Para los centavos, trabajar contra el `.xlsb`,
que el markdown redondea por fila.

### Un verde que no prueba lo que parece

**El impuesto a la renta es cero para los 22 empleados en los siete meses.** La única retención
del año es la de Robayo, 48,40/mes desde agosto. En esta ventana el motor prueba que el IR *no*
se retiene cuando no corresponde —que está bien— pero **no prueba el cálculo de la retención**.

### Lo que sigue faltando

| # | Insumo | Bloquea |
|---|---|---|
| 1 | **Saldo de vacaciones por persona al 31-dic-2025** | No está en ningún documento. Enero no lo necesita (la provisión netea a cero); desde junio sí, y los finiquitos lo liquidan |
| 2 | **Saldo y cuota de los anticipos de sueldo al 31-dic-2025** | En enero se descuentan 700,00 y en febrero 1 019,52. Sin el saldo inicial no se reproduce la amortización |
| 3 | **Planilla del IESS del período 2026-07** | El archivo llamado `2026-07` contiene el período 06. Por eso la calibración llega hasta junio |
| 4 | Archivo de muestra del reloj biométrico, con marca y modelo | Importador, fase 7 |
| 5 | Plan de cuentas contable | Contabilización, fase 6 |
| 6 | Formato real del archivo bancario | `/rest/rdpg/archivoBancario`. **Ya hay dónde guardarlo**: `FMBN`/`DFMB`, script 14 |
| 7 | Formato de la planilla IESS: archivo de carga o reporte | Fase 9 |

Los saldos de apertura de décimo tercero y cuarto **sí son derivables** de la hoja de décimos
(`DIAS 2025` / `MENSUAL 2025` / `DECIMO PAGADO 2025`), y el de fondos de reserva es **cero**:
nadie ingresó antes de junio de 2025, así que nadie cumplía el año antes de junio de 2026 — lo
confirma que la columna `FONDO RESERVA` esté vacía de enero a mayo.

### La corrida — ratificada el 2026-08-20

**Se calcula enero a junio; no se cargan como datos.** El plan completo, con los saldos de
apertura, el orden y los valores de control por mes, está en
**`PLAN-CARGA-HISTORICA-ASOPREP.md`** — es el documento de trabajo de esta etapa.

Se descartó cargar los seis meses y calcular sólo julio, por dos razones: el motor no se
verificaría nunca y julio quedaría como único mes de calibración —siendo el peor candidato: dos
roles con 13,17 de diferencia, sin planilla del IESS y con los fondos de reserva recién
nacidos—; y **los acumulados con los que arranca julio los tiene que escribir `cerrarPeriodo`,
no una carga a mano**, porque si se fabrican, un error aparece en julio como una diferencia sin
explicación.

## Orden de lectura para una sesión nueva

1. **La cabecera «Dónde estamos» de este archivo** — es el estado real. El resto es historia.
2. **`PLAN-CARGA-HISTORICA-ASOPREP.md`** — el ciclo mes a mes, los controles, y el §4 con las
   trampas de los datos (ahí están las diferencias esperadas que no son defecto)
3. `GUION-CARGA-APERTURA-ASOPREP.md` — qué se cargó y con qué convención, por si hay que
   replicar en producción
4. `PLAN-IMPLEMENTACION-RRHH-MAESTRO.md` — las **seis reglas** del §2 (la 6, «un control sale de
   otra fuente que lo que verifica», es del 2026-08-20), convenciones, contrato REST
5. `CONTRATO-DTO-PARAMETRIZACION-RRHH.md` — nombre de propiedad de cada columna
6. `ORDEN-REDISENO-UI-RRHH.md` si eres el frontend — la regla de lo nuevo y la migración
   congelada
7. `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql` — el instrumento; los scripts van numerados del 01
   al 34 y cada uno dice qué hace y por qué
8. `C:\Docs\Clientes\Asoprep\rrhh\REsumen\REFERENCIA-ASOPREP.md` — los datos del cliente; y
   `REF-06-inconsistencias.md` **antes** de citar cualquier cifra suya
9. `ANALISIS-MODULO-RRHH.md` y `ORDENES-BACKEND-FASES-5-9.md` solo si hace falta el porqué de
   algo ya hecho
