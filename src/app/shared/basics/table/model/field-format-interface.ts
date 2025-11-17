export interface FieldFormat {
  column?: string; // Campo de la entidad procesado por la funcion ProcesaCampo
  header?: string; // Cabecera en la tabla
  footer_label?: string;
  footer_operartion?: number;
  footer_Sum?: number; // Valor de la suma que se despliega en el footer
  fType?: number; // Para dar formatos especiales para dinero y fecha
  fWidth?: string; // Ancho del campo en la tabla
  fBold?: string; // Si es negrita o no
  fColor?: string; // Color de la letra en el campo
  fAlign?: string; // Alineamiento de campo
  fSort?: boolean; // Para saber si tiene sort o no
}
