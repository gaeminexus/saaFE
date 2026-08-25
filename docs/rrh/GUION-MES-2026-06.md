# Guion de junio de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Escrito el 2026-08-25, ANTES de ejecutarlo.** A diferencia de los cinco anteriores, **este guion
no es un registro de lo que pasó: es un plan.** Nadie ha corrido junio en ninguna base con el motor
final. Lo que no esté aquí es hallazgo y se reporta sin interpretarlo.

## ⚠ Junio es distinto de los cinco anteriores, y en tres cosas

**1 · Es el primer mes que NO cierra en cero por diseño.** Debe salir **44,60 por debajo** del
cliente, y esa diferencia **está atribuida al céntimo antes de correrlo**. No es una desviación: es
la prueba de que el motor corregido hace lo que debe.

**2 · Es el primer mes que usa la regla nueva** —el motor responde a la norma, los datos responden a
lo que pasó— y por eso la diferencia **no se ajusta en junio**: se compensa sola en julio.

**3 · Es el mes del fondo de reserva.** Cinco personas cumplen su primer año: cuatro el **25-06** y
Bárcenas el **26-06**. Nadie más hasta que Rodríguez Valencia lo cumpla el 16-07.

---

## 0. Precondiciones — las cuatro, antes de crear nada

| Qué | Cómo se comprueba |
|---|---|
| **El WAR con el 22 y el 10 está publicado** | `javap` sobre el `.class` desplegado buscando **`baseFondosReservaProrrateada`**. Si aparece `superaUnAnio`, es el WAR viejo y **junio no se toca** |
| **Enero a mayo intactos** | Las provisiones de FR de Viteri: **cinco filas, 1 persona, 183,26 cada una**. Consulta en §7 |
| `sql/50` ejecutado | `SELECT COUNT(*) FROM RHH.CTRL WHERE CTRLANOO=2026 AND CTRLMESS=6;` |
| `sql/57` ejecutado | `SELECT * FROM RHH.CTRL WHERE CTRLALTR=31 AND CTRLMESS=6;` → **una fila, 0,10, Calderón** |

`CTRL_PARAM` se queda donde esté hasta el paso 1 del §5.

---

## 1. Fichas: nada que tocar

Nadie entra, nadie sale, nadie cambia de sueldo ni de jornada. **Y la modalidad de fondos de reserva
de Viteri se queda en 2 · ACUMULADO**, aunque el rol del cliente le pague: el IESS la tiene
declarada en la planilla de FR, así que la acumulación es lo real. Ver §6.

---

## 2. Crear el período

| Campo | Valor |
|---|---|
| Año / Mes | **2026 / 6** |
| Fecha de inicio | **01-06-2026** |
| Fecha de fin | **30-06-2026** |
| Tipo de período | **MENSUAL** |
| Modo | **1 · HISTÓRICO SIN CONTABILIZAR** |

Las fechas van en **`dd/mm/aaaa`** — una sola convención desde el despliegue del 2026-08-25.

**La comprobación del rango, inmediatamente después de guardar y antes de la primera novedad.** Es
la del §2 de cualquiera de los cinco guiones anteriores, con los cuatro veredictos: `RANGO MALO` se
borra y se rehace; `MODO` y `TIPO` se corrigen en sitio.

---

## 3. Novedades del período: ONCE

**Dos quirografarios, tres hipotecarios, cinco anticipos y un OTROS.** Todas con «Aprobada para el
cálculo» = **Sí**, que **nace en No**.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Quirografario | 1719624809 | CALDERON PARRAGA | **13,94** |
| 23 · Quirografario | 1716120769 | MANOSALVAS LLERENA | **157,21** |
| 24 · Hipotecario | 1715156574 | COSSIO CAICEDO | **490,00** |
| 24 · Hipotecario | 1716120769 | MANOSALVAS LLERENA | **379,84** |
| 24 · Hipotecario | **0909917759** | PAZMIÑO JARAMILLO | **145,30** |
| 25 · Anticipo | 1753528379 | CAIZA REMACHE | **100,00** |
| 25 · Anticipo | 1719624809 | CALDERON PARRAGA | **619,81** |
| 25 · Anticipo | 0103179537 | MOSCOSO NOVILLO | **550,00** |
| 25 · Anticipo | 1726657164 | PARDO CALLE | **400,00** |
| 25 · Anticipo | **0909917759** | PAZMIÑO JARAMILLO | **500,00** |
| **31 · Otros descuentos** | 1719624809 | CALDERON PARRAGA | **0,10** |
| | | quirografarios | **171,15** |
| | | hipotecarios | **1 015,14** |
| | | anticipos | **2 169,81** |

