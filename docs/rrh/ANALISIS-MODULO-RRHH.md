# Análisis del módulo RRHH — Estado actual y trabajo requerido

**Cliente:** ASOPREP-FCPC · **Sistema:** SAA (saaBE + saaFE) · **Fecha de análisis:** 2026-08-19

Este documento inventaría qué existe hoy en el módulo de Recursos Humanos, qué falta para
cumplir la normativa ecuatoriana (IESS, SRI, Ministerio del Trabajo), y el trabajo concreto
en base de datos, backend y frontend para cerrar la brecha.

Todo lo afirmado aquí fue verificado contra el código fuente en la fecha indicada. Cuando una
afirmación proviene de documentación previa y no del código, se indica explícitamente.

---

## 1. Resumen ejecutivo

**El módulo RRHH aparenta estar construido y no lo está.**

Existen 23 entidades JPA con sus cinco capas completas en el backend (115 archivos Java) y
~192 archivos en el frontend Angular. Superficialmente parece un módulo terminado. En realidad
es un **esqueleto CRUD generado por plantilla**:

- Los 23 `serviceImpl` suman **2.309 líneas sin una sola operación aritmética**. Son el mismo
  archivo repetido 23 veces, cambiando solo el nombre del tipo.
- No existe **ningún endpoint de proceso**: ni `/calcular`, ni `/cerrarPeriodo`, ni `/aprobar`,
  ni `/liquidar`. Solo los 6 métodos CRUD genéricos por entidad.
- **`ReglonNomina` no tiene concepto ni descripción.** Un renglón de nómina es literalmente un
  número anónimo, lo que hace la tabla inservible tal como está.
- No hay catálogo de conceptos de nómina, ni parámetros normativos, ni tabla de impuesto a la
  renta, ni cargas familiares, ni datos bancarios, ni acumulados de décimos.
- Las 4 pantallas de procesos del frontend (nómina, roles de pago, liquidación, aportes) tienen
  **la UI terminada con 0 % de conexión al backend**, con ~15 `TODO` explícitos y mensajes
  *"disponible en fase funcional"* visibles al usuario final.
- Los 4 componentes de reportes son **mocks literales** de 21 líneas con 2 filas hardcodeadas.
- Los 4 reportes Jasper que existen en el servidor **consultan tablas del módulo de Crédito**;
  son copias de scaffolding sin ninguna relación con RRHH.

**Conclusión:** el trabajo pendiente no es "completar" el módulo sino **construir la capa de
negocio completa sobre un esqueleto que además tiene defectos que hay que corregir primero**.
El modelo de datos actual **no soporta** nómina ecuatoriana; requiere tablas nuevas, no solo
campos adicionales.

Lo que sí sirve y se conserva: la estructura de 5 capas, las 10 pantallas de parametrización y
gestión que sí están conectadas, y la cobertura 23/23 de modelos en el frontend.

---

## 2. Alcance acordado

| Tema | Decisión |
|---|---|
| Marcaciones | Importación desde reloj biométrico **y** registro manual |
| Integración | La nómina aprobada genera asiento contable en CNT **y** el pago en TSR/CXP |
| Salidas oficiales | RDEP (SRI), planilla IESS, formularios MDT/SUT, y reportes internos |
| Relación laboral | Indefinido, ocasional/plazo fijo, parcial o por horas, y servicios profesionales |
| Frontend | Rehacer el módulo completo sobre el design system y `table-basic-hijos` |
| Empleado ↔ Partícipe | Se mantienen **separados**; sin FK entre `RHH.MPLD` y `CRD.ENTD` |
| Conceptos de nómina | Préstamos IESS, préstamos y anticipos internos, utilidades 15 %, jubilación patronal y desahucio, impuesto a la renta |

### 2.1 Cronograma y su riesgo

El cliente definió esta secuencia de puesta en marcha:

1. Migrar saldos al **31-dic-2025**. Todo el personal ingresó desde junio de 2025 en adelante
   (hubo cambio de administración, incluido el gerente general), de modo que las antigüedades
   son cortas y los acumulados manejables.
2. Cargar **enero–julio 2026 en modo histórico, sin conexión a contabilidad**.
3. Operar en vivo **con contabilización desde agosto de 2026**.

**Riesgo:** hoy es 19 de agosto de 2026, así que el punto 3 ya venció. Esto se traduce en dos
requisitos de diseño que el plan incorpora:

- `PeriodoNomina` lleva un **interruptor de contabilización** (`PRDNCNTB`), para poder calcular
  y recalcular períodos históricos sin emitir asientos contables.
- Las fases priorizan el motor de cálculo y la carga histórica por encima de las salidas
  oficiales, cuyos vencimientos legales son posteriores.

**Decisión abierta:** si el primer período contabilizado se corre a septiembre de 2026, o si se
acepta contabilizar agosto de forma retroactiva. Esto lo debe definir el cliente con su contador.

---

## 3. Marco normativo aplicable

Los siguientes valores se verificaron el 2026-08-19. **Se documentan como datos de carga
inicial, no como constantes de código**: todo el diseño los parametriza por año, porque cambian
todos los eneros.

### 3.1 Parámetros vigentes 2026

| Concepto | Valor 2026 | Base legal / fuente |
|---|---|---|
| Salario Básico Unificado (SBU) | USD 482 (2025: 470) | Acuerdo Ministerial, vigente 01-ene-2026 |
| Aporte personal IESS | 9,45 % | IESS, sector privado |
| Aporte patronal IESS | 11,15 % | IESS, sector privado |
| IECE + SECAP | 0,5 % + 0,5 % (patronal) | IESS |
| Fondos de reserva | 8,33 % a partir del año de servicio | Código del Trabajo |
| Fracción básica desgravada IR | USD 12.208 anuales / 1.017,33 mensuales | Resolución SRI NAC-DGERCGC25-00000043 |
| Canasta familiar básica (ene-2026) | USD 821,80 | INEC |

> **Nota:** durante el levantamiento se mencionó un umbral aproximado de 11.000 para el impuesto
> a la renta. Ese valor corresponde a tablas de años anteriores (2024: 11.722; 2025: 12.081).
> El vigente para 2026 es **12.208**.

### 3.2 Reglas de cálculo

**Décimo tercero (CT Art. 111)** — Suma de las remuneraciones percibidas dividida para 12.
Período de cálculo: 1 de diciembre al 30 de noviembre. Pago hasta el 24 de diciembre.
Puede pagarse mensualizado a elección del trabajador.

**Décimo cuarto (CT Art. 113)** — Un SBU completo (USD 482 en 2026). Período y fecha de pago
según región: Sierra y Amazonía del 1-ago al 31-jul, con pago hasta el 15 de agosto; Costa e
Insular del 1-mar al 28-feb, con pago hasta el 15 de marzo. Proporcional por días trabajados
sobre base 360. También puede mensualizarse.

**Fondos de reserva** — 8,33 % de la remuneración, desde el segundo año de servicio.
Mensualizado o acumulado en el IESS, a elección del trabajador.

**Vacaciones (CT Art. 69)** — 15 días por año cumplido, más 1 día adicional por cada año a
partir del quinto, con tope de 30 días.

**Horas extra (CT Art. 55)** — Suplementarias con recargo del 50 % (hasta las 24h00);
extraordinarias con recargo del 100 % (nocturnas, fines de semana y feriados).

**Impuesto a la renta bajo relación de dependencia** — Tabla progresiva anual por tramos
(fracción básica, impuesto sobre la fracción básica, porcentaje sobre el excedente). El aporte
personal al IESS se deduce de la base imponible. La retención se proyecta al inicio del
ejercicio y se prorratea mensualmente, con recálculo cuando cambian los ingresos.

**Rebaja por gastos personales** — 18 % de los gastos personales declarados, con tope según el
número de cargas familiares: 7 canastas básicas sin cargas (USD 1.035,47 en 2026), 9 con una
carga, 11 con dos, hasta 20 canastas con cinco o más (USD 2.958,48). En enfermedades
catastróficas, raras o huérfanas el límite es de 100 canastas (USD 14.792,40).

Califican como carga familiar los padres, el cónyuge o conviviente, y los hijos de hasta 21
años —o con discapacidad sin límite de edad— que dependan económicamente del contribuyente y
no perciban ingresos gravados superiores a un SBU.

