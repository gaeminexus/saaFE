# Anulación de documentos de compra — el contrato está en `docs/cxc/`

Los 9 documentos anulables (compra **y** venta) se documentan juntos en un solo contrato, porque
las dos mitades se comportan **distinto** y el riesgo real es copiar el patrón de una en la otra:

➡️ **[`docs/cxc/API-ANULACION-DOCUMENTOS.md`](../cxc/API-ANULACION-DOCUMENTOS.md)**

Los cuatro de compra son `fctc`, `lqcc`, `ntcc`, `ntdc`. Tres cosas que **no** se parecen a venta:

- el id va en la **URL** (`POST /fctc/anular/{id}`), no en el cuerpo;
- "no existe" y "ya anulado" responden **200**, no 400 — **hay que leer `exito` del cuerpo**;
- **`lqcc` no tiene `movimientosRelacionados`, no acepta cascada y nunca devuelve 409.**
