# PLAN — DEVOLUCIÓN DE APORTES A PARTÍCIPES

**Documento de control. Escrito el 2026-08-24, verificado contra el código de `saaBE` y `saaFE`.**

Créditos registra la devolución de dinero de los aportes de un partícipe. El registro genera
los aportes negativos y **dispara una orden de pago en CXP**, donde se elige la cuenta bancaria
de la que sale el dinero, se paga y se contabiliza. Cuando el pago queda confirmado, la
devolución en CRD se marca como pagada.

Este documento **fija el contrato** entre el agente de backend y el de frontend. Ninguno de los
dos negocia con el otro: lo que no esté acá, se pregunta al árbitro.

## Índice
1. La restricción que manda sobre todo el diseño
2. Qué ya existe (verificado)
3. Arquitectura resultante
4. DDL
5. Contrato de servicios backend
6. Contrato REST (el que consume el frontend)
7. Pantalla nueva de frontend
8. Reglas y casos borde
9. Fases, orden y criterios de aceptación
10. Decisiones tomadas y supuestos abiertos
11. Tablero de avance
12. Estado de implementación

---

## 1. La restricción que manda sobre todo el diseño

> **El sistema se va a comercializar después como sistema contable, con todos los módulos
> MENOS `crd`.** Por lo tanto: **`cnt`, `tsr` y `cxp` NO pueden depender de `crd`.**

Consecuencias, y son innegociables:

| Dirección | ¿Permitida? | Por qué |
|---|---|---|
| `crd` → `cxp` / `tsr` / `cnt` | **Sí** | Al sacar `crd` se va el que depende, no el dependido |
| `cxp` / `tsr` / `cnt` → `crd` | **NO** | Dejaría al producto comercial sin compilar |

Estado actual verificado: `ejb/crd` no importa **nada** fuera de `crd`. Es el único módulo aislado
del sistema (por eso `ContabilidadPrestamoNoOpImpl` existe y no hace nada). En `model/crd` sí hay
tres referencias hacia afuera, todas hacia abajo: `scp.Usuario`, `cnt.Periodo`, `tsr.BancoExterno`.

### ⚠️ Corrección del 2026-08-24 — existe UNA violación preexistente

La primera versión de este documento afirmaba que hoy no hay ninguna referencia
`tsr`/`cxp`/`cnt` → `crd`. **Es falso**, y lo detectó el agente de backend al correr el grep
obligatorio de la fase 1. El barrido completo (que la primera vez no cubrió `model/*`) devuelve:

```
model/tsr/Titular.java:13:import com.saa.model.crd.Pais;
```

`CRD.PSSS` es un catálogo genérico de países alojado por accidente en el esquema de créditos, y
`TSR.TTLR.PSSSCDGO` es FK a él. El frontend arrastra la misma violación:
`src/app/modules/tsr/model/titular.ts` importa `Pais` desde `crd/model/pais`, y `titular.pais` se
usa en `titulares.component.ts` y `titulares-v2.component.ts`.

**Es anterior a este trabajo y queda FUERA de alcance** — ver §10, "Deuda conocida". La
funcionalidad de devolución de aportes no introduce ninguna violación nueva: verificado sobre los
archivos tocados en las fases 0-3.

**Redacción correcta del criterio de la fase 1**, para no volver a tropezar: el grep no tiene que
devolver vacío en todo el repositorio, tiene que devolver vacío **sobre los archivos que la fase
tocó**, y la única línea tolerada en el barrido global es la de `Titular.java`.

**Esto invalida el mecanismo obvio de "CXP avisa a CRD cuando el pago se confirma".** No hay
callback, ni interfaz invertida, ni lookup por convención: nada en CXP puede nombrar a CRD.

### Cómo se resuelve el aviso de vuelta

**CRD consulta, CXP no avisa.** CRD lee el estado del `PagoProgramado` de sus devoluciones
pendientes y actualiza sus propios campos. Tres disparadores, todos del lado de CRD:

1. **Al listar** — el `GET` de devoluciones reconcilia antes de responder (lo que ve el usuario
   siempre está al día).
2. **Timer EJB en CRD**, cada 30 minutos. Precedente exacto en el proyecto:
   `ProcesoMoraPrestamoTimer` (`@Schedule`, `persistent = false`).
3. **Endpoint manual** de recuperación, por si el timer no corrió.

El reconciliador es **idempotente**: correrlo N veces da el mismo resultado.

### Cómo se identifica una orden de pago de CRD sin que CXP conozca CRD

`PGS.PGTR` gana un **origen externo genérico**: una etiqueta de texto (`PGTRORGN`) y el id del
documento en el módulo que la originó (`PGTRIDOR`, **sin FK**). CXP nunca resuelve ese id: solo lo
guarda y lo devuelve. Para CXP, `'CRD_DEVOLUCION_APORTE'` es una cadena opaca.

Si mañana se saca `crd`, esas columnas simplemente quedan siempre nulas. Nada se rompe.

---

## 2. Qué ya existe (verificado)

### 2.1 El circuito de pago de CXP está completo — no hay que inventarlo

`PGS.PGTR` (`PagoProgramado`) **es** la orden de pago:

```
1 REGISTRADO --selección--> 2 EN_ARCHIVO --respuesta banco--> 3 CONFIRMADO
     |                           |                                 |
     |                           +--rechazado--> 4 RECHAZADO       +--> contabilidad + MVCB
     +--> 5 ANULADO (motivo)
```

Recién en CONFIRMADO se genera contabilidad y movimiento bancario. Excepción: débito automático
(`PGTRDBAT = 1`) nace CONFIRMADO.

Ya soporta **tres orígenes, cada uno con su contabilización distinta**:

| Origen | Método | Contabilización |
|---|---|---|
| Factura de compra | `registrarPago` | `AplicacionPagoCxp` |
| Egreso de tesorería (`TSR.EGRS`) | `registrarPagoDeEgreso` | `generarAsientoEgresoTesoreria` — DEBE cuenta del grupo del producto / HABER banco |
| Anticipo a proveedor (`PGS.ANTP`) | `registrarPagoDeAnticipo` | `contabilizarAnticipoConfirmado` |

La discriminación es un if/else sobre `pago.getAnticipo() != null` / `pago.getEgreso() != null` /
else. **Vive en tres métodos** de `PagoProgramadoServiceImpl` y hay que tocar los tres:
`procesarRespuestaBanco`, `confirmarPagosManual`, `revertirPagoConfirmado`.

**El precedente de "el módulo origen dispara la orden de pago" ya existe**:
`EgresoServiceImpl.procesarEgreso` (TSR) llama a `pagoProgramadoService.registrarPagoDeEgreso(...)`.
Y el "marcar el origen como pagado" es el paso 3 de `contabilizarPagoEgreso`.
**Leer esos dos archivos es la mejor guía para todo el trabajo de CXP.**

### 2.2 El espejo exacto del registro ya existe en CRD

`AporteServiceImpl.registrarAporte` crea la fila **positiva** de `CRD.APRT` con
`valorPagado = valor`, `saldo = 0.0`, `estado = 4 (PAGADA)` + su `PagoAporte`. La devolución es
la misma rutina con el valor en **negativo**. Detalle crítico ya documentado ahí: se graba con
`aporteDaoService.save(...)` **directo**, nunca con `AporteService.saveSingle`, que forzaría
`estado = 1` y devolvería la fila al FIFO del proceso Petro.

### 2.3 El saldo disponible

`GET /aprt/saldosPorEntidad/{idEntidad}` → `SaldoAporteServiceImpl`. Saldo neto por tipo de
aporte vigente, **agregado en la base de datos** (`SUM(APRTVLRR)`). Los pagos son filas negativas
y la suma neta ES el saldo. Nunca bajar filas: `GET /aprt/getAll` son ~980.000 registros y tumba
el servidor.

### 2.4 Endpoints de CXP que se usan tal cual (no tocar)

`GET /pgtr/listar`, `POST /pgtr/lote`, `GET /pgtr/lote/{idLote}/archivo`,
`POST /pgtr/lote/{idLote}/respuesta`, `POST /pgtr/confirmarManual`, `POST /pgtr/anular/{id}`,
`POST /pgtr/revertirConfirmado/{id}`.

### 2.5 Las dos pantallas de cruce — ninguna se toca

| Ruta | Componente | Estado real |
|---|---|---|
| `/menucreditos/cruce-valores` | `CruceValoresComponent` | **No escribe nada.** `cruce-valores.component.ts:769` tiene el `// TODO: Descomentar cuando el backend esté listo`. Es un visor con un diálogo que simula. Además baja todas las filas de `APRT` del partícipe con `selectByCriteria`. |
| `/menucreditos/cruce-de-valores` | `CruceDeValoresComponent` | La que sí funciona: `saldosPorEntidad` + `POST /prst/pagarConAportes`. |

La devolución va en **pantalla nueva dedicada**. Ninguna de las dos se modifica en este trabajo.

---

## 3. Arquitectura resultante

