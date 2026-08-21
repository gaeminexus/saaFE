/**
 * Catálogo de tipos de permiso y licencia. Tabla RHH.CTLG.
 * Los comentarios indican el campo equivalente de la entidad `Catalogo` del backend.
 */
export interface Catalogo {
  codigo: number; // CTLG.codigo
  nombre: string; // CTLG.nombre
  requiereDocumento: string; // CTLG.requiereDocumento - 'S' / 'N'
  conGoce: string; // CTLG.conGoce - 'S' / 'N'
  estado: string; // CTLG.estado
  fechaRegistro: Date; // CTLG.fechaRegistro
  usuarioRegistro: string; // CTLG.usuarioRegistro
}
