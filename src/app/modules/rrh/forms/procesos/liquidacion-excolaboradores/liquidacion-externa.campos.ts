import { CampoFormulario } from '../../comunes/modelo-formulario';
import { RubrosRrh } from '../../../model/rubros-rrh';

/**
 * Campos del formulario de liquidación de ex-colaboradores (contrato
 * `docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md` §6, con la REVISIÓN 2026-10-02 R2).
 * `tipoIdentificacion` no está acá: es 'C'/'P' fijo, no una tabla ni un rubro, y se pinta aparte en
 * el componente — ninguno de los `TipoCampo` de `modelo-formulario.ts` lo representa sin forzarlo.
 *
 * **Sin «Producto de pago» (R2):** D4 quedó derogada — cada concepto de la grilla lleva su propia
 * cuenta contable (`DetalleLiquidacionExterna.cuentaContable`), así que ya no hace falta una única
 * cuenta por pagar para toda la liquidación. `LQEXPRDP` pasó a nullable y la pantalla ya no lo pide.
 *
 * Obligatorios según el contrato (§6, "Validaciones de registrar y actualizar"): identificación,
 * apellidos, nombres y fecha de salida. La causal, la última remuneración, los datos bancarios y el
 * cargo son opcionales — los datos bancarios se validan aparte, todo-o-nada, en el propio componente
 * (no bloquea: se puede pagar con cheque).
 */
export function camposLiquidacionExterna(causales: any[], bancos: any[]): CampoFormulario[] {
  return [
    // Identificación
    { name: 'identificacion', label: 'Número de identificación', tipo: 'texto', requerido: true, grupo: 'Identificación' },
    { name: 'apellidos', label: 'Apellidos', tipo: 'texto', requerido: true, mayusculas: true, grupo: 'Identificación' },
    { name: 'nombres', label: 'Nombres', tipo: 'texto', requerido: true, mayusculas: true, grupo: 'Identificación' },
    { name: 'cargo', label: 'Cargo', tipo: 'texto', grupo: 'Identificación' },

    // Relación laboral
    { name: 'fechaIngreso', label: 'Fecha de ingreso', tipo: 'fecha', grupo: 'Relación laboral' },
    {
      name: 'fechaSalida',
      label: 'Fecha de salida',
      tipo: 'fecha',
      requerido: true,
      ayuda: 'Debe ser anterior al 1 de enero de 2026 — para salidas de este año, use la liquidación de haberes',
      grupo: 'Relación laboral',
    },
    {
      name: 'causalTerminacion',
      label: 'Causal de terminación',
      tipo: 'referencia',
      coleccion: causales,
      buscarPor: ['nombre', 'articulo'],
      grupo: 'Relación laboral',
    },
    {
      name: 'ultimaRemuneracion',
      label: 'Última remuneración',
      tipo: 'numero',
      ayuda: 'Informativo, para el acta',
      grupo: 'Relación laboral',
    },

    // Pago
    {
      name: 'banco',
      label: 'Banco',
      tipo: 'referencia',
      coleccion: bancos,
      // TSR.BEXT solo expone el nombre como campo propio buscable — misma excepción que
      // secciones-ficha.config.ts (cuenta bancaria del colaborador).
      buscarPor: ['nombre'],
      ayuda: 'Con los tres datos bancarios completos, Tesorería puede pagar por transferencia; sin ellos, solo por cheque',
      grupo: 'Pago',
    },
    { name: 'tipoCuenta', label: 'Tipo de cuenta', tipo: 'rubro', rubro: RubrosRrh.TIPO_CUENTA_BANCARIA, grupo: 'Pago' },
    { name: 'numeroCuenta', label: 'Número de cuenta', tipo: 'texto', grupo: 'Pago' },

    { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo', grupo: 'Observación' },
  ];
}
