# Contrato de DTO — parametrización de nómina (fase 1)

**Sistema:** SAA (`saaBE` + `saaFE`) · **Fecha:** 2026-08-19

La sección 6 del documento maestro fija las **rutas** y los **DTO de los endpoints de proceso**,
pero no los nombres de campo del CRUD estándar de las entidades nuevas. Como el JSON que viaja
por `/rest/{tabla}` usa los nombres de propiedad **Java** de la entidad, el frontend necesitaba
fijarlos para poder construir las pantallas.

> **Estado: contrato canónico.** Verificado el 2026-08-19 contra el DDL de los scripts 01 a 05,
> columna por columna, en las ocho tablas de la fase 1. La comprobación encontró una sola
> omisión —`CPNMF107`, ya incorporada y marcada **(V)**— y ningún nombre incorrecto.
>
> **El backend debe construir sus entidades con exactamente estos nombres de propiedad.** No es
> una propuesta del frontend: es el contrato. Si alguna capa necesita cambiar un nombre, se
> cambia aquí primero y se avisa a la otra.
>
> La copia autoritativa vive en `saaBE/docs/logica-negocio/rhh/`; esta es su espejo en el
> repositorio del frontend.

Un desajuste de nombres **no rompe la compilación de ninguna de las dos capas**: se manifiesta
como campos que llegan vacíos o que no se guardan, y aparece en pruebas funcionales, no en el
build. Por eso conviene tratarlo como contrato y no como detalle de implementación.

## Cómo se derivaron

1. DDL de `docs/logica-negocio/rhh/sql/01_DDL_TABLAS_PARAMETRIZACION.sql`, incluidos los
   `COMMENT ON COLUMN`.
2. La plantilla de entidad y el `obtieneCampos()` de `ConceptoNomina` del plan del backend
   (§1.3), que confirman la convención: columna → propiedad en camelCase en español.

Los campos marcados **(C)** están confirmados porque aparecen literalmente en el
`obtieneCampos()` del plan del backend. El resto está **inferido** del comentario de su columna
y es lo que conviene revisar.

Convenciones comunes a las ocho tablas:

| Columna | Propiedad |
|---|---|
| `XXXXCDGO` | `codigo` **(C)** |
| `PJRQCDGO` | `empresa` **(C)** — objeto `Empresa`, no el escalar |
| `XXXXESTD` | `estado` **(C)** |
| `XXXXFCHR` | `fechaRegistro` |
| `XXXXUSRR` | `usuarioRegistro` |

---

## `RHH.CPNM` — ConceptoNomina

| Columna | Propiedad | |
|---|---|---|
| `CPNMNMBR` | `nombre` | (C) |
| `CPNMABRV` | `abreviatura` | (C) |
| `CPNMALTR` | `codigoAlterno` | (C) |
| `CPNMTPCN` | `tipoConcepto` | (C) |
| `CPNMTPCL` | `tipoCalculo` | (C) |
| `CPNMBSCL` | `baseCalculo` | (C) |
| `CPNMPRCN` | `porcentaje` | (C) |
| `CPNMORDN` | `orden` | (C) |
| `CPNMROLM` | `rolMotor` | (V) |
| `CPNMTPRL` | `tipoRelacionLaboral` | |
| `CPNMVLRR` | `valor` | |
| `CPNMFRML` | `formula` | |
| `CPNMIMIE` | `imponibleIess` | |
| `CPNMIMIR` | `imponibleIr` | |
| `CPNMAPFR` | `aportaFondosReserva` | |
| `CPNMBSDT` | `baseDecimoTercero` | |
| `CPNMBSDC` | `baseDecimoCuarto` | |
| `CPNMBSVC` | `baseVacaciones` | |
| `CPNMBSUT` | `baseUtilidades` | |
| `CPNMPTRN` | `patronal` | |
| `CPNMPRVS` | `provision` | |
| `CPNMOBLG` | `obligatorio` | |
| `CPNMRCRT` | `recortable` | |
| `CPNMRDEP` | `casilleroRdep` | |
| `CPNMIESS` | `codigoIess` | |
| `CPNMF107` | `casilleroF107` | (V) |
| `PLNNCDGO` | `planCuenta` (objeto `PlanCuenta`) | |
| `DTPLCDGO` | `detallePlantilla` (objeto `DetallePlantilla`) | |

> **`CPNMROLM` es `Long` y admite nulo.** Es el campo por el que el motor localiza cada
> concepto, nunca `CPNMALTR` ni la terna tipo/cálculo/base, y el índice `UQ_CPNM_ROLM` impide
> que dos conceptos reclamen el mismo rol. Sus **30** valores están en el rubro alterno **221**
> —16 de motor, 6 de provisión y **8 de finiquito (23–30), añadidos por el script 17**—.
> **El nulo es significativo** —un concepto ordinario no tiene
> rol en el motor—, así que el combo de la pantalla lo admite y no debe sustituirse por un cero
> ni por una cadena vacía.

## `RHH.CFNM` — ConfiguracionNomina

| Columna | Propiedad |
|---|---|
| `CFNMPLRL` / `CFNMPLPR` / `CFNMPLPG` / `CFNMPLLQ` | `plantillaRol` / `plantillaProvision` / `plantillaPago` / `plantillaLiquidacion` |
| `CFNMTARL` / `CFNMTAPR` / `CFNMTAPG` / `CFNMTALQ` | `tipoAsientoRol` / `tipoAsientoProvision` / `tipoAsientoPago` / `tipoAsientoLiquidacion` |
| `CFNMDCCS` | `desglosaCentroCosto` |
| `CFNMAPUT` | `aplicaUtilidades` |
| `CFNMAPJP` | `aplicaJubilacionPatronal` |
| `CFNMAPDS` | `aplicaDesahucio` |
| `CFNMRDND` | `redondeaRenglon` |
| `CFNMTLCD` | `toleranciaCuadre` |
| `CFNMCTMR` | `cuentaMarcadora` — `Long`. **Ratificado el 2026-08-19**; columna creada por el script 13. Es el `PLNNCDGO` marcador de líneas de plantilla sin configurar; la pantalla de configuración la muestra pero no debería ofrecer editarla a la ligera |

## `RHH.PRNM` — ParametroNomina

| Columna | Propiedad | Columna | Propiedad |
|---|---|---|---|
| `PRNMANOO` | `anio` | `PRNMRCSP` | `recargoSuplementaria` |
| `PRNMSBUU` | `sbu` | `PRNMRCEX` | `recargoExtraordinaria` |
| `PRNMCNBS` | `canastaBasica` | `PRNMRCNC` | `recargoNocturno` |
| `PRNMAPPR` | `aportePersonal` | `PRNMHRMX` | `maxHorasDia` |
| `PRNMAPPT` | `aportePatronal` | `PRNMHRSX` | `maxHorasSemana` |
| `PRNMIECE` | `iece` | `PRNMDIVC` | `diasVacaciones` |
| `PRNMSCAP` | `secap` | `PRNMANVC` | `anioVacacionAdicional` |
| `PRNMFNRS` | `fondosReserva` | `PRNMMXVC` | `maxDiasVacaciones` |
| `PRNMTPGP` | `porcentajeGastosPersonales` | `PRNMCDVC` | `aniosCaducidadVacaciones` |
| `PRNMCNCT` | `canastasCatastrofica` | `PRNMDSPR` | `porcentajeDesahucio` |
| `PRNMUTPR` | `utilidadPorcentaje` | `PRNMDIMN` | `indemnizacionMinima` |
| `PRNMUTDI` | `utilidadDias` | `PRNMDIMX` | `indemnizacionMaxima` |
| `PRNMUTCG` | `utilidadCargas` | `PRNMDIAN` | `aniosIndemnizacionMinima` |
| `PRNMUTSB` | `utilidadTopeSbu` | `PRNMDIAS` | `diasMes` |
| `PRNMHRMS` | `horasMes` | `PRNMDANO` | `diasAnio` |
| `PRNMHRDI` | `horasDia` | `PRNMHRIN` / `PRNMHRFN` | `horaInicioNocturna` / `horaFinNocturna` — `Long`, script 16 |