```
┌─ CRD (se puede arrancar entero) ──────────────────────────────────┐
│  CRD.DVAP  DevolucionAporte      ← el documento de origen         │
│  CRD.DDVA  DetalleDevolucionAporte (por tipo de aporte)           │
│  CRD.APRT  filas NEGATIVAS + CRD.PGAP                             │
│                                                                    │
│  DevolucionAporteService                                           │
│    registrarDevolucion()  ──────────┐                              │
│    sincronizarPagos()     ◄─────────┼── lee, no espera aviso       │
│    anularDevolucion()               │                              │
│  ProcesoDevolucionAporteTimer (30m) │                              │
└─────────────────────────────────────┼──────────────────────────────┘
                                      │  crd → cxp  (permitido)
┌─ CXP / TSR / CNT (no saben que CRD existe) ─────────────────────────┐
│  PGS.PGTR + origen externo genérico + beneficiario ocasional        │
│  PGS.DPGT  desglose contable del pago (producto → valor)            │
│                                                                     │
│  PagoProgramadoService.registrarPagoDeOrigenExterno()               │
│  contabilizarPagoOrigenExterno()  → AsientoContableService          │
│                                   → MovimientoBancoService          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1 Por qué el beneficiario va denormalizado en PGTR

El partícipe **no existe como `TSR.Titular`**. Hay dos modelos de cuenta bancaria en paralelo que
no se conocen y no hay FK entre ellos:

```
CRD:  Entidad → CRD.CNBP (CuentaBancariaParticipe) → TSR.BancoExterno
TSR:  Titular → TSR.CTBN (CuentaBancariaTitular)   → TSR.BancoExterno
```

`PGTR.titular` y `PGTR.cuentaDestino` apuntan a los de TSR, y `FormateadorArchivoBancoPlanoImpl`
lanza `IncomeException` si `cuentaDestino` es null. Crear un `Titular` por cada partícipe metería
datos de CRD dentro de TSR — justo lo que la §1 prohíbe.

Solución: PGTR gana un **beneficiario ocasional** (nombre, identificación, banco, tipo y número de
cuenta) que se usa **cuando `cuentaDestino` es null**. Es una capacidad legítima y genérica de CXP
—"pagarle a alguien que no está en el maestro de titulares"— y no menciona a CRD en ningún lado.
CRD copia ahí los datos de `ENTD` y de la `CNBP` elegida al registrar.

### 3.2 Por qué el desglose contable va en PGS.DPGT

Una devolución puede cubrir varios tipos de aporte, y cada tipo puede ir a una cuenta contable
distinta. Un solo `ProductoPago` por pago obligaría a una orden de pago por tipo (N transferencias
al mismo partícipe, N comisiones bancarias).

`PGS.DPGT` guarda el desglose como pares **(producto de pago, valor)**. Al confirmarse, CXP arma el
asiento con **una línea DEBE por producto** (cuenta del `GrupoProductoPago.planCuenta`) y **una
línea HABER** a la cuenta contable del banco por el total. Genérico: CXP no sabe que un producto
representa un tipo de aporte.

El mapeo tipo de aporte → producto de pago vive en **CRD** (`CRD.TPAP.TPAPPRDP`), que es quien
puede conocer a CXP.

---

## 4. DDL

Archivo: `docs/logica-negocio/crd/sql/DDL-DEVOLUCION-APORTES.sql`.
Seguir `docs/estandar/ESTANDARES-CREACION-TABLAS-ORACLE.md`: `NUMBER GENERATED BY DEFAULT AS
IDENTITY`, `NUMBER(18,2)` para dinero, `VARCHAR2(n)`, comentarios de tabla y columna, grants.
**No ejecutar**: lo corre el usuario.

### 4.1 ALTER de PGS.PGTR — origen externo y beneficiario ocasional

```sql
ALTER TABLE PGS.PGTR ADD (
    PGTRORGN VARCHAR2(30),     -- etiqueta del proceso origen; NULL en los pagos de CXP
    PGTRIDOR NUMBER,           -- id del documento en el modulo origen. SIN FK, a proposito
    PGTRASNT NUMBER,           -- asiento generado (solo origen externo: no hay doc CXP donde colgarlo)
    PGTRBFNM VARCHAR2(2000),   -- beneficiario ocasional: nombre
    PGTRBFID VARCHAR2(20),     -- beneficiario ocasional: identificacion
    PGTRBFBC NUMBER,           -- beneficiario ocasional: banco externo (FK TSR.BEXT)
    PGTRBFTP NUMBER,           -- beneficiario ocasional: tipo de cuenta
    PGTRBFCT VARCHAR2(50)      -- beneficiario ocasional: numero de cuenta
);
ALTER TABLE PGS.PGTR ADD CONSTRAINT FK_PGTR_ASNT FOREIGN KEY (PGTRASNT) REFERENCES CNT.ASNT(ASNTCDGO);
ALTER TABLE PGS.PGTR ADD CONSTRAINT FK_PGTR_BEXT FOREIGN KEY (PGTRBFBC) REFERENCES TSR.BEXT(BEXTCDGO);
CREATE INDEX IDX_PGTR_ORIGEN ON PGS.PGTR(PGTRORGN, PGTRIDOR);
```

⚠️ **Contrastar `CNT.ASNT` y su PK contra la entidad `com.saa.model.cnt.Asiento` antes de escribir
la FK.** La entidad es la autoridad, no este documento.

### 4.2 PGS.DPGT — desglose contable del pago de origen externo

```sql
CREATE TABLE PGS.DPGT (
    DPGTCDGO NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    PGTRCDGO NUMBER NOT NULL,          -- FK PGS.PGTR
    DPGTPRDP NUMBER NOT NULL,          -- FK PGS.PRDP (ojo: su PK se llama ID, no PRDPCDGO)
    DPGTVLRR NUMBER(18,2) NOT NULL,
    DPGTCNCP VARCHAR2(500),            -- concepto de la linea del asiento
    CONSTRAINT PK_DPGT PRIMARY KEY (DPGTCDGO),
    CONSTRAINT FK_DPGT_PGTR FOREIGN KEY (PGTRCDGO) REFERENCES PGS.PGTR(PGTRCDGO),
    CONSTRAINT FK_DPGT_PRDP FOREIGN KEY (DPGTPRDP) REFERENCES PGS.PRDP(ID)
);
CREATE INDEX IDX_DPGT_PGTR ON PGS.DPGT(PGTRCDGO);
```

### 4.3 CRD.DVAP — DevolucionAporte

```sql
CREATE TABLE CRD.DVAP (
    DVAPCDGO NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    ENTDCDGO NUMBER NOT NULL,          -- FK CRD.ENTD, el participe
    FLLLCDGO NUMBER,                   -- FK CRD.FLLL, filial del participe
    CNBPCDGO NUMBER,                   -- FK CRD.CNBP, cuenta del participe a la que se transfiere
    DVAPVLRR NUMBER(18,2) NOT NULL,    -- valor total devuelto
    DVAPFCHA DATE NOT NULL,            -- fecha de negocio de la devolucion
    DVAPMTVO VARCHAR2(2000),           -- motivo / observacion del usuario
    DVAPESTD NUMBER DEFAULT 1 NOT NULL,-- 1 REGISTRADA 2 EN_PAGO 3 PAGADA 4 RECHAZADA 5 ANULADA
    DVAPIDPG NUMBER,                   -- PGS.PGTR.PGTRCDGO. SIN FK: CRD no ata al esquema PGS
    DVAPNMAS NUMBER,                   -- codigo del asiento, copiado al confirmarse. SIN FK
    DVAPFCPG DATE,                     -- fecha en que el pago quedo confirmado
    DVAPIDEM NUMBER,                   -- empresa contable con la que se genero la orden. SIN FK
    DVAPUSRG VARCHAR2(50) NOT NULL,
    DVAPFCRG TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    DVAPUSAN VARCHAR2(50),
    DVAPFCAN TIMESTAMP,
    DVAPMTAN VARCHAR2(500),
    CONSTRAINT PK_DVAP PRIMARY KEY (DVAPCDGO),
    CONSTRAINT FK_DVAP_ENTD FOREIGN KEY (ENTDCDGO) REFERENCES CRD.ENTD(ENTDCDGO),
    CONSTRAINT FK_DVAP_FLLL FOREIGN KEY (FLLLCDGO) REFERENCES CRD.FLLL(FLLLCDGO),
    CONSTRAINT FK_DVAP_CNBP FOREIGN KEY (CNBPCDGO) REFERENCES CRD.CNBP(CNBPCDGO),
    CONSTRAINT CK_DVAP_ESTD CHECK (DVAPESTD IN (1,2,3,4,5))
);
CREATE INDEX IDX_DVAP_ENTD ON CRD.DVAP(ENTDCDGO);
CREATE INDEX IDX_DVAP_ESTD ON CRD.DVAP(DVAPESTD);
CREATE INDEX IDX_DVAP_PAGO ON CRD.DVAP(DVAPIDPG);
```

**`DVAPIDPG` y `DVAPNMAS` van sin FK a propósito**: si se arranca `crd` no debe quedar un rastro
de integridad referencial hacia `PGS`/`CNT`, y viceversa. La consistencia la garantiza el
reconciliador, no la base.

### 4.4 CRD.DDVA — detalle por tipo de aporte

```sql
CREATE TABLE CRD.DDVA (
    DDVACDGO NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
    DVAPCDGO NUMBER NOT NULL,          -- FK CRD.DVAP
    TPAPCDGO NUMBER NOT NULL,          -- FK CRD.TPAP
    DDVAVLRR NUMBER(18,2) NOT NULL,    -- valor devuelto de ese tipo
    DDVAAPRT NUMBER,                   -- CRD.APRT.APRTCDGO de la fila NEGATIVA generada
    DDVAPGAP NUMBER,                   -- CRD.PGAP.PGAPCDGO generado
    DDVAAPRV NUMBER,                   -- CRD.APRT de la fila POSITIVA de reverso, si se rechazo
    CONSTRAINT PK_DDVA PRIMARY KEY (DDVACDGO),
    CONSTRAINT FK_DDVA_DVAP FOREIGN KEY (DVAPCDGO) REFERENCES CRD.DVAP(DVAPCDGO),
    CONSTRAINT FK_DDVA_TPAP FOREIGN KEY (TPAPCDGO) REFERENCES CRD.TPAP(TPAPCDGO)
);
CREATE INDEX IDX_DDVA_DVAP ON CRD.DDVA(DVAPCDGO);
```

### 4.5 CRD.TPAP — producto de pago por tipo de aporte

```sql
ALTER TABLE CRD.TPAP ADD (TPAPPRDP NUMBER);
COMMENT ON COLUMN CRD.TPAP.TPAPPRDP IS
  'PGS.PRDP.ID que clasifica contablemente la devolucion de este tipo de aporte. Sin FK: CRD no ata el esquema PGS.';
```

Sin este dato la devolución de ese tipo **no se puede registrar** (error `TIPO_APORTE_SIN_PRODUCTO`).
Es parametrización previa que carga el usuario.

### 4.6 Rubros nuevos

```java
// com.saa.rubros.EstadoDevolucionAporte  (nueva interfaz)
REGISTRADA = 1; EN_PAGO = 2; PAGADA = 3; RECHAZADA = 4; ANULADA = 5;

// com.saa.rubros.OrigenPagoExterno  (nueva interfaz)
String CRD_DEVOLUCION_APORTE = "CRD_DEVOLUCION_APORTE";
```

⚠️ `OrigenPagoExterno` contiene una cadena que nombra a CRD, pero **es solo un literal**: ninguna
clase de CXP importa nada de CRD. Al sacar `crd`, se borra la constante y nada deja de compilar.

`com.saa.rubros.TipoAsientos` += `PAGO_ORIGEN_EXTERNO`. Reutilizar el `codigoAlterno` **5 (TEGRESO)**,
el mismo que ya usan `EGRESO_TESORERIA`, `ANTICIPOS_PROVEEDOR` y `PAGO_TRANSFERENCIA_CXP`. No hace
falta fila nueva de `TipoAsiento` en BD.

---

## 5. Contrato de servicios backend

### 5.1 CXP — `PagoProgramadoService` (código neutral, sin conocimiento de CRD)

```java
/**
 * Registra un pago cuyo documento de origen vive en otro modulo del sistema.
 * CXP guarda la etiqueta del origen y el id, pero nunca los resuelve: para este
 * servicio son datos opacos.
 * El beneficiario va denormalizado porque puede no existir en el maestro de titulares.
 * El desglose clasifica contablemente el pago: una linea DEBE por producto al confirmarse.
 */
Map<String, Object> registrarPagoDeOrigenExterno(
        String origen,                       // etiqueta opaca, obligatoria
        Long   idOrigen,                     // id en el modulo origen, obligatorio
        Long   idEmpresa,
        Long   idCuentaBancariaOrigen,       // TSR.CNBC, de donde sale el dinero
        Double valor,
        String fechaProgramada,              // yyyy-MM-dd, null = hoy
        BeneficiarioOcasional beneficiario,  // DTO nuevo, obligatorio
        List<LineaContablePago> desglose,    // DTO nuevo, al menos una linea
        String observacion,
        Long   idUsuario,
        boolean debitoAutomatico,
        String referencia) throws Throwable;

// DTOs nuevos en com.saa.ejb.cxp.service.dto (POJOs planos, getters/setters a mano)
public class BeneficiarioOcasional {
    private String nombre;          // obligatorio
    private String identificacion;  // obligatorio
    private Long   idBancoExterno;  // TSR.BEXT; obligatorio salvo debito automatico
    private Long   tipoCuenta;
    private String numeroCuenta;    // obligatorio salvo debito automatico
}
public class LineaContablePago {
    private Long   idProductoPago;  // PGS.PRDP.ID
    private Double valor;
    private String concepto;
}
```

Validaciones: origen e idOrigen no vacíos; no puede existir otro pago vigente (estado ∉ {4,5})
con el mismo par `(origen, idOrigen)`; `valor > 0`; `Σ desglose.valor == valor` con tolerancia
`0.01`; cada `idProductoPago` existe y su `grupoProducto.planCuenta` no es null (validar **al
registrar**, no al confirmar, para que el error salga temprano — mismo criterio que
`EgresoServiceImpl.validaProducto`).

**Contabilización** — `contabilizarPagoOrigenExterno(PagoProgramado pago, Long idUsuario)`:

```
lineas = []
para cada DPGT del pago:
    lineas += DEBE  producto.grupoProducto.planCuenta  por  DPGT.valor   (concepto de la linea)
lineas += HABER cuentaBancaria.planCuenta por pago.valor
asiento = asientoContableService.generarAsiento(idEmpresa, TipoAsientos.PAGO_ORIGEN_EXTERNO,
              fecha, observacion, usuario, lineas, (long) ModuloSistema.CUENTAS_POR_PAGAR)
movimientoBancoService.creaMovimientoPorTransferencia(idEmpresa, glosa, asiento,
              pago.getCuentaBancaria(), pago.getValor(),
              TipoMovimientoConciliacion.TRANSFERENCIAS_DEBITOS_EN_TRANSITO,
              OrigenMovimientoConciliacion.PAGOS)
