## 📚 Documentación GitHub - saaFE

Esta carpeta contiene toda la documentación y configuración de GitHub para el proyecto **saaFE** (Sistema Administrativo Avanzado Frontend).

### 📋 Archivos Disponibles

#### **Documentación Principal**
- **[copilot-instructions.md](copilot-instructions.md)** ⭐ Instrucciones completas para agentes de IA con patrones obligatorios
- **[ANALISIS_ARQUITECTURA.md](ANALISIS_ARQUITECTURA.md)** ⭐ Análisis exhaustivo de la arquitectura con ejemplos de código
- **[DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md)** - Guía completa de estándares de desarrollo y mejores prácticas
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guía para contribuir al proyecto, proceso de desarrollo y convenciones

#### **Templates de Issues**
- **[bug_report.yml](ISSUE_TEMPLATE/bug_report.yml)** - Template estructurado para reportar bugs
- **[feature_request.yml](ISSUE_TEMPLATE/feature_request.yml)** - Template para solicitar nuevas funcionalidades

#### **Templates de Pull Requests**
- **[pull_request_template.md](pull_request_template.md)** - Template completo para PRs con checklist detallado

#### **CI/CD y Workflows**
- **[ci-cd.yml](workflows/ci-cd.yml)** - Pipeline automatizado de integración y despliegue continuo

### 🎯 Propósito de la Documentación

Esta documentación establece:

1. **Estándares Consistentes** - Asegura que todo el equipo siga las mismas convenciones
2. **Calidad del Código** - Define criterios de calidad y mejores prácticas
3. **Proceso de Desarrollo** - Clarifica el flujo de trabajo y metodología
4. **Automatización** - Proporciona herramientas para CI/CD y quality gates
5. **Colaboración** - Facilita la contribución de nuevos desarrolladores

### 🚀 Para Empezar

#### Para Desarrolladores
1. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Configuración del entorno y proceso básico
2. **[DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md)** - Estándares técnicos detallados
3. **[copilot-instructions.md](copilot-instructions.md)** - Patrones específicos de código
4. Revisa los templates para entender cómo reportar issues y crear PRs

#### Para Agentes de IA (Copilot)
1. **PRIMERO**: Lee [copilot-instructions.md](copilot-instructions.md) - Contiene todos los patrones obligatorios
2. **REFERENCIA**: Consulta [ANALISIS_ARQUITECTURA.md](ANALISIS_ARQUITECTURA.md) para ejemplos detallados
3. Aplica los estándares identificados en las carpetas `crd`, `dash` y `shared`

### 🔑 Patrones Clave del Proyecto

#### Signals Angular
Usar signals en lugar de propiedades tradicionales:
```typescript
loading = signal<boolean>(false);
totalRegistros = signal<number>(0);
```

#### Servicios con Fallbacks
Múltiples niveles de fallback para robustez:
```typescript
return this.http.get(url1).pipe(
  catchError(() => this.http.get(url2)),
  catchError(() => of([]))
);
```

#### Componentes Reutilizables
- `TableBasicHijosComponent` para grids CRUD
- `DynamicFormComponent` para formularios dinámicos
- `MenuListComponent` recursivo con animaciones

Ver [copilot-instructions.md](copilot-instructions.md) para más detalles.

### 📞 Soporte

- **Reportar bugs**: Usa el [template de bug report](ISSUE_TEMPLATE/bug_report.yml)
- **Solicitar features**: Usa el [template de feature request](ISSUE_TEMPLATE/feature_request.yml) 
- **Preguntas generales**: Abre una Discussion en GitHub
- **Contribuciones**: Sigue la [guía de contribución](CONTRIBUTING.md)

### 🔄 Mantenimiento

Esta documentación se actualiza regularmente para reflejar:
- Nuevos patrones de desarrollo
- Cambios en la arquitectura
- Mejoras en procesos
- Feedback del equipo

---

**Última actualización**: Diciembre 2024  
**Maintainers**: @gaeminexus/frontend-team

