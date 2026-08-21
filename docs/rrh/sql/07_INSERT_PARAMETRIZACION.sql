-- =====================================================
-- MODULO: RHH - PARAMETRIZACION NORMATIVA
-- DESCRIPCION: Carga inicial de parametros legales, tabla de impuesto a
--              la renta, topes de gastos personales, causales de
--              terminacion y configuracion de la empresa.
-- ORDEN DE EJECUCION: 7 de 9
-- FECHA: 2026-08-19
-- =====================================================
-- PARAMETRO :EMPRESA
--   Es el codigo de la empresa (SCP.PJRQ.PJRQCDGO). DBeaver lo pide en un
--   dialogo al ejecutar el script (Alt+X). Se escribe una sola vez y se
--   aplica a todas las sentencias.
--
--   Si el dialogo no aparece, activar en DBeaver:
--     Preferences > Editors > SQL Editor > SQL Processing > Parameters
--     > "Enable parameters in queries"   (marcado)
--     > "Named parameter prefix" = :     (por defecto)
--
--   Para averiguar el valor:
--     SELECT PJRQCDGO, PJRQNMBR FROM SCP.PJRQ WHERE PJRQNVLL = 1;
-- =====================================================


-- =====================================================
-- RHH.PRNM - PARAMETROS NORMATIVOS 2025 Y 2026
-- =====================================================
-- Valores verificados el 2026-08-19. Todos parametrizados: ninguno
-- debe replicarse como constante en el codigo Java.
-- =====================================================
INSERT INTO RHH.PRNM (
    PJRQCDGO, PRNMANOO, PRNMSBUU, PRNMCNBS,
    PRNMAPPR, PRNMAPPT, PRNMIECE, PRNMSCAP, PRNMFNRS,
    PRNMTPGP, PRNMCNCT,
    PRNMUTPR, PRNMUTDI, PRNMUTCG, PRNMUTSB,
    PRNMDIAS, PRNMDANO, PRNMHRMS, PRNMHRDI,
    PRNMRCSP, PRNMRCEX, PRNMRCNC, PRNMHRMX, PRNMHRSX,
    PRNMDIVC, PRNMANVC, PRNMMXVC, PRNMCDVC,
    PRNMDSPR, PRNMDIMN, PRNMDIMX, PRNMDIAN,
    PRNMESTD, PRNMUSRR
) VALUES (
    :EMPRESA, 2025, 470.00, 802.29,
    9.45, 11.15, 0.50, 0.50, 8.33,
    18.00, 100,
    15.00, 10.00, 5.00, 24,
    30, 360, 240, 8,
    50.00, 100.00, 25.00, 4, 12,
    15, 5, 30, 3,
    25.00, 3, 25, 3,
    1, 'INSTALACION'
);

INSERT INTO RHH.PRNM (
    PJRQCDGO, PRNMANOO, PRNMSBUU, PRNMCNBS,
    PRNMAPPR, PRNMAPPT, PRNMIECE, PRNMSCAP, PRNMFNRS,
    PRNMTPGP, PRNMCNCT,
    PRNMUTPR, PRNMUTDI, PRNMUTCG, PRNMUTSB,
    PRNMDIAS, PRNMDANO, PRNMHRMS, PRNMHRDI,
    PRNMRCSP, PRNMRCEX, PRNMRCNC, PRNMHRMX, PRNMHRSX,
    PRNMDIVC, PRNMANVC, PRNMMXVC, PRNMCDVC,
    PRNMDSPR, PRNMDIMN, PRNMDIMX, PRNMDIAN,
    PRNMESTD, PRNMUSRR
) VALUES (
    :EMPRESA, 2026, 482.00, 821.80,
    9.45, 11.15, 0.50, 0.50, 8.33,
    18.00, 100,
    15.00, 10.00, 5.00, 24,
    30, 360, 240, 8,
    50.00, 100.00, 25.00, 4, 12,
    15, 5, 30, 3,
    25.00, 3, 25, 3,
    1, 'INSTALACION'
);


-- =====================================================
-- RHH.TBIR - TABLA DEL IMPUESTO A LA RENTA
-- =====================================================
-- =====================================================
-- VERIFICADO el 2026-08-19 contra la Resolucion SRI NAC-DGERCGC25-00000043
-- (29 de diciembre de 2025), contrastada con dos fuentes independientes.
--
-- OJO CON DOS CAMBIOS RESPECTO DE ANIOS ANTERIORES:
--   1. La tabla 2026 tiene DIEZ tramos, no nueve.
--   2. La tarifa maxima es 37%, no 35%. El tramo del 35% ahora es el
--      penultimo y aplica entre 82.679 y 109.956.
--
-- La coherencia aritmetica de la tabla esta comprobada: el impuesto sobre
-- fraccion basica de cada tramo es el acumulado del anterior mas su
-- excedente por su porcentaje. Ejemplo del tramo 3:
--   167 + (20.188 - 15.549) x 10% = 167 + 463,90 = 630,90 -> 631
--
-- El motor NO tiene ninguna de estas cifras en codigo: las lee de aqui,
-- de modo que actualizarlas cada enero es un UPDATE, no un despliegue.
-- =====================================================

