-- =====================================================
-- MODULO: RHH - VALORES ESPERADOS DE JULIO 2026
-- ORDEN DE EJECUCION: 51
-- FECHA: 2026-08-21
-- =====================================================
-- SE CARGA LA HOJA **PAGADO**, NO LA CORREGIDA. Es lo que se transfirio a los
-- trabajadores, y el regimen historico guarda lo que ocurrio. La hoja
-- CORREGIDO es lo que debio ser; sus 13,17 los ajusta Steven despues de julio.
--
-- ⚠ HALLAZGO: LOS TRES A LOS QUE SE DESCONTO DE MENOS NO SON LOS QUE DICE EL
--   INFORME. Las cifras estan bien, los nombres no.
--
--   | Cifra | REF-02 §6 y Steven   | QUIEN ES DE VERDAD        |
--   |-------|----------------------|---------------------------|
--   | 1,52  | Caiza Remache        | Caiza Remache        ✔    |
--   | 2,83  | Calderon Parraga     | **NIETO CONDE** (2,84)    |
--   | 8,82  | Cevallos Montenegro  | **PARDO CALLE**           |
--
--   Se ve en el propio rol: 85,05 es el 9,45 % de **900** --el sueldo de
--   Nieto; Calderon gana 700-- y 66,15 lo es de **700** --Pardo; Cevallos
--   Montenegro gana 2.000--. Calderon y Cevallos Montenegro tienen su aporte
--   CORRECTO en julio: 66,15 y 189,00.
--
--   Y LA CAUSA, que es lo que importa: los tres tomaron vacaciones y el
--   cliente calculo el aporte **solo sobre los dias trabajados**, dejando
--   fuera la parte de vacaciones. Encaja al centavo en los tres:
--     Caiza  29 dias · 465,93 x 9,45 % = 44,03   (debio ser 482,00 -> 45,55)
--     Nieto  29 dias · 870,00 x 9,45 % = 82,21   (debio ser 900,00 -> 85,05)
--     Pardo  26 dias · 606,67 x 9,45 % = 57,33   (debio ser 700,00 -> 66,15)
--
--   No es un error de tecleo: es una formula que ignora las vacaciones en la
--   base imponible, y por eso afecto exactamente a los tres que las tomaron.
--   **DECIRSELO A STEVEN ANTES DE QUE AJUSTE**: si ajusta a Calderon y a
--   Cevallos Montenegro, cobra de mas a dos personas y deja a Nieto y a Pardo
--   debiendo.
--
-- JULIO NO TIENE PLANILLA DEL IESS. REF-06 §11: falta la del periodo 2026-07.
-- Asi que **no se cargan filas PLANILLA** y el bloque 3 saldra vacio por
-- ausencia de datos, no por cuadre. Que nadie lo lea como verde.
--
-- LO QUE JULIO TRAE DE NUEVO
--   1. **Vacaciones pagadas** (concepto 12): Caiza 16,07 · Nieto 30,00 ·
--      Pardo 93,33 = 139,40. Los tres con dias < 30: 29, 29 y 26.
--   2. **Fondo de reserva de mes completo** para seis: Barcenas 58,31 ·
--      Munoz 45,81 · Nieto 74,97 · Pardo 58,31 · Rodriguez Valencia 27,21
--      (cumple el ano el 16-07, prorrateado) · Viteri 183,26 = 447,87.
--   3. **A Viteri se le paga el fondo de reserva Y se le descuenta**
--      (183,26 en las dos columnas): esta en modalidad ACUMULADO, asi que el
--      rol se lo abona y se lo retiene para remitirlo al IESS. Eso explica la
--      contradiccion de junio, cuando parecia que cobraba y ademas se le
--      declaraba: son las dos patas del mismo movimiento.
--   4. **D:OTROS de 44,60**: Barcenas 1,95 · Munoz 1,53 · Nieto 2,50 ·
--      Pardo 1,95 · Viteri 36,67. Los 36,67 de Viteri son el fondo de reserva
--      de junio, recuperado. Los otros cuatro no se sabe que son.
--      **PREGUNTA PARA STEVEN.**
--   5. Robayo estrena quirografario: NUT 21118624, 84,70.
--
-- ⚠ EL ESPERADO DE JULIO NO SE PUEDE FIJAR AL CENTAVO DE ANTEMANO, y hay que
--   decirlo en vez de fingir que si. El rol trae al menos tres
--   inconsistencias propias --el aporte sin vacaciones, el centavo de Munoz
--   en I:TOTAL (550 + 45,81 = 595,81 y imprime 595,82) y los 44,60 de OTROS
--   sin clasificar-- y nuestro motor tiene ademas el defecto del fondo de
--   reserva del primer mes. **Julio se contrasta, se atribuye diferencia por
--   diferencia, y se cierra con lo atribuido documentado.** Es el mes que
--   menos se parece a los otros seis.
--
-- TOTALES DEL CLIENTE, hoja PAGADO, con Munoz en 51,98:
--   INGRESOS 21.482,32 · DESCUENTOS 5.198,61 · LIQUIDO 16.283,70
-- =====================================================

