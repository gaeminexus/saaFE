-- =====================================================
-- MODULO: RHH - GASTOS PERSONALES 2026 Y LA CARGA FAMILIAR DE VITERI
-- DESCRIPCION: Lo que el archivo de renta del cliente declara y el guion de
--              apertura no cargo. Sin esto el motor retiene IR a siete
--              personas a las que ASOPREP no retiene.
-- ORDEN DE EJECUCION: 34
-- PARAMETRO: :EMPRESA -- 1236
-- FECHA: 2026-08-20
-- =====================================================
-- EL DESCUADRE QUE EXPLICA
--   El contraste de enero dio 310,64 de IR que el rol no retiene, en siete
--   personas. Seis de ellas declararon gastos personales en el archivo
--   «Trabajadores Ret Imp Renta Mensual 2026.xlsx» (REF-04 §1.4) y su
--   proyeccion da cero a retener. Nadie cargo esos gastos en GSPR: es un
--   hueco del GUION-CARGA-APERTURA, no del motor.
--
--   La septima, Robayo, NO declaro gastos y si le corresponde retencion
--   (242,00 al anio). Pero el cliente la arranca en AGOSTO, no en enero.
--   Eso no se resuelve cargando datos: es una pregunta de politica que se
--   trata aparte, en la nota del final.
--
-- COMO LO LEE EL MOTOR -- y por que hay un paso de invalidacion
--   RetencionRentaServiceImpl.obtenerRetencionMensual lee la retencion de
--   PYIR, la proyeccion vigente. Si no hay, la genera en linea y la deja
--   persistida con PYIRVGNT = 'S'. **Enero ya se calculo**, asi que las
--   siete proyecciones YA EXISTEN, sin gastos, y marcadas vigentes.
--   Cargar GSPR ahora no las toca: hay que invalidarlas para que el proximo
--   calculo las regenere leyendo los gastos.
--
--   Y el tope por cargas sale de CRGF: contarVigentesParaIr cuenta las
--   cargas con CRGFIRRB = 'S' vigentes al 31-dic. Viteri declara 1 carga y
--   eso le sube el tope de 5.752,60 a 7.396,20 -- sin la carga, sus 7.396
--   declarados se truncarian al tope de 0 cargas y le saldria retencion.
--
-- REGLA 6
--   Los importes son los del archivo del cliente, tal cual. No se ajustan
--   para que el IR de cero: si con ellos sigue saliendo retencion a alguien,
--   esa es la diferencia que hay que mirar, no el dato que hay que mover.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Esperado: GSPR vacia, CRGF vacia, y siete PYIR vigentes de 2026.
SELECT 'GSPR' AS TABLA, COUNT(*) AS FILAS FROM RHH.GSPR
UNION ALL SELECT 'CRGF', COUNT(*) FROM RHH.CRGF
UNION ALL SELECT 'PYIR vigentes 2026', COUNT(*) FROM RHH.PYIR
  WHERE PYIRANOO = 2026 AND PYIRVGNT = 'S';

-- Las siete, con lo que proyectaron sin gastos:
SELECT m.MPLDAPLL, p.PYIRINPR AS INGRESOS, p.PYIRGSDC AS GASTOS,
       p.PYIRTPGS AS TOPE, p.PYIRNCRG AS CARGAS, p.PYIRRTEM AS RET_MENSUAL
  FROM RHH.PYIR p JOIN RHH.MPLD m ON m.MPLDCDGO = p.MPLDCDGO
 WHERE p.PYIRANOO = 2026 AND p.PYIRVGNT = 'S'
 ORDER BY p.PYIRRTEM DESC;
-- Esperado: GASTOS 0 y CARGAS 0 en todas; RET_MENSUAL Viteri 89,76 ·
-- Manosalvas 68,02 · Cevallos M. 68,02 · Moscoso 24,33 · Pazmino J.,
-- Robayo y Rodriguez Z. 20,17.


