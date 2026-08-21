-- =====================================================
-- MODULO: RHH - BARRIDO BIDIRECCIONAL ENTIDAD <-> ESQUEMA
-- DESCRIPCION: Cruza las 830 columnas que mapean las 53 entidades de
--              model/rhh contra all_tab_columns, EN LAS DOS DIRECCIONES
--              y comparando ademas el tipo.
-- FECHA: 2026-08-20 · Solo consulta: no modifica nada.
-- =====================================================
-- POR QUE EXISTE
--   RBROCDGO, RSMNFNTE y DPRTCDGO son el mismo defecto tres veces: una
--   columna del diseno anterior que la entidad no mapea, o que mapea con
--   otro tipo. Los tres aparecieron por casualidad, y ninguno de los
--   barridos anteriores los habria encontrado:
--
--     - El de NOT NULL ocultos mira la base y no las entidades: ve que
--       DPRTCDGO es obligatoria, pero no que nadie la mapea.
--     - El de getAll por REST solo detecta lo que FALTA en la base --como
--       SLCTFHAP--, porque un SELECT nunca toca una columna que la entidad
--       no nombra.
--
--   Los tres solo se manifiestan AL ESCRIBIR, asi que las tablas todavia
--   vacias son precisamente las que no los han mostrado. En RRHH quedan
--   varias que solo se estrenan en produccion.
--
-- COMO SE LEE EL RESULTADO
--   Bloque A - sobra en la base y es OBLIGATORIA -> bomba como DPRTCDGO:
--              ninguna fila se puede insertar desde la aplicacion.
--   Bloque B - sobra en la base y es opcional    -> dato muerto, sin riesgo
--              inmediato; decidir si se borra o se mapea.
--   Bloque C - falta en la base                  -> ORA-00904 como SLCTFHAP.
--   Bloque D - el tipo no cuadra                 -> ORA-01722 esperando datos,
--              como RSMNFNTE.
--
-- El inventario de la clausula WITH sale de los @Column/@JoinColumn reales;
-- esta tambien como texto plano en INVENTARIO_COLUMNAS_ENTIDADES_RHH.txt.
-- Las FK llevan el tipo de la entidad destino (Empleado, PeriodoNomina...),
-- que en base es siempre NUMBER.
-- =====================================================

