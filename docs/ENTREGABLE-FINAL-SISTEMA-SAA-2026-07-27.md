# Entregable Final — Estado de Desarrollo del Sistema SAA

**Cliente:** ASOPREP-FCPC
**Proyecto:** RECUPERACIÓN DE ARQUITECTURA PARA INDEPENDENCIA DE PROVEEDORES IT
**Fecha:** 27 de julio de 2026
**Versión:** 2.0 — Continuación del Informe 1.0 (20 de enero de 2026)

---

## INFORME

1. Objetivo
2. Alcance
3. Relación con el Informe 1.0
4. Estado Actual por Módulo (Comparativo)
5. Detalle de Adiciones Relevantes fuera del Alcance Original
   5.1 Módulo de Tesorería — Conciliación Bancaria Completa
   5.2 Facturación Electrónica SRI (CxC / CxP)
   5.3 Generación de Archivos Regulatorios
   5.4 Módulo de Recursos Humanos (RRHH)
6. Volumen de Trabajo (evidencia cuantitativa)
7. Nota sobre Alcance y Continuidad del Desarrollo
8. Recomendaciones

---

## 1. Objetivo

Este informe da continuidad al **Entregable inicial sobre el desarrollo del sistema SAA** (v1.0, 20 de enero de 2026) y documenta el estado del sistema al momento de su **entrega completa**. No repite el detalle de arquitectura general, capas del sistema o pasos de despliegue ya cubiertos en el Informe 1.0 — ese contenido permanece vigente salvo donde se indique explícitamente un cambio. El objetivo de este documento es puntual: mostrar qué se agregó desde el corte de información del Informe 1.0 (03 de diciembre de 2025) hasta hoy, y dejar constancia clara de qué parte de ese trabajo excede el alcance originalmente definido.

## 2. Alcance

Este informe cubre el período comprendido entre el **20 de enero de 2026** (fecha de publicación del Informe 1.0) y el **27 de julio de 2026**. Incluye:

- Comparación del estado de cada módulo contra lo declarado en el Informe 1.0.
- Detalle funcional y técnico de las adiciones más relevantes: Tesorería, facturación electrónica SRI, generación de archivos regulatorios, y el módulo de Recursos Humanos (no contemplado en el alcance original).
- Evidencia cuantitativa del volumen de trabajo realizado en este período.
- Una nota de alcance para ordenar cómo se atenderán las solicitudes futuras.

## 3. Relación con el Informe 1.0

El Informe 1.0 dejó registrado, en su sección 7.2, el siguiente estado para los módulos aún no finalizados:

> *"Los módulos cuentas por Cobrar (CxC) cuentas por Pagar (CxP) tesorería reportes, tienen el menú y las opciones iniciales, pero no cuenta todavía con pantallas operativas completas."*

Y, en su sección 7.1, delimitó el alcance de módulos a: **Contabilidad, Crédito, Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP), Tesorería y Reportes**. El módulo de **Recursos Humanos (RRHH)** no aparece en esa lista.

Todo lo descrito en las secciones 4 y 5 de este documento parte de esa base: son módulos que el Informe 1.0 marcó explícitamente como pendientes, o que no formaban parte del alcance original en absoluto.

## 4. Estado Actual por Módulo (Comparativo)

| Módulo | Estado en Informe 1.0 (ene 2026) | Estado actual (jul 2026) | Componentes de pantalla (frontend) |
|---|---|---|---|
| Contabilidad | Completo, funcional | Completo, con refinamientos continuos (mayor analítico, asientos dinámicos, plan de cuentas) | 26 |
| Crédito | Completo, funcional — prioridad crítica del proyecto | Completo, con ampliaciones (tabla de amortización, generación de archivos Petrocomercial, dash de partícipes) | 46 |
| Cuentas por Cobrar (CxC) | Menú y opciones iniciales, **sin pantallas operativas completas** | **Completo**: ciclo completo de facturación electrónica, notas de crédito/débito, retenciones, gestión de anticipos, dashboard de ventas | 17 |
| Cuentas por Pagar (CxP) | Menú y opciones iniciales, **sin pantallas operativas completas** | **Completo**: bandeja electrónica, gestión y consulta de documentos, negociaciones, propuestas de pago, dashboard | 13 |
| Tesorería | Menú y opciones iniciales, **sin pantallas operativas completas** | **Completo** — el módulo más extenso del sistema: bancos, cajas, chequeras, cobros/depósitos, cheques, extractos bancarios, conciliación contable, cierre de mes | 49 |
| Reportes | Menú y opciones iniciales | Informes regulatorios operativos: archivos Superintendencia, informes mensuales de crédito | 3 (pantallas) + generación de archivos en backend |
| Recursos Humanos (RRHH) | **No contemplado en el alcance del Informe 1.0** | Módulo nuevo, completo, full-stack: gestión de asistencia, contratos de empleados | 38 |

**Total de componentes de pantalla en el sistema al día de hoy: ~196**, distribuidos en 9 módulos de negocio.

## 5. Detalle de Adiciones Relevantes fuera del Alcance Original

### 5.1 Módulo de Tesorería — Conciliación Bancaria Completa

Este es, en volumen y complejidad técnica, el desarrollo más significativo del período. Donde el Informe 1.0 registraba únicamente "menú y opciones iniciales", hoy existe un subsistema completo de conciliación bancaria:

