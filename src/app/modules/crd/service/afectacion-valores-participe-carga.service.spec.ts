import { TestBed } from '@angular/core/testing';

import { AfectacionValoresParticipeCargaService } from './afectacion-valores-participe-carga.service';

describe('AfectacionValoresParticipeCargaService', () => {
  let service: AfectacionValoresParticipeCargaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AfectacionValoresParticipeCargaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
