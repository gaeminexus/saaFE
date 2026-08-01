# Análisis de Mercado: Suite de Software Contable para Contadores y Empresas (Ecuador)

> **Nota:** Análisis complementario a los documentos de la app personal de impuestos (`PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28-ES.md` y `ANALISIS-MERCADO-MARKETING-APP-SRI-2026-07-28-ES.md`). Este cubre un concepto de producto distinto y separado: convertir el sistema SAA actual en una suite comercial de software contable para contadores y empresas. Aplica la misma advertencia — es un concepto de producto independiente, no forma parte del proyecto SAA/ASOPREP-FCPC en sí.

## La bifurcación estratégica

"Software contable para contadores y empresas" puede significar dos apuestas muy diferentes, con panoramas competitivos muy distintos. Ambas se analizan abajo como pistas paralelas, no como un solo camino:

1. **Pista 1 — Software contable genérico para PYMEs/contadores**: facturación, contabilidad, cumplimiento tributario para el mercado amplio de empresas ecuatorianas y los contadores que las atienden.
2. **Pista 2 — Software especializado de core-system para cooperativas financieras/mutualistas**: aprovechando lo que SAA realmente es — un sistema con un módulo genuino de crédito/préstamos/aportaciones de socios (CRD) y tesorería/conciliación bancaria (TSR), no solo contabilidad.

Un factor clave cambia el cálculo específicamente para la Pista 1: **el equipo ya construye y da servicio a Vale, un sistema de facturación electrónica operativo en Ecuador con una base existente de 500 a 5,000 clientes activos**, una mezcla de empresas directas y contadores que gestionan múltiples RUC de clientes. Esta base existente no se superpone con cooperativas financieras, por lo que afecta solo a la Pista 1 — el análisis y la estrategia de mercado de la Pista 2 no cambian por esto.

## Tamaño de Mercado

**Pista 1 — Mercado genérico de PYMEs/contadores:**
- **172,641 compañías activas** registradas en la Superintendencia de Compañías de Ecuador (2025) — el universo formal de "sociedades".
- **La facturación electrónica es obligatoria para prácticamente todos los contribuyentes** — más de 2 millones de empresas/profesionales independientes/emprendimientos están obligados, aunque solo **~400,000 emiten comprobantes electrónicos mensualmente** (SRI, 2025). Desde enero de 2026, la facturación electrónica inmediata se volvió obligatoria para régimen general y microempresas — un verdadero viento de cola regulatorio, ya que cada uno de esos contribuyentes necesita software compatible con el SRI por ley, no por elección.
- Este es el segmento que **Siigo Contífico ya domina**: más de 200,000 empresas clientes y más de 70,000 contadores aliados en Perú, Chile, Ecuador y Uruguay combinados, duplicando ingresos y triplicando clientes en menos de 2 años tras la fusión. Ese es un competidor establecido con efecto de red — los contadores lo recomiendan a sus muchos clientes, los clientes lo recomiendan a sus contadores.
- **La base existente de Vale (500-5,000 clientes) está dentro de este mismo mercado** — es una porción pequeña de los ~2 millones de contribuyentes obligados, pero es una porción que ya se posee, con una relación de facturación y confianza existente, a diferencia de los otros ~1.9 millones o más.

**Pista 2 — Mercado de cooperativas financieras/mutualistas (el ajuste diferenciado real del código base):**
- Ecuador tiene **393 cooperativas de ahorro y crédito (COAC) y entidades relacionadas del SFPS** según el catastro oficial de la SEPS (verificado abajo), consolidadas desde 921 en 2016 — un sector en contracción pero estabilizándose.
- La SEPS clasifica a las entidades en 5 segmentos según activos totales (Resolución 038-2015). **Verificado directamente contra el listado oficial actual de la SEPS** ("Segmentación de entidades del SFPS", con fecha 1 de junio de 2026, descargado y cotejado entidad por entidad — ver Fuentes):