pago.setAsiento(asiento)      // <-- unica diferencia con los otros origenes: cuelga del PGTR
```

`moduloSistema` va en `CUENTAS_POR_PAGAR (3)`: el asiento lo genera CXP. **No crear
`ModuloSistema.CREDITOS`** — sería exactamente el rastro de CRD que la §1 prohíbe.

**Reversión** — `revertirContabilidadOrigenExterno(pago, motivo)`: anular el movimiento bancario
(`movimientoBancoService.actualizaEstadoMovimiento(idAsiento, EstadoMovimientoBanco.ANULADO)`),
anular el asiento, y `pago.setAsiento(null)`. Copiar `revertirContabilidadEgreso`.

**Los tres if/else**: agregar la rama `pago.getOrigenExterno() != null` **primero** (antes de
anticipo y egreso) en `procesarRespuestaBanco`, `confirmarPagosManual` y `revertirPagoConfirmado`.

**Formateador**: `FormateadorArchivoBancoPlanoImpl.generarContenido` hoy exige `cuentaDestino`.
Cambiar a: si `cuentaDestino` es null y hay beneficiario ocasional (`PGTRBFCT` no vacío), usar esos
campos; si no hay ninguno de los dos, el mensaje de error de hoy.

> **Corrección del 2026-08-24.** La primera versión decía "igual en `generarLote`". **`generarLote`
> no necesita ningún cambio**: nunca valida `cuentaDestino`. Sus validaciones son débito automático,
> estado REGISTRADO, coincidencia de cuenta de origen y existencia del pago. La única exigencia de
> cuenta de destino vivía en el formateador. Verificado en el código.

### 5.2 CRD — `DevolucionAporteService`

```java
@Local
public interface DevolucionAporteService extends EntityService<DevolucionAporte> {

    /** Registra la devolucion, genera los aportes negativos y dispara la orden de pago en CXP. */
    ResultadoDevolucionAporte registrarDevolucion(SolicitudDevolucionAporte solicitud) throws Throwable;

    /** Devoluciones de un participe, reconciliadas contra el estado real del pago. */
    List<DevolucionAporte> listarPorEntidad(Long idEntidad) throws Throwable;

    /** Reconcilia las devoluciones en estado 1/2 contra PGS.PGTR. Idempotente. */
    ResultadoSincronizacion sincronizarPagos() throws Throwable;

    /** Anula una devolucion que todavia no se pago: revierte los negativos y anula la orden. */
    ResultadoDevolucionAporte anularDevolucion(Long idDevolucion, String motivo, String usuario) throws Throwable;
}
```

**`registrarDevolucion` — secuencia, una sola transacción `REQUIRED`:**

```
 1. Validar (§8.1). Resolver TPAPPRDP de cada tipo -> TIPO_APORTE_SIN_PRODUCTO si falta.
 2. Crear DVAP en estado 1 REGISTRADA + una DDVA por tipo.
 3. Por cada tipo, crear la fila NEGATIVA en CRD.APRT:
       entidad, filial = entidad.getFilial(), tipoAporte,
       valor        = -monto        <- NEGATIVO
       valorPagado  = 0.0
       saldo        = 0.0           <- CRITICO: invisible para el FIFO petro
       estado       = 4 (PAGADA)    <- fuera de los estados que consume el FIFO
       idAsoprep    = null, fechaTransaccion = fecha de la devolucion,
       glosa        = "DEVOLUCION APORTES " + tipo.getNombre() + " - Devolucion " + idDVAP,
       usuarioRegistro, fechaRegistro = now
       ** aporteDaoService.save(aporte, null) DIRECTO, NUNCA AporteService.saveSingle **
    y su PagoAporte (valor POSITIVO = magnitud, concepto = la misma glosa, estado = 1).
    Guardar los codigos en DDVAAPRT / DDVAPGAP.
 4. Llamar a CXP:
       pagoProgramadoService.registrarPagoDeOrigenExterno(
           OrigenPagoExterno.CRD_DEVOLUCION_APORTE, dvap.getCodigo(), idEmpresa,
           idCuentaBancariaOrigen, valorTotal, fecha,
           beneficiario armado desde ENTD + la CNBP elegida,
           desglose = una LineaContablePago por tipo (producto = TPAPPRDP, valor, concepto),
           observacion, idUsuario, debitoAutomatico, referencia)
 5. DVAP.idPagoProgramado = el id devuelto; DVAP.estado = 2 EN_PAGO.
    Si el pago vino ya CONFIRMADO (debito automatico), aplicar de una el paso de PAGADA (§5.3).
 6. Devolver ResultadoDevolucionAporte.
```

Si el paso 4 lanza, **revierte todo** (misma transacción): no quedan negativos huérfanos.

**`sincronizarPagos` — el reconciliador:**

```
para cada DVAP con estado IN (1 REGISTRADA, 2 EN_PAGO) y DVAPIDPG NOT NULL:
    pago = pagoProgramadoDaoService.find(new PagoProgramado(), dvap.idPagoProgramado)
    si pago == null                -> dejar como esta, contar como huerfana y loguear
    si pago.estado == 3 CONFIRMADO -> DVAP.estado = 3 PAGADA
                                      DVAP.fechaPago = pago.fechaRespuesta
                                      DVAP.numeroAsiento = pago.asiento?.codigo
    si pago.estado IN (4 RECHAZADO, 5 ANULADO) y DVAP.estado != 4
                                   -> generarContraMovimientos(dvap)   (§8.3)
                                      DVAP.estado = 4 RECHAZADA
    si no                          -> sin cambios
```

Cada DVAP en su **propia transacción `REQUIRES_NEW`**, invocada por auto-inyección
(`@EJB private DevolucionAporteService self;`), y el orquestador en `NOT_SUPPORTED`. Es el patrón
exacto de `ProcesoMoraPrestamoServiceImpl`. Una devolución con datos malos no aborta el lote.

**Idempotencia**: una DVAP ya en 3 o 4 no se vuelve a tocar, y `generarContraMovimientos` no hace
nada si `DDVAAPRV` ya tiene valor.

**Timer**: `com.saa.ejb.crd.serviceImpl.ProcesoDevolucionAporteTimer`,
`@Schedule(hour = "*", minute = "*/30", second = "0", persistent = false)`, atrapa `Throwable`.
Copiar `ProcesoMoraPrestamoTimer`.

---

## 6. Contrato REST

Clase nueva `com.saa.ws.rest.crd.DevolucionAporteRest`, `@Path("dvap")`.
Sobre de respuesta y mapeo de errores **idénticos a los servicios de pago de préstamos**
(§8 de `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md`):

```json
{ "exito": true, "etapa": "VALIDACION|APLICACION", "mensaje": "...",
  "error": "CODIGO_ESTABLE", "resultado": { } }
```

| Código de error | HTTP |
|---|---|
| `PARAMETRO_INVALIDO` | 400 |
| `ENTIDAD_NO_ENCONTRADA`, `DEVOLUCION_NO_ENCONTRADA`, `CUENTA_NO_ENCONTRADA` | 404 |
| `ESTADO_NO_PERMITE`, `DEVOLUCION_YA_PAGADA`, `DEVOLUCION_YA_ANULADA` | 409 |
| `VALOR_INVALIDO`, `FECHA_INVALIDA`, `SALDO_INSUFICIENTE`, `TIPO_APORTE_NO_VIGENTE`, `TIPO_APORTE_SIN_PRODUCTO`, `TIPO_DUPLICADO`, `SIN_CUENTA_BANCARIA`, `ERROR_ORDEN_PAGO` | 422 |
| resto | 500 |

`422` se escribe como literal: no existe en el enum `Response.Status` de Jakarta REST.

### 6.1 `POST /rest/dvap/registrar`

```json
{
  "idEntidad": 4521,
  "idCuentaBancariaParticipe": 88,
  "idCuentaBancariaOrigen": 4,
  "idEmpresa": 1,
  "idUsuario": 12,
  "usuario": "jperez",
  "fecha": "2026-08-24",
  "motivo": "Devolución por desafiliación",
  "debitoAutomatico": false,
  "referencia": null,
  "detalle": [
    { "idTipoAporte": 11, "valor": 3200.00 },
    { "idTipoAporte": 9,  "valor": 1500.00 }
  ]
}
```

→ **201**
```json
{
  "exito": true, "etapa": "APLICACION",
  "mensaje": "Devolución registrada por $4700.00. Orden de pago 337 generada en Cuentas por Pagar.",
  "resultado": {
    "idDevolucion": 51, "idPagoProgramado": 337, "estado": 2, "estadoTexto": "EN PAGO",
    "valorTotal": 4700.00,
    "detalle": [
      { "idTipoAporte": 11, "nombreTipoAporte": "APORTE CESANTIA", "valor": 3200.00,
        "idAporteGenerado": 998101, "saldoTipoAporteDespues": 5200.00 },
      { "idTipoAporte": 9,  "nombreTipoAporte": "APORTE JUBILACION", "valor": 1500.00,
        "idAporteGenerado": 998102, "saldoTipoAporteDespues": 10845.67 }
    ]
  }
}
```

⚠️ **`fecha` es `LocalDate` y viaja como `yyyy-MM-dd`.** Nunca un `Date` de JavaScript ni nada
terminado en `Z`: Jackson descarta el offset en vez de convertirlo y el dato queda cinco horas
adelantado, en silencio.

### 6.2 `GET /rest/dvap/porEntidad/{idEntidad}`

Reconcilia antes de responder. → **200** con `resultado: [...]`, cada elemento:

> ⚠ **Corregido el 2026-08-25.** Las fechas de SALIDA de este endpoint son `LocalDate` en
> `ResumenDevolucionAporte` (`private LocalDate fecha` / `fechaPago`), así que Jackson las
> serializa como **arreglo `[año, mes, día]`**, no como string. El ejemplo de abajo las
> mostraba como `"2026-08-24"` y era incorrecto: lo correcto es `[2026, 8, 24]`. No se pudo
> capturar de una respuesta real porque la BD de desarrollo no tiene ninguna devolución
> registrada; se determinó leyendo el tipo del DTO. Las fechas de ENTRADA (§6.1) sí son
> string `"yyyy-MM-dd"`, que es lo que Jackson acepta al deserializar. En el frontend, el
> tipo `DevolucionListado.fecha: string` debe pasar a aceptar el arreglo (el render ya lo
> tolera vía `FuncionesDatosService.convertirFechaDesdeBackend`).

```json
{ "idDevolucion": 51, "fecha": [2026, 8, 24], "valorTotal": 4700.00,
  "estado": 3, "estadoTexto": "PAGADA",
  "idPagoProgramado": 337, "numeroAsiento": 90211, "fechaPago": [2026, 8, 26],
  "motivo": "Devolución por desafiliación",
  "cuentaDestino": "PICHINCHA · AHORROS · 2200****91",
  "detalle": [ { "idTipoAporte": 11, "nombreTipoAporte": "APORTE CESANTIA", "valor": 3200.00 } ] }
