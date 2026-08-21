-- =====================================================
-- MODULO: RHH - CARGA DE LA APERTURA DE ASOPREP AL 31-DIC-2025
-- DESCRIPCION: Los 22 empleados con relacion laboral vigente al cierre de
--              2025, sus contratos, su historial de cargo, las cuatro
--              adendas anteriores al corte, los saldos de apertura y el
--              anticipo de Calderon.
-- ORDEN DE EJECUCION: 26 (despues del 25, que crea los cargos)
-- PARAMETRO: :EMPRESA -- la jerarquia de ASOPREP, 1236
-- FECHA: 2026-08-20 · rev. 2 tras el ORA-02291 de CNTE_TPCE_FK
-- =====================================================
-- CORRERLO EN UTF-8. Lleva nombres con Ñ (PAZMIÑO, MUÑOZ). Si el cliente
-- SQL no esta en UTF-8 quedan corruptos en la base y hay que recargar.
--
-- QUE CAMBIO EN LA REVISION 2
--   La version anterior escribia TPCECDGO = 1 a mano y reventaba con
--   ORA-02291: RHH.TPCE estaba vacia. Dos correcciones:
--     * El paso 1 crea el tipo de contrato si falta -- es parametria, no
--       fixture, y sin el ningun contrato puede existir.
--     * El paso 3 resuelve TPCECDGO **por consulta**, no por numero.
--
--   El error fue violar la regla que este mismo script declara: los codigos
--   IDENTITY no se escriben. Los cargos si iban por nombre; TPCE se colo
--   porque llego como un valor concreto y se copio sin pensar. Revisado el
--   resto: CNTETRNO va por MAX(TRNOCDGO) y CRGO/DPTC por nombre. No queda
--   ningun otro codigo a mano.
--
-- SON 22, NO 24
--   Bravo Caiza (ingresa 15-01-2026) y Cevallos Montenegro (19-01-2026) no
--   existen al 31-dic-2025: van en el script 27 como movimientos de enero.
--   La comprobacion del corte: la planilla del IESS de enero declara 24
--   afiliados = estas 22 mas esos 2.
--
-- TRES REGLAS QUE ESTE SCRIPT SIGUE, Y QUE SE PAGARON CARAS
--   1. No se nombra ninguna columna *FCHR. Llevan DEFAULT SYSDATE con CHECK
--      NOT NULL: omitirlas deja entrar el default, nombrarlas con nulo
--      explicito revienta con ORA-02290.
--   2. Los nombres de columna estan leidos del @Column de la entidad, no
--      deducidos del patron de nomenclatura. Ya engano tres veces:
--      CNTED3MD/CNTED4MD, NXOOTIPO/NXOODSCR y de poco TPCE.
--   3. Los codigos IDENTITY no se escriben. Todo se referencia por cedula,
--      por nombre o por consulta.
--
-- DOS COLUMNAS QUE FALLAN EN SILENCIO SI SE EQUIVOCAN
--   MPLDESTD debe ser 1. Con un 4 el empleado queda CESANTE y el motor lo
--   excluye del calculo sin ningun error: seria alguien que simplemente no
--   aparece en el rol.
--   CNTEDCMS debe ser 'S'. Se lee con SI.equals(...), asi que nulo o vacio
--   apaga el decimo cuarto, tambien sin aviso.
--
-- LA ANTIGUEDAD NO SE CARGA COMO SALDO
--   El tipo 1 ANTIGUEDAD de SLAP existe para escribir MPLD.MPLDFCIN, y aqui
--   la fecha de ingreso se carga directa en el INSERT. Cargarla ademas como
--   saldo la sobrescribiria con su propio valor -- inofensivo pero
--   redundante -- y de paso metaria a las 22 personas por el camino que
--   todavia no tiene la reversion exacta. Se omite a proposito.
-- =====================================================


