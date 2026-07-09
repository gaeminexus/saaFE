# Plan de Desarrollo - Pantallas TSR, CXP, CXC

**Fecha:** Julio 8, 2026  
**Objetivo:** Completar las pantallas frontend para los módulos de Tesorería, Cuentas por Pagar y Cuentas por Cobrar con estándar visual moderno

---

## 📊 ESTADO ACTUAL

### ✅ TSR - Tesorería (PARCIALMENTE COMPLETO)
**Pantallas existentes:**
- ✅ Titulares (tabla manual, sin table-basic-hijos)
- ✅ Bancos Nacionales/Extranjeros
- ✅ Cuentas Bancarias
- ✅ Chequeras
- ✅ Cobros (ingresar, consultas, cierre caja, depositos, procesos)
- ✅ Pagos (ingresar, consultas, cheques, procesos)
- ✅ Cajas Lógicas

**Faltantes:**
- ❌ Caja Chica (nueva funcionalidad)
- ❌ Secuencia Numeración Mensual (parametrización)
- ⚠️ Mejorar componentes existentes para usar table-basic-hijos

### ❌ CXP - Cuentas por Pagar (VACÍO - SOLO test.ts)
**Faltantes:**
1. ❌ Proveedores (CRUD con PersonaRol)
2. ❌ Grupos de Productos (similar a CXC)
3. ❌ Productos (CRUD)
4. ❌ Ingreso de Facturas
5. ❌ Configuración de Financiación
6. ❌ Consulta CxP (cartera vencida)
7. ❌ Proposición de Pago (solicitud)
8. ❌ Aprobación de Pagos (workflow)

### ⚠️ CXC - Cuentas por Cobrar (MÍNIMO)
**Pantallas existentes:**
- ✅ Grupo Productos (completo, buen ejemplo)

**Faltantes:**
1. ❌ Clientes (CRUD con PersonaRol)
2. ❌ Productos (CRUD)
3. ❌ Ingreso de Facturas
4. ❌ Configuración de Financiación
5. ❌ Consulta CxC (cartera)
6. ❌ Programación de Cobros

---

## 🎯 PRIORIDADES DE DESARROLLO

### FASE 1: CXP - Parametrización (3 pantallas - 1 día)
1. **Proveedores** (alta prioridad)
   - CRUD con table-basic-hijos
   - selectByCriteria con DatosBusqueda
   - Integra con PersonaRol (rol "Proveedor")
   - Asignación de cuentas contables (PersonaCuentaContable)

2. **Grupos de Productos CXP**
   - CRUD similar a CXC
   - Selector de plan de cuentas
   - Estado activo/inactivo

3. **Productos CXP**
   - CRUD con grupo asociado
   - Flags: aplicaIVA, aplicaRetencion
   - Estado activo/inactivo

### FASE 2: CXP - Operativo (4 pantallas - 2 días)
4. **Ingreso de Facturas CXP**
   - Formulario multistep moderno
   - Selector de proveedor con búsqueda
   - Detalle de items con grid
   - Cálculo automático de impuestos
   - Generación de asiento contable

5. **Configuración de Financiación**
   - Asociar a facturas
   - Periodicidad de cuotas
   - Cálculo de intereses
   - Generación automática de cuotas

6. **Consulta CxP**
   - Filtros avanzados modernos (fechas, proveedor, estado)
   - Tabla con cartera vencida destacada
   - Indicadores de saldo pendiente
   - Exportación CSV/PDF

7. **Proposición de Pago**
   - Selección de cuotas a pagar
   - Workflow de aprobación por niveles
   - Selector de cuenta bancaria
   - Generación de pago en TSR

8. **Aprobación de Pagos**
   - Dashboard de proposiciones pendientes
   - Filtros por nivel de aprobación
   - Botones aprobar/rechazar
   - Historial de aprobaciones

### FASE 3: TSR - Caja Chica (2 pantallas - 1 día)
9. **Parametrización Cajas Chicas**
   - CRUD con table-basic-hijos
   - Asignación de cuenta contable
   - Responsable, saldo inicial, monto máximo

10. **Movimientos Caja Chica**
    - Registro de gastos (con beneficiario)
    - Reposición de caja (con aprobación)
    - Generación de asiento contable
    - Consulta de movimientos

### FASE 4: CXC - Mirror de CXP (5 pantallas - 1.5 días)
11. **Clientes CXC**
    - Similar a Proveedores
    - PersonaRol con rol "Cliente"

12. **Productos CXC**
    - Similar a Productos CXP

