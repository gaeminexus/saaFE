-- =====================================================
-- MODULO: RHH - "ESTE EMPLEADOR NO RETIENE IR A ESTE EMPLEADO"
-- DESCRIPCION: Anade a RHH.CNTE la bandera que expresa una retencion cero
--              legitima, y la aplica a Robayo Rueda para 2026.
-- ORDEN DE EJECUCION: 47
-- FECHA: 2026-08-21
-- PARAMETRO: :EMPRESA -- 1236
-- =====================================================
-- POR QUE HACE FALTA UN CAMPO NUEVO Y NO UN APANO
--
-- El art. 43 de la LRTI hace al empleador AGENTE DE RETENCION: retener no es
-- opcion del trabajador. Pero hay un caso, previsto por la propia norma, en
-- que un empleador retiene CERO a alguien que si debe impuesto:
--
--   Cuando el trabajador tiene DOS O MAS EMPLEADORES, presenta la proyeccion
--   al que mas le paga --que retiene sobre el total de sus ingresos-- y a los
--   demas les entrega COPIA CERTIFICADA de esa proyeccion, con firma y sello,
--   PARA QUE SE ABSTENGAN DE RETENER.
--   (SRI, Guia practica del Impuesto a la Renta; formulario SRI-GP.)
--
-- Eso no es "debe cero": es "debe, pero aqui no se le retiene". Son dos hechos
-- distintos y el sistema no sabia expresar el segundo.
--
-- LO QUE SE DESCARTO, Y POR QUE
--
--   * Falsear PYIR poniendo la retencion mensual en cero. NO: su proyeccion es
--     correcta --sin gastos personales, a Robayo le toca-- y romperia agosto,
--     que es cuando el cliente empieza a retener y necesita partir de una
--     proyeccion buena. Ademas es fragil: cualquiera que invalide la
--     proyeccion (como hizo el sql/34 con siete) la regenera y el cero
--     desaparece sin que nadie se entere.
--
--   * Usar CNTERTFN. NO, y es el octavo caso del catalogo "el numero no viene
--     de donde parece": la columna se llama "retiene fuente" y hace lo
--     CONTRARIO. En ProcesoNominaServiceImpl:946 la retencion normal se
--     calcula cuando el valor NO es 'S'; con 'S' el contrato entra en la via
--     de servicios profesionales SIN RELACION DE DEPENDENCIA. Ponerla en 'S'
--     para que "no retenga" habria sacado a Robayo de relacion de dependencia
--     y cambiado su tratamiento entero.
--
-- QUE PASA CON EL RDEP: nada que impida declararlo. La obligacion de presentar
-- el anexo se mantiene aunque no haya habido retenciones; Robayo entra con sus
-- ingresos y retencion cero, que es exactamente lo que ocurrio.
--
-- PREGUNTA ABIERTA PARA STEVEN, y ahora es concreta:
--   ¿Tiene ASOPREP la copia certificada de la proyeccion de Robayo presentada
--   a otro empleador? Si la tiene, todo esta en regla y en agosto seguira en
--   cero. Si NO la tiene, hay incumplimiento del art. 43 y responsabilidad
--   patronal, y eso lo resuelve el cliente, no el sistema.
--   Mientras tanto grabamos CERO, que es lo que ocurrio en las dos hipotesis.
-- =====================================================


-- -----------------------------------------------------
-- CONTROL ANTES
-- -----------------------------------------------------
SELECT COUNT(*) AS YA_EXISTE FROM ALL_TAB_COLUMNS
 WHERE OWNER = 'RHH' AND TABLE_NAME = 'CNTE' AND COLUMN_NAME = 'CNTENRIR';
-- Esperado: 0.

