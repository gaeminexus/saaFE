# Plan — Acuerdos de pago con condonación de valores

**Fecha:** 2026-08-29 · **Módulo:** CRD · **Frente K**
**Estado:** diseño cerrado, implementación en curso. **Las decisiones de §1 no se re-preguntan.**

> **Por qué existe este documento.** El diseño se acordó en conversación y no quedó escrito en
> ningún lado. Cuando la sesión del agente de backend perdió contexto, tuvo que pedir de nuevo
> datos ya decididos — y la alternativa era que los reconstruyera de memoria y contradijera algo
> ya cerrado con el usuario. Un diseño que solo vive en un chat se pierde con el chat.

---

## 0. Qué es

Condonar (perdonar) valores de préstamos **en mora o de plazo vencido**. Funciona como una
precancelación, pero perdonando parte de lo adeudado. La pantalla muestra todos los conceptos del
préstamo, el operador indica cuánto se paga de cada uno, y la diferencia se condona.

---

## 1. Decisiones cerradas

| # | Decisión |
|---|---|
| K1 | **Pago único, aquí y ahora.** No es un plan de cuotas: el socio paga hoy, se condona el resto, el préstamo queda liquidado en el acto |
| K2 | **Se condona:** interés en mora, interés ordinario y capital. Nada más |
| K3 | **NUNCA se condonan los seguros** (desgravamen e incendio): se pagan al 100%, el campo **no es editable**, y su suma es el **PISO** del monto a pagar. Validado en backend, no solo en pantalla |
| K4 | ~~Aprobación de un segundo usuario antes de aplicarse~~ **DEROGADA el 2026-08-30.** El acuerdo **no queda en espera de nadie**: la pantalla muestra la previsualización y el operador confirma ahí mismo. La previsualización cumple el papel del segundo par de ojos. Ver §5 |
| K5 | Lo condonado va a **UNA sola cuenta de gasto** (no una por concepto), parametrizada como una línea de la **plantilla alterno 25** ("CRD COBRO INDIVIDUAL PRESTAMO CORRELACIONADO") |
| K6 | **Estado final del préstamo: CANCELADO (3)**, sin estado nuevo |
| K7 | Universo: solo préstamos en **EN_MORA (11)** o **DE_PLAZO_VENCIDO (8)**, decidido por `PRSTIDST` — nunca `ESPSCDGO` |
| K8 | La **cabecera reusa `EventoPrestamo`** (tipo de operación nuevo), no una tabla propia: ya es la bitácora central de operaciones sobre préstamo |
| K9 | **Lo condonado NUNCA se registra como `PagoPrestamo`.** Solo lo efectivamente cobrado. Es lo que hace que el reverso existente (`anularOperacion`) restaure la deuda completa sin lógica nueva |
| K10 | ~~Un acuerdo RECHAZADO conserva su registro~~ **DEROGADA el 2026-08-30**, consecuencia de derogar K4: no hay rechazo de condonación porque no hay aprobación. Lo que sí conserva registro es el acuerdo **ANULADO** (§5) |
| K11 | **El préstamo queda CANCELADO al PROCESAR el cobro**, no al confirmar la condonación — decisión del usuario del 2026-08-30. Ver §5 |

### ⚠️ Consecuencia de K6, y define el diseño de la tabla

Con estado CANCELADO, **un préstamo condonado es indistinguible de uno pagado normalmente** para
cualquier consulta que filtre por `PRSTIDST`. La tabla del acuerdo pasa a ser **la única fuente**
para responder *"cuánto se condonó, a quién y quién lo autorizó"*.

Por eso tiene que ser **consultable de verdad** — por rango de fechas, por partícipe, por usuario
que aprobó, con montos sumables por concepto. Si queda como un log que solo se lee de a una fila,
el dato existe pero nadie puede usarlo.

---

## 2. Los cinco conceptos

Son los **conceptos del préstamo**, no una clasificación de pagado/condonado. Cada uno lleva sus
tres montos:

| Concepto | ¿Se puede condonar? |
|---|---|
| Capital | Sí |
| Interés | Sí |
| Mora | Sí |
| Desgravamen | **No** — se paga al 100% |
| Seguro de incendio | **No** — se paga al 100% |

Por cada concepto, el detalle guarda: **monto adeudado**, **monto pagado**, **monto condonado**.

