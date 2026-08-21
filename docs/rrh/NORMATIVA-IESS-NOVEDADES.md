# Normativa IESS para el empleador — novedades, planilla y lo que el módulo debe cubrir

**Escrito el 2026-08-21 (01:30), verificado contra fuentes oficiales del IESS y contra los datos
reales de ASOPREP.** Es la base de la fase «el sistema cumple cualquier novedad que el portal del
IESS requiera» y del producto comercializable. Donde una cosa no se pudo verificar sin entrar al
portal con credenciales, **lo dice explícitamente** — no se inventa un código para que la tabla
quede bonita.

> **Regla del documento:** cada afirmación normativa lleva su fuente. Cada afirmación sobre nuestro
> sistema se verificó en el código o en la BD. Lo que falta por confirmar está en el §7.

---

## 1. Cómo funciona el IESS para el empleador — el modelo que el sistema debe reproducir

**La planilla mensual de aportes NO la compone el empleador: la genera el IESS** a partir de la
historia laboral de cada afiliado. El trabajo mensual del empleador es **mantener esa historia
laboral al día registrando novedades**, y después generar la planilla en el portal, revisarla y
pagarla.

Eso lo confirma el caso de marzo de ASOPREP mejor que cualquier documento: la planilla del
2026-03 declaró a Castro Arce y Cevallos Alemán con 482,00 y 30 días porque **nadie registró el
aviso de salida a tiempo**. El IESS siguió usando el sueldo que tenía. Si el aviso hubiera entrado
dentro del plazo, la planilla habría salido bien sola. Los 208,22 pagados de más son el precio de
una novedad no registrada.

Consecuencia para el diseño: **el módulo no necesita un «generador de planilla». Necesita:**

1. **Detectar** cada hecho que la normativa obliga a notificar (entrada, salida, cambio de sueldo…)
   y crear la novedad con su **fecha límite legal**.
2. **Impedir** que un mes se cierre con novedades sin reportar.
3. **Producir una planilla de control** para contrastarla contra la que el IESS genere, antes de
   pagar. (Ya existe: es el bloque 3 de `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`, probado tres meses.)
4. **Generar el archivo de carga batch** en el formato oficial, para quien no quiera teclear.

---

## 2. Las novedades que el IESS admite — catálogo verificado

### 2.1 Las seis del portal (registro individual, en línea)