-- =====================================================
-- PASO 1: LOS GASTOS DECLARADOS -- una fila por persona y tipo
-- =====================================================
-- Tipos del rubro 201 (RHH_TIPO_GASTO_PERSONAL):
--   1 VIVIENDA · 2 EDUCACION ARTE Y CULTURA · 3 ALIMENTACION ·
--   4 VESTIMENTA · 5 SALUD · 6 TURISMO
-- Solo se cargan los tipos con valor: un cero no es una declaracion.
-- La fecha de presentacion es el 31-ene, que es cuando se presenta el
-- anexo de gastos proyectados del ejercicio.
INSERT INTO RHH.GSPR (MPLDCDGO, GSPRANOO, GSPRTPGP, GSPRVLOR, GSPRFCPR,
                      GSPRVGNT, GSPRESTD, GSPRUSRR)
SELECT m.MPLDCDGO, 2026, d.TIPO, d.VLOR, DATE '2026-01-31', 'S', 1, 'CARGA'
  FROM (
    -- CEVALLOS MONTENEGRO JOHNNY STEVEN -- total 6.000
    SELECT '1311981953' CED, 1 TIPO,  500 VLOR FROM DUAL UNION ALL
    SELECT '1311981953', 5, 1000 FROM DUAL UNION ALL
    SELECT '1311981953', 2, 2000 FROM DUAL UNION ALL
    SELECT '1311981953', 3, 2000 FROM DUAL UNION ALL
    SELECT '1311981953', 4,  500 FROM DUAL UNION ALL
    -- MANOSALVAS LLERENA FERNANDO PAUL -- total 5.200
    SELECT '1716120769', 2, 4200 FROM DUAL UNION ALL
    SELECT '1716120769', 4,  500 FROM DUAL UNION ALL
    SELECT '1716120769', 6,  500 FROM DUAL UNION ALL
    -- MOSCOSO NOVILLO DIANA CECILIA -- total 15.960 (sobre el tope; se trunca)
    SELECT '0103179537', 5, 3000 FROM DUAL UNION ALL
    SELECT '0103179537', 2,  960 FROM DUAL UNION ALL
    SELECT '0103179537', 3, 5500 FROM DUAL UNION ALL
    SELECT '0103179537', 4, 2500 FROM DUAL UNION ALL
    SELECT '0103179537', 6, 4000 FROM DUAL UNION ALL
    -- PAZMIÑO JARAMILLO EDGAR ALBERTO -- total 2.300
    SELECT '0909917759', 1,  500 FROM DUAL UNION ALL
    SELECT '0909917759', 5,  300 FROM DUAL UNION ALL
    SELECT '0909917759', 2,  500 FROM DUAL UNION ALL
    SELECT '0909917759', 3,  550 FROM DUAL UNION ALL
    SELECT '0909917759', 4,  450 FROM DUAL UNION ALL
    -- RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES -- total 4.011
    SELECT '1712362720', 1,  861 FROM DUAL UNION ALL
    SELECT '1712362720', 5,  650 FROM DUAL UNION ALL
    SELECT '1712362720', 3, 2000 FROM DUAL UNION ALL
    SELECT '1712362720', 4,  500 FROM DUAL UNION ALL
    -- VITERI LOPEZ JIMENA DEL PILAR -- total 7.396, con 1 carga
    SELECT '1712232659', 1, 1200 FROM DUAL UNION ALL
    SELECT '1712232659', 5,  196 FROM DUAL UNION ALL
    SELECT '1712232659', 2, 3000 FROM DUAL UNION ALL
    SELECT '1712232659', 3, 2500 FROM DUAL UNION ALL
    SELECT '1712232659', 4,  500 FROM DUAL
  ) d
  JOIN RHH.MPLD m ON m.MPLDIDNT = d.CED AND m.PJRQCDGO = :EMPRESA;


-- =====================================================
-- PASO 2: LA CARGA FAMILIAR DE VITERI
-- =====================================================
-- El archivo de renta dice «1 carga» y nada mas: ni nombre, ni parentesco,
-- ni cedula. Se carga como HIJO (parentesco 3) con identificacion y nombres
-- pendientes, porque lo que el motor necesita para el tope es que exista
-- una carga con CRGFIRRB = 'S' vigente al 31-dic-2026. El dato real se
-- completa cuando el cliente lo de; la pantalla de cargas lo permite.
INSERT INTO RHH.CRGF (MPLDCDGO, CRGFPRNT, CRGFIDNT, CRGFAPLL, CRGFNMBR,
                      CRGFIRRB, CRGFUTIL, CRGFDPEC, CRGFFCIN, CRGFESTD, CRGFUSRR)