| Segmento | Rango de activos | # de entidades (verificado) | Veredicto |
|---|---|---|---|
| 1 | >$80M | **50** (incluye 4 mutualistas, Caja Central FINANCOOP y CONAFIPS junto a ~44 COAC tradicionales) | Evitar — el más grande y sofisticado; probablemente ya con Cobiscorp o con capacidad de TI interna equivalente |
| 2 | $20M–$80M | **66** | **Objetivo principal** — suficientemente grandes para necesitar funcionalidad real de core system, demasiado pequeñas para el nivel empresarial de Cobiscorp |
| 3 | $5M–$20M | **92** | **Objetivo secundario** — presupuestos más pequeños, pero aún necesitan gestión de crédito más allá de la contabilidad genérica |
| 4 | $1M–$5M | **136** | Evitar — sensible al precio, alta relación de personalización frente a ingreso |
| 5 | ≤$1M | **49** | Evitar — el nivel más pequeño, incluye muchas entidades en riesgo de liquidación |

- **SAM verificado: segmentos 2+3 combinados = 158 cooperativas exactas** — ya no es una estimación; es un conteo completo y confirmado de la fuente autoritativa.
- **Cobiscorp** (proveedor de core bancario de origen ecuatoriano, ahora regional) atiende a **solo ~15 cooperativas** en Ecuador — casi con certeza las instituciones más grandes del segmento 1, confirmando a los segmentos 2-3 como el vacío desatendido.
- **Corrección respecto al borrador anterior: las 4 mutualistas de ahorro y crédito para la vivienda (Pichincha, Ambato, Azuay, Imbabura) están clasificadas oficialmente como Segmento 1**, no como un nicho adyacente más pequeño como se asumió previamente a partir de su participación relativa dentro del subsector de las 4 mutualistas. Ninguna es objetivo de la Pista 2 bajo la lógica de segmentación — eliminarlas de la consideración de contacto.
- **Los bancos son un mercado aparte, más difícil y de largo plazo, no un objetivo cercano** — 23 bancos privados (4 grandes, 9 medianos, 10 pequeños) más 4 bancos públicos, regulados por la más estricta Superintendencia de Bancos en lugar de la SEPS. Probablemente ya operan con Cobiscorp/Temenos u otras plataformas consolidadas; vale la pena reconsiderar solo después de que la Pista 2 tenga casos de referencia en cooperativas.

### Lista de clientes prospectivos (verificada contra el listado oficial de la SEPS)

Las listas a continuación fueron cotejadas directamente contra el documento oficial de segmentación de la SEPS (`SEGMENTACIÓN-AÑO-2026.pdf`, publicado en `seps.gob.ec/institucion/segmentacion-de-esfps/`, datos al 1 de junio de 2026) — no los ejemplos ilustrativos de rankings públicos del borrador anterior. Varios nombres originalmente listados como Segmento 3 (Educadores de Chimborazo, Educadores de Tungurahua, Vis Andes) resultaron ser en realidad Segmento 2 según esta fuente oficial, y "Comercio" (Portoviejo) resultó ser Segmento 1, no Segmento 2 — corregido abajo. El RUC es el identificador autoritativo; algunos nombres pueden tener artefactos menores de renderizado de caracteres acentuados provenientes de la extracción del PDF y deben reconfirmarse contra el RUC antes de hacer contacto.

**Segmento 2 — lista completa, 66 cooperativas (objetivo principal):**

