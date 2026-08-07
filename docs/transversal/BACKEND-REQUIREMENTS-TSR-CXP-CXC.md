# Requerimientos Backend - Módulos TSR, CXP, CXC

## 📋 RESUMEN EJECUTIVO

Este documento especifica los cambios necesarios en el backend para completar la funcionalidad de los módulos de Tesorería (TSR), Cuentas por Pagar (CXP) y Cuentas por Cobrar (CXC).

**Fecha:** Julio 2026  
**Sistema:** SAA - Sistema Administrativo Automatizado  
**Módulos afectados:** TSR, CXP, CXC

---

## 🎯 PRIORIDADES DE DESARROLLO

### ✅ PRIORIDAD ALTA (Crítico - Implementar YA)
1. Secuencia de Numeración Mensual (TSR)
2. Caja Chica (TSR)
3. Proposición de Pago (CXP → TSR)
4. Estados adicionales para workflows

### ⚠️ PRIORIDAD MEDIA (Importante)
5. Servicio de carga masiva XML/TXT
6. Mejoras en servicios existentes

---

## 1️⃣ SECUENCIA DE NUMERACIÓN MENSUAL (TSR)

### 📝 Descripción
Sistema para generar números secuenciales de Ingresos/Egresos que se reinician cada mes.

### 🗄️ Tabla: TSR.SCNM (Secuencia Numeración)

```sql
CREATE TABLE TSR.SCNM (
    SCNMCDGO INTEGER NOT NULL,           -- Código PK
    SCNMEMPR INTEGER NOT NULL,           -- Empresa
    SCNMTPDC VARCHAR(20) NOT NULL,       -- Tipo documento: 'INGRESO', 'EGRESO', 'COBRO', 'PAGO'
    SCNMMES INTEGER NOT NULL,            -- Mes (1-12)
    SCNMANIO INTEGER NOT NULL,           -- Año (2024, 2025, etc.)
    SCNMULNM INTEGER DEFAULT 0,          -- Último número usado
    SCNMPFJO VARCHAR(10),                -- Prefijo opcional (ej: "ING-", "EGR-")
    SCNMSFJO VARCHAR(10),                -- Sufijo opcional
    SCNMLONG INTEGER DEFAULT 6,          -- Longitud del número (con ceros a la izquierda)
    SCNMSTDO INTEGER DEFAULT 1,          -- Estado: 1=Activo, 0=Inactivo
    SCNMFING TIMESTAMP,                  -- Fecha ingreso
    SCNMUSIG VARCHAR(50),                -- Usuario ingreso
    
    PRIMARY KEY (SCNMCDGO),
    FOREIGN KEY (SCNMEMPR) REFERENCES CNT.EMPRS(EMPRCDGO),
    UNIQUE (SCNMEMPR, SCNMTPDC, SCNMMES, SCNMANIO)
);

-- Secuencia
CREATE SEQUENCE TSR.SCNM_SEQ START WITH 1 INCREMENT BY 1;

-- Índices
CREATE INDEX IDX_SCNM_EMPR_TIPO ON TSR.SCNM(SCNMEMPR, SCNMTPDC, SCNMANIO, SCNMMES);
```

### 📊 Datos Iniciales

```sql
-- Configuración por defecto para una empresa
INSERT INTO TSR.SCNM (SCNMCDGO, SCNMEMPR, SCNMTPDC, SCNMMES, SCNMANIO, SCNMULNM, SCNMPFJO, SCNMLONG, SCNMSTDO) 
VALUES (1, 1, 'INGRESO', 1, 2026, 0, 'ING-', 6, 1);

INSERT INTO TSR.SCNM (SCNMCDGO, SCNMEMPR, SCNMTPDC, SCNMMES, SCNMANIO, SCNMULNM, SCNMPFJO, SCNMLONG, SCNMSTDO) 
VALUES (2, 1, 'EGRESO', 1, 2026, 0, 'EGR-', 6, 1);
```

### 🔧 Modelo Java (Backend)

```java
package ec.com.saa.modules.tsr.entities;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "SCNM", schema = "TSR")
public class SecuenciaNumeracion {
    
    @Id
    @Column(name = "SCNMCDGO")
    private Integer codigo;
    
    @Column(name = "SCNMEMPR", nullable = false)
    private Integer empresa;
    
    @Column(name = "SCNMTPDC", nullable = false, length = 20)
    private String tipoDocumento; // INGRESO, EGRESO, COBRO, PAGO
    
    @Column(name = "SCNMMES", nullable = false)
    private Integer mes;
    
    @Column(name = "SCNMANIO", nullable = false)
    private Integer anio;
    
    @Column(name = "SCNMULNM")
    private Integer ultimoNumero = 0;
    
    @Column(name = "SCNMPFJO", length = 10)
    private String prefijo;
    
    @Column(name = "SCNMSFJO", length = 10)
    private String sufijo;
    
    @Column(name = "SCNMLONG")
    private Integer longitud = 6;
    
    @Column(name = "SCNMSTDO")
    private Integer estado = 1;
    
    @Column(name = "SCNMFING")
    private LocalDateTime fechaIngreso;
    
    @Column(name = "SCNMUSIG", length = 50)
    private String usuarioIngreso;
    
    // Getters/Setters
}
```

