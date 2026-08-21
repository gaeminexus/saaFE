-- =====================================================
-- MODULO: RHH - LOS CODIGOS IESS DEL ANEXO OFICIAL, Y LAS CAUSALES QUE FALTABAN
-- DESCRIPCION: Cierra los '?' que dejo el sql/41, con los valores leidos del
--              anexo publico del IESS, y anade al catalogo de causales las
--              dos que el IESS nombra y nosotros no teniamos.
-- ORDEN DE EJECUCION: 42
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- FUENTE, y es publica: https://hl5.iess.gob.ec/emp/PrjEmpNovBatJSPhtml/ksempm1320c.html
-- (el "Anexo" que el formato batch menciona en cada campo). No hizo falta
-- entrar con credenciales de empleador: la pagina es abierta.
--
-- EL HALLAZGO QUE CAMBIA EL MODELO: los codigos NO SON NUMEROS. El formato
-- dice "1 digito" en todos ellos, pero el anexo y los ejemplos del propio
-- IESS usan LETRAS: causa de salida 'V', origen de pago 'P', seguro social
-- 'R'. Por eso PDTRVLRV es VARCHAR2 y no se cambia a numerico.
--
-- LO QUE EL IESS DEJO SIN DOCUMENTAR, literalmente, en su propia pagina:
--   "Codigo de tipo de empleador: codtipemp"          <- marcador sin resolver
--   "Codigo de relacion de trabajo: sacar una lista"  <- nota interna
--   "Codigo de minimos sectoriales sacar una lista preguntar a Edison"
-- No es que no lo hayamos encontrado: no existe en la documentacion publica.
--   - Relacion de trabajo: los tres valores que si conocemos (06, 109, 53)
--     estan verificados por otras vias y ya cargados en el sql/41.
--   - Tipo de empleador: es un codigo ASIGNADO a cada empleador por el IESS,
--     no un catalogo. Va en CFNM.CFNMTPEM, y lo dice el propio formato
--     ("Tomar el codigo asignado").
--   - Sectoriales: catalogo de miles de filas que cambia cada ano. Cada
--     contrato lleva el suyo en CNTE.CNTECDSC.
--
-- UNA CONTRADICCION DEL IESS QUE HAY QUE CONOCER: en el formato, el ejemplo
-- de variacion de sueldo termina en ';X', pero el anexo dice que la unica
-- causa valida es 'O'. Manda el anexo. Si el IESS rechazara un envio por
-- esto, se cambia el PDTRVLRV, no el codigo.
-- =====================================================


-- =====================================================
-- 1. JORNADA (rubro 225) -- el anexo solo documenta la normal
-- =====================================================
UPDATE SCP.PDTR SET PDTRVLRV = '1' WHERE PDTRCDGO = 1085;   -- TIEMPO COMPLETO -> '1' Jornada normal
-- El 1086 (TIEMPO PARCIAL) se queda en '?': el anexo NO documenta un codigo
-- de jornada parcial. El formato dice que el aviso de entrada "tambien sirve
-- para trabajo por horas" y que en ese caso el campo Sueldo lleva el VALOR DE
-- LA HORA, asi que el parcial podria expresarse por sueldo y dias, no por
-- codigo de jornada. Se confirma en el portal al registrar el primer parcial.


-- =====================================================
-- 2. ORIGEN DE PAGO (rubro 227)
-- =====================================================
UPDATE SCP.PDTR SET PDTRVLRV = 'P' WHERE PDTRCDGO = 1091;   -- FONDOS PRIVADOS -> 'P' Fondos Propios
UPDATE SCP.PDTR SET PDTRVLRV = 'E' WHERE PDTRCDGO = 1092;   -- FONDOS PUBLICOS -> 'E' Presupuesto del Estado


-- =====================================================
-- 3. CAUSA DE VARIACION DE SUELDO (rubro 229) -- una sola, 'O'
-- =====================================================
-- El anexo: "'O' 'otros' (la suma de todos los conceptos extras:
-- gratificaciones + horas extras + etc...)". No hay codigo por tipo de extra:
-- el IESS quiere UN valor con la suma. Los cuatro detalles se quedan, porque
-- nos sirven para explicar la novedad al usuario, pero los cuatro exportan 'O'.
UPDATE SCP.PDTR SET PDTRVLRV = 'O' WHERE PDTRCDGO IN (1104, 1105, 1106, 1107);