DELETE FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 7;

-- --- Concepto 1: sueldo por dias trabajados (I:RMU) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 7, d.CED, 1, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED,  700.00 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',      700.00 FROM DUAL UNION ALL
    SELECT '1753528379',      465.93 FROM DUAL UNION ALL   -- 29 dias
    SELECT '1719624809',      700.00 FROM DUAL UNION ALL
    SELECT '1311981953',     2000.00 FROM DUAL UNION ALL
    SELECT '1715156574',      700.00 FROM DUAL UNION ALL
    SELECT '1750302984',      700.00 FROM DUAL UNION ALL
    SELECT '1716120769',     2000.00 FROM DUAL UNION ALL
    SELECT '1004350904',      482.00 FROM DUAL UNION ALL
    SELECT '0103179537',     1546.00 FROM DUAL UNION ALL
    SELECT '1717649873',      550.00 FROM DUAL UNION ALL
    SELECT '1723962849',      870.00 FROM DUAL UNION ALL   -- 29 dias
    SELECT '1726657164',      606.67 FROM DUAL UNION ALL   -- 26 dias
    SELECT '0909917759',     1500.00 FROM DUAL UNION ALL
    SELECT '2100192463',      500.00 FROM DUAL UNION ALL
    SELECT '1725996498',     1500.00 FROM DUAL UNION ALL
    SELECT '0801999855',      700.00 FROM DUAL UNION ALL
    SELECT '1712362720',     1500.00 FROM DUAL UNION ALL
    SELECT '1712232659',     2200.00 FROM DUAL UNION ALL
    SELECT '1307779064',      500.00 FROM DUAL
) d;

-- --- Conceptos 12 (vacaciones pagadas), 5 y 6 (decimos), 7 (fondos) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 7, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1753528379' CED, 12 ALT,  16.07 VLOR FROM DUAL UNION ALL  -- Caiza,  1 dia
    SELECT '1723962849',     12,       30.00 FROM DUAL UNION ALL      -- Nieto,  1 dia
    SELECT '1726657164',     12,       93.33 FROM DUAL UNION ALL      -- Pardo,  4 dias
    SELECT '1715156574',      5,       58.33 FROM DUAL UNION ALL
    SELECT '1716120769',      5,      166.67 FROM DUAL UNION ALL
    SELECT '0103179537',      5,      128.83 FROM DUAL UNION ALL
    SELECT '1715156574',      6,       40.17 FROM DUAL UNION ALL
    SELECT '1716120769',      6,       40.17 FROM DUAL UNION ALL
    SELECT '0103179537',      6,       40.17 FROM DUAL UNION ALL
    SELECT '1717991341',      7,       58.31 FROM DUAL UNION ALL      -- mes completo ya
    SELECT '1717649873',      7,       45.81 FROM DUAL UNION ALL
    SELECT '1723962849',      7,       74.97 FROM DUAL UNION ALL
    SELECT '1726657164',      7,       58.31 FROM DUAL UNION ALL
    SELECT '0801999855',      7,       27.21 FROM DUAL UNION ALL      -- cumple ano el 16-07
    SELECT '1712232659',      7,      183.26 FROM DUAL               -- y se le descuenta igual
) d;