> **Son 5 y no 6, a propósito.** `SaldosCuota` tiene `saldoInteres` y `saldoInteresVencido` como
> campos separados, pero **`DTPRINVN` no lo alimenta ningún proceso** — vale 0 siempre. El "interés
> vencido" que se corrigió el 2026-08-29 en la reestructuración **no es ese campo**: es una
> derivación (el interés ordinario de las cuotas vencidas). Exponerlo como una sexta línea editable
> invitaría a escribir en un campo que no representa nada, o a condonar dos veces el mismo concepto
> con otro nombre. Suma dentro del total, sin línea propia.

---

## 3. Reglas de cálculo

- **La mora se recalcula a la fecha**, con el método puro extraído en
  `ProcesoMoraPrestamoServiceImpl` (2026-08-29). **Nunca** se lee el `saldoMora` persistido.
- **Al previsualizar se usa `calcularSaldosCuota`** (la variante PURA, que no escribe), nunca
  `calcularSaldosRealesCuota`, que autocorrige y persiste. Es el defecto que se corrigió en los
  simuladores el 2026-08-28.
- El split exigibles/futuras y `recalcularMoraALaFecha` se **reutilizan** de
  `ProcesoPagoPrestamoServiceImpl.calcularPrecancelacion` — extraídos a un método compartido, no
  duplicados.
- **La aplicación es distinta y sí es nueva:** `aplicarPagoACuota` cobra en prelación fija tomando
  el máximo posible de cada componente. El acuerdo necesita lo contrario: montos **arbitrarios** por
  concepto, decididos por el operador, y la cuota **siempre se cierra** aunque no se haya cobrado el
  100%.

### ⚠️ Staleness al PROCESAR (ya no al aprobar — reubicado el 2026-08-30)

Al derogarse K4 desaparece la ventana registro→aprobación, pero **NO desaparece el problema**: queda
la ventana entre que el cobro entra a la bandeja y que contabilidad lo aprueba. Si alguien pagó algo
del préstamo en el medio, se estaría aplicando un perdón calculado sobre un saldo que ya no existe.

**El control se mueve al PROCESO del `CBCR`**, que es donde el circuito de cobros **ya tiene el
precedente**: `ResultadoProcesoCobro` con `procesado = false` y `estado = RECHAZADO` es el rechazo
automático por staleness de precancelación. El acuerdo **reusa ese mecanismo**, no inventa uno.

Al procesar se recalcula el desglose y se compara contra lo registrado (tolerancia $0.01). Si no
coincide, se devuelve `procesado: false` con el motivo. **Nunca se recalcula en silencio para
aplicar otro monto.**

El recálculo **no persiste nada**: compara contra un cálculo efímero. O el registro sigue vigente
tal cual y se aprueba, o no y se rechaza tal cual. Así no existe ningún camino donde la cabecera y
el detalle se actualicen por separado.

### ⚠️ LA FECHA QUE MANDA ES `acuerdo.getFecha()`, NO `LocalDate.now()` — regla innegociable

El control de staleness compara con la **fecha del acuerdo**. Por lo tanto **el motor tiene que aplicar con esa
misma fecha**. Si el staleness valida contra `acuerdo.getFecha()` y el motor aplica con
`LocalDate.now()`, el control valida una cosa y se ejecuta otra — y **no falla**: simplemente cierra
el préstamo con números distintos de los que se aprobaron, en silencio.

**Consecuencia conocida y aceptada:** el control detecta que alguien PAGÓ algo en el medio, pero
**no detecta el paso del tiempo**. La mora devengada entre el registro y la aprobación no aparece,
y **se borra cuando el préstamo queda CANCELADO** — una condonación extra que nadie autorizó y que
crece sola con la demora. Es el precio de respetar lo negociado (el socio acordó pagar $X, no $X
más lo que tarde el aprobador), y por eso **exige una antigüedad máxima** (§6.3): sin techo, la
deriva no tiene límite.

---

## 4. Contabilidad

**Esta operación SÍ necesita asiento real, y es la razón de fondo:** la precancelación condona
montos **prospectivos** (nunca reconocidos como cuenta por cobrar — no hay pérdida que registrar);
el acuerdo condona montos **ya devengados**, que están en los libros. Darlos de baja **es un
castigo contable**.

### K12 — De qué bandas sale el capital condonado (decisión del usuario, 2026-08-30)

