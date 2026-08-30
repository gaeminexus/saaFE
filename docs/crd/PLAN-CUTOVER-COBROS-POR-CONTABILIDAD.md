# Plan de cutover — que los cobros entren de verdad por contabilidad

**Fecha:** 2026-08-30 · **Módulo:** CRD · Fase 5 del proyecto de aprobación de cobros
**Estado:** ⛔ **NO EMPEZADO.** Es lo único que falta para que el requisito del usuario se cumpla.

---

## 0. El problema, en una frase

**El circuito de aprobación está completo y no tiene entrada.**

Backend desplegado, las dos pantallas construidas y en el menú. Pero **ninguna pantalla registra
cobros**: todas las de pago siguen llamando a los endpoints directos, que aplican el pago en el
acto sin pasar por contabilidad.

Consecuencia hoy, con todo desplegado:

- La bandeja de contabilidad **siempre está vacía**, porque nada la alimenta.
- Los cobros se siguen aplicando **sin autorización**, exactamente como antes.
- El requisito del usuario —*"todos los cobros recibidos deben pasar por autorización de
  contabilidad"*— **no se cumple**, aunque toda la maquinaria exista.

No es un defecto: la fase se difirió a propósito para no romper las pantallas en producción
mientras el circuito no estuviera probado. Pero mientras no se haga, lo construido no cambia nada
para el usuario.

---

## 1. Inventario — qué llama hoy a qué

Verificado el 2026-08-30 leyendo `saaFE/src/app/modules/crd`.

Todas pasan por `service/operaciones-pago-prestamo.service.ts`.

| Origen | Método | Tipo de operación destino |
|---|---|---|
| `forms/cobros-personales/cobros-personales.component.ts:1390` | `pagarCuota` | `PAGO_CUOTA` |
| `dialog/pagos/pago-prestamo-dialog.component.ts:276` | `pagarCuota` | `PAGO_CUOTA` |
| `forms/cobros-personales/cobros-personales.component.ts:1322` | `pagarMultiplesCuotas` | `PAGO_MULTIPLE` |
| `dialog/pagos/abono-capital-dialog.component.ts:268` | `abonarCapital` | `ABONO_CAPITAL` |
| `dialog/pagos/precancelacion-dialog.component.ts:326` | `precancelar` | `PRECANCELACION` |
| `forms/cobros-personales/cobros-personales.component.ts:1489` | `registrarAporte` | `REGISTRO_APORTE` |

Son **cinco tipos**, y coinciden exactamente con los cinco del rubro 245. No falta ninguno ni
sobra: el catálogo se diseñó contra este inventario.

### ⛔ Lo que NO entra al circuito, y por qué

| Origen | Método | Por qué queda fuera |
|---|---|---|
| `cobros-personales.component.ts:1377` | `pagarConAportes` | **Decisión del usuario del 2026-08-18:** el débito automático se contabiliza de inmediato y **no pasa por la pantalla de autorización**. No volver a proponerlo |
| `dialog/pagos/pago-prestamo-dialog.component.ts:304` | `pagarConAportes` | Misma decisión |
| `forms/cruce-de-valores/cruce-de-valores.component.ts:726` | `pagarConAportes` | Misma decisión |

**Y hay una razón de fondo que la respalda:** en `pagarConAportes` **no entra dinero al banco**. Es
un traslado entre saldos del propio socio. La pregunta que responde contabilidad en la bandeja
—*¿esta plata realmente entró a la cuenta?*— **no tiene sentido** ahí: no hay depósito, no hay
comprobante, no hay referencia bancaria que verificar. Mandarlo al circuito obligaría a inventar
un respaldo que no existe.

---

## 2. Qué cambia en cada pantalla

En vez de llamar al endpoint directo, arman un `SolicitudRegistroCobro` (§4 de
`API-COBROS-APROBACION-CONTABILIDAD.md`) y llaman a `POST /rest/cbcr/registrar`.

**El cambio de fondo no es técnico, es de expectativa del operador.** Hoy aprieta *Pagar* y el
pago queda aplicado; el préstamo baja en el acto. Después de esto aprieta *Registrar* y **no pasa
nada visible en el préstamo**: queda un cobro esperando a contabilidad. Si la pantalla no lo dice
con todas las letras, el operador va a creer que falló y va a registrar el pago dos veces.

Por lo tanto, y no es negociable:

- El botón **deja de decir "Pagar"**. Dice registrar/enviar a contabilidad.
- La confirmación dice explícitamente que **queda pendiente de aprobación** y que el préstamo **no
  se modifica todavía**.
- El comprobante impreso, si se emite acá, **no puede decir que el pago se aplicó**.
- **Respaldo y referencia pasan a ser obligatorios**: son lo que contabilidad va a mirar. Hoy son
  opcionales en varias de estas pantallas.

## 3. Los endpoints viejos NO se retiran

Siguen existiendo y funcionando. `procesarCobro` **los usa por dentro** — el proceso reconstruye la
solicitud y llama al mismo motor de pago de siempre, que no se tocó.

Retirarlos sería un proyecto aparte y hoy no aporta nada. **Lo que hay que evitar es que queden
dos caminos vivos hacia la misma operación desde la interfaz**: si una pantalla registra y otra
aplica directo, el requisito se cumple a medias y nadie sabe cuál se usó.

---

## 4. Orden de trabajo sugerido

1. **`PAGO_CUOTA` primero**, en las dos pantallas que lo usan. Es el caso más simple y el más
   frecuente: sirve para validar el patrón completo —registro, bandeja, aprobación, proceso— con
   el flujo que más se ejecuta.
2. **`ABONO_CAPITAL` y `PRECANCELACION`**, que son diálogos con simulación previa. La simulación
   se queda donde está: lo que cambia es qué se hace al confirmar.
3. **`PAGO_MULTIPLE` y `REGISTRO_APORTE`**, los de varias líneas. Van al final porque el detalle
   de un cobro multilínea **no se puede editar** en la pantalla de proceso (limitación conocida,
   se corrige anulando y registrando de nuevo).

Después de cada uno, el usuario prueba ese flujo de punta a punta antes de seguir con el
siguiente. **No hacer los cinco y probar al final**: si algo del patrón está mal, se habrían
propagado cinco veces.

---

## 5. Antes de empezar — lo que hace falta que el usuario decida

1. **Cuándo.** El cutover cambia la operación diaria de la gente de crédito: dejan de aplicar
   pagos y pasan a registrarlos. No es un cambio que convenga soltar sin avisarles.
2. **Si el circuito ya se probó.** Hoy **no hay ninguna forma de crear un cobro desde la
   interfaz**, así que las dos pantallas nuevas no se pueden probar sin insertar un cobro por
   fuera (`POST /rest/cbcr/registrar` por Postman/curl, o un INSERT). Conviene probarlas así
   **antes** de migrar la primera pantalla: si el circuito tiene un defecto, es mucho más barato
   encontrarlo ahora que con la operación ya cambiada.