-- --- Concepto 20: aporte personal, TAL COMO SE DESCONTO (hoja PAGADO) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 7, d.CED, 20, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED,  66.15 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',       66.15 FROM DUAL UNION ALL
    SELECT '1753528379',       44.03 FROM DUAL UNION ALL   -- de menos: debio ser 45,55
    SELECT '1719624809',       66.15 FROM DUAL UNION ALL   -- CORRECTO
    SELECT '1311981953',      189.00 FROM DUAL UNION ALL   -- CORRECTO
    SELECT '1715156574',       66.15 FROM DUAL UNION ALL
    SELECT '1750302984',       66.15 FROM DUAL UNION ALL
    SELECT '1716120769',      189.00 FROM DUAL UNION ALL
    SELECT '1004350904',       45.55 FROM DUAL UNION ALL
    SELECT '0103179537',      146.10 FROM DUAL UNION ALL
    SELECT '1717649873',       51.98 FROM DUAL UNION ALL   -- NO 51,97
    SELECT '1723962849',       82.21 FROM DUAL UNION ALL   -- de menos: debio ser 85,05
    SELECT '1726657164',       57.33 FROM DUAL UNION ALL   -- de menos: debio ser 66,15
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
SELECT 2026, 7, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1719624809' CED, 23 ALT,  13.85 VLOR FROM DUAL UNION ALL
    SELECT '1716120769',     23,      157.21 FROM DUAL UNION ALL
    SELECT '1725996498',     23,       84.70 FROM DUAL UNION ALL      -- Robayo, NUT nuevo
    SELECT '1715156574',     24,      490.00 FROM DUAL UNION ALL
    SELECT '1716120769',     24,      379.85 FROM DUAL UNION ALL
    SELECT '0909917759',     24,      145.29 FROM DUAL UNION ALL
    SELECT '1753528379',     25,      150.00 FROM DUAL UNION ALL
    SELECT '1719624809',     25,      620.10 FROM DUAL UNION ALL
    SELECT '0103179537',     25,      850.00 FROM DUAL UNION ALL
    SELECT '1717649873',     25,      150.00 FROM DUAL
) d;
-- Los 183,26 de descuento de fondo de reserva de Viteri y los 44,60 de OTROS
-- NO se cargan como concepto --no hay alterno para ninguno y clasificarlos a
-- ojo seria inventar-- pero SI entran en sus totales de DESCUENTOS.

-- --- Totales de cabecera, hoja PAGADO ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLTOTL, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 7, d.CED, d.TOTL, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED, 'INGRESOS'   TOTL,  758.31 VLOR FROM DUAL UNION ALL
    SELECT '1717991341', 'DESCUENTOS',  68.10 FROM DUAL UNION ALL
    SELECT '1717991341', 'LIQUIDO',    690.21 FROM DUAL UNION ALL
    SELECT '2150051205', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '2150051205', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '2150051205', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1753528379', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1753528379', 'DESCUENTOS', 194.03 FROM DUAL UNION ALL
    SELECT '1753528379', 'LIQUIDO',    287.97 FROM DUAL UNION ALL
    SELECT '1719624809', 'INGRESOS',   700.10 FROM DUAL UNION ALL
    SELECT '1719624809', 'DESCUENTOS', 700.10 FROM DUAL UNION ALL
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
    SELECT '1716120769', 'INGRESOS',  2206.84 FROM DUAL UNION ALL
    SELECT '1716120769', 'DESCUENTOS', 726.06 FROM DUAL UNION ALL
    SELECT '1716120769', 'LIQUIDO',   1480.78 FROM DUAL UNION ALL
    SELECT '1004350904', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1004350904', 'DESCUENTOS',  45.55 FROM DUAL UNION ALL
    SELECT '1004350904', 'LIQUIDO',    436.45 FROM DUAL UNION ALL
    SELECT '0103179537', 'INGRESOS',  1715.00 FROM DUAL UNION ALL
    SELECT '0103179537', 'DESCUENTOS', 996.10 FROM DUAL UNION ALL
    SELECT '0103179537', 'LIQUIDO',    718.90 FROM DUAL UNION ALL
    SELECT '1717649873', 'INGRESOS',   595.82 FROM DUAL UNION ALL
    SELECT '1717649873', 'DESCUENTOS', 203.51 FROM DUAL UNION ALL
    SELECT '1717649873', 'LIQUIDO',    392.31 FROM DUAL UNION ALL
    SELECT '1723962849', 'INGRESOS',   974.97 FROM DUAL UNION ALL
    SELECT '1723962849', 'DESCUENTOS',  84.71 FROM DUAL UNION ALL
    SELECT '1723962849', 'LIQUIDO',    890.25 FROM DUAL UNION ALL
    SELECT '1726657164', 'INGRESOS',   758.31 FROM DUAL UNION ALL
    SELECT '1726657164', 'DESCUENTOS',  59.28 FROM DUAL UNION ALL
    SELECT '1726657164', 'LIQUIDO',    699.03 FROM DUAL UNION ALL
    SELECT '0909917759', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '0909917759', 'DESCUENTOS', 287.04 FROM DUAL UNION ALL
    SELECT '0909917759', 'LIQUIDO',   1212.96 FROM DUAL UNION ALL
    SELECT '2100192463', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '2100192463', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '2100192463', 'LIQUIDO',    452.75 FROM DUAL UNION ALL
    SELECT '1725996498', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1725996498', 'DESCUENTOS', 226.45 FROM DUAL UNION ALL
    SELECT '1725996498', 'LIQUIDO',   1273.55 FROM DUAL UNION ALL
    SELECT '0801999855', 'INGRESOS',   727.21 FROM DUAL UNION ALL
    SELECT '0801999855', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '0801999855', 'LIQUIDO',    661.06 FROM DUAL UNION ALL
    SELECT '1712362720', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1712362720', 'DESCUENTOS', 141.75 FROM DUAL UNION ALL
    SELECT '1712362720', 'LIQUIDO',   1358.25 FROM DUAL UNION ALL
    SELECT '1712232659', 'INGRESOS',  2383.26 FROM DUAL UNION ALL
    SELECT '1712232659', 'DESCUENTOS', 427.83 FROM DUAL UNION ALL
    SELECT '1712232659', 'LIQUIDO',   1955.43 FROM DUAL UNION ALL
    SELECT '1307779064', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '1307779064', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '1307779064', 'LIQUIDO',    452.75 FROM DUAL
) d;

