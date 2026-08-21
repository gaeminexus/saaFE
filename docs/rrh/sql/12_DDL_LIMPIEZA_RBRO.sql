-- =====================================================
-- MODULO: RHH - RETIRO DEL CATALOGO MUERTO RBRO
-- DESCRIPCION: Elimina RBROCDGO de RHH.RNGL y RHH.TMLQ, y la tabla
--              RHH.RBRO. Son vestigios del diseno anterior a RHH.CPNM.
-- ORDEN DE EJECUCION: 12
-- FECHA: 2026-08-19
-- =====================================================
-- POR QUE
--   RNGL (renglon de nomina) y TMLQ (detalle de liquidacion) apuntaban las
--   dos a un catalogo propio RHH.RBRO. El diseno nuevo lo sustituyo por
--   CPNMCDGO --las FK que agrego el script 05-- pero nadie retiro la
--   columna vieja en ninguna de las dos.
--
--   Quedo NOT NULL, declarado como CHECK con nombre de sistema, con FK a
--   una tabla vacia. Resultado: NINGUNA fila puede insertarse en esas dos
--   tablas, porque no existe valor valido que poner.
--
--   En RNGL es lo que bloquea el calculo de nomina hoy.
--   En TMLQ habria bloqueado la liquidacion de haberes en la fase 8, y no
--   lo habriamos sabido hasta entonces.
--
-- EVIDENCIA DE QUE RBRO ESTA MUERTA (verificado el 2026-08-19)
--   - Ninguna entidad JPA la mapea: cero @Table(name="RBRO").
--   - Ni ReglonNomina ni DetalleLiquidacion declaran RBROCDGO. ReglonNomina
--     declara CPNMCDGO, su reemplazo; en DetalleLiquidacion la FK a CPNM
--     existe en la base (script 05) pero el campo Java todavia no --es parte
--     del trabajo de la fase 8. [Corregido el 2026-08-19: la version
--     original afirmaba que ambas declaraban CPNMCDGO, y era falso para
--     DetalleLiquidacion. No cambia nada de lo que el script hace.]
--   - Ningun @Path("rbro") en la capa REST.
--   - Cero menciones de RBRO o RBROCDGO en todo src/main/java.
--   - Cero filas en la tabla.
--   - En la fase 0 se elimino del frontend la constante RS_RBRO, que
--     apuntaba a ese endpoint inexistente. Mismo vestigio, otra capa.
--
-- SOBRE EL ORA-02449
--   Si al ejecutar la primera version de este script fallo el DROP TABLE
--   con "claves unicas/primarias referidas por claves ajenas", era TMLQ:
--   se retiro la FK de RNGL pero no la suya. Esta version cubre las dos.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION DE SEGURIDAD - EJECUTAR ANTES
-- =====================================================
-- Cualquier OTRA tabla que dependa de RBRO. DEBE DEVOLVER CERO FILAS.
-- Si aparece una tabla distinta de RNGL y TMLQ, DETENERSE y revisarla:
-- significa que RBRO no esta tan muerta como indica el codigo.
--
--   SELECT c.owner, c.table_name, c.constraint_name
--     FROM all_constraints c
--     JOIN all_constraints p ON p.owner = c.r_owner
--                           AND p.constraint_name = c.r_constraint_name
--    WHERE c.constraint_type = 'R'
--      AND p.table_name = 'RBRO'
--      AND c.table_name NOT IN ('RNGL','TMLQ');
--
-- Y confirmar que sigue vacia:
--   SELECT COUNT(*) FROM RHH.RBRO;   -- 0


-- =====================================================
-- PASO 1: RETIRAR RESTRICCIONES Y COLUMNA EN AMBAS TABLAS
-- =====================================================
-- El NOT NULL esta declarado como CHECK con nombre de sistema (SYS_Cnnnnn),
-- asi que se resuelve en ejecucion. El bloque tolera que algo ya no exista,
-- de modo que puede reejecutarse tras una corrida parcial.
DECLARE
    TYPE t_lista IS TABLE OF VARCHAR2(30);
    v_tablas t_lista := t_lista('RNGL', 'TMLQ');
    v_existe NUMBER;
