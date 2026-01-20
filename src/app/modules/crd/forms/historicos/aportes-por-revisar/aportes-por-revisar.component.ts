import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { Aporte } from '../../../model/aporte';
import { TipoAporte } from '../../../model/tipo-aporte';
import { AporteService } from '../../../service/aporte.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

const ESTADO_POR_REVISAR = "99";

interface AportesPorTipo {
  tipoAporte: string;
  codigoTipo: number;
  aportes: MatTableDataSource<Aporte>;
  totalValor: number;
  totalPagado: number;
  totalSaldo: number;
  cantidad: number;
  expandido: boolean;
}

@Component({
  selector: 'app-aportes-por-revisar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './aportes-por-revisar.component.html',
  styleUrl: './aportes-por-revisar.component.scss',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0, transform: 'translateY(10px)' })),
      state('*', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', animate('300ms ease-out')),
    ]),
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', minHeight: '0', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AportesPorRevisarComponent implements OnInit {
  // Datos
  aportesPorTipo: AportesPorTipo[] = [];
  totalGeneral = { valor: 0, pagado: 0, saldo: 0, cantidad: 0 };

  // Formulario de filtros
  filtrosForm = new FormGroup({
    fechaInicio: new FormControl<Date | null>(null),
    fechaFin: new FormControl<Date | null>(null),
    numeroIdentificacion: new FormControl<string>(''),
    razonSocial: new FormControl<string>(''),
  });

  // Estados de carga
  isLoading = false;
  sinResultados = false;

  // Columnas de la tabla
  displayedColumns: string[] = [
    'fechaTransaccion',
    'entidad',
    'glosa',
    'valor',
    'valorPagado',
    'saldo',
    'estado',
  ];

  constructor(
    private aporteService: AporteService,
    private tipoAporteService: TipoAporteService,
    private exportService: ExportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // La búsqueda se ejecuta solo al presionar el botón buscar
  }

  /**
   * Carga todos los aportes con estado de tipo = 99
   * Estrategia: Primero cargar TipoAporte con estado 99, luego aportes por cada tipo
   */
  cargarAportes(): void {
    this.isLoading = true;
    this.sinResultados = false;
    this.aportesPorTipo = [];

    // Paso 1: Obtener todos los TipoAporte con estado = 99
    const criterioTipo: DatosBusqueda[] = [];
    let criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'estado',
      ESTADO_POR_REVISAR,
      TipoComandosBusqueda.IGUAL
    );
    criterioTipo.push(criterio);

    this.tipoAporteService.selectByCriteria(criterioTipo).subscribe({
      next: (tiposAporte: any) => {
        if (!tiposAporte || !Array.isArray(tiposAporte) || tiposAporte.length === 0) {
          this.sinResultados = true;
          this.isLoading = false;
          this.snackBar.open(
            'No se encontraron tipos de aporte con estado por revisar',
            'Cerrar',
            { duration: 3000 }
          );
          return;
        }

        // Paso 2: Para cada TipoAporte, cargar sus aportes
        this.cargarAportesPorTipo(tiposAporte);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar tipos de aporte', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Carga los aportes para cada tipo de aporte
   */
  private cargarAportesPorTipo(tiposAporte: TipoAporte[]): void {
    const filtros = this.filtrosForm.value;
    let tiposProcesados = 0;
    const totalTipos = tiposAporte.length;

    tiposAporte.forEach((tipo: TipoAporte) => {
      const criterioConsultaArray: DatosBusqueda[] = [];

      // Filtro por código de tipo de aporte
      let criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'tipoAporte',
        'codigo',
        tipo.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioConsultaArray.push(criterio);

      // Filtro por fecha inicio
      if (filtros.fechaInicio) {
        criterio = new DatosBusqueda();
        criterio.asignaUnCampoSinTrunc(
          TipoDatosBusqueda.DATE_TIME,
          'fechaTransaccion',
          this.formatearFecha(filtros.fechaInicio),
          TipoComandosBusqueda.MAYOR_IGUAL
        );
        criterioConsultaArray.push(criterio);
      }

      // Filtro por fecha fin
      if (filtros.fechaFin) {
        criterio = new DatosBusqueda();
        criterio.asignaUnCampoSinTrunc(
          TipoDatosBusqueda.DATE_TIME,
          'fechaTransaccion',
          this.formatearFecha(filtros.fechaFin),
          TipoComandosBusqueda.MENOR_IGUAL
        );
        criterioConsultaArray.push(criterio);
      }

      // Filtro por número de identificación de entidad
      if (filtros.numeroIdentificacion && filtros.numeroIdentificacion.trim()) {
        criterio = new DatosBusqueda();
        criterio.asignaValorConCampoPadre(
          TipoDatosBusqueda.STRING,
          'entidad',
          'numeroIdentificacion',
          filtros.numeroIdentificacion.trim(),
          TipoComandosBusqueda.LIKE
        );
        criterioConsultaArray.push(criterio);
      }

      // Filtro por razón social
      if (filtros.razonSocial && filtros.razonSocial.trim()) {
        criterio = new DatosBusqueda();
        criterio.asignaValorConCampoPadre(
          TipoDatosBusqueda.STRING,
          'entidad',
          'razonSocial',
          filtros.razonSocial.trim(),
          TipoComandosBusqueda.LIKE
        );
        criterioConsultaArray.push(criterio);
      }

      // Ordenar por fecha descendente
      criterio = new DatosBusqueda();
      criterio.orderBy('fechaTransaccion');
      criterioConsultaArray.push(criterio);

      this.aporteService.selectByCriteria(criterioConsultaArray).subscribe({
        next: (aportes: any) => {
          tiposProcesados++;

          if (aportes && Array.isArray(aportes) && aportes.length > 0) {
            // Convertir fechas
            const aportesConvertidos = aportes.map((aporte: Aporte) => ({
              ...aporte,
              fechaTransaccion: this.convertirFecha(aporte.fechaTransaccion) || aporte.fechaTransaccion,
              fechaRegistro: this.convertirFecha(aporte.fechaRegistro) || aporte.fechaRegistro,
            }));

            // Ordenar por fecha descendente
            aportesConvertidos.sort((a, b) => {
              const fechaA = new Date(a.fechaTransaccion).getTime();
              const fechaB = new Date(b.fechaTransaccion).getTime();
              return fechaB - fechaA;
            });

            // Calcular totales
            const totalValor = aportesConvertidos.reduce((sum, a) => sum + (a.valor || 0), 0);
            const totalPagado = aportesConvertidos.reduce((sum, a) => sum + (a.valorPagado || 0), 0);
            const totalSaldo = aportesConvertidos.reduce((sum, a) => sum + (a.saldo || 0), 0);

            // Agregar grupo
            this.aportesPorTipo.push({
              tipoAporte: tipo.nombre,
              codigoTipo: tipo.codigo,
              aportes: new MatTableDataSource<Aporte>(aportesConvertidos),
              totalValor: totalValor,
              totalPagado: totalPagado,
              totalSaldo: totalSaldo,
              cantidad: aportesConvertidos.length,
              expandido: false,
            });
          }

          // Verificar si todos los tipos fueron procesados
          if (tiposProcesados === totalTipos) {
            this.finalizarCarga();
          }
        },
        error: (error) => {
          tiposProcesados++;

          // Verificar si todos los tipos fueron procesados
          if (tiposProcesados === totalTipos) {
            this.finalizarCarga();
          }
        },
      });
    });
  }

  /**
   * Finaliza la carga de aportes y actualiza la UI
   */
  private finalizarCarga(): void {
    this.calcularTotalesGenerales();
    this.sinResultados = this.aportesPorTipo.length === 0;
    this.isLoading = false;

    if (this.aportesPorTipo.length > 0) {
      const totalAportes = this.totalGeneral.cantidad;
      this.snackBar.open(
        `Se encontraron ${totalAportes} aportes en ${this.aportesPorTipo.length} tipos`,
        'Cerrar',
        { duration: 3000 }
      );
    } else {
      this.snackBar.open('No se encontraron aportes', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Agrupa los aportes por tipo de aporte (método legacy, ya no se usa con la nueva estrategia)
   */
  private agruparAportesPorTipo(aportes: Aporte[]): void {
    const tiposMap = new Map<number, AportesPorTipo>();

    aportes.forEach((aporte) => {
      const codigoTipo = aporte.tipoAporte?.codigo || 0;
      const nombreTipo = aporte.tipoAporte?.nombre || 'Sin tipo';

      if (!tiposMap.has(codigoTipo)) {
        tiposMap.set(codigoTipo, {
          tipoAporte: nombreTipo,
          codigoTipo: codigoTipo,
          aportes: new MatTableDataSource<Aporte>([]),
          totalValor: 0,
          totalPagado: 0,
          totalSaldo: 0,
          cantidad: 0,
          expandido: false,
        });
      }

      const grupo = tiposMap.get(codigoTipo)!;
      grupo.aportes.data.push(aporte);
      grupo.totalValor += aporte.valor || 0;
      grupo.totalPagado += aporte.valorPagado || 0;
      grupo.totalSaldo += aporte.saldo || 0;
      grupo.cantidad++;
    });

    this.aportesPorTipo = Array.from(tiposMap.values());
    this.calcularTotalesGenerales();
  }

  /**
   * Calcula los totales generales
   */
  private calcularTotalesGenerales(): void {
    this.totalGeneral = {
      valor: this.aportesPorTipo.reduce((sum, tipo) => sum + tipo.totalValor, 0),
      pagado: this.aportesPorTipo.reduce((sum, tipo) => sum + tipo.totalPagado, 0),
      saldo: this.aportesPorTipo.reduce((sum, tipo) => sum + tipo.totalSaldo, 0),
      cantidad: this.aportesPorTipo.reduce((sum, tipo) => sum + tipo.cantidad, 0),
    };
  }

  /**
   * Expande/colapsa un grupo de aportes
   */
  toggleTipo(tipo: AportesPorTipo): void {
    tipo.expandido = !tipo.expandido;
  }

  /**
   * Aplica los filtros
   */
  aplicarFiltros(): void {
    this.cargarAportes();
  }

  /**
   * Limpia los filtros
   */
  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.cargarAportes();
  }

  /**
   * Exporta el resumen a CSV
   */
  exportarResumenCSV(): void {
    if (this.aportesPorTipo.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = this.aportesPorTipo.map((tipo) => ({
      tipoAporte: tipo.tipoAporte,
      cantidad: tipo.cantidad,
      totalValor: tipo.totalValor,
      totalPagado: tipo.totalPagado,
      totalSaldo: tipo.totalSaldo,
    }));

    const filename = `Resumen_Aportes_Por_Revisar_${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportToCSV(
      rows,
      filename,
      ['Tipo de Aporte', 'Cantidad', 'Total Valor', 'Total Pagado', 'Total Saldo'],
      ['tipoAporte', 'cantidad', 'totalValor', 'totalPagado', 'totalSaldo']
    );

    this.snackBar.open('CSV exportado exitosamente', 'Cerrar', { duration: 3000 });
  }

  /**
   * Exporta el detalle de un tipo específico a CSV
   */
  exportarDetalleCSV(tipo: AportesPorTipo): void {
    if (tipo.aportes.data.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = tipo.aportes.data.map((aporte: Aporte) => ({
      fechaTransaccion: this.formatearFechaDisplay(aporte.fechaTransaccion),
      numeroIdentificacion: aporte.entidad?.numeroIdentificacion || '',
      razonSocial: aporte.entidad?.razonSocial || '',
      glosa: aporte.glosa || '',
      valor: aporte.valor || 0,
      valorPagado: aporte.valorPagado || 0,
      saldo: aporte.saldo || 0,
      estado: this.obtenerEstadoTexto(aporte.estado),
    }));

    const filename = `Detalle_${tipo.tipoAporte}_${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportToCSV(
      rows,
      filename,
      ['Fecha', 'Identificación', 'Razón Social', 'Glosa', 'Valor', 'Pagado', 'Saldo', 'Estado'],
      [
        'fechaTransaccion',
        'numeroIdentificacion',
        'razonSocial',
        'glosa',
        'valor',
        'valorPagado',
        'saldo',
        'estado',
      ]
    );

    this.snackBar.open('CSV exportado exitosamente', 'Cerrar', { duration: 3000 });
  }

  /**
   * Genera PDF del resumen
   */
  async generarPDFResumen(): Promise<void> {
    if (this.aportesPorTipo.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      const jsPDF = await this.cargarJsPDF();
      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.setTextColor(102, 126, 234); // Color primario
      doc.text('Aportes Por Revisar - Resumen', 14, 20);

      // Fecha del reporte
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);

      // Totales generales
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Totales Generales:', 14, 38);
      doc.setFontSize(10);
      doc.text(`Total Registros: ${this.totalGeneral.cantidad}`, 14, 45);
      doc.text(`Total Valor: $${this.totalGeneral.valor.toFixed(2)}`, 14, 52);
      doc.text(`Total Pagado: $${this.totalGeneral.pagado.toFixed(2)}`, 14, 59);
      doc.text(`Total Saldo: $${this.totalGeneral.saldo.toFixed(2)}`, 14, 66);

      // Tabla de resumen
      let y = 76;
      doc.setFontSize(11);
      doc.text('Detalle por Tipo de Aporte:', 14, y);

      y += 8;
      this.aportesPorTipo.forEach((tipo, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 8, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(tipo.tipoAporte, 16, y);

        doc.setFont('helvetica', 'normal');
        doc.text(`Cantidad: ${tipo.cantidad}`, 16, y + 7);
        doc.text(`Valor: $${tipo.totalValor.toFixed(2)}`, 70, y + 7);
        doc.text(`Pagado: $${tipo.totalPagado.toFixed(2)}`, 120, y + 7);
        doc.text(`Saldo: $${tipo.totalSaldo.toFixed(2)}`, 170, y + 7);

        y += 15;
      });

      doc.save(`Resumen_Aportes_Por_Revisar_${new Date().toISOString().split('T')[0]}.pdf`);
      this.snackBar.open('PDF generado exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Genera PDF del detalle de un tipo específico
   */
  async generarPDFDetalle(tipo: AportesPorTipo): Promise<void> {
    if (tipo.aportes.data.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      const jsPDF = await this.cargarJsPDF();
      const doc = new jsPDF();

      // Título
      doc.setFontSize(16);
      doc.setTextColor(102, 126, 234);
      doc.text(`Detalle: ${tipo.tipoAporte}`, 14, 20);

      // Información del tipo
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total registros: ${tipo.cantidad}`, 14, 28);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 150, 28);

      // Resumen
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      let y = 38;
      doc.text(`Total Valor: $${tipo.totalValor.toFixed(2)}`, 14, y);
      doc.text(`Total Pagado: $${tipo.totalPagado.toFixed(2)}`, 70, y);
      doc.text(`Total Saldo: $${tipo.totalSaldo.toFixed(2)}`, 130, y);

      // Tabla de aportes
      y = 48;
      doc.setFontSize(9);

      tipo.aportes.data.forEach((aporte, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        // Fondo alternado
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(14, y - 4, 182, 20, 'F');
        }

        doc.text(`Fecha: ${this.formatearFechaDisplay(aporte.fechaTransaccion)}`, 16, y);
        doc.text(
          `${aporte.entidad?.numeroIdentificacion || ''} - ${aporte.entidad?.razonSocial || ''}`,
          16,
          y + 5
        );
        doc.text(`Glosa: ${aporte.glosa || 'N/A'}`, 16, y + 10);
        doc.text(`Valor: $${(aporte.valor || 0).toFixed(2)}`, 16, y + 15);
        doc.text(`Pagado: $${(aporte.valorPagado || 0).toFixed(2)}`, 70, y + 15);
        doc.text(`Saldo: $${(aporte.saldo || 0).toFixed(2)}`, 130, y + 15);

        y += 22;
      });

      doc.save(`Detalle_${tipo.tipoAporte}_${new Date().toISOString().split('T')[0]}.pdf`);
      this.snackBar.open('PDF generado exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Obtiene el texto del estado
   */
  obtenerEstadoTexto(estado: number): string {
    if (estado === 1) return 'Activo';
    if (estado === 99) return 'Por Revisar';
    return 'Inactivo';
  }

  /**
   * Obtiene la clase CSS del estado
   */
  obtenerEstadoClase(estado: number): string {
    if (estado === 1) return 'estado-activo';
    if (estado === 99) return 'estado-revisar';
    return 'estado-inactivo';
  }

  /**
   * Formatea una fecha para enviar al backend
   */
  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatearFechaDisplay(fecha: any): string {
    if (!fecha) return '-';
    const date = this.convertirFecha(fecha);
    if (!date) return '-';
    return date.toLocaleDateString('es-ES');
  }

  /**
   * Convierte una fecha de forma segura
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      // Convertir nanosegundos a milisegundos
      const ms = Math.floor(nanoseconds / 1000000);
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend envía 1-12
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    if (typeof fecha === 'string') {
      const fechaLimpia = fecha.replace(/\[.*?\]/, '');
      const fechaConvertida = new Date(fechaLimpia);
      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    return null;
  }

  /**
   * Carga jsPDF dinámicamente
   */
  private cargarJsPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdf && (window as any).jspdf.jsPDF) {
        resolve((window as any).jspdf.jsPDF);
      } else if ((window as any).jsPDF) {
        resolve((window as any).jsPDF);
      } else {
        reject('jsPDF no está cargado');
      }
    });
  }
}
