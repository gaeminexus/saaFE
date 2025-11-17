import { TestBed } from '@angular/core/testing';

import { DetalleConciliacionService } from './detalle-conciliacion.service';

describe('DetalleConciliacionService', () => {
  let service: DetalleConciliacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleConciliacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