| RUC | Cooperativa |
|---|---|
| 0190021513001 | Educadores del Azuay Ltda |
| 0190093581001 | Coopac Austro Ltda |
| 0190160378001 | Santa Isabel Ltda |
| 0190160459001 | Multiempresarial |
| 0190316319001 | Fasayñan Ltda |
| 0190317625001 | Señor de Girón |
| 0190327949001 | Provida Ltda |
| 0290004454001 | Juan Pío de Mora Ltda |
| 0290035260001 | Las Naves Ltda |
| 0390000804001 | Cañar Ltda |
| 0391005664001 | Yuyay Ltda |
| 0490007458001 | Educadores Tulcán Ltda |
| 0490009124001 | San Gabriel Ltda |
| 0590024937001 | Finanzas Corporativas Ltda |
| 0590061123001 | Futuro Lamanense |
| 0591711563001 | Sumak Kawsay Ltda |
| 0591713094001 | Andina Ltda |
| 0591719009001 | Sierra Centro Ltda |
| 0591719718001 | Visión de los Andes (Vis Andes) |
| 0690002744001 | Educadores de Chimborazo Ltda |
| 0690074761001 | Minga Ltda |
| 0691702324001 | 4 de Octubre |
| 0992280700001 | Huancavilca Ltda |
| 1090046892001 | San Antonio Ltda - Imbabura |
| 1090058521001 | Unión El Ejido |
| 1090078263001 | De Indígenas Chuchuqui Ltda |
| 1090107174001 | Artesanos Ltda |
| 1091708139001 | Santa Anita Ltda |
| 1091712284001 | Mujeres Unidas Tantanakushka Warmikunapac |
| 1091732935001 | Acción Imbaburapak Ltda |
| 1190036967001 | Educadores de Loja - CACEL Ltda |
| 1191725669001 | Crediamigo Ltda |
| 1290068068001 | San Antonio Ltda Los Ríos |
| 1390091474001 | Santa Ana Ltda |
| 1390143156001 | La Benéfica Ltda |
| 1391707363001 | Microempresarial Sucre |
| 1590001585001 | Tena Ltda |
| 1790023508001 | Cotocollao Ltda |
| 1790045668001 | San Francisco de Asís Ltda |
| 1790499871001 | 16 de Julio Ltda |
| 1790586863001 | Alianza Minas Ltda |
| 1790641392001 | Politécnica Ltda |
| 1790890864001 | Puéllaro Ltda |
| 1790892670001 | Pedro Moncayo Ltda |
| 1791268628001 | Textil 14 de Marzo |
| 1791280156001 | Previsión Ahorro y Desarollo Ltda |
| 1791306589001 | Corporación Centro Ltda |
| 1791367359001 | San Miguel de los Bancos Ltda |
| 1791379470001 | Maquita Cushunchic Ltda |
| 1791784979001 | Fondo para el Desarrollo y la Vida |
| 1791847644001 | Luz del Valle |
| 1791928083001 | Huaicana Ltda |
| 1792076773001 | Manantial de Oro Ltda |
| 1890049369001 | Educadores de Tungurahua Ltda |
| 1891708358001 | Maquita Cushun Ltda |
| 1891710581001 | Vencedores Ltda |
| 1891716385001 | San Martín de Tisaleo Ltda |
| 1891721591001 | Kisapincha Ltda |
| 1891721796001 | Acción Tungurahua Ltda |
| 1891725910001 | Sumak Samy Ltda |
| 1891735002001 | Credil Ltda |
| 1891743005001 | Credi Ya Ltda |
| 1891744214001 | Sisa |
| 1891745571001 | Interandina |
| 1990007019001 | De la Pequeña Empresa CACPE Yantzaza Ltda |
| 1990007027001 | De la Pequeña Empresa CACPE Zamora Chinchipe Ltda |

**Segmento 3 — lista completa, 92 cooperativas (objetivo secundario):**

