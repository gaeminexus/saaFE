import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TipoPermisoService } from './tipo-permiso.service';

describe('TipoPermisoService', () => {
  let service: TipoPermisoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TipoPermisoService],
    });
    service = TestBed.inject(TipoPermisoService);
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
    expect(service.delete).toBeDefined();
  });
});
