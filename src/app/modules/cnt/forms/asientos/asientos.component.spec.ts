import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AsientosComponent } from './asientos.component';
import { AsientoService } from '../../service/asiento.service';
import { TipoAsientoService } from '../../service/tipo-asiento.service';
import { PeriodoService } from '../../service/periodo.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { CentroCostoService } from '../../service/centro-costo.service';
import { Asiento, EstadoAsiento } from '../../model/asiento';

describe('AsientosComponent', () => {
  let component: AsientosComponent;
  let fixture: ComponentFixture<AsientosComponent>;
  let asientoService: jasmine.SpyObj<AsientoService>;
  let tipoAsientoService: jasmine.SpyObj<TipoAsientoService>;
  let periodoService: jasmine.SpyObj<PeriodoService>;
  let planCuentaService: jasmine.SpyObj<PlanCuentaService>;
  let centroCostoService: jasmine.SpyObj<CentroCostoService>;

  const mockAsiento: Asiento = {
    codigo: 1,
    empresa: {
      codigo: 280,
      jerarquia: {
        codigo: 1,
        nombre: 'Matriz',
        nivel: 1,
        codigoPadre: 0,
        descripcion: 'Jerarquía principal',
        ultimoNivel: 1,
        rubroTipoEstructuraP: 1,
        rubroTipoEstructuraH: 1,
        codigoAlterno: 1,
        rubroNivelCaracteristicaP: 1,
        rubroNivelCaracteristicaH: 1
      },
      nombre: 'GAEMI NEXUS',
      nivel: 1,
      codigoPadre: 0,
      ingresado: 1
    },
    tipoAsiento: {
      codigo: 1,
      empresa: {
        codigo: 280,
        jerarquia: {
          codigo: 1,
          nombre: 'Matriz',
          nivel: 1,
          codigoPadre: 0,
          descripcion: 'Jerarquía principal',
          ultimoNivel: 1,
          rubroTipoEstructuraP: 1,
          rubroTipoEstructuraH: 1,
          codigoAlterno: 1,
          rubroNivelCaracteristicaP: 1,
          rubroNivelCaracteristicaH: 1
        },
        nombre: 'GAEMI NEXUS',
        nivel: 1,
        codigoPadre: 0,
        ingresado: 1
      },
      nombre: 'Manual',
      estado: 1,
      codigoAlterno: 1,
      observacion: 'Tipo de asiento manual',
      fechaInactivo: new Date(),
      sistema: 0
    },
    fechaAsiento: new Date('2024-04-15'),
    numero: 1,
    estado: EstadoAsiento.ACTIVO,
    observaciones: 'Asiento de prueba',
    nombreUsuario: 'admin',
    numeroMes: 4,
    numeroAnio: 2024,
    moneda: 1,
    rubroModuloClienteP: 1,
    rubroModuloClienteH: 1,
    fechaIngreso: new Date('2024-04-15'),
    periodo: {
      codigo: 4,
      empresa: {
        codigo: 280,
        jerarquia: {
          codigo: 1,
          nombre: 'Matriz',
          nivel: 1,
          codigoPadre: 0,
          descripcion: 'Jerarquía principal',
          ultimoNivel: 1,
          rubroTipoEstructuraP: 1,
          rubroTipoEstructuraH: 1,
          codigoAlterno: 1,
          rubroNivelCaracteristicaP: 1,
          rubroNivelCaracteristicaH: 1
        },
        nombre: 'GAEMI NEXUS',
        nivel: 1,
        codigoPadre: 0,
        ingresado: 1
      },
      mes: 4,
      anio: 2024,
      nombre: 'Abril 2024',
      estado: 1,
      primerDia: new Date('2024-04-01'),
      ultimoDia: new Date('2024-04-30'),
      periodoCierre: 0
    },
    rubroModuloSistemaP: 1,
    rubroModuloSistemaH: 1
  };

  beforeEach(async () => {
    const asientoServiceSpy = jasmine.createSpyObj('AsientoService', [
      'getAll',
      'getById',
      'selectByCriteria',
      'crearAsiento',
      'actualizarAsiento',
      'eliminarAsiento',
      'anularAsiento',
      'reversarAsiento',
      'getSiguienteNumero',
      'validarBalance',
      'getEstadoTexto',
      'getEstadoBadgeClass',
      'puedeEditar',
      'puedeAnular',
      'puedeReversar',
      'puedeEliminar'
    ]);

    const tipoAsientoServiceSpy = jasmine.createSpyObj('TipoAsientoService', [
      'getAll'
    ]);

    const periodoServiceSpy = jasmine.createSpyObj('PeriodoService', [
      'getAll',
      'getPeriodoActual'
    ]);

    const planCuentaServiceSpy = jasmine.createSpyObj('PlanCuentaService', [
      'getAll'
    ]);

    const centroCostoServiceSpy = jasmine.createSpyObj('CentroCostoService', [
      'getAll'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        AsientosComponent,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatSnackBarModule,
        MatCardModule,
        MatToolbarModule,
        MatChipsModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTabsModule,
        MatExpansionModule,
        MatAutocompleteModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AsientoService, useValue: asientoServiceSpy },
        { provide: TipoAsientoService, useValue: tipoAsientoServiceSpy },
        { provide: PeriodoService, useValue: periodoServiceSpy },
        { provide: PlanCuentaService, useValue: planCuentaServiceSpy },
        { provide: CentroCostoService, useValue: centroCostoServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsientosComponent);
    component = fixture.componentInstance;

    asientoService = TestBed.inject(AsientoService) as jasmine.SpyObj<AsientoService>;
    tipoAsientoService = TestBed.inject(TipoAsientoService) as jasmine.SpyObj<TipoAsientoService>;
    periodoService = TestBed.inject(PeriodoService) as jasmine.SpyObj<PeriodoService>;
    planCuentaService = TestBed.inject(PlanCuentaService) as jasmine.SpyObj<PlanCuentaService>;
    centroCostoService = TestBed.inject(CentroCostoService) as jasmine.SpyObj<CentroCostoService>;

    // Configurar mocks por defecto
    asientoService.getAll.and.returnValue(of([mockAsiento]));
    asientoService.getEstadoTexto.and.returnValue('Activo');
    asientoService.getEstadoBadgeClass.and.returnValue('badge-activo');
    asientoService.validarBalance.and.returnValue(true);
    asientoService.puedeEditar.and.returnValue(true);
    asientoService.puedeAnular.and.returnValue(true);
    asientoService.puedeReversar.and.returnValue(true);
    asientoService.puedeEliminar.and.returnValue(false);

    tipoAsientoService.getAll.and.returnValue(of([]));
    periodoService.getAll.and.returnValue(of([]));
    periodoService.getPeriodoActual.and.returnValue(of(null));
    planCuentaService.getAll.and.returnValue(of([]));
    centroCostoService.getAll.and.returnValue(of([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load asientos on init', () => {
    component.ngOnInit();
    expect(asientoService.getAll).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual([mockAsiento]);
  });

  it('should load supporting data on init', () => {
    component.ngOnInit();
    expect(tipoAsientoService.getAll).toHaveBeenCalled();
    expect(periodoService.getAll).toHaveBeenCalled();
    expect(planCuentaService.getAll).toHaveBeenCalled();
    expect(centroCostoService.getAll).toHaveBeenCalled();
  });

  it('should initialize forms correctly', () => {
    expect(component.filtroForm).toBeDefined();
    expect(component.asientoForm).toBeDefined();

    expect(component.filtroForm.get('fechaDesde')?.value).toBeNull();
    expect(component.filtroForm.get('fechaHasta')?.value).toBeNull();
    expect(component.asientoForm.get('fechaAsiento')?.value).toBeInstanceOf(Date);
  });

  it('should show new asiento form', () => {
    component.nuevoAsiento();

    expect(component.mostrarFormulario).toBe(true);
    expect(component.editandoAsiento).toBe(false);
    expect(component.asientoSeleccionado).toBeNull();
    expect(component.tabIndex).toBe(1);
    expect(component.detalles.length).toBe(1);
  });

  it('should show edit asiento form when can edit', () => {
    asientoService.puedeEditar.and.returnValue(true);

    component.editarAsiento(mockAsiento);

    expect(component.mostrarFormulario).toBe(true);
    expect(component.editandoAsiento).toBe(true);
    expect(component.asientoSeleccionado).toBe(mockAsiento);
    expect(component.tabIndex).toBe(1);
  });

  it('should not edit asiento when cannot edit', () => {
    asientoService.puedeEditar.and.returnValue(false);
    spyOn(component, 'mostrarMensaje');

    component.editarAsiento(mockAsiento);

    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'Solo se pueden editar asientos en estado incompleto',
      'warning'
    );
    expect(component.mostrarFormulario).toBe(false);
  });

  it('should add detalle row', () => {
    component.nuevoAsiento();
    const initialLength = component.detalles.length;

    component.agregarDetalle();

    expect(component.detalles.length).toBe(initialLength + 1);
  });

  it('should remove detalle row when more than one', () => {
    component.nuevoAsiento();
    component.agregarDetalle(); // Ahora hay 2 detalles

    component.eliminarDetalle(0);

    expect(component.detalles.length).toBe(1);
  });

  it('should not remove detalle row when only one', () => {
    component.nuevoAsiento(); // Solo 1 detalle
    spyOn(component, 'mostrarMensaje');

    component.eliminarDetalle(0);

    expect(component.detalles.length).toBe(1);
    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'Debe mantener al menos una línea de detalle',
      'warning'
    );
  });

  it('should calculate totals correctly', () => {
    component.nuevoAsiento();

    // Configurar valores en detalles
    component.detalles.at(0).patchValue({
      valorDebe: 1000,
      valorHaber: 0
    });

    component.agregarDetalle();
    component.detalles.at(1).patchValue({
      valorDebe: 0,
      valorHaber: 1000
    });

    component.calcularTotales();

    expect(component.totalDebe).toBe(1000);
    expect(component.totalHaber).toBe(1000);
    expect(component.diferencia).toBe(0);
  });

  it('should check if asiento is balanced', () => {
    component.totalDebe = 1000;
    component.totalHaber = 1000;
    component.diferencia = 0;

    expect(component.estaBalanceado()).toBe(true);

    component.diferencia = 100;
    expect(component.estaBalanceado()).toBe(false);
  });

  it('should validate form before saving', () => {
    component.nuevoAsiento();
    spyOn(component, 'mostrarMensaje');

    // Formulario inválido
    component.asientoForm.patchValue({
      tipoAsiento: null,
      observaciones: ''
    });

    component.guardarAsiento();

    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'Por favor complete todos los campos requeridos',
      'warning'
    );
    expect(asientoService.crearAsiento).not.toHaveBeenCalled();
  });

  it('should validate minimum detalles before saving', () => {
    component.nuevoAsiento();
    spyOn(component, 'mostrarMensaje');

    // Solo un detalle
    expect(component.detalles.length).toBe(1);

    component.guardarAsiento();

    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'Debe tener al menos 2 líneas de detalle',
      'warning'
    );
  });

  it('should validate balance before saving', () => {
    component.nuevoAsiento();
    component.agregarDetalle();
    asientoService.validarBalance.and.returnValue(false);
    spyOn(component, 'mostrarMensaje');

    // Llenar formulario correctamente
    component.asientoForm.patchValue({
      tipoAsiento: mockAsiento.tipoAsiento,
      observaciones: 'Test',
      periodo: mockAsiento.periodo
    });

    component.guardarAsiento();

    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'El asiento debe estar balanceado (Debe = Haber)',
      'error'
    );
  });

  it('should create asiento when valid', () => {
    asientoService.crearAsiento.and.returnValue(of(mockAsiento));
    asientoService.validarBalance.and.returnValue(true);
    spyOn(component, 'cancelarFormulario');
    spyOn(component, 'cargarDatos');

    component.nuevoAsiento();
    component.agregarDetalle(); // 2 detalles

    // Llenar formulario correctamente
    component.asientoForm.patchValue({
      tipoAsiento: mockAsiento.tipoAsiento,
      observaciones: 'Test',
      periodo: mockAsiento.periodo,
      fechaAsiento: new Date()
    });

    component.guardarAsiento();

    expect(asientoService.crearAsiento).toHaveBeenCalled();
    expect(component.cancelarFormulario).toHaveBeenCalled();
    expect(component.cargarDatos).toHaveBeenCalled();
  });

  it('should anular asiento when can anular', () => {
    asientoService.puedeAnular.and.returnValue(true);
    asientoService.anularAsiento.and.returnValue(of(true));
    spyOn(window, 'prompt').and.returnValue('Razón de anulación');
    spyOn(component, 'cargarDatos');

    component.anularAsiento(mockAsiento);

    expect(asientoService.anularAsiento).toHaveBeenCalledWith(
      mockAsiento.codigo,
      'Razón de anulación'
    );
    expect(component.cargarDatos).toHaveBeenCalled();
  });

  it('should not anular asiento when cannot anular', () => {
    asientoService.puedeAnular.and.returnValue(false);
    spyOn(component, 'mostrarMensaje');

    component.anularAsiento(mockAsiento);

    expect(component.mostrarMensaje).toHaveBeenCalledWith(
      'No se puede anular este asiento',
      'warning'
    );
    expect(asientoService.anularAsiento).not.toHaveBeenCalled();
  });

  it('should cancel form and reset state', () => {
    component.mostrarFormulario = true;
    component.editandoAsiento = true;
    component.asientoSeleccionado = mockAsiento;
    component.tabIndex = 1;

    // Agregar algunos detalles
    component.nuevoAsiento();
    component.agregarDetalle();

    component.cancelarFormulario();

    expect(component.mostrarFormulario).toBe(false);
    expect(component.editandoAsiento).toBe(false);
    expect(component.asientoSeleccionado).toBeNull();
    expect(component.tabIndex).toBe(0);
    expect(component.detalles.length).toBe(0);
    expect(component.totalDebe).toBe(0);
    expect(component.totalHaber).toBe(0);
    expect(component.diferencia).toBe(0);
  });

  it('should apply filters when form changes', () => {
    asientoService.selectByCriteria.and.returnValue(of([mockAsiento]));

    component.filtroForm.patchValue({
      fechaDesde: new Date('2024-01-01'),
      estado: EstadoAsiento.ACTIVO
    });

    expect(asientoService.selectByCriteria).toHaveBeenCalled();
  });

  it('should clear filters and reload data', () => {
    spyOn(component, 'cargarDatos');

    component.filtroForm.patchValue({
      fechaDesde: new Date(),
      estado: EstadoAsiento.ACTIVO
    });

    component.limpiarFiltros();

    expect(component.filtroForm.get('fechaDesde')?.value).toBeNull();
    expect(component.filtroForm.get('estado')?.value).toBeNull();
    expect(component.cargarDatos).toHaveBeenCalled();
  });

  it('should calculate total debe and haber for asiento', () => {
    const asientoConDetalles: Asiento = {
      ...mockAsiento,
      detalles: [
        {
          codigo: 1,
          asiento: 1,
          planCuenta: mockAsiento.periodo.empresa.jerarquia as any,
          descripcion: 'Test 1',
          valorDebe: 500,
          valorHaber: 0,
          nombreCuenta: 'Cuenta 1',
          numeroCuenta: '1001',
          centroCosto: undefined as any
        },
        {
          codigo: 2,
          asiento: 1,
          planCuenta: mockAsiento.periodo.empresa.jerarquia as any,
          descripcion: 'Test 2',
          valorDebe: 0,
          valorHaber: 500,
          nombreCuenta: 'Cuenta 2',
          numeroCuenta: '2001',
          centroCosto: undefined as any
        }
      ]
    };

    expect(component.calcularTotalDebe(asientoConDetalles)).toBe(500);
    expect(component.calcularTotalHaber(asientoConDetalles)).toBe(500);
  });
});
