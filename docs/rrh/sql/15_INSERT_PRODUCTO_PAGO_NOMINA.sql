-- =====================================================
-- MODULO: RHH - PRODUCTO DE PAGO PARA EL EGRESO DE NOMINA
-- DESCRIPCION: Crea el grupo y el producto "PAGO DE NOMINA" en PGS, para
--              que la orden de pago pueda enlazar su TSR.EGRS consolidado.
--              Cierra el hueco 2 reportado por el backend en la fase 6.
-- ORDEN DE EJECUCION: 15 (despues del 14)
-- PARAMETRO: :EMPRESA -- mismo valor que en los scripts 05, 07, 08, 09 y 10
-- FECHA: 2026-08-19
-- =====================================================
-- POR QUE
--   TSR.EGRS necesita dos referencias que la nomina no tenia:
--
--   EGRSTTLR (titular)  -> NULLABLE = 'Y'.  Verificado en base el 2026-08-19.
--       Confirma el Javadoc de Egreso: el titular es obligatorio solo cuando
--       el archivo del banco sale de el. El de nomina NO sale del titular:
--       sale de RHH.DRPG, que lleva su propio snapshot de cuenta, banco,
--       identificacion y beneficiario por empleado. Asi que el egreso de
--       nomina va SIN TITULAR, legitimamente y no por omision.
--
--   EGRSPRDP (producto) -> NULLABLE = 'N'.  Obligatorio.
--       Aqui si hace falta una fila. Lo que estaba vetado era REUTILIZAR un
--       producto de otro dominio --meteria datos validos del dominio
--       equivocado en la conciliacion bancaria--; crear el propio es
--       exactamente lo que ese catalogo existe para hacer: clasificar el
--       gasto. El pago de nomina es un gasto clasificable como cualquier
--       otro.
--
-- SOBRE LA CUENTA CONTABLE DEL GRUPO
--   PGS.GRPP lleva PLNNCDGO, de donde CXP saca la cuenta del gasto. El plan
--   de cuentas definitivo sigue pendiente del cliente, asi que el grupo se
--   crea apuntando a la cuenta MARCADORA 9678, igual que las lineas de
--   plantilla del script 09. Es deliberado y visible: cuando llegue el plan,
--   se reemplaza junto con las demas.
--
--   No afecta al asiento de pago de nomina, que NO sale de este grupo sino
--   de la plantilla CFNMPLPG con las lineas 50-59 del rubro 214. El grupo
--   solo clasifica el egreso para tesoreria.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACIONES PREVIAS
-- =====================================================
-- 1) Que no exista ya (reejecucion). DEBE DEVOLVER CERO FILAS:
--   SELECT ID, NOMBRE FROM PGS.PRDP WHERE CODIGO = 'NOMINA';
--
-- 2) La nulabilidad que justifica este script, ya verificada:
--   SELECT column_name, nullable FROM all_tab_columns
--    WHERE owner = 'TSR' AND table_name = 'EGRS'
--      AND column_name IN ('EGRSTTLR','EGRSPRDP');
--   Resultado del 2026-08-19:  EGRSTTLR = Y   EGRSPRDP = N


-- =====================================================
-- PASO 1: EL GRUPO DE PRODUCTO
-- =====================================================
-- GRPPCDGO va por secuencia (PGS.SQ_GRPPCDGO), no por IDENTITY.
-- GRPPRYYA / GRPPRZZA: tipo de grupo, detalle del rubro 74. SERVICIO = 2:
-- el pago de nomina no mueve inventario ni es un bien.
INSERT INTO PGS.GRPP (GRPPCDGO, GRPPNMBR, GRPPRYYA, GRPPRZZA, PLNNCDGO, GRPPESTD, PJRQCDGO)
VALUES (PGS.SQ_GRPPCDGO.NEXTVAL, 'PAGO DE NOMINA', 2, 2, 9678, 1, :EMPRESA);


-- =====================================================
-- PASO 2: EL PRODUCTO
-- =====================================================
-- ID es IDENTITY, no se informa. El grupo se resuelve por nombre y empresa,
-- para no depender del valor que devolvio la secuencia en el paso 1.
INSERT INTO PGS.PRDP (EMPRESA, GRUPOPRODUCTO, NOMBRE, CODIGO, DESCRIPCION,
                      PRECIOUNITARIO, DESCUENTO, INCLUYEIVA, STOCK, MANEJAUNIDAD, ESTADO)
SELECT :EMPRESA,
       g.GRPPCDGO,
       'PAGO DE NOMINA',
       'NOMINA',
       'Producto tecnico que clasifica el egreso consolidado de la orden de pago de nomina (RHH.RDPG). No se factura ni se vende: existe porque TSR.EGRS.EGRSPRDP es obligatorio',
       0, 0, 0, 0, 0, 1
  FROM PGS.GRPP g
 WHERE g.GRPPNMBR = 'PAGO DE NOMINA' AND g.PJRQCDGO = :EMPRESA;

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- 1) El producto existe, con su grupo y la cuenta marcadora:
-- SELECT p.ID, p.NOMBRE, p.CODIGO, g.GRPPNMBR, g.PLNNCDGO
--   FROM PGS.PRDP p JOIN PGS.GRPP g ON g.GRPPCDGO = p.GRUPOPRODUCTO
--  WHERE p.CODIGO = 'NOMINA' AND p.EMPRESA = :EMPRESA;
--   PLNNCDGO debe salir 9678: es el marcador, se reemplaza con el plan de cuentas.
--
-- 2) Una sola fila, sin duplicados por reejecucion:
-- SELECT COUNT(*) FROM PGS.PRDP WHERE CODIGO = 'NOMINA' AND EMPRESA = :EMPRESA;   -- 1
--
-- =====================================================
-- QUE HACE EL BACKEND CON ESTO
-- =====================================================
--   GeneracionOrdenPagoService, al confirmar la acreditacion, crea el
--   TSR.EGRS consolidado asi:
--     - titular  -> null  (legitimo: el archivo sale de DRPG)
--     - producto -> el de CODIGO = 'NOMINA' de la empresa, localizado por
--                   ese codigo, NO por su ID: el ID lo asigna IDENTITY y
--                   cambia entre instalaciones.
--     - asiento  -> el que devuelve contabilizarPago
--     - valor    -> RDPGTTAL
--   y guarda EGRSCDGO en RHH.RDPG.EGRSCDGO, que es el enlace que faltaba
--   para que la conciliacion bancaria pueda casar el pago con el extracto.
--
--   Si el producto no existe, el servicio debe LANZAR indicando que falta
--   ejecutar este script, no crear la fila al vuelo: es parametria, y
--   crearla en caliente esconderia una instalacion a medio configurar.
