# Cuentas contables por tipo de aporte — propuesta a confirmar

**Fecha:** 2026-08-31 · Árbitro del equipo A de `crd`
**Estado:** ⛔ **PROPUESTA. Nada ejecutado, nada construido.** El mapeo de la §3 lo tiene que
confirmar el usuario antes de escribir una línea de código o de DDL.

---

## 1. Lo que se descubrió, y por qué cambia el enfoque

El usuario confirmó el 2026-08-31 que **se devuelve cualquier tipo de aporte**, no solo cesantía
(11) y jubilación (9). Eso dejaba en falso el diseño anterior, que conocía la cuenta de **tres**
tipos vía los auxiliares 50/51/52 de la plantilla 21.

Consultado el plan de cuentas, **la escala real es mucho menor de lo previsto**:

| | Cuántos |
|---|---|
| Tipos de aporte en el catálogo | 25 |
| Tipos **con movimientos reales** | **16** — los otros 9 nunca se usaron |
| Cuentas de pasivo distintas (`2.1.01.xx` / `2.1.02.xx`) | ~10 |
| Cuentas de liquidación distintas (`2.3.01.xx`) | **5** |

No son 25 mapeos a 25 cuentas: son ~16 tipos que caen en un puñado de cuentas.

### La pieza que lo ordena: `TPAPCSBC`

`CRD.TPAP` guarda un código de familia de 2-3 letras que nadie estaba usando para esto:

`CE` cesantía · `JU` jubilación · `RE` rendimiento · `PE` pensión · `APE`/`AAD`/`APA`/`APF`/`APJ`/`RND` otros

Y el plan de cuentas **está construido con la misma división**: cada familia tiene su cuenta de
aportes y su cuenta de rendimientos, y del lado de liquidación la contraparte se llama
*"intereses"* en vez de *"rendimientos"* — pero es la misma idea.

> **Dos respuestas que salieron de paso:**
> - **`10 JUBILACION PERSONAL` no es un duplicado del 9.** Su `TPAPCSBC` es `RE`: es un
>   **rendimiento**, mal nombrado. Además **no tiene ni un movimiento**, igual que los tipos 2, 3,
>   4, 5 y 25.
> - **Los tipos 17, 18, 19 y 20 (reservas) tienen `TPAPIDST = 99`**, no 1 como el resto — pero
>   **sí tienen saldo** ($54K, $176K, $1,68M y $704K). Hay que saber si ese 99 significa que no se
>   devuelven, antes de mapearlos.

---

## 2. ⚠️ Por qué NO va en la plantilla 27

El camino obvio sería agregarle líneas a la plantilla 27 hasta cubrir los 16 tipos. **No hacerlo**,
por tres razones:

1. **Serían ~32 líneas con auxiliares posicionales.** La 27 usa `aux1` 1/2/3/4, que no son del
   catálogo semántico. Treinta y dos números sin significado propio es exactamente la fragilidad
   que ya costó el bug de la condonación (`aux1=10` que en la plantilla 25 era una banda).
2. **La plantilla no tiene dimensión de tipo de aporte.** Habría que codificar "tipo 12" como "el
   auxiliar 17", y esa traducción vive en un `if` de Java. El día que agreguen un tipo de aporte,
   nadie sabe qué auxiliar le toca.
3. **Ya hay un patrón de la casa para esto, y está bendecido por el plan de contabilidad:** las
   bandas de cartera resuelven su cuenta desde **`CRD.BNDP`**, una tabla de configuración, no desde
   una plantilla. El `PLAN-CIERRE-CONTABLE-TOTAL.md` §4.2 lo dice: *"cuentas de banda siempre desde
   `CRD.BNDP`, nunca cableadas"*. Un tipo de aporte con 16 valores es la misma forma de problema.

### La propuesta

Una tabla de configuración, **`CRD.CTAP`** (código de 4 letras verificado libre en Java; falta
confirmarlo contra `ALL_TABLES`):

```
CTAPCDGO   PK
TPAPCDGO   FK a CRD.TPAP     — el tipo de aporte
PJRQCDGO   FK a SCP.PJRQ     — la empresa
CTAPPLNP   FK a CNT.PLNN     — cuenta de PASIVO      (el DEBE de la reclasificación)
CTAPPLNL   FK a CNT.PLNN     — cuenta de LIQUIDACIÓN (el HABER)
CTAPESTD                     — estado
UNIQUE (TPAPCDGO, PJRQCDGO)
```

**Lleva empresa** porque las cuentas son por empresa: la base tiene tres (1236, 280, 300) y las de
aportes son todas de la 1236. Sin esa columna, una segunda instalación no puede configurarse — y es
el mismo error que se corrigió en `CRD.BNDP` y en `CRD.CRCT`.

---

## 3. ⛔ EL MAPEO — esto lo confirma el usuario, NO el árbitro

**Los pares de abajo salen de que los nombres coinciden.** Eso alcanza para proponer y **no alcanza
para decidir**: si un tipo va a la cuenta equivocada, el asiento **cuadra igual** y el error no se
nota. Confirmar fila por fila, o corregir la que esté mal.

Orden: por saldo, de mayor a menor.

