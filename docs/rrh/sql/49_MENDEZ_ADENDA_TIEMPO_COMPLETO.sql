-- =====================================================
-- MODULO: RHH - LA ADENDA DE MENDEZ TORRES: TIEMPO COMPLETO DESDE EL 01-04
-- DESCRIPCION: Reaplica el cambio de ficha del sql/40 despues de que enero,
--              febrero y marzo esten cerrados.
-- ORDEN DE EJECUCION: 49   (se ejecuta DESPUES de cerrar marzo, ANTES de abril)
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- ⛔ NO EJECUTAR ANTES DE QUE MARZO ESTE CERRADO.
--
-- Es la otra mitad del sql/48. El motor lee el sueldo actual, no el vigente en
-- el periodo, asi que la ficha tiene que ir cambiando al ritmo de los meses que
-- se calculan. Correr esto con enero, febrero o marzo todavia abiertos los
-- sacaria con 482,00 --y con 218,22 de mas cada uno-- que es exactamente el
-- desvio que se detecto el 2026-08-21 recalculando enero.
--
-- COMPROBACION OBLIGATORIA ANTES: los tres primeros meses en estado 7.
-- =====================================================

-- -----------------------------------------------------
-- CONTROL 1: enero, febrero y marzo TIENEN que estar CERRADOS (estado 7).
-- Si alguno no lo esta, PARAR.
-- -----------------------------------------------------
SELECT PRDNCDGO, PRDNMSEE AS MES, PRDNESTD AS ESTADO,
       CASE WHEN PRDNESTD = 7 THEN 'OK' ELSE '*** NO CERRADO: PARAR ***' END AS VEREDICTO
  FROM RHH.PRDN
 WHERE PRDNANOO = 2026 AND PRDNMSEE IN (1, 2, 3)
 ORDER BY PRDNMSEE;

-- -----------------------------------------------------
-- CONTROL 2: la ficha debe estar como la dejo el sql/48 (241 / 2 / 20).
-- -----------------------------------------------------
SELECT m.MPLDIDNT, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA, c.CNTEHRSM AS HORAS
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904' AND m.PJRQCDGO = :EMPRESA;


UPDATE RHH.CNTE
   SET CNTESLRB = 482.00,
       CNTEJRND = 1,
       CNTEHRSM = 40,
       CNTEOBSR = 'Tiempo completo desde 01-04-2026 por adenda. Antes 241,00 media jornada'
                  || ' (enero-marzo). El IESS deja de cobrar el seguro de tiempo parcial.'
 WHERE MPLDCDGO = (SELECT MPLDCDGO FROM RHH.MPLD
                    WHERE MPLDIDNT = '1004350904' AND PJRQCDGO = :EMPRESA);

COMMIT;


-- -----------------------------------------------------
-- CONTROL DESPUES: 482 / 1 / 40.
-- -----------------------------------------------------
SELECT m.MPLDIDNT, c.CNTESLRB AS SUELDO, c.CNTEJRND AS JORNADA, c.CNTEHRSM AS HORAS
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1004350904' AND m.PJRQCDGO = :EMPRESA;

-- Lo que tiene que salir en abril y mayo: Mendez con 30 dias, 482,00 de
-- ingresos, 45,55 de aporte y 436,45 de liquido, igual que el rol del cliente.
-- Totales: abril 16.089,22 (+175,00 contra el cliente, los OTROS de Calderon)
--          mayo  16.035,21 (diferencia CERO)
