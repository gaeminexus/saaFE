import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Filial } from '../../../model/filial';
import { CargaArchivo } from '../../../model/carga-archivo';
import { DetalleCargaArchivo } from '../../../model/detalle-carga-archivo';
import { ParticipeXCargaArchivo } from '../../../model/participe-x-carga-archivo';
import { FilialService } from '../../../service/filial.service';
import { CargaArchivoService } from '../../../service/carga-archivo.service';
import { DetalleCargaArchivoService } from '../../../service/detalle-carga-archivo.service';
import { ParticipeXCargaArchivoService } from '../../../service/participe-x-carga-archivo.service';
import { ServiciosAsoprepService } from '../../../../asoprep/service/servicios-asoprep.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { ConfirmDialogComponent } from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { NovedadCargaService } from '../../../service/novedad-carga.service';
import { NovedadCarga, NovedadAgrupada } from '../../../model/novedad-carga';

const RUBRO_NOVEDAES_CARGA = 169;

interface Mes {
  valor: number;
  nombre: string;
}

interface AporteAgrupado {
  codigoAporte: string;
  descripcionAporte: string;
  registros: ParticipeXCargaArchivo[];
  totales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  };
}

@Component({
  selector: 'app-carga-aporte-back',
  standalone: true,
  imports: [
    FormsModule,
    MaterialFormModule
  ],
  templateUrl: './carga-aporte-back.component.html',
  styleUrl: './carga-aporte-back.component.scss'
})
export class CargaAporteBackComponent implements OnInit {
  // Signals para estado reactivo
  filialSeleccionada = signal<number | null>(null);
  anioSeleccionado = signal<number | null>(null);
  mesSeleccionado = signal<number | null>(null);
  anioDeshabilitado = signal<boolean>(true);
  mesDeshabilitado = signal<boolean>(true);
  isLoadingFiliales = signal<boolean>(false);
  isUploadingFile = signal<boolean>(false);
  isLoadingData = signal<boolean>(false);
  cargaExitosa = signal<boolean>(false);
  archivoProcesado = signal<boolean>(false);
  isDragging = signal<boolean>(false);

