-- =====================================================
-- MODULO: RHH - PLANTILLAS CONTABLES Y MAPEO DE CUENTAS
-- DESCRIPCION: Tipos de asiento (CNT.PLNT), plantillas (CNT.PLNS) y sus
--              lineas (CNT.DTPL) para los cuatro asientos de nomina.
--              Cada linea se identifica por DTPLAXL1 = codigo alterno del
--              detalle del rubro 214 (RHH_LINEA_ASIENTO).
-- ORDEN DE EJECUCION: 9 de 9
-- FECHA: 2026-08-19
-- =====================================================
-- ESTE ES EL SCRIPT QUE HAY QUE COMPLETAR CUANDO EL CLIENTE ENTREGUE SU
-- PLAN DE CUENTAS.
--
-- CUENTA MARCADORA 9678
--   CNT.DTPL.PLNNCDGO es NOT NULL, asi que no se puede dejar sin cuenta.
--   Todas las lineas se crean apuntando a la cuenta 9678 como MARCADOR
--   TEMPORAL. No es la cuenta correcta de ningun asiento: sirve solo para
--   que la fila exista mientras llega el plan de cuentas definitivo.
--
--   CONSECUENCIA IMPORTANTE PARA EL BACKEND:
--   la condicion de "cuenta sin configurar" ya NO es PLNNCDGO IS NULL sino
--   PLNNCDGO = 9678. El metodo ContabilizacionNominaService.validarCuentasContables
--   debe comprobar ese valor, y NINGUN periodo debe contabilizarse mientras
--   queden lineas con el marcador. La carga historica (PRDNMODO = 1) no se
--   ve afectada, porque no genera asientos.
--
--   El PASO 7 tiene las sentencias para reemplazar 9678 por las cuentas
--   reales, y la seccion de verificacion final las lista.
-- =====================================================

-- =====================================================
-- CODIGOS ALTERNOS ASIGNADOS POR EL CLIENTE (2026-08-19)
-- =====================================================
--   TipoAsiento (CNT.PLNT): codigo alterno 6 para TODOS los asientos de
--     RRHH. Los cuatro asientos comparten tipo; lo que los distingue es
--     la plantilla, no el tipo.
--   Plantilla (CNT.PLNS): 163, 164, 165 y 166, siendo 163 el siguiente
--     codigo alterno disponible en la instalacion.
--
-- Comprobacion previa recomendada (debe devolver cero filas para PLNS):
--   SELECT PLNSCDAL, PLNSNMBR FROM CNT.PLNS
--    WHERE PJRQCDGO = :EMPRESA AND PLNSCDAL BETWEEN 163 AND 166;
--
-- PARAMETRO :EMPRESA
--   Codigo de la empresa (SCP.PJRQ.PJRQCDGO). DBeaver lo pide al ejecutar
--   el script (Alt+X). Debe ser el MISMO valor usado en los scripts 07 y 08.
--   Este script usa el parametro tambien dentro de subconsultas, asi que
--   conviene ejecutarlo completo y no sentencia por sentencia.
-- =====================================================


-- =====================================================
-- PASO 1: TIPO DE ASIENTO (CNT.PLNT) - codigo alterno 6
-- =====================================================
-- Se inserta SOLO si no existe ya un tipo de asiento con codigo alterno 6
-- para esta empresa. Si ya existe, se reutiliza tal cual y este INSERT no
-- hace nada, que es el comportamiento deseado.
INSERT INTO CNT.PLNT (PLNTCDGO, PLNTNMBR, PLNTCDAL, PLNTESTD, PJRQCDGO, PLNTOBSR, PLNTSSTM)
SELECT CNT.SQ_PLNTCDGO.NEXTVAL, 'RECURSOS HUMANOS', 6, 1, :EMPRESA,
       'Asientos generados por el modulo de nomina: rol, provisiones, pago y liquidacion', 1
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM CNT.PLNT
                    WHERE PLNTCDAL = 6 AND PJRQCDGO = :EMPRESA);


