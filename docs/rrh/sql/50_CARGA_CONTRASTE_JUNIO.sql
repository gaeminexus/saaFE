-- =====================================================
-- MODULO: RHH - VALORES ESPERADOS DE JUNIO 2026
-- ORDEN DE EJECUCION: 50
-- FECHA: 2026-08-21
-- =====================================================
-- REGLA 6: hoja ROL JUNIO (layout C) del libro ROL JUNIO 2026.xlsb (REF-02 §7)
-- y planilla del IESS 2026-06 (REF-03 §1.4 y §3.2).
--
-- JUNIO ES EL MES DEL FONDO DE RESERVA. Cinco personas cumplen su primer ano
-- y empiezan a cobrarlo: cuatro el 25-06 y Barcenas el 26-06. Verificado
-- contra las fechas de ingreso: son exactamente los cinco que cumplen ano ese
-- mes, y nadie mas hasta que Rodriguez Valencia lo cumpla el 16-07.
--
--   Barcenas   9,72   = 700  x 5/30 / 12      (5 dias: 26 al 30)
--   Munoz      9,17   = 550  x 6/30 / 12      (6 dias: 25 al 30)
--   Nieto     15,00   = 900  x 6/30 / 12
--   Pardo     11,67   = 700  x 6/30 / 12
--   Viteri    36,67   = 2200 x 6/30 / 12
--                     -------
--                      82,23
--
-- El cliente paga UN DOCEAVO DEL DEVENGADO DE LOS DIAS DESDE EL ANIVERSARIO.
--
-- ⚠ LA DIFERENCIA GRANDE DE JUNIO ES NUESTRA, Y ES UN DEFECTO NUEVO
--
-- La rama MENSUALIZADO del paso 8 calcula el MES COMPLETO, no el prorrateo
-- desde el aniversario. El punto 10 arreglo CUANDO empieza el fondo de
-- reserva; no arreglo CUANTO el primer mes. Asi que el motor va a dar:
--   Barcenas 58,33 · Munoz 45,83 · Nieto 75,00 · Pardo 58,33 = 237,49
-- contra los 45,56 que el cliente paga a esos cuatro.
--
-- Y Viteri es aparte: esta en modalidad 2 (ACUMULADO_EN_EL_IESS), asi que
-- nuestro motor le genera PROVISION y no ingreso, mientras el rol del cliente
-- le paga 36,67 como ingreso. **El cliente ademas la declara en la planilla
-- de fondos de reserva de junio con base 366,67 (5 dias) y 30,54.** Le paga
-- por 6 dias en el rol y la declara por 5 en la planilla, con dos formulas
-- distintas. Una de las dos esta mal y es del cliente: PREGUNTA PARA STEVEN.
--
-- DIFERENCIA ESPERADA DE JUNIO: alrededor de **+155,36**, casi toda del
-- fondo de reserva (+155,26) mas los 0,10 de OTROS de Calderon. **NO se
-- ajusta nada**: se atribuye, se anota como punto de la lista de fin de
-- calibracion, y se cierra junio con la diferencia documentada. Es el mismo
-- criterio que abril con sus 175,00.
--
-- LO BUENO DE JUNIO: **es el primer mes que cuadra consigo mismo.**
--   Manosalvas imprime 2.206,84, que es lo que nuestro motor calcula
--   (2.000 + 166,67 + 40,17). Su +0,01 desaparece.
--   Munoz: 559,17 - 51,98 = 507,19, y 507,19 es lo que el rol imprime. Su
--   -0,01 tambien desaparece. Los dos centavos que llevaban cinco meses
--   saliendo se acaban en junio.
--
-- OTROS CAMBIOS
--   - Cinco anticipos, no tres: Caiza 100,00 (nueva) · Calderon 619,81 ·
--     Moscoso 550,00 · Pardo 400,00 · Pazmino J. 500,00 = 2.169,81.
--   - Quirografarios 171,15 (Calderon baja a 13,94). Cuadra con el IESS.
--   - Hipotecarios 1.015,14 con Manosalvas en 379,84 y Pazmino J. en 145,30.
--   - Calderon vuelve a liquido CERO y lleva 0,10 en OTROS sin clasificar.
--
-- TOTALES DEL CLIENTE, con Munoz en 51,98:
--   INGRESOS 21.116,57 · DESCUENTOS 5.299,13 · LIQUIDO 15.817,44
--   (21.116,57 - 5.299,13 = 15.817,44 EXACTO: junio cuadra consigo mismo)
--   TOTAL_IESS de la planilla: 4.235,36 sobre 20.560,00, 20 afiliados.
-- =====================================================

