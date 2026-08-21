-- =====================================================
-- MODULO: RHH - TURNO DE PRUEBA PARA CERRAR LA JORNADA NOCTURNA
-- DESCRIPCION: Crea un turno 08:00-17:00 de lunes a viernes y se lo asigna
--              al contrato sintetico CNTE 2. Sin turno, la jornada teorica
--              es 0, todo cae en exceso y horasNocturnas sale
--              estructuralmente 0 -- no por defecto del calculo.
-- ORDEN DE EJECUCION: 19 (antes del 20, que limpia los fixtures)
-- FECHA: 2026-08-20
-- =====================================================
-- POR QUE EXISTE
--   El sintetico de marcaciones cuadro exacto -- 12 lineas, 9 ok, 2 con
--   error, 1 duplicada -- pero la jornada del 07-01 a las 20:40 no se pudo
--   medir. La franja nocturna esta bien parametrizada (PRNMHRIN 19,
--   PRNMHRFN 6, recargo 25 %) y la marca esta grabada intacta. Lo que falta
--   es el turno: el recargo nocturno se cuenta sobre la jornada ORDINARIA,
--   no sobre el exceso, y no hay ni un TRNO en la base.
--
--   Es un dato que falta, no codigo que falle.
--
-- ORDEN RESPECTO DE LA LIMPIEZA
--   Este script va ANTES del 20. Primero se termina de probar sobre los
--   fixtures y despues se limpian. Al reves se pierde la posibilidad de
--   cerrar esta comprobacion.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Esperado: 0 turnos, y el contrato 2 con CNTETRNO en nulo.
SELECT COUNT(*) AS TURNOS FROM RHH.TRNO;
SELECT CNTECDGO, CNTETRNO, CNTEESTD FROM RHH.CNTE WHERE CNTECDGO = 2;


-- =====================================================
-- PASO 1: EL TURNO
-- =====================================================
-- TRNOMNTS es la tolerancia en minutos. 10 es un valor razonable y hace que
-- el atraso se pueda probar de verdad: una entrada a las 08:05 no cuenta y
-- una a las 08:15 si.
INSERT INTO RHH.TRNO (TRNONMBR, TRNOENTR, TRNOSLDA, TRNOMNTS, TRNOESTD, TRNOUSRR)
VALUES ('JORNADA ADMINISTRATIVA 08-17', '08:00', '17:00', 10, 'A', 'CARGA');


-- =====================================================
-- PASO 2: EL DETALLE, DE LUNES A VIERNES
-- =====================================================
-- DTLLDIAA es el dia de la semana. Se siguen los valores de java.time
-- DayOfWeek: 1 lunes ... 7 domingo. Sabado y domingo se crean como NO
-- laborables en vez de omitirlos, para que la consolidacion distinga
-- "dia de descanso" de "dia sin configurar".
INSERT INTO RHH.DTLL (TRNOCDGO, DTLLDIAA, DTLLENTR, DTLLSLDA, DTLLLBRB, DTLLFCHR, DTLLUSRR)
SELECT t.TRNOCDGO, d.DIA, d.ENTR, d.SLDA, d.LBRB, SYSDATE, 'CARGA'
  FROM (SELECT MAX(TRNOCDGO) AS TRNOCDGO FROM RHH.TRNO
         WHERE TRNONMBR = 'JORNADA ADMINISTRATIVA 08-17') t,
       (SELECT 1 AS DIA, '08:00' AS ENTR, '17:00' AS SLDA, 'S' AS LBRB FROM DUAL UNION ALL
        SELECT 2, '08:00', '17:00', 'S' FROM DUAL UNION ALL
        SELECT 3, '08:00', '17:00', 'S' FROM DUAL UNION ALL
        SELECT 4, '08:00', '17:00', 'S' FROM DUAL UNION ALL
        SELECT 5, '08:00', '17:00', 'S' FROM DUAL UNION ALL
        SELECT 6, NULL,    NULL,    'N' FROM DUAL UNION ALL
        SELECT 7, NULL,    NULL,    'N' FROM DUAL) d;


-- =====================================================
-- PASO 3: ASIGNARLO AL CONTRATO SINTETICO
-- =====================================================
UPDATE RHH.CNTE
   SET CNTETRNO = (SELECT MAX(TRNOCDGO) FROM RHH.TRNO
                    WHERE TRNONMBR = 'JORNADA ADMINISTRATIVA 08-17')
 WHERE CNTECDGO = 2;

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION POSTERIOR
-- =====================================================
-- Esperado: un turno, siete detalles (cinco laborables), y el contrato 2
-- apuntando al turno.
SELECT t.TRNOCDGO, t.TRNONMBR, t.TRNOENTR, t.TRNOSLDA, t.TRNOMNTS,
       COUNT(d.DTLLCDGO) AS DETALLES,
       SUM(CASE WHEN d.DTLLLBRB = 'S' THEN 1 ELSE 0 END) AS LABORABLES
  FROM RHH.TRNO t LEFT JOIN RHH.DTLL d ON d.TRNOCDGO = t.TRNOCDGO
 GROUP BY t.TRNOCDGO, t.TRNONMBR, t.TRNOENTR, t.TRNOSLDA, t.TRNOMNTS;

SELECT CNTECDGO, CNTETRNO FROM RHH.CNTE WHERE CNTECDGO = 2;


-- =====================================================
-- LO QUE TIENE QUE PASAR DESPUES
-- =====================================================
-- Volver a consolidar el 07-01-2026 y comprobar que la marca de las 20:40
-- produce horas nocturnas con el recargo del 25 %. Si sigue dando 0 con el
-- turno puesto, entonces si es defecto del calculo y se reporta.
--
-- OJO con el 07-01-2026: es miercoles, dia laborable en este turno. Si se
-- prueba otro dia, comprobar antes que no caiga en sabado o domingo, donde
-- la jornada ordinaria es 0 por diseno y el resultado volveria a ser 0 por
-- el mismo motivo estructural.
