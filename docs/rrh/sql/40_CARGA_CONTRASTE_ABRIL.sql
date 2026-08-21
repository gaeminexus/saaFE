-- =====================================================
-- MODULO: RHH - VALORES ESPERADOS DE ABRIL 2026, DEL ROL Y DE LA PLANILLA
-- DESCRIPCION: Carga RHH.CTRL con lo que ASOPREP pago en abril y lo que el
--              IESS cobro (ANIO=2026, MES=4), y aplica la adenda de Mendez
--              Torres, que es el unico cambio de ficha del mes.
-- ORDEN DE EJECUCION: 40
-- FECHA: 2026-08-21
-- =====================================================
-- REGLA 6: ningun numero de aqui sale de un calculo nuestro. Vienen de la hoja
-- ROL ABRIL (layout B) y ROL PROVISIONES del libro ROL ABRIL 2026.xlsb
-- (REF-02 §7 y §8) y de la planilla del IESS del periodo 2026-04 (REF-03).
-- Munoz Santos va con 51,98 / 498,03, que es lo que el libro muestra, firma y
-- transfiere (REF-06 §17: el aporte sale asi los siete meses y el liquido de
-- enero a mayo). El markdown del rol imprime 51,97 / 498,02 y esta mal.
--
-- LO QUE CAMBIA RESPECTO A MARZO
--   1. **20 personas en el rol Y 20 en la planilla.** Abril es el primer mes
--      del ano en que los dos lados coinciden en numero: Castro Arce y
--      Cevallos Aleman ya no se declaran. **No hay discrepancia del plan §3.4
--      en abril.** Si vuelve a aparecer, es hallazgo.
--   2. **Mendez Torres pasa a tiempo completo por adenda del 01-04**: 482,00
--      sobre 30 dias, y el rol de provisiones deja de cobrarle el SEGURO SALUD
--      TIEMPO PARCIAL (10,63 en marzo, cero en abril). Su TOTAL IESS sube de
--      49,65 a 99,29. Ver el bloque de ADENDA mas abajo: es un UPDATE, no solo
--      un valor de control.
--   3. **Se acaba la diferencia de dias de Mendez.** En marzo el cliente la
--      llevaba a 15 dias y nosotros a 30; desde abril los dos a 30. El defecto
--      1 de la lista de fin de calibracion deja de morder, aunque sigue vivo.
--   4. **Y se acaba su diferencia de TOTAL_IESS.** 482 x 20,60 % = 99,292 ->
--      99,29, y 45,55 + 53,74 = 99,29 tambien. Los dos lados dan lo mismo, asi
--      que Mendez desaparece del bloque 3. En marzo salia con -0,01.
--   5. Viteri Lopez con **dos** quirografarios: NUT 15379546 (240,73) y NUT
--      19600017 (179,50), 420,23 juntos. El rol los imprime sumados en una
--      sola columna, asi que se carga 420,23 en el concepto 23.
--   6. El IESS **sigue cobrando el quirografario de Castro Arce** (NUT
--      19854526, 14,79) aunque salio el 06-03. En el rol no esta, asi que AQUI
--      NO SE CARGA. Control 3, a mano: 687,05 nuestro contra 701,84 del IESS.
--      Con marzo son los 29,58 que ASOPREP asumio y que Steven confirmo el
--      2026-08-21; en mayo desaparece solo.
--   7. Tres anticipos de sueldo: Calderon 350,00 · Moscoso 650,00 · Pardo
--      300,00 (1.300,00). Se cargan como concepto 25. El motor no los genera
--      solo: el frontend los registra como novedad antes de calcular.
--   8. Prestamos hipotecarios: Cossio 490,00 · Manosalvas 379,85 · Pazmino J.
--      145,29 (1.015,14; en marzo eran 1.015,15).
--
-- LAS DIFERENCIAS QUE VAN A SALIR Y NO SON DEFECTO
--   - Robayo: IR que el cliente no retiene hasta agosto. Bloque 1 como
--     NO ESTA EN EL ROL, y bloque 2 en DESCUENTOS y LIQUIDO.
--   - Manosalvas: INGRESOS y LIQUIDO +0,01 (2.000,00 + 166,67 + 40,17 =
--     2.206,84 y el libro imprime 2.206,83).
--   - Munoz Santos: LIQUIDO -0,01 y TOTAL_IESS +0,01 (REF-06 §17).
--   Con la salvedad de que el IR de Robayo hay que releerlo del calculo de
--   abril antes de darlo por 20,17: la proyeccion puede moverse de mes a mes.
--   NO se escribe aqui un esperado que no se ha comprobado.
--
-- UNA COSA QUE NO SE SABE Y NO SE INVENTA
--   Calderon Parraga lleva **175,00 en la columna D:OTROS**, el unico OTROS de
--   todo el rol de abril. Ni REF-02 ni REF-06 dicen que concepto es. NO se
--   carga como renglon de concepto --clasificarlo a ojo seria inventar un dato
--   del cliente-- pero SI entra en su total de DESCUENTOS, que es 605,28
--   (66,15 + 14,13 + 350,00 + 175,00). Consecuencia esperada: si el frontend
--   no registra una novedad por esos 175,00, Calderon saldra en el bloque 2
--   con DESCUENTOS -175,00. **Eso es una pregunta para Steven, no un defecto
--   del motor.**
--
-- TOTALES DEL CLIENTE, con la correccion de Munoz aplicada:
--   INGRESOS 21.034,33 · DESCUENTOS 5.120,12 · LIQUIDO 15.914,22
--   (21.034,33 - 5.120,12 = 15.914,21: el centavo de Munoz otra vez, igual
--    que en enero, febrero y marzo. El rol del cliente no cuadra consigo mismo
--    y no se ajusta.)
--   TOTAL_IESS de la planilla: 4.235,36 sobre base 20.560,00, mas 205,60 de
--   contribucion del 1 % que nuestro modelo no lleva.
-- =====================================================

