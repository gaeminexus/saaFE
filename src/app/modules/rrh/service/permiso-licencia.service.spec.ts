import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermisoLicenciaService } from './permiso-licencia.service';

describe('PermisoLicenciaService', () => {
  let service: PermisoLicenciaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PermisoLicenciaService],
    });
    service = TestBed.inject(PermisoLicenciaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have all required methods', () => {
    expect(service.getAll).toBeDefined();
    expect(service.getById).toBeDefined();
    expect(service.add).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.selectByCriteria).toBeDefined();
    expect(service.aprobar).toBeDefined();
    expect(service.rechazar).toBeDefined();
    expect(service.cancelar).toBeDefined();
    expect(service.validarSolapamientos).toBeDefined();
    expect(service.delete).toBeDefined();
  });
});
