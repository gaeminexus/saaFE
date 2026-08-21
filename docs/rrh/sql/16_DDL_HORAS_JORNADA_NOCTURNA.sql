-- =====================================================
-- MODULO: RHH - LAS HORAS QUE DELIMITAN LA JORNADA NOCTURNA
-- DESCRIPCION: Anade PRNMHRIN y PRNMHRFN a RHH.PRNM. Saca del codigo las
--              19h00 y las 06h00 del Art. 49 del Codigo del Trabajo, que la
--              fase 7 dejo como constantes.
-- ORDEN DE EJECUCION: 16 (despues del 15)
-- PARAMETROS: ninguno
-- FECHA: 2026-08-19
-- =====================================================
-- POR QUE, SI SON LEY Y NO PARAMETRO DE EMPRESA
--   El backend las dejo en Java argumentando que son definicion legal: si
--   cambian, cambia la ley, no un UPDATE. El argumento es honesto pero no
--   distingue este caso de los que ya estan parametrizados, y ahi esta el
--   problema:
--
--     PRNMDIVC = 15 dias de vacaciones      -> Art. 69  CT
--     PRNMDSPR = 25% de desahucio           -> Art. 185 CT
--     PRNMDIMN / PRNMDIMX  indemnizacion    -> Art. 188 CT
--     PRNMRCNC = 25% de recargo nocturno    -> Art. 49  CT  <-- el mismo articulo
--
--   Todos son igual de "ley" y todos viven en PRNM. Dejar en el codigo justo
--   las dos horas del MISMO articulo cuyo porcentaje ya esta parametrizado es
--   una inconsistencia, no una decision de diseno. Y la regla 1 del maestro no
--   dice "nada que dependa de la empresa": dice que un cambio de normativa se
--   resuelve con un UPDATE y nunca con un despliegue.
--
--   El coste de equivocarse es asimetrico: parametrizarlas cuesta dos columnas;
--   dejarlas en Java cuesta un despliegue completo de un ERP en produccion sin
--   tests el dia que el legislador mueva la franja.
--
-- FORMATO
--   Hora entera del dia, 0 a 23. La ley usa horas en punto y ninguna reforma
--   ecuatoriana ha usado fracciones. Si algun dia hiciera falta 19h30, se
--   cambia el tipo; hoy seria complicar el codigo por un caso inexistente.
-- =====================================================


-- =====================================================
-- PASO 1: LAS DOS COLUMNAS
-- =====================================================
ALTER TABLE RHH.PRNM ADD (
    PRNMHRIN NUMBER, -- Hora de inicio de la jornada nocturna
    PRNMHRFN NUMBER  -- Hora de fin de la jornada nocturna
);

COMMENT ON COLUMN RHH.PRNM.PRNMHRIN IS 'Hora del dia (0-23) en que empieza la jornada nocturna. Art. 49 del Codigo del Trabajo: 19. La jornada ordinaria cumplida entre esta hora y PRNMHRFN lleva el recargo de PRNMRCNC';
COMMENT ON COLUMN RHH.PRNM.PRNMHRFN IS 'Hora del dia (0-23) en que termina la jornada nocturna. Art. 49 del Codigo del Trabajo: 6. La franja cruza la medianoche: es nocturno lo que va de PRNMHRIN a 24h00 y de 00h00 a PRNMHRFN';


-- =====================================================
-- PASO 2: LOS VALORES VIGENTES
-- =====================================================
-- Todos los anios cargados: la franja no ha cambiado.
UPDATE RHH.PRNM SET PRNMHRIN = 19, PRNMHRFN = 6
 WHERE PRNMHRIN IS NULL OR PRNMHRFN IS NULL;

COMMIT;


-- =====================================================
-- VERIFICACION
-- =====================================================
-- Una fila por anio cargado, las dos horas informadas:
-- SELECT PRNMANOO, PRNMHRIN, PRNMHRFN, PRNMRCNC FROM RHH.PRNM ORDER BY PRNMANOO;
--   Esperado: 19 / 6 / 25 en cada anio.
--
-- =====================================================
-- QUE HACE EL BACKEND CON ESTO
-- =====================================================
--   ConsolidacionMarcacionesService sustituye las dos constantes por
--   prnm.getHoraInicioNocturna() y prnm.getHoraFinNocturna(). Como la franja
--   cruza la medianoche, la comparacion NO es "hora >= inicio && hora < fin"
--   sino "hora >= inicio || hora < fin". Escribirla de la primera forma da
--   cero horas nocturnas siempre, en silencio: es el error clasico de las
--   franjas que cruzan medianoche y conviene dejarlo comentado en el codigo.
--
--   Nombres de propiedad para el contrato: horaInicioNocturna y
--   horaFinNocturna, ambos Long.
