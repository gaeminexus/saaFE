# Análisis de Mercado y Plan de Marketing: App Personal de Cumplimiento Tributario (SRI Ecuador)

> **Nota:** Documento complementario a `PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28-ES.md` (el plan de arquitectura/construcción). Este documento cubre viabilidad de mercado, rentabilidad, y un plan de marketing de bajo costo. Aplica la misma advertencia: es un concepto de producto independiente, no forma parte del proyecto SAA/ASOPREP-FCPC.

## Conclusión principal

Este es un nicho real, pero pequeño y poco profundo. Vendido directamente al consumidor, sostiene un negocio modesto y sostenible para un equipo pequeño — no un resultado de escala tipo venture capital — a menos que la distribución cambie de la adquisición individual vía app store hacia contadores y asociaciones profesionales que ya alcanzan a esta población de forma masiva.

## Tamaño de Mercado (TAM → SAM → SOM)

Ninguna fuente oficial contabiliza este segmento directamente — ningún directorio ni publicación del SRI desglosa a las "personas naturales no obligadas a llevar contabilidad que superan la fracción básica desgravada" como estadística propia. La estimación a continuación es un razonamiento acotado, no una cifra citada.

- El umbral real de declaración de Ecuador coincide casi exactamente con el marco de "$12 mil": la **fracción básica desgravada es de $12,081 para 2025 y $12,208 para 2026** — por debajo de eso, no se paga impuesto a la renta.
- La población económicamente activa (PEA) de Ecuador es de **8.6 millones** (diciembre 2025); solo el **37.1% tiene "empleo adecuado/pleno"** (empleo pleno, con al menos el salario básico) — aproximadamente 3.2 millones de personas.
- El ingreso laboral mensual mediano es de apenas **$397.80**, el promedio nacional **$498.80–513/mes** — muy por debajo de los ~$1,017/mes necesarios para superar el umbral anual. Solo **~14% de los hogares gana $1,500 o más al mes** (ingreso de hogar, no individual).
- El segmento adyacente más directamente contabilizable, **RIMPE Negocios Populares, tiene ~1.2 millones de contribuyentes** — pero eso corresponde a ingresos brutos de hasta $20 mil para microempresas, no a ingreso neto personal por encima de $12 mil, por lo que sobreestima el TAM si se usa directamente.

**Estimación de TAM:** entre 300,000 y 700,000 personas a nivel nacional que superan los ~$12 mil/año y no están obligadas a llevar contabilidad completa. Acotado por arriba por la población de RIMPE Negocios Populares, y por abajo por el hecho de que la mayor parte del segmento de "empleo adecuado" todavía no alcanza el umbral.

**SAM:** más reducido — el acceso a dispositivos no es la limitante (83.7% de penetración de internet, 15.2 millones de usuarios), pero sí lo son la disposición a pagar y el conocimiento de estas soluciones. La evidencia más sólida: **Kupuna**, la única competencia construida específicamente para este nicho, "no ha recibido suficientes calificaciones para mostrar una vista general completa" en su ficha de App Store pese a llevar un par de años activa — una señal directa de que el SAM que realmente convierte, sumando las 6-7 apps competidoras, probablemente sea de decenas de miles bajos, no cientos de miles.

**SOM (nuevo entrante, años 1-2, con diferenciación genuina):** de forma realista, **entre 2,000 y 10,000 usuarios**, la mayoría en un nivel gratuito.

## Panorama Competitivo

| App | Posicionamiento | Señal de precio |
|---|---|---|
| Kupuna | Competencia directa más cercana — construida para este nicho exacto, pre-clasifica compras, neteo de IVA/retenciones, maneja el anexo de gastos personales | No publicado; bajo volumen de reseñas sugiere tracción limitada |
| Calculadora Tributaria Ecuador | Calculadora simple y gratuita, sin registro continuo | Gratis |
| Apolo Software, ContApp | Enfocadas en facturación, tangenciales a impuestos | ContApp se combina con servicio de contador; la contabilidad general en Ecuador cuesta entre $50-80/mes (orientado a empresas, no a declaración personal) |
| Siigo Contífico | Plataforma completa de contabilidad/facturación, orientada a RIMPE, jugador comercial dominante | **$40.9–$110.9/año** — techo de precio efectivo para cualquier cosa posicionada como "más que una calculadora" |

El campo está fragmentado (seis o más apps dividiendo un mercado ya pequeño), y los precios son uniformemente bajos porque el ingreso de la población subyacente (mediana de ~$400-500/mes) limita lo que cualquiera puede cobrar. Competir aquí significa competir contra "el portal gratuito del SRI + un tutorial gratuito de YouTube + una tarifa modesta de contador de temporada", no contra comparables de SaaS empresarial.