### 🌐 Endpoints REST

```java
@RestController
@RequestMapping("/scnm")
public class SecuenciaNumeracionController {
    
    /**
     * Obtener siguiente número de secuencia (con incremento automático)
     * GET /scnm/siguiente?tipo=INGRESO&mes=7&anio=2026
     */
    @GetMapping("/siguiente")
    public ResponseEntity<String> obtenerSiguienteNumero(
        @RequestParam String tipo,
        @RequestParam Integer mes,
        @RequestParam Integer anio
    ) {
        // 1. Buscar secuencia existente
        // 2. Si no existe, crear nueva con ultimoNumero=0
        // 3. Incrementar ultimoNumero en 1
        // 4. Guardar cambio (con lock optimista)
        // 5. Retornar: prefijo + numero con ceros + sufijo
        // Ejemplo: "ING-000123"
    }
    
    /**
     * CRUD estándar
     */
    @GetMapping("/getAll")
    public ResponseEntity<List<SecuenciaNumeracion>> getAll() { }
    
    @GetMapping("/getId/{id}")
    public ResponseEntity<SecuenciaNumeracion> getById(@PathVariable Integer id) { }
    
    @PostMapping("/add")
    public ResponseEntity<SecuenciaNumeracion> add(@RequestBody SecuenciaNumeracion obj) { }
    
    @PutMapping("/update")
    public ResponseEntity<SecuenciaNumeracion> update(@RequestBody SecuenciaNumeracion obj) { }
    
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) { }
    
    /**
     * Reiniciar secuencia al iniciar nuevo mes
     * POST /scnm/reiniciar-mes?mes=8&anio=2026
     */
    @PostMapping("/reiniciar-mes")
    public ResponseEntity<Void> reiniciarMes(
        @RequestParam Integer mes,
        @RequestParam Integer anio
    ) {
        // Crear registros con ultimoNumero=0 para todos los tipos
    }
}
```

### 🔒 Consideraciones de Concurrencia

**IMPORTANTE:** El método `obtenerSiguienteNumero` debe usar **lock optimista** o **lock pesimista** para evitar números duplicados en ambientes con múltiples usuarios concurrentes.

```java
// Opción 1: Lock Optimista (JPA)
@Version
@Column(name = "SCNMVRSN")
private Integer version;

// Opción 2: Lock Pesimista (Query nativa)
@Query(value = "SELECT * FROM TSR.SCNM WHERE ... FOR UPDATE", nativeQuery = true)
```

---

## 2️⃣ CAJA CHICA (TSR)

### 📝 Descripción
Sistema para gestionar cajas chicas con gastos menores y reposiciones con generación de asiento contable.

### 🗄️ Tabla: TSR.CJCH (Caja Chica)

```sql
CREATE TABLE TSR.CJCH (
    CJCHCDGO INTEGER NOT NULL,           -- Código PK
    CJCHEMPR INTEGER NOT NULL,           -- Empresa
    CJCHNMBR VARCHAR(100) NOT NULL,      -- Nombre de la caja chica
    CJCHPLCT INTEGER NOT NULL,           -- Plan cuenta (FK a CNT.PLCT)
    CJCHSLDI DECIMAL(15,2) DEFAULT 0,    -- Saldo inicial
    CJCHSLAC DECIMAL(15,2) DEFAULT 0,    -- Saldo actual
    CJCHMXGS DECIMAL(15,2) DEFAULT 0,    -- Monto máximo por gasto individual
    CJCHRSPO INTEGER,                    -- Usuario responsable (FK a USRO)
    CJCHSTDO INTEGER DEFAULT 1,          -- Estado: 1=Activo, 0=Inactivo
    CJCHFING TIMESTAMP,                  -- Fecha ingreso
    CJCHUSIG VARCHAR(50),                -- Usuario ingreso
    CJCHFIAC TIMESTAMP,                  -- Fecha inactivación
    
    PRIMARY KEY (CJCHCDGO),
    FOREIGN KEY (CJCHEMPR) REFERENCES CNT.EMPRS(EMPRCDGO),
    FOREIGN KEY (CJCHPLCT) REFERENCES CNT.PLCT(PLCTCDGO),
    FOREIGN KEY (CJCHRSPO) REFERENCES USRO.USRO(USROCDGO)
);

CREATE SEQUENCE TSR.CJCH_SEQ START WITH 1 INCREMENT BY 1;
```

