-- =====================================================
-- MODULO: RHH - NOVEDADES IESS COMPLETAS: RUBROS, COLUMNAS Y PARAMETROS
-- DESCRIPCION: Lleva RHH.NVIS, RHH.CNTE, RHH.PRNM y los rubros a lo que la
--              normativa del IESS exige (NORMATIVA-IESS-NOVEDADES.md §5).
--              Es DDL de producto: se queda en toda instalacion.
-- ORDEN DE EJECUCION: 41
-- FECHA: 2026-08-21
-- =====================================================
-- REGLA: todo lo que sea tasa, plazo, codigo o catalogo va a PRNM o a rubros.
-- En Java solo viven los NOMBRES (RhhTipoNovedadIess, Rubros.RHH_*), nunca
-- un numero de la normativa.
--
-- IDS EXPLICITOS, como en el 06: PRBRCDGO sigue en 226 (max actual 225),
-- PRBRALTR en 225 (max 224), PDTRCDGO en 1079 (max 1078). Despues de
-- ejecutar, adelantar las secuencias si existen:
--   ALTER SEQUENCE SCP.SQ_PRBRCDGO RESTART START WITH 231;
--   ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1108;   -- tope real tras ejecutar: 1107
--
-- LO QUE NO SE PUDO VERIFICAR (NORMATIVA §7): los codigos de UN DIGITO del
-- archivo batch (jornada, seguro social, origen de pago, causa de salida,
-- causa de variacion) estan en anexos del portal que exigen login. Se crean
-- los detalles con su NOMBRE y el codigo IESS en PDTRVLRV = '?'. Se completan
-- leyendo los anexos con las credenciales de ASOPREP. El exportador batch debe
-- NEGARSE a generar un archivo con algun '?'.
-- =====================================================


-- =====================================================
-- 1. RUBRO 204 (RHH_TIPO_NOVEDAD_IESS): los tipos que faltan
--    PDTRVLRN = plazo legal en dias (art. 73 LSS: 3 dias; entrada 15).
--    PDTRVLRV = codigo del archivo batch cuando existe.
-- =====================================================
-- Primero, el codigo batch de los cinco que ya existen:
UPDATE SCP.PDTR SET PDTRVLRV = 'ENT' WHERE PDTRCDGO = 894;   -- aviso de entrada
UPDATE SCP.PDTR SET PDTRVLRV = 'SAL' WHERE PDTRCDGO = 895;   -- aviso de salida
UPDATE SCP.PDTR SET PDTRVLRV = 'MSU' WHERE PDTRCDGO = 896;   -- modificacion de sueldo
UPDATE SCP.PDTR SET PDTRVLRV = 'PFM' WHERE PDTRCDGO = 897;   -- fondos de reserva mensual
UPDATE SCP.PDTR SET PDTRVLRV = NULL  WHERE PDTRCDGO = 898;   -- cambio de modalidad: interno, no se envia

INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRN, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 205, d.DSCR, d.ALTR, d.DIAS, d.BATCH, d.ESTD FROM (
    SELECT 1079 AS CDGO, 'VARIACION DE SUELDO POR EXTRAS / SUBROGACION / ENCARGO' AS DSCR,  6 AS ALTR, 3 AS DIAS, 'INS' AS BATCH, 1 AS ESTD FROM DUAL UNION ALL
    SELECT 1080, 'CAMBIO DE RELACION DE TRABAJO O ACTIVIDAD SECTORIAL',           7, 3, NULL,  1 FROM DUAL UNION ALL
    SELECT 1081, 'LICENCIA SIN REMUNERACION MAT/PAT CUIDADO DE HIJOS',            8, 3, NULL,  1 FROM DUAL UNION ALL
    SELECT 1082, 'REINTEGRO ANTICIPADO DE LICENCIA SIN REMUNERACION',             9, 3, NULL,  1 FROM DUAL UNION ALL
    SELECT 1083, 'CAMBIO DE JORNADA (PARCIAL / COMPLETA)',                       10, 3, 'MSU', 1 FROM DUAL UNION ALL
    SELECT 1084, 'RETROACTIVO POR CONTRATO COLECTIVO',                           11, 3, 'PRA', 0 FROM DUAL   -- inactivo: ASOPREP no lo usa
) d;


-- =====================================================
-- 2. RUBROS NUEVOS: los codigos del archivo ENT/SAL/INS
-- =====================================================
-- 225 / PRBRCDGO 226 - RHH_JORNADA_IESS (1 digito, campo "Jornada" del ENT)
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (226, 'RHH JORNADA IESS', SYSDATE, 225, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 226, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1085 AS CDGO, 'TIEMPO COMPLETO' AS DSCR, 1 AS ALTR, '?' AS COD FROM DUAL UNION ALL
    SELECT 1086, 'TIEMPO PARCIAL',  2, '?' FROM DUAL
) d;
-- Coincide con CNTEJRND (1 completo, 2 parcial): el codigo IESS se lee de aqui.

