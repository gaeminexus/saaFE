# Módulo RRHH — plan de implementación (frontend)

Todo lo que necesitas para trabajar el módulo de Recursos Humanos está **en esta carpeta**. No
hace falta abrir el repositorio del backend.

## Orden de lectura

| # | Archivo | Para qué |
|---|---|---|
| 1 | `PLAN-IMPLEMENTACION-RRHH-MAESTRO.md` | **Empieza aquí.** Reglas no negociables, convenciones y —lo más importante para ti— el **contrato REST completo con los DTO** de la sección 6 |
| 2 | `PLAN-IMPLEMENTACION-RRHH-FRONTEND.md` | Tu plan: saneamiento previo, design system, pantallas por fase, checklist |
| 3 | `ANALISIS-MODULO-RRHH.md` | Contexto: por qué se rehace el módulo y qué está roto hoy |

## El contrato es el punto de sincronización

El backend se implementa **en paralelo**, en otro repositorio. La sección 6 del maestro fija las
rutas, los cuerpos de petición y los DTO de respuesta. Mientras respetes esas firmas, puedes
avanzar sin esperar a que el backend esté listo.

Si necesitas cambiar algo del contrato, **no lo cambies por tu cuenta**: repórtalo, se actualiza
en el maestro y se avisa a la otra capa.

## Lo esencial en tres líneas

`src/app/modules/rrh` se rehace completo sobre el design system (`styles/abstracts`) y
`table-basic-hijos`. Las pantallas actuales de parametrización y gestión sí funcionan contra el
backend, pero ninguna importa el sistema de diseño y cada una reimplementa la tabla a mano
—`vacaciones-list` tiene 771 líneas frente a las 245 del componente de referencia
`modules/tsr/forms/bancos/`. Hay además cinco endpoints rotos y un árbol de rutas muerto que se
eliminan en la fase 0.

Los scripts de base de datos y el plan del backend viven en
`saaBE/docs/logica-negocio/rhh/`, por si alguna vez necesitas consultarlos.
