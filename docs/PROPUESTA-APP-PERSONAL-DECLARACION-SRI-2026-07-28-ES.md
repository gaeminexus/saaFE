# Propuesta: App Personal de Cumplimiento Tributario (SRI Ecuador)

> **Nota:** Este es un concepto de producto independiente y no relacionado — no forma parte del proyecto SAA/ASOPREP-FCPC. Se documenta aquí únicamente porque este repositorio fue el contexto de trabajo donde se discutió la idea. Toma prestadas lecciones arquitectónicas de SAA pero está dirigido a una audiencia distinta (público general, SaaS multi-tenant) y a un dominio distinto (cumplimiento del impuesto a la renta de personas naturales ante el SRI).

## Objetivo

Una app de consumo para personas que ganan más de ~$12,000/año (el umbral de declaración del SRI) para llevar un registro de ingresos y gastos durante el año, y al final del año preparar automáticamente (sin presentar automáticamente) su declaración de impuestos — calculando los valores correctos para el Formulario 102/102A o RIMPE, aplicando las categorías y topes de gastos personales deducibles del SRI, y guiando al usuario en la presentación dentro del propio portal del SRI.

Dos decisiones de alcance definidas desde el inicio:
- **Producto multi-tenant** para usuarios no relacionados entre sí, no una herramienta personal de un solo usuario — por lo tanto requiere autenticación real, aislamiento de datos por tenant, y seguridad de nivel consumidor (las brechas de autenticación conocidas de SAA son un no-objetivo explícito a no repetir).
- **Solo auto-preparación, no auto-presentación.** El SRI no expone una API pública para que personas naturales presenten declaraciones. La presentación final ocurre en el propio portal del SRI; el trabajo de la app termina en "aquí están los valores exactos, ingréselos aquí". La presentación mediante automatización de navegador queda deliberadamente fuera del alcance inicial (ver Fase 5).

## Arquitectura

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | Angular + Angular Material, empaquetado con Capacitor para móvil | Reutiliza el stack de Angular que ya domina el equipo; una app de consumo necesita ser mobile-first para la captura de comprobantes |
| Backend | Quarkus | Mismo modelo mental de JPA/JAX-RS/CDI que el stack Jakarta EE de SAA, pero cloud-native y construido para SaaS multi-tenant en lugar de un único despliegue en WildFly. Ver "Quarkus vs. Jakarta EE" abajo. |
| Base de datos | PostgreSQL | El modelo de licenciamiento por núcleo de Oracle encaja con un cliente empresarial pagando por su propia instancia (la situación real de SAA) — no encaja con un proveedor que asume el costo de la BD a través de muchos usuarios públicos no relacionados. Postgres tiene todo lo que este dominio necesita (JPA/Hibernate, JSONB, búsqueda de texto completo) sin costo de licencia. |
| Autenticación | Keycloak auto-hospedado (OIDC, JWT access+refresh, MFA) | Gratuito para siempre, y soluciona directamente la mayor falla de SAA: hoy no existen tokens de sesión reales del lado del servidor. Se descartó un proveedor gestionado de pago (Auth0/Okta) porque su precio por usuario activo mensual se vuelve costoso rápidamente para una app de consumo pública. |
| Multi-tenancy | `tenant_id`/row-level security en Postgres | Más simple que el modelo implícito de organización única de SAA; necesario porque esta app sirve a muchos usuarios independientes, no a un solo cliente organizacional. |

### Quarkus vs. Jakarta EE — curva de aprendizaje para un experto

Se transfiere casi sin cambios: anotaciones JAX-RS, mapeo JPA/Hibernate y JPQL, CDI (`@Inject`, scopes), Bean Validation.

Genuinamente distinto:
1. **Sin EJB** — `@Stateless`/`@Singleton` no existen; se reemplazan por scopes de CDI + `@Transactional`. Es mecánico pero no trivial a gran volumen (SAA tiene ~688 EJBs).
2. **CDI en tiempo de compilación (ArC)** — el grafo de beans se resuelve en tiempo de compilación, no en tiempo de ejecución; algunos trucos dinámicos/basados en reflexión de CDI se comportan distinto.
3. **Extensiones en lugar de módulos de servidor de aplicaciones** — extensiones de Maven/Gradle + configuración en `application.properties` en lugar del `standalone.xml` de WildFly.
4. **Modo dev** (`quarkus:dev`) con recarga en vivo — flujo de trabajo nuevo y más rápido.
5. **Native image (GraalVM)** es opcional — omitirlo inicialmente; solo importa para tiempos de arranque menores a 100ms, algo que un backend web típico no necesita.