### 3.3 Obligaciones de reporte

| Entidad | Obligación | Plazo |
|---|---|---|
| SRI | Anexo RDEP en XML + formulario 107 por empleado | Anual |
| IESS | Planilla de aportes y fondos de reserva | Mensual |
| IESS | Aviso de entrada | 15 días desde el ingreso |
| IESS | Aviso de salida y novedades de sueldo | 3 días desde el hecho |
| MDT (SUT) | Décimo tercero, décimo cuarto, utilidades | Según calendario anual |
| MDT (SUT) | Acta de finiquito | 30 días desde la terminación |

---

## 4. Estado actual del backend

### 4.1 Lo que existe

23 entidades en `com.saa.model.rhh`, cada una con sus cinco capas según
`docs/estandar/ESTANDAR_MAPEO_CAPAS.md`:

| Entidad | Tabla | Entidad | Tabla |
|---|---|---|---|
| AnexoContrato | `NXOO` | Marcaciones | `MRCC` |
| AportesRetenciones | `PRTE` | Nomina | `NMNA` |
| Cargo | `CRGO` | PeriodoNomina | `PRDN` |
| Catalogo | `CTLG` | Peticiones | `PTCN` |
| ContratoEmpleado | `CNTE` | ReglonNomina | `RNGL` |
| Departamento | `DPRT` | ResumenNomina | `RSMN` |
| DepartamentoCargo | `DPTC` | RolPago | `RLPG` |
| DetalleLiquidacion | `TMLQ` | SaldoVacaciones | `SLDV` |
| DetalleTurno | `DTLL` | SolicitudVacaciones | `SLCT` |
| Empleado | `MPLD` | TipoContratoEmpleado | `TPCE` |
| Historial | `HSTR` | Turno | `TRNO` |
| Liquidacion | `LQDC` | | |

Todas usan `@GeneratedValue(IDENTITY)`, schema `RHH`, y auditoría `XXXXFCHR` / `XXXXUSRR`.
El CRUD genérico heredado de `EntityDaoImpl` funciona.

### 4.2 Brechas del modelo de datos

**`Empleado` (`RHH.MPLD`) — 8 campos reales.** Tiene identificación, apellidos, nombres, fecha
de nacimiento, email, teléfono, dirección y estado. Falta absolutamente todo lo demás:

| Requisito normativo | Estado |
|---|---|
| Estado civil, género, nacionalidad | Ausente |
| Tipo de identificación (cédula / pasaporte / RUC) | Ausente (solo un String plano) |
| Nivel de instrucción, profesión | Ausente |
| Discapacidad (% y carné CONADIS) | Ausente — obliga a exoneración de IR y cuota MDT |
| **Cargas familiares / dependientes** | **No existe ninguna entidad** |
| **Gastos personales proyectados** | **No existe ninguna entidad** |
| Banco, tipo y número de cuenta | Ausente — sin esto no hay acreditación de sueldos |
| Código de afiliación IESS | Ausente |
| Fecha de ingreso a la empresa | Ausente (solo indirecta vía `ContratoEmpleado.fechaInicio`) |
| Región para el décimo cuarto | Ausente |
| FK a `Empresa` | **Ausente** — el empleado no pertenece a ninguna empresa |

**`ReglonNomina` (`RHH.RNGL`) — inservible tal como está.** Verificado leyendo la entidad:
tiene `cantidad`, `valor`, `imponible`, `orden` y auditoría. **No tiene concepto, ni
descripción, ni FK a ningún catálogo.** Es imposible saber qué representa un renglón.

**`AportesRetenciones` (`RHH.PRTE`)** — usa `entidad` y `concepto` como texto libre. Es un
contenedor genérico: podrían meterse ahí el 9,45 % y el 11,15 %, pero nada en el código los
define, valida ni calcula, y no hay versionado de tasas por vigencia.

**`RolPago` (`RHH.RLPG`)** — es únicamente un puntero a un PDF (`RLPGPDFO`) más número, fecha y
estado. **No tiene ningún valor monetario.**

**`PeriodoNomina` (`RHH.PRDN`)** — año, mes, fechas y `estado` como `String`. Sin interruptor de
contabilización, sin referencia al asiento generado, sin fecha de aprobación.

**Lo que no existe en absoluto:**

- Catálogo de conceptos de nómina con su configuración y fórmula
- Parámetros normativos versionados por año (SBU, tasas, canasta)
- Tabla de impuesto a la renta por año y tramo
- Cargas familiares y gastos personales proyectados
- Descuentos recurrentes (préstamos IESS, anticipos, préstamos internos)
- Acumulados de décimos y fondos de reserva
- Horas extra tipificadas (solo hay un `minutosExtra` sin distinguir 50 % de 100 %)
- Novedades IESS (avisos de entrada, salida, modificación de sueldo)
- Causales de terminación laboral
- Saldos de apertura para la migración

**Problemas de tipos:** dinero mapeado como `Double` en casi todas las entidades —inaceptable
para nómina por acumulación de error de redondeo— salvo `ReglonNomina`, que sí usa
`BigDecimal`. Horas como `String` (`TRNOENTR`, `DTLLENTR`, `RSMNENTR`), lo que impide calcular
horas extra en SQL o JPQL sin parsear. Estados como `String` libre en vez de rubros.

### 4.3 Ausencia de lógica de negocio

Los 23 `*ServiceImpl` tienen ~100 líneas cada uno con exactamente los mismos 6 métodos de
`EntityService`: `save`, `remove`, `selectAll`, `selectById`, `selectByCriteria`, `saveSingle`.

- `NominaServiceImpl` **no calcula nada**; `save()` persiste lo que llega del cliente sin
  siquiera sumar `totalIngresos`.
- `LiquidacionServiceImpl` no calcula finiquito, ni proporcionales, ni desahucio.
- `RolPagoServiceImpl` no genera PDF ni numera.
- `SaldoVacacionesServiceImpl` no acredita días ni los descuenta al aprobar una solicitud.
- `MarcacionesServiceImpl` no consolida marcaciones ni calcula atrasos.

Los DAOs tampoco aportan: las 23 interfaces son cuerpos vacíos y ningún `daoImpl` tiene
`@PersistenceContext` ni consultas personalizadas.

### 4.4 El módulo no usa rubros

Contra el estándar del resto del ERP, RHH no usa `Rubro`/`DetalleRubro` (`SCP.PRBR` /
`SCP.PDTR`). Todos sus campos `estado` son `String` libres. No existe ninguna interfaz de
constantes de RRHH en `com.saa.rubros`.

El último `codigoAlterno` ocupado es **178** (`ASP_TOLERANCIA_DIAS_CONCILIACION_CONTABLE`), de
modo que los rubros nuevos de RHH arrancan en **179**.

Además, `com.saa.rubros.ModuloSistema` solo tiene `CONTABILIDAD`, `TESORERIA`,
`CUENTAS_POR_PAGAR`, `CUENTAS_POR_COBRAR` e `INGRESO = 99`. **No existe constante de Recursos
Humanos**, necesaria para etiquetar los asientos contables de nómina.

### 4.5 Sin DDL versionado

No existe ningún archivo `.sql` de creación del esquema RHH en el repositorio. Las 41 tablas
con DDL versionado corresponden a CNT, CRD, CXC, CXP, PETRO, REPORTES y TSR. Las tablas de RHH
se crearon manualmente en Oracle y no hay forma de reproducir el esquema desde el repositorio.

### 4.6 Defectos concretos verificados

| # | Defecto | Ubicación | Efecto |
|---|---|---|---|
| 1 | `@Path("rngk")` en vez de `rngl` | `ws/rest/rhh/ReglonNominaRest.java:25` | El frontend llama `/rngl` → 404 |
| 2 | `@Path("SLDV")` en mayúsculas | `ws/rest/rhh/SaldoVacacionesRest.java:25` | JAX-RS es case-sensitive → saldo de vacaciones inalcanzable |
| 3 | Colisión de `@Path("hstr")` | `rhh/HistorialRest.java:25` y `crd/HistorialSueldoRest.java:25` | Dos recursos JAX-RS con el mismo path en la misma aplicación |
| 4 | `Historial.departamento` mal mapeado | `model/rhh/Historial.java:49` | `@ManyToOne` a `DepartamentoCargo` con `@JoinColumn(name="DPRTCDGO")` cuando su PK es `DPTCCDGO` |
| 5 | `obtieneCampos()` copiado de otro módulo | 18 de 23 `daoImpl` | Devuelven `proposicionPagoXCuota`, `nivelAprobacion`, `usuarioAprueba`… → `selectByCriteria` roto en Nómina, Liquidación, Rol de Pago y 15 más |
| 6 | Typos en `obtieneCampos()` | `CargoDaoServiceImpl` (`requiositos`), `EmpleadoDaoServiceImpl` (`apellido`) | Búsqueda por esos campos no funciona |
| 7 | `EmpleadoRest.delete()` salta el service | `ws/rest/rhh/EmpleadoRest.java:107` | Llama directo al DAO, rompiendo la capa |

