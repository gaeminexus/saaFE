-- =====================================================
-- MODULO: RHH - DESHACER LA SALIDA DE LOS EMPLEADOS 48 Y 49 (seguro del paso 3)
-- DESCRIPCION: Devuelve al estado exacto de ANTES de ejecutar la salida de
--              LQDC 23 (Castro Arce) y LQDC 24 (Cevallos Aleman).
-- FECHA: 2026-08-21
-- =====================================================
-- POR QUE EXISTE: ejecutarSalida no tiene endpoint inverso y el propio
-- confirm() de la pantalla dice "Esta accion no se puede deshacer". Es cierto
-- por REST, pero por SQL si se puede: toca cuatro tablas y ninguna borra nada.
-- Este script se escribio ANTES de ejecutar la salida, con los valores leidos
-- de la BD el 2026-08-21, para no tener que reconstruirlos de memoria si el
-- paso 4 destapa algo.
--
-- NO SE EJECUTA salvo que haya que retroceder. No forma parte del ciclo.
--
-- ESTADO CAPTURADO ANTES DE LA SALIDA (verificado, no supuesto):
--   RHH.CNTE 48 y 49  -> CNTEESTD 'ACTIVO', CNTEFCTR NULL, CNTECSTR NULL
--   RHH.MPLD 48 y 49  -> MPLDESTD 1 (ACTIVO)
--   RHH.DSRC de 48/49 -> NINGUNA FILA (cancelaDescuentos devolvera 0)
--   RHH.SLDV 130 (48) y 126 (49) -> SLDVCDCD 'N'
--   RHH.NVIS de 48/49 -> NINGUNA FILA; maximo NVISCDGO global = 10
--   RHH.LQDC 23 y 24  -> LQDCESTD 2 (CALCULADA), LQDCFCAP NULL, ASNTCDGO NULL
-- =====================================================

-- Antes de deshacer, mirar lo que hay:
SELECT 'CNTE' TABLA, CNTECDGO ID, CNTEESTD VALOR FROM RHH.CNTE WHERE MPLDCDGO IN (48,49)
UNION ALL
SELECT 'MPLD', MPLDCDGO, TO_CHAR(MPLDESTD) FROM RHH.MPLD WHERE MPLDCDGO IN (48,49)
UNION ALL
SELECT 'SLDV', SLDVCDGO, SLDVCDCD FROM RHH.SLDV WHERE MPLDCDGO IN (48,49)
UNION ALL
SELECT 'NVIS', NVISCDGO, TO_CHAR(NVISTPNV) FROM RHH.NVIS WHERE MPLDCDGO IN (48,49)
UNION ALL
SELECT 'LQDC', LQDCCDGO, TO_CHAR(LQDCESTD) FROM RHH.LQDC WHERE LQDCCDGO IN (23,24);


-- 1. El contrato vuelve a estar abierto.
UPDATE RHH.CNTE
   SET CNTEESTD = 'ACTIVO', CNTEFCTR = NULL, CNTECSTR = NULL
 WHERE MPLDCDGO IN (48,49);

-- 2. El empleado deja de ser CESANTE.
UPDATE RHH.MPLD SET MPLDESTD = 1 WHERE MPLDCDGO IN (48,49);

-- 3. Los saldos de vacaciones dejan de estar caducados.
UPDATE RHH.SLDV SET SLDVCDCD = 'N' WHERE SLDVCDGO IN (126,130);

-- 4. El aviso de salida al IESS se retira. No habia ninguno antes, asi que
--    todo lo que exista para 48/49 lo creo la salida.
DELETE FROM RHH.NVIS WHERE MPLDCDGO IN (48,49);

-- 5. Las liquidaciones vuelven a CALCULADA para poder recalcularlas.
--    (calculaFiniquito solo se niega sobre APROBADA, LiquidacionHaberes:559.)
UPDATE RHH.LQDC
   SET LQDCESTD = 2, LQDCFCAP = NULL, LQDCUSAP = NULL
 WHERE LQDCCDGO IN (23,24);

-- 6. NO hay UPDATE de RHH.DSRC: los empleados 48 y 49 no tienen descuentos
--    recurrentes, asi que cancelaDescuentos no toca nada. Si en el futuro se
--    usa este script con alguien que si los tenga, hay que restaurar a mano
--    DSRCSLDD, DSRCFCHF y DSRCOBSR, que la cancelacion sobreescribe.

COMMIT;

-- Y comprobar que quedo como estaba: la primera consulta debe volver a decir
-- ACTIVO / 1 / N, sin filas NVIS y con las dos LQDC en 2.