## Modelo de Ingresos

Dado el techo de precio, evitar una suscripción mensual (se siente costosa para una necesidad de una vez al año). Estructura recomendada:
- **Gratis** durante todo el año para el registro de ingresos/gastos — el embudo de adquisición, sin costo para probar, construye el hábito.
- **Desbloqueo pagado al momento de declarar** — $10–20 de pago único por año fiscal para la declaración auto-preparada + guía paso a paso (el entregable de la Fase 4). Coincide con la forma en que el usuario objetivo ya valora mentalmente este problema (una tarifa de contador de temporada).

## Costo vs. Ingreso

- **Costo de construcción:** ~$30 mil–75 mil para llegar a la Fase 4, dependiendo del tamaño del equipo/tarifas (según el plan de construcción por fases).
- **Costo recurrente:** hosting (modesto a esta escala), OCR (Tesseract gratis a menos que el benchmark de P2-15 exija una actualización de pago), y una carga de mantenimiento anual genuina — el SRI cambia tarifas y la interfaz del portal cada año (P1-17, P3-14, P4-08 existen precisamente por esto). No es un producto de construir una sola vez.
- **Ingreso en el SOM (Año 2, ~8,000 usuarios pagantes × $15-20/año):** aproximadamente **$120 mil–160 mil/año**.

Rentable a escala de nicho/equipo pequeño; ajustado frente a la obligación de mantenimiento anual. No es suficiente para justificar un equipo dedicado grande a largo plazo en un modelo puramente B2C.

## Riesgos Clave

1. El techo de disposición a pagar es estructural (determinado por el ingreso de la población), no se soluciona con mejor marketing.
2. El propio SRI es un competidor gratuito en movimiento — podría mejorar la experiencia de su propio portal para el anexo de gastos personales en cualquier momento.
3. La ventaja de ser el primero en este posicionamiento exacto ya está tomada (Kupuna la ocupa hoy); la diferenciación debe ser genuina — importación automática de comprobantes electrónicos + conciliación bancaria, no solo otra calculadora.
4. El mercado no crece rápido — economía dolarizada, crecimiento lento del empleo formal (37.1% de empleo adecuado, apenas por encima del 33.0% de hace un año).

## Recomendación Estratégica

Vendido directamente al consumidor, esto es un **negocio pequeño/de nicho** viable, no un proyecto escalable tipo venture. La economía sustancialmente mejor viene de un **giro B2B2C a través de firmas contables/contadores** — cada uno ya atiende a decenas o cientos de clientes individuales que encajan exactamente en este perfil, dando un CAC casi nulo por usuario final en lugar de competir término de búsqueda por término de búsqueda en el app store contra Kupuna y otras cinco apps.

---

## Plan de Marketing de Bajo Costo

**Restricción guía:** con un LTV de aproximadamente $15-20/usuario/año (según el modelo de rentabilidad anterior), el costo de adquisición de clientes debe mantenerse en el rango de **$1-3** para que la economía unitaria funcione. Esto descarta la adquisición pagada masiva (anuncios de búsqueda/redes sociales) como columna vertebral del plan — es, cuando mucho, un presupuesto de prueba pequeño, no el canal principal.

### Prioridad 1 — SEO/marketing de contenido (costo casi nulo)
Publicar guías prácticas y orientadas a palabras clave en el momento en que la gente realmente busca: "cómo declarar el impuesto a la renta paso a paso", "anexo de gastos personales — qué se puede deducir", "calendario noveno dígito SRI". Los competidores existentes (sitios estilo Factuplan, ContApp, boletincontable) ya posicionan bien en estos términos — eso es evidencia de que el canal funciona, no de que está saturado, ya que la calidad del contenido en este campo fragmentado es inconsistente. Cada guía termina con un llamado a la acción suave hacia el nivel gratuito de registro.

### Prioridad 2 — Optimización en App Store (ASO) (costo casi nulo)
Apuntar a términos de coincidencia exacta: "declaración impuesto a la renta Ecuador", "anexo gastos personales", "SRI persona natural". La propia ficha de Kupuna muestra bajo volumen de reseñas — superarla en posicionamiento no requiere gasto en publicidad, solo trabajo consistente de palabras clave/capturas de pantalla y pedir reseñas a los primeros usuarios.

### Prioridad 3 — B2B2C vía contadores y asociaciones profesionales (menor CAC por usuario)
- Ofrecer un nivel gratuito/de marca blanca a contadores independientes que hoy hacen esto manualmente para muchos clientes individuales — convierte a un sustituto en un canal de distribución.
- Contacto directo con asociaciones profesionales con una concentración de perceptores de honorarios profesionales (colegios de médicos, abogados, ingenieros) — un segmento identificable y alcanzable de la población objetivo.
- Ofrecer a los departamentos de RRHH de empleadores medianos/grandes como beneficio para empleados asalariados por encima del umbral — licencias por volumen con descuento importante, CAC marginal casi nulo por cada empleado alcanzado.