Detectadas de paso, fuera del alcance de RRHH pero conviene registrarlas: colisiones de
`@Path("dtdc")` y `@Path("dtdp")` entre otros módulos.

### 4.7 Reportes

`src/main/resources/rep/rhh/` está **vacía**.

Existe una carpeta hermana `rep/rrhh/` con 4 plantillas —`RPRT_TBLA_ASMN`, `RPRT_TBLA_HSVC`,
`RPRT_TBLA_NMCS`, `RPRT_TBLA_RLPI`— cuyos nombres sugieren asistencia, historial de vacaciones,
nómina consolidada y rol de pago individual. **Las cuatro contienen la misma consulta:**

```sql
FROM crd.APRT a, crd.TPAP t, crd.ENTD e
```

Es decir, son copias del reporte de aportes de partícipes del módulo de Crédito, con parámetros
`P_ENTDCDGO` y `P_TPAPCDGO`. No tienen ningún campo de RRHH. **No sirven y deben eliminarse.**

Además `ReporteServiceImpl.esModuloValido()` solo acepta `{cnt, tsr, crd, cxc, cxp, rhh}`, de
modo que la carpeta `rrhh/` es inalcanzable por el endpoint aunque tuviera contenido válido:
pedir `modulo:"rrhh"` devuelve 400 y pedir `modulo:"rhh"` devuelve 404.

---

## 5. Estado actual del frontend

`src/app/modules/rrh` tiene 14.134 líneas de TypeScript, 37 componentes, 27 servicios y 26
modelos. La cobertura de modelos es **23/23** respecto de las entidades del backend.

### 5.1 Nivel de funcionalidad por área

| Área | Pantallas | Estado |
|---|---|---|
| Parametrización | Cargos, departamentos, asignación depto-cargo, tipos de contrato, turnos | **Conectada y funcional** |
| Gestión | Empleados, historial de cargos, contratos, vacaciones, permisos, asistencia | **Conectada**, con 3 pantallas rotas por endpoints |
| Procesos | Nómina, roles de pago, liquidación, aportes-retenciones | **UI completa, 0 % backend** |
| Reportes | Roles, vacaciones, asistencia, nómina | **Mock literal** |

### 5.2 Endpoints rotos

De las 24 constantes de `modules/rrh/service/ws-rrh.ts`, **5 no funcionan**:

| Constante | URL frontend | Backend real | Problema |
|---|---|---|---|
| `RS_HSTR` | `/hsrt` | `hstr` | Typo en el frontend (letras invertidas) |
| `RS_RNGL` | `/rngl` | `rngk` | Typo en el backend |
| `RS_SLDV` | `/sldv` | `SLDV` | Mayúsculas en el backend |
| `RS_RBRO` | `/rbro` | — | No existe ningún `@Path("rbro")` en el sistema |
| `RS_TPPR` | `/tppr` | `crd/TipoPrestamoRest` | **Devuelve tipos de préstamo del módulo de Crédito en una pantalla de RRHH** |

El caso de `RS_TPPR` es el más grave porque no falla: devuelve datos válidos pero del dominio
equivocado. Además `RS_PMLS` está documentado en el propio código como temporal —permisos y
licencias reutiliza el endpoint de solicitudes de vacaciones (`/slct`) porque no existe una
entidad dedicada en el backend.

### 5.3 Pantallas de procesos: UI sin backend

Las 4 pantallas de procesos están construidas visualmente pero desconectadas a propósito, con
evidencia literal en el código:

- `procesos/nomina/nomina-list.component.ts:111` fija `dataSource.data = []` y muestra
  *"Pantalla de Nómina lista para integrar con servicios RRHH"*.
- Los filtros, anular, imprimir y **guardar** responden *"disponible en fase funcional"*
  (líneas 146, 178, 183, 205).
- `procesos/roles-pago/rol-pago-list.component.ts` tiene el mismo patrón en 6 acciones.
- `aporte-retencion-form.component.html:30` muestra al usuario final
  *"Catálogo de contratos pendiente de integración"*.
- `matTooltip="Disponible en fase funcional"` aparece en las plantillas de nómina y roles.

Los 4 componentes de reportes son de 21 líneas con datos hardcodeados del tipo
`{ nombre: 'Ana Pérez · 2026-01-10 · 08:02/16:00', estado: 'Presente' }`.

### 5.4 Problemas estructurales

- **Árbol de rutas duplicado.** `app.routes.ts` declara `path: 'rrhh'` (línea 630, 17 rutas
  hijas) y `path: 'menurecursoshumanos'` (línea 746, 21 rutas hijas). El menú lateral y el
  botón del dash apuntan siempre al segundo, de modo que las ~114 líneas del primero son
  **código muerto inalcanzable**.
- **Dos componentes huérfanos**: `rrh-aportes` y `rrh-liquidaciones`, demos hardcodeados de 21
  líneas que nadie importa ni enruta.
- **Ningún `.scss` de `rrh` importa `styles/abstracts`.** Los colores están hardcodeados en ~30
  archivos, replicando a mano el gradiente `#667eea → #764ba2` que ya existe en el sistema como
  `$primary-color` / `$secondary-color`.
- `usuarioRegistro: 'demo'` hardcodeado en 4 lugares de `permisos-licencias-form`, mientras el
  mismo archivo usa `getUsuarioRegistro()` en otro punto.
- **Validación de saldo de vacaciones desactivada** con `// TODO(test)` en
  `vacaciones-form.component.ts:316` — la regla de negocio central de vacaciones está apagada.
- `getUsuarioRegistro()` duplicado ~10 veces, ignorando `shared/services/usuario-sesion.ts`.
- `CUSTOM_ELEMENTS_SCHEMA` en prácticamente todos los componentes, lo que desactiva la
  validación de plantillas de Angular.

### 5.5 Adherencia a estándares

`rrh` sí usa `DatosBusqueda` (19 archivos), el barril de Material y `FuncionesDatosService`.

No usa `table-basic-hijos`, `ExportService`, `JasperReportesService`, `usuario-sesion` ni
ningún `shared/components/*`. Reimplementa la tabla a mano en cada pantalla, con `MatTableDataSource`
+ paginador + diálogos propios, de ahí que `vacaciones-list` tenga 771 líneas y
`contrato-empleado-list` 718.

> **Matiz honesto:** `rrh` no es el único módulo que ignora `table-basic-hijos`. El uso real es
> `crd` 9, `cnt` 2, `tsr` 2, y `cxc`, `cxp`, `rpr` y `rrh` con cero. Aun así, para pantallas
> maestro-detalle sigue siendo el patrón correcto del proyecto y es la vía para reducir
> drásticamente el volumen de código.

---

## 6. Modelo de datos propuesto

### 6.1 Tablas nuevas

Los códigos de 4 letras fueron verificados contra los **308 códigos ya usados** en todo el
sistema; ninguno colisiona. El DDL sigue `docs/estandar/ESTANDARES-CREACION-TABLAS-ORACLE.md`:
PK `IDENTITY`, índice por cada FK, `COMMENT ON TABLE` y `COMMENT ON COLUMN`, y la auditoría
`XXXXFCHR` / `XXXXUSRR` que ya usa el esquema RHH.

**Parametría y catálogos**