13. **Ingreso de Facturas CXC**
    - Similar a Ingreso Facturas CXP

14. **Configuración Financiación CXC**
    - Similar a Financiación CXP

15. **Consulta CxC**
    - Similar a Consulta CxP

16. **Programación de Cobros**
    - Similar a Proposición de Pago

### FASE 5: Mejoras TSR (Opcional - 1 día)
17. Refactorizar Titulares para usar table-basic-hijos
18. Mejorar UI de Bancos con estándar visual moderno
19. Agregar parametrización de Secuencia Numeración

---

## 🎨 ESTÁNDAR VISUAL APLICADO

### Componentes Base
- ✅ **Signals** para estado reactivo
- ✅ **ReactiveFormsModule** con FormBuilder
- ✅ **Material UI** con appearance="outline" o "fill"
- ✅ **table-basic-hijos** para tablas CRUD
- ✅ **selectByCriteria** con DatosBusqueda[] para búsquedas
- ✅ **PlanCuentaSelectorDialog** para selección de cuentas

### Layout Moderno
```typescript
// Estructura típica de un componente CXP/CXC
export class MiComponente implements OnInit {
  // Signals
  loading = signal<boolean>(false);
  registros = signal<MiEntidad[]>([]);
  filtrosExpandidos = signal<boolean>(false);
  
  // Form
  filtrosForm!: FormGroup;
  
  // Table
  dataSource = new MatTableDataSource<MiEntidad>([]);
  displayedColumns = ['col1', 'col2', 'acciones'];
}
```

### CSS Patterns (SCSS)
```scss
// Gradientes modernos
.header-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

// Cards con sombra suave
mat-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

// Botones con hover animado
button {
  transition: all 0.3s ease;
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
}

// Form fields con appearance outline
mat-form-field {
  width: 100%;
  
  ::ng-deep {
    .mat-mdc-text-field-wrapper {
      background: white;
      border-radius: 12px;
    }
  }
}
```

### Paleta de Colores
```scss
$saa-primary: #667eea;
$saa-secondary: #764ba2;
$saa-success: #10b981;
$saa-warning: #f59e0b;
$saa-danger: #ef4444;
$saa-info: #3b82f6;
```

---

## 📋 CHECKLIST DE CALIDAD

### Por cada pantalla:
- [ ] Usa signals para estado reactivo
- [ ] Implementa loading states
- [ ] Maneja errores con snackBar
- [ ] Usa table-basic-hijos para tablas (cuando aplique)
- [ ] Usa selectByCriteria con DatosBusqueda[] (no objetos planos)
- [ ] Implementa filtros colapsables con animación
- [ ] Botones con íconos Material
- [ ] Exportación CSV/PDF (cuando aplique)
- [ ] Validaciones de formulario
- [ ] Confirmación para operaciones destructivas
- [ ] Responsive design
- [ ] SCSS con variables y mixins
- [ ] Comentarios en español

---

## 🔄 WORKFLOW GIT

```bash
# Crear branch para cada módulo
git checkout -b feature/cxp-parametrizacion
git checkout -b feature/cxp-operativo
git checkout -b feature/tsr-caja-chica
git checkout -b feature/cxc-completo

# Commits conventional
git commit -m "feat(cxp): agregar pantalla proveedores con table-basic-hijos"
git commit -m "feat(cxp): implementar ingreso de facturas con validaciones"
git commit -m "feat(tsr): crear módulo caja chica con movimientos y reposición"
```

---

## ⏱️ ESTIMACIÓN TOTAL

| Fase | Pantallas | Tiempo Estimado |
|------|-----------|-----------------|
| Fase 1: CXP Parametrización | 3 | 1 día |
| Fase 2: CXP Operativo | 5 | 2 días |
| Fase 3: TSR Caja Chica | 2 | 1 día |
| Fase 4: CXC Completo | 6 | 1.5 días |
| Fase 5: Mejoras TSR | 3 | 1 día |
| **TOTAL** | **19 pantallas** | **6.5 días** |

**Con 2 desarrolladores en paralelo:** ~3.5 días  
**Fase crítica (CXP):** 3 días solo

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. ✅ Documentación de backend completada
2. 🔄 **AHORA:** Crear pantallas CXP Fase 1 (Proveedores, Grupos, Productos)
3. Crear pantallas CXP Fase 2 (Facturas, Financiación, Consulta, Proposición)
4. Crear pantallas TSR Caja Chica
5. Replicar CXC desde CXP

**Última actualización:** Julio 8, 2026