-- =====================================================
-- PASO 0: LIMPIAR LA CORRIDA QUE FALLO, Y COMPROBAR
-- =====================================================
-- Deja las cinco tablas de la carga en cero para que el script sea
-- repetible. Van en orden inverso de FK: un DELETE de MPLD con contratos
-- vivos revienta con ORA-02292, y ese es justo el estado en que queda una
-- corrida que fallo a mitad.
--
-- Sin WHERE, y a proposito: estas cinco solo contienen lo que mete este
-- script. TPCE, CRGO, DPRT, DPTC y TRNO no se tocan -- son parametria.
ROLLBACK;
DELETE FROM RHH.NXOO;
DELETE FROM RHH.SLAP;
DELETE FROM RHH.HSTR;
DELETE FROM RHH.CNTE;
DELETE FROM RHH.MPLD;
COMMIT;

-- Ahora todo debe estar en cero, y los 19 cargos del script 25 puestos.
SELECT 'MPLD (esperado 0)' AS TABLA, COUNT(*) AS FILAS FROM RHH.MPLD
UNION ALL SELECT 'CNTE (0)', COUNT(*) FROM RHH.CNTE
UNION ALL SELECT 'HSTR (0)', COUNT(*) FROM RHH.HSTR
UNION ALL SELECT 'NXOO (0)', COUNT(*) FROM RHH.NXOO
UNION ALL SELECT 'SLAP (0)', COUNT(*) FROM RHH.SLAP
UNION ALL SELECT 'CRGO (19)', COUNT(*) FROM RHH.CRGO
UNION ALL SELECT 'TRNO (1)', COUNT(*) FROM RHH.TRNO;


-- =====================================================
-- PASO 1: EL TIPO DE CONTRATO -- parametria que faltaba
-- =====================================================
-- RHH.TPCE estaba vacia y CNTE.TPCECDGO es obligatoria: sin esta fila no
-- puede existir ningun contrato. Es parametria de la empresa, no un dato de
-- ASOPREP, asi que se crea aqui y se queda.
--
-- TPCETPRL 1 = Indefinido tiempo completo (rubro 186), el mismo valor que
-- lleva CNTETPRL. TPCERQRE 'N': un indefinido no exige fecha de fin.
-- TPCEMXMS en nulo: no tiene duracion maxima.
INSERT INTO RHH.TPCE (PJRQCDGO, TPCENMBR, TPCERQRE, TPCETPRL, TPCEESTD, TPCEUSRR)
SELECT :EMPRESA, 'INDEFINIDO TIEMPO COMPLETO', 'N', 1, 'A', 'CARGA'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM RHH.TPCE
                    WHERE PJRQCDGO = :EMPRESA AND TPCEESTD = 'A');

COMMIT;

-- Esperado: al menos una fila activa. Anota su codigo, aunque el script ya
-- no lo necesita: lo resuelve por consulta.
SELECT TPCECDGO, TPCENMBR, TPCETPRL, TPCERQRE, TPCEESTD FROM RHH.TPCE;