| Código | Entidad | Propósito |
|---|---|---|
| `CPNM` | `ConceptoNomina` | **Pieza central.** Catálogo configurable de conceptos de nómina, con `planCuenta` propio |
| `CFNM` | `ConfiguracionNomina` | Configuración por empresa: plantillas y tipos de asiento, banderas de funcionalidad |
| `PRNM` | `ParametroNomina` | Parámetros normativos por año (SBU, tasas, canasta, días base) |
| `TBIR` | `TablaImpuestoRenta` | Tabla de IR por año y tramo |
| `TPGP` | `TopeGastoPersonal` | Tope de canastas según número de cargas familiares |
| `CSTR` | `CausalTerminacion` | Causales con su artículo del CT y sus efectos (desahucio, despido) |

**Maestro de personal**

| Código | Entidad | Propósito |
|---|---|---|
| `CRGF` | `CargaFamiliar` | Dependientes del empleado |
| `CBEM` | `CuentaBancariaEmpleado` | Cuentas de acreditación, con split por porcentaje |
| `GSPR` | `GastoPersonalProyectado` | Proyección anual de gastos personales por categoría |
| `CPXM` | `ConceptoFijoEmpleado` | Conceptos fijos vigentes por empleado (bonos, movilización) |
| `NVIS` | `NovedadIess` | Avisos de entrada, salida y modificación de sueldo |

**Motor de nómina**

| Código | Entidad | Propósito |
|---|---|---|
| `NVNM` | `NovedadNomina` | Novedades puntuales del período (ingresos y descuentos únicos) |
| `PVNM` | `ProvisionNomina` | Provisiones mensuales de beneficios sociales |
| `ACMN` | `AcumuladoNomina` | Acumulados por empleado, año, mes y tipo de base |
| `PYIR` | `ProyeccionImpuestoRenta` | Proyección anual de IR con su retención mensual vigente |
| `LQBS` | `LiquidacionBeneficioSocial` | Décimos, fondos de reserva y utilidades liquidados |
| `DSRC` | `DescuentoRecurrente` | Préstamos IESS, anticipos y préstamos internos |
| `CTDS` | `CuotaDescuento` | Cuotas de amortización de un descuento recurrente |
| `HREX` | `HoraExtra` | Horas extra tipificadas al 50 %, 100 % y recargo nocturno 25 % |

**Asistencia**

| Código | Entidad | Propósito |
|---|---|---|
| `FMRC` | `FormatoArchivoMarcacion` | Definición del formato del archivo del biométrico |
| `DFMR` | `DetalleFormatoMarcacion` | Mapeo campo a campo (posición, longitud, traducción de códigos) |
| `CRMR` | `CargaMarcaciones` | Cabecera del lote importado, con hash SHA-256 antiduplicado |

**Pago y salidas**

| Código | Entidad | Propósito |
|---|---|---|
| `RDPG` | `OrdenPagoNomina` | Orden de pago del período, enlazada al egreso de tesorería |
| `DRPG` | `DetalleOrdenPago` | Detalle por empleado y cuenta bancaria |
| `UTLD` | `Utilidad` | Cálculo del 15 % por ejercicio |
| `DTUT` | `DetalleUtilidad` | Distribución por empleado, con el excedente sobre 24 SBU |
| `SLAP` | `SaldoApertura` | Saldos de migración al 31-dic-2025, con reversión trazable |

### 6.2 `RHH.CPNM` — el catálogo de conceptos

Esta es la tabla que convierte la nómina de un cálculo hardcodeado en un motor configurable.
Cada ingreso, descuento, aporte patronal y provisión es una fila aquí, y el rol de pago se
construye recorriéndolas.

```sql
CREATE TABLE RHH.CPNM (
  CPNMCDGO NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
  CPNMNMBR VARCHAR2(100)  NOT NULL,  -- Nombre del concepto
  CPNMABRV VARCHAR2(20),             -- Abreviatura para el rol de pago
  CPNMTPCN NUMBER         NOT NULL,  -- Rubro 179: ingreso/egreso/patronal/provision/informativo
  CPNMTPCL NUMBER         NOT NULL,  -- Rubro 180: tipo de calculo
  CPNMBSCL NUMBER,                   -- Rubro 181: base sobre la que se calcula
  CPNMTPRL NUMBER,                   -- Rubro 186: tipo de relacion laboral al que aplica
  CPNMVLRR NUMBER(18,2),             -- Valor fijo, si aplica
  CPNMPRCN NUMBER(18,6),             -- Porcentaje, si aplica
  CPNMIMIE VARCHAR2(1) DEFAULT 'N',  -- Imponible IESS
  CPNMIMIR VARCHAR2(1) DEFAULT 'N',  -- Imponible impuesto a la renta
  CPNMAPFR VARCHAR2(1) DEFAULT 'N',  -- Aporta a fondos de reserva
  CPNMBSDT VARCHAR2(1) DEFAULT 'N',  -- Entra en la base del decimo tercero
  CPNMBSDC VARCHAR2(1) DEFAULT 'N',  -- Entra en la base del decimo cuarto
  CPNMPTRN VARCHAR2(1) DEFAULT 'N',  -- Es costo patronal (no afecta el neto)
  CPNMPRVS VARCHAR2(1) DEFAULT 'N',  -- Genera provision
  CPNMOBLG VARCHAR2(1) DEFAULT 'N',  -- Se aplica a todos automaticamente
  CPNMRDEP VARCHAR2(3),              -- Casillero del anexo RDEP
  CPNMIESS VARCHAR2(3),              -- Codigo en la planilla IESS
  CPNMORDN NUMBER,                   -- Orden de presentacion y prelacion de descuento
  CPNMESTD NUMBER DEFAULT 1,
  CPNMFCHR TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CPNMUSRR VARCHAR2(60),
  CONSTRAINT PK_CPNM PRIMARY KEY (CPNMCDGO)
);
```

`CPNM` lleva `planCuenta` directo (FK a **`CNT.PLNN`**), replicando el patrón de `PGS.GRPP`
(`GrupoProductoPago`). Las cuentas fijas de cada proceso —sueldos por pagar, IESS por pagar, SRI,
banco— salen de las plantillas contables `CNT.PLNS`/`CNT.DTPL`, identificadas por `DTPLAXL1`.
Verificado en el código: `PLNN` es el plan de cuentas, `PLNT` es `TipoAsiento` y `PLNS` es
`Plantilla`.

> El DDL completo de las 27 tablas está en `docs/logica-negocio/rhh/sql/`, junto con los INSERT
> de rubros, parámetros normativos, conceptos y plantillas contables.

### 6.3 Campos a agregar a entidades existentes

**`Empleado` (`MPLD`)** — FK a `Empresa`; tipo de identificación, estado civil, género,
nacionalidad, nivel de instrucción, profesión; porcentaje de discapacidad y carné CONADIS;
banco, tipo de cuenta y número de cuenta; código de afiliación IESS; fecha de ingreso; región
para el décimo cuarto; contacto de emergencia.

**`ContratoEmpleado` (`CNTE`)** — jornada y horas semanales; banderas independientes de
mensualización para décimo tercero, décimo cuarto y fondos de reserva; código de ocupación
sectorial MDT; causal y fecha de terminación.

**`PeriodoNomina` (`PRDN`)** — **`PRDNCNTB` (S/N), el interruptor de contabilización**; FK al
asiento generado; fecha y usuario de aprobación; `estado` migrado a rubro.

**`Nomina` (`NMNA`)** — desglose tipificado: total imponible IESS, total imponible IR, aporte
personal, aporte patronal, fondos de reserva y retención de IR del mes; dinero a `BigDecimal`.

**`ReglonNomina` (`RNGL`)** — **FK a `ConceptoNomina`** y descripción. Sin esto la tabla no
sirve.

**`RolPago` (`RLPG`)** — totales de ingresos, descuentos y neto, para que el rol tenga valor
propio y no dependa de recalcular la nómina cada vez que se consulta.

**`Liquidacion` (`LQDC`)** — causal de terminación como rubro, desglose de rubros del
finiquito, número de acta del SUT.

**`ResumenNomina` (`RSMN`)** — separar `minutosExtra` en suplementarias y extraordinarias;
horas a `LocalTime`.

**`SaldoVacaciones` (`SLDV`)** — días adicionales por antigüedad y saldo arrastrado del
período anterior.

**`Marcaciones` (`MRCC`)** — FK a `CargaMarcaciones` para trazar el lote de origen.

### 6.4 Cambios de tipo transversales