| RUC | Cooperativa |
|---|---|
| 0190096076001 | Sidetamc |
| 0190147665001 | Solidaridad, Emprendimiento y Cooperación |
| 0190150739001 | Etapa |
| 0190319296001 | Gañansol Ltda |
| 0190338509001 | Jadán |
| 0190344169001 | Del Azuay |
| 0190375811001 | Corpucoop Ltda |
| 0290003180001 | San Miguel Ltda |
| 0290030099001 | San Pedro Ltda |
| 0290034337001 | Salinas Limitada |
| 0291500994001 | Simiatug Limitada |
| 0391008558001 | San Marcos |
| 0590060437001 | San Miguel de Sigchos |
| 0591713124001 | 15 de Agosto de Pilacoto |
| 0591713760001 | Pujilí Ltda |
| 0591714031001 | Iliniza Ltda |
| 0591714236001 | Uniblock y Servicios Ltda |
| 0591714333001 | Coorcotopaxi Ltda |
| 0591714821001 | Pucará Ltda |
| 0591724444001 | Occidental |
| 0690042495001 | Sumac Llacta Ltda |
| 0690069334001 | San Jorge Ltda |
| 0690074397001 | San Miguel de Pallatanga |
| 0691720721001 | Nueva Esperanza Ltda |
| 0691729281001 | Chunchi Ltda |
| 0691732584001 | Sol de los Andes Ltda Chimborazo |
| 0790088611001 | 16 de Junio |
| 0791704499001 | Marcabelí Ltda |
| 0890011802001 | Antorcha Ltda |
| 0990138850001 | La Dolorosa Ltda |
| 0990320160001 | Dr. Cornelio Sáenz Vera Ltda |
| 0990858527001 | Salitre Ltda |
| 0990872562001 | Metropolitana Ltda |
| 0991501258001 | Base de Taura |
| 0992198990001 | Grupo Difare |
| 0992381760001 | Los Andes Latinos Ltda |
| 0992470550001 | Metrópolis Ltda |
| 1091716697001 | Imbabura Imbacoop Ltda |
| 1091728148001 | Uniotavalo Ltda |
| 1091733559001 | Ecuacréditos Ltda |
| 1190078937001 | CACPE Célica |
| 1190082462001 | Cristo Rey |
| 1191712249001 | De la Microempresa Fortuna |
| 1191720624001 | De la Cámara de Comercio de Gonzanamá |
| 1191723062001 | Gonzanamá |
| 1191736423001 | Saraguros |
| 1191736954001 | Vilcabamba CACVIL |
| 1290029224001 | 13 de Abril |
| 1291713013001 | 4 Ríos |
| 1291731518001 | La Nuestra Ltda |
| 1390017177001 | Magisterio Manabita Limitada |
| 1390141463001 | Abdón Calderón Ltda |
| 1391714246001 | Agrícola Junín |
| 1590017589001 | Coca Ltda |
| 1690000632001 | Educadores de Pastaza Ltda |
| 1790100294001 | San Cristóbal Ltda |
| 1790170047001 | Ciudad de Quito |
| 1790495507001 | Del Magisterio de Pichincha |
| 1790894053001 | San Juan de Cotogchoa |
| 1791375874001 | De los Empleados Jubilados y Ex-Empleados del Banco Central del Ecuador |
| 1791422708001 | Unidad y Progreso |
| 1791430956001 | Hermes Gaibor Verdesoto |
| 1791708288001 | Universidad Católica del Ecuador |
| 1792042518001 | Esperanza del Futuro Ltda |
| 1792057043001 | Pichincha Ltda |
| 1792060559001 | El Molino Limitada |
| 1792116449001 | 17 de Marzo Limitada |
| 1792253411001 | Orden y Seguridad "OYS" |
| 1792300657001 | Emprendedores Coopemprender Limitada |
| 1792311667001 | Negocios Andinos Ltda |
| 1891713750001 | Crediambato Ltda |
| 1891714633001 | La Floresta Ltda |
| 1891720587001 | Coorambato Ltda |
| 1891720978001 | Campesina Coopac |
| 1891724787001 | Credi Fácil Ltda |
| 1891725104001 | Juventud Unida Ltda |
| 1891726712001 | Crecer Wiñari Ltda |
| 1891726763001 | Indígena SAC Píllaro Ltda |
| 1891734650001 | Migrantes del Ecuador Ltda |
| 1891736882001 | Ecuafuturo Ltda |
| 1891737439001 | Pushak Runa Ltda |
| 1891737552001 | Financredit Ltda |
| 1891739113001 | Producción Ahorro Inversión Servicio País Ltda |
| 1891742319001 | Rhumy Wara |
| 1891742904001 | Angahuana |
| 1891745687001 | Credimás |
| 1990007124001 | Ciudad de Zamora |
| 1990010028001 | Educadores y Asociados Zamora Chinchipe |
| 2091756679001 | Indígenas Galápagos Ltda |
| 2191701227001 | Focla |
| 2290316947001 | Cámara de Comercio Joya de los Sachas Ltda |
| 1091761439001 | Rural Sierra Norte |

**Segmento 1 — explícitamente NO son objetivos, principales entidades por patrimonio para dar contexto sobre a quiénes evitar:** JEP ($363.4M de patrimonio), Jardín Azuayo ($275.1M), Alianza del Valle ($158.2M), Pequeña Empresa de Cotopaxi ($136.2M), Policía Nacional ($136.1M), San Francisco ($122.7M), 29 de Octubre ($104.6M), Riobamba ($99.1M), OSCUS ($85.5M), Vicentina Manuel Esteban Godoy ($84.6M), Comercio Ltda (Portoviejo).

## Panorama Competitivo

| Segmento | Competidores | Fortaleza del foso | Relevancia de Vale |
|---|---|---|---|
| PYMEs/contadores genérico (Pista 1) | Siigo Contífico (dominante), Alegra, Defontana, Aspel, ContApp, Odoo (~$31/usuario/mes, mejor relación costo-beneficio para 10-80 empleados según guías de mercado) | Muy fuerte — efecto de red de más de 200 mil clientes, más de una década en el mercado | **Alta** — Vale otorga una base existente y cálida dentro de este mercado exacto |
| ERP empresarial (empresas más grandes) | SAP Business One, Dynamics, Odoo Enterprise | Fuerte, comprador distinto (grandes corporativos, no es el objetivo aquí) | Ninguna |
| Core bancario cooperativo (Pista 2) | Cobiscorp (COBIS Core) | Fuerte en el segmento 1 (~15 clientes), ausente en los segmentos 2-3 | Ninguna — se confirmó que no hay superposición con cooperativas en la base de clientes de Vale |

