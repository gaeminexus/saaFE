# Instrucciones de Copilot para saaFE

Guía breve para que agentes de IA trabajen con esta app Angular 20.

## Resumen del Proyecto
- Framework: Angular CLI 20 con componentes standalone y Angular Material.
- Entrada: `src/main.ts` inicia `App` usando proveedores de `src/app/app.config.ts`.
- Ruteo: Centralizado en `src/app/app.routes.ts` con rutas en español y menús anidados por dominio (cnt, crd, cxc, cxp, tsr).
- Estructura por dominio: `src/app/modules/<dominio>/{forms,menu,model,service,resolver}`. Los modelos son interfaces TS (ej.: `modules/crd/model/producto.ts`).
- Capa compartida: `src/app/shared/` contiene proveedores de Material, utilidades, header/footer y servicios transversales.

## Ejecutar / Compilar / Probar
- Dev server (con proxy): `npm start` (alias de `ng serve --proxy-config proxy.conf.json`).
- Build: `npm run build`.
- Unit tests: `npm test` (Karma).
- Proxy dev: `proxy.conf.json` mapea `/api -> http://127.0.0.1:8080` y reescribe `^/api`.

## API y Patrones HTTP
- Bases de endpoints centralizadas en constantes:
  - Compartidos: `shared/services/ws-share.ts` (ej.: `ServiciosShare.RS_USRO`).
  - Créditos: `modules/crd/service/ws-crd.ts` (ej.: `ServiciosCrd.RS_PRDC`).
- Estilos coexistentes:
  - Preferido en dev con proxy: `'/api/saa-backend/rest/...'` (ver bloque comentado en `ws-share.ts`).
  - Absoluto: `'http://localhost:8080/saa-backend/rest/...'` (activo actualmente). Mantén un estilo por feature; usa proxy en código nuevo.
- Servicios: construyen URL con sufijos de método, retornan `Observable<T>` tipados y encadenan `catchError` a `handleError` (ver `producto.service.ts`). Ejemplos:
  - `getAll(): GET ${ServiciosCrd.RS_PRDC}/getAll`
  - `getById(id): GET ${ServiciosCrd.RS_PRDC}/getId/{id}`
  - Criterios: probar múltiples endpoints como fallback, priorizando GET y luego POST (ver `selectByCriteria`).
- Particularidad de errores: algunos `handleError` devuelven `of(null)` cuando `status===200` en la ruta de error. Presérvalo salvo que refactores los consumidores.

## UI y Componentes
- Shell standalone: `src/app/app.ts` muestra `Header`/`Footer` salvo en `/` y `/login`. El título sale de `localStorage['empresaName']` o heurísticas de ruta.
- Material: a nivel app vía `provideMaterial()` en `shared/providers/material.providers.ts`. Los componentes standalone pueden importar módulos Material adicionales o usar `SharedModule` según convenga.
- Estilos globales: `src/styles/styles.scss` con SCSS en `src/styles/{abstracts,base,components,pages}`.

## Utilidades y Exportaciones
- Datos: `shared/services/funciones-datos.service.ts` (transformaciones de texto, NVL, formateo de fechas; constantes `FECHA_HORA` y `SOLO_FECHA`).
- Exportar:
  - CSV/PDF con `shared/services/export.service.ts`. PDF usa jsPDF global (`window.jsPDF` / `window.jspdf.jsPDF`) o carga CDN; soporta `window.loadJsPDF()`. Tipos en `types/jspdf.d.ts`.

## Convenciones y Detalles
- TypeScript estricto en código y plantillas (`tsconfig.json`, `angular.json`). Prefiere interfaces explícitas en `modules/*/model` y manejo estricto de null.
- Rutas en español y agrupadas por dominio; agrega páginas editando `app.routes.ts` y colocando componentes en `modules/<dominio>/forms` o `menu`.
- Contratos backend con códigos de 4 letras (ej.: `PRDC`, `TPPR`); alinea modelos/servicios con comentarios en los modelos.
- Al añadir APIs: extiende el `ws-*.ts` correspondiente y referencia desde el servicio. En dev, prioriza bases con proxy.
- Si cambias la base del backend, alterna los bloques activos en `ws-share.ts`/`ws-crd.ts` o introduce selección por entorno, manteniendo consistencia entre features.

## Ejemplos Rápidos
- Nuevo GET en un servicio:
  - ``const url = `${ServiciosCrd.RS_PRDC}/getAll`; return this.http.get<Producto[]>(url).pipe(catchError(this.handleError));``
- Exportar desde un componente a CSV:
  - ``this.exportService.exportToCSV(rows, 'productos', ['Nombre','Estado']);``