-- =====================================================
-- EL PADRON -- se usa cuatro veces, se escribe una
-- =====================================================
-- Cada fila trae todo lo que hace falta de esa persona. Los importes de
-- vacaciones, decimo cuarto y decimo tercero estan calculados con la
-- convencion validada contra el acta del Ministerio del Trabajo de Torres
-- Chavez: dias inclusive, meses de 30, y cada tramo valorado con la
-- remuneracion vigente en ese tramo.
--
-- DEC: 1 mensualizado, 2 acumulado (rubros 188 y 189, misma bandera para
--      el 13.o y el 14.o -- el cliente los gobierna juntos).
-- FRMD: 1 mensualizado, 2 acumulado en el IESS (rubro 190).
--
-- OJO CON LOS MENSUALIZADOS: llevan V14 y V13 en CERO. A quien cobra los
-- decimos cada mes no le queda saldo que acumular. Lo confirma el acta de
-- Torres Chavez, que le liquida 20,08 de decimo cuarto -- la mitad de un
-- mes de 2026 -- y no los 195,83 que serian cinco meses acumulados.
CREATE OR REPLACE VIEW RHH.V_CARGA_APERTURA AS
SELECT * FROM (
SELECT '1717991341' CED,'BARCENAS BERMEO' APEL,'DANIELA ROMINA' NOMB,DATE '2025-06-26' ING,'ASISTENTE DE CREDITO' CARGO,700 SLDO,2 DEC_,1 FRMD,'darobarbe@gmail.com' MAIL,'0961209099' TELF,185 VDIAS,179.86 VVAL,150 D14D,195.83 V14,58.33 V13 FROM DUAL UNION ALL
SELECT '1714531405','BENITEZ MONTES','GUILLERMINA NATASHA',DATE '2025-10-01','JEFE DE SUCURSAL COCA',700,1,1,'natachabenitez1978@gmail.com','0997600672',90,87.50,0,0,0 FROM DUAL UNION ALL
SELECT '1753528379','CAIZA REMACHE','LIZETH ABIGAIL',DATE '2025-10-06','AUXILIAR DE ARCHIVO',482,2,1,'lizeth1995thais16@gmail.com','0981097113',85,55.49,85,110.97,39.17 FROM DUAL UNION ALL
SELECT '1719624809','CALDERON PARRAGA','LAURA CECILIA',DATE '2025-10-16','ASISTENTE DE CREDITO',700,2,1,'lauri_calderon@hotmail.com','0968712363',75,72.92,75,97.92,58.33 FROM DUAL UNION ALL
SELECT '1720245735','CASTRO ARCE','LESLY MARICELA',DATE '2025-12-08','AUXILIAR DE CREDITO',482,2,1,'castrolesly931@yahoo.com',NULL,23,15.01,23,30.03,30.03 FROM DUAL UNION ALL
SELECT '1716501778','CEVALLOS ALEMAN','EDGAR GIOVANNY',DATE '2025-12-08','AUXILIAR DE CREDITO',482,2,1,'edgeovacev@hotmail.es',NULL,23,15.01,23,30.03,30.03 FROM DUAL UNION ALL
SELECT '1715156574','COSSIO CAICEDO','EIMY',DATE '2025-10-06','ASISTENTE DE CREDITO',700,1,1,'zanoey2004@yahoo.com','0991981964',85,82.64,0,0,0 FROM DUAL UNION ALL
SELECT '1750302984','GARCIA VITERI','WILLAM ALEXANDER',DATE '2025-10-07','ADMINISTRADOR DEL EDIFICIO',700,2,1,'willamgarcia11301@gmail.com','0987368255',84,81.67,84,109.67,58.33 FROM DUAL UNION ALL
SELECT '1716120769','MANOSALVAS LLERENA','FERNANDO PAUL',DATE '2025-08-06','JEFE DE SISTEMAS',2000,1,1,'paulmanosalvasll@hotmail.com','0983363013',145,402.78,0,0,0 FROM DUAL UNION ALL
SELECT '1004350904','MENDEZ TORRES','DIANA ALEJANDRA',DATE '2025-10-14','AUXILIAR DE LIMPIEZA',241,2,1,'diana@gmail.com','0988562308',77,25.13,77,100.53,19.58 FROM DUAL UNION ALL
SELECT '0103179537','MOSCOSO NOVILLO','DIANA CECILIA',DATE '2025-10-13','ASISTENTE DE GERENCIA',1546,1,1,'dianamoscosonovillo@hotmail.com','0996468540',78,167.48,0,0,0 FROM DUAL UNION ALL
SELECT '1717649873','MUÑOZ SANTOS','MARCELO ALEJANDRO',DATE '2025-06-25','MENSAJERO',550,2,1,'markpc_1105@hotmail.com','0994645208',186,142.08,150,195.83,45.83 FROM DUAL UNION ALL
SELECT '1723962849','NIETO CONDE','KAROL POLETH',DATE '2025-06-25','ASISTENTE LEGAL',900,2,1,'karolnietoconde@gmail.com','0998306205',186,237.50,150,195.83,75.00 FROM DUAL UNION ALL
SELECT '1726657164','PARDO CALLE','KATHERINE GUISSELA',DATE '2025-06-25','ASISTENTE CONTABLE',700,2,1,'negritaguiss21@gmail.com','0984756367',186,170.17,150,195.83,58.33 FROM DUAL UNION ALL
SELECT '0909917759','PAZMIÑO JARAMILLO','EDGAR ALBERTO',DATE '2025-10-07','JEFE ADMINISTRATIVO',1500,2,1,'Pazmino_e@hotmail.com','0989432099',84,175.00,84,109.67,125.00 FROM DUAL UNION ALL
SELECT '2100192463','PAZMIÑO MORENO','DIANA CAROLINA',DATE '2025-10-01','ASISTENTE DE SUCURSAL',500,2,1,'dica_carol96@hotmail.com','0980785825',90,62.50,90,117.50,41.67 FROM DUAL UNION ALL
SELECT '1725996498','ROBAYO RUEDA','GABRIEL PATRICIO',DATE '2025-10-02','JEFE DE CREDITO',1500,2,1,'gabos_117.gr@gmail.com','0982346362',89,185.42,89,116.19,125.00 FROM DUAL UNION ALL
SELECT '0801999855','RODRIGUEZ VALENCIA','NATALIA ADRIANA',DATE '2025-07-16','JEFE DE SUCURSAL ESMERALDAS',700,2,1,'alana.ar2731@gmail.com',NULL,165,160.42,150,195.83,58.33 FROM DUAL UNION ALL
SELECT '1712362720','RODRIGUEZ ZAMBRANO','LILIANA DE LAS MERCEDES',DATE '2025-10-01','JEFE LEGAL',1500,2,1,'lily_rz99@hotmail.com','0984497798',90,187.50,90,117.50,125.00 FROM DUAL UNION ALL
SELECT '0602237265','TORRES CHAVEZ','ELIZABETH MARIA',DATE '2025-06-25','CONTADOR',2000,1,1,'maryely44@hotmail.com',NULL,186,505.83,0,0,0 FROM DUAL UNION ALL
SELECT '1712232659','VITERI LOPEZ','JIMENA DEL PILAR',DATE '2025-06-25','JEFA FINANCIERA',2200,2,2,'jimeviteri@hotmail.com',NULL,186,566.67,150,195.83,183.33 FROM DUAL UNION ALL
SELECT '1307779064','ZAMBRANO MIELES','TANYA GISSELA',DATE '2025-10-06','RECEPCIONISTA',500,2,1,'tagizami26@gmail.com',NULL,85,59.03,85,110.97,41.67 FROM DUAL
);


