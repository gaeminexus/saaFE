-- =====================================================
-- MODULO: RHH - EL RUC SALE DEL FACTURADOR, NO DE UNA COPIA EN CFNM
-- DESCRIPCION: Retira RHH.CFNM.CFNMRUCC. RRHH leera el RUC de CBR.FCDR.
--              Revierte la parte de carga del sql/43.
-- ORDEN DE EJECUCION: 45
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- ⛔ NO EJECUTAR ANTES DE PUBLICAR EL WAR QUE RETIRA EL MAPEO.
--
-- El WAR desplegado hoy mapea ConfiguracionNomina.rucEmpleador -> CFNMRUCC, y
-- persistence.xml NO tiene hbm2ddl.auto, asi que Hibernate no valida el
-- esquema al arrancar. Borrar la columna con ese WAR vivo **no falla al
-- desplegar**: falla la PRIMERA VEZ que algo lea CFNM --o sea, al calcular una
-- nomina-- con ORA-00904 y a mitad del proceso. Es justo el patron que este
-- proyecto lleva persiguiendo: el fallo aparece lejos de su causa.
--
-- ORDEN OBLIGATORIO:
--   1. Backend: quitar rucEmpleador de ConfiguracionNomina y leer el RUC de
--      CBR.FCDR en leeCabecera.
--   2. Mike: compilar y publicar.
--   3. Y SOLO ENTONCES, este script.
--
-- DECISION DEL 2026-08-21: **RRHH lee el RUC de CBR.FCDR y se asume la
-- dependencia del modulo de facturacion.** Una sola fuente, en vez de una
-- copia en CFNM que pudiera divergir.
--
-- La dependencia es limpia: CBR.FCDR.EMPRESA es FK a SCP.PJRQ.PJRQCDGO, asi
-- que RRHH lee el facturador DE SU EMPRESA, no "el primero que haya":
--   SELECT f.NUMDOC FROM CBR.FCDR f WHERE f.EMPRESA = :empresa
--
-- LO QUE **NO** SE VA: CFNMSCIE (sucursal IESS), CFNMTPEM (tipo de empleador)
-- y CFNMSGSC (codigo de seguro social) se quedan en CFNM. No estan en FCDR
-- --verificado columna por columna-- y no son conceptos de facturacion: la
-- sucursal del IESS no es un establecimiento del SRI, son numeraciones de
-- organismos distintos.
--
-- CONSECUENCIA PARA EL PRODUCTO: el modulo RRHH **ya no es instalable sin el
-- modulo de facturacion**. Anotado en PRODUCTO-BLANQUEO-NUEVO-CLIENTE.md §3bis.
-- Si algun dia hace falta venderlo suelto, la salida es subir el RUC a
-- SCP.PJRQ --su sitio natural-- y que los dos modulos lean de alli; no volver
-- a la copia.
-- =====================================================


-- -----------------------------------------------------
-- CONTROL 1: el WAR ya no debe mapear la columna.
-- Comprobacion fuera de SQL, antes de seguir:
--   javap -p .../WEB-INF/classes/com/saa/model/rhh/ConfiguracionNomina.class | grep -ci ruc
-- Debe dar 0. Si da mas, PARAR: el WAR publicado todavia la mapea.
-- -----------------------------------------------------

-- -----------------------------------------------------
-- CONTROL 2: el facturador de la empresa existe y su RUC coincide con el que
-- el sql/43 dejo en CFNM. Si no coinciden, PARAR y averiguar cual es el bueno
-- ANTES de borrar el unico sitio donde uno de los dos vive.
-- -----------------------------------------------------
SELECT f.ID, f.EMPRESA, f.NUMDOC AS RUC, SUBSTR(f.RAZONSOCIAL, 1, 60) AS RAZON_SOCIAL
  FROM CBR.FCDR f WHERE f.EMPRESA = :EMPRESA;
-- Esperado en ASOPREP: 1 · 1236 · 1791367596001 · ASOCIACION DEL FONDO...

SELECT c.CFNMRUCC AS EN_CFNM,
       (SELECT f.NUMDOC FROM CBR.FCDR f WHERE f.EMPRESA = :EMPRESA) AS EN_FACTURADOR,
       CASE WHEN c.CFNMRUCC = (SELECT f.NUMDOC FROM CBR.FCDR f WHERE f.EMPRESA = :EMPRESA)
            THEN 'COINCIDEN' ELSE '*** REVISAR ANTES DE BORRAR ***' END AS VEREDICTO
  FROM RHH.CFNM c WHERE c.PJRQCDGO = :EMPRESA;


ALTER TABLE RHH.CFNM DROP COLUMN CFNMRUCC;


-- -----------------------------------------------------
-- CONTROL DESPUES
-- -----------------------------------------------------
SELECT COUNT(*) AS CFNMRUCC_DEBE_SER_CERO FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'RHH' AND TABLE_NAME = 'CFNM' AND COLUMN_NAME = 'CFNMRUCC';

SELECT c.PJRQCDGO, c.CFNMSCIE AS SUCURSAL_IESS,
       NVL(c.CFNMTPEM, '(pendiente del portal)') AS TIPO_EMPLEADOR,
       c.CFNMSGSC AS SEGURO_SOCIAL,
       (SELECT f.NUMDOC FROM CBR.FCDR f WHERE f.EMPRESA = c.PJRQCDGO) AS RUC_DESDE_FACTURADOR
  FROM RHH.CFNM c WHERE c.PJRQCDGO = :EMPRESA;
-- Esperado: 1236 · 0001 · (pendiente del portal) · R · 1791367596001