-- =====================================================
-- 4. CAUSA DE SALIDA (rubro 228)
-- =====================================================
-- Catalogo del anexo:
--   'T' Terminacion del contrato          'V' Renuncia Voluntaria
--   'B' Visto bueno                       'R' Despido unilateral por parte del empleador
--   'S' Supresion de partida              'D' Desaparicion del puesto en la estructura
--   'I' Incapacidad permanente            'F' Muerte del trabajador
--   'A' Abandono Voluntario
-- Es mas GRUESO que el Codigo del Trabajo: varias causales nuestras caen en
-- 'T'. Eso es correcto y esperado, no una perdida de informacion: nuestro
-- CSTR conserva la causal fina para el finiquito y el acta.
UPDATE SCP.PDTR SET PDTRVLRV = 'V' WHERE PDTRCDGO = 1093;   -- 1  Renuncia voluntaria
UPDATE SCP.PDTR SET PDTRVLRV = 'B' WHERE PDTRCDGO = 1095;   -- 3  Visto bueno
UPDATE SCP.PDTR SET PDTRVLRV = 'R' WHERE PDTRCDGO = 1096;   -- 4  Despido intempestivo
UPDATE SCP.PDTR SET PDTRVLRV = 'T' WHERE PDTRCDGO = 1098;   -- 6  Terminacion del plazo
UPDATE SCP.PDTR SET PDTRVLRV = 'F' WHERE PDTRCDGO = 1100;   -- 8  Fallecimiento

-- Las que caen en 'T' por descarte, porque el anexo no les da codigo propio.
-- Son defendibles pero NO estan confirmadas por el IESS: se marcan en la
-- descripcion para que nadie las tome por verificadas.
UPDATE SCP.PDTR SET PDTRVLRV = 'T', PDTRDSCR = PDTRDSCR || ' (IESS T, por descarte)'
 WHERE PDTRCDGO IN (1094, 1097, 1099, 1102, 1103);
--   2  Desahucio · 5 Mutuo acuerdo · 7 Jubilacion · 10 Caso fortuito
--   11 Terminacion en periodo de prueba
UPDATE SCP.PDTR SET PDTRVLRV = 'D', PDTRDSCR = PDTRDSCR || ' (IESS D, por descarte)'
 WHERE PDTRCDGO = 1101;                                      -- 9  Liquidacion de la empresa


-- =====================================================
-- 5. RUBRO NUEVO: CODIGO DE SEGURO SOCIAL (campo del ENT que el 41 omitio)
--    230 / PRBRCDGO 231
-- =====================================================
INSERT INTO SCP.PRBR (PRBRCDGO, PRBRDSCR, PRBRFCHA, PRBRALTR, PRBRTPOO)
VALUES (231, 'RHH CODIGO DE SEGURO SOCIAL IESS', SYSDATE, 230, 1);
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 231, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1108 AS CDGO, 'LEY DE SEGURO SOCIAL VIGENTE - LEY 21' AS DSCR, 1 AS ALTR, 'R' AS COD FROM DUAL UNION ALL
    SELECT 1109, 'SEGURO MIXTO', 2, 'M' FROM DUAL
) d;
-- El valor por defecto de un empleador privado es 'R'. Va en CFNM, no por
-- contrato: es del regimen del empleador.
ALTER TABLE RHH.CFNM ADD (CFNMSGSC VARCHAR2(2) DEFAULT 'R');
COMMENT ON COLUMN RHH.CFNM.CFNMSGSC IS 'Codigo de seguro social del ENT (rubro 230). Privado = R.';


-- =====================================================
-- 6. LAS DOS CAUSALES QUE EL IESS NOMBRA Y NOSOTROS NO TENIAMOS
-- =====================================================
-- Se encontraron leyendo el catalogo del IESS, no el Codigo del Trabajo: son
-- causas reales que un empleador privado va a encontrar y que hoy no podria
-- registrar. Mantienen el 1:1 entre CSTRALTR y el rubro 228.
INSERT INTO RHH.CSTR (
    PJRQCDGO, CSTRNMBR, CSTRALTR, CSTRARTC,
    CSTRDSHC, CSTRDSPD, CSTRVCPR, CSTRDCPR, CSTRJBPT, CSTRAVSL, CSTRACSU,
    CSTRESTD, CSTRUSRR
)
SELECT :EMPRESA, 'Abandono voluntario del trabajo', 12, 'Art. 172 num. 1',
       'N', 'N', 'S', 'S', 'N', 'S', 'S', 1, 'CARGA'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM RHH.CSTR WHERE PJRQCDGO = :EMPRESA AND CSTRALTR = 12);

