import { CommonModule } from '@angular/common';
import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { AsientoService } from '../../service/asiento.service';
import { TipoAsientoService } from '../../service/tipo-asiento.service';
import { DetalleAsientoService } from '../../service/detalle-asiento.service';
import { TipoAsiento } from '../../model/tipo-asiento';
import { Asiento } from '../../model/asiento';
import { DetalleAsiento } from '../../model/detalle-asiento';
import { ExportService } from '../../../../shared/services/export.service';
import { Router } from '@angular/router';

@Component({
  selector: 'cnt-reporte-listado-asientos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatExpansionModule,
    MatTableModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './reporte-listado-asientos.component.html',
  styleUrls: ['./reporte-listado-asientos.component.scss'],
})
export class ReporteListadoAsientosComponent implements OnInit {
  // Filtros
  fechaIngresoDesde = signal<Date | null>(null);
  fechaIngresoHasta = signal<Date | null>(null);
  fechaAsientoDesde = signal<Date | null>(null);
  fechaAsientoHasta = signal<Date | null>(null);
  numeroAsiento = signal<string>('');
  descripcion = signal<string>('');
  estado = signal<number | null>(null);
  categoriaAsiento = signal<'general' | 'sistema'>('general'); // Radio button
  tipoAsientoSeleccionado = signal<number | null>(null);
  usuario = signal<string>('');

  // Datos
  tiposAsiento: TipoAsiento[] = [];
  tiposAsientoFiltrados: TipoAsiento[] = [];
  resultadosAsientos: Asiento[] = [];
  detallesMap = new Map<number, DetalleAsiento[]>(); // Mapa de detalles por código de asiento
  asientosExpandidos = signal<Set<number>>(new Set()); // Track asientos expandidos

  // Estado
  loading = signal<boolean>(false);
  loadingDetalles = signal<Set<number>>(new Set()); // Track loading por asiento
  filtrosExpandidos = signal<boolean>(true); // Panel de filtros expandido/colapsado
  idSucursal: string = '';

  // Columnas de la tabla de detalles
  displayedColumns: string[] = ['cuenta', 'nombreCuenta', 'descripcion', 'debe', 'haber'];

