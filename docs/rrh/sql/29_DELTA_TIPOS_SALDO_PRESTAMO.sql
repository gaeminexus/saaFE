-- =====================================================
-- MODULO: RHH - CERRAR LA FAMILIA DE TIPOS DE SALDO DE PRESTAMO
-- DESCRIPCION: Anade ANTICIPO (9) y PRESTAMO HIPOTECARIO IESS (10) al rubro
--              211, y renombra el 6 para que su nombre no prometa mas de lo
--              que hace.
-- ORDEN DE EJECUCION: 29
-- FECHA: 2026-08-20
-- =====================================================
-- EL DEFECTO, QUE SON DOS CASOS DE LO MISMO
--   El catalogo de tipos de saldo es MAS GRUESO que el de descuentos
--   recurrentes: 2 tipos de prestamo contra 5 tipos de descuento. La
--   materializacion tiene que elegir, y elige mal dos veces:
--
--   1. **El anticipo no tiene tipo.** Un anticipo migrado entra como
--      PRESTAMO_INTERNO (7) y acaba en el concepto «Prestamo interno» en
--      vez de «Anticipo de sueldo». Lo destapo la apertura de ASOPREP: el
--      anticipo de Calderon quedo en el concepto 23 y el de Pardo, cargado
--      a mano, en el 22.
--
--   2. **PRESTAMO_IESS (6) resuelve SIEMPRE a quirografario.**
--          case RhhTipoSaldoApertura.PRESTAMO_IESS:
--              aplicaDescuento(saldo, PRESTAMO_QUIROGRAFARIO_IESS, usuario);
--      Un hipotecario migrado se materializa como quirografario, y
--      validaConceptoDelPrestamo hace la misma suposicion, asi que ni
--      siquiera avisa.
--
-- POR QUE IMPORTA, Y NO ES TEORICO
--   El rol de ASOPREP tiene **una sola columna ANTIC SUELD**: dos anticipos
--   en conceptos distintos cuadran el total y fallan el desglose. Y el
--   control 3 de la calibracion compara hipotecarios y quirografarios **por
--   separado** -- 1.015,14 contra 171,63 -- asi que un prestamo en el
--   concepto equivocado hace lo mismo.
--
--   Es el error que cuadra en el total y falla en las personas, tercera vez
--   en esta semana. La primera fue el valorDia calculado desde el contrato:
--   bien 18 de 22 y mal las cuatro que importan.
--
-- POR QUE AHORA Y NO DESPUES
--   En ESTA calibracion el hipotecario no entra por SLAP: los prestamos del
--   IESS de enero van como novedades del mes, porque su cuota la dicta el
--   organismo. Pero **desde agosto van como DSRC**, y la replica en
--   produccion migrara saldos de prestamo de verdad. El defecto muerde
--   alli, no aqui -- y alli no hay nadie mirando cada concepto.
--
-- POR QUE ES ADITIVO
--   Mismo criterio que el case INTEGER: hoy un saldo con tipo 9 o 10 **ni
--   siquiera llega a aplicarse**. El default de validaCamposPorTipo lo
--   rechaza por tipo no reconocido, y si se saltara la validacion, el
--   default del switch de aplicar lanza. Nadie puede apoyarse en una
--   conducta que hoy es «rechazado en dos sitios».
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- El rubro 211 (PRBRCDGO 212) debe tener HOY 8 detalles, del 1 al 8.
SELECT COUNT(*) AS DETALLES, MIN(PDTRALTR) AS MIN_ALTR, MAX(PDTRALTR) AS MAX_ALTR
  FROM SCP.PDTR WHERE PRBRCDGO = 212;
-- Esperado: 8 / 1 / 8

SELECT PDTRALTR, PDTRDSCR FROM SCP.PDTR WHERE PRBRCDGO = 212 ORDER BY PDTRALTR;

-- Y la secuencia de detalles, para no pisar codigos:
SELECT sequence_name, last_number FROM all_sequences
 WHERE sequence_owner = 'SCP' AND sequence_name = 'SQ_PDTRCDGO';


