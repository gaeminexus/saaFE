-- =====================================================
-- MODULO: RHH - LOS DOS INGRESOS DE ENERO DE 2026
-- DESCRIPCION: Bravo Caiza y Cevallos Montenegro, que no existen al
--              31-dic-2025 y por eso no van en la apertura.
-- ORDEN DE EJECUCION: 27 (despues del 26)
-- PARAMETRO: :EMPRESA -- la jerarquia de ASOPREP, 1236
-- FECHA: 2026-08-20
-- =====================================================
-- CORRERLO EN UTF-8, igual que el 26.
--
-- POR QUE VAN APARTE
--   Su relacion laboral empieza dentro de la ventana de calibracion, asi
--   que **no tienen saldo de apertura de ninguna clase**: ni vacaciones, ni
--   decimos, ni fondos. Todo lo suyo lo genera el motor desde su fecha de
--   ingreso. Meterlos en el script 26 habria sido cargarles un pasado que
--   no tienen.
--
--   Enero les paga proporcional: Bravo 16 dias (373,33 de 700) y Cevallos
--   Montenegro 12 dias (800,00 de 2.000). Eso lo calcula el motor solo, a
--   partir de MPLDFCIN; aqui no se escribe ningun importe.
--
-- LA CEDULA DE BRAVO CAIZA
--   Va **2150051205**, la del aviso de entrada al IESS, que es la fuente
--   autorizada. Las ocho hojas de rol y el archivo de impuesto a la renta
--   la traen como 1714531405 -- que es la de Benitez Montes, a quien
--   reemplazo en la sucursal. Ver REF-06 §3.
--
--   Consecuencia practica: al cuadrar enero contra REF-02 §7, **el cruce
--   por cedula falla solo para ella**. Su fila del rol lleva la cedula
--   equivocada; los importes si son suyos.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Esperado: 22 empleados del script 26, y ninguna de estas dos cedulas.
SELECT COUNT(*) AS EMPLEADOS FROM RHH.MPLD;
SELECT COUNT(*) AS YA_EXISTEN FROM RHH.MPLD
 WHERE MPLDIDNT IN ('2150051205','1311981953');


-- =====================================================
-- PASO 1: LOS DOS EMPLEADOS
-- =====================================================
INSERT INTO RHH.MPLD (PJRQCDGO, MPLDIDNT, MPLDAPLL, MPLDNMBR, MPLDFCIN,
                      MPLDESTD, MPLDRGNN, MPLDEMAI, MPLDTLFN, MPLDDRCC, MPLDUSRR)
SELECT :EMPRESA, d.CED, d.APEL, d.NOMB, d.ING, 1, 1, d.MAIL, d.TELF, d.DIRC, 'CARGA'
  FROM (
    SELECT '2150051205' CED, 'BRAVO CAIZA' APEL, 'WENDI JULIANA' NOMB,
           DATE '2026-01-15' ING, 'julianabravo1998@yahoo.es' MAIL,
           '0991416213' TELF, 'ORELLANA, calle Quito entre Pompella y Primavera' DIRC FROM DUAL UNION ALL
    SELECT '1311981953', 'CEVALLOS MONTENEGRO', 'JOHNNY STEVEN',
           DATE '2026-01-19', 'jhoce27@hotmail.com',
           '0993399344', 'LA VICENTINA, calle Luis Godin y Manuel Cajias' FROM DUAL
  ) d;


-- =====================================================
-- PASO 2: SUS CONTRATOS
-- =====================================================
-- Mismos valores de catalogo que los 22: indefinido tiempo completo,
-- decimos acumulados, fondos mensualizados, aporta al IESS, no retiene.
-- CNTEDCMS = 'S': sin ella el motor no les genera el decimo cuarto, y sin
-- error.
INSERT INTO RHH.CNTE (MPLDCDGO, TPCECDGO, CNTENMRO, CNTEFCHI, CNTESLRB,
                      CNTEESTD, CNTETPRL, CNTEJRND, CNTEHRSM,
                      CNTEDCTM, CNTEDCCM, CNTEFRMD, CNTEDCMS,
                      CNTEAPRT, CNTERTFN, CNTETRNO, CNTEUSRR)
SELECT m.MPLDCDGO, t.TPCECDGO, 'CT-' || d.CED, d.ING, d.SLDO,
       'ACTIVO', 1, 1, 40,
       2, 2, 1, 'S',
       'S', 'N',
       (SELECT MAX(TRNOCDGO) FROM RHH.TRNO), 'CARGA'
  FROM (
    SELECT '2150051205' CED, DATE '2026-01-15' ING,  700 SLDO FROM DUAL UNION ALL
    SELECT '1311981953',     DATE '2026-01-19',     2000      FROM DUAL
  ) d
  JOIN RHH.MPLD m ON m.MPLDIDNT = d.CED AND m.PJRQCDGO = :EMPRESA
 CROSS JOIN (SELECT MIN(TPCECDGO) AS TPCECDGO FROM RHH.TPCE
              WHERE PJRQCDGO = :EMPRESA AND TPCEESTD = 'A') t;