La implementación local de ERP con un partner típicamente cuesta **$15,000–50,000/año en TCO para 10-20 usuarios** — un ancla útil: esto se acerca más a lo que el nivel de complejidad real de SAA justificaría para la Pista 2, no al precio de nivel consumidor de $40-110/año de Siigo Contífico en la Pista 1.

## Riesgos

| Riesgo | Estado |
|---|---|
| El foso de Siigo Contífico encarece la entrada al mercado genérico | **Suavizado para la porción de venta cruzada de Vale, no eliminado en general.** La adquisición en frío contra un competidor con más de 200 mil clientes sigue siendo un mal uso de recursos; ahora existe una entrada barata vía los 500-5,000 clientes existentes de Vale, pero el techo de ingresos de esa base por sí sola es modesto — no confundir una buena cabeza de playa con liderazgo de mercado. |
| "Solo un cliente de referencia" (riesgo de referencia) | **Resuelto para la Pista 1** — Vale otorga presencia comprobable y citable en el mercado de facturación electrónica/cumplimiento de Ecuador. **Sigue abierto para la Pista 2** — ASOPREP-FCPC sigue siendo la única referencia en el sector cooperativo. |
| Las brechas de seguridad conocidas de SAA son un bloqueador duro para el lanzamiento comercial | Sin cambios y sigue siendo obligatorio corregirlas antes de vender a cualquier institución financiera regulada (Pista 2) — sin autenticación real del lado del servidor, una vulnerabilidad de lectura/eliminación de archivos sin autenticación, CORS de origen comodín. |
| Sin clases base compartidas (~330 tríos backend copiados a mano, ~340 servicios frontend) | Sin cambios — productizar hacia un producto multi-tenant configurable sigue siendo costoso sin importar qué pista se persiga. |
| Sector cooperativo en contracción en número de entidades (921→393 desde 2016), segmento más pequeño fallando | Sin cambios — la Pista 2 debe apuntar a los segmentos 2-3, no 4-5. |
| Ciclos de venta B2B largos y basados en relaciones para instituciones financieras | Sin cambios para la Pista 2 — probablemente 6-12+ meses por acuerdo. |
| Requisitos desconocidos de certificación/auditoría de proveedores por parte de la SEPS | Sin cambios — vale la pena confirmar directamente antes de comprometerse más con la Pista 2. |
| **Nuevo: ambigüedad de posicionamiento para la venta cruzada de Vale** | ¿La nueva suite contable es un módulo adicional de Vale, o un producto vendido por separado? Afecta el precio, el mensaje de ventas, y si el personal de soporte actual de Vale puede venderla directamente. Decidir antes de construir la campaña de venta cruzada. |
| **Nuevo: tamaño no verificado del canal de contadores dentro de Vale** | "Mezcla de empresas directas y contadores" no cuantifica la proporción. Esa proporción determina cuánta palanca ofrece realmente el sub-canal de contadores — vale la pena extraerlo de los datos de clientes existentes antes de dimensionar la campaña. |

## Oportunidades

