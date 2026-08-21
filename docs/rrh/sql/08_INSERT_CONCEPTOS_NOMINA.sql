-- =====================================================
-- MODULO: RHH - CATALOGO DE CONCEPTOS DE NOMINA
-- DESCRIPCION: Carga del catalogo RHH.CPNM. Este es el catalogo que
--              dirige el motor: el rol de pago se construye recorriendo
--              estas filas. Agregar un concepto nuevo NO requiere tocar
--              codigo Java, solo insertar aqui.
-- ORDEN DE EJECUCION: 8 de 9
-- FECHA: 2026-08-19
-- =====================================================
-- CODIGOS DE RUBRO USADOS EN ESTE SCRIPT:
--   CPNMTPCN (179): 1=INGRESO 2=EGRESO 3=APORTE_PATRONAL 4=PROVISION 5=INFORMATIVO
--   CPNMTPCL (180): 1=VALOR_FIJO 2=PORCENTAJE_SOBRE_BASE 3=POR_CANTIDAD
--                   4=FORMULA 5=TABLA_PROGRESIVA 6=DESDE_ACUMULADO 7=MANUAL
--   CPNMBSCL (181): 1=SUELDO_CONTRATO 2=IMPONIBLE_IESS 3=GRAVADO_IR
--                   4=SBU 5=VALOR_HORA 6=TOTAL_INGRESOS 7=NETO
--   CPNMTPRL (186): NULL = aplica a todas las relaciones laborales
--                   6 = solo servicios profesionales sin dependencia
--
-- REGLA DE ORO DEL CAMPO CPNMRCRT:
--   'N' = el concepto NUNCA se recorta ante neto negativo. Se reserva
--         para los descuentos de ley (aporte IESS, impuesto a la renta,
--         retencion judicial). El resto va en 'S' y se recorta en orden
--         descendente de CPNMORDN hasta que el neto deje de ser negativo.
--
-- Las cuentas contables (PLNNCDGO) quedan en NULL a proposito y se
-- completan con el script 09.
--
-- PARAMETRO :EMPRESA
--   Codigo de la empresa (SCP.PJRQ.PJRQCDGO). DBeaver lo pide al ejecutar
--   el script (Alt+X). Debe ser el MISMO valor usado en los scripts 07 y 09.
-- =====================================================


-- =====================================================
-- INGRESOS (CPNMTPCN = 1)
-- =====================================================
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL, CPNMTPRL,
    CPNMVLRR, CPNMPRCN,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMORDN, CPNMESTD, CPNMUSRR
)
SELECT :EMPRESA, d.ALTR, d.NMBR, d.ABRV,
       1, d.TPCL, d.BSCL, d.TPRL,
       d.VLRR, d.PRCN,
       d.IMIE, d.IMIR, d.APFR, d.BSDT, d.BSDC, d.BSVC, d.BSUT,
       'N', 'N', d.OBLG, 'S',
       d.ORDN, 1, 'INSTALACION'
FROM (
    --      ALTR  NOMBRE                              ABRV      TPCL BSCL TPRL VLRR PRCN   IMIE IMIR APFR BSDT BSDC BSVC BSUT OBLG ORDN
    SELECT   1 AS ALTR, 'Sueldo'                       AS NMBR, 'SUELDO'   AS ABRV, 1 AS TPCL, 1 AS BSCL, CAST(NULL AS NUMBER) AS TPRL, CAST(NULL AS NUMBER) AS VLRR, CAST(NULL AS NUMBER) AS PRCN, 'S' AS IMIE, 'S' AS IMIR, 'S' AS APFR, 'S' AS BSDT, 'N' AS BSDC, 'S' AS BSVC, 'S' AS BSUT, 'S' AS OBLG, 10 AS ORDN FROM DUAL UNION ALL
    SELECT   2, 'Horas suplementarias 50%',    'HE50',   3, 5, NULL, NULL,  50.00, 'S','S','S','S','N','S','S','N', 20 FROM DUAL UNION ALL
    SELECT   3, 'Horas extraordinarias 100%',  'HE100',  3, 5, NULL, NULL, 100.00, 'S','S','S','S','N','S','S','N', 21 FROM DUAL UNION ALL
    SELECT   4, 'Recargo nocturno 25%',        'RNOC',   3, 5, NULL, NULL,  25.00, 'S','S','S','S','N','S','S','N', 22 FROM DUAL UNION ALL
    SELECT   5, 'Decimo tercero mensualizado', 'D3MEN',  4, 3, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 30 FROM DUAL UNION ALL
    SELECT   6, 'Decimo cuarto mensualizado',  'D4MEN',  4, 4, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 31 FROM DUAL UNION ALL
    SELECT   7, 'Fondos de reserva',           'FRES',   2, 2, NULL, NULL,   8.33, 'N','N','N','N','N','N','N','N', 32 FROM DUAL UNION ALL
    SELECT   8, 'Bono de responsabilidad',     'BONRES', 1, 1, NULL, NULL, NULL,   'S','S','S','S','N','S','S','N', 40 FROM DUAL UNION ALL
    SELECT   9, 'Movilizacion',                'MOVIL',  1, 1, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 41 FROM DUAL UNION ALL
    SELECT  10, 'Alimentacion',                'ALIM',   1, 1, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 42 FROM DUAL UNION ALL
    SELECT  11, 'Comisiones',                  'COMIS',  7, 1, NULL, NULL, NULL,   'S','S','S','S','N','S','S','N', 43 FROM DUAL UNION ALL
    SELECT  12, 'Vacaciones pagadas',          'VACPAG', 7, 1, NULL, NULL, NULL,   'S','S','S','S','N','N','S','N', 44 FROM DUAL UNION ALL
    SELECT  13, 'Subsidio IESS',               'SUBIES', 7, 1, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 45 FROM DUAL UNION ALL
    SELECT  14, 'Reintegro',                   'REINT',  7, 1, NULL, NULL, NULL,   'N','N','N','N','N','N','N','N', 46 FROM DUAL UNION ALL
    SELECT  15, 'Utilidades',                  'UTIL',   6, 1, NULL, NULL, NULL,   'N','S','N','N','N','N','N','N', 47 FROM DUAL UNION ALL
    SELECT  16, 'Honorarios profesionales',    'HONOR',  1, 1,    6, NULL, NULL,   'N','N','N','N','N','N','N','N', 48 FROM DUAL
) d;