-- =====================================================
-- PASO 2: LOS 22 EMPLEADOS
-- =====================================================
-- MPLDESTD 1 = ACTIVO (rubro 185). MPLDRGNN 1 = Sierra y Amazonia
-- (rubro 187), que decide el periodo del decimo cuarto: 1-ago a 31-jul.
-- El codigo biometrico va nulo: el archivo del reloj sigue pendiente.
INSERT INTO RHH.MPLD (PJRQCDGO, MPLDIDNT, MPLDAPLL, MPLDNMBR, MPLDFCIN,
                      MPLDESTD, MPLDRGNN, MPLDEMAI, MPLDTLFN, MPLDUSRR)
SELECT :EMPRESA, CED, APEL, NOMB, ING, 1, 1, MAIL, TELF, 'CARGA'
  FROM RHH.V_CARGA_APERTURA;


-- =====================================================
-- PASO 3: LOS 22 CONTRATOS
-- =====================================================
-- CNTETPRL 1 y el tipo de contrato del paso 1 para los 22, incluida Mendez
-- Torres: su media jornada va en el salario (241,00), no en el tipo de
-- relacion. La rama que reduce por jornada exige POR_HORAS con valorHora, y
-- CNTEJRND no lo lee nadie -- es descriptivo.
--
-- TPCECDGO se resuelve por consulta. Es lo que fallo en la revision 1.
INSERT INTO RHH.CNTE (MPLDCDGO, TPCECDGO, CNTENMRO, CNTEFCHI, CNTESLRB,
                      CNTEESTD, CNTETPRL, CNTEJRND, CNTEHRSM,
                      CNTEDCTM, CNTEDCCM, CNTEFRMD, CNTEDCMS,
                      CNTEAPRT, CNTERTFN, CNTETRNO, CNTEUSRR)