## `RHH.TBIR` — TablaImpuestoRenta

| Columna | Propiedad |
|---|---|
| `TBIRANOO` | `anio` |
| `TBIRORDN` | `orden` |
| `TBIRFRBS` | `fraccionBasica` |
| `TBIREXCS` | `excesoHasta` |
| `TBIRIMFB` | `impuestoFraccionBasica` |
| `TBIRPRCN` | `porcentaje` |

## `RHH.TPGP` — TopeGastoPersonal

| Columna | Propiedad |
|---|---|
| `TPGPANOO` | `anio` |
| `TPGPNCRG` | `numeroCargas` |
| `TPGPNCAN` | `numeroCanastas` |

## `RHH.CSTR` — CausalTerminacion

| Columna | Propiedad |
|---|---|
| `CSTRNMBR` | `nombre` |
| `CSTRALTR` | `codigoAlterno` |
| `CSTRARTC` | `articulo` |
| `CSTRDSHC` | `generaDesahucio` |
| `CSTRDSPD` | `generaDespido` |
| `CSTRVCPR` | `pagaVacacionesProporcionales` |
| `CSTRDCPR` | `pagaDecimosProporcionales` |
| `CSTRJBPT` | `generaJubilacionPatronal` |
| `CSTRAVSL` | `requiereAvisoSalida` |
| `CSTRACSU` | `requiereActaSut` |

## `RHH.FMRC` — FormatoArchivoMarcacion

| Columna | Propiedad |
|---|---|
| `FMRCNMBR` | `nombre` |
| `FMRCMRCA` | `marca` |
| `FMRCTPFR` | `tipoFormato` |
| `FMRCDLMT` | `delimitador` |
| `FMRCLNCB` | `lineasCabecera` |
| `FMRCLNPI` | `lineasPie` |
| `FMRCFRFC` | `formatoFecha` |
| `FMRCFRHR` | `formatoHora` |
| `FMRCFRFH` | `formatoFechaHora` |
| `FMRCCDFC` | `codificacion` |

## `RHH.DFMR` — DetalleFormatoMarcacion

| Columna | Propiedad |
|---|---|
| `FMRCCDGO` | `formato` (objeto `FormatoArchivoMarcacion`) |
| `DFMRCMPO` | `campo` |
| `DFMRORDN` | `orden` |
| `DFMRPSCN` | `posicion` |
| `DFMRINCO` | `indiceInicio` |
| `DFMRLNGT` | `longitud` |
| `DFMRMPEO` | `mapeo` |
| `DFMROBLG` | `obligatorio` |

## `RHH.TPCE` — TipoContratoEmpleado (campos añadidos por el script 05)

| Columna | Propiedad |
|---|---|
| `TPCETPRL` | `tipoRelacionLaboral` |
| `TPCEMXMS` | `duracionMaximaMeses` |

---

## Búsquedas por criterios

Las pantallas envían `selectByCriteria` con estos nombres de campo Java, así que
`obtieneCampos()` de cada DAO tiene que incluirlos o la búsqueda se ignora en silencio:

| Entidad | Campos usados en criterios |
|---|---|
| Todas las de parametría | `empresa.codigo` |
| `PRNM`, `TBIR`, `TPGP` | `anio` |
| `DFMR` | `formato.codigo` |
| Ordenación | `orden`, `nombre`, `numeroCargas` según la pantalla |

## Dos convenciones que conviven

- Las tablas creadas en esta fase guardan el estado como **`NUMBER` (1 / 0)**, según su DDL.
- Las tablas de RHH que ya existían (`CRGO`, `DPRT`, `DPTC`, `TPCE`, `TRNO`) lo guardan como
  **`VARCHAR2` ('A' / 'I')**. El frontend respeta cada una en su tabla; no se unifica desde el
  cliente.

## Permisos de menú

`modules/rrh/model/permisos-rrh.ts` asigna un `idPermiso` por pantalla en el rango **840–883**,
sustituyendo el 811/830 indiscriminado anterior. Esos códigos **deben crearse en el catálogo de
permisos del backend**. Hoy no se valida ninguno: la comprobación de
`shared/basics/menu/forms/menu-list/menu-list.component.ts` está comentada.

---

# Anexo — maestro de personal (fase 2)

Mismas convenciones que arriba. `MPLDCDGO` viaja siempre como objeto `Empleado`, no como escalar.

## `RHH.MPLD` — Empleado (campos añadidos por el script 05)

| Columna | Propiedad | Columna | Propiedad |
|---|---|---|---|
| `PJRQCDGO` | `empresa` | `MPLDCTSF` | `enfermedadCatastrofica` |
| `MPLDTPID` | `tipoIdentificacion` | `MPLDCDAF` | `codigoAfiliacion` |
| `MPLDESTC` | `estadoCivil` | `MPLDFCIN` | `fechaIngreso` |
| `MPLDGNRO` | `genero` | `MPLDRGNN` | `region` |
| `MPLDNCNL` | `nacionalidad` | `MPLDCDBM` | `codigoBiometrico` |
| `MPLDNVIN` | `nivelInstruccion` | `MPLDCTEM` | `contactoEmergencia` |
| `MPLDPRFS` | `profesion` | `MPLDTLEM` | `telefonoEmergencia` |
| `MPLDTPSN` | `tipoSangre` | `MPLDCNCS` | `centroCosto` |
| `MPLDDSCP` | `discapacidad` | `MPLDFOTO` | `foto` |
| `MPLDPRDS` | `porcentajeDiscapacidad` | `MPLDCNDS` | `carneConadis` |

## `RHH.CNTE` — ContratoEmpleado (campos añadidos)

| Columna | Propiedad | Columna | Propiedad |
|---|---|---|---|
| `CNTETPRL` | `tipoRelacionLaboral` | `CNTEAPRT` | `aportaIess` |
| `CNTEJRND` | `jornada` | `CNTERTFN` | `retieneFuente` |
| `CNTEHRSM` | `horasSemanales` | `CNTEPRRF` | `porcentajeRetencionFuente` |
| `CNTEVLHR` | `valorHora` | `CNTEOCUP` | `ocupacionMdt` |
| `CNTEDCTM` | `modalidadDecimoTercero` | `CNTECSTR` | `causalTerminacion` |
| `CNTEDCCM` | `modalidadDecimoCuarto` | `CNTEFCTR` | `fechaTerminacion` |
| `CNTEFRMD` | `modalidadFondosReserva` | `CNTECNCS` | `centroCosto` |
| `CNTEDCMS` | `derechoDecimoCuarto` | `CNTETRNO` | `turno` |

## `RHH.HSTR` — Historial (campos añadidos)

| Columna | Propiedad |
|---|---|
| `DPTCCDGO` | `departamentoCargo` (objeto `DepartamentoCargo`) |
| `HSTRTPCM` | `tipoCambio` |
| `HSTRSLAN` | `sueldoAnterior` |
| `HSTRSLNW` | `sueldoNuevo` |

> **VERIFICADO contra el backend el 2026-08-19 — la suposición era incorrecta.**
>
> `Historial` **no tiene** ninguna propiedad `departamento`. Al corregir el defecto 4, el campo
> mal mapeado se **renombró** a `departamentoCargo` y se repuntó a `DPTCCDGO`; no se creó un
> segundo campo. Sus únicas FK son `empleado`, `departamentoCargo` y `cargo`, y así lo confirma
> el `obtieneCampos()` de `HistorialDaoServiceImpl`.
>
> La columna `DPRTCDGO` sigue existiendo físicamente en la tabla como residuo del DDL original,
> pero **no está mapeada** y no viaja en el JSON.
>
> **Para el frontend:** el departamento se obtiene navegando
> `departamentoCargo.departamento`, no como campo propio de `Historial`. Cualquier pantalla que
> lea `historial.departamento` recibirá `undefined`.