### 🗄️ Tabla: TSR.MVCH (Movimiento Caja Chica)

```sql
CREATE TABLE TSR.MVCH (
    MVCHCDGO INTEGER NOT NULL,           -- Código PK
    MVCHCJCH INTEGER NOT NULL,           -- Caja chica (FK)
    MVCHFCHA DATE NOT NULL,              -- Fecha del movimiento
    MVCHHORA TIME,                       -- Hora del movimiento
    MVCHTPMV INTEGER NOT NULL,           -- Tipo: 1=Gasto, 2=Reposición, 3=Ajuste
    MVCHCNCP VARCHAR(250) NOT NULL,      -- Concepto/descripción
    MVCHVLOR DECIMAL(15,2) NOT NULL,     -- Valor (positivo para reposición, negativo para gasto)
    MVCHNCMP VARCHAR(50),                -- Número de comprobante/factura
    MVCHBNFR INTEGER,                    -- Beneficiario (FK a TSR.TTLR)
    MVCHASNT INTEGER,                    -- Asiento contable (FK a CNT.ASNT) - Solo para reposición
    MVCHSTDO INTEGER DEFAULT 1,          -- Estado: 1=Activo, 0=Anulado
    MVCHRBRP INTEGER,                    -- Rubro motivo anulación P
    MVCHRBRH INTEGER,                    -- Rubro motivo anulación H
    MVCHFING TIMESTAMP,                  -- Fecha ingreso
    MVCHUSIG VARCHAR(50),                -- Usuario ingreso
    MVCHFANU TIMESTAMP,                  -- Fecha anulación
    MVCHUSNU VARCHAR(50),                -- Usuario anulación
    
    PRIMARY KEY (MVCHCDGO),
    FOREIGN KEY (MVCHCJCH) REFERENCES TSR.CJCH(CJCHCDGO),
    FOREIGN KEY (MVCHBNFR) REFERENCES TSR.TTLR(TTLRCDGO),
    FOREIGN KEY (MVCHASNT) REFERENCES CNT.ASNT(ASNTCDGO)
);

CREATE SEQUENCE TSR.MVCH_SEQ START WITH 1 INCREMENT BY 1;
CREATE INDEX IDX_MVCH_CAJA ON TSR.MVCH(MVCHCJCH, MVCHFCHA);
```

### 🗄️ Tabla: TSR.RCCH (Reposición Caja Chica)

```sql
CREATE TABLE TSR.RCCH (
    RCCHCDGO INTEGER NOT NULL,           -- Código PK
    RCCHCJCH INTEGER NOT NULL,           -- Caja chica
    RCCHFCHA DATE NOT NULL,              -- Fecha reposición
    RCCHVLOR DECIMAL(15,2) NOT NULL,     -- Valor total a reponer
    RCCHOBSV VARCHAR(500),               -- Observaciones
    RCCHASNT INTEGER,                    -- Asiento contable generado
    RCCHSTDO INTEGER DEFAULT 1,          -- Estado: 1=Pendiente, 2=Aprobado, 3=Rechazado, 4=Pagado
    RCCHFING TIMESTAMP,                  -- Fecha ingreso
    RCCHUSIG VARCHAR(50),                -- Usuario que solicita
    RCCHFAPR TIMESTAMP,                  -- Fecha aprobación
    RCCHUSAP VARCHAR(50),                -- Usuario que aprueba
    
    PRIMARY KEY (RCCHCDGO),
    FOREIGN KEY (RCCHCJCH) REFERENCES TSR.CJCH(CJCHCDGO),
    FOREIGN KEY (RCCHASNT) REFERENCES CNT.ASNT(ASNTCDGO)
);

CREATE SEQUENCE TSR.RCCH_SEQ START WITH 1 INCREMENT BY 1;
```

### 🗄️ Tabla: TSR.DRCH (Detalle Reposición Caja Chica)

```sql
CREATE TABLE TSR.DRCH (
    DRCHCDGO INTEGER NOT NULL,           -- Código PK
    DRCHRCCH INTEGER NOT NULL,           -- Reposición (FK)
    DRCHMVCH INTEGER NOT NULL,           -- Movimiento de caja chica (FK)
    DRCHVLOR DECIMAL(15,2) NOT NULL,     -- Valor del movimiento incluido
    
    PRIMARY KEY (DRCHCDGO),
    FOREIGN KEY (DRCHRCCH) REFERENCES TSR.RCCH(RCCHCDGO),
    FOREIGN KEY (DRCHMVCH) REFERENCES TSR.MVCH(MVCHCDGO)
);

CREATE SEQUENCE TSR.DRCH_SEQ START WITH 1 INCREMENT BY 1;
```

