-- =====================================================
-- MODULO: RHH - AMPLIACION DE LAS TABLAS EXISTENTES
-- DESCRIPCION: Campos que faltan en las 23 tablas que ya existen, mas
--              las correcciones de tipo (dinero a NUMBER(18,2), horas a
--              TIMESTAMP, estados de VARCHAR2 a NUMBER con rubro).
-- ORDEN DE EJECUCION: 5 de 9
-- FECHA: 2026-08-19
-- =====================================================
-- PARAMETRO :EMPRESA
--   Este script pide el codigo de la empresa (SCP.PJRQ.PJRQCDGO) al final,
--   para el backfill de PJRQCDGO en las filas ya existentes de MPLD, PRDN,
--   TPCE y CTLG. Debe ser el mismo valor de los scripts 07, 08 y 09.
-- =====================================================
-- IMPORTANTE SOBRE LOS ESTADOS:
--   Las columnas XXXXESTD del modulo son hoy VARCHAR2 con texto libre.
--   Como RHH aun no tiene datos productivos, se hace DROP y ADD directo.
--   SI YA EXISTIERAN DATOS, sustituir por el patron de tres pasos:
--     1) ALTER TABLE ... ADD (XXXXESTD_N NUMBER);
--     2) UPDATE ... SET XXXXESTD_N = CASE XXXXESTD WHEN 'A' THEN 1 ... END;
--     3) ALTER TABLE ... DROP COLUMN XXXXESTD;
--        ALTER TABLE ... RENAME COLUMN XXXXESTD_N TO XXXXESTD;
-- =====================================================


-- =====================================================
-- RHH.MPLD (Empleado): el estado pasa a rubro
-- =====================================================
-- MPLDESTD era VARCHAR2 con texto libre. El motor de nomina necesita
-- distinguir CESANTE de ACTIVO para no incluir en el rol a un empleado ya
-- liquidado, y una marca 'A'/'I' no puede expresar CON_LICENCIA ni JUBILADO.
-- Se convierte al rubro 185 (RHH_ESTADO_EMPLEADO):
--   1 ACTIVO   2 CON LICENCIA   3 SUSPENDIDO   4 CESANTE   5 JUBILADO
--
-- RHH no tiene datos productivos, asi que se hace DROP y ADD directo. SI YA
-- EXISTIERAN DATOS, sustituir por el patron de tres pasos de la cabecera,
-- mapeando el texto libre actual a los cinco codigos.
ALTER TABLE RHH.MPLD DROP COLUMN MPLDESTD;
ALTER TABLE RHH.MPLD ADD (MPLDESTD NUMBER DEFAULT 1);

COMMENT ON COLUMN RHH.MPLD.MPLDESTD IS 'Estado del empleado: detalle del rubro RHH_ESTADO_EMPLEADO. El motor de nomina excluye del calculo a los CESANTE';


-- =====================================================
-- RHH.MPLD (Empleado): datos personales exigidos por la normativa
-- =====================================================
ALTER TABLE RHH.MPLD ADD (
    PJRQCDGO NUMBER,          -- FK a Empresa
    MPLDTPID NUMBER,          -- Tipo de identificacion (rubro TipoIdentificacion)
    MPLDESTC NUMBER,          -- Estado civil (rubro RHH_ESTADO_CIVIL)
    MPLDGNRO NUMBER,          -- Genero (rubro RHH_GENERO)
    MPLDNCNL VARCHAR2(60),    -- Nacionalidad
    MPLDNVIN NUMBER,          -- Nivel de instruccion (rubro RHH_NIVEL_INSTRUCCION)
    MPLDPRFS VARCHAR2(150),   -- Profesion o titulo
    MPLDTPSN VARCHAR2(5),     -- Tipo de sangre
    MPLDDSCP VARCHAR2(1) DEFAULT 'N', -- Tiene discapacidad (S/N)
    MPLDPRDS NUMBER(5,2),     -- Porcentaje de discapacidad
    MPLDCNDS VARCHAR2(30),    -- Numero de carne del CONADIS
    MPLDCTSF VARCHAR2(1) DEFAULT 'N', -- Tiene enfermedad catastrofica (S/N)
    MPLDCDAF VARCHAR2(30),    -- Codigo de afiliacion al IESS
    MPLDFCIN DATE,            -- Fecha de ingreso a la empresa
    MPLDRGNN NUMBER,          -- Region para el decimo cuarto (rubro RHH_REGION_DECIMO_CUARTO)
    MPLDCDBM VARCHAR2(30),    -- Codigo del empleado en el reloj biometrico
    MPLDCTEM VARCHAR2(150),   -- Nombre del contacto de emergencia
    MPLDTLEM VARCHAR2(30),    -- Telefono del contacto de emergencia
    MPLDCNCS NUMBER,          -- FK a CentroCosto (CNT.CNCS)
    MPLDFOTO VARCHAR2(300)    -- Ruta de la fotografia
);

ALTER TABLE RHH.MPLD ADD CONSTRAINT FK_MPLD_PJRQ FOREIGN KEY (PJRQCDGO) REFERENCES SCP.PJRQ(PJRQCDGO);
CREATE INDEX IDX_MPLD_PJRQ ON RHH.MPLD(PJRQCDGO);
CREATE INDEX IDX_MPLD_IDNT ON RHH.MPLD(MPLDIDNT);
CREATE INDEX IDX_MPLD_CDBM ON RHH.MPLD(MPLDCDBM);