- **Carga de extractos bancarios**: parsers dedicados para **11 bancos distintos** (cada uno con su propio formato de archivo, columnas, formato de fecha y moneda), con detección de formato por firma de bytes (no por extensión), flujo de dos fases (validar → confirmar), y validación de encabezado para evitar cargar el archivo de un banco equivocado en la cuenta de otro.
- **Tablero de Cumplimiento**: pantalla de control por período que muestra, cuenta por cuenta, cuáles ya cargaron su extracto y cuáles ya están conciliadas.
- **Conciliación Contable**: pantalla completamente rediseñada (reemplazó una versión anterior con datos de ejemplo fijos, sin conexión real al backend) — permite conciliar extracto bancario contra asientos contables con coincidencias N:M, sugerencias automáticas de coincidencia, y tolerancia configurable de días y monto.
- **Cierre de Mes**: bloqueo de ediciones (carga de extractos, conciliación) una vez que todas las cuentas de un período están verificadas, exclusivo del módulo de Tesorería y sin interferir con el proceso propio de mayorización de Contabilidad.

### 5.2 Facturación Electrónica SRI (CxC / CxP)

Se desarrolló el ciclo completo de facturación electrónica conforme a los requisitos del Servicio de Rentas Internas (SRI) de Ecuador:

- Emisión de facturas, notas de crédito, notas de débito, liquidaciones y retenciones (dos versiones).
- **Servicio de firma electrónica** dedicado para la firma digital de comprobantes.
- Autorización y consulta de documentos electrónicos ante el SRI.
- Parametrización de datos del facturador y datos SRI, tanto para CxC como para CxP.

Este es un desarrollo de cumplimiento regulatorio de complejidad considerable, no un simple CRUD de facturas.

### 5.3 Generación de Archivos Regulatorios

- **Archivos Superintendencia** (formato G44 y relacionados): generación de archivos regulatorios bancarios a partir de asientos contables.
- **Archivos Petrocomercial**: generación de archivos para el proceso de carga institucional con Petrocomercial.

### 5.4 Módulo de Recursos Humanos (RRHH)

Módulo completo — modelo de datos, DAOs, servicios, endpoints REST y 38 componentes de pantalla en el frontend (gestión de asistencia, contratos de empleados, entre otros) — que **no figura en la lista de módulos del Informe 1.0** (sección 7.1) y por lo tanto constituye una ampliación del alcance original, no una continuación de un módulo ya contemplado.

## 6. Volumen de Trabajo (evidencia cuantitativa)

Contabilizado directamente del historial de control de versiones de ambos repositorios (frontend y backend):

| | Desde el corte del Informe 1.0 (03-dic-2025) | Desde la publicación del Informe 1.0 (20-ene-2026) |
|---|---|---|
| Commits Frontend (saaFE) | 215 | 90 |
| Commits Backend (saaBE) | 185 | 101 |
| **Total** | **400** | **191** |

Es decir: más de la mitad del trabajo total registrado desde el corte de información del Informe 1.0 ocurrió **después** de que ese informe ya había sido entregado al cliente — reflejando el conjunto de módulos y funcionalidades descrito en la sección 5.

## 7. Nota sobre Alcance y Continuidad del Desarrollo

El desarrollo de software a la medida contempla, de forma natural y continua, ajustes menores, correcciones y mejoras de usabilidad sobre las funcionalidades ya entregadas. Este tipo de trabajo se mantiene dentro del alcance vigente del proyecto y continuará siendo atendido según cronograma y disponibilidad del equipo, sin requerir una gestión distinta a la actual.

Sin embargo, como se detalla en la sección 5, buena parte del trabajo realizado entre enero y julio de 2026 correspondió a solicitudes que **ampliaron sustancialmente el alcance** originalmente definido en el Informe 1.0: un módulo completo no contemplado (Recursos Humanos), subsistemas de cumplimiento regulatorio (facturación electrónica SRI, archivos Superintendencia y Petrocomercial), y el desarrollo integral del módulo de Tesorería, que en el informe inicial se encontraba únicamente en etapa de menú.

De cara a nuevas solicitudes, el equipo de GAEMI NEXUS S.A.S. continuará priorizando el desarrollo según cronograma y presupuesto disponible. Se recomienda que, a partir de este punto, las solicitudes se clasifiquen explícitamente entre:

- **(a) Ajustes y mejoras menores** sobre funcionalidad ya entregada — cubiertos dentro del alcance vigente del proyecto.
- **(b) Nuevas funcionalidades, módulos o integraciones adicionales** — que, por representar una ampliación del alcance original, ameritan una conversación específica de cronograma y presupuesto antes de iniciar su desarrollo.

## 8. Recomendaciones

1. Revisar en conjunto con ASOPREP-FCPC este informe y acordar formalmente el cierre del alcance definido en el Informe 1.0 como **entregado en su totalidad**, dejando este documento como respaldo.
2. Establecer, antes de iniciar nuevas solicitudes, un mecanismo simple de clasificación (ajuste menor vs. ampliación de alcance) para evitar ambigüedad sobre qué trabajo está cubierto por el acuerdo vigente.
3. Priorizar, dentro del trabajo ya cubierto por el alcance vigente, la estabilización y pruebas en producción de los módulos más recientes (Tesorería, facturación electrónica), dado su volumen y su rol crítico en la operación contable de ASOPREP-FCPC.
