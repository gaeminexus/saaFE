-- =====================================================
-- MODULO: RHH - RETIRAR LOS FIXTURES SINTETICOS DE LA EMPRESA 1236
-- DESCRIPCION: Borra el empleado de prueba PEREZ LOPEZ JUAN CARLOS y los
--              tres periodos sinteticos, para dejar la empresa ASOPREP
--              limpia antes de la carga historica de enero a junio.
-- ORDEN DE EJECUCION: 20 -- EL ULTIMO, y solo cuando las pruebas hayan
--              terminado. Va DESPUES del 19 (turno de prueba).
-- FECHA: 2026-08-20
-- =====================================================
--
--   *** ESTE SCRIPT BORRA DATOS. LEER ENTERO ANTES DE CORRERLO. ***
--
-- POR QUE
--   La calibracion de enero a junio va en la empresa 1236, la ASOPREP de
--   verdad, porque los acumulados que dejan esos seis meses son los que
--   agosto necesita para calcular. Los fixtures sinteticos viven hoy en esa
--   misma empresa y tienen que salir: RHH.PRDN no tiene restriccion de
--   unicidad por empresa/ano/mes, asi que el periodo 1 (enero sintetico)
--   convivria con el enero real y dejaria ambiguo cualquier informe.
--
-- POR QUE HACE FALTA SCRIPT Y NO SE HACE POR PANTALLA
--   Verificado por el backend: no hay ON DELETE CASCADE en ninguna de las
--   FK que apuntan a PRDN, no hay endpoint que borre un periodo, y el
--   remove del DAO generico es un em.remove pelado que chocaria con
--   ORA-02292. Lo mas cerca que llega la pantalla es reabrir, que retira
--   los ACMN pero deja NMNA, RNGL, PVNM y RLPG en pie. Por REST serian ~50
--   llamadas sueltas sin pantalla para RNGL, PVNM ni ACMN, y una fila que
--   se escape deja un huerfano que confundiria la calibracion justo donde
--   no queremos ruido.
--
-- LO QUE NO SE PIERDE
--   La linea base de regresion de enero esta documentada al detalle -- los
--   ocho renglones, los cuatro totales, la cabecera repartida y los tres
--   delatores -- en GUIA-PRIMER-CALCULO.md y en ESTADO-RRHH.md. Se
--   reconstruye en una empresa de pruebas cuando se quiera.
--
-- LO QUE NO SE TOCA
--   TPCE, TPCN, CTLG, CRGO, DPRT y demas catalogos: son parametrizacion de
--   la empresa, no fixtures. El turno del script 19 tampoco: sirve igual
--   para los empleados reales.
-- =====================================================


-- =====================================================
-- PASO 0: INVENTARIO -- correr esto PRIMERO y guardar la salida
-- =====================================================
-- Es la foto de lo que se va a borrar. Si alguna cuenta no cuadra con lo
-- esperado, parar y revisar antes de seguir.
SELECT 'PRDN'  AS TABLA, COUNT(*) AS FILAS FROM RHH.PRDN WHERE PRDNCDGO IN (1,22,25)
UNION ALL SELECT 'NMNA', COUNT(*) FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25)
UNION ALL SELECT 'RNGL', COUNT(*) FROM RHH.RNGL WHERE NMNACDGO IN (SELECT NMNACDGO FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25))
UNION ALL SELECT 'PVNM', COUNT(*) FROM RHH.PVNM WHERE PRDNCDGO IN (1,22,25)
UNION ALL SELECT 'ACMN', COUNT(*) FROM RHH.ACMN WHERE PRDNCDGO IN (1,22,25)
UNION ALL SELECT 'RLPG', COUNT(*) FROM RHH.RLPG WHERE NMNACDGO IN (SELECT NMNACDGO FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25))
UNION ALL SELECT 'RDPG', COUNT(*) FROM RHH.RDPG WHERE PRDNCDGO IN (1,22,25)
UNION ALL SELECT 'MRCC', COUNT(*) FROM RHH.MRCC WHERE MPLDCDGO = 1
UNION ALL SELECT 'RSMN', COUNT(*) FROM RHH.RSMN WHERE MPLDCDGO = 1
UNION ALL SELECT 'CRMR', COUNT(*) FROM RHH.CRMR
UNION ALL SELECT 'CBEM', COUNT(*) FROM RHH.CBEM WHERE MPLDCDGO = 1
UNION ALL SELECT 'CNTE', COUNT(*) FROM RHH.CNTE WHERE MPLDCDGO = 1
UNION ALL SELECT 'MPLD', COUNT(*) FROM RHH.MPLD WHERE MPLDCDGO = 1;

-- Esperado el 2026-08-20: PRDN 3 · NMNA 3 · RNGL 24 · PVNM 3 · ACMN 6 ·
-- RLPG 3 · RDPG 1 o 2 · MRCC 9 · RSMN los que dejo la consolidacion ·
-- CRMR 1 · CBEM 1 · CNTE 1 · MPLD 1.
-- Los numeros pueden variar con las pruebas del dia; lo que importa es que
-- no aparezca nada inesperado.


-- =====================================================
-- PASO 1: HIJOS DE LOS PERIODOS, EN ORDEN INVERSO DE FK
-- =====================================================
-- Se borran tambien las tablas que hoy estan vacias. Un DELETE sobre cero
-- filas no cuesta nada y evita que el script falle el dia que alguien
-- pruebe una fase mas.