## `RHH.CRGF` — CargaFamiliar

| Columna | Propiedad | Columna | Propiedad |
|---|---|---|---|
| `CRGFPRNT` | `parentesco` | `CRGFIRRB` | `calificaIr` |
| `CRGFIDNT` | `identificacion` | `CRGFUTIL` | `calificaUtilidades` |
| `CRGFAPLL` | `apellidos` | `CRGFDPEC` | `dependeEconomicamente` |
| `CRGFNMBR` | `nombres` | `CRGFFCIN` | `fechaInicio` |
| `CRGFFCHN` | `fechaNacimiento` | `CRGFFCFN` | `fechaFin` |
| `CRGFDSCP` | `discapacidad` | `CRGFPRDS` | `porcentajeDiscapacidad` |

## `RHH.CBEM` — CuentaBancariaEmpleado

| Columna | Propiedad |
|---|---|
| `BNCOCDGO` | `banco` (objeto `Banco` de TSR) |
| `CBEMTPCT` | `tipoCuenta` |
| `CBEMNMCT` | `numeroCuenta` |
| `CBEMTTLR` | `titular` |
| `CBEMIDTT` | `identificacionTitular` |
| `CBEMPRCP` | `principal` |
| `CBEMPRCN` | `porcentaje` |

## `RHH.GSPR` — GastoPersonalProyectado

| Columna | Propiedad |
|---|---|
| `GSPRANOO` | `anio` |
| `GSPRTPGP` | `tipoGasto` |
| `GSPRVLOR` | `valor` |
| `GSPRFCPR` | `fechaPresentacion` |
| `GSPRVGNT` | `vigente` |

## `RHH.CPXM` — ConceptoFijoEmpleado

| Columna | Propiedad |
|---|---|
| `CNTECDGO` | `contrato` (objeto `ContratoEmpleado`) |
| `CPNMCDGO` | `concepto` (objeto `ConceptoNomina`) |
| `CPXMVLRR` | `valor` |
| `CPXMPRCN` | `porcentaje` |
| `CPXMCANT` | `cantidad` |
| `CPXMFCHI` | `fechaInicio` |
| `CPXMFCHF` | `fechaFin` |
| `CPXMOBSR` | `observacion` |

## Rubros anteriores al 179 que usa el maestro de personal

Estos rubros ya existían en el sistema; sus códigos alternos están en `com.saa.rubros`.

| Campo | Rubro | `codigoAlterno` | Detalles |
|---|---|---|---|
| `MPLD.tipoIdentificacion` | `TipoIdentificacion` | **36** | 1 = cédula, 2 = RUC, 3 = pasaporte, 4 = identificación del exterior |

## `RHH.NVIS` — NovedadIess

| Columna | Propiedad |
|---|---|
| `CNTECDGO` | `contrato` (objeto `ContratoEmpleado`) |
| `NVISTPNV` | `tipoNovedad` |
| `NVISFCHC` | `fechaHecho` |
| `NVISFCLM` | `fechaLimite` |
| `NVISFCRP` | `fechaReporte` |
| `NVISSLAN` | `sueldoAnterior` |
| `NVISSLNW` | `sueldoNuevo` |
| `NVISMDFR` | `modalidadFondosReserva` |
| `NVISCSTR` | `causalTerminacion` (objeto `CausalTerminacion`) |
| `NVISOBSR` | `observacion` |

> **`NVISFCLM` la calcula el backend.** El plazo legal —15 días para el aviso de entrada, 3 para
> el de salida— no está en ninguna tabla de parámetros, así que el frontend no puede derivarlo:
> se limita a comparar `fechaLimite` con la fecha de hoy para el semáforo. Si el backend deja esa
> columna en nulo, la pestaña muestra el plazo como desconocido en lugar de inventarlo.

## Criterios de búsqueda de la ficha

| Entidad | Campos usados en criterios |
|---|---|
| `CRGF`, `CBEM`, `GSPR`, `CPXM`, `NVIS`, `CNTE`, `HSTR` | `empleado.codigo` |
| Ordenación | `apellidos`, `numeroCuenta`, `anio`, `fechaInicio`, `fechaHecho` |

## Un hueco pendiente

`MPLDTPID` referencia "rubro TipoIdentificacion", un rubro preexistente cuyo `codigoAlterno` no
consta en el frontend (los rubros de RRHH arrancan en 179; este es anterior). El campo está en el
modelo y viaja en el JSON, pero **su combo no se pintó**: poner un número al azar reproduciría el
error de `RS_TPPR` —datos válidos del dominio equivocado—. Hace falta el `codigoAlterno` real.

---

# Anexo — migración y motor de nómina (fases 3 y 4)

**Origen invertido.** En las fases 1 y 2 el frontend fijó los nombres y el backend se alineó.
Aquí es al revés: el backend construyó primero, así que **esta tabla se extrajo de sus entidades
reales** el 2026-08-19 y es la que el frontend debe consumir.

Convenciones comunes, idénticas a las fases anteriores: `XXXXCDGO` → `codigo`,
`PJRQCDGO` → `empresa`, `MPLDCDGO` → `empleado`, `PRDNCDGO` → `periodoNomina`,
`CPNMCDGO` → `conceptoNomina`, `XXXXESTD` → `estado`, `XXXXFCHR` → `fechaRegistro`,
`XXXXUSRR` → `usuarioRegistro`.

Las banderas `S`/`N` viajan como `String`, no como `boolean`. Los importes son `Double`.

## Fase 3 — migración

### `RHH.SLAP` — SaldoApertura
| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `SLAPIDNT` | `identificacion` | | `SLAPOBSR` | `observacion` |
| `SLAPFCCR` | `fechaCorte` | | `SLAPAPLC` | `aplicado` |
| `SLAPTPSL` | `tipoSaldo` | | `SLAPFCAP` | `fechaAplicacion` |
| `SLAPVLOR` | `valor` | | `SLAPRFTB` | `tablaReferencia` |
| `SLAPDIAS` | `dias` | | `SLAPRFID` | `idReferencia` |
| `SLAPFCHA` | `fecha` | | `SLAPANOO` | `anio` |
| `SLAPNMCT` | `numeroCuotas` | | | |

### `RHH.ACMN` — AcumuladoNomina
| Columna | Propiedad |
|---|---|
| `ACMNANOO` / `ACMNMSEE` | `anio` / `mes` |
| `ACMNTPAC` | `tipoAcumulado` |
| `ACMNVLOR` / `ACMNDIAS` | `valor` / `dias` |
| `ACMNAPRT` | `aperturaMigracion` |

### `RHH.DSRC` — DescuentoRecurrente
| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `DSRCTPDS` | `tipoDescuento` | | `DSRCPRCN` | `porcentaje` |
| `DSRCNMRO` | `numero` | | `DSRCFCHI` | `fechaInicio` |
| `DSRCVLOR` | `valor` | | `DSRCFCHF` | `fechaFin` |
| `DSRCSLDD` | `saldo` | | `DSRCBNFC` | `beneficiario` |
| `DSRCNMCT` | `numeroCuotas` | | `DSRCOBSR` | `observacion` |
| `DSRCCTPG` | `cuotasPagadas` | | `DSRCAPRT` | `aperturaMigracion` |
| `DSRCVLCT` | `valorCuota` | | | |