```

Lista vacía es **200 con `[]`**, no error. No replicar el patrón `IncomeException`-si-vacío.

### 6.3 `POST /rest/dvap/anular/{idDevolucion}`

Body `{ "motivo": "...", "usuario": "jperez", "idUsuario": 12 }` → **200**.
Solo en estado 1 o 2 y con el pago **no confirmado**. Si ya está pagada → 409
`DEVOLUCION_YA_PAGADA` con el mensaje *"La devolución ya fue pagada; reverse el pago desde
Cuentas por Pagar y vuelva a intentar."*

### 6.4 `POST /rest/dvap/sincronizar`

Sin body. → **200** con `resultado: { evaluadas, marcadasPagadas, marcadasRechazadas,
huerfanas, conError, errores: [] }`. Recuperación manual; el timer hace lo mismo cada 30 min.

### 6.5 `GET /rest/dvap/deudaVigente/{idEntidad}` — aviso, no bloqueo

**Decisión del 2026-08-24.** Devolverle aportes a un partícipe que todavía debe un préstamo
**se avisa, no se impide**. Este endpoint es **puramente informativo**: la pantalla lo llama al
seleccionar al partícipe y muestra el resultado en el diálogo de confirmación.

> ⚠️ `POST /dvap/registrar` **NO valida esto y NO tiene un código de error nuevo.** Si el
> operador confirma con deuda a la vista, la devolución se registra igual. Cualquier
> implementación que lo convierta en un 422 está mal.

→ **200**
```json
{ "exito": true,
  "resultado": {
    "idEntidad": 4521,
    "totalDeuda": 8420.55,
    "cantidadPrestamos": 2,
    "tieneMora": true,
    "prestamos": [
      { "idPrestamo": 8523, "idAsoprep": 61939, "producto": "HIPOTECARIO",
        "idEstado": 11, "estadoTexto": "EN MORA", "saldoPendiente": 7100.30, "cuotasVencidas": 3 },
      { "idPrestamo": 9011, "idAsoprep": 62110, "producto": "QUIROGRAFARIO",
        "idEstado": 2,  "estadoTexto": "VIGENTE", "saldoPendiente": 1320.25, "cuotasVencidas": 0 }
    ] } }
```

Sin préstamos vigentes: `200` con `totalDeuda: 0`, `cantidadPrestamos: 0` y `prestamos: []`.
**Nunca error.**

> **Ratificado por el árbitro el 2026-08-24 — el filtro es
> `(idEstado IS NULL OR idEstado NOT IN (3,4,5))`, no `NOT IN (3,4,5)` a secas.**
> En JPQL y en Oracle, `NULL NOT IN (3,4,5)` evalúa a UNKNOWN y la fila **se cae en silencio**:
> un préstamo con estado sin poblar desaparecería del aviso. En un aviso, subreportar deuda es
> peor que sobrereportarla, y es el mismo patrón que ya usa el criterio de cuotas vencidas
> (`DTPRESTD IS NULL OR ...`). Si algún día esto pasa a ser una validación bloqueante, la
> decisión se revisa: ahí un estado nulo sí debería frenar y pedir corrección del dato.

> **Ratificado por el árbitro el 2026-08-24 — si la consulta de deuda falla, el diálogo lo dice.**
> Sin eso, "no se pudo consultar la deuda" y "no tiene deuda" se ven **idénticos** desde la silla
> del operador, que es exactamente el modo de falla silenciosa que hay que evitar. Una línea gris
> ("No se pudo consultar la deuda vigente del partícipe") alcanza: **sigue sin bloquear**, sin
> checkbox de riesgo y sin confirmación extra.

Implementación en el backend:

- Método DAO nuevo `PrestamoDaoService.selectVigentesByEntidad(Long codigoEntidad)`: préstamos de
  la entidad con `PRSTIDST NOT IN (3, 4, 5)` — los tres estados terminales. **Es `PRSTIDST`, nunca
  `ESPSCDGO`**: `ESPSCDGO` es la FK al catálogo `CRD.ESPS`, no el estado operativo.
- `saldoPendiente` por préstamo sale de `motorPagoPrestamoService.calcularTotalPendientePrestamo(id)`,
  que ya existe y ya reconstruye los saldos desde los `PagoPrestamo` vigentes. **No sumar columnas
  de `DTPR` a mano.**
- `cuotasVencidas`: mismo criterio que el proceso diario de mora y el padrón, para que los números
  coincidan — `(DTPRESTD IS NULL OR DTPRESTD NOT IN (4, 7)) AND DTPRFCVN < TRUNC(SYSDATE)`.
- `tieneMora` = alguno con `idEstado` en `(8 DE_PLAZO_VENCIDO, 11 EN_MORA)` o con `cuotasVencidas > 0`.
- Absorber los errores por préstamo: uno con datos malos no debe romper el aviso completo.

> El JavaDoc de `PrestamoDaoService.countVigentesMoraVencidosByEntidad` dice "en mora (8) o plazo
> vencido (11)": **las etiquetas están cruzadas**, el conjunto `{2, 8, 11}` sí es correcto.
> Lo bueno es `8 = DE_PLAZO_VENCIDO`, `11 = EN_MORA`. No copiar ese JavaDoc.

### 6.5.b La contabilidad es OPCIONAL — decisión del 2026-08-24

**Decisión del usuario: por ahora la devolución NO alimenta contabilidad.** El desglose contable
(`PGS.DPGT`) y el producto de pago (`CRD.TPAP.TPAPPRDP`) pasan de obligatorios a **opcionales**.

Motivo: sin `TPAPPRDP` cargado, `registrarDevolucion` lanzaba
`TIPO_APORTE_SIN_PRODUCTO` y no se podía ni abrir el circuito para revisar las pantallas.
La parametrización contable se definirá más adelante.

#### La regla es todo o nada, nunca mezclado

| Situación de los tipos de la devolución | Qué pasa |
|---|---|
| **Todos** tienen `TPAPPRDP` | Se manda el desglose. Al confirmar: asiento + movimiento bancario, como estaba |
| **Ninguno** tiene `TPAPPRDP` | No se manda desglose. Al confirmar: **sin asiento y sin movimiento bancario** |
| **Algunos sí y otros no** | `422 TIPO_APORTE_SIN_PRODUCTO`, nombrando los que faltan |

El caso mezclado **tiene que fallar**: un desglose parcial produce un asiento donde las líneas
DEBE suman menos que el HABER al banco. Un asiento descuadrado es peor que no tener asiento.

#### ⚠️ La consecuencia, dicha de frente

Sin desglose no hay asiento, **y sin asiento tampoco hay movimiento bancario**:
`movimientoBancoService.creaMovimientoPorTransferencia(...)` recibe el `Asiento` como parámetro,
así que los dos caen juntos. **Salió plata del banco y el sistema no lo registra en ningún lado
más que en `PGS.PGTR`.** Esos pagos son invisibles para la conciliación bancaria hasta que se
regularicen.

Es aceptable mientras sea una etapa de revisión. **No lo es en producción con dinero real.**

#### Cómo se encuentran después los pagos sin contabilizar

No hace falta ninguna columna nueva: **`PGTRASNT IS NULL` en un pago CONFIRMADO de origen externo
ES la marca.** Control para regularizarlos:

```sql
-- Pagos de origen externo confirmados que quedaron SIN asiento ni movimiento bancario
SELECT P.PGTRCDGO, P.PGTRORGN, P.PGTRIDOR, P.PGTRVLOR, P.PGTRFRSP, P.PGTRBFNM
FROM   PGS.PGTR P
WHERE  P.PGTRESTD = 3
AND    P.PGTRORGN IS NOT NULL
AND    P.PGTRASNT IS NULL
ORDER BY P.PGTRFRSP, P.PGTRCDGO;

-- Su equivalente del lado de CRD: devoluciones PAGADAS sin asiento
SELECT DVAPCDGO, DVAPVLRR, DVAPFCPG, DVAPIDPG
FROM   CRD.DVAP
WHERE  DVAPESTD = 3 AND DVAPNMAS IS NULL
ORDER BY DVAPFCPG;
```

`DVAPNMAS` nulo en una devolución PAGADA **no es un error** y el reconciliador no debe tratarlo
como tal: es exactamente este caso.

### 6.6 Endpoints existentes que consume la pantalla nueva

- `GET /rest/aprt/saldosPorEntidad/{idEntidad}` — saldo por tipo. **Ya existe, no se toca.**
- `POST /rest/entd/selectByCriteria` — búsqueda de partícipe (mismos criterios que `cruce-de-valores`).
- `POST /rest/cnbp/selectByCriteria` — cuentas bancarias del partícipe, filtrando `estado = 1`.
- `GET /rest/cnbc/getAll` — cuentas bancarias propias, filtradas por empresa en el cliente
  (es lo que hace hoy `pagos-transferencia.component.ts`).

---

## 7. Pantalla nueva de frontend

`src/app/modules/crd/forms/devolucion-aportes/`, ruta `/menucreditos/devolucion-aportes`,
entrada en `menucreditos.component.ts` bajo "Cruce de Valores" con icono `undo`.

**Componente standalone con signals**, siguiendo `cruce-de-valores.component.ts` como plantilla de
estilo (mismo bloque de búsqueda de partícipe, mismos `MaterialFormModule`, mismos 44px de alto
mínimo en controles táctiles). **No copiar `cruce-valores` (la vieja)**: usa `MatTableDataSource`
sin signals y baja tablas enteras.

Cuatro bloques verticales:

1. **Buscar partícipe** — idéntico al de `cruce-de-valores` (identificación, rol Petro, nombre).
2. **Saldos por tipo de aporte** — de `saldosPorEntidad`. Por cada tipo: nombre, saldo disponible,
   input de monto a devolver. El input se limita al saldo. Total abajo.
3. **Destino y origen del dinero** — combo de `CuentaBancariaParticipe` del partícipe (banco ·
   tipo · número enmascarado), combo de `CuentaBancaria` propia, fecha, motivo, y un check
   "débito automático" con su campo de referencia.
4. **Historial de devoluciones** — de `porEntidad`, con chip de estado, número de orden de pago,
   número de asiento cuando está pagada, y botón Anular solo en estados 1 y 2.

Reglas de pantalla:

- Confirmación en diálogo antes de registrar, con el desglose y el total. Es dinero saliendo.
- Si el partícipe **no tiene ninguna `CuentaBancariaParticipe` activa**, bloquear el registro con
  un mensaje que mande a cargarla; no dejar enviar sin cuenta.
- Tras registrar, refrescar saldos e historial **desde el backend** (nunca recalcular en cliente:
  el saldo es `SUM(APRTVLRR)` en BD).
- Servicio en `src/app/modules/crd/service/devolucion-aporte.service.ts`, constante `RS_DVAP` en
  `service/ws-crd.ts`. **Devolver siempre `RespuestaDevolucion` incluso en 4xx**, igual que
  `operaciones-pago-prestamo.service.ts`: el código de error es la lógica de pantalla.
- Modelos en `src/app/modules/crd/model/devolucion/`.

### 7.1 Cambio en la pantalla de CXP

`cxp/forms/pagos/pagos-transferencia`: en las sub-vistas que listan pagos, mostrar el origen.
El modelo `PagoProgramado` gana:

```ts
/** Etiqueta del proceso externo que originó el pago; null en los pagos propios de CXP. */
origenExterno?: string | null;
/** Id del documento en el módulo origen. CXP no lo resuelve: es informativo. */
idOrigen?: number | null;
/** Beneficiario que no está en el maestro de titulares. */
beneficiarioNombre?: string | null;
beneficiarioIdentificacion?: string | null;
beneficiarioCuenta?: string | null;
/** Asiento del pago de origen externo (los demás lo cuelgan de su documento). */
asiento?: AsientoDePago | null;
```

En la columna de concepto: si `origenExterno` viene, mostrar una etiqueta legible
(`'CRD_DEVOLUCION_APORTE' → 'Devolución de aportes'`) más `#{idOrigen}`. En la columna de
beneficiario: si `titular` es null, mostrar `beneficiarioNombre`. **Mapa de etiquetas en un solo
archivo del frontend**, para que borrarlo sea trivial.

---

## 8. Reglas y casos borde

### 8.1 Validaciones de `registrarDevolucion`, en orden

1. Cuerpo presente; `idEntidad`, `idCuentaBancariaOrigen`, `idEmpresa`, `usuario` y `detalle`
   no nulos → `PARAMETRO_INVALIDO` (400).
2. Partícipe existe (`entidadDaoService.find`, que devuelve null, no `NoResultException`) → 404.
3. `detalle` no vacío, sin tipos repetidos → `TIPO_DUPLICADO` (422).
4. Cada `idTipoAporte` existe y `TipoAporte.estado = 1` → `TIPO_APORTE_NO_VIGENTE` (422).
5. Cada tipo tiene `TPAPPRDP` → `TIPO_APORTE_SIN_PRODUCTO` (422), con el nombre del tipo.
6. Cada `valor > 0` tras redondear a 2 decimales → `VALOR_INVALIDO` (422).
7. Por cada tipo: `saldoAporteService.saldoPorEntidadYTipo(idEntidad, idTipo) >= valor - 0.01`
   → `SALDO_INSUFICIENTE` (422) detallando tipo, pedido y disponible.