-- =====================================================
-- EGRESOS (CPNMTPCN = 2)
-- =====================================================
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL, CPNMTPRL,
    CPNMVLRR, CPNMPRCN,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMORDN, CPNMESTD, CPNMUSRR
)
SELECT :EMPRESA, d.ALTR, d.NMBR, d.ABRV,
       2, d.TPCL, d.BSCL, d.TPRL,
       NULL, d.PRCN,
       'N', 'N', 'N', 'N', 'N', 'N', 'N',
       'N', 'N', d.OBLG, d.RCRT,
       d.ORDN, 1, 'INSTALACION'
FROM (
    SELECT  20 AS ALTR, 'Aporte personal IESS'            AS NMBR, 'APIESS'  AS ABRV, 2 AS TPCL, 2 AS BSCL, CAST(NULL AS NUMBER) AS TPRL, 9.45 AS PRCN, 'S' AS OBLG, 'N' AS RCRT, 100 AS ORDN FROM DUAL UNION ALL
    SELECT  21, 'Impuesto a la renta',             'IRENTA', 6, 3, NULL, NULL, 'S', 'N', 101 FROM DUAL UNION ALL
    SELECT  22, 'Retencion judicial',              'RETJUD', 7, 7, NULL, NULL, 'N', 'N', 102 FROM DUAL UNION ALL
    SELECT  23, 'Prestamo quirografario IESS',     'QUIROG', 7, 1, NULL, NULL, 'N', 'N', 110 FROM DUAL UNION ALL
    SELECT  24, 'Prestamo hipotecario IESS',       'HIPOTE', 7, 1, NULL, NULL, 'N', 'N', 111 FROM DUAL UNION ALL
    SELECT  25, 'Anticipo de sueldo',              'ANTSUE', 7, 1, NULL, NULL, 'N', 'S', 120 FROM DUAL UNION ALL
    SELECT  26, 'Prestamo interno',                'PRESIN', 7, 1, NULL, NULL, 'N', 'S', 121 FROM DUAL UNION ALL
    SELECT  27, 'Seguro privado',                  'SEGPRI', 7, 1, NULL, NULL, 'N', 'S', 130 FROM DUAL UNION ALL
    SELECT  28, 'Multas y atrasos',                'MULTAS', 7, 1, NULL, NULL, 'N', 'S', 131 FROM DUAL UNION ALL
    SELECT  29, 'Descuento por faltas',            'DESFAL', 7, 1, NULL, NULL, 'N', 'S', 132 FROM DUAL UNION ALL
    SELECT  30, 'Retencion en la fuente servicios','RETSER', 2, 6,    6, NULL, 'N', 'N', 133 FROM DUAL
) d;


-- =====================================================
-- APORTES PATRONALES (CPNMTPCN = 3) - no afectan el neto
-- =====================================================
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL, CPNMPRCN,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMORDN, CPNMESTD, CPNMUSRR
)
SELECT :EMPRESA, d.ALTR, d.NMBR, d.ABRV,
       3, 2, 2, d.PRCN,
       'N','N','N','N','N','N','N',
       'S', 'N', 'S', 'N',
       d.ORDN, 1, 'INSTALACION'
