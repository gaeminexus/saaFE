import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Aporte } from '../../../../model/aporte';
import { Entidad } from '../../../../model/entidad';
import { ValorPagoPensionComplementaria } from '../../../../model/valor-pago-pension-complementaria';
import { AporteService } from '../../../../service/aporte.service';
import { EntidadService } from '../../../../service/entidad.service';
import { ValorPagoPensionComplementariaService } from '../../../../service/valor-pago-pension-complementaria.service';

@Component({
  selector: 'app-proceso-pago-jubilados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule, MatTableModule, MatPaginatorModule],
  templateUrl: './proceso-pago-jubilados.component.html',
  styleUrl: './proceso-pago-jubilados.component.scss',
})
export class ProcesoPagoJubiladosComponent implements OnInit {
  private static readonly ESTADO_JUBILADO_COMPLEMENTARIO = 30;
  private static readonly ESTADO_REGISTRO_ACTIVO = 1;

  private fb = inject(FormBuilder);
  private entidadService = inject(EntidadService);
  private aporteService = inject(AporteService);
  private valorPagoService = inject(ValorPagoPensionComplementariaService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  filtrosForm!: FormGroup;
  asignacionForm!: FormGroup;
  entidades = signal<Entidad[]>([]);
  asignaciones = signal<ValorPagoPensionComplementaria[]>([]);
  entidadSeleccionada = signal<Entidad | null>(null);
  isLoading = signal<boolean>(false);
  isLoadingSaldos = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoadingAsignaciones = signal<boolean>(false);
  busquedaRealizada = signal<boolean>(false);
  totalPagarMensual = signal<number>(0);
  saldosPensionMap = signal<Map<number, number>>(new Map<number, number>());

  displayedColumns: string[] = ['cedula', 'nombre', 'estado', 'saldoPension', 'acciones'];
  displayedColumnsAsignaciones: string[] = ['cedula', 'nombre', 'valorRegistrado', 'cuotas', 'valorMensual', 'acciones'];
  dataSource = new MatTableDataSource<Entidad>([]);
  dataSourceAsignaciones = new MatTableDataSource<ValorPagoPensionComplementaria>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('paginatorAsignaciones') paginatorAsignaciones!: MatPaginator;

  ngOnInit(): void {
    this.filtrosForm = this.fb.group({
      nombre: [''],
      cedula: [''],
    });

    this.asignacionForm = this.fb.group({
      valorPagar: [null],
      numeroCuotas: [null],
    });

    this.cargarAsignaciones();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.paginatorAsignaciones) {
      this.dataSourceAsignaciones.paginator = this.paginatorAsignaciones;
    }
  }

  buscar(): void {
    const nombre = (this.filtrosForm.get('nombre')?.value || '').trim();
    const cedula = (this.filtrosForm.get('cedula')?.value || '').trim();

    const criterios: DatosBusqueda[] = [];

    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'idEstado',
      ProcesoPagoJubiladosComponent.ESTADO_JUBILADO_COMPLEMENTARIO.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioEstado);

    if (nombre) {
      const criterioNombre = new DatosBusqueda();
      criterioNombre.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'razonSocial',
        nombre,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(criterioNombre);
    }

    if (cedula) {
      const criterioCedula = new DatosBusqueda();
      criterioCedula.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'numeroIdentificacion',
        cedula,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(criterioCedula);
    }

    const orderByNombre = new DatosBusqueda();
    orderByNombre.orderBy('razonSocial');
    orderByNombre.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(orderByNombre);