DELETE FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 6;

-- --- Concepto 1: sueldo (identico a abril y mayo) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, 1, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED,  700.00 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',      700.00 FROM DUAL UNION ALL   -- Bravo Caiza: cedula CORRECTA
    SELECT '1753528379',      482.00 FROM DUAL UNION ALL
    SELECT '1719624809',      700.00 FROM DUAL UNION ALL
    SELECT '1311981953',     2000.00 FROM DUAL UNION ALL
    SELECT '1715156574',      700.00 FROM DUAL UNION ALL
    SELECT '1750302984',      700.00 FROM DUAL UNION ALL
    SELECT '1716120769',     2000.00 FROM DUAL UNION ALL
    SELECT '1004350904',      482.00 FROM DUAL UNION ALL
    SELECT '0103179537',     1546.00 FROM DUAL UNION ALL
    SELECT '1717649873',      550.00 FROM DUAL UNION ALL
    SELECT '1723962849',      900.00 FROM DUAL UNION ALL
    SELECT '1726657164',      700.00 FROM DUAL UNION ALL
    SELECT '0909917759',     1500.00 FROM DUAL UNION ALL
    SELECT '2100192463',      500.00 FROM DUAL UNION ALL
    SELECT '1725996498',     1500.00 FROM DUAL UNION ALL
    SELECT '0801999855',      700.00 FROM DUAL UNION ALL
    SELECT '1712362720',     1500.00 FROM DUAL UNION ALL
    SELECT '1712232659',     2200.00 FROM DUAL UNION ALL
    SELECT '1307779064',      500.00 FROM DUAL
) d;

-- --- Conceptos 5 y 6: decimos mensualizados · 7: FONDOS DE RESERVA (nuevo) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1715156574' CED, 5 ALT,  58.33 VLOR FROM DUAL UNION ALL
    SELECT '1716120769',     5,      166.67 FROM DUAL UNION ALL
    SELECT '0103179537',     5,      128.83 FROM DUAL UNION ALL
    SELECT '1715156574',     6,       40.17 FROM DUAL UNION ALL
    SELECT '1716120769',     6,       40.17 FROM DUAL UNION ALL
    SELECT '0103179537',     6,       40.17 FROM DUAL UNION ALL
    SELECT '1717991341',     7,        9.72 FROM DUAL UNION ALL   -- Barcenas, 5 dias
    SELECT '1717649873',     7,        9.17 FROM DUAL UNION ALL   -- Munoz, 6 dias
    SELECT '1723962849',     7,       15.00 FROM DUAL UNION ALL   -- Nieto, 6 dias
    SELECT '1726657164',     7,       11.67 FROM DUAL UNION ALL   -- Pardo, 6 dias
    SELECT '1712232659',     7,       36.67 FROM DUAL            -- Viteri, 6 dias, modalidad 2
) d;