**Cinco cosas que cambian respecto a mayo y que hay que respetar:**

- **Caiza Remache es nueva en anticipos** (100,00). Los anticipos suben de 1 869,81 a **2 169,81**.
- **Pardo Calle vuelve a anticipos** con 400,00; en mayo no tenía.
- **Calderón baja a 13,94** —venía de 14,04— y **Manosalvas a 379,84** y **Pazmiño a 145,30**, los
  dos un céntimo por debajo de mayo. Si sale el importe de mayo, se arrastró.
- **Pazmiño Jaramillo sale dos veces**, hipotecario y anticipo, las dos por la cédula `0909917759`.
  Es el único que se repite **y el único con homónimo** — Pazmiño Moreno, `2100192463`.
- **El OTROS de Calderón, 0,10, concepto 31.** Descripción: *«Columna OTROS del rol de junio. Sin
  clasificar; el cliente confirma que se descontó y se pagó así.»*

> **El fondo de reserva NO se registra como novedad.** Lo genera el motor. Si alguien lo teclea, se
> duplica.

**Antes de calcular, la comprobación de que las once entran** —`NVNMAPRB = 'S'` y `NVNMESTD = 1`—,
que es la del §3 de los guiones anteriores.

---

## 4. El filo de Calderón, otra vez, y esta vez cae en otro sitio

**Calderón vuelve a aterrizar en neto CERO exacto**, como en febrero y en mayo:

```
700,00 − 66,15 (aporte) − 13,94 (quirografario) − 619,81 (anticipo) − 0,10 (OTROS) = 0,00
```

**Y la novedad respecto a mayo:** el concepto **31 es recortable y de orden 140**, por encima del
anticipo (120). Así que **si el neto se fuera a negativo, `recortaDescuentos` empezaría por los
OTROS y no por el anticipo** — y como sólo son 0,10, los consumiría enteros antes de pasar al
anticipo.

**El detector sigue siendo el bloque 1 vacío**, que ve el recorte caiga donde caiga. Lo que cambia
es dónde mirar primero: **el subtotal del concepto 31 en 0,10**, y sólo después el de anticipos.

---

## 5. Calcular y contrastar

**Lo que debe salir, y la diferencia está atribuida antes de correrlo:**

| | Nuestro | Del cliente | Diferencia |
|---|---:|---:|---:|
| Ingresos | ~21 071,97 | 21 116,57 | **−44,60** |
| Descuentos | 5 299,13 | 5 299,13 | 0 |
| **Líquido** | **~15 772,84** | **15 817,44** | **−44,60** |

**Los 44,60 descomponen así, y la descomposición es la prueba:**

| | |
|---|---:|
| Cuatro días de más que el cliente pagó — Bárcenas **1,95** · Muñoz 1,53 · Nieto 2,50 · Pardo 1,95 | **7,93** |
| Viteri: el cliente le paga 36,67 en el rol, nosotros la provisionamos porque está en ACUMULADO | **36,67** |
| **Total** | **44,60** |

> **⚠ Corregido el 2026-08-25: aquí decía Bárcenas 1,94 y los cuatro sumaban 7,92, no 7,93.**
> Con ese dígito la descomposición daba **44,59** — que es exactamente el número que el ESTADO
> marca como *«el que se calculó primero, salía del doceavo y era el equivocado»*. Quien
> comprobara la suma habría aterrizado en el número desacreditado y habría parado un mes correcto.
> **El bueno es 1,95**, y coincide con `sql/51`, que lo trae de los D:OTROS de julio.
>
> **De dónde sale 1,95 y por qué no es «un día de fondo de reserva»:** la diferencia no es el día
> suelto redondeado, es la **resta de dos importes redondeados por separado**. Bárcenas cumple el
> año el 26-06, así que el cliente le paga 5 días (26 al 30) y nosotros 4 (27 al 30, porque el día
> del aniversario cierra el mes doce y no devenga):
>
> ```
> cliente   700 × 5/30 = 116,6667 → × 8,33 % = 9,7167 → 9,72
> nuestro   700 × 4/30 =  93,3333 → × 8,33 % = 7,7747 → 7,77
> diferencia                                              1,95     (no 9,72 − 7,77 ≈ 1,94)
> ```
>
> Verificado el 2026-08-25 ejecutando la aritmética exacta de `RedondeoNomina`
> (`BigDecimal.valueOf` + `HALF_UP`, y `porcentaje()` = `base × p / 100` redondeado):
>
> | | días | base | nuestro | cliente | dif |
> |---|---:|---:|---:|---:|---:|
> | Bárcenas | 4 | 93,33 | 7,77 | 9,72 | **1,95** |
> | Muñoz | 5 | 91,67 | 7,64 | 9,17 | **1,53** |
> | Nieto | 5 | 150,00 | 12,50 | 15,00 | **2,50** |
> | Pardo | 5 | 116,67 | 9,72 | 11,67 | **1,95** |
> | Viteri | 5 | 366,67 | 30,54 *(provisión, no entra al rol)* | 36,67 | **36,67** |
> | | | | **37,63** | **82,23** | **44,60** |
>
> Los **30,54** de Viteri sobre base **366,67** son, al céntimo, lo que su planilla del IESS de
> junio declara. **Ese es el contraste que vale para ella**, no el rol.

