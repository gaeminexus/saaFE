-- =====================================================
-- MODULO: RHH - BORRA LAS DOS NOMINAS HUERFANAS DEL PERIODO 30 (MARZO 2026)
-- DESCRIPCION: Elimina NMNA 89 (empleado 48) y 90 (empleado 49) con su detalle.
--              Son el residuo del calculo invalido de marzo, anterior a que se
--              ejecutara la salida de los dos finiquitos.
-- ORDEN DE EJECUCION: 39
-- FECHA: 2026-08-21
-- =====================================================
-- QUE PASO. El PRDN 30 se calculo una vez con 22 personas, cuando Castro Arce y
-- Cevallos Aleman todavia estaban activos. Tras ejecutar sus salidas se
-- recalculo y la cabecera quedo bien --20 empleados, 20.793,34 / 3.222,39,
-- neto 17.570,95-- pero RHH.NMNA sigue con 22 filas y suma 18.443,85.
--
-- No es un error del recalculo: es que nadie borra la nomina de quien dejo de
-- estar activo. calcularPeriodo acumula los totales de la cabecera EN MEMORIA
-- sobre el bucle de contratos activos (selectActivosEnPeriodo), donde 48 y 49
-- ya no entran, y eliminaGeneradosByNomina solo visita las nominas que procesa.
-- A las dos huerfanas no las toca nadie. La diferencia es exacta:
-- 436,45 x 2 = 872,90 = 18.443,85 - 17.570,95.
--
-- POR QUE BORRAR Y NO ANULAR. La regla de la casa es anular, no borrar, y aqui
-- NO aplica: es para documentos de negocio --una liquidacion, un pago-- que
-- tienen historia que preservar. Estas dos filas son el artefacto de un calculo
-- que se declaro invalido; no hay acta, ni comprobante, ni valor del cliente
-- detras. Y sobre todo: **anular no las saca del contraste**. Ni el bloque 2 ni
-- el 3 de CONTRASTE_MES_CONTRA_ROL_REAL.sql filtran por NMNAESTD --se comprobo--,
-- asi que una nomina anulada seguiria apareciendo. Adaptar el contraste para que
-- las ignore seria ajustar el control para que cuadre con el dato: justo lo que
-- la regla 6 prohibe.
--
-- POR QUE HAY QUE HACERLO ANTES DEL PASO 5. Si no, el contraste lee 22 nominas
-- y Castro Arce y Cevallos Aleman aparecen CON nomina calculada. Eso rompe lo
-- que marzo existe para demostrar: el bloque 3 debe mostrarlos EN LA PLANILLA Y
-- SIN NOMINA con 99,29 cada uno --la discrepancia esperada del plan 3.4-- y con
-- las huerfanas dentro saldrian como IMPORTE DISTINTO. El bloque 2 sumaria seis
-- filas falsas de NO ESTA EN EL ROL y el 4 contaria 22 en vez de 20.
--
-- ALCANCE VERIFICADO EL 2026-08-21, antes de escribir el script:
--   Cuatro tablas apuntan a NMNA con FK. Solo una tiene filas de estas dos:
--     RHH.RNGL   10 filas (5 por nomina)
--     RHH.DRPG    0 · RHH.PRTE  0 · RHH.RLPG  0
--   RHH.ACMN del periodo 30: 0 personas. Los acumulados se generan al aprobar y
--   cerrar, y marzo no ha llegado ahi, asi que las huerfanas NO contaminaron
--   ningun acumulado. Este script no tiene que tocar ACMN.
--   PRDN 30 en estado 3 CALCULADO, sin aprobar y sin asiento.
--
-- REPETIBLE: no. Se ejecuta una vez. Si se volviera a calcular el periodo con
-- alguien mas dado de baja a mitad, el residuo volveria a aparecer y habria que
-- repetir la limpieza con los codigos nuevos.
-- =====================================================