-- --- Concepto 20: aporte personal --- (Munoz con 51,98)
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, 20, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED,  66.15 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',       66.15 FROM DUAL UNION ALL
    SELECT '1753528379',       45.55 FROM DUAL UNION ALL
    SELECT '1719624809',       66.15 FROM DUAL UNION ALL
    SELECT '1311981953',      189.00 FROM DUAL UNION ALL
    SELECT '1715156574',       66.15 FROM DUAL UNION ALL
    SELECT '1750302984',       66.15 FROM DUAL UNION ALL
    SELECT '1716120769',      189.00 FROM DUAL UNION ALL
    SELECT '1004350904',       45.55 FROM DUAL UNION ALL
    SELECT '0103179537',      146.10 FROM DUAL UNION ALL
    SELECT '1717649873',       51.98 FROM DUAL UNION ALL   -- NO 51,97
    SELECT '1723962849',       85.05 FROM DUAL UNION ALL
    SELECT '1726657164',       66.15 FROM DUAL UNION ALL
    SELECT '0909917759',      141.75 FROM DUAL UNION ALL
    SELECT '2100192463',       47.25 FROM DUAL UNION ALL
    SELECT '1725996498',      141.75 FROM DUAL UNION ALL
    SELECT '0801999855',       66.15 FROM DUAL UNION ALL
    SELECT '1712362720',      141.75 FROM DUAL UNION ALL
    SELECT '1712232659',      207.90 FROM DUAL UNION ALL
    SELECT '1307779064',       47.25 FROM DUAL
) d;

-- --- Conceptos 23, 24 y 25 ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1719624809' CED, 23 ALT,  13.94 VLOR FROM DUAL UNION ALL  -- Calderon (era 14,04)
    SELECT '1716120769',     23,      157.21 FROM DUAL UNION ALL
    SELECT '1715156574',     24,      490.00 FROM DUAL UNION ALL
    SELECT '1716120769',     24,      379.84 FROM DUAL UNION ALL      -- era 379,85
    SELECT '0909917759',     24,      145.30 FROM DUAL UNION ALL      -- era 145,29
    SELECT '1753528379',     25,      100.00 FROM DUAL UNION ALL      -- Caiza Remache, NUEVA
    SELECT '1719624809',     25,      619.81 FROM DUAL UNION ALL
    SELECT '0103179537',     25,      550.00 FROM DUAL UNION ALL
    SELECT '1726657164',     25,      400.00 FROM DUAL UNION ALL
    SELECT '0909917759',     25,      500.00 FROM DUAL
) d;

-- --- Totales de cabecera ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLTOTL, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, d.TOTL, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED, 'INGRESOS'   TOTL,  709.72 VLOR FROM DUAL UNION ALL
    SELECT '1717991341', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '1717991341', 'LIQUIDO',    643.57 FROM DUAL UNION ALL
    SELECT '2150051205', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '2150051205', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '2150051205', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1753528379', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1753528379', 'DESCUENTOS', 145.55 FROM DUAL UNION ALL
    SELECT '1753528379', 'LIQUIDO',    336.45 FROM DUAL UNION ALL
    SELECT '1719624809', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '1719624809', 'DESCUENTOS', 700.00 FROM DUAL UNION ALL
    SELECT '1719624809', 'LIQUIDO',      0.00 FROM DUAL UNION ALL
    SELECT '1311981953', 'INGRESOS',  2000.00 FROM DUAL UNION ALL
    SELECT '1311981953', 'DESCUENTOS', 189.00 FROM DUAL UNION ALL
    SELECT '1311981953', 'LIQUIDO',   1811.00 FROM DUAL UNION ALL
    SELECT '1715156574', 'INGRESOS',   798.50 FROM DUAL UNION ALL
    SELECT '1715156574', 'DESCUENTOS', 556.15 FROM DUAL UNION ALL
    SELECT '1715156574', 'LIQUIDO',    242.35 FROM DUAL UNION ALL
    SELECT '1750302984', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '1750302984', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '1750302984', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1716120769', 'INGRESOS',  2206.84 FROM DUAL UNION ALL   -- cuadra con el motor
    SELECT '1716120769', 'DESCUENTOS', 726.05 FROM DUAL UNION ALL
    SELECT '1716120769', 'LIQUIDO',   1480.79 FROM DUAL UNION ALL
    SELECT '1004350904', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1004350904', 'DESCUENTOS',  45.55 FROM DUAL UNION ALL
    SELECT '1004350904', 'LIQUIDO',    436.45 FROM DUAL UNION ALL
    SELECT '0103179537', 'INGRESOS',  1715.00 FROM DUAL UNION ALL
    SELECT '0103179537', 'DESCUENTOS', 696.10 FROM DUAL UNION ALL
    SELECT '0103179537', 'LIQUIDO',   1018.90 FROM DUAL UNION ALL
    SELECT '1717649873', 'INGRESOS',   559.17 FROM DUAL UNION ALL
    SELECT '1717649873', 'DESCUENTOS',  51.98 FROM DUAL UNION ALL
    SELECT '1717649873', 'LIQUIDO',    507.19 FROM DUAL UNION ALL
    SELECT '1723962849', 'INGRESOS',   915.00 FROM DUAL UNION ALL
    SELECT '1723962849', 'DESCUENTOS',  85.05 FROM DUAL UNION ALL
    SELECT '1723962849', 'LIQUIDO',    829.95 FROM DUAL UNION ALL
    SELECT '1726657164', 'INGRESOS',   711.67 FROM DUAL UNION ALL
    SELECT '1726657164', 'DESCUENTOS', 466.15 FROM DUAL UNION ALL
    SELECT '1726657164', 'LIQUIDO',    245.52 FROM DUAL UNION ALL
    SELECT '0909917759', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '0909917759', 'DESCUENTOS', 787.05 FROM DUAL UNION ALL
    SELECT '0909917759', 'LIQUIDO',    712.95 FROM DUAL UNION ALL
    SELECT '2100192463', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '2100192463', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '2100192463', 'LIQUIDO',    452.75 FROM DUAL UNION ALL
    SELECT '1725996498', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1725996498', 'DESCUENTOS', 141.75 FROM DUAL UNION ALL
    SELECT '1725996498', 'LIQUIDO',   1358.25 FROM DUAL UNION ALL
    SELECT '0801999855', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '0801999855', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '0801999855', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1712362720', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1712362720', 'DESCUENTOS', 141.75 FROM DUAL UNION ALL
    SELECT '1712362720', 'LIQUIDO',   1358.25 FROM DUAL UNION ALL
    SELECT '1712232659', 'INGRESOS',  2236.67 FROM DUAL UNION ALL
    SELECT '1712232659', 'DESCUENTOS', 207.90 FROM DUAL UNION ALL
    SELECT '1712232659', 'LIQUIDO',   2028.77 FROM DUAL UNION ALL
    SELECT '1307779064', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '1307779064', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '1307779064', 'LIQUIDO',    452.75 FROM DUAL
) d;

