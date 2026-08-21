-- =====================================================
-- MODULO: RHH - OCHO ROLES DE MOTOR PARA LOS RUBROS DEL FINIQUITO
-- DESCRIPCION: Amplia el rubro alterno 221 con los roles 23 a 30 y se los
--              asigna a los conceptos 60-67. Retira el ultimo lugar del
--              modulo donde el codigo localiza conceptos por CPNMALTR.
-- ORDEN DE EJECUCION: 17 (despues del 16)
-- PARAMETRO: :EMPRESA -- mismo valor que en los scripts 05, 07, 08, 09 y 10
-- FECHA: 2026-08-19
-- =====================================================
-- POR QUE
--   El backend reporto al entregar la fase 8 que los ocho rubros del
--   finiquito se localizan por CPNMALTR 60-67, y que es la unica parte del
--   modulo que no usa el rol. Tenia razon en no decidirlo solo: es catalogo.
--
--   La decision es extender el rubro, por dos motivos:
--
--   1. La regla 1 del maestro. Los numeros 60..67 escritos en Java SON
--      valores de catalogo quemados en el codigo. Da igual que CPNMALTR sea
--      discriminante --que lo es, a diferencia de la terna que motivo el
--      rubro 221--: el problema aqui no es la ambiguedad, es que el codigo
--      declara conocer numeros que viven en una tabla.
--
--   2. Coherencia. Que un modulo localice conceptos por rol en trece sitios
--      y por codigo alterno en uno solo garantiza que alguien, en algun
--      mantenimiento futuro, copie el patron equivocado. La excepcion
--      documentada cuesta mas de mantener que el delta.
--
--   Queda UNA excepcion viva y sigue siendo legitima: la retencion en la
--   fuente por servicios profesionales, que se localiza por la terna
--   EGRESO / PORCENTAJE_SOBRE_BASE / TOTAL_INGRESOS porque no forma parte
--   del calculo ordinario de nomina. Si el catalogo llega a tener dos
--   egresos porcentuales sobre el total de ingresos, tambien necesitara rol.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- El rubro 221 debe tener HOY 22 detalles, del 1 al 22:
--   SELECT COUNT(*), MIN(PDTRALTR), MAX(PDTRALTR) FROM SCP.PDTR
--    WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--   Esperado: 22 / 1 / 22


-- =====================================================
-- PASO 1: LOS OCHO ROLES NUEVOS EN EL RUBRO 221
-- =====================================================
-- El rubro padre es PRBRCDGO 222 (alterno 221). Los alternos 23-30 siguen a
-- los 22 que ya existen: 1-16 motor, 17-22 provision, 23-30 finiquito.
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
SELECT d.CDGO, 222, d.DSCR, d.ALTR, 1 FROM (
    SELECT 1068 AS CDGO, 'FINIQUITO DECIMO TERCERO PROPORCIONAL' AS DSCR, 23 AS ALTR FROM DUAL UNION ALL
    SELECT 1069, 'FINIQUITO DECIMO CUARTO PROPORCIONAL',   24 FROM DUAL UNION ALL
    SELECT 1070, 'FINIQUITO VACACIONES NO GOZADAS',        25 FROM DUAL UNION ALL
    SELECT 1071, 'FINIQUITO FONDOS DE RESERVA PENDIENTES', 26 FROM DUAL UNION ALL
    SELECT 1072, 'FINIQUITO BONIFICACION POR DESAHUCIO',   27 FROM DUAL UNION ALL
    SELECT 1073, 'FINIQUITO INDEMNIZACION POR DESPIDO',    28 FROM DUAL UNION ALL
    SELECT 1074, 'FINIQUITO JUBILACION PATRONAL',          29 FROM DUAL UNION ALL
    SELECT 1075, 'FINIQUITO REMUNERACION PENDIENTE',       30 FROM DUAL
) d;


-- =====================================================
-- PASO 2: ASIGNARLOS A LOS OCHO CONCEPTOS DEL SCRIPT 08
-- =====================================================
-- Los conceptos 60-67 se cargaron con CPNMROLM en NULL porque el rubro no
-- tenia estos roles. El indice UQ_CPNM_ROLM (PJRQCDGO, CPNMROLM) garantiza
-- que ningun otro concepto de la empresa reclame el mismo papel.
UPDATE RHH.CPNM SET CPNMROLM = 23 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 60; -- Decimo tercero proporcional
UPDATE RHH.CPNM SET CPNMROLM = 24 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 61; -- Decimo cuarto proporcional
UPDATE RHH.CPNM SET CPNMROLM = 25 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 62; -- Vacaciones no gozadas
UPDATE RHH.CPNM SET CPNMROLM = 26 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 63; -- Fondos de reserva pendientes
UPDATE RHH.CPNM SET CPNMROLM = 27 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 64; -- Bonificacion por desahucio
UPDATE RHH.CPNM SET CPNMROLM = 28 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 65; -- Indemnizacion por despido
UPDATE RHH.CPNM SET CPNMROLM = 29 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 66; -- Jubilacion patronal
UPDATE RHH.CPNM SET CPNMROLM = 30 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 67; -- Remuneracion pendiente


-- =====================================================
-- PASO 3: ADELANTAR LA SECUENCIA DE DETALLES
-- =====================================================
ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1076;

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 1) El rubro 221 tiene ahora 30 detalles, del 1 al 30:
-- SELECT COUNT(*), MIN(PDTRALTR), MAX(PDTRALTR) FROM SCP.PDTR
--  WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--   Esperado: 30 / 1 / 30
--
-- 2) Los ocho conceptos del finiquito tienen su rol, ninguno en NULL:
-- SELECT CPNMALTR, CPNMNMBR, CPNMROLM FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND CPNMALTR BETWEEN 60 AND 67 ORDER BY CPNMALTR;
--   Esperado: 60->23, 61->24, 62->25, 63->26, 64->27, 65->28, 66->29, 67->30
--
-- 3) Ningun rol duplicado en la empresa (el indice unico lo impide, pero
--    conviene verlo despues de un UPDATE masivo):
-- SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL
--  GROUP BY CPNMROLM HAVING COUNT(*) > 1;   -- cero filas
--
-- =====================================================
-- QUE HACE EL BACKEND CON ESTO
-- =====================================================
--   Los dos metodos que el backend ya dejo aislados --conceptoPorAlterno y
--   lineaDeRubroFiniquito-- pasan a resolver por CPNMROLM, con constantes
--   nuevas en RhhRolConceptoMotor (23-30). Con eso desaparece el ultimo
--   CPNMALTR literal del modulo.
--
--   El mapeo rol -> linea del rubro 214 no cambia: sigue siendo el mismo que
--   ya implemento, solo cambia por que campo se localiza el concepto.
