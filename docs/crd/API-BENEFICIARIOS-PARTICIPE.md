# API — Beneficiarios del partícipe (`CRD.CBBP`) · sepelio fase 2a

**Equipo:** `omen-saa-1` (CRD · EQUIPO B) · **Árbitro:** `omen-saa-1-arb` · **Fecha:** 2026-09-22
**Diseño:** `crd/DISENO-BENEFICIARIOS-Y-VALORES-DE-SEGURO.md`
**DDL:** `crd/sql/233_DDL_BENEFICIARIOS_PARTICIPE.sql` — **autorizado por el usuario el 2026-09-22**
**Contrato congelado. Verificado contra el código del 2026-09-22 antes de escribirse.**

---

## 1. Qué entra acá y qué NO

Cuando un partícipe fallece, la aseguradora entrega **al fondo** un valor de sepelio. Esa entrada ya
está resuelta y en producción: `CRD.RVSG` (fase 1, script `230`). Falta **a quién se le paga**.

| Fase | Qué | Estado |
|---|---|---|
| 1 — Recepción | El dinero entra, contabilidad aprueba, se asienta D Banco / H `2.3.90.90.11` | ✅ **en producción** |
| **2a — Beneficiarios** | **Cargar quién cobra, con su cuenta, su porcentaje y su certificado bancario** | **ESTE CONTRATO** |
| 2b — Entrega | Repartir el valor: N órdenes de pago, una por beneficiario | ⛔ **bloqueada**, ver §7 |

⛔ **La fase 2a NO paga nada.** No genera asientos, no toca saldos, no llama a CXP. Es el registro de
los beneficiarios y su cuenta. Se puede construir, desplegar y usar **sin** que exista el producto de
pago de CXP que la 2b necesita — por eso se separó.

---

## 2. Las capas, con los nombres exactos

Se sigue `docs/estandar/ESTANDAR_MAPEO_CAPAS.md` al pie. **Copiar de `CuentaBancariaParticipe`
(`CRD.CNBP`), que es la tabla hermana**, no inventar la estructura.

```
com.saa.model.crd.CuentaBancariaBeneficiario            @Table(name="CBBP", schema="CRD")
com.saa.model.crd.NombreEntidadesCredito                + constante CUENTA_BANCARIA_BENEFICIARIO
com.saa.ejb.crd.dao.CuentaBancariaBeneficiarioDaoService          @Local
com.saa.ejb.crd.daoImpl.CuentaBancariaBeneficiarioDaoServiceImpl  @Stateless
com.saa.ejb.crd.service.CuentaBancariaBeneficiarioService         @Local
com.saa.ejb.crd.serviceImpl.CuentaBancariaBeneficiarioServiceImpl @Stateless
com.saa.ws.rest.crd.CuentaBancariaBeneficiarioRest                @Path("cbbp")
```

### 2.1 La entidad, campo por campo

| Campo Java | Columna | Tipo Java | Notas |
|---|---|---|---|
| `codigo` | `CBBPCDGO` | `Long` | PK, `@SequenceGenerator(sequenceName="CRD.SQ_CBBPCDGO")` |
| `entidad` | `ENTDCDGO` | `Entidad` | `@ManyToOne`, igual que `CNBP` |
| `nombre` | `CBBPNMBR` | `String` (200) | |
| `numeroIdentificacion` | `CBBPIDNT` | `String` (20) | |
| `bancoExterno` | `BEXTCDGO` | `BancoExterno` | `@ManyToOne` — ojo, la entidad vive en `com.saa.model.tsr` |
| `tipoCuenta` | `CBBPTPCN` | `Long` | `codigoAlterno` del `DetalleRubro`, mismo catálogo que `CNBPTPCN` |
| `numeroCuenta` | `CBBPNMRO` | `String` (100) | |
| `porcentaje` | `CBBPPRCN` | `BigDecimal` | `NUMBER(5,2)` |
| `estado` | `CBBPIDST` | `Long` | 1 activo, 2 inactivo |
| `usuarioRegistro` | `CBBPUSRG` | `String` (50) | |
| `fechaRegistro` | `CBBPFCRG` | `LocalDate` | `DATE` |

