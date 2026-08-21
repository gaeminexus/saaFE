-- =====================================================
-- MODULO: RHH - LA CONVERSION DE RSMNFNTE QUE NO SE APLICO
-- DESCRIPCION: Los deltas 10 y 11 declaraban convertir RSMNFNTE de VARCHAR2
--              a NUMBER. Sus companeras MRCCTPOO y MRCCORGN si se
--              convirtieron; esta no. La entidad la mapea como Long.
-- ORDEN DE EJECUCION: 18 (despues del 17)
-- FECHA: 2026-08-20
-- =====================================================
-- COMO SE DESCUBRIO
--   Barriendo columnas de RHH con DEFAULT y CHECK NOT NULL a la vez -- el
--   patron que causo el ORA-02290 de PRDNFCHR. RSMNFNTE aparecio en esa
--   lista como:
--
--       RSMN   RSMNFNTE   VARCHAR2   'CALCULO'
--
--   Una columna re-creada por los deltas 10/11 no podria verse asi: al
--   agregarse de nuevo nace NUMBER, sin default y sin restriccion. Que
--   conserve el default de texto y el NOT NULL del script 05 significa que
--   sigue siendo la ORIGINAL. MRCCTPOO y MRCCORGN, en cambio, no aparecen
--   en el barrido -- prueba de que a ellas si se les aplico.
--
-- POR QUE IMPORTA
--   ResumenNomina.java:107-108 declara:
--       @Column(name = "RSMNFNTE") private Long fuente;
--   Leer una fila con RSMNFNTE = 'CALCULO' hacia un Long falla. Y el
--   frontend ya convirtio su modelo a number confiando en el delta.
--   Es la misma familia que Liquidacion.estado String contra LQDCESTD
--   NUMBER: el codigo cree un tipo y la columna es otro.
--
--   No ha estallado porque la fase 7 aun no ha escrito ni leido resumenes
--   con datos reales. Estallaria en la primera consolidacion de marcaciones
--   de la carga historica.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA -- correr esto ANTES
-- =====================================================
-- Esperado si el diagnostico es correcto: VARCHAR2, con DATA_DEFAULT
-- 'CALCULO'. Si dice NUMBER, el delta si se aplico y este script NO hace
-- falta: parar aqui.
SELECT column_name, data_type, data_length, nullable, data_default
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'RSMN' AND column_name = 'RSMNFNTE';

-- Y cuantas filas hay que se perderian. Esperado hoy: 0.
SELECT COUNT(*) AS FILAS_RSMN, COUNT(RSMNFNTE) AS CON_FUENTE FROM RHH.RSMN;


-- =====================================================
-- PASO 1: LA CONVERSION
-- =====================================================
-- Identica a la que los deltas 10 y 11 aplicaron a MRCCTPOO y MRCCORGN.
-- Se borra y se recrea en vez de convertir en sitio porque el contenido es
-- texto libre ('CALCULO', 'IMPORTACION'...) que no convierte a numero, y
-- porque asi se van con ella el DEFAULT de texto y el CHECK NOT NULL --
-- que es justo lo que hay que quitar.
ALTER TABLE RHH.RSMN DROP COLUMN RSMNFNTE;
ALTER TABLE RHH.RSMN ADD (RSMNFNTE NUMBER);

COMMENT ON COLUMN RHH.RSMN.RSMNFNTE IS 'Origen del resumen diario: detalle del rubro RHH_ORIGEN_MARCACION (193)';


-- =====================================================
-- PASO 2: COMPROBACION POSTERIOR
-- =====================================================
-- Esperado: NUMBER, nullable Y, sin default.
SELECT column_name, data_type, nullable, data_default
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'RSMN' AND column_name = 'RSMNFNTE';

-- Y que no quede ningun CHECK NOT NULL sobre ella.
SELECT constraint_name, search_condition_vc
  FROM all_constraints
 WHERE owner = 'RHH' AND table_name = 'RSMN' AND constraint_type = 'C'
   AND UPPER(search_condition_vc) LIKE '%RSMNFNTE%';


-- =====================================================
-- NOTA PARA QUIEN VENGA DESPUES
-- =====================================================
-- La leccion no es que faltara un ALTER. Es que un delta puede aplicarse a
-- medias sin que nadie se entere: los deltas 10 y 11 llevaban las tres
-- conversiones juntas y solo dos surtieron efecto. Ninguna comprobacion
-- posterior las miro una por una -- se dio por bueno el conjunto.
-- Los scripts de este modulo llevan bloque de comprobacion por ese motivo,
-- y hay que correrlos, no solo leerlos.
