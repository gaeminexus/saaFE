# Paso a producción — Carga automática de documentos CXP desde el SRI

> Lista de verificación previa al despliegue. Complementa
> `PLAN-CARGA-AUTOMATICA-SRI.md`, que tiene el diseño y la bitácora de
> decisiones.
>
> Fecha: 2026-08-23 · Estado: **pendiente de ejecutar**

---

## 1. Orden obligatorio del despliegue

**El DDL va ANTES que el WAR.** Si el WAR sube primero, el mapeo JPA de las
cuatro columnas nuevas de `PGS.DCXP` no encuentra las columnas y **WildFly no
levanta el despliegue**.

1. Ejecutar `docs/logica-negocio/cxp/sql/08-carga-automatica-sri.sql`
   (trae los `SELECT` de control antes y después, y el rollback comentado).
2. Verificar con el control posterior del propio script: las cuatro columnas
   creadas, `nullable = Y`, y los conteos de documentos sin cambios.
3. Recién entonces desplegar el WAR.
4. Desplegar el frontend.

---

## 2. Directorio de subidas — NO configurar nada

Esto es lo más delicado del paso a producción, y la acción correcta es **no
hacer nada**.

`FileServiceImpl` resuelve la raíz por prioridad:

1. Propiedad de sistema `saa.upload.dir`
2. Variable de entorno `SAA_UPLOAD_DIR`
3. Windows: `{user.home}\saa-uploads\` · Linux: `/opt/saa-uploads/`

**Producción usa hoy el respaldo (3).** Verificado el 2026-08-23: los documentos
históricos de `PGS.DCXP` tienen `pathXml` apuntando a
`C:\Users\Administrator\saa-uploads\docs\xml\cxp\...`, que es exactamente
`{user.home}\saa-uploads\` con el servicio corriendo como `Administrator`, sin
ninguna de las dos variables definidas.

`DCXPPXML` guarda **ruta absoluta**. En consecuencia:

| Acción | Efecto |
|---|---|
| Definir `saa.upload.dir` o `SAA_UPLOAD_DIR` en producción | **Todos** los XML históricos quedan ilegibles: el documento apunta a una ruta y el servicio busca en otra |
| Cambiar la cuenta de servicio de WildFly | Cambia `user.home` → mismo desastre |
| No tocar nada | Todo sigue funcionando y los XML nuevos caen junto a los viejos |

> **Regla:** en producción no se define ninguna de las dos variables y el
> servicio sigue corriendo con la misma cuenta. Si alguna vez hay que mover el
> directorio, hay que migrar los `DCXPPXML` en el mismo cambio.

En el entorno local esto no aplica: allí `SAA_UPLOAD_DIR = C:\saaUploads`, y por
eso los documentos traídos de una copia de la base de producción fallan al
leerse. Es un artefacto del entorno de desarrollo, no un defecto.

---

## 3. Salida a internet hacia el SRI

Sin esto la descarga automática no funciona — el resto de la aplicación sí, pero
todos los documentos saldrían con `resultadoSri = ERROR_CONEXION`.

Desde **el servidor de producción**:

```bash
curl -k -s -m 30 -X POST \
  "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline" \
  -H "Content-Type: text/xml; charset=UTF-8" -H "SOAPAction: " \
  --data-binary '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aut="http://ec.gob.sri.ws.autorizacion"><soapenv:Body><aut:autorizacionComprobante><claveAccesoComprobante>CLAVE_DE_UN_DOCUMENTO_DEL_ULTIMO_MES</claveAccesoComprobante></aut:autorizacionComprobante></soapenv:Body></soapenv:Envelope>'
```

Esperado: XML con `<estado>AUTORIZADO</estado>` y un `<comprobante>`.

Usar una clave de acceso **de un documento emitido en el último mes** (§2 del
plan: la ventana del SRI es de un mes exacto). Con una clave vieja el servicio
responde `numeroComprobantes=0` sin decir por qué, y no distinguirías un
firewall de un documento fuera de ventana.

El certificado TLS del SRI no valida contra su IP; eso ya lo resuelve
`SriHttpUtil`, que lleva tiempo en producción sirviendo a la emisión de CXC. Si
la emisión de facturas de venta ya funciona desde ese servidor, la salida
existe.

---

## 4. Catálogos que deben existir

| Qué | Valor | Verificado en ASOPREP |
|---|---|---|
| `TipoAsiento` con `codigoAlterno = 3` para la empresa | Obligatorio | ✅ existe (`codigo 1197`) |
| `Facturador.generaConta` | `1` para que se generen asientos | ✅ (los asientos salen) |
| Grupo `POR CLASIFICAR` | Se autocrea si falta | ✅ existe (`codigo 6`) |
| Cuenta contable CxP del proveedor | Por titular | Se valida como bloqueante |

Desde la decisión 19, **los seis tipos de comprobante de la carga CXP usan
`codigoAlterno = 3`**. No hacen falta los tipos 10, 11 ni 12.

El **ambiente** (pruebas/producción) no se configura: sale del dígito 24 de la
propia clave de acceso.

---

## 5. Frontend

- `REGISTRO_LOTE_DISPONIBLE` en `gestion-documentos.component.ts` debe pasar a
  `true` **solo cuando el backend con `/registrarLote` esté desplegado**. Con
  `false`, el botón de registro por lote no aparece y la pantalla sirve igual
  para descargar.
- La subida manual de XML por fila se conserva y es el camino obligatorio para
  todo lo que quede fuera de la ventana del SRI.

---

## 6. Alcance del commit

Los dos repositorios tienen cambios de RRHH mezclados que **no** son de este
trabajo. Conviene un commit propio de CXP en cada uno para poder revertir esto
sin arrastrar RRHH. La lista de archivos está en el hilo del proyecto.

`ProcesoCargaDocumentosServiceImpl.java` arrastra además el fix de reembolsos
del 2026-08-21 que llevaba sin commitear desde antes de este proyecto (trazas,
`totalDocumentoReembolso()` y la guarda `registroBDVigente()`). Mencionarlo en el
mensaje del commit.

---

## 7. Qué está probado y qué no

**Probado en vivo contra el SRI real (2026-08-23):**

- Descarga masiva: 11 documentos de la carga 204, 11/11 `DESCARGADO` en 10 s,
  0 errores, sobre `<autorizacion>` bien formado en disco.
- Registro individual de un documento bajado por esa vía: asiento
  `CXP-2026-08-0074` cuadrado, con la FK grabada de vuelta.
- Registro por lote: orden correcto, transacción por documento, y el marcado de
  error en estado 4 con `observacion` — primera vez que se ejercita.
- Contadores y partición: `procesados = total − pendientes`, los cinco chips
  suman `totalCarga`.

**Sin probar, a vigilar en la primera corrida real:**

| Camino | Por qué no se probó |
|---|---|
| `FUERA_VENTANA` | Ninguna carga local tenía documentos sin XML |
| Segunda corrida con trabajo real | Ídem |
| Un lote de registro que termine bien | Los tres documentos disponibles tenían rutas de otra máquina |
| Pre-marca de reembolso desde el XML | Los 11 descargados eran facturas normales |
| `NO_ENCONTRADO` / `NO_AUTORIZADO` / `ERROR_CONEXION` | No se presentó ninguno |

**Recomendación para la primera corrida en producción:** empezar por una carga
pequeña y del mes en curso, revisar los contadores antes de registrar, y no
correr el registro por lote sobre una carga grande hasta ver una que termine
bien.