COMMENT ON COLUMN RHH.MPLD.PJRQCDGO IS 'FK a Empresa (SCP.PJRQ); el empleado pertenece a una empresa';
COMMENT ON COLUMN RHH.MPLD.MPLDTPID IS 'Tipo de identificacion: cedula, pasaporte o RUC';
COMMENT ON COLUMN RHH.MPLD.MPLDESTC IS 'Estado civil: detalle del rubro RHH_ESTADO_CIVIL';
COMMENT ON COLUMN RHH.MPLD.MPLDGNRO IS 'Genero: detalle del rubro RHH_GENERO';
COMMENT ON COLUMN RHH.MPLD.MPLDNCNL IS 'Nacionalidad del empleado';
COMMENT ON COLUMN RHH.MPLD.MPLDNVIN IS 'Nivel de instruccion: detalle del rubro RHH_NIVEL_INSTRUCCION';
COMMENT ON COLUMN RHH.MPLD.MPLDPRFS IS 'Profesion o titulo del empleado';
COMMENT ON COLUMN RHH.MPLD.MPLDTPSN IS 'Tipo de sangre del empleado';
COMMENT ON COLUMN RHH.MPLD.MPLDDSCP IS 'Indica si el empleado tiene discapacidad reconocida (S/N)';
COMMENT ON COLUMN RHH.MPLD.MPLDPRDS IS 'Porcentaje de discapacidad; incide en la exoneracion de impuesto a la renta';
COMMENT ON COLUMN RHH.MPLD.MPLDCNDS IS 'Numero de carne del CONADIS';
COMMENT ON COLUMN RHH.MPLD.MPLDCTSF IS 'Indica si padece enfermedad catastrofica, rara u huerfana (S/N); amplia el tope de gastos personales';
COMMENT ON COLUMN RHH.MPLD.MPLDCDAF IS 'Codigo de afiliacion del empleado en el IESS';
COMMENT ON COLUMN RHH.MPLD.MPLDFCIN IS 'Fecha de ingreso a la empresa; base del calculo de antiguedad';
COMMENT ON COLUMN RHH.MPLD.MPLDRGNN IS 'Region para el decimo cuarto: detalle del rubro RHH_REGION_DECIMO_CUARTO';
COMMENT ON COLUMN RHH.MPLD.MPLDCDBM IS 'Codigo con el que el empleado se identifica en el reloj biometrico';
COMMENT ON COLUMN RHH.MPLD.MPLDCTEM IS 'Nombre del contacto de emergencia';
COMMENT ON COLUMN RHH.MPLD.MPLDTLEM IS 'Telefono del contacto de emergencia';
COMMENT ON COLUMN RHH.MPLD.MPLDCNCS IS 'FK a CentroCosto (CNT.CNCS) al que se imputa el costo del empleado';
COMMENT ON COLUMN RHH.MPLD.MPLDFOTO IS 'Ruta de la fotografia del empleado';


-- =====================================================
-- RHH.CNTE (ContratoEmpleado): parametria legal del contrato
-- =====================================================
ALTER TABLE RHH.CNTE ADD (
    CNTETPRL NUMBER,          -- Tipo de relacion laboral (rubro RHH_TIPO_RELACION_LABORAL)
    CNTEJRND NUMBER,          -- Tipo de jornada (rubro RHH_TIPO_JORNADA)
    CNTEHRSM NUMBER(18,2),    -- Horas semanales pactadas
    CNTEVLHR NUMBER(18,2),    -- Valor de la hora, en contratos por horas
    CNTEDCTM NUMBER,          -- Modalidad decimo tercero (rubro RHH_MODALIDAD_DECIMO_TERCERO)
    CNTEDCCM NUMBER,          -- Modalidad decimo cuarto (rubro RHH_MODALIDAD_DECIMO_CUARTO)
    CNTEFRMD NUMBER,          -- Modalidad fondos de reserva (rubro RHH_MODALIDAD_FONDOS_RESERVA)
    CNTEDCMS VARCHAR2(1) DEFAULT 'S', -- Tiene derecho a decimo cuarto (S/N)
    CNTEAPRT VARCHAR2(1) DEFAULT 'S', -- Aporta al IESS (S/N); 'N' en servicios profesionales
    CNTERTFN VARCHAR2(1) DEFAULT 'N', -- Se le retiene en la fuente por servicios (S/N)
    CNTEPRRF NUMBER(18,6),    -- Porcentaje de retencion en la fuente por servicios
    CNTEOCUP VARCHAR2(20),    -- Codigo de ocupacion sectorial del Ministerio de Trabajo
    CNTECSTR NUMBER,          -- FK a CausalTerminacion
    CNTEFCTR DATE,            -- Fecha efectiva de terminacion
    CNTECNCS NUMBER,          -- FK a CentroCosto
    CNTETRNO NUMBER           -- FK a Turno asignado
);

ALTER TABLE RHH.CNTE ADD CONSTRAINT FK_CNTE_CSTR FOREIGN KEY (CNTECSTR) REFERENCES RHH.CSTR(CSTRCDGO);
ALTER TABLE RHH.CNTE ADD CONSTRAINT FK_CNTE_TRNO FOREIGN KEY (CNTETRNO) REFERENCES RHH.TRNO(TRNOCDGO);
CREATE INDEX IDX_CNTE_CSTR ON RHH.CNTE(CNTECSTR);
CREATE INDEX IDX_CNTE_TRNO ON RHH.CNTE(CNTETRNO);