SELECT m.MPLDCDGO, 3, 'PENDIENTE', 'VITERI', 'CARGA DECLARADA 2026',
       'S', 'S', 'S', DATE '2026-01-01', 1, 'CARGA'
  FROM RHH.MPLD m
 WHERE m.MPLDIDNT = '1712232659' AND m.PJRQCDGO = :EMPRESA;


-- =====================================================
-- PASO 3: INVALIDAR LAS PROYECCIONES QUE SE HICIERON SIN GASTOS
-- =====================================================
-- Las siete quedan con PYIRVGNT = 'N' y el motivo de por que. El proximo
-- calculo de enero no encuentra proyeccion vigente, la regenera leyendo
-- GSPR y CRGF, y la deja como vigente.
--
-- Se invalidan TODAS las de 2026, no solo las siete con retencion: las que
-- dieron cero tambien se proyectaron sin gastos, y regenerarlas cuesta
-- nada. Asi ninguna queda hecha con datos que despues cambiaron.
UPDATE RHH.PYIR
   SET PYIRVGNT = 'N',
       PYIRMTVO = PYIRMTVO || ' - INVALIDADA: proyectada sin gastos personales (script 34)'
 WHERE PYIRANOO = 2026 AND PYIRVGNT = 'S';

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION
-- =====================================================
-- Los totales por persona, contra el archivo del cliente:
SELECT m.MPLDAPLL, COUNT(*) AS TIPOS, SUM(g.GSPRVLOR) AS TOTAL
  FROM RHH.GSPR g JOIN RHH.MPLD m ON m.MPLDCDGO = g.MPLDCDGO
 WHERE g.GSPRANOO = 2026
 GROUP BY m.MPLDAPLL ORDER BY m.MPLDAPLL;
-- Esperado: CEVALLOS MONTENEGRO 6.000 · MANOSALVAS 5.200 · MOSCOSO 15.960 ·
--           PAZMIÑO JARAMILLO 2.300 · RODRIGUEZ ZAMBRANO 4.011 · VITERI 7.396
--           (27 filas en total: 5+3+5+5+4+5)

SELECT COUNT(*) AS CARGAS_IR FROM RHH.CRGF WHERE CRGFIRRB = 'S';
-- Esperado: 1

SELECT COUNT(*) AS VIGENTES FROM RHH.PYIR WHERE PYIRANOO = 2026 AND PYIRVGNT = 'S';
-- Esperado: 0 -- todas invalidadas, listas para regenerarse.


-- =====================================================
-- LO QUE SE ESPERA AL RECALCULAR ENERO
-- =====================================================
-- Las seis con gastos deben dar retencion CERO. La aritmetica del cliente,
-- que el motor tiene que reproducir (REF-04 §1.2):
--   rebaja = 18 % x min(gastos, tope)   ·   a retener = max(0, impuesto - rebaja)
--
--   Viteri:     impuesto 1.077,06 - rebaja 1.331,28 (18 % de 7.396,20)  -> 0
--   Manosalvas: impuesto   816,28 - rebaja   936,00 (18 % de 5.200)     -> 0
--   Cevallos M: impuesto   675,02 - rebaja 1.035,47 (18 % de 5.752,60)  -> 0
--   Moscoso:    impuesto   291,98 - rebaja 1.035,47 (truncada al tope)  -> 0
--   Rodriguez Z:impuesto   242,00 - rebaja   721,98 (18 % de 4.011)     -> 0
--   Pazmino J:  impuesto   242,00 - rebaja   414,00 (18 % de 2.300)     -> 0
--
-- ROBAYO ES DISTINTO Y SE REPORTA, NO SE ARREGLA. Sin gastos, impuesto
-- 242,00 y rebaja 0: le toca retener. El motor dara 20,17 al mes desde
-- enero; el cliente le retiene 48,40 desde agosto (242 / 5 meses restantes).
-- El contraste va a seguir mostrando 20,17 en Robayo y es CORRECTO que lo
-- muestre: es la politica del cliente de recalcular a mitad de anio la que
-- difiere, no el motor. Hay que preguntarle a Steven si retiene desde el
-- anexo o desde enero -- y si la respuesta es «desde el anexo», el motor
-- necesita que la fecha de presentacion (GSPRFCPR) gobierne el mes desde el
-- que se proyecta.
