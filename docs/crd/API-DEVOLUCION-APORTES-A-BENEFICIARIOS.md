# API — Devolución de aportes de un partícipe FALLECIDO, repartida entre sus beneficiarios

**Equipo:** `omen-saa-1` (CRD · EQUIPO B) · **Árbitro:** `omen-saa-1-arb` · **Fecha:** 2026-09-22
**Contrato congelado. Verificado contra el código del 2026-09-22 antes de escribirse.**
**Autorizado por el usuario el 2026-09-22**, a partir de un caso real: un cesante fallecido cuyos
aportes hay que devolver a la familia, con diez beneficiarios ya cargados.

---

## 1. ⭐ Lo primero: esto NO depende de otro equipo

**Corrección del árbitro, registrada.** Dije tres veces que la entrega a beneficiarios estaba
bloqueada por el producto de pago de CXP contra `2.3.90.90.11`. **Eso vale para el VALOR DE SEPELIO,
no para esto.** Son dos frentes distintos y los estuve mezclando:

| Frente | De dónde sale la plata | Producto de pago | Estado |
|---|---|---|---|
| Valor de sepelio (lo entrega la aseguradora, entra por `CRD.RVSG`) | cuenta `2.3.90.90.11` | ⛔ **falta**, es de `omen-saa-2` | bloqueado |
| **Devolución de aportes del fallecido** | los aportes del propio partícipe | ✅ **ya existe**: `TipoAporte.getProductoPago()` | **ESTE CONTRATO** |

`DevolucionAporteServiceImpl:298` usa el producto de pago **del tipo de aporte**, ya parametrizado y
funcionando en producción. **El circuito completo —orden, asiento, pago, reemisión (H65)— ya está.**
Lo único que falta es **a quién se le transfiere**.

---

## 2. Qué hay hoy, medido

- `registrarDevolucion` **no valida el estado del partícipe**: un fallecido **no está bloqueado**.
- La cuenta destino pasa por `validarCuentaBancariaParticipe:1523`, que exige que la cuenta
  **pertenezca al partícipe y esté activa** ⇒ **la única cuenta que acepta es la del muerto.**
- El pago se arma con `armaBeneficiario(entidad, cuentaParticipe)` (`:1558`), que denormaliza los
  datos del **partícipe** en un `BeneficiarioOcasional` de CXP. **CXP ya acepta un tercero**: no hay
  que crear ningún `Titular`.

⇒ Hoy el sistema **deja** registrar la devolución de un fallecido y le paga **a su propia cuenta**.

---

## 3. ⛔ LA DECISIÓN DE DISEÑO QUE MANDA SOBRE TODO LO DEMÁS: N devoluciones, no N órdenes

La idea intuitiva —una devolución repartida en N órdenes de pago— **no se puede hacer**, y no es una
preferencia:

`registrarPagoDeOrigenExterno` recibe `idOrigen = devolucion.getCodigo()`, y **CXP rechaza un segundo
pago vivo para el mismo `(origen, idOrigen)`** (`PagoProgramadoServiceImpl:1087-1089`:
*«ya tiene un pago vigente. Anúlelo o reviértalo antes de registrar otro»*).

⇒ **Se genera UNA DEVOLUCIÓN POR BENEFICIARIO**, cada una por su parte del total. Cada una tiene su
propio `DVAP`, su propio `idOrigen`, su propia orden y su propio pago.

⭐ **Y esto no es un rodeo: es mejor que la alternativa.** Cada beneficiario queda con trazabilidad
propia, y si el pago de uno rebota se **reemite sólo el suyo** con `POST /dvap/{id}/reemitirPago`,
que ya existe y funciona (H65). Con una orden compartida, un rebote obligaría a reversar todo.

---

## 4. El endpoint nuevo

### `POST /rest/dvap/registrarParaBeneficiarios`

**Cuerpo:** el mismo de `registrarDevolucion` **menos `idCuentaBancariaParticipe`** (no aplica: el
destino sale de los beneficiarios).

**Qué hace, en orden:**

1. **Verifica que el partícipe esté fallecido** — `ENTDIDST = 5` (`EstadoParticipeEntidad.CESANTE_FALLECIDO`,
   código alterno). Si no lo está → **400**, `PARTICIPE_NO_FALLECIDO`, y que el mensaje remita al
   endpoint normal.
2. **Trae sus beneficiarios ACTIVOS** (`estado = 1`) de `CRD.CBBP`. Si no hay ninguno → **400**,
   `SIN_BENEFICIARIOS`, diciendo que se carguen en la ficha del partícipe.
