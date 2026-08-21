-- =====================================================
-- MODULO: RHH - LAS TRES JORNADAS QUE NO TENIAN CODIGO IESS
-- DESCRIPCION: Completa el rubro 225 con las cinco jornadas de RhhTipoJornada.
--              Hasta ahora solo cubria completa y parcial, asi que un contrato
--              por horas, en teletrabajo o nocturno no podia generar aviso de
--              entrada.
-- ORDEN DE EJECUCION: 44
-- FECHA: 2026-08-21
-- =====================================================
-- SEGURO DE CORRER EN CUALQUIER MOMENTO: solo inserta detalles de rubro.
-- No toca ninguna columna que el WAR desplegado este mapeando.
--
-- CRITERIO, y NO esta verificado en el anexo del IESS: teletrabajo y jornada
-- nocturna son MODALIDADES DE TRABAJO, no jornadas distintas a efectos de
-- afiliacion --el teletrabajo lo regula el MDT y la nocturna es un turno con
-- recargo--, asi que van al mismo codigo que la completa. Se marcan en la
-- descripcion como "por criterio", igual que las causas de salida por
-- descarte, para que nadie las tome por leidas del anexo.
-- =====================================================

INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 226, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1113 AS CDGO, 'POR HORAS'                          AS DSCR, 3 AS ALTR, '?' AS COD FROM DUAL UNION ALL
    SELECT 1114, 'TELETRABAJO (IESS 1, por criterio)',          4, '1' FROM DUAL UNION ALL
    SELECT 1115, 'JORNADA NOCTURNA (IESS 1, por criterio)',     5, '1' FROM DUAL
) d;
-- POR HORAS se queda en '?' A PROPOSITO y es distinto de los otros dos: el
-- formato del ENT dice que ese mismo archivo "tambien sirve para trabajo por
-- horas" y que entonces **el campo Sueldo lleva el VALOR DE LA HORA**, no el
-- sueldo mensual. O sea que por horas no cambia solo el codigo de jornada,
-- cambia el significado de otro campo. Hasta confirmarlo en el portal, el
-- exportador debe seguir negandose. ASOPREP no lo usa.

COMMIT;


-- -----------------------------------------------------
-- CONTROL DESPUES
-- -----------------------------------------------------
SELECT d.PDTRALTR AS JORNADA, d.PDTRDSCR, d.PDTRVLRV AS CODIGO_IESS
  FROM SCP.PDTR d JOIN SCP.PRBR r ON r.PRBRCDGO = d.PRBRCDGO
 WHERE r.PRBRALTR = 225 ORDER BY d.PDTRALTR;
-- Esperado: 1 completo -> '1' · 2 parcial -> '?' · 3 por horas -> '?'
--           4 teletrabajo -> '1' · 5 nocturna -> '1'
--   Dos '?' y los dos a proposito: parcial y por horas, que el anexo no
--   documenta y que ademas cambian otros campos del registro.