SELECT m.MPLDIDNT, m.MPLDAPLL, c.CNTECDGO, c.CNTESLRB AS SUELDO,
       NVL(c.CNTERTFN, '(null)') AS RETIENE_FUENTE_OJO_INVERTIDA
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE m.MPLDIDNT = '1725996498';
-- Robayo Rueda Gabriel Patricio, sueldo 1500. CNTERTFN debe estar en null o
-- 'N': si estuviera en 'S' ya estaria tratado como servicios profesionales y
-- habria que revisarlo antes de nada.


-- -----------------------------------------------------
-- LA COLUMNA
-- -----------------------------------------------------
ALTER TABLE RHH.CNTE ADD (
    CNTENRIR  VARCHAR2(1),          -- 'S' = este empleador NO retiene IR a este empleado
    CNTENRMT  VARCHAR2(200)         -- motivo, obligatorio cuando NRIR = 'S'
);
COMMENT ON COLUMN RHH.CNTE.CNTENRIR IS
    'S = este empleador NO retiene IR a este empleado (art. 43 LRTI, varios empleadores).'
 || ' NO significa que el empleado no deba impuesto: la proyeccion PYIR sigue siendo la real.';
COMMENT ON COLUMN RHH.CNTE.CNTENRMT IS
    'Motivo y respaldo de la no retencion. Sin motivo no se debe activar la bandera.';


-- -----------------------------------------------------
-- ROBAYO
-- -----------------------------------------------------
UPDATE RHH.CNTE
   SET CNTENRIR = 'S',
       CNTENRMT = 'ASOPREP no le retiene IR en 2026 (ene-jul verificado contra el rol real;'
                  || ' desde agosto el cliente confirma que sigue en cero). Pendiente de'
                  || ' Steven: copia certificada de la proyeccion presentada a otro empleador'
                  || ' (art. 43 LRTI). Su PYIR sigue siendo la real: SI causa impuesto.'
 WHERE MPLDCDGO = (SELECT MPLDCDGO FROM RHH.MPLD
                    WHERE MPLDIDNT = '1725996498' AND PJRQCDGO = :EMPRESA);


COMMIT;


-- -----------------------------------------------------
-- CONTROL DESPUES
-- -----------------------------------------------------
SELECT m.MPLDIDNT, m.MPLDAPLL, c.CNTENRIR, SUBSTR(c.CNTENRMT, 1, 60) AS MOTIVO
  FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE c.CNTENRIR = 'S';
-- Esperado: UNA sola fila, Robayo. Si sale alguien mas, revisar: la bandera
-- apaga la retencion entera de esa persona.

-- Y que su proyeccion siga intacta, que es la mitad del punto:
SELECT p.PYIRANOO, p.PYIRRTEM AS RETENCION_MENSUAL_PROYECTADA, p.PYIRVGNT AS VIGENTE
  FROM RHH.PYIR p JOIN RHH.MPLD m ON m.MPLDCDGO = p.MPLDCDGO
 WHERE m.MPLDIDNT = '1725996498' AND p.PYIRANOO = 2026;
-- Esperado: su retencion mensual proyectada SIGUE siendo la real (~20,17).
-- Si aqui saliera cero, alguien falseo la proyeccion: es lo que este script
-- existe para NO hacer.


-- =====================================================
-- LO QUE FALTA, Y NO ES SQL
-- =====================================================
-- El motor tiene que honrar la bandera. En ProcesoNominaServiceImpl, paso 11:
--   if (SI.equals(contrato.getNoRetieneIr())) { retencionIr = 0; sin renglon; }
-- ANTES de llamar a obtenerRetencionMensual, y sin tocar PYIR.
--
-- Con eso, al recalcular enero-mayo Robayo deja de tener renglon de IR y de
-- tener fila en ACMN tipo 9. Resultado esperado de los cinco meses:
--   enero 16.476,92 · febrero 17.525,11 · marzo 17.591,12 ·
--   abril 16.089,22 · mayo 16.035,21
-- Cuatro en diferencia CERO contra el cliente; abril en +175,00, que son los
-- OTROS sin clasificar de Calderon.
