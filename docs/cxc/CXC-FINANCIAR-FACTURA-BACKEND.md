# CXC - Financiar Factura (Backend requerido)

## Objetivo
Permitir financiar una factura (estado = 5) con:
- Número variable de cuotas
- Programación por periodicidad o por fechas fijas
- Distribución por porcentaje o por valor fijo

## Campos recomendados en `forma_pago_factura`
Si se mantiene una sola tabla para guardar cuotas, agregar:

- `numero_cuota` NUMBER(5)
- `porcentaje` NUMBER(10,4)
- `fecha_pago` DATE
- `tipo_programacion` VARCHAR2(20) -- PERIODICIDAD | FECHAS_FIJAS
- `periodicidad` VARCHAR2(20) -- SEMANAL | QUINCENAL | MENSUAL | PERSONALIZADA
- `intervalo_dias` NUMBER(5)
- `es_financiacion` NUMBER(1) -- 1 = financiada, 0 = normal

Campos existentes usados:
- `forma_pago`
- `valor`
- `plazo`
- `unidad_tiempo`
- `estado`

## Recomendación de cabecera de plan (opcional)
Para control de versiones de plan, auditoría y cambios, conviene una cabecera:

### Tabla `plan_financiacion_factura`
- `id`
- `id_factura`
- `numero_pagos`
- `modo_programacion` VARCHAR2(20)
- `modo_monto` VARCHAR2(20)
- `fecha_inicio`
- `total_factura`
- `estado`
- `usuario_crea`
- `fecha_crea`
- `usuario_mod`
- `fecha_mod`

### Tabla detalle `plan_financiacion_factura_det`
- `id`
- `id_plan`
- `numero_cuota`
- `fecha_pago`
- `porcentaje`
- `valor`
- `estado`

## Validaciones backend mínimas
- Solo facturas con `estado = 5`.
- Suma de `valor` de cuotas = total factura (tolerancia 0.01).
- Si modo porcentaje: suma de porcentajes = 100 (tolerancia 0.01).
- No permitir fechas vacías.
- No permitir valores <= 0.
- `numero_cuota` único por factura/plan.

## Endpoint sugerido
`POST /fctr/financiarFactura`

### Payload sugerido
```json
{
  "idFactura": 123,
  "modoProgramacion": "PERIODICIDAD",
  "periodicidad": "MENSUAL",
  "modoMonto": "PORCENTAJE",
  "numeroPagos": 6,
  "fechaInicio": "2026-07-15",
  "totalFactura": 500.0,
  "cuotas": [
    { "numeroCuota": 1, "fechaPago": "2026-07-15", "porcentaje": 20, "valor": 100 },
    { "numeroCuota": 2, "fechaPago": "2026-08-15", "porcentaje": 20, "valor": 100 }
  ]
}
```
