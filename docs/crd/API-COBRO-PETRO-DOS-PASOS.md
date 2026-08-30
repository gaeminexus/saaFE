# Contrato de API — Cobro de Petro en dos pasos

**Fecha:** 2026-08-28 · **Módulo:** CRD / ASOPREP
**Estado:** ⛔ **CONGELADO.** Ningún agente lo cambia por su cuenta. Si algo no cuadra, se reporta
`BLOQUEADA` al árbitro y se espera — un cambio unilateral rompe al otro agente en silencio.

**Contexto obligatorio:** `LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md` §3.3 y la regla 11 de
§5. **DDL:** `sql/DDL-COBRO-PETRO-DOS-PASOS.sql` (lo ejecuta el usuario, no los agentes).

Application path real: `/SaaBE/rest`. Los errores llegan como **`500` con JSON `{"mensaje": "..."}`**
(lo envuelve `MensajeErrorJsonFilter`) — mostrar `mensaje`, nunca el JSON crudo.

---

## 1. El flujo, en una tabla

| Paso | Quién lo dispara | Qué pasa | Asiento |
|---|---|---|---|
| **1** | **Contabilidad**, a mano, sobre una carga | Registra las N transferencias con las que Petro pagó y confirma que el dinero entró al banco | D Banco(s) → H `2.3.01.15.01` |
| **2** | El proceso de aplicación del archivo | Reparte de la transitoria a las cuentas por cobrar, y de ahí a las cuentas reales | D `2.3.01.15.01` → H `1.4.05.05`/`1.4.05.10`, luego la aplicación |

El paso 1 **no es automático**: es un acto explícito de contabilidad. El paso 2 no puede ejecutarse
si el paso 1 no está hecho.

---

## 2. Endpoints

Todos cuelgan de `@Path("asgn")` (`com.saa.ws.rest.asoprep.AsoprepGenerales`), donde ya viven
`procesarArchivoPetro`, `procesarCargaPetro` y `aplicarPagosArchivoPetro`.

### 2.1 Transferencias de una carga

```
GET    /rest/asgn/transferencias/{idCarga}
       → { idCarga, periodo: "2026-08", nombreFilial,
           totalArchivo,          // lo que el archivo dice que se descontó
           totalTransferencias,   // suma de las transferencias vigentes
           diferencia,            // totalArchivo − totalTransferencias
           cuadra,                // boolean: |diferencia| <= 0.01
           confirmada,            // boolean: ¿ya se hizo el paso 1?
           usuarioConfirma, fechaConfirmacion,   // null si no está confirmada
           transferencias: [ TransferenciaDTO ] }

POST   /rest/asgn/transferencias
       body: { idCarga, idCuentaBancaria, idBanco, idBancoExterno,
               cuentaOrigen, numero, valor, fecha, observacion, usuario }
       → TransferenciaDTO
       // Rechaza si la carga ya está confirmada (paso 1 hecho).

DELETE /rest/asgn/transferencias/{idTransferencia}?usuario=X
       → { anulada: true }
       // Anula (estado 0), no borra. Rechaza si la carga ya está confirmada.

TransferenciaDTO = { idTransferencia, idCarga,
                     idCuentaBancaria, cuentaBancaria,   // número/nombre para mostrar
                     idBanco, nombreBanco,
                     idBancoExterno, nombreBancoExterno,
                     cuentaOrigen, numero, valor, fecha,
                     observacion, estado, usuarioRegistro, fechaRegistro }
```

### 2.2 Paso 1 — confirmar la recepción del dinero

```
POST   /rest/asgn/confirmarRecepcion/{idCarga}
       body: { usuario, ip, observacion }
       → { idCarga, confirmada: true,
           idAsiento, numeroAsiento, fechaAsiento, valorAsiento,
           contabilidadActiva,      // false = se confirmó pero NO se generó asiento
           mensaje }
```

**Validaciones, en este orden** (cada una devuelve `500 {mensaje}` con texto accionable):
1. La carga existe.
2. La carga **no está confirmada** ya.
3. Hay **al menos una** transferencia vigente.
4. La suma de las transferencias **cuadra** con el total del archivo (tolerancia `0.01`).
5. La carga está en un estado que admite la confirmación.

**Efecto:** sella `CRARUSCC`/`CRARFCAC`, mueve el estado de la carga, y —si
`contabilidadActiva()`— genera el asiento transitorio y lo registra en `CRD.ANCP` tipo 1.
Con la contabilidad apagada **la confirmación igual ocurre**, sin asiento, y `contabilidadActiva`
vuelve `false`: no es un error, hay que decirlo en pantalla.

### 2.3 Paso 1 — reversar la confirmación

```
POST   /rest/asgn/reversarRecepcion/{idCarga}
       body: { usuario, ip, motivo }     // motivo OBLIGATORIO
       → { idCarga, confirmada: false, idAsientoAnulado, mensaje }
       // Rechaza si el archivo ya fue aplicado (paso 2 hecho): primero se reversa el paso 2.
```

### 2.4 Estado contable de una carga

```
GET    /rest/asgn/estadoContable/{idCarga}
       → { idCarga, contabilidadActiva,
           asientos: [ { tipo,          // 1 TRANSITORIO, 2 REPARTO, 3 APLICACION
                         tipoTexto,     // el backend resuelve el catálogo, no el cliente
                         idAsiento, numeroAsiento, fecha, valor, lineas,
                         estado,        // 1 vigente, 0 reversado
                         usuarioRegistro, fechaRegistro } ] }
       // Lista vacía = todavía no se contabilizó nada. NO es error, devuelve 200.
```

---

## 3. Reglas que el frontend NO puede romper

- **`cuadra: false` bloquea la confirmación.** El botón se deshabilita y **el motivo tiene que estar
  a la vista** junto al botón, con la diferencia en dinero. Un botón muerto sin explicación es un
  defecto, no una validación.
- **`contabilidadActiva: false` no es un error.** La confirmación se hizo; hay que avisar que no se
  generó asiento, sin pintarlo en rojo.
- **`confirmada: true` congela la edición** de transferencias: no se agregan ni se anulan. Para
  corregir, primero se reversa.
- **Montos con 2 decimales y separador de miles.** `valor` y `diferencia` siempre con signo visible
  cuando la diferencia es negativa.
- **Fechas hacia el backend:** `fecha` de la transferencia es `LocalDate` → `yyyy-MM-dd`. Nunca un
  `Date` crudo ni nada terminado en `Z`. Desde el backend, normalizar **siempre** con
  `FuncionesDatosService.convertirFechaDesdeBackend()`.
- El **motivo del reverso es obligatorio** y va al asiento, no solo a la pantalla.

---

## 4. Protocolo de reporte

Cada agente reporta **al terminar cada pieza**, sin esperar a las demás:

```
PIEZA <n> — <BACKEND|FRONTEND> — <COMPLETADA | BLOQUEADA | COMPLETADA CON DESVÍOS>
Archivos tocados:      <lista>
Qué quedó funcionando: <2-4 líneas>
Desvíos del contrato:  <qué se hizo distinto y por qué; "ninguno" si no hubo>
Hallazgos:             <lo que se encontró y el contrato no contemplaba>
Impacto en el otro:    <si algo obliga a cambiar este contrato>
Pendiente:             <lo que no se hizo y por qué>
```

El backend **no compila ni despliega** (lo hace el usuario en Eclipse): reporta el código escrito,
no resultados de compilación.
