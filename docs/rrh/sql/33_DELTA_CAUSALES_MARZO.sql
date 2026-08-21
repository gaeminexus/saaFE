-- =====================================================
-- MODULO: RHH - LA CAUSAL DE PERIODO DE PRUEBA Y DOS CORRECCIONES AL CATALOGO
-- DESCRIPCION: Crea la causal que marzo necesita, y corrige dos filas del
--              script 07 que el barrido bandera por bandera destapo.
-- ORDEN DE EJECUCION: 33
-- PARAMETRO: :EMPRESA -- 1236
-- FECHA: 2026-08-20
-- =====================================================
-- POR QUE AHORA
--   Castro Arce y Cevallos Aleman salen el 06-03-2026 por terminacion
--   dentro del periodo de prueba, y **ninguna de las diez causales del
--   script 07 es esa**. Sin ella, marzo no se puede cerrar. Es un hueco del
--   catalogo original, no del motor.
--
--   Se revisaron las diez bandera por bandera contra lo que el motor hace
--   con cada una, sin dar ninguna por buena despues de que el despido
--   intempestivo resultara tener el desahucio encendido. Salieron dos mas.
--
-- LAS BANDERAS, Y QUE HACE EL MOTOR CON CADA UNA
--   CSTRDSHC  genera bonificacion por desahucio  (Art. 185: 25 % por anio)
--   CSTRDSPD  genera indemnizacion por despido   (Art. 188: 3 remuneraciones
--                                                  hasta 3 anios, una por anio
--                                                  despues)
--   CSTRVCPR  paga vacaciones proporcionales
--   CSTRDCPR  paga decimos proporcionales
--   CSTRJBPT  genera jubilacion patronal
--   CSTRAVSL  requiere aviso de salida al IESS
--   CSTRACSU  requiere acta de finiquito en el SUT
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
SELECT CSTRALTR, CSTRNMBR, CSTRARTC,
       CSTRDSHC AS DSHC, CSTRDSPD AS DSPD, CSTRVCPR AS VCPR,
       CSTRDCPR AS DCPR, CSTRJBPT AS JBPT
  FROM RHH.CSTR WHERE PJRQCDGO = :EMPRESA ORDER BY CSTRALTR;
-- Esperado: diez filas, alternos 1 a 10, y ninguna de periodo de prueba.


-- =====================================================
-- PASO 1: LA CAUSAL DE PERIODO DE PRUEBA
-- =====================================================
-- Art. 15 del Codigo del Trabajo: durante los primeros noventa dias
-- cualquiera de las partes puede dar por terminado el contrato sin
-- indemnizacion. Por eso DSHC y DSPD van en 'N'. Los proporcionales si se
-- pagan: el trabajo se hizo.
INSERT INTO RHH.CSTR (
    PJRQCDGO, CSTRNMBR, CSTRALTR, CSTRARTC,
    CSTRDSHC, CSTRDSPD, CSTRVCPR, CSTRDCPR, CSTRJBPT, CSTRAVSL, CSTRACSU,
    CSTRESTD, CSTRUSRR
)
SELECT :EMPRESA, 'Terminacion en periodo de prueba', 11, 'Art. 15',
       'N', 'N', 'S', 'S', 'N', 'S', 'S',
       1, 'CARGA'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM RHH.CSTR
                    WHERE PJRQCDGO = :EMPRESA AND CSTRALTR = 11);


-- =====================================================
-- PASO 2: LIQUIDACION DE LA EMPRESA -- la misma inversion que el despido
-- =====================================================
-- Estaba con DSHC='S' y DSPD='N'. Su propio articulo, el 193, remite a la
-- indemnizacion del 188: es despido, no desahucio. Exactamente el error que
-- el script 32 corrigio en la causal 4, en otra fila.
UPDATE RHH.CSTR
   SET CSTRDSHC = 'N', CSTRDSPD = 'S'
 WHERE PJRQCDGO = :EMPRESA AND CSTRALTR = 9;


-- =====================================================
-- PASO 3: JUBILACION -- el articulo equivocado
-- =====================================================
-- Decia «Art. 188», que es el del despido intempestivo. No cambia ningun
-- calculo, pero se imprime en el acta. La jubilacion patronal es el 216.
UPDATE RHH.CSTR
   SET CSTRARTC = 'Art. 216'
 WHERE PJRQCDGO = :EMPRESA AND CSTRALTR = 7;

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION
-- =====================================================
SELECT CSTRALTR, CSTRNMBR, CSTRARTC,
       CSTRDSHC AS DSHC, CSTRDSPD AS DSPD, CSTRVCPR AS VCPR,
       CSTRDCPR AS DCPR, CSTRJBPT AS JBPT
  FROM RHH.CSTR WHERE PJRQCDGO = :EMPRESA ORDER BY CSTRALTR;
-- Esperado: once filas. La 11 con todo en 'N' salvo los proporcionales;
-- la 9 con DSPD='S' y DSHC='N'; la 7 con 'Art. 216'.

-- Ninguna causal con las dos indemnizaciones a la vez:
SELECT CSTRALTR, CSTRNMBR FROM RHH.CSTR
 WHERE PJRQCDGO = :EMPRESA AND CSTRDSHC = 'S' AND CSTRDSPD = 'S';
-- Esperado: cero filas.


-- =====================================================
-- LO QUE QUEDA ABIERTO, Y A PROPOSITO
-- =====================================================
-- RENUNCIA VOLUNTARIA (1) sigue con DSHC='N'. El Art. 185 da la bonificacion
-- por desahucio al trabajador que renuncia, asi que cabria encenderla. NO se
-- hace aqui, por dos razones:
--
--   1. Encenderla no reproduce el neto de Benitez Montes: con la formula
--      actual --25 % prorrateado por anios de servicio-- daria 51,31 y el
--      neto quedaria a 127,52 del banco. Solo sin prorratear (175,00) se
--      acerca, y aun asi a 3,83.
--   2. Eso convierte la pregunta en otra: no es «falta el desahucio», es
--      «se prorratea o no por debajo del anio». El Art. 185 dice «por cada
--      uno de los anios de servicio»; la practica de muchas liquidaciones
--      paga la fraccion. Es decision de formula, no de bandera, y no se
--      toma contra un numero sin acta.
--
-- Cuando llegue el acta de Benitez Montes --pedida al cliente-- la pregunta
-- ya esta formulada y el numero contra el que responder tambien.