⚠️ **Las `@NamedQuery` tienen que llamarse `CuentaBancariaBeneficiarioAll` y
`CuentaBancariaBeneficiarioId`**, y la constante de `NombreEntidadesCredito` tiene que valer
exactamente `CuentaBancariaBeneficiario`. `EntityDaoImpl` resuelve la query concatenando
`entidad + "All"` / `entidad + "Id"`: si no coinciden, es `IllegalArgumentException` en ejecución,
no error de compilación.

---

## 3. Endpoints

Ruta base real: **`/SaaBE/rest/cbbp`**.

### 3.1 `GET /rest/cbbp/porEntidad/{idEntidad}`

Los beneficiarios de un partícipe, **activos e inactivos**, ordenados por porcentaje descendente y
luego por código. Es la consulta que alimenta la pantalla.

**200** — `CuentaBancariaBeneficiario[]` (puede ser `[]`).
**500** — `"Error al consultar beneficiarios: " + e.getMessage()`.

⚠️ **Devolver también los inactivos**, con su `estado`. La pantalla los muestra en gris: un
beneficiario que se desactivó es información, no basura — si un familiar reclama, hay que poder ver
que estuvo y que se lo sacó.

### 3.2 `POST /rest/cbbp/conCertificado` — el único camino para crear

**`multipart/form-data`**, calcado de `POST /rest/cnbp/conCertificado`
(`CuentaBancariaParticipeRest:160-171`). Campos exactos:

| Campo | Tipo | Notas |
|---|---|---|
| `archivo` | `InputStream` | el PDF del certificado bancario |
| `archivoNombre` | `String` | el frontend lo manda con `encodeURIComponent()`; el backend decodifica con `URLDecoder`/UTF-8. **Sin esto un nombre con tilde o eñe llega corrupto** |
| `idEntidad` | `String` (Long) | el partícipe |
| `nombre` | `String` | nombre completo del beneficiario |
| `numeroIdentificacion` | `String` | cédula |
| `idBancoExterno` | `String` (Long) | `TSR.BEXT` |
| `tipoCuenta` | `String` (Long) | `codigoAlterno` del rubro |
| `numeroCuenta` | `String` | |
| `porcentaje` | `String` (BigDecimal) | con punto decimal |
| `usuarioRegistro` | `String` | |

⚠️ **Los numéricos van como `String` a propósito**, igual que en `cnbp`: un `@FormParam` declarado
`Long` que llega vacío o mal formado revienta antes de entrar al método, y el error que ve el
operador no dice nada. Se parsean adentro, con mensaje propio.

**Todo en UNA transacción**: si algo falla no queda ni beneficiario huérfano ni archivo colgado en
disco. Es exactamente lo que hace `crearConCertificado:131`.

| Código | Cuándo |
|---|---|
| **201** | creado. Cuerpo: la entidad, con `codigo` y el `idAdjunto` del certificado |
| **400** | falta el archivo, no es PDF, supera 10 MB, o un numérico no parsea |
| **400** | `porcentaje` fuera de `(0, 100]` |
| **409** | ⭐ **ya existe un beneficiario con esa identificación PARA ESE PARTÍCIPE** |
| **500** | `TIPO_ADJUNTO_CERTIFICADO_NO_CONFIGURADO` — falta la fila de `CRD.TPDJ` |

⚠️ **Precisión agregada el 2026-09-22, después de implementarlo:** si el partícipe o el banco no
existen, este endpoint responde **400**, no 404 (`ENTIDAD_NO_ENCONTRADA`, `BANCO_NO_ENCONTRADO`).
La tabla de arriba no enumeraba un 404 y el ejecutor respetó el listado en vez de inventarlo, que es
lo correcto. El **404 sí existe en el `PUT`** (§3.4) para un beneficiario inexistente. **El frontend
debe mostrar el mensaje del cuerpo, no deducir la causa del código.**