1. **El código base existente es un verdadero punto de partida para la Pista 2** — CRD (crédito/préstamos/aportaciones de socios) y TSR (tesorería/conciliación bancaria) son exactamente lo que necesita un core system de cooperativa y exactamente lo que Siigo Contífico/Alegra/herramientas contables genéricas no tienen.
2. **Existe un vacío real e identificable en la Pista 2**: ~150-165 cooperativas de los segmentos 2-3 son demasiado complejas para software genérico y están desatendidas por el enfoque de nivel empresarial de Cobiscorp. La SEPS publica los listados por segmento, por lo que el contacto puede ser dirigido, no especulativo.
3. **El mandato de facturación electrónica es un factor forzoso** en todo el mercado — cada empresa necesita software compatible por ley, un viento de cola para la Pista 1 en general.
4. **La base existente de Vale es un canal de venta cruzada de CAC casi nulo para la Pista 1.** Vender la suite contable completa a 500-5,000 clientes que ya confían y ya pagan es una economía fundamentalmente distinta a la adquisición neta nueva contra Siigo Contífico.
5. **El subconjunto de contadores en la base de Vale es un multiplicador.** Los contadores que gestionan múltiples RUC de clientes a través de Vale representan acceso potencial a sus otros clientes también — estructuralmente el mismo mecanismo detrás del efecto de red de 70,000 contadores de Siigo Contífico, solo que a menor escala actual. Este es el canal de mayor apalancamiento identificado para la Pista 1.
6. **La base técnica de Vale reduce el costo de construcción de la Pista 1.** El equipo ya resolvió el cumplimiento de facturación electrónica del SRI (firma XML, validación en tiempo real con el SRI) — esto no es terreno técnico nuevo, y puede integrarse o extenderse en la nueva suite en lugar de reconstruirse.
7. **Vale fortalece la credibilidad de la Pista 2 incluso sin superposición directa.** Poder señalar un producto real, operativo, compatible con el SRI, con cientos de clientes ecuatorianos activos — no solo un despliegue a medida — mejora cualquier presentación ante directivos de cooperativas, aunque la lista de clientes de Vale en sí no incluya ninguna cooperativa.
8. **Una vez ganado, los costos de cambio para el core system de una institución financiera (Pista 2) son extremadamente altos** — a diferencia de la economía delgada y fácilmente perdible del consumidor, un acuerdo de core system tiende a ser duradero por años, reflejando la misma dinámica de dependencia de proveedor que llevó a ASOPREP-FCPC a encargar SAA en primer lugar.

## Perspectiva Financiera, Estimaciones de Costos y Márgenes

### Pista 1 — Mercado genérico de PYMEs/contadores (vía venta cruzada de Vale)

- **CAC para la porción de venta cruzada de Vale: casi nulo** — relación de facturación existente, confianza existente, sin necesidad de gasto de adquisición neto nuevo.
- **Estimación conservadora de conversión:** una tasa de venta cruzada del 10-20% en 500-5,000 clientes existentes produce **50-1,000 nuevos clientes de la suite contable** esencialmente sin gasto de marketing.
- **El techo de ingresos permanece limitado por el tamaño de la base de Vale** — esto hace que la Pista 1 sea inmediatamente ejecutable y rentable, pero es una cabeza de playa, no un camino para desplazar a Siigo Contífico en general. Su verdadero valor es ingreso rápido, barato y de bajo riesgo que también financia/reduce el riesgo de la Pista 2.
- La adquisición en frío más allá de la base de Vale, en el mercado más amplio de ~2 millones de contribuyentes, **no se recomienda** — igualar o subcotizar el precio de $40-110/año de Siigo Contífico significaría márgenes muy ajustados y requeriría un volumen (decenas de miles de clientes) que el equipo no tiene una vía actual para alcanzar a bajo costo.

### Pista 2 — Nicho de cooperativas financieras (no afectado por Vale)

- **Costo de productización:** convertir SAA de un despliegue a medida de un solo cliente a un producto configurable, seguro y multi-tenant requiere una re-arquitectura real — multi-tenancy, herramientas de configuración por cliente, corrección de las brechas de seguridad, documentación, herramientas de incorporación. Estimar un equipo de 4-6 personas (backend, frontend, QA, DevOps) durante 12-18 meses, aproximadamente **$200,000–450,000** de construcción total a tarifas de ingeniería con cargas completas del mercado ecuatoriano.

**Estructura de precios relativa a las opciones de mercado:**

| Opción | Precio | Ajuste para cooperativas de segmento 2-3 |
|---|---|---|
| Siigo Contífico / Alegra (contabilidad genérica) | $40-110/año | Demasiado barato, pero también demasiado superficial — sin originación de créditos, sin seguimiento de aportaciones de socios |
| ERP genérico (Odoo, implementación con partner local) | $15,000-50,000/año de TCO para 10-20 usuarios | Rango de costo correcto, funcionalidad incorrecta — requeriría desarrollo a medida pesado para agregar módulos de crédito |
| Cobiscorp (COBIS Core) | No divulgado públicamente, presumiblemente de nivel empresarial (atiende solo ~15 de las cooperativas más grandes) | Demasiado costoso/complejo para la escala de los segmentos 2-3 |
| **Recomendado: este producto** | **Segmento 3: $600-900/mes (~$7,200-10,800/año); Segmento 2: $1,200-2,000/mes (~$14,400-24,000/año)** | Posicionado en el vacío — funcionalidad real de core system (crédito, aportaciones de socios, tesorería) a una fracción del precio empresarial presumido de Cobiscorp, escalonado según la capacidad de pago de la institución |