-- =====================================================
-- PASO 3: SU HISTORIAL DE CARGO
-- =====================================================
INSERT INTO RHH.HSTR (MPLDCDGO, DPTCCDGO, CRGOCDGO, HSTRFCHI, HSTRACTL,
                      HSTRSLNW, HSTRUSRR)
SELECT m.MPLDCDGO, dt.DPTCCDGO, c.CRGOCDGO, d.ING, 'S', d.SLDO, 'CARGA'
  FROM (
    SELECT '2150051205' CED, DATE '2026-01-15' ING, 700 SLDO, 'JEFE DE SUCURSAL COCA' CARGO FROM DUAL UNION ALL
    SELECT '1311981953',     DATE '2026-01-19',    2000,      'CONTADOR'                    FROM DUAL
  ) d
  JOIN RHH.MPLD m  ON m.MPLDIDNT = d.CED AND m.PJRQCDGO = :EMPRESA
  JOIN RHH.CRGO c  ON c.CRGONMBR = d.CARGO
  JOIN RHH.DPTC dt ON dt.CRGOCDGO = c.CRGOCDGO;

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION
-- =====================================================
SELECT 'MPLD (esperado 24)' AS QUE, COUNT(*) AS VALOR FROM RHH.MPLD
UNION ALL SELECT 'CNTE (24)', COUNT(*) FROM RHH.CNTE
UNION ALL SELECT 'HSTR (24)', COUNT(*) FROM RHH.HSTR
UNION ALL SELECT 'SLAP (57, sin cambios)', COUNT(*) FROM RHH.SLAP;

-- Los dos, con su fecha de ingreso de enero:
SELECT MPLDIDNT, MPLDAPLL, MPLDNMBR, MPLDFCIN
  FROM RHH.MPLD WHERE MPLDIDNT IN ('2150051205','1311981953');
-- Esperado: Bravo 2026-01-15, Cevallos Montenegro 2026-01-19.

-- Y que ninguno de los dos tenga saldo de apertura:
SELECT COUNT(*) AS SALDOS_QUE_NO_DEBERIAN_EXISTIR FROM RHH.SLAP
 WHERE SLAPIDNT IN ('2150051205','1311981953');
-- Esperado: 0.

-- La masa nominal pasa a 24 personas:
SELECT COUNT(*) AS CONTRATOS, ROUND(SUM(CNTESLRB),2) AS MASA
  FROM RHH.CNTE WHERE CNTEESTD = 'ACTIVO';
-- Esperado: 24 y 23.983,00 (21.283,00 + 700 + 2.000).


-- =====================================================
-- LO QUE FALTA PARA PODER CALCULAR ENERO
-- =====================================================
-- 1. APLICAR LOS SALDOS DESDE LA PANTALLA de migracion: validar -- sin
--    inconsistencias -- y despues aplicar. Los 57 quedan materializados en
--    SLDV, ACMN y el descuento recurrente del anticipo.
--
-- 2. LAS NOVEDADES DE ENERO, por pantalla:
--
--    a) Cuotas de prestamo del IESS, del detalle de ese periodo:
--         Hipotecario   Cossio             490,00   NUT 311404
--         Hipotecario   Manosalvas         379,85   NUT 7946837
--         Hipotecario   Pazmino Jaramillo  145,29   NUT 591589
--         Quirografario Calderon            14,42   NUT 19368191
--         Quirografario Manosalvas         157,21   NUT 13795529
--       Totales de control: hipotecarios 1.015,14 · quirografarios 171,63.
--
--       Van como novedad del mes y no como descuento recurrente de cuota
--       fija: la de Calderon decrece cada mes por amortizacion
--       (14,42 -> 14,33 -> 14,23 ...) y una cuota fija no la reproduce. El
--       importe lo da el IESS; no es algo que debamos amortizar nosotros.
--
--    b) Anticipo de Pardo Calle: 700,00 concedidos en enero, 350,00 en
--       enero y 350,00 en febrero. Es novedad del mes, no apertura.
--
-- 3. LAS DOS SALIDAS, por la pantalla de liquidacion:
--       Torres Chavez  15-01-2026  despido intempestivo  neto 7.556,41
--       Benitez Montes 16-01-2026  renuncia              neto   672,47
--    Es la primera prueba real de la fase 8. El control de Torres Chavez
--    esta en el §3.5 del plan: el aporte son 94,50 sobre los 1.000,00 de
--    remuneracion pendiente, no sobre los 7.650,91 de ingresos.
--
-- 4. Y entonces se calcula enero. Liquido esperado: 16.476,91.