-- Repetible: borra lo de este mes antes de recargar.
DELETE FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 4;


-- =====================================================
-- LA ADENDA DE MENDEZ TORRES -- 01-04-2026, a tiempo completo
-- =====================================================
-- ESTO NO ES UN VALOR DE CONTROL: cambia la ficha y afecta al calculo.
-- Hoy la llevamos con el sueldo YA PARTIDO (241,00) y jornada parcial
-- (CNTEJRND = 2, CNTEHRSM = 20), que da los 241,00 correctos pero sobre 30
-- dias en vez de 15 --el motor no prorratea por jornada: la via porHoras
-- exige CNTEVLHR y esta en null--. Desde abril el cliente la paga a 482,00
-- sobre 30 dias, que es justo lo que nuestro motor produce de forma natural,
-- asi que la ficha y el motor vuelven a coincidir sin tocar codigo.

-- Control antes: debe decir 241 / 2 / 20.
SELECT m.MPLDIDNT, c.CNTECDGO, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA,
       c.CNTEHRSM AS HORAS_SEM
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904';

UPDATE RHH.CNTE
   SET CNTESLRB = 482.00,
       CNTEJRND = 1,
       CNTEHRSM = 40,
       CNTEOBSR = 'Tiempo completo desde 01-04-2026 por adenda. Antes 241,00 media jornada.'
 WHERE MPLDCDGO = (SELECT MPLDCDGO FROM RHH.MPLD WHERE MPLDIDNT = '1004350904');

-- Control despues: 482 / 1 / 40, y una sola fila afectada.
SELECT m.MPLDIDNT, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA, c.CNTEHRSM AS HORAS_SEM
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904';

-- OJO: este UPDATE cambia el sueldo SIN fecha de vigencia, asi que si alguien
-- reabre y recalcula marzo DESPUES de correr este script, Mendez saldra con
-- 482,00 en marzo tambien y marzo dejara de cuadrar. Marzo esta cerrado
-- (PRDN 30 en estado 7); no reabrirlo. Es el punto 6 de la lista de fin de
-- calibracion visto desde otro angulo.


-- =====================================================
-- EL ROL DE ABRIL -- hoja ROL ABRIL, 20 trabajadores
-- =====================================================
-- Columnas del rol -> CPNMALTR: 1 sueldo · 5 y 6 decimos mensualizados ·
-- 20 aporte personal · 23 quirografario · 24 hipotecario · 25 anticipo.

-- --- Concepto 1: sueldo ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, 1, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED,  700.00 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',      700.00 FROM DUAL UNION ALL   -- Bravo Caiza: cedula CORRECTA (el rol trae la de Benitez, REF-06 §3)
    SELECT '1753528379',      482.00 FROM DUAL UNION ALL
    SELECT '1719624809',      700.00 FROM DUAL UNION ALL
    SELECT '1311981953',     2000.00 FROM DUAL UNION ALL
    SELECT '1715156574',      700.00 FROM DUAL UNION ALL
    SELECT '1750302984',      700.00 FROM DUAL UNION ALL
    SELECT '1716120769',     2000.00 FROM DUAL UNION ALL
    SELECT '1004350904',      482.00 FROM DUAL UNION ALL   -- Mendez: tiempo completo desde el 01-04
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