Estimación: un servicio funcional REST+JPA+CDI en uno o dos días; manejo cómodo/idiomático de Quarkus dentro de una a dos semanas de uso regular.

### Resumen de costos de herramientas

Totalmente gratis a cualquier escala: Angular, Angular Material, Capacitor, Quarkus, PostgreSQL, Hibernate/JAX-RS/CDI, GraalVM Community Edition, Keycloak (auto-hospedado), el servicio público de consulta de comprobantes del SRI.

Tiene costo: hosting en la nube (cómputo/almacenamiento/ancho de banda — inevitable para cualquier SaaS hospedado), y opcionalmente una API de OCR de pago (Google Vision/AWS Textract) si la precisión de Tesseract (gratuito/auto-hospedado) resulta insuficiente (ver P2-15).

### Nota de cumplimiento

Esta app maneja datos personales/financieros del público general, lo cual pone a la LOPDP de Ecuador (ley de protección de datos personales) en alcance de una forma que la herramienta interna de un solo cliente de SAA nunca tuvo que abordar — los flujos de consentimiento, retención y eliminación de datos deben diseñarse desde la Fase 0, no agregarse después.

## Modelo de dominio

- Dos libros: `ingreso` y `gasto`, cada uno etiquetado con categorías del SRI.
- Tipos de ingreso: relación de dependencia, honorarios/servicios profesionales, arriendo, rentas de capital.
- Categorías de gasto (con topes anuales): vivienda, salud, educación, alimentación, vestimenta.
- Tablas de configuración versionadas por año para topes/tarifas y tramos de impuesto — el SRI actualiza esto anualmente, por lo que debe ser dato, no constantes en el código.
- Detección de régimen: RIMPE emprendedor/negocio popular vs. régimen general, ya que cambia qué formulario y reglas aplican.
- Consultas de comprobantes electrónicos mediante el servicio público de clave de acceso del SRI — la única pieza de "automatización" genuinamente factible vía API, distinta de la presentación en sí.

## Plan de Construcción por Fases

### Fase 0 — Fundamentos (2-4 semanas)

Dejar bien el esqueleto antes de cualquier funcionalidad específica de impuestos.

- Esqueleto del backend Quarkus, esqueleto del frontend Angular + Capacitor, Postgres con row-level security basado en `tenant_id`
- Keycloak auto-hospedado: OIDC real, tokens JWT access+refresh, MFA
- Pipeline de despliegue containerizado (CI/CD)
- Bases de cumplimiento LOPDP: flujo de consentimiento, política de retención/eliminación de datos, cifrado en reposo

**Criterio de salida:** un usuario puede registrarse, iniciar sesión con una sesión real, y ver un dashboard vacío de forma segura.

### Fase 1 — Registro Manual + Clasificador SRI (4-6 semanas)

Valor central sin dependencias externas — validar el modelo de dominio antes de agregar integraciones.

**Modelo de datos**
- P1-01 *(M)* Diseñar el esquema principal — `usuario`, `ingreso`, `gasto`, `categoria_sri`, `config_anual_sri`, con todas las filas de los libros llevando `tenant_id`/`usuario_id` y `anio_fiscal`.
- P1-02 *(S)* Sembrar datos de referencia de `categoria_sri` (vivienda, salud, educación, alimentación, vestimenta; relación de dependencia, honorarios, arriendo, capital).
- P1-03 *(S)* Sembrar `config_anual_sri` — topes de deducción y fracción básica desgravada por año, estructurado de modo que un año nuevo sea una fila nueva, no un cambio de código.

**Backend (Quarkus)**
- P1-04 *(M)* `IngresoResource` — endpoints REST CRUD, con alcance limitado al usuario autenticado, validados contra `categoria_sri`.
- P1-05 *(M)* `GastoResource` — mismo patrón CRUD, más marcado (no aplicación forzosa) de advertencias de tope.
- P1-06 *(M)* `ResumenAnualResource` — agrega los ingresos/gastos de un usuario por categoría para un año fiscal dado.
- P1-07 *(S)* Aplicación del alcance por tenant/usuario — verificar que toda consulta filtre por el `usuario_id` del principal autenticado desde el JWT, no por un parámetro de solicitud confiado. (Aborda directamente la clase de bug que señaló la revisión de SAA.)
- P1-08 *(S)* Validación de entradas y manejo de errores — sin montos negativos, sin fechas futuras, límites de año fiscal.