WITH mapeo (TABLA, COLUMNA, ENTIDAD, TIPO_JAVA, PROPIEDAD) AS (
  SELECT 'ACMN','ACMNANOO','AcumuladoNomina','Integer','anio' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNAPRT','AcumuladoNomina','String','aperturaMigracion' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNCDGO','AcumuladoNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNDIAS','AcumuladoNomina','Double','dias' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNESTD','AcumuladoNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNFCHR','AcumuladoNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNMSEE','AcumuladoNomina','Integer','mes' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNTPAC','AcumuladoNomina','Long','tipoAcumulado' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNUSRR','AcumuladoNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'ACMN','ACMNVLOR','AcumuladoNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'ACMN','MPLDCDGO','AcumuladoNomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'ACMN','PRDNCDGO','AcumuladoNomina','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'CBEM','BNCOCDGO','CuentaBancariaEmpleado','Banco','banco' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMCDGO','CuentaBancariaEmpleado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMESTD','CuentaBancariaEmpleado','Long','estado' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMFCHR','CuentaBancariaEmpleado','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMIDTT','CuentaBancariaEmpleado','String','identificacionTitular' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMNMCT','CuentaBancariaEmpleado','String','numeroCuenta' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMPRCN','CuentaBancariaEmpleado','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMPRCP','CuentaBancariaEmpleado','String','principal' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMTPCT','CuentaBancariaEmpleado','Long','tipoCuenta' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMTTLR','CuentaBancariaEmpleado','String','titular' FROM DUAL UNION ALL
  SELECT 'CBEM','CBEMUSRR','CuentaBancariaEmpleado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CBEM','MPLDCDGO','CuentaBancariaEmpleado','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMAPDS','ConfiguracionNomina','String','aplicaDesahucio' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMAPJP','ConfiguracionNomina','String','aplicaJubilacionPatronal' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMAPUT','ConfiguracionNomina','String','aplicaUtilidades' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMCDGO','ConfiguracionNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMCTMR','ConfiguracionNomina','Long','cuentaMarcadora' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMDCCS','ConfiguracionNomina','String','desglosaCentroCosto' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMESTD','ConfiguracionNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMFCHR','ConfiguracionNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMPLLQ','ConfiguracionNomina','Long','plantillaLiquidacion' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMPLPG','ConfiguracionNomina','Long','plantillaPago' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMPLPR','ConfiguracionNomina','Long','plantillaProvision' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMPLRL','ConfiguracionNomina','Long','plantillaRol' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMRDND','ConfiguracionNomina','String','redondeaRenglon' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMTALQ','ConfiguracionNomina','Long','tipoAsientoLiquidacion' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMTAPG','ConfiguracionNomina','Long','tipoAsientoPago' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMTAPR','ConfiguracionNomina','Long','tipoAsientoProvision' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMTARL','ConfiguracionNomina','Long','tipoAsientoRol' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMTLCD','ConfiguracionNomina','Double','toleranciaCuadre' FROM DUAL UNION ALL
  SELECT 'CFNM','CFNMUSRR','ConfiguracionNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CFNM','PJRQCDGO','ConfiguracionNomina','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEAPRT','ContratoEmpleado','String','aportaIess' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTECDGO','ContratoEmpleado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTECNCS','ContratoEmpleado','CentroCosto','centroCosto' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTECSTR','ContratoEmpleado','CausalTerminacion','causalTerminacion' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEDCCM','ContratoEmpleado','Long','modalidadDecimoCuarto' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEDCMS','ContratoEmpleado','String','derechoDecimoCuarto' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEDCTM','ContratoEmpleado','Long','modalidadDecimoTercero' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEESTD','ContratoEmpleado','String','estado' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFCHF','ContratoEmpleado','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFCHI','ContratoEmpleado','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFCHR','ContratoEmpleado','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFCTR','ContratoEmpleado','LocalDate','fechaTerminacion' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFRMA','ContratoEmpleado','LocalDate','fechaFirma' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEFRMD','ContratoEmpleado','Long','modalidadFondosReserva' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEHRSM','ContratoEmpleado','Double','horasSemanales' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEJRND','ContratoEmpleado','Long','jornada' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTENMRO','ContratoEmpleado','String','numero' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEOBSR','ContratoEmpleado','String','observacion' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEOCUP','ContratoEmpleado','String','ocupacionMdt' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEPRRF','ContratoEmpleado','Double','porcentajeRetencionFuente' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTERTFN','ContratoEmpleado','String','retieneFuente' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTESLRB','ContratoEmpleado','Double','salarioBase' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTETPRL','ContratoEmpleado','Long','tipoRelacionLaboral' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTETRNO','ContratoEmpleado','Turno','turno' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEUSRR','ContratoEmpleado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CNTE','CNTEVLHR','ContratoEmpleado','Double','valorHora' FROM DUAL UNION ALL
  SELECT 'CNTE','MPLDCDGO','ContratoEmpleado','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'CNTE','TPCECDGO','ContratoEmpleado','TipoContratoEmpleado','tipoContratoEmpleado' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMABRV','ConceptoNomina','String','abreviatura' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMALTR','ConceptoNomina','Long','codigoAlterno' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMAPFR','ConceptoNomina','String','aportaFondosReserva' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMBSCL','ConceptoNomina','Long','baseCalculo' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMBSDC','ConceptoNomina','String','baseDecimoCuarto' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMBSDT','ConceptoNomina','String','baseDecimoTercero' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMBSUT','ConceptoNomina','String','baseUtilidades' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMBSVC','ConceptoNomina','String','baseVacaciones' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMCDGO','ConceptoNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMESTD','ConceptoNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMF107','ConceptoNomina','String','casilleroF107' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMFCHR','ConceptoNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMFRML','ConceptoNomina','String','formula' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMIESS','ConceptoNomina','String','codigoIess' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMIMIE','ConceptoNomina','String','imponibleIess' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMIMIR','ConceptoNomina','String','imponibleIr' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMNMBR','ConceptoNomina','String','nombre' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMOBLG','ConceptoNomina','String','obligatorio' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMORDN','ConceptoNomina','Integer','orden' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMPRCN','ConceptoNomina','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMPRVS','ConceptoNomina','String','provision' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMPTRN','ConceptoNomina','String','patronal' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMRCRT','ConceptoNomina','String','recortable' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMRDEP','ConceptoNomina','String','casilleroRdep' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMROLM','ConceptoNomina','Long','rolMotor' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMTPCL','ConceptoNomina','Long','tipoCalculo' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMTPCN','ConceptoNomina','Long','tipoConcepto' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMTPRL','ConceptoNomina','Long','tipoRelacionLaboral' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMUSRR','ConceptoNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CPNM','CPNMVLRR','ConceptoNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'CPNM','DTPLCDGO','ConceptoNomina','DetallePlantilla','detallePlantilla' FROM DUAL UNION ALL
  SELECT 'CPNM','PJRQCDGO','ConceptoNomina','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'CPNM','PLNNCDGO','ConceptoNomina','PlanCuenta','planCuenta' FROM DUAL UNION ALL
  SELECT 'CPXM','CNTECDGO','ConceptoFijoEmpleado','ContratoEmpleado','contrato' FROM DUAL UNION ALL
  SELECT 'CPXM','CPNMCDGO','ConceptoFijoEmpleado','ConceptoNomina','concepto' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMCANT','ConceptoFijoEmpleado','Double','cantidad' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMCDGO','ConceptoFijoEmpleado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMESTD','ConceptoFijoEmpleado','Long','estado' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMFCHF','ConceptoFijoEmpleado','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMFCHI','ConceptoFijoEmpleado','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMFCHR','ConceptoFijoEmpleado','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMOBSR','ConceptoFijoEmpleado','String','observacion' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMPRCN','ConceptoFijoEmpleado','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMUSRR','ConceptoFijoEmpleado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CPXM','CPXMVLRR','ConceptoFijoEmpleado','Double','valor' FROM DUAL UNION ALL
  SELECT 'CPXM','MPLDCDGO','ConceptoFijoEmpleado','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFAPLL','CargaFamiliar','String','apellidos' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFCDGO','CargaFamiliar','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFDPEC','CargaFamiliar','String','dependeEconomicamente' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFDSCP','CargaFamiliar','String','discapacidad' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFESTD','CargaFamiliar','Long','estado' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFFCFN','CargaFamiliar','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFFCHN','CargaFamiliar','LocalDate','fechaNacimiento' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFFCHR','CargaFamiliar','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFFCIN','CargaFamiliar','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFIDNT','CargaFamiliar','String','identificacion' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFIRRB','CargaFamiliar','String','calificaIr' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFNMBR','CargaFamiliar','String','nombres' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFPRDS','CargaFamiliar','Double','porcentajeDiscapacidad' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFPRNT','CargaFamiliar','Long','parentesco' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFUSRR','CargaFamiliar','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CRGF','CRGFUTIL','CargaFamiliar','String','calificaUtilidades' FROM DUAL UNION ALL
  SELECT 'CRGF','MPLDCDGO','CargaFamiliar','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGOCDGO','Cargo','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGODSCR','Cargo','String','descripcion' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGOESTD','Cargo','String','estado' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGOFCHR','Cargo','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGONMBR','Cargo','String','nombre' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGORQST','Cargo','String','requisitos' FROM DUAL UNION ALL
  SELECT 'CRGO','CRGOUSRR','Cargo','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRCDGO','CargaMarcaciones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRESTD','CargaMarcaciones','Long','estado' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRFCCR','CargaMarcaciones','LocalDate','fechaCarga' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRFCDS','CargaMarcaciones','LocalDate','fechaDesde' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRFCHR','CargaMarcaciones','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRFCHS','CargaMarcaciones','LocalDate','fechaHasta' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRHASH','CargaMarcaciones','String','hash' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRLGGO','CargaMarcaciones','String','log' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRLNDP','CargaMarcaciones','Integer','lineasDuplicadas' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRLNER','CargaMarcaciones','Integer','lineasError' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRLNOK','CargaMarcaciones','Integer','lineasOk' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRLNTT','CargaMarcaciones','Integer','lineasTotales' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRNMAR','CargaMarcaciones','String','nombreArchivo' FROM DUAL UNION ALL
  SELECT 'CRMR','CRMRUSRR','CargaMarcaciones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CRMR','FMRCCDGO','CargaMarcaciones','FormatoArchivoMarcacion','formato' FROM DUAL UNION ALL
  SELECT 'CRMR','PJRQCDGO','CargaMarcaciones','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRACSU','CausalTerminacion','String','requiereActaSut' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRALTR','CausalTerminacion','Long','codigoAlterno' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRARTC','CausalTerminacion','String','articulo' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRAVSL','CausalTerminacion','String','requiereAvisoSalida' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRCDGO','CausalTerminacion','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRDCPR','CausalTerminacion','String','pagaDecimosProporcionales' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRDSHC','CausalTerminacion','String','generaDesahucio' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRDSPD','CausalTerminacion','String','generaDespido' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRESTD','CausalTerminacion','Long','estado' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRFCHR','CausalTerminacion','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRJBPT','CausalTerminacion','String','generaJubilacionPatronal' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRNMBR','CausalTerminacion','String','nombre' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRUSRR','CausalTerminacion','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CSTR','CSTRVCPR','CausalTerminacion','String','pagaVacacionesProporcionales' FROM DUAL UNION ALL
  SELECT 'CSTR','PJRQCDGO','CausalTerminacion','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSCDGO','CuotaDescuento','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSCPTL','CuotaDescuento','Double','capital' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSESTD','CuotaDescuento','Long','estado' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSFCHR','CuotaDescuento','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSFCVN','CuotaDescuento','LocalDate','fechaVencimiento' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSINTR','CuotaDescuento','Double','interes' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSNMCT','CuotaDescuento','Integer','numeroCuota' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSSLDD','CuotaDescuento','Double','saldo' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSTTAL','CuotaDescuento','Double','total' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSUSRR','CuotaDescuento','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CTDS','CTDSVLDS','CuotaDescuento','Double','valorDescontado' FROM DUAL UNION ALL
  SELECT 'CTDS','DSRCCDGO','CuotaDescuento','DescuentoRecurrente','descuentoRecurrente' FROM DUAL UNION ALL
  SELECT 'CTDS','PRDNCDGO','CuotaDescuento','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGCDGO','Catalogo','Long','codigo' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGDSNM','Catalogo','String','descuentaNomina' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGESTD','Catalogo','String','estado' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGFCHR','Catalogo','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGGCEE','Catalogo','String','conGoce' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGMXDI','Catalogo','Integer','maximoDias' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGNMBR','Catalogo','String','nombre' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGRQDC','Catalogo','String','requiereDocumento' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGTPAS','Catalogo','Long','tipoAusencia' FROM DUAL UNION ALL
  SELECT 'CTLG','CTLGUSRR','Catalogo','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'CTLG','PJRQCDGO','Catalogo','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBCDGO','DetalleFormatoBancario','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBCMPO','DetalleFormatoBancario','Long','campo' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBCRLL','DetalleFormatoBancario','String','caracterRelleno' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBDCML','DetalleFormatoBancario','Integer','decimales' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBESTD','DetalleFormatoBancario','Long','estado' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBFCHR','DetalleFormatoBancario','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBFRFC','DetalleFormatoBancario','String','formatoFecha' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBINCO','DetalleFormatoBancario','Integer','indiceInicio' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBLNGT','DetalleFormatoBancario','Integer','longitud' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBORDN','DetalleFormatoBancario','Integer','orden' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBRLLN','DetalleFormatoBancario','String','ladoRelleno' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBSPDC','DetalleFormatoBancario','String','incluyeSeparadorDecimal' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBUSRR','DetalleFormatoBancario','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DFMB','DFMBVLFJ','DetalleFormatoBancario','String','valorFijo' FROM DUAL UNION ALL
  SELECT 'DFMB','FMBNCDGO','DetalleFormatoBancario','FormatoArchivoBancario','formato' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRCDGO','DetalleFormatoMarcacion','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRCMPO','DetalleFormatoMarcacion','Long','campo' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRESTD','DetalleFormatoMarcacion','Long','estado' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRFCHR','DetalleFormatoMarcacion','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRINCO','DetalleFormatoMarcacion','Integer','indiceInicio' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRLNGT','DetalleFormatoMarcacion','Integer','longitud' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRMPEO','DetalleFormatoMarcacion','String','mapeo' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMROBLG','DetalleFormatoMarcacion','String','obligatorio' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRORDN','DetalleFormatoMarcacion','Integer','orden' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRPSCN','DetalleFormatoMarcacion','Integer','posicion' FROM DUAL UNION ALL
  SELECT 'DFMR','DFMRUSRR','DetalleFormatoMarcacion','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DFMR','FMRCCDGO','DetalleFormatoMarcacion','FormatoArchivoMarcacion','formato' FROM DUAL UNION ALL
  SELECT 'DPRT','DPRTCDGO','Departamento','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DPRT','DPRTESTD','Departamento','String','estado' FROM DUAL UNION ALL
  SELECT 'DPRT','DPRTFCHR','Departamento','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DPRT','DPRTNMBR','Departamento','String','nombre' FROM DUAL UNION ALL
  SELECT 'DPRT','DPRTUSRR','Departamento','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DPTC','CRGOCDGO','DepartamentoCargo','Cargo','cargo' FROM DUAL UNION ALL
  SELECT 'DPTC','DPRTCDGO','DepartamentoCargo','Departamento','departamento' FROM DUAL UNION ALL
  SELECT 'DPTC','DPTCCDGO','DepartamentoCargo','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DPTC','DPTCESTD','DepartamentoCargo','String','estado' FROM DUAL UNION ALL
  SELECT 'DPTC','DPTCFCHR','DepartamentoCargo','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DPTC','DPTCUSRR','DepartamentoCargo','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DRPG','CBEMCDGO','DetalleOrdenPagoNomina','CuentaBancariaEmpleado','cuentaBancariaEmpleado' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGBNCO','DetalleOrdenPagoNomina','String','banco' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGCDGO','DetalleOrdenPagoNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGESTD','DetalleOrdenPagoNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGFCHR','DetalleOrdenPagoNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGIDNT','DetalleOrdenPagoNomina','String','identificacion' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGMTRC','DetalleOrdenPagoNomina','String','motivoRechazo' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGNMBN','DetalleOrdenPagoNomina','String','nombreBeneficiario' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGNMCT','DetalleOrdenPagoNomina','String','numeroCuenta' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGRCHZ','DetalleOrdenPagoNomina','String','rechazado' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGTPCT','DetalleOrdenPagoNomina','Long','tipoCuenta' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGUSRR','DetalleOrdenPagoNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DRPG','DRPGVLOR','DetalleOrdenPagoNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'DRPG','MPLDCDGO','DetalleOrdenPagoNomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'DRPG','NMNACDGO','DetalleOrdenPagoNomina','Nomina','nomina' FROM DUAL UNION ALL
  SELECT 'DRPG','RDPGCDGO','DetalleOrdenPagoNomina','OrdenPagoNomina','ordenPagoNomina' FROM DUAL UNION ALL
  SELECT 'DSRC','CPNMCDGO','DescuentoRecurrente','ConceptoNomina','conceptoNomina' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCAPRT','DescuentoRecurrente','String','aperturaMigracion' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCBNFC','DescuentoRecurrente','String','beneficiario' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCCDGO','DescuentoRecurrente','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCCTPG','DescuentoRecurrente','Integer','cuotasPagadas' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCESTD','DescuentoRecurrente','Long','estado' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCFCHF','DescuentoRecurrente','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCFCHI','DescuentoRecurrente','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCFCHR','DescuentoRecurrente','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCNMCT','DescuentoRecurrente','Integer','numeroCuotas' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCNMRO','DescuentoRecurrente','String','numero' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCOBSR','DescuentoRecurrente','String','observacion' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCPRCN','DescuentoRecurrente','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCSLDD','DescuentoRecurrente','Double','saldo' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCTPDS','DescuentoRecurrente','Long','tipoDescuento' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCUSRR','DescuentoRecurrente','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCVLCT','DescuentoRecurrente','Double','valorCuota' FROM DUAL UNION ALL
  SELECT 'DSRC','DSRCVLOR','DescuentoRecurrente','Double','valor' FROM DUAL UNION ALL
  SELECT 'DSRC','MPLDCDGO','DescuentoRecurrente','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLCDGO','DetalleTurno','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLDIAA','DetalleTurno','Integer','diaSemana' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLENTR','DetalleTurno','String','horaEntrada' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLFCHR','DetalleTurno','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLLBRB','DetalleTurno','String','laborable' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLMNDS','DetalleTurno','Integer','minutosDescanso' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLSLDA','DetalleTurno','String','horaSalida' FROM DUAL UNION ALL
  SELECT 'DTLL','DTLLUSRR','DetalleTurno','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DTLL','TRNOCDGO','DetalleTurno','Turno','turno' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTCDGO','DetalleUtilidad','Long','codigo' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTDIAS','DetalleUtilidad','Double','dias' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTESTD','DetalleUtilidad','Long','estado' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTEXCD','DetalleUtilidad','Double','excedente' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTFCHR','DetalleUtilidad','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTNCRG','DetalleUtilidad','Integer','numeroCargas' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTRTIR','DetalleUtilidad','Double','retencionIr' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTTTAL','DetalleUtilidad','Double','total' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTUSRR','DetalleUtilidad','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTVL05','DetalleUtilidad','Double','valorPorCargas' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTVL10','DetalleUtilidad','Double','valorPorDias' FROM DUAL UNION ALL
  SELECT 'DTUT','DTUTVLPG','DetalleUtilidad','Double','valorPagar' FROM DUAL UNION ALL
  SELECT 'DTUT','MPLDCDGO','DetalleUtilidad','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'DTUT','UTLDCDGO','DetalleUtilidad','Utilidad','utilidad' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNBNCO','FormatoArchivoBancario','String','banco' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNCBCR','FormatoArchivoBancario','String','plantillaCabecera' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNCDFC','FormatoArchivoBancario','String','codificacion' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNCDGO','FormatoArchivoBancario','Long','codigo' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNDLMT','FormatoArchivoBancario','String','delimitador' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNESTD','FormatoArchivoBancario','Long','estado' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNEXTN','FormatoArchivoBancario','String','extension' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNFCHR','FormatoArchivoBancario','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNFRFC','FormatoArchivoBancario','String','formatoFecha' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNMPTC','FormatoArchivoBancario','String','mapaTipoCuenta' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNNMBR','FormatoArchivoBancario','String','nombre' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNPIEE','FormatoArchivoBancario','String','plantillaPie' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNTPFR','FormatoArchivoBancario','Long','tipoFormato' FROM DUAL UNION ALL
  SELECT 'FMBN','FMBNUSRR','FormatoArchivoBancario','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'FMBN','PJRQCDGO','FormatoArchivoBancario','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCCDFC','FormatoArchivoMarcacion','String','codificacion' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCCDGO','FormatoArchivoMarcacion','Long','codigo' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCDLMT','FormatoArchivoMarcacion','String','delimitador' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCESTD','FormatoArchivoMarcacion','Long','estado' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCFCHR','FormatoArchivoMarcacion','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCFRFC','FormatoArchivoMarcacion','String','formatoFecha' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCFRFH','FormatoArchivoMarcacion','String','formatoFechaHora' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCFRHR','FormatoArchivoMarcacion','String','formatoHora' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCLNCB','FormatoArchivoMarcacion','Integer','lineasCabecera' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCLNPI','FormatoArchivoMarcacion','Integer','lineasPie' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCMRCA','FormatoArchivoMarcacion','String','marca' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCNMBR','FormatoArchivoMarcacion','String','nombre' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCTPFR','FormatoArchivoMarcacion','Long','tipoFormato' FROM DUAL UNION ALL
  SELECT 'FMRC','FMRCUSRR','FormatoArchivoMarcacion','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'FMRC','PJRQCDGO','FormatoArchivoMarcacion','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRANOO','GastoPersonalProyectado','Integer','anio' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRCDGO','GastoPersonalProyectado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRESTD','GastoPersonalProyectado','Long','estado' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRFCHR','GastoPersonalProyectado','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRFCPR','GastoPersonalProyectado','LocalDate','fechaPresentacion' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRTPGP','GastoPersonalProyectado','Long','tipoGasto' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRUSRR','GastoPersonalProyectado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRVGNT','GastoPersonalProyectado','String','vigente' FROM DUAL UNION ALL
  SELECT 'GSPR','GSPRVLOR','GastoPersonalProyectado','Double','valor' FROM DUAL UNION ALL
  SELECT 'GSPR','MPLDCDGO','GastoPersonalProyectado','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'HREX','HREXAPRB','HoraExtra','String','aprobada' FROM DUAL UNION ALL
  SELECT 'HREX','HREXCDGO','HoraExtra','Long','codigo' FROM DUAL UNION ALL
  SELECT 'HREX','HREXESTD','HoraExtra','Long','estado' FROM DUAL UNION ALL
  SELECT 'HREX','HREXEXCP','HoraExtra','String','excedeTope' FROM DUAL UNION ALL
  SELECT 'HREX','HREXFCAP','HoraExtra','LocalDate','fechaAprobacion' FROM DUAL UNION ALL
  SELECT 'HREX','HREXFCHA','HoraExtra','LocalDate','fecha' FROM DUAL UNION ALL
  SELECT 'HREX','HREXFCHR','HoraExtra','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'HREX','HREXHORS','HoraExtra','Double','horas' FROM DUAL UNION ALL
  SELECT 'HREX','HREXOBSR','HoraExtra','String','observacion' FROM DUAL UNION ALL
  SELECT 'HREX','HREXRCRG','HoraExtra','Double','recargo' FROM DUAL UNION ALL
  SELECT 'HREX','HREXTPHR','HoraExtra','Long','tipoHoraExtra' FROM DUAL UNION ALL
  SELECT 'HREX','HREXUSAP','HoraExtra','String','usuarioAprueba' FROM DUAL UNION ALL
  SELECT 'HREX','HREXUSRR','HoraExtra','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'HREX','HREXVLHR','HoraExtra','Double','valorHora' FROM DUAL UNION ALL
  SELECT 'HREX','HREXVLOR','HoraExtra','Double','valor' FROM DUAL UNION ALL
  SELECT 'HREX','MPLDCDGO','HoraExtra','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'HREX','PRDNCDGO','HoraExtra','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'HREX','RSMNCDGO','HoraExtra','ResumenNomina','resumenNomina' FROM DUAL UNION ALL
  SELECT 'HSTR','CRGOCDGO','Historial','Cargo','cargo' FROM DUAL UNION ALL
  SELECT 'HSTR','DPTCCDGO','Historial','DepartamentoCargo','departamentoCargo' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRACTL','Historial','String','actual' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRCDGO','Historial','Long','codigo' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRFCHF','Historial','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRFCHI','Historial','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRFCHR','Historial','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTROBSR','Historial','String','observacion' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRSLAN','Historial','Double','sueldoAnterior' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRSLNW','Historial','Double','sueldoNuevo' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRTPCM','Historial','Long','tipoCambio' FROM DUAL UNION ALL
  SELECT 'HSTR','HSTRUSRR','Historial','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'HSTR','MPLDCDGO','Historial','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSANOO','LiquidacionBeneficioSocial','Integer','anio' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSBSCL','LiquidacionBeneficioSocial','Double','baseCalculo' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSCDGO','LiquidacionBeneficioSocial','Long','codigo' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSDIAS','LiquidacionBeneficioSocial','Double','dias' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSESTD','LiquidacionBeneficioSocial','Long','estado' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSFCHF','LiquidacionBeneficioSocial','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSFCHI','LiquidacionBeneficioSocial','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSFCHR','LiquidacionBeneficioSocial','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSFCPG','LiquidacionBeneficioSocial','LocalDate','fechaPago' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSTPBN','LiquidacionBeneficioSocial','Long','tipoBeneficio' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSUSRR','LiquidacionBeneficioSocial','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSVLMN','LiquidacionBeneficioSocial','Double','valorMensualizado' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSVLPG','LiquidacionBeneficioSocial','Double','valorPagado' FROM DUAL UNION ALL
  SELECT 'LQBS','LQBSVLRR','LiquidacionBeneficioSocial','Double','valor' FROM DUAL UNION ALL
  SELECT 'LQBS','MPLDCDGO','LiquidacionBeneficioSocial','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'LQBS','PRDNCDGO','LiquidacionBeneficioSocial','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'LQDC','ASNTCDGO','Liquidacion','Long','asiento' FROM DUAL UNION ALL
  SELECT 'LQDC','CNTECDGO','Liquidacion','ContratoEmpleado','contratoEmpleado' FROM DUAL UNION ALL
  SELECT 'LQDC','CSTRCDGO','Liquidacion','CausalTerminacion','causalTerminacion' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCACSU','Liquidacion','String','actaSut' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCANSR','Liquidacion','Double','aniosServicio' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCCDGO','Liquidacion','Long','codigo' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCDSHC','Liquidacion','Double','desahucio' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCDSPD','Liquidacion','Double','despidoIntempestivo' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCESTD','Liquidacion','Long','estado' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCFCAP','Liquidacion','LocalDate','fechaAprobacion' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCFCHR','Liquidacion','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCFCHS','Liquidacion','LocalDate','fechaSalida' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCFCIN','Liquidacion','LocalDate','fechaIngreso' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCFCSU','Liquidacion','LocalDate','fechaSut' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCJBPT','Liquidacion','Double','jubilacionPatronal' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCMTVO','Liquidacion','String','motivo' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCNETO','Liquidacion','Double','neto' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCTTDS','Liquidacion','Double','totalDescuentos' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCTTIN','Liquidacion','Double','totalIngresos' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCULRM','Liquidacion','Double','ultimaRemuneracion' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCUSAP','Liquidacion','String','usuarioAprueba' FROM DUAL UNION ALL
  SELECT 'LQDC','LQDCUSRR','Liquidacion','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'LQDC','MPLDCDGO','Liquidacion','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDAPLL','Empleado','String','apellidos' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCDAF','Empleado','String','codigoAfiliacion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCDBM','Empleado','String','codigoBiometrico' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCDGO','Empleado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCNCS','Empleado','CentroCosto','centroCosto' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCNDS','Empleado','String','carneConadis' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCTEM','Empleado','String','contactoEmergencia' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDCTSF','Empleado','String','enfermedadCatastrofica' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDDRCC','Empleado','String','direccion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDDSCP','Empleado','String','discapacidad' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDEMAI','Empleado','String','email' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDESTC','Empleado','Long','estadoCivil' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDESTD','Empleado','Long','estado' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDFCHN','Empleado','LocalDate','fechaNacimiento' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDFCHR','Empleado','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDFCIN','Empleado','LocalDate','fechaIngreso' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDFOTO','Empleado','String','foto' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDGNRO','Empleado','Long','genero' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDIDNT','Empleado','String','identificacion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDNCNL','Empleado','String','nacionalidad' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDNMBR','Empleado','String','nombres' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDNVIN','Empleado','Long','nivelInstruccion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDPRDS','Empleado','Double','porcentajeDiscapacidad' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDPRFS','Empleado','String','profesion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDRGNN','Empleado','Long','region' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDTLEM','Empleado','String','telefonoEmergencia' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDTLFN','Empleado','String','telefono' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDTPID','Empleado','Long','tipoIdentificacion' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDTPSN','Empleado','String','tipoSangre' FROM DUAL UNION ALL
  SELECT 'MPLD','MPLDUSRR','Empleado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'MPLD','PJRQCDGO','Empleado','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'MRCC','CRMRCDGO','Marcaciones','CargaMarcaciones','cargaMarcaciones' FROM DUAL UNION ALL
  SELECT 'MRCC','MPLDCDGO','Marcaciones','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCCDGO','Marcaciones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCDSPS','Marcaciones','String','dispositivo' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCFCHH','Marcaciones','LocalDateTime','fechaHora' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCFCHR','Marcaciones','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCLNAR','Marcaciones','Integer','lineaArchivo' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCOBSR','Marcaciones','String','observacion' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCORGN','Marcaciones','Long','origen' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCPRCS','Marcaciones','String','procesado' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCTPOO','Marcaciones','Long','tipo' FROM DUAL UNION ALL
  SELECT 'MRCC','MRCCUSRR','Marcaciones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'NMNA','CNTECDGO','Nomina','ContratoEmpleado','contratoEmpleado' FROM DUAL UNION ALL
  SELECT 'NMNA','MPLDCDGO','Nomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAAPPR','Nomina','Double','aportePersonal' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAAPPT','Nomina','Double','aportePatronal' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNABSDC','Nomina','Double','baseDecimoCuarto' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNABSDT','Nomina','Double','baseDecimoTercero' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNABSFR','Nomina','Double','baseFondosReserva' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNABSIE','Nomina','Double','baseIess' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNABSIR','Nomina','Double','baseImpuestoRenta' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNACDGO','Nomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNADITR','Nomina','Double','diasTrabajados' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAESTD','Nomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAFCHR','Nomina','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAFNRS','Nomina','Double','fondosReserva' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAHRTR','Nomina','Double','horasTrabajadas' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAIESC','Nomina','Double','aporteIeceSecap' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNANETO','Nomina','Double','netoPagar' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAOBSR','Nomina','String','observacion' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNARTIR','Nomina','Double','retencionImpuestoRenta' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNASLRB','Nomina','Double','salarioBase' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNATDSC','Nomina','Double','totalDescuentos' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNATING','Nomina','Double','totalIngresos' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNATTPT','Nomina','Double','totalPatronal' FROM DUAL UNION ALL
  SELECT 'NMNA','NMNAUSRR','Nomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'NMNA','PRDNCDGO','Nomina','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'NVIS','CNTECDGO','NovedadIess','ContratoEmpleado','contrato' FROM DUAL UNION ALL
  SELECT 'NVIS','MPLDCDGO','NovedadIess','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISCDGO','NovedadIess','Long','codigo' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISCSTR','NovedadIess','CausalTerminacion','causalTerminacion' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISESTD','NovedadIess','Long','estado' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISFCHC','NovedadIess','LocalDate','fechaHecho' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISFCHR','NovedadIess','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISFCLM','NovedadIess','LocalDate','fechaLimite' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISFCRP','NovedadIess','LocalDate','fechaReporte' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISMDFR','NovedadIess','Long','modalidadFondosReserva' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISOBSR','NovedadIess','String','observacion' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISSLAN','NovedadIess','Double','sueldoAnterior' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISSLNW','NovedadIess','Double','sueldoNuevo' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISTPNV','NovedadIess','Long','tipoNovedad' FROM DUAL UNION ALL
  SELECT 'NVIS','NVISUSRR','NovedadIess','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'NVNM','CPNMCDGO','NovedadNomina','ConceptoNomina','conceptoNomina' FROM DUAL UNION ALL
  SELECT 'NVNM','MPLDCDGO','NovedadNomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMAPRB','NovedadNomina','String','aprobada' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMCANT','NovedadNomina','Double','cantidad' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMCDGO','NovedadNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMDSCR','NovedadNomina','String','descripcion' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMESTD','NovedadNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMFCAP','NovedadNomina','LocalDate','fechaAprobacion' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMFCHR','NovedadNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMUSAP','NovedadNomina','String','usuarioAprueba' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMUSRR','NovedadNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'NVNM','NVNMVLRR','NovedadNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'NVNM','PRDNCDGO','NovedadNomina','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'NXOO','CNTECDGO','AnexoContrato','ContratoEmpleado','contratoEmpleado' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOCDGO','AnexoContrato','Long','codigo' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOODTLL','AnexoContrato','String','detalle' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOFCHA','AnexoContrato','LocalDate','fechaAnexo' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOFCHF','AnexoContrato','LocalDate','nuevaFechaFin' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOFCHR','AnexoContrato','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOSLRN','AnexoContrato','Double','nuevoSalario' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOTPOO','AnexoContrato','String','tipo' FROM DUAL UNION ALL
  SELECT 'NXOO','NXOOUSRR','AnexoContrato','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PRDN','PJRQCDGO','PeriodoNomina','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNANOO','PeriodoNomina','Integer','anio' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNASNT','PeriodoNomina','Long','asientoRol' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNASPG','PeriodoNomina','Long','asientoPago' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNASPR','PeriodoNomina','Long','asientoProvisiones' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNCDGO','PeriodoNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNESTD','PeriodoNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCAP','PeriodoNomina','LocalDate','fechaAprobacion' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCCN','PeriodoNomina','LocalDate','fechaContable' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCCR','PeriodoNomina','LocalDate','fechaCierre' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCHF','PeriodoNomina','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCHI','PeriodoNomina','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNFCHR','PeriodoNomina','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNMODO','PeriodoNomina','Long','modo' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNMSEE','PeriodoNomina','Integer','mes' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNNMEM','PeriodoNomina','Integer','numeroEmpleados' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNOBSR','PeriodoNomina','String','observaciones' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNTPNM','PeriodoNomina','Long','tipoPeriodo' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNTTDS','PeriodoNomina','Double','totalDescuentos' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNTTIN','PeriodoNomina','Double','totalIngresos' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNTTNT','PeriodoNomina','Double','totalNeto' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNTTPT','PeriodoNomina','Double','totalPatronal' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNUSAP','PeriodoNomina','String','usuarioAprueba' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNUSCR','PeriodoNomina','String','usuarioCierra' FROM DUAL UNION ALL
  SELECT 'PRDN','PRDNUSRR','PeriodoNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PRNM','PJRQCDGO','ParametroNomina','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMANOO','ParametroNomina','Integer','anio' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMANVC','ParametroNomina','Integer','anioVacacionAdicional' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMAPPR','ParametroNomina','Double','aportePersonal' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMAPPT','ParametroNomina','Double','aportePatronal' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMCDGO','ParametroNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMCDVC','ParametroNomina','Integer','aniosCaducidadVacaciones' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMCNBS','ParametroNomina','Double','canastaBasica' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMCNCT','ParametroNomina','Integer','canastasCatastrofica' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDANO','ParametroNomina','Integer','diasAnio' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDIAN','ParametroNomina','Integer','aniosIndemnizacionMinima' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDIAS','ParametroNomina','Integer','diasMes' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDIMN','ParametroNomina','Integer','indemnizacionMinima' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDIMX','ParametroNomina','Integer','indemnizacionMaxima' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDIVC','ParametroNomina','Integer','diasVacaciones' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMDSPR','ParametroNomina','Double','porcentajeDesahucio' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMESTD','ParametroNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMFCHR','ParametroNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMFNRS','ParametroNomina','Double','fondosReserva' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRDI','ParametroNomina','Integer','horasDia' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRFN','ParametroNomina','Long','horaFinNocturna' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRIN','ParametroNomina','Long','horaInicioNocturna' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRMS','ParametroNomina','Integer','horasMes' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRMX','ParametroNomina','Integer','maxHorasDia' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMHRSX','ParametroNomina','Integer','maxHorasSemana' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMIECE','ParametroNomina','Double','iece' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMMXVC','ParametroNomina','Integer','maxDiasVacaciones' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMRCEX','ParametroNomina','Double','recargoExtraordinaria' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMRCNC','ParametroNomina','Double','recargoNocturno' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMRCSP','ParametroNomina','Double','recargoSuplementaria' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMSBUU','ParametroNomina','Double','sbu' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMSCAP','ParametroNomina','Double','secap' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMTPGP','ParametroNomina','Double','porcentajeGastosPersonales' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMUSRR','ParametroNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMUTCG','ParametroNomina','Double','utilidadCargas' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMUTDI','ParametroNomina','Double','utilidadDias' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMUTPR','ParametroNomina','Double','utilidadPorcentaje' FROM DUAL UNION ALL
  SELECT 'PRNM','PRNMUTSB','ParametroNomina','Integer','utilidadTopeSbu' FROM DUAL UNION ALL
  SELECT 'PRTE','NMNACDGO','AportesRetenciones','Nomina','nomina' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEBSEE','AportesRetenciones','Double','baseCalculo' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTECDGO','AportesRetenciones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTECNCP','AportesRetenciones','String','concepto' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEENTD','AportesRetenciones','String','entidad' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEFCHR','AportesRetenciones','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEPRCN','AportesRetenciones','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEUSRR','AportesRetenciones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PRTE','PRTEVLRO','AportesRetenciones','Double','valor' FROM DUAL UNION ALL
  SELECT 'PTCN','CTLGCDGO','Peticiones','Catalogo','catalogo' FROM DUAL UNION ALL
  SELECT 'PTCN','MPLDCDGO','Peticiones','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNAPRB','Peticiones','String','usuarioAprobador' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNCDGO','Peticiones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNDOCC','Peticiones','String','documento' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNESTD','Peticiones','String','estado' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNFCHD','Peticiones','LocalDate','fechaDesde' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNFCHH','Peticiones','LocalDate','fechaHasta' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNFCHR','Peticiones','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNHRAS','Peticiones','Double','horas' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNMTVO','Peticiones','String','motivo' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNOBSR','Peticiones','String','observacion' FROM DUAL UNION ALL
  SELECT 'PTCN','PTCNUSRR','Peticiones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PVNM','CPNMCDGO','ProvisionNomina','ConceptoNomina','conceptoNomina' FROM DUAL UNION ALL
  SELECT 'PVNM','MPLDCDGO','ProvisionNomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'PVNM','PRDNCDGO','ProvisionNomina','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMBSCL','ProvisionNomina','Double','baseCalculo' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMCDGO','ProvisionNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMESTD','ProvisionNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMFCHR','ProvisionNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMTPPR','ProvisionNomina','Long','tipoProvision' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMUSRR','ProvisionNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PVNM','PVNMVLOR','ProvisionNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'PYIR','MPLDCDGO','ProyeccionImpuestoRenta','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRANOO','ProyeccionImpuestoRenta','Integer','anio' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRAPPR','ProyeccionImpuestoRenta','Double','aportePersonalProyectado' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRBSIM','ProyeccionImpuestoRenta','Double','baseImponible' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRCDGO','ProyeccionImpuestoRenta','Long','codigo' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRCTSF','ProyeccionImpuestoRenta','String','enfermedadCatastrofica' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRESTD','ProyeccionImpuestoRenta','Long','estado' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRFCHR','ProyeccionImpuestoRenta','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRGSDC','ProyeccionImpuestoRenta','Double','gastosDeclarados' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRIMCS','ProyeccionImpuestoRenta','Double','impuestoCausado' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRIMPG','ProyeccionImpuestoRenta','Double','impuestoAPagar' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRINFT','ProyeccionImpuestoRenta','Double','ingresosFuturos' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRINPR','ProyeccionImpuestoRenta','Double','ingresosProyectados' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRINRL','ProyeccionImpuestoRenta','Double','ingresosRealizados' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRMSDS','ProyeccionImpuestoRenta','Integer','mesDesde' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRMSRS','ProyeccionImpuestoRenta','Integer','mesesRestantes' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRMTVO','ProyeccionImpuestoRenta','String','motivo' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRNCRG','ProyeccionImpuestoRenta','Integer','numeroCargas' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRRBJA','ProyeccionImpuestoRenta','Double','rebaja' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRRTEF','ProyeccionImpuestoRenta','Double','retencionesEfectuadas' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRRTEM','ProyeccionImpuestoRenta','Double','retencionMensual' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRTPGS','ProyeccionImpuestoRenta','Double','topeGastos' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRUSRR','ProyeccionImpuestoRenta','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'PYIR','PYIRVGNT','ProyeccionImpuestoRenta','String','vigente' FROM DUAL UNION ALL
  SELECT 'RDPG','ASNTCDGO','OrdenPagoNomina','Long','asientoPago' FROM DUAL UNION ALL
  SELECT 'RDPG','CTBNCDGO','OrdenPagoNomina','CuentaBancaria','cuentaBancaria' FROM DUAL UNION ALL
  SELECT 'RDPG','EGRSCDGO','OrdenPagoNomina','Long','egreso' FROM DUAL UNION ALL
  SELECT 'RDPG','PJRQCDGO','OrdenPagoNomina','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'RDPG','PRDNCDGO','OrdenPagoNomina','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGCDGO','OrdenPagoNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGESTD','OrdenPagoNomina','Long','estado' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGFCAC','OrdenPagoNomina','LocalDate','fechaAcreditacion' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGFCEM','OrdenPagoNomina','LocalDate','fechaEmision' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGFCHR','OrdenPagoNomina','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGNMEM','OrdenPagoNomina','Integer','numeroEmpleados' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGNMRO','OrdenPagoNomina','String','numero' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGOBSR','OrdenPagoNomina','String','observaciones' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGRTAR','OrdenPagoNomina','String','rutaArchivo' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGTTAL','OrdenPagoNomina','Double','total' FROM DUAL UNION ALL
  SELECT 'RDPG','RDPGUSRR','OrdenPagoNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'RLPG','NMNACDGO','RolPago','Nomina','nomina' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGCDGO','RolPago','Long','codigo' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGESTD','RolPago','String','estado' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGFCEN','RolPago','LocalDate','fechaEnvio' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGFCHA','RolPago','LocalDate','fechaEmision' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGFCHR','RolPago','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGHASH','RolPago','String','hash' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGNETO','RolPago','Double','neto' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGNMRO','RolPago','String','numero' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGPDFO','RolPago','String','rutaPdf' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGRCBD','RolPago','String','recibido' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGTTDS','RolPago','Double','totalDescuentos' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGTTIN','RolPago','Double','totalIngresos' FROM DUAL UNION ALL
  SELECT 'RLPG','RLPGUSRR','RolPago','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'RNGL','CPNMCDGO','ReglonNomina','ConceptoNomina','conceptoNomina' FROM DUAL UNION ALL
  SELECT 'RNGL','NMNACDGO','ReglonNomina','Nomina','nomina' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLBSCL','ReglonNomina','Double','baseCalculo' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLCANT','ReglonNomina','Double','cantidad' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLCDGO','ReglonNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLDSCR','ReglonNomina','String','descripcion' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLFCHR','ReglonNomina','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLIMIE','ReglonNomina','String','imponibleIess' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLIMIR','ReglonNomina','String','gravadoIr' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLIMPN','ReglonNomina','String','imponible' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLMNAL','ReglonNomina','String','manual' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLORDN','ReglonNomina','Integer','orden' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLORGN','ReglonNomina','Long','origen' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLPRCN','ReglonNomina','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLPTRN','ReglonNomina','String','patronal' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLRFID','ReglonNomina','Long','idReferencia' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLRFTB','ReglonNomina','String','tablaReferencia' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLTPCN','ReglonNomina','Long','tipoConcepto' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLUSRR','ReglonNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'RNGL','RNGLVLRO','ReglonNomina','Double','valor' FROM DUAL UNION ALL
  SELECT 'RSMN','MPLDCDGO','ResumenNomina','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNASNT','ResumenNomina','String','ausencia' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNCDGO','ResumenNomina','Long','codigo' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNENTR','ResumenNomina','String','horaEntrada' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNENTT','ResumenNomina','LocalDateTime','entradaReal' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNEXTR','ResumenNomina','Integer','minutosExtra' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNFCHA','ResumenNomina','LocalDate','fecha' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNFCHR','ResumenNomina','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNFNTE','ResumenNomina','Long','fuente' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNHREX','ResumenNomina','Double','horasExtraordinarias' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNHRNC','ResumenNomina','Double','horasNocturnas' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNHRSP','ResumenNomina','Double','horasSuplementarias' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNHRTR','ResumenNomina','Double','horasTrabajadas' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNINCN','ResumenNomina','String','inconsistente' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNJSTC','ResumenNomina','String','justificacion' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNJSTF','ResumenNomina','String','justificado' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNPRCS','ResumenNomina','String','procesado' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNSLAN','ResumenNomina','Integer','minutosSalidaAnticipada' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNSLDA','ResumenNomina','String','horaSalida' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNSLDT','ResumenNomina','LocalDateTime','salidaReal' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNTPAS','ResumenNomina','Long','tipoAusencia' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNTRDE','ResumenNomina','Integer','minutosTarde' FROM DUAL UNION ALL
  SELECT 'RSMN','RSMNUSRR','ResumenNomina','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'SLAP','MPLDCDGO','SaldoApertura','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'SLAP','PJRQCDGO','SaldoApertura','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPANOO','SaldoApertura','Integer','anio' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPAPLC','SaldoApertura','String','aplicado' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPCDGO','SaldoApertura','Long','codigo' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPDIAS','SaldoApertura','Double','dias' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPESTD','SaldoApertura','Long','estado' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPFCAN','SaldoApertura','LocalDate','fechaAnterior' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPFCAP','SaldoApertura','LocalDate','fechaAplicacion' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPFCCR','SaldoApertura','LocalDate','fechaCorte' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPFCHA','SaldoApertura','LocalDate','fecha' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPFCHR','SaldoApertura','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPIDNT','SaldoApertura','String','identificacion' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPNMCT','SaldoApertura','Integer','numeroCuotas' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPOBSR','SaldoApertura','String','observacion' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPRFID','SaldoApertura','Long','idReferencia' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPRFTB','SaldoApertura','String','tablaReferencia' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPTPSL','SaldoApertura','Long','tipoSaldo' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPUSRR','SaldoApertura','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'SLAP','SLAPVLOR','SaldoApertura','Double','valor' FROM DUAL UNION ALL
  SELECT 'SLCT','MPLDCDGO','SolicitudVacaciones','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTAPRB','SolicitudVacaciones','String','usuarioAprobacion' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTCDGO','SolicitudVacaciones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTDIAS','SolicitudVacaciones','Double','diasSolicitados' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTESTD','SolicitudVacaciones','String','estado' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTFCHD','SolicitudVacaciones','LocalDate','fechaDesde' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTFCHH','SolicitudVacaciones','LocalDate','fechaHasta' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTFCHR','SolicitudVacaciones','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTFHAP','SolicitudVacaciones','LocalDate','fechaAprobacion' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTOBSR','SolicitudVacaciones','String','observacion' FROM DUAL UNION ALL
  SELECT 'SLCT','SLCTUSRR','SolicitudVacaciones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'SLDV','MPLDCDGO','SaldoVacaciones','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVANOO','SaldoVacaciones','Integer','anio' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVAPRT','SaldoVacaciones','String','aperturaMigracion' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVASGN','SaldoVacaciones','Double','diasAsignados' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVCDCD','SaldoVacaciones','String','caducado' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVCDGO','SaldoVacaciones','Long','codigo' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVDIAD','SaldoVacaciones','Double','diasAdicionales' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVDIAR','SaldoVacaciones','Double','diasArrastrados' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVDIPG','SaldoVacaciones','Double','diasPagados' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVESTD','SaldoVacaciones','Long','estado' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVFCHF','SaldoVacaciones','LocalDate','fechaFin' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVFCHI','SaldoVacaciones','LocalDate','fechaInicio' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVFCHR','SaldoVacaciones','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVPNDE','SaldoVacaciones','Double','diasPendientes' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVUSDO','SaldoVacaciones','Double','diasUsados' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVUSRR','SaldoVacaciones','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'SLDV','SLDVVLDI','SaldoVacaciones','Double','valorDia' FROM DUAL UNION ALL
  SELECT 'SLOF','MPLDCDGO','SalidaOficial','Empleado','empleado' FROM DUAL UNION ALL
  SELECT 'SLOF','PJRQCDGO','SalidaOficial','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFANOO','SalidaOficial','Integer','anio' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFCDGO','SalidaOficial','Long','codigo' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFESTD','SalidaOficial','Long','estado' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFFCGN','SalidaOficial','LocalDate','fechaGeneracion' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFFCHR','SalidaOficial','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFFCPR','SalidaOficial','LocalDate','fechaPresentacion' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFHASH','SalidaOficial','String','hash' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFMESS','SalidaOficial','Integer','mes' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFNMAR','SalidaOficial','String','nombreArchivo' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFNRCM','SalidaOficial','String','numeroComprobante' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFOBSR','SalidaOficial','String','observaciones' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFRUTA','SalidaOficial','String','rutaArchivo' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFTPSL','SalidaOficial','Long','tipoSalida' FROM DUAL UNION ALL
  SELECT 'SLOF','SLOFUSRR','SalidaOficial','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'TBIR','PJRQCDGO','TablaImpuestoRenta','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRANOO','TablaImpuestoRenta','Integer','anio' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRCDGO','TablaImpuestoRenta','Long','codigo' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRESTD','TablaImpuestoRenta','Long','estado' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIREXCS','TablaImpuestoRenta','Double','excesoHasta' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRFCHR','TablaImpuestoRenta','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRFRBS','TablaImpuestoRenta','Double','fraccionBasica' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRIMFB','TablaImpuestoRenta','Double','impuestoFraccionBasica' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRORDN','TablaImpuestoRenta','Integer','orden' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRPRCN','TablaImpuestoRenta','Double','porcentaje' FROM DUAL UNION ALL
  SELECT 'TBIR','TBIRUSRR','TablaImpuestoRenta','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'TMLQ','CPNMCDGO','DetalleLiquidacion','ConceptoNomina','conceptoNomina' FROM DUAL UNION ALL
  SELECT 'TMLQ','LQDCCDGO','DetalleLiquidacion','Liquidacion','liquidacion' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQBSCL','DetalleLiquidacion','Double','baseCalculo' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQCDGO','DetalleLiquidacion','Long','codigo' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQDIAS','DetalleLiquidacion','Double','dias' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQDSCR','DetalleLiquidacion','String','descripcion' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQFCHR','DetalleLiquidacion','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQORDN','DetalleLiquidacion','Integer','orden' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQTPCN','DetalleLiquidacion','Long','tipoConcepto' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQUSRR','DetalleLiquidacion','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'TMLQ','TMLQVLRO','DetalleLiquidacion','Double','valor' FROM DUAL UNION ALL
  SELECT 'TPCE','PJRQCDGO','TipoContratoEmpleado','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCECDGO','TipoContratoEmpleado','Long','codigo' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCEESTD','TipoContratoEmpleado','String','estado' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCEFCHR','TipoContratoEmpleado','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCEMXMS','TipoContratoEmpleado','Integer','duracionMaximaMeses' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCENMBR','TipoContratoEmpleado','String','nombre' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCERQRE','TipoContratoEmpleado','String','requiereFechaFin' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCETPRL','TipoContratoEmpleado','Long','tipoRelacionLaboral' FROM DUAL UNION ALL
  SELECT 'TPCE','TPCEUSRR','TipoContratoEmpleado','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'TPGP','PJRQCDGO','TopeGastoPersonal','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPANOO','TopeGastoPersonal','Integer','anio' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPCDGO','TopeGastoPersonal','Long','codigo' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPESTD','TopeGastoPersonal','Long','estado' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPFCHR','TopeGastoPersonal','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPNCAN','TopeGastoPersonal','Double','numeroCanastas' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPNCRG','TopeGastoPersonal','Integer','numeroCargas' FROM DUAL UNION ALL
  SELECT 'TPGP','TPGPUSRR','TopeGastoPersonal','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOCDGO','Turno','Long','codigo' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOENTR','Turno','String','horaEntrada' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOESTD','Turno','String','estado' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOFCHR','Turno','LocalDate','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOMNDS','Turno','Integer','minutosDescanso' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOMNTS','Turno','Integer','minutosTolerancia' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNONMBR','Turno','String','nombre' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOSLDA','Turno','String','horaSalida' FROM DUAL UNION ALL
  SELECT 'TRNO','TRNOUSRR','Turno','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'UTLD','PJRQCDGO','Utilidad','Empresa','empresa' FROM DUAL UNION ALL
  SELECT 'UTLD','PRDNCDGO','Utilidad','PeriodoNomina','periodoNomina' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDANOO','Utilidad','Integer','anio' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDBS05','Utilidad','Double','basePorCargas' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDBS10','Utilidad','Double','basePorDias' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDBS15','Utilidad','Double','baseTotal' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDCDGO','Utilidad','Long','codigo' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDESTD','Utilidad','Long','estado' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDEXCD','Utilidad','Double','excedente' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDFCHR','Utilidad','LocalDateTime','fechaRegistro' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDFCPG','Utilidad','LocalDate','fechaPago' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDTPSB','Utilidad','Double','topePorTrabajador' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDTTCG','Utilidad','Integer','totalCargas' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDTTDI','Utilidad','Double','totalDias' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDUSRR','Utilidad','String','usuarioRegistro' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDUTCN','Utilidad','Double','utilidadContable' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDVLCG','Utilidad','Double','valorPorCarga' FROM DUAL UNION ALL
  SELECT 'UTLD','UTLDVLDI','Utilidad','Double','valorPorDia' FROM DUAL
),
esquema AS (
    SELECT table_name AS TABLA, column_name AS COLUMNA, data_type AS TIPO_ORACLE,
           data_default AS DEFECTO
      FROM all_tab_columns
     WHERE owner = 'RHH'
       AND table_name IN (SELECT DISTINCT TABLA FROM mapeo)
),
-- Obligatoriedad por las DOS vias en que este esquema la declara: el atributo
-- de columna y el CHECK con nombre de sistema, que all_tab_columns no ve.
obligatorias AS (
    SELECT c.table_name AS TABLA,
           REGEXP_SUBSTR(c.search_condition_vc, '"?([A-Z0-9_]+)"?', 1, 1, NULL, 1) AS COLUMNA
      FROM all_constraints c
     WHERE c.owner = 'RHH' AND c.constraint_type = 'C'
       AND UPPER(c.search_condition_vc) LIKE '%NOT NULL%'
    UNION
    SELECT table_name, column_name FROM all_tab_columns
     WHERE owner = 'RHH' AND nullable = 'N'
)
-- ---------------------------------------------------------------
-- BLOQUES A y B: esta en la base y NINGUNA entidad la mapea
-- ---------------------------------------------------------------
SELECT CASE WHEN o.COLUMNA IS NOT NULL THEN 'A - SOBRA Y ES OBLIGATORIA'
            ELSE 'B - sobra, opcional' END AS BLOQUE,
       e.TABLA, e.COLUMNA, e.TIPO_ORACLE, e.DEFECTO, NULL AS ENTIDAD, NULL AS TIPO_JAVA
  FROM esquema e
  LEFT JOIN mapeo m ON m.TABLA = e.TABLA AND m.COLUMNA = e.COLUMNA
  LEFT JOIN obligatorias o ON o.TABLA = e.TABLA AND o.COLUMNA = e.COLUMNA
 WHERE m.COLUMNA IS NULL