-- Detalles antes que sus cabeceras.
DELETE FROM RHH.DRPG WHERE RDPGCDGO IN (SELECT RDPGCDGO FROM RHH.RDPG WHERE PRDNCDGO IN (1,22,25));
DELETE FROM RHH.DTUT WHERE UTLDCDGO IN (SELECT UTLDCDGO FROM RHH.UTLD WHERE PRDNCDGO IN (1,22,25));

-- Renglones y roles cuelgan de la nomina.
DELETE FROM RHH.RNGL WHERE NMNACDGO IN (SELECT NMNACDGO FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25));
DELETE FROM RHH.RLPG WHERE NMNACDGO IN (SELECT NMNACDGO FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25));

-- El resto cuelga del periodo.
DELETE FROM RHH.PVNM WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.NVNM WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.LQBS WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.CTDS WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.HREX WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.RDPG WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.UTLD WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.ACMN WHERE PRDNCDGO IN (1,22,25);
DELETE FROM RHH.NMNA WHERE PRDNCDGO IN (1,22,25);

DELETE FROM RHH.PRDN WHERE PRDNCDGO IN (1,22,25);


-- =====================================================
-- PASO 2: ASISTENCIA DEL EMPLEADO SINTETICO
-- =====================================================
-- El resumen primero: se deriva de las marcaciones pero no las referencia.
DELETE FROM RHH.RSMN WHERE MPLDCDGO = 1;
DELETE FROM RHH.MRCC WHERE MPLDCDGO = 1;

-- La carga que creo el sintetico. **Filtrada a proposito.** La version
-- anterior de este script hacia DELETE FROM RHH.CRMR sin WHERE: hoy borraria
-- lo correcto porque solo existe la carga 1, pero el dia que se reuse con
-- cargas reales las borraria todas sin avisar. Lo detecto el backend
-- revisando el script antes de correrlo.
DELETE FROM RHH.CRMR WHERE CRMRCDGO = 1;


-- =====================================================
-- PASO 3: EL EMPLEADO
-- =====================================================
DELETE FROM RHH.PYIR WHERE MPLDCDGO = 1;
DELETE FROM RHH.SLDV WHERE MPLDCDGO = 1;
DELETE FROM RHH.CRGF WHERE MPLDCDGO = 1;
DELETE FROM RHH.GSPR WHERE MPLDCDGO = 1;
DELETE FROM RHH.CPXM WHERE MPLDCDGO = 1;
DELETE FROM RHH.NVIS WHERE MPLDCDGO = 1;
DELETE FROM RHH.SLCT WHERE MPLDCDGO = 1;
DELETE FROM RHH.SLAP WHERE MPLDCDGO = 1;

-- Las cuotas del descuento ANTES del descuento, y por su padre, no por el
-- periodo. El paso 1 ya borro las de los periodos 1, 22 y 25; esta linea
-- cubre la que tuviera periodo nulo o de otro periodo, que sobreviviria y
-- bloquearia el DELETE de su DSRC. Aviso del backend al revisar el script.
DELETE FROM RHH.CTDS WHERE DSRCCDGO IN (SELECT DSRCCDGO FROM RHH.DSRC WHERE MPLDCDGO = 1);
DELETE FROM RHH.DSRC WHERE MPLDCDGO = 1;
DELETE FROM RHH.CBEM WHERE MPLDCDGO = 1;
DELETE FROM RHH.CNTE WHERE MPLDCDGO = 1;
DELETE FROM RHH.MPLD WHERE MPLDCDGO = 1;

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION -- todo tiene que dar CERO
-- =====================================================
SELECT 'PRDN' AS TABLA, COUNT(*) AS QUEDAN FROM RHH.PRDN
UNION ALL SELECT 'NMNA', COUNT(*) FROM RHH.NMNA
UNION ALL SELECT 'RNGL', COUNT(*) FROM RHH.RNGL
UNION ALL SELECT 'PVNM', COUNT(*) FROM RHH.PVNM
UNION ALL SELECT 'ACMN', COUNT(*) FROM RHH.ACMN
UNION ALL SELECT 'RLPG', COUNT(*) FROM RHH.RLPG
UNION ALL SELECT 'RDPG', COUNT(*) FROM RHH.RDPG
UNION ALL SELECT 'MRCC', COUNT(*) FROM RHH.MRCC
UNION ALL SELECT 'RSMN', COUNT(*) FROM RHH.RSMN
UNION ALL SELECT 'CRMR', COUNT(*) FROM RHH.CRMR
UNION ALL SELECT 'MPLD', COUNT(*) FROM RHH.MPLD
UNION ALL SELECT 'CNTE', COUNT(*) FROM RHH.CNTE;

-- Y que el turno del script 19 siga ahi, con su detalle, listo para los
-- empleados reales. Esperado: 1 y 7.
SELECT COUNT(*) AS TURNOS FROM RHH.TRNO;
SELECT COUNT(*) AS DETALLES_TURNO FROM RHH.DTLL;


-- =====================================================
-- SI ALGO FALLA CON ORA-02292
-- =====================================================
-- Significa que hay una tabla hija que este script no contempla -- una fase
-- nueva, o una tabla que se lleno despues de escribirlo. La consulta que
-- dice cual:
--
--   SELECT c.table_name, c.constraint_name, p.table_name AS PADRE
--     FROM all_constraints c
--     JOIN all_constraints p ON p.owner = c.r_owner
--                           AND p.constraint_name = c.r_constraint_name
--    WHERE c.owner = 'RHH' AND c.constraint_type = 'R'
--      AND p.table_name = '<LA TABLA QUE FALLO>';
--
-- Se borra esa hija primero y se vuelve a correr. NO se desactiva la
-- restriccion: una FK apagada durante una limpieza es como se fabrican los
-- huerfanos que despues nadie explica.