-- =====================================================
-- PASO 2: PLANTILLAS (CNT.PLNS) - codigos alternos 163 a 166
-- =====================================================
INSERT INTO CNT.PLNS (PLNSCDGO, PLNSNMBR, PLNSCDAL, PLNSESTD, PJRQCDGO, PLNSOBSR, PLNSSSTM)
SELECT CNT.SQ_PLNSCDGO.NEXTVAL, d.NMBR, d.CDAL, 1, :EMPRESA, d.OBSR, 1
FROM (
    SELECT 'PLANTILLA ROL DE PAGOS'            AS NMBR, 163 AS CDAL, 'Lineas del asiento de rol de pagos'  AS OBSR FROM DUAL UNION ALL
    SELECT 'PLANTILLA PROVISIONES',            164, 'Lineas del asiento de provisiones'   FROM DUAL UNION ALL
    SELECT 'PLANTILLA PAGO DE NOMINA',         165, 'Lineas del asiento de pago'          FROM DUAL UNION ALL
    SELECT 'PLANTILLA LIQUIDACION DE HABERES', 166, 'Lineas del asiento de liquidacion'   FROM DUAL
) d;


-- =====================================================
-- PASO 3: LINEAS DE LA PLANTILLA DE ROL DE PAGOS
-- =====================================================
-- DTPLMVMN: 1 = DEBE, 2 = HABER
-- DTPLAXL1: codigo alterno del detalle del rubro 214, que identifica el
--           rol de la linea. El motor busca su linea con este valor.
-- PLNNCDGO: 9678, cuenta MARCADORA temporal. Se reemplaza en el PASO 7.
-- =====================================================
INSERT INTO CNT.DTPL (DTPLCDGO, PLNSCDGO, PLNNCDGO, DTPLDSCR, DTPLMVMN, DTPLAXL1, DTPLESTD, DTPLFCIN)
SELECT CNT.SQ_DTPLCDGO.NEXTVAL,
       (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 163 AND PJRQCDGO = :EMPRESA),
       9678, d.DSCR, d.MVMN, d.AXL1, 1, SYSDATE
FROM (
    -- DEBE
    SELECT 'Gasto sueldos y salarios'          AS DSCR, 1 AS MVMN,  1 AS AXL1 FROM DUAL UNION ALL
    SELECT 'Gasto horas extra',                 1,  2 FROM DUAL UNION ALL
    SELECT 'Gasto aporte patronal IESS',        1,  3 FROM DUAL UNION ALL
    SELECT 'Gasto IECE y SECAP',                1,  4 FROM DUAL UNION ALL
    SELECT 'Gasto fondos de reserva',           1,  5 FROM DUAL UNION ALL
    SELECT 'Gasto decimo tercero',              1,  6 FROM DUAL UNION ALL
    SELECT 'Gasto decimo cuarto',               1,  7 FROM DUAL UNION ALL
    -- HABER
    SELECT 'IESS por pagar aporte personal',    2, 10 FROM DUAL UNION ALL
    SELECT 'IESS por pagar aporte patronal',    2, 11 FROM DUAL UNION ALL
    SELECT 'IESS por pagar prestamos',          2, 12 FROM DUAL UNION ALL
    SELECT 'SRI retencion relacion dependencia',2, 13 FROM DUAL UNION ALL
    SELECT 'Cuentas por cobrar empleados',      2, 14 FROM DUAL UNION ALL
    SELECT 'Retenciones judiciales por pagar',  2, 15 FROM DUAL UNION ALL
    SELECT 'Fondos de reserva por pagar',       2, 16 FROM DUAL UNION ALL
    SELECT 'Decimos por pagar',                 2, 17 FROM DUAL UNION ALL
    SELECT 'Sueldos por pagar',                 2, 18 FROM DUAL
) d;


-- =====================================================
-- PASO 4: LINEAS DE LA PLANTILLA DE PROVISIONES
-- =====================================================
INSERT INTO CNT.DTPL (DTPLCDGO, PLNSCDGO, PLNNCDGO, DTPLDSCR, DTPLMVMN, DTPLAXL1, DTPLESTD, DTPLFCIN)
SELECT CNT.SQ_DTPLCDGO.NEXTVAL,
       (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 164 AND PJRQCDGO = :EMPRESA),
       9678, d.DSCR, d.MVMN, d.AXL1, 1, SYSDATE