El operador decide cuánto se condona **por concepto**, no por cuota. Pero el haber del asiento se
clasifica por **banda de morosidad**, así que hay que decidir de qué cuotas sale ese capital.

**Sale de las ÚLTIMAS bandas: se consume desde la de MAYOR mora hacia atrás.** Se agota el capital
pendiente de la cuota más vencida, después la siguiente, y así hasta cubrir el monto condonado.
Las bandas se numeran desde 1 ascendiendo en días (`diaFin(k) = 30 * SUM(periodos 1..k)`), así que
"las últimas" son las de **más días de mora**, no las primeras de la lista.

**Por qué, y no proporcional** (que era la convención provisional del backend): el capital más
vencido es el **más provisionado**. Castigarlo primero hace que la liberación de provisión compense
la pérdida, que es como se da de baja una cartera deteriorada. Repartir proporcionalmente tocaría
todas las bandas por igual y dejaría castigado capital de bandas tempranas —poco provisionadas—
mientras sobrevive capital de las bandas viejas.

⚠️ **Esto NO es una convención más:** cambia a qué cuentas contables va el dinero y cuánta provisión
se libera. Al tocar el reparto, revisar este párrafo antes.

---

- Plantilla **alterno 25**, con una línea nueva para la cuenta de gasto (K5).
- El asiento debe cuadrar D=H **incluyendo** la línea de gasto: lo condonado no desaparece, se
  reconoce como pérdida.
- Gate de `contabilidadActiva()` (rubro 237), como todo lo demás.
- `idEmpresa` viaja por parámetro, como en el cierre de cartera. **No hay ningún problema genérico
  de "resolver la empresa desde crd"** — ver la corrección del 2026-08-29 en
  `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md` §9.3.

---

## 5. Integración con el circuito de cobros — decidida (2026-08-29)

**Un acuerdo recibe dinero**: el socio paga la parte no condonada. Esa plata entra a una cuenta
bancaria de la institución, con su respaldo y su referencia — es indistinguible, en el momento en
que el banco la recibe, de cualquier otro cobro.

**Decisión del usuario: el cobro del acuerdo entra como un TIPO DE OPERACIÓN MÁS en `CRD.CBCR`.**

Por qué, y no un flujo propio: si el acuerdo fuera autónomo, sería **el único cobro del sistema que
no pasa por la bandeja de contabilidad** — justo la puerta lateral que este proyecto cerró para los
endpoints viejos, reabierta a propósito para el caso que más control merece, uno donde además se
está perdonando dinero.

### ⚠️ REDISEÑADO EL 2026-08-30 — ya no hay dos aprobaciones, hay una

Queda **una sola aprobación**, la de contabilidad sobre el `CBCR`, que responde *¿esta plata
realmente entró al banco?*. La aprobación de la condonación **desaparece** (K4 derogada): la
**previsualización en pantalla** es lo que hace las veces de control — el operador ve exactamente
qué se perdona por concepto antes de confirmar.

### El flujo definitivo

1. Crédito abre el acuerdo, la pantalla **previsualiza** el desglose por los 5 conceptos, el
   operador ajusta cuánto se paga de cada uno y **confirma**. El acuerdo nace **ya decidido**, con
   sus montos fijos. No espera a nadie.
2. En el mismo acto se **registra en `CBCR`** el cobro por la parte no condonada.
3. Contabilidad **aprueba ese cobro** como cualquier otro, mirando el comprobante.
4. Crédito **procesa**, y **recién ahí** se aplica todo: cierre de cuotas, condonación, préstamo a
   **CANCELADO** (K11).

### Por qué la cancelación va en el paso 4 y no en el 1

Es la decisión del usuario del 2026-08-30, y la razón es concreta: **si el préstamo se cancelara al
confirmar, un depósito que nunca llegó dejaría el préstamo cancelado y la deuda perdonada**, y
habría que reversar a mano una operación que nunca debió existir. Cancelando en el proceso, si
contabilidad no aprueba **no se canceló nada**: el préstamo sigue vivo y cobrable, sin deshacer nada.

Además mantiene la condonación dentro de la regla que el usuario impuso para todos los cobros — si
se aplicara al confirmar, sería **el único cobro del sistema que se ejecuta antes de que
contabilidad verifique el dinero**, y justo el que perdona plata.