### 🔧 Modelos Java

```java
@Entity
@Table(name = "CJCH", schema = "TSR")
public class CajaChica {
    @Id @Column(name = "CJCHCDGO") private Integer codigo;
    @Column(name = "CJCHEMPR") private Integer empresa;
    @Column(name = "CJCHNMBR") private String nombre;
    @Column(name = "CJCHPLCT") private Integer planCuenta;
    @Column(name = "CJCHSLDI") private BigDecimal saldoInicial;
    @Column(name = "CJCHSLAC") private BigDecimal saldoActual;
    @Column(name = "CJCHMXGS") private BigDecimal montoMaximoGasto;
    @Column(name = "CJCHRSPO") private Integer responsable;
    @Column(name = "CJCHSTDO") private Integer estado;
}

@Entity
@Table(name = "MVCH", schema = "TSR")
public class MovimientoCajaChica {
    @Id @Column(name = "MVCHCDGO") private Integer codigo;
    @Column(name = "MVCHCJCH") private Integer cajaChica;
    @Column(name = "MVCHFCHA") private LocalDate fecha;
    @Column(name = "MVCHHORA") private LocalTime hora;
    @Column(name = "MVCHTPMV") private Integer tipoMovimiento; // 1=Gasto, 2=Reposición
    @Column(name = "MVCHCNCP") private String concepto;
    @Column(name = "MVCHVLOR") private BigDecimal valor;
    @Column(name = "MVCHNCMP") private String numeroComprobante;
    @Column(name = "MVCHBNFR") private Integer beneficiario;
    @Column(name = "MVCHASNT") private Integer asiento;
    @Column(name = "MVCHSTDO") private Integer estado;
}

@Entity
@Table(name = "RCCH", schema = "TSR")
public class ReposicionCajaChica {
    @Id @Column(name = "RCCHCDGO") private Integer codigo;
    @Column(name = "RCCHCJCH") private Integer cajaChica;
    @Column(name = "RCCHFCHA") private LocalDate fecha;
    @Column(name = "RCCHVLOR") private BigDecimal valor;
    @Column(name = "RCCHOBSV") private String observaciones;
    @Column(name = "RCCHASNT") private Integer asiento;
    @Column(name = "RCCHSTDO") private Integer estado; // 1=Pendiente, 2=Aprobado, 4=Pagado
}
```

### 🌐 Endpoints REST

```java
// Caja Chica - /cjch
@GetMapping("/getAll") // Listar todas las cajas chicas
@GetMapping("/getId/{id}") // Obtener por ID
@PostMapping("/add") // Crear nueva caja chica
@PutMapping("/update") // Actualizar
@DeleteMapping("/delete/{id}") // Eliminar (lógico)

// Movimientos - /mvch
@GetMapping("/getAll")
@GetMapping("/getByCajaChica/{idCajaChica}") // Movimientos de una caja
@GetMapping("/getPendientesReposicion/{idCajaChica}") // Gastos sin reponer
@PostMapping("/add") // Registrar gasto
@PutMapping("/anular/{id}") // Anular movimiento

// Reposición - /rcch
@GetMapping("/getAll")
@GetMapping("/getByCajaChica/{idCajaChica}")
@PostMapping("/crear") // Crear reposición con detalles
@PutMapping("/aprobar/{id}") // Aprobar reposición (genera asiento)
@PutMapping("/rechazar/{id}") // Rechazar
@PostMapping("/generar-asiento/{id}") // Generar asiento contable
```

### 💰 Lógica de Negocio - Reposición

**Proceso:**
1. Usuario registra gastos diarios (`MVCH` con `MVCHTPMV=1`)
2. Cuando saldo es bajo, se crea **Reposición** (`RCCH`)
3. Sistema busca gastos pendientes y los asocia (`DRCH`)
4. Al aprobar, genera **Asiento Contable**:
   ```
   DEBE: Gastos administrativos (según concepto)
   HABER: Caja chica (CJCHPLCT)
   ```
5. Actualiza `CJCHSLAC` sumando el valor

---

## 3️⃣ PROPOSICIÓN DE PAGO (CXP → TSR)

### 📝 Descripción
Sistema para programar pagos desde CXP hacia TSR, con aprobación por niveles y generación automática de pagos.

### 🗄️ Tabla: CXP.PRPG (Proposición Pago)

