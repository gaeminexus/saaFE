# Contrato — filtros de la bandeja de Recepción y confirmación (T3)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Módulos:** `cxp` (backend) · `tsr` (pantalla)

**Pedido del usuario, textual:**

> *«La pantalla de recepción y confirmación no me deja escoger la cuenta bancaria para poder filtrar
> los pagos recibidos por cuenta bancaria, además se demora un montón al ingresar ya que carga todos
> los registros de una vez. Mejora muchísimo esta pantalla, agregar filtros por cuenta bancaria,
> origen, fecha, descripción, y que el ingreso de la fecha, número de referencia bancaria y
> observación sea muy amigable.»*

---

## 1. 🔴 Por qué se demora — medido, no supuesto

`confirmacion.component.ts:86`:

```ts
this.pagoS.listar(this.idEmpresaSesion()).subscribe({
  next: (data) => {
    this.pagosPorConfirmar.set(
      (data ?? []).filter(p => !esDebitoAutomatico(p)
        && (p.estado === REGISTRADO || p.estado === EN_ARCHIVO))
    );
```

**Trae TODOS los pagos de la empresa y descarta la mayoría en el navegador.** Todo el historial viaja por la red en cada ingreso a la pantalla, para mostrar sólo los que están por confirmar.

**Y no es negligencia del que la escribió:** `GET /pgtr/listar` acepta **un solo** `estado`, y esta bandeja necesita **dos** (`REGISTRADO` y `EN_ARCHIVO`). Sin poder pedir los dos, la única salida era pedir todo y filtrar. **El defecto está en el contrato, no en la pantalla.**

---

## 2. El contrato nuevo — `GET /rest/pgtr/listar`

Se **extiende**, no se rompe. Todos los parámetros nuevos son opcionales y los existentes siguen igual.

| Parámetro | Hoy | Cambio |
|---|---|---|
| `idEmpresa` | `Long`, obligatorio | sin cambio |
| `estado` | `Long`, uno solo | **`List<Long>`, repetible** — `?estado=1&estado=2` |
| `idTitular` | `Long` | sin cambio |
| `idCuentaBancaria` | — | 🆕 `Long`. Cuenta **de origen** (`PGTRCNBC`) |
| `origen` | — | 🆕 **repetible**, igual que en `/porAprobar` |
| `desde` / `hasta` | — | 🆕 `yyyy-MM-dd` sobre `fechaProgramada` |
| `texto` | — | 🆕 búsqueda parcial sobre observación y nombre del beneficiario |

### ✅ Retrocompatible, y esta vez importa doble

`@QueryParam("estado") List<Long>` acepta el parámetro repetido **y el simple**, así que un
`?estado=3` de cualquier cliente viejo se comporta igual que hoy. **La pantalla de consulta y gestión
(T4) también usa `/listar`**, así que romper este contrato rompería dos pantallas, no una.

### Los predicados, sobre campos verificados

| Filtro | Campo |
|---|---|
| Cuenta de origen | `p.cuentaBancaria.codigo` (`PGTRCNBC`) |
| Origen | `p.origenExterno` (`PGTRORGN`) |
| Fechas | `p.fechaProgramada` (`PGTRFPRG`) |
| Texto | `p.observacion` (`PGTROBSR`) y el nombre del beneficiario |

⛔ **`origen` tiene la misma trampa que en `/porAprobar`:** no es una columna. Tres de sus valores
se traducen a `is not null` sobre asociaciones y el resto compara `origenExterno`. **Reusar el mismo
tratamiento**, con los paréntesis que envuelven el `OR` — sin ellos, `AND` liga más fuerte y la
segunda rama se evalúa sin el filtro de empresa.

---

## 3. La pantalla

### 3.1 Filtros

Cuenta bancaria (combo) · Origen (multi, como en la bandeja de aprobación) · Rango de fechas ·
Texto. **Todos se mandan al servidor**; nada de traer todo y filtrar en el navegador.

⚠️ **Al entrar, la pantalla pide `estado=REGISTRADO` y `estado=EN_ARCHIVO`** — los dos, en una sola
llamada. Eso solo ya elimina el problema de lentitud.

### 3.2 El ingreso de datos, que es la otra mitad del pedido

Los tres campos que se cargan al confirmar —**fecha**, **número de referencia bancaria** y
**observación**— tienen que ser cómodos:

- **Fecha**: datepicker **y** tipeo manual `dd/mm/aaaa`, como en el mayor analítico. Por defecto,
  hoy. ⚠️ Viaja como `LocalDate` → `yyyy-MM-dd`; **nunca un `Date` crudo ni nada con `Z`**.
- **Referencia bancaria**: foco automático al abrir, y que **Enter confirme** — es el campo que la
  persona teclea una y otra vez.
- **Observación**: opcional y que no estorbe.
- **Confirmación en bloque:** si se seleccionan varios pagos, poder aplicar la misma fecha y
  observación a todos de una vez, con la referencia por pago. Confirmar de a uno es lo que hace
  lenta la tarea real.

### 3.3 Y lo que ya se sabe que falta

Ordenamiento por columna, paginación y que scrollee la tabla y no la página — el mismo tratamiento
que las cinco pantallas de cheques.

---

## 4. Orden de despliegue

**Sin DDL.** **El WAR va antes que el FE**: la pantalla nueva manda `estado` repetido y los filtros
nuevos; con el WAR viejo, `estado` repetido se colapsaría a uno solo y **la bandeja mostraría de
menos sin avisar**.
