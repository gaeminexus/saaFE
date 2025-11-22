import { Component, OnInit, ViewChild, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

import { Entidad } from '../../../model/entidad';
import { Filial } from '../../../model/filial';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';

import { EntidadService } from '../../../service/entidad.service';
import { FilialService } from '../../../service/filial.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-entidad-consulta',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './entidad-consulta.component.html',
  styleUrl: './entidad-consulta.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EntidadConsultaComponent implements OnInit, AfterViewInit {

  // Injects
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private entidadService = inject(EntidadService);
  private filialService = inject(FilialService);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private exportService = inject(ExportService);
  private funcionesDatos = inject(FuncionesDatosService);

  // Signals
  entidades = signal<Entidad[]>([]);
  filialesOptions = signal<Filial[]>([]);
  tiposIdentificacionOptions = signal<TipoIdentificacion[]>([]);
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
    'acciones'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Estados disponibles
  estadosOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' }
  ];

  // Opciones migrado
  migradoOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Sí' },
    { value: '0', label: 'No' }
  ];

  // Opciones sector público
  sectorPublicoOptions = [
    { value: null, label: 'Todos' },
    { value: '1', label: 'Sí' },
    { value: '0', label: 'No' }
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
      fechaNacimientoHasta: [null]
    });
  }

  cargarOpcionesSelects(): void {
    forkJoin({
      filiales: this.filialService.getAll(),
      tiposIdentificacion: this.tipoIdentificacionService.getAll()
    }).subscribe({
      next: (result) => {
        this.filialesOptions.set(result.filiales || []);
        this.tiposIdentificacionOptions.set(result.tiposIdentificacion || []);
      },
      error: (error) => {
        console.error('Error cargando opciones de selects:', error);
        this.snackBar.open('Error cargando opciones', 'Cerrar', { duration: 3000 });
      }
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
      fechaNacimientoHasta
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
      dbMovil.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'movil',
        telefono,
        TipoComandosBusqueda.LIKE
      );
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
      db.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'idEstado',
        idEstado,
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    // migrado
    if (migrado !== null && migrado !== undefined) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'migrado',
        migrado,
        TipoComandosBusqueda.IGUAL
      );
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
      }
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
      fechaNacimientoHasta: null
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
        returnUrl: '/menucreditos/entidad-consulta'
      }
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
        returnUrl: '/menucreditos/entidad-consulta'
      }
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
        from: 'entidad-consulta' // Indicador de origen para ocultar búsqueda
      }
    });
  }

  exportarCSV(): void {
    const data = this.entidades();
    if (!data || data.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = data.map(e => ({
      'Código': e.codigo || '',
      'Tipo ID': e.tipoIdentificacion?.nombre || '',
      'Número ID': e.numeroIdentificacion || '',
      'Razón Social': e.razonSocial || '',
      'Filial': e.filial?.nombre || '',
      'Correo Personal': e.correoPersonal || '',
      'Correo Institucional': e.correoInstitucional || '',
      'Teléfono': e.telefono || '',
      'Móvil': e.movil || '',
      'Estado': e.idEstado === 1 ? 'Activo' : 'Inactivo'
    }));

    this.exportService.exportToCSV(
      rows,
      'entidades',
      Object.keys(rows[0])
    );

    this.snackBar.open('CSV exportado correctamente', 'Cerrar', { duration: 3000 });
  }

  toggleFiltrosPrincipales(): void {
    this.filtrosPrincipalesExpandidos = !this.filtrosPrincipalesExpandidos;
  }

  toggleFiltrosAvanzados(): void {
    this.filtrosAvanzadosExpandidos = !this.filtrosAvanzadosExpandidos;
  }
}
