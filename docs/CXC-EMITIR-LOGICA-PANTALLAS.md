# CXC Emitir - Bitácora de Lógica de Pantallas

## Objetivo
Documentar la lógica funcional de cada pantalla de **CXC > Emitir** en `saaFE`, para reutilizar el patrón al migrar/ajustar el resto de pantallas del módulo.

## Estado de avance
- [x] Facturas Ingreso (base inicial documentada)
- [ ] Factura Egreso
- [ ] Nota Crédito Ingreso
- [ ] Nota Crédito Egreso
- [ ] Nota Débito Ingreso
- [ ] Nota Débito Egreso

---

## 1) Facturas Ingreso

Ruta componente:
- `src/app/modules/cxc/forms/emitir/facturas-ingreso/facturas-ingreso.component.ts`
- `src/app/modules/cxc/forms/emitir/facturas-ingreso/facturas-ingreso.component.html`
- `src/app/modules/cxc/forms/emitir/facturas-ingreso/facturas-ingreso.component.scss`

### 1.1 Propósito funcional
Permitir la emisión de facturas de ingreso con:
- Selección de establecimiento y punto de emisión
- Búsqueda/selección de cliente
- Ingreso de ítems (detalle)
- Cálculo de subtotal, descuento, IVA y total
- Registro del comprobante
- Impresión del ticket/comprobante

### 1.2 Fuentes de datos y servicios usados
- `FacturadorService`: datos de facturador y contexto de emisión
- `PuntoEmisionService`: puntos de emisión por establecimiento/facturador
- `EstablecimientoService`: establecimientos disponibles
- `ProductoCobroService`: productos/servicios facturables
- `ListadoSriService`: catálogos SRI (tipos generales)
- `DetalleSriService`: detalle de catálogos SRI (formas de pago, etc.)
- `FacturaEmitirService`: persistencia de cabecera de factura
- Utilidades transversales:
  - `FuncionesDatosService` (formato/parseo de datos)

### 1.3 Estado reactivo principal (componente)
Patrones observados en la pantalla migrada:
- Señales (`signal`) para estados de UI:
  - carga (`loading`)
  - guardado (`saving`)
  - mensajes/errores
  - colecciones de catálogos (productos, puntos, etc.)
- Estructura de cabecera de comprobante en memoria
- Estructura de detalle en memoria (lista de líneas)
- Totales derivados recalculados ante cambios en detalle/descuento/IVA

### 1.4 Flujo funcional (end-to-end)
1. Inicialización
   - Cargar sesión (usuario/logged data)
   - Cargar facturador
   - Cargar establecimiento y puntos de emisión
   - Cargar catálogos SRI necesarios
   - Cargar productos/servicios para detalle
2. Selección de comprador
   - Buscar por identificación/nombre (según implementación vigente)
   - Setear datos del cliente en la cabecera
3. Construcción del detalle
   - Seleccionar producto
   - Ingresar cantidad/precio/descuento
   - Calcular subtotal de línea
   - Agregar/quitar/editar ítems
4. Cálculo de totales
   - Subtotal gravado/no gravado
   - Descuento total
   - Base imponible
   - IVA
   - Total final
5. Emisión
   - Validar cabecera + detalle
   - Construir payload de factura
   - Enviar a servicio de persistencia
6. Post-emisión
   - Mostrar resultado
   - Habilitar impresión
   - Limpiar formulario (según flujo)

### 1.5 Reglas funcionales mínimas (baseline)
- No permitir emitir sin cliente válido
- No permitir emitir sin al menos 1 ítem
- No permitir cantidades o valores negativos
- Recalcular totales ante cualquier cambio de detalle
- Mantener consistencia entre punto de emisión y establecimiento seleccionado

### 1.6 Checklist de paridad para replicar en otras pantallas Emitir
Usar esta lista para cada pantalla (egreso/notas):
- [ ] Carga de catálogos y contexto de emisión
- [ ] Búsqueda/selección de contraparte (cliente/proveedor según caso)
- [ ] Ingreso de detalle con edición/eliminación
- [ ] Cálculo integral de totales y tributos
- [ ] Persistencia de cabecera + detalle
- [ ] Impresión/visualización comprobante
- [ ] Validaciones de negocio previas a emitir
- [ ] Manejo de errores del backend

### 1.7 Pendientes de documentación (próximas iteraciones)
- Mapear campos exactos de payload vs endpoint real
- Definir reglas tributarias por tipo de comprobante
- Estandarizar validaciones compartidas de Emitir
- Extraer utilidades reutilizables para todas las pantallas

### 1.8 Iteración 1 de pulido (2026-07-13)
- **Cabecera visual**
   - Se eliminó el bloque de logo en pantalla para ganar espacio útil.
   - Se reorganizaron campos de cabecera (RUC, vencimiento, contacto, fecha, dirección, establecimiento/punto emisión) para lectura más clara.
- **Cliente obligatorio (sin consumidor final)**
   - Se eliminó la lógica de `Consumidor Final` en factura.
   - La factura ahora requiere siempre selección de titular.
   - Validación de emisión actualizada: si no hay titular seleccionado, no permite generar comprobante.
- **Diálogo de búsqueda de titular por rol (reusable)**
   - Nuevo componente: `src/app/shared/components/titular-selector-dialog/`.
   - Abre al presionar botón **Buscar Cliente** en factura.
   - Permite buscar por nombre o identificación.
   - Devuelve titular seleccionado y actualiza automáticamente los campos de cliente en pantalla.
- **Parametrización por rol (para reutilización futura)**
   - `PersonaClienteEmitirService` ahora expone `buscarTitularesPorRol(termino, rolCodigo)`.
   - En Facturas se usa `rolCodigo = 1` (CLIENTE).
   - Base lista para Retenciones con rol PROVEEDOR (misma infraestructura de diálogo).

---

## Bitácora de cambios

### 2026-07-13
- Se crea este documento como base de estandarización del módulo Emitir CXC.
- Se registra la lógica funcional de `Facturas Ingreso` como plantilla de replicación.
- Se completa Iteración 1 de pulido en Facturas Ingreso:
   - cabecera sin logo,
   - eliminación de consumidor final,
   - búsqueda y selección de titular mediante diálogo reusable con filtro por rol.
- Se completa Iteración 2 de UI en Facturas Ingreso:
   - reorganización de los campos del titular en una grilla más clara,
   - actualización de colores al estándar visual SAA (sin verde FEG),
   - botones y tarjetas con paleta primaria azul/violeta del sistema.
