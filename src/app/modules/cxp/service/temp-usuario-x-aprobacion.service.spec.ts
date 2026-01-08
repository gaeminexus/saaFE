import { TestBed } from '@angular/core/testing';

import { TempUsuarioXAprobacionService } from './temp-usuario-x-aprobacion.service';

describe('TempUsuarioXAprobacionService', () => {
  let service: TempUsuarioXAprobacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempUsuarioXAprobacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
