export interface TempCobroTransferencia {
  id?: number;
  codigoCobro?: string;
  banco?: string;
  numeroCuenta?: string;
  numeroReferencia?: string;
  monto?: number;
  fecha?: Date;
  descripcion?: string;
  estado?: number;
  usuarioCreacion?: string;
  fechaCreacion?: Date;
  usuarioModificacion?: string;
  fechaModificacion?: Date;
}