COMMENT ON COLUMN RHH.CNTE.CNTETPRL IS 'Tipo de relacion laboral: detalle del rubro RHH_TIPO_RELACION_LABORAL';
COMMENT ON COLUMN RHH.CNTE.CNTEJRND IS 'Tipo de jornada: detalle del rubro RHH_TIPO_JORNADA';
COMMENT ON COLUMN RHH.CNTE.CNTEHRSM IS 'Horas semanales pactadas en el contrato';
COMMENT ON COLUMN RHH.CNTE.CNTEVLHR IS 'Valor de la hora pactado, aplicable a contratos por horas';
COMMENT ON COLUMN RHH.CNTE.CNTEDCTM IS 'Modalidad del decimo tercero: mensualizado o acumulado';
COMMENT ON COLUMN RHH.CNTE.CNTEDCCM IS 'Modalidad del decimo cuarto: mensualizado o acumulado';
COMMENT ON COLUMN RHH.CNTE.CNTEFRMD IS 'Modalidad de fondos de reserva: mensualizado, acumulado en el IESS o no aplica';
COMMENT ON COLUMN RHH.CNTE.CNTEDCMS IS 'Indica si el contrato da derecho a decimo cuarto (S/N)';
COMMENT ON COLUMN RHH.CNTE.CNTEAPRT IS 'Indica si el contrato genera aporte al IESS (S/N); en servicios profesionales va en N';
COMMENT ON COLUMN RHH.CNTE.CNTERTFN IS 'Indica si al honorario se le aplica retencion en la fuente por servicios (S/N)';
COMMENT ON COLUMN RHH.CNTE.CNTEPRRF IS 'Porcentaje de retencion en la fuente aplicable a los servicios profesionales';
COMMENT ON COLUMN RHH.CNTE.CNTEOCUP IS 'Codigo de ocupacion sectorial del Ministerio de Trabajo';
COMMENT ON COLUMN RHH.CNTE.CNTECSTR IS 'FK a RHH.CSTR (causal por la que termino el contrato)';
COMMENT ON COLUMN RHH.CNTE.CNTEFCTR IS 'Fecha efectiva de terminacion del contrato';
COMMENT ON COLUMN RHH.CNTE.CNTECNCS IS 'FK a CentroCosto al que se imputa el costo del contrato';
COMMENT ON COLUMN RHH.CNTE.CNTETRNO IS 'FK a RHH.TRNO (turno asignado al contrato)';


-- =====================================================
-- RHH.PRDN (PeriodoNomina): el interruptor de contabilizacion
-- =====================================================
ALTER TABLE RHH.PRDN DROP COLUMN PRDNESTD;

ALTER TABLE RHH.PRDN ADD (
    PJRQCDGO NUMBER,           -- FK a Empresa
    PRDNESTD NUMBER DEFAULT 1, -- Estado (rubro RHH_ESTADO_PERIODO_NOMINA)
    PRDNMODO NUMBER DEFAULT 2, -- MODO (rubro RHH_MODO_PERIODO_NOMINA): 1=HISTORICO, 2=PRODUCTIVO
    PRDNTPNM NUMBER DEFAULT 1, -- Tipo de periodo (rubro RHH_TIPO_PERIODO_NOMINA)
    PRDNFCCN DATE,             -- Fecha contable del asiento
    PRDNASNT NUMBER,           -- FK al asiento del rol de pagos
    PRDNASPR NUMBER,           -- FK al asiento de provisiones
    PRDNASPG NUMBER,           -- FK al asiento de pago
    PRDNFCAP DATE,             -- Fecha de aprobacion
    PRDNUSAP VARCHAR2(60),     -- Usuario que aprobo
    PRDNFCCR DATE,             -- Fecha de cierre
    PRDNUSCR VARCHAR2(60),     -- Usuario que cerro
    PRDNTTIN NUMBER(18,2) DEFAULT 0, -- Total de ingresos del periodo
    PRDNTTDS NUMBER(18,2) DEFAULT 0, -- Total de descuentos del periodo
    PRDNTTNT NUMBER(18,2) DEFAULT 0, -- Total neto del periodo
    PRDNTTPT NUMBER(18,2) DEFAULT 0, -- Total de costo patronal del periodo
    PRDNNMEM NUMBER DEFAULT 0,       -- Numero de empleados procesados
    PRDNOBSR VARCHAR2(500)
);

ALTER TABLE RHH.PRDN ADD CONSTRAINT FK_PRDN_PJRQ FOREIGN KEY (PJRQCDGO) REFERENCES SCP.PJRQ(PJRQCDGO);
CREATE INDEX IDX_PRDN_PJRQ ON RHH.PRDN(PJRQCDGO);

COMMENT ON COLUMN RHH.PRDN.PJRQCDGO IS 'FK a Empresa (SCP.PJRQ)';
COMMENT ON COLUMN RHH.PRDN.PRDNESTD IS 'Estado del periodo: detalle del rubro RHH_ESTADO_PERIODO_NOMINA';
COMMENT ON COLUMN RHH.PRDN.PRDNMODO IS 'Modo del periodo: 1=HISTORICO_SIN_CONTABILIZAR no genera asientos, 2=PRODUCTIVO_CONTABILIZA si los genera';
COMMENT ON COLUMN RHH.PRDN.PRDNTPNM IS 'Tipo de periodo: mensual, quincenal, decimo tercero, decimo cuarto, utilidades o liquidacion';
COMMENT ON COLUMN RHH.PRDN.PRDNFCCN IS 'Fecha contable con la que se emiten los asientos del periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNASNT IS 'FK al asiento contable del rol de pagos (CNT.ASNT); NULL en modo historico';
COMMENT ON COLUMN RHH.PRDN.PRDNASPR IS 'FK al asiento contable de provisiones (CNT.ASNT)';
COMMENT ON COLUMN RHH.PRDN.PRDNASPG IS 'FK al asiento contable de pago (CNT.ASNT)';
COMMENT ON COLUMN RHH.PRDN.PRDNFCAP IS 'Fecha en que se aprobo el periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNUSAP IS 'Usuario que aprobo el periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNFCCR IS 'Fecha en que se cerro el periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNUSCR IS 'Usuario que cerro el periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNTTIN IS 'Total de ingresos del periodo, denormalizado para consultas';
COMMENT ON COLUMN RHH.PRDN.PRDNTTDS IS 'Total de descuentos del periodo, denormalizado para consultas';
COMMENT ON COLUMN RHH.PRDN.PRDNTTNT IS 'Total neto a pagar del periodo, denormalizado para consultas';
COMMENT ON COLUMN RHH.PRDN.PRDNTTPT IS 'Total de costo patronal del periodo, denormalizado para consultas';
COMMENT ON COLUMN RHH.PRDN.PRDNNMEM IS 'Numero de empleados procesados en el periodo';
COMMENT ON COLUMN RHH.PRDN.PRDNOBSR IS 'Observaciones del periodo';