FROM (
    SELECT 40 AS ALTR, 'Aporte patronal IESS' AS NMBR, 'APPATR' AS ABRV, 11.15 AS PRCN, 200 AS ORDN FROM DUAL UNION ALL
    SELECT 41, 'Aporte IECE',  'IECE',  0.50, 201 FROM DUAL UNION ALL
    SELECT 42, 'Aporte SECAP', 'SECAP', 0.50, 202 FROM DUAL
) d;


-- =====================================================
-- PROVISIONES (CPNMTPCN = 4) - no afectan el neto
-- =====================================================
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL, CPNMPRCN,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMORDN, CPNMESTD, CPNMUSRR
)
SELECT :EMPRESA, d.ALTR, d.NMBR, d.ABRV,
       4, d.TPCL, d.BSCL, d.PRCN,
       'N','N','N','N','N','N','N',
       'S', 'S', 'N', 'N',
       d.ORDN, 1, 'INSTALACION'
FROM (
    SELECT 50 AS ALTR, 'Provision decimo tercero'      AS NMBR, 'PRVD3' AS ABRV, 4 AS TPCL, 3 AS BSCL, CAST(NULL AS NUMBER) AS PRCN, 300 AS ORDN FROM DUAL UNION ALL
    SELECT 51, 'Provision decimo cuarto',      'PRVD4',  4, 4, NULL, 301 FROM DUAL UNION ALL
    SELECT 52, 'Provision vacaciones',         'PRVVAC', 4, 1, NULL, 302 FROM DUAL UNION ALL
    SELECT 53, 'Provision fondos de reserva',  'PRVFR',  2, 2, 8.33, 303 FROM DUAL UNION ALL
    SELECT 54, 'Provision jubilacion patronal','PRVJUB', 7, 1, NULL, 304 FROM DUAL UNION ALL
    SELECT 55, 'Provision desahucio',          'PRVDES', 7, 1, NULL, 305 FROM DUAL
) d;


-- =====================================================
-- RUBROS DE LIQUIDACION DE HABERES (CPNMTPCN = 1)
-- Se usan solo en el finiquito, no en el rol mensual.
-- =====================================================
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMORDN, CPNMESTD, CPNMUSRR
)
SELECT :EMPRESA, d.ALTR, d.NMBR, d.ABRV,
       1, 7, 1,
       'N', d.IMIR, 'N','N','N','N','N',
       'N', 'N', 'N', 'S',
       d.ORDN, 1, 'INSTALACION'
FROM (
    SELECT 60 AS ALTR, 'Decimo tercero proporcional'          AS NMBR, 'LQD3'   AS ABRV, 'N' AS IMIR, 400 AS ORDN FROM DUAL UNION ALL
    SELECT 61, 'Decimo cuarto proporcional',            'LQD4',   'N', 401 FROM DUAL UNION ALL
    SELECT 62, 'Vacaciones no gozadas',                 'LQVAC',  'S', 402 FROM DUAL UNION ALL
    SELECT 63, 'Fondos de reserva pendientes',          'LQFR',   'N', 403 FROM DUAL UNION ALL
    SELECT 64, 'Bonificacion por desahucio',            'LQDESH', 'N', 404 FROM DUAL UNION ALL
    SELECT 65, 'Indemnizacion por despido intempestivo','LQDESP', 'N', 405 FROM DUAL UNION ALL
    SELECT 66, 'Jubilacion patronal',                   'LQJUB',  'N', 406 FROM DUAL UNION ALL
    SELECT 67, 'Remuneracion pendiente',                'LQREM',  'S', 407 FROM DUAL
) d;

COMMIT;




