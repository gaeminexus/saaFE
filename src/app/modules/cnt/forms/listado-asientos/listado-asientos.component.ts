import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { Asiento, EstadoAsiento } from '../../model/asiento';
import { AsientoService } from '../../service/asiento.service';

@Component({
  selector: 'app-listado-asientos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './listado-asientos.component.html',
  styleUrls: ['./listado-asientos.component.scss'],
})
export class ListadoAsientosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Datos
  asientos: Asiento[] = [];
  asientosCompletos: Asiento[] = []; // Datos originales sin filtrar
  dataSource = new MatTableDataSource<Asiento>();
  displayedColumns: string[] = [
    'numero',
    'fechaAsiento',
    'tipoAsiento',
    'observaciones',
    'estado',
    'acciones',
  ];
  totalElements = 0;
  error: string | null = null;

  // Estados
  loading = false;
  idEmpresa = parseInt(localStorage.getItem('idEmpresa') || '0', 10);

  // Filtros
  filtroNumero = new FormControl('');
  filtroEstado = new FormControl('');
  filtroFechaDesde = new FormControl(null);
  filtroFechaHasta = new FormControl(null);
  filtroTipoAsiento = new FormControl('');

  // Opciones de estado para el filtro (se cargan desde rubros)
  estadosDisponibles: { valor: any; texto: string }[] = [{ valor: '', texto: 'Todos los estados' }];

  // Opciones de tipo de asiento para el filtro
  tiposAsientoDisponibles: { valor: any; texto: string }[] = [
    { valor: '', texto: 'Todos los tipos' },
  ];

  // Enum para template
  EstadoAsiento = EstadoAsiento;

  constructor(
    private asientoService: AsientoService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.idEmpresa) {
      this.showMessage('⚠️ No se encontró empresa en sesión', 'error');
      return;
    }

    // Configurar listeners de filtros
    this.filtroNumero.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    this.filtroEstado.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    this.filtroFechaDesde.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    this.filtroFechaHasta.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    this.filtroTipoAsiento.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    // Cargar opciones desde rubros antes de cargar asientos
    this.cargarEstadosDesdeRubros();
    this.cargarTiposAsientoDesdeRubros();
    this.loadAsientos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Carga asientos usando selectByCriteria con criterios DatosBusqueda
   */
  loadAsientos(): void {
    this.loading = true;
    this.error = null;

    const idEmpresa = this.idEmpresa;
    console.log(`🔍 Iniciando carga de asientos para empresa ${idEmpresa}...`);

    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa (código dinámico)
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(idEmpresa),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterioEmpresa);

    this.asientoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        console.log(`📡 Respuesta del backend para asientos empresa ${idEmpresa}:`, data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log(`📋 Lista de asientos procesada para empresa ${idEmpresa}:`, list);

        // Transformar fechas y ordenar por número de asiento ascendente (numérico)
        this.asientosCompletos = list
          .map((item: any) => ({
            ...item,
            fechaAsiento: item.fechaAsiento ? this.normalizeFecha(item.fechaAsiento) : null,
          }))
          .sort((a: any, b: any) => {
            // Ordenamiento numérico por número de asiento
            const numeroA = parseInt(a.numero) || 0;
            const numeroB = parseInt(b.numero) || 0;
            return numeroA - numeroB;
          });

        // Aplicar filtros iniciales
        this.aplicarFiltros();
        this.loading = false;

        console.log(
          `✅ Se cargaron ${list.length} asientos para empresa ${idEmpresa} exitosamente`
        );

        if (this.asientos.length > 0) {
          this.showMessage('Asientos cargados correctamente', 'success');
        }
      },
      error: (err) => {
        console.error(`❌ Error al cargar asientos con empresa ${idEmpresa}:`, err);

        // Fallback a getAll() si falla el filtro
        console.log('🔄 Probando getAll como fallback...');
        this.asientoService.getAll().subscribe({
          next: (data) => {
            console.log('📡 Respuesta fallback getAll:', data);
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            const filtered = list.filter((asiento: any) => asiento?.empresa?.codigo === idEmpresa);

            // Transformar fechas y ordenar por fecha descendente
            this.asientos = filtered
              .map((item: any) => ({
                ...item,
                fechaAsiento: item.fechaAsiento ? this.normalizeFecha(item.fechaAsiento) : null,
              }))
              .sort((a: any, b: any) => {
                const fechaA = new Date(a.fechaAsiento || 0).getTime();
                const fechaB = new Date(b.fechaAsiento || 0).getTime();
                return fechaB - fechaA;
              });

            this.totalElements = this.asientos.length;
            this.dataSource.data = this.asientos;
            this.loading = false;

            if (this.asientos.length > 0) {
              this.showMessage('Asientos cargados correctamente', 'success');
            }
          },
          error: () => {
            this.error = 'Error al recuperar datos de asientos contables';
            this.loading = false;
            this.showMessage('Error al cargar asientos. Verifique la conexión.', 'error');
          },
        });
      },
    });
  }

  /**
   * Aplica los filtros de búsqueda a los datos
   */
  aplicarFiltros(): void {
    let asientosFiltrados = [...this.asientosCompletos];

    // Filtro por número
    const numeroFiltro = this.filtroNumero.value?.toString().trim();
    if (numeroFiltro) {
      asientosFiltrados = asientosFiltrados.filter((asiento) =>
        asiento.numero.toString().includes(numeroFiltro)
      );
    }

    // Filtro por estado
    const estadoFiltro = this.filtroEstado.value;
    if (estadoFiltro !== '' && estadoFiltro !== null && estadoFiltro !== undefined) {
      asientosFiltrados = asientosFiltrados.filter(
        (asiento) => asiento.estado === parseInt(estadoFiltro.toString())
      );
    }

    // Filtro por fecha desde
    const fechaDesde = this.filtroFechaDesde.value;
    if (fechaDesde) {
      const fechaDesdeTime = new Date(fechaDesde).getTime();
      asientosFiltrados = asientosFiltrados.filter((asiento) => {
        if (!asiento.fechaAsiento) return false;
        const fechaAsientoTime = new Date(asiento.fechaAsiento).getTime();
        return fechaAsientoTime >= fechaDesdeTime;
      });
    }

    // Filtro por fecha hasta
    const fechaHasta = this.filtroFechaHasta.value;
    if (fechaHasta) {
      const fechaHastaTime = new Date(fechaHasta).setHours(23, 59, 59, 999);
      asientosFiltrados = asientosFiltrados.filter((asiento) => {
        if (!asiento.fechaAsiento) return false;
        const fechaAsientoTime = new Date(asiento.fechaAsiento).getTime();
        return fechaAsientoTime <= fechaHastaTime;
      });
    }

    // Filtro por tipo de asiento
    const tipoAsientoFiltro = this.filtroTipoAsiento.value;
    if (tipoAsientoFiltro !== '' && tipoAsientoFiltro !== null && tipoAsientoFiltro !== undefined) {
      asientosFiltrados = asientosFiltrados.filter((asiento) => {
        if (!asiento.tipoAsiento) return false;
        // Comparar por código si es un objeto, o por valor directo
        const tipoAsientoValor =
          typeof asiento.tipoAsiento === 'object'
            ? asiento.tipoAsiento.codigo
            : asiento.tipoAsiento;
        return tipoAsientoValor === parseInt(tipoAsientoFiltro.toString());
      });
    }

    // Actualizar datos mostrados
    this.asientos = asientosFiltrados;
    this.dataSource.data = this.asientos;
    this.totalElements = this.asientos.length;

    console.log(
      `🔍 Filtros aplicados: ${this.asientos.length} de ${this.asientosCompletos.length} asientos mostrados`
    );
  }

  /**
   * Limpiar todos los filtros
   */
  limpiarFiltros(): void {
    this.filtroNumero.setValue('');
    this.filtroEstado.setValue('');
    this.filtroFechaDesde.setValue(null);
    this.filtroFechaHasta.setValue(null);
    this.filtroTipoAsiento.setValue('');
  }

  /**
   * Carga los estados de asientos desde los rubros del sistema
   * Siguiendo las mejores prácticas de DetalleRubroService
   */
  cargarEstadosDesdeRubros(): void {
    try {
      // 1. Verificar que los datos están cargados (práctica recomendada)
      if (!this.detalleRubroService.estanDatosCargados()) {
        console.warn('⚠️ DetalleRubroService: Datos no cargados aún');
        this.usarEstadosPorDefecto();
        return;
      }

      // 2. Usar directamente el ID conocido del rubro (ID 21 = Estados de Asientos)
      const RUBRO_ESTADOS_ASIENTOS = 21;
      const estadosRubros = this.detalleRubroService.getDetallesByParent(RUBRO_ESTADOS_ASIENTOS);

      if (estadosRubros && estadosRubros.length > 0) {
        console.log(`✅ Estados cargados desde rubro ${RUBRO_ESTADOS_ASIENTOS}:`, estadosRubros);

        // 3. Construir opciones para el dropdown
        this.estadosDisponibles = [
          { valor: '', texto: 'Todos los estados' },
          ...estadosRubros
            .filter((detalle) => detalle.estado === 1) // Solo activos
            .map((detalle) => ({
              valor: detalle.codigoAlterno,
              texto: detalle.descripcion,
            })),
        ];

        console.log('📋 Estados disponibles configurados:', this.estadosDisponibles);
        return;
      }

      // Fallback si el rubro específico está vacío
      console.warn(
        `⚠️ Rubro ${RUBRO_ESTADOS_ASIENTOS} no tiene detalles, usando valores por defecto`
      );
      this.usarEstadosPorDefecto();
    } catch (error) {
      console.error('❌ Error cargando estados desde rubros:', error);
      this.usarEstadosPorDefecto();
    }
  }

  /**
   * Configura estados por defecto cuando no se pueden cargar desde rubros
   */
  private usarEstadosPorDefecto(): void {
    this.estadosDisponibles = [
      { valor: '', texto: 'Todos los estados' },
      { valor: EstadoAsiento.ACTIVO, texto: 'Activo' },
      { valor: EstadoAsiento.ANULADO, texto: 'Anulado' },
      { valor: EstadoAsiento.REVERSADO, texto: 'Reversado' },
      { valor: EstadoAsiento.INCOMPLETO, texto: 'Incompleto' },
    ];
  }

  /**
   * Carga los tipos de asientos desde los rubros del sistema
   * Siguiendo las mejores prácticas de DetalleRubroService
   */
  cargarTiposAsientoDesdeRubros(): void {
    try {
      // Verificar que los datos están cargados
      if (!this.detalleRubroService.estanDatosCargados()) {
        console.warn('⚠️ DetalleRubroService: Datos no cargados aún');
        this.usarTiposAsientoPorDefecto();
        return;
      }

      // Usar el ID conocido del rubro para tipos de asiento (ajustar según su sistema)
      const RUBRO_TIPOS_ASIENTO = 22; // Asumiendo que el rubro 22 contiene tipos de asiento
      const tiposRubros = this.detalleRubroService.getDetallesByParent(RUBRO_TIPOS_ASIENTO);

      if (tiposRubros && tiposRubros.length > 0) {
        console.log(
          `✅ Tipos de asiento cargados desde rubro ${RUBRO_TIPOS_ASIENTO}:`,
          tiposRubros
        );

        this.tiposAsientoDisponibles = [
          { valor: '', texto: 'Todos los tipos' },
          ...tiposRubros
            .filter((detalle) => detalle.estado === 1) // Solo activos
            .map((detalle) => ({
              valor: detalle.codigoAlterno,
              texto: detalle.descripcion,
            })),
        ];

        console.log('📋 Tipos de asiento disponibles configurados:', this.tiposAsientoDisponibles);
        return;
      }

      // Fallback si el rubro específico está vacío
      console.warn(`⚠️ Rubro ${RUBRO_TIPOS_ASIENTO} no tiene detalles, usando valores por defecto`);
      this.usarTiposAsientoPorDefecto();
    } catch (error) {
      console.error('❌ Error cargando tipos de asiento desde rubros:', error);
      this.usarTiposAsientoPorDefecto();
    }
  }

  /**
   * Configura tipos de asiento por defecto cuando no se pueden cargar desde rubros
   */
  private usarTiposAsientoPorDefecto(): void {
    this.tiposAsientoDisponibles = [
      { valor: '', texto: 'Todos los tipos' },
      { valor: 1, texto: 'Ajuste' },
      { valor: 2, texto: 'Diario' },
      { valor: 3, texto: 'Apertura' },
      { valor: 4, texto: 'Cierre' },
    ];
  }

  /**
   * Obtiene el texto del estado del asiento desde rubros
   * Siguiendo las mejores prácticas de DetalleRubroService
   */
  getEstadoTexto(estado: number): string {
    // 1. Primero buscar en los estados ya cargados (más eficiente)
    const estadoEncontrado = this.estadosDisponibles.find((est) => est.valor === estado);
    if (estadoEncontrado && estadoEncontrado.valor !== '') {
      return estadoEncontrado.texto;
    }

    // 2. Si no está en el cache local, usar el método recomendado del servicio
    if (this.detalleRubroService.estanDatosCargados()) {
      const RUBRO_ESTADOS_ASIENTOS = 21;
      const descripcion = this.detalleRubroService.getDescripcionByParentAndAlterno(
        RUBRO_ESTADOS_ASIENTOS,
        estado
      );
      if (descripcion) {
        return descripcion;
      }
    }

    // 3. Fallback final a método original del servicio
    return this.asientoService.getEstadoTexto(estado);
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoAsiento): string {
    return this.asientoService.getEstadoBadgeClass(estado);
  }

  /**
   * Navega a la edición de un asiento
   */
  editarAsiento(asiento: Asiento): void {
    console.log('🔧 Editando asiento:', asiento);
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico'], {
      queryParams: { id: asiento.codigo, mode: 'edit' },
    });
  }

  /**
   * Ver detalles de un asiento
   */
  verDetalle(asiento: Asiento): void {
    console.log('👁️ Viendo detalle de asiento:', asiento);
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico'], {
      queryParams: { id: asiento.codigo, mode: 'view' },
    });
  }

  /**
   * Crear nuevo asiento
   */
  nuevoAsiento(): void {
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico']);
  }

  /**
   * Recargar listado
   */
  refrescar(): void {
    this.loadAsientos();
  }

  /**
   * Muestra un mensaje usando MatSnackBar
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const panelClass =
      type === 'success'
        ? 'snackbar-success'
        : type === 'error'
        ? 'snackbar-error'
        : 'snackbar-info';

    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [panelClass],
    });
  }

  /**
   * Normaliza el formato de fecha para que sea compatible con DatePipe
   * Convierte "2025-12-10T00:09:35Z[UTC]" a formato ISO estándar
   */
  normalizeFecha(fecha: string): string {
    if (!fecha) return '';
    // Remover el sufijo [UTC] si existe
    const fechaLimpia = fecha.replace(/\[UTC\]$/, '');
    // Verificar si es una fecha válida
    const fechaObj = new Date(fechaLimpia);
    return fechaObj.toISOString();
  }

  /**
   * Obtiene el nombre del tipo de asiento
   */
  getTipoAsientoNombre(tipoAsiento: any): string {
    if (!tipoAsiento) return 'N/A';
    return typeof tipoAsiento === 'object' ? tipoAsiento.nombre : tipoAsiento;
  }
}