### `RHH.CTDS` — CuotaDescuento
| Columna | Propiedad |
|---|---|
| `DSRCCDGO` | `descuentoRecurrente` |
| `CTDSNMCT` | `numeroCuota` |
| `CTDSFCVN` | `fechaVencimiento` |
| `CTDSTTAL` / `CTDSCPTL` / `CTDSINTR` | `total` / `capital` / `interes` |
| `CTDSVLDS` | `valorDescontado` |
| `CTDSSLDD` | `saldo` |

## Fase 4 — motor de nómina

### `RHH.NVNM` — NovedadNomina
| Columna | Propiedad |
|---|---|
| `NVNMCANT` / `NVNMVLRR` | `cantidad` / `valor` |
| `NVNMDSCR` | `descripcion` |
| `NVNMAPRB` | `aprobada` |
| `NVNMUSAP` / `NVNMFCAP` | `usuarioAprueba` / `fechaAprobacion` |

### `RHH.PVNM` — ProvisionNomina
| Columna | Propiedad |
|---|---|
| `PVNMTPPR` | `tipoProvision` |
| `PVNMBSCL` / `PVNMVLOR` | `baseCalculo` / `valor` |

### `RHH.PYIR` — ProyeccionImpuestoRenta
| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `PYIRANOO` / `PYIRMSDS` | `anio` / `mesDesde` | | `PYIRRBJA` | `rebaja` |
| `PYIRINRL` | `ingresosRealizados` | | `PYIRIMPG` | `impuestoAPagar` |
| `PYIRINFT` | `ingresosFuturos` | | `PYIRRTEF` | `retencionesEfectuadas` |
| `PYIRINPR` | `ingresosProyectados` | | `PYIRMSRS` | `mesesRestantes` |
| `PYIRAPPR` | `aportePersonalProyectado` | | `PYIRRTEM` | `retencionMensual` |
| `PYIRBSIM` | `baseImponible` | | `PYIRNCRG` | `numeroCargas` |
| `PYIRIMCS` | `impuestoCausado` | | `PYIRCTSF` | `enfermedadCatastrofica` |
| `PYIRGSDC` | `gastosDeclarados` | | `PYIRVGNT` | `vigente` |
| `PYIRTPGS` | `topeGastos` | | `PYIRMTVO` | `motivo` |

### `RHH.LQBS` — LiquidacionBeneficioSocial
| Columna | Propiedad |
|---|---|
| `LQBSTPBN` / `LQBSANOO` | `tipoBeneficio` / `anio` |
| `LQBSFCHI` / `LQBSFCHF` | `fechaInicio` / `fechaFin` |
| `LQBSBSCL` / `LQBSDIAS` | `baseCalculo` / `dias` |
| `LQBSVLRR` | `valor` |
| `LQBSVLMN` | `valorMensualizado` |
| `LQBSVLPG` / `LQBSFCPG` | `valorPagado` / `fechaPago` |

### `RHH.HREX` — HoraExtra
| Columna | Propiedad |
|---|---|
| `RSMNCDGO` | `resumenNomina` |
| `HREXTPHR` / `HREXFCHA` | `tipoHoraExtra` / `fecha` |
| `HREXHORS` / `HREXVLHR` / `HREXRCRG` / `HREXVLOR` | `horas` / `valorHora` / `recargo` / `valor` |
| `HREXAPRB` / `HREXUSAP` / `HREXFCAP` | `aprobada` / `usuarioAprueba` / `fechaAprobacion` |
| `HREXEXCP` | `excedeTope` |
| `HREXOBSR` | `observacion` |

## Ampliaciones de tablas existentes (fase 4)

### `RHH.PRDN` — PeriodoNomina
| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `PRDNMODO` | `modo` | | `PRDNFCCR` / `PRDNUSCR` | `fechaCierre` / `usuarioCierra` |
| `PRDNTPNM` | `tipoPeriodo` | | `PRDNTTIN` | `totalIngresos` |
| `PRDNFCCN` | `fechaContable` | | `PRDNTTDS` | `totalDescuentos` |
| `PRDNASNT` | `asientoRol` | | `PRDNTTNT` | `totalNeto` |
| `PRDNASPR` | `asientoProvisiones` | | `PRDNTTPT` | `totalPatronal` |
| `PRDNASPG` | `asientoPago` | | `PRDNNMEM` | `numeroEmpleados` |
| `PRDNFCAP` / `PRDNUSAP` | `fechaAprobacion` / `usuarioAprueba` | | `PRDNOBSR` | `observaciones` |

> `PRDNESTD` y `NMNAESTD` son ahora **`Long`** (rubros 182 y 183). `RLPGESTD` sigue siendo
> `String`: el script 05 no lo convirtió.

### `RHH.NMNA` — Nomina
| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `NMNADITR` / `NMNAHRTR` | `diasTrabajados` / `horasTrabajadas` | | `NMNAAPPR` | `aportePersonal` |
| `NMNABSIE` | `baseIess` | | `NMNAAPPT` | `aportePatronal` |
| `NMNABSIR` | `baseImpuestoRenta` | | `NMNAIESC` | `aporteIeceSecap` |
| `NMNABSFR` | `baseFondosReserva` | | `NMNAFNRS` | `fondosReserva` |
| `NMNABSDT` | `baseDecimoTercero` | | `NMNARTIR` | `retencionImpuestoRenta` |
| `NMNABSDC` | `baseDecimoCuarto` | | `NMNATTPT` | `totalPatronal` |
| | | | `NMNAOBSR` | `observacion` |

### `RHH.RNGL` — ReglonNomina
| Columna | Propiedad |
|---|---|
| `CPNMCDGO` | `conceptoNomina` |
| `RNGLDSCR` / `RNGLTPCN` | `descripcion` / `tipoConcepto` |
| `RNGLBSCL` / `RNGLPRCN` | `baseCalculo` / `porcentaje` |
| `RNGLORGN` / `RNGLMNAL` | `origen` / `manual` |
| `RNGLIMIE` | `imponibleIess` |
| `RNGLIMIR` | **`gravadoIr`** — ver nota |
| `RNGLPTRN` | `patronal` |
| `RNGLRFTB` / `RNGLRFID` | `tablaReferencia` / `idReferencia` |

> **Inconsistencia conocida y aceptada.** `CPNMIMIR` es `imponibleIr` en `ConceptoNomina`, pero
> `RNGLIMIR` es `gravadoIr` en `ReglonNomina`. Es el mismo concepto con dos nombres. Se deja así
> porque el backend ya está construido y el renombrado no aporta valor funcional, pero **hay que
> tenerlo presente al copiar código entre las dos pantallas**: es el tipo de detalle que produce
> un campo vacío sin error.

### `RHH.RLPG` — RolPago
| Columna | Propiedad |
|---|---|
| `RLPGTTIN` / `RLPGTTDS` / `RLPGNETO` | `totalIngresos` / `totalDescuentos` / `neto` |
| `RLPGHASH` | `hash` |
| `RLPGFCEN` / `RLPGRCBD` | `fechaEnvio` / `recibido` |

---

# Aclaraciones verificadas contra el código

## `RHH.DPTC` — DepartamentoCargo serializa en **minúscula**

**Verificado el 2026-08-19 en `model/rhh/DepartamentoCargo.java`.** La entidad declara:

```java
@JoinColumn(name = "DPRTCDGO", referencedColumnName = "DPRTCDGO", nullable = false)
private Departamento departamento;      // getDepartamento() / setDepartamento()

@JoinColumn(name = "CRGOCDGO", referencedColumnName = "CRGOCDGO", nullable = false)
private Cargo cargo;                    // getCargo() / setCargo()
```

JSON-B deriva el nombre de la propiedad **del getter**, no del campo, así que el JSON lleva
`departamento` y `cargo` en minúscula. El `obtieneCampos()` del DAO usa las mismas grafías, de
modo que `selectByCriteria` también funciona en minúscula.