-- =====================================================
-- ROL DE CADA CONCEPTO EN EL MOTOR (CPNMROLM)
-- =====================================================
-- Le dice al motor que concepto cumple cada papel del calculo. Antes de esta
-- columna el motor los localizaba por la terna (tipo de concepto, tipo de
-- calculo, base de calculo), que era discriminante en este catalogo pero deja
-- de serlo en cuanto se agrega un concepto propio: un "Bono navideno" definido
-- como INGRESO / FORMULA / SBU colisionaria con el decimo cuarto.
--
-- Codigos alternos del rubro 221 (RHH_ROL_CONCEPTO_MOTOR):
--    1 APORTE PERSONAL          9 HORA SUPLEMENTARIA
--    2 APORTE PATRONAL         10 HORA EXTRAORDINARIA
--    3 IECE                    11 RECARGO NOCTURNO
--    4 SECAP                   12 PRESTAMO QUIROGRAFARIO
--    5 FONDOS DE RESERVA       13 PRESTAMO HIPOTECARIO
--    6 DECIMO TERCERO          14 ANTICIPO DE SUELDO
--    7 DECIMO CUARTO           15 PRESTAMO INTERNO
--    8 IMPUESTO A LA RENTA     16 RETENCION JUDICIAL
--
-- Los conceptos sin rol (sueldo, bonos, comisiones, subsidios, multas,
-- provisiones y rubros de liquidacion) quedan en NULL a proposito: el motor
-- los trata genericamente por su tipo de calculo y su base.
-- =====================================================
UPDATE RHH.CPNM SET CPNMROLM = 1  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 20; -- Aporte personal IESS
UPDATE RHH.CPNM SET CPNMROLM = 2  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 40; -- Aporte patronal IESS
UPDATE RHH.CPNM SET CPNMROLM = 3  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 41; -- Aporte IECE
UPDATE RHH.CPNM SET CPNMROLM = 4  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 42; -- Aporte SECAP
UPDATE RHH.CPNM SET CPNMROLM = 5  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  7; -- Fondos de reserva
UPDATE RHH.CPNM SET CPNMROLM = 6  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  5; -- Decimo tercero mensualizado
UPDATE RHH.CPNM SET CPNMROLM = 7  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  6; -- Decimo cuarto mensualizado
UPDATE RHH.CPNM SET CPNMROLM = 8  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 21; -- Impuesto a la renta
UPDATE RHH.CPNM SET CPNMROLM = 9  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  2; -- Horas suplementarias 50%
UPDATE RHH.CPNM SET CPNMROLM = 10 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  3; -- Horas extraordinarias 100%
UPDATE RHH.CPNM SET CPNMROLM = 11 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  4; -- Recargo nocturno 25%
UPDATE RHH.CPNM SET CPNMROLM = 12 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 23; -- Prestamo quirografario IESS
UPDATE RHH.CPNM SET CPNMROLM = 13 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 24; -- Prestamo hipotecario IESS
UPDATE RHH.CPNM SET CPNMROLM = 14 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 25; -- Anticipo de sueldo
UPDATE RHH.CPNM SET CPNMROLM = 15 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 26; -- Prestamo interno
UPDATE RHH.CPNM SET CPNMROLM = 16 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 22; -- Retencion judicial
-- Conceptos de provision. Sin rol, el motor apuntaria la fila de PVNM al concepto
-- mensualizado en vez de al de provision, y ademas 54 y 55 comparten terna, asi que
-- no habria forma de distinguirlos.
UPDATE RHH.CPNM SET CPNMROLM = 17 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 50; -- Provision decimo tercero
UPDATE RHH.CPNM SET CPNMROLM = 18 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 51; -- Provision decimo cuarto
UPDATE RHH.CPNM SET CPNMROLM = 19 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 52; -- Provision vacaciones
UPDATE RHH.CPNM SET CPNMROLM = 20 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 53; -- Provision fondos de reserva
UPDATE RHH.CPNM SET CPNMROLM = 21 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 54; -- Provision jubilacion patronal
UPDATE RHH.CPNM SET CPNMROLM = 22 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 55; -- Provision desahucio

COMMIT;

-- Verificacion: deben quedar 22 conceptos con rol, uno por cada detalle del
-- rubro 221, y ninguno repetido.
-- SELECT COUNT(*) FROM RHH.CPNM WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL;  -- 22
-- SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM WHERE PJRQCDGO = :EMPRESA
--  AND CPNMROLM IS NOT NULL GROUP BY CPNMROLM HAVING COUNT(*) > 1;                   -- cero filas
-- =====================================================
-- VERIFICACION
-- =====================================================
-- SELECT CPNMTPCN, COUNT(*) FROM RHH.CPNM GROUP BY CPNMTPCN ORDER BY 1;
--   1 (INGRESO)          -> 24   (16 del rol + 8 de liquidacion)
--   2 (EGRESO)           -> 11
--   3 (APORTE PATRONAL)  ->  3
--   4 (PROVISION)        ->  6
--
-- Descuentos que NUNCA se recortan ante neto negativo:
-- SELECT CPNMALTR, CPNMNMBR FROM RHH.CPNM WHERE CPNMTPCN = 2 AND CPNMRCRT = 'N' ORDER BY CPNMORDN;
--   Debe devolver: aporte personal IESS, impuesto a la renta, retencion
--   judicial, y los dos prestamos del IESS.
--
-- NOTA SOBRE LAS BANDERAS DE EXENCION:
--   Los decimos y los fondos de reserva van con CPNMIMIE='N' y
--   CPNMIMIR='N' porque el Art. 9 de la LRTI los declara exentos y no
--   son materia gravada del IESS. Si se marcan en 'S' por error, el
--   sistema retendra impuesto a la renta de mas a todo el personal.
