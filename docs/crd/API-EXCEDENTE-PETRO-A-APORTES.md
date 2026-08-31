# Contrato — excedente de la carga Petro aplicado a un aporte

**Fecha:** 2026-08-31 · **Árbitro:** equipo A de `crd`
**Estado:** CONGELADO. Verificado **leyendo `AfectacionValoresParticipeCargaRest.java`**, no el
reporte del agente.
**Espejo obligatorio:** `saaFE/docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md`

---

## 1. Qué resuelve

Cuando la carga Petro trae más dinero del esperado para un partícipe, la pantalla hoy solo deja
aplicar el excedente a **otro préstamo**. Tiene que dejar mandarlo también a un **aporte** de
jubilación o cesantía. Es la opción ③ del §3.7 del levantamiento contable.

El backend está construido. **Falta solo la pantalla.**

---

## 2. Los endpoints

### 2.1 `GET /rest/avpc/opcionesAporte/{idNovedad}` — **nuevo**

A qué tipos de aporte puede ir el excedente de esta novedad, con el saldo actual de cada uno.

```json
{
  "idEntidad": 123,
  "mes": 7,
  "anio": 2026,
  "opciones": [
    { "idTipoAporte": 11, "nombreTipoAporte": "CESANTIA PERSONAL",   "saldoActual": 450.30 },
    { "idTipoAporte": 9,  "nombreTipoAporte": "JUBILACION PERSONAL", "saldoActual": 120.00 }
  ]
}
```

**`opciones: []` NO es un error.** Significa que el partícipe no tiene ningún tipo vigente en el
mes de esa carga: la pantalla no ofrece la opción de aporte y deja solo la de préstamo.

**`mes` y `anio` son los de la CARGA, no los de hoy.** Úsalos en el mensaje cuando la lista venga
vacía — *"no hay tipos de aporte vigentes para julio 2026"* es accionable; un desplegable vacío sin
explicación es una llamada a soporte.

**Errores posibles**, todos con cuerpo JSON `{"mensaje": "..."}`:

| Código | Cuándo |
|---|---|
| 400 | falta `idNovedad` |
| 404 | la novedad no existe, o no se encontró la entidad del partícipe |
| 500 | la novedad no está enlazada a una carga de archivo |

### 2.2 `POST /rest/avpc/batch` — **ya existía, se usa igual**

**No hace falta un endpoint de guardado nuevo.** Verificado en el código: `postBatch` no valida
`prestamo` ni `detallePrestamo`, así que una fila con esos dos en `null` y `tipoAporte` seteado se
graba sin romper.

Una fila que manda el excedente a un aporte:

```json
{
  "novedadParticipeCarga": { "codigo": 456 },
  "tipoAporte":            { "codigo": 11 },
  "valorAfectar":          150.00,
  "prestamo":              null,
  "detallePrestamo":       null
}
```

Una fila que lo manda a un préstamo sigue siendo la de siempre: `prestamo` + `detallePrestamo`
llenos y `tipoAporte` en `null`.

> ⚠️ **Es uno o el otro, nunca los dos.** La base lo impone con el CHECK
> `CK_AVPC_PRST_XOR_TPAP`. Una fila con los dos llenos, o con los dos vacíos, la rechaza Oracle con
> un error de constraint — feo de mostrar. **Validalo en la pantalla antes de mandar.**

### 2.3 `GET /rest/avpc/validar/{idNovedad}` — ya existía

```json
{ "tieneAfectaciones": true, "cantidadAfectaciones": 2, "idNovedad": 456, "totalValorAfectado": 150.0 }
```

---

## 3. La regla que la pantalla tiene que hacer cumplir

**El excedente se reparte al 100%.** Tolerancia $0,01. Si la suma de las filas no cubre el
excedente de la novedad, **el proceso del archivo se detiene** — no esa fila: **la carga entera**,
por decisión del usuario (*"si una sola parte del proceso da error, así sea pequeña, toda la carga
se detiene"*).

El backend valida esto en dos lugares, con **una sola regla** llamada desde los dos:
`AfectacionValoresParticipeCargaService.diferenciaReparto(idNovedad)`.

- En `postBatch`, como **aviso** al operador — no rechaza el lote.
- En el proceso del archivo, como **control bloqueante**.

> **Por qué el aviso no rechaza:** cada fila se persiste en su propia transacción, así que rechazar
> el lote no desharía lo ya grabado. El operador puede guardar a medias y completar después; lo que
> no puede es procesar la carga con el reparto incompleto.

**Consecuencia para la pantalla:** mostrale al operador cuánto falta o cuánto sobra, **en vivo**, a
medida que carga las filas. Si sale de la pantalla con el reparto incompleto, la carga de ese mes no
se va a poder procesar y el error va a aparecer lejos de acá, cuando alguien intente procesarla.

---

## 4. Lo que la pantalla NO hace

- **No decide el signo.** El monto va **positivo** siempre. El backend interpreta el sentido por el
  tipo de operación.
- **No genera asiento, y no hay ninguno que mostrar.** El aporte del excedente queda incluido
  automáticamente en el asiento de aplicación de la carga (`contabilizarAplicacion` lo suma vía
  `APRTIDAS`). Si la pantalla mostrara un "asiento generado" por esta operación, estaría mintiendo.
- **No pide `idEmpresa`.** Esta operación va por la carga, que ya tiene su empresa.

---

## 5. Dato que hace falta para probarlo

Una carga Petro con al menos una **novedad con excedente** (`montoDiferencia > 0`) de un partícipe
que tenga **contrato vigente** de cesantía o jubilación en el mes de esa carga — si no lo tiene,
`opcionesAporte` devuelve la lista vacía, que es correcto pero no ejercita el camino.