SELECT m.MPLDCDGO, t.TPCECDGO, 'CT-' || v.CED, v.ING, v.SLDO,
       'ACTIVO', 1,
       CASE WHEN v.CED = '1004350904' THEN 2 ELSE 1 END,
       CASE WHEN v.CED = '1004350904' THEN 20 ELSE 40 END,
       v.DEC_, v.DEC_, v.FRMD, 'S',
       'S', 'N',
       (SELECT MAX(TRNOCDGO) FROM RHH.TRNO), 'CARGA'
  FROM RHH.V_CARGA_APERTURA v
  JOIN RHH.MPLD m ON m.MPLDIDNT = v.CED AND m.PJRQCDGO = :EMPRESA
 CROSS JOIN (SELECT MIN(TPCECDGO) AS TPCECDGO FROM RHH.TPCE
              WHERE PJRQCDGO = :EMPRESA AND TPCEESTD = 'A') t;


-- =====================================================
-- PASO 4: EL HISTORIAL DE CARGO
-- =====================================================
-- Una fila por persona, vigente desde su ingreso y marcada como actual.
-- Los cambios de cargo de 2025 no se cargan como historial: solo Pardo
-- Calle y Torres Chavez cambiaron de cargo, y su fila refleja el vigente.
-- Si ASOPREP quiere el rastro completo, se agregan filas con HSTRACTL='N'.
INSERT INTO RHH.HSTR (MPLDCDGO, DPTCCDGO, CRGOCDGO, HSTRFCHI, HSTRACTL,
                      HSTRSLNW, HSTRUSRR)
SELECT m.MPLDCDGO, d.DPTCCDGO, c.CRGOCDGO, v.ING, 'S', v.SLDO, 'CARGA'
  FROM RHH.V_CARGA_APERTURA v
  JOIN RHH.MPLD m ON m.MPLDIDNT = v.CED AND m.PJRQCDGO = :EMPRESA
  JOIN RHH.CRGO c ON c.CRGONMBR = v.CARGO
  JOIN RHH.DPTC d ON d.CRGOCDGO = c.CRGOCDGO;


-- =====================================================
-- PASO 5: LAS CUATRO ADENDAS ANTERIORES AL CORTE
-- =====================================================
-- Son documentos historicos: el contrato del paso 3 ya lleva el sueldo
-- posterior a la adenda. NXOOTPOO solo admite ADENDUM, ANEXO o RENOVACION
-- por CHECK. Y la propiedad JSON del contrato es "contrato", no
-- "contratoEmpleado" -- por SQL da igual, por REST no.
--
-- La fecha de Nieto Conde figura como 2025-07-16 en REF-01 §2 y como
-- 2025-07-01 en §4. Se usa el 01 por coherencia con las otras tres del mes.
-- La diferencia entre una y otra son ~12,50 en su saldo de vacaciones.
INSERT INTO RHH.NXOO (CNTECDGO, NXOOTPOO, NXOOFCHA, NXOODTLL, NXOOSLRN, NXOOUSRR)
SELECT c.CNTECDGO, 'ADENDUM', d.FCHA, d.DTLL, d.SLRN, 'CARGA'
  FROM (
    SELECT '1723962849' CED, DATE '2025-07-01' FCHA, 'Cambio de remuneracion - Asistente Legal' DTLL, 900 SLRN FROM DUAL UNION ALL
    SELECT '0602237265', DATE '2025-07-01', 'Cambio de cargo a Contador',           2000 FROM DUAL UNION ALL
    SELECT '1712232659', DATE '2025-07-01', 'Cambio de cargo a Jefa Financiera',    2200 FROM DUAL UNION ALL
    SELECT '1726657164', DATE '2025-10-01', 'Cambio de cargo a Asistente Contable',  700 FROM DUAL
  ) d
  JOIN RHH.MPLD m ON m.MPLDIDNT = d.CED AND m.PJRQCDGO = :EMPRESA
  JOIN RHH.CNTE c ON c.MPLDCDGO = m.MPLDCDGO;


