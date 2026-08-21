-- =====================================================
-- MODULO: RHH - SEGUNDO DELTA: ROLES DE PROVISION Y TIPIFICACION
-- DESCRIPCION: Completa lo que el script 10 no traia en la version que ya
--              se ejecuto. Aplica SOLO a quien corrio el 10 antes de que
--              se le agregaran el indice unico, los seis roles de
--              provision y la conversion de las columnas de asistencia.
-- ORDEN DE EJECUCION: 11, solo tras haber corrido el 10 en su version
--                     anterior (la que dejaba la secuencia en 1044)
-- FECHA: 2026-08-19
-- =====================================================
-- COMO SABER SI ESTE SCRIPT TE CORRESPONDE
--   Ejecuta esto primero. Si devuelve 16, te corresponde. Si devuelve 22,
--   ya corriste el script 10 completo y NO debes ejecutar este.
--
--     SELECT COUNT(*) FROM SCP.PDTR
--      WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--
--   Una instalacion nueva no necesita ni el 10 ni el 11: le basta correr
--   los scripts 01 a 09 actualizados.
--
-- QUE FALTABA
--   1. El indice unico sobre (empresa, rol). Sin el, dos conceptos pueden
--      reclamar el mismo rol y el motor toma el primero, en silencio.
--   2. Seis roles de provision (17 a 22). Las tres provisiones que el
--      motor ya generaba apuntaban al concepto MENSUALIZADO en vez de al
--      de provision, y jubilacion patronal y desahucio comparten terna,
--      asi que sin rol no hay forma de distinguirlas.
--   3. La tipificacion de MRCCTPOO, MRCCORGN y RSMNFNTE, que seguian
--      siendo VARCHAR2 pese a existir los rubros 192 y 193.
--
-- PARAMETRO :EMPRESA
--   El mismo valor usado en los scripts 05, 07, 08, 09 y 10.
-- =====================================================


-- =====================================================
-- PASO 1: COMPROBAR QUE NO HAY ROLES DUPLICADOS
-- =====================================================
-- El indice unico se crea sobre datos ya poblados, asi que primero hay
-- que confirmar que los 16 roles del script 10 quedaron sin repetir.
-- ESTA CONSULTA DEBE DEVOLVER CERO FILAS. Si devuelve alguna, corregir
-- esos conceptos antes de continuar: el CREATE INDEX fallaria.
--
--   SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM
--    WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL
--    GROUP BY CPNMROLM HAVING COUNT(*) > 1;


-- =====================================================
-- PASO 2: INDICE UNICO SOBRE (EMPRESA, ROL)
-- =====================================================
-- Es la mitad util de la columna: impide que dos conceptos reclamen el
-- mismo papel en el motor. Los NULL no participan del unique en Oracle,
-- asi que los conceptos ordinarios conviven sin restriccion.
--
-- Se crea ANTES de los UPDATE del paso 4, para que si alguno intentara
-- duplicar un rol el error apunte a esa linea concreta.
CREATE UNIQUE INDEX UQ_CPNM_ROLM ON RHH.CPNM(PJRQCDGO, CPNMROLM);


-- =====================================================
-- PASO 3: SEIS ROLES DE PROVISION EN EL RUBRO 221
-- =====================================================
-- Continua la numeracion del script 10: los detalles 1024 a 1039 ya
-- existen con los roles 1 a 16; estos son del 1044 al 1049 con los
-- roles 17 a 22. El rubro padre (PRBRCDGO 222) ya esta creado.
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
SELECT d.CDGO, 222, d.DSCR, d.ALTR, 1 FROM (
    SELECT 1044 AS CDGO, 'PROVISION DECIMO TERCERO'      AS DSCR, 17 AS ALTR FROM DUAL UNION ALL
    SELECT 1045, 'PROVISION DECIMO CUARTO',        18 FROM DUAL UNION ALL
    SELECT 1046, 'PROVISION VACACIONES',           19 FROM DUAL UNION ALL
    SELECT 1047, 'PROVISION FONDOS DE RESERVA',    20 FROM DUAL UNION ALL
    SELECT 1048, 'PROVISION JUBILACION PATRONAL',  21 FROM DUAL UNION ALL
    SELECT 1049, 'PROVISION DESAHUCIO',            22 FROM DUAL
) d;


-- =====================================================
-- PASO 4: ASIGNAR LOS ROLES DE PROVISION A SUS CONCEPTOS
-- =====================================================
-- Los conceptos 50 a 55 son los de provision del catalogo. Sin esto, el
-- motor seguiria localizando la provision por el concepto mensualizado,
-- que es un concepto distinto con otra cuenta contable.
UPDATE RHH.CPNM SET CPNMROLM = 17 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 50; -- Provision decimo tercero
UPDATE RHH.CPNM SET CPNMROLM = 18 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 51; -- Provision decimo cuarto
UPDATE RHH.CPNM SET CPNMROLM = 19 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 52; -- Provision vacaciones
UPDATE RHH.CPNM SET CPNMROLM = 20 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 53; -- Provision fondos de reserva
UPDATE RHH.CPNM SET CPNMROLM = 21 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 54; -- Provision jubilacion patronal
UPDATE RHH.CPNM SET CPNMROLM = 22 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 55; -- Provision desahucio