UNION ALL
-- ---------------------------------------------------------------
-- BLOQUE C: la entidad la mapea y en la base no existe
-- ---------------------------------------------------------------
SELECT 'C - FALTA EN LA BASE', m.TABLA, m.COLUMNA, NULL, NULL, m.ENTIDAD, m.TIPO_JAVA
  FROM mapeo m
  LEFT JOIN esquema e ON e.TABLA = m.TABLA AND e.COLUMNA = m.COLUMNA
 WHERE e.COLUMNA IS NULL
UNION ALL
-- ---------------------------------------------------------------
-- BLOQUE D: existe en las dos, pero el tipo no cuadra
-- ---------------------------------------------------------------
SELECT 'D - TIPO DISCREPANTE', m.TABLA, m.COLUMNA, e.TIPO_ORACLE, NULL, m.ENTIDAD, m.TIPO_JAVA
  FROM mapeo m
  JOIN esquema e ON e.TABLA = m.TABLA AND e.COLUMNA = m.COLUMNA
 WHERE NOT (
        (m.TIPO_JAVA IN ('Long','Integer','Double','BigDecimal') AND e.TIPO_ORACLE LIKE 'NUMBER%')
     OR (m.TIPO_JAVA = 'String'        AND e.TIPO_ORACLE IN ('VARCHAR2','CHAR','NVARCHAR2','CLOB'))
     OR (m.TIPO_JAVA = 'LocalDate'     AND e.TIPO_ORACLE = 'DATE')
     OR (m.TIPO_JAVA = 'LocalDateTime' AND (e.TIPO_ORACLE = 'DATE' OR e.TIPO_ORACLE LIKE 'TIMESTAMP%'))
     -- Las FK llevan el tipo de la entidad destino y en base son NUMBER.
     OR (m.TIPO_JAVA NOT IN ('Long','Integer','Double','BigDecimal','String','LocalDate','LocalDateTime')
         AND e.TIPO_ORACLE LIKE 'NUMBER%')
       )
 ORDER BY 1, 2, 3;


