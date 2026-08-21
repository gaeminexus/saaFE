/**
 * Modelo de los formularios y las tablas del módulo, propio de RRHH.
 *
 * Nace con el rediseño de `ORDEN-REDISENO-UI-RRHH.md`: fuera de parametrización las pantallas
 * dejan de apoyarse en `table-basic-hijos`, así que dejan también de hablar su vocabulario
 * (`FieldConfig` / `FieldFormat`). Aquí solo hay descripción de datos: ni un color, ni una
 * medida, ni un valor normativo.
 */

/** Qué control pinta un campo. `referencia` es una FK a otra tabla; `rubro`, un catálogo. */
export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'rubro' | 'siNo' | 'estado' | 'referencia';

export interface CampoFormulario {
  /** Nombre de la propiedad Java de la entidad. Es contrato: ver `CONTRATO-DTO-...`. */
  name: string;
  label: string;
  tipo: TipoCampo;
  /** Código alterno del rubro que alimenta el combo, cuando `tipo` es `rubro`. */
  rubro?: number;
  /** Filas que alimentan el combo, cuando `tipo` es `referencia`. */
  coleccion?: any[];
  /**
   * Propiedades por las que filtra el combo de una tabla. La regla del proyecto exige **dos
   * como mínimo**, salvo que la tabla solo tenga `id`, `nombre` y `estado`. Admite rutas
   * (`departamento.nombre`).
   */
  buscarPor?: string[];
  requerido?: boolean;
  mayusculas?: boolean;
  ayuda?: string;
  /** Valor con el que nace el campo en un alta. */
  valor?: any;
  /** Un campo `completo` ocupa la fila entera del formulario. */
  ancho?: 'medio' | 'completo';
  /** Sección del formulario en la que se agrupa el campo, en la vista de formulario propio. */
  grupo?: string;
}

/** Cómo se pinta una celda de estado: la etiqueta se acompaña de color, no lo sustituye. */
export type TonoPastilla = 'ok' | 'aviso' | 'error' | 'neutro';

export interface ColumnaTabla {
  /** Propiedad de la fila ya formateada que se muestra. */
  campo: string;
  titulo: string;
  ancho?: string;
  alinear?: 'centro' | 'derecha';
  formato?: 'dinero' | 'fecha' | 'numero';
  /** Devuelve el tono de la pastilla de esa fila, o `null` para texto plano. */
  pastilla?: (fila: any) => TonoPastilla | null;
}

/** Línea de contexto que una sección muestra sobre su tabla. */
export interface LineaResumen {
  icono: string;
  texto: string;
  alerta?: boolean;
}