-- --- Conceptos 5 y 6: decimos mensualizados (los mismos tres de marzo) ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1715156574' CED, 5 ALT,  58.33 VLOR FROM DUAL UNION ALL  -- Cossio
    SELECT '1716120769',     5,      166.67 FROM DUAL UNION ALL      -- Manosalvas
    SELECT '0103179537',     5,      128.83 FROM DUAL UNION ALL      -- Moscoso
    SELECT '1715156574',     6,       40.17 FROM DUAL UNION ALL
    SELECT '1716120769',     6,       40.17 FROM DUAL UNION ALL
    SELECT '0103179537',     6,       40.17 FROM DUAL
) d;

-- --- Concepto 20: aporte personal 9,45 % --- (Munoz con 51,98, REF-06 §17)
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, 20, d.VLOR, 'ROL', 'CARGA' FROM (
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

-- --- Conceptos 23, 24 y 25: quirografarios, hipotecarios y anticipos ---
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLALTR, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, d.ALT, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1719624809' CED, 23 ALT,  14.13 VLOR FROM DUAL UNION ALL  -- Calderon
    SELECT '1716120769',     23,      157.21 FROM DUAL UNION ALL      -- Manosalvas
    SELECT '1725996498',     23,       95.48 FROM DUAL UNION ALL      -- Robayo
    SELECT '1712232659',     23,      420.23 FROM DUAL UNION ALL      -- Viteri: DOS NUT, 240,73 + 179,50
    SELECT '1715156574',     24,      490.00 FROM DUAL UNION ALL      -- Cossio
    SELECT '1716120769',     24,      379.85 FROM DUAL UNION ALL      -- Manosalvas
    SELECT '0909917759',     24,      145.29 FROM DUAL UNION ALL      -- Pazmino Jaramillo
    SELECT '1719624809',     25,      350.00 FROM DUAL UNION ALL      -- Calderon
    SELECT '0103179537',     25,      650.00 FROM DUAL UNION ALL      -- Moscoso
    SELECT '1726657164',     25,      300.00 FROM DUAL               -- Pardo
) d;


