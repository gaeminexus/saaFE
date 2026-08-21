-- =====================================================
-- MODULO: RHH - EL RUC DEL EMPLEADOR, QUE NO ESTABA EN NINGUNA PARTE
-- DESCRIPCION: Anade CFNMRUCC a RHH.CFNM y carga los datos de cabecera del
--              archivo batch del IESS para ASOPREP.
-- ORDEN DE EJECUCION: 43
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- POR QUE EXISTE, y es una correccion de un error mio: el comentario del
-- sql/41 daba por hecho que "el RUC ya esta en la empresa". NO ESTA.
-- Verificado en la BD el 2026-08-21:
--   SCP.PJRQ tiene PJRQCDGO, PGSPCDGO, PJRQNMBR, PJRQNVLL, PJRQCDPD, PJRQINGR.
--   Ni una columna con RUC ni con identificacion, en NINGUNA tabla de SCP.
-- Y el RUC es el PRIMER campo de TODOS los registros del archivo batch: sin
-- el, el exportador no puede escribir ni una linea.
--
-- POR QUE EN CFNM Y NO EN LA EMPRESA: tocar SCP.PJRQ es tocar el nucleo del
-- ERP, que usan todos los modulos. El RUC que el IESS necesita es el del
-- EMPLEADOR a efectos de historia laboral, junto con su sucursal IESS y su
-- tipo de empleador, que ya viven en CFNM desde el sql/41. Los cuatro datos
-- de la cabecera del archivo quedan asi en el mismo sitio. Si algun dia el
-- ERP incorpora el RUC a la empresa, esta columna se alimenta de alli.
-- =====================================================

-- -----------------------------------------------------
-- CONTROL ANTES: la columna no debe existir todavia.
-- -----------------------------------------------------
SELECT COUNT(*) AS YA_EXISTE FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'RHH' AND TABLE_NAME = 'CFNM' AND COLUMN_NAME = 'CFNMRUCC';
-- Esperado: 0. Si da 1, este script ya corrio: no repetir el ALTER.


ALTER TABLE RHH.CFNM ADD (CFNMRUCC VARCHAR2(13));
COMMENT ON COLUMN RHH.CFNM.CFNMRUCC IS
    'RUC del empleador, 13 digitos. Primer campo de todo registro del archivo batch del IESS.';


-- -----------------------------------------------------
-- LOS CUATRO DATOS DE CABECERA DEL ARCHIVO, PARA ASOPREP
-- -----------------------------------------------------
-- Fuente: C:\Docs\Clientes\Asoprep\rrhh\REsumen\REFERENCIA-ASOPREP.md
--   RUC 1791367596001 · Sucursal IESS 0001 (aparece como "1791367596001 - 0001")
-- El tipo de empleador NO se carga: el formato dice "Tomar el codigo asignado"
-- y ese codigo lo asigna el IESS a cada empleador. Se lee del portal y se
-- registra por pantalla. El exportador debe negarse mientras este nulo, igual
-- que con los '?' del catalogo.
UPDATE RHH.CFNM
   SET CFNMRUCC = '1791367596001',
       CFNMSCIE = '0001',
       CFNMSGSC = 'R'                       -- Ley de Seguro Social vigente (Ley 21), regimen privado
 WHERE PJRQCDGO = :EMPRESA;


-- -----------------------------------------------------
-- CONTROL DESPUES
-- -----------------------------------------------------
SELECT PJRQCDGO, CFNMRUCC, CFNMSCIE, NVL(CFNMTPEM, '(pendiente del portal)') AS TIPO_EMPLEADOR,
       CFNMSGSC
  FROM RHH.CFNM WHERE PJRQCDGO = :EMPRESA;
-- Esperado: 1791367596001 · 0001 · (pendiente del portal) · R
--
-- Con esto, la cabecera de cada registro batch queda:
--   1791367596001;0001;YYYY;MM;<TIPO>;<CEDULA>;...
-- y lo unico que falta para exportar es el codigo de tipo de empleador.