-- =====================================================
-- PASO 6: LOS SALDOS DE APERTURA -- quedan PENDIENTES
-- =====================================================
-- Se insertan en SLAP sin aplicar (SLAPAPLC = 'N'). La materializacion en
-- SLDV y ACMN se hace DESDE LA PANTALLA de migracion, que es el camino
-- disenado, es reversible y de paso la ejercita con datos reales.
--
-- Tipos (RhhTipoSaldoApertura): 2 VACACIONES_PENDIENTES,
-- 3 DECIMO_TERCERO_ACUMULADO, 4 DECIMO_CUARTO_ACUMULADO.
-- No se carga el tipo 1 ANTIGUEDAD: la fecha de ingreso ya va en MPLD.
INSERT INTO RHH.SLAP (PJRQCDGO, SLAPIDNT, SLAPFCCR, SLAPTPSL, SLAPVLOR,
                      SLAPDIAS, SLAPANOO, SLAPAPLC, SLAPOBSR, SLAPUSRR)
SELECT :EMPRESA, CED, DATE '2025-12-31', 2, VVAL, VDIAS, 2025, 'N',
       'Apertura ASOPREP - vacaciones acumuladas', 'CARGA'
  FROM RHH.V_CARGA_APERTURA
 WHERE VVAL > 0
UNION ALL
SELECT :EMPRESA, CED, DATE '2025-12-31', 4, V14, D14D, 2025, 'N',
       'Apertura ASOPREP - decimo cuarto acumulado', 'CARGA'
  FROM RHH.V_CARGA_APERTURA
 WHERE V14 > 0
UNION ALL
SELECT :EMPRESA, CED, DATE '2025-12-31', 3, V13, NULL, 2025, 'N',
       'Apertura ASOPREP - decimo tercero acumulado (diciembre 2025)', 'CARGA'
  FROM RHH.V_CARGA_APERTURA
 WHERE V13 > 0;


-- =====================================================
-- PASO 7: EL ANTICIPO DE CALDERON
-- =====================================================
-- 700,00 concedidos en diciembre de 2025, con cuota de 350,00 para enero y
-- febrero. Es el UNICO saldo de anticipo de la apertura: los de Pardo,
-- Zambrano y el segundo de Calderon nacen dentro de la ventana y entran
-- como novedades del mes que corresponda.
-- Tipo 7 = PRESTAMO_INTERNO.
INSERT INTO RHH.SLAP (PJRQCDGO, SLAPIDNT, SLAPFCCR, SLAPTPSL, SLAPVLOR,
                      SLAPNMCT, SLAPANOO, SLAPAPLC, SLAPOBSR, SLAPUSRR)
-- La observacion va CORTA a proposito, y no es estilo: MigracionRhhServiceImpl
-- la mete tal cual en DSRC.DSRCNMRO al aplicar el saldo, que es VARCHAR2(50)
-- y esta pensada para el numero del prestamo. Una frase de 65 caracteres
-- reventaba con ORA-12899 y, como aplicar es una sola transaccion, esa fila
-- sola tumbaba las 57.
--
-- El texto elegido sirve de las dos cosas: se lee como observacion y es
-- aceptable como numero de referencia.
VALUES (:EMPRESA, '1719624809', DATE '2025-12-31', 7, 700, 2, 2025, 'N',
        'ANTICIPO DIC-2025', 'CARGA');

COMMIT;


-- =====================================================
-- PASO 8: COMPROBACION -- todo tiene que dar el valor esperado
-- =====================================================
SELECT 'MPLD (esperado 22)' AS QUE, COUNT(*) AS VALOR FROM RHH.MPLD
UNION ALL SELECT 'CNTE (22)',  COUNT(*) FROM RHH.CNTE
UNION ALL SELECT 'HSTR (22)',  COUNT(*) FROM RHH.HSTR
UNION ALL SELECT 'NXOO (4)',   COUNT(*) FROM RHH.NXOO
UNION ALL SELECT 'SLAP (57)',  COUNT(*) FROM RHH.SLAP;

