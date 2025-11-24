name: Pull Request
about: Template para Pull Requests
title: ''
labels: ''
assignees: ''

---

## Descripción
<!-- Proporciona una descripción clara y concisa de los cambios realizados -->

## Tipo de Cambio
<!-- Marca con una 'x' el tipo de cambio que mejor describe tu PR -->
- [ ] 🐛 Bug fix (cambio que no rompe compatibilidad y arregla un issue)
- [ ] ✨ Nueva feature (cambio que no rompe compatibilidad y agrega funcionalidad)
- [ ] 💥 Breaking change (fix o feature que causaría que funcionalidad existente no funcione como se esperaba)
- [ ] 📚 Documentación (cambios solo a documentación)
- [ ] 🎨 Mejora de UI/UX (cambios que mejoran la interfaz de usuario)
- [ ] ⚡ Mejora de performance (cambios que mejoran el rendimiento)
- [ ] 🔧 Refactoring (cambios de código que no corrigen bugs ni agregan features)
- [ ] ✅ Tests (agregar o corregir tests)
- [ ] 🔨 Configuración (cambios a herramientas de build, CI, etc.)

## Módulo(s) Afectado(s)
<!-- Marca con una 'x' los módulos que fueron modificados -->
- [ ] CNT (Contabilidad)
- [ ] CRD (Créditos) 
- [ ] CXC (Cuentas por Cobrar)
- [ ] CXP (Cuentas por Pagar)
- [ ] TSR (Tesorería)
- [ ] DASH (Dashboard)
- [ ] SHARED (Componentes compartidos)
- [ ] Configuración del proyecto

## Cambios Realizados
<!-- Lista detallada de los cambios realizados -->
- Cambio 1
- Cambio 2
- Cambio 3

## Issues Relacionados
<!-- Si este PR cierra issues, listalos usando la palabra clave "Closes" -->
Closes #(issue_number)
Fixes #(issue_number)

## Capturas de Pantalla
<!-- Si los cambios incluyen modificaciones a la UI, agrega capturas antes y después -->

### Antes
<!-- Captura del estado anterior -->

### Después  
<!-- Captura del nuevo estado -->

## Cómo Probar
<!-- Describe los pasos para probar los cambios -->
1. Paso 1
2. Paso 2
3. Paso 3

## Checklist
<!-- Marca con 'x' las tareas completadas. No elimines items, solo márcalos cuando estén listos -->

### Desarrollo
- [ ] El código sigue los [estándares de desarrollo](../.github/DEVELOPMENT_STANDARDS.md)
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, particularmente en áreas difíciles de entender
- [ ] He agregado/actualizado la documentación JSDoc donde es necesario
- [ ] Mis cambios no generan nuevas warnings de compilación

### Testing
- [ ] He agregado tests que prueban mis cambios
- [ ] Los tests nuevos y existentes pasan localmente con mis cambios
- [ ] He verificado que `npm test` pasa sin errores
- [ ] He verificado que `npm run build` funciona correctamente

### UI/UX (si aplica)
- [ ] Los cambios son responsive y funcionan en móviles
- [ ] He verificado la accesibilidad básica (contraste, navegación por teclado)
- [ ] Los iconos y textos son apropiados y consistentes
- [ ] Las animaciones y transiciones son suaves

### Integración
- [ ] He actualizado las rutas si es necesario
- [ ] He actualizado los menús de navegación si es necesario  
- [ ] Los cambios son compatibles con la configuración de proxy existente
- [ ] He verificado que no hay conflictos con otros módulos

### Backend Integration (si aplica)
- [ ] Las llamadas API siguen las convenciones establecidas
- [ ] El manejo de errores está implementado correctamente
- [ ] Los modelos TypeScript coinciden con los contratos backend
- [ ] He probado con datos reales del backend

### Performance
- [ ] Los cambios no afectan negativamente el tiempo de carga
- [ ] He considerado el impacto en el bundle size
- [ ] No hay memory leaks (subscriptions son manejadas correctamente)
- [ ] Las operaciones costosas están optimizadas

## Notas para Revisores
<!-- Cualquier información adicional que ayude a los revisores -->
- Areas específicas donde necesitas feedback
- Decisiones de diseño que tomaste y por qué
- Limitaciones conocidas
- Trabajos futuros relacionados

## Checklist Post-Merge
<!-- Items a completar después del merge (si aplica) -->
- [ ] Actualizar documentación wiki
- [ ] Notificar a usuarios beta
- [ ] Crear/actualizar issues de seguimiento
- [ ] Actualizar changelog del proyecto

---

**Reviewers:** @gaeminexus/frontend-team
**Estimado tiempo de revisión:** [15 min / 30 min / 1 hora / 2+ horas]