**Ritmo de ventas realista:** 5-10 clientes/año una vez que exista la versión productizada y los primeros casos de referencia, probablemente comenzando en el Año 2 tras la productización.

**Proyección de ingresos (refinada contra el SAM verificado de 158 entidades — segmentos 2+3 combinados, según el listado oficial de la SEPS anterior):**

| Año | Clientes acumulados | Ingreso promedio/cliente | Ingreso recurrente anual |
|---|---|---|---|
| 1 | 0-2 (piloto/beta, con descuento a cambio de casos de estudio) | — | ~$0-15,000 |
| 2 | 6-8 | ~$14,000 | ~$85,000-110,000 |
| 3 | 15-20 | ~$14,000 | ~$210,000-280,000 |
| 4 | 30-35 | ~$14,500 | ~$435,000-505,000 |
| 5 | 45-50 (≈28-32% del SAM de 158 entidades — una participación de mercado madura realista, no penetración total) | ~$15,000 | ~$675,000-750,000 |

- **Márgenes:** 70-85% de margen bruto una vez superada la inversión de productización y estabilizada la plataforma — el verdadero factor de costo es la duración del ciclo de ventas y la sobrecarga de personalización por cliente, no el costo de entrega por unidad.
- **Recuperación de inversión:** la recuperación cae en el rango del **Año 3-4** contra el costo de construcción de $200-450 mil — un negocio genuino pero paciente.

**Cronograma:**
- **Meses 1-6:** Cerrar las brechas de seguridad conocidas (autenticación real, corrección del manejo de archivos, CORS) — no negociable antes de cualquier presentación a una institución regulada, en paralelo con la productización.
- **Meses 1-12:** Productización principal — multi-tenancy, herramientas de configuración por institución, herramientas de incorporación.
- **Meses 6-9:** Reclutar 1-2 cooperativas piloto de la lista de segmento 3 anterior — instituciones más pequeñas, probablemente más abiertas a un piloto con descuento a cambio de ser un caso de referencia formal, construyendo un segundo caso de estudio más allá de ASOPREP-FCPC.
- **Meses 12-18:** Lanzamiento formal al mercado — contacto directo con el listado validado de segmentos 2-3, presencia en conferencias sectoriales, conversaciones de alianza con federaciones.
- **Año 2:** Primera cohorte de clientes pagantes, según la tabla de ingresos anterior.
- **Años 3-5:** Escalar mediante referidos y el canal de federaciones — este es un sector impulsado por relaciones donde las ventas posteriores se vuelven más fáciles, no más difíciles, a medida que se acumulan los casos de referencia.

### Vista combinada

Ejecutar ambas pistas en paralelo, en lugar de secuencialmente, es la estructura recomendada: **la Pista 1 (venta cruzada de Vale) genera flujo de caja de bajo riesgo a corto plazo comenzando de inmediato**, lo cual **financia y reduce el riesgo de la inversión de productización de la Pista 2**, cuyos ciclos de venta empresarial más lentos de 6-12+ meses se desarrollan durante el mismo período.

## Estrategia de Marketing

### Pista 1 — priorizar en este orden

1. **Campaña de venta cruzada directa a la base existente de Vale** — la nueva prioridad principal, por encima de todo lo demás en esta pista. Avisos dentro de la app, contacto directo desde las relaciones existentes de gestores de cuenta/soporte, precios en paquete para clientes existentes.
2. **Apuntar específicamente al subconjunto de contadores** — identificar qué clientes de Vale son contadores que gestionan múltiples RUC de clientes, y ofrecerles un nivel de precios multi-cliente/de gestión de práctica que incentive implementar la suite en toda su cartera de clientes. Esto replica, a menor escala, el mecanismo exacto detrás del foso de Siigo Contífico.
3. **Verificación de datos antes de lanzar la campaña:** extraer la lista de clientes de Vale por código de actividad/industria para confirmar el supuesto de "solo empresas generales" — las cooperativas a veces están registradas bajo códigos de actividad comercial genéricos, así que una revisión rápida podría revelar leads inesperados para la Pista 2 a costo casi nulo.
4. **Decidir primero el posicionamiento del producto** — módulo adicional de Vale vs. producto vendido por separado — ya que esto determina el precio, el mensaje, y si el personal de soporte actual de Vale puede venderlo directamente.
5. Más allá de la base de Vale, **no perseguir adquisición pagada masiva** contra el mercado general de ~2 millones de contribuyentes — el CAC ahí no es económico dada la posición consolidada de Siigo Contífico.

