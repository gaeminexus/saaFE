-- =====================================================
-- MODULO: RHH - LA COLUMNA DPRTCDGO DE HSTR, DEL DISENO ANTERIOR
-- DESCRIPCION: Registro de la correccion aplicada el 2026-08-20. La columna
--              ya esta borrada; este archivo existe para que quede el
--              porque y no se recree por descuido.
-- ORDEN DE EJECUCION: 28 -- YA EJECUTADO
-- FECHA: 2026-08-20
-- =====================================================
-- EL DEFECTO
--   RHH.HSTR tenia DOS columnas de departamento:
--     * DPRTCDGO -- original, NOT NULL por CHECK con nombre de sistema
--       (SYS_C009197), sin default, y **que ninguna entidad mapeaba**.
--     * DPTCCDGO -- anadida por el script 05, nulable, que es la que
--       Historial.java declara.
--
--   Hibernate nombra solo las columnas mapeadas, asi que dejaba DPRTCDGO en
--   nulo y el CHECK disparaba. **Ninguna fila de HSTR podia insertarse desde
--   la aplicacion**: la ficha del colaborador no podia registrar un cambio
--   de posicion, y nadie lo sabia porque nadie lo habia intentado.
--
--   Salio al cargar la apertura de ASOPREP, con un ORA-02290 en el paso 4
--   del script 26.
--
-- POR QUE BORRARLA Y NO MAPEARLA
--   Es redundante: DPTC ya apunta a DPRT, asi que el departamento es
--   derivable del departamento-cargo. Mantener las dos permite que se
--   desincronicen -- una fila cuyo DPRTCDGO diga un departamento y cuyo
--   DPTCCDGO diga otro -- y nada lo impediria.
--
--   Es denormalizacion del diseno anterior a DPTC, exactamente como
--   RBROCDGO lo era del anterior a CPNM.
--
-- LO QUE SE HIZO
--   Con HSTR en cero filas -- comprobado antes de tocar nada:
--
--     ALTER TABLE RHH.HSTR DROP COLUMN DPRTCDGO;
--
--   El CHECK SYS_C009197 se fue con ella. No habia FK que borrar: la
--   columna no tenia restriccion referencial, solo el NOT NULL.
-- =====================================================


-- =====================================================
-- COMPROBACION -- correr esto si hay dudas de que sigue bien
-- =====================================================
-- Esperado: ninguna fila. Si DPRTCDGO reaparece, alguien recreo la tabla
-- desde un DDL viejo.
SELECT column_name FROM all_tab_columns
 WHERE owner = 'RHH' AND table_name = 'HSTR' AND column_name = 'DPRTCDGO';

-- Esperado: tres FK -- CRGO, MPLD, DPTC -- y seis NOT NULL, todos sobre
-- columnas que la entidad mapea: HSTRCDGO, MPLDCDGO, CRGOCDGO, HSTRFCHI,
-- HSTRACTL y HSTRFCHR. Mas el CK_HSTRACTL de dominio ('S','N').
SELECT constraint_name, constraint_type, search_condition_vc
  FROM all_constraints
 WHERE owner = 'RHH' AND table_name = 'HSTR' AND constraint_type IN ('C','R')
 ORDER BY constraint_type, constraint_name;


-- =====================================================
-- EL PATRON, QUE YA VA POR TRES Y MERECE UN BARRIDO PROPIO
-- =====================================================
-- Misma familia, tres veces:
--
--   1. RBROCDGO en RNGL y TMLQ -- script 12. NOT NULL, FK a una tabla
--      vacia, sin mapear. Bloqueaba el calculo y la liquidacion.
--   2. RSMNFNTE en RSMN -- script 18. La entidad la declara Long y la
--      columna seguia siendo VARCHAR2 con default de texto.
--   3. DPRTCDGO en HSTR -- este. NOT NULL, sin mapear, bloqueaba el
--      historial de posiciones.
--
-- Los tres son lo mismo: **una columna del diseno anterior que la entidad
-- no mapea o mapea con otro tipo, y que nadie descubre hasta que alguien
-- escribe en esa tabla por primera vez.**
--
-- Ninguno de los barridos hechos hasta ahora los ve completos:
--   * El de NOT NULL mira columnas que existen, pero no si la entidad las
--     mapea.
--   * El inverso por getAll ve columnas que faltan en la base, no columnas
--     que sobran en la base.
--   * Ninguno compara tipos.
--
-- **El barrido que los veria: cada columna de cada tabla de RHH contra el
-- @Column de su entidad, en las dos direcciones y comparando tipo.** Lo que
-- sobre en la base y sea obligatorio es una bomba; lo que falte es un
-- ORA-00904; lo que difiera de tipo es un ORA-01722 esperando datos.
--
-- Pendiente antes del primer commit. Las tablas que todavia no ha escrito
-- nadie son las candidatas: si el defecto solo aparece al escribir, las
-- tablas sin filas son precisamente las que no lo han mostrado.
