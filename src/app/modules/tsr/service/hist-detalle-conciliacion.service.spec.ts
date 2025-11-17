import { TestBed } from '@angular/core/testing';

import { HistDetalleConciliacionService } from './hist-detalle-conciliacion.service';

describe('HistDetalleConciliacionService', () => {
  let service: HistDetalleConciliacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistDetalleConciliacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
