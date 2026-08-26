# Ajuste de julio de 2026 — llevar los datos a lo que se pagó

**Escrito el 2026-08-25, ANTES de calcular julio.** No se ejecuta hasta que julio esté **calculado y
contrastado en estado 3**. El orden no es negociable:

```
crear período → novedades → calcular → CONTRASTAR → AJUSTE → CONTRASTAR OTRA VEZ → aprobar → contabilizar → cerrar
```

**El ajuste entra DESPUÉS de calcular y ANTES de cerrar.** `cerrarPeriodo` escribe los `ACMN` a
partir de `NMNA`: si el ajuste entra antes del cierre, los acumulados salen coherentes solos; si
entra después, quedan acumulados que no corresponden a la nómina **y nada lo avisa**.

---

## Por qué existe

**El motor calcula según la norma. Los datos guardan lo que se pagó.** El contraste **antes** del
ajuste es la prueba de que el motor acierta. El ajuste **después** deja en la base lo que la gente
realmente recibió, que es lo que el régimen histórico debe contener.

## Qué se ajusta y qué no

**Sólo lo que cambia lo que la persona recibió.** Lo que cambia únicamente la *composición* —el
mismo dinero en renglones distintos— se documenta y no se toca: cada `UPDATE` sobre `RNGL` arrastra
`NMNA` y `PRDN`, y ese riesgo no se paga con nada.

| Diferencia | ¿Cambia lo recibido? | Decisión |
|---|---|---|
| **Aporte personal** · Caiza 1,52 · Nieto 2,84 · Pardo 8,82 = **13,18** | **Sí** | **SE AJUSTA** |
| **Fondo de reserva de Muñoz** · 45,82 nuestro contra 45,81 pagado | **Sí** | **SE AJUSTA** |
| **D:OTROS 44,60** | Sí, pero es la otra mitad de junio | **NO se registra** |
| Viteri: 183,26 cobrado y retenido, contra nuestra provisión | No. Neto cero | Sólo composición |
| Vacaciones: sueldo por días + vacaciones, contra sueldo entero | No. Mismo total | Sólo composición |
| Calderón: 700,10 y anticipo 620,10, contra 700,00 y 620,00 | No. Líquido 0,00 | Sólo composición |

### Los 44,60 no se registran, y es una decisión tomada

**Decisión de Mike, 2026-08-25: fidelidad por el par junio+julio, no mes a mes.**

Los 44,60 que el cliente descuenta en julio son la devolución de los 44,60 que pagó de más en junio.
Junio cerró sin ajustarlos. Registrarlos sólo en julio dejaría el año **44,60 corto**. Fuera de los
dos meses, **junio queda en −44,60 y julio en +44,60 y se anulan exactos**.

**Coste aceptado, escrito aquí para que nadie lo descubra por su cuenta:** junio y julio, **por
separado**, no coinciden con su rol pagado. El par sí, y el año también. La alternativa era reabrir
junio y se descartó.

## La comprobación que se verifica sola

```
antes del ajuste           +31,43
+ aportes devueltos        +13,18
− céntimo de Muñoz          −0,01
                          ────────
después del ajuste         +44,60      ← si no da esto, el ajuste está mal
```

---

## Cómo se ejecuta

**El ejecutable es [`sql/64_AJUSTE_JULIO.sql`](sql/64_AJUSTE_JULIO.sql).** Este documento explica **por qué**; el `.sql` es lo que se abre en DBeaver y se corre. Si los dos discreparan, **gana este documento** y hay que corregir el `.sql`.

---

## 1 · SELECT de control ANTES — sin esto no se toca nada

**Guarda esta salida.** Es la única forma de saber después qué había antes.