  // Datos
  anios: number[] = [];
  meses: Mes[] = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];
  mesesDeshabilitados: number[] = [];
  filiales: Filial[] = [];

  // Archivo y datos cargados
  nombreArchivo: string = '';
  archivoSeleccionado: File | null = null;
  codigoCargaArchivo: number | null = null;
  cargaArchivoActual: CargaArchivo | null = null;

  // Datos procesados desde el backend
  aporteAgrupados: AporteAgrupado[] = [];
  totalRegistros: number = 0;
  totalesGenerales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  } = {
    saldoActual: 0,
    interesAnual: 0,
    valorSeguro: 0,
    totalDescontar: 0,
    capitalDescontado: 0,
    interesDescontado: 0,
    seguroDescontado: 0,
    totalDescontado: 0,
    capitalNoDescontado: 0,
    interesNoDescontado: 0,
    desgravamenNoDescontado: 0
  };

  displayedColumns: string[] = [
    'codigo', 'nombre', 'plazoInicial', 'saldoActual', 'mesesPlazo',
    'interesAnual', 'valorSeguro', 'totalDescontar', 'capitalDescontado',
    'interesDescontado', 'seguroDescontado', 'totalDescontado',
    'capitalNoDescontado', 'interesNoDescontado', 'desgravamenNoDescontado'
  ];

  // Signals para módulo de novedades
  catalogoNovedades = signal<NovedadCarga[]>([]);
  novedadesAgrupadas = signal<NovedadAgrupada[]>([]);
  tabNovedadSeleccionado = signal<number>(0); // 0=Partícipes, 1=Descuentos
  expandedNovedad = signal<number | null>(null);

  constructor(
    private filialService: FilialService,
    private cargaArchivoService: CargaArchivoService,
    private detalleCargaArchivoService: DetalleCargaArchivoService,
    private participeXCargaArchivoService: ParticipeXCargaArchivoService,
    private serviciosAsoprep: ServiciosAsoprepService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private detalleRubroService: DetalleRubroService,
    private novedadCargaService: NovedadCargaService,
    private router: Router
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    this.cargarFiliales();
    this.cargarCatalogoNovedades();
  }

  cargarFiliales(): void {
    this.isLoadingFiliales.set(true);

    this.filialService.getAll().subscribe({
      next: (filiales: any) => {
        this.isLoadingFiliales.set(false);
        if (filiales && Array.isArray(filiales)) {
          this.filiales = filiales as Filial[];
        } else {
          this.filiales = [];
        }
      },
      error: (error) => {
        this.isLoadingFiliales.set(false);
        console.error('Error al cargar filiales:', error);
        this.snackBar.open('Error al cargar filiales', 'Cerrar', { duration: 3000 });
        this.filiales = [];
      }
    });
  }

  limpiarFiltros(): void {
    this.anioSeleccionado.set(null);
    this.mesSeleccionado.set(null);
    this.filialSeleccionada.set(null);
    this.anioDeshabilitado.set(true);
    this.mesDeshabilitado.set(true);
    this.mesesDeshabilitados = [];
    this.limpiarDatos();
  }

  private limpiarDatos(): void {
    this.aporteAgrupados = [];
    this.nombreArchivo = '';
    this.archivoSeleccionado = null;
    this.codigoCargaArchivo = null;
    this.cargaArchivoActual = null;
    this.cargaExitosa.set(false);
    this.archivoProcesado.set(false);
    this.totalRegistros = 0;
    this.totalesGenerales = {
      saldoActual: 0,
      interesAnual: 0,
      valorSeguro: 0,
      totalDescontar: 0,
      capitalDescontado: 0,
      interesDescontado: 0,
      seguroDescontado: 0,
      totalDescontado: 0,
      capitalNoDescontado: 0,
      interesNoDescontado: 0,
      desgravamenNoDescontado: 0
    };

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onFilialChange(): void {
    this.anioSeleccionado.set(null);
    this.mesSeleccionado.set(null);
    this.mesesDeshabilitados = [];

    if (this.filialSeleccionada()) {
      this.anioDeshabilitado.set(false);
    } else {
      this.anioDeshabilitado.set(true);
      this.mesDeshabilitado.set(true);
    }

    this.limpiarDatos();
  }

  onAnioChange(): void {
    this.mesSeleccionado.set(null);
    this.mesesDeshabilitados = [];

    if (this.anioSeleccionado() && this.filialSeleccionada()) {
      this.buscarMesesCargados();
    } else {
      this.mesDeshabilitado.set(true);
    }

    this.limpiarDatos();
  }

  buscarMesesCargados(): void {
    const filial = this.filialSeleccionada();
    const anio = this.anioSeleccionado();

    if (!filial || !anio) {
      this.mesDeshabilitado.set(true);
      return;
    }

    const criterios: DatosBusqueda[] = [];

    const dbFilial = new DatosBusqueda();
    dbFilial.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'filial',
      'codigo',
      filial.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbFilial);

    const dbAnio = new DatosBusqueda();
    dbAnio.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'anioAfectacion',
      anio.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbAnio);

    this.cargaArchivoService.selectByCriteria(criterios).subscribe({
      next: (cargas: CargaArchivo[] | null) => {
        if (cargas && Array.isArray(cargas)) {
          this.mesesDeshabilitados = cargas
            .map(c => c.mesAfectacion)
            .filter((mes): mes is number => mes !== undefined && mes !== null);
        } else {
          this.mesesDeshabilitados = [];
        }
        this.mesDeshabilitado.set(false);
      },
      error: (error) => {
        console.error('Error al buscar meses cargados:', error);
        this.mesesDeshabilitados = [];
        this.mesDeshabilitado.set(false);
      }
    });
  }

  isMesDeshabilitado(mesValor: number): boolean {
    return this.mesesDeshabilitados.includes(mesValor);
  }

  getFilialNombre(codigo: number | null): string {
    if (!codigo) return 'N/A';
    const filial = this.filiales.find(f => f.codigo === codigo);
    return filial?.nombre || 'N/A';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.setSelectedFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.setSelectedFile(file);
    }
  }

  private setSelectedFile(file: File): void {
    this.nombreArchivo = file.name;
    this.archivoSeleccionado = file;
    this.snackBar.open(
      `Archivo seleccionado: ${file.name}`,
      'Cerrar',
      { duration: 3000 }
    );
  }

  validarArchivo(): void {
    if (!this.archivoSeleccionado) {
      this.snackBar.open('No hay archivo seleccionado', 'Cerrar', { duration: 3000 });
      return;
    }

    // Solicitar confirmación para validar y guardar en el servidor
    const mesSeleccionado = this.mesSeleccionado();
    const anioSeleccionado = this.anioSeleccionado();
    const filialSeleccionada = this.filialSeleccionada();

    const mesNombre = this.meses.find(m => m.valor === mesSeleccionado)?.nombre || '';
    const filialNombre = this.getFilialNombre(filialSeleccionada);

    console.log('DEBUG valores:', { mesNombre, anioSeleccionado, filialNombre });

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Confirmar Validación de Archivo',
        icon: 'upload_file',
        type: 'warning',
        message: '¿Desea validar y cargar el archivo al servidor? Este proceso enviará el archivo al backend para su procesamiento.',
        details: [
          { label: 'Archivo', value: String(this.nombreArchivo) },
          { label: 'Filial', value: String(filialNombre) },
          { label: 'Período', value: `${mesNombre} ${anioSeleccionado}` }
        ],
        confirmText: 'Validar y Cargar',
        cancelText: 'Cancelar',
        confirmIcon: 'check_circle',
        confirmColor: 'primary'
      }
    });    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.guardarArchivoEnServidor();
      }
    });
  }

  private guardarArchivoEnServidor(): void {
    if (!this.archivoSeleccionado) {
      this.snackBar.open('No hay archivo seleccionado', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.anioSeleccionado() || !this.mesSeleccionado() || !this.filialSeleccionada()) {
      this.snackBar.open('Debe seleccionar año, mes y filial', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUploadingFile.set(true);

    // Enviar archivo al backend usando el servicio existente
    const filialObj = this.filiales.find(f => f.codigo === this.filialSeleccionada());
    if (!filialObj) {
      this.isUploadingFile.set(false);
      this.snackBar.open('Error: Filial no encontrada', 'Cerrar', { duration: 3000 });
      return;
    }

    const usuarioActual = this.obtenerUsuarioActual();
    if (!usuarioActual) {
      this.isUploadingFile.set(false);
      this.snackBar.open('Error: No se pudo obtener el usuario actual', 'Cerrar', { duration: 3000 });
      return;
    }

    const cargaArchivo: Partial<CargaArchivo> = {
      nombre: this.nombreArchivo,
      usuarioCarga: usuarioActual,
      filial: filialObj,
      rutaArchivo: '',
      mesAfectacion: this.mesSeleccionado()!,
      anioAfectacion: this.anioSeleccionado()!,
      estado: 1
    };

    // Llamar al servicio validaDatosArchivoPetro que solo necesita archivo y CargaArchivo
    this.serviciosAsoprep.validaDatosArchivoPetro(
      this.archivoSeleccionado,
      cargaArchivo as CargaArchivo
    ).subscribe({
      next: (cargaArchivo: CargaArchivo | null) => {
        this.isUploadingFile.set(false);
        console.log('📥 CargaArchivo recibido del backend:', cargaArchivo);

        if (cargaArchivo && cargaArchivo.codigo) {
          this.codigoCargaArchivo = cargaArchivo.codigo;
          console.log('✅ Código de carga:', cargaArchivo.codigo);
          console.log('📁 Ruta archivo en servidor:', cargaArchivo.rutaArchivo);

          this.snackBar.open(
            `✅ Validación completada exitosamente! Redirigiendo...`,
            'Cerrar',
            { duration: 3000 }
          );

          // Navegar al componente de detalle con el ID de la carga
          this.router.navigate(['/menucreditos/detalle-consulta-carga', cargaArchivo.codigo]);
        } else {
          console.warn('⚠️ Respuesta no contiene CargaArchivo válido:', cargaArchivo);
          this.snackBar.open(
            `⚠️ Error al guardar: No se recibió el objeto CargaArchivo`,
            'Cerrar',
            { duration: 6000 }
          );
        }
      },
      error: (error: any) => {
        this.isUploadingFile.set(false);
        this.snackBar.open(
          `Error al guardar archivo: ${error.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
        console.error('Error al guardar archivo:', error);
      }
    });
  }

  private cargarDatosDesdeBackend(codigoCarga: number): void {
    console.log('🔍 Iniciando cargarDatosDesdeBackend con código:', codigoCarga);
    this.isLoadingData.set(true);

    // 1. Obtener CargaArchivo
    this.cargaArchivoService.getById(codigoCarga.toString()).subscribe({
      next: (cargaArchivo: CargaArchivo | null) => {
        console.log('📦 CargaArchivo recibido:', cargaArchivo);
        if (!cargaArchivo) {
          this.isLoadingData.set(false);
          this.snackBar.open('No se encontró la carga de archivo', 'Cerrar', { duration: 3000 });
          return;
        }

        this.cargaArchivoActual = cargaArchivo;
        this.totalesGenerales = {
          saldoActual: cargaArchivo.totalSaldoActual || 0,
          interesAnual: cargaArchivo.totalInteresAnual || 0,
          valorSeguro: cargaArchivo.totalValorSeguro || 0,
          totalDescontar: cargaArchivo.totalDescontar || 0,
          capitalDescontado: cargaArchivo.totalCapitalDescontado || 0,
          interesDescontado: cargaArchivo.totalInteresDescontado || 0,
          seguroDescontado: cargaArchivo.totalSeguroDescontado || 0,
          totalDescontado: cargaArchivo.totalDescontado || 0,
          capitalNoDescontado: cargaArchivo.totalCapitalNoDescontado || 0,
          interesNoDescontado: cargaArchivo.totalInteresNoDescontado || 0,
          desgravamenNoDescontado: cargaArchivo.totalDesgravamenNoDescontado || 0
        };

        // 2. Obtener DetallesCargaArchivo
        this.cargarDetallesCargaArchivo(codigoCarga);
      },
      error: (error) => {
        this.isLoadingData.set(false);
        console.error('Error al cargar CargaArchivo:', error);
        this.snackBar.open('Error al cargar datos de archivo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private cargarDetallesCargaArchivo(codigoCarga: number): void {
    console.log('🔍 Cargando detalles para código:', codigoCarga);
    const criterios: DatosBusqueda[] = [];
    const dbCarga = new DatosBusqueda();
    dbCarga.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'cargaArchivo',
      'codigo',
      codigoCarga.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbCarga);

    this.detalleCargaArchivoService.selectByCriteria(criterios).subscribe({
      next: (detalles: DetalleCargaArchivo[] | null) => {
        console.log('📋 Detalles recibidos:', detalles);
        if (!detalles || detalles.length === 0) {
          this.isLoadingData.set(false);
          this.snackBar.open('No se encontraron detalles de carga', 'Cerrar', { duration: 3000 });
          return;
        }

        // 3. Cargar partícipes para cada detalle
        this.cargarParticipesPorDetalle(detalles);
      },
      error: (error) => {
        this.isLoadingData.set(false);
        console.error('Error al cargar DetallesCargaArchivo:', error);
        this.snackBar.open('Error al cargar detalles', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private cargarParticipesPorDetalle(detalles: DetalleCargaArchivo[]): void {
    const aportePromises = detalles.map(detalle => {
      return new Promise<AporteAgrupado>((resolve, reject) => {
        const criterios: DatosBusqueda[] = [];
        const dbDetalle = new DatosBusqueda();
        dbDetalle.asignaValorConCampoPadre(
          TipoDatos.LONG,
          'detalleCargaArchivo',
          'codigo',
          detalle.codigo!.toString(),
          TipoComandosBusqueda.IGUAL
        );
        criterios.push(dbDetalle);

        this.participeXCargaArchivoService.selectByCriteria(criterios).subscribe({
          next: (participes: ParticipeXCargaArchivo[] | null) => {
            const aporte: AporteAgrupado = {
              codigoAporte: detalle.codigoPetroProducto || '',
              descripcionAporte: detalle.nombreProductoPetro || '',
              registros: participes || [],
              totales: {
                saldoActual: detalle.totalSaldoActual || 0,
                interesAnual: detalle.totalInteresAnual || 0,
                valorSeguro: detalle.totalValorSeguro || 0,
                totalDescontar: detalle.totalDescontar || 0,
                capitalDescontado: detalle.totalCapitalDescontado || 0,
                interesDescontado: detalle.totalInteresDescontado || 0,
                seguroDescontado: detalle.totalSeguroDescontado || 0,
                totalDescontado: detalle.totalDescontado || 0,
                capitalNoDescontado: detalle.totalCapitalNoDescontado || 0,
                interesNoDescontado: detalle.totalInteresNoDescontado || 0,
                desgravamenNoDescontado: detalle.totalDesgravamenNoDescontado || 0
              }
            };
            resolve(aporte);
          },
          error: reject
        });
      });
    });

    Promise.all(aportePromises).then(aportes => {
      this.aporteAgrupados = aportes;
      this.totalRegistros = aportes.reduce((sum, a) => sum + a.registros.length, 0);

      // Procesar novedades con todos los registros
      const todosLosRegistros = aportes.flatMap(a => a.registros);
      this.procesarNovedades(todosLosRegistros);

      this.isLoadingData.set(false);
      this.snackBar.open(
        `✅ Datos cargados: ${this.totalRegistros} registros en ${aportes.length} productos`,
        'Cerrar',
        { duration: 5000 }
      );
    }).catch(error => {
      this.isLoadingData.set(false);
      console.error('Error al cargar partícipes:', error);
      this.snackBar.open('Error al cargar datos de partícipes', 'Cerrar', { duration: 3000 });
    });
  }

  procesarArchivo(): void {
    // TODO: Llamar al servicio del backend cuando esté listo
    // Por ahora solo mostramos mensaje de éxito
    this.archivoProcesado.set(true);
    this.snackBar.open(
      '✅ Archivo procesado exitosamente (simulado)',
      'Cerrar',
      { duration: 5000 }
    );
  }

  private obtenerUsuarioActual(): Usuario | null {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        return JSON.parse(usuarioStr) as Usuario;
      } catch (error) {
        console.error('Error al parsear usuario desde localStorage:', error);
        return null;
      }
    }
    return null;
  }

  // ==================== MÓDULO DE NOVEDADES ====================

  /**
   * Cargar catálogo de novedades desde DetalleRubro con código padre 169
   */
  private cargarCatalogoNovedades(): void {
    const detalles = this.detalleRubroService.getDetallesByParent(RUBRO_NOVEDAES_CARGA);

    console.log('📋 DetalleRubros recuperados para código padre 169:', detalles);

    if (!detalles || detalles.length === 0) {
      console.warn('⚠ No se encontraron detalles de rubro con código padre 169');
      return;
    }

    const catalogo: NovedadCarga[] = detalles.map(detalle => ({
      codigo: detalle.codigoAlterno,
      descripcion: detalle.descripcion || `Novedad ${detalle.codigoAlterno}`,
      tipo: detalle.codigoAlterno <= 3 ? 'PARTICIPE' : 'DESCUENTO',
      severidad: this.mapearSeveridad(detalle.codigoAlterno),
      icono: this.mapearIcono(detalle.codigoAlterno),
      colorChip: this.mapearColor(detalle.codigoAlterno)
    }));

    this.catalogoNovedades.set(catalogo);
    console.log('✅ Catálogo de novedades cargado:', catalogo);
  }  /**
   * Procesar novedades después de cargar datos desde backend
   */
  private procesarNovedades(todosLosRegistros: ParticipeXCargaArchivo[]): void {
    console.log('📊 Procesando novedades de carga...');
    console.log('📊 Total de registros a procesar:', todosLosRegistros.length);

    const catalogo = this.catalogoNovedades();
    console.log('📋 Catálogo de novedades:', catalogo);

    if (catalogo.length === 0) {
      console.warn('⚠ Catálogo de novedades no cargado aún');
      return;
    }

    const agrupadas = this.novedadCargaService.agruparPorNovedad(
      todosLosRegistros,
      catalogo
    );

    console.log('📊 Novedades agrupadas:', agrupadas);
    this.novedadesAgrupadas.set(agrupadas);
    console.log('✅ Signal novedadesAgrupadas actualizado. Valor actual:', this.novedadesAgrupadas());
  }

  /**
   * Toggle expansión de novedad
   */
  toggleExpansion(codigo: number): void {
    this.expandedNovedad.update(current =>
      current === codigo ? null : codigo
    );
  }

  /**
   * Cambiar tab de novedades
   */
  onTabNovedadChange(index: number): void {
    this.tabNovedadSeleccionado.set(index);
  }

  /**
   * Contar novedades por tipo
   */
  contarNovedades(tipo: 'PARTICIPE' | 'DESCUENTO'): number {
    return this.novedadesAgrupadas()
      .filter(n => n.novedad.tipo === tipo)
      .reduce((sum, n) => sum + n.total, 0);
  }

  /**
   * Obtener novedades filtradas por tab
   */
  get novedadesFiltradas(): NovedadAgrupada[] {
    const tipo = this.tabNovedadSeleccionado() === 0 ? 'PARTICIPE' : 'DESCUENTO';
    return this.novedadesAgrupadas().filter(n => n.novedad.tipo === tipo);
  }

  /**
   * Corregir registro según tipo de novedad
   */
  corregirRegistro(registro: ParticipeXCargaArchivo): void {
    const novedad = registro.novedadesCarga;

    if (novedad === 1) {
      this.corregirParticipeNoEncontrado(registro);
    } else if (novedad === 2) {
      this.corregirDuplicado(registro);
    } else {
      this.snackBar.open(
        `⚠ Corrección para novedad ${novedad} no implementada aún`,
        'Cerrar',
        { duration: 3000 }
      );
    }
  }

  /**
   * Corregir partícipe no encontrado (Novedad 1)
   */
  private corregirParticipeNoEncontrado(registro: ParticipeXCargaArchivo): void {
    this.novedadCargaService.buscarParticipesSimilares(
      registro.nombre,
      registro.codigoPetro
    ).subscribe({
      next: (similares) => {
        console.log('🔍 Partícipes similares encontrados:', similares);

        // TODO: Abrir dialog de selección
        this.snackBar.open(
          `✓ Encontrados ${similares.length} partícipes similares`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('❌ Error al buscar similares:', error);
        this.snackBar.open(
          '❌ Error al buscar partícipes similares',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * Corregir duplicado (Novedad 2)
   */
  private corregirDuplicado(registro: ParticipeXCargaArchivo): void {
    // TODO: Implementar lógica de duplicados
    console.log('📝 Corrigiendo duplicado:', registro);
  }

  /**
   * Mapear código de novedad a severidad
   */
  private mapearSeveridad(codigo: number): 'success' | 'warning' | 'error' {
    if (codigo === 0) return 'success';
    if (codigo <= 2) return 'warning';
    return 'error';
  }

  /**
   * Mapear código de novedad a icono Material
   */
  private mapearIcono(codigo: number): string {
    const iconos: Record<number, string> = {
      0: 'check_circle',
      1: 'person_search',
      2: 'content_copy',
      3: 'error',
      4: 'payments',
      5: 'account_balance',
      6: 'receipt',
      7: 'warning',
      8: 'priority_high'
    };
    return iconos[codigo] || 'help';
  }

  /**
   * Mapear código de novedad a color de chip
   */
  private mapearColor(codigo: number): string {
    if (codigo === 0) return 'primary';
    if (codigo <= 2) return 'accent';
    return 'warn';
  }
}