COMMIT;


-- =====================================================
-- COMPROBACION DE LA CARGA
-- =====================================================
SELECT CTRLFNTE, COUNT(*) AS FILAS, COUNT(DISTINCT CTRLIDNT) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 7
 GROUP BY CTRLFNTE ORDER BY CTRLFNTE;
-- Esperado: ROL 125 / 20. **NO debe salir ninguna fila PLANILLA**: julio no
-- tiene planilla del IESS en la carpeta del cliente (REF-06 §11).

SELECT CTRLTOTL, ROUND(SUM(CTRLVLOR), 2) AS TOTAL
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 7 AND CTRLFNTE = 'ROL'
   AND CTRLTOTL IS NOT NULL GROUP BY CTRLTOTL ORDER BY CTRLTOTL;
-- Esperado: DESCUENTOS 5.198,61 · INGRESOS 21.482,32 · LIQUIDO 16.283,70

SELECT CTRLALTR, ROUND(SUM(CTRLVLOR), 2) AS TOTAL, COUNT(*) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 7 AND CTRLALTR IS NOT NULL
 GROUP BY CTRLALTR ORDER BY CTRLALTR;
-- Esperado:  1 -> 20.420,60 / 20     12 ->   139,40 /  3
--            5 ->    353,83 /  3     20 -> 1.929,75 / 20
--            6 ->    120,51 /  3     23 ->   255,76 /  3
--            7 ->   447,87  /  6     24 -> 1.015,14 /  3
--                                    25 -> 1.770,10 /  4

-- El control que prueba el hallazgo de los tres aportes:
SELECT c.CTRLIDNT, m.MPLDAPLL, c.CTRLVLOR AS APORTE_DESCONTADO
  FROM RHH.CTRL c LEFT JOIN RHH.MPLD m ON m.MPLDIDNT = c.CTRLIDNT
 WHERE c.CTRLANOO = 2026 AND c.CTRLMESS = 7 AND c.CTRLALTR = 20
   AND c.CTRLIDNT IN ('1753528379', '1723962849', '1726657164');
-- Esperado: Caiza 44,03 · Nieto 82,21 · Pardo 57,33.
-- **Ni Calderon ni Cevallos Montenegro estan aqui: los suyos son correctos.**


-- =====================================================
-- LO QUE FALTA PARA CONTRASTAR
-- =====================================================
-- 1. Mike: CTRL_PARAM a mes 7.
-- 2. Frontend: periodo + DIEZ novedades (4 anticipos, 3 quirografarios,
--    3 hipotecarios) + **las vacaciones de Caiza, Nieto y Pardo**, que en
--    julio son dias reales de descanso y no el par de presentacion de enero.
--    Los fondos de reserva NO se registran: los genera el motor.
-- 3. Backend: esperado ANTES de correr, **y sin fingir que se puede fijar al
--    centavo**: julio se atribuye diferencia por diferencia.