| Columna | Propiedad |
|---|---|
| `DPRTCDGO` | `departamento` (objeto `Departamento`) |
| `CRGOCDGO` | `cargo` (objeto `Cargo`) |

> **La mayúscula del modelo del frontend era un error del scaffolding original.** El código
> anterior lo enmascaraba con `item.Departamento ?? item.departamento`, que es por lo que la
> pantalla "funcionaba" sin que nadie notara el defecto. **La tolerancia de lectura puede
> retirarse**: no hay ningún caso en que el backend emita la mayúscula.

## `NVIS.NVISFCLM` — el plazo sí está parametrizado

Los plazos legales viven en el **rubro 204 `RHH_TIPO_NOVEDAD_IESS`**, en el `PDTRVLRN` de cada
detalle: aviso de entrada 15 días, el resto 3. El frontend los lee de ahí para rellenar el
vencimiento cuando `NVISFCLM` viene nula y para contrastar el valor que calcula el backend.

Un `PDTRVLRN` en 0 se interpreta como parámetro ausente, no como plazo de cero días.

## `RHH.SLDV` — SaldoVacaciones (campos añadidos por el script 05)

**Verificado el 2026-08-19 en `model/rhh/SaldoVacaciones.java`.**

| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `SLDVANOO` | `anio` | | `SLDVDIAR` | `diasArrastrados` |
| `SLDVASGN` | `diasAsignados` | | `SLDVDIPG` | `diasPagados` |
| `SLDVUSDO` | `diasUsados` | | `SLDVVLDI` | `valorDia` |
| `SLDVPNDE` | `diasPendientes` | | `SLDVCDCD` | `caducado` |
| `SLDVFCHI` / `SLDVFCHF` | `fechaInicio` / `fechaFin` | | `SLDVAPRT` | **`aperturaMigracion`** |
| `SLDVDIAD` | `diasAdicionales` | | `SLDVESTD` | `estado` (`Long`) |

> `SLDVAPRT` se llama `aperturaMigracion`, igual que `ACMNAPRT` y `DSRCAPRT`. La suposición del
> frontend era correcta: es la misma columna con el mismo sentido en las tres tablas.

---

# Anexo — asistencia manual (fase 7) y rol de pago (fase 5)

## `RHH.MRCC` — Marcaciones (campos añadidos por el script 05)

| Columna | Propiedad | Uso hoy |
|---|---|---|
| `CRMRCDGO` | `cargaMarcaciones` | Sin uso: no existe el importador |
| `MRCCDSPS` | `dispositivo` | Sin uso |
| `MRCCLNAR` | `lineaArchivo` | Sin uso |
| `MRCCPRCS` | `procesado` | Sí: marca las ya consolidadas en un resumen |

## `RHH.RSMN` — ResumenNomina: columnas preexistentes que se prestan a error

Fijadas el 2026-08-19 tras encontrarse el modelo del frontend con tipo y columna equivocados.
Verificado contra `ResumenNomina.java`:

| Columna | Propiedad | Tipo | Nota |
|---|---|---|---|
| `RSMNASNT` | `ausencia` | `String` | **No es `RSMNAUSN` ni es numérica.** Es además obligatoria (`NOT NULL`): la consolidación la llena siempre |
| `RSMNTRDE` | `minutosTarde` | `Integer` | **No es `RSMNMNTR`.** El nombre de propiedad sí es `minutosTarde` |
| `RSMNTPAS` | `tipoAusencia` | `Long` | Rubro 207; esta sí es el detalle de rubro. No confundir con `ausencia` |

## `RHH.RSMN` — ResumenNomina (campos añadidos por el script 05)

| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `RSMNHRTR` | `horasTrabajadas` | | `RSMNENTT` | `entradaReal` |
| `RSMNHRSP` | `horasSuplementarias` | | `RSMNSLDT` | `salidaReal` |
| `RSMNHREX` | `horasExtraordinarias` | | `RSMNINCN` | `inconsistente` |
| `RSMNHRNC` | `horasNocturnas` | | `RSMNPRCS` | `procesado` |
| `RSMNSLAN` | `minutosSalidaAnticipada` | | `RSMNJSTC` | `justificacion` |
| `RSMNTPAS` | `tipoAusencia` | | | |

## `RHH.RLPG` — RolPago (campos añadidos por el script 05)

| Columna | Propiedad |
|---|---|
| `RLPGTTIN` / `RLPGTTDS` / `RLPGNETO` | `totalIngresos` / `totalDescuentos` / `neto` |
| `RLPGHASH` | `hash` |
| `RLPGFCEN` / `RLPGRCBD` | `fechaEnvio` / `recibido` |

> **Ratificación y alcance — 2026-08-19 (dueño del contrato).** Los nombres de las tres tablas
> de este anexo quedan **ratificados como contrato**. Pero ojo con lo que existe hoy del lado
> del servidor, verificado contra las entidades Java:
>
> - **`RolPago` ya mapea todo lo listado.** Ida y vuelta completa.
> - **`Marcaciones` no mapea ninguna de las cuatro** (`CRMRCDGO`, `MRCCDSPS`, `MRCCLNAR`,
>   `MRCCPRCS`): la entidad llega hasta `observacion`. **`procesado` no viaja**: lo que la
>   pantalla escriba ahí se descarta en silencio al guardar, y al leer llega `undefined`.
> - **`ResumenNomina` solo mapea `tipoAusencia`** de las once columnas nuevas. Las diez
>   restantes —incluida `justificacion`, que la pantalla de corrección usa— tampoco viajan
>   todavía.
>
> Las ampliaciones de `Marcaciones` y `ResumenNomina` son parte del orden 3 (fase 7) del
> backend, que **debe usar exactamente estos nombres**. Hasta esa recompilación, el frontend no
> debe apoyar ninguna funcionalidad en `procesado` ni en los campos de `RSMN` no mapeados.

## Dos cosas que encontramos al construir

**`MRCC.tipo`, `MRCC.origen` y `RSMN.fuente` — actualización del 2026-08-19.** El hallazgo
original era que seguían en `VARCHAR2` pese a existir los rubros 192 y 193. Ya no: **el delta 11
las convirtió a `NUMBER` en la base**, y el backend ya pasó los tres campos a `Long` en su árbol
de trabajo, pendiente de recompilar y publicar. La tolerancia del frontend
—`descripcionTolerante()` en `forms/asistencia/utiles-asistencia.ts`— **se mantiene hasta que
esa recompilación esté publicada**; con el aviso, los tres campos pasan a `number`, los combos
escriben el código alterno y la tolerancia se retira.

**`rol-pago.service.ts` apuntaba a `/rsmn` en vez de `/rlpg`.** Los seis métodos del servicio
consultaban la tabla de resúmenes diarios. Es la misma clase de defecto que los cinco endpoints
rotos de la fase 0 y no estaba en aquella lista. Corregido.

## Lo que no se construyó, y por qué

- **Importación del biométrico.** `RHH.CRMR` (`CargaMarcaciones`) no existe en el backend y el
  formato del archivo sigue pendiente del cliente. Las tres columnas de trazabilidad del lote
  están en el modelo pero sin pantalla.
- **Consolidación de marcaciones a resumen diario.** Es un proceso de backend
  (`MarcacionesServiceImpl.consolidar`) que todavía no tiene endpoint en el contrato. El
  frontend registra marcaciones y corrige resúmenes; consolidar aún no se puede disparar desde
  la pantalla.

---

## `EntityDaoImpl.selectByCriteria` no sabe enlazar `Integer`