8. `fecha` no futura (null = hoy) → `FECHA_INVALIDA` (422).
9. Salvo débito automático: `idCuentaBancariaParticipe` presente, existe, pertenece al partícipe
   y `estado = 1` → `SIN_CUENTA_BANCARIA` / `CUENTA_NO_ENCONTRADA`.

**Guardarraíl anti-carrera**: revalidar el saldo por tipo (paso 7) **dentro de la transacción**,
inmediatamente antes de insertar cada fila negativa. Es el mismo guardarraíl del paso 3a de
`pagarConAportes`.

### 8.2 Aritmética

`BigDecimal` con `RoundingMode.HALF_UP` a 2 decimales en los cálculos, `Double` solo al setear
entidades. Tolerancia `0.01` en toda comparación. Los montos de los mensajes se formatean con
`Locale.US` para que el separador decimal sea siempre el punto.

### 8.3 Contra-movimientos cuando el pago se rechaza o se reversa

Por cada `DDVA` de la devolución con `DDVAAPRV` nulo:

```
Fila POSITIVA en CRD.APRT: valor = +DDVAVLRR, valorPagado = 0.0, saldo = 0.0, estado = 4,
   fechaTransaccion = now, misma entidad / filial / tipo,
   glosa = "REVERSO DEVOLUCION " + idDVAP + " - Pago rechazado"
   ** aporteDaoService.save DIRECTO **
DDVAAPRV = codigo de la fila nueva
```

**Se inserta un contra-movimiento, no se borra ni se edita la fila negativa**: `CRD.APRT` es
append-only para los reportes (G42, G43, G44, CJBM, CPRM/CCPM, dashboard, padrón). G43 en
particular liquida cesantes leyendo explícitamente los negativos del mes.

El `PagoAporte` de la fila negativa se marca `estado = 0`.

### 8.4 Qué NO se toca

- `CargaArchivoPetroServiceImpl`, `ProcesoCargaPetroServiceImpl`, `GeneracionArchivoPetroServiceImpl`
  y el FIFO de aportes. Las filas de devolución nacen con `saldo = 0` y `estado = 4` justamente
  para ser invisibles a `selectMinAporteConSaldo`.
- Las dos pantallas de cruce de valores.
- `MotorPagoPrestamoServiceImpl` y todo lo de pagos de préstamos.
- El circuito de lote/archivo/respuesta de CXP, salvo la caída al beneficiario ocasional en el
  formateador.

### 8.5 Impacto en los reportes de aportes

Una devolución baja `SUM(APRTVLRR)` del partícipe **en el momento del registro**, antes de que el
dinero salga del banco. Es lo decidido. Consecuencias a verificar en la aceptación: G42, dashboard
de aportes y padrón de partícipes deben moverse exactamente en `-monto` el mismo día del registro,
y volver al valor previo si el pago se rechaza.

⚠️ **El padrón de partícipes cuenta meses con aporte positivo** (`APRTVLRR > 0`), así que las filas
negativas **no** alteran `numeroAportes` ni `estadoMora`. Verificado en
`REGLAS-PADRON-PARTICIPES.md` §4. No hace falta ajustar el padrón.

---

## 9. Fases, orden y criterios de aceptación

El orden **no es negociable**: la fase 1 de CXP es prerrequisito de la 2 de CRD.

| Fase | Agente | Contenido | Aceptación |
|---|---|---|---|
| **0** | BE | DDL §4 (sin ejecutar) + entidades `PagoProgramado` (campos nuevos), `DetallePagoOrigenExterno`, `DevolucionAporte`, `DetalleDevolucionAporte` + constantes en `NombreEntidadesCredito`/`NombreEntidadesPago` + rubros §4.6 + DAOs | Las 5 capas por tabla nueva |
| **1** | BE | CXP: `registrarPagoDeOrigenExterno`, `contabilizarPagoOrigenExterno`, `revertirContabilidadOrigenExterno`, las **tres** ramas de if/else, formateador y `generarLote` con beneficiario ocasional | Un pago de origen externo se registra, entra a un lote, se confirma y genera asiento de 2+ líneas y movimiento bancario. `grep -rn "com\.saa\.\(ejb\|model\)\.crd" src/main/java/com/saa/ejb/cxp src/main/java/com/saa/ejb/tsr src/main/java/com/saa/ejb/cnt` **devuelve vacío** |
| **2** | BE | CRD: `DevolucionAporteService.registrarDevolucion` + `DevolucionAporteRest` `POST /dvap/registrar` + `GET /dvap/porEntidad` | Registro genera N filas negativas con `saldo=0, estado=4`, sus `PagoAporte`, el DVAP/DDVA y el PGTR. `selectMinAporteConSaldo` **no** devuelve las filas nuevas. `saldosPorEntidad` baja exactamente el monto |
| **3** | BE | CRD: `sincronizarPagos`, `ProcesoDevolucionAporteTimer`, `POST /dvap/sincronizar`, `POST /dvap/anular` | Confirmar el pago en CXP y sincronizar deja el DVAP en 3 con asiento y fecha. Rechazarlo genera los contra-movimientos y deja el saldo como estaba. Correr `sincronizar` dos veces no cambia nada |
| **4** | FE | Pantalla `devolucion-aportes` + servicio + modelos + ruta + menú | Flujo completo contra el backend desplegado |
| **5** | FE | `pagos-transferencia`: origen y beneficiario en las sub-vistas de listado | Una devolución se ve identificada en el listado de pagos y se puede pagar |

**Paralelización:** las fases 0-1 (BE) y la 4 (FE, contra el contrato de la §6) arrancan a la vez.
La 5 depende de la 1. La 4 no se puede **probar** hasta la 2.

**Nada de esto compila acá**: el usuario compila en Eclipse. No usar `mvn` ni `javac` para verificar.

---

## 10. Decisiones tomadas y supuestos abiertos

### Decisiones (no re-preguntar)

1. **Pantalla nueva dedicada.** Ninguna de las dos pantallas de cruce se modifica.
2. **El partícipe no se convierte en `Titular`.** Beneficiario ocasional denormalizado en PGTR.
3. **`CRD.DVAP` es el documento de origen**, con `CRD.DDVA` por tipo de aporte.
4. **Los negativos se generan al registrar**, antes de que salga el dinero.
5. **Rechazo o reverso → contra-movimiento positivo automático**, nunca borrar ni editar.
6. **El aviso de vuelta es por consulta desde CRD, no por callback desde CXP** — impuesto por la
   restricción de comercialización de la §1.
7. **Una devolución puede cubrir varios tipos de aporte en una sola orden de pago**, con desglose
   contable en `PGS.DPGT`. Evita N transferencias y N comisiones al mismo partícipe.

### 10.1 `CRD.CSNT` (Cesantía) queda descartada — decisión del 2026-08-24

**No se usa, y no hace falta.** Verificado en los dos repositorios:

| Comprobación | Resultado |
|---|---|
| ¿Quién referencia la entidad `Cesantia` en el backend? | **Solo su propio stack CRUD** (`CesantiaDaoService`/Impl, `CesantiaService`/Impl, `CesantiaRest`). Nada más en todo el sistema |
| ¿La consume alguna pantalla del frontend? | **No.** Existe `cesantia.service.ts` registrado en el service-locator, pero **no hay ninguna pantalla de cesantías** |
| ¿Aparece en algún reporte o `.jrxml`? | No |
| ¿La toca Petro o el G40? | No. Sus menciones a "cesantía" son `HistorialSueldo.montoCesantia` y el `TipoAporte` CESANTÍA (id 11) — cosas distintas |
| Filas en producción | 5, sin información útil (reportado por el usuario) |

Es andamiaje muerto: se generó con el patrón de 5 capas y nunca se le construyó un proceso encima.

**`CRD.DVAP` rastrea estrictamente más que `CSNT`**: quién, cuánto, por qué concepto (`DDVA` por
tipo de aporte), cuándo, en qué estado del ciclo, contra qué orden de pago —y por `DVAPIDPG` se
llega a lote, archivo del banco, referencia bancaria y fecha de respuesta—, con qué asiento, y
qué filas de `CRD.APRT` generó, incluidas las de reverso. `CSNT` no tiene nada de eso.

**No se toca la tabla ni su stack**: borrarla es una limpieza aparte, sin relación con esta
funcionalidad. Simplemente no participa.

### 10.2 Lo único que `CSNT` insinuaba y este diseño NO cubre

`CSNT` tiene `totalIngresos`, `totalEgresos`, `saldoPagar` **y `saldoCobrar`**. Ese último campo
apunta a una regla real: al liquidar a un partícipe se **netea lo que el fondo le debe contra lo
que él le debe al fondo** (préstamos vigentes).

**Hoy la devolución no mira las deudas del partícipe.** Las validaciones de la §8.1 solo verifican
que el saldo de aportes alcance. Nada impide devolverle todos los aportes a alguien con un
préstamo vigente en mora.

**Decisión del usuario, 2026-08-24: se avisa, no se bloquea, y no se netea.** El backend calcula
la deuda vigente y la expone en `GET /dvap/deudaVigente/{idEntidad}` (§6.5); la pantalla la muestra
en el diálogo de confirmación. El operador decide. `POST /dvap/registrar` **no la valida** y no
gana ningún código de error nuevo. Los préstamos no se tocan.

Descartadas explícitamente, no volver a proponerlas: bloquear con `422 DEUDA_PENDIENTE`, y netear
automáticamente pagando los préstamos con los aportes antes de devolver el remanente.

### `Pais`: CERRADO — la deuda era la mitad de grande de lo que creíamos

**Cerrado el 2026-08-24, verificado contra producción.** Eran dos problemas distintos y **ninguno
queda abierto**.

| | Problema | Estado |
|---|---|---|
| **Compilación** | `model/tsr/Titular.java` importaba `com.saa.model.crd.Pais`: era la única dependencia `tsr → crd` del backend, y dejaba a `tsr` sin compilar si se retiraba `crd` | ✅ **RESUELTO** por el movimiento de paquetes |
| **Integridad referencial** | Se creía que `TSR.TTLR.PSSSCDGO` era FK a `CRD.PSSS` | ✅ **NUNCA EXISTIÓ** — ver abajo |

#### La FK de `TSR.TTLR` a países no existe, y nunca existió

Verificado en producción el 2026-08-24. `TSR.TTLR` tiene **tres** constraints y **ninguna es de
tipo `R`**:

```
SYS_C0048369          C   ENABLED     (check)
PK_TTLR               P   ENABLED     (primary key)
UK_TTLR_IDNT_ESTD     U   ENABLED     (unique)
```

`PSSSCDGO` es **una columna suelta**: el `@JoinColumn` de la entidad JPA nunca tuvo respaldo en la
base. Además, **una sola fila** de `TTLR` tiene país cargado.

La única FK contra `CRD.PSSS` es `FK_PRVN_PSSS`, de `CRD.PRVN` — **interna a `crd`**, así que se
va junto con el módulo el día que se lo extraiga. No es una fuga.

**Consecuencia: retirar `crd` hoy no rompe nada a nivel de base.** Queda un valor colgado en una
fila de `TTLR`, sin constraint que lo sostenga.

> ⚠️ Este era el supuesto equivocado que hizo fallar `MIGRACION-PAIS-CRD-A-SCP.md`: el paso 5.4
> intentaba `DROP CONSTRAINT FK_TTLR_PSSS` sobre algo inexistente. El script murió antes, en el
> 5.1, por privilegios sobre el esquema `SCP`. **La base quedó intacta.**

> ⚠️ **REGLA PERMANENTE: la tabla de países es `CRD.PSSS`, siempre. Nunca `SCP.PSSS`.**
> La entidad vive en el paquete `scp` pero mapea `@Table(schema = "CRD")`: **paquete y esquema no
> coinciden a propósito.** Quien lo "corrija" rompe producción. La migración de esquema está
> descartada y no se vuelve a proponer.

