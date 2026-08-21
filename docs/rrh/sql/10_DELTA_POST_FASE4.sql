-- =====================================================
-- MODULO: RHH - DELTA DE SINCRONIZACION POST FASE 4
-- DESCRIPCION: Aplica a la base de datos los cambios de modelo que el
--              backend introdujo DESPUES de la primera ejecucion de los
--              scripts 01 a 09.
-- ORDEN DE EJECUCION: 10, solo si ya se corrieron 01 a 09
-- FECHA: 2026-08-19
-- =====================================================
-- POR QUE EXISTE ESTE SCRIPT
--   Los scripts 01, 05, 06 y 08 se modificaron despues de haberse
--   ejecutado, al introducir la columna de rol del concepto, el rubro que
--   la acompana y la conversion del estado del empleado. Una instalacion
--   nueva no necesita este delta: le basta correr 01 a 09 actualizados.
--
--   SI NO SE APLICA: el despliegue arranca sin quejarse, porque la unidad de
--   persistencia no declara hibernate.hbm2ddl.auto y por tanto Hibernate no
--   valida el esquema al desplegar. El fallo aparece en la PRIMERA consulta que
--   toque la columna -- cualquier lectura de ConceptoNomina, es decir el primer
--   calculo de nomina -- como ORA-00904: "CPNMROLM": identificador no valido.
--   Peor que fallar al desplegar: parece que todo esta bien hasta que se usa.
--
-- PARAMETRO :EMPRESA
--   El mismo valor usado en los scripts 05, 07, 08 y 09.
-- =====================================================


-- =====================================================
-- PASO 1: COLUMNA DEL ROL DEL CONCEPTO EN EL MOTOR
-- =====================================================
-- Es lo que permite al motor localizar cada concepto especial sin
-- depender del codigo alterno ni de la terna tipo/calculo/base, que no
-- es estable si el cliente agrega conceptos al catalogo.
ALTER TABLE RHH.CPNM ADD (CPNMROLM NUMBER);

COMMENT ON COLUMN RHH.CPNM.CPNMROLM IS 'Rol del concepto dentro del motor de calculo: detalle del rubro RHH_ROL_CONCEPTO_MOTOR. Nulo en los conceptos ordinarios';

-- El indice unico es la mitad util de la columna: sin el, dos conceptos pueden
-- reclamar el mismo rol y el motor toma el primero que encuentra, en silencio.
-- Los NULL no participan del unique en Oracle, asi que los conceptos ordinarios
-- conviven sin restriccion.
--
-- Se crea AHORA, con la columna todavia vacia, y no despues del PASO 5: asi el
-- INSERT nunca falla por datos preexistentes, y si alguno de los UPDATE del paso
-- 5 intentara duplicar un rol, el error apunta a esa linea concreta en vez de a
-- una creacion de indice al final.
CREATE UNIQUE INDEX UQ_CPNM_ROLM ON RHH.CPNM(PJRQCDGO, CPNMROLM);


-- =====================================================
-- PASO 2: ESTADO DEL EMPLEADO A RUBRO
-- =====================================================
-- MPLDESTD era VARCHAR2 con texto libre. El motor necesita distinguir
-- CESANTE de ACTIVO para no incluir en el rol a un liquidado, y 'A'/'I'
-- no puede expresar CON_LICENCIA ni JUBILADO.
--
-- ATENCION: esto DESTRUYE el contenido actual de la columna. Si ya hay
-- empleados cargados con un estado que importe, primero:
--   SELECT MPLDCDGO, MPLDIDNT, MPLDESTD FROM RHH.MPLD;
-- y despues del ADD, reasignar con UPDATE segun el rubro 185:
--   1 ACTIVO   2 CON LICENCIA   3 SUSPENDIDO   4 CESANTE   5 JUBILADO
ALTER TABLE RHH.MPLD DROP COLUMN MPLDESTD;
ALTER TABLE RHH.MPLD ADD (MPLDESTD NUMBER DEFAULT 1);

COMMENT ON COLUMN RHH.MPLD.MPLDESTD IS 'Estado del empleado: detalle del rubro RHH_ESTADO_EMPLEADO. El motor de nomina excluye del calculo a los CESANTE';


-- =====================================================
-- PASO 3: RUBRO 221 - ROL DEL CONCEPTO EN EL MOTOR
-- =====================================================
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (222, 'RHH ROL DEL CONCEPTO EN EL MOTOR', SYSDATE, 221, 1);

INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
SELECT d.CDGO, 222, d.DSCR, d.ALTR, 1 FROM (
    SELECT 1024 AS CDGO, 'APORTE PERSONAL'        AS DSCR,  1 AS ALTR FROM DUAL UNION ALL
    SELECT 1025, 'APORTE PATRONAL',         2 FROM DUAL UNION ALL
    SELECT 1026, 'IECE',                    3 FROM DUAL UNION ALL
    SELECT 1027, 'SECAP',                   4 FROM DUAL UNION ALL
    SELECT 1028, 'FONDOS DE RESERVA',       5 FROM DUAL UNION ALL
    SELECT 1029, 'DECIMO TERCERO',          6 FROM DUAL UNION ALL
    SELECT 1030, 'DECIMO CUARTO',           7 FROM DUAL UNION ALL
    SELECT 1031, 'IMPUESTO A LA RENTA',     8 FROM DUAL UNION ALL
    SELECT 1032, 'HORA SUPLEMENTARIA',      9 FROM DUAL UNION ALL
    SELECT 1033, 'HORA EXTRAORDINARIA',    10 FROM DUAL UNION ALL
    SELECT 1034, 'RECARGO NOCTURNO',       11 FROM DUAL UNION ALL
    SELECT 1035, 'PRESTAMO QUIROGRAFARIO', 12 FROM DUAL UNION ALL
    SELECT 1036, 'PRESTAMO HIPOTECARIO',   13 FROM DUAL UNION ALL
    SELECT 1037, 'ANTICIPO DE SUELDO',     14 FROM DUAL UNION ALL
    SELECT 1038, 'PRESTAMO INTERNO',       15 FROM DUAL UNION ALL
    SELECT 1039, 'RETENCION JUDICIAL',     16 FROM DUAL UNION ALL
    SELECT 1044, 'PROVISION DECIMO TERCERO',       17 FROM DUAL UNION ALL
    SELECT 1045, 'PROVISION DECIMO CUARTO',        18 FROM DUAL UNION ALL
    SELECT 1046, 'PROVISION VACACIONES',           19 FROM DUAL UNION ALL
    SELECT 1047, 'PROVISION FONDOS DE RESERVA',    20 FROM DUAL UNION ALL
    SELECT 1048, 'PROVISION JUBILACION PATRONAL',  21 FROM DUAL UNION ALL
    SELECT 1049, 'PROVISION DESAHUCIO',            22 FROM DUAL
) d;


-- =====================================================
-- PASO 4: RUBRO 222 - ESTADO DE LA CUOTA DE DESCUENTO
-- =====================================================
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (223, 'RHH ESTADO DE LA CUOTA DE DESCUENTO', SYSDATE, 222, 1);

INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
SELECT d.CDGO, 223, d.DSCR, d.ALTR, 1 FROM (
    SELECT 1040 AS CDGO, 'PENDIENTE'  AS DSCR, 1 AS ALTR FROM DUAL UNION ALL
    SELECT 1041, 'DESCONTADA', 2 FROM DUAL UNION ALL
    SELECT 1042, 'PARCIAL',    3 FROM DUAL UNION ALL
    SELECT 1043, 'ANULADA',    4 FROM DUAL
) d;


-- =====================================================
-- PASO 5: ASIGNAR EL ROL A LOS CONCEPTOS YA CARGADOS
-- =====================================================
-- Los conceptos se insertaron con el script 08 antes de que existiera la
-- columna, asi que hay que asignarles el rol ahora. Los que quedan en
-- NULL son conceptos ordinarios, sin papel especial en el motor.
UPDATE RHH.CPNM SET CPNMROLM =  1 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 20; -- Aporte personal IESS
UPDATE RHH.CPNM SET CPNMROLM =  2 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 40; -- Aporte patronal IESS
UPDATE RHH.CPNM SET CPNMROLM =  3 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 41; -- Aporte IECE
UPDATE RHH.CPNM SET CPNMROLM =  4 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 42; -- Aporte SECAP
UPDATE RHH.CPNM SET CPNMROLM =  5 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  7; -- Fondos de reserva
UPDATE RHH.CPNM SET CPNMROLM =  6 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  5; -- Decimo tercero mensualizado
UPDATE RHH.CPNM SET CPNMROLM =  7 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  6; -- Decimo cuarto mensualizado
UPDATE RHH.CPNM SET CPNMROLM =  8 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 21; -- Impuesto a la renta
UPDATE RHH.CPNM SET CPNMROLM =  9 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  2; -- Horas suplementarias 50%
UPDATE RHH.CPNM SET CPNMROLM = 10 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  3; -- Horas extraordinarias 100%
UPDATE RHH.CPNM SET CPNMROLM = 11 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR =  4; -- Recargo nocturno 25%
UPDATE RHH.CPNM SET CPNMROLM = 12 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 23; -- Prestamo quirografario IESS
UPDATE RHH.CPNM SET CPNMROLM = 13 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 24; -- Prestamo hipotecario IESS
UPDATE RHH.CPNM SET CPNMROLM = 14 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 25; -- Anticipo de sueldo
UPDATE RHH.CPNM SET CPNMROLM = 15 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 26; -- Prestamo interno
UPDATE RHH.CPNM SET CPNMROLM = 16 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 22; -- Retencion judicial
-- Conceptos de provision. Sin rol, el motor apuntaria la fila de PVNM al concepto
-- mensualizado en vez de al de provision, y ademas 54 y 55 comparten terna, asi que
-- no habria forma de distinguirlos.
UPDATE RHH.CPNM SET CPNMROLM = 17 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 50; -- Provision decimo tercero
UPDATE RHH.CPNM SET CPNMROLM = 18 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 51; -- Provision decimo cuarto
UPDATE RHH.CPNM SET CPNMROLM = 19 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 52; -- Provision vacaciones
UPDATE RHH.CPNM SET CPNMROLM = 20 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 53; -- Provision fondos de reserva
UPDATE RHH.CPNM SET CPNMROLM = 21 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 54; -- Provision jubilacion patronal
UPDATE RHH.CPNM SET CPNMROLM = 22 WHERE PJRQCDGO = :EMPRESA AND CPNMALTR = 55; -- Provision desahucio


