# Contrato — `familia`: clasificación de las novedades de carga Petro

**Fecha:** 2026-08-31 · **Árbitro:** equipo A de `crd`
**Estado:** CONGELADO. Verificado leyendo `FamiliaNovedadCarga.java`, no el reporte del agente.
**Espejo obligatorio:** `saaFE/docs/crd/API-FAMILIA-NOVEDADES-CARGA.md`

---

## 1. Qué resuelve

El usuario pidió que la pantalla de novedades **separe visualmente** las que detienen el proceso de
las que implican gestión de cobranza. Este campo es esa clasificación.

**Sale del servidor, no se deriva en el cliente.** Es la **misma función** que decide si la carga se
bloquea (`agregarSiRequiereAfectacion` la consulta), así que la grilla y el gate **no pueden
discrepar**. Si el frontend reimplementara el criterio, en un mes divergirían y no habría forma de
saber cuál manda.

---

## 2. El campo

`GET` de cualquier novedad (`/rest/nvpc/...`) trae un campo más:

```json
{
  "codigo": 1234,
  "tipoNovedad": 13,
  "descripcion": "...",
  "montoEsperado": 120.00,
  "montoRecibido": 95.00,
  "montoDiferencia": -25.00,
  "familia": "COBRANZA"
}
```

**Tres valores exactos, en mayúsculas, tal cual:**

| Valor | Qué significa | ¿Detiene el proceso? | Qué hace el operador |
|---|---|---|---|
| `BLOQUEANTE` | llegó plata y no se sabe dónde aplicarla (sobra, o falta el dato) | **sí** | reparte con **Afectar cuotas** |
| `COBRANZA` | falta plata: se esperaba y no llegó | no | gestión de cobranza — **no se resuelve acá** |
| `INFORMATIVA` | ni una ni otra (dentro de tolerancia, cuota con otra fecha, resultados OK) | no | nada |

> ⚠️ **Es de SOLO LECTURA.** Está marcado `@JsonProperty(access = READ_ONLY)`: es un dato derivado,
> no una columna. Mandarlo en el body de un `PUT`/`POST` no hace nada — el servidor lo ignora.
> **Nadie puede "setear" la familia desde afuera.**

---

## 3. Cómo se calcula (para entenderlo, NO para reimplementarlo)

**Son dos preguntas independientes**, y confundirlas fue un error real que se corrigió hoy:

1. **¿Bloquea?** Solo si el tipo está en la lista de los que exigen afectación manual **y** la
   diferencia es `null` o `>= 0` → `BLOQUEANTE`.
2. **¿Es cobranza?** Cualquier tipo, **esté o no en esa lista**, con diferencia negativa **más allá
   de la tolerancia de $1** → `COBRANZA`.
3. Ninguna → `INFORMATIVA`.

**Por qué el punto 2 no se limita a la lista de bloqueo:** `SIN_DESCUENTOS` y `APORTE_VALORES_CERO`
—*"no se descontó nada, las cuotas pasan a mora"*, el caso más puro de cobranza que existe— **no**
están en esa lista. La primera versión los clasificaba `INFORMATIVA` y nunca le habrían llegado al
cobrador.

**Por qué la tolerancia y no `< 0`:** `DIFERENCIA_MENOR_UN_DOLAR` también tiene diferencia negativa,
y está dentro de tolerancia a propósito. Sin el umbral, la bandeja de cobranza se llena de centavos
y deja de servir.

---

## 4. Lo que la pantalla tiene que hacer

- **Dos secciones o dos colores**, `BLOQUEANTE` y `COBRANZA`. Las `INFORMATIVA` van aparte o
  colapsadas: no son accionables.
- **Solo `BLOQUEANTE` ofrece "Afectar cuotas".** `COBRANZA` e `INFORMATIVA` muestran el chip.
- **Que se vea cuántas `BLOQUEANTE` quedan**: son las que impiden procesar, y llegar a cero es la
  condición para que el archivo avance.

> ⚠️ **Reemplazá la condición interina.** Mientras no existía este campo, la pantalla usaba
> `montoDiferencia == null || montoDiferencia > 0`. Replica el criterio, pero es una copia:
> **cambialo por `familia === 'BLOQUEANTE'`** y borrá el comentario que lo marcaba como provisorio.

---

## 5. Para probarlo

| Caso | Familia esperada |
|---|---|
| `MONTO_INCONSISTENTE` con diferencia **positiva** | `BLOQUEANTE` |
| `MONTO_INCONSISTENTE` con diferencia **negativa** | `COBRANZA` — y **ya no detiene la carga** |
| `PRESTAMO_NO_ENCONTRADO` (sin montos, diferencia `null`) | `BLOQUEANTE` |
| `SIN_DESCUENTOS` / `APORTE_VALORES_CERO` | `COBRANZA` |
| `DIFERENCIA_MENOR_UN_DOLAR` (−$0.40) | `INFORMATIVA` |
| `CUOTA_FECHA_DIFERENTE` | `INFORMATIVA` |