-- 226 / PRBRCDGO 227 - RHH_RELACION_TRABAJO_IESS (2 digitos)
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (227, 'RHH RELACION DE TRABAJO IESS', SYSDATE, 226, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 227, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1087 AS CDGO, 'CODIGO DEL TRABAJO - CT' AS DSCR,                       1 AS ALTR, '06'  AS COD FROM DUAL UNION ALL  -- verificado: RT de todas las planillas de ASOPREP
    SELECT 1088, 'GERENTE ADMINISTRADOR SIN RELACION DE DEPENDENCIA',             2, '109' FROM DUAL UNION ALL  -- verificado: IESS desde 09-2017
    SELECT 1089, 'TRABAJADOR INTERMEDIADO',                                        3, '53'  FROM DUAL UNION ALL  -- verificado: formato RRT
    SELECT 1090, 'LOSEP - SERVIDOR PUBLICO',                                       4, '?'   FROM DUAL
) d;

-- 227 / PRBRCDGO 228 - RHH_ORIGEN_PAGO_IESS (1 digito)
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (228, 'RHH ORIGEN DE PAGO IESS', SYSDATE, 227, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 228, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1091 AS CDGO, 'FONDOS PRIVADOS' AS DSCR, 1 AS ALTR, '?' AS COD FROM DUAL UNION ALL
    SELECT 1092, 'FONDOS PUBLICOS', 2, '?' FROM DUAL
) d;

-- 228 / PRBRCDGO 229 - RHH_CAUSA_SALIDA_IESS (1 digito del SAL)
-- Se mapea desde CSTR por CSTRALTR: cada causal nuestra apunta a una causa IESS.
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (229, 'RHH CAUSA DE SALIDA IESS', SYSDATE, 228, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 229, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1093 AS CDGO, 'RENUNCIA VOLUNTARIA' AS DSCR,        1 AS ALTR, '?' AS COD FROM DUAL UNION ALL
    SELECT 1094, 'DESAHUCIO',                                   2, '?' FROM DUAL UNION ALL
    SELECT 1095, 'VISTO BUENO',                                 3, '?' FROM DUAL UNION ALL
    SELECT 1096, 'DESPIDO INTEMPESTIVO',                        4, '?' FROM DUAL UNION ALL
    SELECT 1097, 'MUTUO ACUERDO',                               5, '?' FROM DUAL UNION ALL
    SELECT 1098, 'TERMINACION DEL PLAZO / CONTRATO',            6, '?' FROM DUAL UNION ALL
    SELECT 1099, 'JUBILACION',                                  7, '?' FROM DUAL UNION ALL
    SELECT 1100, 'FALLECIMIENTO',                               8, '?' FROM DUAL UNION ALL
    SELECT 1101, 'LIQUIDACION DE LA EMPRESA',                   9, '?' FROM DUAL UNION ALL
    SELECT 1102, 'CASO FORTUITO O FUERZA MAYOR',               10, '?' FROM DUAL UNION ALL
    SELECT 1103, 'TERMINACION EN PERIODO DE PRUEBA',           11, '?' FROM DUAL
) d;
-- Los ALTR coinciden 1:1 con CSTRALTR de RHH.CSTR, asi que la causa IESS de
-- una liquidacion es: PDTRVLRV del detalle 228 con PDTRALTR = CSTR.CSTRALTR.

-- 229 / PRBRCDGO 230 - RHH_CAUSA_VARIACION_IESS (1 digito del INS)
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (230, 'RHH CAUSA DE VARIACION DE SUELDO IESS', SYSDATE, 229, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 230, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1104 AS CDGO, 'HORAS EXTRAS Y SUPLEMENTARIAS' AS DSCR, 1 AS ALTR, '?' AS COD FROM DUAL UNION ALL
    SELECT 1105, 'SUBROGACION',                                  2, '?' FROM DUAL UNION ALL
    SELECT 1106, 'ENCARGO',                                      3, '?' FROM DUAL UNION ALL
    SELECT 1107, 'OTROS INGRESOS IMPONIBLES NO PERMANENTES',    4, '?' FROM DUAL
) d;

COMMIT;


-- =====================================================
-- 3. RHH.NVIS: los campos que el archivo exige y hoy no existen
-- =====================================================
ALTER TABLE RHH.NVIS ADD (
    NVISDIAS  NUMBER,                 -- dias declarados (ENT parcial, cambio de jornada)
    NVISSLRF  NUMBER(18,2),           -- sueldo referencial de 30 dias (ENT parcial)
    NVISVLVR  NUMBER(18,2),           -- valor de la variacion (INS)
    NVISCAIS  VARCHAR2(2),            -- codigo de causa IESS (SAL: 1 digito; INS: 1 digito)
    NVISFCFL  DATE,                   -- fecha de fallecimiento (SAL causa fallecimiento)
    NVISFCFN  DATE,                   -- fecha fin (licencias)
    NVISPRDS  VARCHAR2(7),            -- periodo FR desde  YYYY-MM  (PFM)
    NVISPRHS  VARCHAR2(7),            -- periodo FR hasta  YYYY-MM  (PFM)
    NVISMSLB  NUMBER,                 -- meses laborados (PFM)
    NVISRSPT  VARCHAR2(500),          -- respuesta del IESS (motivo de rechazo)
    NVISLOTE  VARCHAR2(60)            -- lote / comprobante del envio batch
);
COMMENT ON COLUMN RHH.NVIS.NVISDIAS IS 'Dias declarados al IESS. Parcial: TRUNC(horas dia x 30 / 8).';
COMMENT ON COLUMN RHH.NVIS.NVISSLRF IS 'Sueldo referencial de 30 dias, nunca menor al SBU (ENT tiempo parcial).';
COMMENT ON COLUMN RHH.NVIS.NVISCAIS IS 'Codigo IESS de causa: PDTRVLRV del rubro 228 (salida) o 229 (variacion).';