### Prioridad 4 — Concentración estacional, no gasto durante todo el año
La ventana de declaración del SRI se concentra alrededor de febrero-marzo (según el propio boletín de marzo del SRI sobre plazos de declaración de personas naturales). Concentrar la publicación de contenido, los esfuerzos de ASO y cualquier prueba pagada en enero-marzo; cambiar el enfoque a retención/interacción (el hábito de registro gratuito) el resto del año. Las notificaciones push basadas en plazos ya planeadas para la Fase 3 (P3-12, ligadas al calendario del noveno dígito) también funcionan como palanca de retención, no solo como funcionalidad.

### Prioridad 5 — Video corto orgánico
Ecuador tiene una alta penetración de redes sociales (74% de la población). El contenido sobre tarifas/tips de impuestos ya obtiene tracción orgánica en plataformas como TikTok. Mantenerlo de bajo costo y estacional: videos explicativos simples ("3 gastos que sí puedes deducir y casi nadie declara") alrededor de la temporada de declaración, no producción durante todo el año.

### Prioridad 6 — Ciclo de referidos (costo casi nulo, se acumula con el tiempo)
Los usuarios objetivo se concentran en círculos profesionales/laborales. Un incentivo simple de "invita a un colega" (por ejemplo, un desbloqueo extra gratis en temporada de declaración) aprovecha la misma concentración que hace efectivo el canal B2B2C, sin necesidad de una alianza formal.

### Qué evitar
- Anuncios pagados masivos de búsqueda/redes sociales — el CAC superará al LTV dado el techo de precios.
- Gasto en TV/radio u otro alcance masivo — la población objetivo es un segmento específico de ingreso/profesión, no la población general.

## Fuentes

- [SRI Boletín 011 — declaración personas naturales](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/6eb8a7b2-22ad-4dd9-9adc-d0a2773448f4/BOLET%C3%8DN%20011%20-%20EN%20MARZO%20LAS%20PERSONAS%20NATURALES%20DEBEN%20DECLARAR%20EL.pdf)
- [SRI — Impuesto a la Renta](https://www.sri.gob.ec/en/impuesto-renta)
- [Fracción básica desgravada 2026 — Boletín Contable](https://boletincontable.com/2025/12/29/fraccion-basica-desgravada-del-impuesto-a-la-renta-en-ecuador-2026-valor-actualizado-y-tabla-proyectada/)
- [Tabla impuesto a la renta 2026 — Factuplan](https://factuplan.com.ec/blog/tabla-impuesto-a-la-renta-2026-ecuador)
- [Régimen RIMPE en Ecuador 2026 — Siigo](https://www.siigo.com/ec/blog/emprendimiento-y-ventas/regimen-para-emprendedores-y-negocios-populares/)
- [Régimen RIMPE Ecuador 2026 — CVE Abogados](https://cvecabogados.com/servicios/regimen-rimpe-ecuador-2026/)
- [Digital 2025: Ecuador — DataReportal](https://datareportal.com/reports/digital-2025-ecuador)
- [Planes y precios — Siigo Contífico](https://www.siigo.com/ec/planes/)
- [Precio de software contable en Ecuador 2026 — Anfibius](https://anfibius.net/precio-de-software-contable-en-ecuador-cuanto-deberias-pagar-en-2026/)
- [Kupuna Impuestos + Facturación — App Store](https://apps.apple.com/us/app/kupuna-impuestos-facturaci%C3%B3n/id1661450588)
- [Mayoría de hogares vive con no más de $513 — Expreso](https://www.expreso.ec/economia-y-negocios/mayoria-hogares-ecuador-vive-no-513-283516.html)
- [¿Cuánto ganan los hogares en Ecuador? — El Diario](https://www.eldiario.ec/negocios/el-dato-que-genero-debate-cuanto-ganan-realmente-los-hogares-en-el-ecuador-actual-12052026/)
- [Cifras de empleo Ecuador diciembre 2025 — Primicias](https://www.primicias.ec/economia/cifras-empleo-trabajo-desempleo-ecuador-diciembre2025-trabajadores-113355/)
- [Empleo adecuado alcanza 36.8% de la PEA — El Diario](https://www.eldiario.ec/negocios/el-empleo-adecuado-en-ecuador-alcanza-al-36-8-de-la-poblacion-economicamente-activa-30012026/)
- [¿Cuánto cuesta contratar un contador? — ContApp](https://www.contapp.ec/blogs/contratar-un-contador)
