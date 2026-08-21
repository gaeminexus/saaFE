-- =====================================================
-- MODULO: RHH - LA TARIFA DIARIA DE VACACIONES NECESITA CUATRO DECIMALES
-- DESCRIPCION: SLDVVLDI pasa de NUMBER(18,2) a NUMBER(18,4), y las 22 filas
--              de la apertura se recalculan desde su saldo. Sin revertir.
-- ORDEN DE EJECUCION: 30
-- FECHA: 2026-08-20
-- =====================================================
-- EL DEFECTO
--   SLDV no guarda el importe del saldo de vacaciones: guarda **dias y
--   tarifa**, y el importe se reconstruye multiplicando. Con la tarifa
--   redondeada a dos decimales, multiplicar de vuelta no devuelve el
--   original:
--
--       505,83 / 7,75 = 65,268387...  ->  redondeado a 2: 65,27
--       7,75 * 65,27  = 505,84        ->  un centimo de mas
--
--   Sobre las 22 filas de la apertura el total sale 3.637,75 en vez de
--   3.637,61: **catorce centimos**, repartidos en 17 filas.
--
-- POR QUE LA PRECISION ESTA EN EL LADO EQUIVOCADO
--   Hoy los dias son NUMBER(18,4) y la tarifa NUMBER(18,2). Es al reves de
--   lo que conviene: **los dias son un conteo y la tarifa es el factor que
--   se multiplica**. La precision hay que ponerla donde el error se
--   amplifica, y aqui cada centesima de tarifa se multiplica por los dias.
--
--   Con cuatro decimales: 505,83 / 7,75 = 65,2684 y 7,75 * 65,2684 =
--   505,8301, que redondea a 505,83. Cierra exacto.
--
-- POR QUE IMPORTA MAS ALLA DE LOS CATORCE CENTIMOS
--   No es un desvio de la carga -- el importe original sigue intacto en
--   SLAP. Es que **cada pago de vacaciones futuro se calcula asi**: dias
--   por tarifa. Con la tarifa a dos decimales, todo pago de vacaciones y
--   toda liquidacion arrastra el mismo sesgo, y se acumula de forma que
--   despues nadie sabe explicar.
--
--   Es la misma familia que la regla 4 del maestro -- redondear por renglon
--   frente a redondear el total -- en su version multiplicativa.
--
-- POR QUE ES ADITIVO Y NO HACE FALTA REAPLICAR
--   Ampliar la escala de una columna de (18,2) a (18,4) no trunca nada ni
--   cambia el significado de lo que ya hay. Y las 22 filas se recalculan
--   con un UPDATE contra su propio saldo, sin revertir ni volver a aplicar:
--   la trazabilidad SLAPRFTB/SLAPRFID permite emparejar cada SLDV con el
--   SLAP que lo creo.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Esperado: SLDVVLDI en NUMBER(18,2), y el total reconstruido en 3.637,75
-- contra los 3.637,61 del saldo.
SELECT column_name, data_type, data_precision, data_scale
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'SLDV'
   AND column_name IN ('SLDVVLDI','SLDVASGN','SLDVPNDE');

SELECT COUNT(*) AS FILAS,
       ROUND(SUM(SLDVASGN), 2)                AS DIAS,
       ROUND(SUM(SLDVASGN * SLDVVLDI), 2)     AS VALOR_RECONSTRUIDO
  FROM RHH.SLDV;
-- Esperado: 22 · 103,47 · 3.637,75

SELECT ROUND(SUM(SLAPVLOR), 2) AS VALOR_DEL_SALDO
  FROM RHH.SLAP WHERE SLAPTPSL = 2;
-- Esperado: 3.637,61


-- =====================================================
-- PASO 1: AMPLIAR LA ESCALA
-- =====================================================
-- OJO: NUMBER(18,4) NO sirve, y da ORA-01440.
--   Oracle no mira la escala, mira los digitos ENTEROS: (18,2) tiene 16 y
--   (18,4) solo 14, asi que lo interpreta como una REDUCCION y exige la
--   columna vacia. Hay que subir la precision para compensar la escala.
--   (20,4) deja los mismos 16 enteros que habia: es ampliacion pura.
ALTER TABLE RHH.SLDV MODIFY (SLDVVLDI NUMBER(20,4));

COMMENT ON COLUMN RHH.SLDV.SLDVVLDI IS 'Valor del dia de vacaciones. Cuatro decimales a proposito: es el factor que se multiplica por los dias, y a dos decimales el producto no devuelve el importe original';