-- Tabla 2026 - VERIFICADA
INSERT INTO RHH.TBIR (PJRQCDGO, TBIRANOO, TBIRORDN, TBIRFRBS, TBIREXCS, TBIRIMFB, TBIRPRCN, TBIRESTD, TBIRUSRR)
SELECT :EMPRESA, 2026, d.ORDN, d.FRBS, d.EXCS, d.IMFB, d.PRCN, 1, 'INSTALACION'
FROM (
    SELECT  1 AS ORDN,      0.00 AS FRBS,  12208.00 AS EXCS,      0.00 AS IMFB,  0.00 AS PRCN FROM DUAL UNION ALL
    SELECT  2,          12208.00,           15549.00,              0.00,          5.00 FROM DUAL UNION ALL
    SELECT  3,          15549.00,           20188.00,            167.00,         10.00 FROM DUAL UNION ALL
    SELECT  4,          20188.00,           26700.00,            631.00,         12.00 FROM DUAL UNION ALL
    SELECT  5,          26700.00,           35136.00,           1412.00,         15.00 FROM DUAL UNION ALL
    SELECT  6,          35136.00,           46575.00,           2678.00,         20.00 FROM DUAL UNION ALL
    SELECT  7,          46575.00,           62005.00,           4965.00,         25.00 FROM DUAL UNION ALL
    SELECT  8,          62005.00,           82679.00,           8823.00,         30.00 FROM DUAL UNION ALL
    SELECT  9,          82679.00,          109956.00,          15025.00,         35.00 FROM DUAL UNION ALL
    SELECT 10,         109956.00,               NULL,          24572.00,         37.00 FROM DUAL
) d;

-- Tabla 2024 - VERIFICADA. Se carga como referencia historica y para
-- poder recalcular ejercicios anteriores si hiciera falta.
INSERT INTO RHH.TBIR (PJRQCDGO, TBIRANOO, TBIRORDN, TBIRFRBS, TBIREXCS, TBIRIMFB, TBIRPRCN, TBIRESTD, TBIRUSRR)
SELECT :EMPRESA, 2024, d.ORDN, d.FRBS, d.EXCS, d.IMFB, d.PRCN, 1, 'INSTALACION'
FROM (
    SELECT 1 AS ORDN,     0.00 AS FRBS, 11722.00 AS EXCS,     0.00 AS IMFB,  0.00 AS PRCN FROM DUAL UNION ALL
    SELECT 2,         11722.00,          14936.00,             0.00,          5.00 FROM DUAL UNION ALL
    SELECT 3,         14936.00,          19703.00,           160.70,         10.00 FROM DUAL UNION ALL
    SELECT 4,         19703.00,          26031.00,           637.40,         12.00 FROM DUAL UNION ALL
    SELECT 5,         26031.00,          34255.00,          1397.00,         15.00 FROM DUAL UNION ALL
    SELECT 6,         34255.00,          45675.00,          2630.60,         20.00 FROM DUAL UNION ALL
    SELECT 7,         45675.00,          60467.00,          4914.60,         25.00 FROM DUAL UNION ALL
    SELECT 8,         60467.00,          80293.00,          8612.60,         30.00 FROM DUAL UNION ALL
    SELECT 9,         80293.00,              NULL,         14560.40,         35.00 FROM DUAL
) d;


-- =====================================================
-- RHH.TPGP - TOPES DE GASTOS PERSONALES 2026
-- =====================================================
-- VERIFICADO el 2026-08-19 para los seis tramos, con la canasta familiar
-- basica de enero 2026 en USD 821,80:
--
--   Cargas | Canastas | Gasto deducible | Rebaja maxima (18%)
--      0   |     7    |    5.752,60     |   1.035,47
--      1   |     9    |    7.396,20     |   1.331,32
--      2   |    11    |    9.039,80     |   1.627,16
--      3   |    14    |   11.505,20     |   2.070,94
--      4   |    17    |   13.970,60     |   2.514,71
--     5+   |    20    |   16.436,00     |   2.958,48
--
-- Enfermedad catastrofica, rara u huerfana: 100 canastas -> 14.792,40 de
-- rebaja. Ese caso NO va en esta tabla: se resuelve con PRNM.PRNMCNCT y
-- la bandera MPLD.MPLDCTSF del empleado.
-- =====================================================
INSERT INTO RHH.TPGP (PJRQCDGO, TPGPANOO, TPGPNCRG, TPGPNCAN, TPGPESTD, TPGPUSRR)
SELECT :EMPRESA, 2026, d.NCRG, d.NCAN, 1, 'INSTALACION'
FROM (
    SELECT 0 AS NCRG,  7 AS NCAN FROM DUAL UNION ALL
    SELECT 1,          9 FROM DUAL UNION ALL
    SELECT 2,         11 FROM DUAL UNION ALL
    SELECT 3,         14 FROM DUAL UNION ALL
    SELECT 4,         17 FROM DUAL UNION ALL
    SELECT 5,         20 FROM DUAL
) d;