**Frontend (Angular)**
- P1-09 *(M)* Shell del dashboard protegido por autenticación mostrando totales del año fiscal actual.
- P1-10 *(S)* Formulario de registro de ingreso.
- P1-11 *(S)* Formulario de registro de gasto con texto de ayuda específico por categoría.
- P1-12 *(M)* Vista de historial/listado del libro — paginada, filtrable, editable.
- P1-13 *(M)* Pantalla de resumen anual consumiendo `ResumenAnualResource`.
- P1-14 *(S)* Pase de diseño responsivo/móvil — mobile-first, ingreso con una sola mano.

**QA / transversal**
- P1-15 *(M)* Prueba de aislamiento multi-tenant — demostrar que el Usuario A nunca puede leer/escribir los datos del Usuario B, ni siquiera mediante solicitudes manipuladas.
- P1-16 *(S)* Prueba de cambio de año fiscal.
- P1-17 *(S)* Runbook de actualización de datos semilla — cómo agregar la fila de `config_anual_sri` del siguiente año sin un despliegue de código.

**Nota de secuenciación:** P1-07 y P1-15 (aislamiento por tenant) deberían hacerse primero, no al final.

### Fase 2 — Captura Automática de Comprobantes (4-6 semanas)

**Captura y OCR**
- P2-01 *(M)* Interfaz de captura por cámara (plugin de cámara de Capacitor), opción de repetir foto, verificación básica de calidad de imagen.
- P2-02 *(M)* Pipeline de OCR — Tesseract auto-hospedado, extrae texto crudo de la imagen del comprobante.
- P2-03 *(M)* Extracción de la clave de acceso — parsear la clave de acceso de 49 dígitos de un texto OCR ruidoso, tolerante a errores de OCR.
- P2-04 *(S)* Entrada manual de respaldo — escribir/pegar el código, o ingresar completamente a mano un comprobante no electrónico.

**Integración con el SRI**
- P2-05 *(M)* Cliente del servicio de comprobantes electrónicos del SRI — consultar un comprobante por clave de acceso.
- P2-06 *(S)* Mapeo de respuesta — normalizar el esquema del SRI al modelo interno de `gasto`/`ingreso`.
- P2-07 *(M)* Caché y resiliencia — cachear consultas, degradar a entrada manual ante timeout/caída del SRI en lugar de bloquear al usuario.
- P2-08 *(S)* Detección de duplicados — restricción única sobre (usuario, clave de acceso).

**Auto-categorización**
- P2-09 *(S)* Mapeo semilla de comercio → categoría.
- P2-10 *(M)* Prompt de revisión de baja confianza — pedir al usuario que confirme la categoría cuando el comercio no está reconocido.
- P2-11 *(S)* Memoria de anulación por usuario — recordar las correcciones de categoría de un usuario a futuro.

**Conciliación bancaria**
- P2-12 *(M)* Importación de extracto bancario (CSV/OFX), reutilizando conceptualmente el patrón de carga de extractos bancarios de TSR.
- P2-13 *(L)* Motor de emparejamiento de transacciones — emparejar transacciones bancarias con entradas del libro por proximidad de monto y fecha, marcar las no emparejadas.
- P2-14 *(M)* Pantalla de revisión de transacciones no emparejadas — convertir con un clic a una nueva entrada del libro.

**QA**
- P2-15 *(M)* Benchmark de precisión de OCR — conjunto de prueba con comprobantes ecuatorianos reales; el dato de decisión para la evaluación de OCR de pago en la Fase 5.
- P2-16 *(S)* Prueba de resiliencia ante caída del SRI.
- P2-17 *(S)* Revisión de seguridad de cargas — validar/sanitizar imágenes de comprobantes cargadas (tipo de archivo, límites de tamaño, sin manejo arbitrario de rutas). Directamente relevante dada la vulnerabilidad de manejo de archivos sin autenticación encontrada en `FileRest`/`FileServiceImpl` de SAA — no repetir ese patrón.

