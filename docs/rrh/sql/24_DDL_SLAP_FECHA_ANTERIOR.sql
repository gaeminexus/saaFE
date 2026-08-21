-- =====================================================
-- MODULO: RHH - EL VALOR PREVIO QUE LA REVERSION NECESITA
-- DESCRIPCION: RHH.SLAP.SLAPFCAN, para que revertir un saldo de antiguedad
--              devuelva la fecha de ingreso que el empleado tenia antes,
--              en vez de conservarla o borrarla.
-- ORDEN DE EJECUCION: 24
-- FECHA: 2026-08-20
-- =====================================================
-- EL PROBLEMA, Y POR QUE NO SE ARREGLA SIN COLUMNA
--   aplicaAntiguedad hace empleado.setFechaIngreso(saldo.getFecha()) sin
--   guardar el valor anterior. La reversion, por tanto, no puede
--   restaurarlo: solo puede dejarlo o anularlo. En la version original lo
--   anulaba, asi que un aplicar -> revisar -> revertir sobre 22 personas
--   dejaba a toda la plantilla sin fecha de ingreso y sin un solo error.
--   De esa fecha salen la antiguedad, el derecho a fondos de reserva, el
--   decimo cuarto proporcional y los anos de servicio del finiquito.
--
--   El backend ya mitigo el dano sin DDL -- revertir conserva el dato en
--   vez de borrarlo, y validar avisa antes de sustituir -- y las dos
--   decisiones son correctas: entre conservar de mas y borrar, conservar es
--   lo unico recuperable. Pero eso es contencion, no reversion.
--
-- POR QUE AQUI Y NO EN LA OBSERVACION
--   Meter una fecha dentro de SLAPOBSR seria escribir un dato estructurado
--   en un campo de texto libre: imposible de consultar, imposible de
--   validar, y roto en cuanto alguien edite la observacion. Es el
--   antipatron que la regla 1 persigue.
--
-- LO QUE COMPLETA
--   SLAP ya tiene el mecanismo de deshacer para lo que CREA filas:
--   SLAPRFTB y SLAPRFID dicen que se materializo y donde. Lo que no tiene
--   es el mecanismo para lo que SOBRESCRIBE un valor. SLAPFCAN es esa
--   segunda mitad.
--
-- SIN HISTORICO QUE MIGRAR
--   No hay ninguna fila aplicada: la limpieza del script 20 dejo SLAP
--   vacia. En cuanto la columna exista, todo lo que se aplique sera
--   revertible con exactitud.
-- =====================================================


-- =====================================================
-- PASO 0: COMPROBACION PREVIA
-- =====================================================
-- Esperado: SLAP existe, no tiene SLAPFCAN, y esta vacia.
SELECT column_name, data_type, nullable, data_default
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'SLAP'
 ORDER BY column_id;

SELECT COUNT(*) AS FILAS_SLAP FROM RHH.SLAP;


-- =====================================================
-- PASO 1: LA COLUMNA
-- =====================================================
-- DATE, nulable y SIN default -- a proposito. Nada de DEFAULT con CHECK
-- NOT NULL: es la mina de PRDNFCHR y de las veinticuatro que el sellado de
-- auditoria desactivo.
--
-- Y el nulo aqui es significativo, no ausencia de dato: significa "el
-- empleado no tenia fecha de ingreso antes de aplicar", que es un caso
-- legitimo y que la reversion tiene que poder restaurar tal cual. Por eso
-- la columna no puede llevar NOT NULL aunque se sienta incompleta.
ALTER TABLE RHH.SLAP ADD (SLAPFCAN DATE);

COMMENT ON COLUMN RHH.SLAP.SLAPFCAN IS 'Fecha de ingreso que tenia el empleado antes de aplicar el saldo de antiguedad. Nulo = no tenia ninguna';


-- =====================================================
-- PASO 2: COMPROBACION
-- =====================================================
-- Esperado: SLAPFCAN, DATE, nullable Y, sin default.
SELECT column_name, data_type, nullable, data_default
  FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'SLAP' AND column_name = 'SLAPFCAN';

-- Y que no le haya nacido ningun CHECK NOT NULL.
SELECT constraint_name, search_condition_vc
  FROM all_constraints
 WHERE owner = 'RHH' AND table_name = 'SLAP' AND constraint_type = 'C'
   AND UPPER(search_condition_vc) LIKE '%SLAPFCAN%';
-- Esperado: cero filas


-- =====================================================
-- LO QUE FALTA EN JAVA
-- =====================================================
-- 1. La propiedad en SaldoApertura:
--        @Column(name = "SLAPFCAN") private LocalDate fechaAnterior;
--    Y en el contrato del DTO, con su nombre.
--
-- 2. aplicaAntiguedad guarda el valor previo ANTES de sobrescribir:
--        saldo.setFechaAnterior(empleado.getFechaIngreso());
--        empleado.setFechaIngreso(saldo.getFecha());
--
-- 3. La reversion restaura, incluido el nulo legitimo:
--        empleado.setFechaIngreso(saldo.getFechaAnterior());
--
--    Y con eso el aviso que hoy dice "se conserva el dato" pasa a decir lo
--    que de verdad ocurrio.
--
-- 4. Lo que validar ya reporta se queda: avisar de la discrepancia antes de
--    sustituir sigue siendo util aunque la reversion sea exacta. Reversible
--    no es lo mismo que correcto.


-- =====================================================
-- UNA PREGUNTA QUE ESTE DELTA DEJA ABIERTA
-- =====================================================
-- La fecha de ingreso es el unico escalar del maestro que la migracion
-- sobrescribe **que conozcamos**. Si hay otros -- una modalidad, un sueldo,
-- una bandera -- tienen exactamente el mismo defecto y este delta no los
-- cubre. Antes de dar la reversion por completa, revisar los ocho tipos de
-- saldo y decir cuales escriben sobre un valor existente en vez de crear
-- una fila propia. Los que creen fila ya estan cubiertos por
-- SLAPRFTB/SLAPRFID.