-- --- Planilla del IESS 2026-06: 20 afiliados, identica a abril y mayo ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLTOTL, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 6, d.CED, 'TOTAL_IESS', d.VLOR, 'PLANILLA', 'CARGA' FROM (
    SELECT '1717991341' CED, 144.20 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',     144.20 FROM DUAL UNION ALL
    SELECT '1753528379',      99.29 FROM DUAL UNION ALL
    SELECT '1719624809',     144.20 FROM DUAL UNION ALL
    SELECT '1311981953',     412.00 FROM DUAL UNION ALL
    SELECT '1715156574',     144.20 FROM DUAL UNION ALL
    SELECT '1750302984',     144.20 FROM DUAL UNION ALL
    SELECT '1716120769',     412.00 FROM DUAL UNION ALL
    SELECT '1004350904',      99.29 FROM DUAL UNION ALL
    SELECT '0103179537',     318.48 FROM DUAL UNION ALL
    SELECT '1717649873',     113.30 FROM DUAL UNION ALL
    SELECT '1723962849',     185.40 FROM DUAL UNION ALL
    SELECT '1726657164',     144.20 FROM DUAL UNION ALL
    SELECT '0909917759',     309.00 FROM DUAL UNION ALL
    SELECT '2100192463',     103.00 FROM DUAL UNION ALL
    SELECT '1725996498',     309.00 FROM DUAL UNION ALL
    SELECT '0801999855',     144.20 FROM DUAL UNION ALL
    SELECT '1712362720',     309.00 FROM DUAL UNION ALL
    SELECT '1712232659',     453.20 FROM DUAL UNION ALL
    SELECT '1307779064',     103.00 FROM DUAL
) d;

COMMIT;


