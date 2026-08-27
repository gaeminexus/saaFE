import {
  EstadoCuentaAportes,
  EstadoPeriodoAporte,
  MovimientoEstadoCuentaAporte,
  PeriodoEstadoCuentaAporte,
} from './estado-cuenta-aportes';

/**
 * Simulación de GET /rest/aprt/estadoCuenta/{idEntidad} contra el contrato congelado (§4.2 del
 * plan de devengo), usada por AporteService mientras `environment.mockDevengoContratos` esté en
 * `true`. Determinístico (nada de Math.random ni Date.now) para que la pantalla se vea igual en
 * cada carga: alterna COMPLETO / PARCIAL / SIN APORTE por periodo y tipo, y los periodos futuros
 * respecto de hoy salen ANTICIPADO o SIN APORTE. Incluye un bloque SIN PERIODO fijo para que la
 * pantalla siempre tenga algo que mostrar ahí.
 */
export function construirMockEstadoCuenta(
  idEntidad: number,
  desde: string,
  hasta: string
): EstadoCuentaAportes {
  const [anioDesde, mesDesde] = desde.split('-').map(Number);
  const [anioHasta, mesHasta] = hasta.split('-').map(Number);

  const hoy = new Date();
  const mesIndexActual = hoy.getFullYear() * 12 + hoy.getMonth(); // 0-based, mismo criterio que abajo

  const tipos = [
    { id: 9, nombre: 'JUBILACIÓN', esperado: 120 },
    { id: 11, nombre: 'CESANTÍA', esperado: 80 },
  ];

  const periodos: PeriodoEstadoCuentaAporte[] = [];
  let anio = anioDesde;
  let mes = mesDesde;
  let i = 0;

  while (anio < anioHasta || (anio === anioHasta && mes <= mesHasta)) {
    const periodoStr = `${anio}-${String(mes).padStart(2, '0')}`;
    const mesIndex = anio * 12 + (mes - 1);
    const esFuturo = mesIndex > mesIndexActual;

    for (const tipo of tipos) {
      let aportado: number;
      let estado: EstadoPeriodoAporte;
      const patron = (i + tipo.id) % 5;

      if (esFuturo) {
        aportado = patron === 0 ? tipo.esperado : 0;
        estado = aportado > 0 ? 'ANTICIPADO' : 'SIN APORTE';
      } else if (patron === 1) {
        aportado = 0;
        estado = 'SIN APORTE';
      } else if (patron === 2) {
        aportado = +(tipo.esperado * 0.5).toFixed(2);
        estado = 'PARCIAL';
      } else {
        aportado = tipo.esperado;
        estado = 'COMPLETO';
      }

      const faltante = Math.max(0, +(tipo.esperado - aportado).toFixed(2));
      const movimientos: MovimientoEstadoCuentaAporte[] =
        aportado > 0
          ? [
              {
                idAporte: i * 1000 + tipo.id,
                fechaTransaccion: `${anio}-${String(mes).padStart(2, '0')}-05`,
                valor: aportado,
                tipoMovimiento: 1,
                tipoMovimientoTexto: 'APORTE_MENSUAL',
                glosa: `Aporte ${tipo.nombre} · carga Petrocomercial ${periodoStr} (mock)`,
              },
            ]
          : [];

      periodos.push({
        periodo: periodoStr,
        idTipoAporte: tipo.id,
        nombreTipoAporte: tipo.nombre,
        esperado: tipo.esperado,
        aportado,
        faltante,
        estado,
        movimientos,
      });
    }

    i++;
    mes++;
    if (mes > 12) {
      mes = 1;
      anio++;
    }
  }

  const sinPeriodo: PeriodoEstadoCuentaAporte[] = [
    {
      periodo: null,
      idTipoAporte: 9,
      nombreTipoAporte: 'JUBILACIÓN',
      esperado: 0,
      aportado: 45.5,
      faltante: 0,
      estado: 'SIN PERIODO',
      movimientos: [
        {
          idAporte: 900001,
          fechaTransaccion: `${anioDesde}-01-15`,
          valor: 45.5,
          tipoMovimiento: 6,
          tipoMovimientoTexto: 'MIGRADO',
          glosa: 'Saldo migrado del sistema anterior (mock)',
        },
      ],
    },
    {
      periodo: null,
      idTipoAporte: 11,
      nombreTipoAporte: 'CESANTÍA',
      esperado: 0,
      aportado: -30,
      faltante: 0,
      estado: 'SIN PERIODO',
      movimientos: [
        {
          idAporte: 900002,
          fechaTransaccion: `${anioDesde}-03-10`,
          valor: -30,
          tipoMovimiento: 3,
          tipoMovimientoTexto: 'DEVOLUCION',
          glosa: 'Retiro de saldo excedente (mock)',
        },
      ],
    },
  ];

  const totalFaltante = +periodos.reduce((s, p) => s + p.faltante, 0).toFixed(2);

  return {
    idEntidad,
    identificacion: `MOCK-${idEntidad}`,
    razonSocial: '(mock) usa el nombre real de la entidad, no este campo',
    periodos: [...periodos, ...sinPeriodo],
    totalFaltante,
  };
}