-- =====================================================
-- LOS TOTALES DE CABECERA DEL ROL
-- =====================================================
-- Munoz con DESCUENTOS 51,98 y LIQUIDO 498,03.
-- Calderon con DESCUENTOS 605,28: incluye los 175,00 de OTROS sin clasificar.
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLTOTL, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, d.TOTL, d.VLOR, 'ROL', 'CARGA' FROM (
    SELECT '1717991341' CED, 'INGRESOS'   TOTL,  700.00 VLOR FROM DUAL UNION ALL
    SELECT '1717991341', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '1717991341', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '2150051205', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '2150051205', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '2150051205', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1753528379', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1753528379', 'DESCUENTOS',  45.55 FROM DUAL UNION ALL
    SELECT '1753528379', 'LIQUIDO',    436.45 FROM DUAL UNION ALL
    SELECT '1719624809', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '1719624809', 'DESCUENTOS', 605.28 FROM DUAL UNION ALL
    SELECT '1719624809', 'LIQUIDO',     94.72 FROM DUAL UNION ALL
    SELECT '1311981953', 'INGRESOS',  2000.00 FROM DUAL UNION ALL
    SELECT '1311981953', 'DESCUENTOS', 189.00 FROM DUAL UNION ALL
    SELECT '1311981953', 'LIQUIDO',   1811.00 FROM DUAL UNION ALL
    SELECT '1715156574', 'INGRESOS',   798.50 FROM DUAL UNION ALL
    SELECT '1715156574', 'DESCUENTOS', 556.15 FROM DUAL UNION ALL
    SELECT '1715156574', 'LIQUIDO',    242.35 FROM DUAL UNION ALL
    SELECT '1750302984', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '1750302984', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '1750302984', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1716120769', 'INGRESOS',  2206.83 FROM DUAL UNION ALL
    SELECT '1716120769', 'DESCUENTOS', 726.06 FROM DUAL UNION ALL
    SELECT '1716120769', 'LIQUIDO',   1480.77 FROM DUAL UNION ALL
    SELECT '1004350904', 'INGRESOS',   482.00 FROM DUAL UNION ALL
    SELECT '1004350904', 'DESCUENTOS',  45.55 FROM DUAL UNION ALL
    SELECT '1004350904', 'LIQUIDO',    436.45 FROM DUAL UNION ALL
    SELECT '0103179537', 'INGRESOS',  1715.00 FROM DUAL UNION ALL
    SELECT '0103179537', 'DESCUENTOS', 796.10 FROM DUAL UNION ALL
    SELECT '0103179537', 'LIQUIDO',    918.90 FROM DUAL UNION ALL
    SELECT '1717649873', 'INGRESOS',   550.00 FROM DUAL UNION ALL
    SELECT '1717649873', 'DESCUENTOS',  51.98 FROM DUAL UNION ALL
    SELECT '1717649873', 'LIQUIDO',    498.03 FROM DUAL UNION ALL
    SELECT '1723962849', 'INGRESOS',   900.00 FROM DUAL UNION ALL
    SELECT '1723962849', 'DESCUENTOS',  85.05 FROM DUAL UNION ALL
    SELECT '1723962849', 'LIQUIDO',    814.95 FROM DUAL UNION ALL
    SELECT '1726657164', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '1726657164', 'DESCUENTOS', 366.15 FROM DUAL UNION ALL
    SELECT '1726657164', 'LIQUIDO',    333.85 FROM DUAL UNION ALL
    SELECT '0909917759', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '0909917759', 'DESCUENTOS', 287.04 FROM DUAL UNION ALL
    SELECT '0909917759', 'LIQUIDO',   1212.96 FROM DUAL UNION ALL
    SELECT '2100192463', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '2100192463', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '2100192463', 'LIQUIDO',    452.75 FROM DUAL UNION ALL
    SELECT '1725996498', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1725996498', 'DESCUENTOS', 237.23 FROM DUAL UNION ALL
    SELECT '1725996498', 'LIQUIDO',   1262.77 FROM DUAL UNION ALL
    SELECT '0801999855', 'INGRESOS',   700.00 FROM DUAL UNION ALL
    SELECT '0801999855', 'DESCUENTOS',  66.15 FROM DUAL UNION ALL
    SELECT '0801999855', 'LIQUIDO',    633.85 FROM DUAL UNION ALL
    SELECT '1712362720', 'INGRESOS',  1500.00 FROM DUAL UNION ALL
    SELECT '1712362720', 'DESCUENTOS', 141.75 FROM DUAL UNION ALL
    SELECT '1712362720', 'LIQUIDO',   1358.25 FROM DUAL UNION ALL
    SELECT '1712232659', 'INGRESOS',  2200.00 FROM DUAL UNION ALL
    SELECT '1712232659', 'DESCUENTOS', 628.13 FROM DUAL UNION ALL
    SELECT '1712232659', 'LIQUIDO',   1571.87 FROM DUAL UNION ALL
    SELECT '1307779064', 'INGRESOS',   500.00 FROM DUAL UNION ALL
    SELECT '1307779064', 'DESCUENTOS',  47.25 FROM DUAL UNION ALL
    SELECT '1307779064', 'LIQUIDO',    452.75 FROM DUAL
) d;


