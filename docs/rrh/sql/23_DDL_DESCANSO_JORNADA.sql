-- =====================================================
-- MODULO: RHH - EL DESCANSO EN LA JORNADA TEORICA
-- DESCRIPCION: Minutos de descanso en TRNO y DTLL, con la misma precedencia
--              DTLL -> TRNO que ya tienen entrada y salida. Y el turno de
--              ASOPREP con su horario real.
-- ORDEN DE EJECUCION: 23
-- FECHA: 2026-08-20
-- =====================================================
-- EL HUECO
--   ConsolidacionMarcacionesServiceImpl:254-256 calcula la jornada teorica
--   como el intervalo BRUTO entre entrada y salida, sin restar nada. Con el
--   horario real de ASOPREP -- 08:30 a 17:30 con una hora de almuerzo --
--   la teorica daria 9 horas mientras el trabajador solo puede acumular 8.
--
--   Consecuencia: nadie alcanza nunca su jornada, y las horas
--   suplementarias no empiezan a contar hasta las 18:30 en lugar de las
--   17:30. Una hora de trabajo extra al dia que no se paga, sin error y sin
--   aviso -- la misma familia que el desfase de cinco horas del offset.
--
--   No bloquea la calibracion: H. EXTRAS y H. SUPLEMENTARIAS estan en cero
--   en los siete meses de ASOPREP. Bloquea el pago de horas extra, que es
--   lo que van a empezar a hacer.
--
-- POR QUE DOS COLUMNAS Y NO UNA
--   El modelo ya admite que un viernes tenga otro horario -- DTLLENTR y
--   DTLLSLDA anulan a los del turno. Con una sola columna en TRNO no
--   admitiria que ese viernes tenga otro almuerzo. Es una columna de mas
--   ahora contra un delta de mas despues.
--
-- NULABLES Y SIN DEFAULT, A PROPOSITO
--   Nada de DEFAULT con CHECK NOT NULL. Es justo la mina que costo el
--   ORA-02290 de PRDNFCHR y las veinticuatro que el sellado de auditoria
--   desactivo. Nulo significa "sin descanso" y el codigo lo trata como 0.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
SELECT COUNT(*) AS TURNOS FROM RHH.TRNO;
SELECT COUNT(*) AS DETALLES FROM RHH.DTLL;   -- esperado 7
SELECT TRNOCDGO, TRNONMBR, TRNOENTR, TRNOSLDA FROM RHH.TRNO;


-- =====================================================
-- PASO 1: LAS DOS COLUMNAS
-- =====================================================
ALTER TABLE RHH.TRNO ADD (TRNOMNDS NUMBER);
ALTER TABLE RHH.DTLL ADD (DTLLMNDS NUMBER);

COMMENT ON COLUMN RHH.TRNO.TRNOMNDS IS 'Minutos de descanso no remunerado de la jornada. Nulo = sin descanso';
COMMENT ON COLUMN RHH.DTLL.DTLLMNDS IS 'Minutos de descanso del dia; anula al del turno. Nulo = usar el del turno';


-- =====================================================
-- PASO 2: EL HORARIO REAL DE ASOPREP
-- =====================================================
-- 08:30 a 17:30 con una hora de almuerzo = 8 horas pagadas.
-- El 08:00-17:00 del script 19 era solo para medir la franja nocturna del
-- sintetico, que ya cumplio su proposito.
UPDATE RHH.TRNO
   SET TRNONMBR = 'JORNADA ADMINISTRATIVA 08:30-17:30',
       TRNOENTR = '08:30',
       TRNOSLDA = '17:30',
       TRNOMNDS = 60
 WHERE TRNOCDGO = 1;

UPDATE RHH.DTLL
   SET DTLLENTR = '08:30',
       DTLLSLDA = '17:30'
 WHERE TRNOCDGO = 1 AND DTLLLBRB = 'S';

-- El detalle NO lleva descanso propio: hereda los 60 del turno. Se deja en
-- nulo a proposito, para que un cambio de politica se haga en un solo sitio.

COMMIT;


-- =====================================================
-- PASO 3: COMPROBACION
-- =====================================================
-- Esperado: turno 08:30-17:30 con 60 minutos; siete detalles, cinco
-- laborables a 08:30-17:30 y dos sin horario; DTLLMNDS nulo en los siete.
SELECT TRNOCDGO, TRNONMBR, TRNOENTR, TRNOSLDA, TRNOMNDS, TRNOMNTS FROM RHH.TRNO;

SELECT DTLLDIAA, DTLLENTR, DTLLSLDA, DTLLLBRB, DTLLMNDS
  FROM RHH.DTLL ORDER BY DTLLDIAA;


-- =====================================================
-- LO QUE FALTA EN JAVA -- no lo hace este script
-- =====================================================
-- 1. La jornada teorica pasa a ser el intervalo MENOS el descanso, con la
--    precedencia DTLL -> TRNO que ya usa hora(...) para entrada y salida:
--
--        double horasJornada = 0D;
--        if (laborable && entradaTeorica != null && salidaTeorica != null) {
--            long minutos = Duration.between(entradaTeorica, salidaTeorica).toMinutes()
--                         - descanso(detalle, turno);   // DTLLMNDS -> TRNOMNDS -> 0
--            horasJornada = Math.max(0, minutos) / MINUTOS_POR_HORA;
--        }
--
--    Con 08:30-17:30 y 60 minutos: 8,0 horas.
--
-- 2. **Y la segunda mitad, que va tambien y ahora.** De las horas
--    TRABAJADAS se resta el descanso parametrizado **solo cuando el dia no
--    trae pares intermedios de marcacion**, o sea cuando el reloj no
--    registro la salida a almorzar.
--
--    El backend la planteo como condicionada a saber cuantas marcaciones
--    diarias produce el reloj de ASOPREP -- dato que sigue pendiente con el
--    archivo del biometrico. **No hace falta saberlo: la regla se adapta
--    sola.**
--
--      * Dia con cuatro marcaciones -> hay pares intermedios -> se usa el
--        almuerzo REAL y no se resta el teorico. Conducta actual, intacta.
--      * Dia con dos marcaciones -> no hay pares -> se resta el teorico.
--      * Y si el reloj cambia, o si una persona marca cuatro y otra dos, o
--        si alguien olvida marcar la salida a almorzar un martes, cada dia
--        se resuelve por lo que ese dia trae.
--
--    Implementarla siempre es estrictamente mas seguro que condicionarla:
--    cuando hay cuatro marcaciones no hace nada.
--
--    Y corrige de paso un error de signo que hoy esta latente: con dos
--    marcaciones, la presencia bruta de 9 horas contra una jornada de 8
--    daria una hora de suplementarias diaria que nadie trabajo.