```sql
CREATE TABLE CXP.PRPG (
    PRPGCDGO INTEGER NOT NULL,           -- Código PK
    PRPGEMPR INTEGER NOT NULL,           -- Empresa
    PRPGFCSL TIMESTAMP NOT NULL,         -- Fecha solicitud
    PRPGFCPG DATE NOT NULL,              -- Fecha pago programado
    PRPGPRVD INTEGER NOT NULL,           -- Proveedor (FK a TSR.TTLR)
    PRPGVLTT DECIMAL(15,2) NOT NULL,     -- Valor total
    PRPGOBSV VARCHAR(500),               -- Observaciones
    PRPGSTDO INTEGER DEFAULT 1,          -- Estado: 1=Pendiente, 2=Aprobado, 3=Rechazado, 4=Pagado
    PRPGNVAP INTEGER,                    -- Nivel aprobación actual (FK a CXP.APXM)
    PRPGCNBC INTEGER,                    -- Cuenta bancaria seleccionada (FK a TSR.CNBC)
    PRPGTPPG INTEGER,                    -- Tipo pago: 1=Cheque, 2=Transferencia, 3=Efectivo
    PRPGPGSS INTEGER,                    -- Pago generado en TSR (FK a TSR.PGSS)
    PRPGFING TIMESTAMP,                  -- Fecha ingreso
    PRPGUSIG VARCHAR(50),                -- Usuario solicita
    PRPGFAPR TIMESTAMP,                  -- Fecha última aprobación
    PRPGUSAP VARCHAR(50),                -- Usuario última aprobación
    PRPGFRCH TIMESTAMP,                  -- Fecha rechazo
    PRPGUSRC VARCHAR(50),                -- Usuario rechaza
    PRPGMTRH VARCHAR(500),               -- Motivo rechazo
    
    PRIMARY KEY (PRPGCDGO),
    FOREIGN KEY (PRPGEMPR) REFERENCES CNT.EMPRS(EMPRCDGO),
    FOREIGN KEY (PRPGPRVD) REFERENCES TSR.TTLR(TTLRCDGO),
    FOREIGN KEY (PRPGNVAP) REFERENCES CXP.APXM(APXMCDGO),
    FOREIGN KEY (PRPGCNBC) REFERENCES TSR.CNBC(CNBCCDGO),
    FOREIGN KEY (PRPGPGSS) REFERENCES TSR.PGSS(PGSSCDGO)
);

CREATE SEQUENCE CXP.PRPG_SEQ START WITH 1 INCREMENT BY 1;
CREATE INDEX IDX_PRPG_ESTADO ON CXP.PRPG(PRPGSTDO, PRPGFCPG);
CREATE INDEX IDX_PRPG_PROV ON CXP.PRPG(PRPGPRVD, PRPGFCPG);
```

### 🗄️ Tabla: CXP.DPPR (Detalle Proposición Pago)

```sql
CREATE TABLE CXP.DPPR (
    DPPRCDGO INTEGER NOT NULL,           -- Código PK
    DPPRPRPG INTEGER NOT NULL,           -- Proposición (FK)
    DPPRCXDP INTEGER NOT NULL,           -- Cuota a pagar (FK a CXP.CXDP)
    DPPRDCMP INTEGER,                    -- Documento pago (FK a CXP.DCMP) [redundante para consultas]
    DPPRVLOR DECIMAL(15,2) NOT NULL,     -- Valor a pagar de esta cuota
    DPPROBSV VARCHAR(250),               -- Observaciones
    
    PRIMARY KEY (DPPRCDGO),
    FOREIGN KEY (DPPRPRPG) REFERENCES CXP.PRPG(PRPGCDGO),
    FOREIGN KEY (DPPRCXDP) REFERENCES CXP.CXDP(CXDPCDGO),
    FOREIGN KEY (DPPRDCMP) REFERENCES CXP.DCMP(DCMPCDGO)
);

CREATE SEQUENCE CXP.DPPR_SEQ START WITH 1 INCREMENT BY 1;
```

### 🗄️ Tabla: CXP.HAPR (Historial Aprobaciones)

```sql
CREATE TABLE CXP.HAPR (
    HAPRCDGO INTEGER NOT NULL,           -- Código PK
    HAPRPRPG INTEGER NOT NULL,           -- Proposición (FK)
    HAPRNVEL INTEGER NOT NULL,           -- Nivel de aprobación
    HAPRUSRO VARCHAR(50) NOT NULL,       -- Usuario que aprobó/rechazó
    HAPRFCHA TIMESTAMP NOT NULL,         -- Fecha acción
    HAPRACSN INTEGER NOT NULL,           -- Acción: 1=Aprobó, 2=Rechazó
    HAPROBSV VARCHAR(500),               -- Comentarios
    
    PRIMARY KEY (HAPRCDGO),
    FOREIGN KEY (HAPRPRPG) REFERENCES CXP.PRPG(PRPGCDGO)
);

CREATE SEQUENCE CXP.HAPR_SEQ START WITH 1 INCREMENT BY 1;
```