#### Lo resuelto

El **movimiento de paquetes**, aplicado y vigente:

| Antes | Ahora |
|---|---|
| `com.saa.model.crd.Pais` | `com.saa.model.scp.Pais` |
| `com.saa.ejb.crd.dao/daoImpl.PaisDao*` | `com.saa.basico.ejb/ejbImpl.PaisDao*` |
| `com.saa.ejb.crd.service/serviceImpl.Pais*` | `com.saa.basico.ejb/ejbImpl.Pais*` |
| `com.saa.ws.rest.crd.PaisRest` | `com.saa.ws.rest.basico.PaisRest` |
| `NombreEntidadesCredito.PAIS` | `NombreEntidadesSistema.PAIS` |

El grep de la §1 sobre `model/tsr`, `model/cxp`, `model/cnt`, `model/cxc`, `ejb/tsr`,
`ejb/cxp`, `ejb/cnt`, `ejb/cxc` y `basico` **devuelve vacío, sin excepciones toleradas**.
El `@Path("psss")` no cambió, así que la URL sigue igual y las pantallas `titulares` y
`titulares-v2` no se tocaron.

#### Lo pendiente

**La tabla se quedó en `CRD.PSSS`.** La migración a `SCP.PSSS` se intentó en producción el
2026-08-24, **falló**, y se decidió no reintentarla por ahora. Se revirtió **solo** el
`@Table` de la entidad; el movimiento de paquetes se conservó porque el arreglo de compilación
no depende del esquema.

> ⚠️ **Consecuencia deliberada: `com.saa.model.scp.Pais` mapea `CRD.PSSS`.** Paquete y esquema
> no coinciden. Está explicado en el JavaDoc de la entidad y en `docs/MODELO-DATOS.md`.
> **No "arreglarlo"** moviendo la clase de vuelta a `crd`: eso reintroduce la fuga de
> compilación.

Mientras la FK siga ahí, arrancar `crd` deja una FK huérfana en `tsr`. **No bloquea esta
funcionalidad**, pero sigue bloqueando el objetivo de comercialización de la §1.

El punto de partida para retomarlo es `docs/general/sql/MIGRACION-PAIS-CRD-A-SCP.md`, marcada
**NO APLICADA** y con la advertencia de no correr nada hasta que el árbitro cierre el
diagnóstico del estado real de producción tras el intento fallido.

#### Frontend

`tsr/model/titular.ts` importa `Pais` desde `shared/`. Movimiento ya hecho y **correcto tal
como quedó**: el frontend no sabe nada de esquemas de base, así que la reversión del `@Table`
no lo afecta. Nada que revertir ahí.

### Supuestos abiertos — confirmar con negocio antes de producción

- **El mapeo tipo de aporte → producto de pago (`TPAPPRDP`) es parametrización que carga el
  usuario.** Sin él no se puede registrar una devolución de ese tipo. Hay que definir qué producto
  y qué cuenta contable corresponde a cada tipo.
- **Se asume que se puede devolver hasta el saldo neto disponible del tipo, sin más reglas.** Si el
  fondo tiene reglas de negocio (solo cesantes, solo con préstamos cancelados, retención de
  desgravamen, tope por reglamento), no están contempladas y hay que agregarlas en la §8.1.
- ~~**`CRD.CSNT` (Cesantía) ya modela una liquidación al partícipe.** Si la devolución de aportes
  es en realidad el pago de una liquidación de cesantía, hay que unificarlos antes de seguir.~~
  **RESUELTO el 2026-08-24: no se usa `CSNT`.** Ver §10.1.

---

## 11. Tablero de avance

| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| 0 — Cimientos | **Entregada** | 2026-08-24 | DDL escrito (sin ejecutar), 3 entidades nuevas, 2 ampliadas, rubros y las 5 capas por tabla |
| 1 — CXP origen externo | **Entregada** | 2026-08-24 | `registrarPagoDeOrigenExterno`, contabilización y reversión, las 3 ramas, formateador. `generarLote` **no requirió cambios** (ver §12.2) |
| 2 — CRD registro | **Entregada** | 2026-08-24 | `registrarDevolucion` + `POST /dvap/registrar` + `GET /dvap/porEntidad` |
| 3 — CRD reconciliación | **Entregada** | 2026-08-24 | `sincronizarPagos`, timer cada 30 min, `POST /dvap/sincronizar`, `POST /dvap/anular` |
| 4 — FE pantalla | **Entregada** | 2026-08-24 | Modelos, servicio, componente con signals, diálogo de confirmación, ruta y menú |
| 5 — FE CXP | Pendiente | — | Desbloqueada: su precondición (fase 1) está entregada |
| 6a — BE aviso de deuda | **Entregada** | 2026-08-24 | `GET /dvap/deudaVigente/{idEntidad}` (§6.5) + `PrestamoDaoService.selectVigentesByEntidad`. Informativo: `registrarDevolucion` **no se tocó** (ver §12.4) |
| 6b — FE aviso de deuda | **Entregada** | 2026-08-24 | Bloque rojo en el diálogo de confirmación. Queda la línea gris del caso "no se pudo consultar", ratificada en §6.5 |
| 7 — BE contabilidad opcional | **Entregada** | 2026-08-24 | §6.5.b. Desglose y `TPAPPRDP` opcionales, regla todo-o-nada, `contabilizarPagoOrigenExterno` devuelve `null` sin desglose. Controles de regularización en el DDL (ver §12.8) |

> **El documento del backend es el autoritativo.** El árbitro lo espeja a `saaFE/docs/crd/`
> después de cada cambio del tablero, sobrescribiendo la copia del frontend. Si el agente de
> frontend anota una fase en su copia, esa anotación se pierde en el siguiente espejo: el
> árbitro la traslada a mano. Los agentes igual deben anotar; es el árbitro quien consolida.

> Las fases 0 a 3 quedan **entregadas pero sin probar**: no se compiló (el usuario compila en
> Eclipse) ni se ejecutó el DDL. Los criterios de aceptación de la §9 requieren la base
> migrada y el WAR desplegado. **El DDL va ANTES del WAR**: las entidades ya mapean las
> columnas nuevas y el arranque falla si no existen.

---

## 12. Estado de implementación

Registro de lo implementado y de las decisiones tomadas al construirlo. Mismo formato que la
§12 de `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md`.

**Nada de esto se compiló ni se ejecutó**: `mvn` no está en el PATH de este entorno y el
usuario compila en Eclipse. Todo lo que sigue es código escrito y revisado contra las
entidades reales, no verificado por el compilador.

### Fase 0 — Cimientos (2026-08-24)

**Script de base de datos (ejecución manual, NO ejecutado):**

- `docs/logica-negocio/crd/sql/DDL-DEVOLUCION-APORTES.sql` — la §4 completa: ALTER de
  `PGS.PGTR` (8 columnas + 2 FK + índice), `PGS.DPGT`, `CRD.DVAP`, `CRD.DDVA`, ALTER de
  `CRD.TPAP`, comentarios de tabla y columna, grants y nueve controles posteriores.

**Verificaciones hechas contra el código antes de escribir el DDL** (la entidad es la
autoridad, no el documento):

- `CNT.ASNT` / PK `ASNTCDGO` — confirmado en `com.saa.model.cnt.Asiento`
  (`@Table(name = "ASNT", schema = "CNT")`, `@Column(name = "ASNTCDGO")`). La FK
  `FK_PGTR_ASNT` de la §4.1 es correcta tal como estaba escrita.
- `TSR.BEXT` / PK `BEXTCDGO` — confirmado en `com.saa.model.tsr.BancoExterno`.
- La PK de `PGS.PRDP` **se llama `ID`**, no `PRDPCDGO` — confirmado en
  `com.saa.model.cxp.ProductoPago` (`@Id @Column(name = "ID")`). La FK `FK_DPGT_PRDP`
  referencia `PGS.PRDP(ID)`.

**Rubros nuevos:**

- `com.saa.rubros.EstadoDevolucionAporte` — REGISTRADA(1), EN_PAGO(2), PAGADA(3),
  RECHAZADA(4), ANULADA(5).
- `com.saa.rubros.OrigenPagoExterno` — `CRD_DEVOLUCION_APORTE`. Vive en `com.saa.rubros` y
  no en `com.saa.ejb.cxp` justamente porque es solo un literal: ninguna clase de CXP importa
  nada de CRD. Al retirar `crd` se borra la constante y nada deja de compilar.
- `com.saa.rubros.TipoAsientos` += `PAGO_ORIGEN_EXTERNO = 5` (reutiliza el `codigoAlterno`
  TEGRESO, igual que `EGRESO_TESORERIA`, `ANTICIPOS_PROVEEDOR` y `PAGO_TRANSFERENCIA_CXP`).
  No hace falta fila nueva de `TipoAsiento` en BD.

**Entidades JPA nuevas:**

- `com.saa.model.cxp.DetallePagoOrigenExterno` (PGS.DPGT)
- `com.saa.model.crd.DevolucionAporte` (CRD.DVAP)
- `com.saa.model.crd.DetalleDevolucionAporte` (CRD.DDVA)

**Entidades JPA modificadas:**

- `PagoProgramado` += `origenExterno` (PGTRORGN), `idOrigen` (PGTRIDOR), `asiento`
  (PGTRASNT → `@ManyToOne` a `cnt.Asiento`), `beneficiarioNombre` (PGTRBFNM),
  `beneficiarioIdentificacion` (PGTRBFID), `beneficiarioBanco` (PGTRBFBC → `@ManyToOne` a
  `tsr.BancoExterno`), `beneficiarioTipoCuenta` (PGTRBFTP), `beneficiarioCuenta` (PGTRBFCT).
- `TipoAporte` += `productoPago` (TPAPPRDP), como `Long` suelto: **sin `@ManyToOne` a
  `ProductoPago`**, para no atar el esquema PGS desde CRD ni a nivel de FK ni a nivel de JPA.
- `NombreEntidadesCompra` += `DETALLE_PAGO_ORIGEN_EXTERNO`.
- `NombreEntidadesCredito` += `DEVOLUCION_APORTE`, `DETALLE_DEVOLUCION_APORTE`.

**Capas nuevas (5 archivos por tabla: entidad + Dao/DaoImpl + Service/ServiceImpl):**

- `DetallePagoOrigenExternoDaoService`/`Impl` (`selectByPago`),
  `DetallePagoOrigenExternoService`/`Impl`.
- `DevolucionAporteDaoService`/`Impl` (`selectByEntidad`, `selectPendientesConciliacion`,
  `selectPendientesConciliacionByEntidad`), `DevolucionAporteService`/`Impl`.
- `DetalleDevolucionAporteDaoService`/`Impl` (`selectByDevolucion`, `selectByDevoluciones`),
  `DetalleDevolucionAporteService`/`Impl`.

**Decisión: sin clase REST para `DPGT` ni para `DDVA`.** La §6 del plan define endpoints solo
para `dvap`, y el encargo prohíbe agregar endpoints que no estén ahí. Ninguna de las dos
tablas se consulta ni se edita por separado: `DPGT` la lee la contabilización de CXP y `DDVA`
viaja dentro del listado de devoluciones. Las cinco capas quedan completas igual.

**Método DAO nuevo sobre un DAO existente:**

- `PagoProgramadoDaoService.selectVigentesByOrigen(String origen, Long idOrigen)` — mismo
  patrón que `selectVigentesByEgreso` / `selectVigentesByAnticipo`. `obtieneCampos()` se
  amplió con los ocho campos nuevos.

### Fase 1 — CXP origen externo (2026-08-24)

**DTOs nuevos** en `com.saa.ejb.cxp.service.dto`: `BeneficiarioOcasional`,
`LineaContablePago`. POJOs planos con getters/setters a mano.

