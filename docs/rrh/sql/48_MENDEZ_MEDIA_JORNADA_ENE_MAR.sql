-- =====================================================
-- MODULO: RHH - MENDEZ TORRES VUELVE A MEDIA JORNADA PARA ENERO-MARZO
-- DESCRIPCION: Deshace temporalmente la adenda del sql/40 para poder
--              recalcular enero, febrero y marzo con el contrato que regia
--              entonces.
-- ORDEN DE EJECUCION: 48   (se ejecuta ANTES de recalcular enero)
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- POR QUE HACE FALTA ESTE BAILE
--
-- El motor lee CNTE.CNTESLRB tal como esta HOY: no hay historial de sueldo por
-- fecha. Es el mismo defecto que el backend encontro en la planilla de control
-- --"la planilla de un mes pasado lee el contrato de hoy"-- pero en el calculo.
--
-- El sql/40 puso a Mendez en 482 / jornada 1 / 40 h por la adenda del 01-04, y
-- su cabecera ya avisaba de que un recalculo posterior de marzo la sacaria con
-- 482. Muerde tambien en enero y febrero, que es donde se detecto:
--   enero recalculado -> 30 dias, 482,00, neto 436,45
--   lo que el cliente le pago -> ingresos 251,04, liquido 218,23
--   241,00 - 22,77 de aporte = 218,23  ==  el desvio observado (218,22)
--
-- SECUENCIA COMPLETA, y el orden es la unica salvaguarda:
--   1. ESTE SCRIPT (48): Mendez a 241 / jornada 2 / 20 h.
--   2. Recalcular y CERRAR enero, febrero y marzo.
--   3. sql/49: Mendez a 482 / jornada 1 / 40 h.
--   4. Recalcular y CERRAR abril y mayo.
--
-- EN PRODUCCION SE REPITE IGUAL: se carga hasta marzo con el 48 puesto, se
-- corre el 49, y se siguen abril y mayo. Por eso esto es un script y no un
-- UPDATE a mano.
--
-- LO QUE ESTO **NO** ES: no es un apano ni un dato falso. En enero, febrero y
-- marzo Mendez ESTABA a media jornada: 241,00 es su sueldo real de esos meses,
-- y es lo que el rol del cliente y la planilla del IESS declaran. Lo falso es
-- lo contrario: dejarle 482 en un mes en que no los cobro.
--
-- LA SOLUCION DE FONDO, que no es esta: historial de sueldo por vigencia
-- --RHH.HSTR ya existe para el historial del empleado-- de modo que el motor
-- lea el sueldo VIGENTE EN EL PERIODO y no el actual. Va a la lista de fin de
-- calibracion; mientras no exista, todo recalculo de un mes pasado tiene que
-- comprobar antes que ninguna ficha haya cambiado desde entonces.
-- =====================================================

-- -----------------------------------------------------
-- CONTROL ANTES: debe decir 482 / 1 / 40 (lo que dejo el sql/40).
-- -----------------------------------------------------
SELECT m.MPLDIDNT, m.MPLDAPLL, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA,
       c.CNTEHRSM AS HORAS, SUBSTR(c.CNTEOBSR, 1, 60) AS OBSERVACION
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904' AND m.PJRQCDGO = :EMPRESA;


UPDATE RHH.CNTE
   SET CNTESLRB = 241.00,
       CNTEJRND = 2,
       CNTEHRSM = 20,
       CNTEOBSR = 'Media jornada (enero-marzo 2026). La adenda del 01-04 la pasa a'
                  || ' 482,00 tiempo completo: la aplica el sql/49 DESPUES de cerrar marzo.'
 WHERE MPLDCDGO = (SELECT MPLDCDGO FROM RHH.MPLD
                    WHERE MPLDIDNT = '1004350904' AND PJRQCDGO = :EMPRESA);

COMMIT;


-- -----------------------------------------------------
-- CONTROL DESPUES: 241 / 2 / 20.
-- -----------------------------------------------------
SELECT m.MPLDIDNT, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA, c.CNTEHRSM AS HORAS
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904' AND m.PJRQCDGO = :EMPRESA;

-- Y lo que tiene que salir al recalcular enero, para no descubrirlo tarde:
--   Mendez: ingresos 241,00 · descuentos 22,77 · liquido 218,23
--   (el cliente imprime 251,04 / 32,82 / 218,23: la diferencia en ingresos y
--    descuentos son las vacaciones del par que netea a cero, documentado)
--   Total de enero: 22 filas, neto 16.476,92, diferencia CERO contra el cliente.