| Tipo | Nombre | Fam. | Saldo | Cuenta de PASIVO propuesta | Cuenta de LIQUIDACIÓN propuesta |
|---|---|---|---|---|---|
| 11 | CESANTIA PERSONAL | CE | 9,88 M | `2.1.01.05.01` APORTES PERSONALES CESANTIA | `2.3.01.05.01` LIQUIDACION APORTES CESANTIA |
| 9 | JUBILACION PERSONAL | JU | 9,20 M | `2.1.02.05.01` APORTES PERSONALES JUBILACION | `2.3.01.10.01` LIQUIDACION APORTES JUBILACION |
| 24 | RENDIMIENTO JUBILACION PERSONAL | RE | 7,30 M | `2.1.02.05.02` RENDIMIENTOS PERSONALES JUBILACION | `2.3.01.10.02` LIQUIDACION INTERESES JUBILACION |
| 12 | RENDIMIENTO CESANTIA PERSONAL | RE | 6,00 M | `2.1.01.05.02` RENDIMIENTOS PERSONALES CESANTIA | `2.3.01.05.02` LIQUIDACION INTERESES CESANTIA |
| 15 | RENDIMIENTO JUBILACION PATRONAL | RE | 5,56 M | `2.1.02.10.02` RENDIMIENTOS PATRONALES JUBILACION | `2.3.01.10.02` LIQUIDACION INTERESES JUBILACION |
| 23 | PENSION COMPLEMENTARIA | PE | 4,59 M | `2.1.02.25.01` CTA INDIVIDUAL DE PENSIONES COMPLEMENTARIAS | `2.3.01.10.03` PENSIONES COMPLEMENTARIAS POR PAGAR |
| 22 | JUBILACION RETIRO VOLUNTARIO | JU | 3,25 M | **?** `2.1.02.20` o `2.1.02.25.05` — hay dos candidatas | `2.3.01.10.01` |
| 19 | RENDIMIENTO RESERVA MATEMATICA | RE | 1,68 M | **?** no hay cuenta de reservas en `2.1.0x` | **?** |
| 13 | JUBILACION PATRONAL | JU | 1,02 M | `2.1.02.10.01` APORTES PATRONALES JUBILACION | `2.3.01.10.01` |
| 21 | CESANTIA RETIRO VOLUNTARIO | CE | 0,80 M | `2.1.01.20.05` CTA INDIVIDUAL PASIVOS CESANTIA | `2.3.01.05.01` |
| 20 | RENDIMIENTO RESERVA 5 MIL MILLONES | RE | 0,70 M | **?** ídem 19 | **?** |
| 16 | RENDIMIENTO CESANTIA PATRONAL | RE | 0,58 M | `2.1.01.10.02` RENDIMIENTOS PATRONALES CESANTIA | `2.3.01.05.02` |
| 18 | RESERVA 5 MIL MILLONES | RE | 0,18 M | **?** | **?** |
| 1 | APORTE PERSONALES | APE | 0,14 M | **?** solo 5 movimientos en toda la historia | **?** |
| 14 | CESANTIA PATRONAL | CE | 0,14 M | `2.1.01.10.01` APORTES PATRONALES CESANTIA | `2.3.01.05.01` |
| 17 | RESERVA MATEMATICA | RE | 0,05 M | **?** | **?** |

**Los ocho `?` son la parte que de verdad hay que decidir**, y son precisamente los casos donde el
nombre no basta:

- **22 JUBILACION RETIRO VOLUNTARIO:** existen `2.1.02.20` (*retiro voluntario CON relación
  laboral*) y `2.1.02.25.x` (*SIN relación laboral*). El tipo de aporte no distingue las dos
  situaciones. ¿Cuál corresponde, o hacen falta dos tipos?
- **17, 18, 19, 20 (reservas):** no hay ninguna cuenta de reservas colgando de `2.1.01` ni de
  `2.1.02`, y los cuatro tienen `TPAPIDST = 99`. **¿Se devuelven o no?** Si no, no se mapean y el
  código sigue abortando con mensaje claro, que es correcto.
- **1 APORTE PERSONALES:** 5 movimientos en toda la historia. ¿Es un tipo legado?

Los tipos **2, 3, 4, 5, 10 y 25 no tienen ningún movimiento** — no se mapean. Si algún día se usan,
el proceso falla con mensaje explícito, que es el comportamiento correcto.

---

## 4. Lo que NO cambia

- La **opción C** sigue en pie: CRD reclasifica, CXP paga.
- El **asiento de reclasificación ya está construido y verificado**. Lo único que cambia es de dónde
  saca las dos cuentas: hoy de la plantilla 27 por auxiliar, mañana de `CRD.CTAP` por tipo.
- **`TPAPPRDP` sigue haciendo falta** para el lado de CXP, y ahora se sabe cuántos productos de pago
  hay que crear: **uno por cuenta de liquidación distinta, no uno por tipo.** Son 5 como mucho.

## 5. Qué falta para poder construir

1. El usuario confirma la tabla de la §3 y resuelve los ocho `?`.
2. El árbitro escribe el DDL de `CRD.CTAP` y el script que la carga.
3. El backend cambia la resolución de cuentas del asiento —de plantilla a tabla— y expone el
   mantenimiento.
4. El usuario crea los productos de pago (uno por cuenta de liquidación) y carga `TPAPPRDP`.

**Nada de esto empieza hasta el punto 1.**
