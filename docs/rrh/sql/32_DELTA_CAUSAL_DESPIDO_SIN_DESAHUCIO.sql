-- =====================================================
-- MODULO: RHH - EL DESPIDO INTEMPESTIVO NO PAGA BONIFICACION POR DESAHUCIO
-- DESCRIPCION: CSTRDSHC pasa a 'N' en la causal de despido intempestivo.
--              Es parametria, no codigo.
-- ORDEN DE EJECUCION: 32
-- PARAMETRO: :EMPRESA -- 1236
-- FECHA: 2026-08-20
-- =====================================================
-- EL HALLAZGO
--   Al simular el finiquito de Torres Chavez, el motor pago 279,45 de
--   bonificacion por desahucio que el acta del Ministerio del Trabajo no
--   incluye. La causal 4 «Despido intempestivo» esta cargada con
--   CSTRDSHC = 'S' y CSTRDSPD = 'S', y el motor honra las dos banderas:
--
--       2.000 x 25 % x 0,5589 anios = 279,45
--
--   El motor hizo lo correcto con el dato que tenia. El dato es el que
--   esta mal.
--
-- POR QUE MANDA EL ACTA
--   El formulario del MDT tiene **las dos lineas** y rellena una:
--   «Bonificacion 25 %» en **0,00** e «Indemnizacion por despido
--   intempestivo» en 6.000,00. No es una omision del cliente: es el propio
--   formulario oficial, con su QR de validacion, decidiendo que en un
--   despido intempestivo se paga el Art. 188 y no el 185.
--
--   El acta 14807288ACF es el documento con valor legal de esta
--   terminacion, y la regla 6 dice que el control externo manda sobre
--   nuestra suposicion.
--
-- Y POR QUE ESTA PARAMETRIZADO, QUE ES LO QUE IMPORTA
--   Hay jurisprudencia en los dos sentidos sobre si el despido intempestivo
--   acumula la bonificacion del Art. 185. Precisamente por eso vive en una
--   bandera del catalogo y no en el codigo: si el criterio legal del cliente
--   cambia, o si otro cliente liquida distinto, es un UPDATE.
--
--   **No se toca el motor.** Lo que se corrige es la afirmacion del
--   catalogo sobre lo que esta causal genera.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Ver las causales y sus banderas, para tocar la correcta.
SELECT CSTRCDGO, CSTRALTR, CSTRNMBR, CSTRARTC,
       CSTRDSHC AS DESAHUCIO, CSTRDSPD AS DESPIDO,
       CSTRVCPR AS VAC_PROP, CSTRDCPR AS DEC_PROP, CSTRJBPT AS JUB_PATR
  FROM RHH.CSTR
 WHERE PJRQCDGO = :EMPRESA
 ORDER BY CSTRALTR;
-- Esperado: la de despido intempestivo con DESAHUCIO = 'S' y DESPIDO = 'S'.


-- =====================================================
-- PASO 1: LA CORRECCION
-- =====================================================
-- Se identifica por el nombre y no por el codigo: CSTRCDGO es IDENTITY y
-- cambia entre instalaciones.
UPDATE RHH.CSTR
   SET CSTRDSHC = 'N'
 WHERE PJRQCDGO = :EMPRESA
   AND UPPER(CSTRNMBR) LIKE '%DESPIDO INTEMPESTIVO%';

COMMIT;


-- =====================================================
-- PASO 2: COMPROBACION
-- =====================================================
-- La de despido intempestivo debe quedar con DESAHUCIO 'N' y DESPIDO 'S'.
-- Y la de DESAHUCIO propiamente dicho, si existe, debe conservar su 'S':
-- son dos causales distintas y esta correccion no la toca.
SELECT CSTRALTR, CSTRNMBR, CSTRDSHC AS DESAHUCIO, CSTRDSPD AS DESPIDO
  FROM RHH.CSTR
 WHERE PJRQCDGO = :EMPRESA
 ORDER BY CSTRALTR;

-- Cuantas causales pagan cada cosa, para ver el cuadro completo de un vistazo:
SELECT CSTRDSHC AS DESAHUCIO, CSTRDSPD AS DESPIDO, COUNT(*) AS CAUSALES,
       LISTAGG(CSTRNMBR, ' | ') WITHIN GROUP (ORDER BY CSTRALTR) AS CUALES
  FROM RHH.CSTR WHERE PJRQCDGO = :EMPRESA
 GROUP BY CSTRDSHC, CSTRDSPD;
-- Ninguna causal deberia quedar con las DOS en 'S'. Si alguna lo esta,
-- mirarla: es el mismo defecto en otra fila.


-- =====================================================
-- LO QUE SE ESPERA DESPUES
-- =====================================================
-- Al volver a simular el finiquito de Torres Chavez, el renglon de
-- bonificacion por desahucio desaparece y los ingresos bajan de 7.382,86 a
-- 7.103,41. Con las vacaciones ya en 547,50 -- que es el otro arreglo, el
-- del motor -- daran los 7.650,91 del acta y el neto los 7.556,41.
--
-- Los dos arreglos son independientes y se pueden verificar por separado:
-- este solo, sin el de vacaciones, ya debe quitar los 279,45.