Fuente: [Guía Oficial de Trámites — Registro de novedades que afectan al trabajador](https://www.gob.ec/iess/tramites/registro-novedades-afectan-al-trabajador-0)

| # | Novedad (nombre literal del portal) | Qué es |
|---|---|---|
| 1 | **Aviso de cambio de relación de trabajo o actividad sectorial** | Cambia el código de relación (p. ej. 06 → 109) o el código sectorial del cargo |
| 2 | **Aviso de licencias sin remuneración Mat/Pat para el cuidado de los hijos** | Suspende la relación sin romperla; sin aportes durante la licencia |
| 3 | **Aviso de nuevo sueldo** | Modificación permanente del sueldo declarado |
| 4 | **Aviso de salida** | Fin de la relación, con causa |
| 5 | **Reintegro anticipado de licencia sin remuneración para el cuidado de hijos** | Cierra la licencia del punto 2 antes de su fin |
| 6 | **Variación de sueldo por extras / subrogación / encargo** | Ingreso **no permanente** de un mes (horas extras, encargo) que sube el imponible de ese mes sin cambiar el sueldo |

Más el **aviso de entrada**, que está en su propia opción del portal («Aviso de entrada y salida»).
Fuente: [IESS — Avisos de entrada y salida](https://www.iess.gob.ec/en/web/empleador/avisos-de-entrada-y-salida).

### 2.2 Los tipos de la carga batch (archivo, masivo)

Fuente: [IESS — Formatos de archivo por tipo de novedad](https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320b.html) y
[Procesos batch](https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320.jsp).

| Código | Tipo | Campos del registro (en orden, literal) |
|---|---|---|
| **ENT** | Aviso de entrada | RUC (13) · sucursal (4) · año (YYYY) · mes (MM) · `ENT` · cédula (10) · fecha ingreso (YYYYMMDD) · fecha registro (YYYYMMDD) · **jornada (1)** · **código seguro social (1)** · tipo de empleador · **relación de trabajo (2)** · denominación del cargo (≤64) · **código de actividad sectorial (13)** · sueldo (≤14) · **origen de pago (1)** |
| **SAL** | Aviso de salida | RUC · sucursal · año · mes · `SAL` · cédula · fecha salida (YYYYMMDD) · **causa (1)** · fecha fallecimiento (YYYYMMDD). **Si la causa no es muerte del trabajador, el campo va con `00000000`, NO vacío** — el IESS lo dice literal y su propio ejemplo lo confirma: `...;20030131;A;00000000` |
| **MSU** | Modificación de sueldo | RUC · sucursal · año · mes · `MSU` · cédula · nuevo sueldo (≤14) |
| **INS** | Variación de sueldo (extras) | RUC · sucursal · año · mes · `INS` · cédula · valores extras (≤14) · **causa (1)** |
| **PFM** | Fondos de reserva mensual | RUC · sucursal · año · mes · `PFM` · cédula · sueldo total · período (YYYY-MM A YYYY-MM) · meses laborados (2) · tipo de período (1: `G`) |
| **PFR / PFN / PPF** | Fondos de reserva anual y ajustes | Variantes del anterior para régimen anual / público |
| **PRA** | Retroactivos y diferencias | RUC · sucursal · año · mes · `PRA` · cédula · fecha contrato colectivo (YYYYMMDD) · valor del incremento |
| **RRT** | Trabajadores intermediados | Cambia la relación a 53 |

**Reglas del archivo (literales):** ASCII `.txt`/`.dat` · separador **`;`** · fechas **`YYYYMMDD`** ·
importes con **dos decimales y punto** · **un registro por afiliado** · **un envío por tipo de
archivo por mes** · el IESS procesa a las **11:00 y 14:00** hasta **72 horas antes del último día
hábil del mes**; fuera de eso, recargos.
Fuente: [Guía Oficial — Registro masivo (carga batch)](https://www.gob.ec/iess/tramites/registro-masivo-novedades-empleadores-carga-batch).

### 2.3 Lo que NO es novedad del empleador (para no construirlo de más)

- **Subsidios por enfermedad o maternidad**: los tramita el **afiliado** con el certificado médico.
  El empleador **sigue aportando normalmente durante el subsidio**; paga él mismo los tres primeros
  días de enfermedad si el trabajador no cumple los seis meses de aportes.
  Fuente: [IESS — Subsidios por enfermedad o maternidad](https://www.iess.gob.ec/es/web/mobile/home/-/asset_publisher/0hbG/content/subsidios-por-enfermedad-o-maternid-1/10174).
  → Para el módulo: es un **concepto de nómina** (ya existe `Subsidio IESS`, alterno 13), no una novedad.
- **Solicitud de acumulación de fondos de reserva**: la presenta el **afiliado** en su portal. Si no
  la presenta, se entiende que los quiere **mensualizados** en el rol.
  Fuente: [IESS — Fondos de reserva](https://www.iess.gob.ec/en/web/afiliado/fondos-de-reserva).
  → Para el módulo: `CNTEFRMD` (modalidad) es un dato del contrato; el empleador sólo lo **refleja**.

---

## 3. Plazos — los que el sistema debe calcular y vigilar

| Hecho | Plazo legal | Fuente |
|---|---|---|
| Afiliar al trabajador | **Desde el primer día** de trabajo | Ley de Seguridad Social, art. 73 |
| Aviso de entrada | Dentro de los **15 días** siguientes al ingreso | [IESS — obligaciones del empleador](https://iess.gob.ec/es/web/empleador/obligaciones) |
| Aviso de salida | **3 días** desde la salida | Art. 73 LSS; [IESS — plazos](https://www.iess.gob.ec/es/web/mobile/home/-/asset_publisher/0hbG/content/el-empleador-tiene-fechas-y-plazos-especificos-para-registrar-novedades/10174) |
| Modificación de sueldo y demás novedades | **3 días** desde el hecho | Art. 73 LSS |
| Carga batch | Hasta **72 h antes del último día hábil** del mes | Portal batch |

Nuestro rubro 204 ya lleva estos plazos en `PDTRVLRN` (15 / 3 / 3 / 3 / 3) y `NVISFCLM` se calcula
con ellos. **Verificado en marzo:** la salida del 06-03 generó `NVIS 12` con límite **2026-03-09**. ✔

> Nota: algunas fuentes no oficiales hablan de 15 días para el aviso de salida. **La Ley y el propio
> IESS dicen 3.** El sistema usa 3. Si una instalación quisiera ser más laxa, es parametrizable en
> el rubro, no en el código.

---

## 4. Reglas de cálculo del IESS — y cómo las cumple (o no) el sistema

### 4.1 Tasas 2026

| Concepto | Tasa | En `PRNM` 2026 | Verificado contra |
|---|---|---|---|
| Aporte personal | **9,45 %** | `PRNMAPPR = 9.45` ✔ | 20 319,00 × 9,45 % = 1 920,15 (ACMN marzo) |
| Aporte patronal | **11,15 %** | `PRNMAPPT = 11.15` ✔ | planilla: 20,60 % = 9,45 + 11,15 |
| IECE | 0,50 % | `PRNMIECE = 0.5` ✔ | |
| SECAP | 0,50 % | `PRNMSCAP = 0.5` ✔ | |
| **Contribución CCC** | **1,00 %** de la masa | **NO EXISTE** en `PRNM` | planilla: 205,60 sobre 20 560,00 (abril) |
| Fondos de reserva | **8,33 %** | `PRNMFNRS = 8.33` ✔ | planilla FR: 366,67 × 8,33 % = 30,54 |
| **Seguro de salud tiempo parcial** | **4,41 %** sobre (SBU − sueldo real) | **NO EXISTE** | **Méndez marzo: (482 − 241) × 4,41 % = 10,63 ✔ exacto** |
| SBU | 482,00 | `PRNMSBUU = 482` ✔ | |

Fuente del 4,41 %: [FAQ laboral EC — jornada parcial](https://faq-laboral-ec.blogspot.com/2016/04/preguntas-frecuentes-sobre-la-jornada-parcial-permanente.html),
y [IESS — afiliación a jornada parcial](https://www.iess.gob.ec/es/sala-de-prensa/-/asset_publisher/4DHq/content/se-simplifica-la-afiliacion-de-los-trabajadores-a-jornada-parcial/10174).
**La cifra de Méndez en el rol del cliente la confirma al centavo.** No es una suposición.

### 4.2 Jornada parcial — el modelo correcto, y el nuestro está mal

Lo que el portal del IESS pide para un contrato a tiempo parcial:

| Campo del portal | Significado | Méndez (marzo) |
|---|---|---|
| **Sueldo referencial** | El que correspondería a jornada completa, **nunca < SBU** | 482,00 |
| **Días laborados** | Reales, derivados de las horas: `8 horas = 1 día` | 15 |
| **Sueldo real** | Lo que se paga | 241,00 |

Equivalencia horas/día → días IESS (fuente FAQ laboral): 4 h → 15 · 5 h → 18 · 6 h → 22 · 7 h → 26.
Es `TRUNC(horasDía × 30 / 8)`.

**Nuestro modelo actual de Méndez:** `CNTESLRB = 241`, `CNTEJRND = 2`, `CNTEHRSM = 20`. Es decir,
**el sueldo ya partido**, y el motor produce 30 días. Eso da el imponible correcto (241) pero **los
dos campos que la planilla imprime —SUELDO y DÍAS— salen mal**, y el seguro de salud TP (10,63) no
se calcula.

**Modelo correcto (punto 11 de la lista, sube a bloqueante de la planilla):**
- `CNTESLRB` = sueldo referencial de 30 días (482).
- Días declarados = `TRUNC(horasSemanales / 5 × 30 / 8)` → con 20 h/sem: 4 h/día → **15**.
- Imponible del mes = referencial × días / 30 = 241. ✔ Mismo número que hoy.
- Seguro salud TP = (SBU − imponible) × 4,41 % = 10,63, **patronal**, en la planilla.
- `sql/40` ya pasó a Méndez a tiempo completo desde abril (482 / jornada 1 / 40 h); el modelo
  parcial sólo afecta a enero–marzo, **que están cerrados**: se corrige en la pasada de recálculo.

### 4.3 Fondos de reserva

- Derecho **a partir del mes 13** con el mismo empleador; 8,33 % del sueldo; mensualizado en el rol
  salvo que el afiliado pida acumulación.
- **Verificado con datos:** la única planilla FR del cliente es de Viteri, período junio, base
  366,67 = 2 200 × 5/30: **los cinco días desde que cumplió el año (25-06-2026)**, prorrateado.
- Nuestro motor le provisiona 183,26 **desde enero** (punto 10). **Los datos confirman la guarda
  `superaUnAnio` en las dos ramas** — el punto 10 deja de ser pregunta para Steven.
- Son **dos planillas distintas**: la normal (`OBS = NNA`) y la de FR (`OBS = NNF`), cada una con
  su comprobante.

### 4.4 La planilla normal, campo a campo (lo que el sistema debe poder reproducir)

Fuente: `REF-03 §1.2–1.3`, leído de los PDF reales.

```
Fila:      RT · CÉDULA · NOMBRE · SUELDO · DÍAS · OBS · VALOR · TIEMPO PARCIAL
           RT = 06 (Código del Trabajo) · OBS = NNA · VALOR = SUELDO × 20,60 %
Comprobante: Σ VALOR
           + 1,00 % de Σ SUELDO             (CCC)
           + intereses por mora
           + seguro de salud tiempo parcial  (4,41 % × (SBU − sueldo real), por parcial)
           + honorarios de abogado
           + gastos administrativos
           − notas de crédito
           = VALOR TOTAL  (= 21,60 % de la masa cuando todo lo demás es cero)
```

Todo eso lo tenemos o es cero, **salvo CCC y seguro TP**, que entran en `PRNM` con `sql/41`.

---

## 5. Análisis de brecha — lo que tiene el sistema contra lo que la normativa pide

### 5.1 Tipos de novedad

| Normativa | Rubro 204 hoy | Acción (`sql/41`) |
|---|---|---|
| Aviso de entrada | 1 ✔ | — |
| Aviso de salida | 2 ✔ | + código de causa IESS (1 dígito) y fecha de fallecimiento |
| Aviso de nuevo sueldo | 3 ✔ | — |
| Novedad de fondos de reserva | 4 ✔ | + período y meses laborados (formato PFM) |
| Cambio de modalidad | 5 ✔ (nuestro) | — |
| **Variación de sueldo por extras / subrogación / encargo** | **falta** | **6** — se genera sola cuando la nómina tiene horas extras, suplementarias, bonos imponibles o encargo; lleva valor y causa |
| **Cambio de relación de trabajo o actividad sectorial** | **falta** | **7** — se genera al cambiar `CNTETPRL` o el código sectorial del contrato |
| **Licencia sin remuneración Mat/Pat** | **falta** | **8** — con fecha inicio/fin; suspende aportes |
| **Reintegro anticipado de licencia** | **falta** | **9** |
| **Cambio de jornada (parcial ↔ completa)** | **falta** | **10** — es la adenda de Méndez. En el portal se registra como nuevo sueldo con días; se modela aparte porque cambia días y seguro TP, no sólo el sueldo |
| Retroactivos por contrato colectivo (PRA) | — | No se construye ahora: ASOPREP no lo usa. Queda como tipo **11** inactivo |

### 5.2 Campos que `NVIS` no tiene y el archivo exige

`NVIS` hoy: empleado, contrato, tipo, fecha hecho, fecha límite, fecha reporte, sueldo anterior,
sueldo nuevo, modalidad FR, causal, estado, observación. **Faltan:**

| Campo | Para qué | Columna nueva |
|---|---|---|
| Días declarados | ENT y cambio de jornada (tiempo parcial) | `NVISDIAS` |
| Sueldo referencial | ENT parcial | `NVISSLRF` |
| Valor de la variación | INS | `NVISVLVR` |
| Causa IESS (1 dígito) | SAL e INS | `NVISCAIS` |
| Fecha de fallecimiento | SAL causa fallecimiento | `NVISFCFL` |
| Fecha fin | Licencias | `NVISFCFN` |
| Período FR desde/hasta y meses | PFM | `NVISPRDS`, `NVISPRHS`, `NVISMSLB` |
| Respuesta del IESS (motivo de rechazo) | Estado RECHAZADA | `NVISRSPT` |
| Número de comprobante / lote | Trazabilidad del envío | `NVISLOTE` |

### 5.3 Campos que el contrato / la empresa no tienen

| Dato | Dónde va | Por qué |
|---|---|---|
| **Código de actividad sectorial (13 dígitos)** | `CNTE.CNTECDSC` | Campo obligatorio del ENT. `CNTEOCUP` (20 car.) es la ocupación MDT, no es lo mismo |
| **Relación de trabajo IESS (2 dígitos)** | rubro nuevo 227, referenciado desde `CNTETPRL` | 06 = Código del Trabajo; 109 = gerente sin relación de dependencia; otros por verificar |
| **Jornada IESS (1 dígito)** | rubro nuevo 226 | Código del ENT |
| **Origen de pago (1 dígito)** | rubro nuevo 228 | Código del ENT |
| **Código de sucursal IESS (4)** y **tipo de empleador** | parámetros de empresa | Cabecera de cada registro batch |
| **CCC 1 %** y **seguro salud TP 4,41 %** | `PRNM.PRNMCCCP`, `PRNM.PRNMSSTP` | Comprobante de la planilla |

### 5.4 Reglas de proceso que faltan

1. **No cerrar un período con novedades `PENDIENTE`.** Es la regla que habría evitado marzo.
2. **Generar la novedad 6 (variación por extras) automáticamente** al calcular una nómina con
   ingresos imponibles no permanentes. Hoy nadie la crea.
3. **Pantalla «Novedades del mes»**: lista por período con tipo, persona, fecha del hecho, fecha
   límite, días restantes, estado, y acciones marcar enviada / aceptada / rechazada (con motivo).
4. **Planilla de control** desde pantalla: el bloque 3 del contraste, con totales del comprobante
   (20,60 % + CCC + seguro TP) para cuadrar contra el portal antes de pagar.
5. **Exportar batch**: un archivo por tipo con novedades `PENDIENTE` del mes, formato del §2.2.
   Con la estructura hecha, es una plantilla de texto.

---

## 6. Lo que queda parametrizable (normativa) y lo que es del cliente

Todo lo de este documento que sea **tasa, plazo, código o catálogo va a `PRNM` o a rubros**, nunca a
una constante Java con un número dentro. Lo único que puede ir en código es el **nombre** del
parámetro. Así un cambio de SBU, de tasa o de plazo legal es un `UPDATE`, no un despliegue.

| Normativa (se queda en el producto) | Del cliente (se blanquea) |
|---|---|
| Rubros 204–205 y los nuevos 225–229 | Filas de `NVIS` |
| `PRNM` por año (SBU, tasas, CCC, seguro TP, FR, días) | La fila `PJRQCDGO = 1236` se conserva como **plantilla** y se re-apunta a la empresa nueva |
| Códigos IESS (jornada, relación, origen de pago, causa) | Códigos sectoriales **asignados a cada contrato** |
| Plazos legales (`PDTRVLRN` del rubro 204) | RUC, sucursal IESS, tipo de empleador |

El detalle tabla por tabla está en `PRODUCTO-BLANQUEO-NUEVO-CLIENTE.md`.

---

## 7. Lo que NO se pudo verificar sin credenciales — y cómo se cierra

**RESUELTO el 2026-08-21 02:00: el anexo es PÚBLICO** — [`ksempm1320c.html`](https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320c.html), la misma carpeta que el formato. No hacían falta credenciales. Los códigos están cargados en [`sql/42`](sql/42_CODIGOS_IESS_DEL_ANEXO.sql).

**Y NO SON NÚMEROS: son LETRAS.** El formato dice «1 dígito» en todos los campos, pero el anexo y los ejemplos del propio IESS usan letras — causa de salida `V`, origen de pago `P`, seguro social `R`. Un modelo que hubiera asumido numérico habría fallado en el primer envío.

**Salida:** `T` terminación del contrato · `V` renuncia voluntaria · `B` visto bueno · `R` despido unilateral del empleador · `S` supresión de partida · `D` desaparición del puesto · `I` incapacidad permanente · `F` muerte del trabajador · `A` abandono voluntario.
**Variación de sueldo:** una sola, `O` «otros», con la **suma** de todos los extras.
**Jornada:** sólo `1` (normal); el parcial no tiene código documentado.
**Seguro social:** `R` Ley 21 · `M` mixto. **Origen de pago:** `P` fondos propios · `E` presupuesto del Estado.

**Tres campos que el IESS dejó sin documentar en su propia página, literalmente:** «Codigo de tipo de empleador: codtipemp», «Codigo de relacion de trabajo: sacar una lista» y «Codigo de minimos sectoriales sacar una lista preguntar a Edison». No es que no se encontraran: **no existen en la documentación pública**. Los tres se resuelven por otra vía — el tipo de empleador es un código asignado a cada empleador (`CFNMTPEM`), la relación de trabajo la tenemos verificada (06, 109, 53) y el sectorial va por contrato (`CNTECDSC`).

**Una contradicción del IESS consigo mismo:** el ejemplo del formato de variación termina en `;X`, pero el anexo dice que la única causa es `O`. Manda el anexo.

**No se inventan.** `sql/41` crea los rubros con los valores cuyo nombre se conoce y deja el código
IESS (`PDTRVLRV`) en `'?'` donde no se pudo leer. **Tarea concreta de 10 minutos con las
credenciales de ASOPREP:** entrar a *Trámites virtuales → Empleadores → Cargas batch → Formatos y
anexos*, leer los cinco anexos y completar los `PDTRVLRV`. Hasta entonces, el exportador batch debe
**negarse a generar** un archivo que contenga un `'?'`, en vez de mandar basura al IESS.

Lo mismo con los **códigos sectoriales**: el catálogo es público
([IESS — Códigos sectoriales](https://www.iess.gob.ec/en/web/empleador/codigos-sectoriales)) pero
tiene miles de filas y cambia cada año con las comisiones sectoriales. **No se carga entero**: se
registra en cada contrato el código de su cargo, que ASOPREP ya tiene porque lo usó en los avisos de
entrada que sí presentó.

---

## Fuentes

- [IESS — Avisos de entrada y salida](https://www.iess.gob.ec/en/web/empleador/avisos-de-entrada-y-salida)
- [IESS — Obligaciones del empleador](https://iess.gob.ec/es/web/empleador/obligaciones)
- [IESS — El empleador tiene fechas y plazos específicos para registrar novedades](https://www.iess.gob.ec/es/web/mobile/home/-/asset_publisher/0hbG/content/el-empleador-tiene-fechas-y-plazos-especificos-para-registrar-novedades/10174)
- [Gob.ec — Registro de novedades que afectan al trabajador](https://www.gob.ec/iess/tramites/registro-novedades-afectan-al-trabajador-0)
- [Gob.ec — Registro masivo de novedades (carga batch)](https://www.gob.ec/iess/tramites/registro-masivo-novedades-empleadores-carga-batch)
- [IESS — Formatos de archivo por tipo de novedad (batch)](https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320b.html)
- [IESS — Procesos batch para actualizar la historia laboral](https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320.jsp)
- [IESS — Se simplifica la afiliación de los trabajadores a jornada parcial](https://www.iess.gob.ec/es/sala-de-prensa/-/asset_publisher/4DHq/content/se-simplifica-la-afiliacion-de-los-trabajadores-a-jornada-parcial/10174)
- [FAQ laboral EC — Jornada parcial y afiliación a tiempo parcial](https://faq-laboral-ec.blogspot.com/2016/04/preguntas-frecuentes-sobre-la-jornada-parcial-permanente.html)
- [IESS — Fondos de reserva](https://www.iess.gob.ec/en/web/afiliado/fondos-de-reserva)
- [IESS — Subsidios por enfermedad o maternidad](https://www.iess.gob.ec/es/web/mobile/home/-/asset_publisher/0hbG/content/subsidios-por-enfermedad-o-maternid-1/10174)
- [IESS — Códigos sectoriales](https://www.iess.gob.ec/en/web/empleador/codigos-sectoriales)
- Datos reales: `C:\Docs\Clientes\Asoprep\rrhh\REsumen\REF-02`, `REF-03`, `REF-06`