-- =====================================================
-- PASO 1: LOS DOS TIPOS NUEVOS
-- =====================================================
-- Los PDTRCDGO 1077 y 1078 siguen al 1076 del script 22.
INSERT INTO SCP.PDTR (PDTRCDGO, PRBRCDGO, PDTRDSCR, PDTRALTR, PDTRESTD)
SELECT d.CDGO, 212, d.DSCR, d.ALTR, 1 FROM (
    SELECT 1077 AS CDGO, 'ANTICIPO DE SUELDO'          AS DSCR,  9 AS ALTR FROM DUAL UNION ALL
    SELECT 1078,         'PRESTAMO HIPOTECARIO IESS',  10          FROM DUAL
) d;


-- =====================================================
-- PASO 2: EL 6 DEJA DE PROMETER LO QUE NO HACE
-- =====================================================
-- Se llamaba 'PRESTAMO IESS' y siempre fue el quirografario. El nombre era
-- la mitad del problema: quien migraba un hipotecario elegia el 6 porque
-- parecia el generico.
UPDATE SCP.PDTR SET PDTRDSCR = 'PRESTAMO QUIROGRAFARIO IESS'
 WHERE PRBRCDGO = 212 AND PDTRALTR = 6;


-- =====================================================
-- PASO 3: ADELANTAR LA SECUENCIA
-- =====================================================
ALTER SEQUENCE SCP.SQ_PDTRCDGO RESTART START WITH 1079;

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION
-- =====================================================
-- Esperado: 10 detalles, del 1 al 10, con el 6 renombrado.
SELECT PDTRALTR, PDTRDSCR FROM SCP.PDTR WHERE PRBRCDGO = 212 ORDER BY PDTRALTR;


-- =====================================================
-- PASO 5: EL SALDO DE CALDERON PASA AL TIPO NUEVO
-- =====================================================
-- Su anticipo se cargo como tipo 7 PRESTAMO_INTERNO porque no habia otro, y
-- se materializo en el concepto «Prestamo interno». Cambiar el tipo en SLAP
-- --y no solo el concepto del DSRC-- es lo que hace que cualquier
-- reaplicacion futura salga bien sola.
--
-- CORRER ESTO SOLO DESPUES de que el backend publique el case 9. Antes, el
-- tipo 9 se rechaza en la validacion y el saldo quedaria inaplicable.
UPDATE RHH.SLAP SET SLAPTPSL = 9
 WHERE SLAPTPSL = 7 AND SLAPIDNT = '1719624809';

COMMIT;

SELECT SLAPCDGO, SLAPIDNT, SLAPTPSL, SLAPVLOR, SLAPNMCT, SLAPOBSR
  FROM RHH.SLAP WHERE SLAPTPSL IN (7, 9);
-- Esperado: una fila, tipo 9, 700,00, 2 cuotas.


-- =====================================================
-- LO QUE FALTA EN JAVA -- no lo hace este script
-- =====================================================
-- 1. Las dos constantes en RhhTipoSaldoApertura:
--        public static final int ANTICIPO = 9;
--        public static final int PRESTAMO_HIPOTECARIO_IESS = 10;
--
-- 2. Sus dos case en el switch de aplicar:
--        case ANTICIPO:
--            aplicaDescuento(saldo, RhhTipoDescuentoRecurrente.ANTICIPO_DE_SUELDO, usuario);
--        case PRESTAMO_HIPOTECARIO_IESS:
--            aplicaDescuento(saldo, RhhTipoDescuentoRecurrente.PRESTAMO_HIPOTECARIO_IESS, usuario);
--
-- 3. **Y sus dos case en validaCamposPorTipo**, junto a los tipos 6 y 7,
--    para que exijan saldo pendiente y numero de cuotas. Sin esto, los
--    tipos nuevos pasarian la validacion por la puerta de atras y llegarian
--    a aplicar sin comprobar nada. Lo advirtio el backend y es la parte que
--    se olvida.
--
-- 4. Revisar validaConceptoDelPrestamo, que hoy supone quirografario para
--    cualquier saldo de tipo 6.
--
-- Todo el resto del camino ya existe y esta probado: aplicaDescuento creo su
-- DSRC y sus CTDS hoy con el tipo 7, RhhTipoDescuentoRecurrente ya tiene
-- ANTICIPO_DE_SUELDO = 3 y PRESTAMO_HIPOTECARIO_IESS, rolDelDescuento ya los
-- mapea, y los conceptos estan cargados. Lo unico que cambia es el rol con
-- el que se localiza el concepto.