-- =====================================================
-- PASO 5: TIPIFICAR LAS COLUMNAS DE ASISTENCIA
-- =====================================================
-- MRCCTPOO, MRCCORGN y RSMNFNTE quedaron como VARCHAR2 con texto libre,
-- pese a existir los rubros 192 (tipo de marcacion) y 193 (origen). Es la
-- regla 2 del maestro: los catalogos son rubros, no texto.
--
-- Mientras sigan siendo texto, el frontend tiene que escribir el codigo
-- alterno como cadena y leer tolerando las dos formas.
--
-- Las tablas estan vacias (ningun script inserta en MRCC ni RSMN), asi
-- que el DROP + ADD es seguro. SI YA HUBIERA MARCACIONES CARGADAS,
-- detenerse y usar el patron de tres pasos de la cabecera del script 05.
--
-- Comprobacion previa, ambas deben devolver 0:
--   SELECT COUNT(*) FROM RHH.MRCC;
--   SELECT COUNT(*) FROM RHH.RSMN;
ALTER TABLE RHH.MRCC DROP COLUMN MRCCTPOO;
ALTER TABLE RHH.MRCC ADD (MRCCTPOO NUMBER);
ALTER TABLE RHH.MRCC DROP COLUMN MRCCORGN;
ALTER TABLE RHH.MRCC ADD (MRCCORGN NUMBER);
ALTER TABLE RHH.RSMN DROP COLUMN RSMNFNTE;
ALTER TABLE RHH.RSMN ADD (RSMNFNTE NUMBER);

COMMENT ON COLUMN RHH.MRCC.MRCCTPOO IS 'Tipo de marcacion: detalle del rubro RHH_TIPO_MARCACION (192)';
COMMENT ON COLUMN RHH.MRCC.MRCCORGN IS 'Origen de la marcacion: detalle del rubro RHH_ORIGEN_MARCACION (193)';
COMMENT ON COLUMN RHH.RSMN.RSMNFNTE IS 'Origen del resumen diario: detalle del rubro RHH_ORIGEN_MARCACION (193)';


-- =====================================================
-- PASO 6: REAJUSTAR LA SECUENCIA DE DETALLES DE RUBRO
-- =====================================================
-- El script 10 la dejo en 1044, pero ese valor y los cinco siguientes
-- acaban de ocuparse en el paso 3.
ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1050;

-- SQ_PRBRCDGO no se toca: sigue en 224, correcto, porque este script no
-- crea ningun rubro nuevo.

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 1) El rubro 221 debe tener ahora 22 detalles, del rol 1 al 22:
-- SELECT COUNT(*), MIN(PDTRALTR), MAX(PDTRALTR) FROM SCP.PDTR
--  WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--   Debe dar 22, 1, 22.
--
-- 2) Los 22 conceptos con rol asignado, sin repetir:
-- SELECT CPNMROLM, CPNMALTR, CPNMNMBR FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL ORDER BY CPNMROLM;
--   Deben salir 22 filas, con CPNMROLM del 1 al 22 sin huecos ni repetidos.
--
-- 3) Las seis provisiones apuntan al concepto de provision, no al mensualizado:
-- SELECT CPNMROLM, CPNMALTR, CPNMNMBR, CPNMTPCN FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND CPNMROLM BETWEEN 17 AND 22 ORDER BY CPNMROLM;
--   Los seis deben tener CPNMTPCN = 4 (PROVISION) y CPNMALTR entre 50 y 55.
--   Si alguno sale con CPNMTPCN = 1, esta apuntando al mensualizado.
--
-- 4) El indice unico existe:
-- SELECT INDEX_NAME, UNIQUENESS FROM ALL_INDEXES
--  WHERE TABLE_OWNER = 'RHH' AND TABLE_NAME = 'CPNM' AND INDEX_NAME = 'UQ_CPNM_ROLM';
--
-- 5) Las tres columnas de asistencia son NUMBER:
-- SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS
--  WHERE OWNER = 'RHH' AND COLUMN_NAME IN ('MRCCTPOO','MRCCORGN','RSMNFNTE');
--
-- 6) La secuencia quedo por encima del ultimo detalle usado:
-- SELECT LAST_NUMBER FROM ALL_SEQUENCES
--  WHERE SEQUENCE_OWNER = 'SCP' AND SEQUENCE_NAME = 'SQ_PDTRCDGO';   -- 1050