FROM (
    SELECT 'Gasto provision decimo tercero'       AS DSCR, 1 AS MVMN, 30 AS AXL1 FROM DUAL UNION ALL
    SELECT 'Gasto provision decimo cuarto',        1, 31 FROM DUAL UNION ALL
    SELECT 'Gasto provision vacaciones',           1, 32 FROM DUAL UNION ALL
    SELECT 'Gasto provision fondos de reserva',    1, 33 FROM DUAL UNION ALL
    SELECT 'Gasto provision jubilacion patronal',  1, 34 FROM DUAL UNION ALL
    SELECT 'Gasto provision desahucio',            1, 35 FROM DUAL UNION ALL
    SELECT 'Provision decimo tercero por pagar',   2, 40 FROM DUAL UNION ALL
    SELECT 'Provision decimo cuarto por pagar',    2, 41 FROM DUAL UNION ALL
    SELECT 'Provision vacaciones por pagar',       2, 42 FROM DUAL UNION ALL
    SELECT 'Provision fondos de reserva por pagar',2, 43 FROM DUAL UNION ALL
    SELECT 'Provision jubilacion patronal',        2, 44 FROM DUAL UNION ALL
    SELECT 'Provision desahucio',                  2, 45 FROM DUAL
) d;


-- =====================================================
-- PASO 5: LINEAS DE LA PLANTILLA DE PAGO
-- =====================================================
INSERT INTO CNT.DTPL (DTPLCDGO, PLNSCDGO, PLNNCDGO, DTPLDSCR, DTPLMVMN, DTPLAXL1, DTPLESTD, DTPLFCIN)
SELECT CNT.SQ_DTPLCDGO.NEXTVAL,
       (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 165 AND PJRQCDGO = :EMPRESA),
       9678, d.DSCR, d.MVMN, d.AXL1, 1, SYSDATE
FROM (
    SELECT 'Sueldos por pagar' AS DSCR, 1 AS MVMN, 50 AS AXL1 FROM DUAL UNION ALL
    SELECT 'Banco',             2, 51 FROM DUAL
) d;
-- NOTA: la cuenta del banco (AXL1=51) normalmente NO se fija aqui, porque
-- se resuelve en tiempo de ejecucion desde CuentaBancaria.planCuenta de la
-- cuenta indicada en RHH.RDPG.CTBNCDGO. La linea existe para poder fijar
-- una cuenta por defecto si la empresa siempre paga desde el mismo banco.


-- =====================================================
-- PASO 6: LINEAS DE LA PLANTILLA DE LIQUIDACION
-- =====================================================
INSERT INTO CNT.DTPL (DTPLCDGO, PLNSCDGO, PLNNCDGO, DTPLDSCR, DTPLMVMN, DTPLAXL1, DTPLESTD, DTPLFCIN)
SELECT CNT.SQ_DTPLCDGO.NEXTVAL,
       (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 166 AND PJRQCDGO = :EMPRESA),
       9678, d.DSCR, d.MVMN, d.AXL1, 1, SYSDATE
FROM (
    SELECT 'Provision decimo tercero por pagar' AS DSCR, 1 AS MVMN, 40 AS AXL1 FROM DUAL UNION ALL
    SELECT 'Provision decimo cuarto por pagar',  1, 41 FROM DUAL UNION ALL
    SELECT 'Provision vacaciones por pagar',     1, 42 FROM DUAL UNION ALL
    SELECT 'Gasto desahucio',                    1, 60 FROM DUAL UNION ALL
    SELECT 'Gasto despido intempestivo',         1, 61 FROM DUAL UNION ALL
    SELECT 'Gasto jubilacion patronal',          1, 62 FROM DUAL UNION ALL
    SELECT 'Gasto sueldos liquidacion',          1, 63 FROM DUAL UNION ALL
    SELECT 'IESS por pagar aporte personal',     2, 10 FROM DUAL UNION ALL
    SELECT 'Cuentas por cobrar empleados',       2, 14 FROM DUAL UNION ALL
    SELECT 'Liquidaciones por pagar',            2, 70 FROM DUAL
) d;

-- Registrar las plantillas y tipos de asiento en la configuracion
-- Los cuatro asientos comparten el tipo de asiento 6; lo que los
-- distingue es la plantilla (163 a 166).
UPDATE RHH.CFNM
   SET CFNMPLRL = 163, CFNMPLPR = 164, CFNMPLPG = 165, CFNMPLLQ = 166,
       CFNMTARL = 6,   CFNMTAPR = 6,   CFNMTAPG = 6,   CFNMTALQ = 6
 WHERE PJRQCDGO = :EMPRESA;

COMMIT;


