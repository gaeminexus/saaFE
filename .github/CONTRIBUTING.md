# Guías de Contribución - saaFE

Bienvenido al proyecto **saaFE** - Sistema Administrativo Avanzado Frontend. Esta guía te ayudará a entender cómo contribuir efectivamente al proyecto.

## 📚 Documentación Disponible

- **[Estándares de Desarrollo](DEVELOPMENT_STANDARDS.md)** - Guía completa de patrones y convenciones
- **[Copilot Instructions](copilot-instructions.md)** - Instrucciones específicas para IA
- **[Guía de API](../proxy.conf.json)** - Configuración de proxy para desarrollo

## 🚀 Inicio Rápido

### **Prerrequisitos**
- Node.js v18+ 
- Angular CLI v20
- Git

### **Configuración del Entorno**
```bash
# Clonar el repositorio
git clone https://github.com/gaeminexus/saaFE.git
cd saaFE

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

### **Estructura de Branches**
- `main` - Rama principal estable
- `develop` - Rama de desarrollo
- `feature/*` - Nuevas características
- `fix/*` - Correcciones de bugs

## 📝 Proceso de Contribución

### **1. Crear una Nueva Feature**
```bash
# Crear branch desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# Ejemplo: feature/periodo-contable-grid
```

### **2. Desarrollo**
Sigue las **[Convenciones de Desarrollo](DEVELOPMENT_STANDARDS.md#checklist-para-nuevos-componentes)**:

#### **Crear Componente Nuevo:**
```bash
# Estructura requerida
mkdir -p src/app/modules/<dominio>/forms/<componente>

# Archivos requeridos
touch component.ts component.html component.scss component.spec.ts
```

#### **Patrones Obligatorios:**
- ✅ Componente standalone
- ✅ TypeScript estricto
- ✅ Material Design
- ✅ Responsive design
- ✅ Tests unitarios
- ✅ Documentación JSDoc

### **3. Commits**
Usar **Conventional Commits**:
```bash
# Formato
<tipo>(scope): descripción

# Ejemplos
feat(cnt): agregar componente periodo-contable con grid
fix(crd): corregir filtrado por empresa en productos
docs(github): actualizar guía de contribución
style(scss): mejorar responsive en tablas
test(services): agregar tests para PeriodoService
```

**Tipos válidos:**
- `feat` - Nueva funcionalidad
- `fix` - Corrección de bug
- `docs` - Documentación
- `style` - Cambios de estilo/formato
- `refactor` - Refactorización
- `test` - Tests
- `chore` - Tareas de mantenimiento

### **4. Pull Request**
```bash
# Antes del PR
npm test              # Tests deben pasar
npm run build         # Build debe ser exitoso
git rebase develop    # Mantener historial limpio
```

#### **Template de PR:**
```markdown
## Descripción
Breve descripción de los cambios realizados.

## Tipo de Cambio
- [ ] Nueva feature (feat)
- [ ] Corrección de bug (fix)  
- [ ] Cambio que rompe compatibilidad (breaking change)
- [ ] Documentación (docs)

## Checklist
- [ ] Código sigue los [estándares establecidos](DEVELOPMENT_STANDARDS.md)
- [ ] Tests añadidos/actualizados
- [ ] Documentación actualizada
- [ ] Build pasa sin errores
- [ ] Responsive design verificado
- [ ] Accesibilidad considerada

## Screenshots (si aplica)
Capturas de pantalla de la nueva funcionalidad.

## Testing
Describe cómo probar los cambios.
```

## 🏗️ Arquitectura y Convenciones

### **Módulos por Dominio**
```
modules/
├── cnt/    # Contabilidad
├── crd/    # Créditos
├── cxc/    # Cuentas por Cobrar
├── cxp/    # Cuentas por Pagar
└── tsr/    # Tesorería
```

### **Naming Conventions**
- **Componentes**: `kebab-case` (ej: `periodo-contable`)
- **Servicios**: `PascalCase` + `Service` (ej: `PeriodoService`)
- **Interfaces**: `PascalCase` (ej: `Periodo`)
- **Constantes**: `SCREAMING_SNAKE_CASE` (ej: `EMPRESA_CODIGO`)

### **Estructura de Archivos**
```typescript
// Componente example
@Component({
  selector: 'app-periodo-contable',
  standalone: true,
  imports: [CommonModule, MatCardModule, /* otros */],
  templateUrl: './periodo-contable.component.html',
  styleUrls: ['./periodo-contable.component.scss']
})
export class PeriodoContableComponent implements OnInit {
  // Propiedades públicas
  periodos: Periodo[] = [];
  
