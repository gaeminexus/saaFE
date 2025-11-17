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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PeriodosComponent } from './periodos.component';
import { PeriodoService } from '../../service/periodo.service';
import { Periodo, EstadoPeriodo } from '../../model/periodo';

describe('PeriodosComponent', () => {
  let component: PeriodosComponent;
  let fixture: ComponentFixture<PeriodosComponent>;
  let periodoService: jasmine.SpyObj<PeriodoService>;

  const mockPeriodos: Periodo[] = [
    {
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
      mes: 1,
      anio: 2024,
      nombre: 'Enero 2024',
      estado: EstadoPeriodo.ABIERTO,
      primerDia: new Date('2024-01-01'),
      ultimoDia: new Date('2024-01-31'),
      periodoCierre: 0
    },
    {
      codigo: 2,
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
      mes: 2,
      anio: 2024,
      nombre: 'Febrero 2024',
      estado: EstadoPeriodo.MAYORIZADO,
      primerDia: new Date('2024-02-01'),
      ultimoDia: new Date('2024-02-29'),
      idMayorizacion: 1002,
      periodoCierre: 0
    }
  ];

  beforeEach(async () => {
    const periodoServiceSpy = jasmine.createSpyObj('PeriodoService', [
      'getAll',
      'getById',
      'getByAnio',
      'getPeriodoActual',
      'selectByCriteria',
      'crearPeriodo',
      'mayorizar',
      'desmayorizar',
      'delete',
      'getAniosDisponibles',
      'validarCreacionPeriodo',
      'getNombreMes',
      'getEstadoTexto',
      'getEstadoBadgeClass'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        PeriodosComponent,
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
        NoopAnimationsModule
      ],
      providers: [
        { provide: PeriodoService, useValue: periodoServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodosComponent);
    component = fixture.componentInstance;
    periodoService = TestBed.inject(PeriodoService) as jasmine.SpyObj<PeriodoService>;

    // Configurar mocks por defecto
    periodoService.getAll.and.returnValue(of(mockPeriodos));
    periodoService.getAniosDisponibles.and.returnValue(of([2024, 2023, 2022]));
    periodoService.getNombreMes.and.returnValue('Enero');
    periodoService.getEstadoTexto.and.returnValue('Abierto');
    periodoService.getEstadoBadgeClass.and.returnValue('badge-activo');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load periodos on init', () => {
    component.ngOnInit();
    expect(periodoService.getAll).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual(mockPeriodos);
  });

  it('should load available years on init', () => {
    component.ngOnInit();
    expect(periodoService.getAniosDisponibles).toHaveBeenCalled();
    expect(component.aniosDisponibles).toEqual([2024, 2023, 2022]);
  });

  it('should initialize forms correctly', () => {
    expect(component.filtroForm).toBeDefined();
    expect(component.crearPeriodoForm).toBeDefined();

    expect(component.filtroForm.get('anio')?.value).toBeNull();
    expect(component.filtroForm.get('mes')?.value).toBeNull();
    expect(component.filtroForm.get('estado')?.value).toBeNull();
    expect(component.filtroForm.get('nombre')?.value).toBe('');
  });

  it('should apply filters when form changes', () => {
    periodoService.selectByCriteria.and.returnValue(of([mockPeriodos[0]]));

    component.filtroForm.patchValue({
      anio: 2024,
      mes: 1
    });

    expect(periodoService.selectByCriteria).toHaveBeenCalledWith({
      anio: 2024,
      mes: 1,
      estado: undefined,
      nombre: ''
    });
  });

  it('should show create form when nuevoPeriodo is called', () => {
    component.nuevoPeriodo();

    expect(component.mostrarFormulario).toBe(true);
    expect(component.editandoPeriodo).toBe(false);
    expect(component.periodoSeleccionado).toBeNull();
  });

  it('should show edit form when editarPeriodo is called', () => {
    const periodo = mockPeriodos[0];

    component.editarPeriodo(periodo);

    expect(component.mostrarFormulario).toBe(true);
    expect(component.editandoPeriodo).toBe(true);
    expect(component.periodoSeleccionado).toBe(periodo);
    expect(component.crearPeriodoForm.get('mes')?.value).toBe(periodo.mes);
    expect(component.crearPeriodoForm.get('anio')?.value).toBe(periodo.anio);
  });

  it('should validate form before saving periodo', () => {
    component.crearPeriodoForm.patchValue({
      mes: null,
      anio: null
    });

    component.guardarPeriodo();

    expect(component.crearPeriodoForm.invalid).toBe(true);
    expect(periodoService.crearPeriodo).not.toHaveBeenCalled();
  });

  it('should create periodo with valid form', () => {
    const validacionMock = { valido: true };
    const nuevoPeriodo = { ...mockPeriodos[0], codigo: 3 };

    periodoService.validarCreacionPeriodo.and.returnValue(of(validacionMock));
    periodoService.crearPeriodo.and.returnValue(of(nuevoPeriodo));

    component.crearPeriodoForm.patchValue({
      mes: 3,
      anio: 2024,
      nombre: 'Marzo 2024'
    });

    component.guardarPeriodo();

    expect(periodoService.validarCreacionPeriodo).toHaveBeenCalledWith(3, 2024);
    expect(periodoService.crearPeriodo).toHaveBeenCalledWith({
      mes: 3,
      anio: 2024,
      nombre: 'Marzo 2024'
    });
  });

  it('should mayorizar periodo when estado is ABIERTO', () => {
    const periodo = mockPeriodos[0]; // ABIERTO
    periodoService.mayorizar.and.returnValue(of(true));

    component.mayorizarPeriodo(periodo);

    expect(periodoService.mayorizar).toHaveBeenCalledWith(periodo.codigo);
  });

  it('should not mayorizar periodo when estado is not ABIERTO', () => {
    const periodo = mockPeriodos[1]; // MAYORIZADO

    component.mayorizarPeriodo(periodo);

    expect(periodoService.mayorizar).not.toHaveBeenCalled();
  });

  it('should desmayorizar periodo when estado is MAYORIZADO', () => {
    const periodo = mockPeriodos[1]; // MAYORIZADO
    periodoService.desmayorizar.and.returnValue(of(true));

    component.desmayorizarPeriodo(periodo);

    expect(periodoService.desmayorizar).toHaveBeenCalledWith(periodo.codigo);
  });

  it('should generate automatic name when mes and anio change', () => {
    periodoService.getNombreMes.and.returnValue('Enero');

    component.crearPeriodoForm.patchValue({
      mes: 1,
      anio: 2024,
      nombre: ''
    });

    component.onMesAnioChange();

    expect(component.crearPeriodoForm.get('nombre')?.value).toBe('Enero 2024');
  });

  it('should clear filters and reload data', () => {
    component.filtroForm.patchValue({
      anio: 2024,
      mes: 1,
      estado: EstadoPeriodo.ABIERTO,
      nombre: 'test'
    });

    component.limpiarFiltros();

    expect(component.filtroForm.get('anio')?.value).toBeNull();
    expect(component.filtroForm.get('mes')?.value).toBeNull();
    expect(component.filtroForm.get('estado')?.value).toBeNull();
    expect(component.filtroForm.get('nombre')?.value).toBeNull();
    expect(periodoService.getAll).toHaveBeenCalled();
  });

  it('should check if periodo can be mayorizado', () => {
    expect(component.puedeMyorizar(mockPeriodos[0])).toBe(true); // ABIERTO
    expect(component.puedeMyorizar(mockPeriodos[1])).toBe(false); // MAYORIZADO
  });

  it('should check if periodo can be desmayorizado', () => {
    expect(component.puedeDesmayorizar(mockPeriodos[0])).toBe(false); // ABIERTO
    expect(component.puedeDesmayorizar(mockPeriodos[1])).toBe(true); // MAYORIZADO
  });

  it('should check if periodo can be deleted', () => {
    expect(component.puedeEliminar(mockPeriodos[0])).toBe(true); // ABIERTO
    expect(component.puedeEliminar(mockPeriodos[1])).toBe(false); // MAYORIZADO
  });

  it('should cancel form and reset state', () => {
    component.mostrarFormulario = true;
    component.editandoPeriodo = true;
    component.periodoSeleccionado = mockPeriodos[0];
    component.cargando = true;

    component.cancelarFormulario();

    expect(component.mostrarFormulario).toBe(false);
    expect(component.editandoPeriodo).toBe(false);
    expect(component.periodoSeleccionado).toBeNull();
    expect(component.cargando).toBe(false);
  });
});
