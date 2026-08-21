-- =====================================================
-- MODULO: RHH - EL APORTE PERSONAL AL IESS EN EL FINIQUITO
-- DESCRIPCION: Rol 31 en el rubro 221 y el concepto de egreso que lo lleva.
--              Cierra el hueco que impedia que Torres Chavez cuadrara.
-- ORDEN DE EJECUCION: 22 (despues del 21)
-- PARAMETRO: :EMPRESA -- mismo valor que en los scripts 05, 07, 08, 09, 10 y 17
-- FECHA: 2026-08-20
-- =====================================================
-- EL HUECO
--   El script 17 creo los ocho roles del finiquito, 23 a 30, y **los ocho
--   son de tipo ingreso**. Nunca se puso el lado del descuento. Resultado:
--   simular devuelve totalDescuentos = 0 en las tres causales, incluso
--   sobre un contrato con aportaIess = 'S'.
--
--   Para TORRES CHAVEZ ELIZABETH, cuya acta del Ministerio del Trabajo es
--   el caso de prueba de enero, el motor daria neto 7.650,91 en vez de
--   7.556,41: los 94,50 exactos del aporte.
--
-- LA REGLA NORMATIVA -- es ley, no preferencia
--   El aporte se calcula **solo sobre la remuneracion pendiente**.
--   Indemnizaciones, decimos y vacaciones NO son materia gravada. En el
--   acta de Torres Chavez: 9,45 % de 1.000,00 y no de 7.650,91.
--
-- POR QUE NO HACE FALTA NI BANDERA DE BASE NI MECANISMO NUEVO
--   Confirmado por el backend: calculaFiniquito calcula cada importe en
--   Java y agrega(...) recibe el valor ya hecho; del concepto solo lee
--   codigoAlterno, nombre y tipoConcepto. Y como la base es exactamente la
--   remuneracion pendiente, ya esta en una variable local que se calcula
--   tres lineas antes y que ya se usa como base de los decimos.
--
--   O sea: no hace falta un equivalente de RNGLIMPN, ni una bandera
--   CPNMBSAP, ni recorrer rubros marcados. Solo el catalogo de este script
--   y una llamada mas en el servicio.
--
--   Y el signo se reparte solo: el bucle de totales manda CPNMTPCN = 2
--   (EGRESO) a descuentos, y DetalleLiquidacion hereda ese tipo, asi que
--   TMLQ tambien queda bien.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- El rubro 221 debe tener HOY 30 detalles, del 1 al 30:
--   SELECT COUNT(*), MIN(PDTRALTR), MAX(PDTRALTR) FROM SCP.PDTR
--    WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--   Esperado: 30 / 1 / 30
--
-- Y el codigo alterno 68 debe estar libre en CPNM:
--   SELECT COUNT(*) FROM RHH.CPNM WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 68;
--   Esperado: 0


-- =====================================================
-- PASO 1: EL ROL 31 EN EL RUBRO 221
-- =====================================================
-- El rubro padre es PRBRCDGO 222 (alterno 221). El 30 era el ultimo
-- ocupado: 1-16 motor, 17-22 provision, 23-30 finiquito, y ahora el 31,
-- que es el primero del finiquito que resta en vez de sumar.
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
VALUES (1076, 222, 'FINIQUITO APORTE PERSONAL IESS', 31, 1);


-- =====================================================
-- PASO 2: EL CONCEPTO
-- =====================================================
-- Se calca del concepto mensual "Aporte personal IESS" (CPNMALTR 20):
-- mismo tipo de calculo (2 = porcentaje) y misma base (2), para que el
-- catalogo se lea igual en los dos sitios. La diferencia esta en
-- CPNMTPCN = 2, EGRESO, que es lo que hace que se reste.
--
-- CPNMPRCN va en NULL A PROPOSITO. Ver la nota del final.
INSERT INTO RHH.CPNM (
    PJRQCDGO, CPNMALTR, CPNMNMBR, CPNMABRV,
    CPNMTPCN, CPNMTPCL, CPNMBSCL, CPNMTPRL,
    CPNMVLRR, CPNMPRCN,
    CPNMIMIE, CPNMIMIR, CPNMAPFR, CPNMBSDT, CPNMBSDC, CPNMBSVC, CPNMBSUT,
    CPNMPTRN, CPNMPRVS, CPNMOBLG, CPNMRCRT,
    CPNMROLM, CPNMORDN, CPNMESTD, CPNMUSRR
)
VALUES (
    :EMPRESA, 68, 'Aporte personal IESS finiquito', 'APIESF',
    2, 2, 2, NULL,
    NULL, NULL,
    'N', 'N', 'N', 'N', 'N', 'N', 'N',
    'N', 'N', 'S', 'N',
    31, 140, 1, 'INSTALACION'
);