  // Propiedades privadas
  private destroyed$ = new Subject<void>();
  
  // Constructor con servicios inyectados
  constructor(
    private periodoService: PeriodoService,
    private fb: FormBuilder
  ) {}
  
  // Lifecycle hooks
  ngOnInit(): void {}
  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
  
  // Métodos públicos
  loadData(): void {}
  
  // Métodos privados
  private handleError(): void {}
}
```

## 🧪 Testing

### **Unit Tests**
```typescript
describe('PeriodoContableComponent', () => {
  let component: PeriodoContableComponent;
  let fixture: ComponentFixture<PeriodoContableComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodoContableComponent, HttpClientTestingModule],
      providers: [PeriodoService]
    }).compileComponents();
    
    fixture = TestBed.createComponent(PeriodoContableComponent);
    component = fixture.componentInstance;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should load periodos on init', () => {
    // Test implementation
  });
});
```

### **Service Tests**
```typescript
describe('PeriodoService', () => {
  let service: PeriodoService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(PeriodoService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should retrieve all periods', () => {
    const mockPeriodos = [{ codigo: 1, nombre: 'Test' }];
    
    service.getAll().subscribe(periodos => {
      expect(periodos).toEqual(mockPeriodos);
    });
    
    const req = httpMock.expectOne('/api/saa-backend/rest/prdo/getAll');
    expect(req.request.method).toBe('GET');
    req.flush(mockPeriodos);
  });
});
```

## 🎨 Estilos y UI

### **SCSS Structure**
```scss
// Importaciones requeridas
@use 'sass:color';
@use '../../../../styles/abstracts/colors' as *;

// Container principal
.periodo-contable-container {
  padding: 24px;
  background: $background-gradient;
  
  // Header
  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    // ... más estilos
  }
  
  // Cards
  .form-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }
  
  // Responsive
  @media (max-width: 768px) {
    padding: 16px;
  }
}
```

### **Material Design Guidelines**
- Usar componentes Material consistentemente
- Seguir paleta de colores del sistema
- Implementar responsive design mobile-first
- Accessibility considerations (ARIA labels, contrast)

## 🐛 Debugging y Troubleshooting

### **Common Issues**

**1. Error de Proxy:**
```bash
# Verificar proxy.conf.json está configurado
# Reiniciar servidor de desarrollo
npm start
```

**2. Error de Material Icons:**
```typescript
// Asegurar imports de Material
import { MatIconModule } from '@angular/material/icon';
```

**3. Error de Fechas:**
```typescript
// Usar función auxiliar en lugar de pipes problemáticos
formatFecha(fecha: any): string {
  // Implementación segura
}
```

### **Debug Tools**
- Angular DevTools (Chrome Extension)
- `console.log` con prefijos descriptivos
- Network tab para verificar API calls
- `ng build --stats-json` para análisis de bundle

## 📞 Soporte y Comunicación

### **Canales de Comunicación**
- **Issues**: Para reportar bugs y solicitar features
- **Discussions**: Para preguntas y discusiones técnicas  
- **Wiki**: Para documentación técnica detallada

### **Reportar Bugs**
```markdown
**Descripción del Bug**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer clic en '....'
3. Ver error

**Comportamiento Esperado**
Qué debería haber pasado.

**Screenshots**
Si aplica, agregar screenshots.

**Entorno**
- OS: [ej. Windows 11]
- Browser: [ej. Chrome 91]
- Angular: [ej. 20.3.10]
```

### **Solicitar Features**
```markdown
**¿Su solicitud está relacionada con un problema?**
Descripción clara del problema.

**Describe la solución que te gustaría**
Descripción clara de lo que quieres que pase.

**Alternativas consideradas**
Otras soluciones o features que has considerado.

**Contexto adicional**
Cualquier contexto u screenshots adicionales.
```

## 🏆 Reconocimientos

Los contribuidores al proyecto son reconocidos en:
- Lista de colaboradores en README
- Changelog de releases
- Créditos en documentación

## 📄 Licencia

Este proyecto está licenciado bajo [MIT License](../LICENSE) - ver el archivo para detalles.

---

**¿Preguntas?** Abre un issue o inicia una discussion. ¡Estamos aquí para ayudar! 🚀