-- ---------------------------------------------------------------
-- BLOQUE E: tablas de RHH que NINGUNA entidad mapea
-- ---------------------------------------------------------------
-- La consulta de arriba se limita a las 53 tablas que si tienen entidad, asi
-- que una tabla entera sin mapear no aparece en ningun bloque. Esta la saca.
--
-- No toda tabla sin entidad es un defecto --RHH.RBRO se borro a proposito y
-- puede haber restos del diseno anterior-- pero cada una hay que mirarla:
-- o sobra y se borra, o le falta su entidad y alguien la va a necesitar.
SELECT t.table_name AS TABLA_SIN_ENTIDAD,
       (SELECT COUNT(*) FROM all_tab_columns c
         WHERE c.owner = 'RHH' AND c.table_name = t.table_name) AS COLUMNAS
  FROM all_tables t
 WHERE t.owner = 'RHH'
   AND t.table_name NOT IN (
        'ACMN','CBEM','CFNM','CNTE','CPNM','CPXM','CRGF','CRGO','CRMR','CSTR',
        'CTDS','CTLG','DFMB','DFMR','DPRT','DPTC','DRPG','DSRC','DTLL','DTUT',
        'FMBN','FMRC','GSPR','HREX','HSTR','LQBS','LQDC','MPLD','MRCC','NMNA',
        'NVIS','NVNM','NXOO','PRDN','PRNM','PRTE','PTCN','PVNM','PYIR','RDPG',
        'RLPG','RNGL','RSMN','SLAP','SLCT','SLDV','SLOF','TBIR','TMLQ','TPCE',
        'TPGP','TRNO','UTLD')
 ORDER BY 1;
