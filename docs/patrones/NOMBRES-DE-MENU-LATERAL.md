# Nombres del menú lateral — cuántos caracteres entran

**Aplica a los SIETE módulos.** Vale para cualquier `displayName` de
`src/app/modules/**/menu*/**.component.ts`.

---

## La regla

> **Máximo 24 caracteres. Apuntá a 22 o menos.**

Un nombre más largo **no se recorta a la mitad: desaparece entero y queda un `...`**, sin una sola
letra. El usuario ve un ítem de menú con ícono y tres puntos, y no tiene forma de saber qué es.

```
✅  Devolución de Aportes        (22)
✅  Bandeja de Contabilidad      (23)
✅  Repote Valores Insolutos     (24)
❌  Cuentas por Tipo de Aporte   (26)  ->  "..."
❌  Escala de Calificación...    (33)  ->  "..."
```

**Medido contra producción el 2026-09-21** con capturas reales del menú de Créditos: el corte está
**entre 24 y 26**. Por eso el tope es 24 y la recomendación 22 — el ancho disponible cambia un poco
con la fuente de cada entorno, así que los últimos dos caracteres son margen, no adorno.

⚠️ **Cuanto más profundo el ítem, menos espacio hay.** El `padding-left` crece 12px por nivel
(`menu-list.component.html`), así que un ítem de tercer nivel tiene ~24px menos de ancho que uno de
primero. Si tu ítem va anidado, quedate más cerca de 20.

## Cómo verificar antes de commitear

```bash
grep -o "displayName: '[^']*'" src/app/modules/<mod>/menu*/*.component.ts \
  | sed "s/displayName: '//;s/'$//" \
  | awk 'length($0)>24 {print length($0)": "$0}'
```

Si no imprime nada, estás bien.

## Cómo acortar sin perder sentido

El ítem **no está solo**: vive dentro de un grupo y tiene un ícono. El grupo ya da el contexto, así
que la palabra que repite al grupo sobra.

| En vez de | Poné | Por qué |
|---|---|---|
| Recepción de Valores de Seguro | **Valores de Seguro** | está dentro de «Cobros»: «recepción» se entiende |
| Escala de Calificación de Riesgo | **Calificación de Riesgo** | está dentro de «Parametrización»: «escala» sobra |
| Cuentas por Tipo de Aporte | **Cuentas por Aporte** | «tipo de» no agrega nada para elegir |

**El nombre largo se queda donde hay lugar:** el título adentro de la pantalla, el breadcrumb y las
grillas no tienen este límite. Esto es **sólo la etiqueta del menú lateral**.

---

## Por qué existe este límite, y por qué no se arregla acortando el CSS

El ancho útil del texto es **~170-190px** con el sidebar expandido a 300px. Es así **por diseño**, no
es un bug.

El truncado lo hace **Angular Material**, no un estilo de la casa: en Material 15+ el contenido de
`<a mat-list-item>` queda dentro de `.mdc-list-item__primary-text`, que trae de fábrica
`white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis`.

⛔ **No "arregles" esto tocando `src/app/shared/basics/menu/forms/menu-list/menu-list.component.scss`
por tu cuenta.** Ese archivo lo usan los siete módulos: un cambio para acomodar un ítem propio le
rompe el menú a los otros seis equipos sin que nadie se entere. Ya hubo un intento de arreglo de
fondo (`eb45fd6`, 2026-09-08) que puso las reglas en `.menu-text` —el `<span>` hijo— **sin tocar el
contenedor de Material**, que es donde ocurre el recorte; por eso el problema siguió vivo. Si te
parece que hay que volver a intentarlo, **coordinalo con el equipo dueño de ese archivo**, no lo
edites de paso.

## Historial

| Fecha | Qué |
|---|---|
| 2026-09-08 | `omen2` reporta nombres largos como `...` en los siete menús y aplica un fix sobre `.menu-text` (`eb45fd6`) |
| 2026-09-21 | `omen-saa-1` verifica contra producción que el problema sigue: mide el corte entre 24 y 26 caracteres, identifica que el fix no toca `.mdc-list-item__primary-text`, acorta los nombres de `crd` y escribe esta regla |