    this.isLoading.set(true);

    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.entidades.set(data);
        this.dataSource.data = data;
        this.cargarSaldosPensionComplementaria(data);
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
        });
        this.busquedaRealizada.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.entidades.set([]);
        this.dataSource.data = [];
        this.busquedaRealizada.set(true);
        this.isLoading.set(false);
        this.snackBar.open('Error al consultar jubilados', 'Cerrar', { duration: 3000 });
      },
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ nombre: '', cedula: '' });
    this.entidades.set([]);
    this.dataSource.data = [];
    this.saldosPensionMap.set(new Map<number, number>());
    this.busquedaRealizada.set(false);
  }

  obtenerSaldoPensionComplementaria(entidad: Entidad): number {
    if (!entidad?.codigo) {
      return 0;
    }

    return this.saldosPensionMap().get(entidad.codigo) || 0;
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    const existente = this.asignaciones().find((item) => item.entidad?.codigo === entidad.codigo);

    this.asignacionForm.patchValue({
      valorPagar: existente?.valorPagar ?? null,
      numeroCuotas: existente?.numeroCuotas ?? null,
    });
  }

  guardarAsignacion(): void {
    const entidad = this.entidadSeleccionada();
    if (!entidad?.codigo) {
      this.snackBar.open('Seleccione primero un jubilado', 'Cerrar', { duration: 3000 });
      return;
    }

    const valorPagar = Number(this.asignacionForm.get('valorPagar')?.value ?? 0);
    const numeroCuotasRaw = this.asignacionForm.get('numeroCuotas')?.value;
    const numeroCuotas = numeroCuotasRaw === null || numeroCuotasRaw === '' ? null : Number(numeroCuotasRaw);

    if (!Number.isFinite(valorPagar) || valorPagar <= 0) {
      this.snackBar.open('Ingrese un valor de pago mensual válido', 'Cerrar', { duration: 3000 });
      return;
    }

    if (numeroCuotas !== null && (!Number.isFinite(numeroCuotas) || numeroCuotas <= 0)) {
      this.snackBar.open('El número de cuotas debe ser mayor a cero', 'Cerrar', { duration: 3000 });
      return;
    }

    const payloadBase: Partial<ValorPagoPensionComplementaria> = {
      entidad: { codigo: entidad.codigo } as Entidad,
      valorPagar,
      numeroCuotas,
      estado: ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_ACTIVO,
      usuarioModificacion: 'frontend',
      fechaModificacion: new Date().toISOString(),
    };

    const existente = this.asignaciones().find((item) => item.entidad?.codigo === entidad.codigo);

    this.isSaving.set(true);

    if (existente?.codigo) {
      this.valorPagoService
        .update({
          ...existente,
          ...payloadBase,
        })
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.snackBar.open('Asignación actualizada correctamente', 'Cerrar', { duration: 3000 });
            this.cargarAsignaciones();
          },
          error: () => {
            this.isSaving.set(false);
            this.snackBar.open('No se pudo actualizar la asignación', 'Cerrar', { duration: 3000 });
          },
        });
      return;
    }

    this.valorPagoService
      .add({
        ...payloadBase,
        usuarioIngreso: 'frontend',
        fechaIngreso: new Date().toISOString(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open('Asignación registrada correctamente', 'Cerrar', { duration: 3000 });
          this.cargarAsignaciones();
        },
        error: () => {
          this.isSaving.set(false);
          this.snackBar.open('No se pudo registrar la asignación', 'Cerrar', { duration: 3000 });
        },
      });
  }

  private cargarAsignaciones(): void {
    this.isLoadingAsignaciones.set(true);

    this.valorPagoService.getAll().subscribe({
      next: (rows) => {
        const asignacionesRows = rows || [];
        this.asignaciones.set(asignacionesRows);
        this.dataSourceAsignaciones.data = asignacionesRows;
        setTimeout(() => {
          if (this.paginatorAsignaciones) {
            this.dataSourceAsignaciones.paginator = this.paginatorAsignaciones;
          }
        });
        this.actualizarTotalMensual(asignacionesRows);
        this.isLoadingAsignaciones.set(false);
      },
      error: () => {
        this.asignaciones.set([]);
        this.dataSourceAsignaciones.data = [];
        this.totalPagarMensual.set(0);
        this.isLoadingAsignaciones.set(false);
      },
    });
  }

  obtenerValorMensualRegistro(item: ValorPagoPensionComplementaria): number {
    const valor = Number(item.valorPagar || 0);
    const cuotas = Number(item.numeroCuotas || 0);

    if (cuotas > 0) {
      return valor / cuotas;
    }

    return valor;
  }

  get valorMensualCalculadoFormulario(): number {
    const valor = Number(this.asignacionForm.get('valorPagar')?.value || 0);
    const cuotas = Number(this.asignacionForm.get('numeroCuotas')?.value || 0);

    if (cuotas > 0) {
      return valor / cuotas;
    }

    return valor;
  }

  editarAsignacion(item: ValorPagoPensionComplementaria): void {
    if (!item.entidad) {
      return;
    }

    this.entidadSeleccionada.set(item.entidad);
    this.asignacionForm.patchValue({
      valorPagar: item.valorPagar ?? null,
      numeroCuotas: item.numeroCuotas ?? null,
    });
  }

  private actualizarTotalMensual(asignacionesRows: ValorPagoPensionComplementaria[]): void {
    const total = asignacionesRows.reduce((acc, row) => acc + this.obtenerValorMensualRegistro(row), 0);
    this.totalPagarMensual.set(total);
  }

  private cargarSaldosPensionComplementaria(entidades: Entidad[]): void {
    if (!entidades.length) {
      this.saldosPensionMap.set(new Map<number, number>());
      return;
    }

    this.isLoadingSaldos.set(true);

    const consultas = entidades.map((entidad) => {
      const criterioEntidad = new DatosBusqueda();
      criterioEntidad.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'entidad',
        'codigo',
        String(entidad.codigo),
        TipoComandosBusqueda.IGUAL,
      );

      return this.aporteService.selectByCriteria([criterioEntidad]);
    });

    forkJoin(consultas).subscribe({
      next: (resultados) => {
        const map = new Map<number, number>();

        entidades.forEach((entidad, index) => {
          const aportes = resultados[index] || [];
          const aportesPension = aportes.filter((aporte: Aporte) => this.esPensionComplementaria(aporte));
          const totalPension = aportesPension.reduce((sum, aporte) => sum + (aporte.valor || 0), 0);
          map.set(entidad.codigo, totalPension);
        });

        this.saldosPensionMap.set(map);
        this.isLoadingSaldos.set(false);
      },
      error: () => {
        this.saldosPensionMap.set(new Map<number, number>());
        this.isLoadingSaldos.set(false);
      },
    });
  }

  private esPensionComplementaria(aporte: Aporte): boolean {
    const nombreTipo = (aporte.tipoAporte?.nombre || '').toLowerCase();
    if (!nombreTipo) {
      return false;
    }

    const normalizado = nombreTipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizado.includes('pension complementaria');
  }

  verDash(entidad: Entidad): void {
    if (!entidad?.codigo) {
      return;
    }

    this.router.navigate(['/menucreditos/participe-dash'], {
      queryParams: {
        codigoEntidad: entidad.codigo,
        from: 'entidad-consulta',
      },
    });
  }
}