-- =====================================================
-- PASO 2: RECALCULAR LAS 22 FILAS DESDE SU SALDO
-- =====================================================
-- Se emparejan por la trazabilidad que dejo la migracion, no por cedula:
-- SLAPRFTB dice la tabla y SLAPRFID la fila que creo. Es lo que permite
-- corregir sin revertir.
--
-- OJO CON EL VALOR DE SLAPRFTB: guarda **'RHH.SLDV'**, con el esquema
-- delante, no 'SLDV'. Comparar contra 'SLDV' hace que el UPDATE no
-- encuentre ninguna fila -- y **un UPDATE que no encuentra nada no da
-- error**: dice «0 filas actualizadas» y parece que corrio.
--
-- Es el mismo modo de fallo del bloque DECLARE del script 21, que «corrio»
-- sin error y no hizo nada. En los dos casos lo unico que lo destapa es la
-- consulta de comprobacion posterior. **Mirar siempre cuantas filas dice
-- que toco**, y si no coincide con lo esperado, parar.
UPDATE RHH.SLDV v
   SET v.SLDVVLDI = (
        SELECT ROUND(a.SLAPVLOR / a.SLAPDIAS, 4)
          FROM RHH.SLAP a
         WHERE a.SLAPRFTB = 'RHH.SLDV'
           AND a.SLAPRFID = v.SLDVCDGO
           AND a.SLAPTPSL = 2
           AND a.SLAPDIAS > 0)
 WHERE EXISTS (
        SELECT 1 FROM RHH.SLAP a
         WHERE a.SLAPRFTB = 'RHH.SLDV'
           AND a.SLAPRFID = v.SLDVCDGO
           AND a.SLAPTPSL = 2
           AND a.SLAPDIAS > 0);

COMMIT;


-- =====================================================
-- PASO 3: COMPROBACION -- ahora tiene que cerrar
-- =====================================================
SELECT COUNT(*) AS FILAS,
       ROUND(SUM(SLDVASGN), 2)            AS DIAS,
       ROUND(SUM(SLDVASGN * SLDVVLDI), 2) AS VALOR_RECONSTRUIDO
  FROM RHH.SLDV;
-- Esperado: 22 · 103,47 · **3.637,61** -- el mismo del saldo.

-- Y fila por fila, que ninguna se desvie mas de un centimo:
SELECT m.MPLDAPLL, v.SLDVASGN AS DIAS, v.SLDVVLDI AS TARIFA,
       ROUND(v.SLDVASGN * v.SLDVVLDI, 2) AS RECONSTRUIDO,
       a.SLAPVLOR AS DEL_SALDO,
       ROUND(v.SLDVASGN * v.SLDVVLDI - a.SLAPVLOR, 2) AS DIFERENCIA
  FROM RHH.SLDV v
  JOIN RHH.SLAP a ON a.SLAPRFTB = 'RHH.SLDV' AND a.SLAPRFID = v.SLDVCDGO AND a.SLAPTPSL = 2
  JOIN RHH.MPLD m ON m.MPLDCDGO = v.MPLDCDGO
 ORDER BY ABS(ROUND(v.SLDVASGN * v.SLDVVLDI - a.SLAPVLOR, 2)) DESC;
-- Esperado: 22 filas, todas con DIFERENCIA 0,00.
-- Las cuatro con adenda deben conservar su tarifa mezclada -- Torres cerca
-- de 65,2684, no de 66,67 -- que es la senal de que salio por tramos.


-- =====================================================
-- LO QUE FALTA EN JAVA
-- =====================================================
-- aplicaVacaciones debe redondear la tarifa a CUATRO decimales, no a dos, o
-- la proxima migracion vuelve a introducir el sesgo:
--
--     registro.setValorDia(RedondeoNomina.divideTarifa(saldo.getValor(), saldo.getDias()));
--
-- Y la regla general, que conviene que quede dicha en el maestro junto a la
-- regla 4: **los importes se redondean a dos decimales; las tarifas y los
-- factores, no.** Un importe es lo que se paga y tiene centimos; una tarifa
-- es un intermedio que se multiplica, y redondearla mueve el resultado.
--
-- Revisar de paso si hay mas tarifas guardadas a dos decimales: valorHora
-- del contrato (CNTEVLHR) es candidata -- se multiplica por horas extra, y
-- el mismo razonamiento aplica.
