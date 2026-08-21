-- =====================================================
-- BARRIDO COMPLETO DE VERIFICACION - RHH
-- Solo consultas. No modifica nada. Se puede correr las veces que haga falta.
-- FECHA: 2026-08-20
-- =====================================================
-- COMO USARLO
--   Correrlo entero en SQL Developer (o sqlplus) contra el esquema de trabajo
--   y pegar la salida COMPLETA de vuelta, incluidos los bloques que salgan
--   vacios: "cero filas" es informacion, no ausencia de informacion.
--
-- QUE RESPONDE
--   A) La causa del ORA-02290 al crear un periodo de nomina -- lo urgente,
--      porque cae en el paso 1 de la carga historica.
--   B) El resto del barrido de NOT NULL ocultos, que es lo que evita la
--      quinta parada.
--   C) Que los scripts 12 y 13 corrieron, y las FK hacia tablas vacias.
-- =====================================================


-- =====================================================
-- A. LA CAUSA DEL ORA-02290 EN RHH.PRDN
-- =====================================================
-- A1. La restriccion exacta que reporto el log (SYS_C009297).
SELECT constraint_name, table_name, search_condition_vc
  FROM all_constraints
 WHERE owner = 'RHH' AND constraint_name = 'SYS_C009297';

-- A2. TODAS las obligatorias de PRDN, en los dos estilos de declaracion, con
--     su default. Esta es la que decide: si la hipotesis de PRDNFCHR es
--     correcta se vera aqui, y si es otra columna tambien -- sin segunda vuelta.
SELECT c.column_name,
       c.data_type,
       c.nullable            AS NULLABLE_SEGUN_VISTA,
       c.data_default,
       (SELECT LISTAGG(k.constraint_name, ' ') WITHIN GROUP (ORDER BY k.constraint_name)
          FROM all_constraints k
         WHERE k.owner = 'RHH' AND k.table_name = 'PRDN'
           AND k.constraint_type = 'C'
           AND UPPER(k.search_condition_vc) LIKE '%' || c.column_name || '%NOT NULL%'
       )                     AS CHECK_NOT_NULL
  FROM all_tab_columns c
 WHERE c.owner = 'RHH' AND c.table_name = 'PRDN'
 ORDER BY c.column_id;


-- =====================================================
-- B. BARRIDO DE OBLIGATORIAS SIN DEFAULT, TODO EL ESQUEMA
-- =====================================================
-- Es el conjunto peligroso: obligatoria y sin valor por defecto, o sea que
-- alguien tiene que ponerla explicitamente o el INSERT revienta.

-- B1. Declaradas como CHECK con nombre de sistema -- las que all_tab_columns
--     NO ve. Es el estilo dominante en RHH.
SELECT c.table_name, c.constraint_name, c.search_condition_vc
  FROM all_constraints c
 WHERE c.owner = 'RHH'
   AND c.constraint_type = 'C'
   AND UPPER(c.search_condition_vc) LIKE '%NOT NULL%'
 ORDER BY c.table_name, c.constraint_name;

-- B2. Declaradas como atributo de columna y SIN default.
SELECT table_name, column_name, data_type
  FROM all_tab_columns
 WHERE owner = 'RHH'
   AND nullable = 'N'
   AND data_default IS NULL
 ORDER BY table_name, column_id;


-- =====================================================
-- C. QUE LOS SCRIPTS 12 Y 13 CORRIERON
-- =====================================================
-- C1. Script 12: no debe quedar ninguna RBROCDGO, ni la tabla RBRO.
SELECT table_name, column_name FROM all_tab_columns
 WHERE owner = 'RHH' AND column_name = 'RBROCDGO';

SELECT table_name FROM all_tables WHERE owner = 'RHH' AND table_name = 'RBRO';

SELECT table_name, constraint_name FROM all_constraints
 WHERE owner = 'RHH' AND table_name IN ('RNGL','TMLQ') AND constraint_type = 'R';

-- C2. Script 13: la cuenta marcadora y el rubro 223.
SELECT PJRQCDGO, CFNMCTMR FROM RHH.CFNM;

SELECT r.PRBRALTR, r.PRBRDSCR, COUNT(d.PDTRCDGO) AS DETALLES
  FROM SCP.PRBR r LEFT JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
 WHERE r.PRBRALTR = 223
 GROUP BY r.PRBRALTR, r.PRBRDSCR;

SELECT COUNT(*) AS FILAS_SLOF FROM RHH.SLOF;

-- C3. Scripts 15, 16 y 17: confirmacion de que estan puestos.
--     El 15 ya esta confirmado por los hechos -- la orden de pago de febrero
--     creo su egreso contra el producto -- pero conviene ver la fila.
SELECT * FROM PGS.PRDP WHERE ROWNUM <= 20;

SELECT PRNMANOO, PRNMHRIN, PRNMHRFN FROM RHH.PRNM ORDER BY PRNMANOO;

SELECT d.PDTRALTR, d.PDTRDSCR
  FROM SCP.PDTR d JOIN SCP.PRBR r ON r.PRBRCDGO = d.PRBRCDGO
 WHERE r.PRBRALTR = 221 AND d.PDTRALTR >= 23
 ORDER BY d.PDTRALTR;


-- =====================================================
-- D. FK HACIA TABLAS VACIAS - EL OTRO SINTOMA DE RBRO
-- =====================================================
-- Una FK obligatoria hacia una tabla sin filas es un INSERT imposible.
SELECT c.table_name, c.constraint_name,
       p.owner AS PADRE_OWNER, p.table_name AS PADRE_TABLA
  FROM all_constraints c
  JOIN all_constraints p ON p.owner = c.r_owner
                        AND p.constraint_name = c.r_constraint_name
 WHERE c.owner = 'RHH' AND c.constraint_type = 'R'
 ORDER BY p.table_name, c.table_name;


-- =====================================================
-- LO QUE SE ESPERA
-- =====================================================
--   A1/A2  La columna obligatoria de PRDN que nadie esta llenando. La
--          hipotesis del backend es PRDNFCHR (fechaRegistro): la pantalla
--          manda usuarioRegistro y no manda la fecha. Si se confirma, el
--          sellado de auditoria opt-in ya escrito lo cierra al publicarse.
--   B1     Muchas filas: es el estilo normal de RHH. Lo que se busca son las
--          columnas que ninguna entidad mapea o que ninguna capa rellena.
--   B2     Pocas o ninguna.
--   C1     CERO filas en las tres. Si aparece algo, el script 12 no corrio.
--   C2     Una fila con CFNMCTMR = 9678, el rubro 223 con 7 detalles, SLOF en 0.
--   C3     El producto PAGO DE NOMINA; PRNMHRIN 19 y PRNMHRFN 6; ocho
--          detalles del 23 al 30 en el rubro 221.
--   D      Ninguna FK apuntando a una tabla que este vacia.
