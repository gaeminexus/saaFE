# Contrato — `idEmpresa` en las solicitudes del motor de pagos de CRD

**Fecha:** 2026-08-31 · **Árbitro:** equipo A de `crd` (cobros, contabilidad, jubilados)
**Estado:** CONGELADO. Ni el backend ni el frontend lo cambian por su cuenta.
**Espejo obligatorio:** `saaFE/docs/crd/API-EMPRESA-CONTABLE-CRD.md`

---

## 1. La decisión

**Decisión del usuario, 2026-08-31:**

> *"El `idEmpresa` sale desde el frontend. Si la solicitud de pago no puede distinguirla
> actualmente, entonces debemos crear ese campo y alimentarlo desde todos los procesos."*

Queda **descartada** la alternativa de una "empresa contable de CRD" configurada en el rubro 237,
y descartado el híbrido de derivar donde haya cuenta bancaria. **No volver a proponerlas.**

### Por qué esta y no las otras

**No es un patrón nuevo: es el que ya corre en producción.** La **devolución de aportes** es una
operación que puede no tener cuenta bancaria —el débito automático no transfiere,
`DevolucionAporteServiceImpl:321-345`— y resuelve exactamente este problema recibiendo
`idEmpresa` **obligatorio** en la solicitud (`SolicitudDevolucionAporte:38`, validado en
`DevolucionAporteServiceImpl:218`). El script `sql/86_ACUERDO_EMPRESA.sql` repitió el mismo
patrón para el acuerdo de condonación y lo dejó dicho: *"es el patrón de la casa"*.

**Y evita una divergencia que no se detecta.** Una empresa configurada globalmente puede quedar
distinta de la que `CobroCreditoServiceImpl` deriva de la cuenta bancaria del cobro. Si eso pasa,
dos asientos del mismo socio por la misma operación caen en empresas distintas — **y los dos
cuadran D=H**, así que nada lo detecta. Con la empresa viajando pegada a la operación, el caso no
existe.

### El costo real, medido

El levantamiento decía *"hay que tocar cada endpoint y cada pantalla"*. **Verificado el
2026-08-31: son 7 DTOs y 7 endpoints**, y del lado del frontend es **una línea por llamada**,
porque ya existe el helper compartido `saaFE/src/app/shared/services/empresa-sesion.ts`
(`empresaSesionCodigo()`), hoy en uso por `crd`, `cxc` y `rrh`.

---

## 2. La regla, en una frase

> **Toda solicitud que llegue al motor de pagos o al registro de aportes lleva `idEmpresa`,
> y es obligatorio. Cuando la llamada nace dentro de `CobroCreditoServiceImpl`, la empresa la
> pone el propio `CobroCreditoServiceImpl` con la que ya derivó de la cuenta bancaria del cobro —
> NUNCA se reenvía la que mandó el cliente.**

La segunda mitad es la que preserva el invariante: el asiento transitorio del cobro (`CBCRASN1`),
el asiento definitivo (`CBCRASN2`) y el asiento que genere el hook del motor **salen todos de la
misma empresa, derivada una sola vez**, en `CobroCreditoServiceImpl:1250`
(`cuentaBancaria.getPlanCuenta().getEmpresa().getCodigo()`).

---

## 3. Los 7 DTOs y sus 7 endpoints

Campo nuevo, idéntico en los siete:

```java
/**
 * Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio.
 *
 * Lo manda el frontend desde la empresa de la sesión. Cuando la llamada viene de
 * CobroCreditoServiceImpl.procesarCobro/anularCobro, lo pone ese servicio con la empresa
 * derivada de la cuenta bancaria del cobro, NO con la que vino del cliente.
 */
private Long idEmpresa;
```

| # | DTO | Endpoint | Lo llama CBCR por dentro |
|---|---|---|---|
| 1 | `SolicitudPagoCuota` | `POST /rest/prst/pagarCuota` | **sí** (`:699`, `:803`) |
| 2 | `SolicitudPagoMultiple` | `POST /rest/prst/pagarMultiplesCuotas` | **sí** (`:710`) |
| 3 | `SolicitudPagoConAportes` | `POST /rest/prst/pagarConAportes` | **no** — nunca |
| 4 | `SolicitudPrecancelacion` | `POST /rest/prst/precancelar` | **sí** (`:694`) |
| 5 | `SolicitudAbonoCapital` | `POST /rest/prst/abonarCapital` | **sí** (`:728`) |
| 6 | `SolicitudAnulacion` | `POST /rest/prst/anularOperacion` | **sí** (`:469`) |
| 7 | `SolicitudRegistroAporte` | `POST /rest/aprt/registrarAporte` | **sí** (`:742`, `:795`) |

Las referencias `:nnn` son líneas de `CobroCreditoServiceImpl` **antes** de aplicar este cambio.

