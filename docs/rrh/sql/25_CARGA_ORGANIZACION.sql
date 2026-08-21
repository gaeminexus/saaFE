-- =====================================================
-- MODULO: RHH - ORGANIZACION DE ASOPREP: DEPARTAMENTO Y CARGOS
-- DESCRIPCION: Un departamento contenedor y los 19 cargos reales del
--              personal, con su union DPTC. Es el paso 1 de la fase A:
--              el script 26 referencia estos cargos.
-- ORDEN DE EJECUCION: 25
-- FECHA: 2026-08-20
-- =====================================================
-- LA CADENA, QUE NO ES OBVIA
--   Ni Empleado ni ContratoEmpleado tienen columna de cargo. El cargo del
--   empleado vive en RHH.HSTR -- el historial de posiciones -- que apunta a
--   DPTC, y DPTC une DPRT con CRGO:
--
--       DPRT ──┐
--              ├──> DPTC <── HSTR ──> MPLD
--       CRGO ──┘
--
--   Verificado: el motor NO lee nada de esto. Cero referencias a Historial
--   o getCargo() en ProcesoNominaServiceImpl y LiquidacionHaberesServiceImpl.
--   Son datos organizativos para la ficha y los reportes, no para el
--   calculo. Por eso su carga no bloquea la calibracion.
--
-- POR QUE UN SOLO DEPARTAMENTO
--   Los cargos son dato real: REF-01 los trae, uno por persona. Los
--   departamentos NO estan en ningun documento del cliente -- no hay
--   organigrama. Lo que si hay son cuatro sucursales (Quito matriz, Coca,
--   Lago Agrio, Esmeraldas), pero sucursal no es departamento y convertir
--   una en otra seria inventar una estructura organizativa.
--
--   Se crea un contenedor unico y queda dicho que la estructura real la
--   define ASOPREP cuando quiera. Cambiarla despues es reasignar DPTC: no
--   hay que recargar empleados ni recalcular nada.
--
-- LOS CODIGOS NO SE ESCRIBEN
--   DPRTCDGO, CRGOCDGO y DPTCCDGO son IDENTITY. No se nombran en el INSERT
--   -- se dejan a la secuencia -- y todo lo posterior los referencia por
--   nombre. Nombrarlos con valores explicitos funcionaria pero dejaria la
--   secuencia desincronizada.
--
--   Y no se nombran las *FCHR: llevan DEFAULT SYSDATE con CHECK NOT NULL,
--   asi que omitirlas deja entrar el default y nombrarlas con nulo revienta.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA -- las tres deben estar vacias
-- =====================================================
SELECT 'DPRT' AS TABLA, COUNT(*) AS FILAS FROM RHH.DPRT
UNION ALL SELECT 'CRGO', COUNT(*) FROM RHH.CRGO
UNION ALL SELECT 'DPTC', COUNT(*) FROM RHH.DPTC;


-- =====================================================
-- PASO 1: EL DEPARTAMENTO CONTENEDOR
-- =====================================================
INSERT INTO RHH.DPRT (DPRTNMBR, DPRTESTD, DPRTUSRR)
VALUES ('ADMINISTRACION GENERAL', 'A', 'CARGA');


-- =====================================================
-- PASO 2: LOS 19 CARGOS
-- =====================================================
-- Tomados de REF-01 §2 y §3, normalizados:
--   * "AUXLIAR DE CREDITO" -> "AUXILIAR DE CREDITO" (errata del cliente,
--     documentada en REF-06 §15).
--   * "CONTADORA" -> "CONTADOR": el cargo del catalogo no lleva genero.
--   * "AUXILIAR DE LIMPIEZA MEDIO TIEMPO" -> "AUXILIAR DE LIMPIEZA": la
--     media jornada es del contrato, no del cargo. Mendez Torres pasa a
--     tiempo completo en abril sin cambiar de cargo.
INSERT INTO RHH.CRGO (CRGONMBR, CRGOESTD, CRGOUSRR)
SELECT d.NMBR, 'A', 'CARGA' FROM (
    SELECT 'ADMINISTRADOR DEL EDIFICIO'   AS NMBR FROM DUAL UNION ALL
    SELECT 'ASISTENTE CONTABLE'                   FROM DUAL UNION ALL
    SELECT 'ASISTENTE DE CREDITO'                 FROM DUAL UNION ALL
    SELECT 'ASISTENTE DE GERENCIA'                FROM DUAL UNION ALL
    SELECT 'ASISTENTE DE SUCURSAL'                FROM DUAL UNION ALL
    SELECT 'ASISTENTE LEGAL'                      FROM DUAL UNION ALL
    SELECT 'AUXILIAR DE ARCHIVO'                  FROM DUAL UNION ALL
    SELECT 'AUXILIAR DE CREDITO'                  FROM DUAL UNION ALL
    SELECT 'AUXILIAR DE LIMPIEZA'                 FROM DUAL UNION ALL
    SELECT 'CONTADOR'                             FROM DUAL UNION ALL
    SELECT 'JEFA FINANCIERA'                      FROM DUAL UNION ALL
    SELECT 'JEFE ADMINISTRATIVO'                  FROM DUAL UNION ALL
    SELECT 'JEFE DE CREDITO'                      FROM DUAL UNION ALL
    SELECT 'JEFE DE SISTEMAS'                     FROM DUAL UNION ALL
    SELECT 'JEFE DE SUCURSAL COCA'                FROM DUAL UNION ALL
    SELECT 'JEFE DE SUCURSAL ESMERALDAS'          FROM DUAL UNION ALL
    SELECT 'JEFE LEGAL'                           FROM DUAL UNION ALL
    SELECT 'MENSAJERO'                            FROM DUAL UNION ALL
    SELECT 'RECEPCIONISTA'                        FROM DUAL
) d;


-- =====================================================
-- PASO 3: LA UNION -- todos los cargos bajo el departamento
-- =====================================================
INSERT INTO RHH.DPTC (DPRTCDGO, CRGOCDGO, DPTCESTD, DPTCUSRR)
SELECT dp.DPRTCDGO, cr.CRGOCDGO, 'A', 'CARGA'
  FROM RHH.DPRT dp CROSS JOIN RHH.CRGO cr
 WHERE dp.DPRTNMBR = 'ADMINISTRACION GENERAL';

COMMIT;


-- =====================================================
-- PASO 4: COMPROBACION
-- =====================================================
-- Esperado: 1 departamento, 19 cargos, 19 uniones.
SELECT 'DPRT' AS TABLA, COUNT(*) AS FILAS FROM RHH.DPRT
UNION ALL SELECT 'CRGO', COUNT(*) FROM RHH.CRGO
UNION ALL SELECT 'DPTC', COUNT(*) FROM RHH.DPTC;

-- Y que cada cargo tenga exactamente una union, ninguno suelto:
SELECT c.CRGONMBR, COUNT(d.DPTCCDGO) AS UNIONES
  FROM RHH.CRGO c LEFT JOIN RHH.DPTC d ON d.CRGOCDGO = c.CRGOCDGO
 GROUP BY c.CRGONMBR
 ORDER BY c.CRGONMBR;
-- Esperado: 19 filas, todas con 1.
