# Cobros personales — cobrar también el aporte de PENSIÓN COMPLEMENTARIA (tipo 23)

**Fecha:** 2026-09-16 · **Equipo:** `omen-saa-1` (crd) · **Estado:** CONTRATO CONGELADO, sin implementar
**Espejo:** `saaFE/docs/crd/API-COBRO-APORTE-PENSION-COMPLEMENTARIA.md`

---

## 1. Para qué se pide, y por qué importa saberlo

**Palabras del usuario (2026-09-16):** el cambio se pide **de forma temporal para registrar valores
que se les pagaron de más a los jubilados**. O sea: el jubilado devuelve plata y hay que meterla de
vuelta en su cuenta individual de pensión complementaria.

Eso lo conecta con H60 (el sobregiro de agosto): hasta hoy **no existía ninguna forma de recuperar un
sobrepago** — se dejó anotado como «decisión de negocio sin mecanismo». Este cobro es ese mecanismo.

**Consecuencia buscada, y hay que entenderla antes de tocar nada:** el aporte positivo de tipo 23
**sube el saldo del que la corrida mensual descuenta la pensión**. Es exactamente lo que se quiere:
lo devuelto vuelve a estar disponible y el jubilado deja de estar en «saldo agotado».
⚠️ **No afecta el ancla de H46**: el ancla la mueve el último movimiento NEGATIVO, y esto es positivo.

## 2. Decisiones del usuario (2026-09-16) — no re-litigar

| # | Decisión |
|---|---|
| 1 | **Sólo COBRAR.** No se habilita pagar préstamos con el saldo de pensión complementaria: ese saldo se paga por la pantalla de pago a jubilados. El selector de «pagar con aportes» **no** cambia |
| 2 | **Misma cuenta contable** que usa la corrida de jubilados para la cuenta individual: `2.1.02.25.01`, es decir la línea **aux1 = 53** de la plantilla **21** |
| 3 | **Sólo a jubilados.** El tipo 23 se ofrece y se acepta únicamente para partícipes en estado `JUBILADO_COMPLEMENTARIO` (alterno **3**) |
| 4 | **La columna «Valor mensual» va vacía** para este tipo: no sale del contrato ni del valor de pensión |

## 3. ⛔ Gate: la línea contable tiene que existir ANTES del WAR

`ContabilizacionIndividualCreditoServiceImpl.aux1ParaTipoAporte` ya mapea el tipo 23 → aux1 53 (está
desde el 2026-09-05), **pero la línea `DTPLAXL1 = 53` de la plantilla alterno 21 puede no existir en
producción.** El script que lo verifica y la crea es `crd/sql/199`, con su `INSERT` comentado.

**Si no existe:** el cobro se registra, se aprueba, y revienta al contabilizar — con el dinero ya
adentro. Por eso el cambio de backend de §4.1 **no se despliega sin el `199` corrido**.

## 4. Backend (`crd`)

### 4.1 `CobroCreditoServiceImpl.esTipoAporteContabilizable`

Agregar `TIPO_APORTE_PENSION_COMPLEMENTARIA = 23L` a la lista blanca, con su constante y un comentario
que diga de dónde sale la cuenta (aux1 53, plantilla 21, decisión del usuario 2026-09-16). Hoy la
lista tiene 9 (jubilación), 11 (cesantía) y 2 (adicional) porque eran los únicos con línea en la
plantilla; el javadoc de arriba de esas constantes hay que actualizarlo en el mismo cambio.

### 4.2 Guarda nueva: el tipo 23 sólo para jubilados

En la validación del registro del cobro, donde hoy se rechaza un tipo sin cuenta contable: si la línea
es de tipo 23 y la **entidad del cobro** no está en `EstadoParticipeEntidad.JUBILADO_COMPLEMENTARIO`
(alterno 3, `ENTDIDST`), rechazar con un mensaje que nombre al partícipe y su estado actual. Mismo
estilo de error que el resto (`IncomeException` con código estable), y va **en el registro**, no al
procesar: el dinero no debe entrar y quedar trabado.

**No se toca nada más:** ni el cruce contra préstamos, ni `validarDesgloseAportes`, ni la precancelación
con aportes. El tipo 23 sigue **fuera** de esos caminos.

### 4.3 Lo que ya funciona y no hay que tocar

- El asiento del cobro resuelve la cuenta por `aux1ParaTipoAporte` (23 → 53).
- `REGISTRO_APORTE` ya exige `periodoDevengo` en cada línea; el frontend lo manda.
- El aporte positivo se graba con el mismo camino que cesantía y jubilación.

## 5. Frontend (`crd`) — pantalla «Cobros personales»

Hoy los dos tipos están escritos a mano como claves `'cesantia' | 'jubilacion'` en toda la pantalla
(fila de la tabla, monto, saldo, cobertura, armado de las líneas del cobro). Se suma un tercero:

1. **Fila nueva «Pensión complementaria»** en la tabla de cuentas, con su casilla y su monto, **sólo
   visible cuando el partícipe está en estado JUBILADO_COMPLEMENTARIO (3)**. Para cualquier otro
   partícipe la fila no existe: no aparece deshabilitada, no aparece en absoluto.
2. **Saldo:** sale del mismo listado de saldos por tipo que ya alimenta a las otras dos
   (`saldosAporte()`, resuelto por nombre — el fragmento a buscar es `'pension'`, con la misma
   normalización sin tildes que usa `saldoPorNombre`). El `idTipoAporte` se resuelve igual que hoy,
   desde ese listado, **no con un literal 23 en el frontend**.
3. **Columna «Valor mensual»: vacía** (`—`). No se consulta el contrato para este tipo y **no** se
   muestra el mensaje de cobertura («este pago cubre N meses»).
4. **Línea del cobro:** se suma a las que ya arma la pantalla para `REGISTRO_APORTE`/`COBRO_MIXTO`, con
   el mismo `periodoDevengo` (primer día del mes de la fecha del pago) y el mismo formato.
5. **«Pagar con aportes» NO cambia:** el selector de cuenta de origen sigue ofreciendo sólo cesantía y
   jubilación. Decisión 1 del §2.
6. Si el listado de saldos no trae ninguna fila de pensión complementaria para ese jubilado, la fila
   se muestra con saldo 0 y se puede cobrar igual: es un aporte nuevo, no un consumo.

## 6. Trampas

- **No confundir «cobrar» con «pagar».** Este cobro **aumenta** el saldo del jubilado. El pago mensual
  lo **descuenta**. Son los dos extremos del mismo saldo y se hacen en pantallas distintas.
- **El tipo 23 no se resuelve por nombre en el backend:** es el código `23` de `CRD.TPAP`, el mismo que
  usa `PagoPensionComplementariaServiceImpl.TIPO_APORTE_PENSION_COMPLEMENTARIA`.
- **Es temporal según el usuario.** Si mañana se retira, lo que hay que sacar es la fila del frontend y
  la entrada de la lista blanca; los asientos ya emitidos quedan válidos y la línea 53 de la plantilla
  **no se borra** (la usa la corrida de jubilados).
