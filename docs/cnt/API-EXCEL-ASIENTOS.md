# API — Excel de asientos por tipo y rango de fechas (omen-saa-3, 2026-11-14)

Diseño: `saaBE/docs/logica-negocio/cnt/DISENO-EXCEL-ASIENTOS-POR-TIPO.md`.

## Endpoint
```
GET /SaaBE/rest/asnt/excel?idEmpresa={Long}&desde={yyyy-MM-dd}&hasta={yyyy-MM-dd}
                          [&idTipo={Long}][&estado={1|2|3|4}][&categoria={general|sistema}]
```

| Parámetro | Obligatorio | Nota |
|---|---|---|
| `idEmpresa` | sí | empresa de la sesión |
| `desde`, `hasta` | sí | fecha del asiento (`ASNTFCHA`), inclusive; `desde <= hasta` |
| `idTipo` | no | código de `CNT.PLNT`; sin él, todos los tipos de la categoría |
| `estado` | no | rubro 21: 1 activo, 2 anulado, 3 reversado, 4 incompleto; sin él, todos |
| `categoria` | no | `general` (`sistema` 0 o 2) o `sistema` (1); sin él, todas |

## Respuesta
- **200**: cuerpo binario `.xlsx`,
  `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  `Content-Disposition: attachment; filename="asientos_<desde>_<hasta>.xlsx"`.
  Sin asientos en el rango también es 200 (Excel con la fila «Sin asientos en el rango»).
- **400**: texto plano con el motivo (falta un parámetro obligatorio o `desde > hasta`).
- **500**: texto plano `Error ...: <mensaje>`.

Con `responseType: 'blob'` el error también llega como `Blob`: hay que leerlo con `.text()` para mostrar el
mensaje (mismo patrón que `PolizaSeguroService`).

## Contenido (referencia)
Hoja «Asientos»: título con el rango; columnas
`Tipo | Número | Número por módulo | Fecha asiento | Fecha registro | Estado | Módulo origen | Glosa | Usuario | Valor`
(+ `Aviso` solo si algún asiento está descuadrado); ordenado por tipo y número alterno; subtotal por tipo y
total general. Valor = total del debe.