**Estado (`CBBPIDST`): `1` activo, `2` inactivo** — rubro `com.saa.rubros.EstadoCuentasBancarias`,
el mismo que usa `TSR.CuentaBancaria`. ⛔ **No es el rubro genérico `Estado`**, cuyo `INACTIVO`
vale **0** y violaría el `CK_CBBP_ESTADO` del DDL. (El adjunto del certificado sí usa `Estado.ACTIVO`,
porque `CRD.ADJN` es otra tabla con otra semántica — igual que en `CNBP`.)

### 3.3 El 409, y por qué no se deja que reviente el índice

El índice `UX_CBBP_PARTICIPE_IDENT` es `(ENTDCDGO, CBBPIDNT)`. **Chequear antes e informar 409**,
no dejar que salga el `ORA-00001` como 500. Es el mismo precedente que se aplicó a `RVSG`
(`saaBE bf995296`) y antes a `CBCR`.

⚠️ **La carrera existe y se acepta**, igual que en `RVSG`: el chequeo previo y el índice no son
atómicos, así que dos altas simultáneas del mismo beneficiario pueden pasar las dos y la segunda
cae en `ORA-00001` (500). No se cierra con bloqueo porque **no hay fila que bloquear antes de
insertar**. El dato queda protegido por el índice; lo feo es el 500 en esa carrera.

### 3.4 `PUT /rest/cbbp` — actualizar

Cambia `porcentaje`, `estado`, `tipoCuenta`, `numeroCuenta`, `bancoExterno` y `nombre`.
**No cambia `entidad` ni `numeroIdentificacion`**: eso sería otro beneficiario — se inactiva éste y
se crea el otro.

**200** entidad actualizada · **400** porcentaje fuera de rango · **404** no existe · **500** error.

### 3.5 ⛔ `DELETE` — NO se implementa

**Un beneficiario no se borra: se inactiva** (`estado = 2`, por el `PUT`). Esta tabla es la prueba de
a quién se le pagó o se le iba a pagar la plata de un fallecido; borrar una fila destruye esa prueba.
Si el `Rest` hereda un `delete` del patrón CRUD, **quitarlo**.

### 3.6 Estándar

`GET /getAll`, `GET /getId/{id}` y `POST /selectByCriteria` como en cualquier entidad.

---

## 4. La regla del 100 %, que es la que más fácil se implementa mal

**El porcentaje NO se valida al guardar. Se valida AL PAGAR.**

Si se exigiera que sume 100 en cada alta, **no se podría registrar al primer beneficiario** (50 %)
sin que falle. Por eso:

- **El backend acepta** cualquier porcentaje en `(0, 100]` por fila, sin mirar a los hermanos.
- **La pantalla muestra el acumulado** de los activos mientras se cargan: «Asignado: 75 % · falta
  25 %», en verde cuando llega a 100 y en ámbar mientras no.
- **La guarda dura vive en el pago (fase 2b)**: un pago con porcentajes que no suman 100 se rechaza
  informando cuánto suman.

⚠️ **Sólo cuentan los ACTIVOS** para el acumulado. Un beneficiario inactivo no entra en el reparto
ni en la suma.

---

## 5. El certificado bancario

Va en **`CRD.ADJN`**, con el tipo de `CRD.TPDJ` **«CERTIFICADO BANCARIO»**, resuelto reusando
`TipoAdjuntoDaoService.selectByNombre`, exactamente como
`CuentaBancariaParticipeServiceImpl.resolverTipoCertificadoBancario`. Sólo PDF, máximo 10 MB.

