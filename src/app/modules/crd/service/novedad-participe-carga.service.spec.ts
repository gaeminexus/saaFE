import { TestBed } from '@angular/core/testing';

import { NovedadParticipeCargaService } from './novedad-participe-carga.service';

describe('NovedadParticipeCargaService', () => {
  let service: NovedadParticipeCargaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NovedadParticipeCargaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