### 🔧 Modelos Java

```java
@Entity
@Table(name = "PRPG", schema = "CXP")
public class ProposicionPago {
    @Id @Column(name = "PRPGCDGO") private Integer codigo;
    @Column(name = "PRPGEMPR") private Integer empresa;
    @Column(name = "PRPGFCSL") private LocalDateTime fechaSolicitud;
    @Column(name = "PRPGFCPG") private LocalDate fechaPago;
    @Column(name = "PRPGPRVD") private Integer proveedor;
    @Column(name = "PRPGVLTT") private BigDecimal valorTotal;
    @Column(name = "PRPGOBSV") private String observaciones;
    @Column(name = "PRPGSTDO") private Integer estado;
    @Column(name = "PRPGNVAP") private Integer nivelAprobacionActual;
    @Column(name = "PRPGCNBC") private Integer cuentaBancaria;
    @Column(name = "PRPGTPPG") private Integer tipoPago;
    @Column(name = "PRPGPGSS") private Integer pago;
    
    @OneToMany(mappedBy = "proposicionPago", cascade = CascadeType.ALL)
    private List<DetalleProposicionPago> detalles;
}
```

### 🌐 Endpoints REST

```java
@RestController
@RequestMapping("/prpg")
public class ProposicionPagoController {
    
    /**
     * Crear proposición con detalles
     * POST /prpg/crear
     * Body: { "fechaPago": "2026-07-15", "proveedor": 123, "cuotas": [45, 67, 89], ... }
     */
    @PostMapping("/crear")
    public ResponseEntity<ProposicionPago> crear(@RequestBody ProposicionPagoRequest request) {
        // 1. Validar cuotas existen y no están pagadas
        // 2. Calcular valor total
        // 3. Determinar nivel aprobación según MontoAprobacion
        // 4. Crear PRPG con PRPGSTDO=1 (Pendiente)
        // 5. Crear DPPR para cada cuota
        // 6. Retornar
    }
    
    /**
     * Aprobar en el nivel actual
     * PUT /prpg/aprobar/{id}
     */
    @PutMapping("/aprobar/{id}")
    public ResponseEntity<ProposicionPago> aprobar(
        @PathVariable Integer id,
        @RequestBody AprobacionRequest request // { cuentaBancaria, observaciones }
    ) {
        // 1. Validar usuario tiene permiso en este nivel
        // 2. Registrar en HAPR
        // 3. Si es último nivel → PRPGSTDO=2 (Aprobado)
        // 4. Si no → incrementar PRPGNVAP
        // 5. Retornar
    }
    
    /**
     * Rechazar proposición
     * PUT /prpg/rechazar/{id}
     */
    @PutMapping("/rechazar/{id}")
    public ResponseEntity<Void> rechazar(
        @PathVariable Integer id,
        @RequestBody RechazoRequest request // { motivo }
    ) {
        // PRPGSTDO=3, registrar en HAPR
    }
    
    /**
     * Generar pago en TSR (solo si aprobado)
     * POST /prpg/generar-pago/{id}
     */
    @PostMapping("/generar-pago/{id}")
    public ResponseEntity<Integer> generarPago(@PathVariable Integer id) {
        // 1. Validar PRPGSTDO=2
        // 2. Crear registro en TSR.PGSS
        // 3. Actualizar PRPGPGSS
        // 4. Actualizar PRPGSTDO=4 (Pagado)
        // 5. Actualizar saldos de cuotas (CXDP)
        // 6. Generar asiento contable
        // 7. Retornar ID del pago
    }
    
    /**
     * Consultas
     */
    @GetMapping("/pendientes-aprobacion")
    public ResponseEntity<List<ProposicionPago>> getPendientesAprobacion() {
        // Filtrar por PRPGSTDO=1 y usuario tiene permiso en PRPGNVAP
    }
    
    @GetMapping("/por-proveedor/{id}")
    public ResponseEntity<List<ProposicionPago>> getByProveedor(@PathVariable Integer id) { }
    
    @GetMapping("/por-fecha-pago")
    public ResponseEntity<List<ProposicionPago>> getByFechaPago(
        @RequestParam LocalDate desde,
        @RequestParam LocalDate hasta
    ) { }
}
```

### 📊 Estados de Proposición

```sql
-- Rubro 81: Estados Proposición Pago
INSERT INTO CNT.RUCP (RUCPCDGO, RUCPNMBR, RUCPSTDO) VALUES (81, 'ESTADOS PROPOSICION PAGO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (81, 1, 'PENDIENTE APROBACION', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (81, 2, 'APROBADO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (81, 3, 'RECHAZADO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (81, 4, 'PAGADO', 1);
```

---

