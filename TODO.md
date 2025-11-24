# TODOs saaFE

Lista de funcionalidades planificadas para implementar en el sistema.

---

## 🏦 Módulo de Préstamos (CRD)

**Prioridad**: Alta  
**Estado**: Pendiente - Por definir en próxima sesión  
**Módulo**: `src/app/modules/crd/`

### Descripción:
Funcionalidad completa para gestión de préstamos en el módulo de Créditos.

### Tareas Planificadas:
- [ ] Definir modelo de datos para Préstamos
- [ ] Crear servicio HTTP para operaciones de préstamos
- [ ] Implementar formulario de creación/edición de préstamos
- [ ] Dashboard de préstamos activos
- [ ] Cálculo de cuotas y amortización
- [ ] Gestión de estados del préstamo (aprobado, rechazado, desembolsado, etc.)
- [ ] Reportes de préstamos

### Detalles Adicionales:
**Pendiente**: El usuario explicará en detalle los requerimientos en próxima sesión.

---

## 📄 Módulo de Contratos (CRD)

**Prioridad**: Alta  
**Estado**: Pendiente - Por definir en próxima sesión  
**Módulo**: `src/app/modules/crd/`

### Descripción:
Sistema de gestión de contratos relacionados con créditos/préstamos.

### Tareas Planificadas:
- [ ] Definir modelo de datos para Contratos
- [ ] Crear servicio HTTP para operaciones de contratos
- [ ] Implementar formulario de creación/edición de contratos
- [ ] Vinculación contratos-préstamos
- [ ] Gestión de documentos adjuntos
- [ ] Versionado de contratos
- [ ] Estados y workflow de aprobación
- [ ] Reportes de contratos

### Detalles Adicionales:
**Pendiente**: El usuario explicará en detalle los requerimientos en próxima sesión.

---

## 📋 Lectura de Archivo de Texto

**Prioridad**: Media  
**Estado**: Pendiente - Por definir en próxima sesión  
**Módulo**: Por definir

### Descripción:
Funcionalidad para importar/leer datos desde archivos de texto plano.

### Tareas Planificadas:
- [ ] Definir formato de archivo soportado (CSV, TXT, JSON, etc.)
- [ ] Crear servicio de parsing de archivos
- [ ] Implementar componente de carga de archivo (drag & drop o file input)
- [ ] Validación de formato y datos
- [ ] Mapeo de campos del archivo a modelos del sistema
- [ ] Preview de datos antes de importar
- [ ] Manejo de errores y datos inválidos
- [ ] Feedback de progreso (para archivos grandes)
- [ ] Logging de importaciones realizadas

### Casos de Uso Posibles:
- Importación masiva de entidades
- Importación de transacciones
- Carga de datos de préstamos/contratos
- Migración de datos desde sistemas legacy

### Detalles Adicionales:
**Pendiente**: El usuario explicará en detalle:
- Qué tipo de archivo
- Qué datos se leerán
- Destino de los datos (qué entidad/tabla)
- Formato específico del archivo

---

## 📝 Notas

- Estas funcionalidades serán explicadas en detalle por el usuario en próximas sesiones
- Actualizar este archivo con más detalles a medida que se definan los requerimientos
- Marcar tareas completadas con `[x]` a medida que se implementen
- Agregar nuevos TODOs según surjan necesidades

---

## ✅ Completados Recientemente (Referencia)

### Refactorización DatosBusqueda (Nov 2024)
- [x] Renombrar `asigna3` → `asignaUnCampoSinTrunc`
- [x] Renombrar `asigna7` → `asignaUnCampoConBetween`
- [x] Renombrar `asigna8` → `asignaUnCampoTruncadoConBetween`
- [x] Documentar todos los métodos con JSDoc
- [x] Refactorizar 23 llamadas en el sistema

### Mejoras UI/UX (Nov 2024)
- [x] Botón Dash en entidad-consulta
- [x] Participe-dash con modo búsqueda/precargado
- [x] Botón regresar en participe-dash
- [x] Optimización de estilos de botones
- [x] Corrección de pantallas con sidebar colapsado

### Performance (Nov 2024)
- [x] Resolver en entidad-edit
- [x] GPU acceleration en animaciones
- [x] Limpieza de console.log
- [x] Limpieza de datos en errores de búsqueda
