import { TestBed } from '@angular/core/testing';

import { CobroRetencionService } from './cobro-retencion.service';

describe('CobroRetencionService', () => {
  let service: CobroRetencionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroRetencionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
