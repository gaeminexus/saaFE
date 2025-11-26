# Guards del Sistema

Este directorio contiene los guards de seguridad y navegación del sistema.

## 📋 Guards Disponibles

### 1. **authGuard** - Guard de Autenticación

**Ubicación**: `auth.guard.ts`

**Propósito**: Protege rutas para que solo usuarios autenticados puedan acceder.

**Funcionamiento**:
- Verifica si `localStorage.getItem('logged') === 'true'`
- Si el usuario NO está autenticado → Redirige a `/login`
- Si el usuario SÍ está autenticado → Permite el acceso

**Uso en rutas**:
```typescript
{
  path: 'menu',
  component: MenuComponent,
  canActivate: [authGuard]  // ← Protege la ruta
}
```

**Características**:
- ✅ Guarda la URL original en `queryParams.returnUrl` para redirigir después del login
- ✅ Registra intentos de acceso no autorizados en consola
- ✅ Funcional Guard (Angular 15+) usando `CanActivateFn`

---

### 2. **canDeactivateGuard** - Guard de Desactivación

**Ubicación**: `can-deactivate.guard.ts`

**Propósito**: Pregunta al usuario antes de abandonar una página (útil para prevenir pérdida de datos).

**Funcionamiento**:
1. Si el componente implementa `CanComponentDeactivate`, usa su método `canDeactivate()`
2. Si no, muestra un `confirm()` por defecto

**Uso en rutas**:
```typescript
{
  path: 'carga-aportes',
  component: CargaAportesComponent,
  canDeactivate: [canDeactivateGuard]  // ← Pregunta antes de salir
}
```

**Implementación en componente**:

```typescript
import { CanComponentDeactivate } from '../../shared/guard/can-deactivate.guard';

export class MiComponente implements CanComponentDeactivate {
  cambiosGuardados = true;

  canDeactivate(): boolean {
    if (this.cambiosGuardados) {
      return true;  // Permite salir sin preguntar
    }
    
    // Pregunta al usuario
    return confirm('¿Deseas salir sin guardar los cambios?');
  }
}
```

**Casos de uso**:
- ✅ Formularios con datos sin guardar
- ✅ Pantallas de carga de archivos en progreso
- ✅ Editores con cambios pendientes
- ✅ Prevenir refresh accidental (F5)

---

## 🚀 Implementación en app.routes.ts

Todas las rutas protegidas ya tienen los guards aplicados:

```typescript
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';

export const routes: Routes = [
  // Rutas públicas (sin guard)
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas con authGuard
  { 
    path: 'menu', 
    component: MenuComponent,
    canActivate: [authGuard]  // Solo usuarios logueados
  },
  
  // Rutas con ambos guards
  {
    path: 'menucontabilidad',
    component: MenuContabilidadComponent,
    canActivate: [authGuard],  // Requiere autenticación
    children: [
      {
        path: 'naturaleza-cuentas',
        component: NaturalezaDeCuentasComponent,
        canDeactivate: [canDeactivateGuard]  // Pregunta antes de salir
      }
    ]
  }
];
```

---

## 📖 Ejemplo Completo

Ver `ejemplo-can-deactivate.component.ts` para un ejemplo completo de implementación.

---

## 🔒 Seguridad

**Importante**: El `authGuard` solo verifica el localStorage. Para producción, considera:

1. **Token JWT**: Verificar token en lugar de booleano
2. **Expiración**: Validar que el token no haya expirado
3. **Roles**: Agregar verificación de permisos por rol
4. **Refresh Token**: Implementar renovación automática

**Mejora sugerida**:
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (!token || isTokenExpired(token)) {
    router.navigate(['/login']);
    return false;
  }
  
  return true;
};
```

---

## 🧪 Testing

Para probar los guards:

```typescript
// auth.guard.spec.ts
describe('authGuard', () => {
  it('debería permitir acceso si está logueado', () => {
    localStorage.setItem('logged', 'true');
    const result = authGuard(null, { url: '/menu' });
    expect(result).toBe(true);
  });
  
  it('debería redirigir si NO está logueado', () => {
    localStorage.removeItem('logged');
    const result = authGuard(null, { url: '/menu' });
    expect(result).toBe(false);
  });
});
```

---

## 📝 Notas

- Los guards son **Functional Guards** (Angular 15+), no clases
- Usa `inject()` en lugar de constructor DI
- Compatible con lazy loading modules
- Los guards se ejecutan en orden: `canActivate` → `canDeactivate`