### Pista 2 — sin cambios, estrategia B2B empresarial

1. **Ventas directas por relación a la dirección de cooperativas de segmentos 2-3** (gerentes generales, directorios) — los listados públicos por segmento de la SEPS permiten una lista dirigida.
2. **Venta por referencia/caso de estudio anclada en ASOPREP-FCPC** — en un sector basado en confianza y referencias entre pares, un despliegue existente y creíble pesa más que el gasto en publicidad. Ahora reforzado por Vale como una segunda señal de credibilidad complementaria ("ya operamos software financiero compatible y a escala, usado activamente por empresas ecuatorianas reales").
3. **Federaciones de cooperativas y asociaciones sectoriales como canal de distribución** — una relación puede abrir puertas a decenas de instituciones miembro.
4. **Conferencias sectoriales y eventos adyacentes a la SEPS.**
5. **La narrativa de "independencia del proveedor de TI" como el gancho de ventas principal** — muchas cooperativas de segmentos 2-3 probablemente sienten la misma dependencia de proveedor que sentía ASOPREP-FCPC antes de encargar SAA.
6. **Alianza con auditores/consultores independientes** que asesoran a las cooperativas en modernización de TI.
7. **Evitar por completo los canales masivos** en esta pista — este comprador descubre proveedores a través de pares y eventos sectoriales, no de anuncios o SEO.

## Fuentes

- [SEPS — Segmentación de entidades del SFPS (listado oficial, datos al 1 de junio de 2026)](https://www.seps.gob.ec/wp-content/uploads/SEGMENTACI%C3%93N-A%C3%91O-2026.pdf) — descargado y cotejado entidad por entidad para las listas de clientes prospectivos anteriores, vía [seps.gob.ec/institucion/segmentacion-de-esfps/](https://www.seps.gob.ec/institucion/segmentacion-de-esfps/)
- [Superintendencia de Compañías — crecimiento empresarial 2025 (172,641 compañías activas)](https://www.acavir.com/articulos/superintendencia-de-companias-en-ecuador-crecimiento-empresarial-en-2025)
- [Facturación electrónica obligatoria Ecuador 2024-2025 — Mobilvendor](https://mobilvendor.com/blogs/facturacion-electronica-obligatoria-ecuador)
- [Facturación electrónica inmediata desde 2026 — Manexware](https://www.manexware.com/blog/blog-odoo-1/facturacion-electronica-inmediata-en-ecuador-desde-2026-86)
- [Cooperativas pequeñas en Ecuador, las más numerosas y las que más entran en liquidación — Primicias](https://www.primicias.ec/economia/cooperativas-pequenas-numerosas-liquidacion-superintendencia-economia-popular-solidaria-121041/)
- [Cifras de las cooperativas más grandes de Ecuador en 2025 — Primicias](https://www.primicias.ec/economia/cifras-cooperativa-indicadores-solvencia-credito-morosidad-inversiones-ecuador-116398/)
- [Ecuador se destaca por sus soluciones especializadas de core bancario — Vistazo](https://www.vistazo.com/enfoque/ecuador-se-destaca-por-sus-soluciones-especializadas-de-core-bancario-FDVI216311)
- [Core Serverless de COBIS para cooperativas — Topaz Evolution](https://www.topazevolution.com/es/blog/core-serverless-cooperativas)
- [Siigo llega al mercado ecuatoriano](https://www.siigo.com/blog/siigo-llega-a-ecuador/)
- [Siigo y Contífico se fusionan para expandirse por América Latina — Primicias](https://www.primicias.ec/noticias/economia/siigo-contifico-fusion-expansion-america-latina/)
- [ERP para PYMEs en Ecuador 2026, guía completa con costos — Pacusoft](https://www.pacusoft.com/blog/erp-para-pymes-ecuador-guia-completa/)
- [Mejores ERPs PYMEs Ecuador 2026 — NM Tech Studio](https://www.nmtechstudio.com/blog/mejores-erps-pymes-ecuador-2026)
