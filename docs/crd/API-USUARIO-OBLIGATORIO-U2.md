# Contrato: usuario obligatorio en crd, cnt y asoprep (U-2)

**omen-saa-1-arb, 2026-11-01.** Regla del usuario: ningún proceso graba sin un usuario real del sistema. El
BE valida **lo primero** que el usuario no sea nulo ni vacío y que exista en `SCP.PJRQ` (el mismo nombre en
MAYÚSCULAS con el que se entra al sistema). Si no, **no hace nada** y responde error. Diseño:
`saaBE/docs/logica-negocio/cnt/DISENO-USUARIO-OBLIGATORIO.md`. Backend: saaBE `894dc5e1`.

**Regla del FE:** en estos endpoints se manda SIEMPRE `usuarioSesion()` (F1), sin relleno ni `''`, con
`encodeURIComponent`. Un error se muestra con el texto del servidor (`mensajeDeError`).

## 1. Query param `usuario` NUEVO (hoy el FE no lo manda: SE ROMPEN sin este cambio)
| Endpoint | Pantalla probable |
|---|---|
| `POST /rest/prst/cargarTablaExcel/{id}?usuario=` | Préstamo: cargar tabla de amortización desde Excel |
| `POST /rest/asgn/procesarCargaPetro/{id}?usuario=` | Carga Petro/ARCH: fase 2 (validación/proceso) |

## 2. Query param `usuario` que pasa a ser OBLIGATORIO (hoy el FE lo manda solo a veces o puede ir vacío)
| Endpoint | Nota |
|---|---|
| Cierre de cartera: ejecutar, reversar, reabrir (`?usuario=`) | Hoy el FE lo manda solo si lo tiene: mandarlo siempre |
| `POST /rest/prst/calcularMora` y `/calcularMora/{id}` (`?usuario=`) | Mora manual |
| `POST /rest/asnt/anular/{id}?usuario=` | Anular asiento (cnt) |
| `POST /rest/dsbn/recalcularDistribucion?usuario=` | Distribución en bandas |
| `gnap` crear cabecera de generación (`?usuario=`) | Generación del archivo Petro |

## 3. Ya lo manda, pero ahora se exige que EXISTA (revisar que no vaya `''`, `'sistema'` ni un id)
- Aprobar / rechazar préstamo (usuario en el cuerpo).
- Registrar cobro (CBCR).
- Transferencias, confirmar y reversar recepción de la carga Petro.
- Contabilizar desembolso(s).

## 4. Respuestas
400 (o 409/422 en algunos REST viejos) con el texto «… usuario …» del servidor. Nada se graba.

## 5. Para el FE ejecutor
Ubicar cada llamada de las §1–§3 en `src/app/modules/{crd,cnt,asoprep}` y ajustar el servicio y su
llamador. Si un endpoint no se encuentra o su ruta exacta difiere, verificar contra el REST del BE
(`PrestamoRest`, `AsientoRest`, `AsoprepGenerales`, `DistribucionBandaRest`, `CierreCarteraRest`,
`GeneracionArchivoPetroRest`) y reportarlo. **BE y FE van en el MISMO EAR.**

## 6. Agregado (2026-11-01, segunda tanda de U-2, saaBE `1fc24033`): más `?usuario=` NUEVOS y obligatorios
| Endpoint | Nota |
|---|---|
| `POST /rest/asgn/revalidarCarga/{idCarga}?usuario=` | Revalidar una carga Petro/ARCH |
| `GET /rest/asnt/generaReversion/{idAsiento}?usuario=` | Reversión de asiento (cnt). Es un GET que GRABA: el reverso queda a nombre de este usuario |
| `GET /rest/asnt/generaCopia/{idAsiento}?usuario=` | Copia de asiento (cnt). Ídem |

Sin cambio de firma, pero ahora el usuario tiene que EXISTIR (400 si no):
- `PUT`/`POST /rest/asnt`: el asiento manual, campo `nombreUsuario`.
- `POST`/`PUT /rest/avpc` y `/avpc/batch`: `usuarioRegistro` de cada afectación, sin `''`.
- `POST /rest/gnap`: `usuarioGeneracion`/`usuarioIngreso`.

Sin llamador en el FE (no tocar): `/asgn/procesarCargaPetro`, `/prst/contabilizarDesembolso(s)`, `/gnap/crearCabecera`.
`CargaArchivoService.procesarCargaPetro` del FE apunta a `/crar/procesarCargaPetro`, que no existe: se
puede borrar.
