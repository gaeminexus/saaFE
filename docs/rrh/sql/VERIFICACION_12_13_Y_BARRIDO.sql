-- =====================================================
-- MODULO: RHH - VERIFICACION DE LOS SCRIPTS 12 Y 13 + BARRIDO DE NOT NULL
-- DESCRIPCION: Solo consultas. No modifica nada. Se ejecuta una vez, despues
--              del script 13, y su resultado se le entrega al agente backend
--              antes de que arranque la fase 5.
-- FECHA: 2026-08-19
-- =====================================================
-- El bloque 3 es el importante: en RHH los NOT NULL estan declarados como
-- CHECK con nombre de sistema, asi que all_tab_columns.nullable dice 'Y' y
-- auditar con esa vista da un falso negativo. Es lo que oculto los tres
-- defectos que detuvieron la prueba de enero.
-- =====================================================


-- =====================================================
-- BLOQUE 1: EL SCRIPT 12 CORRIO
-- =====================================================
-- 1.1 La columna RBROCDGO ya no existe. DEBE DEVOLVER CERO FILAS.
SELECT table_name, column_name FROM all_tab_columns
 WHERE owner = 'RHH' AND column_name = 'RBROCDGO';

-- 1.2 La tabla RBRO ya no existe. DEBE DEVOLVER CERO FILAS.
SELECT table_name FROM all_tables WHERE owner = 'RHH' AND table_name = 'RBRO';

-- 1.3 RNGL y TMLQ conservan su FK correcta hacia CPNM.
--     Deben aparecer FK_RNGL_CPNM y FK_TMLQ_CPNM, mas las de NMNA y LQDC.
SELECT table_name, constraint_name FROM all_constraints
 WHERE owner = 'RHH' AND table_name IN ('RNGL','TMLQ') AND constraint_type = 'R'
 ORDER BY table_name, constraint_name;


-- =====================================================
-- BLOQUE 2: EL SCRIPT 13 CORRIO
-- =====================================================
-- 2.1 La cuenta marcadora quedo parametrizada. Una fila por empresa, valor 9678.
SELECT PJRQCDGO, CFNMCTMR FROM RHH.CFNM;

-- 2.2 El rubro alterno 223 existe y tiene 7 detalles.
SELECT r.PRBRALTR, r.PRBRDSCR, COUNT(d.PDTRCDGO) AS DETALLES
  FROM SCP.PRBR r LEFT JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
 WHERE r.PRBRALTR = 223
 GROUP BY r.PRBRALTR, r.PRBRDSCR;

-- 2.3 Los siete detalles, con su codigo alterno. Son los que van a las
--     constantes de RhhTipoSalidaOficial.
SELECT d.PDTRALTR, d.PDTRDSCR
  FROM SCP.PDTR d JOIN SCP.PRBR r ON r.PRBRCDGO = d.PRBRCDGO
 WHERE r.PRBRALTR = 223
 ORDER BY d.PDTRALTR;

-- 2.4 SLOF existe y esta vacia.
SELECT COUNT(*) AS FILAS_SLOF FROM RHH.SLOF;

-- 2.5 Las secuencias de rubro quedaron adelantadas: PRBR en 225, PDTR en 1057.
SELECT sequence_name, last_number FROM all_sequences
 WHERE sequence_owner = 'SCP' AND sequence_name IN ('SQ_PRBRCDGO','SQ_PDTRCDGO');


-- =====================================================
-- BLOQUE 3: BARRIDO DE NOT NULL OCULTOS - EL QUE IMPORTA
-- =====================================================
-- Las diez tablas en las que van a escribir las fases 5 a 9, mas SLOF.
-- Cada fila es una columna OBLIGATORIA. Contrastar cada una contra las que
-- el codigo llena: una columna obligatoria que ninguna entidad JPA mapee es
-- un bloqueo de insercion, igual que lo fue RBROCDGO.
SELECT table_name, search_condition_vc
  FROM all_constraints
 WHERE owner = 'RHH' AND constraint_type = 'C'
   AND search_condition_vc LIKE '%NOT NULL%'
   AND table_name IN ('MRCC','RSMN','LQDC','TMLQ','RLPG',
                      'CRMR','RDPG','DRPG','UTLD','DTUT','SLOF')
 ORDER BY table_name, search_condition_vc;

-- Complemento: las columnas de esas tablas cuyo NOT NULL SI esta declarado
-- como atributo de columna. Las dos formas conviven en el esquema.
SELECT table_name, column_name, data_type, data_default
  FROM all_tab_columns
 WHERE owner = 'RHH' AND nullable = 'N'
   AND table_name IN ('MRCC','RSMN','LQDC','TMLQ','RLPG',
                      'CRMR','RDPG','DRPG','UTLD','DTUT','SLOF')
 ORDER BY table_name, column_id;


-- =====================================================
-- BLOQUE 4: FK HACIA TABLAS VACIAS - EL OTRO SINTOMA DE RBRO
-- =====================================================
-- RBROCDGO bloqueaba no solo por ser NOT NULL, sino por apuntar a una tabla
-- sin filas. Esta consulta lista las FK de las once tablas y su tabla padre,
-- para revisar de un vistazo que ninguna apunte a un catalogo vacio.
SELECT c.table_name, c.constraint_name, p.owner AS PADRE_OWNER, p.table_name AS PADRE_TABLA
  FROM all_constraints c
  JOIN all_constraints p ON p.owner = c.r_owner
                        AND p.constraint_name = c.r_constraint_name
 WHERE c.owner = 'RHH' AND c.constraint_type = 'R'
   AND c.table_name IN ('MRCC','RSMN','LQDC','TMLQ','RLPG',
                        'CRMR','RDPG','DRPG','UTLD','DTUT','SLOF')
 ORDER BY c.table_name, c.constraint_name;