## 4️⃣ MEJORAS SERVICIOS EXISTENTES

### 🔧 TSR.TTLR (Titular) - Agregar tipo persona

```sql
-- Agregar columna para distinguir Persona Natural/Jurídica
ALTER TABLE TSR.TTLR ADD TTLRTPPR INTEGER DEFAULT 1; -- 1=Natural, 2=Jurídica

-- Si quieren usar rubros (recomendado):
ALTER TABLE TSR.TTLR ADD TTLRRBTP INTEGER; -- Rubro tipo persona P
ALTER TABLE TSR.TTLR ADD TTLRRBTH INTEGER; -- Rubro tipo persona H

-- Índices
CREATE INDEX IDX_TTLR_IDENTIFICACION ON TSR.TTLR(TTLRIDNF); -- Buscar por RUC/Cédula
CREATE INDEX IDX_TTLR_NOMBRE ON TSR.TTLR(TTLRNMBR); -- Buscar por nombre
```

### 🔧 TSR.PRRL (Persona Rol) - Mejorar

```sql
-- Ya existe, solo mejorar índices
CREATE INDEX IDX_PRRL_TITULAR ON TSR.PRRL(PRRLTTLR);
CREATE INDEX IDX_PRRL_EMPRESA ON TSR.PRRL(PRRLEMPR);

-- Endpoint adicional sugerido:
-- GET /prrl/getByTitular/{id} → Retorna todos los roles de una persona
-- GET /prrl/getByRol?rubroP=55&rubroH=1 → Retorna todas las personas con ese rol
```

### 🔧 CXP.CXDP (Cuota Financiación) - Agregar campos

```sql
-- Verificar que existan estos campos (probablemente ya están):
ALTER TABLE CXP.CXDP ADD CXDPABND DECIMAL(15,2) DEFAULT 0; -- Abono
ALTER TABLE CXP.CXDP ADD CXDPSLDO DECIMAL(15,2); -- Saldo
ALTER TABLE CXP.CXDP ADD CXDPSTDO INTEGER DEFAULT 1; -- 1=Pendiente, 2=Pagado parcial, 3=Pagado total

-- Índice para consultas de cartera vencida
CREATE INDEX IDX_CXDP_VENCIMIENTO ON CXP.CXDP(CXDPFVNC, CXDPSTDO);
```

---

## 5️⃣ SERVICIOS CARGA MASIVA

### 📝 Descripción
Endpoints para cargar facturas en lote desde archivos XML (SRI Ecuador) o TXT.

### 🌐 Endpoints REST

```java
@RestController
@RequestMapping("/dcmp/importar")
public class ImportadorDocumentosController {
    
    /**
     * Importar XML de factura electrónica (SRI Ecuador)
     * POST /dcmp/importar/xml
     * Content-Type: multipart/form-data
     */
    @PostMapping("/xml")
    public ResponseEntity<ResultadoImportacion> importarXML(
        @RequestParam("archivo") MultipartFile archivo
    ) {
        // 1. Parsear XML (usar JAXB o DOM)
        // 2. Extraer: RUC emisor, autorización, fecha, items, impuestos
        // 3. Buscar/crear Titular por RUC
        // 4. Crear DocumentoPago
        // 5. Crear DetalleDocumentoPago (items)
        // 6. Crear ValorImpuestoDocumentoPago
        // 7. Retornar: { success: true, documentoId: 123, errores: [] }
    }
    
    /**
     * Importar archivo TXT con formato definido
     * POST /dcmp/importar/txt
     */
    @PostMapping("/txt")
    public ResponseEntity<ResultadoImportacion> importarTXT(
        @RequestParam("archivo") MultipartFile archivo,
        @RequestParam(required = false) String separador // default: "|"
    ) {
        // Formato esperado:
        // RUC|FECHA|NUM_FACTURA|TOTAL|DETALLE1;DETALLE2;...
        // 1791234567001|2026-07-08|001-001-000123|150.50|Suministros oficina;Papelería
    }
    
    /**
     * Procesar múltiples archivos en lote
     * POST /dcmp/importar/lote
     */
    @PostMapping("/lote")
    public ResponseEntity<List<ResultadoImportacion>> importarLote(
        @RequestParam("archivos") MultipartFile[] archivos
    ) {
        // Procesar cada archivo y retornar lista de resultados
    }
}

// DTO de respuesta
class ResultadoImportacion {
    private boolean success;
    private Integer documentoId;
    private String numeroFactura;
    private String proveedor;
    private BigDecimal total;
    private List<String> errores;
    private List<String> advertencias;
}
```

### 🔍 Validaciones en Importación