```sql
-- 1A. Los cuatro renglones que se van a tocar, tal como los dejo el motor.
-- ESPERADO: aporte 45,55 / 85,05 / 66,15 y fondo de reserva de Munoz 45,82.
SELECT m.MPLDIDNT AS CEDULA, m.MPLDAPLL AS APELLIDOS,
       c.CPNMALTR AS CONCEPTO, c.CPNMNMBR AS NOMBRE,
       r.RNGLCDGO AS RENGLON, r.RNGLVLRO AS VALOR_MOTOR
  FROM RHH.RNGL r
  JOIN RHH.NMNA n ON n.NMNACDGO = r.NMNACDGO
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
  JOIN RHH.CPNM c ON c.CPNMCDGO = r.CPNMCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7
   AND ( (c.CPNMALTR = 20 AND m.MPLDIDNT IN ('1753528379','1723962849','1726657164'))
      OR (c.CPNMALTR =  7 AND m.MPLDIDNT = '1717649873') )
 ORDER BY c.CPNMALTR, m.MPLDAPLL;

-- 1B. Los totales de las cuatro nominas afectadas.
SELECT m.MPLDIDNT AS CEDULA, m.MPLDAPLL AS APELLIDOS, n.NMNACDGO AS NOMINA,
       n.NMNATING AS INGRESOS, n.NMNATDSC AS DESCUENTOS, n.NMNANETO AS NETO
  FROM RHH.NMNA n
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7
   AND m.MPLDIDNT IN ('1753528379','1723962849','1726657164','1717649873')
 ORDER BY m.MPLDAPLL;

-- 1C. La cabecera del periodo. EL ESTADO TIENE QUE SER 3.
SELECT PRDNCDGO, PRDNESTD AS ESTADO, PRDNTTIN AS INGRESOS, PRDNTTDS AS DESCUENTOS,
       PRDNTTNT AS NETO, PRDNTTPT AS PATRONAL
  FROM RHH.PRDN WHERE PRDNANOO = 2026 AND PRDNMSEE = 7;
```

**Con el período aprobado o cerrado, PARAR.** El ajuste va antes.

---

## 2 · Los UPDATE — los tres bloques, o ninguno

**Un renglón sin su total es el punto 9**, y la cabecera no lo delata sola. Un solo `COMMIT`, al
final.

```sql
-- 2A. El aporte personal, al valor que se descontó de verdad.
UPDATE RHH.RNGL r
   SET r.RNGLVLRO = CASE (SELECT m.MPLDIDNT FROM RHH.NMNA n
                            JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
                           WHERE n.NMNACDGO = r.NMNACDGO)
                      WHEN '1753528379' THEN 44.03
                      WHEN '1723962849' THEN 82.21
                      WHEN '1726657164' THEN 57.33
                    END
 WHERE r.RNGLCDGO IN (
        SELECT r2.RNGLCDGO FROM RHH.RNGL r2
          JOIN RHH.NMNA n ON n.NMNACDGO = r2.NMNACDGO
          JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
          JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
          JOIN RHH.CPNM c ON c.CPNMCDGO = r2.CPNMCDGO
         WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7 AND c.CPNMALTR = 20
           AND m.MPLDIDNT IN ('1753528379','1723962849','1726657164'));

-- El fondo de reserva de Munoz: 45,81, que es lo que su rol le pago.
UPDATE RHH.RNGL r SET r.RNGLVLRO = 45.81
 WHERE r.RNGLCDGO IN (
        SELECT r2.RNGLCDGO FROM RHH.RNGL r2
          JOIN RHH.NMNA n ON n.NMNACDGO = r2.NMNACDGO
          JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
          JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
          JOIN RHH.CPNM c ON c.CPNMCDGO = r2.CPNMCDGO
         WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7 AND c.CPNMALTR = 7
           AND m.MPLDIDNT = '1717649873');

-- 2B. Los totales de NMNA, recalculados DESDE LOS RENGLONES, no a mano.
-- Sumar desde RNGL es lo que garantiza que cabecera y detalle no diverjan: si
-- un UPDATE de 2A no hubiera entrado, esto lo arrastra y el control de despues
-- lo delata, en vez de taparlo con una resta escrita a mano.
UPDATE RHH.NMNA n
   SET n.NMNATING = (SELECT NVL(SUM(r.RNGLVLRO),0) FROM RHH.RNGL r
                       JOIN RHH.CPNM c ON c.CPNMCDGO = r.CPNMCDGO
                      WHERE r.NMNACDGO = n.NMNACDGO AND NVL(r.RNGLTPCN, c.CPNMTPCN) = 1),
       n.NMNATDSC = (SELECT NVL(SUM(r.RNGLVLRO),0) FROM RHH.RNGL r
                       JOIN RHH.CPNM c ON c.CPNMCDGO = r.CPNMCDGO
                      WHERE r.NMNACDGO = n.NMNACDGO AND NVL(r.RNGLTPCN, c.CPNMTPCN) = 2),
       n.NMNANETO = (SELECT NVL(SUM(r.RNGLVLRO),0) FROM RHH.RNGL r
                       JOIN RHH.CPNM c ON c.CPNMCDGO = r.CPNMCDGO
                      WHERE r.NMNACDGO = n.NMNACDGO AND NVL(r.RNGLTPCN, c.CPNMTPCN) = 1)
                  - (SELECT NVL(SUM(r.RNGLVLRO),0) FROM RHH.RNGL r
                       JOIN RHH.CPNM c ON c.CPNMCDGO = r.CPNMCDGO
                      WHERE r.NMNACDGO = n.NMNACDGO AND NVL(r.RNGLTPCN, c.CPNMTPCN) = 2)
 WHERE n.NMNACDGO IN (
        SELECT n2.NMNACDGO FROM RHH.NMNA n2
          JOIN RHH.PRDN p ON p.PRDNCDGO = n2.PRDNCDGO
          JOIN RHH.MPLD m ON m.MPLDCDGO = n2.MPLDCDGO
         WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7
           AND m.MPLDIDNT IN ('1753528379','1723962849','1726657164','1717649873'));

-- 2C. La cabecera del periodo, recalculada DESDE LAS NOMINAS.
UPDATE RHH.PRDN p
   SET p.PRDNTTIN = (SELECT NVL(SUM(n.NMNATING),0) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO),
       p.PRDNTTDS = (SELECT NVL(SUM(n.NMNATDSC),0) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO),
       p.PRDNTTNT = (SELECT NVL(SUM(n.NMNANETO),0) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO)
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7;

COMMIT;
```

