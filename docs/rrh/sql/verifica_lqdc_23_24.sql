-- =====================================================
-- MODULO: RHH - VERIFICACION DEL PASO 2: LQDC 23 Y 24 RECALCULADAS
-- DESCRIPCION: Contrasta los dos finiquitos del 06-03-2026 contra la tabla
--              a mano de ESTADO-RRHH.md. SOLO CONSULTA, no modifica nada.
-- FECHA: 2026-08-21
-- =====================================================
-- CUANDO SE CORRE: despues de que el frontend recalcule LQDC 23 y 24 con el
-- codigo A+B+C ya publicado, y ANTES de aprobarlas o ejecutar la salida.
--
-- REGLA 6: los 384,05 NO son un valor del cliente. No hay acta ni comprobante
-- de ASOPREP para estas dos salidas (sql/36, nota 1), asi que este control es
-- contra nuestro propio esperado calculado a mano, no contra el cliente. Si
-- no cuadra, el que esta mal es el motor: NO se toca la tabla de esperados.
--
-- LINEA BASE ANTES DE RECALCULAR (finiquito viejo, leida el 2026-08-20 21:2x):
--   LQDC 23 y 24 identicas: ingresos 131,79 · descuentos 9,11 · neto 122,68
--   TMLQ: 96,40 · 9,11 · DT 8,03 · DC 8,03 · vac 19,33
-- Si tras el recalculo sigue viendose 8,03 / 8,03 / 19,33, el frontend NO
-- recalculo: recalculo la pantalla pero reuso la liquidacion vieja.
-- =====================================================

set pagesize 400 linesize 190 feedback off
col NOMBRE      for a30
col CONCEPTO    for a34
col VEREDICTO   for a12
col QUE_PASA    for a26

prompt
prompt =====================================================
prompt  1. CABECERA -- esperado: 393,16 / 9,11 / 384,05 en las dos
prompt =====================================================
select l.LQDCCDGO                              LQ,
       substr(m.MPLDAPLL||' '||m.MPLDNMBR,1,30) NOMBRE,
       to_char(l.LQDCFCHS,'YYYY-MM-DD')         SALIDA,
       l.LQDCESTD                               ESTADO,
       l.LQDCTTIN                               INGRESOS,
       l.LQDCTTDS                               DESCTOS,
       l.LQDCNETO                               NETO,
       case when l.LQDCTTIN = 393.16
             and l.LQDCTTDS =   9.11
             and l.LQDCNETO = 384.05 then 'OK'
            when l.LQDCNETO = 122.68 then 'SIN RECALC'
            else 'REVISAR' end                  VEREDICTO
  from RHH.LQDC l join RHH.MPLD m on m.MPLDCDGO = l.MPLDCDGO
 where l.LQDCCDGO in (23,24)
 order by l.LQDCCDGO;

prompt
prompt =====================================================
prompt  2. RENGLONES contra la tabla a mano -- DIF_VALOR debe ser 0 en todos
prompt =====================================================
-- Esperado (identico en las dos liquidaciones), de ESTADO-RRHH.md:
--   44 Remuneracion pendiente      96,40   (6 dias sobre 482,00)
--   45 Aporte personal finiquito    9,11   (descuento; el signo lo pone TMLQTPCN=2)
--   37 Decimo tercero proporcional 118,40  (correccion A+C: base acumulada, no 96,40)
--   38 Decimo cuarto proporcional  119,16
--   39 Vacaciones no gozadas        59,20  (correccion A: por tramo, no a tarifa ponderada)
with esperado as (
    select 44 CPNM, 'Remuneracion pendiente'      CONCEPTO,  96.40 VALOR from dual union all
    select 45,      'Aporte personal finiquito',    9.11           from dual union all
    select 37,      'Decimo tercero proporcional',118.40           from dual union all
    select 38,      'Decimo cuarto proporcional', 119.16           from dual union all
    select 39,      'Vacaciones no gozadas',       59.20           from dual
),
liq as (select 23 LQ from dual union all select 24 from dual)
select q.LQ,
       e.CPNM,
       e.CONCEPTO,
       t.TMLQVLRO                          NUESTRO,
       e.VALOR                             ESPERADO,
       nvl(t.TMLQVLRO,0) - e.VALOR         DIF_VALOR,
       t.TMLQTPCN                          TPCN,
       t.TMLQBSCL                          BASE,
       t.TMLQDIAS                          DIAS,
       case when t.TMLQVLRO is null            then 'RENGLON QUE FALTA'
            when t.TMLQVLRO = e.VALOR          then 'OK'
            else 'IMPORTE DISTINTO' end        QUE_PASA
  from liq q
 cross join esperado e
  left join RHH.TMLQ t on t.LQDCCDGO = q.LQ and t.CPNMCDGO = e.CPNM
 order by q.LQ, e.CPNM;

prompt
prompt =====================================================
prompt  3. RENGLONES QUE SOBRAN -- debe salir VACIO
prompt =====================================================
select t.LQDCCDGO LQ, t.CPNMCDGO CPNM, substr(t.TMLQDSCR,1,34) CONCEPTO,
       t.TMLQVLRO VALOR, 'CONCEPTO NO ESPERADO' QUE_PASA
  from RHH.TMLQ t
 where t.LQDCCDGO in (23,24)
   and t.CPNMCDGO not in (37,38,39,44,45)
 order by t.LQDCCDGO, t.CPNMCDGO;

prompt
prompt =====================================================
prompt  4. INSUMOS DE A+B+C -- solo se miran si algo de arriba no cuadra
prompt =====================================================
prompt --- ACMN del empleado: 3=base 13o, 4=base 14o, 10=dias (alimenta sumaDiasRango)
select a.MPLDCDGO EMPL, a.ACMNANOO ANIO, a.ACMNMSEE MES, a.ACMNTPAC TIPO,
       a.ACMNVLOR VALOR, a.ACMNDIAS DIAS, a.ACMNAPRT APERT, a.ACMNESTD ESTD
  from RHH.ACMN a
 where a.MPLDCDGO in (48,49) and a.ACMNTPAC in (3,4,10)
 order by a.MPLDCDGO, a.ACMNTPAC, a.ACMNANOO, a.ACMNMSEE;

prompt
prompt --- SLDV: saldo de vacaciones (alimenta los 59,20)
select s.MPLDCDGO EMPL, s.SLDVANOO ANIO, s.SLDVASGN ASIGN, s.SLDVUSDO USADO,
       s.SLDVPNDE PENDIENTE, s.SLDVDIPG DIAS_PAG, s.SLDVVLDI VALOR_DIA
  from RHH.SLDV s
 where s.MPLDCDGO in (48,49)
 order by s.MPLDCDGO, s.SLDVANOO;

prompt
prompt =====================================================
prompt  LECTURA: si el bloque 1 dice OK en las dos y el 2 tiene DIF_VALOR 0 en
prompt  las diez filas, con el 3 vacio, el paso 2 esta cerrado y se puede
prompt  aprobar -> ejecutar salida. Cualquier otra cosa se reporta con la fila
prompt  entera y se para: el motor sigue congelado.
prompt =====================================================
