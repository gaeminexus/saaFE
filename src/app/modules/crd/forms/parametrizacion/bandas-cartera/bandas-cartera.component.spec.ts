import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { BandasCarteraComponent } from './bandas-cartera.component';

describe('BandasCarteraComponent', () => {
  let component: BandasCarteraComponent;
  let fixture: ComponentFixture<BandasCarteraComponent>;
  let httpMock: HttpTestingController;

  const usuarioServiceMock: Partial<UsuarioService> = {
    getEmpresaLog: () => ({ codigo: 1236, nombre: 'ASOPREP' } as any),
    getUsuarioLog: () => ({ codigo: 1, nombre: 'TEST' } as any),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandasCarteraComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsuarioService, useValue: usuarioServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BandasCarteraComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // ngOnInit dispara el listado; se responde con lista vacía.
    const req = httpMock.match((r) => r.url.endsWith('/cbpr/listado'));
    req.forEach((r) => r.flush([]));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse', () => {
    expect(component).toBeTruthy();
  });

  it('resuelve la empresa desde la sesión', () => {
    expect(component.idEmpresa).toBe(1236);
  });

  it('formatoFechaArray formatea [y,m,d] como dd/MM/yyyy', () => {
    expect(component.formatoFechaArray([2026, 9, 1])).toBe('01/09/2026');
    expect(component.formatoFechaArray(null)).toBe('—');
  });

  it('validar exige una banda Resto al final y cuenta en cada banda', () => {
    component.bandasEdit = [
      {
        periodos: 1,
        idPlanCuenta: null,
        cuentaContable: '',
        nombreCuenta: '',
        esResto: false,
        busquedaCuenta: '',
        opcionesCuenta: [],
        buscandoCuenta: false,
      },
      {
        periodos: null,
        idPlanCuenta: 10,
        cuentaContable: '1.3.01.25',
        nombreCuenta: 'RESTO',
        esResto: true,
        busquedaCuenta: '1.3.01.25',
        opcionesCuenta: [],
        buscandoCuenta: false,
      },
    ];
    const errores = component.validar();
    // La banda 1 no tiene cuenta -> debe reportarse.
    expect(errores.some((e) => e.includes('banda 1'))).toBeTrue();
  });

  it('validar no reporta errores en una configuración válida', () => {
    component.bandasEdit = [
      {
        periodos: 1,
        idPlanCuenta: 10,
        cuentaContable: '1.3.01.05',
        nombreCuenta: 'A',
        esResto: false,
        busquedaCuenta: '1.3.01.05',
        opcionesCuenta: [],
        buscandoCuenta: false,
      },
      {
        periodos: null,
        idPlanCuenta: 11,
        cuentaContable: '1.3.01.25',
        nombreCuenta: 'RESTO',
        esResto: true,
        busquedaCuenta: '1.3.01.25',
        opcionesCuenta: [],
        buscandoCuenta: false,
      },
    ];
    expect(component.validar()).toEqual([]);
  });
});