> **`PRDNTTPT` no se toca:** el ajuste no altera ningún aporte patronal.

---

## 3 · SELECT de control DESPUÉS

```sql
-- 3A. Misma consulta que 1A. ESPERADO: 44,03 / 82,21 / 57,33 y 45,81.

-- 3B. Que cabecera y detalle no hayan divergido. Es el punto 9, y no lo delata
-- ningun total solo. ESPERADO: CERO FILAS.
SELECT m.MPLDIDNT AS CEDULA, n.NMNATING, n.NMNATDSC, n.NMNANETO,
       n.NMNATING - n.NMNATDSC AS NETO_RECALCULADO
  FROM RHH.NMNA n
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7
   AND ABS(n.NMNANETO - (n.NMNATING - n.NMNATDSC)) > 0.005;

-- 3C. Que la cabecera cuadre con la suma de sus nominas.
-- ESPERADO: las tres diferencias en 0,00.
SELECT p.PRDNTTIN - (SELECT SUM(n.NMNATING) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO) AS DIF_INGRESOS,
       p.PRDNTTDS - (SELECT SUM(n.NMNATDSC) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO) AS DIF_DESCUENTOS,
       p.PRDNTTNT - (SELECT SUM(n.NMNANETO) FROM RHH.NMNA n WHERE n.PRDNCDGO = p.PRDNCDGO) AS DIF_NETO
  FROM RHH.PRDN p WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 7;
```

---

## 4 · Y el contraste OTRA VEZ, que es la verificación de verdad

Volver a correr `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en **2026 · 7**.

Lo que tiene que haber cambiado:

- **Bloque 1**: desaparecen las **tres filas del concepto 20** y la **del concepto 7 de Muñoz**. De
  **17 filas se pasa a 13**.
- **Bloque 2**: el líquido del período queda **+44,60** sobre el del cliente. **Ni 31,43 ni 0,00.**
- Lo demás **no se mueve**: las seis de vacaciones, la de Viteri, la de Calderón y las cinco de
  OTROS siguen ahí, porque son composición o son la mitad de junio.

**Si el líquido no queda en +44,60 exacto, el ajuste está mal y hay que deshacerlo con los valores
del punto 1 antes de seguir.** Por eso el punto 1 se guarda.