-- Los tres totales de saldo, contra el guion:
SELECT SLAPTPSL AS TIPO, COUNT(*) AS PERSONAS, ROUND(SUM(SLAPVLOR),2) AS TOTAL
  FROM RHH.SLAP GROUP BY SLAPTPSL ORDER BY SLAPTPSL;
-- Esperado:  2 -> 22 personas, 3.637,61
--            3 -> 17 personas, 1.172,96
--            4 -> 17 personas, 2.225,96
--            7 ->  1 persona,    700,00
--
-- Los centimos de diferencia contra la tabla del guion (3.637,60 / 1.172,97
-- / 2.225,98) son de redondeo: el guion redondea el total, la base suma los
-- valores ya redondeados por fila. Es la suma de las filas la que manda.

-- Ninguna columna critica en un valor que apague el calculo:
SELECT COUNT(*) AS MAL FROM RHH.MPLD WHERE MPLDESTD <> 1 OR MPLDRGNN <> 1;
SELECT COUNT(*) AS MAL FROM RHH.CNTE
 WHERE CNTEDCMS <> 'S' OR CNTEAPRT <> 'S' OR CNTEESTD <> 'ACTIVO'
    OR CNTETPRL <> 1 OR TPCECDGO IS NULL OR CNTETRNO IS NULL;
-- Esperado: 0 en las dos.

-- La masa salarial nominal de los 22, y esta cuadra contra el cliente:
SELECT ROUND(SUM(CNTESLRB),2) AS MASA FROM RHH.CNTE WHERE CNTEESTD = 'ACTIVO';
-- Esperado: 21.283,00
--
-- Es exactamente la masa de la planilla del IESS de FEBRERO. Y reconcilia
-- con la de enero (21.129,66) por los movimientos del mes:
--   21.283,00 - 2.000,00 (Torres) - 700,00 (Benitez)
--             + 1.000,00 (Torres, 15 dias) + 373,33 (Benitez, 16 dias)
--             + 373,33 (Bravo, 16 dias)    +   800,00 (Cevallos M., 12 dias)
--             = 21.129,66
-- Si este numero no da 21.283,00, hay un sueldo mal cargado y se ve aqui,
-- antes de calcular nada.

-- Y que ninguna cedula quedara repetida ni con Ñ corrupta:
SELECT MPLDIDNT, COUNT(*) FROM RHH.MPLD GROUP BY MPLDIDNT HAVING COUNT(*) > 1;
SELECT MPLDAPLL FROM RHH.MPLD WHERE MPLDAPLL LIKE '%PAZMI%' OR MPLDAPLL LIKE '%MU%OZ%';
-- Esperado: cero filas la primera; "PAZMIÑO JARAMILLO", "PAZMIÑO MORENO" y
-- "MUÑOZ SANTOS" bien escritos en la segunda.


-- =====================================================
-- PASO 9: RETIRAR LA VISTA AUXILIAR
-- =====================================================
-- Solo existia para no transcribir el padron cuatro veces. Si se quiere
-- conservar para auditar la carga, comentar esta linea.
DROP VIEW RHH.V_CARGA_APERTURA;


-- =====================================================
-- LO QUE SIGUE, Y NO LO HACE ESTE SCRIPT
-- =====================================================
-- 1. APLICAR LOS SALDOS DESDE LA PANTALLA de migracion. Quedan pendientes
--    a proposito: validar primero -- debe salir sin inconsistencias -- y
--    despues aplicar. Ahi se materializan en SLDV y ACMN.
-- 2. El script 27: los dos ingresos de enero.
-- 3. Las cuotas de prestamo del IESS **no van aqui**. La de Calderon
--    decrece cada mes (14,42 -> 13,85) porque se amortiza, y un descuento
--    recurrente de cuota fija no la reproduce. Entran como novedades de
--    cada mes con el importe exacto del detalle del IESS, que es dato dado
--    y no algo que debamos amortizar nosotros.
-- 4. Las dos salidas de enero -- Torres Chavez y Benitez Montes -- se
--    procesan por la pantalla de liquidacion, que es su primera prueba de
--    verdad. Este script solo deja sus contratos listos.