-- =====================================================
-- EL CONTROL 2: LA PLANILLA DEL IESS DEL PERIODO 2026-04
-- =====================================================
-- 20 afiliados, los mismos 20 del rol. Los valores son la columna TOTAL IESS
-- de ROL PROVISIONES, que es el propio numero del cliente y no un calculo
-- nuestro; coinciden con SUELDO x 20,60 % y suman los 4.235,36 de la planilla.
INSERT INTO RHH.CTRL (CTRLANOO, CTRLMESS, CTRLIDNT, CTRLTOTL, CTRLVLOR, CTRLFNTE, CTRLUSRR)
SELECT 2026, 4, d.CED, 'TOTAL_IESS', d.VLOR, 'PLANILLA', 'CARGA' FROM (
    SELECT '1717991341' CED, 144.20 VLOR FROM DUAL UNION ALL
    SELECT '2150051205',     144.20 FROM DUAL UNION ALL
    SELECT '1753528379',      99.29 FROM DUAL UNION ALL
    SELECT '1719624809',     144.20 FROM DUAL UNION ALL
    SELECT '1311981953',     412.00 FROM DUAL UNION ALL
    SELECT '1715156574',     144.20 FROM DUAL UNION ALL
    SELECT '1750302984',     144.20 FROM DUAL UNION ALL
    SELECT '1716120769',     412.00 FROM DUAL UNION ALL
    SELECT '1004350904',      99.29 FROM DUAL UNION ALL   -- tiempo completo: en marzo era 49,65
    SELECT '0103179537',     318.48 FROM DUAL UNION ALL
    SELECT '1717649873',     113.30 FROM DUAL UNION ALL   -- nuestro dara 113,31
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
-- COMPROBACION DE LA CARGA -- contra los totales del cliente
-- =====================================================
SELECT CTRLFNTE, COUNT(*) AS FILAS, COUNT(DISTINCT CTRLIDNT) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 4
 GROUP BY CTRLFNTE ORDER BY CTRLFNTE;
-- Esperado: PLANILLA 20 / 20 · ROL 116 / 20
--   (116 = 56 conceptos + 60 totales; conceptos: 20 sueldos, 3 y 3 decimos,
--    20 aportes, 4 quirografarios, 3 hipotecarios, 3 anticipos)

SELECT CTRLTOTL, ROUND(SUM(CTRLVLOR), 2) AS TOTAL
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 4 AND CTRLFNTE = 'ROL'
   AND CTRLTOTL IS NOT NULL
 GROUP BY CTRLTOTL ORDER BY CTRLTOTL;
-- Esperado: DESCUENTOS 5.120,12 · INGRESOS 21.034,33 · LIQUIDO 15.914,22
--   (21.034,33 - 5.120,12 = 15.914,21: el centavo de Munoz)

SELECT CTRLALTR, ROUND(SUM(CTRLVLOR), 2) AS TOTAL, COUNT(*) AS PERSONAS
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 4 AND CTRLALTR IS NOT NULL
 GROUP BY CTRLALTR ORDER BY CTRLALTR;
-- Esperado:  1 -> 20.560,00 / 20
--            5 ->    353,83 /  3
--            6 ->    120,51 /  3
--           20 ->  1.942,93 / 20   (1.942,92 del libro + el centavo de Munoz)
--           23 ->    687,05 /  4   (el IESS cobro 701,84: +14,79 de Castro Arce)
--           24 ->  1.015,14 /  3
--           25 ->  1.300,00 /  3

SELECT ROUND(SUM(CTRLVLOR), 2) AS TOTAL_IESS_PLANILLA
  FROM RHH.CTRL WHERE CTRLANOO = 2026 AND CTRLMESS = 4 AND CTRLTOTL = 'TOTAL_IESS';
-- Esperado: 4.235,36 -- exactamente el total de la planilla del 2026-04.
--   Lo nuestro debe dar 4.235,37: el mismo numero mas el centavo de Munoz.
--   ABRIL NO TIENE DISCREPANCIA DE PERSONAS: 20 contra 20.


-- =====================================================
-- LO QUE FALTA PARA CONTRASTAR
-- =====================================================
-- 1. Mike: RHH.CTRL_PARAM a mes 4  ->  UPDATE RHH.CTRL_PARAM SET MES = 4; COMMIT;
-- 2. Frontend: crear el periodo de abril y registrar TODAS las novedades del
--    mes ANTES de calcular. **LOS PRESTAMOS DEL IESS TAMBIEN SON NOVEDAD**:
--    no salen solos de DSRC, se registran en NVNM mes a mes, como en enero,
--    febrero y marzo (verificado: PRDN 28, 29 y 30 tienen sus NVNM de
--    conceptos 23 y 24). Abril lleva DIEZ novedades:
--      concepto 25 anticipos ....... Calderon 350,00 · Moscoso 650,00 · Pardo 300,00   = 1.300,00
--      concepto 23 quirografarios .. Calderon 14,13 · Manosalvas 157,21 ·
--                                    Robayo 95,48 · Viteri 420,23                     =   687,05
--      concepto 24 hipotecarios .... Cossio 490,00 · Manosalvas 379,85 ·
--                                    Pazmino J. 145,29                                = 1.015,14
--    Y si Steven aclara que son, los 175,00 de OTROS de Calderon.
--    No hay liquidaciones en abril: nadie sale.
-- 3. Backend: escribir el esperado de abril ANTES de correr el contraste,
--    incluyendo esta vez el bloque 1B con su linea base, y correrlo.
--
-- LO QUE ABRIL DEBERIA DEMOSTRAR, si el motor esta bien calibrado:
--   - Bloque 4: 20 personas contra 20 nominas. **Sin discrepancia**, por
--     primera vez en el ano.
--   - Bloque 3: **una sola fila**, Munoz +0,01. Mendez desaparece al pasar a
--     tiempo completo. Si sale alguien mas, es hallazgo.
--   - Bloque 2: las mismas cinco de marzo (Robayo x2, Manosalvas x2, Munoz),
--     mas Calderon si los 175,00 no se registran.
--   - Bloque 1: el IR de Robayo, con el valor que de el calculo de abril.
--   - Bloque 1B: 20 personas en los patronales; provision de fondos de reserva
--     **1 persona, Viteri** -- que sigue siendo el punto 10 y no se corrige
--     hasta el final. Dato nuevo que lo refuerza: el ROL PROVISIONES de abril
--     trae la columna FONDO DE RESERVA **vacia para los 20**, o sea que el
--     cliente no provisiona a nadie, tampoco a Viteri.