**Y los D:OTROS de julio suman exactamente 44,60**, porque son la devolución de esto mismo. **Los
dos meses se anulan.**

> **Si la diferencia no es 44,60, parar.** No es «un mes que no cuadra»: es que el motor no está
> haciendo lo que se le corrigió, y hay que mirar el `javap` antes que nada.

**Contrastar en estado 3, antes de aprobar:**

1. `UPDATE RHH.CTRL_PARAM SET ANIO = 2026, MES = 6; COMMIT;` **y comprobarlo.**
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, bloque 4 primero, luego 3, luego 1 y 2, y el 1B con sus
   **dos** consultas.
3. **`PERIODO_LEIDO` = `2026-06` en cada bloque antes de mirar ninguna cifra.**

**Qué esperar en cada bloque:**

- **Bloque 1: las cinco filas del fondo de reserva**, y **sólo ésas** — el concepto 7 de Bárcenas,
  Muñoz, Nieto, Pardo y Viteri, cada uno por su diferencia de un día, más Viteri entera. **Es el
  primer mes en que el bloque 1 debe traer filas y no ser un fallo.** Cualquier otro concepto ahí es
  hallazgo, y en particular **el 31 de Calderón NO debe salir**: si sale, se recortó.
- **Bloque 2**: Calderón no debe aparecer. Los centavos de Manosalvas y Muñoz **desaparecen en
  junio** — el `sql/50` lo dice: es el primer mes que cuadra consigo mismo.
- **Bloque 3**: sin novedades esperadas.
- **Bloque 1B**: la provisión de FR pasa a **1 persona con la base prorrateada de Viteri**, no los
  183,26 de siempre. **Ese cambio es la señal de que el punto 10 se corrigió.**

---

## 6. Las dos cosas de junio que no son defecto

**Viteri cobra y acumula a la vez.** El rol le paga 36,67 y la planilla del IESS la declara con base
366,67. **Las dos son del cliente y no cuadran entre sí** — está anotado como aviso para Steven. Su
modalidad **se queda en 2**: el IESS manda.

**El cliente contaba el aniversario un día antes.** Para él, quien entra el 01-01-2025 cumple el año
el 31-12-2025; el IESS dice 01-01-2026. **Lo detectó él mismo al armar la planilla y devolvió el día
de más en julio.** Por eso junio sale corto y julio largo.

---

## 7. Al cerrar

`PRDNOBSR` debe quedar en `Calculado sin contabilizacion (carga historica).` **No pulsar
«Contabilizar provisiones».**

**Y la comprobación que no es de junio sino de los meses cerrados:**

```sql
SELECT p.PRDNMSEE AS MES, COUNT(*) AS FILAS, COUNT(DISTINCT v.MPLDCDGO) AS PERSONAS,
       SUM(v.PVNMVLOR) AS VALOR
  FROM RHH.PVNM v JOIN RHH.PRDN p ON p.PRDNCDGO = v.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND v.PVNMTPPR = 4
 GROUP BY p.PRDNMSEE ORDER BY 1;
```

**Enero a mayo tienen que seguir en 183,26 con 1 persona cada uno.** Si alguno cambió, se recalculó
un mes cerrado — y con el WAR nuevo eso lo cambia **sin tocar el neto**, así que ningún total lo
delata. Es la única comprobación que lo ve.

Junio añade su fila, con la base prorrateada de Viteri.