BEGIN
    FOR i IN 1 .. v_tablas.COUNT LOOP

        -- FK hacia RBRO
        FOR c IN (SELECT constraint_name
                    FROM all_constraints
                   WHERE owner = 'RHH'
                     AND table_name = v_tablas(i)
                     AND constraint_type = 'R'
                     AND r_constraint_name IN (SELECT constraint_name
                                                 FROM all_constraints
                                                WHERE owner = 'RHH'
                                                  AND table_name = 'RBRO')) LOOP
            EXECUTE IMMEDIATE 'ALTER TABLE RHH.' || v_tablas(i)
                              || ' DROP CONSTRAINT ' || c.constraint_name;
            DBMS_OUTPUT.PUT_LINE(v_tablas(i) || ': FK eliminada -> ' || c.constraint_name);
        END LOOP;

        -- CHECK que impone el NOT NULL sobre RBROCDGO
        FOR c IN (SELECT constraint_name
                    FROM all_constraints
                   WHERE owner = 'RHH'
                     AND table_name = v_tablas(i)
                     AND constraint_type = 'C'
                     AND search_condition_vc LIKE '%RBROCDGO%') LOOP
            EXECUTE IMMEDIATE 'ALTER TABLE RHH.' || v_tablas(i)
                              || ' DROP CONSTRAINT ' || c.constraint_name;
            DBMS_OUTPUT.PUT_LINE(v_tablas(i) || ': CHECK eliminado -> ' || c.constraint_name);
        END LOOP;

        -- La columna
        SELECT COUNT(*) INTO v_existe
          FROM all_tab_columns
         WHERE owner = 'RHH' AND table_name = v_tablas(i) AND column_name = 'RBROCDGO';

        IF v_existe > 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE RHH.' || v_tablas(i) || ' DROP COLUMN RBROCDGO';
            DBMS_OUTPUT.PUT_LINE(v_tablas(i) || ': columna RBROCDGO eliminada');
        ELSE
            DBMS_OUTPUT.PUT_LINE(v_tablas(i) || ': la columna ya no existia');
        END IF;

    END LOOP;
END;
/


-- =====================================================
-- PASO 2: RETIRAR LA TABLA
-- =====================================================
-- Ya sin dependientes. Si aun asi diera ORA-02449, volver al paso 0: hay
-- un tercer dependiente que no habiamos visto.
DROP TABLE RHH.RBRO PURGE;

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 1) La columna ya no existe en ninguna de las dos (cero filas):
-- SELECT table_name, column_name FROM all_tab_columns
--  WHERE owner = 'RHH' AND column_name = 'RBROCDGO';
--
-- 2) La tabla ya no existe (cero filas):
-- SELECT table_name FROM all_tables WHERE owner = 'RHH' AND table_name = 'RBRO';
--
-- 3) Ambas conservan su FK correcta hacia CPNM:
-- SELECT table_name, constraint_name FROM all_constraints
--  WHERE owner = 'RHH' AND table_name IN ('RNGL','TMLQ') AND constraint_type = 'R';
--   Deben seguir FK_RNGL_CPNM y FK_TMLQ_CPNM, mas las de NMNA y LQDC.
--
-- 4) BARRIDO GENERAL - vale la pena hacerlo ahora.
--    En este esquema los NOT NULL estan declarados como CHECK con nombre de
--    sistema, asi que all_tab_columns.nullable dice 'Y' y no sirve para
--    auditarlos. Esta es la consulta que si los encuentra:
--
-- SELECT table_name, search_condition_vc FROM all_constraints
--  WHERE owner = 'RHH' AND constraint_type = 'C'
--    AND search_condition_vc LIKE '%NOT NULL%'
--  ORDER BY table_name;
--
--    Contrastar cada columna obligatoria contra las que el motor llena.
--    Es como se encontro este defecto, y es la unica forma de encontrar
--    los que queden en las tablas de las fases 6 a 9.