-- =====================================================
-- RHH.CSTR - CAUSALES DE TERMINACION
-- =====================================================
-- El codigo alterno coincide con el detalle del rubro 195.
-- Las banderas determinan que rubros entran en el finiquito.
-- =====================================================
INSERT INTO RHH.CSTR (
    PJRQCDGO, CSTRNMBR, CSTRALTR, CSTRARTC,
    CSTRDSHC, CSTRDSPD, CSTRVCPR, CSTRDCPR, CSTRJBPT, CSTRAVSL, CSTRACSU,
    CSTRESTD, CSTRUSRR
)
SELECT :EMPRESA, d.NMBR, d.ALTR, d.ARTC,
       d.DSHC, d.DSPD, d.VCPR, d.DCPR, d.JBPT, 'S', 'S', 1, 'INSTALACION'
FROM (
    SELECT 'Renuncia voluntaria'       AS NMBR,  1 AS ALTR, 'Art. 169 num. 2'  AS ARTC, 'N' AS DSHC, 'N' AS DSPD, 'S' AS VCPR, 'S' AS DCPR, 'N' AS JBPT FROM DUAL UNION ALL
    SELECT 'Desahucio',                 2, 'Art. 184',        'S', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Visto bueno',               3, 'Art. 172',        'N', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Despido intempestivo',      4, 'Art. 188',        'S', 'S', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Mutuo acuerdo',             5, 'Art. 169 num. 2', 'N', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Terminacion del plazo',     6, 'Art. 169 num. 3', 'N', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Jubilacion',                7, 'Art. 188',        'N', 'N', 'S', 'S', 'S' FROM DUAL UNION ALL
    SELECT 'Fallecimiento',             8, 'Art. 169 num. 7', 'N', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Liquidacion de la empresa', 9, 'Art. 193',        'S', 'N', 'S', 'S', 'N' FROM DUAL UNION ALL
    SELECT 'Caso fortuito',            10, 'Art. 169 num. 6', 'N', 'N', 'S', 'S', 'N' FROM DUAL
) d;


-- =====================================================
-- RHH.CFNM - CONFIGURACION DE LA EMPRESA
-- =====================================================
-- ASOPREP-FCPC NO reparte utilidades (CFNMAPUT = 'N'), pero toda la
-- funcionalidad existe: basta poner 'S' para activarla en otra empresa.
-- Los codigos alternos de plantillas y tipos de asiento se completan en
-- el script 09, cuando existan en CNT.PLNS y CNT.PLNT.
-- =====================================================
INSERT INTO RHH.CFNM (
    PJRQCDGO,
    CFNMDCCS, CFNMAPUT, CFNMAPJP, CFNMAPDS, CFNMRDND, CFNMTLCD,
    CFNMESTD, CFNMUSRR
) VALUES (
    :EMPRESA,
    'N', 'N', 'S', 'S', 'S', 0.05,
    1, 'INSTALACION'
);

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- SELECT PRNMANOO, PRNMSBUU, PRNMAPPR, PRNMAPPT, PRNMFNRS FROM RHH.PRNM ORDER BY PRNMANOO;
--
-- SELECT TBIRANOO, COUNT(*) FROM RHH.TBIR GROUP BY TBIRANOO ORDER BY 1;
--   2024 -> 9 tramos (tarifa maxima 35%)
--   2026 -> 10 tramos (tarifa maxima 37%)
--
-- Coherencia aritmetica de la tabla 2026: el impuesto sobre fraccion
-- basica de cada tramo debe igualar el del tramo anterior mas su
-- excedente por su porcentaje.
-- SELECT t.TBIRORDN, t.TBIRIMFB AS DECLARADO,
--        LAG(t.TBIRIMFB) OVER (ORDER BY t.TBIRORDN)
--          + (t.TBIRFRBS - LAG(t.TBIRFRBS) OVER (ORDER BY t.TBIRORDN))
--            * LAG(t.TBIRPRCN) OVER (ORDER BY t.TBIRORDN) / 100 AS CALCULADO
--   FROM RHH.TBIR t WHERE t.TBIRANOO = 2026 ORDER BY t.TBIRORDN;
--   La diferencia entre DECLARADO y CALCULADO no debe superar 1 dolar.
--
-- SELECT TPGPNCRG, TPGPNCAN,
--        TPGPNCAN * 821.80            AS GASTO_DEDUCIBLE,
--        TPGPNCAN * 821.80 * 0.18     AS REBAJA_MAXIMA
--   FROM RHH.TPGP WHERE TPGPANOO = 2026 ORDER BY TPGPNCRG;
--   Debe dar 1035.47 / 1331.32 / 1627.16 / 2070.94 / 2514.71 / 2958.48
--
-- SELECT CSTRALTR, CSTRNMBR, CSTRDSHC, CSTRDSPD FROM RHH.CSTR ORDER BY CSTRALTR;
