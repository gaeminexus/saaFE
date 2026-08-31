# Contrato — generación de la tabla de amortización

**Fecha:** 2026-08-31 · **Equipo:** CRD · EQUIPO B (ciclo del crédito y seguros)
**Escrito por:** árbitro `omen-saa-1-arb` · **Backend:** implementado, **sin desplegar**

> **Por qué existe este documento.** El endpoint `generarTablaAmortizacion` cambió de forma: hasta
> hoy **duplicaba la tabla** si se lo llamaba dos veces, sin avisar y sin que el préstamo lo
> delatara. El backend ahora lo rechaza, y el frontend tiene que saber pedir la regeneración de
> forma explícita. Ver `saaBE/docs/logica-negocio/crd/REVISION-MOTOR-ANTES-DE-OTORGAMIENTO.md` §3
> (defecto N1).

---

## 1. El endpoint

```
POST /SaaBE/rest/prst/generarTablaAmortizacion/{id}/{tieneCuotaCero}?regenerar={true|false}
```

| Parte | Tipo | Notas |
|---|---|---|
| `{id}` | `Long`, path | Código del préstamo (`PRSTCDGO`). Ya tiene que estar guardado |
| `{tieneCuotaCero}` | `Long`, path | `1` = con cuota 0 de gracia, `0` = sin ella. **Sin cambios** |
| `regenerar` | `Boolean`, **query, opcional** | **NUEVO.** Ausente = `false` |

**El path y los `@PathParam` no cambiaron.** Una llamada que hoy funciona sigue funcionando
exactamente igual — solo que ahora, si el préstamo ya tiene tabla, va a recibir un error en vez de
duplicarla en silencio. Eso es lo que se quiere.

Devuelve el `Prestamo` actualizado (con `valorCuota`, `fechaFin`, `totalCapital`, `totalInteres`,
`totalPrestamo`, `tasaNominal` y `tasaEfectiva` recalculados), igual que antes.

---

## 2. Los tres comportamientos

| Situación | `regenerar` | Qué pasa |
|---|---|---|
| El préstamo **no tiene** cuotas | cualquiera | Genera la tabla. Comportamiento de siempre |
| Ya **tiene** cuotas | `false` / ausente | **HTTP 500** con un mensaje que dice cuántas cuotas tiene y que hay que pedir regeneración explícita |
| Ya tiene cuotas, **ninguna con pagos** | `true` | Borra las cuotas viejas y genera la tabla nueva |
| Ya tiene cuotas y **alguna tiene pagos** | `true` | **HTTP 500** con un mensaje que **nombra el número de la cuota** que lo impide. **No borra nada** |

**La regla de negocio, dicha por el usuario el 2026-08-31:** *«Sí se puede regenerar, pero solo se
afectan las cuotas que no estén pagadas.»* Hoy eso se implementa como todo-o-nada: con un solo pago
en cualquier cuota, la regeneración se rechaza entera. La regeneración **parcial** —preservar las
pagadas y re-amortizar el resto— se construye en el frente de reestructuración, porque es esa misma
máquina. No la anticipes en el frontend.

⚠️ **El estilo de error de la casa es `HTTP 500` con el mensaje en el cuerpo como texto plano**
(`"Error al generar tabla de amortización: ..."`), no un 409 ni un JSON de error. No lo cambies: es
la convención de todo el proyecto. Para distinguir el rechazo de un fallo real hay que mirar el
texto, no el status.

### ⛔ Y por eso hay que sacar la cadena de reintentos del servicio, primero que nada

`src/app/modules/crd/service/prestamo.service.ts:70-96` no llama a un endpoint: llama a **seis**,
encadenados con `catchError`, probando variantes de nombre (`generarTablaAmortizacion` /
`generar_tabla_amortizacion`, path params / body, sobre `prst` y sobre `dtpr`).

```ts
return this.http.post<Prestamo>(urlPrstCamelPath, null, this.httpOptions).pipe(
  catchError(() => this.http.post<Prestamo>(urlPrstSnakePath, null, this.httpOptions)),
  catchError(() => this.http.post<Prestamo>(urlPrstSnakeBody, body, this.httpOptions)),
  ...
```