`TipoDatosBusqueda` declara `INTEGER = 7` en los dos lados, pero el `switch` que enlaza los
parámetros en `EntityDaoImpl.selectByCriteria` solo tiene `case` para `STRING`, `LONG`, `DATE`,
`DATE_TIME` y `DOUBLE`. `INTEGER` cae en el `default: break;`.

La cláusula del `WHERE` se arma en un bucle anterior e independiente del tipo, así que un criterio
`INTEGER` no se ignora: escribe la comparación en el JPQL y nunca enlaza el parámetro. La consulta
falla al ejecutarse.

Consecuencia para RHH: **`anio` no se puede filtrar en el servidor**. Está mapeado como `Integer`
en `ParametroNomina`, `TablaImpuestoRenta`, `TopeGastoPersonal`, `AcumuladoNomina`,
`ProyeccionImpuestoRenta`, `SaldoVacaciones`, `GastoPersonalProyectado` y `PeriodoNomina`.

- Enviar `LONG` → `Argument [2026] of type [java.lang.Long] did not match parameter type [java.lang.Integer]`.
- Enviar `INTEGER` → parámetro sin enlazar.

El frontend filtra el año en el cliente (`filtrarPorAnio` en
`modules/rrh/forms/parametrizacion/utiles-parametrizacion.ts`), que es además el patrón que ya usa
el resto del sistema con este DAO genérico —tampoco pagina del lado del servidor— y los volúmenes
lo permiten sobradamente. El filtro por empresa y por colaborador se mantiene en el servidor,
porque `codigo` sí es `Long`.

**Petición al backend:** añadir el `case INTEGER` al `switch`, análogo al de `LONG` pero con
`Integer.valueOf(...)`. Es una línea y beneficia a todos los módulos, no solo a RHH. Cuando esté,
el filtro se puede devolver al servidor sin tocar las pantallas: basta cambiar `filtrarPorAnio`
por un criterio.

> **Hecho el 2026-08-20, con la conducta previa verificada antes de tocar nada.** El `case
> INTEGER` está en `EntityDaoImpl.selectByCriteria`, calcado del de `LONG` y con su rama de
> `BETWEEN`. **Pendiente de recompilar**; hasta entonces `filtrarPorAnio` se queda donde está.
>
> Lo que se comprobó antes de autorizarlo, porque es infraestructura de los nueve módulos:
> un criterio `INTEGER` **lanzaba**, no se ignoraba. `AbstractSelectionQuery.beforeQuery()` llama
> a `QueryParameterBindings.validate()`, que recorre los bindings y lanza
> `org.hibernate.QueryParameterException` ante cualquiera sin enlazar —verificado desensamblando
> el `hibernate-core-6.6.31.Final.jar` que corre en el servidor—, y nadie la absorbe: ni
> `selectByCriteria`, ni ningún `*DaoServiceImpl`, ni la capa de servicio. Por eso el cambio es
> **aditivo**: ningún módulo podía estar apoyándose en que el filtro no se aplicara, porque hoy
> no devuelve resultados sin filtrar — no devuelve nada.
>
> **Lo que el `case` no arregla.** Se enlaza `Integer`, no `Long`, así que un criterio `INTEGER`
> contra un atributo declarado `Long` sigue fallando, ahora por choque de tipos. Las cuatro
> búsquedas de CRD que mandan `INTEGER` contra campos `Long` —o contra campos que no existen—
> están registradas en `docs/pendientes/BUSQUEDAS-ROTAS-CRD.md`; son defectos del llamador y se
> arreglan ahí. **Se descartó coercionar tipos dentro del DAO genérico**: repararía el síntoma de
> un defecto ajeno y lo escondería. Criterio fijado para toda la infraestructura compartida:
> **aditivo o nada**.

> **Un defecto vecino, reportado y no tocado.** En el mismo `switch`, el `case DOUBLE` enlaza el
> segundo parámetro de un `BETWEEN` con `aBuscar.getValor()` en vez de `getValor1()`
> (`EntityDaoImpl.java`, rama `DOUBLE`), de modo que un rango de importes compara contra el
> límite inferior dos veces. No lo corregí: es infraestructura compartida y corregirlo **cambia
> resultados** donde hoy alguien podría estar leyendo los que salen. Queda a decisión del dueño
> del modelo.

### Fechas: `LocalDate` va con `DATE`, `LocalDateTime` con `DATE_TIME`

El `case DATE` enlaza un `LocalDate` (formato `yyyy-MM-dd`) y el `case DATE_TIME` un
`LocalDateTime` (formato `yyyy-MM-dd HH:mm`). Filtrar un campo `LocalDateTime` con `DATE` produce
el mismo choque de tipos que el `anio`.

En RHH el único campo `LocalDateTime` filtrado es `MRCCFCHR` (`Marcaciones.fechaHora`); el rango de
la pantalla de marcaciones se envía como `DATE_TIME` completando la hora (`00:00` / `23:59`). Los
demás campos filtrados —`ResumenNomina.fecha`, `Peticiones.fechaDesde`,
`SolicitudVacaciones.fechaDesde`, `SaldoApertura.fechaCorte`— son `LocalDate` y van con `DATE`.

---

# Anexo — orden de pago (fase 6): `RDPG` y `DRPG`

**Fijado el 2026-08-19 por el dueño del contrato, verificado contra el DDL del script 04.**
El backend construye las dos entidades con exactamente estos nombres; el frontend espeja sus
interfaces cuando llegue a la pantalla de órdenes de pago. Como siempre: un desajuste aquí no
rompe ninguna compilación — el campo llega vacío o no se guarda.

## `RHH.RDPG` — `OrdenPagoNomina` (`@Path("rdpg")`)

| Columna | Propiedad | Tipo | Nota |
|---|---|---|---|
| `RDPGCDGO` | `codigo` | `Long` | PK IDENTITY |
| `PJRQCDGO` | `empresa` | `@ManyToOne Empresa` | Obligatoria; se resuelve desde el `PRDN` |
| `PRDNCDGO` | `periodoNomina` | `@ManyToOne PeriodoNomina` | Obligatoria |
| `CTBNCDGO` | `cuentaBancaria` | `@ManyToOne CuentaBancaria` (`tsr`) | La cuenta de la que sale el pago |
| `RDPGNMRO` | `numero` | `String` | Número de la orden |
| `RDPGFCEM` | `fechaEmision` | `LocalDate` | |
| `RDPGFCAC` | `fechaAcreditacion` | `LocalDate` | Nula hasta confirmar |
| `RDPGTTAL` | `total` | `Double` | Suma de los detalles, con `RedondeoNomina` |
| `RDPGNMEM` | `numeroEmpleados` | `Integer` | |
| `RDPGRTAR` | `rutaArchivo` | `String` | Archivo bancario generado |
| `ASNTCDGO` | `asientoPago` | `Long` | Código del asiento, sin `@ManyToOne` — mismo criterio que `PRDNASNT` |
| `EGRSCDGO` | `egreso` | `Long` | Código del `TSR.EGRS` consolidado |
| `RDPGESTD` | `estado` | `Long` | Rubro 208 `RHH_ESTADO_ORDEN_PAGO` |
| `RDPGOBSR` | `observaciones` | `String` | |
| `RDPGFCHR` | `fechaRegistro` | `LocalDateTime` | |
| `RDPGUSRR` | `usuarioRegistro` | `String` | |

## `RHH.DRPG` — `DetalleOrdenPagoNomina` (`@Path("drpg")`)