-- -----------------------------------------------------
-- CONTROL ANTES. Debe decir 22 filas, neto 18.443,85, y las dos huerfanas con
-- 5 renglones cada una. Si dice otra cosa, PARAR.
-- -----------------------------------------------------
SELECT COUNT(*) AS NMNA_FILAS, SUM(NMNANETO) AS NMNA_NETO
  FROM RHH.NMNA WHERE PRDNCDGO = 30;

SELECT n.NMNACDGO, n.MPLDCDGO, m.MPLDAPLL || ' ' || m.MPLDNMBR AS NOMBRE,
       n.NMNADITR AS DIAS, n.NMNATING AS INGRESOS, n.NMNANETO AS NETO, n.NMNAESTD AS ESTADO,
       (SELECT COUNT(*) FROM RHH.RNGL r WHERE r.NMNACDGO = n.NMNACDGO) AS RENGLONES
  FROM RHH.NMNA n JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE n.PRDNCDGO = 30 AND n.MPLDCDGO IN (48,49)
 ORDER BY n.NMNACDGO;

-- Constancia de lo que se borra: los diez renglones, por si hiciera falta
-- reconstruirlos. Guardar esta salida antes de seguir.
SELECT r.NMNACDGO, r.CPNMCDGO, r.RNGLDSCR, r.RNGLTPCN, r.RNGLBSCL, r.RNGLVLRO
  FROM RHH.RNGL r WHERE r.NMNACDGO IN (89,90)
 ORDER BY r.NMNACDGO, r.RNGLORDN;


-- -----------------------------------------------------
-- EL BORRADO. Hijas primero: las FK son NO ACTION, no hay cascada.
-- Se filtra por PRDNCDGO y MPLDCDGO ademas de por el codigo, para que un
-- codigo equivocado no borre la nomina de otro periodo.
-- -----------------------------------------------------
DELETE FROM RHH.RNGL
 WHERE NMNACDGO IN (SELECT NMNACDGO FROM RHH.NMNA
                     WHERE PRDNCDGO = 30 AND MPLDCDGO IN (48,49));

DELETE FROM RHH.NMNA
 WHERE PRDNCDGO = 30 AND MPLDCDGO IN (48,49);

COMMIT;


-- -----------------------------------------------------
-- CONTROL DESPUES. Las tres consultas deben cuadrar entre si y con la cabecera.
-- -----------------------------------------------------
-- 1. Ahora si: 20 filas y 17.570,95.
SELECT COUNT(*) AS NMNA_FILAS, SUM(NMNATING) AS INGRESOS,
       SUM(NMNATDSC) AS DESCUENTOS, SUM(NMNANETO) AS NETO
  FROM RHH.NMNA WHERE PRDNCDGO = 30;

-- 2. La cabecera y el detalle dicen lo mismo. DIF_* deben ser 0.
SELECT p.PRDNNMEM - (SELECT COUNT(*) FROM RHH.NMNA n WHERE n.PRDNCDGO = 30)      AS DIF_EMPLEADOS,
       p.PRDNTTIN - (SELECT SUM(n.NMNATING) FROM RHH.NMNA n WHERE n.PRDNCDGO = 30) AS DIF_INGRESOS,
       p.PRDNTTDS - (SELECT SUM(n.NMNATDSC) FROM RHH.NMNA n WHERE n.PRDNCDGO = 30) AS DIF_DESCUENTOS
  FROM RHH.PRDN p WHERE p.PRDNCDGO = 30;

-- 3. Ni rastro de 48 y 49 en el periodo, ni en la nomina ni en sus renglones.
SELECT 'NMNA' AS TABLA, COUNT(*) AS FILAS FROM RHH.NMNA
 WHERE PRDNCDGO = 30 AND MPLDCDGO IN (48,49)
UNION ALL
SELECT 'RNGL', COUNT(*) FROM RHH.RNGL WHERE NMNACDGO IN (89,90);