Eso era una adivinanza de cuando no se sabía el contrato. **Con el rechazo nuevo se vuelve un
defecto grave:** el backend responde 500 con *"la cuota 7 ya tiene pagos registrados"*, el primer
`catchError` lo interpreta como "esta URL no era" y **sigue probando**. Las otras cinco no existen,
devuelven 404, y lo que termina llegando a la pantalla es el error de la última — **el mensaje real
del backend se pierde por el camino**.

Es decir: un rechazo de negocio y una URL equivocada son indistinguibles, y el usuario ve el
mensaje incorrecto de los dos. Toda la §3 depende de arreglar esto.

**El endpoint verdadero es uno solo y está verificado en el backend** (`PrestamoRest:330`):
`POST prst/generarTablaAmortizacion/{id}/{tieneCuotaCero}`, con los parámetros en el path y el
cuerpo vacío. Las otras cinco variantes **no existen**. Dejar solo esa, y que el error suba tal cual
por `handleError`.

---

## 3. Lo que tiene que hacer la pantalla

`src/app/modules/crd/forms/prestamo/prestamo-edit/prestamo-edit.component.ts:480`,
método `generarTablaAmortizacion()`.

1. **Antes de llamar**, mirar si el préstamo ya tiene cuotas. El componente ya las tiene cargadas en
   `detallePrestamoRaw()`; no hace falta una consulta nueva.
2. **Sin cuotas:** llamar como hoy, sin `regenerar`. Sin diálogo.
3. **Con cuotas:** abrir un diálogo de confirmación **antes** de llamar, que diga con todas las
   letras **cuántas cuotas se van a reemplazar** y que la operación no se puede deshacer. Si el
   usuario confirma, llamar con `regenerar=true`.
4. **Si el backend rechaza**, mostrar el mensaje del backend tal cual: ya viene redactado para el
   usuario final y nombra la cuota que bloquea. No lo reemplaces por un texto genérico —
   `extraerMensajeError` ya hace lo correcto.

**Por qué el diálogo no es opcional.** Hoy el botón está a un clic y sin confirmación: es el camino
por el que la tabla se podía duplicar. El guardarraíl del backend ya impide el daño, pero sin el
diálogo el usuario se come un error donde antes "funcionaba", sin entender por qué.

---

## 4. Lo que cambia en los datos que devuelve

Tres cambios en las cuotas generadas, que la pantalla muestra pero no calcula. **Ninguno rompe el
contrato**; se listan para que no sorprendan al revisar en pantalla:

| Campo | Antes | Ahora | Por qué |
|---|---|---|---|
| `saldo` (`DTPRSLDO`) | Capital pendiente | **Total de la cuota** | Defecto D5: los otros seis escritores del sistema escriben el importe por cobrar |
| `estado` / `idEstado` | `1` (de `Estado.ACTIVO`) | `1` (de `EstadoCuotaPrestamo.PENDIENTE`) | Defecto N5. **El valor no cambia**, cambia de qué catálogo sale |
| `desgravamen` | Siempre `0.00` | **Calculado**: `saldo * 1.12 / 1000` sobre el saldo de capital antes de amortizar cada cuota | Decisión U1 del usuario: la tabla real tiene que coincidir con lo que muestra el simulador |

Y en la cabecera del préstamo:

| Campo | Antes | Ahora |
|---|---|---|
| `valorCuota` (`PRSTVLCT`) | La cuota 1 | En **francesa**, la cuota **2**. En **alemana**, la primera regular |

**El motivo:** desde la corrección del defecto D1, la cuota 1 incluye el interés proporcional del
mes inicial, así que ya no representa lo que el socio paga todos los meses. Si la pantalla muestra
"valor de cuota" en algún lado, ahora va a mostrar el número correcto y **va a diferir de la primera
fila de la tabla**. Es esperado, no es un defecto: la cuota 1 realmente es más alta.

⚠️ **El seguro de incendio sigue en `0.00` por decisión explícita**, hasta que exista el modelo de
pólizas (tercer frente de este equipo). No lo trates como un dato faltante ni lo escondas.

---

## 5. Estado

**El backend está escrito y NO desplegado.** Al 2026-08-31 `main` ni siquiera compila, por un
defecto ajeno a este cambio (`CobroCreditoServiceImpl`, del equipo A). Nada de esto se puede probar
contra el servidor todavía: se implementa contra este contrato, como se hizo con los simuladores.