| Columna | Propiedad | Tipo | Nota |
|---|---|---|---|
| `DRPGCDGO` | `codigo` | `Long` | PK IDENTITY |
| `RDPGCDGO` | `ordenPagoNomina` | `@ManyToOne OrdenPagoNomina` | Obligatoria |
| `MPLDCDGO` | `empleado` | `@ManyToOne Empleado` | Obligatoria |
| `NMNACDGO` | `nomina` | `@ManyToOne Nomina` | |
| `CBEMCDGO` | `cuentaBancariaEmpleado` | `@ManyToOne CuentaBancariaEmpleado` | |
| `DRPGVLOR` | `valor` | `Double` | **Obligatoria** — redondeada por renglón |
| `DRPGNMCT` | `numeroCuenta` | `String` | Snapshot: no navegar al `CBEM` para imprimir |
| `DRPGTPCT` | `tipoCuenta` | `Long` | Snapshot, rubro 199 |
| `DRPGBNCO` | `banco` | `String` | Snapshot |
| `DRPGIDNT` | `identificacion` | `String` | Snapshot |
| `DRPGNMBN` | `nombreBeneficiario` | `String` | Snapshot |
| `DRPGRCHZ` | `rechazado` | `String` (1) | `'S'`/`'N'` |
| `DRPGMTRC` | `motivoRechazo` | `String` | |
| `DRPGESTD` | `estado` | `Long` | |
| `DRPGFCHR` | `fechaRegistro` | `LocalDateTime` | |
| `DRPGUSRR` | `usuarioRegistro` | `String` | |

**Dos decisiones que acompañan a los nombres:**

- **Los cinco campos snapshot de `DRPG` se llenan al generar la orden** copiando del `CBEM`
  vigente (o del reparto por `CBEMPRCN`), y no se releen nunca: son la constancia de a qué
  cuenta se ordenó pagar, aunque el empleado cambie de banco después. Mismo criterio que los
  snapshot de `RNGL`.
- **`asientoPago` y `egreso` van como `Long`, no como relación**, igual que `PRDNASNT`: cruzan
  módulos (CNT y TSR) y la relación JPA acoplaría los esquemas sin necesidad — quien quiera el
  detalle navega por el código.

---

# Anexo — formato del archivo bancario (fase 6): `FMBN` y `DFMB`

**Fijado el 2026-08-19, junto con el script 14 que crea las tablas.** Espejo de salida de
`FMRC`/`DFMR`: el formato del banco es dato. `generarArchivoBancario` lee estas dos tablas;
mientras no exista un `FMBN` activo para la empresa, lanza explicando qué falta.

## `RHH.FMBN` — `FormatoArchivoBancario` (`@Path("fmbn")`)

| Columna | Propiedad | Tipo |
|---|---|---|
| `FMBNCDGO` / `PJRQCDGO` | `codigo` / `empresa` | `Long` / `@ManyToOne Empresa` |
| `FMBNNMBR` / `FMBNBNCO` | `nombre` / `banco` | `String` |
| `FMBNTPFR` | `tipoFormato` | `Long` — rubro **209**, que aplica a cualquier archivo plano |
| `FMBNDLMT` / `FMBNEXTN` / `FMBNCDFC` | `delimitador` / `extension` / `codificacion` | `String` |
| `FMBNFRFC` | `formatoFecha` | `String` |
| `FMBNCBCR` / `FMBNPIEE` | `plantillaCabecera` / `plantillaPie` | `String` — marcadores `{FECHA}` `{CONTADOR}` `{TOTAL}` `{EMPRESA}` `{SECUENCIAL}` |
| `FMBNMPTC` | `mapaTipoCuenta` | `String` — `alternoRubro199=codigoBanco;…` |
| `FMBNESTD` / `FMBNFCHR` / `FMBNUSRR` | `estado` / `fechaRegistro` / `usuarioRegistro` | `Long` / `LocalDateTime` / `String` |

## `RHH.DFMB` — `DetalleFormatoBancario` (`@Path("dfmb")`)

| Columna | Propiedad | Tipo |
|---|---|---|
| `DFMBCDGO` | `codigo` | `Long` |
| `FMBNCDGO` | `formato` | `@ManyToOne FormatoArchivoBancario` |
| `DFMBCMPO` | `campo` | `Long` — rubro **224** `RHH_CAMPO_ARCHIVO_BANCARIO` (11 valores) |
| `DFMBORDN` | `orden` | `Integer` — único por formato (`UQ_DFMB_ORDN`) |
| `DFMBINCO` / `DFMBLNGT` | `indiceInicio` / `longitud` | `Integer` |
| `DFMBRLLN` / `DFMBCRLL` | `ladoRelleno` (`'I'`/`'D'`) / `caracterRelleno` | `String` (1) |
| `DFMBDCML` / `DFMBSPDC` | `decimales` / `incluyeSeparadorDecimal` | `Integer` / `String` (1, S/N) |
| `DFMBFRFC` | `formatoFecha` | `String` — nulo usa el del formato |
| `DFMBVLFJ` | `valorFijo` | `String` |
| `DFMBESTD` / `DFMBFCHR` / `DFMBUSRR` | `estado` / `fechaRegistro` / `usuarioRegistro` | `Long` / `LocalDateTime` / `String` |

---

# Anexo — liquidación de haberes (fase 8): `LQDC` y `TMLQ`

**Fijado el 2026-08-19.** Cierra los **tres huecos de mapeo** detectados en el orden 0 y
verificados contra el script 05. Son ampliaciones de dos entidades que ya existen: no se
renombra nada de lo ya mapeado.

## `RHH.LQDC` — `Liquidacion`: las 14 columnas sin mapear

| Columna | Propiedad | Tipo |
|---|---|---|
| `CSTRCDGO` | `causalTerminacion` | `@ManyToOne CausalTerminacion` |
| `LQDCFCIN` | `fechaIngreso` | `LocalDate` |
| `LQDCANSR` | `aniosServicio` | `Double` |
| `LQDCULRM` | `ultimaRemuneracion` | `Double` |
| `LQDCTTIN` / `LQDCTTDS` | `totalIngresos` / `totalDescuentos` | `Double` |
| `LQDCDSHC` | `desahucio` | `Double` |
| `LQDCDSPD` | `despidoIntempestivo` | `Double` |
| `LQDCJBPT` | `jubilacionPatronal` | `Double` |
| `LQDCACSU` | `actaSut` | `String` |
| `LQDCFCSU` | `fechaSut` | `LocalDate` |
| `ASNTCDGO` | `asiento` | `Long` — código, sin `@ManyToOne`, igual que `PRDNASNT` |
| `LQDCFCAP` / `LQDCUSAP` | `fechaAprobacion` / `usuarioAprueba` | `LocalDate` / `String` |

**Y el tercer hueco:** `LQDCESTD` **pasa de `String` a `Long`**. El script 05 hizo
`DROP COLUMN` y la recreó como `NUMBER DEFAULT 1`, detalle del rubro **196**
`RHH_ESTADO_LIQUIDACION`. La propiedad sigue llamándose `estado`. Es la misma familia que
`MRCCTPOO`: la primera escritura con `String` habría dado `ORA-01722`.

## `RHH.TMLQ` — `DetalleLiquidacion`: las 5 columnas sin mapear

| Columna | Propiedad | Tipo |
|---|---|---|
| `CPNMCDGO` | `conceptoNomina` | `@ManyToOne ConceptoNomina` |
| `TMLQTPCN` | `tipoConcepto` | `Long` — snapshot |
| `TMLQBSCL` | `baseCalculo` | `Double` — snapshot |
| `TMLQDIAS` | `dias` | `Double` |
| `TMLQORDN` | `orden` | `Integer` |

Sin `conceptoNomina` no se puede cumplir «cada rubro del finiquito genera un `TMLQ` con su
`CPNMCDGO`», que es lo que permite clasificar cada rubro en su línea del rubro 214 al
contabilizar. `tipoConcepto` y `baseCalculo` son **snapshot**, mismo criterio que `RNGL`: se
congelan al calcular y no se releen del concepto.

## `RHH.CRMR` — `CargaMarcaciones` (fase 7) — ratificado