**Nota de secuenciación:** construir el cliente del SRI (P2-05/06/07) antes del trabajo de OCR/cámara — es la incógnita de mayor riesgo.

### Fase 3 — Motor de Cálculo Tributario (3-5 semanas)

**Detección de régimen**
- P3-01 *(M)* Motor de reglas de clasificación de régimen (RIMPE emprendedor/negocio popular vs. régimen general).
- P3-02 *(S)* Interfaz de anulación de régimen para casos especiales.

**Aplicación de topes de deducción**
- P3-03 *(M)* Motor de aplicación de topes usando `config_anual_sri`.
- P3-04 *(M)* Interfaz de uso de tope en tiempo real — total acumulado vs. tope por categoría mientras el usuario registra gastos.
- P3-05 *(S)* Cálculo de la fracción básica desgravada.

**Cálculo de formularios**
- P3-06 *(L)* Módulo del Formulario 102 (régimen general / relación de dependencia).
- P3-07 *(L)* Módulo del Formulario 102A (honorarios/servicios profesionales, otros ingresos).
- P3-08 *(M)* Módulo de cálculo RIMPE.
- P3-09 *(S)* Datos semilla de tramos progresivos de impuesto, versionados como `config_anual_sri`.
- P3-10 *(M)* Validación contra ejemplos resueltos publicados por el SRI — confirmar la salida del motor antes de confiar en él para declaraciones reales.

**Plazos y recordatorios**
- P3-11 *(S)* Calendario de presentación por noveno dígito de cédula/RUC.
- P3-12 *(M)* Notificaciones de recordatorio (push/correo).
- P3-13 *(S)* Interfaz de preferencias de notificación.

**QA**
- P3-14 *(M)* Suite de regresión por actualización anual — el cambio de tarifas del siguiente año no debe romper silenciosamente los cálculos archivados de años anteriores.
- P3-15 *(M)* Pruebas de casos especiales — múltiples fuentes de ingreso, cambio de régimen a mitad de año, residencia parcial del año.

**Nota de dependencia:** la Fase 3 no puede comenzar de forma significativa hasta que la estructura de `config_anual_sri` de la Fase 1 esté sólida.

### Fase 4 — Salida Lista para Declarar (2-3 semanas)

**Generación de PDF/resumen**
- P4-01 *(M)* Servicio de generación de PDF — renderiza los valores calculados en un resumen descargable.
- P4-02 *(S)* Datos de mapeo de campos — mapea cada valor calculado a su campo exacto en el portal del SRI, mantenido como dato ya que el SRI cambia su portal periódicamente.
- P4-03 *(S)* Pantalla de resumen descargable.

**Guía paso a paso**
- P4-04 *(M)* Interfaz de guía de declaración paso a paso, impulsada por los datos de mapeo de campos.
- P4-05 *(M)* Contenido de referencia anotado del portal del SRI (capturas de pantalla/instrucciones).
- P4-06 *(S)* Paso de "marcar como presentado" — bloquea los datos del año como solo lectura.

**QA**
- P4-07 *(M)* Validación de extremo a extremo de la guía con una cuenta real (de prueba) del SRI.
- P4-08 *(S)* Runbook de actualización de contenido para cuando el SRI cambie la interfaz de su portal.

**Nota de dependencia:** la Fase 4 depende de que el motor de cálculo de la Fase 3 esté validado (P3-10) primero.

### Fase 5 — Opcional/Futuro (condicionado, no comprometido)

- P5-01 *(S, externo)* Revisión legal de los términos de servicio del SRI respecto a automatización — bloquea por completo a P5-03.
- P5-02 *(M)* Evaluación de API de OCR de pago (Google Vision/AWS Textract) — solo si el benchmark de P2-15 muestra que la precisión de Tesseract es inadecuada.
- P5-03 *(L, alto riesgo de ser descartable)* Prototipo de presentación mediante automatización de navegador — solo como experimento aislado, nunca integrado al producto principal hasta que P5-01 lo autorice y el prototipo demuestre ser duradero frente a cambios del portal.

## Resumen

~60 tickets a través de las Fases 0-4, aproximadamente 4-5 meses para un equipo pequeño antes de considerar la Fase 5. Cada fase entrega algo utilizable de forma independiente — la Fase 1 por sí sola ya es un rastreador de gastos funcional incluso antes de que exista cualquier integración con el SRI.