-- =====================================================
-- RHH.NMNA (Nomina): desglose tipificado
-- =====================================================
ALTER TABLE RHH.NMNA DROP COLUMN NMNAESTD;

ALTER TABLE RHH.NMNA ADD (
    NMNAESTD NUMBER DEFAULT 1, -- Estado (rubro RHH_ESTADO_NOMINA)
    NMNADITR NUMBER(18,4),     -- Dias trabajados
    NMNAHRTR NUMBER(18,4),     -- Horas trabajadas
    NMNABSIE NUMBER(18,2) DEFAULT 0, -- Base imponible IESS
    NMNABSIR NUMBER(18,2) DEFAULT 0, -- Base gravada de impuesto a la renta
    NMNABSFR NUMBER(18,2) DEFAULT 0, -- Base de fondos de reserva
    NMNABSDT NUMBER(18,2) DEFAULT 0, -- Base del decimo tercero
    NMNABSDC NUMBER(18,2) DEFAULT 0, -- Base del decimo cuarto
    NMNAAPPR NUMBER(18,2) DEFAULT 0, -- Aporte personal IESS
    NMNAAPPT NUMBER(18,2) DEFAULT 0, -- Aporte patronal IESS
    NMNAIESC NUMBER(18,2) DEFAULT 0, -- IECE mas SECAP
    NMNAFNRS NUMBER(18,2) DEFAULT 0, -- Fondos de reserva del mes
    NMNARTIR NUMBER(18,2) DEFAULT 0, -- Retencion de impuesto a la renta del mes
    NMNATTPT NUMBER(18,2) DEFAULT 0, -- Total de costo patronal
    NMNAOBSR VARCHAR2(500)
);

COMMENT ON COLUMN RHH.NMNA.NMNAESTD IS 'Estado de la nomina: detalle del rubro RHH_ESTADO_NOMINA';
COMMENT ON COLUMN RHH.NMNA.NMNADITR IS 'Dias efectivamente trabajados en el periodo';
COMMENT ON COLUMN RHH.NMNA.NMNAHRTR IS 'Horas efectivamente trabajadas en el periodo';
COMMENT ON COLUMN RHH.NMNA.NMNABSIE IS 'Base imponible del IESS del periodo';
COMMENT ON COLUMN RHH.NMNA.NMNABSIR IS 'Base gravada de impuesto a la renta del periodo';
COMMENT ON COLUMN RHH.NMNA.NMNABSFR IS 'Base sobre la que se calculan los fondos de reserva';
COMMENT ON COLUMN RHH.NMNA.NMNABSDT IS 'Base sobre la que se acumula el decimo tercero';
COMMENT ON COLUMN RHH.NMNA.NMNABSDC IS 'Base sobre la que se acumula el decimo cuarto';
COMMENT ON COLUMN RHH.NMNA.NMNAAPPR IS 'Aporte personal al IESS descontado en el periodo';
COMMENT ON COLUMN RHH.NMNA.NMNAAPPT IS 'Aporte patronal al IESS del periodo';
COMMENT ON COLUMN RHH.NMNA.NMNAIESC IS 'Aportes al IECE y al SECAP del periodo';
COMMENT ON COLUMN RHH.NMNA.NMNAFNRS IS 'Fondos de reserva pagados o provisionados en el periodo';
COMMENT ON COLUMN RHH.NMNA.NMNARTIR IS 'Retencion de impuesto a la renta aplicada en el periodo';
COMMENT ON COLUMN RHH.NMNA.NMNATTPT IS 'Total del costo patronal del periodo para este empleado';
COMMENT ON COLUMN RHH.NMNA.NMNAOBSR IS 'Observaciones de la nomina del empleado';


-- =====================================================
-- RHH.RNGL (ReglonNomina): el concepto que hoy falta
-- =====================================================
ALTER TABLE RHH.RNGL ADD (
    CPNMCDGO NUMBER,           -- FK a ConceptoNomina
    RNGLDSCR VARCHAR2(200),    -- Descripcion del renglon
    RNGLTPCN NUMBER,           -- Tipo de concepto, copiado como snapshot
    RNGLBSCL NUMBER(18,2),     -- Base sobre la que se calculo
    RNGLPRCN NUMBER(18,6),     -- Porcentaje aplicado
    RNGLORGN NUMBER,           -- Origen del renglon (rubro RHH_ORIGEN_RENGLON)
    RNGLMNAL VARCHAR2(1) DEFAULT 'N', -- Fue editado a mano (S/N)
    RNGLIMIE VARCHAR2(1) DEFAULT 'N', -- Fue imponible IESS (snapshot)
    RNGLIMIR VARCHAR2(1) DEFAULT 'N', -- Fue gravado de IR (snapshot)
    RNGLPTRN VARCHAR2(1) DEFAULT 'N', -- Fue costo patronal (snapshot)
    RNGLRFTB VARCHAR2(30),     -- Tabla de origen del renglon
    RNGLRFID NUMBER            -- Id del registro de origen
);