**El monto del cobro no puede desalinearse del acuerdo**: nace del acuerdo ya confirmado, en el
mismo acto.

### Qué queda del ciclo de vida de `ACCN`

Ya no hay REGISTRADO→APROBADO/RECHAZADO. Queda: **vigente** (confirmado, esperando que su cobro se
procese) → **aplicado** (el proceso corrió) → **anulado** (se anuló el `CBCR` antes de procesarlo).
El rubro 247 **se reusa con esos valores**, no se borra. Un acuerdo anulado **conserva su registro**:
sigue siendo cierto que alguien negoció perdonar dinero.

**Lo único nuevo en `CRD.DCBC`** es un `idAcuerdo` opcional (mismo patrón que `idPrestamo` e
`idTipoAporte`), para que el proceso sepa qué acuerdo aplicar. Todo lo demás se reutiliza: respaldo
obligatorio, cuenta bancaria, asiento transitorio → definitivo, bandeja combinada (un tercer `tipo`
de fila, no un tercer mecanismo), visor del comprobante, edición, anulación.

---

### K13 — El saldo de aportes NO se reserva al registrar (usuario, 2026-08-30)

Cuando un acuerdo (o una precancelación mixta) se cubre en parte con aportes, el saldo se
**revalida al PROCESAR**, no se reserva al registrar. Entre los dos momentos pasa la aprobación de
contabilidad.

**Se evaluó reservar el saldo** —marcarlo como comprometido para que nadie más lo use— y **se
descartó**. Razón del usuario: *"los aportes pueden seguir aumentando independientemente de si se
pagó un préstamo con ellos o no"*. El saldo tiende a crecer con los aportes mensuales, así que en
la práctica la carrera es poco probable.

**Lo que queda vivo, y es aceptable:** si el socio **reduce** ese saldo en el medio —otra
operación, una devolución— el proceso **falla** con el depósito ya hecho y aprobado. No se pierde
nada: el error nombra el tipo de aporte y el monto que faltó, y crédito corrige y reenvía.
**No agregar un mecanismo de reserva sin que el usuario lo pida.**

---

## 6. ⏳ Lo que NO está decidido

0. **Si vuelve la aprobación de la condonación (K4).** Reabierto el 2026-08-30, cuando el usuario
   vio la pantalla y pidió resaltar el total condonado como pérdida para ASOPREP. Decisión:
   **dejarlo como está hasta confirmarlo con el USUARIO FINAL** — no volver a proponerlo hasta que
   él lo traiga.
   Estado hoy: **una sola persona de crédito puede condonar cualquier monto y queda firme.**
   Contabilidad verifica que el dinero entró, no cuánto se perdonó. El único registro de quién
   autorizó el perdón es `ACCNUSRG`.
   Si se repone: el backend **no se borró** (así se le pidió al agente el 2026-08-30 justamente por
   esto). Es reactivar un estado intermedio + bandeja de acuerdos pendientes, no reconstruir.

1. **Nombres de tabla.** No se llegaron a elegir. Al proponerlos, verificar que el código de 4
   letras no colisione **en todo el proyecto**, no solo en `crd` — ya pasó con `CBRO`, que existía
   en `TSR`.
2. **El código de la cuenta de gasto** (K5). **No bloquea el desarrollo ni las pruebas**: el flag de
   contabilidad de CRD (rubro 237) está **en 0**, así que no se genera ningún asiento y la cuenta no
   se usa. El usuario la definirá antes de encender el flag.
   ⚠️ **Ninguna cuenta provisional entra en un script.** El de producción se escribe cuando llegue
   la definitiva — una cuenta provisional en un `.sql` es exactamente cómo una cuenta equivocada
   termina en los libros, y un asiento mal imputado no se nota hasta que alguien concilia.
   ⚠️ **Y el día que se encienda el flag, esta línea de la plantilla 25 tiene que existir**, o los
   acuerdos empezarán a fallar al contabilizar. No es un pendiente cosmético: es un prerrequisito
   del encendido.
3. ~~Antigüedad máxima del acuerdo~~ — **CONSULTA RETIRADA el 2026-08-30.** Nació de la ventana
   registro→aprobación, que desapareció al derogarse K4. La ventana que queda (cobro→proceso) es la
   misma que la de cualquier otro cobro y ya la cubre el staleness del §3, sin regla nueva.
