import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

import { Facturador } from '../../../model/facturador';
import { Establecimiento } from '../../../model/establecimientos';
import { PuntoEmision } from '../../../model/puntos-emision';
import { NumeracionPuntoEmision } from '../../../model/numeracion-punto-emision';
import { DetalleSri } from '../../../model/detalle-sri';
import { Empresa } from '../../../../../shared/model/empresa';

import { FacturadorService } from '../../../service/facturador.service';
import { EstablecimientoService } from '../../../service/establecimiento.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { NumeracionPuntoEmisionService } from '../../../service/numeracion-punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { FileService } from '../../../../../shared/services/file.service';

@Component({
  selector: 'app-datos-facturador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './datos-facturador.component.html',
  styleUrl: './datos-facturador.component.scss',
})
export class DatosFacturadorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private facturadorService = inject(FacturadorService);
  private establecimientoService = inject(EstablecimientoService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private numeracionService = inject(NumeracionPuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private fileService = inject(FileService);

  // Estado
  cargando = signal(false);
  guardando = signal(false);
  modoVista = signal<'facturador' | 'establecimientos' | 'puntosEmision' | 'numeraciones'>('facturador');

  // Facturador
  facturadores = signal<Facturador[]>([]);
  facturadorSeleccionado = signal<Facturador | null>(null);
  formFacturador!: FormGroup;
  modoFormFacturador = signal<'nuevo' | 'editar'>('nuevo');

  // Establecimientos
  establecimientos = signal<Establecimiento[]>([]);
  establecimientoSeleccionado = signal<Establecimiento | null>(null);
  formEstablecimiento!: FormGroup;
  dataSourceEstablecimientos = new MatTableDataSource<Establecimiento>([]);
  columnasEstablecimientos: string[] = ['codigo', 'nombre', 'direccion', 'matriz', 'estado', 'acciones'];

  // Puntos de Emisión
  puntosEmision = signal<PuntoEmision[]>([]);
  puntoEmisionSeleccionado = signal<PuntoEmision | null>(null);
  formPuntoEmision!: FormGroup;
  dataSourcePuntosEmision = new MatTableDataSource<PuntoEmision>([]);
  columnasPuntosEmision: string[] = ['codigo', 'nombre', 'estado', 'acciones'];

  // Numeraciones
  numeraciones = signal<NumeracionPuntoEmision[]>([]);
  numeracionSeleccionada = signal<NumeracionPuntoEmision | null>(null);
  formNumeracion!: FormGroup;
  dataSourceNumeraciones = new MatTableDataSource<NumeracionPuntoEmision>([]);
  columnasNumeraciones: string[] = ['tipoDoc', 'numActual', 'acciones'];

  // Documentos (TSRI filtrado por lsri = 3)
  documentosTsri = signal<DetalleSri[]>([]);
  documentoSeleccionado = signal<DetalleSri | null>(null);

  readonly opcionesEstado = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' },
  ];

  readonly opcionesSiNo = [
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' },
  ];

  readonly opcionesAmbiente = [
    { value: 1, label: 'Pruebas' },
    { value: 2, label: 'Producción' },
  ];

  readonly opcionesGeneraConta = [
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' },
    { value: null, label: 'No definido' },
  ];

  ngOnInit(): void {
    this.inicializarFormularios();
    this.cargarDocumentosTsri();
    this.cargarFacturadores();
  }

  private inicializarFormularios(): void {
    this.formFacturador = this.fb.group({
      id: [null],
      numDoc: ['', [Validators.required, Validators.maxLength(50)]],
      nombre: ['', [Validators.required, Validators.maxLength(1000)]],
      razonSocial: ['', Validators.maxLength(1000)],
      nombreComercial: ['', Validators.maxLength(500)],
      mail: ['', [Validators.email, Validators.maxLength(200)]],
      telefono: ['', Validators.maxLength(45)],
      direccion: ['', Validators.maxLength(1000)],
      contabilidad: [0, Validators.required],
      agenteRetencion: ['', Validators.maxLength(1000)],
      contribuyenteEspecial: ['', Validators.maxLength(1000)],
      artesano: ['', Validators.maxLength(1000)],
      microEmpresa: [false],
      rimpe: [false],
      popularRimpe: [false],
      turistico: [false],
      firma: [''],
      claveFirma: [''],
      codClave: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      ambiente: [1, Validators.required],
      generaConta: [null],
      estado: [1, Validators.required],
    });

    this.formEstablecimiento = this.fb.group({
      id: [null],
      codigo: ['', [Validators.required, Validators.maxLength(250)]],
      nombre: ['', [Validators.required, Validators.maxLength(250)]],
      descripcion: ['', Validators.maxLength(250)],
      direccion: ['', Validators.maxLength(1000)],
      telefono: ['', Validators.maxLength(1000)],
      mail: ['', [Validators.email, Validators.maxLength(45)]],
      matriz: [0, Validators.required],
      estado: [1, Validators.required],
    });

    this.formPuntoEmision = this.fb.group({
      id: [null],
      codigo: ['', [Validators.required, Validators.maxLength(45)]],
      nombre: ['', [Validators.required, Validators.maxLength(500)]],
      observacion: ['', Validators.maxLength(2000)],
      transportista: [0],
      estado: [1, Validators.required],
    });

    this.formNumeracion = this.fb.group({
      id: [null],
      documento: [null], // Almacena el objeto DetalleSri seleccionado
      tipoDoc: ['', [Validators.required, Validators.maxLength(10)]],
      numActual: [0, [Validators.required, Validators.min(0)]],
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FACTURADOR
  // ═══════════════════════════════════════════════════════════════════

  cargarFacturadores(): void {
    this.cargando.set(true);
    this.facturadorService.getAll().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.facturadores.set(data);
          // Seleccionar el primero por defecto
          this.seleccionarFacturador(data[0]);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar facturadores:', err);
        this.mostrarError('Error al cargar facturadores');
        this.cargando.set(false);
      },
    });
  }

  seleccionarFacturador(facturador: Facturador): void {
    this.facturadorSeleccionado.set(facturador);
    this.formFacturador.patchValue({
      ...facturador,
      microEmpresa: this.toBooleanFromBackend(facturador.microEmpresa),
      rimpe: this.toBooleanFromBackend(facturador.rimpe),
      popularRimpe: this.toBooleanFromBackend(facturador.popularRimpe),
      turistico: this.toBooleanFromBackend(facturador.turistico),
    });
    this.modoFormFacturador.set('editar');
    this.cargarEstablecimientos();
  }

  nuevoFacturador(): void {
    this.facturadorSeleccionado.set(null);
    this.formFacturador.reset({
      contabilidad: 0,
      microEmpresa: false,
      rimpe: false,
      popularRimpe: false,
      turistico: false,
      ambiente: 1,
      generaConta: null,
      estado: 1,
    });
    this.modoFormFacturador.set('nuevo');
  }

  onArchivoFirmaSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar extensión .p12
      if (!file.name.toLowerCase().endsWith('.p12')) {
        this.mostrarError('El archivo debe tener extensión .p12');
        input.value = '';
        return;
      }

      // Validar tamaño (máximo 5MB para firma)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.mostrarError('El archivo no debe superar 5MB');
        input.value = '';
        return;
      }

      this.guardando.set(true);

      // Subir archivo a ruta personalizada
      const uploadPath = 'firmas/electronicas';
      this.fileService.uploadFileCustomPath(file, uploadPath).subscribe({
        next: (response) => {
          if (response.success && response.filePath) {
            // Construir la ruta completa si el backend no la devuelve correctamente
            let rutaCompleta = response.filePath;

            // Si la ruta devuelta no incluye 'electronicas', construirla manualmente
            if (!rutaCompleta.includes('electronicas')) {
              // Extraer solo el nombre del archivo de la ruta devuelta
              const fileName = rutaCompleta.split('/').pop() || file.name;
              rutaCompleta = `${uploadPath}/${fileName}`;
            }

            // Guardar la ruta completa en el formulario
            this.formFacturador.patchValue({
              firma: rutaCompleta,
            });
            this.mostrarExito(`Firma electrónica cargada: ${file.name}`);
          } else {
            this.mostrarError(response.message || 'Error al subir el archivo');
          }
          this.guardando.set(false);
        },
        error: (err) => {
          console.error('Error al subir firma:', err);
          this.mostrarError('Error al subir la firma electrónica');
          this.guardando.set(false);
          input.value = '';
        },
      });
    }
  }

  guardarFacturador(): void {
    if (this.formFacturador.invalid) {
      this.mostrarError('Complete los campos requeridos');
      return;
    }

    this.guardando.set(true);
    const datos = this.formFacturador.value;
    const empresaCodigo = this.obtenerEmpresaCodigoSesion();

    if (!empresaCodigo) {
      this.mostrarError('No se encontró la empresa de la sesión. Vuelva a iniciar sesión.');
      this.guardando.set(false);
      return;
    }

    const payload: any = {
      ...datos,
      empresa: { codigo: empresaCodigo },
      ambiente: datos.ambiente ?? 1,
      generaConta: datos.generaConta,
      microEmpresa: this.toBackendFlag(datos.microEmpresa),
      rimpe: this.toBackendFlag(datos.rimpe),
      popularRimpe: this.toBackendFlag(datos.popularRimpe),
      turistico: this.toBackendFlag(datos.turistico),
    };

    const operacion$ = payload.id
      ? this.facturadorService.update(payload)
      : this.facturadorService.add(payload);

    operacion$.subscribe({
      next: (result) => {
        this.mostrarExito('Facturador guardado correctamente');
        this.cargarFacturadores();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar facturador:', err);
        this.mostrarError('Error al guardar facturador');
        this.guardando.set(false);
      },
    });
  }

  private toBackendFlag(value: unknown): string {
    if (value === true || value === 1 || value === '1') {
      return '1';
    }

    return '0';
  }

  private toBooleanFromBackend(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  // ═══════════════════════════════════════════════════════════════════
  // ESTABLECIMIENTOS
  // ═══════════════════════════════════════════════════════════════════

  verEstablecimientos(): void {
    this.modoVista.set('establecimientos');
    this.cargarEstablecimientos();
  }

  cargarEstablecimientos(): void {
    const facturador = this.facturadorSeleccionado();
    if (!facturador || !facturador.id) {
      this.establecimientos.set([]);
      this.dataSourceEstablecimientos.data = [];
      return;
    }

    this.cargando.set(true);
    const criterios: DatosBusqueda[] = [];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'facturador',
      'id',
      facturador.id.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);

    this.establecimientoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const establecimientos = Array.isArray(data) ? data : [];
        this.establecimientos.set(establecimientos);
        this.dataSourceEstablecimientos.data = establecimientos;
        this.cargando.set(false);
      },
      error: (err) => {
        if (!this.esErrorSinDatos(err)) {
          console.error('Error al cargar establecimientos:', err);
        }
        this.establecimientos.set([]);
        this.dataSourceEstablecimientos.data = [];
        this.cargando.set(false);
      },
    });
  }

  nuevoEstablecimiento(): void {
    this.establecimientoSeleccionado.set(null);
    this.formEstablecimiento.reset({ matriz: 0, estado: 1 });
  }

  editarEstablecimiento(establecimiento: Establecimiento): void {
    this.establecimientoSeleccionado.set(establecimiento);
    this.formEstablecimiento.patchValue(establecimiento);
  }

  guardarEstablecimiento(): void {
    if (this.formEstablecimiento.invalid) {
      this.mostrarError('Complete los campos requeridos');
      return;
    }

    const facturador = this.facturadorSeleccionado();
    if (!facturador) {
      this.mostrarError('Debe seleccionar un facturador');
      return;
    }

    this.guardando.set(true);
    const formValues = this.formEstablecimiento.value;
    const datos: any = {
      ...formValues,
      facturador: { id: facturador.id },
    };

    const operacion$ = datos.id
      ? this.establecimientoService.update(datos)
      : this.establecimientoService.add(datos);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Establecimiento guardado correctamente');
        this.cargarEstablecimientos();
        this.cancelarEstablecimiento();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.mostrarError('Error al guardar establecimiento');
        this.guardando.set(false);
      },
    });
  }

  eliminarEstablecimiento(establecimiento: Establecimiento): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el establecimiento "${establecimiento.nombre}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed && establecimiento.id) {
        this.establecimientoService.delete(establecimiento.id).subscribe({
          next: () => {
            this.mostrarExito('Establecimiento eliminado correctamente');
            this.cargarEstablecimientos();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar establecimiento');
          },
        });
      }
    });
  }

  cancelarEstablecimiento(): void {
    this.establecimientoSeleccionado.set(null);
    this.formEstablecimiento.reset({ matriz: 0, estado: 1 });
  }

  verPuntosEmision(establecimiento: Establecimiento): void {
    this.establecimientoSeleccionado.set(establecimiento);
    this.modoVista.set('puntosEmision');
    this.cargarPuntosEmision();
  }

  volverAFacturador(): void {
    this.modoVista.set('facturador');
    this.establecimientoSeleccionado.set(null);
    this.puntoEmisionSeleccionado.set(null);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUNTOS DE EMISIÓN
  // ═══════════════════════════════════════════════════════════════════

  cargarPunctosEmision(): void {
    const establecimiento = this.establecimientoSeleccionado();
    if (!establecimiento || !establecimiento.id) {
      this.puntosEmision.set([]);
      this.dataSourcePuntosEmision.data = [];
      return;
    }

    this.cargando.set(true);
    const criterios: DatosBusqueda[] = [];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'establecimiento',
      'id',
      establecimiento.id.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);

    this.puntoEmisionService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const puntos = Array.isArray(data) ? data : [];
        this.puntosEmision.set(puntos);
        this.dataSourcePuntosEmision.data = puntos;
        this.cargando.set(false);
      },
      error: (err) => {
        if (!this.esErrorSinDatos(err)) {
          console.error('Error al cargar puntos de emisión:', err);
        }
        this.puntosEmision.set([]);
        this.dataSourcePuntosEmision.data = [];
        this.cargando.set(false);
      },
    });
  }

  cargarPuntosEmision = this.cargarPunctosEmision;

  nuevoPuntoEmision(): void {
    this.puntoEmisionSeleccionado.set(null);
    this.formPuntoEmision.reset({ transportista: 0, estado: 1 });
  }

  editarPuntoEmision(punto: PuntoEmision): void {
    this.puntoEmisionSeleccionado.set(punto);
    this.formPuntoEmision.patchValue(punto);
  }

  guardarPuntoEmision(): void {
    if (this.formPuntoEmision.invalid) {
      this.mostrarError('Complete los campos requeridos');
      return;
    }

    const establecimiento = this.establecimientoSeleccionado();
    if (!establecimiento) {
      this.mostrarError('Debe seleccionar un establecimiento');
      return;
    }

    this.guardando.set(true);
    const formValues = this.formPuntoEmision.value;
    const datos: any = {
      ...formValues,
      establecimiento: { id: establecimiento.id },
    };

    const operacion$ = datos.id
      ? this.puntoEmisionService.update(datos)
      : this.puntoEmisionService.add(datos);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Punto de emisión guardado correctamente');
        this.cargarPuntosEmision();
        this.cancelarPuntoEmision();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.mostrarError('Error al guardar punto de emisión');
        this.guardando.set(false);
      },
    });
  }

  eliminarPuntoEmision(punto: PuntoEmision): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el punto de emisión "${punto.nombre}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed && punto.id) {
        this.puntoEmisionService.delete(punto.id).subscribe({
          next: () => {
            this.mostrarExito('Punto de emisión eliminado correctamente');
            this.cargarPuntosEmision();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar punto de emisión');
          },
        });
      }
    });
  }

  cancelarPuntoEmision(): void {
    this.puntoEmisionSeleccionado.set(null);
    this.formPuntoEmision.reset({ transportista: 0, estado: 1 });
  }

  verNumeraciones(punto: PuntoEmision): void {
    this.puntoEmisionSeleccionado.set(punto);
    this.modoVista.set('numeraciones');
    this.cargarNumeraciones();
  }

  volverAEstablecimientos(): void {
    this.modoVista.set('establecimientos');
    this.puntoEmisionSeleccionado.set(null);
  }

  // ═══════════════════════════════════════════════════════════════════
  // NUMERACIONES
  // ═══════════════════════════════════════════════════════════════════

  cargarNumeraciones(): void {
    const punto = this.puntoEmisionSeleccionado();
    if (!punto || !punto.id) {
      this.numeraciones.set([]);
      this.dataSourceNumeraciones.data = [];
      return;
    }

    this.cargando.set(true);
    const criterios: DatosBusqueda[] = [];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'ptoEmision',
      'id',
      punto.id.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);

    this.numeracionService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const numeraciones = Array.isArray(data) ? data : [];
        this.numeraciones.set(numeraciones);
        this.dataSourceNumeraciones.data = numeraciones;
        this.cargando.set(false);
      },
      error: (err) => {
        if (!this.esErrorSinDatos(err)) {
          console.error('Error al cargar numeraciones:', err);
        }
        this.numeraciones.set([]);
        this.dataSourceNumeraciones.data = [];
        this.cargando.set(false);
      },
    });
  }

  nuevaNumeracion(): void {
    this.numeracionSeleccionada.set(null);
    this.documentoSeleccionado.set(null);
    this.formNumeracion.reset({ numActual: 0, documento: null, tipoDoc: '' });
  }

  editarNumeracion(numeracion: NumeracionPuntoEmision): void {
    this.numeracionSeleccionada.set(numeracion);
    this.formNumeracion.patchValue(numeracion);
  }

  guardarNumeracion(): void {
    if (this.formNumeracion.invalid) {
      this.mostrarError('Complete los campos requeridos');
      return;
    }

    const punto = this.puntoEmisionSeleccionado();
    if (!punto) {
      this.mostrarError('Debe seleccionar un punto de emisión');
      return;
    }

    this.guardando.set(true);
    const formValues = this.formNumeracion.value;

    // Crear datos sin el campo documento (que es solo para UI)
    const datos: any = {
      id: formValues.id,
      tipoDoc: formValues.tipoDoc,
      numActual: formValues.numActual,
      ptoEmision: { id: punto.id },
    };

    const operacion$ = datos.id
      ? this.numeracionService.update(datos)
      : this.numeracionService.add(datos);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Numeración guardada correctamente');
        this.cargarNumeraciones();
        this.cancelarNumeracion();
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.mostrarError('Error al guardar numeración');
        this.guardando.set(false);
      },
    });
  }

  eliminarNumeracion(numeracion: NumeracionPuntoEmision): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar la numeración para "${numeracion.tipoDoc}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed && numeracion.id) {
        this.numeracionService.delete(numeracion.id).subscribe({
          next: () => {
            this.mostrarExito('Numeración eliminada correctamente');
            this.cargarNumeraciones();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar numeración');
          },
        });
      }
    });
  }

  cancelarNumeracion(): void {
    this.numeracionSeleccionada.set(null);
    this.documentoSeleccionado.set(null);
    this.formNumeracion.reset({ numActual: 0, documento: null, tipoDoc: '' });
  }

  volverAPuntosEmision(): void {
    this.modoVista.set('puntosEmision');
  }

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENTOS TSRI
  // ═══════════════════════════════════════════════════════════════════

  cargarDocumentosTsri(): void {
    this.detalleSriService.getAll().subscribe({
      next: (detalles) => {
        const documentos = (detalles || []).filter(
          (d) => d.estado === 1 && this.getTablaCodigo(d.lsri) === '3'
        );
        this.documentosTsri.set(documentos);
      },
      error: () => {
        this.documentosTsri.set([]);
      },
    });
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) {
      return String(lsri.tabla);
    }
    if (typeof lsri === 'number') {
      return String(lsri);
    }
    return '';
  }

  private obtenerEmpresaCodigoSesion(): number | null {
    const empresaStr = sessionStorage.getItem('empresa') || sessionStorage.getItem('empresaLog') || localStorage.getItem('empresa') || localStorage.getItem('empresaLog');
    if (empresaStr) {
      try {
        const empresa = JSON.parse(empresaStr) as Empresa;
        if (empresa?.codigo) {
          return Number(empresa.codigo);
        }
      } catch {
      }
    }

    const idEmpresa = sessionStorage.getItem('idEmpresa') || sessionStorage.getItem('empresaId') || localStorage.getItem('idEmpresa') || localStorage.getItem('empresaId');
    if (idEmpresa) {
      const codigo = Number(idEmpresa);
      if (!Number.isNaN(codigo) && codigo > 0) {
        return codigo;
      }
    }

    return null;
  }

  onDocumentoChange(documento: DetalleSri): void {
    this.documentoSeleccionado.set(documento);
    // Rellenar tipoDoc con el codigo como string (ej: "01" en lugar de 1)
    this.formNumeracion.patchValue({
      tipoDoc: String(documento.codigo),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success'],
    });
  }

  private esErrorSinDatos(err: any): boolean {
    const status = Number(
      err?.status ?? err?.statusCode ?? err?.error?.status ?? err?.error?.statusCode ?? 0
    );

    if ([200, 204, 404].includes(status)) {
      return true;
    }

    const mensajePlano = `${
      err?.message ?? err?.mensaje ?? err?.error?.message ?? err?.error?.mensaje ?? err?.error ?? ''
    }`.toLowerCase();

    let mensajeJson = '';
    try {
      mensajeJson = JSON.stringify(err ?? {}).toLowerCase();
    } catch {
      mensajeJson = '';
    }

    const mensaje = `${mensajePlano} ${mensajeJson}`;

    if (
      status === 500 &&
      (mensaje.includes('no data') ||
        mensaje.includes('no existe') ||
        mensaje.includes('no se encontraron') ||
        mensaje.includes('sin datos'))
    ) {
      return true;
    }

    return (
      mensaje.includes('sin datos') ||
      mensaje.includes('no hay') ||
      mensaje.includes('no existe') ||
      mensaje.includes('no se encontraron') ||
      mensaje.includes('no se encontró') ||
      mensaje.includes('no records') ||
      mensaje.includes('empty') ||
      mensaje.includes('lista vacía') ||
      mensaje.includes('lista vacia') ||
      mensaje.includes('not found')
    );
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error'],
    });
  }

  obtenerClaseEstado(estado: number): string {
    return estado === 1 ? 'estado-activo' : 'estado-inactivo';
  }

  obtenerNombreEstado(estado: number): string {
    const opcion = this.opcionesEstado.find((o) => o.value === estado);
    return opcion?.label || 'Desconocido';
  }
}
