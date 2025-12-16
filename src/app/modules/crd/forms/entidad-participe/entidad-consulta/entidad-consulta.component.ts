import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

import { Entidad } from '../../../model/entidad';
import { EstadoParticipe } from '../../../model/estado-participe';
import { Filial } from '../../../model/filial';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import {
  FuncionesDatosService,
  TipoFormatoFechaBackend,
} from '../../../../../shared/services/funciones-datos.service';
import {
  AuditoriaDialogComponent,
  CambiarEstadoDialogData,
} from '../../../dialog/auditoria-dialog/auditoria-dialog.component';
import { AuditoriaService } from '../../../service/auditoria.service';
import { EntidadService } from '../../../service/entidad.service';
import { EstadoParticipeService } from '../../../service/estado-participe.service';
import { FilialService } from '../../../service/filial.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';

@Component({
  selector: 'app-entidad-consulta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  templateUrl: './entidad-consulta.component.html',
  styleUrl: './entidad-consulta.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class EntidadConsultaComponent implements OnInit, AfterViewInit {
  // Injects
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private entidadService = inject(EntidadService);
  private filialService = inject(FilialService);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private estadoParticipeService = inject(EstadoParticipeService);
  private exportService = inject(ExportService);
  private funcionesDatos = inject(FuncionesDatosService);
  private auditoriaService = inject(AuditoriaService);

  // Signals
  entidades = signal<Entidad[]>([]);
  filialesOptions = signal<Filial[]>([]);
  tiposIdentificacionOptions = signal<TipoIdentificacion[]>([]);
  estadosParticipesOptions = signal<EstadoParticipe[]>([]);
  busquedaRealizada = signal<boolean>(false); // Controla visibilidad del paginador

  // Form
  filtrosForm!: FormGroup;
  filtrosPrincipalesExpandidos = true;
  filtrosAvanzadosExpandidos = false;

  // Table
  dataSource!: MatTableDataSource<Entidad>;
  displayedColumns: string[] = [
    'codigo',
    'tipoIdentificacion',
    'numeroIdentificacion',
    'razonSocial',
    'filial',
    'correo',
    'telefono',
    'estado',
    'acciones',
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Estados disponibles
  estadosOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' },
  ];

  // Opciones migrado
  migradoOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Sí' },
    { value: '0', label: 'No' },
  ];

  // Opciones sector público
  sectorPublicoOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Sí' },
    { value: '0', label: 'No' },
  ];

  ngOnInit(): void {
    this.inicializarFiltros();
    this.cargarOpcionesSelects();
    this.dataSource = new MatTableDataSource<Entidad>([]);
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      console.log('Paginator conectado:', this.paginator);
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  inicializarFiltros(): void {
    this.filtrosForm = this.fb.group({
      filial: [null],
      tipoIdentificacion: [null],
      numeroIdentificacion: [null],
      razonSocial: [null],
      email: [null],
      telefono: [null],
      sectorPublico: [null],
      idEstado: [null],
      migrado: [null],
      fechaNacimientoDesde: [null],
      fechaNacimientoHasta: [null],
    });
  }

  cargarOpcionesSelects(): void {
    forkJoin({
      filiales: this.filialService.getAll(),
      tiposIdentificacion: this.tipoIdentificacionService.getAll(),
      estadosParticipes: this.estadoParticipeService.getAll(),
    }).subscribe({
      next: (result) => {
        this.filialesOptions.set(result.filiales || []);
        this.tiposIdentificacionOptions.set(result.tiposIdentificacion || []);
        this.estadosParticipesOptions.set(result.estadosParticipes || []);
      },
      error: (error) => {
        console.error('Error cargando opciones de selects:', error);
        this.snackBar.open('Error cargando opciones', 'Cerrar', { duration: 3000 });
      },
    });
  }

  buscar(): void {
    const formValues = this.filtrosForm.value;
    const {
      filial,
      tipoIdentificacion,
      numeroIdentificacion,
      razonSocial,
      email,
      telefono,
      sectorPublico,
      idEstado,
      migrado,
      fechaNacimientoDesde,
      fechaNacimientoHasta,
    } = formValues;

    const criterios: DatosBusqueda[] = [];

    // filial (padre)
    if (filial) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'filial',
        'codigo',
        filial,
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    // tipoIdentificacion (padre)
    if (tipoIdentificacion) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'tipoIdentificacion',
        'codigo',
        tipoIdentificacion,
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    // numeroIdentificacion (LIKE)
    if (numeroIdentificacion) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'numeroIdentificacion',
        numeroIdentificacion,
        TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }

    // razonSocial (LIKE)
    if (razonSocial) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'razonSocial',
        razonSocial,
        TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }

    // Email: (correoPersonal LIKE email OR correoInstitucional LIKE email)
    if (email) {
      const dbParenOpen1 = new DatosBusqueda();
      dbParenOpen1.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
      criterios.push(dbParenOpen1);

      const dbCorreoPersonal = new DatosBusqueda();
      dbCorreoPersonal.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'correoPersonal',
        email,
        TipoComandosBusqueda.LIKE
      );
      dbCorreoPersonal.setNumeroCampoRepetido(1);
      criterios.push(dbCorreoPersonal);

      const dbCorreoInstitucional = new DatosBusqueda();
      dbCorreoInstitucional.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'correoInstitucional',
        email,
        TipoComandosBusqueda.LIKE
      );
      dbCorreoInstitucional.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      dbCorreoInstitucional.setNumeroCampoRepetido(2);
      criterios.push(dbCorreoInstitucional);

      const dbParenClose1 = new DatosBusqueda();
      dbParenClose1.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
      criterios.push(dbParenClose1);
    }

    // Telefono: (telefono LIKE tel OR movil LIKE tel)
    if (telefono) {
      const dbParenOpen2 = new DatosBusqueda();
      dbParenOpen2.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
      criterios.push(dbParenOpen2);

      const dbTelefono = new DatosBusqueda();
      dbTelefono.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'telefono',
        telefono,
        TipoComandosBusqueda.LIKE
      );
      dbTelefono.setNumeroCampoRepetido(1);
      criterios.push(dbTelefono);

      const dbMovil = new DatosBusqueda();
      dbMovil.asignaUnCampoSinTrunc(TipoDatos.STRING, 'movil', telefono, TipoComandosBusqueda.LIKE);
      dbMovil.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      dbMovil.setNumeroCampoRepetido(2);
      criterios.push(dbMovil);

      const dbParenClose2 = new DatosBusqueda();
      dbParenClose2.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
      criterios.push(dbParenClose2);
    }

    // sectorPublico
    if (sectorPublico !== null && sectorPublico !== undefined) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'sectorPublico',
        sectorPublico,
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    // idEstado
    if (idEstado !== null && idEstado !== undefined) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatos.INTEGER, 'idEstado', idEstado, TipoComandosBusqueda.IGUAL);
      criterios.push(db);
    }

    // migrado
    if (migrado !== null && migrado !== undefined) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatos.INTEGER, 'migrado', migrado, TipoComandosBusqueda.IGUAL);
      criterios.push(db);
    }

    // fechaNacimiento - rango
    const fechaDesde = fechaNacimientoDesde;
    const fechaHasta = fechaNacimientoHasta;

    if (fechaDesde && fechaHasta) {
      const fechaDesdeFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaDesde,
        TipoFormatoFechaBackend.SOLO_FECHA
      );
      const fechaHastaFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaHasta,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaDesdeFormateada && fechaHastaFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoConBetween(
          'fechaNacimiento',
          TipoDatos.DATE,
          fechaDesdeFormateada,
          TipoComandosBusqueda.BETWEEN,
          fechaHastaFormateada
        );
        criterios.push(db);
      }
    } else if (fechaDesde) {
      const fechaDesdeFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaDesde,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaDesdeFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fechaNacimiento',
          fechaDesdeFormateada,
          TipoComandosBusqueda.MAYOR_IGUAL
        );
        criterios.push(db);
      }
    } else if (fechaHasta) {
      const fechaHastaFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaHasta,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaHastaFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fechaNacimiento',
          fechaHastaFormateada,
          TipoComandosBusqueda.MENOR_IGUAL
        );
        criterios.push(db);
      }
    }

    // orderBy razonSocial
    const dbOrderBy = new DatosBusqueda();
    dbOrderBy.orderBy('razonSocial');
    criterios.push(dbOrderBy);

    // Ejecutar búsqueda
    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (result) => {
        this.busquedaRealizada.set(true); // Marcar que se realizó una búsqueda
        this.entidades.set(result || []);
        this.dataSource.data = result || [];

        // Resetear el paginador a la primera página
        if (this.paginator) {
          this.paginator.firstPage();
        }

        if (!result || result.length === 0) {
          this.snackBar.open('No se encontraron resultados', 'Cerrar', { duration: 3000 });
        }
      },
      error: (error) => {
        this.entidades.set([]);
        this.dataSource.data = [];
        console.error('Error en la búsqueda:', error);
        this.snackBar.open('Error al buscar entidades: ' + error, 'Cerrar', { duration: 3000 });
      },
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({
      filial: null,
      tipoIdentificacion: null,
      numeroIdentificacion: null,
      razonSocial: null,
      email: null,
      telefono: null,
      sectorPublico: null,
      idEstado: null,
      migrado: null,
      fechaNacimientoDesde: null,
      fechaNacimientoHasta: null,
    });
    this.entidades.set([]);
    this.dataSource.data = [];
    this.busquedaRealizada.set(false); // Ocultar paginador al limpiar

    // Resetear el paginador
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  nuevaEntidad(): void {
    this.router.navigate(['/menucreditos/entidad-edit'], {
      queryParams: {
        returnUrl: '/menucreditos/entidad-consulta',
      },
    });
  }

  editarEntidad(entidad: Entidad): void {
    if (!entidad || !entidad.codigo) {
      this.snackBar.open('No hay información de entidad para editar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.router.navigate(['/menucreditos/entidad-edit'], {
      queryParams: {
        codigoEntidad: entidad.codigo,
        returnUrl: '/menucreditos/entidad-consulta',
      },
    });
  }

  verComoParticipe(entidad: Entidad): void {
    if (!entidad || !entidad.codigo) {
      this.snackBar.open('No hay información de entidad para ver', 'Cerrar', { duration: 3000 });
      return;
    }

    // Navegar a participe-dash con el código de entidad precargado
    this.router.navigate(['/menucreditos/participe-dash'], {
      queryParams: {
        codigoEntidad: entidad.codigo,
        from: 'entidad-consulta', // Indicador de origen para ocultar búsqueda
      },
    });
  }

  exportarCSV(): void {
    const data = this.entidades();
    if (!data || data.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = data.map((e) => ({
      Código: e.codigo || '',
      'Tipo ID': e.tipoIdentificacion?.nombre || '',
      'Número ID': e.numeroIdentificacion || '',
      'Razón Social': e.razonSocial || '',
      Filial: e.filial?.nombre || '',
      'Correo Personal': e.correoPersonal || '',
      'Correo Institucional': e.correoInstitucional || '',
      Teléfono: e.telefono || '',
      Móvil: e.movil || '',
      Estado: e.idEstado === 1 ? 'Activo' : 'Inactivo',
    }));

    const headers = ['Código', 'Tipo ID', 'Número ID', 'Razón Social', 'Filial', 'Correo Personal', 'Correo Institucional', 'Teléfono', 'Móvil', 'Estado'];
    const dataKeys = ['Código', 'Tipo ID', 'Número ID', 'Razón Social', 'Filial', 'Correo Personal', 'Correo Institucional', 'Teléfono', 'Móvil', 'Estado'];

    this.exportService.exportToCSV(rows, 'entidades', headers, dataKeys);

    this.snackBar.open('CSV exportado correctamente', 'Cerrar', { duration: 3000 });
  }

  /**
   * Abre un diálogo para cambiar el estado de una entidad de forma segura.
   * Solo actualiza el campo idEstado sin afectar otros datos.
   *
   * @param entidad Entidad a modificar
   */
  cambiarEstado(entidad: Entidad): void {
    if (!entidad || !entidad.codigo) {
      this.snackBar.open('No se puede cambiar el estado de esta entidad', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    // Verificar que se hayan cargado los estados
    const estadosDisponibles = this.estadosParticipesOptions();
    if (!estadosDisponibles || estadosDisponibles.length === 0) {
      this.snackBar.open('No se han cargado los estados disponibles', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const dialogData: CambiarEstadoDialogData = {
      entidad,
      estadosDisponibles,
      titulo: 'Cambiar Estado de Partícipe',
      entidadTipo: 'Partícipe',
      campoNombre: 'razonSocial',
      campoIdentificacion: 'numeroIdentificacion',
      campoEstadoActual: 'idEstado',
    };

    const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: false,
      panelClass: 'custom-dialog-container',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.nuevoEstado !== undefined && result.motivo) {
        this.ejecutarCambioEstado(entidad, result.nuevoEstado, result.motivo);
      }
    });
  }

  /**
   * Ejecuta el cambio de estado recuperando el registro completo,
   * modificando solo el estado y enviando todo el registro con update().
   * 🆕 Ahora registra el cambio en el sistema de auditoría.
   *
   * @param entidad Entidad original (puede tener lazy-loaded nulls)
   * @param nuevoEstado Código del nuevo estado
   * @param motivo Motivo del cambio de estado (obligatorio)
   */
  private ejecutarCambioEstado(entidad: Entidad, nuevoEstado: number, motivo: string): void {
    // Paso 1: Recuperar el registro completo desde el backend
    this.entidadService.getById(entidad.codigo!.toString()).subscribe({
      next: (entidadCompleta) => {
        if (!entidadCompleta) {
          this.snackBar.open('No se pudo recuperar la entidad', 'Cerrar', { duration: 5000 });
          return;
        }

        // 🆕 Guardar estado anterior para auditoría
        const estadoAnterior = {
          codigo: entidadCompleta.idEstado || 0,
          nombre: this.obtenerNombreEstado(entidadCompleta.idEstado),
        };

        // Paso 2: Modificar SOLO el campo idEstado
        entidadCompleta.idEstado = nuevoEstado;

        // Paso 2.5: Eliminar campos de metadata que el backend maneja automáticamente
        const entidadParaBackend = this.prepararEntidadParaBackend(entidadCompleta);

        // Paso 3: Enviar TODO el registro con el servicio update() existente
        this.entidadService.update(entidadParaBackend).subscribe({
          next: (entidadActualizada) => {
            // Actualizar el estado en la lista local
            const entidadesActuales = this.entidades();
            const index = entidadesActuales.findIndex((e) => e.codigo === entidad.codigo);

            if (index !== -1) {
              entidadesActuales[index].idEstado = nuevoEstado;
              this.entidades.set([...entidadesActuales]);

              // Actualizar también el dataSource
              const dataActual = this.dataSource.data;
              const dataIndex = dataActual.findIndex((e) => e.codigo === entidad.codigo);
              if (dataIndex !== -1) {
                dataActual[dataIndex].idEstado = nuevoEstado;
                this.dataSource.data = [...dataActual];
              }
            }

            // 🆕 AUDITORÍA: Registrar el cambio de estado
            this.registrarCambioEstadoEnAuditoria(entidad, estadoAnterior, nuevoEstado, motivo);

            // Obtener el nombre del estado para el mensaje
            const estadoObj = this.estadosParticipesOptions().find((e) => e.codigo === nuevoEstado);
            const estadoTexto = estadoObj?.nombre || 'Estado ' + nuevoEstado;

            this.snackBar.open(`Estado cambiado a ${estadoTexto} exitosamente`, 'Cerrar', {
              duration: 3000,
            });
          },
          error: (error) => {
            console.error('Error al actualizar entidad:', error);
            const mensaje = error?.mensaje || 'Error al actualizar el estado de la entidad';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (error) => {
        console.error('Error al recuperar entidad:', error);
        const mensaje = error?.mensaje || 'Error al recuperar la entidad';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * 🆕 Registra el cambio de estado en el sistema de auditoría.
   * Se ejecuta de forma no bloqueante para no afectar la experiencia del usuario.
   *
   * @param entidad Entidad modificada
   * @param estadoAnterior Estado anterior (código + nombre)
   * @param nuevoEstadoCodigo Código del nuevo estado
   * @param motivo Motivo del cambio proporcionado por el usuario
   */
  private registrarCambioEstadoEnAuditoria(
    entidad: Entidad,
    estadoAnterior: { codigo: number; nombre: string },
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    const estadoNuevo = {
      codigo: nuevoEstadoCodigo,
      nombre: this.obtenerNombreEstado(nuevoEstadoCodigo),
    };

    // Construir el registro de auditoría
    const registroAuditoria = this.auditoriaService.construirRegistroCambioEstado({
      accion: 'UPDATE', // ← Cambio de estado es una actualización
      nombreComponente: 'EntidadConsulta', // ← Nombre del componente
      entidadLogica: 'ENTIDAD', // ← Entidad de negocio
      idEntidad: entidad.codigo!,
      estadoAnterior: estadoAnterior,
      estadoNuevo: estadoNuevo,
      motivo: motivo,
      // Los campos opcionales se toman de localStorage automáticamente
    });

    // 🔍 DEBUG: Verificar objeto antes de enviar
    console.log('📤 Enviando a auditoría:', JSON.stringify(registroAuditoria, null, 2));

    // Enviar registro de auditoría (no bloqueante)
    this.auditoriaService.add(registroAuditoria).subscribe({
      next: () => {
        console.log('✅ Auditoría registrada:', {
          componente: 'EntidadConsulta',
          accion: 'UPDATE',
          entidad: `ENTIDAD:${entidad.codigo}`,
          razonSocial: entidad.razonSocial,
          cambio: `${estadoAnterior.nombre} → ${estadoNuevo.nombre}`,
          usuario: localStorage.getItem('username') || 'SYSTEM',
          timestamp: new Date().toISOString(),
        });
      },
      error: (err) => {
        console.error('❌ Error al registrar auditoría (no crítico):', err);
        // No mostramos error al usuario, la auditoría falla silenciosamente
      },
    });
  }

  /**
   * Prepara la entidad para enviar al backend eliminando campos de metadata.
   * El backend maneja automáticamente: fechaIngreso, fechaModificacion,
   * usuarioIngreso, usuarioModificacion, ipIngreso, ipModificacion.
   *
   * @param entidad Entidad completa del backend
   * @returns Entidad sin campos de metadata
   */
  private prepararEntidadParaBackend(entidad: Entidad): any {
    const entidadLimpia = { ...entidad };

    // Eliminar campos de metadata que el backend maneja automáticamente
    delete (entidadLimpia as any).fechaIngreso;
    delete (entidadLimpia as any).fechaModificacion;
    delete (entidadLimpia as any).usuarioIngreso;
    delete (entidadLimpia as any).usuarioModificacion;
    delete (entidadLimpia as any).ipIngreso;
    delete (entidadLimpia as any).ipModificacion;

    return entidadLimpia;
  }

  /**
   * Obtiene el nombre del estado desde EstadoParticipe.
   *
   * @param idEstado Código del estado
   * @returns Nombre del estado o valor por defecto
   */
  obtenerNombreEstado(idEstado: number | undefined): string {
    if (idEstado === undefined || idEstado === null) {
      return '-';
    }

    const estado = this.estadosParticipesOptions().find((e) => e.codigo === idEstado);
    return estado?.nombre || `Estado ${idEstado}`;
  }

  /**
   * Obtiene la clase CSS para el badge de estado basado en el nombre del estado.
   * Cubre los 13 estados de EstadoParticipe con colores específicos.
   *
   * @param idEstado Código del estado
   * @returns Clase CSS para el badge
   */
  obtenerClaseEstado(idEstado: number | undefined): string {
    if (idEstado === undefined || idEstado === null) {
      return 'estado-desconocido';
    }

    // Buscar el estado en la lista
    const estado = this.estadosParticipesOptions().find((e) => e.codigo === idEstado);
    const nombreEstado = estado?.nombre?.toLowerCase() || '';

    // Mapeo específico por palabras clave
    if (nombreEstado.includes('aprobado')) {
      return 'estado-activo'; // Verde - APROBADO
    }
    if (nombreEstado.includes('rechazado')) {
      return 'estado-inactivo'; // Rojo - RECHAZADO
    }
    if (nombreEstado.includes('pendiente')) {
      return 'estado-pendiente'; // Amarillo - PENDIENTE
    }
    if (nombreEstado.includes('inactivo')) {
      return 'estado-suspendido'; // Naranja - INACTIVO
    }
    if (nombreEstado.includes('proceso')) {
      return 'estado-revision'; // Azul - PROCESO CESANTIA
    }
    if (nombreEstado.includes('cesado')) {
      return 'estado-cesado'; // Gris oscuro - CESADO
    }
    if (nombreEstado.includes('jubilado')) {
      return 'estado-jubilado'; // Morado - JUBILADO COMPLEMENTARIO/SOLIDARIO
    }
    if (nombreEstado.includes('fallecida')) {
      return 'estado-fallecido'; // Negro - FALLECIDA
    }
    if (nombreEstado.includes('desafiliacion')) {
      return 'estado-desafiliado'; // Café - DESAFILIACION
    }
    if (nombreEstado.includes('disponible')) {
      return 'estado-disponible'; // Cyan - NO DISPONIBLE
    }
    if (nombreEstado.includes('pension')) {
      return 'estado-pension'; // Índigo - PENSION COMPLEMENTARIA CON SALDO CERO
    }
    if (nombreEstado.includes('aportar')) {
      return 'estado-aportar'; // Rosa - DEJO DE APORTAR
    }

    // Default: usar código para asignar color
    const colores = [
      'estado-activo', // 0
      'estado-inactivo', // 1
      'estado-pendiente', // 2
      'estado-revision', // 3
      'estado-suspendido', // 4
      'estado-cesado', // 5
      'estado-jubilado', // 6
      'estado-fallecido', // 7
      'estado-desafiliado', // 8
      'estado-disponible', // 9
      'estado-pension', // 10
      'estado-aportar', // 11
    ];
    return colores[idEstado % colores.length] || 'estado-otro';
  }

  toggleFiltrosPrincipales(): void {
    this.filtrosPrincipalesExpandidos = !this.filtrosPrincipalesExpandidos;
  }

  toggleFiltrosAvanzados(): void {
    this.filtrosAvanzadosExpandidos = !this.filtrosAvanzadosExpandidos;
  }
}