- `Double` → `BigDecimal` en todo lo monetario.
- `String` → `LocalTime` en horas (`TRNOENTR`, `DTLLENTR`, `RSMNENTR`).
- `String` → `Long` con rubro en todos los campos `estado`.

### 6.5 Rubros nuevos (`codigoAlterno` 179 a 220)

Cada rubro implica cuatro cosas: un `INSERT` en `SCP.PRBR`, N `INSERT` en `SCP.PDTR`, una
interfaz en `com.saa.rubros` con el Javadoc `"Interfaz del rubro X (nnn)"`, y una línea en
`com.saa.rubros.Rubros`.

| # | Rubro | Detalles | Usado en |
|---|---|---|---|
| 179 | `RHH_TIPO_CONCEPTO_NOMINA` | INGRESO, EGRESO, APORTE_PATRONAL, PROVISION, INFORMATIVO | `CPNMTPCN` |
| 180 | `RHH_TIPO_CALCULO_CONCEPTO` | VALOR_FIJO, PORCENTAJE_SOBRE_BASE, POR_CANTIDAD, FORMULA, TABLA_PROGRESIVA, DESDE_ACUMULADO, MANUAL | `CPNMTPCL` — el `switch` del motor |
| 181 | `RHH_BASE_CALCULO` | SUELDO_CONTRATO, IMPONIBLE_IESS, GRAVADO_IR, SBU, VALOR_HORA, TOTAL_INGRESOS, NETO | `CPNMBSCL` |
| 182 | `RHH_ESTADO_PERIODO_NOMINA` | ABIERTO, EN_CALCULO, CALCULADO, APROBADO, CONTABILIZADO, PAGADO, CERRADO, ANULADO | `PRDNESTD` |
| 183 | `RHH_ESTADO_NOMINA` | BORRADOR, CALCULADA, APROBADA, PAGADA, ANULADA, EXCLUIDA | `NMNAESTD` |
| **184** | **`RHH_MODO_PERIODO_NOMINA`** | **HISTORICO_SIN_CONTABILIZAR, PRODUCTIVO_CONTABILIZA** | **`PRDNMODO` — el interruptor del cronograma** |
| 185 | `RHH_ESTADO_EMPLEADO` | ACTIVO, CON_LICENCIA, SUSPENDIDO, CESANTE, JUBILADO | `MPLDESTD` |
| 186 | `RHH_TIPO_RELACION_LABORAL` | INDEFINIDO_TIEMPO_COMPLETO, OCASIONAL_EVENTUAL, PLAZO_FIJO, JORNADA_PARCIAL_PERMANENTE, POR_HORAS, SERVICIOS_PROFESIONALES_SIN_DEPENDENCIA, APRENDIZAJE_PASANTIA | `CNTETPRL` |
| 187 | `RHH_REGION_DECIMO_CUARTO` | SIERRA_AMAZONIA, COSTA_INSULAR | `MPLDRGNN` |
| 188–190 | `RHH_MODALIDAD_DECIMO_TERCERO` / `_CUARTO` / `_FONDOS_RESERVA` | MENSUALIZADO, ACUMULADO (FR además: ACUMULADO_EN_IESS, NO_APLICA) | `CNTEDCTM`, `CNTEDCCM`, `CNTEFRMD` |
| 191 | `RHH_TIPO_HORA_EXTRA` | SUPLEMENTARIA_50, EXTRAORDINARIA_100, RECARGO_NOCTURNO_25 | `HREXTPHR` |
| 192–194 | `RHH_TIPO_MARCACION`, `RHH_ORIGEN_MARCACION`, `RHH_ESTADO_CARGA_MARCACIONES` | Entrada/salida/almuerzo/permiso; biométrico/manual/importación/móvil/corrección; cargado/validado/con errores/consolidado/anulado | `MRCC`, `CRMR` |
| 195 | `RHH_CAUSAL_TERMINACION` | RENUNCIA_VOLUNTARIA, DESAHUCIO_ART184, VISTO_BUENO_ART172, DESPIDO_INTEMPESTIVO_ART188, MUTUO_ACUERDO_ART169_2, TERMINACION_PLAZO_ART169_3, JUBILACION, FALLECIMIENTO, LIQUIDACION_EMPRESA, CASO_FORTUITO | Tipifica `CSTR` |
| 196 | `RHH_ESTADO_LIQUIDACION` | BORRADOR, CALCULADA, APROBADA, REGISTRADA_SUT, PAGADA, ANULADA | `LQDCESTD` |
| 197–198 | `RHH_TIPO_DESCUENTO_RECURRENTE`, `RHH_ESTADO_DESCUENTO_RECURRENTE` | Quirografario, hipotecario, anticipo, préstamo interno, retención judicial, seguro privado; vigente/suspendido/cancelado/anulado | `DSRC` |
| 199–201 | `RHH_TIPO_CUENTA_BANCARIA`, `RHH_PARENTESCO_CARGA`, `RHH_TIPO_GASTO_PERSONAL` | Ahorros/corriente; cónyuge/conviviente/hijo/padre/madre/hermano/otro; vivienda/educación/alimentación/vestimenta/salud/turismo | `CBEM`, `CRGF`, `GSPR` |
| 202–203 | `RHH_TIPO_ACUMULADO`, `RHH_TIPO_BENEFICIO_SOCIAL` | Imponible IESS, gravado IR, bases de décimos, FR, utilidades, vacaciones, aporte personal, retención IR, días trabajados | `ACMN`, `LQBS` |
| 204–205 | `RHH_TIPO_NOVEDAD_IESS`, `RHH_ESTADO_NOVEDAD_IESS` | Aviso entrada/salida, modificación de sueldo, novedad FR; pendiente/enviada/aceptada/rechazada | `NVIS` |
| 206–207 | `RHH_TIPO_PROVISION`, `RHH_TIPO_AUSENCIA` | Décimos, vacaciones, FR, aporte patronal, jubilación patronal, desahucio; falta injustificada, permisos, enfermedad, maternidad, calamidad | `PVNM`, `RSMN` |
| 208–212 | `RHH_ESTADO_ORDEN_PAGO`, `RHH_FORMATO_ARCHIVO_MARCACION`, `RHH_TIPO_JORNADA`, `RHH_TIPO_SALDO_APERTURA`, `RHH_TIPO_PERIODO_NOMINA` | Ver diseño detallado | `RDPG`, `FMRC`, `CNTE`, `SLAP`, `PRDN` |
| 213–220 | `RHH_ORIGEN_RENGLON`, `RHH_DESTINO_ASIENTO_CONCEPTO`, `RHH_CAMPO_ARCHIVO_MARCACION`, `RHH_ENTIDAD_RECAUDADORA`, `RHH_TIPO_CAMBIO_HISTORIAL`, `RHH_GENERO`, `RHH_ESTADO_CIVIL`, `RHH_NIVEL_INSTRUCCION` | Ver diseño detallado | Varios |

**Modificación de un rubro existente:** agregar el detalle `RECURSOS_HUMANOS = 5` al rubro
`ModuloSistema` (15) en `SCP.PDTR`, más la constante en `com.saa.rubros.ModuloSistema`. Es el
valor que se pasa como último argumento de `generarAsiento(...)`.

**Decisión pendiente:** la entidad `RHH.CTLG` (`Catalogo`) es un mini-catálogo local de tipos
de permiso que duplica conceptualmente a `Rubro`/`DetalleRubro`. Hay que decidir si se migra a
rubros o se mantiene. La recomendación es migrarlo, por coherencia con el resto del sistema.

---

## 7. Capa de servicios

Métodos de proceso nuevos, con `@TransactionAttribute` explícito. Para los procesos largos se
sigue el patrón de `ejb/asoprep/serviceImpl/CargaArchivoPetroServiceImpl.java` (`@Stateful`,
fases validar → procesar → aplicar), que es el precedente más reciente de proceso complejo
bien construido en este repositorio.

**`NominaServiceImpl`** — `calcularPeriodo`, `recalcularEmpleado`, `aprobarPeriodo`,
`cerrarPeriodo`, `reversarPeriodo`, `contabilizarPeriodo`. El motor de cálculo se dirige por
`ConceptoNomina`, nunca por código hardcodeado. `contabilizarPeriodo` queda condicionado al
interruptor `PRDNCNTB`.