| Columna | Propiedad | | Columna | Propiedad |
|---|---|---|---|---|
| `PJRQCDGO` | `empresa` | | `CRMRLNTT` | `lineasTotales` |
| `FMRCCDGO` | `formato` | | `CRMRLNOK` | `lineasOk` |
| `CRMRNMAR` | `nombreArchivo` | | `CRMRLNER` | `lineasError` |
| `CRMRHASH` | `hash` | | `CRMRLNDP` | `lineasDuplicadas` |
| `CRMRFCCR` | `fechaCarga` | | `CRMRLGGO` | `log` |
| `CRMRFCDS` / `CRMRFCHS` | `fechaDesde` / `fechaHasta` | | | |

Coinciden con el DTO `ResultadoImportacionMarcaciones` de la §6 del maestro, que es lo que hace
que la pantalla de importación pueda usar el mismo modelo para el resultado y para el historial.

---

# Anexo — salidas oficiales y utilidades (fase 9): `UTLD`, `DTUT` y `SLOF`

**Fijado el 2026-08-19.** `UTLD`/`DTUT` vienen del script 04; `SLOF` del script 13.

## `RHH.UTLD` — `Utilidad` (`@Path("utld")`)

| Columna | Propiedad | Tipo |
|---|---|---|
| `UTLDCDGO` / `PJRQCDGO` | `codigo` / `empresa` | `Long` / `@ManyToOne Empresa` |
| `UTLDANOO` | `anio` | `Integer` — único por empresa (`UQ_UTLD_ANIO`) |
| `UTLDUTCN` | `utilidadContable` | `Double` — obligatoria, la da el usuario |
| `UTLDBS15` | `baseTotal` | `Double` |
| `UTLDBS10` | `basePorDias` | `Double` |
| `UTLDBS05` | `basePorCargas` | `Double` |
| `UTLDTTDI` | `totalDias` | `Double` |
| `UTLDTTCG` | `totalCargas` | `Integer` |
| `UTLDVLDI` | `valorPorDia` | `Double` |
| `UTLDVLCG` | `valorPorCarga` | `Double` |
| `UTLDTPSB` | `topePorTrabajador` | `Double` |
| `UTLDEXCD` | `excedente` | `Double` |
| `UTLDFCPG` | `fechaPago` | `LocalDate` |
| `PRDNCDGO` | `periodoNomina` | `@ManyToOne PeriodoNomina` |
| `UTLDESTD` / `UTLDFCHR` / `UTLDUSRR` | `estado` / `fechaRegistro` / `usuarioRegistro` | `Long` / `LocalDateTime` / `String` |

> **`baseTotal`, `basePorDias` y `basePorCargas`, no `base15`/`base10`/`base05`.** Los sufijos
> numéricos de las columnas son los porcentajes de ley (15 % total, 10 % por días, 5 % por
> cargas), pero esos porcentajes viven en `PRNMUTPR`, `PRNMUTDI` y `PRNMUTCG`: si el legislador
> los cambia, una propiedad llamada `base15` pasa a mentir. El nombre dice **qué reparte**, no
> con qué porcentaje.

## `RHH.DTUT` — `DetalleUtilidad` (`@Path("dtut")`)

| Columna | Propiedad | Tipo |
|---|---|---|
| `DTUTCDGO` | `codigo` | `Long` |
| `UTLDCDGO` | `utilidad` | `@ManyToOne Utilidad` |
| `MPLDCDGO` | `empleado` | `@ManyToOne Empleado` |
| `DTUTDIAS` | `dias` | `Double` |
| `DTUTNCRG` | `numeroCargas` | `Integer` |
| `DTUTVL10` | `valorPorDias` | `Double` |
| `DTUTVL05` | `valorPorCargas` | `Double` |
| `DTUTTTAL` | `total` | `Double` — antes del tope |
| `DTUTEXCD` | `excedente` | `Double` — lo que pasa del tope y va al IESS |
| `DTUTVLPG` | `valorPagar` | `Double` — tras aplicar el tope |
| `DTUTRTIR` | `retencionIr` | `Double` |
| `DTUTESTD` / `DTUTFCHR` / `DTUTUSRR` | `estado` / `fechaRegistro` / `usuarioRegistro` | `Long` / `LocalDateTime` / `String` |

> `valorPorDias` y `valorPorCargas` **son los importes** del empleado; `valorPorDia` y
> `valorPorCarga` de `UTLD` son los **coeficientes** de la empresa. Se parecen a propósito
> —expresan la misma repartición en dos niveles— pero no son lo mismo: el singular es el
> coeficiente, el plural es el importe.

## `RHH.SLOF` — `SalidaOficial` (`@Path("slof")`)

| Columna | Propiedad | Tipo |
|---|---|---|
| `SLOFCDGO` / `PJRQCDGO` | `codigo` / `empresa` | `Long` / `@ManyToOne Empresa` |
| `SLOFTPSL` | `tipoSalida` | `Long` — rubro **223** `RHH_TIPO_SALIDA_OFICIAL` |
| `SLOFANOO` | `anio` | `Integer` |
| `SLOFMESS` | `mes` | `Integer` — nulo en las anuales |
| `MPLDCDGO` | `empleado` | `@ManyToOne Empleado` — nulo en las consolidadas |
| `SLOFRUTA` / `SLOFNMAR` | `rutaArchivo` / `nombreArchivo` | `String` |
| `SLOFHASH` | `hash` | `String` |
| `SLOFFCGN` | `fechaGeneracion` | `LocalDate` |
| `SLOFFCPR` | `fechaPresentacion` | `LocalDate` — nula mientras no se presente |
| `SLOFNRCM` | `numeroComprobante` | `String` |
| `SLOFOBSR` | `observaciones` | `String` |
| `SLOFESTD` / `SLOFFCHR` / `SLOFUSRR` | `estado` / `fechaRegistro` / `usuarioRegistro` | `Long` / `LocalDateTime` / `String` |

> **`fechaGeneracion` y `fechaPresentacion` son cosas distintas y ninguna sustituye a la otra.**
> La primera la pone el sistema al generar; la segunda la escribe una persona cuando el
> organismo recibe, junto con `numeroComprobante`. Una salida generada y no presentada es el
> estado normal durante días: la pantalla debe distinguirlas, no colapsarlas en «fecha».

---

## Anexo — `RHH.NXOO` (adendas de contrato) · 2026-08-20

Verificado contra el desplegado al crear una adenda por REST durante la prueba de las pantallas
de migración. Tres cosas que no se deducen del nombre de la columna:

| Columna | Propiedad JSON | Tipo Java | Trampa |
|---|---|---|---|
| `CNTECDGO` | **`contrato`** | `ContratoEmpleado` | El campo se llama `contratoEmpleado` pero los accesores son `getContrato`/`setContrato`, y **Jackson va por el accesor**. Un cliente que envíe `contratoEmpleado` manda un campo que el servidor ignora en silencio: la adenda se crea sin contrato |
| `NXOOFCHR` | `fechaRegistro` | **`LocalDate`** | No `LocalDateTime` como la mayoría del módulo. Es de las 23 que van con fecha sola |
| `NXOOTIPO` | `tipo` | `String` | Lleva un `CHECK` que **sólo admite `ADENDUM`, `ANEXO` y `RENOVACION`**. No es rubro: los valores están en la restricción. Cualquier otro texto da `ORA-02290` |

> El primero es de los que no rompen el build ni dan error: el JSON entra, el campo se descarta y
> la fila queda huérfana de contrato. Es exactamente el modo de fallo que este documento existe
> para evitar.
>
> Y el tercero es un valor de catálogo viviendo en una restricción en vez de en un rubro —la
> regla 1 aplicada al esquema—. No se corrige ahora; queda anotado para la revisión previa al
> primer commit.