**`PagoProgramadoService.registrarPagoDeOrigenExterno(...)`** con la firma de la §5.1.
Validaciones, en orden: origen e idOrigen presentes → no existe otro pago vigente con el
mismo par `(origen, idOrigen)` → cuenta de origen existe → beneficiario con nombre e
identificación, y con banco y cuenta salvo débito automático → desglose no vacío, cada línea
con producto y valor > 0, cada producto con `grupoProducto.planCuenta` (validado **al
registrar**, mismo criterio que `EgresoServiceImpl.validaProducto`) → `Σ desglose == valor`
con tolerancia 0.01.

El pago se graba **sin `titular` ni `cuentaDestino`**: el beneficiario va denormalizado en los
campos `PGTRBF*`. Con débito automático nace CONFIRMADO y contabiliza en la misma llamada.

**`contabilizarPagoOrigenExterno(PagoProgramado, Long)`** (privado): una línea DEBE por cada
`DPGT` con la cuenta del grupo de su producto, más **una sola** línea HABER a la cuenta
contable del banco por el total; `generarAsiento(..., TipoAsientos.PAGO_ORIGEN_EXTERNO, ...,
(long) ModuloSistema.CUENTAS_POR_PAGAR)`; movimiento bancario
`TRANSFERENCIAS_DEBITOS_EN_TRANSITO` / `PAGOS`; y `pago.setAsiento(asiento)` — la única
diferencia con los otros orígenes, porque no hay documento de CXP donde colgarlo.

Antes de generar el asiento se revalida que la suma de los `DPGT` iguale el valor del pago:
**no se genera un asiento descuadrado**, ni siquiera si alguien tocó `PGS.DPGT` por fuera.

**`revertirContabilidadOrigenExterno(PagoProgramado, String)`** (privado): anula el
movimiento bancario, anula el asiento y hace `pago.setAsiento(null)`. Copiado de
`revertirContabilidadEgreso`. **No toca el documento de origen**: CXP no lo conoce.

**Las tres ramas de if/else**, con `pago.getOrigenExterno() != null` **primero**, antes de
anticipo y de egreso:

- `procesarRespuestaBanco` — `PagoProgramadoServiceImpl`, rama de confirmación del banco.
- `confirmarPagosManual` — misma discriminación.
- `revertirPagoConfirmado` — llama a `revertirContabilidadOrigenExterno`.

**`FormateadorArchivoBancoPlanoImpl.generarContenido`**: si `cuentaDestino` es null y hay
beneficiario ocasional (`PGTRBFCT` no vacío), toma identificación, banco, tipo y número de
los campos `PGTRBF*`; si no hay ninguno de los dos, el mensaje de error de siempre. El
helper `nombreTitular` pasó a `nombreBeneficiario`, con la misma caída.

#### 12.2 `generarLote` no requirió ningún cambio

El plan (§5.1) pide caer al beneficiario ocasional "igual en `generarLote`". Contrastado
contra el código: **`generarLote` nunca valida `cuentaDestino`**. Sus cuatro validaciones son
débito automático, estado REGISTRADO, coincidencia de la cuenta bancaria de origen y
existencia del pago (`PagoProgramadoServiceImpl.generarLote`). La única exigencia de cuenta
de destino vivía en el formateador, y ahí se cambió. Un pago de origen externo con
beneficiario ocasional entra al lote sin tocar nada más.

Se deja anotado en vez de silenciarlo: quien lea la §5.1 esperando un cambio en `generarLote`
no lo va a encontrar, y no es un olvido.

#### 12.3 Resultado del grep obligatorio de la §9

```
grep -rn "com\.saa\.\(ejb\|model\)\.crd" src/main/java/com/saa/ejb/cxp \
  src/main/java/com/saa/ejb/tsr src/main/java/com/saa/ejb/cnt \
  src/main/java/com/saa/model/cxp src/main/java/com/saa/model/tsr src/main/java/com/saa/model/cnt
```

```
src/main/java/com/saa/model/tsr/Titular.java:13:import com.saa.model.crd.Pais;
```

**No devuelve vacío, y la única línea que devuelve es PREEXISTENTE**: ningún archivo de esta
implementación aparece. Restringido a los catorce archivos creados o modificados en las fases
0 y 1, el mismo grep devuelve vacío.

`com.saa.model.tsr.Titular` tiene `@ManyToOne private Pais pais` (líneas 13, 199, 542, 550)
apuntando a `com.saa.model.crd.Pais`. Es una violación real de la §1 —al retirar `crd`,
`Titular` no compila— pero **es anterior a este trabajo y su arreglo no es una decisión de
implementación**: hay que resolver dónde vive el catálogo de países (moverlo a `scp`,
duplicarlo en `tsr`, o denormalizar el campo), y eso arrastra DDL, migración de datos y
cualquier pantalla que hoy lo consuma.

**Queda reportado al árbitro y sin tocar.** La §1 del plan afirma que hoy no hay referencias
`cxp|tsr|cnt → crd`; esa afirmación es incorrecta en este punto y conviene corregirla en el
documento maestro del producto comercial.

### Fase 2 — CRD registro (2026-08-24)

**DTOs nuevos** en `com.saa.ejb.crd.service.dto`: `SolicitudDevolucionAporte`,
`DetalleSolicitudDevolucion`, `ResultadoDevolucionAporte`, `DetalleResultadoDevolucion`,
`ResumenDevolucionAporte`, `DetalleResumenDevolucion`, `SolicitudAnulacionDevolucion`,
`ResultadoSincronizacion`. POJOs planos con getters/setters a mano.

**`DevolucionAporteService.registrarDevolucion`**, una sola transacción `REQUIRED`, siguiendo
la secuencia de la §5.2 y las validaciones de la §8.1 en su orden exacto. Puntos que importan:

- Las filas de `CRD.APRT` nacen con `valor = -monto`, `valorPagado = 0.0`, `saldo = 0.0`,
  `estado = 4 (PAGADA)`, y se graban con **`aporteDaoService.save(aporte, null)` directo**.
  Con `saldo = 0` y ese estado son invisibles para `selectMinAporteConSaldo`, que exige
  `saldo > 0.01` y estado PARCIAL: el archivo de descuentos no vuelve a cobrárselas al socio.
- El `PagoAporte` lleva el valor en **positivo** (la magnitud), la misma glosa y `estado = 1`.
- **Guardarraíl anti-carrera**: el saldo se valida dos veces. Una en el bloque de validación
  (§8.1 paso 7) y otra **dentro de la transacción, inmediatamente antes de insertar cada fila
  negativa**. Es el mismo guardarraíl del paso 3a de `pagarConAportes`.
- Si `registrarPagoDeOrigenExterno` lanza, la excepción se reetiqueta como
  `ERROR_ORDEN_PAGO` conservando el mensaje accionable de CXP, y **la transacción revierte
  también los aportes negativos**: no quedan negativos huérfanos sin orden de pago.
- El saldo se lee siempre por `saldoAporteService.saldoPorEntidadYTipo`, nunca bajando filas.

**Beneficiario ocasional**: se arma con `entidad.getRazonSocial()` /
`entidad.getNumeroIdentificacion()` y con banco, tipo y número de la `CuentaBancariaParticipe`
elegida. El partícipe **no se convierte en `TSR.Titular`**.

**`DevolucionAporteRest`** `@Path("dvap")`, con el sobre `{ exito, etapa, mensaje, error,
resultado }` y el mapeo de códigos a HTTP de la §6. `422` va como literal
(`HTTP_REGLA_DE_NEGOCIO = 422`) porque no existe en el enum `Response.Status`.

- `POST /rest/dvap/registrar` → 201.
- `GET /rest/dvap/porEntidad/{idEntidad}` → 200. **Lista vacía es 200 con `[]`**, no error:
  no se replicó el patrón `IncomeException`-si-vacío del CRUD genérico.

El `cuentaDestino` del listado (`"PICHINCHA · AHORROS · 2200****91"`) se arma en la capa REST:
el nombre del tipo de cuenta sale de
`DetalleRubroDaoService.selectDescripcionByRubAltDetAlt(Rubros.TIPO_CUENTAS_BANCARIAS, ...)`,
y si el catálogo no lo resuelve se cae al código crudo — una etiqueta faltante no debe romper
el listado. El número se enmascara dejando los primeros cuatro y los últimos dos caracteres.

### Fase 3 — CRD reconciliación (2026-08-24)

**`sincronizarPagos()`** con el patrón exacto de `ProcesoMoraPrestamoServiceImpl`:
orquestador en `NOT_SUPPORTED`, auto-inyección `@EJB private DevolucionAporteService self`, y
cada devolución en su propia transacción `REQUIRES_NEW` a través del proxy. Una devolución con
datos malos no aborta el lote; se cuenta en `conError` y se detalla (tope de 50 errores).

**`sincronizarDevolucion(Long)`** — `REQUIRES_NEW`, es la unidad de trabajo. Lee el
`PagoProgramado` con `pagoProgramadoDaoService.find(...)` (crd → cxp, dirección permitida) y:

| Estado del pago | Efecto sobre la devolución |
|---|---|
| 3 CONFIRMADO | → PAGADA(3), `fechaPago = pago.fechaRespuesta`, `numeroAsiento = pago.asiento.codigo` |
| 4 RECHAZADO / 5 ANULADO | contra-movimientos (§8.3) y → RECHAZADA(4) |
| pago inexistente | se deja como está, se cuenta como huérfana y se loguea |
| resto | sin cambios |

**Idempotencia, por dos vías independientes**: una DVAP que ya está en 3, 4 o 5 sale del
universo de `selectPendientesConciliacion` y además se descarta al entrar a
`sincronizarDevolucion`; y `generarContraMovimientos` saltea todo detalle que ya tenga
`DDVAAPRV`. Correr `sincronizar` dos veces seguidas devuelve `evaluadas = 0`.

**Contra-movimientos (§8.3)**: por cada `DDVA` sin `DDVAAPRV`, una fila **positiva** nueva en
`CRD.APRT` (`valor = +DDVAVLRR`, `valorPagado = 0.0`, `saldo = 0.0`, `estado = 4`, glosa
`"REVERSO DEVOLUCION {id} - {causa}"`), grabada también con el DAO directo; se estampa
`DDVAAPRV` y el `PagoAporte` original pasa a `estado = 0`. **Nunca se borra ni se edita la
fila negativa**: `CRD.APRT` es append-only para los reportes, y el G43 liquida cesantes
leyendo explícitamente los negativos del mes.

**`ProcesoDevolucionAporteTimer`** — `@Singleton`,
`@Schedule(hour = "*", minute = "*/30", second = "0", persistent = false)`, atrapa
`Throwable`. Copiado de `ProcesoMoraPrestamoTimer`, con la misma justificación de
`persistent = false`.

**`anularDevolucion(idDevolucion, motivo, usuario)`** — `REQUIRED`. Orden deliberado: primero
se resuelve la orden de pago y solo después se tocan los aportes, para que un fallo de CXP
deje todo como estaba.

- Estado PAGADA → 409 `DEVOLUCION_YA_PAGADA` con el mensaje de la §6.3.
- Estado ANULADA → 409 `DEVOLUCION_YA_ANULADA`.
- Pago CONFIRMADO (aunque la DVAP diga otra cosa: el estado podía estar desactualizado) →
  409 `DEVOLUCION_YA_PAGADA`.
- Pago EN_ARCHIVO → 409 `ESTADO_NO_PERMITE`. **Decisión tomada acá**: el archivo ya está en
  poder del banco y todavía puede ejecutarse. Es el mismo criterio de
  `EgresoServiceImpl.anularEgreso`, que bloquea la anulación hasta procesar la respuesta.
- Pago REGISTRADO → `pagoProgramadoService.anularPago(...)`; si falla, `ERROR_ORDEN_PAGO`.
- Después: contra-movimientos, y la DVAP a ANULADA(5) con usuario, fecha y motivo.

**Endpoints**: `POST /rest/dvap/anular/{idDevolucion}` y `POST /rest/dvap/sincronizar`.

### Decisiones tomadas durante la implementación

1. **`TipoAporte.productoPago` es un `Long`, no un `@ManyToOne`.** El DDL de la §4.5 pide la
   columna sin FK; mapearla como relación JPA volvería a atar `CRD.TPAP` al esquema `PGS`
   por la puerta de atrás, aunque la base no lo exigiera.