**`ImpuestoRentaServiceImpl`** (nuevo) — proyección anual de la base imponible, aplicación de
`TBIR`, rebaja por gastos personales según cargas familiares, prorrateo mensual de la
retención, y recálculo cuando cambian los ingresos proyectados.

**`BeneficiosSocialesServiceImpl`** (nuevo) — décimo tercero y décimo cuarto en ambas
modalidades, fondos de reserva, y provisiones mensuales.

**`LiquidacionServiceImpl`** — cálculo del finiquito: proporcionales de décimos y vacaciones,
desahucio del 25 %, despido intempestivo según causal, y jubilación patronal.

**`SaldoVacacionesServiceImpl`** — acreditación anual con la escala de antigüedad, consumo al
aprobar una solicitud, y reversión al anular.

**`MarcacionesServiceImpl`** — consolidación diaria a `ResumenNomina`, con cálculo de atrasos
y horas extra tipificadas contra el turno asignado.

**`ImportacionMarcacionesServiceImpl`** (nuevo) — importador del biométrico. **El formato del
archivo es un insumo pendiente del cliente**; el parser se configura por `FMRC`/`DFMR` para no
quedar atado a una marca. La plantilla a copiar es
`ejb/tsr/serviceImpl/ImportacionExtractoBancarioServiceImpl.java`, que ya resuelve el patrón de
previsualizar/confirmar con control antiduplicado por hash del archivo.

**`DescuentoRecurrenteServiceImpl`** (nuevo) — generación de la cuota del período y
actualización de saldos.

Cada uno expone sus endpoints de proceso en el `*Rest` correspondiente, siguiendo el precedente
de `POST /rest/ejrc/ejecutar` del módulo `rpr`.

### 7.1 Secuencia exacta del cálculo de nómina

`calcularPeriodo` es idempotente: borra y regenera `NMNA` + `RNGL` + `PVNM` del período.

1. **Cargar parametría** del año de `PRDNFCHF`: `PRNM`, `TBIR`, `TPGP`, `CFNM`. Excepción si no existe.
2. **Seleccionar contratos** activos que se solapen con el período.
3. **Días trabajados** = 30 − días de ausencia no remunerada, ajustado por ingreso o salida a mitad de mes.
4. **Sueldo del período**: jornada completa → `sueldo × días / 30`; parcial o por horas → `horas efectivas × valor hora`; servicios profesionales → honorario pactado, **sin prorrateo**.
5. **Renglones de ingreso**: conceptos obligatorios, conceptos fijos vigentes (`CPXM`), novedades aprobadas del período (`NVNM`), y horas extra aprobadas (`HREX`).
6. **Bases**, en una sola pasada sobre los renglones ya calculados: imponible IESS, gravado IR, base de fondos de reserva, de décimo tercero, de décimo cuarto, de utilidades y de vacaciones.
7. **Aportes**: personal `baseIESS × 9,45 %` (egreso); patronal `× 11,15 %` e IECE+SECAP `× 1,00 %` (patronales, no afectan el neto).
8. **Fondos de reserva**: si es mensualizado y la antigüedad supera el año → renglón de ingreso. Si es acumulado en el IESS → provisión, sin renglón.
9. **Décimo tercero**: mensualizado → `baseDec3 / 12`. Acumulado → provisión.
10. **Décimo cuarto**: mensualizado → `SBU / 12 × (días / 30)`. Acumulado → provisión.
11. **Retención de IR**: se toma de la proyección vigente (`PYIR`); si no existe, se dispara la proyección en línea.
12. **Descuentos recurrentes**: cuotas con vencimiento en el período. Los porcentuales (pensión alimenticia) se calculan sobre el neto preliminar.
13. **Neto** = Σ ingresos − Σ egresos. Los conceptos patronales y las provisiones se excluyen.
14. **Protección de neto negativo**: si el neto queda bajo cero, se recortan descuentos en orden descendente de prelación hasta que el neto sea ≥ 0, dejando la cuota como parcial. Los descuentos de ley —aporte IESS, IR, retención judicial— **nunca** se recortan; si aun así el neto es negativo, se lanza excepción con el detalle del empleado.
15. **Persistir** `NMNA`, `RNGL` con snapshot completo, y `PVNM`. Los acumulados `ACMN` **no** se escriben aquí, sino en `cerrarPeriodo`, para que los recálculos no los dupliquen.

**Redondeo:** `BigDecimal.setScale(2, RoundingMode.HALF_UP)` en **cada renglón**, nunca solo al
final. El total es la suma de renglones ya redondeados.

### 7.2 Proyección del impuesto a la renta

1. Ingresos realizados (acumulados de meses anteriores) + ingresos futuros proyectados.
   **Se excluyen** décimo tercero, décimo cuarto y fondos de reserva: son exentos (art. 9 LRTI).
2. **Base imponible = ingresos proyectados − aporte personal IESS proyectado.**
3. Impuesto causado: localizar el tramo en `TBIR` y aplicar
   `impuestoFracciónBásica + (base − fracciónBásica) × porcentaje`.
4. Tope de gastos personales: si hay enfermedad catastrófica → 100 canastas; si no, según cargas
   familiares vía `TPGP` (7 canastas sin cargas → 20 con cinco o más). Con la canasta de
   enero 2026 en USD 821,80: sin cargas el tope de gasto es USD 5.752,60 y con cinco o más
   USD 16.436,00.
5. `rebaja = min(gastos declarados, tope) × 18 %` → sin cargas hasta USD 1.035,47; con cinco o
   más hasta USD 2.958,48.
6. `impuesto a pagar = max(0, causado − rebaja)`.
7. `retención mensual = (impuesto a pagar − retenciones ya efectuadas) / meses restantes`, con
   piso en cero.

Se reproyecta en enero, al ingresar un empleado, al cambiar el sueldo, y cuando el empleado
presenta su anexo de gastos personales. La `PYIR` anterior se marca como no vigente.

**Servicios profesionales sin relación de dependencia** no entran en esta proyección: se les
aplica una retención en la fuente puntual sobre el honorario, y su comprobante es una retención
emitida en CXC, no el RDEP.

### 7.3 Otras reglas de cálculo

**Vacaciones.** Días = 15 + 1 por cada año a partir del quinto, con tope 30. El valor del día es
`(acumulado de base de vacaciones de los últimos 12 meses) / 360`, lo que incluye horas extra y
comisiones (art. 71 CT), no solo el sueldo nominal. El consumo es FIFO sobre los saldos más
antiguos, y los saldos caducan a los 3 años (art. 75 CT).

**Horas extra.** Suplementarias al 50 %: exceso sobre la jornada ordinaria en día laborable
hasta las 24h00, con tope de 4 diarias y 12 semanales. Extraordinarias al 100 %: entre 24h00 y
06h00, sábados, domingos y feriados. Recargo nocturno del 25 %: jornada *ordinaria* cumplida
entre 19h00 y 06h00 — es un recargo sobre la hora ordinaria, no una hora extra.

**Liquidación de haberes.** Remuneración pendiente del mes, décimos proporcionales, vacaciones
no gozadas, fondos de reserva pendientes, y según la causal: desahucio (art. 185) al 25 % de la
última remuneración por año de servicio, o despido intempestivo (art. 188) de 3 meses si la
antigüedad es menor a 3 años, o un mes por año con **mínimo 3 y máximo 25** si es mayor. Si el
neto resulta negativo (deuda del trabajador) se registra igual y se marca para cobro.

**Utilidades.** `base15 = utilidad contable × 15 %`, repartida en `10 %` por días trabajados y
`5 %` por cargas familiares. El excedente sobre **24 SBU** por trabajador se transfiere al IESS.
La utilidad es ingreso gravado de IR pero **no** es materia gravada del IESS.

**Provisiones mensuales.** Décimo tercero `base/12`; décimo cuarto `SBU/12`; vacaciones
`base/24`; fondos de reserva `base × 8,33 %`; aporte patronal `baseIESS × 11,15 %`. Jubilación
patronal y desahucio se cargan desde estudio actuarial externo.

---

## 8. Integración contable

Se engancha con el servicio existente, cuya firma fue verificada en la interfaz:

```java
Asiento generarAsiento(Long idEmpresa, int codigoAltTipoAsiento,
        LocalDate fechaAsiento, String observaciones, String usuario,
        List<DetalleAsiento> lineas, Long moduloSistema) throws Throwable;
```