3. ⭐ **Valida que los porcentajes de los activos sumen exactamente 100.** Si no → **400**, diciendo
   **cuánto suman**. Es acá y no al cargarlos: el contrato de `CBBP` §4 puso la guarda en el pago
   justamente porque exigirla al guardar impide cargar al primero.
4. **Reparte el valor total** por porcentaje (§5).
5. **Por cada beneficiario, registra una devolución completa** reusando el camino que ya existe:
   mismo cálculo de tipos y saldo, mismo desglose contable, misma orden de pago. Lo único distinto es
   que el `BeneficiarioOcasional` se arma con los datos **del beneficiario** (nombre, identificación,
   banco, cuenta de `CBBP`) en vez de los del partícipe.
6. Devuelve **la lista de devoluciones creadas**, con su código, el beneficiario y el valor.

| Código | Cuándo |
|---|---|
| **201** | creadas. Cuerpo: `[{ idDevolucion, idBeneficiario, nombre, identificacion, valor, idPago }]` |
| **400** | partícipe no fallecido · sin beneficiarios activos · los porcentajes no suman 100 · lo que ya valida el endpoint normal (saldo, tipos, producto de pago) |
| **500** | error inesperado |

### ⛔ Y una guarda en el endpoint VIEJO

`registrarDevolucion` (el normal) **debe rechazar** con **400** si el partícipe está fallecido **y
tiene beneficiarios activos cargados**, remitiendo al endpoint nuevo.

**Por qué así y no cambiando el viejo para que elija solo:** el camino de los partícipes vivos
funciona y no se toca. Que un endpoint cambie de destinatario según el estado del partícipe es
exactamente la «marca mágica» que este equipo ya rechazó en el diseño de sepelio §4. **Explícito
siempre.** Y la guarda impide que alguien le pague por error a la cuenta de un muerto.

⚠️ Si el partícipe está fallecido y **no** tiene beneficiarios, el endpoint viejo **sigue
funcionando** como hoy: hay casos históricos y no se rompe nada que ya ande.

---

## 5. El reparto, y el centavo

**Decisión del usuario (2026-09-21), la misma de sepelio:** el residuo va **al beneficiario de mayor
porcentaje**; si empatan, **al de menor código**.

```
valor_i = redondear(total × porcentaje_i / 100)     para cada beneficiario
residuo = total − Σ valor_i
valor_del_mayor += residuo
```

⛔ **La guarda dura, y es la que hay que escribir primero:** `Σ valor_i` tiene que dar
**exactamente** el total a devolver. Si no cuadra, **no se registra ninguna devolución**: se lanza y
se revierte todo. Nunca se reparte de más ni de menos.

⭐ Este fondo ya se quemó con un residuo abandonado (**H48**, la cascada de pagos). El redondeo
por línea **no alcanza**: la guarda es sobre la suma.

---

## 6. Transaccionalidad — la decisión que evita el peor escenario

**Las N devoluciones se registran en UNA sola transacción.** Si la del beneficiario 3 falla, **se
revierten las tres**.

⛔ **No** se hace «best effort» sumando a un contador de errores. La razón está medida hoy mismo:
**H78** — el proceso de seguro médico atrapa el error de cada jubilado, lo suma a `conError` y sigue,
y así ocho jubilados se quedaron sin cobrar **sin que nadie se enterara**. Repartir la plata de un
fallecido a medias entre su familia es peor: **o cobran todos o no cobra ninguno**, y el operador se
entera en el acto.

---

## 7. La pantalla

En **Devolución de Aportes**, cuando el partícipe elegido está fallecido:

1. En lugar del selector de cuenta bancaria del titular, mostrar **la tabla de beneficiarios** con su
   porcentaje y **el valor que le toca a cada uno**, recalculado al cambiar el monto.
2. El total repartido siempre visible, **y que cuadre con el valor a devolver** — es la misma guarda
   que hace el backend, mostrada antes de apretar.
3. Si no suman 100 o no hay beneficiarios, **explicar qué falta y llevar a la ficha del partícipe**,
   que es donde se cargan.
4. Al confirmar, avisar que **se van a generar N devoluciones**, una por beneficiario, y mostrarlas
   después con su número.

---

## 8. Lo que este contrato NO cubre

- **El valor de sepelio** (`CRD.RVSG` → beneficiarios). Sigue bloqueado por el producto de pago de
  CXP contra `2.3.90.90.11`, que es de `omen-saa-2`. **Es otro frente**, aunque comparta la tabla de
  beneficiarios y la regla del centavo.
- **Anular un reparto entero.** Hoy se anularía devolución por devolución con lo que ya existe.
  Si hace falta anular las N juntas, es una decisión y un frente aparte — **no se improvisa acá**.
