import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

import { Entidad } from '../../model/entidad';
import { Participe } from '../../model/participe';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { Aporte } from '../../model/aporte';
import { Prestamo } from '../../model/prestamo';
import { AporteService } from '../../service/aporte.service';
import { EntidadService } from '../../service/entidad.service';
import { ParticipeService } from '../../service/participe.service';
import { PrestamoService } from '../../service/prestamo.service';
import {
  ConfirmacionDialogComponent,
  ConfirmacionDialogData,
} from './confirmacion-dialog.component';
import { PagoDialogComponent, PagoDialogData, PagoDialogResult } from './pago-dialog.component';

@Component({
  selector: 'app-cruce-valores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialFormModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatPaginatorModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './cruce-valores.component.html',
  styleUrl: './cruce-valores.component.scss',
})
export class CruceValoresComponent implements OnInit {
  // Inyecciones
  private entidadService = inject(EntidadService);
  private participeService = inject(ParticipeService);
  private aporteService = inject(AporteService);
  private prestamoService = inject(PrestamoService);
  private exportService = inject(ExportService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Búsqueda
  searchText: string = '';
  isSearching: boolean = false;
  mostrarBusqueda: boolean = true;

  // Entidad encontrada
  entidadEncontrada: Entidad | null = null;
  participeEncontrado: Participe | null = null;

  // Datos de aportes y cruce de valores
  aportes: Aporte[] = [];
  cruceValores: any[] = [];
  totalCruce: number = 0;

  // Agrupación por tipo de aporte
  aportesAgrupados: Map<string, any[]> = new Map();
  tiposAporte: string[] = [];

  // Datos de préstamos
  prestamos: Prestamo[] = [];
  prestamosAgrupados: Map<string, any[]> = new Map();
  productosCredito: string[] = [];

  // Drag & Drop state
  tipoAporteDragging: string | null = null;
  prestamoHovering: number | null = null;

  // Loading states
  isLoadingBusqueda: boolean = false;
  isLoadingDatos: boolean = false;

  // Columnas de la tabla
  displayedColumns: string[] = ['fecha', 'concepto', 'debe', 'haber', 'saldo'];

  ngOnInit(): void {
    // Verificar si hay código de entidad en los query params
    this.route.queryParams.subscribe((params: any) => {
      const codigoEntidadParam = params['codigoEntidad'];

      if (codigoEntidadParam) {
        const codigo = Number(codigoEntidadParam);
        this.cargarEntidadPorCodigo(codigo);
      }
    });
  }

  /**
   * Busca una entidad por cédula, razón social o nombre comercial
   */
  buscarEntidad(): void {
    if (!this.searchText.trim()) {
      this.snackBar.open('Por favor ingrese un valor de búsqueda', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSearching = true;
    this.entidadEncontrada = null;
    const searchValue = this.searchText.trim();

    // Crear criterios de búsqueda usando el patrón de ParticipeDashComponent
    const criterioConsultaArray: DatosBusqueda[] = [];

    // Búsqueda por número de identificación
    let criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'numeroIdentificacion',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterioConsultaArray.push(criterio);

    // Búsqueda por razón social con operador OR
    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'razonSocial',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    // Búsqueda por nombre comercial con operador OR
    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombreComercial',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    this.entidadService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (entidades: any) => {
        this.isSearching = false;
        if (entidades && entidades.length > 0) {
          this.entidadEncontrada = entidades[0] as Entidad;
          this.cargarParticipe(this.entidadEncontrada.codigo);
        } else {
          this.snackBar.open('No se encontró ninguna entidad', 'Cerrar', { duration: 3000 });
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error al buscar entidad:', error);
        this.snackBar.open('Error al buscar entidad', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Carga una entidad por su código
   */
  private cargarEntidadPorCodigo(codigo: number): void {
    this.isLoadingBusqueda = true;
    this.entidadService.getById(String(codigo)).subscribe({
      next: (entidad) => {
        this.entidadEncontrada = entidad;
        this.cargarParticipe(codigo);
        this.isLoadingBusqueda = false;
      },
      error: (err) => {
        console.error('Error al cargar entidad:', err);
        this.snackBar.open('Error al cargar información de entidad', 'Cerrar', { duration: 3000 });
        this.isLoadingBusqueda = false;
      },
    });
  }

  /**
   * Carga los datos del partícipe
   */
  private cargarParticipe(codigoEntidad: number): void {
    this.isLoadingDatos = true;

    const criterios: DatosBusqueda[] = [];
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(codigoEntidad),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    this.participeService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const participes = Array.isArray(data) ? data : [data];
        if (participes && participes.length > 0) {
          this.participeEncontrado = participes[0];
          // Cargar aportes y préstamos de la entidad
          this.cargarCruceValores();
          this.cargarPrestamos();
        }
        this.isLoadingDatos = false;
      },
      error: (err) => {
        console.error('Error al cargar partícipe:', err);
        this.isLoadingDatos = false;
      },
    });
  }

  /**
   * Carga los datos de cruce de valores desde aportes
   */
  private cargarCruceValores(): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      return;
    }

    const criterios: DatosBusqueda[] = [];
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(this.entidadEncontrada.codigo),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    // Ordenar por fecha de transacción
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('fechaTransaccion');
    criterios.push(criterioOrden);

    this.aporteService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const aportes = Array.isArray(data) ? data : data ? [data] : [];
        this.aportes = aportes;

        if (aportes && aportes.length > 0) {
          // Agrupar aportes por tipo
          this.agruparAportesPorTipo(aportes);

          // Convertir aportes a formato de cruce de valores
          this.cruceValores = aportes.map((aporte) => ({
            fecha: this.convertirFecha(aporte.fechaTransaccion),
            concepto: aporte.glosa || aporte.tipoAporte?.nombre || 'Aporte',
            tipoAporte: aporte.tipoAporte?.nombre || 'Sin Tipo',
            debe: aporte.valor || 0,
            haber: aporte.valorPagado || 0,
            saldo: aporte.saldo || 0,
          }));

          // Calcular saldo acumulado
          let saldoAcumulado = 0;
          this.cruceValores = this.cruceValores.map((item) => {
            saldoAcumulado += item.debe - item.haber;
            return { ...item, saldo: saldoAcumulado };
          });

          this.totalCruce = saldoAcumulado;
        } else {
          this.cruceValores = [];
          this.totalCruce = 0;
          this.aportesAgrupados.clear();
          this.tiposAporte = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar aportes:', err);
        this.snackBar.open('Error al cargar aportes', 'Cerrar', { duration: 3000 });
        this.cruceValores = [];
        this.totalCruce = 0;
      },
    });
  }

  /**
   * Agrupa los aportes por tipo de aporte
   */
  private agruparAportesPorTipo(aportes: Aporte[]): void {
    this.aportesAgrupados.clear();

    aportes.forEach((aporte) => {
      const tipoNombre = aporte.tipoAporte?.nombre || 'Sin Tipo';

      if (!this.aportesAgrupados.has(tipoNombre)) {
        this.aportesAgrupados.set(tipoNombre, []);
      }

      const item = {
        fecha: this.convertirFecha(aporte.fechaTransaccion),
        concepto: aporte.glosa || tipoNombre,
        debe: aporte.valor || 0,
        haber: aporte.valorPagado || 0,
        saldo: aporte.saldo || 0,
      };

      this.aportesAgrupados.get(tipoNombre)?.push(item);
    });

    // Obtener lista de tipos ordenada
    this.tiposAporte = Array.from(this.aportesAgrupados.keys()).sort();
  }

  /**
   * Obtiene los aportes de un tipo específico
   */
  getAportesPorTipo(tipoAporte: string): any[] {
    return this.aportesAgrupados.get(tipoAporte) || [];
  }

  /**
   * Calcula el total debe de un tipo de aporte
   */
  getTotalDebePorTipo(tipoAporte: string): number {
    const aportes = this.getAportesPorTipo(tipoAporte);
    return aportes.reduce((sum, item) => sum + (item.debe || 0), 0);
  }

  /**
   * Calcula el total haber de un tipo de aporte
   */
  getTotalHaberPorTipo(tipoAporte: string): number {
    const aportes = this.getAportesPorTipo(tipoAporte);
    return aportes.reduce((sum, item) => sum + (item.haber || 0), 0);
  }

  /**
   * Calcula el saldo de un tipo de aporte
   */
  getSaldoPorTipo(tipoAporte: string): number {
    return this.getTotalDebePorTipo(tipoAporte) - this.getTotalHaberPorTipo(tipoAporte);
  }

  /**
   * Ver detalle de aportes de un tipo específico
   */
  verDetalleAportes(tipoAporte: string): void {
    const aportes = this.getAportesPorTipo(tipoAporte);
    const debe = this.getTotalDebePorTipo(tipoAporte);
    const haber = this.getTotalHaberPorTipo(tipoAporte);
    const saldo = this.getSaldoPorTipo(tipoAporte);

    const mensaje = `
      Tipo: ${tipoAporte}
      Cantidad de registros: ${aportes.length}
      Total Debe: ${debe.toFixed(2)}
      Total Haber: ${haber.toFixed(2)}
      Saldo: ${saldo.toFixed(2)}
    `;

    this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
  }

  /**
   * Carga los préstamos de la entidad
   */
  private cargarPrestamos(): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      return;
    }

    const criterios: DatosBusqueda[] = [];
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(this.entidadEncontrada.codigo),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    this.prestamoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const prestamos = Array.isArray(data) ? data : data ? [data] : [];
        this.prestamos = prestamos;

        if (prestamos && prestamos.length > 0) {
          this.agruparPrestamosPorProducto(prestamos);
        } else {
          this.prestamosAgrupados.clear();
          this.productosCredito = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar préstamos:', err);
        this.snackBar.open('Error al cargar préstamos', 'Cerrar', { duration: 3000 });
        this.prestamosAgrupados.clear();
        this.productosCredito = [];
      },
    });
  }

  /**
   * Agrupa los préstamos por producto
   */
  private agruparPrestamosPorProducto(prestamos: Prestamo[]): void {
    this.prestamosAgrupados.clear();

    prestamos.forEach((prestamo) => {
      const productoNombre = prestamo.producto?.nombre || 'Sin Producto';

      if (!this.prestamosAgrupados.has(productoNombre)) {
        this.prestamosAgrupados.set(productoNombre, []);
      }

      const item = {
        codigo: prestamo.codigo,
        fecha: this.convertirFecha(prestamo.fecha),
        montoSolicitado: prestamo.montoSolicitado || 0,
        totalPagado: prestamo.totalPagado || 0,
        saldoTotal: prestamo.saldoTotal || 0,
        estadoPrestamo: prestamo.estadoPrestamo?.nombre || 'Sin Estado',
      };

      this.prestamosAgrupados.get(productoNombre)?.push(item);
    });

    // Obtener lista de productos ordenada
    this.productosCredito = Array.from(this.prestamosAgrupados.keys()).sort();
  }

  /**
   * Obtiene los préstamos de un producto específico
   */
  getPrestamosPorProducto(producto: string): any[] {
    return this.prestamosAgrupados.get(producto) || [];
  }

  /**
   * Calcula el total monto solicitado de un producto
   */
  getTotalMontoSolicitadoPorProducto(producto: string): number {
    const prestamos = this.getPrestamosPorProducto(producto);
    return prestamos.reduce((sum, item) => sum + (item.montoSolicitado || 0), 0);
  }

  /**
   * Calcula el total pagado de un producto
   */
  getTotalPagadoPorProducto(producto: string): number {
    const prestamos = this.getPrestamosPorProducto(producto);
    return prestamos.reduce((sum, item) => sum + (item.totalPagado || 0), 0);
  }

  /**
   * Calcula el saldo total de un producto
   */
  getSaldoTotalPorProducto(producto: string): number {
    const prestamos = this.getPrestamosPorProducto(producto);
    return prestamos.reduce((sum, item) => sum + (item.saldoTotal || 0), 0);
  }

  /**
   * Ver detalle de préstamos de un producto específico
   */
  verDetallePrestamos(producto: string): void {
    const prestamos = this.getPrestamosPorProducto(producto);
    const montoSolicitado = this.getTotalMontoSolicitadoPorProducto(producto);
    const totalPagado = this.getTotalPagadoPorProducto(producto);
    const saldoTotal = this.getSaldoTotalPorProducto(producto);

    const mensaje = `
      Producto: ${producto}
      Cantidad de préstamos: ${prestamos.length}
      Monto Solicitado: ${montoSolicitado.toFixed(2)}
      Total Pagado: ${totalPagado.toFixed(2)}
      Saldo Total: ${saldoTotal.toFixed(2)}
    `;

    this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
  }

  /**
   * Convierte una fecha del backend a objeto Date válido
   */
  private convertirFecha(fecha: any): Date {
    if (!fecha) return new Date();

    // Si ya es un Date válido, retornar
    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend puede enviar 1-12
      // Asumimos que el backend envía 1-12 (mes real), así que restamos 1
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    // Si es string, intentar parsear
    if (typeof fecha === 'string') {
      // Remover la zona horaria [UTC] si existe
      const fechaLimpia = fecha.replace(/\[.*?\]/g, '');
      return new Date(fechaLimpia);
    }

    // Si es number (timestamp)
    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    // Último recurso
    return new Date(fecha);
  }

  /**
   * Limpia el campo de búsqueda
   */
  limpiarBusqueda(): void {
    this.searchText = '';
    this.entidadEncontrada = null;
    this.participeEncontrado = null;
    this.cruceValores = [];
  }

  /**
   * Regresa a la pantalla anterior
   */
  regresarAPantallaAnterior(): void {
    this.router.navigate(['/menucreditos']);
  }

  /**
   * Exporta los datos a CSV
   */
  exportarCSV(): void {
    if (!this.cruceValores || this.cruceValores.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Fecha', 'Concepto', 'Debe', 'Haber', 'Saldo'];
    const dataKeys = ['fecha', 'concepto', 'debe', 'haber', 'saldo'];
    const filename = `cruce-valores-${this.entidadEncontrada?.numeroIdentificacion}-${
      new Date().toISOString().split('T')[0]
    }`;

    this.exportService.exportToCSV(this.cruceValores, filename, headers, dataKeys);
  }

  /**
   * Exporta los datos a PDF
   */
  exportarPDF(): void {
    if (!this.cruceValores || this.cruceValores.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = ['Fecha', 'Concepto', 'Debe', 'Haber', 'Saldo'];
    const dataKeys = ['fecha', 'concepto', 'debe', 'haber', 'saldo'];
    const filename = `cruce-valores-${this.entidadEncontrada?.numeroIdentificacion}`;
    const title = `Cruce de Valores - ${this.entidadEncontrada?.razonSocial}`;

    this.exportService.exportToPDF(this.cruceValores, filename, title, headers, dataKeys);
  }

  /**
   * Calcula el total del debe
   */
  getTotalDebe(): number {
    return this.cruceValores.reduce((sum, item) => sum + (item.debe || 0), 0);
  }

  /**
   * Calcula el total del haber
   */
  getTotalHaber(): number {
    return this.cruceValores.reduce((sum, item) => sum + (item.haber || 0), 0);
  }

  // ===== Métodos para Drag & Drop =====

  /**
   * Inicia el drag de un tipo de aporte
   */
  onDragStart(event: DragEvent, tipoAporte: string): void {
    this.tipoAporteDragging = tipoAporte;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('tipoAporte', tipoAporte);

      // Agregar clase al body para feedback visual global
      document.body.classList.add('dragging-active');
    }
  }

  /**
   * Termina el drag
   */
  onDragEnd(event: DragEvent): void {
    this.tipoAporteDragging = null;
    this.prestamoHovering = null;

    // Remover clase del body
    document.body.classList.remove('dragging-active');
  }

  /**
   * Permite el drop sobre un préstamo
   */
  onDragOver(event: DragEvent, prestamo: Prestamo): void {
    event.preventDefault();
    event.stopPropagation(); // Evitar propagación

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    // Actualizar hover solo si es diferente (reduce re-renders)
    if (this.prestamoHovering !== prestamo.codigo) {
      this.prestamoHovering = prestamo.codigo;
    }
  }

  /**
   * Cuando el drag sale del préstamo
   */
  onDragLeave(event: DragEvent): void {
    // Solo limpiar si realmente salimos de la fila (no de una celda interna)
    const target = event.relatedTarget as HTMLElement;
    const currentRow = event.currentTarget as HTMLElement;

    if (!currentRow.contains(target)) {
      this.prestamoHovering = null;
    }
  }

  /**
   * Maneja el drop de un aporte sobre un préstamo
   */
  onDrop(event: DragEvent, prestamo: Prestamo): void {
    event.preventDefault();
    event.stopPropagation();

    // Limpiar estados visuales
    this.prestamoHovering = null;
    this.tipoAporteDragging = null;
    document.body.classList.remove('dragging-active');

    const tipoAporte = event.dataTransfer?.getData('tipoAporte');
    if (!tipoAporte) {
      return;
    }

    this.abrirDialogPago(tipoAporte, prestamo);
  }

  /**
   * Abre el diálogo de pago
   */
  abrirDialogPago(tipoAporte: string, prestamo: Prestamo): void {
    const valorPagado = this.getTotalHaberPorTipo(tipoAporte); // Valor Pagado del aporte

    const dialogData: PagoDialogData = {
      tipoAporte: tipoAporte,
      valorPagado: valorPagado,
      prestamoCodigo: prestamo.codigo,
      prestamoProducto: prestamo.producto?.nombre || 'Sin Producto',
      saldoPrestamo: prestamo.saldoTotal || 0,
    };

    const dialogRef = this.dialog.open(PagoDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result: PagoDialogResult) => {
      if (result) {
        this.confirmarPago(tipoAporte, prestamo, result);
      }
    });
  }

  /**
   * Muestra confirmación antes de procesar el pago
   */
  confirmarPago(tipoAporte: string, prestamo: Prestamo, result: PagoDialogResult): void {
    const tipoPagoTexto = result.tipoPago === 'parcial' ? 'Parcial' : 'Completo';
    const mensaje = `¿Está seguro de que desea realizar el pago ${tipoPagoTexto} de $${result.montoPago.toFixed(
      2
    )} desde el aporte "${tipoAporte}" hacia el Préstamo #${prestamo.codigo}?`;

    const confirmData: ConfirmacionDialogData = {
      titulo: 'Confirmar Pago',
      mensaje: mensaje,
      tipoIcono: 'warning',
    };

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      data: confirmData,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.procesarPago(tipoAporte, prestamo, result);
      }
    });
  }

  /**
   * Procesa el pago y envía los datos al backend
   */
  procesarPago(tipoAporte: string, prestamo: Prestamo, result: PagoDialogResult): void {
    const tipoPagoTexto = result.tipoPago === 'parcial' ? 'Parcial' : 'Completo';

    // Preparar datos para enviar al backend
    const datosPago = {
      tipoAporte: tipoAporte,
      entidad: this.entidadEncontrada?.codigo || null,
      idPrestamo: prestamo.codigo,
      montoPagar: result.montoPago,
      tipoPago: result.tipoPago,
      // Datos adicionales útiles
      numeroIdentificacion: this.entidadEncontrada?.numeroIdentificacion,
      razonSocial: this.entidadEncontrada?.razonSocial,
      prestamoProducto: prestamo.producto?.nombre,
      saldoPrestamo: prestamo.saldoTotal,
      valorPagadoAporte: result.montoPago, // Monto que se descuenta del aporte
    };

    console.log('=== DATOS PARA BACKEND - CRUCE DE VALORES ===');
    console.log('Variables principales:', {
      tipoAporte: datosPago.tipoAporte,
      entidad: datosPago.entidad,
      idPrestamo: datosPago.idPrestamo,
      montoPagar: datosPago.montoPagar,
    });
    console.log('Datos completos:', datosPago);
    console.log('=============================================');

    // TODO: Descomentar cuando el backend esté listo
    // this.pagoService.realizarCruce(datosPago).subscribe({
    //   next: (response) => {
    //     this.snackBar.open(`✅ Pago ${tipoPagoTexto} realizado exitosamente`, 'Cerrar', { duration: 4000 });
    //     this.cargarCruceValores(); // Refrescar aportes
    //     this.cargarPrestamos(); // Refrescar préstamos
    //   },
    //   error: (error) => {
    //     console.error('Error al procesar pago:', error);
    //     this.snackBar.open('❌ Error al procesar el pago', 'Cerrar', { duration: 4000 });
    //   }
    // });

    this.snackBar.open(
      `✅ Pago ${tipoPagoTexto} realizado exitosamente por $${result.montoPago.toFixed(2)}`,
      'Cerrar',
      { duration: 4000 }
    );
  }
}