-- =====================================================
-- PASO 7: ASIGNACION DE CUENTAS CONTABLES
-- =====================================================
-- EJECUTAR CUANDO EL CLIENTE ENTREGUE EL PLAN DE CUENTAS.
-- Reemplazar cada '<<CUENTA>>' por el numero de cuenta contable real.
-- La subconsulta resuelve el PLNNCDGO a partir del numero de cuenta, de
-- modo que no hace falta conocer las PK.
--
-- PLANTILLA DEL ROL DE PAGOS
/*
UPDATE CNT.DTPL SET PLNNCDGO = (SELECT PLNNCDGO FROM CNT.PLNN WHERE PLNNCNTA = '<<CUENTA>>' AND PJRQCDGO = :EMPRESA)
 WHERE DTPLAXL1 = 1  AND PLNSCDGO = (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 163 AND PJRQCDGO = :EMPRESA);  -- Gasto sueldos
UPDATE CNT.DTPL SET PLNNCDGO = (SELECT PLNNCDGO FROM CNT.PLNN WHERE PLNNCNTA = '<<CUENTA>>' AND PJRQCDGO = :EMPRESA)
 WHERE DTPLAXL1 = 2  AND PLNSCDGO = (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 163 AND PJRQCDGO = :EMPRESA);  -- Gasto horas extra
UPDATE CNT.DTPL SET PLNNCDGO = (SELECT PLNNCDGO FROM CNT.PLNN WHERE PLNNCNTA = '<<CUENTA>>' AND PJRQCDGO = :EMPRESA)
 WHERE DTPLAXL1 = 3  AND PLNSCDGO = (SELECT PLNSCDGO FROM CNT.PLNS WHERE PLNSCDAL = 163 AND PJRQCDGO = :EMPRESA);  -- Gasto aporte patronal
-- ... repetir para los codigos 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17 y 18
*/
--
-- CUENTA PROPIA DE CADA CONCEPTO (RHH.CPNM.PLNNCDGO)
-- Sigue el mismo patron que PGS.GRPP (GrupoProductoPago).
/*
UPDATE RHH.CPNM SET PLNNCDGO = (SELECT PLNNCDGO FROM CNT.PLNN WHERE PLNNCNTA = '<<CUENTA>>' AND PJRQCDGO = :EMPRESA)
 WHERE CPNMALTR = 1 AND PJRQCDGO = :EMPRESA;   -- Sueldo
-- ... repetir para cada concepto que tenga cuenta propia
*/


-- =====================================================
-- VERIFICACION: QUE FALTA POR CONFIGURAR
-- =====================================================
-- 1) Las 40 lineas de plantilla deben quedar creadas:
-- SELECT p.PLNSCDAL, p.PLNSNMBR, COUNT(*) AS LINEAS
--   FROM CNT.DTPL d JOIN CNT.PLNS p ON p.PLNSCDGO = d.PLNSCDGO
--  WHERE p.PLNSCDAL BETWEEN 163 AND 166 AND p.PJRQCDGO = :EMPRESA
--  GROUP BY p.PLNSCDAL, p.PLNSNMBR ORDER BY p.PLNSCDAL;
--   163 rol de pagos -> 16 lineas
--   164 provisiones  -> 12 lineas
--   165 pago         ->  2 lineas
--   166 liquidacion  -> 10 lineas
--
-- 2) Lineas que TODAVIA tienen la cuenta marcadora 9678 y por tanto
--    bloquean la contabilizacion:
-- SELECT p.PLNSNMBR, d.DTPLAXL1, d.DTPLDSCR,
--        CASE d.DTPLMVMN WHEN 1 THEN 'DEBE' ELSE 'HABER' END AS MOVIMIENTO
--   FROM CNT.DTPL d JOIN CNT.PLNS p ON p.PLNSCDGO = d.PLNSCDGO
--  WHERE p.PLNSCDAL BETWEEN 163 AND 166
--    AND p.PJRQCDGO = :EMPRESA
--    AND d.PLNNCDGO = 9678
--  ORDER BY p.PLNSCDAL, d.DTPLAXL1;
--
-- 3) Conceptos de nomina sin cuenta propia (RHH.CPNM si admite NULL):
-- SELECT CPNMALTR, CPNMNMBR FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND (PLNNCDGO IS NULL OR PLNNCDGO = 9678)
--  ORDER BY CPNMORDN;
--
-- Mientras las consultas 2 y 3 devuelvan filas, los periodos deben crearse
-- con PRDNMODO = 1 (HISTORICO_SIN_CONTABILIZAR). El backend lo hace cumplir
-- en ContabilizacionNominaService.validarCuentasContables, que debe buscar
-- el marcador 9678 y no valores nulos.
