# Loading Spinner Global

Componente de spinner de carga global para la aplicación saaFE.

## Descripción

El `LoadingSpinnerComponent` muestra un indicador de carga visual cuando la aplicación está realizando operaciones asíncronas, especialmente durante la navegación y resolución de datos.

## Características

- **Spinner centrado**: Overlay de pantalla completa con spinner Material Design
- **Diseño moderno**: Animaciones suaves con backdrop blur
- **Automático**: Se activa automáticamente durante la navegación
- **Tipografía**: Usa Montserrat para consistencia con el sistema

## Funcionamiento

### Activación Automática

El spinner se activa automáticamente en los siguientes casos:

1. **Navegación entre rutas**: Se muestra desde `NavigationStart` hasta `NavigationEnd`
2. **Resolvers de datos**: Cuando una ruta tiene un resolver (ej: `tipos-crd`, `estados-crd`)
3. **Cancelación de navegación**: Se oculta en `NavigationCancel` o `NavigationError`

### Integración en App Component

```typescript
// app.ts
constructor() {
  this.router.events.pipe(
    filter(event =>
      event instanceof NavigationStart ||
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    )
  ).subscribe(event => {
    if (event instanceof NavigationStart) {
      this.spinnerService.show();
    } else {
      setTimeout(() => this.spinnerService.hide(), 300);
    }
  });
}
```

### Uso Manual (si es necesario)

Si necesitas controlar el spinner manualmente en algún componente:

```typescript
import { SpinnerService } from '@shared/basics/service/spinner.service';

export class MyComponent {
  constructor(private spinnerService: SpinnerService) {}

  cargarDatos() {
    this.spinnerService.show();
    
    this.miServicio.getData().subscribe({
      next: (data) => {
        // procesar datos
        this.spinnerService.hide();
      },
      error: (error) => {
        this.spinnerService.hide();
      }
    });
  }
}
```

## Estilos

El componente incluye:

- **Overlay semi-transparente**: `rgba(255, 255, 255, 0.95)` con blur
- **Tarjeta flotante**: Fondo blanco con sombra y bordes redondeados
- **Animaciones**:
  - `fadeIn`: Aparición suave del overlay (0.2s)
  - `slideUp`: Deslizamiento hacia arriba del contenido (0.3s)
- **z-index: 9999**: Asegura que esté sobre todo el contenido

## Beneficios

1. **Feedback visual**: El usuario sabe que el sistema está trabajando
2. **Previene interacciones**: El overlay bloquea clicks durante la carga
3. **Profesional**: Apariencia moderna y pulida
4. **Consistente**: Mismo diseño en toda la aplicación

## Casos de Uso

- ✅ Navegación a `/menucreditos/tipos` (12 tipos precargados)
- ✅ Navegación a `/menucreditos/estados` (4 estados precargados)
- ✅ Cualquier ruta con resolver
- ✅ Operaciones HTTP largas (opcional, manual)

## Notas Técnicas

- **Servicio**: `SpinnerService` con `BehaviorSubject<boolean>`
- **Observable**: `isLoading$ | async` reactivo
- **Standalone**: Componente standalone de Angular 18+
- **Material**: Usa `mat-spinner` con color primary