ALTER TABLE RHH.RNGL ADD CONSTRAINT FK_RNGL_CPNM FOREIGN KEY (CPNMCDGO) REFERENCES RHH.CPNM(CPNMCDGO);
CREATE INDEX IDX_RNGL_CPNM ON RHH.RNGL(CPNMCDGO);

COMMENT ON COLUMN RHH.RNGL.CPNMCDGO IS 'FK a RHH.CPNM (concepto que origina el renglon). Sin este campo el renglon no significa nada';
COMMENT ON COLUMN RHH.RNGL.RNGLDSCR IS 'Descripcion del renglon tal como se imprime en el rol';
COMMENT ON COLUMN RHH.RNGL.RNGLTPCN IS 'Tipo de concepto congelado al momento del calculo';
COMMENT ON COLUMN RHH.RNGL.RNGLBSCL IS 'Base sobre la que se calculo el renglon';
COMMENT ON COLUMN RHH.RNGL.RNGLPRCN IS 'Porcentaje aplicado sobre la base';
COMMENT ON COLUMN RHH.RNGL.RNGLORGN IS 'Origen del renglon: detalle del rubro RHH_ORIGEN_RENGLON';
COMMENT ON COLUMN RHH.RNGL.RNGLMNAL IS 'Indica si el renglon fue editado manualmente; el recalculo lo preserva (S/N)';
COMMENT ON COLUMN RHH.RNGL.RNGLIMIE IS 'Indica si el renglon fue imponible IESS, congelado al calcular (S/N)';
COMMENT ON COLUMN RHH.RNGL.RNGLIMIR IS 'Indica si el renglon fue gravado de impuesto a la renta, congelado al calcular (S/N)';
COMMENT ON COLUMN RHH.RNGL.RNGLPTRN IS 'Indica si el renglon fue costo patronal, congelado al calcular (S/N)';
COMMENT ON COLUMN RHH.RNGL.RNGLRFTB IS 'Nombre de la tabla que origino el renglon, para trazabilidad';
COMMENT ON COLUMN RHH.RNGL.RNGLRFID IS 'Identificador del registro que origino el renglon, para trazabilidad';


-- =====================================================
-- RHH.RLPG (RolPago): valores propios
-- =====================================================
ALTER TABLE RHH.RLPG ADD (
    RLPGTTIN NUMBER(18,2) DEFAULT 0, -- Total de ingresos
    RLPGTTDS NUMBER(18,2) DEFAULT 0, -- Total de descuentos
    RLPGNETO NUMBER(18,2) DEFAULT 0, -- Neto a pagar
    RLPGHASH VARCHAR2(64),           -- Hash del contenido, para detectar alteraciones
    RLPGFCEN DATE,                   -- Fecha de envio al empleado
    RLPGRCBD VARCHAR2(1) DEFAULT 'N' -- Recibido y firmado por el empleado (S/N)
);

COMMENT ON COLUMN RHH.RLPG.RLPGTTIN IS 'Total de ingresos del rol, para no depender de recalcular la nomina';
COMMENT ON COLUMN RHH.RLPG.RLPGTTDS IS 'Total de descuentos del rol';
COMMENT ON COLUMN RHH.RLPG.RLPGNETO IS 'Neto a pagar del rol';
COMMENT ON COLUMN RHH.RLPG.RLPGHASH IS 'Hash del contenido del rol para detectar alteraciones posteriores';
COMMENT ON COLUMN RHH.RLPG.RLPGFCEN IS 'Fecha en que el rol se envio al empleado';
COMMENT ON COLUMN RHH.RLPG.RLPGRCBD IS 'Indica si el empleado confirmo la recepcion del rol (S/N)';


-- =====================================================
-- RHH.LQDC (Liquidacion) y RHH.TMLQ (DetalleLiquidacion)
-- =====================================================
ALTER TABLE RHH.LQDC DROP COLUMN LQDCESTD;

ALTER TABLE RHH.LQDC ADD (
    LQDCESTD NUMBER DEFAULT 1, -- Estado (rubro RHH_ESTADO_LIQUIDACION)
    CSTRCDGO NUMBER,           -- FK a CausalTerminacion
    LQDCFCIN DATE,             -- Fecha de ingreso, para el calculo de antiguedad
    LQDCANSR NUMBER(18,4),     -- Anios de servicio
    LQDCULRM NUMBER(18,2),     -- Ultima remuneracion
    LQDCTTIN NUMBER(18,2) DEFAULT 0, -- Total de ingresos del finiquito
    LQDCTTDS NUMBER(18,2) DEFAULT 0, -- Total de descuentos del finiquito
    LQDCDSHC NUMBER(18,2) DEFAULT 0, -- Bonificacion por desahucio
    LQDCDSPD NUMBER(18,2) DEFAULT 0, -- Indemnizacion por despido intempestivo
    LQDCJBPT NUMBER(18,2) DEFAULT 0, -- Jubilacion patronal
    LQDCACSU VARCHAR2(50),           -- Numero del acta de finiquito en el SUT
    LQDCFCSU DATE,                   -- Fecha de registro en el SUT
    ASNTCDGO NUMBER,                 -- FK al asiento contable de la liquidacion
    LQDCFCAP DATE,
    LQDCUSAP VARCHAR2(60)
);

ALTER TABLE RHH.LQDC ADD CONSTRAINT FK_LQDC_CSTR FOREIGN KEY (CSTRCDGO) REFERENCES RHH.CSTR(CSTRCDGO);
CREATE INDEX IDX_LQDC_CSTR ON RHH.LQDC(CSTRCDGO);