1. **Validar RUC** existe y es válido (10 o 13 dígitos)
2. **Validar Autorización** no esté duplicada
3. **Validar Fecha** no sea futura ni muy antigua (>2 años)
4. **Validar Productos** existan o crearlos automáticamente
5. **Validar Impuestos** IVA 15% (o porcentaje vigente)
6. **Crear asiento contable** automáticamente si está configurado

---

## 6️⃣ CONFIGURACIÓN RUBROS ADICIONALES

```sql
-- Rubro 82: Tipos de Persona
INSERT INTO CNT.RUCP (RUCPCDGO, RUCPNMBR, RUCPSTDO) VALUES (82, 'TIPOS DE PERSONA', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (82, 1, 'NATURAL', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (82, 2, 'JURIDICA', 1);

-- Rubro 83: Estados Reposición Caja Chica
INSERT INTO CNT.RUCP (RUCPCDGO, RUCPNMBR, RUCPSTDO) VALUES (83, 'ESTADOS REPOSICION CAJA CHICA', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (83, 1, 'PENDIENTE', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (83, 2, 'APROBADO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (83, 3, 'RECHAZADO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (83, 4, 'PAGADO', 1);

-- Rubro 84: Tipos de Movimiento Caja Chica
INSERT INTO CNT.RUCP (RUCPCDGO, RUCPNMBR, RUCPSTDO) VALUES (84, 'TIPOS MOVIMIENTO CAJA CHICA', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (84, 1, 'GASTO', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (84, 2, 'REPOSICION', 1);
INSERT INTO CNT.DTCP (DTCPRUCP, DTCPCDAL, DTCPNMBR, DTCPSTDO) VALUES (84, 3, 'AJUSTE', 1);
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Backend Java

- [ ] **TSR.SCNM** - Secuencia numeración
  - [ ] Crear entidad `SecuenciaNumeracion.java`
  - [ ] Crear repositorio `SecuenciaNumeracionRepository.java`
  - [ ] Crear servicio `SecuenciaNumeracionService.java`
  - [ ] Crear controlador REST `/scnm`
  - [ ] Implementar método `obtenerSiguienteNumero()` con lock
  - [ ] Crear script SQL de tabla e índices
  - [ ] Crear datos iniciales

- [ ] **TSR.CJCH** - Caja chica
  - [ ] Crear entidades: `CajaChica`, `MovimientoCajaChica`, `ReposicionCajaChica`, `DetalleReposicion`
  - [ ] Crear repositorios
  - [ ] Crear servicios con lógica de negocio
  - [ ] Crear controladores REST `/cjch`, `/mvch`, `/rcch`
  - [ ] Implementar generación de asiento contable
  - [ ] Script SQL tablas + rubros

- [ ] **CXP.PRPG** - Proposición pago
  - [ ] Crear entidades: `ProposicionPago`, `DetalleProposicionPago`, `HistorialAprobacion`
  - [ ] Crear repositorios
  - [ ] Crear servicio con workflow de aprobación
  - [ ] Crear controlador REST `/prpg`
  - [ ] Implementar integración con TSR (generar pago)
  - [ ] Script SQL tablas + rubro de estados

- [ ] **Importación**
  - [ ] Crear `ImportadorXMLService.java`
  - [ ] Crear `ImportadorTXTService.java`
  - [ ] Crear controlador `/dcmp/importar`
  - [ ] Implementar parseo XML (librería JAXB)
  - [ ] Implementar validaciones

- [ ] **Mejoras**
  - [ ] Mejorar índices en tablas existentes
  - [ ] Agregar columnas faltantes (ver sección 4)
  - [ ] Crear rubros adicionales
  - [ ] Actualizar endpoints existentes

### Testing

- [ ] Tests unitarios para servicios críticos
- [ ] Tests de integración para workflows
- [ ] Test de concurrencia en `obtenerSiguienteNumero()`
- [ ] Test de parseo XML con archivos reales

### Documentación

- [ ] Actualizar Swagger/OpenAPI
- [ ] Documentar formato TXT esperado
- [ ] Crear manual de configuración de rubros
- [ ] Documentar workflow de aprobación

---

## 🚀 ESTIMACIÓN DE ESFUERZO

| Componente | Complejidad | Tiempo Estimado |
|------------|-------------|-----------------|
| Secuencia Numeración | Media | 1 día |
| Caja Chica (completo) | Alta | 2-3 días |
| Proposición Pago | Alta | 2-3 días |
| Importación XML/TXT | Media | 1-2 días |
| Mejoras y Rubros | Baja | 0.5 días |
| Testing | - | 1 día |
| **TOTAL** | - | **7-10 días** |

---

## 📞 CONTACTO Y SOPORTE

Para dudas o aclaraciones sobre esta especificación, contactar al equipo de frontend o arquitectura del proyecto.

**Última actualización:** Julio 8, 2026