-- =====================================================
-- COMPROBACION DE LA CARGA
-- =====================================================
SELECT CTRLFNTE, COUNT(*) AS FILAS, COUNT(DISTINCT CTRLIDNT) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 6
 GROUP BY CTRLFNTE ORDER BY CTRLFNTE;
-- Esperado: PLANILLA 20 / 20 · ROL 121 / 20
--   (121 = 61 conceptos + 60 totales; conceptos: 20 sueldos, 3+3 decimos,
--    5 fondos de reserva, 20 aportes, 2 quirografarios, 3 hipotecarios,
--    5 anticipos)

SELECT CTRLTOTL, ROUND(SUM(CTRLVLOR), 2) AS TOTAL
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 6 AND CTRLFNTE = 'ROL'
   AND CTRLTOTL IS NOT NULL GROUP BY CTRLTOTL ORDER BY CTRLTOTL;
-- Esperado: DESCUENTOS 5.299,13 · INGRESOS 21.116,57 · LIQUIDO 15.817,44
--   **21.116,57 - 5.299,13 = 15.817,44 EXACTO.** Primer mes que cuadra
--   consigo mismo: los centavos de Manosalvas y Munoz se acaban en junio.

SELECT CTRLALTR, ROUND(SUM(CTRLVLOR), 2) AS TOTAL, COUNT(*) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 6 AND CTRLALTR IS NOT NULL
 GROUP BY CTRLALTR ORDER BY CTRLALTR;
-- Esperado:  1 -> 20.560,00 / 20     20 -> 1.942,93 / 20
--            5 ->    353,83 /  3     23 ->   171,15 /  2  <- cuadra con el IESS
--            6 ->    120,51 /  3     24 -> 1.015,14 /  3
--            7 ->     82,23 /  5     25 -> 2.169,81 /  5
--   El concepto 7 es nuevo: los cinco que cumplen el ano en junio.

SELECT ROUND(SUM(CTRLVLOR), 2) AS TOTAL_IESS FROM RHH.CTRL
 WHERE CTRLANOO = 2026 AND CTRLMESS = 6 AND CTRLTOTL = 'TOTAL_IESS';
-- Esperado: 4.235,36. Lo nuestro dara 4.235,37 (el centavo de Munoz en el
-- aporte patronal, que no desaparece aunque el del liquido si).


-- =====================================================
-- LO QUE FALTA PARA CONTRASTAR
-- =====================================================
-- 1. Mike: CTRL_PARAM a mes 6.
-- 2. Frontend: crear el periodo y registrar DIEZ novedades antes de calcular:
--      concepto 25 anticipos ...... Caiza 100,00 · Calderon 619,81 ·
--                                   Moscoso 550,00 · Pardo 400,00 ·
--                                   Pazmino J. 500,00              = 2.169,81
--      concepto 23 quirografarios . Calderon 13,94 · Manosalvas 157,21 = 171,15
--      concepto 24 hipotecarios ... Cossio 490,00 · Manosalvas 379,84 ·
--                                   Pazmino J. 145,30              = 1.015,14
--    **Los fondos de reserva NO se registran como novedad: los genera el
--    motor solo** (paso 8). Ahi esta justamente la diferencia del mes.
-- 3. Backend: esperado ANTES de correr, con el 1B.
--
-- LO QUE JUNIO DEBERIA DEMOSTRAR
--   - Bloque 4: 20 contra 20, sin discrepancia.
--   - Bloque 3: **vacio o casi**. Munoz deja de salir con +0,01 en el liquido
--     pero su TOTAL_IESS sigue en 113,31 contra 113,30, asi que **una fila**.
--   - Bloque 2: **Manosalvas y Munoz desaparecen** --junio cuadra consigo
--     mismo-- y aparece **el fondo de reserva**: los cuatro de modalidad 1
--     con nuestro mes completo contra su prorrateo, y Viteri con ingreso en
--     el rol y provision en el nuestro. Mas Calderon por los 0,10.
--   - **La diferencia total esperada es de unos +155,36, y es NUESTRA.**
--     Se atribuye y se documenta; no se ajusta. Va a la lista como punto
--     nuevo: el fondo de reserva del primer mes no se prorratea desde el
--     aniversario.