-- =====================================================
-- 4. RHH.CNTE: codigo sectorial y los dias de la jornada parcial
-- =====================================================
ALTER TABLE RHH.CNTE ADD (
    CNTECDSC  VARCHAR2(13),           -- codigo de actividad sectorial IESS (13 digitos), obligatorio en el ENT
    CNTEDIAD  NUMBER                  -- dias declarados al IESS; NULL = 30. Parcial: TRUNC(CNTEHRSM/5 x 30/8)
);
COMMENT ON COLUMN RHH.CNTE.CNTECDSC IS 'Codigo sectorial IESS del cargo (13 digitos). Obligatorio para el aviso de entrada.';
COMMENT ON COLUMN RHH.CNTE.CNTEDIAD IS 'Dias declarados al IESS. NULL = 30. Tiempo parcial: 20 h/sem -> 4 h/dia -> 15 dias.';
-- CNTESLRB pasa a significar SUELDO REFERENCIAL DE 30 DIAS en todos los casos.
-- El imponible del mes = CNTESLRB x NVL(CNTEDIAD,30) / 30. Es el punto 11 de la
-- lista de fin de calibracion; se aplica al motor en la pasada de recalculo.


-- =====================================================
-- 5. RHH.PRNM: las dos tasas del comprobante que faltaban
-- =====================================================
ALTER TABLE RHH.PRNM ADD (
    PRNMCCCP  NUMBER(5,2) DEFAULT 1.00,   -- contribucion CCC, % de la masa salarial
    PRNMSSTP  NUMBER(5,2) DEFAULT 4.41    -- seguro de salud tiempo parcial, % sobre (SBU - sueldo real)
);
COMMENT ON COLUMN RHH.PRNM.PRNMCCCP IS 'Contribucion 1% (CCC) sobre la masa salarial declarada. Parte del comprobante IESS.';
COMMENT ON COLUMN RHH.PRNM.PRNMSSTP IS 'Seguro de salud tiempo parcial: % sobre (SBU - sueldo real) del afiliado a jornada parcial.';
UPDATE RHH.PRNM SET PRNMCCCP = 1.00, PRNMSSTP = 4.41 WHERE PRNMCCCP IS NULL;
-- Verificado contra ASOPREP: CCC abril 205,60 = 1% de 20.560,00;
-- seguro TP Mendez marzo 10,63 = (482 - 241) x 4,41%.


-- =====================================================
-- 6. PARAMETROS DE EMPRESA PARA LA CABECERA DEL ARCHIVO BATCH
--    (RUC ya esta en la empresa; faltan sucursal IESS y tipo de empleador)
-- =====================================================
ALTER TABLE RHH.CFNM ADD (
    CFNMSCIE  VARCHAR2(4),            -- codigo de sucursal IESS (4 digitos) de la cabecera batch
    CFNMTPEM  VARCHAR2(10)            -- codigo del tipo de empleador asignado por el IESS
);
COMMENT ON COLUMN RHH.CFNM.CFNMSCIE IS 'Codigo de sucursal IESS (4 digitos). Cabecera de cada registro del archivo batch.';
COMMENT ON COLUMN RHH.CFNM.CFNMTPEM IS 'Codigo del tipo de empleador asignado por el IESS. Cabecera del archivo batch.';

COMMIT;


-- =====================================================
-- CONTROL DESPUES
-- =====================================================
SELECT r.PRBRALTR RUBRO, r.PRBRDSCR, COUNT(d.PDTRCDGO) DETALLES,
       SUM(CASE WHEN d.PDTRVLRV = '?' THEN 1 ELSE 0 END) SIN_CODIGO_IESS
  FROM SCP.PRBR r LEFT JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
 WHERE r.PRBRALTR IN (204, 225, 226, 227, 228, 229)
 GROUP BY r.PRBRALTR, r.PRBRDSCR ORDER BY 1;
-- Esperado: 204 -> 11 detalles · 225 -> 2 · 226 -> 4 · 227 -> 2 · 228 -> 11 · 229 -> 4
-- SIN_CODIGO_IESS > 0 es lo esperado HOY: se cierra leyendo los anexos del portal.

SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'RHH' AND TABLE_NAME = 'NVIS' AND COLUMN_NAME LIKE 'NVIS%'
 ORDER BY COLUMN_ID;
-- Esperado: las 15 de antes + 11 nuevas = 26.