COMMIT;


-- =====================================================
-- PASO 3: ADELANTAR LA SECUENCIA DE DETALLES
-- =====================================================
ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1077;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 1) El rubro 221 tiene ahora 31 detalles, del 1 al 31:
--    SELECT COUNT(*), MIN(PDTRALTR), MAX(PDTRALTR) FROM SCP.PDTR
--     WHERE PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 221);
--    Esperado: 31 / 1 / 31
--
-- 2) El concepto existe, es egreso y tiene su rol:
--    SELECT CPNMALTR, CPNMNMBR, CPNMTPCN, CPNMROLM, CPNMPRCN
--      FROM RHH.CPNM WHERE PJRQCDGO = :EMPRESA AND CPNMROLM = 31;
--    Esperado: 68 / Aporte personal IESS finiquito / 2 / 31 / NULL
--
-- 3) Ningun rol duplicado -- lo impide UQ_CPNM_ROLM, pero se comprueba:
--    SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM
--     WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL
--     GROUP BY CPNMROLM HAVING COUNT(*) > 1;
--    Esperado: cero filas


-- =====================================================
-- LO QUE FALTA EN JAVA -- no lo hace este script
-- =====================================================
-- 1. La constante 31 en RhhRolConceptoMotor:
--        public static final int FINIQUITO_APORTE_PERSONAL = 31;
--
-- 2. La llamada en calculaFiniquito, justo despues de la linea de
--    remuneracion pendiente:
--
--        if (SI.equals(contrato.getAportaIess())) {
--            Double aporte = RedondeoNomina.porcentaje(remuneracion, porcentajeAporte);
--            agrega(rubros, conceptos, RhhRolConceptoMotor.FINIQUITO_APORTE_PERSONAL,
--                    remuneracion, null, aporte);
--        }
--
--    LiquidacionHaberesServiceImpl NO esta entre los cinco servicios
--    congelados -- es codigo de fase 8, posterior a la prueba de enero --
--    asi que se puede modificar.


-- =====================================================
-- POR QUE CPNMPRCN VA EN NULL
-- =====================================================
-- La precedencia decidida es la del motor mensual: CPNMPRCN manda, con
-- caida a PRNM. Sobre ese mecanismo hay dos formas de escribir el valor, y
-- dejarlo en NULL es la buena:
--
--   * Con 9.45 escrito, el concepto queda clavado. El dia que el porcentaje
--     legal cambie, actualizar PRNM no basta: habria que acordarse tambien
--     de este concepto, y la nomina mensual y el finiquito quedarian con
--     porcentajes distintos sin que nada avise.
--   * En NULL, cae a PRNM.aportePersonal y sigue la ley sola. La capacidad
--     de anularlo por empresa sigue disponible el dia que haga falta: el
--     mecanismo esta puesto, solo que sin usar.
--
-- Se gana la coherencia de mecanismo que se buscaba y ademas el
-- seguimiento automatico. No hay que elegir entre las dos cosas.
--
-- OJO, y va para la revision previa al primer commit: el concepto MENSUAL
-- equivalente (CPNMALTR 20) SI tiene 9.45 escrito en CPNMPRCN, del script
-- 08. Ahi el problema de arriba esta vivo -- un cambio de ley obligaria a
-- tocar dos sitios. No se corrige aqui porque no es de este trabajo, pero
-- conviene decidirlo antes de produccion.