2. **`OrigenPagoExterno` vive en `com.saa.rubros`**, no en `com.saa.ejb.cxp.service`. Es una
   constante compartida, y el paquete de rubros ya es el lugar donde el proyecto pone las
   etiquetas transversales. Borrarla al retirar `crd` es un cambio de una línea.
3. **`ERROR_ORDEN_PAGO` envuelve, no reemplaza.** Cuando CXP rechaza el registro de la orden
   (producto sin cuenta contable, cuenta de origen inexistente), el mensaje de CXP es el
   accionable; se le antepone el código estable en vez de sustituirlo por uno genérico.
4. **`listarPorEntidad` reconcilia pero no falla si la reconciliación falla.** Corre en
   `NOT_SUPPORTED` y cada devolución pendiente pasa por `self.sincronizarDevolucion` dentro
   de un `try/catch`: un problema de conciliación no debe impedir que el usuario vea su
   listado.
5. **El desglose contable se revalida antes de generar el asiento**, no solo al registrar.
   Un descuadre entre `PGS.DPGT` y `PGTRVLOR` aborta la contabilización con un mensaje claro
   en vez de producir un asiento descuadrado.

### Lo que queda sin verificar

- **Nada se compiló.** `mvn` no está en el PATH; el usuario compila en Eclipse.
- **El DDL no se ejecutó** y debe correr ANTES de desplegar el WAR.
- **Parametrización pendiente**: sin `CRD.TPAP.TPAPPRDP` cargado, toda devolución falla con
  `TIPO_APORTE_SIN_PRODUCTO`. El control 7.6 del script de DDL lista exactamente qué tipos de
  aporte vigentes están sin producto.
- Los criterios de aceptación de las fases 0-3 (§9) requieren la base migrada y el WAR
  desplegado; ninguno se ejecutó.

### Fase 6a — BE aviso de deuda (2026-08-24)

**DTOs nuevos** en `com.saa.ejb.crd.service.dto`: `DeudaVigenteParticipe`, `DeudaPrestamo`.
POJOs planos con getters/setters a mano.

**Método DAO nuevo**: `PrestamoDaoService.selectVigentesByEntidad(Long codigoEntidad)` + su
Impl, con JavaDoc en la interfaz y el estilo del DAO (traza `System.out.println`, absorber la
excepción devolviendo lista vacía).

**Endpoint** `GET /rest/dvap/deudaVigente/{idEntidad}` en `DevolucionAporteRest`, con el mismo
sobre `{ exito, etapa, resultado }` de los otros cuatro. Sin préstamos vigentes: **200** con
`totalDeuda: 0`, `cantidadPrestamos: 0` y `prestamos: []`. Nunca error, nunca
`IncomeException` por lista vacía.

#### 12.4 Lo que este endpoint NO hace, y es deliberado

- **No se agregó ninguna validación a `registrarDevolucion`.** El servicio no cambió: `grep`
  de `DEUDA` sobre `DevolucionAporteService` y su Impl devuelve 0 coincidencias.
- **No existe ningún código de error `DEUDA_PENDIENTE` ni parecido.** El mapeo de errores de
  la §6 quedó igual.
- **No se tocó ningún préstamo, cuota ni pago.** Todo el endpoint es lectura:
  `selectVigentesByEntidad`, `calcularTotalPendientePrestamo` y `selectCuotasVencidasByPrestamo`.
  `MotorPagoPrestamoServiceImpl` no se modificó: solo se le invoca un método de cálculo.

#### 12.5 Trampas del endpoint, y cómo quedaron resueltas

| Trampa | Resolución |
|---|---|
| Estado del préstamo | Se filtra por **`idEstado` (PRSTIDST)**. `estadoPrestamo` (ESPSCDGO) no se menciona en ninguna línea del código nuevo |
| Terminales fuera | `NOT IN (3 CANCELADO, 4 CANCELADO_ANTICIPADO, 5 CANCELADO_POR_NOVACION)`, por las constantes del rubro `EstadoPrestamo`, no por literales |
| Saldo por préstamo | `motorPagoPrestamoService.calcularTotalPendientePrestamo(id)`. **No se suma `DTPRTTLL`**, que desde el 2026-08-14 ya incluye la mora y la contaría dos veces |
| `cuotasVencidas` | Se reutiliza `DetallePrestamoDaoService.selectCuotasVencidasByPrestamo(id, corte)`, cuyo JPQL ya es exactamente `(estado IS NULL OR estado NOT IN (4,7)) AND fechaVencimiento < corte`. Al ser el mismo método del proceso diario de mora, los números coinciden entre pantallas por construcción, no por copia |
| `TRUNC(SYSDATE)` | `LocalDate.now().atStartOfDay()` |
| Etiquetas cruzadas | `nombreEstadoPrestamo` sale del rubro `EstadoPrestamo`: **8 = DE PLAZO VENCIDO, 11 = EN MORA**. El JavaDoc equivocado de `countVigentesMoraVencidosByEntidad` no se copió, y queda una nota en el helper advirtiéndolo |
| Errores por préstamo | El saldo y el conteo de cuotas van cada uno en su `try/catch`. Un préstamo con datos malos **igual aparece en el aviso**, con lo que se pudo calcular y el rastro en el log; no se lo descarta, porque ocultarlo sería peor que mostrarlo incompleto |

#### 12.6 Decisión tomada: el `idEstado` nulo entra al aviso

La §6.5 dice `PRSTIDST NOT IN (3, 4, 5)`. Escrito así de literal, un préstamo con `PRSTIDST`
nulo **quedaría fuera en silencio**: en SQL y en JPQL, `NULL NOT IN (...)` evalúa a `NULL` y la
fila no entra.

El JPQL quedó como `(p.idEstado IS NULL OR p.idEstado NOT IN (3, 4, 5))`. Razones:

1. La intención de la §6.5 es "todos menos los tres terminales", y un estado sin poblar no es
   un estado terminal.
2. Es el mismo patrón que ya usa el criterio de cuotas vencidas del proceso de mora
   (`d.estado IS NULL OR d.estado NOT IN (...)`), así que no introduce una forma nueva.
3. En un **aviso**, subreportar deuda es peor que sobrereportarla: el costo de mostrar de más
   es que el operador vea un préstamo que quizá no debía; el de mostrar de menos es que
   devuelva aportes creyendo que no hay deuda.

Queda anotado por si se prefiere la lectura literal: es un `OR` de una línea en
`PrestamoDaoServiceImpl.selectVigentesByEntidad`.

#### 12.7 Sin verificar

No se compiló ni se ejecutó nada. El endpoint vive en `DevolucionAporteRest`, así que depende
de que `CRD.DVAP` exista: el DDL de la fase 0 sigue sin correrse.

### Fase 7 — BE contabilidad opcional (2026-08-24)

Implementa la §6.5.b. **No se borró nada de la lógica de contabilización**: se volvió
condicional. El día que `CRD.TPAP.TPAPPRDP` tenga valor, el asiento y el movimiento bancario
vuelven solos, sin tocar una línea de código.

#### 12.8 Lado CRD — `DevolucionAporteServiceImpl.registrarDevolucion`

La validación del paso 5 de la §8.1 dejó de ser incondicional. Ahora el recorrido de tipos solo
**anota** cuáles no tienen `TPAPPRDP` (en `tiposSinProducto`), y la regla se resuelve al
terminar:

| Situación | Qué hace |
|---|---|
| Todos tienen `TPAPPRDP` | `contabiliza = true`; se arma el desglose y se manda a CXP |
| Ninguno tiene | `contabiliza = false`; se manda **`null`** como desglose y se loguea la advertencia |
| Algunos sí y otros no | `422 TIPO_APORTE_SIN_PRODUCTO`, **nombrando los tipos que faltan** |

El caso mezclado falla a propósito: un desglose parcial genera un asiento donde las líneas DEBE
suman menos que el HABER al banco, y **un asiento descuadrado es peor que no tener asiento**.

**Convención elegida para "sin desglose": `null`, no lista vacía.** Está anotado en el punto de
la llamada. CXP igual acepta las dos formas (`desglose == null || desglose.isEmpty()`), pero del
lado de CRD hay una sola forma de decirlo.

#### 12.9 Lado CXP — `PagoProgramadoServiceImpl`

1. **`registrarPagoDeOrigenExterno`**: el desglose dejó de ser obligatorio. La validación de
   productos con `planCuenta` y la de `Σ desglose.valor == valor` (tolerancia 0.01) quedaron
   dentro de `if (tieneDesglose)`. Sin desglose no se crea ninguna fila de `PGS.DPGT` y se
   escribe una traza de advertencia.

2. **`contabilizarPagoOrigenExterno`**: si el pago no tiene filas en `PGS.DPGT`, **no genera
   asiento ni movimiento bancario**, deja `PGTRASNT` en null, escribe
   `"Pago X confirmado SIN contabilidad: no tiene desglose contable"` con origen, idOrigen y
   valor, y **devuelve `null`**. El chequeo del desglose se movió ANTES del de la cuenta
   contable del banco: sin contabilidad, que el banco no tenga `planCuenta` deja de importar.
   El pago igual pasa a CONFIRMADO — lo confirma el banco, no el asiento.

3. **Las tres ramas de if/else**: revisadas una por una.
   - `procesarRespuestaBanco` y `confirmarPagosManual` ya **descartaban** el retorno, así que no
     había NPE. Se les agregó el comentario de que el retorno puede ser nulo y se descarta a
     propósito.
   - La rama de **débito automático** de `registrarPagoDeOrigenExterno` **sí leía**
     `asiento.getNumeroAlterno()` para el log y para la respuesta: ahí estaba el
     `NullPointerException`. Ahora bifurca, y sin asiento devuelve `sinContabilidad: true` y un
     mensaje que lo dice.
   - `revertirPagoConfirmado` delega en `revertirContabilidadOrigenExterno`, resuelto en el
     punto 4.

4. **`revertirContabilidadOrigenExterno`**: sale temprano y limpio si `PGTRASNT` es nulo,
   dejando la traza. No anula movimiento, no anula asiento, no lanza. El pago igual queda
   RECHAZADO o ANULADO: eso lo decide `revertirPagoConfirmado`, no este método.

#### 12.10 Lado CRD — el reconciliador

Revisado, **sin cambios de comportamiento necesarios**: `aplicarPagado` ya hacía
`(pago.getAsiento() != null) ? ... : null`, así que no había NPE, y `sincronizarDevolucion`
contaba `marcadasPagadas`, nunca `conError`. Con `PGTRASNT` nulo, `DVAPNMAS` queda nulo y la
devolución pasa igual a **3 PAGADA**.

Lo que sí se cambió es que quede dicho: el JavaDoc de `aplicarPagado` explica que
`numeroAsiento` nulo no es un error, y la traza imprime `(sin contabilidad)` en vez de `null`.

#### 12.11 Controles de regularización, en el DDL

Se agregó la sección 8 a `docs/logica-negocio/crd/sql/DDL-DEVOLUCION-APORTES.sql`:

- **8.1** — pagos de origen externo CONFIRMADOS con `PGTRASNT IS NULL`.
- **8.2** — devoluciones PAGADAS con `DVAPNMAS IS NULL`.
- **8.3** — conteo y **suma del dinero** que todavía no llegó a contabilidad. Es el número que
  hay que poder explicar antes de cerrar un período.

No se agregó ninguna columna: `PGTRASNT IS NULL` en un pago CONFIRMADO de origen externo **es**
la marca.

#### 12.12 Lo que se está aceptando, dicho de frente

Sin desglose no hay asiento, **y sin asiento tampoco hay movimiento bancario**:
`creaMovimientoPorTransferencia` recibe el `Asiento` como parámetro, así que los dos caen
juntos. Un pago confirmado en este estado **salió del banco y no queda registrado en ningún
lado más que en `PGS.PGTR`**: es invisible para la conciliación bancaria hasta que se
regularice.

Para una etapa de revisión de pantallas está bien. **Con dinero real no.** Por eso quedan los
tres controles del punto 12.11.
