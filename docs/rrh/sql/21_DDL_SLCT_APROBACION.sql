-- =====================================================
-- MODULO: RHH - LAS DOS COLUMNAS DE APROBACION QUE FALTAN EN SLCT
-- DESCRIPCION: SolicitudVacaciones mapea SLCTAPRB y SLCTFHAP, y ningun
--              script del 01 al 20 las crea. GET /rest/slct/getAll muere
--              con ORA-00904.
-- ORDEN DE EJECUCION: 21
-- FECHA: 2026-08-20
-- =====================================================
-- POR QUE CREARLAS Y NO RETIRAR EL MAPEO
--   Porque el dominio las necesita. SLCTESTD nace con DEFAULT 'SOLICITADA':
--   la solicitud de vacaciones tiene flujo de aprobacion por diseno, y una
--   aprobacion sin quien ni cuando no es una aprobacion, es un cambio de
--   estado anonimo. Retirar el mapeo arreglaria el sintoma y dejaria el
--   modelo peor.
--
--   Ademas no es solo la entidad: SolicitudVacacionesDaoServiceImpl las
--   declara en obtieneCampos(), asi que selectByCriteria tambien esta roto,
--   no unicamente el getAll.
--
-- ALCANCE
--   Aditivo puro. Dos columnas nuevas, ambas nulables y sin default. Nada
--   que exista hoy cambia de conducta, y las filas actuales quedan con las
--   dos en nulo, que es lo correcto: no estan aprobadas.
--
-- POR QUE ES IDEMPOTENTE
--   El error de Oracle se detiene en el PRIMER identificador invalido, asi
--   que SLCTFHAP salio nombrada y de SLCTAPRB no sabemos si existe. El
--   bloque de abajo agrega solo lo que falta y no falla si ya esta.
-- =====================================================


-- =====================================================
-- PASO 0: QUE HAY HOY
-- =====================================================
SELECT column_name, data_type, nullable
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'SLCT'
 ORDER BY column_id;


-- =====================================================
-- PASO 1: AGREGAR LO QUE FALTE
-- =====================================================
DECLARE
    n NUMBER;
BEGIN
    SELECT COUNT(*) INTO n FROM all_tab_columns
     WHERE owner = 'RHH' AND table_name = 'SLCT' AND column_name = 'SLCTAPRB';
    IF n = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE RHH.SLCT ADD (SLCTAPRB VARCHAR2(60))';
        DBMS_OUTPUT.PUT_LINE('SLCTAPRB creada');
    ELSE
        DBMS_OUTPUT.PUT_LINE('SLCTAPRB ya existia');
    END IF;

    SELECT COUNT(*) INTO n FROM all_tab_columns
     WHERE owner = 'RHH' AND table_name = 'SLCT' AND column_name = 'SLCTFHAP';
    IF n = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE RHH.SLCT ADD (SLCTFHAP DATE)';
        DBMS_OUTPUT.PUT_LINE('SLCTFHAP creada');
    ELSE
        DBMS_OUTPUT.PUT_LINE('SLCTFHAP ya existia');
    END IF;
END;
/

COMMENT ON COLUMN RHH.SLCT.SLCTAPRB IS 'Usuario que aprobo la solicitud de vacaciones';
COMMENT ON COLUMN RHH.SLCT.SLCTFHAP IS 'Fecha de aprobacion de la solicitud de vacaciones';


-- =====================================================
-- PASO 2: COMPROBACION
-- =====================================================
-- Esperado: las dos, nulables, VARCHAR2(60) y DATE.
SELECT column_name, data_type, data_length, nullable
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'SLCT'
   AND column_name IN ('SLCTAPRB','SLCTFHAP');

-- Y la prueba de verdad, que es contra el servicio:
--   GET /SaaBE/rest/slct/getAll  ->  200, no ORA-00904.


-- =====================================================
-- LA LECCION, QUE ES LA MISMA DE RSMNFNTE
-- =====================================================
-- Una entidad puede declarar columnas que la base no tiene y nadie se
-- entera hasta que alguien llama al endpoint. No lo ve el compilador, no lo
-- ve el arranque -- Hibernate no valida el esquema en este despliegue -- y
-- no lo vio el barrido de NOT NULL, que solo mira columnas que existen.
--
-- El barrido que SI lo veria es el inverso: cada @Column de cada entidad de
-- RHH contra all_tab_columns. Vale la pena correrlo entero antes del primer
-- commit; SLCT aparecio de casualidad, haciendo inventario para otra cosa.