> **Corrección del agente de frontend (2026-08-31), incorporada:** este inventario salió del
> backend, y por eso lista los 7 como si los siete tuvieran pantalla. **Del lado del frontend solo
> 4 tienen llamador directo**: `pagarConAportes`, `precancelar` (solo la rama mixta con aportes),
> `anularOperacion` y `registrarAporte`. `pagarCuota`, `pagarMultiplesCuotas` y `abonarCapital`
> **no los llama ninguna pantalla**: esos flujos ya migraron a `CRD.CBCR` y los invoca
> `CobroCreditoServiceImpl` puertas adentro.
>
> **Las dos cosas son ciertas y no se contradicen.** Los 7 DTOs necesitan el campo porque el
> backend los construye por dentro; solo 4 necesitan cableado de pantalla. El campo queda en los
> otros 3 modelos del frontend, sin llamador — **no se borra**: el día que alguno se llame directo,
> ya está.

### Estado de aplicación

| Lado | Estado | Verificado por el árbitro contra el código |
|---|---|---|
| Backend — 7 DTOs, 7 validaciones, `derivarEmpresaCobro` único | ✅ aplicado | 2026-08-31 |
| Frontend — 7 interfaces, 6 sitios de llamada con guard | ✅ aplicado | 2026-08-31 |
| Despliegue conjunto (WAR + build) | ❌ **pendiente** | — |

**Mejora sobre el encargo, no deshacer:** `derivarEmpresaCobro` unificó la derivación y la usan
también `generarAsientoTransitorio` (ASN1) y `generarAsientoDefinitivo` (ASN2), que antes la
repetían. Elimina que el asiento transitorio y el definitivo deriven por caminos distintos.

### Los que NO llevan el campo, y por qué

- `SolicitudRegistroCobro`, `SolicitudEdicionCobro`, `SolicitudAprobacionCobro` — el cobro
  **exige** `idCuentaBancaria` (`CobroCreditoServiceImpl:923`), así que la empresa se deriva.
  **Agregarles el campo sería una segunda fuente para el mismo dato.**
- `SolicitudCierreCartera`, `SolicitudConfiguracionBanda`, `SolicitudDevolucionAporte`,
  `SolicitudRegistroAcuerdo` — **ya lo tienen**.
- Transferencias/recepción de Petro — derivan de la cuenta bancaria de la transferencia.
- Reportes, simulaciones, certificados, vigencias de contrato — no generan asiento.

---

## 4. Validación en el backend

En cada uno de los 7 servicios, junto al resto de validaciones de entrada:

```java
if (solicitud.getIdEmpresa() == null) {
    throw new IncomeException("idEmpresa es obligatorio: es la empresa contable sobre la que"
            + " se genera el asiento de la operación.");
}
```

**Obligatorio desde el día uno, con el flag de contabilidad todavía apagado.** Si se dejara
opcional "mientras no haya contabilidad", el día que se encienda el rubro 237 el campo llegaría
`null` desde las pantallas que nadie actualizó, y fallaría en producción en vez de en la primera
prueba. Es el mismo criterio con el que `DevolucionAporteServiceImpl` ya lo exige.

---

## 5. Frontend

Una línea por llamada, con el helper que ya existe:

```typescript
import { empresaSesionCodigo } from '<ruta>/shared/services/empresa-sesion';

const idEmpresa = empresaSesionCodigo();
if (idEmpresa == null) {
  // mismo mensaje que ya usa cierre-cartera.component.ts
  this.error.set('No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.');
  return;
}
```

**No se le pregunta la empresa al operador y no se agrega ningún control a la pantalla.** El campo
viaja en el cuerpo del request y es invisible para el usuario final.

> **Nota, no es trabajo de este contrato:** la empresa de la sesión sale en última instancia de
> `const EMPRESA = 1236;`, **hardcodeada** en `login.component.ts:31`. No hay selección de empresa
> en ninguna pantalla. Este contrato no lo cambia ni depende de que cambie; queda anotado porque
> el día que exista una segunda empresa, ese literal es el punto único a tocar.

---

## 6. Orden de aplicación

1. **Backend primero**, los 7 DTOs y las 7 validaciones en un solo cambio.
2. **`CobroCreditoServiceImpl`** en el mismo cambio: las 7 llamadas internas setean la empresa
   derivada. Si esto se difiere, `procesarCobro` empieza a fallar con "idEmpresa es obligatorio"
   sobre un circuito que **hoy está vivo en producción**.
3. **Frontend después**, contra el contrato ya publicado.

⚠️ **Entre 1-2 y 3 el sistema queda inconsistente**: los endpoints exigen un campo que las
pantallas todavía no mandan. **El WAR con este cambio no se despliega hasta que el frontend esté
listo**, o los cobros manuales dejan de funcionar. Los dos cambios salen juntos.
