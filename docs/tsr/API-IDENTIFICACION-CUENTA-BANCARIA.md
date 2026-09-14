# API + DISEÑO — La identificación con la que se abrió la cuenta bancaria del titular

**Equipo:** `omen-saa-2` · **Congelado:** 2026-09-14 · **DDL:** `tsr/sql/e2-42-identificacion-de-la-cuenta-bancaria-del-titular.sql`
**Espejo:** `saaFE/docs/tsr/API-IDENTIFICACION-CUENTA-BANCARIA.md`

---

## 1. El defecto

El archivo de pagos al banco (Internacional y Pacífico) manda **la identificación del titular**
(`TSR.TTLR.TTLRIDNT`). Pero el banco valida contra **la identificación con la que se abrió la
cuenta**. Una persona natural factura con RUC `1709616302001` y abre la cuenta con cédula
`1709616302`.

Pedido del usuario, textual: *«se necesita que se cree el campo de tipo de identificación e
identificación con la que se abrió la cuenta bancaria … el archivo que se genera al banco debe ir
con la identificación con la que se abrió la cuenta, no con la identificación del titular. Se
requieren esos dos nuevos campos en la tabla y que se puedan ingresar en la pantalla también.»*

Dónde nace, medido: `InternacionalArchivoPagoFormateador:74-92` y `PacificoArchivoPagoFormateador:83-101`
toman `pago.getTitular().getIdentificacion()` y el tipo de `titular.getRubroTipoIdentificacionH()`.
**La misma lógica está copiada en los dos.**

## 2. Diseño

### 2.1 Base — `TSR.CTBN`
| Columna | Tipo | Campo Java | Significado |
|---|---|---|---|
| `CTBNTPID` | `NUMBER` NULL | `tipoIdentificacion` (`Long`) | Código **alterno** del detalle del rubro 36: `1` cédula, `2` RUC, `3` pasaporte (`com.saa.rubros.TipoIdentificacion`) |
| `CTBNIDNT` | `VARCHAR2(20)` NULL | `identificacion` (`String`) | La identificación de la cuenta |

`CK_CTBN_IDENTIFICACION`: **los dos o ninguno**.

⚠️ **Un solo número para el tipo, no el par P/H de `TTLR`.** `TTLRRYYB` (el padre) vale 36 en todos los
titulares y leerlo en vez del hijo rompió el archivo del banco una vez (§40.4 del estado).

### 2.2 La regla del archivo del banco
Para un pago con `cuentaDestino` (cuenta de un titular):

1. **Si la cuenta tiene `tipoIdentificacion` e `identificacion`: van esos dos al archivo.**
2. Si no, **la del titular, exactamente como hoy.** Así ninguna cuenta existente deja de funcionar
   el día del despliegue.

El pago de **beneficiario ocasional** (`PGTRBFID`, orígenes externos) no cambia.

La regla vive **en una sola clase**, `com.saa.ejb.tsr.formateador.IdentificacionBeneficiarioResolver`,
que usan los dos formateadores, igual que ya usan `CodigoBancoBeneficiarioResolver`. Dos copias de la
misma decisión son cómo se llega a que un banco reciba la cédula y el otro el RUC.

### 2.3 Validación al guardar la cuenta (`CuentaBancariaTitularServiceImpl.saveSingle`)
- Los dos vacíos → OK (la cuenta usa la identificación del titular).
- Uno sin el otro → error.
- `tipoIdentificacion` fuera de `1, 2, 3` → error. El exterior (`4`) no lo admite ningún formato bancario.
- `identificacion` sin espacios; cédula = **10 dígitos**, RUC = **13 dígitos**, pasaporte = **5 a 15**
  caracteres alfanuméricos. Es la misma regla con la que el banco rechaza el archivo
  (`InternacionalArchivoPagoFormateador.validarLongitudIdentificacion`).
- Mensajes en §3.

### 2.4 Pantalla — `tsr/forms/titulares-v2`, sección de cuentas bancarias
Dos campos nuevos en el formulario de cuenta: **«Tipo de identificación de la cuenta»** (select del
rubro 36, las mismas opciones que ya carga la ficha en `tiposIdentificacion`, sin el exterior) e
**«Identificación de la cuenta»**. Opcionales, con el hint *«Solo si la cuenta se abrió con una
identificación distinta a la del titular (p. ej. cédula en vez de RUC)»*. Se muestran en la lista de
cuentas.

## 3. Contrato

### `POST /rest/ctbn` y `PUT /rest/ctbn` (CAMBIA: dos campos nuevos)

```json
{
  "codigo": 118,
  "titular": { "codigo": 44 },
  "banco": { "codigo": 10 },
  "tipoCuenta": 1,
  "numeroCuenta": "2200123456",
  "observaciones": "",
  "estado": 1,
  "usuarioCreacion": "jperez",
  "tipoIdentificacion": 1,
  "identificacion": "1709616302"
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `tipoIdentificacion` | number \| null | **NUEVO.** `1` cédula, `2` RUC, `3` pasaporte. Junto con `identificacion` o ninguno |
| `identificacion` | string \| null | **NUEVO.** Máx. 20. Longitud según el tipo (§2.3) |

| Código | Cuándo | Cuerpo |
|---|---|---|
| **200** | Guardada | La entidad `CuentaBancariaTitular`, con los dos campos |
| **500** | Validación | Texto, uno de: `Debe indicar el tipo de identificación y la identificación de la cuenta, o dejar los dos vacíos.` · `Tipo de identificación de la cuenta no válido: {n}. Use 1 (cédula), 2 (RUC) o 3 (pasaporte).` · `La cédula de la cuenta debe tener 10 dígitos: '{x}'.` · `El RUC de la cuenta debe tener 13 dígitos: '{x}'.` · `El pasaporte de la cuenta debe tener entre 5 y 15 caracteres: '{x}'.` |

⛔ **TRAMPA `merge` desnudo (registro §8.2):** `PUT /ctbn` graba `NULL` en todo campo ausente.
**Editar una cuenta sin mandar `tipoIdentificacion`/`identificacion` BORRA la identificación cargada**,
sin error. La pantalla manda **siempre** los dos, con su valor actual o `null`.

### Lecturas (`GET /ctbn/getAll`, `/getId/{id}`, `selectByCriteria`)
Traen `tipoIdentificacion` e `identificacion`. Nada más cambia. También llegan anidados en
`pago.cuentaDestino` de `/pgtr/listar`.

## 4. Orden de despliegue
`e2-42` (SQL) → WAR → FE. **WAR sin SQL: `ORA-00904` en toda lectura de cuentas de titulares**,
incluidos los pagos y código de `crd`. FE nuevo con WAR viejo: los campos se ignoran y no se graban.

## 5. Después de desplegar
El bloque 4 del `e2-42` lista las cuentas activas cuyo titular está con RUC y la cuenta sin
identificación propia. **No se completan solas**: que la cédula sean los 10 primeros dígitos del RUC
es lo habitual, pero no prueba con qué se abrió la cuenta. Se cargan en la ficha.
