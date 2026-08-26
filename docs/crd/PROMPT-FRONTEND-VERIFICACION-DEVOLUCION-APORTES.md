# PROMPT — Agente FRONTEND · Verificación de integración: devolución de aportes

> **Etiqueta: FRONTEND** (repo `saaFE`). Tarea disponible mientras el backend construye la
> Fase 2 del cierre de cartera. **No es una tarea de construcción**: la pantalla de
> devolución de aportes ya existe (`src/app/modules/crd/forms/devolucion-aportes/`); lo que
> nunca se hizo es probarla contra el backend real.

---

## Por qué

La pantalla de devolución de aportes se construyó contra un contrato escrito, igual que
pasó con bandas — y en bandas la verificación contra el servidor desplegado destapó dos
defectos reales que ningún resumen habría mostrado (una parametrización invisible por una
fecha de vigencia, y el manejo de errores del servicio). Aquí no se ha hecho esa pasada.

**El backend ya está desplegado y responde.** Comprobado el 2026-08-25 con `curl`:

```
GET http://localhost:8080/SaaBE/rest/dvap/porEntidad/1
200 → {"exito":true,"etapa":"APLICACION","resultado":[]}

GET http://localhost:8080/SaaBE/rest/dvap/deudaVigente/1
200 → {"exito":true,"etapa":"APLICACION","resultado":{"idEntidad":1,"totalDeuda":0.0,
       "cantidadPrestamos":0,"tieneMora":false,"prestamos":[]}}
```

Ojo: `GET /rest/dvap/getAll` responde **404 y es correcto** — esta clase REST no expone el
CRUD estándar, solo endpoints de negocio: `POST /dvap/registrar`, `GET /dvap/porEntidad/{id}`,
`POST /dvap/anular/{id}`, `POST /dvap/sincronizar`, `GET /dvap/deudaVigente/{id}`.

## Referencia

`docs/crd/PLAN-DEVOLUCION-APORTES.md` (espejo en este repo) — §6 es el contrato REST y §7 la
especificación de la pantalla. Es la fuente contra la que comparar.

## Qué verificar

1. **Sobre de respuesta.** Este módulo NO usa la forma de error del resto del sistema: el
   backend devuelve el sobre `{exito, etapa, mensaje, error, resultado}` **tanto en 2xx como
   en 4xx**, y tu servicio ya está escrito para no lanzar y ramificar por `resp.exito`.
   Compruébalo con respuestas reales, incluido al menos un caso de fallo, y confirma que la
   pantalla muestra el `mensaje` del sobre y no un texto genérico.
2. **Cada endpoint que consume la pantalla**: llámalo de verdad y compara la forma real
   contra tus interfaces (`model/devolucion/`), campo por campo — faltantes, extras, nulos.
3. **Fechas**: si algún campo es `LocalDate`/`LocalDateTime`, verifica el ida y vuelta real
   (`LocalDate` sale como arreglo `[a,m,d]` y entra como `"yyyy-MM-dd"`); confirma que el día
   no se corre. Es el fallo silencioso típico del proyecto.
4. **Escrituras con cuidado**: `registrar` y `anular` crean y anulan documentos reales en la
   base de desarrollo, y `registrar` además genera una orden de pago en CXP. Haz el mínimo
   imprescindible, sobre una entidad de prueba, y **anota exactamente qué dejaste creado**
   (ids de `CRD.DVAP`, `CRD.DDVA` y `PGS.PGTR`) para que se pueda limpiar. No pruebes
   `sincronizar` si no entiendes qué toca.

## Entrega

Por cada endpoint: **URL exacta, código de estado, content-type y cuerpo real** de la
respuesta, literal. Sin eso no está verificado. Y al final: qué corregiste en el front, qué
discrepancias son del backend o del documento (no las tapes parcheando el front), y qué
dejaste creado en la base de desarrollo.

## Lo que NO debes hacer

- No construyas ni reescribas la pantalla salvo para corregir un defecto que hayas
  demostrado con una respuesta real.
- No toques la pantalla de bandas: su verificación ya está cerrada.
- No empieces la pantalla del cierre mensual de cartera (Fase 2): su contrato aún no existe.