COMMENT ON COLUMN RHH.LQDC.LQDCESTD IS 'Estado de la liquidacion: detalle del rubro RHH_ESTADO_LIQUIDACION';
COMMENT ON COLUMN RHH.LQDC.CSTRCDGO IS 'FK a RHH.CSTR (causal de terminacion que determina los rubros del finiquito)';
COMMENT ON COLUMN RHH.LQDC.LQDCFCIN IS 'Fecha de ingreso del empleado, base del calculo de antiguedad';
COMMENT ON COLUMN RHH.LQDC.LQDCANSR IS 'Anios de servicio cumplidos a la fecha de salida';
COMMENT ON COLUMN RHH.LQDC.LQDCULRM IS 'Ultima remuneracion mensual, base de desahucio e indemnizacion';
COMMENT ON COLUMN RHH.LQDC.LQDCTTIN IS 'Total de ingresos del finiquito';
COMMENT ON COLUMN RHH.LQDC.LQDCTTDS IS 'Total de descuentos del finiquito';
COMMENT ON COLUMN RHH.LQDC.LQDCDSHC IS 'Bonificacion por desahucio calculada';
COMMENT ON COLUMN RHH.LQDC.LQDCDSPD IS 'Indemnizacion por despido intempestivo calculada';
COMMENT ON COLUMN RHH.LQDC.LQDCJBPT IS 'Valor de jubilacion patronal, cuando aplica';
COMMENT ON COLUMN RHH.LQDC.LQDCACSU IS 'Numero del acta de finiquito registrada en el SUT';
COMMENT ON COLUMN RHH.LQDC.LQDCFCSU IS 'Fecha de registro del acta de finiquito en el SUT';
COMMENT ON COLUMN RHH.LQDC.ASNTCDGO IS 'FK al asiento contable de la liquidacion (CNT.ASNT)';
COMMENT ON COLUMN RHH.LQDC.LQDCFCAP IS 'Fecha de aprobacion de la liquidacion';
COMMENT ON COLUMN RHH.LQDC.LQDCUSAP IS 'Usuario que aprobo la liquidacion';

ALTER TABLE RHH.TMLQ ADD (
    CPNMCDGO NUMBER,       -- FK a ConceptoNomina
    TMLQTPCN NUMBER,       -- Tipo de concepto (snapshot)
    TMLQBSCL NUMBER(18,2), -- Base de calculo
    TMLQDIAS NUMBER(18,4), -- Dias considerados
    TMLQORDN NUMBER        -- Orden de presentacion
);

ALTER TABLE RHH.TMLQ ADD CONSTRAINT FK_TMLQ_CPNM FOREIGN KEY (CPNMCDGO) REFERENCES RHH.CPNM(CPNMCDGO);
CREATE INDEX IDX_TMLQ_CPNM ON RHH.TMLQ(CPNMCDGO);

COMMENT ON COLUMN RHH.TMLQ.CPNMCDGO IS 'FK a RHH.CPNM (concepto del rubro de finiquito)';
COMMENT ON COLUMN RHH.TMLQ.TMLQTPCN IS 'Tipo de concepto congelado al momento del calculo';
COMMENT ON COLUMN RHH.TMLQ.TMLQBSCL IS 'Base sobre la que se calculo el rubro del finiquito';
COMMENT ON COLUMN RHH.TMLQ.TMLQDIAS IS 'Dias considerados en el calculo del rubro';
COMMENT ON COLUMN RHH.TMLQ.TMLQORDN IS 'Orden de presentacion del rubro en el acta';


-- =====================================================
-- RHH.RSMN (ResumenNomina): horas extra tipificadas
-- =====================================================
ALTER TABLE RHH.RSMN ADD (
    RSMNHRTR NUMBER(18,4) DEFAULT 0, -- Horas efectivamente trabajadas
    RSMNHRSP NUMBER(18,4) DEFAULT 0, -- Horas suplementarias al 50 por ciento
    RSMNHREX NUMBER(18,4) DEFAULT 0, -- Horas extraordinarias al 100 por ciento
    RSMNHRNC NUMBER(18,4) DEFAULT 0, -- Horas con recargo nocturno
    RSMNSLAN NUMBER DEFAULT 0,       -- Minutos de salida anticipada
    RSMNTPAS NUMBER,                 -- Tipo de ausencia (rubro RHH_TIPO_AUSENCIA)
    RSMNENTT TIMESTAMP,              -- Hora de entrada real
    RSMNSLDT TIMESTAMP,              -- Hora de salida real
    RSMNINCN VARCHAR2(1) DEFAULT 'N',-- Marcaciones inconsistentes (S/N)
    RSMNPRCS VARCHAR2(1) DEFAULT 'N',-- Ya fue procesado en un periodo cerrado (S/N)
    RSMNJSTC VARCHAR2(300)           -- Justificacion de la correccion manual
);

