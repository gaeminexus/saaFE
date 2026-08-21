-- (1) BLOQUE 4 del contraste -- que la comparacion sea completa, y con momento
SELECT SYSTIMESTAMP AS MOMENTO,
       (SELECT COUNT(*) FROM RHH.CTRL c JOIN RHH.CTRL_PARAM q
          ON q.ANIO = c.CTRLANOO AND q.MES = c.CTRLMESS)            AS FILAS_CTRL,
       (SELECT COUNT(DISTINCT c.CTRLIDNT) FROM RHH.CTRL c JOIN RHH.CTRL_PARAM q
          ON q.ANIO = c.CTRLANOO AND q.MES = c.CTRLMESS)            AS PERSONAS_CTRL,
       (SELECT COUNT(*) FROM RHH.NMNA n JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
          JOIN RHH.CTRL_PARAM q ON q.ANIO = p.PRDNANOO AND q.MES = p.PRDNMSEE)
                                                                   AS NOMINAS,
       (SELECT MAX(p.PRDNESTD) FROM RHH.PRDN p JOIN RHH.CTRL_PARAM q
          ON q.ANIO = p.PRDNANOO AND q.MES = p.PRDNMSEE)            AS ESTADO_PERIODO
  FROM DUAL;
-- Esperado: 147 filas (24 PLANILLA + 123 ROL) · 24 personas · 22 nominas · estado 7 CERRADO
-- Y que CTRL_PARAM apunte a (2026, 1): SELECT ANIO, MES FROM RHH.CTRL_PARAM;

-- (2) Los ACMN que escribio cerrarPeriodo, por tipo
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS, COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS,
       ROUND(SUM(a.ACMNVLOR),2) AS VALOR, ROUND(SUM(a.ACMNDIAS),4) AS DIAS
  FROM RHH.ACMN a JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1
 GROUP BY a.ACMNTPAC ORDER BY a.ACMNTPAC;
-- El centinela es el TIPO 10: tiene que traer 22 personas. El 4 y el 9 pueden
-- faltar por valer cero (escribeAcumulado no graba ceros).
-- Y el tipo 7 BASE_VACACIONES no existe: no tiene escritor, por diseno.

-- (3) Las 22 filas de apertura de SLDV, que sostienen la tarifa de febrero
SELECT COUNT(*) AS FILAS, ROUND(SUM(SLDVPNDE),2) AS DIAS,
       ROUND(SUM(SLDVPNDE * SLDVVLDI),2) AS VALOR
  FROM RHH.SLDV WHERE SLDVAPMG = 'S';
-- Esperado: 22 · 103,47 · 3.637,61

-- (3b) Y las tres personas de febrero, una por una
SELECT m.MPLDAPLL, v.SLDVANOO, v.SLDVPNDE AS DIAS, v.SLDVVLDI AS TARIFA
  FROM RHH.SLDV v JOIN RHH.MPLD m ON m.MPLDCDGO = v.MPLDCDGO
 WHERE m.MPLDIDNT IN ('1712232659','1717991341','2150051205')
 ORDER BY m.MPLDAPLL;
-- Esperado: VITERI LOPEZ 7,75 @ 73,1187 · BARCENAS BERMEO 7,71 @ 23,3281 ·
--           BRAVO CAIZA sin fila (no tiene saldo de apertura)