⚠️ **Corregido el 2026-09-22.** Este contrato decía que el tipo se resuelve con
`LIKE '%CERTIFICADO%BANCARIO%'`. **Era falso.** `TipoAdjuntoDaoServiceImpl.selectByNombre:25-31`
hace `UPPER(t.nombre) = UPPER(:nombre)` **y además** filtra `t.estado = Estado.ACTIVO`: igualdad
exacta contra la constante `"CERTIFICADO BANCARIO"`, no coincidencia parcial. Lo levantó el
ejecutor BE programando contra el código en vez de contra esta prosa, que es exactamente para lo
que sirve que lea el código. La guarda de la casa —ni cero ni más de una fila activa— se reusa tal
cual.

⛔ **Sin la fila de `CRD.TPDJ` no se puede subir ningún certificado** y el error es un 500 que no
explica nada. El usuario informó el 2026-09-22 que `CARGA-TIPO-ADJUNTO-CERTIFICADO-BANCARIO.sql` ya
corrió; el bloque **0.5** del script `233` lo confirma contra la base.

---

## 6. La pantalla (frontend)

Vive **dentro de la ficha del partícipe**, no como opción de menú propia: los beneficiarios son un
dato del partícipe, igual que sus cuentas bancarias.

1. Tabla con nombre, identificación, banco, cuenta, **porcentaje** y estado.
2. **El acumulado siempre visible** (§4), con el aviso cuando no llega a 100.
3. Alta por diálogo, con el PDF obligatorio — mismo componente de carga que usa la cuenta bancaria
   del partícipe.
4. «Desactivar» en vez de «Eliminar».
5. ⚠️ **Al abrir la pantalla de un partícipe fallecido sin beneficiarios cargados, avisar** — sin
   bloquear nada. **Decisión del usuario (2026-09-21):** el dinero se puede recibir sin beneficiarios
   cargados; la plata ya está en el banco y negarse a registrarla no la hace desaparecer.
6. El nombre de la entrada, si se agrega alguna al menú, **máximo 24 caracteres** —
   `saaFE docs/patrones/NOMBRES-DE-MENU-LATERAL.md` (H71).

---

## 7. ⛔ Fase 2b — lo que este contrato NO cubre, y por qué

El **pago** a los beneficiarios queda fuera, bloqueado por dos cosas distintas:

1. **Falta un producto de pago de CXP contra `2.3.90.90.11`.** Si el pago sale por una orden de CXP,
   **el asiento lo arma CXP con la cuenta del grupo del producto**. Es el mismo acoplamiento de los
   productos 516 y 517 (P19/P20). **`cxp` es de otro equipo: se coordina, no se toca.**
2. **Una decisión sobre el asiento de reclasificación que todavía se está midiendo.** El diseño (§4)
   dice agregar una columna `CTAPRCLS` a `CRD.CTAP` para **omitir** la reclasificación en este tipo y
   quedarse con los dos asientos que pidió el usuario. Pero el script `231` ya resolvió el mismo
   problema de otra forma: dejó `CTAPPLNL` (liquidación) **igual** a `CTAPPLNP` (pasivo), de manera
   que la reclasificación —si corre— sale `D 2.3.90.90.11 / H 2.3.90.90.11`: **neutra, cuadra, no
   descuadra nada**. ⇒ Hay que **medir si esa rama efectivamente se invoca** antes de decidir entre
   agregar la columna (dos asientos exactos) o dejar el tercero neutro (cero código). **No despachar
   la 2b sin cerrar esto.**

Cuando se levanten, la 2b cubre: reparto por porcentaje, **el residuo del centavo al de mayor
porcentaje** (empate → menor código, decisión del usuario 2026-09-21), la guarda de que **la suma de
las órdenes dé exactamente el valor entregado**, y N `BeneficiarioOcasional` de CXP — uno por
beneficiario.

⚠️ **Y un alcance que se amplía solo:** el usuario decidió que **la devolución de aportes normal
también se pague a beneficiarios cuando el partícipe está fallecido**. Eso toca
`registrarDevolucion`, que hoy paga siempre a `CuentaBancariaParticipe` y **ya está en producción**.
Es el mismo problema de fondo —la cuenta de un muerto no sirve— y se resuelve una sola vez, pero
significa que la 2b modifica código vivo, no sólo agrega código nuevo.