  // Opciones
  estados = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 1, etiqueta: 'Activo' },
    { valor: 2, etiqueta: 'Inactivo' },
    { valor: 3, etiqueta: 'Anulado' },
    { valor: 4, etiqueta: 'Incompleto' },
  ];

  constructor(
    private asientoService: AsientoService,
    private tipoAsientoService: TipoAsientoService,
    private detalleAsientoService: DetalleAsientoService,
    private snackBar: MatSnackBar,
    private exportService: ExportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.idSucursal = localStorage.getItem('idSucursal') || '280';
    this.cargarTiposAsiento();
  }

  /**
   * Carga los tipos de asiento y los filtra según la categoría seleccionada
   */
  private cargarTiposAsiento(): void {
    this.tipoAsientoService.getAll().subscribe({
      next: (data) => {
        this.tiposAsiento = Array.isArray(data) ? data : [];
        this.filtrarTiposPorCategoria();
      },
      error: (err) => {
        console.error('Error al cargar tipos de asiento:', err);
        this.tiposAsiento = [];
        this.tiposAsientoFiltrados = [];
      },
    });
  }

  /**
   * Filtra los tipos de asiento según la categoría seleccionada (general/sistema)
   */
  filtrarTiposPorCategoria(): void {
    const categoria = this.categoriaAsiento();

    if (categoria === 'general') {
      // Filtrar tipos generales (sistema = 0 o 2)
      this.tiposAsientoFiltrados = this.tiposAsiento.filter(
        (t) => t.sistema === 0 || t.sistema === 2
      );
    } else {
      // Filtrar tipos sistema (sistema = 1)
      this.tiposAsientoFiltrados = this.tiposAsiento.filter(
        (t) => t.sistema === 1
      );
    }

    // Resetear selección si el tipo actual no está en la nueva lista
    const tipoActual = this.tipoAsientoSeleccionado();
    if (tipoActual && !this.tiposAsientoFiltrados.some(t => t.codigo === tipoActual)) {
      this.tipoAsientoSeleccionado.set(null);
    }
  }

  /**
   * Maneja el cambio de categoría del radio button
   */
  onCategoriaChange(): void {
    this.filtrarTiposPorCategoria();
  }

  /**
   * Realiza la búsqueda de asientos usando selectByCriteria
   */
  buscar(): void {
    this.loading.set(true);

    // Construir array de criterios
    const criterios: DatosBusqueda[] = [];

    // Criterio: Empresa
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      this.idSucursal,
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEmpresa);

    // Criterio: Fecha Ingreso (BETWEEN) - con hora
    const fechaIngresoDesde = this.fechaIngresoDesde();
    const fechaIngresoHasta = this.fechaIngresoHasta();
    if (fechaIngresoDesde && fechaIngresoHasta) {
      const criterioFechaIngreso = new DatosBusqueda();
      const fechaDesdeStr = this.formatDateWithTime(fechaIngresoDesde);
      const fechaHastaStr = this.formatDateWithTime(fechaIngresoHasta, '23:59:59');

      criterioFechaIngreso.asignaUnCampoConBetween(
        'fechaIngreso',
        TipoDatosBusqueda.DATE,
        fechaDesdeStr,
        TipoComandosBusqueda.BETWEEN,
        fechaHastaStr
      );
      criterios.push(criterioFechaIngreso);
    }

    // Criterio: Fecha Asiento (BETWEEN)
    const fechaAsientoDesde = this.fechaAsientoDesde();
    const fechaAsientoHasta = this.fechaAsientoHasta();
    if (fechaAsientoDesde && fechaAsientoHasta) {
      const criterioFechaAsiento = new DatosBusqueda();
      const fechaDesdeStr = this.formatDate(fechaAsientoDesde);
      const fechaHastaStr = this.formatDate(fechaAsientoHasta);

      criterioFechaAsiento.asignaUnCampoConBetween(
        'fechaAsiento',
        TipoDatosBusqueda.DATE,
        fechaDesdeStr,
        TipoComandosBusqueda.BETWEEN,
        fechaHastaStr
      );
      criterios.push(criterioFechaAsiento);
    }

    // Criterio: Número de asiento
    if (this.numeroAsiento()) {
      const criterioNumero = new DatosBusqueda();
      criterioNumero.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'numero',
        this.numeroAsiento(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(criterioNumero);
    }

    // Criterio: Descripción (LIKE para coincidencias parciales)
    if (this.descripcion()) {
      const criterioDescripcion = new DatosBusqueda();
      criterioDescripcion.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'observaciones',
        this.descripcion(),
        TipoComandosBusqueda.LIKE
      );
      criterios.push(criterioDescripcion);
    }

    // Criterio: Estado
    if (this.estado() !== null) {
      const criterioEstado = new DatosBusqueda();
      criterioEstado.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'estado',
        this.estado()!.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(criterioEstado);
    }

    // Criterio: Tipo de Asiento
    if (this.tipoAsientoSeleccionado()) {
      const criterioTipo = new DatosBusqueda();
      criterioTipo.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'tipoAsiento',
        'codigo',
        this.tipoAsientoSeleccionado()!.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(criterioTipo);
    }

    // Criterio: Usuario
    if (this.usuario()) {
      const criterioUsuario = new DatosBusqueda();
      criterioUsuario.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'nombreUsuario',
        this.usuario(),
        TipoComandosBusqueda.LIKE
      );
      criterios.push(criterioUsuario);
    }

    // Ejecutar consulta
    this.asientoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.resultadosAsientos = Array.isArray(data) ? data : [];

        const mensaje = this.resultadosAsientos.length > 0
          ? `Se encontraron ${this.resultadosAsientos.length} asiento(s)`
          : 'No se encontraron asientos con los criterios especificados';

        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });

        console.log('Resultados:', this.resultadosAsientos);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error en búsqueda de asientos:', err);
        this.snackBar.open(
          'Error al buscar asientos. Intente nuevamente.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          }
        );
      },
    });
  }

  /**
   * Limpia todos los filtros
   */
  limpiarFiltros(): void {
    this.fechaIngresoDesde.set(null);
    this.fechaIngresoHasta.set(null);
    this.fechaAsientoDesde.set(null);
    this.fechaAsientoHasta.set(null);
    this.numeroAsiento.set('');
    this.descripcion.set('');
    this.estado.set(null);
    this.tipoAsientoSeleccionado.set(null);
    this.usuario.set('');
    this.resultadosAsientos = [];
    this.categoriaAsiento.set('general');
    this.onCategoriaChange(); // Resetear tipos filtrados
  }

  getEstadoLabel(estadoValor: number | null): string {
    if (estadoValor === null) return 'N/A';
    const estado = this.estados.find(e => e.valor === estadoValor);
    return estado ? estado.etiqueta : 'Desconocido';
  }

  /**
   * Toggle expansión de un asiento para ver sus detalles
   */
  toggleAsiento(asiento: Asiento): void {
    const expandidos = new Set(this.asientosExpandidos());

    if (expandidos.has(asiento.codigo)) {
      // Colapsar
      expandidos.delete(asiento.codigo);
    } else {
      // Expandir y cargar detalles si no existen
      expandidos.add(asiento.codigo);
      if (!this.detallesMap.has(asiento.codigo)) {
        this.cargarDetallesAsiento(asiento.codigo);
      }
    }

    this.asientosExpandidos.set(expandidos);
  }

  /**
   * Verifica si un asiento está expandido
   */
  isAsientoExpandido(codigoAsiento: number): boolean {
    return this.asientosExpandidos().has(codigoAsiento);
  }

  /**
   * Verifica si los detalles de un asiento están cargando
   */
  isLoadingDetalles(codigoAsiento: number): boolean {
    return this.loadingDetalles().has(codigoAsiento);
  }

  /**
   * Carga los detalles de un asiento específico
   */
  cargarDetallesAsiento(codigoAsiento: number): void {
    const loading = new Set(this.loadingDetalles());
    loading.add(codigoAsiento);
    this.loadingDetalles.set(loading);

    // Construir criterio de búsqueda para el asiento
    const criterios: DatosBusqueda[] = [];

    const criterioAsiento = new DatosBusqueda();
    criterioAsiento.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'asiento',
      'codigo',
      codigoAsiento.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioAsiento);

    this.detalleAsientoService.selectByCriteria(criterios).subscribe({
      next: (detalles: DetalleAsiento[] | null) => {
        if (detalles) {
          this.detallesMap.set(codigoAsiento, detalles);
        }
        const loading = new Set(this.loadingDetalles());
        loading.delete(codigoAsiento);
        this.loadingDetalles.set(loading);
      },
      error: (error: any) => {
        console.error('Error al cargar detalles:', error);
        this.snackBar.open('Error al cargar detalles del asiento', 'Cerrar', {
          duration: 3000,
        });
        const loading = new Set(this.loadingDetalles());
        loading.delete(codigoAsiento);
        this.loadingDetalles.set(loading);
      },
    });
  }

  /**
   * Obtiene los detalles de un asiento
   */
  getDetalles(codigoAsiento: number): DetalleAsiento[] {
    return this.detallesMap.get(codigoAsiento) || [];
  }

  /**
   * Calcula el total del debe para un asiento
   */
  getTotalDebe(codigoAsiento: number): number {
    const detalles = this.getDetalles(codigoAsiento);
    return detalles.reduce((sum, d) => sum + (d.valorDebe || 0), 0);
  }

  /**
   * Calcula el total del haber para un asiento
   */
  getTotalHaber(codigoAsiento: number): number {
    const detalles = this.getDetalles(codigoAsiento);
    return detalles.reduce((sum, d) => sum + (d.valorHaber || 0), 0);
  }

  /**
   * Exporta los resultados a CSV
   */
  exportarCSV(): void {
    if (this.resultadosAsientos.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Número', 'Fecha Ingreso', 'Fecha Asiento', 'Tipo', 'Estado', 'Usuario', 'Observaciones'];
    const datos = this.resultadosAsientos.map(asiento => ([
      asiento.numero.toString(),
      this.formatearFecha(asiento.fechaIngreso),
      this.formatearFecha(asiento.fechaAsiento),
      asiento.tipoAsiento.nombre || 'N/A',
      this.getEstadoLabel(asiento.estado),
      asiento.nombreUsuario || 'N/A',
      asiento.observaciones || '-'
    ]));

    // Convertir a formato compatible con CSV
    const datosObjetos = datos.map(row => ({
      'Número': row[0],
      'Fecha Ingreso': row[1],
      'Fecha Asiento': row[2],
      'Tipo': row[3],
      'Estado': row[4],
      'Usuario': row[5],
      'Observaciones': row[6]
    }));

    this.exportService.exportToCSV(datosObjetos, 'Listado_Asientos', headers);
    this.snackBar.open('Archivo CSV generado exitosamente', 'Cerrar', { duration: 3000 });
  }

  /**
   * Exporta los resultados a PDF
   */
  exportarPDF(): void {
    if (this.resultadosAsientos.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Número', 'F. Ingreso', 'F. Asiento', 'Tipo', 'Estado', 'Usuario', 'Observaciones'];
    const dataKeys = ['numero', 'fechaIngresoFormateada', 'fechaAsientoFormateada', 'tipoNombre', 'estadoLabel', 'nombreUsuario', 'observaciones'];

    const datos = this.resultadosAsientos.map(asiento => ({
      numero: asiento.numero.toString(),
      fechaIngresoFormateada: this.formatearFecha(asiento.fechaIngreso),
      fechaAsientoFormateada: this.formatearFecha(asiento.fechaAsiento),
      tipoNombre: asiento.tipoAsiento.nombre || 'N/A',
      estadoLabel: this.getEstadoLabel(asiento.estado),
      nombreUsuario: asiento.nombreUsuario || 'N/A',
      observaciones: asiento.observaciones || '-'
    }));

    this.exportService.exportToPDF(
      datos,
      'Listado_Asientos',
      'Listado de Asientos Contables',
      headers,
      dataKeys
    );

    this.snackBar.open('Archivo PDF generado exitosamente', 'Cerrar', { duration: 3000 });
  }

  /**
   * Exporta un asiento individual con sus detalles a CSV
   */
  exportarAsientoCSV(asiento: Asiento): void {
    const detalles = this.getDetalles(asiento.codigo);

    if (detalles.length === 0) {
      this.snackBar.open('No hay detalles para exportar. Expanda el asiento primero.', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Cuenta', 'Nombre Cuenta', 'Descripción', 'Debe', 'Haber'];
    const datos = detalles.map(detalle => ({
      'Cuenta': detalle.planCuenta?.cuentaContable || 'N/A',
      'Nombre Cuenta': detalle.planCuenta?.nombre || 'N/A',
      'Descripción': detalle.descripcion || '-',
      'Debe': detalle.valorDebe ? detalle.valorDebe.toFixed(2) : '0.00',
      'Haber': detalle.valorHaber ? detalle.valorHaber.toFixed(2) : '0.00'
    }));

    const filename = `Asiento_${asiento.numero}_Detalles`;
    this.exportService.exportToCSV(datos, filename, headers);
    this.snackBar.open('Detalles del asiento exportados a CSV', 'Cerrar', { duration: 3000 });
  }

  /**
   * Exporta un asiento individual con sus detalles a PDF
   */
  exportarAsientoPDF(asiento: Asiento): void {
    const detalles = this.getDetalles(asiento.codigo);

    if (detalles.length === 0) {
      this.snackBar.open('No hay detalles para exportar. Expanda el asiento primero.', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Cuenta', 'Nombre', 'Descripción', 'Debe', 'Haber'];
    const dataKeys = ['cuenta', 'nombreCuenta', 'descripcion', 'debe', 'haber'];

    const datos = detalles.map(detalle => ({
      cuenta: detalle.planCuenta?.cuentaContable || 'N/A',
      nombreCuenta: detalle.planCuenta?.nombre || 'N/A',
      descripcion: detalle.descripcion || '-',
      debe: detalle.valorDebe ? detalle.valorDebe.toFixed(2) : '0.00',
      haber: detalle.valorHaber ? detalle.valorHaber.toFixed(2) : '0.00'
    }));

    const title = `Asiento #${asiento.numero} - Detalles\nFecha: ${this.formatearFecha(asiento.fechaAsiento)} | Estado: ${this.getEstadoLabel(asiento.estado)}`;
    const filename = `Asiento_${asiento.numero}_Detalles`;

    this.exportService.exportToPDF(
      datos,
      filename,
      title,
      headers,
      dataKeys
    );

    this.snackBar.open('Detalles del asiento exportados a PDF', 'Cerrar', { duration: 3000 });
  }

  /**
   * Formatea una fecha a string DD/MM/YYYY para visualización
   * Maneja arrays de números [año, mes, día, hora?, minuto?, segundo?] del backend Java
   */
  formatearFecha(fecha: Date | string | any): string {
    if (!fecha) return '-';

    // Si es un array (formato del backend Java LocalDateTime/LocalDate)
    if (Array.isArray(fecha)) {
      const [anio, mes, dia] = fecha;
      return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
    }

    // Si es string o Date
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  /**
   * Formatea un objeto Date a string yyyy-MM-dd para enviar al backend (formato ISO 8601)
   */
  private formatDate(date: Date): string {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Formatea un objeto Date a string yyyy-MM-dd HH:mm:ss para enviar al backend (formato ISO 8601)
   * @param date Fecha a formatear
   * @param time Hora a agregar (por defecto '00:00:00')
   */
  private formatDateWithTime(date: Date, time: string = '00:00:00'): string {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${anio}-${mes}-${dia} ${time}`;
  }

  /**
   * Navega a la pantalla de edición de asiento
   */
  editarAsiento(asiento: Asiento): void {
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico', asiento.codigo], {
      queryParams: { fromReport: 'true' }
    });
  }
}