COMMENT ON COLUMN RHH.RSMN.RSMNHRTR IS 'Horas efectivamente trabajadas en el dia, descontado el almuerzo';
COMMENT ON COLUMN RHH.RSMN.RSMNHRSP IS 'Horas suplementarias del dia, con recargo del 50 por ciento';
COMMENT ON COLUMN RHH.RSMN.RSMNHREX IS 'Horas extraordinarias del dia, con recargo del 100 por ciento';
COMMENT ON COLUMN RHH.RSMN.RSMNHRNC IS 'Horas de jornada ordinaria cumplidas en horario nocturno';
COMMENT ON COLUMN RHH.RSMN.RSMNSLAN IS 'Minutos de salida anticipada respecto del turno';
COMMENT ON COLUMN RHH.RSMN.RSMNTPAS IS 'Tipo de ausencia del dia: detalle del rubro RHH_TIPO_AUSENCIA';
COMMENT ON COLUMN RHH.RSMN.RSMNENTT IS 'Hora de entrada real, como TIMESTAMP en lugar del VARCHAR original';
COMMENT ON COLUMN RHH.RSMN.RSMNSLDT IS 'Hora de salida real, como TIMESTAMP en lugar del VARCHAR original';
COMMENT ON COLUMN RHH.RSMN.RSMNINCN IS 'Indica si las marcaciones del dia son inconsistentes y requieren revision (S/N)';
COMMENT ON COLUMN RHH.RSMN.RSMNPRCS IS 'Indica si el resumen ya fue consumido por un periodo cerrado (S/N)';
COMMENT ON COLUMN RHH.RSMN.RSMNJSTC IS 'Justificacion de la correccion manual del resumen';


-- =====================================================
-- RHH.SLDV (SaldoVacaciones): antiguedad y arrastre
-- =====================================================
ALTER TABLE RHH.SLDV ADD (
    SLDVFCHI DATE,                     -- Inicio del periodo de vacaciones
    SLDVFCHF DATE,                     -- Fin del periodo de vacaciones
    SLDVDIAD NUMBER(18,4) DEFAULT 0,   -- Dias adicionales por antiguedad
    SLDVDIAR NUMBER(18,4) DEFAULT 0,   -- Dias arrastrados del periodo anterior
    SLDVDIPG NUMBER(18,4) DEFAULT 0,   -- Dias liquidados en dinero
    SLDVVLDI NUMBER(18,2),             -- Valor del dia de vacaciones
    SLDVCDCD VARCHAR2(1) DEFAULT 'N',  -- Caducado (S/N)
    SLDVAPRT VARCHAR2(1) DEFAULT 'N',  -- Proviene de saldo de apertura (S/N)
    SLDVESTD NUMBER DEFAULT 1
);

COMMENT ON COLUMN RHH.SLDV.SLDVFCHI IS 'Fecha de inicio del periodo anual de vacaciones';
COMMENT ON COLUMN RHH.SLDV.SLDVFCHF IS 'Fecha de fin del periodo anual de vacaciones';
COMMENT ON COLUMN RHH.SLDV.SLDVDIAD IS 'Dias adicionales acreditados por antiguedad a partir del quinto anio';
COMMENT ON COLUMN RHH.SLDV.SLDVDIAR IS 'Dias arrastrados del periodo anterior no gozados';
COMMENT ON COLUMN RHH.SLDV.SLDVDIPG IS 'Dias del periodo que se liquidaron en dinero';
COMMENT ON COLUMN RHH.SLDV.SLDVVLDI IS 'Valor del dia de vacaciones calculado sobre la base de los ultimos doce meses';
COMMENT ON COLUMN RHH.SLDV.SLDVCDCD IS 'Indica si el saldo caduco por superar el plazo legal (S/N)';
COMMENT ON COLUMN RHH.SLDV.SLDVAPRT IS 'Indica si el saldo proviene de la migracion de apertura (S/N)';
COMMENT ON COLUMN RHH.SLDV.SLDVESTD IS 'Estado del registro (1=ACTIVO)';


-- =====================================================
-- RHH.MRCC (Marcaciones): trazabilidad del lote de origen
-- =====================================================
ALTER TABLE RHH.MRCC ADD (
    CRMRCDGO NUMBER,        -- FK a CargaMarcaciones
    MRCCDSPS VARCHAR2(50),  -- Identificador del dispositivo
    MRCCLNAR NUMBER,        -- Numero de linea en el archivo origen
    MRCCPRCS VARCHAR2(1) DEFAULT 'N' -- Ya fue consolidado en un resumen diario (S/N)
);

ALTER TABLE RHH.MRCC ADD CONSTRAINT FK_MRCC_CRMR FOREIGN KEY (CRMRCDGO) REFERENCES RHH.CRMR(CRMRCDGO);
CREATE INDEX IDX_MRCC_CRMR ON RHH.MRCC(CRMRCDGO);

COMMENT ON COLUMN RHH.MRCC.CRMRCDGO IS 'FK a RHH.CRMR (lote de importacion del que proviene la marcacion)';
COMMENT ON COLUMN RHH.MRCC.MRCCDSPS IS 'Identificador del dispositivo biometrico que registro la marcacion';
COMMENT ON COLUMN RHH.MRCC.MRCCLNAR IS 'Numero de linea del archivo origen, para rastrear errores';
COMMENT ON COLUMN RHH.MRCC.MRCCPRCS IS 'Indica si la marcacion ya fue consolidada en un resumen diario (S/N)';


-- =====================================================
-- RHH.HSTR (Historial): correccion del mapeo defectuoso
-- =====================================================
-- El campo departamento apuntaba a DepartamentoCargo con JoinColumn
-- DPRTCDGO cuando la PK de esa entidad es DPTCCDGO. Se separa en dos
-- columnas explicitas y se agrega el tipo de cambio.
ALTER TABLE RHH.HSTR ADD (
    DPTCCDGO NUMBER, -- FK a DepartamentoCargo
    HSTRTPCM NUMBER, -- Tipo de cambio (rubro RHH_TIPO_CAMBIO_HISTORIAL)
    HSTRSLAN NUMBER(18,2), -- Sueldo anterior
    HSTRSLNW NUMBER(18,2)  -- Sueldo nuevo
);

