-- =====================================================
-- MODULO: RHH - CHECK S/N SOBRE LAS BANDERAS DEL CATALOGO DE CONCEPTOS
-- DESCRIPCION: Pone vocabulario a CPNM.CPNMIMIE, CPNMIMIR y CPNMPTRN, que hoy
--              aceptan cualquier cosa y alimentan columnas que si tienen CHECK.
-- ORDEN DE EJECUCION: 38
-- FECHA: 2026-08-21
-- =====================================================
-- POR QUE: ProcesoNominaServiceImpl.armaRenglon copia CPNM.CPNMIMIE tal cual a
-- RNGL.RNGLIMPN (:1368), que es NOT NULL y tiene el CHECK CK_RNGLIMPN S/N. El
-- origen no tiene ninguno de los dos. Es la misma forma del fallo de la salida
-- de finiquitos --origen sin vocabulario alimentando destino con vocabulario--,
-- solo que el literal no esta escrito a mano sino que viene del catalogo, asi
-- que ninguna revision del codigo lo encuentra. Un valor fuera de S/N en un
-- concepto activo tumba el calculo del PERIODO COMPLETO con ORA-02290, no un
-- renglon.
--
-- QUE HACE Y QUE NO:
--   SI  cierra la muerte por valor fuera de vocabulario (ORA-02290).
--   NO  cierra la muerte por nulo (ORA-01400). Un CHECK deja pasar NULL: la
--       condicion se evalua a UNKNOWN, no a falso. Cerrar esa via pide NOT NULL,
--       y eso si puede romper la pantalla de mantenimiento de conceptos si no
--       manda las tres banderas --saveSingle persiste lo que le llega, sin
--       defaults--. Se deja para despues de cerrar marzo, junto con el punto 8
--       de la lista de fin de calibracion (hacer condicional el :1368, que hoy
--       pisa incondicionalmente la guarda setImponible(NO) de :1352 y la
--       convierte en codigo muerto).
--
-- RIESGO DE ESTE SCRIPT: ninguno sobre los datos actuales. Verificado el
-- 2026-08-21 sobre las 45 filas de CPNM (TODAS, no solo las activas: un CHECK
-- se aplica a la tabla entera): 0 nulos y 0 valores fuera de S/N en las tres
-- columnas. Reparto actual IMIE 38 N / 7 S · IMIR 35 N / 10 S · PTRN 36 N / 9 S.
-- =====================================================

-- -----------------------------------------------------
-- CONTROL ANTES. Las tres filas deben dar 0. Si alguna no da 0, PARAR: hay que
-- corregir el dato antes, y decidir con que criterio, no ajustarlo para que el
-- ALTER pase.
-- -----------------------------------------------------
SELECT 'CPNMIMIE' AS COLUMNA,
       COUNT(*)                                                            AS TOTAL,
       SUM(CASE WHEN CPNMIMIE IS NULL THEN 1 ELSE 0 END)                   AS NULOS,
       SUM(CASE WHEN CPNMIMIE IS NOT NULL
                 AND CPNMIMIE NOT IN ('S','N') THEN 1 ELSE 0 END)          AS FUERA_SN
  FROM RHH.CPNM
UNION ALL
SELECT 'CPNMIMIR', COUNT(*),
       SUM(CASE WHEN CPNMIMIR IS NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN CPNMIMIR IS NOT NULL AND CPNMIMIR NOT IN ('S','N') THEN 1 ELSE 0 END)
  FROM RHH.CPNM
UNION ALL
SELECT 'CPNMPTRN', COUNT(*),
       SUM(CASE WHEN CPNMPTRN IS NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN CPNMPTRN IS NOT NULL AND CPNMPTRN NOT IN ('S','N') THEN 1 ELSE 0 END)
  FROM RHH.CPNM;


-- -----------------------------------------------------
-- LOS CHECK. Nombres segun el patron del esquema (CK_ + columna).
-- -----------------------------------------------------
ALTER TABLE RHH.CPNM ADD CONSTRAINT CK_CPNMIMIE CHECK (CPNMIMIE IN ('S','N'));
ALTER TABLE RHH.CPNM ADD CONSTRAINT CK_CPNMIMIR CHECK (CPNMIMIR IN ('S','N'));
ALTER TABLE RHH.CPNM ADD CONSTRAINT CK_CPNMPTRN CHECK (CPNMPTRN IN ('S','N'));


-- -----------------------------------------------------
-- CONTROL DESPUES. Deben salir las tres, ENABLED y VALIDATED.
-- -----------------------------------------------------
SELECT CONSTRAINT_NAME, STATUS, VALIDATED, SEARCH_CONDITION
  FROM ALL_CONSTRAINTS
 WHERE OWNER = 'RHH' AND TABLE_NAME = 'CPNM' AND CONSTRAINT_TYPE = 'C'
   AND CONSTRAINT_NAME LIKE 'CK_CPNM%'
 ORDER BY CONSTRAINT_NAME;

-- Y anadir las tres columnas a REFERENCIA-CHECKS-RHH.md, seccion de banderas
-- S/N, en el mismo cambio. Esa hoja solo sirve si esta completa.