INSERT INTO RHH.CSTR (
    PJRQCDGO, CSTRNMBR, CSTRALTR, CSTRARTC,
    CSTRDSHC, CSTRDSPD, CSTRVCPR, CSTRDCPR, CSTRJBPT, CSTRAVSL, CSTRACSU,
    CSTRESTD, CSTRUSRR
)
SELECT :EMPRESA, 'Incapacidad permanente del trabajador', 13, 'Art. 169 num. 6',
       'N', 'N', 'S', 'S', 'N', 'S', 'S', 1, 'CARGA'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM RHH.CSTR WHERE PJRQCDGO = :EMPRESA AND CSTRALTR = 13);

-- Y sus parejas en el rubro 228, para no romper el 1:1.
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRVLRV, PDTRESTD)
SELECT d.CDGO, 229, d.DSCR, d.ALTR, d.COD, 1 FROM (
    SELECT 1110 AS CDGO, 'ABANDONO VOLUNTARIO'                  AS DSCR, 12 AS ALTR, 'A' AS COD FROM DUAL UNION ALL
    SELECT 1111, 'INCAPACIDAD PERMANENTE DEL TRABAJADOR',       13, 'I' FROM DUAL UNION ALL
    SELECT 1112, 'SUPRESION DE PARTIDA (SECTOR PUBLICO)',       14, 'S' FROM DUAL
) d;
-- El 14 (supresion de partida) queda sin pareja en CSTR a proposito: es del
-- sector publico. Cuando una instalacion publica lo necesite, crea su causal
-- 14 y el 1:1 se completa solo.

COMMIT;


-- =====================================================
-- CONTROL DESPUES
-- =====================================================
-- 1. Cuantos '?' quedan y donde. Esperado: UNO solo, la jornada parcial.
SELECT r.PRBRALTR RUBRO, r.PRBRDSCR, d.PDTRALTR ALT, d.PDTRDSCR
  FROM SCP.PRBR r JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
 WHERE r.PRBRALTR IN (204, 225, 226, 227, 228, 229, 230) AND d.PDTRVLRV = '?'
 ORDER BY 1, 3;

-- 2. El mapa completo causal -> codigo IESS, que es lo que usara el exportador.
SELECT c.CSTRALTR, c.CSTRNMBR, d.PDTRVLRV AS CODIGO_IESS, d.PDTRDSCR
  FROM RHH.CSTR c
  LEFT JOIN SCP.PDTR d ON d.PDTRALTR = c.CSTRALTR
   AND d.PRBRCDGO = (SELECT PRBRCDGO FROM SCP.PRBR WHERE PRBRALTR = 228)
 WHERE c.PJRQCDGO = :EMPRESA
 ORDER BY c.CSTRALTR;
-- Ninguna fila debe salir con CODIGO_IESS nulo: una causal sin pareja es una
-- salida que el exportador no podra generar.

-- 3. Los rubros, completos.
SELECT r.PRBRALTR RUBRO, r.PRBRDSCR, COUNT(d.PDTRCDGO) DETALLES,
       SUM(CASE WHEN d.PDTRVLRV = '?' THEN 1 ELSE 0 END) SIN_CODIGO
  FROM SCP.PRBR r LEFT JOIN SCP.PDTR d ON d.PRBRCDGO = r.PRBRCDGO
 WHERE r.PRBRALTR IN (204, 225, 226, 227, 228, 229, 230)
 GROUP BY r.PRBRALTR, r.PRBRDSCR ORDER BY 1;
-- Esperado: 204 -> 11/0 · 225 -> 2/1 · 226 -> 4/1 · 227 -> 2/0
--           228 -> 14/0 · 229 -> 4/0 · 230 -> 2/0
-- El 226 conserva su '?' en LOSEP, que ninguna instalacion privada usa.