ALTER TABLE RHH.HSTR ADD CONSTRAINT FK_HSTR_DPTC FOREIGN KEY (DPTCCDGO) REFERENCES RHH.DPTC(DPTCCDGO);
CREATE INDEX IDX_HSTR_DPTC ON RHH.HSTR(DPTCCDGO);

COMMENT ON COLUMN RHH.HSTR.DPTCCDGO IS 'FK a RHH.DPTC (DepartamentoCargo); reemplaza el mapeo defectuoso que apuntaba a DPRTCDGO';
COMMENT ON COLUMN RHH.HSTR.HSTRTPCM IS 'Tipo de cambio registrado: detalle del rubro RHH_TIPO_CAMBIO_HISTORIAL';
COMMENT ON COLUMN RHH.HSTR.HSTRSLAN IS 'Sueldo anterior al cambio';
COMMENT ON COLUMN RHH.HSTR.HSTRSLNW IS 'Sueldo posterior al cambio';


-- =====================================================
-- RHH.TPCE y RHH.CTLG: enlace con los rubros
-- =====================================================
ALTER TABLE RHH.TPCE ADD (
    PJRQCDGO NUMBER, -- FK a Empresa
    TPCETPRL NUMBER, -- Tipo de relacion laboral (rubro RHH_TIPO_RELACION_LABORAL)
    TPCEMXMS NUMBER  -- Duracion maxima en meses
);

COMMENT ON COLUMN RHH.TPCE.PJRQCDGO IS 'FK a Empresa (SCP.PJRQ)';
COMMENT ON COLUMN RHH.TPCE.TPCETPRL IS 'Tipo de relacion laboral asociado: detalle del rubro RHH_TIPO_RELACION_LABORAL';
COMMENT ON COLUMN RHH.TPCE.TPCEMXMS IS 'Duracion maxima en meses permitida para este tipo de contrato';

ALTER TABLE RHH.CTLG ADD (
    PJRQCDGO NUMBER, -- FK a Empresa
    CTLGTPAS NUMBER, -- Tipo de ausencia (rubro RHH_TIPO_AUSENCIA)
    CTLGMXDI NUMBER, -- Maximo de dias permitidos
    CTLGDSNM VARCHAR2(1) DEFAULT 'N' -- Descuenta de la nomina (S/N)
);

COMMENT ON COLUMN RHH.CTLG.PJRQCDGO IS 'FK a Empresa (SCP.PJRQ)';
COMMENT ON COLUMN RHH.CTLG.CTLGTPAS IS 'Tipo de ausencia al que corresponde: detalle del rubro RHH_TIPO_AUSENCIA';
COMMENT ON COLUMN RHH.CTLG.CTLGMXDI IS 'Maximo de dias permitidos para este tipo de permiso';
COMMENT ON COLUMN RHH.CTLG.CTLGDSNM IS 'Indica si el permiso se descuenta de la nomina (S/N)';


-- =====================================================
-- CORRECCION DE TIPOS MONETARIOS: Double a NUMBER(18,2)
-- =====================================================
ALTER TABLE RHH.CNTE MODIFY (CNTESLRB NUMBER(18,2));
ALTER TABLE RHH.NMNA MODIFY (NMNASLRB NUMBER(18,2), NMNATING NUMBER(18,2),
                             NMNATDSC NUMBER(18,2), NMNANETO NUMBER(18,2));
ALTER TABLE RHH.LQDC MODIFY (LQDCNETO NUMBER(18,2));
ALTER TABLE RHH.TMLQ MODIFY (TMLQVLRO NUMBER(18,2));
ALTER TABLE RHH.PRTE MODIFY (PRTEBSEE NUMBER(18,2), PRTEVLRO NUMBER(18,2), PRTEPRCN NUMBER(18,6));
ALTER TABLE RHH.NXOO MODIFY (NXOOSLRN NUMBER(18,2));
ALTER TABLE RHH.SLDV MODIFY (SLDVASGN NUMBER(18,4), SLDVUSDO NUMBER(18,4), SLDVPNDE NUMBER(18,4));
ALTER TABLE RHH.SLCT MODIFY (SLCTDIAS NUMBER(18,4));
ALTER TABLE RHH.PTCN MODIFY (PTCNHRAS NUMBER(18,4));


-- =====================================================
-- BACKFILL DE LA EMPRESA EN LAS FILAS YA EXISTENTES
-- =====================================================
-- Cuatro tablas del modulo reciben PJRQCDGO en este script: MPLD, PRDN,
-- TPCE y CTLG. Las filas que ya existian quedan con la columna en NULL, y
-- entonces CUALQUIER pantalla que filtre por empresa las deja fuera y se
-- muestra vacia. Es un fallo silencioso: no hay error, simplemente no hay
-- datos.
--
-- Este UPDATE las asigna a la empresa indicada. Solo tiene sentido en una
-- instalacion monoempresa como la de ASOPREP-FCPC; si la base ya tuviera
-- datos de varias empresas, hay que repartirlas con un criterio propio en
-- lugar de ejecutar esto en bloque.
--
-- DBeaver pide :EMPRESA al ejecutar el script (Alt+X). Debe ser el mismo
-- valor que se use en los scripts 07, 08 y 09.
-- =====================================================
UPDATE RHH.MPLD SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.PRDN SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.TPCE SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.CTLG SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;

COMMIT;

-- Verificacion: las cuatro consultas deben devolver 0.
-- SELECT COUNT(*) FROM RHH.MPLD WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.PRDN WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.TPCE WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.CTLG WHERE PJRQCDGO IS NULL;
--
-- Una vez confirmado, el frontend puede activar el filtro por empresa en
-- las pantallas de tipos de contrato y de catalogo de permisos, que hoy
-- listan sin filtrar precisamente para no salir vacias.