-- =====================================================
-- PASO 6: BACKFILL DE EMPRESA (idempotente)
-- =====================================================
-- Se repite por si no se ejecuto tras agregarse al script 05. El WHERE
-- IS NULL lo hace inofensivo si ya se corrio.
UPDATE RHH.MPLD SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.PRDN SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.TPCE SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;
UPDATE RHH.CTLG SET PJRQCDGO = :EMPRESA WHERE PJRQCDGO IS NULL;


-- =====================================================
-- PASO 7: TIPIFICAR LAS COLUMNAS DE ASISTENCIA
-- =====================================================
-- MRCCTPOO, MRCCORGN y RSMNFNTE quedaron como VARCHAR2 con texto libre,
-- pese a que existen los rubros 192 (tipo de marcacion), 193 (origen) y
-- 193 tambien para la fuente del resumen. Es la regla 2 del maestro: los
-- catalogos son rubros, no texto.
--
-- Mientras sigan siendo texto, el frontend tiene que escribir el codigo
-- alterno como cadena y leer tolerando las dos formas, porque en la misma
-- tabla podrian convivir filas viejas con texto y nuevas con codigo.
--
-- Las tres tablas estan vacias (ningun script inserta en MRCC ni RSMN),
-- asi que el DROP + ADD es seguro. SI YA HUBIERA MARCACIONES CARGADAS,
-- usar el patron de tres pasos de la cabecera del script 05.
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
-- PASO 8: ADELANTAR LA SECUENCIA DE DETALLES DE RUBRO
-- =====================================================
ALTER SEQUENCE SCP.SQ_PRBRCDGO RESTART START WITH 224;
ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1050;

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 0) El indice unico existe:
-- SELECT INDEX_NAME, UNIQUENESS FROM ALL_INDEXES
--  WHERE TABLE_OWNER = 'RHH' AND TABLE_NAME = 'CPNM' AND INDEX_NAME = 'UQ_CPNM_ROLM';
--
-- 1) La columna existe y los 16 conceptos tienen rol:
-- SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA GROUP BY CPNMROLM ORDER BY 1;
--   Deben salir 22 filas con rol 1..22 y una fila NULL con los ordinarios.
--
-- 2) Ningun rol repetido, que es justo lo que la columna viene a evitar:
-- SELECT CPNMROLM, COUNT(*) FROM RHH.CPNM
--  WHERE PJRQCDGO = :EMPRESA AND CPNMROLM IS NOT NULL
--  GROUP BY CPNMROLM HAVING COUNT(*) > 1;   -- cero filas
--
-- 3) Los rubros nuevos con sus detalles:
-- SELECT r.PRBRALTR, r.PRBRDSCR, COUNT(d.PDTRCDGO)
--   FROM SCP.PRBR r JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
--  WHERE r.PRBRALTR IN (221, 222) GROUP BY r.PRBRALTR, r.PRBRDSCR;
--   221 -> 22 detalles, 222 -> 4 detalles
--
-- 4) Empresa poblada en las cuatro tablas (las cuatro deben dar 0):
-- SELECT COUNT(*) FROM RHH.MPLD WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.PRDN WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.TPCE WHERE PJRQCDGO IS NULL;
-- SELECT COUNT(*) FROM RHH.CTLG WHERE PJRQCDGO IS NULL;