`AsientoContableServiceImpl` resuelve la plantilla por `codigoAlterno`, construye la cabecera,
asigna período y numeración, guarda los detalles y ejecuta `validaDebeHaber`, que revierte toda
la transacción si el asiento no cuadra.

### 8.1 El interruptor de contabilización

`contabilizarRol` es el punto donde se materializa el requisito del cronograma:

- Si `PRDNMODO = HISTORICO_SIN_CONTABILIZAR` → **no genera asiento**, deja `PRDNASNT` en nulo, y
  aun así **avanza el período a CONTABILIZADO** para que el flujo pueda continuar hasta el
  cierre. Es lo que permite cargar enero–julio 2026 sin tocar contabilidad.
- Si `PRDNMODO = PRODUCTIVO_CONTABILIZA` → arma las líneas, llama a `generarAsiento(...)` con
  `ModuloSistema.RECURSOS_HUMANOS`, y guarda el id del asiento en `PRDNASNT`.

Consecuencia práctica: **los períodos históricos no requieren el plan de cuentas configurado**,
porque `validarCuentasContables` se salta esa validación en modo histórico. Esto desacopla la
carga histórica de la definición del plan de cuentas, que es un insumo pendiente del cliente.

### 8.2 Los cuatro asientos

**1 · Rol de pagos** (mensual, uno por período)

| Lado | Cuenta | Valor |
|---|---|---|
| DEBE | Gasto sueldos y salarios | Σ conceptos de ingreso |
| DEBE | Gasto horas extra | Σ suplementarias + extraordinarias |
| DEBE | Gasto aporte patronal IESS | `baseIESS × 11,15 %` |
| DEBE | Gasto IECE + SECAP | `baseIESS × 1,00 %` |
| DEBE | Gasto fondos de reserva y décimos mensualizados | Σ mensualizados |
| HABER | IESS por pagar — aporte personal | `baseIESS × 9,45 %` |
| HABER | IESS por pagar — aporte patronal + IECE/SECAP | Σ patronal |
| HABER | SRI — retención en la fuente relación de dependencia | Σ retención IR |
| HABER | IESS por pagar — préstamos quirografarios e hipotecarios | Σ cuotas |
| HABER | Cuentas por cobrar empleados | Σ anticipos y préstamos internos |
| HABER | Retenciones judiciales por pagar | Σ cuotas |
| HABER | **Sueldos por pagar (neto)** | Σ netos — **línea de cuadre** |

**2 · Provisiones de beneficios sociales** (mensual, solo modalidad acumulada) — DEBE a las
cuentas de gasto de décimo tercero, décimo cuarto, vacaciones, fondos de reserva, jubilación
patronal y desahucio; HABER a las provisiones por pagar correspondientes, separando corriente
(décimos, vacaciones, FR) de largo plazo (jubilación patronal, desahucio).

**3 · Pago de nómina** — DEBE `Sueldos por pagar`, HABER `Banco`. Se pasa
`ModuloSistema.TESORERIA` en este asiento, no `RECURSOS_HUMANOS`, porque el dinero sale de
tesorería. Además se crea un `TSR.EGRS` consolidado enlazado a la orden de pago, para que la
conciliación bancaria pueda casarlo con el débito del extracto.

**4 · Liquidación de haberes** — DEBE consume las provisiones acumuladas (décimos, vacaciones)
más el gasto de desahucio o indemnización según la causal; HABER a IESS por pagar, al cruce de
saldos de préstamos, y a `Liquidaciones por pagar` como línea de cuadre. Si la provisión
acumulada es insuficiente —caso común en el primer año tras la migración— la diferencia va a
gasto del período.

Las cuentas de cada línea salen de la plantilla contable (`CNT.DTPL`, localizada por `DTPLAXL1`)
y del `planCuenta` propio de cada concepto, no de código. El centro de costo sale del contrato si
la empresa lo tiene activado.

### 8.3 Regla de cuadre

Por construcción, `Σ DEBE = totalIngresos + totalPatronal` y
`Σ HABER = totalDescuentos + totalPatronal + neto`; como `neto = totalIngresos − totalDescuentos`,
el asiento cuadra. Aun así, **antes** de llamar a `generarAsiento` hay que comprobar el cuadre
en `BigDecimal` y ajustar la diferencia por redondeo (menor a 0,05) contra la línea de Sueldos
por pagar. Sin esa comprobación previa, el usuario recibe el `IncomeException` genérico de
`validaDebeHaber`, que no le dice nada útil.

### 8.4 Precondiciones antes de contabilizar

1. Insertar el detalle `RECURSOS_HUMANOS` en el rubro `ModuloSistema` (15).
2. Insertar los cuatro `TipoAsiento` en `CNT.TPAS` con `sistema = 1` para ASOPREP-FCPC.
3. Mapear las cuentas de `CNT.PLNN` en las líneas de plantilla `CNT.DTPL` y en `RHH.CPNM`.
4. Ejecutar `validarCuentasContables` **en la aprobación**, no en la contabilización, para que
   el problema se descubra antes.

> **Trampa verificada:** `com.saa.rubros.TipoAsientos` tiene varios `codigoAlterno` reutilizados
> entre módulos y comentarios `// TODO: verificar codigoAlterno en BD`. Los cuatro códigos
> nuevos **deben consultarse contra `CNT.TPAS` real antes de fijarlos**, o `generarAsiento`
> fallará con "No existe TipoAsiento con codigoAlterno=…".

El pago del neto reutiliza la infraestructura de tesorería (`TSR.EGRS` y
`generarAsientoEgresoTesoreria`) en lugar de reinventarla. **No** se debe construir sobre
`DocumentoPago`, `MontoAprobacion` ni `DocumentoCxp`, marcados como deprecados en
`docs/pendientes/PLAN_IMPLEMENTACION.md`.

---

## 9. Reportes y salidas oficiales

### 9.1 Reportes internos

Como plantillas Jasper en `src/main/resources/rep/rhh/`, siguiendo el patrón canónico de
`rep/crd/RPRT_CMPB_PGCT.jrxml`: SQL nativo Oracle con alias en `MAYUSCULA_SNAKE`, `NVL`
sistemático, parámetros `P_*_CODIGO` más `P_IMAGEN` y `P_USUARIO`, y una sola consulta plana
sin subreportes.

Reportes a construir: rol de pago individual, rol consolidado por período, provisiones de
beneficios sociales, acta de finiquito, certificado de trabajo, y reportes de asistencia y
vacaciones.

Invocación desde el frontend vía `JasperReportesService.generar('rhh', 'RPRT_...', params)`,
que ya existe y ya lista `rhh` entre sus módulos soportados.

### 9.2 Salidas a entidades de control

Se sigue el patrón del módulo `rpr`, que ya hace exactamente esto para la Superintendencia de
Bancos: **persistir las filas generadas** en su propia tabla, **registrar cada corrida** en un
`EjecucionReporte` (`RPR.EJRC`, con mes, año, usuario, fecha de generación, tipo, estado y
observaciones), y exportar desde ahí. Esto da trazabilidad y permite regenerar sin recalcular.

| Salida | Destino | Formato |
|---|---|---|
| Anexo RDEP | SRI | XML para carga al DIMM |
| Formulario 107 | Empleado | PDF individual |
| Planilla de aportes | IESS | Reporte de control y/o archivo de carga |
| Avisos de entrada, salida y novedades | IESS | Reporte de control |
| Décimo tercero y cuarto, utilidades | MDT / SUT | Formato de carga del ministerio |
| Acta de finiquito | MDT / SUT | PDF para consignación |

> **Pendiente de definición:** si la planilla del IESS se necesita como archivo de carga al
> portal o solo como reporte de control para digitación. La ficha técnica del RDEP y las
> estructuras XML se descargan del portal del SRI y deben incorporarse al diseño de la fase 7.

---

## 10. Frontend — reconstrucción

Se rehace `modules/rrh` completo. Los criterios:

**Design system.** Todos los `.scss` importan `@use 'styles/abstracts/colors' as *` y
`variables`, usando `$primary-color` (#667eea), `$secondary-color` (#764ba2), la escala
`$spacing-xs…xl`, `$border-radius-sm/md/lg`, `$font-size-*` y `$transition-*`. Se elimina todo
color y medida hardcodeada.

**Componentes compartidos.** `table-basic-hijos` para las pantallas maestro-detalle,
`ExportService` para CSV y PDF, `JasperReportesService` para los reportes, `usuario-sesion`
para el usuario de registro, y los `shared/components/*` de selección donde apliquen.

**Estructura de pantallas:**

- *Parametrización*: conceptos de nómina, parámetros anuales, tabla de impuesto a la renta,
  cargos, departamentos, tipos de contrato, turnos.
- *Ficha del empleado*: pestañas de datos personales, cargas familiares, contratos, historial
  de cargos, datos bancarios y gastos personales proyectados.
- *Operación*: marcaciones con importación del biométrico, permisos y licencias, vacaciones,
  novedades IESS.
- *Procesos*: período de nómina con cálculo y aprobación, rol de pago, descuentos recurrentes,
  liquidación, utilidades.
- *Reportes*: conectados a `/rest/rprt/generar`, sin mocks.
- *Tablero de RRHH*: indicadores de headcount, rotación, ausentismo y costo de nómina.

**Higiene:** eliminar el árbol de rutas muerto (`app.routes.ts:630-744`), los dos componentes
huérfanos, `CUSTOM_ELEMENTS_SCHEMA`, los `console.log` con datos de negocio, y reactivar la
validación de saldo de vacaciones.

Sobre la búsqueda en combos, se aplica la regla del proyecto: todo combo alimentado desde una
tabla distinta a rubros debe permitir filtrar por al menos dos campos, salvo que la tabla tenga
exactamente `id`, `nombre` y `estado`.

---

## 11. Fases de trabajo

El orden responde a una restricción concreta: **el control de asistencia va después del motor de
nómina**, porque en modo histórico los días trabajados y las horas extra se cargan a mano como
novedades. Esperar al biométrico bloquearía la carga de enero–julio 2026 sin necesidad.

| Fase | Contenido | Entregable utilizable | Esfuerzo |
|---|---|---|---|
| **0 · Saneamiento** | Los 7 defectos verificados, limpieza de `rep/rrhh`, rutas muertas, DDL versionado del esquema actual | El CRUD existente deja de devolver basura en `selectByCriteria` | 1 |
| **1 · Parametría** | Rubros 179–220 + `RECURSOS_HUMANOS`; tablas `CPNM`, `CFNM`, `PRNM`, `TBIR`, `TPGP`, `CSTR`; datos semilla 2025 y 2026 | Pantallas de parametría; SBU 482 y tabla IR 2026 cargados | 3 |
| **2 · Maestro de personal** | `MPLD` ampliado con FK a Empresa, `CNTE` ampliado, `CRGF`, `CBEM`, `GSPR`, `CPXM`, `NVIS`, `HSTR` corregido | Ficha completa del colaborador y contratos con parametría legal | 3 |
| **3 · Migración de apertura** | `SLAP`, `ACMN`, `DSRC`, `CTDS`, `SLDV` ampliado; carga, validación, aplicación y reversión | Corte al 31-dic-2025 cargado y verificable | 2 |
| **4 · Motor de nómina** | `NVNM`, `PVNM`, `PYIR`, `LQBS`; `RNGL`/`NMNA`/`PRDN` ampliados; los servicios de cálculo, IR, beneficios, vacaciones y provisiones | **Enero 2026 calculado y cuadrado contra el rol real del cliente** | 8 |
| **5 · Rol y reportes internos** | `RLPG` con totales, generación de PDF, reportes Jasper en `rep/rhh/` | Roles entregables; **carga ene–jul 2026 terminada** | 3 |
| **6 · Contabilización y pago** | `RDPG`, `DRPG`; el interruptor; los 4 tipos de asiento; plantillas contables; archivo bancario y `TSR.EGRS` | **Operación en vivo: nómina → asiento → pago** | 5 |
| **7 · Asistencia** | `FMRC`, `DFMR`, `CRMR`, `HREX`; importador del biométrico y consolidación diaria | Marcaciones alimentando la nómina | 5 |
| **8 · Liquidación** | `LQDC`/`TMLQ` ampliados, cálculo de finiquito, acta SUT | Finiquitos calculados y contabilizados | 4 |
| **9 · Salidas oficiales** | RDEP XML, planilla IESS, formularios MDT, `UTLD`/`DTUT` | Cumplimiento SRI / IESS / MDT completo | 5 |
| **FE · Frontend** | Reconstrucción del módulo | Transversal, en paralelo desde la fase 1 | 8 |

**Ruta crítica hacia la operación en vivo:** 0 → 1 → 2 → 3 → 4 → 5 → 6, con un esfuerzo
acumulado de 25 unidades relativas. Las fases 7, 8 y 9 se paralelizan después del arranque. El
RDEP del ejercicio 2026 se presenta en enero de 2027, así que hay margen.

**Riesgos:**

- El formato del biométrico no está definido. Mitigado por `FMRC`/`DFMR`, pero la fase 7 no
  puede cerrarse sin al menos un archivo de muestra.
- Los `codigoAlterno` de `TipoAsiento` están reutilizados y con `TODO` en el código actual: hay
  que consultar `CNT.TPAS` real antes de fijar los cuatro nuevos.
- El plan de cuentas debe estar definido antes de la fase 6. La fase 5 no lo necesita gracias al
  modo histórico.
- Migrar siete meses de nómina sin marcaciones exige que días trabajados y horas extra se puedan
  **cargar manualmente** como novedades. Está previsto en la fase 4 y es la razón del orden.

---

## 12. Verificación

No hay framework de pruebas en el repositorio (`src/test` está vacío y no hay ninguno
configurado), de modo que la verificación es funcional y por comparación contra datos reales:

- **Cálculo de nómina.** Reproducir con el sistema los roles de enero a julio de 2026 y cuadrar
  contra los que ASOPREP efectivamente pagó. Es la prueba más fuerte disponible, y el propio
  plan de carga histórica la habilita sin trabajo adicional.
- **Aportes IESS.** Cuadrar el total de cada período contra la planilla ya emitida por el IESS.
- **Impuesto a la renta.** Contrastar la proyección anual contra el formulario 107 del
  ejercicio anterior.
- **Contabilización.** Verificar que `validaDebeHaber` no rechace ningún asiento y que el gasto
  de nómina cuadre contra el mayor contable del período.
- **Endpoints.** Probar cada ruta corregida (`rngl`, `sldv`, y la que resuelva la colisión de
  `hstr`) antes de dar por cerrada la fase 0.

---

## 13. Insumos pendientes del cliente

1. **Archivo de muestra del reloj biométrico**, con marca y modelo del equipo. Bloquea el
   diseño del parser en la fase 6.
2. **Confirmación del período de arranque contable**: agosto de 2026 retroactivo, o
   septiembre en adelante.
3. **Plan de cuentas contable** (`CNT.PLNN`) a asociar a cada concepto de nómina, para poblar
   las plantillas `CNT.DTPL` y `RHH.CPNM`. Necesario antes de la fase 6; la carga histórica no
   lo requiere.
4. **Número de empleados y contratos vigentes**, para dimensionar la migración.
5. **Confirmación sobre utilidades.** Se marcó que aplican; conviene validarlo con el contador
   dado que ASOPREP es un fondo previsional sin fines de lucro y podría no generar utilidades
   gravables.
6. **Un rol de pago real de ASOPREP**, para calibrar los conceptos del catálogo `CPNM` contra
   lo que efectivamente se paga hoy.
7. **Definición sobre la planilla IESS**: archivo de carga al portal o reporte de control.

---

## 14. Regla de mantenimiento de este documento

Siguiendo la convención establecida para los procesos Petro, **cualquier cambio en el motor de
cálculo de nómina, en `ConceptoNomina`, en los parámetros normativos o en las salidas
oficiales debe actualizar este documento en el mismo cambio.**

A medida que avancen las fases, este análisis se irá desglosando en documentos de reglas por
proceso dentro de `docs/logica-negocio/rhh/`, siguiendo el patrón de `docs/logica-negocio/crd/`:
`REGLAS-NOMINA.md`, `REGLAS-IESS.md`, `REGLAS-DECIMOS.md`, `REGLAS-IMPUESTO-RENTA.md`,
`REGLAS-LIQUIDACION.md`, `REGLAS-VACACIONES.md`.
